-- Roles enum
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');

-- Organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Members
CREATE TABLE public.organization_members (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);

-- Invites
CREATE TABLE public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  role public.org_role NOT NULL DEFAULT 'member',
  created_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_org_invites_org ON public.organization_invites(organization_id);

-- Add organization_id to existing tables
ALTER TABLE public.opportunities ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.suppliers ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.supplier_files ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX idx_opportunities_org ON public.opportunities(organization_id);
CREATE INDEX idx_suppliers_org ON public.suppliers(organization_id);
CREATE INDEX idx_supplier_files_org ON public.supplier_files(organization_id);

-- Helpers (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org_id uuid, _roles public.org_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid() AND role = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1;
$$;

-- Create organization + auto-migrate creator's existing data
CREATE OR REPLACE FUNCTION public.create_organization(_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _org_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _name IS NULL OR length(trim(_name)) = 0 THEN RAISE EXCEPTION 'Name required'; END IF;

  INSERT INTO public.organizations (name, owner_id) VALUES (trim(_name), _uid) RETURNING id INTO _org_id;
  INSERT INTO public.organization_members (organization_id, user_id, role) VALUES (_org_id, _uid, 'owner');

  -- Migrate creator's existing records into this org
  UPDATE public.opportunities SET organization_id = _org_id WHERE user_id = _uid AND organization_id IS NULL;
  UPDATE public.suppliers SET organization_id = _org_id WHERE user_id = _uid AND organization_id IS NULL;
  UPDATE public.supplier_files SET organization_id = _org_id WHERE user_id = _uid AND organization_id IS NULL;

  RETURN _org_id;
END;
$$;

-- Create invite (owner/admin only)
CREATE OR REPLACE FUNCTION public.create_invite(_org_id uuid, _role public.org_role DEFAULT 'member')
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _code text;
  _attempt int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_org_role(_org_id, ARRAY['owner','admin']::public.org_role[]) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  LOOP
    _code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    BEGIN
      INSERT INTO public.organization_invites (organization_id, code, role, created_by)
      VALUES (_org_id, _code, _role, _uid);
      RETURN _code;
    EXCEPTION WHEN unique_violation THEN
      _attempt := _attempt + 1;
      IF _attempt > 10 THEN RAISE; END IF;
    END;
  END LOOP;
END;
$$;

-- Accept invite by code
CREATE OR REPLACE FUNCTION public.accept_invite(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _inv public.organization_invites%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _inv FROM public.organization_invites WHERE code = _code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Código inválido'; END IF;
  IF _inv.used_at IS NOT NULL THEN RAISE EXCEPTION 'Convite já utilizado'; END IF;
  IF _inv.expires_at < now() THEN RAISE EXCEPTION 'Convite expirado'; END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_inv.organization_id, _uid, _inv.role)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  UPDATE public.organization_invites SET used_at = now(), used_by = _uid WHERE id = _inv.id;

  RETURN _inv.organization_id;
END;
$$;

-- updated_at triggers
CREATE TRIGGER trg_orgs_updated_at BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ RLS POLICIES ============

-- organizations
CREATE POLICY "members read org" ON public.organizations FOR SELECT TO authenticated
USING (public.is_org_member(id));
CREATE POLICY "any auth create org" ON public.organizations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner update org" ON public.organizations FOR UPDATE TO authenticated
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner delete org" ON public.organizations FOR DELETE TO authenticated
USING (auth.uid() = owner_id);

-- organization_members
CREATE POLICY "members read members" ON public.organization_members FOR SELECT TO authenticated
USING (public.is_org_member(organization_id));
CREATE POLICY "self insert membership" ON public.organization_members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin remove member" ON public.organization_members FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_org_role(organization_id, ARRAY['owner','admin']::public.org_role[])
);

-- organization_invites
CREATE POLICY "admin read invites" ON public.organization_invites FOR SELECT TO authenticated
USING (public.has_org_role(organization_id, ARRAY['owner','admin']::public.org_role[]));
CREATE POLICY "admin insert invites" ON public.organization_invites FOR INSERT TO authenticated
WITH CHECK (public.has_org_role(organization_id, ARRAY['owner','admin']::public.org_role[]) AND created_by = auth.uid());
CREATE POLICY "admin delete invites" ON public.organization_invites FOR DELETE TO authenticated
USING (public.has_org_role(organization_id, ARRAY['owner','admin']::public.org_role[]));

-- ============ Replace per-user policies with org-aware ones ============

-- opportunities
DROP POLICY IF EXISTS "Users read own opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users insert own opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users update own opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users delete own opportunities" ON public.opportunities;

CREATE POLICY "read opportunities" ON public.opportunities FOR SELECT TO authenticated USING (
  (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  OR (organization_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "insert opportunities" ON public.opportunities FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
  AND (organization_id IS NULL OR public.is_org_member(organization_id))
);
CREATE POLICY "update opportunities" ON public.opportunities FOR UPDATE TO authenticated USING (
  (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  OR (organization_id IS NULL AND user_id = auth.uid())
) WITH CHECK (
  (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  OR (organization_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "delete opportunities" ON public.opportunities FOR DELETE TO authenticated USING (
  (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  OR (organization_id IS NULL AND user_id = auth.uid())
);

-- suppliers
DROP POLICY IF EXISTS "Users read own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users insert own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users update own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users delete own suppliers" ON public.suppliers;

CREATE POLICY "read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (
  (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  OR (organization_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
  AND (organization_id IS NULL OR public.is_org_member(organization_id))
);
CREATE POLICY "update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (
  (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  OR (organization_id IS NULL AND user_id = auth.uid())
) WITH CHECK (
  (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  OR (organization_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (
  (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  OR (organization_id IS NULL AND user_id = auth.uid())
);

-- supplier_files
DROP POLICY IF EXISTS "Users read own supplier_files" ON public.supplier_files;
DROP POLICY IF EXISTS "Users insert own supplier_files" ON public.supplier_files;
DROP POLICY IF EXISTS "Users update own supplier_files" ON public.supplier_files;
DROP POLICY IF EXISTS "Users delete own supplier_files" ON public.supplier_files;

CREATE POLICY "read supplier_files" ON public.supplier_files FOR SELECT TO authenticated USING (
  (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  OR (organization_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "insert supplier_files" ON public.supplier_files FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
  AND (organization_id IS NULL OR public.is_org_member(organization_id))
);
CREATE POLICY "update supplier_files" ON public.supplier_files FOR UPDATE TO authenticated USING (
  (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  OR (organization_id IS NULL AND user_id = auth.uid())
) WITH CHECK (
  (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  OR (organization_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "delete supplier_files" ON public.supplier_files FOR DELETE TO authenticated USING (
  (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  OR (organization_id IS NULL AND user_id = auth.uid())
);
