import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, ArrowLeftRight } from "lucide-react";
import { C, FONTS } from "../../constants/theme";
import { nf, variacionTasas, comparativaEntreTasas } from "../../utils/finance";
import { useIsMobile } from "../../hooks/useIsMobile";

const DURACION_VUELTA_MS = 13000; // cuánto dura cada "vuelta" antes de alternar

function FlechaVariacion({ pct }) {
  const subida = pct !== null && pct > 0.0001;
  const bajada = pct !== null && pct < -0.0001;
  const color = subida ? C.verde : bajada ? C.rojo : C.mut;
  const Icon = subida ? TrendingUp : bajada ? TrendingDown : Minus;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color, fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
      <Icon size={13} />
      {pct === null ? "—" : `${pct > 0 ? "+" : ""}${nf.format(pct)}%`}
    </span>
  );
}

/* Vuelta 1: cada tasa vs. el cierre del día anterior (con el valor de ayer chiquito) */
function ItemDiario({ item, isMobile }) {
  const { label, valor, anterior, pct } = item;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: isMobile ? 6 : 8, padding: isMobile ? "0 14px" : "0 22px", whiteSpace: "nowrap" }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink, fontVariantNumeric: "tabular-nums", fontFamily: FONTS.SANS }}>
        Bs {nf.format(valor)}
      </span>
      {anterior !== null && !isMobile && (
        <span style={{ fontSize: 10.5, color: C.mut2, fontVariantNumeric: "tabular-nums" }}>
          ayer Bs {nf.format(anterior)}
        </span>
      )}
      <FlechaVariacion pct={pct} />
    </div>
  );
}

/* Vuelta 2: comparación de las tasas entre sí (brecha cambiaria) */
function ItemComparativo({ item, isMobile }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: isMobile ? "0 14px" : "0 22px", whiteSpace: "nowrap" }}>
      <ArrowLeftRight size={12} color={C.mut} />
      <span style={{ fontSize: 11.5, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 0.3 }}>
        {item.label}
      </span>
      <FlechaVariacion pct={item.pct} />
    </div>
  );
}

/**
 * Ticker estilo bolsa de valores con dos "vueltas" que se alternan:
 * 1) cada tasa contra el cierre del día anterior (con el valor de ayer)
 * 2) la brecha entre las 3 tasas entre sí (paralelo vs BCV, etc.)
 * Se detiene al pasar el mouse por encima para poder leerlo con calma.
 */
export function TickerTasas({ st }) {
  const [modo, setModo] = useState("diario"); // 'diario' | 'comparativo'
  const isMobile = useIsMobile();

  useEffect(() => {
    const t = setInterval(() => {
      setModo((m) => (m === "diario" ? "comparativo" : "diario"));
    }, DURACION_VUELTA_MS);
    return () => clearInterval(t);
  }, []);

  const items = modo === "diario" ? variacionTasas(st) : comparativaEntreTasas(st);
  // Duplicamos la lista para que el desplazamiento sea continuo (sin salto).
  const doble = [...items, ...items];

  return (
    <div
      className="cad-ticker"
      style={{
        flex: 1,
        minWidth: 0,
        overflow: "hidden",
        maskImage: "linear-gradient(to right, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)",
      }}
    >
      {/* La key cambia con el modo para reiniciar la animación en cada vuelta nueva */}
      <div key={modo} className="cad-ticker-track" style={{ display: "inline-flex" }}>
        {doble.map((item, i) =>
          modo === "diario"
            ? <ItemDiario key={item.key + "-" + i} item={item} isMobile={isMobile} />
            : <ItemComparativo key={item.key + "-" + i} item={item} isMobile={isMobile} />
        )}
      </div>
    </div>
  );
}
