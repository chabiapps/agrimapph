import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AgriMap from "@/components/AgriMap";
import PinPopup from "@/components/PinPopup";
import ViewToggle from "@/components/ViewToggle";
import ReportsTable from "@/components/ReportsTable";
import FilterBar from "@/components/FilterBar";
import LanguageToggle from "@/components/LanguageToggle";

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

  const handleExportCsv = useCallback(() => {
    const headers = ["Region","Province","Municipality","Barangay","Commodity","Season","Volume","Status","Price"];
    const rows = filtered.map((r) => [
      r.region ?? "", r.province ?? "", r.municipality ?? "", r.barangay ?? "",
      r.commodity ?? "", r.season ?? "", r.volume ?? "", r.status,
      r.price != null ? String(r.price) : "",
    ].map((v) => `"${v.replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agri_reports.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <ViewToggle view={view} onChange={setView} />
      <LanguageToggle />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        commodity={commodity}
        onCommodityChange={setCommodity}
        status={status}
        onStatusChange={setStatus}
        commodities={commodities}
        onExportCsv={handleExportCsv}
      />
      {view === "map" ? (
        <>
          <AgriMap reports={filtered} onPinClick={handlePinClick} />
          <PinPopup report={selected} onClose={() => setSelected(null)} />
        </>
      ) : (
        <div className="pt-[210px] sm:pt-[200px] h-full">
          <ReportsTable reports={filtered} />
        </div>
      )}
    </div>
  );
};

export default Index;
