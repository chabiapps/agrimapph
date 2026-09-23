/**
 * Desktop-only right sidebar for the Mapa page (~320-360px, fixed width).
 * Holds dashboard-style summary panels; additional panel content
 * lands in follow-up prompts.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { getCommodityIcon } from "@/lib/categories";
import { useLang } from "@/lib/i18n";

export interface StatusStats {
  total: number;
  surplus: number;
  balanced: number;
  deficit: number;
}

type StatusKey = "surplus" | "balanced" | "deficit";

/** Minimal report shape for the sidebar panels (panel-local fetch, includes created_at). */
export interface SidebarReport {
  id: string;
  subcategory: string | null;
  category: string | null;
  status: string;
  region: string | null;
  province: string | null;
  municipality: string | null;
  barangay: string | null;
  created_at: string | null;
}

interface MapRightPanelProps {
  /** Global counts reusing the Buod dashboard summary-cards formula. */
  stats: StatusStats;
  /** Currently active shared status filter (for card highlight). */
  selectedStatus: string[];
  /** Same navigation pattern as the Buod cards (setStatus + setTab), targeting Listahan. */
  onSelectStatus: (s: StatusKey | null) => void;
  /** Region row → sets the shared search filter and stays on Mapa (pins filter via `filtered`). */
  onSelectRegion: (region: string) => void;
  /** Latest row → opens the pin detail (same as clicking a map pin). */
  onSelectReport: (reportId: string) => void;
  /** "Tingnan lahat" links → Listahan tab. */
  onViewAll: () => void;
}

const CARDS: {
  key: StatusKey | null;
  label: string;
  dot: string;
  num: string;
  bar: string;
  get: (s: StatusStats) => number;
}[] = [
  { key: "surplus", label: "Sobra", dot: "bg-[#22c55e]", num: "text-green-600", bar: "border-l-[#22c55e]", get: (s) => s.surplus },
  { key: "balanced", label: "Sapat", dot: "bg-[#eab308]", num: "text-yellow-600", bar: "border-l-[#eab308]", get: (s) => s.balanced },
  { key: "deficit", label: "Kulang", dot: "bg-[#ef4444]", num: "text-red-600", bar: "border-l-[#ef4444]", get: (s) => s.deficit },
  { key: null, label: "Kabuuang Report", dot: "bg-primary", num: "text-foreground", bar: "border-l-primary", get: (s) => s.total },
];

const STATUS_DOT: Record<string, string> = {
  surplus: "bg-[#22c55e]",
  deficit: "bg-[#ef4444]",
  balanced: "bg-[#eab308]",
};

const STATUS_LABEL: Record<string, { en: string; fil: string }> = {
  surplus: { en: "Surplus", fil: "Sobra" },
  deficit: { en: "Deficit", fil: "Kulang" },
  balanced: { en: "Balanced", fil: "Sapat" },
};

const REGION_LIMIT = 8;
const LATEST_LIMIT = 6;

const PanelHeader = ({ title, subtitle, onViewAll }: { title: string; subtitle: string; onViewAll: () => void }) => (
  <div className="flex items-start justify-between gap-2">
    <div>
      <h2 className="text-[13px] font-bold text-[#111827]">{title}</h2>
      <p className="text-[11px] leading-snug text-[#6b7280]">{subtitle}</p>
    </div>
    <button
      type="button"
      onClick={onViewAll}
      className="mt-0.5 flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-[#16a34a] hover:text-[#15803d] transition-colors"
    >
      Tingnan lahat
      <ChevronRight className="h-3.5 w-3.5" />
    </button>
  </div>
);

