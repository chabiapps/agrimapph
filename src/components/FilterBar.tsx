import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  commodity: string;
  onCommodityChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  commodities: string[];
}

const FilterBar = ({
  search, onSearchChange,
  commodity, onCommodityChange,
  status, onStatusChange,
  commodities,
}: FilterBarProps) => (
  <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[1000] flex flex-wrap items-center gap-2 bg-card/90 backdrop-blur-md rounded-lg border border-border shadow-lg p-2 w-[95vw] max-w-xl">
    <div className="relative flex-1 min-w-[120px]">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search region, province…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-8 h-9 text-sm"
      />
    </div>
    <Select value={commodity} onValueChange={onCommodityChange}>
      <SelectTrigger className="w-[130px] h-9 text-sm">
        <SelectValue placeholder="Commodity" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Commodities</SelectItem>
        {commodities.map((c) => (
          <SelectItem key={c} value={c}>{c}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select value={status} onValueChange={onStatusChange}>
      <SelectTrigger className="w-[120px] h-9 text-sm">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Status</SelectItem>
        <SelectItem value="surplus">Surplus</SelectItem>
        <SelectItem value="deficit">Deficit</SelectItem>
        <SelectItem value="balanced">Balanced</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

export default FilterBar;
