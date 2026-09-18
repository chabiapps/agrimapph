import { Map, List, Plus, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import LanguageToggle from "./LanguageToggle";
import ProfileButton from "./ProfileButton";
import { Tab } from "./BottomNav";

interface Props {
  tab: Tab;
  onChange: (t: Tab) => void;
}

const items: { id: Tab; label: { en: string; fil: string }; Icon: any }[] = [
  { id: "map", label: { en: "Mapa", fil: "Mapa" }, Icon: Map },
  { id: "list", label: { en: "Listahan", fil: "Listahan" }, Icon: List },
  { id: "dashboard", label: { en: "Dashboard", fil: "Buod" }, Icon: BarChart3 },
  { id: "report", label: { en: "Mag-ulat", fil: "Mag-ulat" }, Icon: Plus },
];

const TopNav = ({ tab, onChange }: Props) => {
  const { lang } = useLang();

  return (
    <nav className="h-[64px] w-full bg-white border-b border-[#e5e7eb] flex items-center justify-between px-6 shrink-0 z-50 sticky top-0">
      {/* LEFT SIDE: Logo */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => onChange("map")}>
        <span className="text-xl">🌾</span>
        <span className="text-[#15803d] font-extrabold text-lg tracking-tight">
          AgriMap PH
        </span>
      </div>

      {/* CENTER: Navigation Links */}
      <div className="hidden md:flex items-center justify-center gap-8 h-full">
        {items.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={cn(
                "h-full flex items-center gap-2 px-1 text-[14px] font-semibold transition-colors relative",
                active
                  ? "text-[#16a34a]"
                  : "text-[#6b7280] hover:text-[#111827]"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-4 w-4", active ? "text-[#16a34a]" : "text-[#6b7280]")} />
              {lang === "fil" ? label.fil : label.en}
              {active && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#16a34a] rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* RIGHT SIDE: Actions */}
      <div className="flex items-center gap-3">
        <LanguageToggle inline />
        <ProfileButton inline />
      </div>
    </nav>
  );
};

export default TopNav;
