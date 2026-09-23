import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserCog } from "lucide-react";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import ReportFormPage from "@/components/ReportFormPage";
import type { ProgressStep } from "@/components/ReportProgressCard";
import Onboarding from "@/pages/Onboarding";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Gate for the Mag-ulat tab: shows onboarding only when the logged-in user has
 * no user_profiles row yet. The presence of the row is the only flag.
 */
const ReportTabGate = ({ onSubmitted, onProgress }: {
  onSubmitted: (recordType: string) => void;
  /** Forwarded to ReportFormPage — live per-step completion for the sidebar. */
  onProgress?: (steps: ProgressStep[]) => void;
}) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const check = useCallback(async () => {
    if (!user) return;
    // Same dev-only UI-test bypass as AuthContext: pretend onboarding is done
    // so Playwright smoke tests can render the form without a real
    // user_profiles row for the stub user (and without network dependence).
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("e2e_stub_auth") === "1") {
      setHasProfile(true);
      return;
    }
    const { data } = await db.from("user_profiles").select("id, user_type").eq("id", user.id).maybeSingle();
    setHasProfile(!!(data as { user_type?: string | null } | null)?.user_type);
  }, [user]);

  useEffect(() => {
    check();
  }, [check]);

  if (hasProfile === null) {
    return <div className="h-full w-full grid place-items-center text-muted-foreground">Loading...</div>;
  }

  if (!hasProfile) {
    return <Onboarding embedded onDone={check} />;
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Mobile-only profile link (kept inline). On desktop the same link
          lives in the ReportRightPanel sidebar instead. */}
      <div className="px-4 pt-3 md:hidden">
        <Link
          to="/settings/profile"
          className="inline-flex items-center gap-2 text-base font-semibold text-primary underline-offset-4 hover:underline"
        >
          <UserCog className="h-5 w-5" />
          I-edit ang Profile
        </Link>
      </div>
      {/*
        Desktop: edge-to-edge flex row with NO padding/max-width/centering —
        the form card must span the full center column (same width as the
        filter bar above). Mobile keeps the plain vertical flow unchanged.
      */}
      <div className={cn(
        "flex-1 min-h-0",
        !isMobile && "bg-muted/30"
      )}>
        {/*
          Desktop: full-bleed form card — same width as the header/filter bar
          above and Mapa/Listahan's content in this column (no max-w cap, no
          centering). Mobile keeps the plain full-width flow unchanged.
          The card is the flex row's single stretched child; internal breathing
          room comes from the form's own md:px/md:py, not wrapper padding.
        */}
        <div className={cn(
          "w-full h-full",
          !isMobile && "bg-card shadow-xl border border-border md:rounded-2xl overflow-hidden"
        )}>
          <ReportFormPage onSubmitted={onSubmitted} onProgress={onProgress} />
        </div>
      </div>
    </div>
  );
};

export default ReportTabGate;
