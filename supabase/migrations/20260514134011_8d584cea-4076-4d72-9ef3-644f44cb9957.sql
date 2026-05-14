-- Add user_id columns
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.supplier_files ADD COLUMN IF NOT EXISTS user_id uuid;

-- Drop old public policies
DROP POLICY IF EXISTS "Public delete opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Public insert opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Public read opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Public update opportunities" ON public.opportunities;

DROP POLICY IF EXISTS "Public delete suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Public insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Public read suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Public update suppliers" ON public.suppliers;

DROP POLICY IF EXISTS "Public delete supplier_files" ON public.supplier_files;
DROP POLICY IF EXISTS "Public insert supplier_files" ON public.supplier_files;
DROP POLICY IF EXISTS "Public read supplier_files" ON public.supplier_files;
DROP POLICY IF EXISTS "Public update supplier_files" ON public.supplier_files;

-- Per-user policies: opportunities
CREATE POLICY "Users read own opportunities" ON public.opportunities FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own opportunities" ON public.opportunities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own opportunities" ON public.opportunities FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own opportunities" ON public.opportunities FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- suppliers
CREATE POLICY "Users read own suppliers" ON public.suppliers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own suppliers" ON public.suppliers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- supplier_files
CREATE POLICY "Users read own supplier_files" ON public.supplier_files FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own supplier_files" ON public.supplier_files FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own supplier_files" ON public.supplier_files FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own supplier_files" ON public.supplier_files FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage policies for supplier-files and supplier-logos (user folder = first segment)
CREATE POLICY "Users read own supplier-files objects" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'supplier-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users insert own supplier-files objects" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'supplier-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own supplier-files objects" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'supplier-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own supplier-logos objects" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'supplier-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users insert own supplier-logos objects" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'supplier-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own supplier-logos objects" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'supplier-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
