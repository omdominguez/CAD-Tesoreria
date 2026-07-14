import React, { useState } from "react";
import { Plus, Trash2, Receipt, Users, ChevronDown, ChevronUp } from "lucide-react";

// Tema y utilidades
import { C } from "../../constants/theme";
import { 
  esCli, 
  estadoCxC, 
  provNom, 
  fmtD, 
  money, 
  cobradoDeCxC, 
  pendienteCxC,
  pendienteCli,
  FORMAS_PAGO
} from "../../utils/finance";
import { usePaged } from "../../hooks/usePaged";

// Componentes UI
import { Section, Card, Empty, Modal } from "../../components/ui/Layout";
import { Btn, Segmented } from "../../components/ui/Buttons";
import { Th, Td, Pagination } from "../../components/ui/Table";
import { Field, Input, Select } from "../../components/ui/Forms";
import { ComboBox } from "../../components/ui/ComboBox";
import { Badge } from "../../components/ui/Data";
import { AdjuntarPdfOdoo } from "../../components/shared/AdjuntarPdfOdoo";

export default function CuentasPorCobrar({ st, act, rol }) {
  // modalOpen: controla el despliegue del modal aislado
  const [modalOpen, setModalOpen] = useState(false);
  const [filtro, setFiltro] = useState("TODOS");
  const [verResumenCliente, setVerResumenCliente] = useState(true);

  const puedeCrear = rol === "MASTER" || rol === "TESORERIA";
  const clientes = (st.proveedores || []).filter(esCli);

  // Lógica de filtrado y ordenamiento cronológico por fecha de vencimiento
  const pasa = (c) => { 
    const e = estadoCxC(st, c); 
    return filtro === "TODOS" ? e !== "ANULADO" : e === filtro; 
  };
  
  const lista = (st.cuentasCobrar || [])
    .filter((c) => !c.anulado && pasa(c))
    .sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || ""));
    
  const pg = usePaged(lista, 10);

  // Resumen global: cuánto nos deben en total, y desglosado por cliente
  const activas = (st.cuentasCobrar || []).filter((c) => !c.anulado && estadoCxC(st, c) !== "COBRADO");
  const totalPorCobrar = activas.reduce((a, c) => a + pendienteCxC(st, c), 0);
  const hoy = new Date().toISOString().slice(0, 10);
  const vencidas = activas.filter((c) => (c.fechaVencimiento || "") < hoy);

  const resumenPorCliente = clientes
    .map((cli) => ({ cliente: cli, pendiente: pendienteCli(st, cli.id), cantidad: activas.filter((c) => c.clienteId === cli.id).length }))
    .filter((r) => r.pendiente > 0.005)
    .sort((a, b) => b.pendiente - a.pendiente);

  return (
    <Section 
      title="Cuentas por Cobrar (Ventas)" 
      desc="Registra facturas emitidas a clientes. Se cobran en la pestaña de Cobranzas." 
      action={
        puedeCrear && (
          <Btn onClick={() => setModalOpen(true)}>
            <Plus size={15} /> Nueva factura
          </Btn>
        )
      }
    >
      {/* KPIs globales */}
      <Card style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 180px", padding: "14px 18px", borderRight: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.mut, textTransform: "uppercase" }}>Total por cobrar</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.verde, marginTop: 4 }}>{money(totalPorCobrar, "USD")}</div>
          </div>
          <div style={{ flex: "1 1 180px", padding: "14px 18px", borderRight: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.mut, textTransform: "uppercase" }}>Facturas activas</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, marginTop: 4 }}>{activas.length}</div>
          </div>
          <div style={{ flex: "1 1 180px", padding: "14px 18px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.mut, textTransform: "uppercase" }}>Vencidas</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: vencidas.length > 0 ? C.rojo : C.ink, marginTop: 4 }}>{vencidas.length}</div>
          </div>
        </div>
      </Card>

      {/* Resumen por cliente — desglose de "nos debe" sin salir de Tesorería */}
      {resumenPorCliente.length > 0 && (
        <Card style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
          <button
            onClick={() => setVerResumenCliente((v) => !v)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", padding: "12px 16px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: C.ink }}>
              <Users size={14} /> Resumen por cliente ({resumenPorCliente.length})
            </div>
            {verResumenCliente ? <ChevronUp size={16} color={C.mut} /> : <ChevronDown size={16} color={C.mut} />}
          </button>
          {verResumenCliente && (
            <div style={{ borderTop: `1px solid ${C.line}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <Th>Cliente</Th>
                    <Th right>Facturas pendientes</Th>
                    <Th right>Total nos debe</Th>
                  </tr>
                </thead>
                <tbody>
                  {resumenPorCliente.map((r) => (
                    <tr key={r.cliente.id}>
                      <Td bold>{r.cliente.razonSocial}</Td>
                      <Td right>{r.cantidad}</Td>
                      <Td right bold style={{ color: C.verde }}>{money(r.pendiente, "USD")}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <div style={{ marginBottom: 12 }}>
        <Segmented 
          value={filtro} 
          onChange={setFiltro} 
          options={["TODOS", "PENDIENTE", "PARCIAL", "COBRADO"].map((x) => ({ 
            id: x, 
            label: x[0] + x.slice(1).toLowerCase() 
          }))} 
        />
      </div>

      {lista.length === 0 ? (
        <Empty 
          icon={Receipt} 
          title="Sin facturas" 
          msg="Registra facturas para controlar la deuda de clientes." 
          action={
            puedeCrear && (
              <Btn onClick={() => setModalOpen(true)}>
                <Plus size={15} /> Nueva factura
              </Btn>
            )
          } 
        />
      ) : (
        <Card>
          <div className="cad-table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>Cliente / concepto</Th>
                  <Th>Factura</Th>
                  <Th>Vence</Th>
                  <Th right>Total</Th>
                  <Th right>Cobrado</Th>
                  <Th right>Pendiente</Th>
                  <Th>Estado</Th>
                  <Th right>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {pg.slice.map((c) => {
                  const isProtected = cobradoDeCxC(st, c.id) > 0;
                  const estado = estadoCxC(st, c);
                  const toneBadge = estado === "COBRADO" ? "verde" : estado === "PARCIAL" ? "amar" : "gold";
                  
                  return (
                    <tr key={c.id}>
                      <Td>
                        <div style={{ fontWeight: 700 }}>{provNom(st, c.clienteId)}</div>
                        <div style={{ fontSize: 11.5, color: C.mut }}>{c.descripcion || "—"}</div>
                      </Td>
                      <Td>{c.numeroFactura || <span style={{ color: C.mut }}>—</span>}</Td>
                      <Td>{fmtD(c.fechaVencimiento)}</Td>
                      <Td right>{money(c.montoOriginal, c.moneda)}</Td>
                      <Td right>
                        {cobradoDeCxC(st, c.id) > 0 ? (
                          <span style={{ color: C.verde }}>{money(cobradoDeCxC(st, c.id), c.moneda)}</span>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td right bold>{money(pendienteCxC(st, c), c.moneda)}</Td>
                      <Td><Badge tone={toneBadge}>{estado}</Badge></Td>
                      <Td right>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {puedeCrear && (
                            <Btn 
                              small 
                              variant="danger" 
                              disabled={isProtected} 
                              onClick={() => act.delCxC(c.id)}
                            >
                              <Trash2 size={13} />
                            </Btn>
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

      {/* Renderizado Condicional del Formulario Aislado */}
      {modalOpen && (
        <FacturaModal 
          clientes={clientes}
          act={act}
          onClose={() => setModalOpen(false)}
          onSave={(data) => {
            act.addCxC(data);
            setModalOpen(false);
          }}
        />
      )}
    </Section>
  );
}


/* ============================================================
   COMPONENTE AISLADO: FORMULARIO DE FACTURA (CxC)
   Esto aísla por completo la entrada de texto evitando lag en la UI
   ============================================================ */
function FacturaModal({ clientes, act, onClose, onSave }) {
  const [clientesLocal, setClientesLocal] = useState(clientes);
  const [sugerenciaNueva, setSugerenciaNueva] = useState(null);

  const [f, setF] = useState({ 
    clienteId: clientes[0]?.id || "", 
    numeroFactura: "", 
    descripcion: "", 
    montoOriginal: "", 
    moneda: "USD", 
    formaPago: "USD",
    fechaEmision: new Date().toISOString().slice(0, 10), 
    fechaVencimiento: new Date().toISOString().slice(0, 10) 
  });

  const onDatosDetectados = (datos, contacto) => {
    setF((prev) => ({
      ...prev,
      numeroFactura: datos.numeroDocumento || prev.numeroFactura,
      montoOriginal: datos.monto != null ? String(datos.monto) : prev.montoOriginal,
      formaPago: datos.moneda === "BS" ? "BS_BCV" : (datos.moneda || prev.formaPago),
      descripcion: datos.descripcionSugerida || prev.descripcion,
      fechaEmision: datos.fecha || prev.fechaEmision,
      clienteId: contacto ? contacto.id : prev.clienteId
    }));

    if (!contacto && datos.rif) {
      setSugerenciaNueva({ nombre: datos.nombreContraparte || "", rif: datos.rif || "" });
    } else {
      setSugerenciaNueva(null);
    }
  };

  const crearClienteSugerido = () => {
    if (!sugerenciaNueva?.nombre || !act) return;
    const id = crypto.randomUUID();
    act.addProv({ id, rif: sugerenciaNueva.rif, razonSocial: sugerenciaNueva.nombre, esProveedor: false, esCliente: true, bancos: [] });
    setClientesLocal((prev) => [...prev, { id, rif: sugerenciaNueva.rif, razonSocial: sugerenciaNueva.nombre, esCliente: true }]);
    setF((prev) => ({ ...prev, clienteId: id }));
    setSugerenciaNueva(null);
  };

  const guardar = () => {
    if (!f.clienteId || !f.montoOriginal) return;
    onSave({ ...f, montoOriginal: Number(f.montoOriginal), moneda: "USD" });
  };

  return (
    <Modal title="Registrar Factura (CxC)" wide onClose={onClose}>
      <AdjuntarPdfOdoo
        contactos={clientesLocal}
        onDatos={onDatosDetectados}
        label="Adjuntar PDF de la factura de Odoo (autocompletar)"
      />

      {sugerenciaNueva && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", background: C.amarSoft, padding: "10px 12px", borderRadius: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, color: C.ink }}>
            Cliente no encontrado: <b>{sugerenciaNueva.nombre || "sin nombre detectado"}</b>
            {sugerenciaNueva.rif && <> (RIF {sugerenciaNueva.rif})</>}
          </div>
          <Btn small variant="soft" onClick={crearClienteSugerido} disabled={!sugerenciaNueva.nombre}>
            <Plus size={13} /> Crear y seleccionar
          </Btn>
        </div>
      )}

      <Field label="Cliente">
        <ComboBox
          value={f.clienteId}
          onChange={(v) => setF({ ...f, clienteId: v })}
          placeholder={clientesLocal.length === 0 ? "Sin clientes registrados" : "Buscar cliente..."}
          disabled={clientesLocal.length === 0}
          options={[...clientesLocal]
            .sort((a, b) => (a.razonSocial || "").localeCompare(b.razonSocial || "", "es"))
            .map((p) => ({ value: p.id, label: p.razonSocial }))}
        />
      </Field>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="N° de Factura">
          <Input 
            value={f.numeroFactura} 
            onChange={(e) => setF({ ...f, numeroFactura: e.target.value })} 
          />
        </Field>
        <Field label="Fecha emisión">
          <Input 
            type="date" 
            value={f.fechaEmision} 
            onChange={(e) => setF({ ...f, fechaEmision: e.target.value })} 
          />
        </Field>
        <Field label="Fecha vencimiento">
          <Input 
            type="date" 
            value={f.fechaVencimiento} 
            onChange={(e) => setF({ ...f, fechaVencimiento: e.target.value })} 
          />
        </Field>
      </div>
      
      <Field label="Descripción / Concepto">
        <Input 
          value={f.descripcion} 
          onChange={(e) => setF({ ...f, descripcion: e.target.value })} 
        />
      </Field>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Monto total (siempre en USD)">
          <Input 
            type="number" 
            value={f.montoOriginal} 
            onChange={(e) => setF({ ...f, montoOriginal: e.target.value })} 
          />
        </Field>
        <Field label="Forma de pago esperada">
          <Select value={f.formaPago} onChange={(e) => setF({ ...f, formaPago: e.target.value })}>
            {FORMAS_PAGO.map((fp) => <option key={fp.id} value={fp.id}>{fp.label}</option>)}
          </Select>
        </Field>
      </div>
      
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={guardar} disabled={!f.clienteId || !f.montoOriginal}>Registrar factura</Btn>
      </div>
    </Modal>
  );
}
