import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MapPin, Phone } from "lucide-react";

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

const PinPopup = ({ report, onClose }: Props) => {
  const open = !!report;
  const priceColor =
    report?.status === "deficit" ? "text-red-600" :
    report?.status === "surplus" ? "text-green-600" :
    "text-yellow-600";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl p-6 max-h-[85vh]">
        {report && (
          <div className="flex flex-col gap-5">
            <SheetHeader className="text-left space-y-1">
              <SheetTitle className="text-3xl font-extrabold leading-tight">
                {report.commodity ?? "—"}
              </SheetTitle>
            </SheetHeader>

            <div className={`text-5xl font-extrabold ${priceColor}`}>
              {report.price != null ? `₱${report.price}/kg` : "—"}
            </div>

            <div className="flex items-start gap-2 text-lg text-foreground">
              <MapPin className="h-6 w-6 mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <div className="font-semibold">{report.barangay ?? "—"}</div>
                <div className="text-muted-foreground">{report.municipality ?? ""}</div>
              </div>
            </div>

            <Button
              className="w-full min-h-[60px] text-lg font-bold bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              <Phone className="h-5 w-5" />
              Makipag-ugnayan
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default PinPopup;
