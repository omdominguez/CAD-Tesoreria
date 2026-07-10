import { useEffect, useRef } from "react";
import { fetchTasaBCV, fetchTasaParalelo } from "../utils/tasasExternas";
import { hoyStr } from "../utils/finance";

/**
 * Al abrir la app (una vez por día, y solo para roles con permiso de
 * editar tasas), intenta traer BCV y Paralelo de las fuentes externas
 * y las guarda automáticamente. Intervención NUNCA se aplica aquí en
 * silencio (no existe una fuente pública confiable para ese dato) —
 * en Ajustes → Tasas se ofrece como una sugerencia que el usuario
 * decide aceptar o no. Si ya se intentó hoy, no lo vuelve a hacer
 * hasta el día siguiente — así tampoco pisa una edición manual que
 * alguien haya hecho más tarde ese mismo día.
 */
export function useAutoTasas(st, act, activo) {
  const yaIntentadoEnEstaSesion = useRef(false);

  useEffect(() => {
    if (!activo || !st || yaIntentadoEnEstaSesion.current) return;
    const hoy = hoyStr();
    if (st.tasasAutoActualizadas === hoy) return; // ya se intentó hoy
    yaIntentadoEnEstaSesion.current = true;

    (async () => {
      const [bcv, paralelo] = await Promise.all([fetchTasaBCV(), fetchTasaParalelo()]);
      if (bcv) act.setRate("tasaBCV", String(bcv));
      if (paralelo) act.setRate("tasaParalelo", String(paralelo));
      act.marcarTasasAutoActualizadas(hoy);
    })();
  }, [activo, st, act]);
}