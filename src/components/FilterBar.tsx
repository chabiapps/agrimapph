import type { ReactNode } from "react";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, CategoryKey } from "@/lib/categories";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  mode: "map" | "list";
  search?: string;
  onSearchChange?: (v: string) => void;
  category?: CategoryKey | "all";
  onCategoryChange?: (v: CategoryKey | "all") => void;
  commodity?: string;
  onCommodityChange?: (v: string) => void;
  status?: string[];
  onStatusChange?: (v: string) => void;
  commodities?: string[];
  onExportCsv?: () => void;
  onReset?: () => void;
  /** Show the search input in map mode (list mode always shows it). */
  showSearch?: boolean;
  /** Optional actions rendered on the right side of the bar (e.g. language/profile). */
  rightSlot?: ReactNode;
}

const FilterBar = ({
  mode,
  search, onSearchChange,
  category = "all", onCategoryChange,
  commodity = "all", onCommodityChange,
  status = [], onStatusChange,
  commodities = [],
  onExportCsv,
  onReset,
  showSearch = false,
  rightSlot,
}: FilterBarProps) => {
  const { lang } = useLang();

  return (
    <div className="w-full bg-white border-b border-[#e5e7eb] px-4 shrink-0 z-10">
      <div className="min-h-[48px] py-1.5 w-full flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0 flex items-center gap-3 overflow-x-auto scrollbar-hide">
          {/* Search Input (List + Desktop Map modes) */}
          {(mode === "list" || showSearch) && (
            <>
              <div className="relative w-[200px] shrink-0 self-stretch flex items-center">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={
                    mode === "map"
                      ? lang === "fil"
                        ? "Hanapin ang commodity, lugar, o barangay..."
                        : "Search commodity, place, or barangay..."
                      : lang === "fil" ? "Maghanap..." : "Search..."
                  }
                  value={search}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="h-full pl-9 text-[14px] focus-visible:ring-0 border-none bg-transparent shadow-none"
                />
              </div>
              <div className="w-px h-4 bg-[#e5e7eb] shrink-0" />
            </>
          )}

        {/* Category + Commodity Dropdowns (Map Mode only — Listahan has its own filter row) */}
        {mode === "map" && (
          <>
            <div className="relative w-[160px] shrink-0 self-stretch flex items-center">
              <select
                value={category}
                onChange={(e) => { onCategoryChange?.(e.target.value as CategoryKey | "all"); onCommodityChange?.("all"); }}
                className="w-full h-full bg-transparent text-[14px] font-medium text-foreground focus:outline-none cursor-pointer appearance-none"
              >
                <option value="all">Lahat ng Uri</option>
                {CATEGORIES.map(c => (
                  <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                ))}
              </select>
              <div className="absolute right-2 pointer-events-none text-muted-foreground text-[10px]">▼</div>
            </div>

            <div className="w-px h-4 bg-[#e5e7eb] shrink-0" />

            <div className="relative w-[180px] shrink-0 self-stretch flex items-center">
              <select
                value={commodity}
                onChange={(e) => onCommodityChange?.(e.target.value)}
                className="w-full h-full bg-transparent text-[14px] font-medium text-foreground focus:outline-none cursor-pointer appearance-none"
              >
                <option value="all">Lahat ng Produkto</option>
                {commodities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="absolute right-2 pointer-events-none text-muted-foreground text-[10px]">▼</div>
            </div>

            <div className="w-px h-4 bg-[#e5e7eb] shrink-0" />
          </>
        )}

          {/* Status Pills (Map Mode only — Listahan shows status in its filter row) */}
          {mode === "map" && (
          <div className="flex items-center gap-1.5 shrink-0">
          {[
            { v: "surplus", l: "Sobra", c: "bg-green-500" },
            { v: "deficit", l: "Kulang", c: "bg-red-500" },
            { v: "balanced", l: "Sapat", c: "bg-yellow-500" },
          ].map(({ v, l, c }) => {
            const active = status.includes(v);
            return (
              <button
                key={v}
                onClick={() => onStatusChange?.(v)}
                className={cn(
                  "h-[28px] px-2.5 rounded-full border text-[12px] font-semibold transition-all",
                  active ? `${c} text-white border-transparent` : `bg-white text-foreground/70 border-[#e5e7eb] hover:border-foreground/30`
                )}
              >
                {l}
              </button>
            );
          })}
          </div>
        )}

        {onReset && (
          <>
            <div className="w-px h-4 bg-[#e5e7eb] shrink-0" />

            <button
              onClick={onReset}
              className="shrink-0 text-[12px] font-medium text-[#6b7280] hover:text-foreground transition-colors"
            >
              I-reset
            </button>
          </>
        )}
      </div>

      {/* Right side: Export CSV (List Mode Only) + optional action slot */}
      {((mode === "list" && onExportCsv) || rightSlot) && (
        <div className="flex items-center gap-2 shrink-0">
          {mode === "list" && onExportCsv && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCsv}
              className="h-8 text-[12px] gap-1.5 border-[#e5e7eb] hover:bg-gray-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          )}
          {rightSlot}
        </div>
      )}
      </div>
    </div>
  );
};

export default FilterBar;
