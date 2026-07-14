import React, { useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";
import { TrendingUp, LineChart as LineIcon, BarChart3, GitCompareArrows, CalendarRange } from "lucide-react";

import { C, FONTS } from "../../constants/theme";
import { nf } from "../../utils/finance";
import {
  TASAS_META, etiquetaMes,
  serieHistorial, aniosDisponibles, filtrarPorRango, rangoFechas, tasaTieneDatos,
  resumenMensual, tablaComportamiento, variacionAcumulada,
  serieBrecha, comparativoAnual
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
      {tab === "brecha" && <TabBrecha serie={serie} />}
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
              contentStyle={tooltipStyle}
              labelFormatter={(l) => new Date(l + "T00:00:00").toLocaleDateString("es-VE")}
              formatter={(v, name) => [`Bs ${nf.format(v)}`, TASAS_META.find((t) => t.key === name)?.label || name]}
            />
            {keys.filter((k) => visibles.has(k)).map((k) => (
              <Line key={k} type="monotone" dataKey={k} stroke={colorDe(k)} strokeWidth={2} dot={false} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
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
function TabBrecha({ serie }) {
  const datos = useMemo(() => serieBrecha(serie), [serie]);
  const ultimo = datos[datos.length - 1] || null;

  return (
    <Card style={{ padding: 18 }}>
      {ultimo && (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 12 }}>
          <span style={{ fontSize: 12.5, color: C.mut }}>
            Brecha Paralelo (último dato) <b style={{ color: C.rojo }}>+{ultimo.brechaParalelo !== null ? nf.format(ultimo.brechaParalelo) : "—"}%</b>
          </span>
          <span style={{ fontSize: 12.5, color: C.mut }}>
            Brecha Euro (último dato) <b style={{ color: C.azul }}>+{ultimo.brechaEuro !== null ? nf.format(ultimo.brechaEuro) : "—"}%</b>
          </span>
        </div>
      )}
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 6, right: 10, left: -6, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
            <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: C.mut }} tickFormatter={fmtFechaCorta} minTickGap={44} />
            <YAxis tick={{ fontSize: 10, fill: C.mut }} tickFormatter={(v) => v + "%"} width={46} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(l) => new Date(l + "T00:00:00").toLocaleDateString("es-VE")}
              formatter={(v, name) => [`${nf.format(v)}%`, name === "brechaParalelo" ? "Paralelo vs BCV" : "Euro vs BCV"]}
            />
            <Legend formatter={(name) => name === "brechaParalelo" ? "Paralelo vs BCV" : "Euro vs BCV"} wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="brechaParalelo" stroke={C.rojo} strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="brechaEuro" stroke={C.azul} strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ fontSize: 11, color: C.mut2, marginTop: 8 }}>
        Cuánto por encima del BCV oficial (USD) está cada referencia. Una brecha que se abre indica presión cambiaria.
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