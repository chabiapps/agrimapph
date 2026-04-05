
CREATE TABLE public.agri_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'balanced',
  region TEXT,
  province TEXT,
  municipality TEXT,
  barangay TEXT,
  commodity TEXT,
  price NUMERIC,
  volume NUMERIC,
  season TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agri_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view agri_reports"
ON public.agri_reports
FOR SELECT
USING (true);
