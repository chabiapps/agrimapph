import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AgriMap from "@/components/AgriMap";
import PinPopup from "@/components/PinPopup";
import ReportsTable from "@/components/ReportsTable";
import FilterBar from "@/components/FilterBar";
import LanguageToggle from "@/components/LanguageToggle";
import ReportFormPage from "@/components/ReportFormPage";
import BottomNav, { Tab } from "@/components/BottomNav";

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
  const [tab, setTab] = useState<Tab>("map");
  const [search, setSearch] = useState("");
  const [commodity, setCommodity] = useState("all");
  const [status, setStatus] = useState("all");

  const fetchReports = useCallback(async () => {
    const { data, error } = await supabase
      .from("agri_reports")
      .select("id, lat, lng, status, region, province, municipality, barangay, commodity, price, volume, season");
    if (!error && data) setReports(data);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

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
    <div className="relative h-screen w-screen overflow-hidden flex flex-col">
      <LanguageToggle />

      <main className="flex-1 min-h-0 pb-[72px]">
        {tab === "map" && (
          <div className="relative h-full w-full">
            <AgriMap reports={reports} onPinClick={handlePinClick} />
            <PinPopup report={selected} onClose={() => setSelected(null)} />
          </div>
        )}

        {tab === "list" && (
          <div className="h-full w-full flex flex-col">
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
            <div className="flex-1 min-h-0">
              <ReportsTable reports={filtered} />
            </div>
          </div>
        )}

        {tab === "report" && (
          <ReportFormPage onSubmitted={() => { fetchReports(); setTab("map"); }} />
        )}
      </main>

      <BottomNav tab={tab} onChange={setTab} />
    </div>
  );
};

export default Index;
