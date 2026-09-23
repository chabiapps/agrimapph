import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useProfile, userTypeMeta } from "@/lib/profile";
import { cn } from "@/lib/utils";

interface Props {
  inline?: boolean;
}

const ProfileButton = ({ inline = false }: Props) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  if (!user) return null;
  const meta = userTypeMeta(profile?.user_type);
  const initial = (profile?.full_name ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <Link
      to="/settings/profile"
      aria-label="Aking profile"
      className={cn(
        "rounded-full bg-card/90 backdrop-blur-md border border-border shadow-md flex items-center justify-center hover:bg-accent transition-colors shrink-0",
        inline ? "h-8 w-8" : "h-11 w-11 fixed bottom-[84px] right-3 z-[1001]"
      )}
    >
      {profile?.user_type ? (
        <span className={cn("leading-none", inline ? "text-base" : "text-xl")}>{meta.emoji}</span>
      ) : (
        <span className={cn(
          "rounded-full bg-primary text-primary-foreground grid place-items-center font-bold",
          inline ? "h-5 w-5 text-xs" : "h-7 w-7 text-sm"
        )}>{initial}</span>
      )}
    </Link>
  );
};

export default ProfileButton;
