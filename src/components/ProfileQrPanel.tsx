import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import QrCodeCard from "@/components/QrCodeCard";

/**
 * Right-rail QR panel for the Profile settings page. Same 340px shell as
 * MapRightPanel (Mapa): fixed-width aside, own scroll region. Encodes the
 * user's PUBLIC profile URL (/profile/:userId — PublicProfile.tsx, already
 * routed in App.tsx), reusing the installed `qrcode` lib via QrCodeCard.
 */
const ProfileQrPanel = ({ profileUrl, userId }: { profileUrl: string; userId?: string }) => {
  if (!profileUrl || !userId) return null;
  return (
    <aside
      className="hidden md:flex w-[340px] shrink-0 flex-col bg-white border-l border-[#e5e7eb] h-full min-h-0"
      aria-label="QR profile panel"
    >
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <section aria-label="Aking QR profile">
          <h2 className="text-[13px] font-bold text-[#111827]">Aking QR profile</h2>
          <div className="mt-2">
            <QrCodeCard
              url={profileUrl}
              fileName={`agrimap-${userId.slice(0, 8)}`}
              caption={profileUrl}
            />
            <Link
              to={`/profile/${userId}`}
              className="mt-3 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-[14px] font-semibold text-[#16a34a] hover:text-[#15803d] hover:bg-gray-50 transition-colors"
            >
              Tingnan ang pampublikong profile
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </div>
    </aside>
  );
};

export default ProfileQrPanel;