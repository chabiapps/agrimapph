import { Map, List, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tab = "map" | "list" | "report";

interface Props {
  tab: Tab;
  onChange: (t: Tab) => void;
}

const items: { id: Tab; label: string; Icon: typeof Map }[] = [
  { id: "map", label: "Mapa", Icon: Map },
  { id: "list", label: "Listahan", Icon: List },
  { id: "report", label: "Mag-ulat", Icon: Plus },
];

const BottomNav = ({ tab, onChange }: Props) => (
  <nav className="fixed bottom-0 left-0 right-0 z-[1000] flex bg-card border-t border-border shadow-2xl">
    {items.map(({ id, label, Icon }) => {
      const active = tab === id;
      return (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[72px] text-sm font-semibold transition-colors",
            active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
          )}
          aria-current={active ? "page" : undefined}
        >
          <Icon className={cn("h-7 w-7", active && "stroke-[2.5]")} />
          {label}
        </button>
      );
    })}
  </nav>
);

export default BottomNav;
