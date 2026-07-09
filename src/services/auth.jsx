import React, { createContext, useContext, useEffect, useState } from 'react';

// Asegúrate de importar aquí tu cliente de Supabase
// import { supabase } from './store';

const AuthContext = createContext({
  user: null,
  role: null,
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /* =========================================================
       IMPLEMENTACIÓN REAL CON SUPABASE
       Descomenta este bloque cuando conectes tu backend
       ========================================================= */
    /*
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      if (session?.user) {
        // Cargar el rol asignado desde la tabla de perfiles
        const { data } = await supabase.from('profiles').select('rol').eq('id', session.user.id).single();
        if (data) setRole(data.rol);
      }
      setLoading(false);
    };

    initAuth();

    // Escuchar cambios (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('rol').eq('id', session.user.id).single();
        if (data) setRole(data.rol);
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
    */

    // =========================================================
    // MOCK TEMPORAL (Para que tu interfaz renderice mientras tanto)
    // Borra esto cuando actives Supabase
    // =========================================================
    setUser({ id: "mock-id-123", email: "gerencia@elmaizalito.com" });
    setRole("MASTER"); // Cambia esto a "COMPRAS" o "TESORERIA" para probar la UI
    setLoading(false);
  }, []);

  const signOut = async () => {
    try {
      // await supabase.auth.signOut();
      setUser(null);
      setRole(null);
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, signOut }}>
      {!loading ? (
        children
      ) : (
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7A70" }}>
          Autenticando...
        </div>
      )}
    </AuthContext.Provider>
  );
}

// Hook personalizado para consumir la autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
};