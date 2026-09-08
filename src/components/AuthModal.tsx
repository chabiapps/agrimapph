import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { db } from "@/lib/db";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialMode?: "login" | "signup";
}

const AuthModal = ({ open, onOpenChange, initialMode = "login" }: Props) => {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  useEffect(() => { if (open) setMode(initialMode); }, [open, initialMode]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const googleSignIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
      setBusy(false);
    }
    // On success the browser redirects to Google; nothing more to do here.
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast({ title: "Salamat!", description: "Naka-sign up ka na. Kumpletuhin ang iyong profile." });
        onOpenChange(false);
        setEmail(""); setPassword("");
        if (data.session?.user) {
          // Placeholder row so the app knows onboarding is still pending (user_type null).
          await db.from("user_profiles").upsert({ id: data.session.user.id }, { onConflict: "id" });
          navigate("/onboarding", { replace: true });
        }
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Naka-login ka na!" });
      onOpenChange(false);
      setEmail(""); setPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: mode === "signup" ? "Sign up failed" : "Login failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {mode === "signup" ? "Mag-sign up" : "Mag-login"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="min-h-[48px]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <Input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} className="min-h-[48px]" />
          </div>
          <Button type="submit" disabled={busy} className="w-full min-h-[52px] text-base font-bold bg-primary">
            {busy ? "Sandali..." : mode === "signup" ? "Mag-sign up" : "Mag-login"}
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            o kaya
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={googleSignIn}
            className="w-full min-h-[52px] text-base font-semibold gap-2"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.15 3.5 2.7.24.02c2.2-2 3.5-5 3.5-8.6z"/>
              <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5l-.14.01-3.7 2.9-.05.14C3.4 21.3 7.4 24 12 24z"/>
              <path fill="#FBBC05" d="M5.3 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.01-.16-3.8-2.9-.12.06C.5 8.3 0 10.1 0 12s.5 3.7 1.4 5.4l3.9-3z"/>
              <path fill="#EA4335" d="M12 4.6c2.2 0 3.7 1 4.6 1.8l3.3-3.2C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.6l3.9 3c.9-2.9 3.6-5 6.7-5z"/>
            </svg>
            Continue with Google
          </Button>
          <div className="text-center text-sm">
            {mode === "login" ? (
              <button type="button" className="text-primary font-semibold" onClick={() => setMode("signup")}>
                Wala pang account? Mag-sign up
              </button>
            ) : (
              <button type="button" className="text-primary font-semibold" onClick={() => setMode("login")}>
                May account na? Mag-login
              </button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
