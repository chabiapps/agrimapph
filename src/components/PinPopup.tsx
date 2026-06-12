import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, Calendar } from "lucide-react";
import { useLang } from "@/lib/i18n";

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
}

interface Props {
  report: AgriReport | null;
  onClose: () => void;
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  surplus: { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-300" },
  deficit: { bg: "bg-red-100 dark:bg-red-950", text: "text-red-700 dark:text-red-300" },
  balanced: { bg: "bg-yellow-100 dark:bg-yellow-950", text: "text-yellow-700 dark:text-yellow-300" },
};

const PinPopup = ({ report, onClose }: Props) => {
  const { t } = useLang();
  const open = !!report;
  const priceColor =
    report?.status === "deficit" ? "text-red-600" :
    report?.status === "surplus" ? "text-green-600" :
    "text-yellow-600";
  const statusKey = (report?.status ?? "balanced") as "surplus" | "deficit" | "balanced";
  const statusStyle = statusStyles[statusKey] ?? statusStyles.balanced;
  const statusLabel = t(statusKey);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl p-6 pb-[88px] max-h-[75vh] overflow-y-auto bottom-[72px]"
      >
        {report && (
          <div className="flex flex-col gap-5">
            <SheetHeader className="text-left space-y-2 pr-8">
              <SheetTitle className="text-3xl font-extrabold leading-tight">
                {report.commodity ?? "—"}
              </SheetTitle>
              <div>
                <Badge className={`${statusStyle.bg} ${statusStyle.text} text-sm font-bold px-3 py-1 border-0`}>
                  {statusLabel}
                </Badge>
              </div>
            </SheetHeader>

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
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default PinPopup;
