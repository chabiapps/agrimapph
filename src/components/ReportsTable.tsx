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
}

const statusStyles: Record<string, string> = {
  surplus: "bg-green-500/15 text-green-700 border-green-500/30",
  deficit: "bg-red-500/15 text-red-700 border-red-500/30",
  balanced: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
};

const ReportsTable = ({ reports }: { reports: AgriReport[] }) => (
  <div className="h-full w-full overflow-auto bg-background p-4">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Region</TableHead>
          <TableHead>Province</TableHead>
          <TableHead>Municipality</TableHead>
          <TableHead>Barangay</TableHead>
          <TableHead>Commodity</TableHead>
          <TableHead>Season</TableHead>
          <TableHead>Volume</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Price (₱)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.region ?? "—"}</TableCell>
            <TableCell>{r.province ?? "—"}</TableCell>
            <TableCell>{r.municipality ?? "—"}</TableCell>
            <TableCell>{r.barangay ?? "—"}</TableCell>
            <TableCell className="font-medium">{r.commodity ?? "—"}</TableCell>
            <TableCell>{r.season ?? "—"}</TableCell>
            <TableCell>{r.volume ?? "—"}</TableCell>
            <TableCell>
              <Badge className={`capitalize ${statusStyles[r.status] || ""}`}>
                {r.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {r.price != null ? `₱${Number(r.price).toLocaleString()}` : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default ReportsTable;