const MapRightPanel = ({
  stats, selectedStatus, onSelectStatus,
  onSelectRegion, onSelectReport, onViewAll,
}: MapRightPanelProps) => {
  const { lang } = useLang();
  const [panelRows, setPanelRows] = useState<SidebarReport[]>([]);

  // Panel-local fetch: region counts + chronological order need `created_at`,
  // which the Map page's list query (BASE_COLS) doesn't select — same
  // lightest-column approach as the Buod Dashboard's own query.
  useEffect(() => {
    let active = true;
    db.from("agri_reports")
      .select("id, subcategory, category, status, region, province, municipality, barangay, created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!active || !data) return;
        setPanelRows(data as unknown as SidebarReport[]);
      }, (err) => console.error("[MapRightPanel] panel rows error:", err));
    return () => { active = false; };
  }, []);

  const topRegions = useMemo(() => {
    const counts = new Map<string, number>();
    panelRows.forEach((r) => {
      const region = (r.region ?? "").trim();
      if (!region) return;
      counts.set(region, (counts.get(region) ?? 0) + 1);
    });
    return [...counts.entries()]
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, REGION_LIMIT);
  }, [panelRows]);

  // Already newest-first from the ordered query.
  const latest = useMemo(() => panelRows.slice(0, LATEST_LIMIT), [panelRows]);

  // Lightweight relative-time formatter (no extra locale dep — date-fns v3
  // ships no Filipino locale, so FIL strings are hand-rolled).
  const relativeTime = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
    if (lang === "fil") {
      if (mins < 1) return "ngayong lang";
      if (mins < 60) return `${mins} min ang nakalipas`;
      const h = Math.round(mins / 60);
      if (h < 24) return `${h} oras ang nakalipas`;
      const days = Math.round(h / 24);
      if (days < 7) return `${days} araw ang nakalipas`;
      if (days < 30) return `${Math.round(days / 7)} linggo ang nakalipas`;
      return d.toLocaleDateString("fil-PH", { month: "short", day: "numeric", year: "numeric" });
    }
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const h = Math.round(mins / 60);
    if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
    const days = Math.round(h / 24);
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
    if (days < 30) return `${Math.round(days / 7)} week${Math.round(days / 7) === 1 ? "" : "s"} ago`;
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  };
  return (
    <aside
      data-testid="map-right-panel"
      className="hidden md:flex w-[340px] shrink-0 flex-col bg-white border-l border-[#e5e7eb] h-full min-h-0"
      aria-label="Summary panels"
    >
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
        {/* Pangkalahatang Kalagayan (Overall Status) */}
        <section aria-label="Pangkalahatang Kalagayan">
          <h2 className="text-[13px] font-bold text-[#111827]">
            Pangkalahatang Kalagayan
          </h2>
          <p className="text-[11px] leading-snug text-[#6b7280]">
            Overall Status
          </p>
          <div className="mt-2 grid grid-cols-4 items-stretch gap-2">
            {CARDS.map((card) => {
              const isActive = card.key === null
                ? selectedStatus.length === 0
                : selectedStatus.includes(card.key);
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => onSelectStatus(card.key)}
                  aria-pressed={isActive}
                  title={`${card.label}: ${card.get(stats)} — tingnan sa Listahan`}
                  className={cn(
                    "flex flex-col items-center rounded-xl border border-[#e5e7eb] border-l-[3px] bg-white px-1 py-2.5 text-center transition-all hover:shadow-sm active:scale-95",
                    card.bar,
                    isActive && "bg-primary/5 ring-2 ring-[#16a34a]/40"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", card.dot)} aria-hidden />
                  <span className={cn("mt-1 text-xl font-extrabold leading-none tabular-nums", card.num)}>
                    {card.get(stats)}
                  </span>
                  <span className="mt-1 text-[10px] font-semibold leading-tight text-[#6b7280]">
                    {card.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Pinakamaraming Report sa Bawat Rehiyon (two-column region × count list) */}
        <section aria-label="Pinakamaraming Report sa Bawat Rehiyon">
          <PanelHeader title="Pinakamaraming Report sa Bawat Rehiyon" subtitle="Most reports by region" onViewAll={onViewAll} />
          <div className="mt-2 overflow-hidden rounded-xl border border-[#e5e7eb]">
            {topRegions.length === 0 ? (
              <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                Wala pang datos ng rehiyon.
              </p>
            ) : (
              <ul className="max-h-[220px] divide-y divide-[#f1f2f4] overflow-y-auto">
                {topRegions.map(({ region, count }) => (
                  <li key={region}>
                    <button
                      type="button"
                      onClick={() => onSelectRegion(region)}
                      className="grid w-full grid-cols-[1fr_auto] items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-50 active:scale-[0.99]"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-[#111827]">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#16a34a]" aria-hidden />
                        <span className="truncate">{region}</span>
                      </span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#15803d]">
                        {count}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Latest Reports (chronological) */}
        <section aria-label="Latest Reports">
          <PanelHeader title="Latest Reports" subtitle="Pinakabagong mga ulat" onViewAll={onViewAll} />
          <div className="mt-2 overflow-hidden rounded-xl border border-[#e5e7eb]">
            {latest.length === 0 ? (
              <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                Wala pang ulat.
              </p>
            ) : (
              <ul className="max-h-[320px] divide-y divide-[#f1f2f4] overflow-y-auto">
                {latest.map((r) => {
                  const label = STATUS_LABEL[r.status]?.[lang] ?? r.status;
                  const place = [r.barangay, r.municipality].filter(Boolean).join(", ") || "—";
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => onSelectReport(r.id)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-gray-50 active:scale-[0.99]"
                      >
                        <span className="text-xl leading-none shrink-0" aria-hidden>
                          {getCommodityIcon(r.subcategory, r.category)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[12px] font-bold text-[#111827]">
                              {r.subcategory ?? "—"}
                            </span>
                            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[r.status] ?? "bg-gray-400")} aria-hidden />
                            <span className="shrink-0 text-[10px] font-semibold text-[#6b7280]">{label}</span>
                          </span>
                          <span className="block truncate text-[11px] leading-snug text-[#6b7280]">
                            {place}{r.province ? ` · ${r.province}` : ""}
                          </span>
                          <span className="block text-[10px] leading-snug text-[#9ca3af]">
                            {relativeTime(r.created_at)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
};

export default MapRightPanel;
