import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

interface ReportPanelProps {
  report: AgriReport;
  onClose: () => void;
}

const statusStyles: Record<string, string> = {
  surplus: "bg-green-500/15 text-green-700 border-green-500/30",
  deficit: "bg-red-500/15 text-red-700 border-red-500/30",
  balanced: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
};

const DetailRow = ({ label, value }: { label: string; value: string | number | null }) => (
  <div className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-0">
    <span className="text-sm text-muted-foreground font-medium">{label}</span>
    <span className="text-sm font-semibold text-foreground">{value ?? "—"}</span>
  </div>
);

const ReportPanel = ({ report, onClose }: ReportPanelProps) => {
  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-card/95 backdrop-blur-md border-l border-border shadow-2xl z-[1000] flex flex-col animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div>
          <h2 className="text-base font-bold text-card-foreground tracking-tight">
            {report.commodity || "Unknown Commodity"}
          </h2>
          <Badge className={`mt-1.5 text-xs capitalize ${statusStyles[report.status] || ""}`}>
            {report.status}
          </Badge>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Location</p>
        <DetailRow label="Region" value={report.region} />
        <DetailRow label="Province" value={report.province} />
        <DetailRow label="Municipality" value={report.municipality} />
        <DetailRow label="Barangay" value={report.barangay} />

        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mt-5 mb-2">Market Data</p>
        <DetailRow label="Commodity" value={report.commodity} />
        <DetailRow label="Price" value={report.price != null ? `₱${Number(report.price).toLocaleString()}` : null} />
        <DetailRow label="Volume" value={report.volume != null ? `${Number(report.volume).toLocaleString()} kg` : null} />
        <DetailRow label="Season" value={report.season} />
      </div>
    </div>
  );
};

export default ReportPanel;
