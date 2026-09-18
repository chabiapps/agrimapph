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
  category: CategoryKey | "all";
  onCategoryChange: (v: CategoryKey | "all") => void;
  commodity: string;
  onCommodityChange: (v: string) => void;
  status: string[];
  onStatusChange: (v: string) => void;
  commodities: string[];
  onExportCsv?: () => void;
  onReset: () => void;
}

const FilterBar = ({
  mode,
  search, onSearchChange,
  category, onCategoryChange,
  commodity, onCommodityChange,
  status, onStatusChange,
  commodities,
  onExportCsv,
  onReset,
}: FilterBarProps) => {
  const { lang } = useLang();

  return (
    <div className="h-[48px] w-full bg-white border-b border-[#e5e7eb] px-4 flex items-center justify-between shrink-0 z-10">
      <div className="flex items-center gap-3 h-full">
        {/* Search Input (List Mode Only) */}
        {mode === "list" && (
          <>
            <div className="relative w-[200px] h-full flex items-center">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={lang === "fil" ? "Maghanap..." : "Search..."}
                value={search}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="h-full pl-9 text-[14px] focus-visible:ring-0 border-none bg-transparent shadow-none"
              />
            </div>
            <div className="w-px h-4 bg-[#e5e7eb]" />
          </>
        )}

        {/* Category Dropdown */}
        <div className="relative w-[160px] h-full flex items-center">
          <select
            value={category}
            onChange={(e) => { onCategoryChange(e.target.value as CategoryKey | "all"); onCommodityChange("all"); }}
            className="w-full h-full bg-transparent text-[14px] font-medium text-foreground focus:outline-none cursor-pointer appearance-none"
          >
            <option value="all">Lahat ng Uri</option>
            {CATEGORIES.map(c => (
              <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
            ))}
          </select>
          <div className="absolute right-2 pointer-events-none text-muted-foreground text-[10px]">▼</div>
        </div>

        <div className="w-px h-4 bg-[#e5e7eb]" />

        {/* Commodity Dropdown */}
        <div className="relative w-[180px] h-full flex items-center">
          <select
            value={commodity}
            onChange={(e) => onCommodityChange(e.target.value)}
            className="w-full h-full bg-transparent text-[14px] font-medium text-foreground focus:outline-none cursor-pointer appearance-none"
          >
            <option value="all">Lahat ng Produkto</option>
            {commodities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="absolute right-2 pointer-events-none text-muted-foreground text-[10px]">▼</div>
        </div>

        <div className="w-px h-4 bg-[#e5e7eb]" />

        {/* Status Pills */}
        <div className="flex items-center gap-1.5">
          {[
            { v: "surplus", l: "Sobra", c: "bg-green-500" },
            { v: "deficit", l: "Kulang", c: "bg-red-500" },
            { v: "balanced", l: "Sapat", c: "bg-yellow-500" },
          ].map(({ v, l, c }) => {
            const active = status.includes(v);
            return (
              <button
                key={v}
                onClick={() => onStatusChange(v)}
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

        <div className="w-px h-4 bg-[#e5e7eb]" />

        <button
          onClick={onReset}
          className="text-[12px] font-medium text-[#6b7280] hover:text-foreground transition-colors"
        >
          I-reset
        </button>
      </div>

      {/* Export CSV (List Mode Only) */}
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
    </div>
  );
};

export default FilterBar;
