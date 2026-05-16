
-- ============ document_folders ============
CREATE TABLE IF NOT EXISTS public.document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  path text NOT NULL,
  parent_path text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, path)
);

CREATE INDEX IF NOT EXISTS idx_document_folders_org ON public.document_folders(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_parent ON public.document_folders(organization_id, parent_path);

ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read document_folders"
  ON public.document_folders FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "insert document_folders"
  ON public.document_folders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_org_member(organization_id));

CREATE POLICY "update document_folders"
  ON public.document_folders FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "delete document_folders"
  ON public.document_folders FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

CREATE TRIGGER trg_document_folders_updated_at
  BEFORE UPDATE ON public.document_folders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ storage_documents ============
CREATE TABLE IF NOT EXISTS public.storage_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  folder_path text NOT NULL DEFAULT '',
  display_name text NOT NULL,
  description text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_documents_org ON public.storage_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_storage_documents_folder ON public.storage_documents(organization_id, folder_path);

ALTER TABLE public.storage_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read storage_documents"
  ON public.storage_documents FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "insert storage_documents"
  ON public.storage_documents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_org_member(organization_id));

CREATE POLICY "update storage_documents"
  ON public.storage_documents FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "delete storage_documents"
  ON public.storage_documents FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

CREATE TRIGGER trg_storage_documents_updated_at
  BEFORE UPDATE ON public.storage_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Private bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-documents', 'company-documents', false)
ON CONFLICT (id) DO NOTHING;

-- ============ Storage RLS (files organized as <org_id>/...) ============
CREATE POLICY "company-documents read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'company-documents'
    AND public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "company-documents insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-documents'
    AND public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "company-documents update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-documents'
    AND public.is_org_member(((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'company-documents'
    AND public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "company-documents delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-documents'
    AND public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
