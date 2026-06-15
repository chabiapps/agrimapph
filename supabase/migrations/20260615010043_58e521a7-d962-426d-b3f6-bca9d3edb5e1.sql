ALTER TABLE public.agri_reports
  ADD COLUMN IF NOT EXISTS record_type text NOT NULL DEFAULT 'current_supply',
  ADD COLUMN IF NOT EXISTS planted_date date,
  ADD COLUMN IF NOT EXISTS expected_harvest_date date,
  ADD COLUMN IF NOT EXISTS expected_volume text,
  ADD COLUMN IF NOT EXISTS growth_stage text;

ALTER TABLE public.agri_reports
  ADD CONSTRAINT agri_reports_record_type_check
  CHECK (record_type IN ('current_supply', 'planting_intention'));

ALTER TABLE public.agri_reports
  ADD CONSTRAINT agri_reports_growth_stage_check
  CHECK (growth_stage IS NULL OR growth_stage IN ('Planted', 'Growing', 'Near Harvest', 'Harvested'));