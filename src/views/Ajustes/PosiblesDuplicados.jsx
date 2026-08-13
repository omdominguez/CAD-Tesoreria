import React, { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";

import { C, FONTS } from "../../constants/theme";
import { detectarContactosDuplicados } from "../../utils/deteccionAnomalias";
import { Card } from "../../components/ui/Layout";
import { Badge } from "../../components/ui/Data";

/**
 * Compara los nombres de todos los proveedores/clientes entre sí (por
 * similitud de texto, sin IA — ver utils/deteccionAnomalias.js) y avisa
 * si dos podrían ser el mismo contacto capturado dos veces con el nombre
 * escrito distinto. No decide nada solo: muestra los pares para que el
 * usuario revise y, si aplica, corrija el RIF/nombre de uno de los dos
 * (así "editando el contacto" en vez de fusionar registros).
 */
export default function PosiblesDuplicados({ proveedores }) {
  const [abierto, setAbierto] = useState(false);
  const pares = useMemo(() => detectarContactosDuplicados(proveedores, 75), [proveedores]);

  if (pares.length === 0) return null;

  return (
    <Card style={{ padding: 0, marginBottom: 16, overflow: "hidden", borderLeft: `3px solid ${C.amar}` }}>
      <button
        onClick={() => setAbierto((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <AlertTriangle size={16} color={C.amar} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: 13, fontFamily: FONTS.SANS, fontWeight: 700, color: C.ink }}>
          {pares.length} posible(s) contacto(s) duplicado(s)
        </div>
        <ChevronDown size={16} color={C.mut} style={{ transform: abierto ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>

      {abierto && (
        <div style={{ padding: "0 16px 14px", display: "grid", gap: 8 }}>
          {pares.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 12px", borderRadius: 10, background: C.body, fontSize: 12.5 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.ink }}>{p.a.razonSocial} <span style={{ color: C.mut }}>({p.a.rif || "sin RIF"})</span></div>
                <div style={{ color: C.ink, marginTop: 2 }}>{p.b.razonSocial} <span style={{ color: C.mut }}>({p.b.rif || "sin RIF"})</span></div>
              </div>
              <Badge tone={p.similitud >= 90 ? "rojo" : "amar"}>{p.similitud}% parecido</Badge>
            </div>
          ))}
          <div style={{ fontSize: 11, color: C.mut2, marginTop: 2 }}>
            Si son el mismo contacto, edita uno de los dos para dejarle el RIF y nombre correctos, y los pedidos
            que le pertenezcan a cada uno seguirán apuntando a su respectivo registro (no se fusionan solos).
          </div>
        </div>
      )}
    </Card>
  );
}
