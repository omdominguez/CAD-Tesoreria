import React, { useMemo, useState } from "react";
import { Truck, ChevronRight, Plus, Trash2, CheckCircle2, PackageCheck, PackageOpen } from "lucide-react";

import { C, FONTS } from "../../constants/theme";
import { money, fmtD, provNom, claveEntregaDe, estadoEntregaDe } from "../../utils/finance";

import { Card, Empty } from "../../components/ui/Layout";
import { Segmented, Btn } from "../../components/ui/Buttons";
import { Badge } from "../../components/ui/Data";
import { Modal } from "../../components/ui/Layout";
import { AdjuntosInput } from "../../components/shared/Adjuntos";

const TONE_ESTADO = { PENDIENTE: "mut", PARCIAL: "amar", COMPLETO: "verde" };
const LABEL_ESTADO = { PENDIENTE: "Sin entregas", PARCIAL: "Entrega parcial", COMPLETO: "Entregado" };

/**
 * Agrupa los compromisos de compra por pedido real (sus cuotas + su IVA
 * aparte, si lo tiene) para el seguimiento de entrega: no importa cuántas
 * cuotas tenga el financiamiento, la mercancía llega como UN pedido.
 */
function agruparPedidosParaEntrega(compromisos) {
  const grupos = {};
  const orden = [];
  compromisos.forEach((c) => {
    if (c.anulado) return;
    const clave = claveEntregaDe(c);
    if (!grupos[clave]) {
      grupos[clave] = {
        clave,
        proveedorId: c.proveedorId,
        numeroPedidoOdoo: c.numeroPedidoOdoo,
        descripcion: (c.descripcion || "").replace(/\s*\((Cuota|IVA)[^)]*\)\s*$/i, "").trim() || c.descripcion,
        fechaPedido: c.fechaPedido,
        montoUSD: 0
      };
      orden.push(clave);
    }
    // Suma en USD equivalente para mostrar el monto total del pedido, sin
    // importar si algunas partes (el IVA) están en bolívares.
    const montoUSD = c.moneda === "USD" ? Number(c.montoOriginal) : Number(c.montoOriginal) / Number(c.tasaBcvRegistro || 1);
    grupos[clave].montoUSD += montoUSD;
    if ((c.fechaPedido || "") < (grupos[clave].fechaPedido || "")) grupos[clave].fechaPedido = c.fechaPedido;
  });
  return orden.map((k) => grupos[k]).sort((a, b) => (b.fechaPedido || "").localeCompare(a.fechaPedido || ""));
}

