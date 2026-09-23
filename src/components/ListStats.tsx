import { ArrowDownWideNarrow, ArrowUpNarrowWide, CheckCircle2, Download, FileText, RotateCcw, Scale, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, CategoryKey } from "@/lib/categories";
import { cn } from "@/lib/utils";

/** Minimal inline SVG sparkline (no chart lib needed). */
export const Sparkline = ({
  values,
  stroke,
  id,
  className = "h-8 w-full",
}: {
  values: number[];
  stroke: string;
  id: string;
  /** Sizing override — parent cards render a smaller trend line. */
  className?: string;
}) => {
  const w = 120;
  const h = 32;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const pts = values.map((v, i) => {
    const x = Math.round(i * step);
    const y = Math.round(h - 3 - ((v - min) / span) * (h - 6));
    return `${x},${y}`;
  });
  const area = `0,${h} ${pts.join(" ")} ${w},${h}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

interface StatCardDef {
  key: "surplus" | "balanced" | "deficit" | null;
  label: string;
  value: number;
  pct: string;
  Icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  spark: string;
  sparkId: string;
  /**
   * Card shell classes. `tint` is the per-status background wash and `bar`
   * is the 3px left accent — both mirror the Mapa right-panel stat cards
   * (`rounded-xl border border-[#e5e7eb] border-l-[3px] bg-…`), which is the
   * established pattern for clickable stat cards in this app.
   */
  tint: string;
  hoverTint: string;
  bar: string;
  numColor: string;
}

interface ListFilterRowProps {
  listType: "all" | "current_supply" | "planting_intention";
  onListTypeChange: (v: "all" | "current_supply" | "planting_intention") => void;
  category: CategoryKey | "all";
  onCategoryChange: (v: CategoryKey | "all") => void;
  commodity: string;
  onCommodityChange: (v: string) => void;
  commodities: string[];
  status: string[];
  onStatusChange: (v: string) => void;
  onReset: () => void;
  onExportCsv?: () => void;
}

const TYPE_PILLS = [
  { v: "all", label: "Lahat" },
  { v: "current_supply", label: "Ngayon" },
  { v: "planting_intention", label: "🌱 Paparating" },
] as const;

/**
 * Listahan filter row: type pills + category/commodity/status dropdowns +
 * Reset + Export CSV. All controls reuse the existing shared filter state —
 * visual restructure only, no new logic.
 */
export const ListFilterRow = ({
  listType, onListTypeChange,
  category, onCategoryChange,
  commodity, onCommodityChange, commodities,
  status, onStatusChange,
  onReset, onExportCsv,
}: ListFilterRowProps) => {
  const dropdownCls =
    "h-9 border-[#e5e7eb] bg-white text-[13px] font-medium shrink-0";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Lahat/Ngayon/Paparating toggle pills (restyled to match FilterBar pills) */}
      <div className="flex items-center gap-1.5" role="group" aria-label="Uri ng tala">
        {TYPE_PILLS.map((o) => {
          const active = listType === o.v;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => onListTypeChange(o.v)}
              aria-pressed={active}
              className={cn(
                "h-[28px] px-3 rounded-full border text-[12px] font-semibold transition-all",
                active
                  ? "bg-[#16a34a] text-white border-transparent"
                  : "bg-white text-foreground/70 border-[#e5e7eb] hover:border-foreground/30"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      <div className="hidden h-4 w-px bg-[#e5e7eb] sm:block" aria-hidden />

      {/* Lahat ng Kategorya */}
      <Select
        value={category}
        onValueChange={(v) => { onCategoryChange(v as CategoryKey | "all"); onCommodityChange("all"); }}
      >
        <SelectTrigger className={cn(dropdownCls, "w-[170px]")} aria-label="Kategorya">
          <SelectValue placeholder="Lahat ng Kategorya" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Lahat ng Kategorya</SelectItem>
          {CATEGORIES.map((c) => (
            <SelectItem key={c.key} value={c.key}>
              {c.icon} {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Lahat ng Produkto */}
      <Select value={commodity} onValueChange={onCommodityChange}>
        <SelectTrigger className={cn(dropdownCls, "w-[180px]")} aria-label="Produkto">
          <SelectValue placeholder="Lahat ng Produkto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Lahat ng Produkto</SelectItem>
          {commodities.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Lahat ng Status (single-select display over the shared multi array) */}
      <Select
        value={status.length === 1 ? status[0] : "all"}
        onValueChange={onStatusChange}
      >
        <SelectTrigger className={cn(dropdownCls, "w-[160px]")} aria-label="Status">
          <SelectValue placeholder="Lahat ng Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Lahat ng Status</SelectItem>
          <SelectItem value="surplus">🟢 Sobra</SelectItem>
          <SelectItem value="balanced">🟡 Sapat</SelectItem>
          <SelectItem value="deficit">🔴 Kulang</SelectItem>
        </SelectContent>
      </Select>

      <button
        type="button"
        onClick={onReset}
        className="inline-flex h-9 items-center gap-1.5 px-2 text-[12px] font-medium text-[#6b7280] hover:text-foreground transition-colors"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </button>

      <div className="ms-auto">
        {onExportCsv && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            className="h-9 text-[12px] gap-1.5 border-[#e5e7eb] bg-white hover:bg-gray-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        )}
      </div>
    </div>
  );
};

const ListStats = ({
  stats,
  trends,
  selectedStatus,
  onSelectStatus,
}: {
  stats: { total: number; surplus: number; balanced: number; deficit: number };
  /** Per-status weekly bucketed counts for the sparklines. */
  trends: Record<"surplus" | "balanced" | "deficit" | "total", number[]>;
  selectedStatus: string[];
  onSelectStatus: (s: "surplus" | "balanced" | "deficit" | null) => void;
}) => {
  const pct = (n: number) =>
    stats.total > 0 ? `${Math.round((n / stats.total) * 100)}%` : "—";
  const cards: StatCardDef[] = [
    { key: "surplus", label: "Sobra", value: stats.surplus, pct: pct(stats.surplus), Icon: ArrowUpNarrowWide, iconBg: "bg-green-500/15", iconColor: "text-green-600", spark: "#22c55e", sparkId: "spark-surplus", tint: "bg-green-500/10", hoverTint: "hover:bg-green-500/15", bar: "border-l-[#22c55e]", numColor: "text-green-700" },
    { key: "balanced", label: "Sapat", value: stats.balanced, pct: pct(stats.balanced), Icon: Scale, iconBg: "bg-yellow-500/15", iconColor: "text-yellow-600", spark: "#eab308", sparkId: "spark-balanced", tint: "bg-yellow-500/10", hoverTint: "hover:bg-yellow-500/15", bar: "border-l-[#eab308]", numColor: "text-yellow-700" },
    { key: "deficit", label: "Kulang", value: stats.deficit, pct: pct(stats.deficit), Icon: ArrowDownWideNarrow, iconBg: "bg-red-500/15", iconColor: "text-red-600", spark: "#ef4444", sparkId: "spark-deficit", tint: "bg-red-500/10", hoverTint: "hover:bg-red-500/15", bar: "border-l-[#ef4444]", numColor: "text-red-700" },
    { key: null, label: "Kabuuang Ulat", value: stats.total, pct: "100%", Icon: FileText, iconBg: "bg-primary/10", iconColor: "text-[#16a34a]", spark: "#16a34a", sparkId: "spark-total", tint: "bg-primary/10", hoverTint: "hover:bg-primary/15", bar: "border-l-primary", numColor: "text-[#111827]" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4" role="group" aria-label="Mga istatistika ng Listahan">
      {cards.map((c) => {
        const active = c.key === null ? selectedStatus.length === 0 : selectedStatus.includes(c.key);
        return (
          <button
            key={c.label}
            type="button"
            onClick={() => onSelectStatus(c.key)}
            aria-pressed={active}
            title={`${c.label}: ${c.value} (${c.pct} ng total)`}
            className={cn(
              // Compact shell reusing the Mapa right-panel stat-card pattern:
              // rounded-xl + hairline border + 3px left status accent +
              // status-tinted background + subtle always-on shadow, so each
              // card reads as a distinct surface on the #f9fafb page.
              "rounded-xl border border-[#e5e7eb] border-l-[3px] px-2.5 py-2 text-left shadow-sm transition-all hover:shadow active:scale-[0.99]",
              c.tint,
              c.hoverTint,
              c.bar,
              active && "ring-2 ring-[#16a34a]/40"
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg", c.iconBg)}>
                <c.Icon className={cn("h-3.5 w-3.5", c.iconColor)} aria-hidden />
              </span>
              <span className="min-w-0 truncate text-[11px] font-bold text-[#374151]">{c.label}</span>
              <span className="ms-auto flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-[#6b7280]">
                <CheckCircle2 className="h-2.5 w-2.5 text-[#16a34a]" aria-hidden />
                {c.pct}
                <span className="sr-only"> ng total</span>
              </span>
            </div>
            <div className="mt-1.5 flex items-end gap-2">
              <span className={cn("text-xl font-extrabold leading-none tabular-nums", c.numColor)}>
                {c.value}
              </span>
              <div className="min-w-0 flex-1 pb-0.5">
                <Sparkline
                  values={trends[c.key ?? "total"]}
                  stroke={c.spark}
                  id={c.sparkId}
                  className="h-4 w-full"
                />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ListStats;
