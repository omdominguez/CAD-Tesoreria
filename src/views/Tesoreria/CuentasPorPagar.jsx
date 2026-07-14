import React, { useState } from "react";
import { CreditCard, Building2, Banknote, Lock, Globe2, MapPin, Coins, Layers, ChevronDown, Pencil } from "lucide-react";

// Tema y utilidades
import { C, TIPOS_MOV } from "../../constants/theme";
import { 
  estadoDe, 
  provNom, 
  bancoNom, 
  fmtD, 
  money, 
  pendienteDe,
  tasaSegunFormaPago,
  bancosProv,
  cuentaProvPorId,
  resumenCuenta,
  agruparYColapsarCompromisos,
  bancosOrdenados
} from "../../utils/finance";
import { usePaged } from "../../hooks/usePaged";

// Componentes UI
import { Section, Card, Empty, Modal } from "../../components/ui/Layout";
import { Btn, Segmented } from "../../components/ui/Buttons";
import { Th, Td, Pagination } from "../../components/ui/Table";
import { Field, Input, Select } from "../../components/ui/Forms";
import { ComboBox } from "../../components/ui/ComboBox";
import { Badge } from "../../components/ui/Data";

// Componentes Compartidos
import { AdjuntosInput } from "../../components/shared/Adjuntos";
import { CorregirFechasModal } from "../../components/shared/CorregirFechasModal";

