import { createContext, useContext, useEffect, useState } from "react";
import { supabase, isConfigured } from "../supabase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modoRecuperacion, setModoRecuperacion] = useState(false);

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
      const res = supabase.auth.onAuthStateChange((event, s) => {
        // Cuando alguien entra desde el link de "restablecer contraseña" del
        // correo, Supabase dispara este evento especial en vez de un login
        // normal — activamos una pantalla dedicada para poner la nueva clave.
        if (event === "PASSWORD_RECOVERY") {
          setModoRecuperacion(true);
        }
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
    modoRecuperacion,
    salirDeRecuperacion: () => setModoRecuperacion(false),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password, nombre, apellido) =>
      supabase.auth.signUp({ email, password, options: { data: { nombre, apellido } } }),
    signOut: () => supabase.auth.signOut(),
    refreshProfile: () => session && loadProfile(session.user.id),
    // "Olvidé mi contraseña": manda un correo con un link mágico de recuperación
    enviarCorreoRecuperacion: (email) =>
      supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }),
    // Cambiar la contraseña (tanto en recuperación como ya logueado)
    actualizarPassword: (password) => supabase.auth.updateUser({ password }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
