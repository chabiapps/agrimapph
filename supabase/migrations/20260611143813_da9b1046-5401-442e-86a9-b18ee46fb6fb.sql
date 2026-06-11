-- Tighten agri_reports INSERT: require an authenticated session and stamp ownership
DROP POLICY IF EXISTS "Anyone can insert agri_reports" ON public.agri_reports;

REVOKE INSERT ON public.agri_reports FROM anon;
GRANT INSERT ON public.agri_reports TO authenticated;

CREATE POLICY "Authenticated users can insert their own reports"
ON public.agri_reports
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND reported_by = auth.uid()::text
);