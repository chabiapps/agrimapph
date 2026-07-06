import { useState, ReactNode } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import AuthModal from "@/components/AuthModal";

const AuthGate = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  if (loading) {
    return <div className="h-full w-full grid place-items-center text-muted-foreground">Loading...</div>;
  }

  if (user) return <>{children}</>;

  return (
    <div className="h-full w-full grid place-items-center px-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="text-7xl">🌾</div>
        <p className="text-[20px] font-bold leading-snug">Mag-login muna para makapag-ulat</p>
        <Button
          className="w-full min-h-[56px] text-base font-bold bg-primary hover:bg-primary/90"
          onClick={() => { setMode("login"); setModalOpen(true); }}
        >
          Mag-login
        </Button>
        <button
          type="button"
          className="text-primary font-semibold text-base underline-offset-4 hover:underline"
          onClick={() => { setMode("signup"); setModalOpen(true); }}
        >
          Wala pang account? Mag-sign up
        </button>
      </div>
      <AuthModal open={modalOpen} onOpenChange={setModalOpen} initialMode={mode} />
    </div>
  );
};

export default AuthGate;
