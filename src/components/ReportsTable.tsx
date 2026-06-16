import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { useLang, TKey } from "@/lib/i18n";

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
}

const statusStyles: Record<string, string> = {
  surplus: "bg-green-500/15 text-green-700 border-green-500/30",
  deficit: "bg-red-500/15 text-red-700 border-red-500/30",
  balanced: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
};

const ReportsTable = ({ reports }: { reports: AgriReport[] }) => {
  const { t } = useLang();
  return (
  <div className="h-full w-full overflow-auto bg-background p-4">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>{t("region")}</TableHead>
          <TableHead>{t("province")}</TableHead>
          <TableHead>{t("municipality")}</TableHead>
          <TableHead>{t("barangay")}</TableHead>
          <TableHead>{t("commodity")}</TableHead>
          <TableHead>{t("season")}</TableHead>
          <TableHead>{t("volume")}</TableHead>
          <TableHead>{t("status")}</TableHead>
          <TableHead className="text-right">{t("price")} (₱)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((r) => {
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
            <TableCell>{r.region ?? "—"}</TableCell>
            <TableCell>{r.province ?? "—"}</TableCell>
            <TableCell>{r.municipality ?? "—"}</TableCell>
            <TableCell>{r.barangay ?? "—"}</TableCell>
            <TableCell className="font-medium">{r.commodity ?? "—"}</TableCell>
            <TableCell>{r.season ?? "—"}</TableCell>
            <TableCell>{r.volume ?? "—"}</TableCell>
            <TableCell>
              <Badge className={`capitalize ${statusStyles[r.status] || ""}`}>
                {t(r.status as TKey) || r.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {r.price != null ? `₱${Number(r.price).toLocaleString()}` : "—"}
            </TableCell>
          </TableRow>
        );})}
      </TableBody>
    </Table>
  </div>
  );
};

export default ReportsTable;
