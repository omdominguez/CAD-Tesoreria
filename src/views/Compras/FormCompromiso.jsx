import React, { useState } from "react";
import { Plus, X } from "lucide-react";

// Tema y utilidades
import { C, CLASIF } from "../../constants/theme";
import { money, FORMAS_PAGO } from "../../utils/finance";

// Componentes UI
import { Modal } from "../../components/ui/Layout";
import { Field, Input, Select } from "../../components/ui/Forms";
import { ComboBox } from "../../components/ui/ComboBox";
import { Btn } from "../../components/ui/Buttons";
import { AdjuntosInput } from "../../components/shared/Adjuntos";
import { AdjuntarPdfOdoo } from "../../components/shared/AdjuntarPdfOdoo";

export default function FormCompromiso({ proveedores, act, onSave, onClose }) {
  // Copia local de proveedores para poder reflejar de inmediato uno recién creado
  // (mientras el resto de la app se sincroniza con Supabase de fondo).
  const [proveedoresLocal, setProveedoresLocal] = useState(proveedores);
  const [sugerenciaNueva, setSugerenciaNueva] = useState(null); // { nombre, rif } detectado sin match

  const [f, setF] = useState({ 
    proveedorId: proveedores[0]?.id || "", 
    numeroPedidoOdoo: "", 
    descripcion: "", 
    categoria: CLASIF[0], 
    montoOriginal: "", 
    moneda: "USD", 
    formaPago: "USD", 
    fechaPedido: new Date().toISOString().slice(0, 10), 
    fechaVencimiento: new Date().toISOString().slice(0, 10), 
    prioridad: "NORMAL", 
    enCuotas: false, 
    numCuotas: 2, 
    frecuencia: "MENSUAL", 
    financiamientoPct: "", 
    iniciales: [], // [{ monto, fecha, pagada }] — uno o varios pagos iniciales
    adjuntos: [] 
  });

  const addInicial = () => setF((prev) => ({
    ...prev,
    iniciales: [...(prev.iniciales || []), { monto: "", fecha: prev.fechaPedido, pagada: false }]
  }));
  const setInicial = (i, key, val) => setF((prev) => {
    const iniciales = [...(prev.iniciales || [])];
    iniciales[i] = { ...iniciales[i], [key]: val };
    return { ...prev, iniciales };
  });
  const delInicial = (i) => setF((prev) => ({
    ...prev,
    iniciales: (prev.iniciales || []).filter((_, j) => j !== i)
  }));

  // Cálculo en vivo para la vista previa (misma fórmula que al guardar)
  const sumaIniciales = (f.iniciales || []).reduce((a, x) => a + (Number(x.monto) || 0), 0);
  const saldoBase = Number(f.montoOriginal || 0) - sumaIniciales;
  const pctFinanciamiento = Number(f.financiamientoPct || 0);
  const saldoFinanciado = saldoBase * (1 + pctFinanciamiento / 100);
  const montoPorCuota = saldoFinanciado / (Number(f.numCuotas) || 1);

  // Se llama cuando el PDF adjunto termina de leerse y analizarse
  const onDatosDetectados = (datos, contacto) => {
    setF((prev) => ({
      ...prev,
      numeroPedidoOdoo: datos.numeroDocumento || prev.numeroPedidoOdoo,
      montoOriginal: datos.monto != null ? String(datos.monto) : prev.montoOriginal,
      // La moneda del pedido siempre es USD — no se sobreescribe con lo detectado en el PDF
      descripcion: datos.descripcionSugerida || prev.descripcion,
      fechaPedido: datos.fecha || prev.fechaPedido,
      proveedorId: contacto ? contacto.id : prev.proveedorId
    }));

    if (!contacto && datos.rif) {
      setSugerenciaNueva({ nombre: datos.nombreContraparte || "", rif: datos.rif || "" });
    } else {
      setSugerenciaNueva(null);
    }
  };

  const crearProveedorSugerido = () => {
    if (!sugerenciaNueva?.nombre || !act) return;
    const id = crypto.randomUUID();
    act.addProv({ id, rif: sugerenciaNueva.rif, razonSocial: sugerenciaNueva.nombre, esProveedor: true, esCliente: false, bancos: [] });
    setProveedoresLocal((prev) => [...prev, { id, rif: sugerenciaNueva.rif, razonSocial: sugerenciaNueva.nombre, esProveedor: true }]);
    setF((prev) => ({ ...prev, proveedorId: id }));
    setSugerenciaNueva(null);
  };

  const guardarNuevo = () => {
    if (!f.proveedorId || !f.montoOriginal) return;
    
    // Lógica para compras financiadas (Múltiples cuotas)
    if (f.enCuotas) {
      let listaCuotas = [];
      const numCuotas = Number(f.numCuotas) || 1;
      const totalIniciales = (f.iniciales || []).length;
      // Comparte un mismo id entre todas las cuotas/iniciales de esta compra —
      // así la lista de Compras puede agruparlas y no mostrar las 36 de una vez.
      const grupoFinanciamientoId = crypto.randomUUID();

      // 1. Un compromiso por cada pago inicial (cada uno con su propia fecha)
      (f.iniciales || []).forEach((ini, idx) => {
        if (!(Number(ini.monto) > 0)) return;
        listaCuotas.push({
          data: {
            ...f,
            descripcion: `${f.descripcion} (Inicial${totalIniciales > 1 ? ` ${idx + 1}/${totalIniciales}` : ""})`,
            montoOriginal: Number(ini.monto),
            fechaVencimiento: ini.fecha || f.fechaPedido,
            grupoFinanciamientoId
          },
          anticipo: ini.pagada ? {
            monto: Number(ini.monto),
            moneda: "USD",
            fecha: ini.fecha || f.fechaPedido,
            tipo: "TRANSFERENCIA",
            bancoOrigenId: null,
            referencia: `Pago Inicial${totalIniciales > 1 ? ` ${idx + 1}` : ""}`
          } : null
        });
      });

      // 2. El saldo restante, con el % de financiamiento aplicado como recargo
      //    de una sola vez sobre el saldo (no interés compuesto por cuota),
      //    repartido en partes iguales entre las cuotas.
      let d = new Date(f.fechaVencimiento + "T00:00:00");
      for (let i = 1; i <= numCuotas; i++) {
        listaCuotas.push({ 
          data: { 
            ...f, 
            descripcion: `${f.descripcion} (Cuota ${i}/${numCuotas}${pctFinanciamiento > 0 ? ` · +${pctFinanciamiento}% financ.` : ""})`, 
            montoOriginal: montoPorCuota, 
            fechaVencimiento: d.toISOString().slice(0, 10),
            grupoFinanciamientoId
          }, 
          anticipo: null 
        });
        
        if (f.frecuencia === "MENSUAL") d.setMonth(d.getMonth() + 1); 
        else if (f.frecuencia === "QUINCENAL") d.setDate(d.getDate() + 15); 
        else if (f.frecuencia === "SEMANAL") d.setDate(d.getDate() + 7);
      }
      
      onSave(listaCuotas);
    } else {
      onSave([{ data: { ...f, montoOriginal: Number(f.montoOriginal) }, anticipo: null }]);
    }
  };

  return (
    <Modal title="Registrar Compra / Financiamiento" wide onClose={onClose}>
      <AdjuntarPdfOdoo
        contactos={proveedoresLocal}
        onDatos={onDatosDetectados}
        label="Adjuntar PDF del pedido de Odoo (autocompletar)"
      />

      {sugerenciaNueva && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", background: C.amarSoft, padding: "10px 12px", borderRadius: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, color: C.ink }}>
            Proveedor no encontrado: <b>{sugerenciaNueva.nombre || "sin nombre detectado"}</b>
            {sugerenciaNueva.rif && <> (RIF {sugerenciaNueva.rif})</>}
          </div>
          <Btn small variant="soft" onClick={crearProveedorSugerido} disabled={!sugerenciaNueva.nombre}>
            <Plus size={13} /> Crear y seleccionar
          </Btn>
        </div>
      )}

      <Field label="Proveedor">
        <ComboBox
          value={f.proveedorId}
          onChange={(v) => setF({ ...f, proveedorId: v })}
          placeholder="Buscar proveedor..."
          options={[...proveedoresLocal]
            .sort((a, b) => (a.razonSocial || "").localeCompare(b.razonSocial || "", "es"))
            .map((p) => ({ value: p.id, label: p.razonSocial, sublabel: p.rif }))}
        />
      </Field>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="N° de pedido Odoo">
          <Input 
            value={f.numeroPedidoOdoo} 
            onChange={(e) => setF({ ...f, numeroPedidoOdoo: e.target.value })} 
            placeholder="Ej. P12986" 
          />
        </Field>
        <Field label="Categoría">
          <Select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
            {CLASIF.map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
        </Field>
        <Field label="Forma de pago (informativo)">
          <Select value={f.formaPago} onChange={(e) => setF({ ...f, formaPago: e.target.value })}>
            {FORMAS_PAGO.map((fp) => <option key={fp.id} value={fp.id}>{fp.label}</option>)}
          </Select>
        </Field>
      </div>
      <div style={{ fontSize: 11.5, color: C.mut, marginTop: -10, marginBottom: 14 }}>
        El pedido siempre se registra en USD. Esto solo indica con qué tasa se planea pagar — al
        momento de registrar el pago en Tesorería, el sistema calcula los Bs usando la tasa vigente
        <b> ese día</b>, no una guardada de antemano.
      </div>
      
      <Field label="Descripción del bien o servicio">
        <Input 
          value={f.descripcion} 
          onChange={(e) => setF({ ...f, descripcion: e.target.value })} 
          placeholder="Galpón, maquinaria, servicio eléctrico..." 
        />
      </Field>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Monto total a pagar">
          <Input 
            type="number" 
            value={f.montoOriginal} 
            onChange={(e) => setF({ ...f, montoOriginal: e.target.value })} 
          />
        </Field>
        <Field label="Fecha base de la operación">
          <Input 
            type="date" 
            value={f.fechaPedido} 
            onChange={(e) => setF({ ...f, fechaPedido: e.target.value })} 
          />
        </Field>
      </div>
      
      <AdjuntosInput 
        value={f.adjuntos} 
        onChange={(a) => setF({ ...f, adjuntos: a })} 
        label="Orden de compra / cotización (PDF o imagen)" 
      />
      
      <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 4, paddingTop: 14 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: C.greenDk, cursor: "pointer" }}>
          <input 
            type="checkbox" 
            checked={f.enCuotas} 
            onChange={(e) => setF({ ...f, enCuotas: e.target.checked })} 
          /> 
          Esta compra fue financiada (múltiples cuotas)
        </label>
        
        {f.enCuotas ? (
          <div style={{ marginTop: 12, padding: 14, background: C.greenSoft, borderRadius: 12, border: `1px solid ${C.green}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.greenDk, marginBottom: 8 }}>
              Pagos iniciales (opcional — uno o varios, cada uno con su propia fecha)
            </div>

            {(f.iniciales || []).length === 0 && (
              <div style={{ fontSize: 12, color: C.mut, marginBottom: 10 }}>
                Sin pagos iniciales — todo el monto se financia en las cuotas.
              </div>
            )}

            {(f.iniciales || []).map((ini, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <Input
                  type="number"
                  value={ini.monto}
                  onChange={(e) => setInicial(i, "monto", e.target.value)}
                  placeholder={`Inicial ${i + 1}`}
                  style={{ marginBottom: 0 }}
                />
                <Input
                  type="date"
                  value={ini.fecha}
                  onChange={(e) => setInicial(i, "fecha", e.target.value)}
                  style={{ marginBottom: 0 }}
                />
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, color: C.ink, cursor: "pointer", whiteSpace: "nowrap" }}>
                  <input type="checkbox" checked={ini.pagada} onChange={(e) => setInicial(i, "pagada", e.target.checked)} />
                  Ya pagada
                </label>
                <Btn small variant="danger" onClick={() => delInicial(i)}>
                  <X size={13} />
                </Btn>
              </div>
            ))}

            <Btn small variant="ghost" onClick={addInicial}>
              <Plus size={13} /> Agregar pago inicial
            </Btn>

            {sumaIniciales > 0 && (
              <div style={{ fontSize: 11.5, color: C.mut, marginTop: 8 }}>
                Suma de iniciales: <b style={{ color: C.ink }}>{money(sumaIniciales, f.moneda)}</b> · Saldo a financiar: <b style={{ color: C.ink }}>{money(saldoBase, f.moneda)}</b>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
              <Field label="N° de cuotas (del saldo)">
                <Input 
                  type="number" 
                  value={f.numCuotas} 
                  onChange={(e) => setF({ ...f, numCuotas: e.target.value })} 
                />
              </Field>
              <Field label="% de financiamiento (opcional)">
                <Input 
                  type="number" 
                  value={f.financiamientoPct} 
                  onChange={(e) => setF({ ...f, financiamientoPct: e.target.value })} 
                  placeholder="Ej. 10" 
                />
              </Field>
              <Field label="Frecuencia">
                <Select value={f.frecuencia} onChange={(e) => setF({ ...f, frecuencia: e.target.value })}>
                  <option value="MENSUAL">Mensual</option>
                  <option value="QUINCENAL">Quincenal</option>
                  <option value="SEMANAL">Semanal</option>
                </Select>
              </Field>
            </div>
            <Field label="Vence 1ra cuota el">
              <Input 
                type="date" 
                value={f.fechaVencimiento} 
                onChange={(e) => setF({ ...f, fechaVencimiento: e.target.value })} 
              />
            </Field>
            
            <div style={{ fontSize: 12, color: C.greenDk, marginTop: 4, fontWeight: 600 }}>
              {pctFinanciamiento > 0 ? (
                <>Saldo de {money(saldoBase, f.moneda)} + {pctFinanciamiento}% de financiamiento = {money(saldoFinanciado, f.moneda)}, repartido en {f.numCuotas || 0} cuotas de aprox. {money(montoPorCuota, f.moneda)}.</>
              ) : (
                <>El sistema proyectará {f.numCuotas || 0} cuotas de aprox. {money(montoPorCuota, f.moneda)}.</>
              )}
            </div>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 4 }}>
              El % de financiamiento se aplica como un recargo único sobre el saldo (no interés compuesto por cuota), repartido en partes iguales.
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <Field label="Fecha límite de pago">
              <Input 
                type="date" 
                value={f.fechaVencimiento} 
                onChange={(e) => setF({ ...f, fechaVencimiento: e.target.value })} 
              />
            </Field>
          </div>
        )}
      </div>
      
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={guardarNuevo} disabled={!f.proveedorId || !f.montoOriginal}>Generar deuda</Btn>
      </div>
    </Modal>
  );
}
