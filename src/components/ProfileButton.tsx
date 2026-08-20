import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useProfile, userTypeMeta } from "@/lib/profile";

const ProfileButton = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  if (!user) return null;
  const meta = userTypeMeta(profile?.user_type);
  const initial = (profile?.full_name ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <Link
      to="/settings/profile"
      aria-label="Aking profile"
      className="fixed top-3 right-16 z-[1001] h-10 w-10 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-md flex items-center justify-center hover:bg-accent transition-colors"
    >
      {profile?.user_type ? (
        <span className="text-xl leading-none">{meta.emoji}</span>
      ) : (
        <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-bold">{initial}</span>
      )}
    </Link>
  );
};

export default ProfileButton;
