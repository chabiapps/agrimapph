import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLang } from "@/lib/i18n";

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  commodity: string;
  onCommodityChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  commodities: string[];
  onExportCsv: () => void;
}

const FilterBar = ({
  search, onSearchChange,
  commodity, onCommodityChange,
  status, onStatusChange,
  commodities,
  onExportCsv,
}: FilterBarProps) => {
  const { t } = useLang();
  return (
    <div className="flex flex-wrap items-center gap-2 bg-card border-b border-border p-3 w-full">
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder={t("search")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 min-h-[52px] text-base"
        />
      </div>
      <Select value={commodity} onValueChange={onCommodityChange}>
        <SelectTrigger className="w-[160px] min-h-[52px] text-base">
          <SelectValue placeholder={t("commodity")} />
        </SelectTrigger>
        <SelectContent className="text-base">
          <SelectItem value="all" className="min-h-[44px] text-base">{t("allCommodities")}</SelectItem>
          {commodities.map((c) => (
            <SelectItem key={c} value={c} className="min-h-[44px] text-base">{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2 w-full">
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
              className={`flex-1 min-h-[52px] px-2 rounded-md border text-base font-semibold transition-all ${b.cls} ${isActive ? b.ring : "opacity-80"}`}
              aria-pressed={isActive}
            >
              {b.label}
            </button>
          );
        })}
      </div>
      <Button variant="outline" className="min-h-[52px] text-base gap-2 px-4" onClick={onExportCsv}>
        <Download className="h-5 w-5" />
        {t("csv")}
      </Button>
    </div>
  );
};

export default FilterBar;
