ALTER TABLE public.agri_reports 
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS subcategory text;

ALTER TABLE public.agri_reports
  DROP CONSTRAINT IF EXISTS agri_reports_category_check;
ALTER TABLE public.agri_reports
  ADD CONSTRAINT agri_reports_category_check
  CHECK (category IS NULL OR category IN ('crops','fish','poultry','livestock','dairy','other'));