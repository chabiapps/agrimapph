import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, Calendar, Clock } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { getCommodityIcon } from "@/lib/categories";
import { ContactButtons } from "@/components/ContactButtons";
import { cn } from "@/lib/utils";

interface AgriReport {
  id: string;
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
  planted_date?: string | null;
  expected_harvest_date?: string | null;
  expected_volume?: string | null;
  growth_stage?: string | null;
  subcategory?: string | null;
  category?: string | null;
  phone_number?: string | null;
  messenger_username?: string | null;
}

interface Props {
  report: AgriReport | null;
  onClose: () => void;
  isMobile?: boolean;
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  surplus: { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-300" },
  deficit: { bg: "bg-red-100 dark:bg-red-950", text: "text-red-700 dark:text-red-300" },
  balanced: { bg: "bg-yellow-100 dark:bg-yellow-950", text: "text-yellow-700 dark:text-yellow-300" },
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const weeksUntil = (iso?: string | null): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const diffMs = d.getTime() - Date.now();
  return Math.round(diffMs / (1000 * 60 * 60 * 24 * 7));
};

const PinPopupContent = ({ report }: { report: AgriReport }) => {
  const { t } = useLang();
  const isPlanting = report.record_type === "planting_intention";

  const priceColor =
    report.status === "deficit" ? "text-red-600" :
    report.status === "surplus" ? "text-green-600" :
    "text-yellow-600";
  const statusKey = (report.status ?? "balanced") as "surplus" | "deficit" | "balanced";
  const statusStyle = statusStyles[statusKey] ?? statusStyles.balanced;
  const statusLabel = t(statusKey);

  const emoji = getCommodityIcon(report.subcategory, report.category);
  const weeks = weeksUntil(report.expected_harvest_date);
  const countdownLabel =
    weeks == null ? "—" :
    weeks < 0 ? `Harvested ${Math.abs(weeks)} week${Math.abs(weeks) === 1 ? "" : "s"} ago` :
    weeks === 0 ? "Harvest this week" :
    `Harvest in ${weeks} week${weeks === 1 ? "" : "s"}`;

  return (
    <div className="flex flex-col gap-5 h-full">
      {!isPlanting && (
        <div className="flex flex-col gap-5">
          <div className="text-left space-y-2 pr-8">
            <div className="text-3xl font-extrabold leading-tight flex items-center gap-2">
              <span style={{ fontSize: 32 }}>{emoji}</span>
              {report.commodity ?? "—"}
            </div>
            <div>
              <Badge className={`${statusStyle.bg} ${statusStyle.text} text-sm font-bold px-3 py-1 border-0`}>
                {statusLabel}
              </Badge>
            </div>
          </div>

          <div className={`text-5xl font-extrabold ${priceColor}`}>
            {report.price != null ? `₱${report.price}/kg` : "—"}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground font-semibold">
                <Package className="h-3.5 w-3.5" /> {t("volume")}
              </div>
              <div className="text-lg font-bold mt-1">{report.volume ?? "—"}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground font-semibold">
                <Calendar className="h-3.5 w-3.5" /> {t("season")}
              </div>
              <div className="text-lg font-bold mt-1">{report.season ?? "—"}</div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-base text-foreground">
            <MapPin className="h-6 w-6 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <div className="font-semibold text-lg">{report.barangay ?? "—"}</div>
              <div className="text-muted-foreground">{report.municipality ?? ""}</div>
            </div>
          </div>

          <div className="mt-auto border-t border-border bg-background px-0 py-3">
            <ContactButtons report={report} />
          </div>
        </div>
      )}

      {isPlanting && (
        <div className="flex flex-col gap-5">
          <div className="text-left space-y-2 pr-8">
            <div className="text-3xl font-extrabold leading-tight flex items-center gap-2">
              <span style={{ fontSize: 32 }}>{emoji}</span>
              {report.commodity ?? "—"}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm font-bold px-3 py-1 border-0">
                Planted · {formatDate(report.planted_date)}
              </Badge>
              {report.growth_stage && (
                <Badge variant="outline" className="text-sm font-bold px-3 py-1">
                  {report.growth_stage}
                </Badge>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 p-4">
            <div className="flex items-center gap-1.5 text-xs uppercase text-green-700 dark:text-green-300 font-semibold">
              <Clock className="h-3.5 w-3.5" /> Expected Harvest
            </div>
            <div className="text-2xl font-extrabold mt-1 text-green-700 dark:text-green-300">
              {countdownLabel}
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              {formatDate(report.expected_harvest_date)}
            </div>
          </div>

          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground font-semibold">
              <Package className="h-3.5 w-3.5" /> Expected Volume
            </div>
            <div className="text-lg font-bold mt-1">{report.expected_volume ?? "—"}</div>
          </div>

          <div className="flex items-start gap-2 text-base text-foreground">
            <MapPin className="h-6 w-6 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <div className="font-semibold text-lg">{report.barangay ?? "—"}</div>
              <div className="text-muted-foreground">{report.municipality ?? ""}</div>
            </div>
          </div>

          <div className="mt-auto border-t border-border bg-background px-0 py-3">
            <ContactButtons report={report} />
          </div>
        </div>
      )}
    </div>
  );
};

const PinPopup = ({ report, onClose, isMobile = true }: Props) => {
  const open = !!report;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-6 pt-3 max-h-[50vh] overflow-y-auto !bottom-[72px] z-[1100] [&>button]:z-10 [&_~_[data-radix-dialog-overlay]]:z-[1050]"
          style={{ zIndex: 1100 }}
        >
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" aria-hidden />
          {report && <PinPopupContent report={report} />}
        </SheetContent>
      </Sheet>
    );
  }

  if (!report) return null;

  return (
    <div className="w-[360px] h-full bg-background border-l border-border p-6 overflow-y-auto animate-in slide-in-from-right duration-300 z-50">
      <div className="flex justify-end mb-4">
        <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors">
          <span className="text-xl">✕</span>
        </button>
      </div>
      <PinPopupContent report={report} />
    </div>
  );
};

export default PinPopup;
