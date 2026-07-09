import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "cad-theme-mode"; // 'auto' | 'light' | 'dark'

function aplicarAtributo(mode) {
  const root = document.documentElement;
  if (mode === "light" || mode === "dark") {
    root.setAttribute("data-theme", mode);
  } else {
    root.removeAttribute("data-theme"); // 'auto': deja que decida el sistema (prefers-color-scheme)
  }
}

/**
 * Maneja el modo de apariencia de la app: automÃ¡tico (segÃºn el sistema
 * operativo), claro o oscuro forzado manualmente. La preferencia elegida
 * se guarda en localStorage y persiste entre sesiones.
 */
export function useThemeMode() {
  const [mode, setModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === "light" || saved === "dark" ? saved : "auto";
    } catch {
      return "auto";
    }
  });

  // Para saber, en modo "auto", si el sistema estÃ¡ actualmente en oscuro
  // (solo para reflejarlo visualmente en el selector; el cambio real de
  // color lo resuelve el CSS mediante prefers-color-scheme).
  const [sistemaOscuro, setSistemaOscuro] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
  );

  useEffect(() => {
    aplicarAtributo(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* almacenamiento no disponible */ }
  }, [mode]);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = (e) => setSistemaOscuro(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const setMode = useCallback((m) => setModeState(m), []);

  const oscuroActivo = mode === "dark" || (mode === "auto" && sistemaOscuro);

  return { mode, setMode, oscuroActivo };
}