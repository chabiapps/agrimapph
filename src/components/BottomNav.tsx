import { Map, List, Plus, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

export type Tab = "map" | "list" | "dashboard" | "report";

interface Props {
  tab: Tab;
  onChange: (t: Tab) => void;
}

const items: { id: Tab; label: { en: string; fil: string }; Icon: typeof Map }[] = [
  { id: "map", label: { en: "Mapa", fil: "Mapa" }, Icon: Map },
  { id: "list", label: { en: "Listahan", fil: "Listahan" }, Icon: List },
  { id: "dashboard", label: { en: "Dashboard", fil: "Buod" }, Icon: BarChart3 },
  { id: "report", label: { en: "Mag-ulat", fil: "Mag-ulat" }, Icon: Plus },
];

const BottomNav = ({ tab, onChange }: Props) => {
  const { lang } = useLang();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[1000] flex bg-card border-t border-border shadow-2xl">
      {items.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[72px] text-xs font-semibold transition-colors",
              active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className={cn("h-6 w-6", active && "stroke-[2.5]")} />
            {lang === "fil" ? label.fil : label.en}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
