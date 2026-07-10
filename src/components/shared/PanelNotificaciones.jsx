import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, AlertTriangle, Clock, X } from "lucide-react";
import { C, FONTS, UI } from "../../constants/theme";
import { generarNotificaciones } from "../../utils/notificaciones";
import { money, fmtD } from "../../utils/finance";
import { Modal } from "../ui/Layout";
import { Btn, Segmented } from "../ui/Buttons";
import { Field, Input, Select } from "../ui/Forms";
import { Badge } from "../ui/Data";
import { AdjuntarComprobante } from "./AdjuntarComprobante";
import { uploadAdjunto } from "../../services/store";

function ItemNotificacion({ n, onAbrir }) {
  const tono = n.vencido ? C.rojo : C.amar;
  return (
    <button
      onClick={() => onAbrir(n)}
      className="cad-sidebar-item"
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "10px 12px", border: "none", borderRadius: 10,
        textAlign: "left", cursor: "pointer", fontFamily: FONTS.SANS
      }}
    >
      <div style={{ width: 30, height: 30, borderRadius: 8, background: n.vencido ? C.rojoSoft : C.amarSoft, color: tono, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {n.vencido ? <AlertTriangle size={14} /> : <Clock size={14} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Badge tone={n.tipo === "CxP" ? "gold" : "verde"}>{n.tipo === "CxP" ? "Por pagar" : "Por cobrar"}</Badge>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {n.contacto}
          </span>
        </div>
        <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>
          {n.vencido ? `Venció hace ${Math.abs(n.diasDiff)} día(s)` : n.diasDiff === 0 ? "Vence hoy" : `Vence en ${n.diasDiff} día(s)`} · {fmtD(n.fechaVencimiento)}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        {money(n.monto, n.moneda)}
      </div>
    </button>
  );
}

/** Modal de acción rápida: registrar el pago (CxP) o la cobranza (CxC) directo desde la notificación. */
function ModalAccionRapida({ n, st, act, onClose }) {
  const esCxP = n.tipo === "CxP";
  const bancosFiltrados = (st.bancos || []).filter((b) => b.moneda === n.moneda);

  const [f, setF] = useState({
    monto: n.monto,
    bancoId: bancosFiltrados[0]?.id || "",
    referencia: "",
    fecha: new Date().toISOString().slice(0, 10),
    adjuntos: []
  });
  const [subiendo, setSubiendo] = useState(false);

  const onDatosDetectados = async (datos, archivo) => {
    setF((prev) => ({
      ...prev,
      monto: datos.monto != null ? datos.monto : prev.monto,
      fecha: datos.fecha || prev.fecha,
      referencia: datos.referencia ? `Ref. ${datos.referencia}` : prev.referencia
    }));
    setSubiendo(true);
    try {
      const subido = await uploadAdjunto(archivo);
      setF((prev) => ({ ...prev, adjuntos: [...prev.adjuntos, subido] }));
    } catch (e) {
      console.warn("No se pudo guardar el comprobante:", e);
    }
    setSubiendo(false);
  };

  const guardar = () => {
    if (!f.monto || !f.bancoId) return;
    if (esCxP) {
      act.addMovimiento({
        compromisoId: n.id,
        tipo: "TRANSFERENCIA",
        monto: Number(f.monto),
        moneda: n.moneda,
        bancoOrigenId: f.bancoId,
        fecha: f.fecha,
        referencia: f.referencia,
        adjuntos: f.adjuntos
      });
    } else {
      act.addCobranza({
        clienteId: n.registro.clienteId,
        cuentaCobrarId: n.id,
        descripcion: f.referencia,
        monto: Number(f.monto),
        moneda: n.moneda,
        bancoDestinoId: f.bancoId,
        fecha: f.fecha,
        adjuntos: f.adjuntos
      });
    }
    onClose();
  };

  return (
    <Modal title={esCxP ? `Registrar pago — ${n.contacto}` : `Registrar cobro — ${n.contacto}`} onClose={onClose}>
      <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 14 }}>
        {n.descripcion} · pendiente {money(n.monto, n.moneda)}
      </div>

      <AdjuntarComprobante onDatos={onDatosDetectados} label="Adjuntar comprobante (PDF o foto) — autocompletar" />
      {subiendo && <div style={{ fontSize: 11.5, color: C.mut, marginTop: -8, marginBottom: 12 }}>Guardando comprobante…</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Monto">
          <Input type="number" value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} />
        </Field>
        <Field label="Fecha">
          <Input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
        </Field>
      </div>

      <Field label={esCxP ? "Banco de origen" : "Banco destino"}>
        <Select value={f.bancoId} onChange={(e) => setF({ ...f, bancoId: e.target.value })}>
          <option value="">— Selecciona un banco —</option>
          {bancosFiltrados.map((b) => <option key={b.id} value={b.id}>{b.nombre} ({b.moneda})</option>)}
        </Select>
      </Field>
      {bancosFiltrados.length === 0 && (
        <div style={{ fontSize: 12, color: C.rojo, marginTop: -8, marginBottom: 12 }}>⚠️ No hay bancos en {n.moneda}.</div>
      )}

      <Field label="Referencia / comprobante">
        <Input value={f.referencia} onChange={(e) => setF({ ...f, referencia: e.target.value })} placeholder="N° de transferencia, Zelle, etc." />
      </Field>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={guardar} disabled={!f.monto || !f.bancoId}>
          {esCxP ? "Registrar pago" : "Registrar cobro"}
        </Btn>
      </div>
    </Modal>
  );
}

