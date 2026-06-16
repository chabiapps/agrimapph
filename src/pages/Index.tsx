import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AgriMap from "@/components/AgriMap";
import PinPopup from "@/components/PinPopup";
import ReportsTable from "@/components/ReportsTable";
import FilterBar from "@/components/FilterBar";
import LanguageToggle from "@/components/LanguageToggle";
import ReportFormPage from "@/components/ReportFormPage";
import BottomNav, { Tab } from "@/components/BottomNav";
import MapFilterSheet from "@/components/MapFilterSheet";

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
  record_type: string | null;
  planted_date: string | null;
  expected_harvest_date: string | null;
  expected_volume: string | null;
  growth_stage: string | null;
}

type MapMode = "current_supply" | "planting_intention";

const Index = () => {
  const [reports, setReports] = useState<AgriReport[]>([]);
  const [selected, setSelected] = useState<AgriReport | null>(null);
  const [tab, setTab] = useState<Tab>("map");
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [commodity, setCommodity] = useState("all");
  const [status, setStatus] = useState("all");
  const [mapMode, setMapMode] = useState<MapMode>("current_supply");
  const [listType, setListType] = useState<"all" | "current_supply" | "planting_intention">("all");

  const fetchReports = useCallback(async () => {
    const { data, error } = await supabase
      .from("agri_reports")
      .select("id, lat, lng, status, region, province, municipality, barangay, commodity, price, volume, season, record_type, planted_date, expected_harvest_date, expected_volume, growth_stage");
    if (!error && data) setReports(data as AgriReport[]);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const commodities = useMemo(
    () => [...new Set(reports.map((r) => r.commodity).filter(Boolean) as string[])].sort(),
    [reports]
  );

  const mapReports = useMemo(
    () => reports.filter((r) => (r.record_type ?? "current_supply") === mapMode),
    [reports, mapMode]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const source = tab === "map" ? mapReports : reports;
    return source.filter((r) => {
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
  }, [reports, mapReports, tab, search, commodity, status]);

  const handlePinClick = useCallback((report: AgriReport) => {
    setFilterOpen(false);
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
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] bg-card/95 backdrop-blur border border-border rounded-full p-1 shadow-lg flex">
              <button
                onClick={() => setMapMode("current_supply")}
                className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${mapMode === "current_supply" ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}
              >
                Ngayon
              </button>
              <button
                onClick={() => setMapMode("planting_intention")}
                className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${mapMode === "planting_intention" ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}
              >
                🌱 Paparating
              </button>
            </div>
            <AgriMap reports={filtered} onPinClick={handlePinClick} mode={mapMode} />
            <MapFilterSheet
              open={filterOpen}
              onOpenChange={(o) => { setFilterOpen(o); if (o) setSelected(null); }}
              commodity={commodity}
              onCommodityChange={setCommodity}
              status={status}
              onStatusChange={setStatus}
              commodities={commodities}
            />
            <PinPopup
              report={selected}
              onClose={() => setSelected(null)}
            />
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
