import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

async function fetchIsAdmin(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    return !!data?.some((r) => r.role === "admin");
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  async function applySession(sess: Session | null) {
    setSession(sess);
    setUser(sess?.user ?? null);
    setIsAdmin(sess?.user ? await fetchIsAdmin(sess.user.id) : false);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      applySession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!active) return;
      applySession(sess);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthCtx = {
    user,
    session,
    loading,
    isAdmin,
    signIn: async (email, password) => {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        throw error;
      }
      await applySession(data.session);
    },
    signUp: async (email, password, fullName) => {
      const redirectUrl = `${window.location.origin}/dashboard`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl, data: { full_name: fullName } },
      });
      if (error) throw error;
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
}
