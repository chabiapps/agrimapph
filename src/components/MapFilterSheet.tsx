import { SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLang } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commodity: string;
  onCommodityChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  commodities: string[];
}

const MapFilterSheet = ({
  open, onOpenChange,
  commodity, onCommodityChange,
  status, onStatusChange,
  commodities,
}: Props) => {
  const { t } = useLang();
  const activeCount = (commodity !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Filters"
          className="absolute top-[64px] right-4 z-[500] h-12 w-12 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-accent transition-colors"
        >
          <SlidersHorizontal className="h-5 w-5" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary ring-2 ring-card" />
          )}
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl !bottom-[72px] z-[1100] max-h-[50vh] overflow-y-auto"
        style={{ zIndex: 1100 }}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest("[data-radix-popper-content-wrapper],[data-radix-select-content],[data-radix-select-viewport]")) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest("[data-radix-popper-content-wrapper],[data-radix-select-content],[data-radix-select-viewport]")) {
            e.preventDefault();
          }
        }}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" aria-hidden />
        <SheetHeader>
          <SheetTitle className="text-xl">{t("status")} / {t("commodity")}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <Select value={commodity} onValueChange={onCommodityChange}>
            <SelectTrigger className="w-full min-h-[52px] text-base">
              <SelectValue placeholder={t("commodity")} />
            </SelectTrigger>
            <SelectContent className="text-base">
              <SelectItem value="all" className="min-h-[44px] text-base">{t("allCommodities")}</SelectItem>
              {commodities.map((c) => (
                <SelectItem key={c} value={c} className="min-h-[44px] text-base">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            {([
              { value: "surplus", label: `${t("surplus")} (Surplus)`, cls: "bg-green-600 hover:bg-green-700 text-white border-green-700", ring: "ring-4 ring-green-300" },
              { value: "deficit", label: `${t("deficit")} (Deficit)`, cls: "bg-red-600 hover:bg-red-700 text-white border-red-700", ring: "ring-4 ring-red-300" },
              { value: "balanced", label: `${t("balanced")} (Balanced)`, cls: "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-600", ring: "ring-4 ring-yellow-300" },
            ] as const).map((b) => {
              const isActive = status === b.value;
              return (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => onStatusChange(isActive ? "all" : b.value)}
                  className={`flex-1 min-h-[56px] px-2 rounded-md border text-base font-semibold transition-all ${b.cls} ${isActive ? b.ring : "opacity-80"}`}
                  aria-pressed={isActive}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MapFilterSheet;
