import { Map, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewToggleProps {
  view: "map" | "table";
  onChange: (view: "map" | "table") => void;
}

const ViewToggle = ({ view, onChange }: ViewToggleProps) => (
  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex bg-card/90 backdrop-blur-md rounded-lg border border-border shadow-lg overflow-hidden">
    <button
      onClick={() => onChange("map")}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
        view === "map"
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Map className="h-4 w-4" />
      Map View
    </button>
    <button
      onClick={() => onChange("table")}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
        view === "table"
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Table2 className="h-4 w-4" />
      Table View
    </button>
  </div>
);

export default ViewToggle;
