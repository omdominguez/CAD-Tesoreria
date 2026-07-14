import React, { useState } from "react";
import { Layers, ShieldCheck, X, Download, Clock } from "lucide-react";

// Tema y Utilidades
import { C, FONTS } from "../../constants/theme";
import { activo, provNom, bancoNom, fmtD, money, pendienteDe, tasaSegunFormaPago } from "../../utils/finance";
import { exportarCorridaPDF } from "../../utils/exportar";

// Componentes UI
import { Section, Card, Empty, Modal } from "../../components/ui/Layout";
import { Btn } from "../../components/ui/Buttons";
import { Th, Td } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Data";

// Constantes locales para los estados de la corrida
const estadoTone = {
  PENDIENTE_AUTORIZACION: "amar",
  AUTORIZADA: "green",
  EJECUTADA: "verde",
  RECHAZADA: "rojo"
};

const estadoLbl = {
  PENDIENTE_AUTORIZACION: "Por aprobar",
  AUTORIZADA: "Aprobada",
  EJECUTADA: "Pagada",
  RECHAZADA: "Rechazada"
};

export default function Corridas({ st, act, rol, usuario }) {
  const [sel, setSel] = useState([]); // IDs de compromisos seleccionados
  const [ver, setVer] = useState(null); // ID de la corrida seleccionada para ver detalle

  const puedeAprob = rol === "MASTER";
  const puedeCrear = rol === "COMPRAS" || rol === "TESORERIA" || rol === "MASTER";

  // Filtrar solo los compromisos cuya forma de pago es en Bs (cualquiera de
  // las 3 tasas), o, para pedidos viejos sin ese campo, los que ya estaban
  // registrados directo en Bs
  const candidatos = (st.compromisos || []).filter((c) => {
    if (!activo(st, c) || c.corridaId) return false;
    return tasaSegunFormaPago(st, c.formaPago || c.moneda) !== null;
  });

  // El pedido vive en USD; para la corrida (que se paga en Bs) convertimos
  // con la tasa que corresponda según la forma de pago de CADA compromiso
  // (BCV, Paralelo o Euro pueden mezclarse dentro de una misma corrida).
  const montoBsDe = (c) => {
    const tasa = tasaSegunFormaPago(st, c.formaPago || c.moneda);
    return tasa !== null ? pendienteDe(st, c) * tasa : pendienteDe(st, c);
  };

  const totalSel = sel.reduce((a, id) => {
    const c = candidatos.find((x) => x.id === id);
    return c ? a + montoBsDe(c) : a;
  }, 0);

  const toggle = (id) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const crear = () => {
    if (sel.length) {
      act.crearCorrida(sel, rol, usuario);
      setSel([]);
    }
  };

  const corridaSeleccionada = ver ? (st.corridas || []).find((c) => c.id === ver) : null;

  // Utilidad para obtener los compromisos de una corrida en la lista principal
  const compsDe = (co) => (st.compromisos || []).filter((c) => co.compromisoIds.includes(c.id));

  const corridas = [...(st.corridas || [])].reverse();
  const pendientesCount = corridas.filter((co) => co.estado === "PENDIENTE_AUTORIZACION").length;

  return (
    <Section
      title="Corridas de pago"
      desc="Agrupa varios pagos en Bs, mándalos a aprobar, y quedan pagados apenas Gerencia los aprueba."
    >
      {/* CREADOR DE NUEVA CORRIDA */}
      {puedeCrear && (
        <Card style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, color: C.greenDk, fontSize: 14.5 }}>
                Armar nueva corrida (compromisos en Bs)
              </div>
              {sel.length > 0 && (
                <div style={{ fontSize: 12.5, color: C.mut, marginTop: 2 }}>
                  {sel.length} seleccionado(s) · total <b style={{ color: C.ink }}>{money(totalSel, "BS")}</b>
                </div>
              )}
            </div>
            <Btn onClick={crear} disabled={!sel.length}>
              <Layers size={15} /> Crear corrida ({sel.length})
            </Btn>
          </div>

          {candidatos.length === 0 ? (
            <div style={{ fontSize: 13, color: C.mut, padding: "8px 0" }}>
              No hay compromisos en Bs disponibles.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {candidatos.map((c) => (
                <label
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    border: `1px solid ${sel.includes(c.id) ? C.green : C.line}`,
                    borderRadius: 10,
                    cursor: "pointer",
                    background: sel.includes(c.id) ? C.greenSoft : C.surface
                  }}
                >
                  <input type="checkbox" checked={sel.includes(c.id)} onChange={() => toggle(c.id)} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{provNom(st, c.proveedorId)}</div>
                    <div style={{ fontSize: 11, color: C.mut }}>{c.descripcion || "—"} · vence {fmtD(c.fechaVencimiento)}</div>
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 13.5, fontVariantNumeric: "tabular-nums", color: C.ink }}>
                    {money(montoBsDe(c), "BS")}
                  </span>
                </label>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* HISTORIAL DE CORRIDAS */}
      {corridas.length === 0 ? (
        <Empty icon={Layers} title="Sin corridas" msg="Crea tu primera corrida de pago." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {corridas.map((co) => {
            const total = compsDe(co).reduce((a, c) => a + montoBsDe(c), 0);
            const esPendiente = co.estado === "PENDIENTE_AUTORIZACION";
            return (
              <Card key={co.id} style={{ padding: 16, borderLeft: esPendiente ? `3px solid ${C.amar}` : `1px solid ${C.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: FONTS.SERIF, fontWeight: 700, fontSize: 16, color: C.ink }}>
                        {co.codigo}
                      </span>
                      <Badge tone={estadoTone[co.estado]}>{estadoLbl[co.estado]}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: C.mut, marginTop: 3 }}>
                      {co.compromisoIds.length} pago(s) · creada {fmtD(co.fechaCreacion)}
                      {co.creadoPor && <> · por <b>{co.creadoPor}</b></>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: FONTS.SERIF, fontSize: 19, fontWeight: 700, color: C.ink }}>
                      {money(total, "BS")}
                    </span>
                    <Btn small variant="ghost" onClick={() => setVer(co.id)}>Ver detalle</Btn>
                  </div>
                </div>

                {/* Aprobación rápida sin abrir el detalle, solo para Master en corridas pendientes */}
                {esPendiente && puedeAprob && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${C.line}` }}>
                    <Btn small variant="danger" onClick={() => act.rechazarCorrida(co.id, usuario)}>
                      <X size={13} /> Rechazar
                    </Btn>
                    <Btn small variant="gold" onClick={() => act.aprobarYPagarCorrida(co.id, usuario)}>
                      <ShieldCheck size={13} /> Aprobar y pagar
                    </Btn>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL AISLADO PARA VER EL DETALLE DE LA CORRIDA */}
      {corridaSeleccionada && (
        <CorridaModal
          st={st}
          corrida={corridaSeleccionada}
          act={act}
          rol={rol}
          usuario={usuario}
          puedeAprob={puedeAprob}
          onClose={() => setVer(null)}
        />
      )}
    </Section>
  );
}

/* ============================================================
   SUB-COMPONENTE AISLADO: DETALLE DE CORRIDA (estilo documento formal)
   ============================================================ */
function CorridaModal({ st, corrida, act, rol, usuario, puedeAprob, onClose }) {
  const compromisos = (st.compromisos || []).filter((c) => corrida.compromisoIds.includes(c.id));
  const montoBsDe = (c) => {
    const tasa = tasaSegunFormaPago(st, c.formaPago || c.moneda);
    return tasa !== null ? pendienteDe(st, c) * tasa : pendienteDe(st, c);
  };
  const total = compromisos.reduce((a, c) => a + montoBsDe(c), 0);

  const descargarPDF = () => {
    exportarCorridaPDF(
      corrida,
      compromisos.map((c) => ({
        proveedor: provNom(st, c.proveedorId),
        concepto: c.descripcion || "—",
        banco: c.bancoAsignadoId ? bancoNom(st, c.bancoAsignadoId) : "— sin asignar —",
        montoFmt: money(montoBsDe(c), "BS")
      })),
      {
        estadoLbl: estadoLbl[corrida.estado],
        totalFmt: money(total, "BS"),
        creadoPor: corrida.creadoPor,
        autorizadoPor: corrida.autorizadoPor,
        ejecutadoPor: corrida.ejecutadoPorAdmin
      }
    );
  };

  return (
    <Modal title={`Corrida ${corrida.codigo}`} wide onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <Badge tone={estadoTone[corrida.estado]}>{estadoLbl[corrida.estado]}</Badge>
        <div style={{ fontFamily: FONTS.SERIF, fontSize: 21, fontWeight: 700 }}>
          {money(total, "BS")}
        </div>
      </div>

      {/* Rastro de aprobación — simple: quién la armó y quién la aprobó/pagó */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 16, padding: "12px 14px", background: C.body, borderRadius: 10 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 }}>Armada por</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{corrida.creadoPor || "—"}</div>
          <div style={{ fontSize: 11, color: C.mut }}>{fmtD(corrida.fechaCreacion)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 }}>
            {corrida.estado === "RECHAZADA" ? "Rechazada por" : corrida.estado === "PENDIENTE_AUTORIZACION" ? "Aprobación" : "Aprobada y pagada por"}
          </div>
          {corrida.estado === "PENDIENTE_AUTORIZACION" ? (
            <div style={{ fontSize: 12.5, color: C.mut, fontStyle: "italic", display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={12} /> Esperando a Gerencia
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
                {corrida.estado === "RECHAZADA" ? corrida.rechazadoPor : corrida.autorizadoPor}
              </div>
              <div style={{ fontSize: 11, color: C.mut }}>
                {fmtD(corrida.estado === "RECHAZADA" ? corrida.fechaRechazo : corrida.fechaAutorizacion)}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ overflowX: "auto", border: `1px solid ${C.line}`, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Proveedor</Th>
              <Th>Concepto</Th>
              <Th>Banco</Th>
              <Th right>Monto</Th>
            </tr>
          </thead>
          <tbody>
            {compromisos.map((c) => (
              <tr key={c.id}>
                <Td bold>{provNom(st, c.proveedorId)}</Td>
                <Td>{c.descripcion}</Td>
                <Td>{c.bancoAsignadoId ? bancoNom(st, c.bancoAsignadoId) : <span style={{ color: C.mut }}>— sin asignar —</span>}</Td>
                <Td right>{money(montoBsDe(c), "BS")}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Botones de Acción (según el estado de la corrida y el rol) */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <Btn variant="ghost" onClick={descargarPDF}>
          <Download size={15} /> Descargar PDF
        </Btn>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {corrida.estado === "PENDIENTE_AUTORIZACION" && puedeAprob && (
            <>
              <Btn variant="danger" onClick={() => { act.rechazarCorrida(corrida.id, usuario); onClose(); }}>
                Rechazar
              </Btn>
              <Btn variant="gold" onClick={() => { act.aprobarYPagarCorrida(corrida.id, usuario); onClose(); }}>
                <ShieldCheck size={15} /> Aprobar y pagar
              </Btn>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
