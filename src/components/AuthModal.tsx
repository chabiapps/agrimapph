import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast({ title: "Salamat!", description: "Naka-sign up ka na. Puwede ka nang mag-ulat." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Naka-login ka na!" });
      }
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
