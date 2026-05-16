-- Company document storage
-- Logical folders live in Postgres; binary files live in a private Storage bucket.

CREATE TABLE public.document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  path text NOT NULL,
  parent_path text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_folders_path_not_blank CHECK (length(trim(path)) > 0),
  CONSTRAINT document_folders_unique_path UNIQUE (organization_id, path)
);

ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_document_folders_org_parent
ON public.document_folders(organization_id, parent_path);

CREATE TRIGGER document_folders_set_updated_at
BEFORE UPDATE ON public.document_folders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.storage_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  folder_path text NOT NULL DEFAULT '',
  display_name text NOT NULL,
  description text,
  file_name text NOT NULL,
  file_path text NOT NULL UNIQUE,
  file_size bigint,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.storage_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_storage_documents_org_folder
ON public.storage_documents(organization_id, folder_path);

CREATE TRIGGER storage_documents_set_updated_at
BEFORE UPDATE ON public.storage_documents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-documents', 'company-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE POLICY "read document folders" ON public.document_folders
FOR SELECT TO authenticated
USING (public.is_org_member(organization_id));

CREATE POLICY "insert document folders" ON public.document_folders
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_org_member(organization_id));

CREATE POLICY "update document folders" ON public.document_folders
FOR UPDATE TO authenticated
USING (public.is_org_member(organization_id))
WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "delete document folders" ON public.document_folders
FOR DELETE TO authenticated
USING (public.is_org_member(organization_id));

CREATE POLICY "read storage documents" ON public.storage_documents
FOR SELECT TO authenticated
USING (public.is_org_member(organization_id));

CREATE POLICY "insert storage documents" ON public.storage_documents
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_org_member(organization_id));

CREATE POLICY "update storage documents" ON public.storage_documents
FOR UPDATE TO authenticated
USING (public.is_org_member(organization_id))
WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "delete storage documents" ON public.storage_documents
FOR DELETE TO authenticated
USING (public.is_org_member(organization_id));

CREATE POLICY "members read company document objects" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'company-documents'
  AND public.is_org_member(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "members insert company document objects" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-documents'
  AND public.is_org_member(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "members update company document objects" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-documents'
  AND public.is_org_member(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'company-documents'
  AND public.is_org_member(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "members delete company document objects" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'company-documents'
  AND public.is_org_member(((storage.foldername(name))[1])::uuid)
);
