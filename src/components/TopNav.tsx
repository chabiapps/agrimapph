import { Map, List, Plus, BarChart3, ShieldCheck, type LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { useAdminAccess } from "@/lib/profile";
import LanguageToggle from "./LanguageToggle";
import ProfileButton from "./ProfileButton";
import { tabHref, type Tab } from "@/lib/routes";

interface Props {
  tab: Tab;
}

const items: { id: Tab; label: { en: string; fil: string }; Icon: LucideIcon }[] = [
  { id: "map", label: { en: "Mapa", fil: "Mapa" }, Icon: Map },
  { id: "list", label: { en: "Listahan", fil: "Listahan" }, Icon: List },
  { id: "dashboard", label: { en: "Dashboard", fil: "Buod" }, Icon: BarChart3 },
  { id: "report", label: { en: "Mag-ulat", fil: "Mag-ulat" }, Icon: Plus },
];

const TopNav = ({ tab }: Props) => {
  const { lang, t } = useLang();
  const { search } = useLocation();
  const access = useAdminAccess();

  return (
    <nav className="h-[64px] w-full bg-white border-b border-[#e5e7eb] flex items-center justify-between px-6 shrink-0 z-50 sticky top-0">
      {/* LEFT SIDE: Logo */}
      <Link to="/" className="flex items-center gap-2">
        <span className="text-xl">🌾</span>
        <span className="text-[#15803d] font-extrabold text-lg tracking-tight">
          AgriMap PH
        </span>
      </Link>

      {/* CENTER: Navigation Links */}
      <div className="hidden md:flex items-center justify-center gap-8 h-full">
        {items.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <Link
              key={id}
              to={tabHref(id, search)}
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
            </Link>
          );
        })}
      </div>

      {/* RIGHT SIDE: Actions */}
      <div className="flex items-center gap-3">
        {access !== null && access.isAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-1 rounded-full bg-[#f0fdf4] border border-[#86efac] px-2 py-1 text-[12px] font-semibold text-[#15803d] hover:bg-[#dcfce7] transition-colors min-h-[44px]"
            aria-label="Admin"
          >
            <ShieldCheck className="h-4 w-4" />
            {lang === "fil" ? t("admin") : t("admin")}
          </Link>
        )}
        <LanguageToggle inline />
        <ProfileButton inline />
      </div>
    </nav>
  );
};

export default TopNav;
