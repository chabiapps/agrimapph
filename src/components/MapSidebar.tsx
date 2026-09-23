import { Map, List, Plus } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { CATEGORIES, CategoryKey } from "@/lib/categories";
import { tabFromPath, tabHref, type Tab } from "@/lib/routes";

interface MapSidebarProps {
  /**
   * Active nav tab. `null` on non-tab pages (e.g. Profile) — nothing
   * highlights. Category quick-filters on a non-tab page navigate to
   * `/mapa?category=<key>` so they still land somewhere meaningful
   * (Index seeds its filters from the URL on mount).
   */
  tab: Tab | null;
  category: CategoryKey | "all";
  onCategoryChange: (v: CategoryKey | "all") => void;
  onCommodityChange: (v: string) => void;
}

const NAV_ITEMS: { id: Tab; Icon: typeof Map }[] = [
  { id: "map", Icon: Map },
  { id: "list", Icon: List },
  { id: "report", Icon: Plus },
];

const NAV_LABELS: Record<Tab, { en: string; fil: string }> = {
  map: { en: "Mapa", fil: "Mapa" },
  list: { en: "Listahan", fil: "Listahan" },
  dashboard: { en: "Dashboard", fil: "Buod" },
  report: { en: "Mag-ulat", fil: "Mag-ulat" },
};

/**
 * Desktop-only left sidebar for the Mapa page (~240px, fixed width).
 * Logo + tagline, vertical primary nav, Food Categories quick-filters
 * (same filter state as the category dropdown), and a footer tagline.
 */
const MapSidebar = ({ tab, category, onCategoryChange, onCommodityChange }: MapSidebarProps) => {
  const { lang } = useLang();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  // The sidebar's live filter state only exists on tab pages (Mapa/Listahan/
  // Mag-ulat all pass real state through DesktopLayout). On a non-tab page
  // (Profile, tab === null) hand the click off to the map instead.
  const hasLiveFilterState = tab !== null && tabFromPath(pathname) === tab;

  const handleCategoryClick = (key: CategoryKey) => {
    if (!hasLiveFilterState) {
      // No live filter state on this page — hand off to the map, which seeds
      // its category filter from the query string on mount.
      navigate(tabHref("map", `?category=${key}`));
      return;
    }
    // Toggle off when re-clicking the active category (mirrors MapFilterSheet);
    // reset commodity so a stale selection can't hide all pins (mirrors FilterBar).
    onCategoryChange(category === key ? "all" : key);
    onCommodityChange("all");
  };

  return (
    <aside className="hidden md:flex w-[240px] shrink-0 flex-col bg-white border-r border-[#e5e7eb] h-full min-h-0">
      {/* Logo / app name + tagline (tagline reused from README title) */}
      <Link
        to="/"
        className="px-5 pt-4 pb-3 shrink-0 border-b border-[#e5e7eb] block"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🌾</span>
          <span className="text-[#15803d] font-extrabold text-lg tracking-tight">
            AgriMap PH
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-[#6b7280]">
          National Agricultural Supply &amp; Demand Intelligence Map
        </p>
      </Link>

      {/* Primary navigation (vertical) — real links so each page has its own URL */}
      <nav className="flex flex-col gap-1 p-3 shrink-0" aria-label="Primary">
        {NAV_ITEMS.map(({ id, Icon }) => {
          const active = tab === id;
          return (
            <Link
              key={id}
              to={tabHref(id, search)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-colors text-left",
                active
                  ? "bg-primary/10 text-[#16a34a]"
                  : "text-[#6b7280] hover:bg-gray-50 hover:text-[#111827]"
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-[#16a34a]" : "text-[#6b7280]")} />
              {lang === "fil" ? NAV_LABELS[id].fil : NAV_LABELS[id].en}
            </Link>
          );
        })}
      </nav>

      <div className="mx-5 my-1 h-px bg-[#e5e7eb] shrink-0" />

      {/* Food Categories — quick-filter shortcuts wired to the same filter state */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        <h2 className="px-2 text-[12px] font-bold uppercase tracking-wider text-[#6b7280]">
          Food Categories
        </h2>
        <div className="mt-2 flex flex-col gap-1" role="group" aria-label="Filter by food category">
          {CATEGORIES.map((c) => {
            const isActive = category === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => handleCategoryClick(c.key)}
                aria-pressed={isActive}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                  isActive
                    ? "bg-primary/10 ring-1 ring-[#16a34a]/30"
                    : "hover:bg-gray-50"
                )}
              >
                <span className="text-xl leading-none shrink-0" aria-hidden>
                  {c.icon}
                </span>
                <span className="min-w-0">
                  <span className={cn(
                    "block text-[13px] font-semibold leading-tight truncate",
                    isActive ? "text-[#16a34a]" : "text-[#111827]"
                  )}>
                    {c.label}
                  </span>
                  <span className="block text-[11px] leading-tight text-[#6b7280] truncate">
                    {c.subLabel}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Decorative footer tagline */}
      <div className="shrink-0 border-t border-[#e5e7eb] px-5 py-4">
        <p className="text-center text-[12px] font-semibold leading-snug text-[#15803d]">
          Masaganang Ani.
          <br />
          Mas Matatag na Pilipinas. 🇵🇭
        </p>
      </div>
    </aside>
  );
};

export default MapSidebar;
