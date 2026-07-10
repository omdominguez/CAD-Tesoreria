import { createContext, useContext, useEffect, useState } from "react";
import { supabase, isConfigured } from "../supabase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId) {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
      setProfile(data || null);
    } catch (e) {
      setProfile(null);
    }
  }

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return; }
    let subscription;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) await loadProfile(session.user.id);
      setLoading(false);
      const res = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s);
        if (s) loadProfile(s.user.id); else setProfile(null);
      });
      subscription = res.data.subscription;
    })();
    return () => { if (subscription) subscription.unsubscribe(); };
  }, []);

  const value = {
    session,
    user: session?.user || null,
    profile,
    role: profile?.rol || "COMPRAS",
    activo: profile?.activo ?? false,
    loading,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password) => supabase.auth.signUp({ email, password }),
    signOut: () => supabase.auth.signOut(),
    refreshProfile: () => session && loadProfile(session.user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);