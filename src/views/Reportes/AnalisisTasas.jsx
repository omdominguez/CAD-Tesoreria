import React, { useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine
} from "recharts";
import { TrendingUp, LineChart as LineIcon, BarChart3, GitCompareArrows, CalendarRange } from "lucide-react";

import { C, FONTS } from "../../constants/theme";
import { nf } from "../../utils/finance";
import {
  TASAS_META, etiquetaMes,
  serieHistorial, aniosDisponibles, filtrarPorRango, rangoFechas, tasaTieneDatos,
  resumenMensual, tablaComportamiento, variacionAcumulada,
  serieBrecha, resumenBrecha, tasasVigentes, comparativoAnual
} from "../../utils/analisisTasas";
import { exportarCSV, exportarExcel, exportarPDF } from "../../utils/exportar";

import { Section, Card, Empty } from "../../components/ui/Layout";
import { Segmented } from "../../components/ui/Buttons";
import { Select, Input } from "../../components/ui/Forms";
import { Th, Td } from "../../components/ui/Table";
import { ExportMenu } from "../../components/ui/ExportMenu";

const COLOR = { verde: C.verde, azul: C.azul, rojo: C.rojo, gold: C.gold };
const colorDe = (key) => COLOR[(TASAS_META.find((t) => t.key === key) || {}).colorVar] || C.ink;

// Tasas con historial real (Intervención se agrega solo si tiene datos cargados)
const TASAS_BASE = ["tasaBCV", "tasaBcvEuro", "tasaParalelo"];

const fmtFechaCorta = (iso) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 10,
  border: `1px solid ${C.line}`,
  background: C.surface,
  fontFamily: FONTS.SANS
};

function ChipPreset({ activo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        borderRadius: 999,
        cursor: "pointer",
        border: `1px solid ${activo ? C.navy : C.line}`,
        background: activo ? C.navy : "transparent",
        color: activo ? "#fff" : C.mut,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: FONTS.SANS
      }}
    >
      {children}
    </button>
  );
}

