-- Restrict anonymous read access to non-sensitive columns only.
REVOKE SELECT ON public.agri_reports FROM anon;

GRANT SELECT (
  id, lat, lng, status, region, province, municipality, barangay,
  commodity, price, volume, season, created_at, updated_at,
  is_verified, record_type, planted_date, expected_harvest_date,
  expected_volume, growth_stage, category, subcategory
) ON public.agri_reports TO anon;

GRANT SELECT, INSERT ON public.agri_reports TO authenticated;
GRANT ALL ON public.agri_reports TO service_role;

-- Replace the blanket public read policy with explicit role-scoped policies.
DROP POLICY IF EXISTS "Anyone can view agri_reports" ON public.agri_reports;

CREATE POLICY "Public can view non-sensitive agri report fields"
ON public.agri_reports
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Authenticated users can view agri reports"
ON public.agri_reports
FOR SELECT
TO authenticated
USING (true);