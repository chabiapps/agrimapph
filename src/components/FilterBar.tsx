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
    <div className="absolute top-20 sm:top-20 left-1/2 -translate-x-1/2 z-[999] flex flex-wrap items-center gap-2 bg-card/90 backdrop-blur-md rounded-lg border border-border shadow-lg p-3 w-[95vw] max-w-2xl">
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
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[140px] min-h-[52px] text-base">
          <SelectValue placeholder={t("status")} />
        </SelectTrigger>
        <SelectContent className="text-base">
          <SelectItem value="all" className="min-h-[44px] text-base">{t("allStatus")}</SelectItem>
          <SelectItem value="surplus" className="min-h-[44px] text-base">{t("surplus")}</SelectItem>
          <SelectItem value="deficit" className="min-h-[44px] text-base">{t("deficit")}</SelectItem>
          <SelectItem value="balanced" className="min-h-[44px] text-base">{t("balanced")}</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" className="min-h-[52px] text-base gap-2 px-4" onClick={onExportCsv}>
        <Download className="h-5 w-5" />
        {t("csv")}
      </Button>
    </div>
  );
};

export default FilterBar;
