import React, { useMemo, useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer
} from "recharts";
import { AlertTriangle, CheckCircle2, TrendingDown, ListOrdered } from "lucide-react";

import { C, FONTS } from "../../constants/theme";
import { money, fmtD } from "../../utils/finance";
import { flujoRodante, sugerenciaPrioridadPago } from "../../utils/planificacion";

import { Section, Card } from "../../components/ui/Layout";
import { Segmented } from "../../components/ui/Buttons";
import { Badge } from "../../components/ui/Data";
import { Th, Td } from "../../components/ui/Table";

const TONE_PRIORIDAD = { URGENTE: "rojo", NORMAL: "mut", FLEXIBLE: "verde" };
const LABEL_PRIORIDAD = { URGENTE: "Urgente", NORMAL: "Normal", FLEXIBLE: "Flexible" };

export default function PlanificacionFinanciera({ st }) {
  const [tab, setTab] = useState("flujo");
  const [numSemanas, setNumSemanas] = useState(13);

  const flujo = useMemo(() => flujoRodante(st, numSemanas), [st, numSemanas]);
  const sugerencia = useMemo(() => sugerenciaPrioridadPago(st), [st]);

  return (
    <Section
      title="Planificación Financiera"
      desc="Proyección de caja hacia adelante y sugerencia de qué pagar primero si el efectivo no alcanza para todo."
    >
      {/* Alerta proactiva, siempre visible arriba sin importar la pestaña */}
      {flujo.primeraSemanaNegativa && (
        <Card style={{ padding: "14px 18px", marginBottom: 18, borderLeft: `3px solid ${C.rojo}`, background: C.rojoSoft }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <AlertTriangle size={18} color={C.rojo} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>
              <b>Alerta de flujo de caja:</b> con lo que ya está comprometido, tu saldo proyectado se pondría en
              rojo en la <b>{flujo.semanas[flujo.primeraSemanaNegativa - 1].nombre}</b>, llegando hasta{" "}
              <b>{money(flujo.montoMinimoNegativo, "USD")}</b>. Revisa la sugerencia de prioridad de pago para
              decidir qué mover o adelantar cobros.
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { id: "flujo", label: "Flujo rodante", icon: TrendingDown },
            { id: "prioridad", label: "Prioridad de pago", icon: ListOrdered }
          ]}
        />
        {tab === "flujo" && (
          <Segmented
            value={numSemanas}
            onChange={setNumSemanas}
            options={[{ id: 8, label: "8 sem" }, { id: 13, label: "13 sem" }, { id: 26, label: "26 sem" }]}
          />
        )}
      </div>

      {tab === "flujo" ? <TabFlujoRodante flujo={flujo} /> : <TabPrioridadPago sugerencia={sugerencia} />}
    </Section>
  );
}

function TabFlujoRodante({ flujo }) {
  const datos = flujo.semanas.map((s) => ({ ...s, saldo: s.saldoProyectado }));

  return (
    <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <Card style={{ flex: "1 1 200px", padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.mut, textTransform: "uppercase" }}>Disponible hoy</div>
          <div style={{ fontFamily: FONTS.SANS, fontSize: 22, fontWeight: 800, color: C.ink, marginTop: 4 }}>
            {money(flujo.disponibleHoy, "USD")}
          </div>
        </Card>
        <Card style={{ flex: "1 1 200px", padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.mut, textTransform: "uppercase" }}>Ya vencido (neto)</div>
          <div style={{ fontFamily: FONTS.SANS, fontSize: 22, fontWeight: 800, color: (flujo.vencidoIngreso - flujo.vencidoEgreso) >= 0 ? C.verde : C.rojo, marginTop: 4 }}>
            {money(flujo.vencidoIngreso - flujo.vencidoEgreso, "USD")}
          </div>
        </Card>
        <Card style={{ flex: "1 1 200px", padding: 16, borderTop: `4px solid ${flujo.primeraSemanaNegativa ? C.rojo : C.verde}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.mut, textTransform: "uppercase" }}>Estado del período</div>
          <div style={{ fontFamily: FONTS.SANS, fontSize: 16, fontWeight: 800, color: flujo.primeraSemanaNegativa ? C.rojo : C.verde, marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
            {flujo.primeraSemanaNegativa ? <><AlertTriangle size={16} /> Se pone en rojo</> : <><CheckCircle2 size={16} /> Se mantiene positivo</>}
          </div>
        </Card>
      </div>

      <Card style={{ padding: 18 }}>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={datos} margin={{ top: 6, right: 10, left: -6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
              <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: C.mut }} interval={Math.ceil(datos.length / 13) - 1} />
              <YAxis tick={{ fontSize: 10, fill: C.mut }} tickFormatter={(v) => (Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + "k" : v)} width={46} />
              <ReferenceLine y={0} stroke={C.rojo} strokeDasharray="2 4" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${C.line}`, background: C.surface }}
                formatter={(v, name) => {
                  if (name === "saldo") return [money(v, "USD"), "Saldo proyectado"];
                  if (name === "ingreso") return [money(v, "USD"), "Cobros de la semana"];
                  return [money(v, "USD"), "Pagos de la semana"];
                }}
              />
              <Bar dataKey="ingreso" fill={C.verde} radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Bar dataKey="egreso" fill={C.gold} radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Line type="monotone" dataKey="saldo" stroke={C.azul} strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontSize: 11, color: C.mut2, marginTop: 8 }}>
          Barras: cobros (verde) y pagos (dorado) que vencen esa semana. Línea azul: saldo acumulado proyectado
          empezando del disponible de hoy — si cruza la línea roja de 0%, esa semana el efectivo no alcanzaría.
        </div>
      </Card>

      <Card style={{ padding: 0, marginTop: 16, overflow: "hidden" }}>
        <div className="cad-table-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr><Th>Semana</Th><Th right>Cobros</Th><Th right>Pagos</Th><Th right>Neto</Th><Th right>Saldo proyectado</Th></tr>
            </thead>
            <tbody>
              {flujo.semanas.map((s, i) => (
                <tr key={i} style={{ background: s.negativo ? C.rojoSoft : "transparent" }}>
                  <Td bold>{s.nombre}</Td>
                  <Td right style={{ color: C.verde }}>{s.ingreso > 0 ? money(s.ingreso, "USD") : "—"}</Td>
                  <Td right style={{ color: C.gold }}>{s.egreso > 0 ? money(s.egreso, "USD") : "—"}</Td>
                  <Td right style={{ color: s.neto >= 0 ? C.verde : C.rojo }}>{money(s.neto, "USD")}</Td>
                  <Td right bold style={{ color: s.negativo ? C.rojo : C.ink }}>{money(s.saldoProyectado, "USD")}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function TabPrioridadPago({ sugerencia }) {
  const { disponibleUSD, pendientes, cortadoEn } = sugerencia;

  if (pendientes.length === 0) {
    return <Card style={{ padding: 30, textAlign: "center", color: C.mut, fontSize: 13 }}>No hay pagos pendientes por priorizar.</Card>;
  }

  return (
    <>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 16, fontSize: 13 }}>
        <span style={{ color: C.mut }}>Disponible hoy <b style={{ color: C.ink }}>{money(disponibleUSD, "USD")}</b></span>
        <span style={{ color: C.mut }}>Total pendiente <b style={{ color: C.ink }}>{money(sugerencia.totalPendiente, "USD")}</b></span>
        {cortadoEn !== null ? (
          <span style={{ color: C.rojo, fontWeight: 700 }}>No alcanza para {pendientes.length - cortadoEn} pago(s)</span>
        ) : (
          <span style={{ color: C.verde, fontWeight: 700 }}>Alcanza para todo lo pendiente</span>
        )}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div className="cad-table-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Proveedor</Th>
                <Th>Vence</Th>
                <Th>Prioridad</Th>
                <Th right>Monto</Th>
                <Th right>Acumulado</Th>
              </tr>
            </thead>
            <tbody>
              {pendientes.map((p, i) => (
                <React.Fragment key={p.id}>
                  {i === cortadoEn && (
                    <tr>
                      <td colSpan={5} style={{ padding: "8px 14px", background: C.amarSoft, borderTop: `2px dashed ${C.amar}`, borderBottom: `2px dashed ${C.amar}`, fontSize: 11.5, fontWeight: 700, color: C.ink, textAlign: "center" }}>
                        ↑ hasta aquí alcanza el disponible de hoy · lo de abajo esperaría a que entre más efectivo ↓
                      </td>
                    </tr>
                  )}
                  <tr style={{ opacity: p.alcanza ? 1 : 0.55 }}>
                    <Td bold>{p.proveedor}
                      <div style={{ fontSize: 11, color: C.mut, fontWeight: 400 }}>{p.descripcion}</div>
                    </Td>
                    <Td>
                      {fmtD(p.fechaVencimiento)}
                      {p.vencido && <Badge tone="rojo" style={{ marginLeft: 6 }}>Vencido {Math.abs(p.diasDiff)}d</Badge>}
                    </Td>
                    <Td><Badge tone={TONE_PRIORIDAD[p.prioridad]}>{LABEL_PRIORIDAD[p.prioridad]}</Badge></Td>
                    <Td right bold>{money(p.montoUSD, "USD")}</Td>
                    <Td right style={{ color: p.alcanza ? C.ink : C.rojo }}>{money(p.acumulado, "USD")}</Td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div style={{ fontSize: 11, color: C.mut2, marginTop: 8 }}>
        Orden: lo ya vencido primero, luego por prioridad (Urgente → Normal → Flexible), y dentro de cada grupo
        lo que vence más pronto. La prioridad se define al asignar banco en Cuentas por Pagar.
      </div>
    </>
  );
}
