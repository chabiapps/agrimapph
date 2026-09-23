import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useLang } from "@/lib/i18n";

interface ProfileHeaderProps {
  /** Global actions rendered on the right (EN/FIL toggle + profile). */
  rightSlot?: ReactNode;
}

/**
 * Contextual desktop header for the Profile settings page. Same bar chrome as
 * FilterBar/ReportHeader (white bg, bottom border, 48px) so the shell looks
 * identical, with a back-to-map link on the left — following the ReportHeader
 * pattern (each page defines its own header via DesktopLayout's `header`
 * slot). The query string is intentionally NOT carried here: profile edits are
 * unrelated to the map's filter state.
 */
const ProfileHeader = ({ rightSlot }: ProfileHeaderProps) => {
  const { lang } = useLang();
  return (
    <div className="w-full bg-white border-b border-[#e5e7eb] px-4 shrink-0 z-10">
      <div className="min-h-[48px] py-1.5 w-full flex items-center justify-between gap-3">
        <Link
          to="/mapa"
          className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#16a34a] hover:text-[#15803d] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {lang === "fil" ? "Bumalik sa Mapa" : "Back to Map"}
        </Link>
        {rightSlot && (
          <div className="flex items-center gap-2 shrink-0">
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;