import React, { useState } from "react";
import { TrendingUp, Plus, Trash2 } from "lucide-react";

// Tema y utilidades
import { C } from "../../constants/theme";
import { 
  esCli, 
  fmtD, 
  provNom, 
  bancoNom, 
  money, 
  activoCxC, 
  pendienteCxC,
  cobranzaAUsd,
  tasaSegunFormaPago,
  FORMAS_PAGO
} from "../../utils/finance";
import { usePaged } from "../../hooks/usePaged";
import { uploadAdjunto } from "../../services/store";

// Componentes UI
import { Section, Card, Empty, Modal } from "../../components/ui/Layout";
import { Btn } from "../../components/ui/Buttons";
import { Th, Td, Pagination } from "../../components/ui/Table";
import { Field, Input, Select } from "../../components/ui/Forms";
import { ComboBox } from "../../components/ui/ComboBox";
import { AdjuntarComprobante } from "../../components/shared/AdjuntarComprobante";
import { AdjuntoChip } from "../../components/shared/Adjuntos";

export default function Cobranzas({ st, act }) {
  const [modal, setModal] = useState(false);
  
  const clientes = (st.proveedores || []).filter(esCli);
  const lista = [...(st.cobranzas || [])].reverse();
  const pg = usePaged(lista, 10);

  return (
    <Section 
      title="Cobranzas (Ingresos)" 
      desc="Registra pagos de clientes cruzados con sus facturas. Suben el saldo del banco destino." 
      action={
        <Btn 
          onClick={() => setModal(true)} 
          disabled={(st.bancos || []).length === 0 || clientes.length === 0}
        >
          <Plus size={15} /> Registrar ingreso
        </Btn>
      }
    >
      {lista.length === 0 ? (
        <Empty 
          icon={TrendingUp} 
          title="Sin cobranzas registradas" 
          msg="No hay ingresos de clientes." 
          action={
            <Btn 
              onClick={() => setModal(true)} 
              disabled={(st.bancos || []).length === 0 || clientes.length === 0}
            >
              <Plus size={15} /> Registrar ingreso
            </Btn>
          } 
        />
      ) : (
        <Card>
          <div className="cad-table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>Fecha</Th>
                  <Th>Cliente</Th>
                  <Th>Factura / Concepto</Th>
                  <Th>Banco destino</Th>
                  <Th right>Monto</Th>
                  <Th right>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {pg.slice.map((c) => {
                  const factura = (st.cuentasCobrar || []).find((x) => x.id === c.cuentaCobrarId);
                  
                  return (
                    <tr key={c.id}>
                      <Td>{fmtD(c.fecha)}</Td>
                      <Td bold>{provNom(st, c.clienteId)}</Td>
                      <Td>
                        <div style={{ fontSize: 12.5 }}>
                          {factura ? (
                            <span style={{ fontWeight: 600 }}>Fac: {factura.numeroFactura || "S/N"}</span>
                          ) : (
                            <span style={{ color: C.mut, fontStyle: "italic" }}>Anticipo / Pago libre</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: C.mut }}>{c.descripcion || "—"}</div>
                        {(c.adjuntos || []).length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
                            {c.adjuntos.map((a, i) => <AdjuntoChip key={i} a={a} />)}
                          </div>
                        )}
                      </Td>
                      <Td>{bancoNom(st, c.bancoDestinoId)}</Td>
                      <Td right bold>
                        <span style={{ color: C.verde }}>+{money(c.monto, c.moneda)}</span>
                        {c.moneda !== "USD" && (
                          <div style={{ fontSize: 11, color: C.mut, fontWeight: 500 }}>
                            ≈ {money(cobranzaAUsd(c), "USD")} {c.tasaBcvPago ? `· tasa ${c.tasaBcvPago}` : ""}
                          </div>
                        )}
                      </Td>
                      <Td right>
                        <Btn 
                          small 
                          variant="danger" 
                          onClick={() => { 
                            if (window.confirm("¿Revertir cobranza y descontar del banco?")) {
                              act.delCobranza(c.id);
                            }
                          }}
                        >
                          <Trash2 size={13} />
                        </Btn>
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

      {modal && (
        <CobranzaModal 
          st={st} 
          clientes={clientes}
          onClose={() => setModal(false)}
          onSave={(data) => {
            act.addCobranza(data);
            setModal(false);
          }}
        />
      )}
    </Section>
  );
}

/* ============================================================
   COMPONENTE AISLADO: FORMULARIO DE COBRANZA
   ============================================================ */
function CobranzaModal({ st, clientes, onClose, onSave }) {
  const [f, setF] = useState({ 
    clienteId: clientes[0]?.id || "", 
    cuentaCobrarId: "", 
    descripcion: "", 
    monto: "", 
    formaPago: "USD", 
    bancoDestinoId: "", 
    fecha: new Date().toISOString().slice(0, 10),
    adjuntos: []
  });
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);

  // La factura siempre vive en USD — la "forma de pago" es en qué moneda
  // llegó realmente el dinero, y de ahí sale la tasa a usar hoy.
  const tasaAplicable = tasaSegunFormaPago(st, f.formaPago); // null si es USD directo
  const monedaPago = f.formaPago === "USD" ? "USD" : "BS";
  const montoUSD = tasaAplicable && f.monto ? Number(f.monto) / tasaAplicable : Number(f.monto || 0);

  const bancosFiltrados = (st.bancos || []).filter((b) => b.moneda === monedaPago);
  
  const cxcPendientes = f.clienteId 
    ? (st.cuentasCobrar || []).filter((c) => c.clienteId === f.clienteId && activoCxC(st, c)) 
    : [];

  // Se llama al terminar de leer el comprobante: pre-llena los campos Y
  // guarda el archivo mismo como adjunto de la cobranza.
  const onDatosDetectados = async (datos, archivo) => {
    setF((prev) => ({
      ...prev,
      monto: datos.monto != null ? String(datos.monto) : prev.monto,
      formaPago: datos.moneda === "BS" ? "BS_BCV" : (datos.moneda || prev.formaPago),
      fecha: datos.fecha || prev.fecha,
      descripcion: datos.referencia ? `Ref. ${datos.referencia}` : prev.descripcion
    }));

    setSubiendoComprobante(true);
    try {
      const subido = await uploadAdjunto(archivo);
      setF((prev) => ({ ...prev, adjuntos: [...prev.adjuntos, subido] }));
    } catch (e) {
      console.warn("No se pudo guardar el comprobante como adjunto:", e);
    }
    setSubiendoComprobante(false);
  };

  const elegirFactura = (facId) => {
    const fac = cxcPendientes.find((x) => x.id === facId);
    if (!fac) { setF({ ...f, cuentaCobrarId: "" }); return; }

    // Si la factura tiene su propia forma de pago esperada, la usamos para
    // sugerir el monto ya convertido; si no, se mantiene la que ya estaba elegida.
    const formaPagoSugerida = fac.formaPago || f.formaPago;
    const tasaSugerida = tasaSegunFormaPago(st, formaPagoSugerida);
    const pendienteUSD = pendienteCxC(st, fac);
    const montoSugerido = tasaSugerida ? Number((pendienteUSD * tasaSugerida).toFixed(2)) : pendienteUSD;

    setF({ ...f, cuentaCobrarId: facId, formaPago: formaPagoSugerida, monto: String(montoSugerido), bancoDestinoId: "" });
  };

  const guardar = () => {
    if (!f.clienteId || !f.monto || !f.bancoDestinoId) return;
    onSave({ 
      ...f, 
      monto: Number(f.monto), 
      moneda: monedaPago, 
      tasaBcvPago: tasaAplicable 
    });
  };

  return (
    <Modal title="Registrar Cobranza" onClose={onClose}>
      <AdjuntarComprobante onDatos={onDatosDetectados} />

      {subiendoComprobante && (
        <div style={{ fontSize: 11.5, color: C.mut, marginTop: -8, marginBottom: 12 }}>Guardando comprobante…</div>
      )}
      {f.adjuntos.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: -8, marginBottom: 14 }}>
          {f.adjuntos.map((a, i) => (
            <AdjuntoChip key={i} a={a} onDelete={() => setF((prev) => ({ ...prev, adjuntos: prev.adjuntos.filter((_, j) => j !== i) }))} />
          ))}
        </div>
      )}

      <Field label="Cliente">
        <ComboBox
          value={f.clienteId}
          onChange={(v) => setF({ ...f, clienteId: v, cuentaCobrarId: "" })}
          placeholder="Buscar cliente..."
          options={[...clientes]
            .sort((a, b) => (a.razonSocial || "").localeCompare(b.razonSocial || "", "es"))
            .map((p) => ({ value: p.id, label: p.razonSocial }))}
        />
      </Field>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Forma de pago" hint="¿En qué llegó el dinero?">
          <Select 
            value={f.formaPago} 
            onChange={(e) => setF({ ...f, formaPago: e.target.value, bancoDestinoId: "" })}
          >
            {FORMAS_PAGO.map((fp) => <option key={fp.id} value={fp.id}>{fp.label}</option>)}
          </Select>
        </Field>
        <Field label="Fecha de pago">
          <Input 
            type="date" 
            value={f.fecha} 
            onChange={(e) => setF({ ...f, fecha: e.target.value })} 
          />
        </Field>
      </div>
      
      <div style={{ background: C.greenSoft, padding: "10px 14px", borderRadius: 10, marginBottom: 14 }}>
        <Field label="Aplicar a factura (opcional)">
          <Select 
            value={f.cuentaCobrarId} 
            onChange={(e) => elegirFactura(e.target.value)}
          >
            <option value="">— Anticipo o libre —</option>
            {cxcPendientes.map((fac) => (
              <option key={fac.id} value={fac.id}>
                Fac: {fac.numeroFactura || "S/N"} ({money(pendienteCxC(st, fac), "USD")} pendiente)
              </option>
            ))}
          </Select>
        </Field>
      </div>
      
      <Field label={`Monto recibido (${monedaPago === "USD" ? "USD" : "Bs"})`}>
        <Input 
          type="number" 
          value={f.monto} 
          onChange={(e) => setF({ ...f, monto: e.target.value })} 
        />
      </Field>

      {tasaAplicable && f.monto && (
        <div style={{ background: C.body, padding: "8px 12px", borderRadius: 10, marginTop: -8, marginBottom: 14, fontSize: 12.5 }}>
          Con tasa <b>{tasaAplicable}</b>, esto equivale a <b style={{ color: C.ink }}>{money(montoUSD, "USD")}</b> — con esto se cruzará contra la factura (que vive en USD).
        </div>
      )}
      
      <Field label="Descripción / Concepto">
        <Input 
          value={f.descripcion} 
          onChange={(e) => setF({ ...f, descripcion: e.target.value })} 
          placeholder="Ref. Zelle..." 
        />
      </Field>
      
      <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 4, paddingTop: 12 }}>
        <Field label="Banco destino">
          <ComboBox
            value={f.bancoDestinoId}
            onChange={(v) => setF({ ...f, bancoDestinoId: v })}
            placeholder="Seleccionar banco..."
            options={[...bancosFiltrados]
              .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"))
              .map((b) => ({ value: b.id, label: b.nombre, sublabel: b.moneda }))}
          />
        </Field>
        {bancosFiltrados.length === 0 && (
          <div style={{ fontSize: 12, color: C.rojo, marginTop: -8, marginBottom: 12 }}>
            ⚠️ No hay bancos en {monedaPago}.
          </div>
        )}
      </div>
      
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={guardar} disabled={!f.bancoDestinoId || !f.clienteId || !f.monto}>Registrar</Btn>
      </div>
    </Modal>
  );
}
