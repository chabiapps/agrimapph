import { SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLang } from "@/lib/i18n";
import { CATEGORIES, CategoryKey, getCommodityIcon } from "@/lib/categories";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryKey | "all";
  onCategoryChange: (v: CategoryKey | "all") => void;
  commodity: string;
  onCommodityChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  commodities: string[];
  onReset: () => void;
}

const MapFilterSheet = ({
  open, onOpenChange,
  category, onCategoryChange,
  commodity, onCommodityChange,
  status, onStatusChange,
  commodities,
  onReset,
}: Props) => {
  const { t } = useLang();
  const activeCount =
    (category !== "all" ? 1 : 0) +
    (commodity !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0);

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
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-card" aria-label="Filters active" />
          )}
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl !bottom-[72px] z-[1100] max-h-[70vh] overflow-y-auto"
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
          <SheetTitle className="text-xl">Salain / Filter</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Category quick tap buttons */}
          <div>
            <div className="text-sm font-semibold text-muted-foreground mb-2">Uri ng Pagkain</div>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.map((c) => {
                const isActive = category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      const next = isActive ? "all" : c.key;
                      onCategoryChange(next);
                      // Reset commodity when category changes so stale selection doesn't hide all pins
                      onCommodityChange("all");
                    }}
                    aria-pressed={isActive}
                    className={`flex flex-col items-center justify-center gap-1 min-h-[76px] rounded-xl border-2 px-1 py-2 transition-all ${
                      isActive
                        ? "bg-primary/10 border-primary text-foreground shadow"
                        : "bg-card border-border text-foreground/80 hover:bg-accent"
                    }`}
                  >
                    <span className="text-2xl leading-none">{c.icon}</span>
                    <span className="text-[11px] font-semibold text-center leading-tight">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Commodity pills (scoped to selected category) */}
          <div>
            <div className="text-sm font-semibold text-muted-foreground mb-2">{t("commodity")}</div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              <button
                type="button"
                onClick={() => onCommodityChange("all")}
                className={`shrink-0 px-4 py-2.5 rounded-full border text-sm font-semibold transition-all min-h-[44px] ${
                  commodity === "all"
                    ? "bg-green-600 border-green-600 text-white"
                    : "bg-card border-border text-foreground/80 hover:bg-accent"
                }`}
                aria-pressed={commodity === "all"}
              >
                Lahat
              </button>
              {commodities.map((c) => {
                const isActive = commodity === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onCommodityChange(isActive ? "all" : c)}
                    className={`shrink-0 px-4 py-2.5 rounded-full border text-sm font-semibold transition-all min-h-[44px] flex items-center gap-1.5 ${
                      isActive
                        ? "bg-green-600 border-green-600 text-white"
                        : "bg-card border-border text-foreground/80 hover:bg-accent"
                    }`}
                    aria-pressed={isActive}
                  >
                    <span className="text-base leading-none">{getCommodityIcon(c)}</span>
                    <span>{c}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status */}
          <div>
            <div className="text-sm font-semibold text-muted-foreground mb-2">{t("status")}</div>
            <div className="flex gap-2">
              {([
                { value: "surplus", label: `${t("surplus")}`, cls: "bg-green-600 hover:bg-green-700 text-white border-green-700", ring: "ring-4 ring-green-300" },
                { value: "deficit", label: `${t("deficit")}`, cls: "bg-red-600 hover:bg-red-700 text-white border-red-700", ring: "ring-4 ring-red-300" },
                { value: "balanced", label: `${t("balanced")}`, cls: "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-600", ring: "ring-4 ring-yellow-300" },
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

          {/* Reset */}
          <button
            type="button"
            onClick={onReset}
            disabled={activeCount === 0}
            className="w-full min-h-[52px] rounded-xl border-2 border-border bg-card text-base font-semibold text-foreground hover:bg-accent transition-colors disabled:opacity-40"
          >
            I-reset ang mga filter / Reset filters
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MapFilterSheet;