/** Campanita de notificaciones en la barra superior. */
export function PanelNotificaciones({ st, act, rol }) {
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState("TODOS");
  const [accionActiva, setAccionActiva] = useState(null); // la notificación que se está resolviendo
  const ref = useRef(null);

  const notifs = useMemo(() => generarNotificaciones(st, rol), [st, rol]);
  const vencidos = notifs.filter((n) => n.vencido);
  const proximos = notifs.filter((n) => !n.vencido);

  const filtradas = filtro === "TODOS" ? notifs : filtro === "VENCIDOS" ? vencidos : proximos;

  useEffect(() => {
    const onClickFuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  if (rol === "LECTOR") return null; // el Lector no gestiona pagos/cobros

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        onClick={() => setAbierto((a) => !a)}
        style={{
          position: "relative", width: 36, height: 36, borderRadius: 10,
          border: `1px solid ${C.line}`, background: C.surface, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", color: C.ink
        }}
      >
        <Bell size={16} />
        {notifs.length > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 999,
            background: vencidos.length > 0 ? C.rojo : C.amar, color: "#fff", fontSize: 10, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px"
          }}>
            {notifs.length}
          </span>
        )}
      </button>

      {abierto && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 40,
          width: 360, maxWidth: "90vw", background: C.surface, border: `1px solid ${C.line}`,
          borderRadius: UI.RADIUS, boxShadow: UI.SHADOW_MODAL, overflow: "hidden"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>Pagos y cobros pendientes</div>
            <button onClick={() => setAbierto(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.mut }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: "10px 14px 0" }}>
            <Segmented
              value={filtro}
              onChange={setFiltro}
              options={[
                { id: "TODOS", label: `Todos (${notifs.length})` },
                { id: "VENCIDOS", label: `Vencidos (${vencidos.length})` },
                { id: "PROXIMOS", label: `Próximos (${proximos.length})` }
              ]}
            />
          </div>

          <div style={{ maxHeight: 360, overflowY: "auto", padding: 10 }}>
            {filtradas.length === 0 ? (
              <div style={{ padding: "24px 10px", textAlign: "center", fontSize: 12.5, color: C.mut }}>
                No hay nada pendiente en este filtro. 🎉
              </div>
            ) : (
              <div style={{ display: "grid", gap: 4 }}>
                {filtradas.map((n) => (
                  <ItemNotificacion key={n.tipo + n.id} n={n} onAbrir={(n) => { setAccionActiva(n); setAbierto(false); }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {accionActiva && (
        <ModalAccionRapida n={accionActiva} st={st} act={act} onClose={() => setAccionActiva(null)} />
      )}
    </div>
  );
}
