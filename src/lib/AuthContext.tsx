import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null, session: null, loading: true, signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dev-only UI-test bypass: ?e2e_stub_auth=1 pretends a signed-in user so
    // Playwright smoke tests can render auth-gated pages without credentials.
    // Never active in production builds (import.meta.env.DEV is false there).
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("e2e_stub_auth") === "1") {
      setSession({
        access_token: "e2e-stub",
        refresh_token: "e2e-stub",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: "00000000-0000-0000-0000-000000000000",
          aud: "authenticated",
          role: "authenticated",
          email: "ui-test@example.com",
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        } as User,
      } as Session);
      setLoading(false);
      return;
    }
    // Register the listener FIRST, then hydrate from getSession.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
