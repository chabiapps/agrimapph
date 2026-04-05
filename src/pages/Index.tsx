import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AgriMap from "@/components/AgriMap";
import ReportPanel from "@/components/ReportPanel";

interface AgriReport {
  id: string;
  lat: number;
  lng: number;
  status: string;
  region: string | null;
  province: string | null;
  municipality: string | null;
  barangay: string | null;
  commodity: string | null;
  price: number | null;
  volume: number | null;
  season: string | null;
}

const Index = () => {
  const [reports, setReports] = useState<AgriReport[]>([]);
  const [selected, setSelected] = useState<AgriReport | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      const { data, error } = await supabase
        .from("agri_reports")
        .select("id, lat, lng, status, region, province, municipality, barangay, commodity, price, volume, season");
      if (!error && data) {
        setReports(data);
      }
    };
    fetchReports();
  }, []);

  const handlePinClick = useCallback((report: AgriReport) => {
    setSelected(report);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <AgriMap reports={reports} onPinClick={handlePinClick} />
      {selected && (
        <ReportPanel report={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
};

export default Index;
