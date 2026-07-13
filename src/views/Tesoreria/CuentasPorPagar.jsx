import React, { useState } from "react";
import { CreditCard, Building2, Banknote, Lock } from "lucide-react";

// Tema y utilidades
import { C } from "../../constants/theme";
import { 
  estadoDe, 
  provNom, 
  bancoNom, 
  fmtD, 
  money, 
  pendienteDe,
  tasaSegunFormaPago,
  TIPOS_MOV 
} from "../../utils/finance";
import { usePaged } from "../../hooks/usePaged";

// Componentes UI
import { Section, Card, Empty, Modal } from "../../components/ui/Layout";
import { Btn, Segmented } from "../../components/ui/Buttons";
import { Th, Td, Pagination } from "../../components/ui/Table";
import { Field, Input, Select } from "../../components/ui/Forms";
import { Badge } from "../../components/ui/Data";

// Componentes Compartidos
import { AdjuntosInput } from "../../components/shared/Adjuntos";

export default function CuentasPorPagar({ st, act, rol }) {
  const [modal, setModal] = useState(null); // 'asig', 'mov', null
  const [f, setF] = useState({}); // Datos mínimos compartidos para levantar los formularios aislados
  const [filtro, setFiltro] = useState("PENDIENTES");

  const puedeTeso = rol === "TESORERIA" || rol === "MASTER";

  // Bloqueo si el compromiso pertenece a una corrida autorizada o ejecutada
  const bloqueado = (c) => { 
    const co = (st.corridas || []).find((x) => x.id === c.corridaId); 
    return co && ["AUTORIZADA", "EJECUTADA"].includes(co.estado); 
  };

  // Filtrado y ordenamiento cronológico
  const lista = (st.compromisos || []).filter((c) => {
    if (c.anulado) return false;
    if (filtro === "PENDIENTES") return pendienteDe(st, c) > 0.005;
    if (filtro === "SIN_BANCO") return pendienteDe(st, c) > 0.005 && !c.bancoAsignadoId;
    if (filtro === "PAGADOS") return estadoDe(st, c) === "PAGADO";
    return true;
  }).sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || ""));

  const pg = usePaged(lista, 10);

  const abrirAsignacion = (c) => {
    setF({ compromisoId: c.id, bancoAsignadoId: c.bancoAsignadoId || "", prioridad: c.prioridad || "NORMAL" });
    setModal("asig");
  };

  const abrirPago = (c) => {
    const formaPago = c.formaPago || c.moneda || "USD"; // compatibilidad con pedidos antiguos
    const pendienteUSD = pendienteDe(st, c); // los pedidos siempre se registran en USD
    const tasaAplicable = tasaSegunFormaPago(st, formaPago); // null si es USD directo
    const esEnBs = tasaAplicable !== null;
    const etiquetaTasa = { BS_BCV: "BCV ($)", BS_PARALELO: "Paralelo", BS_BCV_EUR: "BCV (€)", BS: "BCV ($)" }[formaPago] || "";

    setF({ 
      compromisoId: c.id, 
      tipo: "TRANSFERENCIA", 
      monto: esEnBs ? Number((pendienteUSD * tasaAplicable).toFixed(2)) : pendienteUSD, 
      moneda: esEnBs ? "BS" : "USD", 
      tasaBcvPago: esEnBs ? tasaAplicable : null,
      etiquetaTasa,
      bancoOrigenId: c.bancoAsignadoId || (st.bancos || []).find((b) => b.moneda === (esEnBs ? "BS" : "USD"))?.id || "", 
      referencia: "", 
      adjuntos: [] 
    });
    setModal("mov");
  };

  return (
    <Section 
      title="Cuentas por Pagar — Pagos a Proveedores" 
      desc="Asigna el banco pagador y registra el pago. El número de comprobante es obligatorio para que Compras se lo comparta al proveedor."
    >
      <div style={{ marginBottom: 12 }}>
        <Segmented 
          value={filtro} 
          onChange={setFiltro} 
          options={[
            { id: "PENDIENTES", label: "Pendientes" },
            { id: "SIN_BANCO", label: "Sin banco" },
            { id: "PAGADOS", label: "Pagados" },
            { id: "TODOS", label: "Todos" }
          ]} 
        />
      </div>

      {lista.length === 0 ? (
        <Empty icon={CreditCard} title="Nada por pagar" msg="No hay compromisos en este filtro." />
      ) : (
        <Card>
          <div className="cad-table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>Proveedor / concepto</Th>
                  <Th>Vence</Th>
                  <Th right>Pendiente</Th>
                  <Th>Banco pagador</Th>
                  <Th>Estado</Th>
                  <Th right>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {pg.slice.map((c) => {
                  const e = estadoDe(st, c); 
                  const tone = e === "PAGADO" ? "verde" : e === "PARCIAL" ? "amar" : "gold";
                  const isEnCorrida = bloqueado(c);
                  
                  return (
                    <tr key={c.id}>
                      <Td>
                        <div style={{ fontWeight: 700 }}>{provNom(st, c.proveedorId)}</div>
                        <div style={{ fontSize: 11.5, color: C.mut }}>
                          {c.descripcion || "—"}{c.numeroPedidoOdoo ? " · " + c.numeroPedidoOdoo : ""}
                        </div>
                      </Td>
                      <Td>{fmtD(c.fechaVencimiento)}</Td>
                      <Td right bold>{money(pendienteDe(st, c), c.moneda)}</Td>
                      <Td>
                        {c.bancoAsignadoId ? (
                          <span style={{ fontSize: 12.5 }}>{bancoNom(st, c.bancoAsignadoId)}</span>
                        ) : (
                          <Badge tone="rojo">Sin asignar</Badge>
                        )}
                      </Td>
                      <Td><Badge tone={tone}>{e}</Badge></Td>
                      <Td right>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {puedeTeso && e !== "PAGADO" && !isEnCorrida && (
                            <>
                              <Btn small variant="ghost" title="Asignar banco" onClick={() => abrirAsignacion(c)}>
                                <Building2 size={13} /> Banco
                              </Btn>
                              <Btn small variant="soft" title="Registrar pago" onClick={() => abrirPago(c)}>
                                <Banknote size={13} /> Pagar
                              </Btn>
                            </>
                          )}
                          {isEnCorrida && (
                            <Badge tone="mut"><Lock size={11} /> En corrida</Badge>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pg={pg} />
        </Card>
      )}

      {/* Modales Operativos Separados */}
      {modal === "asig" && (
        <AsignarBancoModal 
          st={st} 
          initialData={f} 
          onClose={() => setModal(null)} 
          onSave={(data) => {
            act.asignar(data.compromisoId, data.bancoAsignadoId, data.prioridad);
            setModal(null);
          }} 
        />
      )}

      {modal === "mov" && (
        <PagarProveedorModal 
          st={st} 
          initialData={f} 
          onClose={() => setModal(null)} 
          onSave={(data) => {
            act.addMovimiento(data);
            setModal(null);
          }} 
        />
      )}
    </Section>
  );
}

/* ============================================================
   SUB-COMPONENTE AISLADO: ASIGNAR BANCO
   ============================================================ */
function AsignarBancoModal({ st, initialData, onClose, onSave }) {
  const [f, setF] = useState({ ...initialData });

  return (
    <Modal title="Asignar banco pagador" onClose={onClose}>
      <Field label="Banco con el que se pagará este compromiso">
        <Select value={f.bancoAsignadoId} onChange={(e) => setF({ ...f, bancoAsignadoId: e.target.value })}>
          <option value="">Sin asignar</option>
          {(st.bancos || []).map((b) => (
            <option key={b.id} value={b.id}>{b.nombre} ({b.moneda})</option>
          ))}
        </Select>
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={() => onSave(f)}>Guardar</Btn>
      </div>
    </Modal>
  );
}

/* ============================================================
   SUB-COMPONENTE AISLADO: FORMULARIO DE PAGO
   ============================================================ */
function PagarProveedorModal({ st, initialData, onClose, onSave }) {
  const [f, setF] = useState({ ...initialData });

  const guardar = () => {
    if (!(Number(f.monto) > 0)) return;
    if (f.tipo !== "CRUCE" && !f.referencia.trim()) return;
    onSave(f);
  };

  return (
    <Modal title="Registrar pago a proveedor" onClose={onClose}>
      {f.tasaBcvPago && (
        <div style={{ background: C.greenSoft, color: C.greenDk, padding: "9px 12px", borderRadius: 10, fontSize: 12, marginBottom: 14 }}>
          Este pedido se paga en Bs — el monto se calculó con la tasa {f.etiquetaTasa || "vigente"} de hoy (<b>{money(f.tasaBcvPago, "BS").replace("Bs", "Bs.")}</b> por USD).
          Si la tasa cambió desde que abriste esta pantalla, ajusta el monto manualmente.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tipo de egreso">
          <Select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
            {TIPOS_MOV.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label={`Monto a transferir (${f.moneda === "BS" ? "Bs" : "USD"})`}>
          <Input type="number" value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} />
        </Field>
      </div>
      
      {f.tipo !== "CRUCE" && (
        <Field label="Salió del banco">
          <Select value={f.bancoOrigenId} onChange={(e) => setF({ ...f, bancoOrigenId: e.target.value })}>
            <option value="">—</option>
            {(st.bancos || []).map((b) => (
              <option key={b.id} value={b.id}>{b.nombre} ({b.moneda})</option>
            ))}
          </Select>
        </Field>
      )}
      
      <Field 
        label={f.tipo === "CRUCE" ? "Referencia (opcional)" : "N° de comprobante / referencia (obligatorio)"} 
        hint="Este dato lo verá Compras para compartirlo con el proveedor."
      >
        <Input 
          value={f.referencia} 
          onChange={(e) => setF({ ...f, referencia: e.target.value })} 
          placeholder="Ej. Transf. 0012345 · Banesco" 
        />
      </Field>
      
      <AdjuntosInput 
        value={f.adjuntos} 
        onChange={(a) => setF({ ...f, adjuntos: a })} 
        label="Comprobante de pago (PDF o imagen)" 
      />
      
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn 
          onClick={guardar} 
          disabled={!(Number(f.monto) > 0) || (f.tipo !== "CRUCE" && !f.referencia.trim())}
        >
          Procesar pago
        </Btn>
      </div>
    </Modal>
  );
}