import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { useLang } from "@/lib/i18n";
import { getCommodityIcon } from "@/lib/categories";
import { ContactIcons } from "@/components/ContactButtons";
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
  record_type?: string | null;
  subcategory?: string | null;
  category?: string | null;
  phone_number?: string | null;
  messenger_username?: string | null;
  has_phone?: boolean;
  has_messenger?: boolean;
  reported_by?: string | null;
  created_at?: string | null;
}

export const PAGE_SIZE = 10;

const statusStyles: Record<string, string> = {
  surplus: "bg-green-500/15 text-green-700 border-green-500/30",
  deficit: "bg-red-500/15 text-red-700 border-red-500/30",
  balanced: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
};

/** Filipino status labels already used across the app (FilterBar, map legend, i18n). */
const statusLabel: Record<string, string> = {
  surplus: "Sobra",
  deficit: "Kulang",
  balanced: "Sapat",
};

type SortKey =
  | "record_type" | "commodity" | "region" | "status" | "price"
  | "volume" | "province" | "municipality" | "barangay" | "season"
  | "reported_by" | "created_at";

/** Compact relative timestamp ("2h ago" style) for the Nakapag-ulat column. */
const relativeTime = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 1) return "ngayon lang";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

type SortDir = "asc" | "desc";

const ReportsTable = ({ reports, onRowClick, onLogin }: { reports: AgriReport[]; onRowClick?: (r: AgriReport) => void; onLogin?: () => void }) => {
  const { t } = useLang();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); return; }
    if (sortDir === "asc") { setSortDir("desc"); return; }
    setSortKey(null);
    setSortDir("asc");
  };

  const sorted = useMemo(() => {
    if (!sortKey) return reports;
    const rows = [...reports];
    rows.sort((a, b) => {
      const pick = (r: AgriReport) => sortKey === "record_type"
        ? (r.record_type ?? "current_supply")
        : (r as unknown as Record<string, unknown>)[sortKey];
      const av = pick(a);
      const bv = pick(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [reports, sortKey, sortDir]);

  // Reset to page 1 + prune selection whenever the filtered set changes.
  useEffect(() => {
    setPage(1);
    setSelectedIds((prev) => {
      const ids = new Set(reports.map((r) => r.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [reports]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sorted, safePage]
  );
  const from = sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, sorted.length);

  const pageIds = useMemo(() => pageRows.map((r) => r.id), [pageRows]);
  const allPageChecked = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageChecked = pageIds.some((id) => selectedIds.has(id));

  const toggleRow = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const togglePage = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageChecked) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });

  // Compact numbered pages with ellipsis (1 … 4 5 6 … 12).
  const pageItems: (number | "…")[] = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const set = new Set<number>([1, 2, safePage - 1, safePage, safePage + 1, totalPages - 1, totalPages]);
    const nums = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const out: (number | "…")[] = [];
    let prev = 0;
    nums.forEach((n) => {
      if (n - prev > 1) out.push("…");
      out.push(n);
      prev = n;
    });
    return out;
  }, [totalPages, safePage]);

  const SortableHead = ({
    label, sortKey: key, align,
  }: { label: string; sortKey: SortKey; align?: "right" }) => {
    const active = sortKey === key;
    const Icon = !active ? ChevronsUpDown : sortDir === "asc" ? ChevronUp : ChevronDown;
    return (
      <TableHead className={align === "right" ? "text-right" : undefined}>
        <button
          type="button"
          onClick={() => toggleSort(key)}
          aria-label={`Sort by ${label}`}
          className={`inline-flex items-center gap-1 font-semibold select-none transition-colors hover:text-green-700 ${
            active ? "text-green-600" : "text-muted-foreground"
          } ${align === "right" ? "flex-row-reverse" : ""}`}
        >
          <span>{label}</span>
          <Icon className={`h-4 w-4 ${active ? "text-green-600" : "opacity-50"}`} />
        </button>
      </TableHead>
    );
  };

  return (
  <div className="flex h-full w-full min-w-0 flex-col bg-background">
    {/*
      Single horizontal+vertical scrollport for the table. The `[&>div]`
      override neutralises the shared <Table> component's own
      `overflow-auto` wrapper: if that wrapper kept scrolling, horizontal
      scrolling would happen there while vertical scrolling happened here,
      and the sticky cells would break.

      Stickiness lives on the `th` elements (not on `<thead>`) because
      sticky thead has patchy support — notably older Safari. Header cells
      use z-20 so they paint above the body's sticky checkbox cells (z-10).
    */}
    <div className="min-h-0 min-w-0 flex-1 overflow-auto p-4 [&>div]:overflow-visible">
    <Table className="min-w-[1500px] whitespace-nowrap">
      <TableHeader className="bg-background [&_tr]:border-b [&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:border-b [&_th]:bg-background">
        <TableRow>
          <TableHead className="sticky left-0 w-10 bg-background">
            <Checkbox
              checked={allPageChecked || (somePageChecked ? "indeterminate" : false)}
              onCheckedChange={togglePage}
              aria-label="Piliin lahat sa pahinang ito"
            />
          </TableHead>
          <SortableHead label="Type" sortKey="record_type" />
          <SortableHead label={t("commodity")} sortKey="commodity" />
          <SortableHead label={t("region")} sortKey="region" />
          <SortableHead label={t("status")} sortKey="status" />
          <SortableHead label={`${t("price")} (₱)`} sortKey="price" align="right" />
          <SortableHead label={t("volume")} sortKey="volume" />
          <SortableHead label={t("province")} sortKey="province" />
          <SortableHead label={t("municipality")} sortKey="municipality" />
          <SortableHead label={t("barangay")} sortKey="barangay" />
          <SortableHead label={t("season")} sortKey="season" />
          <TableHead className="font-semibold text-muted-foreground">Contact</TableHead>
          <SortableHead label="Nakapag-ulat" sortKey="reported_by" />
          <SortableHead label="Oras" sortKey="created_at" />
          <TableHead className="w-10"><span className="sr-only">Detalye</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pageRows.length === 0 && (
          <TableRow>
            <TableCell colSpan={15} className="py-10 text-center text-sm text-muted-foreground">
              Walang rekord para sa filter na ito.
            </TableCell>
          </TableRow>
        )}
        {pageRows.map((r) => {
          const isPlanting = (r.record_type ?? "current_supply") === "planting_intention";
          const checked = selectedIds.has(r.id);
          return (
          <TableRow
            key={r.id}
            data-state={checked ? "selected" : undefined}
            onClick={() => onRowClick?.(r)}
            className={cn("group", onRowClick && "cursor-pointer hover:bg-accent/50")}
          >
            {/* Sticky checkbox column: keeps selection reachable while
                scrolling right. Background mirrors the row's own hover /
                selected state so it never looks like a hole. */}
            <TableCell
              onClick={(e) => e.stopPropagation()}
              className="sticky left-0 z-10 bg-background group-hover:bg-accent/50 group-data-[state=selected]:bg-muted"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggleRow(r.id)}
                aria-label={`Piliin ang ulat ${r.commodity ?? r.id}`}
              />
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={isPlanting
                  ? "bg-green-500/15 text-green-700 border-green-500/30"
                  : "bg-blue-500/15 text-blue-700 border-blue-500/30"}
              >
                {isPlanting ? "🌱 Paparating" : "Ngayon"}
              </Badge>
            </TableCell>
            <TableCell className="font-medium">
              <span className="flex items-center gap-1.5">
                <span>{getCommodityIcon(r.subcategory, r.category)}</span>
                {r.commodity ?? "—"}
              </span>
            </TableCell>
            <TableCell>{r.region ?? "—"}</TableCell>
            <TableCell>
              <Badge className={`${statusStyles[r.status] || ""}`}>
                {statusLabel[r.status] ?? r.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {r.price != null ? `₱${Number(r.price).toLocaleString()}` : "—"}
            </TableCell>
            <TableCell>{r.volume ?? "—"}</TableCell>
            <TableCell>{r.province ?? "—"}</TableCell>
            <TableCell>{r.municipality ?? "—"}</TableCell>
            <TableCell>{r.barangay ?? "—"}</TableCell>
            <TableCell>{r.season ?? "—"}</TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}><ContactIcons report={r} onLogin={onLogin} /></TableCell>
            <TableCell className="max-w-[160px] truncate">{r.reported_by ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground">{relativeTime(r.created_at)}</TableCell>
            <TableCell>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            </TableCell>
          </TableRow>
        );})}
      </TableBody>
    </Table>
    </div>
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#e5e7eb] bg-white px-4 py-2.5">
      <p className="text-[12px] text-[#6b7280]" aria-live="polite">
        Showing {from}–{to} of {sorted.length} reports
      </p>
      <nav aria-label="Listahan pagination" className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={safePage <= 1}
          aria-label="Nakaraang pahina"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white text-[#374151] transition-colors hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageItems.map((item, i) =>
          item === "…" ? (
            <span key={`e${i}`} className="px-1 text-[12px] text-[#9ca3af]" aria-hidden>…</span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => setPage(item)}
              aria-current={item === safePage ? "page" : undefined}
              aria-label={`Pahina ${item}`}
              className={cn(
                "h-8 min-w-8 rounded-lg border px-2 text-[12px] font-semibold transition-colors",
                item === safePage
                  ? "border-[#16a34a] bg-[#16a34a] text-white"
                  : "border-[#e5e7eb] bg-white text-[#374151] hover:bg-gray-50"
              )}
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage >= totalPages}
          aria-label="Susunod na pahina"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white text-[#374151] transition-colors hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  </div>
  );
};

export default ReportsTable;
