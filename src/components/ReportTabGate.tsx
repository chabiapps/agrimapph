import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserCog } from "lucide-react";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import ReportFormPage from "@/components/ReportFormPage";
import Onboarding from "@/pages/Onboarding";

/**
 * Gate for the Mag-ulat tab: shows onboarding only when the logged-in user has
 * no user_profiles row yet. The presence of the row is the only flag.
 */
const ReportTabGate = ({ onSubmitted }: { onSubmitted: (recordType: string) => void }) => {
  const { user } = useAuth();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const check = useCallback(async () => {
    if (!user) return;
    const { data } = await db.from("user_profiles").select("id").eq("id", user.id).maybeSingle();
    setHasProfile(!!data);
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
      <div className="px-4 pt-3">
        <Link
          to="/settings/profile"
          className="inline-flex items-center gap-2 text-base font-semibold text-primary underline-offset-4 hover:underline"
        >
          <UserCog className="h-5 w-5" />
          I-edit ang Profile
        </Link>
      </div>
      <div className="flex-1 min-h-0">
        <ReportFormPage onSubmitted={onSubmitted} />
      </div>
    </div>
  );
};

export default ReportTabGate;
