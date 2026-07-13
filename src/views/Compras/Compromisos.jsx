import React, { useState, Fragment } from "react";
import { FileText, CalendarClock, CalendarDays, Plus, Paperclip, Trash2 } from "lucide-react";

// Tema y Finanzas
import { C } from "../../constants/theme";
import { 
  esProv, 
  estadoDe, 
  provNom, 
  fmtD, 
  money, 
  pagadoDe, 
  pendienteDe, 
  movsDe 
} from "../../utils/finance";
import { usePaged } from "../../hooks/usePaged";

// Componentes UI
import { Section, Card, Empty, Modal } from "../../components/ui/Layout";
import { Segmented, Btn } from "../../components/ui/Buttons";
import { Th, Td, Pagination } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Data";

// Componentes Compartidos y Subvistas
import { AdjuntoChip, AdjuntosInput } from "../../components/shared/Adjuntos";
import AgendaPagos from "./AgendaPagos";
import CalendarioPagos from "./CalendarioPagos";
import KpiCompras from "./KpiCompras";
import FormCompromiso from "./FormCompromiso";

export default function Compromisos({ st, act, rol }) {
  const [modal, setModal] = useState(null); // 'new', 'adj', null
  const [f, setF] = useState({}); // Solo lo usaremos para el modal pequeño de adjuntos
  const [filtro, setFiltro] = useState("TODOS");
  const [vista, setVista] = useState("lista");
  
  const puedeCrear = rol === "COMPRAS" || rol === "MASTER";
  const proveedores = (st.proveedores || []).filter(esProv);

  // Filtros y Paginación
  const pasa = (c) => { 
    const e = estadoDe(st, c); 
    return filtro === "TODOS" ? e !== "ANULADO" : e === filtro; 
  };
  
  const lista = (st.compromisos || [])
    .filter((c) => !c.anulado && pasa(c))
    .sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || ""));
    
  const pg = usePaged(lista, 10);

  // Utilidad para buscar los comprobantes de pago asociados a un compromiso
  const comprobantesDe = (cid) => {
    return movsDe(st, cid).filter((m) => m.referencia || (m.adjuntos && m.adjuntos.length));
  };

  return (
    <Section 
      title="Compras — Cuentas por Pagar" 
      desc="Registra los pedidos y adjunta la orden de compra. La asignación de banco y el pago los realiza Tesorería; aquí verás el comprobante para compartirlo con el proveedor."
    >
      <KpiCompras st={st} />

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <Segmented 
          value={vista} 
          onChange={setVista} 
          options={[
            { id: "lista", label: "Lista de pedidos", icon: FileText }, 
            { id: "agenda", label: "Agenda de pagos", icon: CalendarClock },
            { id: "calendario", label: "Calendario", icon: CalendarDays }
          ]} 
        />
        {puedeCrear && vista === "lista" && (
          <Btn onClick={() => setModal("new")} disabled={proveedores.length === 0}>
            <Plus size={15} /> Nuevo pedido / financiamiento
          </Btn>
        )}
      </div>

      {vista === "lista" && (
        <Fragment>
          <div style={{ marginBottom: 12 }}>
            <Segmented 
              value={filtro} 
              onChange={setFiltro} 
              options={["TODOS", "PENDIENTE", "PARCIAL", "PAGADO"].map((x) => ({ id: x, label: x[0] + x.slice(1).toLowerCase() }))} 
            />
          </div>
          
          {lista.length === 0 ? (
            <Empty 
              icon={FileText} 
              title="Sin pedidos de compra" 
              msg="Carga un pedido para iniciar el ciclo de pago." 
              action={
                puedeCrear && proveedores.length > 0 && (
                  <Btn onClick={() => setModal("new")}>
                    <Plus size={15} /> Nuevo pedido
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
                      <Th>Proveedor / concepto</Th>
                      <Th>Pedido</Th>
                      <Th>Vence</Th>
                      <Th right>Total</Th>
                      <Th right>Abonado</Th>
                      <Th right>Pendiente</Th>
                      <Th>Estado</Th>
                      <Th right>Acciones</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pg.slice.map((c) => {
                      const e = estadoDe(st, c); 
                      const tone = e === "PAGADO" ? "verde" : e === "PARCIAL" ? "amar" : "gold";
                      const comps = comprobantesDe(c.id);
                      
                      return (
                        <tr key={c.id}>
                          <Td>
                            <div style={{ fontWeight: 700 }}>{provNom(st, c.proveedorId)}</div>
                            <div style={{ fontSize: 11.5, color: C.mut, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              {c.descripcion || "—"}
                              {c.categoria && <Badge tone="mut">{c.categoria}</Badge>}
                            </div>
                            
                            {/* Chips de Adjuntos de la Compra */}
                            {(c.adjuntos || []).length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                                {c.adjuntos.map((a, i) => <AdjuntoChip key={i} a={a} />)}
                              </div>
                            )}
                            
                            {/* Chips de Comprobantes de Pago transferidos por Tesorería */}
                            {comps.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" }}>
                                {comps.map((m) => (
                                  <Fragment key={m.id}>
                                    {m.referencia && <Badge tone="verde">Comprob.: {m.referencia}</Badge>}
                                    {(m.adjuntos || []).map((a, i) => <AdjuntoChip key={i} a={a} />)}
                                  </Fragment>
                                ))}
                              </div>
                            )}
                          </Td>
                          <Td>{c.numeroPedidoOdoo || <span style={{ color: C.mut }}>—</span>}</Td>
                          <Td>{fmtD(c.fechaVencimiento)}</Td>
                          <Td right>{money(c.montoOriginal, c.moneda)}</Td>
                          <Td right>
                            {pagadoDe(st, c) > 0 ? (
                              <span style={{ color: C.verde }}>{money(pagadoDe(st, c), c.moneda)}</span>
                            ) : (
                              <span style={{ color: C.mut }}>—</span>
                            )}
                          </Td>
                          <Td right bold>{money(pendienteDe(st, c), c.moneda)}</Td>
                          <Td><Badge tone={tone}>{e}</Badge></Td>
                          <Td right>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              {puedeCrear && (
                                <Btn 
                                  small 
                                  variant="ghost" 
                                  title="Adjuntar / ver orden de compra" 
                                  onClick={() => { setF({ compromisoId: c.id, adjuntos: c.adjuntos || [] }); setModal("adj"); }}
                                >
                                  <Paperclip size={13} />
                                </Btn>
                              )}
                              {puedeCrear && e === "PENDIENTE" && (
                                <Btn 
                                  small 
                                  variant="danger" 
                                  title="Eliminar" 
                                  onClick={() => act.delCompromiso(c.id)}
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
        </Fragment>
      )}

      {/* Vista de Agenda Alternativa */}
      {vista === "agenda" && <AgendaPagos st={st} />}

      {/* Vista de Calendario */}
      {vista === "calendario" && <CalendarioPagos st={st} />}

      {/* Modales */}
      {modal === "new" && (
        <FormCompromiso 
          proveedores={proveedores}
          act={act}
          onSave={(listaDeCuotas) => {
            act.addCompromisoMulti(listaDeCuotas);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "adj" && (
        <Modal title="Archivos del pedido" onClose={() => setModal(null)}>
          <AdjuntosInput 
            value={f.adjuntos} 
            onChange={(a) => setF({ ...f, adjuntos: a })} 
            label="Orden de compra, cotización u otros (PDF o imagen)" 
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cerrar</Btn>
            <Btn onClick={() => { act.setAdjCompromiso(f.compromisoId, f.adjuntos); setModal(null); }}>
              Guardar
            </Btn>
          </div>
        </Modal>
      )}
    </Section>
  );
}