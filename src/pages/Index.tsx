import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AgriMap from "@/components/AgriMap";
import ReportPanel from "@/components/ReportPanel";
import ViewToggle from "@/components/ViewToggle";
import ReportsTable from "@/components/ReportsTable";
import FilterBar from "@/components/FilterBar";

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
  volume: string | null;
  season: string | null;
}

const Index = () => {
  const [reports, setReports] = useState<AgriReport[]>([]);
  const [selected, setSelected] = useState<AgriReport | null>(null);
  const [view, setView] = useState<"map" | "table">("map");
  const [search, setSearch] = useState("");
  const [commodity, setCommodity] = useState("all");
  const [status, setStatus] = useState("all");

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

  const commodities = useMemo(
    () => [...new Set(reports.map((r) => r.commodity).filter(Boolean) as string[])].sort(),
    [reports]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return reports.filter((r) => {
      if (commodity !== "all" && r.commodity !== commodity) return false;
      if (status !== "all" && r.status !== status) return false;
      if (q) {
        const hay = [r.region, r.province, r.municipality, r.barangay, r.commodity]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports, search, commodity, status]);

  const handlePinClick = useCallback((report: AgriReport) => {
    setSelected(report);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <ViewToggle view={view} onChange={setView} />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        commodity={commodity}
        onCommodityChange={setCommodity}
        status={status}
        onStatusChange={setStatus}
        commodities={commodities}
      />
      {view === "map" ? (
        <>
          <AgriMap reports={filtered} onPinClick={handlePinClick} />
          {selected && (
            <ReportPanel reports={filtered} initialReport={selected} onClose={() => setSelected(null)} />
          )}
        </>
      ) : (
        <div className="pt-28 h-full">
          <ReportsTable reports={filtered} />
        </div>
      )}
    </div>
  );
};

export default Index;
