import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { PieChart } from "lucide-react";

import { C, FONTS, CLASIF } from "../../constants/theme";
import { money, provNom, fmtD, tasaDe } from "../../utils/finance";
import { calcularCostosPorCategoria, categoriasOrdenadas } from "../../utils/costosPorCategoria";
import { detectarMontosAtipicos } from "../../utils/deteccionAnomalias";

import { Section, Card, Empty } from "../../components/ui/Layout";
import { Th, Td } from "../../components/ui/Table";
import ResumenIA from "../../components/shared/ResumenIA";

const PALETA = [C.navy, C.gold, C.verde, C.azul, C.rojo, C.amar, C.mut];
const colorDe = (categoria) => {
  const idx = CLASIF.indexOf(categoria);
  return idx >= 0 ? PALETA[idx % PALETA.length] : PALETA[PALETA.length - 1]; // "Sin categoría" u otras -> último color
};

const hoy = () => new Date().toISOString().slice(0, 10);
const hace = (dias) => new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);
const inicioAnio = () => `${new Date().getFullYear()}-01-01`;

/** "2026-03" -> "Mar 26" */
const etiquetaMes = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const NOMBRES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${NOMBRES[m - 1]} ${String(y).slice(2)}`;
};

export default function ControlCostos({ st }) {
  const [desde, setDesde] = useState(hace(90));
  const [hasta, setHasta] = useState(hoy());

  const resultado = useMemo(() => calcularCostosPorCategoria(st, desde, hasta), [st, desde, hasta]);
  const categorias = useMemo(() => categoriasOrdenadas(resultado), [resultado]);

  const montosAtipicos = useMemo(() => {
    const montoUSDde = (c) => (c.moneda === "USD" ? Number(c.montoOriginal) || 0 : (Number(c.montoOriginal) || 0) / tasaDe(st, c));
    return detectarMontosAtipicos(st.compromisos, montoUSDde);
  }, [st]);

  const datosTendencia = resultado.porMes.map((m) => ({
    mes: etiquetaMes(m.mes),
    ...m.totalesPorCategoria
  }));

  const aplicarPreset = (dias, esInicioAnio) => {
    setHasta(hoy());
    setDesde(esInicioAnio ? inicioAnio() : hace(dias));
  };

  return (
    <Section
      title="Control de Costos por Categoría"
      desc="Cuánto se está gastando y en qué — según la fecha en que se generó el pedido, sin importar si ya está pagado. Para ver qué falta pagar, usa Cuentas por Pagar o Planificación Financiera."
    >
      <Card style={{ padding: 12, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.mut, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Período</span>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12.5 }} />
          <span style={{ color: C.mut, fontSize: 12 }}>a</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12.5 }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => aplicarPreset(30)} style={chipEstilo}>30 días</button>
            <button onClick={() => aplicarPreset(90)} style={chipEstilo}>90 días</button>
            <button onClick={() => aplicarPreset(null, true)} style={chipEstilo}>Este año</button>
          </div>
          <span style={{ marginLeft: "auto", fontSize: 12, color: C.mut }}>
            <b style={{ color: C.ink }}>{resultado.cantidad}</b> pedido(s) en el período
          </span>
        </div>
      </Card>

      {montosAtipicos.length > 0 && <MontosAtipicosCard st={st} atipicos={montosAtipicos} />}

      {resultado.cantidad === 0 ? (
        <Empty icon={PieChart} title="Sin gastos en este período" msg="Ajusta el rango de fechas para ver el desglose por categoría." />
      ) : (
        <>
          <ResumenIA
            titulo={`Control de Costos por Categoría (${desde} a ${hasta})`}
            datos={{ totalUSD: resultado.totalUSD, cantidad: resultado.cantidad, porCategoria: resultado.porCategoria }}
            nombreArchivo={`control_costos_${desde}_${hasta}`}
            tablasPdf={[{
              titulo: "Gasto por categoría",
              columnas: ["Categoría", "Pedidos", "Total (USD)", "% del gasto"],
              filas: resultado.porCategoria.map((c) => [c.categoria, c.cantidad, `$ ${c.totalUSD.toFixed(2)}`, `${c.pct.toFixed(1)}%`])
            }]}
          />

          <Card style={{ padding: 18, marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.mut, textTransform: "uppercase" }}>Gasto total del período</div>
                <div style={{ fontFamily: FONTS.SANS, fontSize: 28, fontWeight: 800, color: C.ink, letterSpacing: -0.5 }}>
                  {money(resultado.totalUSD, "USD")}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", height: 28, borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
              {resultado.porCategoria.map((c) => (
                <div
                  key={c.categoria}
                  title={`${c.categoria}: ${money(c.totalUSD, "USD")} (${c.pct.toFixed(1)}%)`}
                  style={{ width: `${c.pct}%`, background: colorDe(c.categoria), minWidth: c.pct > 0 ? 2 : 0 }}
                />
              ))}
            </div>

            <div className="cad-table-scroll" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr><Th></Th><Th>Categoría</Th><Th right>Pedidos</Th><Th right>Total USD</Th><Th right>% del gasto</Th></tr>
                </thead>
                <tbody>
                  {resultado.porCategoria.map((c) => (
                    <tr key={c.categoria}>
                      <Td><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: colorDe(c.categoria) }} /></Td>
                      <Td bold>{c.categoria}</Td>
                      <Td right>{c.cantidad}</Td>
                      <Td right bold>{money(c.totalUSD, "USD")}</Td>
                      <Td right style={{ color: C.mut }}>{c.pct.toFixed(1)}%</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {resultado.porMes.length > 1 && (
            <Card style={{ padding: 18 }}>
              <div style={{ fontFamily: FONTS.SANS, fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 2 }}>
                Tendencia mensual por categoría
              </div>
              <div style={{ fontSize: 11.5, color: C.mut, marginBottom: 12 }}>
                Cómo se ha movido el gasto de cada categoría mes a mes dentro del período.
              </div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosTendencia} margin={{ top: 6, right: 10, left: -6, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 10, fill: C.mut }} />
                    <YAxis tick={{ fontSize: 10, fill: C.mut }} tickFormatter={(v) => (Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + "k" : v)} width={46} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${C.line}`, background: C.surface }}
                      formatter={(v, name) => [money(v, "USD"), name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11.5 }} />
                    {categorias.map((cat) => (
                      <Bar key={cat} dataKey={cat} stackId="gasto" fill={colorDe(cat)} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      )}
    </Section>
  );
}

