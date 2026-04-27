ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.supplier_files ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'document';