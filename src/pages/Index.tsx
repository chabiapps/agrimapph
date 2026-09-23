import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import AgriMap from "@/components/AgriMap";
import PinPopup from "@/components/PinPopup";
import ReportsTable from "@/components/ReportsTable";
import FilterBar from "@/components/FilterBar";
import LanguageToggle from "@/components/LanguageToggle";
import BottomNav from "@/components/BottomNav";
import { tabFromPath, pathForTab, type Tab } from "@/lib/routes";
import TopNav from "@/components/TopNav";
import DesktopLayout from "@/components/DesktopLayout";
import MapRightPanel from "@/components/MapRightPanel";
import MapFilterSheet from "@/components/MapFilterSheet";
import AuthGate from "@/components/AuthGate";
import ProfileButton from "@/components/ProfileButton";
import ReportTabGate from "@/components/ReportTabGate";
import ReportRightPanel from "@/components/ReportRightPanel";
import ReportHeader from "@/components/ReportHeader";
import ReportProgressCard, { type ProgressStep } from "@/components/ReportProgressCard";
import Dashboard from "@/components/Dashboard";
import ListStats, { ListFilterRow } from "@/components/ListStats";
import { useIsMobile } from "@/hooks/use-mobile";
import { CategoryKey, inferCategory, CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";


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
  phone_number?: string | null;
  messenger_username?: string | null;
  reported_by?: string | null;
  created_at?: string | null;
}

type MapMode = "current_supply" | "planting_intention";

/** Query params owned by the filter state (kept in sync with the URL). */
const FILTER_PARAM_KEYS = ["q", "category", "commodity", "status", "mode", "ltype"] as const;

