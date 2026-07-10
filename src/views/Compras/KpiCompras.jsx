import React, { useMemo } from "react";
import { Wallet, AlertTriangle, Clock, CalendarRange } from "lucide-react";
import { C, FONTS } from "../../constants/theme";
import { activo, usdComp, hoy0, parseD, diasEntre, money } from "../../utils/finance";
import { Card } from "../../components/ui/Layout";

/**
 * Franja de KPIs de Cuentas por Pagar: total pendiente, vencido,
 * próximos 7 días y próximos 30 días — en una sola tarjeta dividida,
 * igual que el Tablero, para que se sienta parte de la misma familia
 * visual en vez de cajitas sueltas.
 */
export default function KpiCompras({ st }) {
  const kpi = useMemo(() => {
    const hoy = hoy0();
    let total = 0, vencido = 0, en7 = 0, en30 = 0;

    (st.compromisos || []).filter((c) => activo(st, c)).forEach((c) => {
      const v = usdComp(st, c);
      total += v;
      const dv = diasEntre(hoy, parseD(c.fechaVencimiento));
      if (dv < 0) vencido += v;
      else if (dv <= 7) en7 += v;
      if (dv >= 0 && dv <= 30) en30 += v;
    });

    return { total, vencido, en7, en30 };
  }, [st]);

  const items = [
    { t: "Total por pagar", v: kpi.total, ic: Wallet, tone: C.ink, sub: "Todos los pedidos activos (USD)" },
    { t: "Vencido", v: kpi.vencido, ic: AlertTriangle, tone: C.rojo, sub: "Ya pasó la fecha de pago" },
    { t: "Próximos 7 días", v: kpi.en7, ic: Clock, tone: C.amar, sub: "Requiere atención pronto" },
    { t: "Próximos 30 días", v: kpi.en30, ic: CalendarRange, tone: C.azul, sub: "Para planificar el mes" }
  ];

  return (
    <Card style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {items.map((it, i) => (
          <div
            key={it.t}
            style={{
              flex: "1 1 210px",
              minWidth: 190,
              padding: "18px 20px",
              borderRight: i < items.length - 1 ? `1px solid ${C.line}` : "none"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: C.body, display: "inline-flex", alignItems: "center", justifyContent: "center", color: it.tone, flexShrink: 0 }}>
                <it.ic size={14} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 0.4 }}>
                {it.t}
              </div>
            </div>

            <div style={{ fontFamily: FONTS.SANS, fontSize: 25, fontWeight: 800, color: C.ink, letterSpacing: -0.5, fontVariantNumeric: "tabular-nums" }}>
              {money(it.v, "USD")}
            </div>
            <div style={{ width: 28, height: 3, borderRadius: 999, background: it.tone, marginTop: 8, marginBottom: 8 }} />
            <div style={{ fontSize: 11.5, color: C.mut }}>{it.sub}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
