-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read suppliers" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Public insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update suppliers" ON public.suppliers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete suppliers" ON public.suppliers FOR DELETE USING (true);

CREATE TRIGGER suppliers_set_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Supplier files table (PDFs attached to a supplier)
CREATE TABLE public.supplier_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read supplier_files" ON public.supplier_files FOR SELECT USING (true);
CREATE POLICY "Public insert supplier_files" ON public.supplier_files FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update supplier_files" ON public.supplier_files FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete supplier_files" ON public.supplier_files FOR DELETE USING (true);

CREATE INDEX idx_supplier_files_supplier_id ON public.supplier_files(supplier_id);

-- Storage buckets (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('supplier-logos', 'supplier-logos', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('supplier-files', 'supplier-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (public read/write for shared YGX account)
CREATE POLICY "Public read supplier logos" ON storage.objects FOR SELECT USING (bucket_id = 'supplier-logos');
CREATE POLICY "Public upload supplier logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'supplier-logos');
CREATE POLICY "Public update supplier logos" ON storage.objects FOR UPDATE USING (bucket_id = 'supplier-logos');
CREATE POLICY "Public delete supplier logos" ON storage.objects FOR DELETE USING (bucket_id = 'supplier-logos');

CREATE POLICY "Public read supplier files" ON storage.objects FOR SELECT USING (bucket_id = 'supplier-files');
CREATE POLICY "Public upload supplier files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'supplier-files');
CREATE POLICY "Public update supplier files" ON storage.objects FOR UPDATE USING (bucket_id = 'supplier-files');
CREATE POLICY "Public delete supplier files" ON storage.objects FOR DELETE USING (bucket_id = 'supplier-files');