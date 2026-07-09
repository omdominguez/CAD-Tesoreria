import { useEffect, useState } from "react";

/**
 * Devuelve true cuando el ancho de la ventana es de tipo mÃģvil/tablet
 * angosto. Se actualiza solo si el usuario rota el dispositivo o
 * redimensiona la ventana.
 */
export function useIsMobile(breakpoint = 860) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= breakpoint
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}