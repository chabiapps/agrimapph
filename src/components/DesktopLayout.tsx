import type { ReactNode } from "react";
import MapSidebar from "@/components/MapSidebar";
import type { Tab } from "@/lib/routes";
import type { CategoryKey } from "@/lib/categories";

interface DesktopLayoutProps {
  tab: Tab;
  category: CategoryKey | "all";
  onCategoryChange: (v: CategoryKey | "all") => void;
  onCommodityChange: (v: string) => void;
  /** Top header area (e.g. FilterBar with search + EN/FIL toggle). */
  header: ReactNode;
  /** Main content — must fill the remaining space (use flex-1 min-h-0). */
  children: ReactNode;
  /** Optional fixed-width right rail (Mapa only for now). */
  rightPanel?: ReactNode;
}

/**
 * Shared desktop shell: fixed-width left sidebar + flexible center column
 * (header + content) + optional right rail. Flexbox, matching the layout
 * approach used in Index. Desktop only — callers must gate on !isMobile
 * (mobile keeps the floating toggle + BottomNav).
 */
const DesktopLayout = ({
  tab,
  category,
  onCategoryChange,
  onCommodityChange,
  header,
  children,
  rightPanel,
}: DesktopLayoutProps) => {
  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <MapSidebar
        tab={tab}
        category={category}
        onCategoryChange={onCategoryChange}
        onCommodityChange={onCommodityChange}
      />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#f9fafb]">
        {header}
        {children}
      </div>
      {rightPanel}
    </div>
  );
};

export default DesktopLayout;
