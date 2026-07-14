import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { TrendingUp } from "lucide-react";
import { C, FONTS } from "../../constants/theme";
import { nf } from "../../utils/finance";
import { serieHistorial, resumenMensual, etiquetaMes, variacionAcumulada } from "../../utils/analisisTasas";
import { Card } from "../../components/ui/Layout";

/**
 * Devaluación mes a mes de la tasa BCV (el proxy más usado en la práctica
 * venezolana para "inflación en bolívares"), calculada a partir del HISTORIAL
 * cargado en Ajustes → Tasas (no de una fuente externa). Muestra los últimos
 * meses con datos. Para el detalle completo (evolución, brecha, comparativo
 * año contra año) está Reportes → Análisis de Tasas.
 */
export default function VariacionMensualBCV({ st }) {
  const serie = serieHistorial(st?.historialTasas || {});
  const meses = resumenMensual(serie, "tasaBCV").filter((m) => m.pct !== null).slice(-12);

  if (meses.length === 0) {
    return (
      <Card style={{ padding: 20, color: C.mut, fontSize: 13, lineHeight: 1.5 }}>
        Aún no hay suficiente historial de la tasa BCV para mostrar la variación mensual. Cárgalo en
        <b> Ajustes → Tasas → Importar reporte</b> y aquí verás la devaluación mes a mes.
      </Card>
    );
  }

  const promedio = meses.reduce((a, m) => a + m.pct, 0) / meses.length;
  const acum = variacionAcumulada(serie, "tasaBCV");

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
          Promedio mensual <b style={{ color: C.ink }}>{promedio >= 0 ? "+" : ""}{nf.format(promedio)}%</b>
        </span>
        {acum && acum.pct !== null && (
          <span style={{ fontSize: 12.5, color: C.mut }}>
            Acumulada en el período <b style={{ color: C.ink }}>{acum.pct >= 0 ? "+" : ""}{nf.format(acum.pct)}%</b>
          </span>
        )}
      </div>

      <div style={{ height: 220, marginTop: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={meses.map((m) => ({ ...m, nombre: etiquetaMes(m.mes) }))} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
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
        Fuente: historial de tasas cargado en el sistema. Refleja la variación de la tasa oficial, no el índice de inflación del INE.
      </div>
    </Card>
  );
}