const Index = () => {
  const isMobile = useIsMobile();

  // ---- URL-driven navigation ----------------------------------------------
  // The active page lives in the URL (/mapa, /listahan, /buod, /mag-ulat), so a
  // refresh or a typed-in path lands on that same page instead of resetting to
  // Mapa. Before this, `tab` was plain useState and the URL never changed.
  const location = useLocation();
  const navigate = useNavigate();
  const tab: Tab = tabFromPath(location.pathname);

  // One-off snapshot of the query string at mount, used to seed the filters so
  // a refresh (or a shared link) restores them too. Read once via a lazy
  // initializer so the write-back effect below agrees with the URL on mount and
  // doesn't immediately strip the params.
  const [initialParams] = useState(() => new URLSearchParams(window.location.search));

  const [reports, setReports] = useState<AgriReport[]>([]);
  const [verifiedTiers, setVerifiedTiers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<AgriReport | null>(null);
  /** Live Mag-ulat step completion, owned by ReportFormPage (pushed up via
      ReportTabGate) and rendered in the desktop right rail. Empty until the
      form's first progress emission. */
  const [reportProgress, setReportProgress] = useState<ProgressStep[]>([]);
  const handleReportProgress = useCallback((steps: ProgressStep[]) => {
    setReportProgress(steps);
  }, []);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState(() => initialParams.get("q") ?? "");
  const [commodity, setCommodity] = useState(() => initialParams.get("commodity") ?? "all");
  const [category, setCategory] = useState<CategoryKey | "all">(
    () => (initialParams.get("category") as CategoryKey | null) ?? "all"
  );
  const [status, setStatus] = useState<string[]>(() => {
    const s = initialParams.get("status");
    return s ? s.split(",").filter(Boolean) : [];
  });
  const [mapMode, setMapMode] = useState<MapMode>(() => {
    const m = initialParams.get("mode");
    return m === "planting_intention" ? "planting_intention" : "current_supply";
  });
  const [listType, setListType] = useState<"all" | "current_supply" | "planting_intention">(() => {
    const lt = initialParams.get("ltype");
    return lt === "current_supply" || lt === "planting_intention" ? lt : "all";
  });
  /** Navigate to a page; keeps the query string so filters survive page switches. */
  const setTab = useCallback(
    (t: Tab) => {
      if (tabFromPath(location.pathname) === t) return;
      navigate({ pathname: pathForTab(t), search: location.search });
    },
    [location.pathname, location.search, navigate]
  );

  // Mirror the filters into the URL (replace, so filter tweaks don't flood the
  // history stack). This is the "nice-to-have" from the brief: it makes a
  // refresh on Listahan keep the active filters, not just the page.
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    for (const k of FILTER_PARAM_KEYS) p.delete(k);
    if (search) p.set("q", search);
    if (category !== "all") p.set("category", category);
    if (commodity !== "all") p.set("commodity", commodity);
    if (status.length) p.set("status", status.join(","));
    if (mapMode !== "current_supply") p.set("mode", mapMode);
    if (listType !== "all") p.set("ltype", listType);

    const nextQuery = p.toString();
    if (nextQuery !== location.search.replace(/^\?/, "")) {
      navigate(
        { pathname: location.pathname, search: nextQuery ? `?${nextQuery}` : "" },
        { replace: true }
      );
    }
  }, [
    search, category, commodity, status, mapMode, listType,
    location.pathname, location.search, navigate,
  ]);

  // Signup leaves a placeholder profile row with no user_type — such users must
  // finish onboarding before using the app. Returning users pass straight through.
  const { user, loading: authLoading } = useAuth();
  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    db.from("user_profiles")
      .select("id, user_type")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { user_type?: string | null } | null;
        if (active && row && !row.user_type) navigate("/onboarding", { replace: true });
      });
    return () => { active = false; };
  }, [authLoading, user, navigate]);


  const fetchReports = useCallback(async () => {
    const BASE_COLS =
      "id, lat, lng, status, region, province, municipality, barangay, price, volume, season, record_type, planted_date, expected_harvest_date, expected_volume, growth_stage, category, subcategory, reported_by, created_at";

    let { data, error, status, statusText } = (await supabase
      .from("agri_reports")
      .select(`${BASE_COLS}, phone_number, messenger_username`)) as {
      data: Record<string, unknown>[] | null;
      error: { message: string } | null;
      status: number;
      statusText: string;
    };

    if (error) {
      // Contact columns may not exist yet — fall back to the base column set.
      ({ data, error, status, statusText } = (await supabase
        .from("agri_reports")
        .select(BASE_COLS)) as unknown as {
        data: Record<string, unknown>[] | null;
        error: { message: string } | null;
        status: number;
        statusText: string;
      });
    }

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
      const mapped = data.map((r) => ({ ...r, commodity: (r.subcategory as string) ?? null })) as unknown as AgriReport[];
      console.log("[agri_reports] sample mapped row:", mapped[0]);
      setReports(mapped);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Verification tiers for pin badges (community / government verified reporters).
  useEffect(() => {
    let active = true;
    db.from("user_profiles")
      .select("id, verification_tier")
      .in("verification_tier", ["community", "government"])
      .then(({ data }) => {
        if (!active || !data) return;
        const map: Record<string, string> = {};
        (data as { id: string; verification_tier: string }[]).forEach((p) => { map[p.id] = p.verification_tier; });
        setVerifiedTiers(map);
      });
    return () => { active = false; };
  }, []);


  // Commodity dropdown options: distinct subcategory values straight from
  // agri_reports, scoped to the selected category (all categories when "all").
  const [dbCommodities, setDbCommodities] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    let q = db.from("agri_reports").select("subcategory").not("subcategory", "is", null);
    if (category !== "all") q = q.eq("category", category);
    q.then(({ data }) => {
      if (!active || !data) return;
      const vals = [...new Set((data as { subcategory: string | null }[])
        .map((r) => r.subcategory)
        .filter(Boolean) as string[])].sort();
      setDbCommodities(vals);
    });
    return () => { active = false; };
  }, [category]);

  const commodities = useMemo(() => {
    if (dbCommodities.length > 0) return dbCommodities;
    // Fallback while the fetch is in flight: derive from loaded reports.
    const inCat = (r: AgriReport) => {
      if (category === "all") return true;
      const c = (r.category ?? inferCategory(r.commodity)) as string;
      return c === category;
    };
    return [...new Set(reports.filter(inCat).map((r) => r.commodity).filter(Boolean) as string[])].sort();
  }, [dbCommodities, reports, category]);

  const mapReports = useMemo(
    () => reports.filter((r) => (r.record_type ?? "current_supply") === mapMode),
    [reports, mapMode]
  );

  // Global status counts reusing the Buod dashboard summary-cards formula
  // (older revision used `rows.length` / `rows.filter(status)`; here driven by
  // the Map page's loaded `reports` so no extra query is needed).
  const statusStats = useMemo(() => ({
    total: reports.length,
    surplus: reports.filter((r) => r.status === "surplus").length,
    balanced: reports.filter((r) => r.status === "balanced").length,
    deficit: reports.filter((r) => r.status === "deficit").length,
  }), [reports]);

  // Right-panel rows navigate to relevant filtered views — same cross-tab
  // patterns as the Buod cards (setStatus/setCommodity/setTab).
  const handleRightPanelStatus = useCallback((s: "surplus" | "balanced" | "deficit" | null) => {
    setStatus(s === null ? [] : [s]);
    setTab("list");
  }, [setTab]);

  // Region row → shared search filter; the Map pins filter via `filtered`
  // (search haystack already covers region), so the user stays on Mapa.
  const handleRightPanelRegion = useCallback((region: string) => {
    setSearch(region);
    setTab("map");
  }, [setTab]);

  // Latest row → open the pin detail (same as clicking a map pin).
  // Falls back to a filtered Listahan view if the report isn't loaded locally.
  const handleRightPanelReport = useCallback((reportId: string) => {
    const found = reports.find((r) => r.id === reportId);
    if (found) {
      setFilterOpen(false);
      setSelected(found);
      return;
    }
    db.from("agri_reports")
      .select("id, lat, lng, status, region, province, municipality, barangay, price, volume, season, record_type, planted_date, expected_harvest_date, expected_volume, growth_stage, category, subcategory, reported_by, created_at, phone_number, messenger_username")
      .eq("id", reportId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setTab("list"); return; }
        const row = data as unknown as Record<string, unknown>;
        setSelected({ ...row, commodity: (row.subcategory as string) ?? null } as unknown as AgriReport);
      }, () => setTab("list"));
  }, [reports, setTab]);

  // "Tingnan lahat" → Listahan, newest-first request via a search clear.
  // (Listahan's table sorts client-side; "newest" ordering matches its
  // default unsorted = fetch order, newest first.)
  const handleRightPanelViewAll = useCallback(() => {
    setSearch("");
    setTab("list");
  }, [setTab]);

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
      if (!isPlantingView && status.length > 0 && !status.includes(r.status)) return false;
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

  const isDesktopMap = !isMobile && tab === "map";
  const isDesktopShell = !isMobile && (tab === "map" || tab === "list" || tab === "report");

  // Shared header actions for the desktop shell (EN/FIL toggle + profile avatar).
  const headerActions = (
    <div className="flex items-center gap-2">
      <LanguageToggle inline />
      <ProfileButton inline />
    </div>
  );

  // Weekly bucketed counts (last 8 weeks) for the Listahan sparklines.
  // Reuses the loaded `reports` rows — no extra query. BASE_COLS selects
  // created_at, so buckets are dated; if rows ever arrive without a usable
  // timestamp the counts fall back to an evenly spread flat trend.
  const listTrends = useMemo(() => {
    const zeros = () => Array(8).fill(0) as number[];
    const out: Record<"surplus" | "balanced" | "deficit" | "total", number[]> = {
      surplus: zeros(), balanced: zeros(), deficit: zeros(), total: zeros(),
    };
    const dated = reports.filter((r) => (r as unknown as { created_at?: string | null }).created_at);
    if (dated.length === 0) {
      (["surplus", "balanced", "deficit"] as const).forEach((k) => {
        const n = statusStats[k];
        const per = Math.floor(n / 8);
        out[k] = Array(8).fill(per);
        out[k][7] += n - per * 8;
        out[k].forEach((v, i) => { out.total[i] += v; });
      });
      return out;
    }
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    dated.forEach((r) => {
      const t = new Date((r as unknown as { created_at: string }).created_at).getTime();
      if (isNaN(t)) return;
      const idx = Math.min(7, Math.max(0, 7 - Math.floor((now - t) / week)));
      out.total[idx] += 1;
      if (r.status === "surplus" || r.status === "balanced" || r.status === "deficit") {
        out[r.status][idx] += 1;
      }
    });
    return out;
  }, [reports, statusStats]);

  // Listahan body — desktop gets the filter row + stat cards; mobile keeps
  // the compact type pills only (filtering/table logic untouched).
  const listBody = (
    <>
      {isDesktopShell ? (
        <div className="shrink-0 space-y-2.5 border-b border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
          <ListFilterRow
            listType={listType}
            onListTypeChange={setListType}
            category={category}
            onCategoryChange={setCategory}
            commodity={commodity}
            onCommodityChange={setCommodity}
            commodities={commodities}
            status={status}
            onStatusChange={(v) => setStatus(v === "all" ? [] : [v])}
            onReset={() => { setSearch(""); setCategory("all"); setCommodity("all"); setStatus([]); }}
            onExportCsv={handleExportCsv}
          />
          <ListStats
            stats={statusStats}
            trends={listTrends}
            selectedStatus={status}
            onSelectStatus={(s) => setStatus(s === null ? [] : [s])}
          />
        </div>
      ) : (
        <div className={cn("px-4 pt-3 flex gap-2", isMobile && "pb-3")}>
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
      )}
      {/* min-w-0 keeps this column shrinkable so the wide table scrolls
          inside ReportsTable instead of inflating the page. */}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <ReportsTable reports={filtered} />
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden flex-col">
      {!isMobile && !isDesktopShell && <TopNav tab={tab} />}

      <div className={cn("relative flex-1 flex flex-col h-full", isMobile && "w-screen", !isMobile && "bg-[#f9fafb]")}>
        {isMobile && <LanguageToggle />}

        <main className={cn("flex-1 min-h-0", isMobile && "pb-[72px]", isDesktopShell && "flex min-h-0")}>
          {tab === "map" && (
            isDesktopMap ? (
              <DesktopLayout
                tab={tab}
                category={category}
                onCategoryChange={setCategory}
                onCommodityChange={setCommodity}
                header={
                  <FilterBar
                    mode="map"
                    search={search}
                    onSearchChange={setSearch}
                    showSearch
                    category={category}
                    onCategoryChange={setCategory}
                    commodity={commodity}
                    onCommodityChange={setCommodity}
                    status={status}
                    onStatusChange={(v) => setStatus(prev => prev.includes(v) ? prev.filter(s => s !== v) : [...prev, v])}
                    commodities={commodities}
                    onReset={() => { setSearch(""); setCategory("all"); setCommodity("all"); setStatus([]); }}
                    rightSlot={headerActions}
                  />
                }
                rightPanel={
                  <MapRightPanel
                    stats={statusStats}
                    selectedStatus={status}
                    onSelectStatus={handleRightPanelStatus}
                    onSelectRegion={handleRightPanelRegion}
                    onSelectReport={handleRightPanelReport}
                    onViewAll={handleRightPanelViewAll}
                  />
                }
              >
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="relative flex-1 min-h-0 flex">
                    <div className={cn("relative flex-1 h-full transition-all duration-300")}>
                      <div className={cn(
                        "absolute z-[500] bg-card/95 backdrop-blur border border-border rounded-full p-1 shadow-lg flex transition-all duration-300",
                        "top-3 left-1/2 -translate-x-1/2"
                      )}>
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
                      <AgriMap reports={filtered} onPinClick={handlePinClick} mode={mapMode} verifiedTiers={verifiedTiers} />
                      {filtered.length === 0 && (
                        <div className="absolute inset-0 z-[400] flex items-center justify-center pointer-events-none">
                          <div className="bg-card/95 backdrop-blur border border-border rounded-2xl shadow-lg px-6 py-4 text-center">
                            <p className="text-base font-semibold text-foreground">Walang rekord para sa filter na ito</p>
                            <p className="text-sm text-muted-foreground mt-1">Subukan ang ibang kategorya, produkto, o status.</p>
                          </div>
                        </div>
                      )}
                      <MapFilterSheet
                        isMobile={isMobile}
                        open={filterOpen}
                        onOpenChange={(o) => { setFilterOpen(o); if (o) setSelected(null); }}
                        category={category}
                        onCategoryChange={setCategory}
                        commodity={commodity}
                        onCommodityChange={setCommodity}
                        status={status}
                        onStatusChange={(v) => setStatus(prev => prev.includes(v) ? prev.filter(s => s !== v) : [...prev, v])}
                        commodities={commodities}
                        onReset={() => { setCategory("all"); setCommodity("all"); setStatus([]); }}
                      />
                    </div>
                  </div>
                  {/* CTA banner below the map (desktop only, spans center column) */}
                  <div className="shrink-0 border-t border-[#e5e7eb] bg-white px-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[15px] font-bold text-[#111827]">
                          Tuloy-tuloy ang pagtatanim, pagtitinda at pagbili.
                        </p>
                        <p className="mt-0.5 truncate text-[13px] text-[#6b7280]">
                          Ibahagi ang ani o pangangailangan mo para makita ng buong bansa.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTab("report")}
                        className="shrink-0 rounded-full bg-[#16a34a] px-5 py-2.5 text-[14px] font-bold text-white shadow-sm transition-all hover:bg-[#15803d] active:scale-95"
                      >
                        + Mag-ulat ng Report
                      </button>
                    </div>
                  </div>
                </div>
              </DesktopLayout>
            ) : (
            <div className="relative h-full w-full flex">
              <div className={cn("relative flex-1 h-full transition-all duration-300")}>
                <div className={cn(
                  "absolute z-[500] bg-card/95 backdrop-blur border border-border rounded-full p-1 shadow-lg flex transition-all duration-300",
                  isMobile ? "top-3 left-1/2 -translate-x-1/2" : "top-3 left-1/2 -translate-x-1/2"
                )}>
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
                <AgriMap reports={filtered} onPinClick={handlePinClick} mode={mapMode} verifiedTiers={verifiedTiers} />
                {filtered.length === 0 && (
                  <div className="absolute inset-0 z-[400] flex items-center justify-center pointer-events-none">
                    <div className="bg-card/95 backdrop-blur border border-border rounded-2xl shadow-lg px-6 py-4 text-center">
                      <p className="text-base font-semibold text-foreground">Walang rekord para sa filter na ito</p>
                      <p className="text-sm text-muted-foreground mt-1">Subukan ang ibang kategorya, produkto, o status.</p>
                    </div>
                  </div>
                )}
                <MapFilterSheet
                  isMobile={isMobile}
                  open={filterOpen}
                  onOpenChange={(o) => { setFilterOpen(o); if (o) setSelected(null); }}
                  category={category}
                  onCategoryChange={setCategory}
                  commodity={commodity}
                  onCommodityChange={setCommodity}
                  status={status}
                  onStatusChange={(v) => setStatus(prev => prev.includes(v) ? prev.filter(s => s !== v) : [...prev, v])}
                  commodities={commodities}
                  onReset={() => { setCategory("all"); setCommodity("all"); setStatus([]); }}
                />
              </div>
            </div>
            )
          )}

          {tab === "list" && (
            isDesktopShell ? (
              <DesktopLayout
                tab={tab}
                category={category}
                onCategoryChange={setCategory}
                onCommodityChange={setCommodity}
                header={
                  <FilterBar
                    mode="list"
                    search={search}
                    onSearchChange={setSearch}
                    rightSlot={headerActions}
                  />
                }
              >
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  {listBody}
                </div>
              </DesktopLayout>
            ) : (
              <div className="flex h-full w-full min-w-0 flex-col">
                {listBody}
              </div>
            )
          )}

          {tab === "dashboard" && (
            <Dashboard
              setTab={setTab}
              setCommodity={setCommodity}
              setStatus={setStatus}
              setMapMode={setMapMode}
              setSelected={setSelected}
            />
          )}

          {tab === "report" && (
            isDesktopShell ? (
              <DesktopLayout
                tab={tab}
                category={category}
                onCategoryChange={setCategory}
                onCommodityChange={setCommodity}
                header={
                  <ReportHeader
                    search={location.search}
                    rightSlot={headerActions}
                  />
                }
                rightPanel={
                  /*
                    Desktop-only right rail. Mounted as the third column
                    (same `rightPanel` slot Mapa uses), not inside the form.
                    Reminders + live progress card + encouragement — the submit
                    button lives at the bottom of the form itself.
                  */
                  <ReportRightPanel
                    progress={
                      reportProgress.length > 0 ? (
                        <ReportProgressCard steps={reportProgress} />
                      ) : undefined
                    }
                  />
                }
              >
                {/*
                  Full-bleed content wrapper: no horizontal padding/centering
                  here — children (form card, map, table) span the full center
                  column width, matching Mapa/Listahan. (A previous `p-4
                  md:p-6 max-w-5xl mx-auto` here is what left dead space beside
                  the form card vs. the filter bar above it.)
                */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
                  <AuthGate>
                    <ReportTabGate onProgress={handleReportProgress} onSubmitted={(rt) => {
                      fetchReports();
                      if (rt === "planting_intention") setMapMode("planting_intention");
                      setTab("map");
                    }} />
                  </AuthGate>
                </div>
              </DesktopLayout>
            ) : (
              <AuthGate>
                <ReportTabGate onSubmitted={(rt) => {
                  fetchReports();
                  if (rt === "planting_intention") setMapMode("planting_intention");
                  setTab("map");
                }} />
              </AuthGate>
            )
          )}
        </main>
        <PinPopup
          isMobile={isMobile}
          report={selected}
          onClose={() => setSelected(null)}
        />
        {isMobile && <ProfileButton />}
        {isMobile && <BottomNav tab={tab} />}
      </div>
    </div>
  );
};

export default Index;