const chipEstilo = {
  padding: "5px 12px",
  borderRadius: 999,
  border: `1px solid ${C.line}`,
  background: "transparent",
  color: C.mut,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: FONTS.SANS
};

/**
 * Pedidos cuyo monto se sale mucho de lo normal PARA ESE PROVEEDOR (no un
 * umbral fijo para toda la empresa) — ver utils/deteccionAnomalias.js.
 * Es informativo: no bloquea nada, solo señala qué vale la pena revisar
 * (posible error de captura, o simplemente un pedido especial).
 */
function MontosAtipicosCard({ st, atipicos }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Card style={{ padding: 0, marginBottom: 16, overflow: "hidden", borderLeft: `3px solid ${C.rojo}` }}>
      <button
        onClick={() => setAbierto((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ fontSize: 13, fontFamily: FONTS.SANS, fontWeight: 700, color: C.ink, flex: 1 }}>
          ⚠ {atipicos.length} pedido(s) con monto fuera de lo normal para su proveedor
        </span>
        <span style={{ fontSize: 11, color: C.mut }}>{abierto ? "ocultar" : "ver detalle"}</span>
      </button>

      {abierto && (
        <div style={{ padding: "0 16px 14px", display: "grid", gap: 8 }}>
          {atipicos.slice(0, 10).map((a, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: C.body, fontSize: 12.5 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.ink, fontWeight: 600 }}>{provNom(st, a.compromiso.proveedorId)}</div>
                <div style={{ color: C.mut, fontSize: 11.5 }}>{a.compromiso.descripcion} · {fmtD(a.compromiso.fechaPedido)}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 700, color: C.rojo }}>{money(a.montoUSD, "USD")}</div>
                <div style={{ fontSize: 11, color: C.mut }}>{a.vecesSobrePromedio.toFixed(1)}x su promedio ({money(a.promedioProveedorUSD, "USD")})</div>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: C.mut2, marginTop: 2 }}>
            Comparado contra el historial de compras de ese mismo proveedor (mínimo 4 pedidos previos). No
            significa que esté mal — puede ser un pedido especial — pero vale la pena confirmarlo.
          </div>
        </div>
      )}
    </Card>
  );
}
