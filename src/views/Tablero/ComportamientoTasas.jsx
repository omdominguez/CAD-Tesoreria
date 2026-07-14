import React, { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { C, FONTS } from "../../constants/theme";
import { nf } from "../../utils/finance";
import {
  TASAS_META, etiquetaMes,
  serieHistorial, resumenMensual, variacionAcumulada, tasaTieneDatos
} from "../../utils/analisisTasas";
import { Card } from "../../components/ui/Layout";
import { Segmented } from "../../components/ui/Buttons";

const COLOR = { verde: C.verde, azul: C.azul, rojo: C.rojo, gold: C.gold };
const colorDe = (key) => COLOR[(TASAS_META.find((t) => t.key === key) || {}).colorVar] || C.verde;

const fmtFechaCorta = (iso) => { const [, m, d] = iso.split("-"); return `${d}/${m}`; };
const fmtFechaLarga = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" });

/** Recorta la serie a los últimos N meses (contados desde su fecha más reciente). */
function ultimosMeses(serie, meses) {
  if (meses === "todo" || serie.length === 0) return serie;
  const d = new Date(serie[serie.length - 1].fecha + "T00:00:00");
  d.setMonth(d.getMonth() - Number(meses));
  const corte = d.toISOString().slice(0, 10);
  return serie.filter((r) => r.fecha >= corte);
}

function Delta({ pct, size = 12 }) {
  const sube = pct !== null && pct > 0.0001;
  const baja = pct !== null && pct < -0.0001;
  const color = sube ? C.rojo : baja ? C.verde : C.mut; // en Bs/USD, subir = devaluación (rojo)
  const Icon = sube ? TrendingUp : baja ? TrendingDown : Minus;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color, fontSize: size, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
      <Icon size={size + 1} /> {pct === null ? "—" : `${pct > 0 ? "+" : ""}${nf.format(pct)}%`}
    </span>
  );
}

/**
 * Panel de comportamiento de las tasas de cambio para el Tablero: estilo
 * "cotización" con la tasa actual grande, gráfico de nivel con degradado y
 * controles para elegir tasa, rango y métrica (nivel o variación % mensual).
 * Los datos salen del historial cargado en Ajustes → Tasas.
 */