export default function CuentasPorPagar({ st, act, rol }) {
  const [modal, setModal] = useState(null); // 'asig', 'mov', null
  const [f, setF] = useState({}); // Datos mínimos compartidos para levantar los formularios aislados
  const [filtro, setFiltro] = useState("PENDIENTES");
  const [gruposExpandidos, setGruposExpandidos] = useState(new Set());
  const [corregirFechasGid, setCorregirFechasGid] = useState(null);

  const puedeTeso = rol === "TESORERIA" || rol === "MASTER";

  // Bloqueo si el compromiso pertenece a una corrida autorizada o ejecutada
  const bloqueado = (c) => { 
    const co = (st.corridas || []).find((x) => x.id === c.corridaId); 
    return co && ["AUTORIZADA", "EJECUTADA"].includes(co.estado); 
  };

  // Filtrado y ordenamiento cronológico
  const listaBase = (st.compromisos || []).filter((c) => {
    if (c.anulado) return false;
    if (filtro === "PENDIENTES") return pendienteDe(st, c) > 0.005;
    if (filtro === "SIN_BANCO") return pendienteDe(st, c) > 0.005 && !c.bancoAsignadoId;
    if (filtro === "PAGADOS") return estadoDe(st, c) === "PAGADO";
    return true;
  }).sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || ""));

  // Agrupamos por financiamiento y colapsamos las cuotas lejanas — misma
  // lógica que usa Compras (utils/finance.js)
  const lista = agruparYColapsarCompromisos(st, listaBase, gruposExpandidos);

  const pg = usePaged(lista, 10);

  const abrirAsignacion = (c) => {
    setF({ compromisoId: c.id, proveedorId: c.proveedorId, bancoAsignadoId: c.bancoAsignadoId || "", cuentaDestinoId: c.cuentaDestinoId || "", prioridad: c.prioridad || "NORMAL" });
    setModal("asig");
  };

  const abrirPago = (c) => {
    const formaPago = c.formaPago || c.moneda || "USD"; // compatibilidad con pedidos antiguos
    const pendienteUSD = pendienteDe(st, c); // los pedidos siempre se registran en USD
    const hoy = new Date().toISOString().slice(0, 10);
    const tasaAplicable = tasaSegunFormaPagoEnFecha(st, formaPago, hoy); // null si es USD directo
    const esEnBs = tasaAplicable !== null;
    const etiquetaTasa = { BS_BCV: "BCV ($)", BS_PARALELO: "Paralelo", BS_BCV_EUR: "BCV (€)", BS: "BCV ($)" }[formaPago] || "";
    const proveedor = (st.proveedores || []).find((p) => p.id === c.proveedorId);
    const cuentaDestino = c.cuentaDestinoId ? cuentaProvPorId(proveedor, c.cuentaDestinoId) : null;

    setF({ 
      compromisoId: c.id, 
      tipo: "TRANSFERENCIA", 
      fecha: hoy,
      formaPago,
      pendienteUSD,
      monto: esEnBs ? Number((pendienteUSD * tasaAplicable).toFixed(2)) : pendienteUSD, 
      moneda: esEnBs ? "BS" : "USD", 
      tasaBcvPago: esEnBs ? tasaAplicable : null,
      etiquetaTasa,
      cuentaDestino,
      proveedorNombre: proveedor?.razonSocial,
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
                  <Th>Cuenta destino (proveedor)</Th>
                  <Th>Banco pagador (CAD)</Th>
                  <Th>Estado</Th>
                  <Th right>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {pg.slice.map((item) => {
                  if (item.tipo === "resumen") {
                    return (
                      <tr key={"resumen-" + item.gid} style={{ background: C.body }}>
                        <td colSpan={7} style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button
                              onClick={() => setGruposExpandidos((prev) => new Set(prev).add(item.gid))}
                              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: C.mut, fontSize: 12.5, fontWeight: 600, padding: 0, flex: 1, textAlign: "left" }}
                            >
                              <Layers size={14} />
                              Ver las {item.cantidad} cuota(s) restante(s) de "{item.descripcionBase}"
                              {item.siguienteFecha && <span style={{ color: C.mut2 }}>· la siguiente vence {fmtD(item.siguienteFecha)}</span>}
                              <ChevronDown size={14} />
                            </button>
                            {rol === "MASTER" && (
                              <Btn small variant="ghost" onClick={() => setCorregirFechasGid(item.gid)}>
                                <Pencil size={13} /> Corregir fechas
                              </Btn>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const c = item.c;
                  const e = estadoDe(st, c); 
                  const tone = e === "PAGADO" ? "verde" : e === "PARCIAL" ? "amar" : "gold";
                  const isEnCorrida = bloqueado(c);
                  const proveedor = (st.proveedores || []).find((p) => p.id === c.proveedorId);
                  const cuentaDestino = c.cuentaDestinoId ? cuentaProvPorId(proveedor, c.cuentaDestinoId) : null;
                  
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
                        {cuentaDestino ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                            {cuentaDestino.tipo === "CRIPTO" ? <Coins size={12} color={C.gold} /> : cuentaDestino.tipo === "INTERNACIONAL" ? <Globe2 size={12} color={C.azul} /> : <MapPin size={12} color={C.mut} />}
                            {resumenCuenta(cuentaDestino)}
                          </div>
                        ) : (
                          <Badge tone="rojo">Sin asignar</Badge>
                        )}
                      </Td>
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
                              <Btn small variant="ghost" title="Asignar banco y cuenta destino" onClick={() => abrirAsignacion(c)}>
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
            act.asignar(data.compromisoId, data.bancoAsignadoId, data.prioridad, data.cuentaDestinoId);
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

      {corregirFechasGid && (
        <CorregirFechasModal
          onClose={() => setCorregirFechasGid(null)}
          onSave={(fechaInicio, frecuencia) => {
            act.recalcularFechasGrupo(corregirFechasGid, fechaInicio, frecuencia);
            setCorregirFechasGid(null);
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
  const proveedor = (st.proveedores || []).find((p) => p.id === f.proveedorId);
  const cuentasProveedor = bancosProv(proveedor);

  return (
    <Modal title="Asignar banco y cuenta destino" onClose={onClose}>
      <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 14 }}>
        Proveedor: <b style={{ color: C.ink }}>{proveedor?.razonSocial || "—"}</b>
      </div>

      <Field label="Cuenta del proveedor a la que se pagará (destino)">
        <ComboBox
          value={f.cuentaDestinoId}
          onChange={(v) => setF({ ...f, cuentaDestinoId: v })}
          placeholder="Sin asignar"
          options={[...cuentasProveedor]
            .sort((a, b) => (a.banco || a.moneda || "").localeCompare(b.banco || b.moneda || "", "es"))
            .map((cta) => ({
              value: cta.id,
              label: cta.tipo === "CRIPTO"
                ? `${cta.tipo === "CRIPTO" ? "🪙 " : ""}${cta.moneda} (${cta.red})`
                : `${cta.tipo === "INTERNACIONAL" ? "🌐 " : "🏠 "}${cta.banco}`,
              sublabel: cta.tipo === "CRIPTO"
                ? (cta.walletAddress || "").slice(0, 14) + "…"
                : `${cta.tipo === "INTERNACIONAL" ? `SWIFT ${cta.swift || "—"}` : cta.cuenta} (${cta.moneda})`
            }))}
        />
        {cuentasProveedor.length === 0 && (
          <div style={{ fontSize: 11.5, color: C.rojo, marginTop: 6 }}>
            Este proveedor no tiene cuentas bancarias registradas — agrégalas en Ajustes → Contactos.
          </div>
        )}
      </Field>

      <Field label="Banco de CAD con el que se pagará (origen)">
        <ComboBox
          value={f.bancoAsignadoId}
          onChange={(v) => setF({ ...f, bancoAsignadoId: v })}
          placeholder="Sin asignar"
          options={bancosOrdenados(st).map((b) => ({ value: b.id, label: b.nombre, sublabel: b.moneda }))}
        />
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

  // Si la fecha cambia (por ejemplo, se está registrando con atraso un pago
  // de hace unos días), recalculamos la tasa según lo que había vigente ESE
  // día en el historial — no la de hoy.
  const tasaVigenteEnFecha = f.formaPago && f.formaPago !== "USD"
    ? tasaSegunFormaPagoEnFecha(st, f.formaPago, f.fecha)
    : null;

  const cambiarFecha = (nuevaFecha) => {
    if (!tasaVigenteEnFecha) { setF({ ...f, fecha: nuevaFecha }); return; }
    const nuevaTasa = tasaSegunFormaPagoEnFecha(st, f.formaPago, nuevaFecha);
    // Solo re-sugerimos el monto si no lo habían tocado a mano de forma distinta al cálculo original
    const montoRecalculado = f.pendienteUSD != null ? Number((f.pendienteUSD * nuevaTasa).toFixed(2)) : f.monto;
    setF({ ...f, fecha: nuevaFecha, tasaBcvPago: nuevaTasa, monto: montoRecalculado });
  };

  const guardar = () => {
    if (!(Number(f.monto) > 0)) return;
    if (f.tipo !== "CRUCE" && !f.referencia.trim()) return;
    // cuentaDestino/proveedorNombre son solo para mostrar en pantalla — no se guardan en el movimiento
    const { cuentaDestino, proveedorNombre, ...datosLimpios } = f;
    onSave(datosLimpios);
  };

  return (
    <Modal title="Registrar pago a proveedor" onClose={onClose}>
      {f.proveedorNombre && (
        <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 10 }}>
          Pagando a: <b style={{ color: C.ink }}>{f.proveedorNombre}</b>
        </div>
      )}

      {f.cuentaDestino ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.body, padding: "9px 12px", borderRadius: 10, fontSize: 12.5, marginBottom: 14, border: `1px solid ${C.line}` }}>
          {f.cuentaDestino.tipo === "CRIPTO" ? <Coins size={15} color={C.gold} /> : f.cuentaDestino.tipo === "INTERNACIONAL" ? <Globe2 size={15} color={C.azul} /> : <MapPin size={15} color={C.mut} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: C.ink }}>
              {f.cuentaDestino.tipo === "CRIPTO" ? `${f.cuentaDestino.moneda} · ${f.cuentaDestino.red}` : f.cuentaDestino.banco}
            </div>
            <div style={{ color: C.mut, wordBreak: "break-all" }}>
              {f.cuentaDestino.tipo === "CRIPTO"
                ? f.cuentaDestino.walletAddress
                : f.cuentaDestino.tipo === "INTERNACIONAL"
                ? `SWIFT ${f.cuentaDestino.swift || "—"}${f.cuentaDestino.routing ? " · Routing " + f.cuentaDestino.routing : ""} · ${f.cuentaDestino.pais || ""}`
                : `Cuenta ${f.cuentaDestino.cuenta}`}
            </div>
            {f.cuentaDestino.tipo === "CRIPTO" && (
              <div style={{ color: C.rojo, fontSize: 11, marginTop: 4, fontWeight: 600 }}>
                Verifica la red ({f.cuentaDestino.red}) antes de transferir — es irreversible.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ background: C.amarSoft, color: C.amar, padding: "9px 12px", borderRadius: 10, fontSize: 12, marginBottom: 14 }}>
          No hay una cuenta destino asignada para este pago — asígnala con el botón "Banco" antes de transferir, para no equivocarte de cuenta.
        </div>
      )}

      {f.tasaBcvPago && (
        <div style={{ background: C.greenSoft, color: C.greenDk, padding: "9px 12px", borderRadius: 10, fontSize: 12, marginBottom: 14 }}>
          Este pedido se paga en Bs — el monto se calculó con la tasa {f.etiquetaTasa || "vigente"} del <b>{fmtD(f.fecha)}</b> (<b>{money(f.tasaBcvPago, "BS").replace("Bs", "Bs.")}</b> por USD).
          Si cambias la fecha abajo, la tasa se recalcula sola.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tipo de egreso">
          <Select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
            {TIPOS_MOV.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Fecha del pago">
          <Input type="date" value={f.fecha} onChange={(e) => cambiarFecha(e.target.value)} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={`Monto a transferir (${f.moneda === "BS" ? "Bs" : "USD"})`}>
          <Input type="number" value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} />
        </Field>
      </div>
      
      {f.tipo !== "CRUCE" && (
        <Field label="Salió del banco">
          <ComboBox
            value={f.bancoOrigenId}
            onChange={(v) => setF({ ...f, bancoOrigenId: v })}
            placeholder="Elegir banco..."
            options={bancosOrdenados(st).map((b) => ({ value: b.id, label: b.nombre, sublabel: b.moneda }))}
          />
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