export default function AnalisisTasas({ st }) {
  const serieCompleta = useMemo(() => serieHistorial(st.historialTasas || {}), [st.historialTasas]);
  const anios = useMemo(() => aniosDisponibles(serieCompleta), [serieCompleta]);

  const [tab, setTab] = useState("resumen");
  const [minFecha, maxFecha] = useMemo(() => rangoFechas(serieCompleta), [serieCompleta]);
  // Por defecto arranca en el último año con datos (para que los KPIs y gráficos
  // no salgan con todo el histórico de golpe); el botón "Todo" abre el rango completo.
  const [desde, setDesde] = useState(() => (anios.length ? `${anios[anios.length - 1]}-01-01` : ""));
  const [hasta, setHasta] = useState(() => (anios.length ? `${anios[anios.length - 1]}-12-31` : ""));
  const [tasaSel, setTasaSel] = useState("tasaBCV");
  const [modoAnual, setModoAnual] = useState("promedio");

  const serie = useMemo(() => filtrarPorRango(serieCompleta, desde, hasta), [serieCompleta, desde, hasta]);

  const periodoTexto = !desde && !hasta ? "histórico completo" : `${desde || minFecha} a ${hasta || maxFecha}`;
  const periodoNombre = (!desde && !hasta ? "historico" : `${desde || minFecha}_${hasta || maxFecha}`).replace(/[^0-9a-zA-Z_-]/g, "");

  // Qué tasas graficar: las base + Intervención solo si alguien cargó datos de ella
  const tasasActivas = useMemo(() => {
    const base = [...TASAS_BASE];
    if (tasaTieneDatos(serieCompleta, "tasaIntervencion")) base.push("tasaIntervencion");
    return base;
  }, [serieCompleta]);

  if (serieCompleta.length === 0) {
    return (
      <Empty
        icon={TrendingUp}
        title="Sin historial de tasas todavía"
        msg="Carga el historial en Ajustes → Tasas → Importar reporte. Con esos datos aquí verás la evolución, la variación mensual, la brecha cambiaria y el comparativo año contra año."
      />
    );
  }

  const tabs = [
    { id: "resumen", label: "Resumen mensual", icon: CalendarRange },
    { id: "evolucion", label: "Evolución", icon: LineIcon },
    { id: "variacion", label: "Variación m/m", icon: BarChart3 },
    { id: "brecha", label: "Brecha", icon: GitCompareArrows },
    { id: "anual", label: "Año vs año", icon: TrendingUp }
  ];

  return (
    <Section
      title="Análisis de Tasas de Cambio"
      desc="Comportamiento histórico de las tasas a lo largo del tiempo, a partir del historial cargado en Ajustes → Tasas."
    >
      {/* KPIs de variación acumulada del período seleccionado */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        {TASAS_BASE.map((k) => {
          const v = variacionAcumulada(serie, k);
          const meta = TASAS_META.find((t) => t.key === k);
          return (
            <Card key={k} style={{ flex: "1 1 200px", minWidth: 190, padding: 16, borderTop: `4px solid ${colorDe(k)}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 0.3 }}>
                {meta.label} · acumulado
              </div>
              {v ? (
                <>
                  <div style={{ fontFamily: FONTS.SANS, fontSize: 24, fontWeight: 800, color: v.pct >= 0 ? C.rojo : C.verde, letterSpacing: -0.5, marginTop: 6 }}>
                    {v.pct >= 0 ? "+" : ""}{nf.format(v.pct)}%
                  </div>
                  <div style={{ fontSize: 11.5, color: C.mut, marginTop: 4 }}>
                    Bs {nf.format(v.inicial)} → Bs {nf.format(v.final)}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12.5, color: C.mut, marginTop: 8 }}>Sin datos suficientes</div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Pestañas */}
      <div style={{ marginBottom: 12 }}>
        <Segmented value={tab} onChange={setTab} options={tabs} />
      </div>

      {/* Filtro de período (el comparativo anual usa todos los años, no se filtra) */}
      {tab !== "anual" && (
        <Card style={{ padding: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: C.mut, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Período</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Input
                type="date"
                value={desde}
                min={minFecha || undefined}
                max={hasta || maxFecha || undefined}
                onChange={(e) => setDesde(e.target.value)}
                style={{ marginBottom: 0, width: 150 }}
              />
              <span style={{ color: C.mut, fontSize: 12 }}>a</span>
              <Input
                type="date"
                value={hasta}
                min={desde || minFecha || undefined}
                max={maxFecha || undefined}
                onChange={(e) => setHasta(e.target.value)}
                style={{ marginBottom: 0, width: 150 }}
              />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <ChipPreset activo={!desde && !hasta} onClick={() => { setDesde(""); setHasta(""); }}>Todo</ChipPreset>
              {anios.map((a) => (
                <ChipPreset
                  key={a}
                  activo={desde === `${a}-01-01` && hasta === `${a}-12-31`}
                  onClick={() => { setDesde(`${a}-01-01`); setHasta(`${a}-12-31`); }}
                >
                  {a}
                </ChipPreset>
              ))}
            </div>
            <span style={{ marginLeft: "auto", fontSize: 12, color: C.mut }}>
              <b style={{ color: C.ink }}>{serie.length}</b> día(s) en el período
            </span>
          </div>
        </Card>
      )}

      {tab === "resumen" && <TabResumen serie={serie} keys={tasasActivas} periodoNombre={periodoNombre} periodoTexto={periodoTexto} />}
      {tab === "evolucion" && <TabEvolucion serie={serie} keys={tasasActivas} />}
      {tab === "variacion" && <TabVariacion serie={serie} tasaSel={tasaSel} setTasaSel={setTasaSel} keys={tasasActivas} />}
      {tab === "brecha" && <TabBrecha serie={serie} keys={tasasActivas} />}
      {tab === "anual" && (
        <TabAnual
          serieCompleta={serieCompleta}
          anios={anios}
          tasaSel={tasaSel}
          setTasaSel={setTasaSel}
          modo={modoAnual}
          setModo={setModoAnual}
          keys={tasasActivas}
        />
      )}
    </Section>
  );
}

/* ============================================================
   PESTAÑA: RESUMEN MENSUAL (tabla de comportamiento + export)
   ============================================================ */
function TabResumen({ serie, keys, periodoNombre, periodoTexto }) {
  const tasasTabla = keys.filter((k) => k !== "tasaIntervencion"); // la tabla muestra las 3 con historial
  const tabla = useMemo(() => tablaComportamiento(serie, tasasTabla), [serie, tasasTabla]);

  const columnasExport = [
    { key: "mes", label: "Mes" },
    ...tasasTabla.flatMap((k) => {
      const meta = TASAS_META.find((t) => t.key === k);
      return [
        { key: `${k}_cierre`, label: `${meta.corto} cierre` },
        { key: `${k}_pct`, label: `${meta.corto} var %` }
      ];
    })
  ];

  const filasExport = () => tabla.map((f) => {
    const fila = { mes: etiquetaMes(f.mes) };
    tasasTabla.forEach((k) => {
      fila[`${k}_cierre`] = f[k] ? nf.format(f[k].cierre) : "";
      fila[`${k}_pct`] = f[k] && f[k].pct !== null ? `${nf.format(f[k].pct)}%` : "";
    });
    return fila;
  });

  const exportar = async (formato) => {
    const nombre = `analisis_tasas_${periodoNombre}`;
    if (formato === "csv") return exportarCSV(nombre, columnasExport, filasExport());
    if (formato === "excel") return exportarExcel(nombre, columnasExport, filasExport(), "Comportamiento tasas");
    if (formato === "pdf") return exportarPDF(nombre, columnasExport, filasExport(), {
      titulo: "Análisis de Tasas de Cambio",
      subtitulo: `Comportamiento mensual · ${periodoTexto}`
    });
  };

  if (tabla.length === 0) {
    return <Card style={{ padding: 30, textAlign: "center", color: C.mut, fontSize: 13 }}>No hay datos para el año seleccionado.</Card>;
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 12px 0" }}>
        <ExportMenu onExport={exportar} />
      </div>
      <div className="cad-table-scroll" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Mes</Th>
              {tasasTabla.map((k) => {
                const meta = TASAS_META.find((t) => t.key === k);
                return (
                  <React.Fragment key={k}>
                    <Th right>{meta.corto} cierre</Th>
                    <Th right>Var %</Th>
                  </React.Fragment>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {tabla.map((f) => (
              <tr key={f.mes}>
                <Td bold>{etiquetaMes(f.mes)}</Td>
                {tasasTabla.map((k) => (
                  <React.Fragment key={k}>
                    <Td right style={{ fontVariantNumeric: "tabular-nums" }}>
                      {f[k] ? `Bs ${nf.format(f[k].cierre)}` : "—"}
                    </Td>
                    <Td right style={{ fontWeight: 600, color: !f[k] || f[k].pct === null ? C.mut : f[k].pct >= 0 ? C.rojo : C.verde }}>
                      {f[k] && f[k].pct !== null ? `${f[k].pct >= 0 ? "+" : ""}${nf.format(f[k].pct)}%` : "—"}
                    </Td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: C.mut2, padding: "10px 14px" }}>
        "Cierre" es la última tasa registrada del mes; "Var %" es el cambio entre el primer y el último día con dato de ese mes.
      </div>
    </Card>
  );
}

/* ============================================================
   PESTAÑA: EVOLUCIÓN DIARIA (línea)
   ============================================================ */
function TabEvolucion({ serie, keys }) {
  const [visibles, setVisibles] = useState(() => new Set(keys));

  const datos = serie.map((r) => {
    const d = { fecha: r.fecha };
    keys.forEach((k) => { d[k] = r[k] > 0 ? r[k] : null; });
    return d;
  });

  const toggle = (k) => setVisibles((prev) => {
    const s = new Set(prev);
    s.has(k) ? s.delete(k) : s.add(k);
    return s;
  });

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {keys.map((k) => {
          const meta = TASAS_META.find((t) => t.key === k);
          const on = visibles.has(k);
          return (
            <button
              key={k}
              onClick={() => toggle(k)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 11px", borderRadius: 999, cursor: "pointer",
                border: `1px solid ${on ? colorDe(k) : C.line}`,
                background: on ? colorDe(k) + "18" : "transparent",
                color: on ? C.ink : C.mut, fontSize: 12, fontWeight: 600,
                fontFamily: FONTS.SANS
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: 999, background: on ? colorDe(k) : C.line }} />
              {meta.label}
            </button>
          );
        })}
      </div>
      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 6, right: 10, left: -6, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
            <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: C.mut }} tickFormatter={fmtFechaCorta} minTickGap={44} />
            <YAxis tick={{ fontSize: 10, fill: C.mut }} tickFormatter={(v) => nf.format(v)} width={56} />
            <Tooltip
              content={<TooltipEvolucionConBrecha keys={keys} />}
            />
            {keys.filter((k) => visibles.has(k)).map((k) => (
              <Line key={k} type="monotone" dataKey={k} stroke={colorDe(k)} strokeWidth={2} dot={false} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ fontSize: 11, color: C.mut2, marginTop: 8 }}>
        Al pasar el mouse sobre una fecha, además del valor de cada tasa se muestra su brecha % contra BCV ($) ese mismo día.
      </div>
    </Card>
  );
}

/**
 * Tooltip a medida para Evolución: además del valor en Bs de cada tasa
 * visible, muestra su brecha % contra BCV ($) en esa misma fecha (BCV no
 * lleva brecha, es la referencia). Así de un vistazo se ve el nivel y qué
 * tan lejos está cada una del oficial ese día puntual.
 */
function TooltipEvolucionConBrecha({ active, payload, label, keys }) {
  if (!active || !payload || !payload.length) return null;
  const fila = payload[0].payload || {};
  const bcv = fila.tasaBCV > 0 ? fila.tasaBCV : null;

  // Mantiene el orden de TASAS_META, solo las que están visibles en el gráfico
  const visiblesKeys = TASAS_META.map((t) => t.key).filter((k) => keys.includes(k) && payload.some((p) => p.dataKey === k));

  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: C.ink }}>
        {new Date(label + "T00:00:00").toLocaleDateString("es-VE")}
      </div>
      {visiblesKeys.map((k) => {
        const meta = TASAS_META.find((t) => t.key === k);
        const valor = fila[k];
        if (valor == null) return null;
        const esBCV = k === "tasaBCV";
        const brecha = !esBCV && bcv ? ((valor - bcv) / bcv) * 100 : null;
        return (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 14, marginTop: 3 }}>
            <span style={{ color: colorDe(k) }}>{meta?.label}</span>
            <span style={{ display: "flex", gap: 8 }}>
              <b style={{ color: C.ink }}>Bs {nf.format(valor)}</b>
              {brecha !== null && (
                <span style={{ color: brecha >= 0 ? C.rojo : C.verde, fontWeight: 600 }}>
                  ({brecha >= 0 ? "+" : ""}{nf.format(brecha)}%)
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   PESTAÑA: VARIACIÓN MES A MES (barras)
   ============================================================ */
function TabVariacion({ serie, tasaSel, setTasaSel, keys }) {
  const meses = useMemo(() => resumenMensual(serie, tasaSel), [serie, tasaSel]);
  const conPct = meses.filter((m) => m.pct !== null);
  const promedio = conPct.length ? conPct.reduce((a, m) => a + m.pct, 0) / conPct.length : null;

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
        <div style={{ minWidth: 180 }}>
          <Select value={tasaSel} onChange={(e) => setTasaSel(e.target.value)}>
            {keys.map((k) => <option key={k} value={k}>{TASAS_META.find((t) => t.key === k)?.label}</option>)}
          </Select>
        </div>
        {promedio !== null && (
          <span style={{ fontSize: 12.5, color: C.mut }}>
            Promedio mensual <b style={{ color: C.ink }}>{promedio >= 0 ? "+" : ""}{nf.format(promedio)}%</b>
          </span>
        )}
      </div>
      {conPct.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: C.mut, fontSize: 13 }}>
          Se necesitan al menos dos días con dato en un mes para calcular su variación.
        </div>
      ) : (
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={conPct.map((m) => ({ ...m, nombre: etiquetaMes(m.mes) }))} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
              <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: C.mut }} interval={0} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10, fill: C.mut }} tickFormatter={(v) => v + "%"} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [`${nf.format(v)}%`, "Variación"]}
              />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {conPct.map((m, i) => <Cell key={i} fill={m.pct >= 0 ? C.rojo : C.verde} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div style={{ fontSize: 11, color: C.mut2, marginTop: 8 }}>
        Barras hacia arriba (rojo) = devaluación del bolívar ese mes; hacia abajo (verde) = apreciación.
      </div>
    </Card>
  );
}

/* ============================================================
   PESTAÑA: BRECHA CAMBIARIA (Paralelo/Euro sobre BCV)
   ============================================================ */
function TabBrecha({ serie, keys }) {
  const datos = useMemo(() => serieBrecha(serie), [serie]);
  const resumen = useMemo(() => resumenBrecha(datos), [datos]);
  const vigentes = useMemo(() => tasasVigentes(serie), [serie]);

  // Solo se ofrecen brechas de tasas que efectivamente tienen datos cargados
  const BRECHAS_META = [
    { dataKey: "brechaParalelo", tasaKey: "tasaParalelo", label: "Paralelo vs BCV", corto: "Paralelo", color: C.rojo, activa: keys.includes("tasaParalelo") },
    { dataKey: "brechaIntervencion", tasaKey: "tasaIntervencion", label: "Intervención vs BCV", corto: "Intervención", color: C.gold, activa: keys.includes("tasaIntervencion") },
    { dataKey: "brechaEuro", tasaKey: "tasaBcvEuro", label: "Euro vs BCV", corto: "Euro", color: C.azul, activa: keys.includes("tasaBcvEuro") }
  ].filter((b) => b.activa && resumen[b.dataKey] !== null);

  const [visibles, setVisibles] = useState(() => new Set(BRECHAS_META.map((b) => b.dataKey)));
  const toggle = (k) => setVisibles((prev) => {
    const s = new Set(prev);
    s.has(k) ? s.delete(k) : s.add(k);
    return s;
  });

  if (BRECHAS_META.length === 0) {
    return (
      <Card style={{ padding: 30, textAlign: "center", color: C.mut, fontSize: 13 }}>
        Se necesita al menos otra tasa además de BCV ($) para calcular una brecha.
      </Card>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 14, lineHeight: 1.5 }}>
        Referencia: cobras a <b style={{ color: C.ink }}>BCV ($)</b>. Esto es lo que cuesta hoy comprar
        de vuelta esos dólares en cada tasa del mercado — en % y en bolívares por cada dólar.
      </div>

      {/* Tarjetas: cuánto cuesta HOY comprar $1 en cada tasa vs BCV */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        {BRECHAS_META.map((b) => {
          const tasaHoy = vigentes[b.tasaKey];
          const bcvHoy = vigentes.tasaBCV;
          const gapBs = tasaHoy !== null && bcvHoy !== null ? tasaHoy - bcvHoy : null;
          const gapPct = gapBs !== null && bcvHoy > 0 ? (gapBs / bcvHoy) * 100 : null;
          const r = resumen[b.dataKey];
          return (
            <Card key={b.dataKey} style={{ flex: "1 1 230px", minWidth: 220, padding: 16, borderTop: `4px solid ${b.color}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 }}>
                {b.label}
              </div>
              {gapBs !== null ? (
                <>
                  <div style={{ fontFamily: FONTS.SANS, fontSize: 22, fontWeight: 800, color: b.color, letterSpacing: -0.4 }}>
                    +Bs {nf.format(gapBs)}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.mut, marginTop: 2 }}>
                    por cada $1 · {gapPct >= 0 ? "+" : ""}{nf.format(gapPct)}% sobre BCV
                  </div>
                  <div style={{ fontSize: 11, color: C.mut2, marginTop: 6 }}>
                    Bs {nf.format(bcvHoy)} (BCV) → Bs {nf.format(tasaHoy)} ({b.corto})
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12.5, color: C.mut, marginTop: 6 }}>Sin dato vigente</div>
              )}
              <div style={{ display: "flex", gap: 12, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}`, fontSize: 11 }}>
                <span style={{ color: C.mut }}>Prom. período <b style={{ color: C.ink }}>{nf.format(r.promedio)}%</b></span>
                <span style={{ color: C.mut }}>Máx <b style={{ color: C.ink }}>{nf.format(r.max)}%</b></span>
              </div>
            </Card>
          );
        })}
      </div>

      <CalculadoraBrecha vigentes={vigentes} brechasMeta={BRECHAS_META} />

      <Card style={{ padding: 18, marginTop: 16 }}>
        <div style={{ fontFamily: FONTS.SANS, fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 2 }}>
          Cómo se ha movido la brecha en el tiempo
        </div>
        <div style={{ fontSize: 11.5, color: C.mut, marginBottom: 12 }}>
          % de diferencia de cada tasa contra el BCV, día a día en el período seleccionado.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {BRECHAS_META.map((b) => {
            const on = visibles.has(b.dataKey);
            return (
              <button
                key={b.dataKey}
                onClick={() => toggle(b.dataKey)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 11px", borderRadius: 999, cursor: "pointer",
                  border: `1px solid ${on ? b.color : C.line}`,
                  background: on ? b.color + "18" : "transparent",
                  color: on ? C.ink : C.mut, fontSize: 12, fontWeight: 600, fontFamily: FONTS.SANS
                }}
              >
                <span style={{ width: 9, height: 9, borderRadius: 999, background: on ? b.color : C.line }} />
                {b.corto}
              </button>
            );
          })}
        </div>

        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datos} margin={{ top: 6, right: 10, left: -6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: C.mut }} tickFormatter={fmtFechaCorta} minTickGap={44} />
              <YAxis tick={{ fontSize: 10, fill: C.mut }} tickFormatter={(v) => v + "%"} width={46} />
              <ReferenceLine y={0} stroke={C.mut2} strokeDasharray="2 4" />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(l) => new Date(l + "T00:00:00").toLocaleDateString("es-VE")}
                formatter={(v, name) => [`${v >= 0 ? "+" : ""}${nf.format(v)}%`, BRECHAS_META.find((b) => b.dataKey === name)?.label || name]}
              />
              {BRECHAS_META.filter((b) => visibles.has(b.dataKey)).map((b) => (
                <Line key={b.dataKey} type="monotone" dataKey={b.dataKey} stroke={b.color} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontSize: 11, color: C.mut2, marginTop: 8 }}>
          La línea punteada en 0% marca la paridad con el BCV. Una brecha que se abre indica presión cambiaria.
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   CALCULADORA: cuánto cuesta comprar un monto en cada tasa
   ============================================================ */
function CalculadoraBrecha({ vigentes, brechasMeta }) {
  const [monto, setMonto] = useState("1000");
  const [modo, setModo] = useState("USD"); // "USD": tengo/necesito comprar N dólares · "BS": tengo N Bs y quiero saber cuántos USD alcanzan

  const n = Number(monto) || 0;
  const bcv = vigentes.tasaBCV;

  if (!bcv) {
    return (
      <Card style={{ padding: 16, fontSize: 12.5, color: C.mut }}>
        Falta la tasa BCV vigente para calcular. Verifica el historial en Ajustes → Tasas.
      </Card>
    );
  }

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ fontFamily: FONTS.SANS, fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 10 }}>
        Calculadora rápida
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
        <div style={{ minWidth: 160 }}>
          <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>
            {modo === "USD" ? "Dólares a comprar" : "Bolívares disponibles"}
          </div>
          <Input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} style={{ marginBottom: 0 }} />
        </div>
        <div style={{ minWidth: 200 }}>
          <div style={{ fontSize: 11, color: C.mut, marginBottom: 4 }}>Tengo</div>
          <Segmented
            value={modo}
            onChange={setModo}
            options={[{ id: "USD", label: "Necesito $ dólares" }, { id: "BS", label: "Tengo Bs" }]}
          />
        </div>
      </div>

      <div className="cad-table-scroll" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Tasa</Th>
              <Th right>Bs / $1</Th>
              {modo === "USD" ? (
                <>
                  <Th right>Bs necesarios</Th>
                  <Th right>vs BCV (Bs)</Th>
                </>
              ) : (
                <>
                  <Th right>$ que alcanzan</Th>
                  <Th right>vs BCV ($)</Th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td bold>BCV ($) · referencia</Td>
              <Td right style={{ fontVariantNumeric: "tabular-nums" }}>Bs {nf.format(bcv)}</Td>
              {modo === "USD" ? (
                <>
                  <Td right style={{ fontVariantNumeric: "tabular-nums" }}>Bs {nf.format(n * bcv)}</Td>
                  <Td right style={{ color: C.mut }}>—</Td>
                </>
              ) : (
                <>
                  <Td right style={{ fontVariantNumeric: "tabular-nums" }}>$ {nf.format(bcv > 0 ? n / bcv : 0)}</Td>
                  <Td right style={{ color: C.mut }}>—</Td>
                </>
              )}
            </tr>
            {brechasMeta.map((b) => {
              const tasa = vigentes[b.tasaKey];
              if (!tasa) return null;
              if (modo === "USD") {
                const bsBcv = n * bcv;
                const bsTasa = n * tasa;
                const diff = bsTasa - bsBcv;
                return (
                  <tr key={b.dataKey}>
                    <Td bold style={{ color: b.color }}>{b.corto}</Td>
                    <Td right style={{ fontVariantNumeric: "tabular-nums" }}>Bs {nf.format(tasa)}</Td>
                    <Td right style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>Bs {nf.format(bsTasa)}</Td>
                    <Td right style={{ fontWeight: 700, color: diff > 0 ? C.rojo : diff < 0 ? C.verde : C.mut }}>
                      {diff >= 0 ? "+" : ""}Bs {nf.format(diff)}
                    </Td>
                  </tr>
                );
              }
              const usdBcv = n / bcv;
              const usdTasa = tasa > 0 ? n / tasa : 0;
              const diff = usdTasa - usdBcv;
              return (
                <tr key={b.dataKey}>
                  <Td bold style={{ color: b.color }}>{b.corto}</Td>
                  <Td right style={{ fontVariantNumeric: "tabular-nums" }}>Bs {nf.format(tasa)}</Td>
                  <Td right style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>$ {nf.format(usdTasa)}</Td>
                  <Td right style={{ fontWeight: 700, color: diff < 0 ? C.rojo : diff > 0 ? C.verde : C.mut }}>
                    {diff >= 0 ? "+" : ""}$ {nf.format(diff)}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: C.mut2, marginTop: 10 }}>
        {modo === "USD"
          ? "Cuántos bolívares de más necesitas para comprar ese monto en cada tasa, comparado con lo que hubieras pagado a BCV."
          : "Con esos bolívares (cobrados a BCV), cuántos dólares menos alcanzas a comprar si el mercado está en cada tasa."}
      </div>
    </Card>
  );
}

/* ============================================================
   PESTAÑA: COMPARATIVO AÑO VS AÑO (mismo mes)
   ============================================================ */
function TabAnual({ serieCompleta, anios, tasaSel, setTasaSel, modo, setModo, keys }) {
  const { filas } = useMemo(() => comparativoAnual(serieCompleta, tasaSel, modo), [serieCompleta, tasaSel, modo]);

  if (anios.length < 2) {
    return (
      <Card style={{ padding: 30, textAlign: "center", color: C.mut, fontSize: 13.5, lineHeight: 1.6 }}>
        <CalendarRange size={22} color={C.mut} style={{ marginBottom: 8 }} />
        <div>Por ahora solo hay datos de <b style={{ color: C.ink }}>{anios[0]}</b>.</div>
        <div>Carga el historial de otro año (por ejemplo 2025) en Ajustes → Tasas → Importar reporte y aquí aparecerá el comparativo mes contra mes.</div>
      </Card>
    );
  }

  const colores = [C.navy, C.gold, C.verde, C.azul];

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div style={{ minWidth: 180 }}>
          <Select value={tasaSel} onChange={(e) => setTasaSel(e.target.value)}>
            {keys.map((k) => <option key={k} value={k}>{TASAS_META.find((t) => t.key === k)?.label}</option>)}
          </Select>
        </div>
        <Segmented
          value={modo}
          onChange={setModo}
          options={[{ id: "promedio", label: "Promedio del mes" }, { id: "cierre", label: "Cierre del mes" }]}
        />
      </div>

      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filas} margin={{ top: 6, right: 6, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
            <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: C.mut }} interval={0} />
            <YAxis tick={{ fontSize: 10, fill: C.mut }} tickFormatter={(v) => nf.format(v)} width={56} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [`Bs ${nf.format(v)}`, name]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {anios.map((a, i) => (
              <Bar key={a} dataKey={a} fill={colores[i % colores.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="cad-table-scroll" style={{ overflowX: "auto", marginTop: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Mes</Th>
              {anios.map((a) => <Th key={a} right>{a}</Th>)}
              {anios.length === 2 && <Th right>Δ {anios[1]} vs {anios[0]}</Th>}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const a0 = f[anios[0]], a1 = f[anios[1]];
              const yoy = anios.length === 2 && a0 > 0 && a1 != null ? ((a1 - a0) / a0) * 100 : null;
              return (
                <tr key={f.mesNum}>
                  <Td bold>{f.nombre}</Td>
                  {anios.map((a) => (
                    <Td key={a} right style={{ fontVariantNumeric: "tabular-nums" }}>
                      {f[a] != null ? `Bs ${nf.format(f[a])}` : "—"}
                    </Td>
                  ))}
                  {anios.length === 2 && (
                    <Td right style={{ fontWeight: 600, color: yoy === null ? C.mut : yoy >= 0 ? C.rojo : C.verde }}>
                      {yoy !== null ? `${yoy >= 0 ? "+" : ""}${nf.format(yoy)}%` : "—"}
                    </Td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: C.mut2, marginTop: 8 }}>
        Compara el mismo mes calendario entre años. Δ positivo (rojo) = la tasa fue más alta que el año anterior.
      </div>
    </Card>
  );
}