export default function ComportamientoTasas({ st }) {
  const serieCompleta = useMemo(() => serieHistorial(st?.historialTasas || {}), [st?.historialTasas]);

  const tasasDisponibles = useMemo(() => {
    const base = ["tasaBCV", "tasaBcvEuro", "tasaParalelo"];
    if (tasaTieneDatos(serieCompleta, "tasaIntervencion")) base.push("tasaIntervencion");
    return base.filter((k) => tasaTieneDatos(serieCompleta, k));
  }, [serieCompleta]);

  const [tasaSel, setTasaSel] = useState("tasaBCV");
  const [rango, setRango] = useState("12");
  const [metrica, setMetrica] = useState("nivel");

  const color = colorDe(tasaSel);
  const meta = TASAS_META.find((t) => t.key === tasaSel);

  const serieRango = useMemo(() => ultimosMeses(serieCompleta, rango), [serieCompleta, rango]);
  const puntos = useMemo(() => serieRango.filter((r) => r[tasaSel] > 0).map((r) => ({ fecha: r.fecha, valor: r[tasaSel] })), [serieRango, tasaSel]);

  // KPIs
  const actual = puntos.length ? puntos[puntos.length - 1] : null;
  const anterior = puntos.length > 1 ? puntos[puntos.length - 2] : null;
  const deltaDia = actual && anterior && anterior.valor > 0 ? ((actual.valor - anterior.valor) / anterior.valor) * 100 : null;

  const mesesRango = useMemo(() => resumenMensual(serieRango, tasaSel).filter((m) => m.pct !== null), [serieRango, tasaSel]);
  const acum = variacionAcumulada(serieRango, tasaSel);
  const promedioMensual = mesesRango.length ? mesesRango.reduce((a, m) => a + m.pct, 0) / mesesRango.length : null;
  const valores = puntos.map((p) => p.valor);
  const minimo = valores.length ? Math.min(...valores) : null;
  const maximo = valores.length ? Math.max(...valores) : null;

  if (serieCompleta.length === 0) {
    return (
      <Card style={{ padding: 20, color: C.mut, fontSize: 13, lineHeight: 1.5 }}>
        Aún no hay historial de tasas para mostrar su comportamiento. Cárgalo en
        <b> Ajustes → Tasas → Importar reporte</b>.
      </Card>
    );
  }

  const gradId = `grad-${tasaSel}`;

  return (
    <Card style={{ padding: 20 }}>
      {/* Encabezado: título + selector de tasa */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: FONTS.SANS, fontSize: 16, fontWeight: 800, color: C.ink, letterSpacing: -0.3 }}>
            Comportamiento de la tasa
          </div>
          <div style={{ fontSize: 12.5, color: C.mut, marginTop: 2 }}>
            Evolución de la tasa en el tiempo, según el historial cargado
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tasasDisponibles.map((k) => {
            const on = k === tasaSel;
            const ck = colorDe(k);
            return (
              <button
                key={k}
                onClick={() => setTasaSel(k)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 11px", borderRadius: 999, cursor: "pointer",
                  border: `1px solid ${on ? ck : C.line}`,
                  background: on ? ck + "1A" : "transparent",
                  color: on ? C.ink : C.mut, fontSize: 12, fontWeight: 700, fontFamily: FONTS.SANS
                }}
              >
                <span style={{ width: 9, height: 9, borderRadius: 999, background: on ? ck : C.line }} />
                {TASAS_META.find((t) => t.key === k)?.corto}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cotización actual estilo ticker */}
      {actual && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
          <div style={{ fontFamily: FONTS.SANS, fontSize: 32, fontWeight: 800, color, letterSpacing: -0.8, fontVariantNumeric: "tabular-nums" }}>
            Bs {nf.format(actual.valor)}
          </div>
          <Delta pct={deltaDia} size={13} />
          <span style={{ fontSize: 11.5, color: C.mut2 }}>al {fmtFechaLarga(actual.fecha)}</span>
        </div>
      )}

      {/* Controles: métrica + rango */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, margin: "10px 0 6px" }}>
        <Segmented
          value={metrica}
          onChange={setMetrica}
          options={[{ id: "nivel", label: "Nivel (Bs)" }, { id: "variacion", label: "Variación %" }]}
        />
        <Segmented
          value={rango}
          onChange={setRango}
          options={[{ id: "3", label: "3M" }, { id: "6", label: "6M" }, { id: "12", label: "12M" }, { id: "todo", label: "Todo" }]}
        />
      </div>

      {/* Gráfico */}
      <div style={{ height: 260, marginTop: 6 }}>
        <ResponsiveContainer width="100%" height="100%">
          {metrica === "nivel" ? (
            <AreaChart data={puntos} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: C.mut }} tickFormatter={fmtFechaCorta} minTickGap={44} />
              <YAxis tick={{ fontSize: 10, fill: C.mut }} tickFormatter={(v) => nf.format(v)} width={58} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${C.line}`, background: C.surface, fontFamily: FONTS.SANS }}
                labelFormatter={fmtFechaLarga}
                formatter={(v) => [`Bs ${nf.format(v)}`, meta?.label]}
              />
              <Area type="monotone" dataKey="valor" stroke={color} strokeWidth={2.4} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          ) : (
            <BarChart data={mesesRango.map((m) => ({ ...m, nombre: etiquetaMes(m.mes) }))} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
              <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: C.mut }} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: C.mut }} tickFormatter={(v) => v + "%"} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${C.line}`, background: C.surface, fontFamily: FONTS.SANS }}
                formatter={(v) => [`${nf.format(v)}%`, "Variación"]}
              />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {mesesRango.map((m, i) => <Cell key={i} fill={m.pct >= 0 ? C.gold : C.verde} />)}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Estadísticas del rango */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 0, marginTop: 12, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
        <MiniStat etiqueta="Acumulada (rango)" borde>
          {acum && acum.pct !== null ? <Delta pct={acum.pct} /> : "—"}
        </MiniStat>
        <MiniStat etiqueta="Promedio mensual" borde>
          {promedioMensual !== null ? <Delta pct={promedioMensual} /> : "—"}
        </MiniStat>
        <MiniStat etiqueta="Mínimo" borde>
          <span style={{ fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{minimo !== null ? `Bs ${nf.format(minimo)}` : "—"}</span>
        </MiniStat>
        <MiniStat etiqueta="Máximo">
          <span style={{ fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{maximo !== null ? `Bs ${nf.format(maximo)}` : "—"}</span>
        </MiniStat>
      </div>

      <div style={{ fontSize: 11, color: C.mut2, marginTop: 10 }}>
        Fuente: historial de tasas cargado en el sistema. Para el análisis completo (brecha, comparativo año contra año y exportación) usa Reportes → Análisis de Tasas.
      </div>
    </Card>
  );
}

function MiniStat({ etiqueta, children, borde = false }) {
  return (
    <div style={{ flex: "1 1 120px", minWidth: 110, padding: "0 14px", borderRight: borde ? `1px solid ${C.line}` : "none" }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 }}>{etiqueta}</div>
      <div style={{ fontSize: 14 }}>{children}</div>
    </div>
  );
}
