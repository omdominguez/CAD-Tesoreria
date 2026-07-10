import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";
import { C, FONTS } from "../../constants/theme";
import { nf, variacionMensual } from "../../utils/finance";
import { fetchHistorialBCV } from "../../utils/tasasExternas";
import { Card } from "../../components/ui/Layout";

const NOMBRE_MES = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-VE", { month: "short", year: "2-digit" }).replace(".", "");
};

/**
 * Muestra la devaluación mes a mes de la tasa BCV (el proxy más usado
 * en la práctica venezolana para "inflación en bolívares"), trayendo
 * el historial público de bcv-api.rafnixg.dev. Es información de solo
 * lectura: no se guarda en Supabase, se trae fresca cada vez que se
 * abre el Tablero.
 */
export default function VariacionMensualBCV() {
  const [estado, setEstado] = useState("cargando"); // 'cargando' | 'ok' | 'vacio' | 'error'
  const [meses, setMeses] = useState([]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const historial = await fetchHistorialBCV(12);
      if (cancelado) return;
      if (!historial.length) { setEstado("error"); return; }
      const agrupado = variacionMensual(historial);
      if (!agrupado.length) { setEstado("vacio"); return; }
      setMeses(agrupado);
      setEstado("ok");
    })();
    return () => { cancelado = true; };
  }, []);

  if (estado === "cargando") {
    return (
      <Card style={{ padding: 20, display: "flex", alignItems: "center", gap: 10, color: C.mut, fontSize: 13 }}>
        <Loader2 size={16} className="cad-spin" /> Cargando el historial de la tasa BCV…
      </Card>
    );
  }
  if (estado === "error" || estado === "vacio") {
    return (
      <Card style={{ padding: 20, color: C.mut, fontSize: 13 }}>
        No se pudo traer el historial de tasas en este momento. Puedes seguir usando la app con normalidad; lo
        volveremos a intentar la próxima vez que abras el Tablero.
      </Card>
    );
  }

  const promedio = meses.reduce((a, m) => a + (m.pct || 0), 0) / meses.length;
  const primero = meses[0], ultimo = meses[meses.length - 1];
  const acumulada = primero.apertura > 0 ? ((ultimo.cierre - primero.apertura) / primero.apertura) * 100 : null;

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        <div>
          <div style={{ fontFamily: FONTS.SANS, fontSize: 16, fontWeight: 800, color: C.ink, letterSpacing: -0.3 }}>
            Variación mensual de la tasa BCV
          </div>
          <div style={{ fontSize: 12.5, color: C.mut, marginTop: 2 }}>
            Devaluación del bolívar frente al dólar oficial, mes a mes (últimos {meses.length} meses con datos)
          </div>
        </div>
        <TrendingUp size={18} color={C.gold} />
      </div>

      <div style={{ display: "flex", gap: 20, margin: "10px 0 4px", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, color: C.mut }}>
          Promedio mensual <b style={{ color: C.ink }}>{nf.format(promedio)}%</b>
        </span>
        {acumulada !== null && (
          <span style={{ fontSize: 12.5, color: C.mut }}>
            Acumulada en el período <b style={{ color: C.ink }}>{nf.format(acumulada)}%</b>
          </span>
        )}
      </div>

      <div style={{ height: 220, marginTop: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={meses.map((m) => ({ ...m, nombre: NOMBRE_MES(m.mes) }))} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
            <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: C.mut }} interval={0} />
            <YAxis tick={{ fontSize: 10, fill: C.mut }} tickFormatter={(v) => v + "%"} />
            <Tooltip
              formatter={(v) => [nf.format(v) + "%", "Variación"]}
              labelStyle={{ color: C.ink }}
              contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${C.line}`, background: C.surface }}
            />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
              {meses.map((m, i) => <Cell key={i} fill={m.pct >= 0 ? C.gold : C.verde} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ fontSize: 11, color: C.mut2, marginTop: 8 }}>
        Fuente: histórico público de bcv-api.rafnixg.dev. Refleja la variación de la tasa oficial, no el índice de
        inflación del INE.
      </div>
    </Card>
  );
}
