import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AgriMap from "@/components/AgriMap";
import PinPopup from "@/components/PinPopup";
import ReportsTable from "@/components/ReportsTable";
import FilterBar from "@/components/FilterBar";
import LanguageToggle from "@/components/LanguageToggle";
import ReportFormPage from "@/components/ReportFormPage";
import BottomNav, { Tab } from "@/components/BottomNav";
import MapFilterSheet from "@/components/MapFilterSheet";
import AuthGate from "@/components/AuthGate";
import { useAuth } from "@/lib/AuthContext";
import { LogOut } from "lucide-react";
import { CategoryKey, inferCategory } from "@/lib/categories";

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
  category: string | null;
  subcategory: string | null;
}

type MapMode = "current_supply" | "planting_intention";

const Index = () => {
  const [reports, setReports] = useState<AgriReport[]>([]);
  const [selected, setSelected] = useState<AgriReport | null>(null);
  const [tab, setTab] = useState<Tab>("map");
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [commodity, setCommodity] = useState("all");
  const [category, setCategory] = useState<CategoryKey | "all">("all");
  const [status, setStatus] = useState("all");
  const [mapMode, setMapMode] = useState<MapMode>("current_supply");
  const [listType, setListType] = useState<"all" | "current_supply" | "planting_intention">("all");

  const fetchReports = useCallback(async () => {
    const { data, error, status, statusText } = await supabase
      .from("agri_reports")
      .select("id, lat, lng, status, region, province, municipality, barangay, price, volume, season, record_type, planted_date, expected_harvest_date, expected_volume, growth_stage, category, subcategory");

    console.log("[agri_reports] URL host:", "gnrhciktvgokhipvsvcq.supabase.co");
    console.log("[agri_reports] http status:", status, statusText);
    console.log("[agri_reports] raw response:", { data, error });
    console.log("[agri_reports] total rows:", data?.length ?? 0);
    if (error) {
      console.error("[agri_reports] SELECT error:", error);
      return;
    }
    if (data) {
      // DB has no `commodity` column — derive it from subcategory for downstream UI.
      const mapped = data.map((r) => ({ ...r, commodity: r.subcategory ?? null })) as AgriReport[];
      console.log("[agri_reports] sample mapped row:", mapped[0]);
      setReports(mapped);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const commodities = useMemo(() => {
    const inCat = (r: AgriReport) => {
      if (category === "all") return true;
      const c = (r.category ?? inferCategory(r.commodity)) as string;
      return c === category;
    };
    return [...new Set(reports.filter(inCat).map((r) => r.commodity).filter(Boolean) as string[])].sort();
  }, [reports, category]);

  const mapReports = useMemo(
    () => reports.filter((r) => (r.record_type ?? "current_supply") === mapMode),
    [reports, mapMode]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const source = tab === "map"
      ? mapReports
      : (listType === "all" ? reports : reports.filter((r) => (r.record_type ?? "current_supply") === listType));
    const isPlantingView = tab === "map" ? mapMode === "planting_intention" : listType === "planting_intention";
    return source.filter((r) => {
      if (category !== "all") {
        const c = (r.category ?? inferCategory(r.commodity)) as string;
        if (c !== category) return false;
      }
      if (commodity !== "all" && r.commodity !== commodity) return false;
      // Status (surplus/deficit/balanced) only applies to current_supply records
      if (!isPlantingView && status !== "all" && r.status !== status) return false;
      if (q) {
        const hay = [r.region, r.province, r.municipality, r.barangay, r.commodity]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports, mapReports, tab, search, category, commodity, status, listType, mapMode]);

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
              category={category}
              onCategoryChange={setCategory}
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
            <div className="px-4 pt-3 flex gap-2">
              {([
                { v: "all", label: "Lahat" },
                { v: "current_supply", label: "Ngayon" },
                { v: "planting_intention", label: "🌱 Paparating" },
              ] as const).map((o) => (
                <button
                  key={o.v}
                  onClick={() => setListType(o.v)}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-full border transition-colors ${listType === o.v ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground/70 border-border"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0">
              <ReportsTable reports={filtered} />
            </div>
          </div>
        )}

        {tab === "report" && (
          <AuthGate>
            <ReportFormPage onSubmitted={(rt) => {
              fetchReports();
              if (rt === "planting_intention") setMapMode("planting_intention");
              setTab("map");
            }} />
          </AuthGate>
        )}
      </main>

      <UserBadge />
      <BottomNav tab={tab} onChange={setTab} />
    </div>
  );
};

const UserBadge = () => {
  const { user, signOut } = useAuth();
  if (!user) return null;
  const initial = (user.email ?? "?").charAt(0).toUpperCase();
  return (
    <button
      onClick={signOut}
      title="Mag-logout"
      className="fixed top-3 right-3 z-[600] flex items-center gap-2 bg-card/95 backdrop-blur border border-border rounded-full pl-1 pr-3 py-1 shadow-lg hover:bg-muted transition-colors"
    >
      <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-sm">
        {initial}
      </span>
      <LogOut className="w-4 h-4 text-foreground/70" />
    </button>
  );
};

export default Index;