export default function SeguimientoEntregas({ st, act }) {
  const [filtro, setFiltro] = useState("PENDIENTES");
  const [expandido, setExpandido] = useState(null);
  const [modalEntrega, setModalEntrega] = useState(null); // { clave, ...datosDelPedido }

  const pedidos = useMemo(() => agruparPedidosParaEntrega(st.compromisos || []), [st.compromisos]);

  const pedidosFiltrados = pedidos.filter((p) => {
    const estado = estadoEntregaDe(st, p.clave);
    if (filtro === "PENDIENTES") return estado !== "COMPLETO";
    if (filtro === "COMPLETOS") return estado === "COMPLETO";
    return true;
  });

  if (pedidos.length === 0) {
    return <Empty icon={Truck} title="Sin pedidos todavía" msg="Cuando registres una compra, aparecerá aquí para seguirle la entrega." />;
  }

  return (
    <div>
      <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 14, lineHeight: 1.5 }}>
        Seguimiento de la ENTREGA física de cada pedido — materia prima, empaque u otros insumos que no
        llegan de una sola vez. Es independiente del estado de pago: un pedido puede estar pagado y sin
        entregar, o entregado y aún con saldo pendiente.
      </div>

      <div style={{ marginBottom: 14 }}>
        <Segmented
          value={filtro}
          onChange={setFiltro}
          options={[
            { id: "PENDIENTES", label: "Por entregar" },
            { id: "COMPLETOS", label: "Entregados" },
            { id: "TODOS", label: "Todos" }
          ]}
        />
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {pedidosFiltrados.length === 0 ? (
          <Card style={{ padding: 24, textAlign: "center", color: C.mut, fontSize: 13 }}>
            Nada en este filtro.
          </Card>
        ) : (
          pedidosFiltrados.map((p) => {
            const estado = estadoEntregaDe(st, p.clave);
            const reg = (st.entregas || {})[p.clave];
            const eventos = reg?.eventos || [];
            const abierto = expandido === p.clave;

            return (
              <Card key={p.clave} style={{ padding: 0, overflow: "hidden" }}>
                <div
                  onClick={() => setExpandido(abierto ? null : p.clave)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}
                >
                  <ChevronRight size={16} color={C.mut} style={{ transform: abierto ? "rotate(90deg)" : "none", transition: "transform .12s", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: FONTS.SANS, fontSize: 14, fontWeight: 700, color: C.ink }}>{provNom(st, p.proveedorId)}</span>
                      {p.numeroPedidoOdoo && <Badge tone="gold">{p.numeroPedidoOdoo}</Badge>}
                      <Badge tone={TONE_ESTADO[estado]}>{LABEL_ESTADO[estado]}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: C.mut, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.descripcion} · {fmtD(p.fechaPedido)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: FONTS.SANS, fontSize: 14, fontWeight: 700, color: C.ink }}>{money(p.montoUSD, "USD")}</div>
                    <div style={{ fontSize: 10.5, color: C.mut }}>{eventos.length} entrega(s) registrada(s)</div>
                  </div>
                </div>

                {abierto && (
                  <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.line}` }}>
                    {eventos.length === 0 ? (
                      <div style={{ fontSize: 12.5, color: C.mut, padding: "12px 0 4px" }}>
                        Aún no se ha registrado ninguna entrega de este pedido.
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
                        {eventos.map((e) => (
                          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 11px", borderRadius: 10, background: C.body }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{fmtD(e.fecha)}</div>
                              <div style={{ fontSize: 12, color: C.mut }}>{e.descripcion}</div>
                              {e.registradoPor && <div style={{ fontSize: 10.5, color: C.mut2, marginTop: 1 }}>registró: {e.registradoPor}</div>}
                            </div>
                            <Btn small variant="danger" onClick={() => act.eliminarEntrega(p.clave, e.id)}>
                              <Trash2 size={12} />
                            </Btn>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      <Btn small onClick={() => setModalEntrega(p)}>
                        <Plus size={13} /> Registrar entrega
                      </Btn>
                      {estado === "COMPLETO" ? (
                        <Btn small variant="ghost" onClick={() => act.marcarEntregaCompleta(p.clave, false)}>
                          <PackageOpen size={13} /> Reabrir (no está completo)
                        </Btn>
                      ) : (
                        <Btn small variant="soft" onClick={() => act.marcarEntregaCompleta(p.clave, true)}>
                          <PackageCheck size={13} /> Marcar como entregado por completo
                        </Btn>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {modalEntrega && (
        <RegistrarEntregaModal
          pedido={modalEntrega}
          onClose={() => setModalEntrega(null)}
          onSave={(evento) => { act.registrarEntrega(modalEntrega.clave, evento); setModalEntrega(null); }}
        />
      )}
    </div>
  );
}

function RegistrarEntregaModal({ pedido, onClose, onSave }) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [descripcion, setDescripcion] = useState("");
  const [adjuntos, setAdjuntos] = useState([]);

  const guardar = () => {
    if (!descripcion.trim()) return;
    onSave({ fecha, descripcion: descripcion.trim(), adjuntos });
  };

  return (
    <Modal title={`Registrar entrega — ${pedido.numeroPedidoOdoo || pedido.descripcion}`} onClose={onClose}>
      <div style={{ fontSize: 12, color: C.mut, marginBottom: 14, lineHeight: 1.5 }}>
        Describe qué llegó en este lote — como el pedido no está desglosado por producto en el sistema,
        anótalo en texto libre (ej. "Llegaron los tubos estructurales, faltan los ángulos y las barras").
      </div>

      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Fecha de entrega</label>
      <input
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13.5, marginBottom: 14 }}
      />

      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Qué llegó</label>
      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        rows={3}
        placeholder="Ej. Llegaron 56.000 unidades de Tubo Estruct 180x65. Faltan los ángulos y las barras."
        style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13.5, marginBottom: 14, resize: "vertical", fontFamily: "inherit" }}
      />

      <AdjuntosInput value={adjuntos} onChange={setAdjuntos} label="Guía de entrega / foto (opcional)" />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={guardar} disabled={!descripcion.trim()}>
          <CheckCircle2 size={14} /> Registrar
        </Btn>
      </div>
    </Modal>
  );
}
