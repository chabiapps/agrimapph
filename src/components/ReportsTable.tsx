import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { useLang, TKey } from "@/lib/i18n";
import { getCommodityIcon } from "@/lib/categories";

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
}

const statusStyles: Record<string, string> = {
  surplus: "bg-green-500/15 text-green-700 border-green-500/30",
  deficit: "bg-red-500/15 text-red-700 border-red-500/30",
  balanced: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
};

type SortKey =
  | "record_type" | "commodity" | "region" | "status" | "price"
  | "volume" | "province" | "municipality" | "barangay" | "season";

type SortDir = "asc" | "desc";

const ReportsTable = ({ reports }: { reports: AgriReport[] }) => {
  const { t } = useLang();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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
  <div className="h-full w-full overflow-x-auto overflow-y-auto bg-background p-4">
    <Table className="min-w-[1200px] whitespace-nowrap">
      <TableHeader>
        <TableRow>
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
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => {
          const isPlanting = (r.record_type ?? "current_supply") === "planting_intention";
          return (
          <TableRow key={r.id}>
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
              <Badge className={`capitalize ${statusStyles[r.status] || ""}`}>
                {t(r.status as TKey) || r.status}
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
          </TableRow>
        );})}
      </TableBody>
    </Table>
  </div>
  );
};

export default ReportsTable;
