CREATE POLICY "Anyone can insert agri_reports" ON public.agri_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
GRANT INSERT ON public.agri_reports TO anon;
GRANT INSERT ON public.agri_reports TO authenticated;