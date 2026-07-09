import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import {
  LayoutDashboard, Landmark, Users, FileText, CalendarClock, Layers,
  Plus, Trash2, Pencil, X, ShieldCheck, Lock, Check, AlertTriangle,
  ArrowRightLeft, Wallet, TrendingUp, Building2, Sparkles, LogOut, UserCog, Settings, Receipt
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { useAuth } from "./auth.jsx";
import { loadState, saveState, subscribeState, listProfiles, setProfileRole } from "./store.js";

/* ============================================================
   PALETA CAD · El Maizalito
   ============================================================ */
const C = {
  green: "#1B5E20", greenDk: "#0F3D14", greenSoft: "#E8F1E9",
  gold: "#B8860B", goldSoft: "#F7EFDA",
  paper: "#FBFAF6", ink: "#1F2933", mut: "#6B7A70", line: "#E3E6DE",
  rojo: "#B23B2E", amar: "#C08A00", verde: "#16803C",
  rojoSoft: "#FBEAE7", amarSoft: "#FBF2DA", verdeSoft: "#E6F4EA",
};
const SERIF = "'Iowan Old Style','Palatino Linotype','Book Antiqua',Georgia,serif";
const SANS = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";

/* ============================================================
   UTILIDADES
   ============================================================ */
const nf = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (n, m = "USD") => (m === "BS" ? "Bs " : "$ ") + nf.format(Number(n || 0));
const hoy0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const parseD = (s) => (s ? new Date(s + "T00:00:00") : null);
const fmtD = (s) => { const d = parseD(s); return d ? d.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"; };
const diasEntre = (a, b) => Math.round((b - a) / 86400000);
function startWeek(d) { const x = new Date(d); const off = (x.getDay() + 6) % 7; x.setDate(x.getDate() - off); x.setHours(0, 0, 0, 0); return x; }

const CATS = ["Materia Prima", "Activo Fijo (CAPEX)", "Servicios", "Insumos", "Otros"];
const TIPOS_MOV = [["ANTICIPO", "Anticipo"], ["ABONO", "Abono"], ["TRANSFERENCIA", "Transferencia / Pago"], ["CRUCE", "Cruce de cuenta (venta)"]];

/* ---- Derivados puros ---- */
const eqUSD = (bs, tasa) => (Number(tasa) && Number(tasa) > 0 ? Number(bs) / Number(tasa) : 0);
const prov = (st, id) => (st.proveedores || []).find((p) => p.id === id);
const banco = (st, id) => (st.bancos || []).find((b) => b.id === id);
const provNom = (st, id) => prov(st, id)?.razonSocial || "—";
const bancoNom = (st, id) => banco(st, id)?.nombre || "Sin asignar";

// CxP (Compras)
const movsDe = (st, cid) => (st.movimientos || []).filter((m) => m.compromisoId === cid);
const pagadoDe = (st, cid) => movsDe(st, cid).reduce((a, m) => a + Number(m.monto), 0);
const pendienteDe = (st, c) => Math.max(0, Number(c.montoOriginal) - pagadoDe(st, c.id));
function estadoDe(st, c) {
  if (c.anulado) return "ANULADO";
  const pend = pendienteDe(st, c);
  if (pend <= 0.005) return "PAGADO";
  if (pagadoDe(st, c.id) > 0) return "PARCIAL";
  return "PENDIENTE";
}
const activo = (st, c) => !c.anulado && ["PENDIENTE", "PARCIAL"].includes(estadoDe(st, c));
function usdComp(st, c) { 
  const t = Number(c.tasaBcvRegistro || st.config.tasaBCV) || 1; 
  return c.moneda === "USD" ? pendienteDe(st, c) : pendienteDe(st, c) / t; 
}
const pedidosProv = (st, pid) => (st.compromisos || []).filter((c) => c.proveedorId === pid && !c.anulado);
const usdPagado = (st, c) => { const t = Number(c.tasaBcvRegistro || st.config.tasaBCV) || 1; return c.moneda === "USD" ? pagadoDe(st, c.id) : pagadoDe(st, c.id) / t; };
const pendienteProv = (st, pid) => pedidosProv(st, pid).reduce((a, c) => a + usdComp(st, c), 0);
const pagadoProv = (st, pid) => pedidosProv(st, pid).reduce((a, c) => a + usdPagado(st, c), 0);

// CxC (Ventas)
const cxcDeCli = (st, cid) => (st.cuentasCobrar || []).filter((c) => c.clienteId === cid && !c.anulado);
const cobrosDeCxC = (st, cxcId) => (st.cobranzas || []).filter((c) => c.cuentaCobrarId === cxcId);
const cobradoDeCxC = (st, cxcId) => cobrosDeCxC(st, cxcId).reduce((a, c) => a + Number(c.monto), 0);
const pendienteCxC = (st, cxc) => Math.max(0, Number(cxc.montoOriginal) - cobradoDeCxC(st, cxc.id));
function estadoCxC(st, c) {
  if (c.anulado) return "ANULADO";
  const pend = pendienteCxC(st, c);
  if (pend <= 0.005) return "COBRADO";
  if (cobradoDeCxC(st, c.id) > 0) return "PARCIAL";
  return "PENDIENTE";
}
const activoCxC = (st, c) => !c.anulado && ["PENDIENTE", "PARCIAL"].includes(estadoCxC(st, c));
const usdCxCPendiente = (st, c) => { const t = Number(c.tasaBcvRegistro || st.config.tasaBCV) || 1; return c.moneda === "USD" ? pendienteCxC(st, c) : pendienteCxC(st, c) / t; };
const usdCxCCobrado = (st, c) => { const t = Number(c.tasaBcvRegistro || st.config.tasaBCV) || 1; return c.moneda === "USD" ? cobradoDeCxC(st, c.id) : cobradoDeCxC(st, c.id) / t; };
const pendienteCli = (st, cid) => cxcDeCli(st, cid).reduce((a, c) => a + usdCxCPendiente(st, c), 0);
const cobradoCli = (st, cid) => cxcDeCli(st, cid).reduce((a, c) => a + usdCxCCobrado(st, c), 0);

// BANCOS
function brutoUSD(st, b) { const t = Number(st.config.tasaBCV) || 1; return b.moneda === "USD" ? Number(b.saldoActual) : Number(b.saldoActual) / t; }
function comprometidoBanco(st, b) {
  return (st.compromisos || []).filter((c) => c.bancoAsignadoId === b.id && activo(st, c))
    .reduce((a, c) => a + (c.moneda === b.moneda ? pendienteDe(st, c) : b.moneda === "USD" ? usdComp(st, c) : pendienteDe(st, c) * (Number(st.config.tasaBCV) || 1)), 0);
}
const bancosProv = (p) => Array.isArray(p?.bancos) ? p.bancos : (p?.bancoDestino ? [{ banco: p.bancoDestino, cuenta: p.cuentaDestino || "" }] : []);
const esProv = (c) => c.esProveedor !== false;
const esCli = (c) => c.esCliente === true;

/* ---- MATRIZ DE NAVEGACIÓN PRINCIPAL ---- */
const NAV = [
  { id: "dashboard", label: "Tablero", icon: LayoutDashboard, roles: ["MASTER", "TESORERIA"] },
  { id: "compras", label: "Compras", icon: FileText, roles: ["COMPRAS", "TESORERIA", "MASTER"] },
  { id: "tesoreria", label: "Tesorería", icon: Landmark, roles: ["TESORERIA", "MASTER"] },
  { id: "directorio", label: "Directorio", icon: Users, roles: ["COMPRAS", "TESORERIA", "MASTER"] },
  { id: "ajustes", label: "Ajustes", icon: Settings, roles: ["TESORERIA", "MASTER"] }, 
];
const ROLES = { COMPRAS: "Compras", TESORERIA: "Tesorería", MASTER: "Master / Gerente" };
const CLASIF = ["Materia Prima", "Activo Fijo (CAPEX)", "Servicios", "Insumos", "Financiamiento", "Otros"];

/* ============================================================
   PRIMITIVAS UI
   ============================================================ */
function Btn({ children, onClick, variant = "primary", small, disabled, title }) {
  const base = { border: "1px solid transparent", borderRadius: 9, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: SANS, display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" };
  const pad = small ? { padding: "5px 10px", fontSize: 12.5 } : { padding: "9px 15px", fontSize: 13.5 };
  const styles = { primary: { background: C.green, color: "#fff" }, gold: { background: C.gold, color: "#fff" }, ghost: { background: "#fff", color: C.ink, borderColor: C.line }, soft: { background: C.greenSoft, color: C.greenDk }, danger: { background: "#fff", color: C.rojo, borderColor: "#EBC7C1" } };
  return <button title={title} disabled={disabled} onClick={onClick} style={{ ...base, ...pad, ...styles[variant] }}>{children}</button>;
}
function Badge({ tone, children }) {
  const map = { verde: [C.verde, C.verdeSoft], amar: [C.amar, C.amarSoft], rojo: [C.rojo, C.rojoSoft], green: [C.greenDk, C.greenSoft], gold: [C.gold, C.goldSoft], mut: [C.mut, "#F0F2EE"], bcv: ["#1e40af", "#dbeafe"] };
  const [fg, bg] = map[tone] || map.mut;
  return <span style={{ color: fg, background: bg, fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, letterSpacing: 0.2, whiteSpace: "nowrap" }}>{children}</span>;
}
function Card({ children, style }) { return <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, ...style }}>{children}</div>; }
function Field({ label, children, hint }) {
  return (
    <label style={{ display: "block", marginBottom: 13 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.mut, marginBottom: 5, letterSpacing: 0.2 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, color: C.mut, marginTop: 4 }}>{hint}</div>}
    </label>
  );
}
const inputStyle = { width: "100%", padding: "9px 11px", border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 13.5, fontFamily: SANS, color: C.ink, background: C.paper, boxSizing: "border-box" };
function Input(p) { return <input {...p} style={{ ...inputStyle, ...(p.style || {}) }} />; }
function Select({ children, ...p }) { return <select {...p} style={{ ...inputStyle }}>{children}</select>; }
function Modal({ title, onClose, children, wide }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,30,16,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "5vh 16px", zIndex: 50, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: wide ? 850 : 480, boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 700, color: C.greenDk }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.mut }}><X size={20} /></button>
        </div>
        <div style={{ padding: 20, maxHeight: "80vh", overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
function Empty({ icon: Icon, title, msg, action }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px" }}>
      <div style={{ width: 54, height: 54, borderRadius: 14, background: C.greenSoft, display: "inline-flex", alignItems: "center", justifyContent: "center", color: C.green }}><Icon size={26} /></div>
      <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: C.ink, marginTop: 14 }}>{title}</div>
      <div style={{ color: C.mut, fontSize: 13.5, marginTop: 6, maxWidth: 420, marginInline: "auto" }}>{msg}</div>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
function Th({ children, right }) { return <th style={{ textAlign: right ? "right" : "left", fontSize: 11.5, color: C.mut, fontWeight: 700, padding: "10px 12px", borderBottom: `1px solid ${C.line}`, letterSpacing: 0.3, textTransform: "uppercase" }}>{children}</th>; }
function Td({ children, right, bold }) { return <td style={{ textAlign: right ? "right" : "left", fontSize: 13, padding: "11px 12px", borderBottom: `1px solid ${C.line}`, color: C.ink, fontWeight: bold ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>{children}</td>; }
function Section({ title, desc, action, children }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, color: C.greenDk, margin: 0 }}>{title}</h2>
          {desc && <p style={{ color: C.mut, fontSize: 13.5, margin: "4px 0 0", maxWidth: 640 }}>{desc}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ============================================================
   COMPONENTES Y VISTAS
   ============================================================ */

function AjustesTasas({ st, act }) {
  return (
    <Section title="Tasas de Cambio" desc="Ajusta las tasas del día. Esto afecta la valorización de la deuda en tiempo real.">
      <Card style={{ padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
          {[{ k: "tasaBCV", lbl: "BCV (oficial)", tone: C.green }, { k: "tasaIntervencion", lbl: "Intervención", tone: C.gold }, { k: "tasaParalelo", lbl: "Mercado paralelo", tone: C.rojo }].map((r) => (
            <div key={r.k} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", borderTop: `4px solid ${r.tone}` }}>
              <div style={{ fontSize: 12, color: C.mut, fontWeight: 700, marginBottom: 6 }}>{r.lbl}</div>
              <input type="number" value={st.config[r.k] ?? ""} onChange={(e) => act.setRate(r.k, e.target.value)}
                style={{ width: "100%", border: "none", borderBottom: `1px solid ${C.line}`, fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: r.tone, background: "transparent", padding: "4px 0", outline: "none", fontVariantNumeric: "tabular-nums" }} />
            </div>
          ))}
        </div>
      </Card>
    </Section>
  );
}

function Tablero({ st }) {
  const [semanas, setSemanas] = useState(12);
  const [estres, setEstres] = useState(false);

  const kpi = useMemo(() => {
    const disp = (st.bancos || []).reduce((a, b) => a + brutoUSD(st, b), 0);
    const pend = (st.compromisos || []).filter((c) => activo(st, c) && !(estres && c.prioridad === "FLEXIBLE"));
    const comp = pend.reduce((a, c) => a + usdComp(st, c), 0);
    const pendCobrar = (st.cuentasCobrar || []).filter(c => activoCxC(st, c)).reduce((a, c) => a + usdCxCPendiente(st, c), 0);
    return { disp, comp, neto: disp - comp, pendCobrar };
  }, [st, estres]);

  const chart = useMemo(() => {
    const t = hoy0(); const w0 = startWeek(t);
    const arr = Array.from({ length: semanas }, (_, i) => ({ name: "S" + (i + 1), usd: 0 }));
    let venc = 0;
    (st.compromisos || []).filter((c) => activo(st, c) && !(estres && c.prioridad === "FLEXIBLE")).forEach((c) => {
      const idx = Math.floor(diasEntre(w0, parseD(c.fechaVencimiento)) / 7);
      if (idx < 0) venc += usdComp(st, c); else if (idx < semanas) arr[idx].usd += usdComp(st, c);
    });
    return [{ name: "Venc.", usd: venc, over: true }, ...arr];
  }, [st, semanas, estres]);

  if ((st.bancos || []).length === 0 && (st.proveedores || []).length === 0)
    return <Empty icon={LayoutDashboard} title="Aún no hay datos operativos" msg="Ve a Ajustes y registra bancos y contactos para comenzar." />;

  const K = [
    { t: "Disponible total", v: kpi.disp, ic: Wallet, tone: C.green, sub: "Saldo bruto consolidado (USD)" },
    { t: "Cuentas por Cobrar", v: kpi.pendCobrar, ic: Receipt, tone: C.verde, sub: "Facturas de clientes (USD)" },
    { t: "Cuentas por Pagar", v: kpi.comp, ic: FileText, tone: C.gold, sub: "Egresos pendientes (USD)" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14, marginBottom: 16 }}>
        {K.map((k) => (
          <Card key={k.t} style={{ padding: 18, borderTop: `3px solid ${k.tone}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 12, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 0.3 }}>{k.t}</div><k.ic size={18} color={k.tone} /></div>
            <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 700, color: k.tone, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{money(k.v, "USD")}</div>
            <div style={{ fontSize: 11.5, color: C.mut, marginTop: 4 }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div><div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: C.greenDk }}>Proyección de Egresos</div><div style={{ fontSize: 12, color: C.mut }}>Por semana (USD)</div></div>
            <div style={{ display: "flex", gap: 6 }}><Btn small variant={semanas === 4 ? "primary" : "ghost"} onClick={() => setSemanas(4)}>4 sem</Btn><Btn small variant={semanas === 12 ? "primary" : "ghost"} onClick={() => setSemanas(12)}>12 sem</Btn></div>
          </div>
          <div style={{ height: 210, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.mut }} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: C.mut }} tickFormatter={(v) => (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)} />
                <Tooltip formatter={(v) => money(v, "USD")} labelStyle={{ color: C.ink }} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C.line}` }} />
                <Bar dataKey="usd" radius={[4, 4, 0, 0]}>{chart.map((e, i) => <Cell key={i} fill={e.over ? C.rojo : C.green} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12.5, color: C.ink, cursor: "pointer" }}><input type="checkbox" checked={estres} onChange={(e) => setEstres(e.target.checked)} /><Sparkles size={14} color={C.gold} /> Excluir egresos flexibles</label>
        </Card>

        {(st.bancos || []).length > 0 && (
          <Card style={{ padding: 18 }}>
            <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: C.greenDk, marginBottom: 4 }}>Saldos disponibles por banco</div>
            <div style={{ fontSize: 12, color: C.mut, marginBottom: 12 }}>Disponible neto = saldo real − lo comprometido a ese banco.</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><Th>Banco</Th><Th>Moneda</Th><Th right>Disponible neto</Th><Th right>≈ USD (BCV)</Th><Th right>≈ USD (Interv.)</Th><Th right>≈ USD (Paralelo)</Th></tr></thead>
                <tbody>
                  {(st.bancos || []).map((b) => {
                    const comp = comprometidoBanco(st, b);
                    const neto = Number(b.saldoActual) - comp;
                    const esUSD = b.moneda === "USD";
                    return (
                      <tr key={b.id}>
                        <Td><div style={{ fontWeight: 700 }}>{b.nombre}</div><div style={{ fontSize: 11, color: C.mut }}>bruto {money(b.saldoActual, b.moneda)} · comprom. {money(comp, b.moneda)}</div></Td>
                        <Td><Badge tone="mut">{b.moneda}</Badge></Td>
                        <Td right bold><span style={{ color: neto >= 0 ? C.verde : C.rojo }}>{money(neto, b.moneda)}</span></Td>
                        <Td right>{esUSD ? <span style={{ color: C.mut }}>—</span> : money(eqUSD(neto, st.config.tasaBCV), "USD")}</Td>
                        <Td right>{esUSD ? <span style={{ color: C.mut }}>—</span> : money(eqUSD(neto, st.config.tasaIntervencion), "USD")}</Td>
                        <Td right>{esUSD ? <span style={{ color: C.mut }}>—</span> : money(eqUSD(neto, st.config.tasaParalelo), "USD")}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Bancos({ st, act }) {
  const [modal, setModal] = useState(null);
  const [f, setF] = useState({});
  const abrir = (b) => { setF(b || { nombre: "", numeroCuenta: "", tipoCuenta: "Corriente", moneda: "BS", saldoInicial: "", saldoActual: "" }); setModal(b ? "edit" : "new"); };
  const guardar = () => {
    if (!f.nombre) return;
    const data = { ...f, saldoInicial: Number(f.saldoInicial || 0), saldoActual: Number(f.saldoActual || f.saldoInicial || 0) };
    modal === "edit" ? act.updBanco(data) : act.addBanco(data);
    setModal(null);
  };
  return (
    <Section title="Cuentas Bancarias" desc="Registra tus cuentas. Tesorería usará estos bancos para emitir pagos o recibir cobranzas." action={<Btn onClick={() => abrir(null)}><Plus size={15} /> Agregar banco</Btn>}>
      {(st.bancos || []).length === 0 ? <Empty icon={Landmark} title="Sin cuentas registradas" msg="Agrega bancos para proyectar la caja." action={<Btn onClick={() => abrir(null)}><Plus size={15} /> Agregar banco</Btn>} />
        : <Card><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Banco</Th><Th>Cuenta</Th><Th>Tipo</Th><Th>Moneda</Th><Th right>Saldo actual</Th><Th right>Acciones</Th></tr></thead>
          <tbody>{(st.bancos || []).map((b) => (
            <tr key={b.id}>
              <Td bold>{b.nombre}</Td><Td>{b.numeroCuenta || "—"}</Td><Td>{b.tipoCuenta}</Td><Td><Badge tone="mut">{b.moneda}</Badge></Td><Td right bold>{money(b.saldoActual, b.moneda)}</Td>
              <Td right><div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}><Btn small variant="ghost" onClick={() => abrir(b)}><Pencil size={13} /></Btn><Btn small variant="danger" onClick={() => act.delBanco(b.id)}><Trash2 size={13} /></Btn></div></Td>
            </tr>
          ))}</tbody></table></div></Card>}
      {modal && <Modal title={modal === "edit" ? "Editar banco" : "Agregar banco"} onClose={() => setModal(null)}>
        <Field label="Nombre del banco"><Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Banesco, Mercantil..." /></Field>
        <Field label="Número de cuenta"><Input value={f.numeroCuenta} onChange={(e) => setF({ ...f, numeroCuenta: e.target.value })} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="Tipo de cuenta"><Select value={f.tipoCuenta} onChange={(e) => setF({ ...f, tipoCuenta: e.target.value })}><option>Corriente</option><option>Ahorro</option><option>Custodia</option></Select></Field><Field label="Moneda"><Select value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value })}><option value="BS">Bs</option><option value="USD">USD</option><option value="EUR">EUR</option></Select></Field></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="Saldo inicial"><Input type="number" value={f.saldoInicial} onChange={(e) => setF({ ...f, saldoInicial: e.target.value })} /></Field><Field label="Saldo actual"><Input type="number" value={f.saldoActual} onChange={(e) => setF({ ...f, saldoActual: e.target.value })} /></Field></div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}><Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn><Btn onClick={guardar}>Guardar</Btn></div>
      </Modal>}
    </Section>
  );
}

function ContactoFicha({ st, prov: p, onClose }) {
  const provMode = esProv(p); const cliMode = esCli(p);
  const pedidos = (st.compromisos || []).filter((c) => c.proveedorId === p.id && !c.anulado).sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || ""));
  const facturas = (st.cuentasCobrar || []).filter((c) => c.clienteId === p.id && !c.anulado).sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || ""));
  
  return (
    <Modal title={p.razonSocial} wide onClose={onClose}>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>{provMode && <Badge tone="mut">Proveedor</Badge>}{cliMode && <Badge tone="green">Cliente</Badge>}<span style={{ fontSize: 12.5, color: C.mut, marginLeft: 6 }}>RIF {p.rif}</span></div>
      {provMode && (
        <div style={{ marginBottom: cliMode ? 24 : 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 6, borderBottom: `2px solid ${C.line}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Cuentas por Pagar (Compras)</div>
            <div style={{ display: "flex", gap: 16 }}><span style={{ fontSize: 12.5, color: C.mut }}>Pagado <b style={{ color: C.verde }}>{money(pagadoProv(st, p.id), "USD")}</b></span><span style={{ fontSize: 12.5, color: C.mut }}>Pendiente <b style={{ color: pendienteProv(st, p.id) > 0 ? C.rojo : C.verde }}>{money(pendienteProv(st, p.id), "USD")}</b></span></div>
          </div>
          {pedidos.length === 0 ? <div style={{ color: C.mut, fontSize: 13, padding: "8px 0" }}>No hay pedidos registrados.</div> : 
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, maxHeight: 220, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, background: "#fff" }}><tr><Th>Pedido / concepto</Th><Th>Vence</Th><Th right>Total</Th><Th right>Pendiente</Th><Th>Estado</Th></tr></thead>
              <tbody>{pedidos.map((c) => <tr key={c.id}><Td><div style={{ fontWeight: 700 }}>{c.numeroPedidoOdoo || "—"}</div><div style={{ fontSize: 11.5, color: C.mut }}>{c.descripcion || "—"}</div></Td><Td>{fmtD(c.fechaVencimiento)}</Td><Td right>{money(c.montoOriginal, c.moneda)}</Td><Td right bold>{money(pendienteDe(st, c), c.moneda)}</Td><Td><Badge tone={estadoDe(st, c) === "PAGADO" ? "verde" : estadoDe(st, c) === "PARCIAL" ? "amar" : "gold"}>{estadoDe(st, c)}</Badge></Td></tr>)}</tbody>
            </table>
          </div>}
        </div>
      )}
      {cliMode && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 6, borderBottom: `2px solid ${C.line}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Cuentas por Cobrar (Ventas)</div>
            <div style={{ display: "flex", gap: 16 }}><span style={{ fontSize: 12.5, color: C.mut }}>Cobrado <b style={{ color: C.verde }}>{money(cobradoCli(st, p.id), "USD")}</b></span><span style={{ fontSize: 12.5, color: C.mut }}>Pendiente <b style={{ color: pendienteCli(st, p.id) > 0 ? C.rojo : C.verde }}>{money(pendienteCli(st, p.id), "USD")}</b></span></div>
          </div>
          {facturas.length === 0 ? <div style={{ color: C.mut, fontSize: 13, padding: "8px 0" }}>No hay facturas registradas.</div> : 
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, maxHeight: 220, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, background: "#fff" }}><tr><Th>Factura / concepto</Th><Th>Vence</Th><Th right>Total</Th><Th right>Pendiente</Th><Th>Estado</Th></tr></thead>
              <tbody>{facturas.map((c) => <tr key={c.id}><Td><div style={{ fontWeight: 700 }}>{c.numeroFactura || "—"}</div><div style={{ fontSize: 11.5, color: C.mut }}>{c.descripcion || "—"}</div></Td><Td>{fmtD(c.fechaVencimiento)}</Td><Td right>{money(c.montoOriginal, c.moneda)}</Td><Td right bold>{money(pendienteCxC(st, c), c.moneda)}</Td><Td><Badge tone={estadoCxC(st, c) === "COBRADO" ? "verde" : estadoCxC(st, c) === "PARCIAL" ? "amar" : "gold"}>{estadoCxC(st, c)}</Badge></Td></tr>)}</tbody>
            </table>
          </div>}
        </div>
      )}
    </Modal>
  );
}

function GestorContactos({ st, act }) {
  const [modal, setModal] = useState(null);
  const [f, setF] = useState({});
  const [filtro, setFiltro] = useState("TODOS");

  const abrir = (p) => {
    const base = p ? { ...p, bancos: bancosProv(p).length ? bancosProv(p) : [{ banco: "", cuenta: "" }], esProveedor: esProv(p), esCliente: esCli(p) }
      : { rif: "", razonSocial: "", bancos: [{ banco: "", cuenta: "" }], esProveedor: true, esCliente: false };
    setF(base); setModal(p ? "edit" : "new");
  };
  const setBco = (i, key, val) => setF((prev) => { const bancos = [...(prev.bancos || [])]; bancos[i] = { ...bancos[i], [key]: val }; return { ...prev, bancos }; });
  const addBco = () => setF((prev) => ({ ...prev, bancos: [...(prev.bancos || []), { banco: "", cuenta: "" }] }));
  const delBco = (i) => setF((prev) => ({ ...prev, bancos: (prev.bancos || []).filter((_, j) => j !== i) }));
  
  const guardar = () => {
    if (!f.rif || !f.razonSocial || (!f.esProveedor && !f.esCliente)) return;
    const data = { rif: f.rif, razonSocial: f.razonSocial, bancos: (f.bancos || []).filter((b) => b.banco || b.cuenta), esProveedor: f.esProveedor, esCliente: f.esCliente, id: f.id };
    modal === "edit" ? act.updProv(data) : act.addProv(data);
    setModal(null);
  };

  const lista = (st.proveedores || []).filter((p) => {
    if (filtro === "PROVEEDORES" && !esProv(p)) return false;
    if (filtro === "CLIENTES" && !esCli(p)) return false;
    return true;
  });

  return (
    <Section title="Gestor de Contactos" desc="Crea o edita la base de datos de Clientes y Proveedores." action={<Btn onClick={() => abrir(null)}><Plus size={15} /> Agregar contacto</Btn>}>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {[["TODOS", "Todos"], ["PROVEEDORES", "Proveedores"], ["CLIENTES", "Clientes"]].map(([k, l]) => <Btn key={k} small variant={filtro === k ? "primary" : "ghost"} onClick={() => setFiltro(k)}>{l}</Btn>)}
      </div>
      {(st.proveedores || []).length === 0 ? <Empty icon={Users} title="Directorio vacío" msg="Registra empresas o personas." action={<Btn onClick={() => abrir(null)}><Plus size={15} /> Agregar contacto</Btn>} />
        : <Card><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>RIF</Th><Th>Razón social</Th><Th>Perfil</Th><Th right>Acciones</Th></tr></thead>
          <tbody>{lista.map((p) => (
            <tr key={p.id}>
              <Td>{p.rif}</Td><Td bold>{p.razonSocial}</Td>
              <Td><div style={{ display: "flex", gap: 4 }}>{esProv(p) && <Badge tone="mut">Prov</Badge>}{esCli(p) && <Badge tone="green">Cli</Badge>}</div></Td>
              <Td right><div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}><Btn small variant="ghost" onClick={() => abrir(p)}><Pencil size={13} /></Btn><Btn small variant="danger" onClick={() => act.delProv(p.id)}><Trash2 size={13} /></Btn></div></Td>
            </tr>
          ))}</tbody></table></div></Card>}

      {modal && <Modal title={modal === "edit" ? "Editar contacto" : "Agregar contacto"} onClose={() => setModal(null)}>
        <div style={{ display: "flex", gap: 16, marginBottom: 16, background: C.paper, padding: "12px", borderRadius: 8, border: `1px solid ${C.line}` }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}><input type="checkbox" checked={f.esProveedor} onChange={e => setF({...f, esProveedor: e.target.checked})} /> Es Proveedor</label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}><input type="checkbox" checked={f.esCliente} onChange={e => setF({...f, esCliente: e.target.checked})} /> Es Cliente</label>
        </div>
        <Field label="RIF"><Input value={f.rif} onChange={(e) => setF({ ...f, rif: e.target.value })} placeholder="J-XXXXXXXX-X" /></Field>
        <Field label="Razón social"><Input value={f.razonSocial} onChange={(e) => setF({ ...f, razonSocial: e.target.value })} /></Field>
        {f.esProveedor && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.mut, marginBottom: 6, letterSpacing: 0.2 }}>Cuentas bancarias del proveedor</div>
            {(f.bancos || []).map((b, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <Input value={b.banco} onChange={(e) => setBco(i, "banco", e.target.value)} placeholder="Banco" style={{ marginBottom: 0 }} />
                <Input value={b.cuenta} onChange={(e) => setBco(i, "cuenta", e.target.value)} placeholder="N° de cuenta" style={{ marginBottom: 0 }} />
                <Btn small variant="danger" onClick={() => delBco(i)}><X size={13} /></Btn>
              </div>
            ))}
            <div style={{ marginBottom: 14 }}><Btn small variant="ghost" onClick={addBco}><Plus size={13} /> Agregar banco</Btn></div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn><Btn onClick={guardar} disabled={!f.esProveedor && !f.esCliente}>Guardar</Btn></div>
      </Modal>}
    </Section>
  );
}

function Directorio({ st }) {
  const [verProv, setVerProv] = useState(null);
  const [filtro, setFiltro] = useState("TODOS"); 
  const lista = (st.proveedores || []).filter((p) => { if (filtro === "PROVEEDORES" && !esProv(p)) return false; if (filtro === "CLIENTES" && !esCli(p)) return false; return true; });
  const provVer = verProv ? (st.proveedores || []).find((p) => p.id === verProv) : null;

  return (
    <Section title="Directorio de Contactos" desc="Busca a un proveedor o cliente para ver sus saldos pendientes y su estado de cuenta (ficha).">
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {[["TODOS", "Todos"], ["PROVEEDORES", "Proveedores"], ["CLIENTES", "Clientes"]].map(([k, l]) => <Btn key={k} small variant={filtro === k ? "primary" : "ghost"} onClick={() => setFiltro(k)}>{l}</Btn>)}
      </div>
      {(st.proveedores || []).length === 0 ? <Empty icon={Users} title="Directorio vacío" msg="Ve a Ajustes para registrar empresas o personas." />
        : <Card><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>RIF</Th><Th>Razón social</Th><Th>Perfil</Th><Th right>Por pagar (USD)</Th><Th right>Por cobrar (USD)</Th><Th right>Ficha</Th></tr></thead>
          <tbody>{lista.map((p) => {
            const pendProv = esProv(p) ? pendienteProv(st, p.id) : 0;
            const pendCli = esCli(p) ? pendienteCli(st, p.id) : 0;
            return (
              <tr key={p.id}>
                <Td>{p.rif}</Td><Td bold>{p.razonSocial}</Td>
                <Td><div style={{ display: "flex", gap: 4 }}>{esProv(p) && <Badge tone="mut">Prov</Badge>}{esCli(p) && <Badge tone="green">Cli</Badge>}</div></Td>
                <Td right bold><span style={{ color: pendProv > 0.005 ? C.rojo : C.mut }}>{pendProv > 0.005 ? money(pendProv, "USD") : "—"}</span></Td>
                <Td right bold><span style={{ color: pendCli > 0.005 ? C.verde : C.mut }}>{pendCli > 0.005 ? money(pendCli, "USD") : "—"}</span></Td>
                <Td right><Btn small variant="ghost" onClick={() => setVerProv(p.id)}><FileText size={13} /> Ver estado</Btn></Td>
              </tr>
            );
          })}</tbody></table></div></Card>}
      {provVer && <ContactoFicha st={st} prov={provVer} onClose={() => setVerProv(null)} />}
    </Section>
  );
}

function CuentasPorCobrar({ st, act, rol }) {
  const [modal, setModal] = useState(null);
  const [f, setF] = useState({});
  const [filtro, setFiltro] = useState("TODOS");
  const puedeCrear = rol === "MASTER" || rol === "TESORERIA";
  const clientes = (st.proveedores || []).filter(esCli);

  const abrirNuevo = () => { setF({ clienteId: clientes[0]?.id || "", numeroFactura: "", descripcion: "", montoOriginal: "", moneda: "USD", fechaEmision: new Date().toISOString().slice(0, 10), fechaVencimiento: new Date().toISOString().slice(0, 10) }); setModal("new"); };
  const guardarNuevo = () => { if (!f.clienteId || !f.montoOriginal) return; act.addCxC({ ...f, montoOriginal: Number(f.montoOriginal) }); setModal(null); };
  const pasa = (c) => { const e = estadoCxC(st, c); return filtro === "TODOS" ? e !== "ANULADO" : e === filtro; };
  const lista = (st.cuentasCobrar || []).filter((c) => !c.anulado && pasa(c)).sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || ""));

  return (
    <Section title="Cuentas por Cobrar (Ventas)" desc="Registra facturas emitidas a clientes. Se cobrarán en la pestaña de Ingresos." action={puedeCrear && <Btn onClick={abrirNuevo} disabled={clientes.length === 0}><Plus size={15} /> Nueva factura</Btn>}>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>{["TODOS", "PENDIENTE", "PARCIAL", "COBRADO"].map((x) => <Btn key={x} small variant={filtro === x ? "primary" : "ghost"} onClick={() => setFiltro(x)}>{x[0] + x.slice(1).toLowerCase()}</Btn>)}</div>
      {lista.length === 0 ? <Empty icon={Receipt} title="Sin facturas" msg="Registra facturas para controlar la deuda de clientes." action={puedeCrear && clientes.length > 0 && <Btn onClick={abrirNuevo}><Plus size={15} /> Nueva factura</Btn>} />
        : <Card><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Cliente / concepto</Th><Th>Factura</Th><Th>Vence</Th><Th right>Total</Th><Th right>Cobrado</Th><Th right>Pendiente</Th><Th>Estado</Th><Th right>Acciones</Th></tr></thead>
          <tbody>{lista.map((c) => {
            const isProtected = cobradoDeCxC(st, c.id) > 0;
            return (
              <tr key={c.id}>
                <Td><div style={{ fontWeight: 700 }}>{provNom(st, c.clienteId)}</div><div style={{ fontSize: 11.5, color: C.mut }}>{c.descripcion || "—"}</div></Td>
                <Td>{c.numeroFactura || <span style={{ color: C.mut }}>—</span>}</Td><Td>{fmtD(c.fechaVencimiento)}</Td><Td right>{money(c.montoOriginal, c.moneda)}</Td>
                <Td right>{cobradoDeCxC(st, c.id) > 0 ? <span style={{ color: C.verde }}>{money(cobradoDeCxC(st, c.id), c.moneda)}</span> : "—"}</Td>
                <Td right bold>{money(pendienteCxC(st, c), c.moneda)}</Td><Td><Badge tone={estadoCxC(st, c) === "COBRADO" ? "verde" : estadoCxC(st, c) === "PARCIAL" ? "amar" : "gold"}>{estadoCxC(st, c)}</Badge></Td>
                <Td right><div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>{puedeCrear && <Btn small variant="danger" disabled={isProtected} onClick={() => act.delCxC(c.id)}><Trash2 size={13} /></Btn>}</div></Td>
              </tr>
            );
          })}</tbody></table></div></Card>}
      {modal === "new" && <Modal title="Registrar Factura (CxC)" wide onClose={() => setModal(null)}>
        <Field label="Cliente"><Select value={f.clienteId} onChange={(e) => setF({ ...f, clienteId: e.target.value })}>{clientes.map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}</Select></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}><Field label="N° de Factura"><Input value={f.numeroFactura} onChange={(e) => setF({ ...f, numeroFactura: e.target.value })} /></Field><Field label="Fecha emisión"><Input type="date" value={f.fechaEmision} onChange={(e) => setF({ ...f, fechaEmision: e.target.value })} /></Field><Field label="Fecha vencimiento"><Input type="date" value={f.fechaVencimiento} onChange={(e) => setF({ ...f, fechaVencimiento: e.target.value })} /></Field></div>
        <Field label="Descripción / Concepto"><Input value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="Monto total"><Input type="number" value={f.montoOriginal} onChange={(e) => setF({ ...f, montoOriginal: e.target.value })} /></Field><Field label="Moneda"><Select value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value })}><option value="BS">Bs</option><option value="USD">USD</option></Select></Field></div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}><Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn><Btn onClick={guardarNuevo}>Registrar factura</Btn></div>
      </Modal>}
    </Section>
  );
}

function Cobranzas({ st, act }) {
  const [modal, setModal] = useState(false);
  const [f, setF] = useState({});
  const clientes = (st.proveedores || []).filter(esCli);

  const abrir = () => { setF({ clienteId: clientes[0]?.id || "", cuentaCobrarId: "", descripcion: "", monto: "", moneda: "USD", bancoDestinoId: "", fecha: new Date().toISOString().slice(0, 10) }); setModal(true); };
  const guardar = () => { if (!f.clienteId || !f.monto || !f.bancoDestinoId) return; act.addCobranza({ ...f, monto: Number(f.monto) }); setModal(false); };

  const lista = [...(st.cobranzas || [])].reverse();
  const bancosFiltrados = (st.bancos || []).filter(b => b.moneda === f.moneda);
  const cxcPendientes = f.clienteId ? (st.cuentasCobrar || []).filter(c => c.clienteId === f.clienteId && c.moneda === f.moneda && activoCxC(st, c)) : [];

  return (
    <Section title="Cobranzas (Ingresos)" desc="Registra pagos cruzados con facturas para subir el saldo del banco." action={<Btn onClick={abrir} disabled={(st.bancos||[]).length === 0 || clientes.length === 0}><Plus size={15}/> Registrar ingreso</Btn>}>
      {lista.length === 0 ? <Empty icon={TrendingUp} title="Sin cobranzas registradas" msg="No hay ingresos de clientes." action={<Btn onClick={abrir} disabled={(st.bancos||[]).length === 0 || clientes.length === 0}><Plus size={15}/> Registrar ingreso</Btn>} />
        : <Card><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Fecha</Th><Th>Cliente</Th><Th>Factura cruzada / Concepto</Th><Th>Banco destino</Th><Th right>Monto</Th><Th right>Acciones</Th></tr></thead>
          <tbody>{lista.map(c => {
            const factura = (st.cuentasCobrar || []).find(f => f.id === c.cuentaCobrarId);
            return (
              <tr key={c.id}>
                <Td>{fmtD(c.fecha)}</Td><Td bold>{provNom(st, c.clienteId)}</Td>
                <Td><div style={{ fontSize: 12.5 }}>{factura ? <span style={{ fontWeight: 600 }}>Fac: {factura.numeroFactura || "S/N"}</span> : <span style={{ color: C.mut, fontStyle: "italic" }}>Anticipo / Pago libre</span>}</div><div style={{ fontSize: 11.5, color: C.mut }}>{c.descripcion || "—"}</div></Td>
                <Td>{bancoNom(st, c.bancoDestinoId)}</Td><Td right bold><span style={{ color: C.verde }}>+{money(c.monto, c.moneda)}</span></Td>
                <Td right><Btn small variant="danger" onClick={() => { if(window.confirm(`¿Revertir cobranza?`)) act.delCobranza(c.id); }}><Trash2 size={13}/></Btn></Td>
              </tr>
            );
          })}</tbody>
        </table></div></Card>}

      {modal && <Modal title="Registrar Cobranza" onClose={() => setModal(false)}>
        <Field label="Cliente"><Select value={f.clienteId} onChange={e => setF({...f, clienteId: e.target.value, cuentaCobrarId: ""})}>{clientes.map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}</Select></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="Moneda del pago"><Select value={f.moneda} onChange={e => setF({...f, moneda: e.target.value, bancoDestinoId: "", cuentaCobrarId: ""})}><option value="USD">USD</option><option value="BS">Bs</option><option value="EUR">EUR</option></Select></Field><Field label="Fecha de pago"><Input type="date" value={f.fecha} onChange={e => setF({...f, fecha: e.target.value})} /></Field></div>
        <div style={{ background: C.greenSoft, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>
          <Field label="Aplicar a factura (Opcional)"><Select value={f.cuentaCobrarId} onChange={e => { const fac = cxcPendientes.find(x => x.id === e.target.value); setF({...f, cuentaCobrarId: e.target.value, monto: fac ? pendienteCxC(st, fac) : f.monto}); }}><option value="">— Anticipo o Libre —</option>{cxcPendientes.map(fac => <option key={fac.id} value={fac.id}>Fac: {fac.numeroFactura || "S/N"} ({money(pendienteCxC(st, fac), fac.moneda)})</option>)}</Select></Field>
        </div>
        <Field label="Monto recibido"><Input type="number" value={f.monto} onChange={e => setF({...f, monto: e.target.value})} /></Field>
        <Field label="Descripción / Concepto"><Input value={f.descripcion} onChange={e => setF({...f, descripcion: e.target.value})} placeholder="Ref. Zelle..." /></Field>
        <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 4, paddingTop: 12 }}>
          <Field label="Banco destino"><Select value={f.bancoDestinoId} onChange={e => setF({...f, bancoDestinoId: e.target.value})}><option value="">— Seleccionar banco —</option>{bancosFiltrados.map(b => <option key={b.id} value={b.id}>{b.nombre} ({b.moneda})</option>)}</Select></Field>
          {bancosFiltrados.length === 0 && <div style={{ fontSize: 12, color: C.rojo, marginTop: -8, marginBottom: 12 }}>⚠️ No hay bancos en {f.moneda}.</div>}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}><Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn><Btn onClick={guardar} disabled={!f.bancoDestinoId || !f.clienteId || !f.monto}>Registrar</Btn></div>
      </Modal>}
    </Section>
  );
}

/* ============================================================
   NUEVO COMPONENTE: AGENDA DE PAGOS (DASHBOARD DOBLE CON FILTRO)
   ============================================================ */
function AgendaPagos({ st }) {
  // Estado para controlar el filtro de tiempo actual
  const [filtroTiempo, setFiltroTiempo] = useState("TODOS");

  // Agrupar los compromisos activos por moneda y por mes
  const ag = { USD: {}, BS: {} };
  
  // Variables de tiempo relativas al día de hoy para los cálculos
  const hoy = hoy0();
  const currYear = hoy.getFullYear();
  const currMonth = hoy.getMonth();
  const currQuarter = Math.floor(currMonth / 3);
  
  const w0 = startWeek(hoy);
  const w1 = new Date(w0);
  w1.setDate(w1.getDate() + 6); // Fin de la semana actual

  // Función evaluadora: decide si una fecha entra en el filtro seleccionado
  const pasaFiltro = (fechaStr) => {
    if (filtroTiempo === "TODOS") return true;
    const d = parseD(fechaStr);
    if (!d) return false;

    if (filtroTiempo === "VENCIDOS") return d < hoy;
    if (filtroTiempo === "ESTA_SEMANA") return d >= w0 && d <= w1;
    if (filtroTiempo === "ESTE_MES") return d.getFullYear() === currYear && d.getMonth() === currMonth;
    if (filtroTiempo === "ESTE_TRIMESTRE") return d.getFullYear() === currYear && Math.floor(d.getMonth() / 3) === currQuarter;
    if (filtroTiempo === "ESTE_ANO") return d.getFullYear() === currYear;

    return true;
  };

  // Filtrado y agrupación
  (st.compromisos || [])
    .filter(c => activo(st, c) && pasaFiltro(c.fechaVencimiento))
    .forEach(c => {
      const d = parseD(c.fechaVencimiento);
      const key = d.toISOString().slice(0, 7); // YYYY-MM
      const target = c.moneda === "USD" ? ag.USD : ag.BS;
      if (!target[key]) target[key] = [];
      target[key].push(c);
    });

  const sortK = (a, b) => a.localeCompare(b);
  const keysUSD = Object.keys(ag.USD).sort(sortK);
  const keysBS = Object.keys(ag.BS).sort(sortK);
  
  const nMonth = (k) => {
    const d = new Date(k + "-02"); 
    return d.toLocaleString('es-VE', {month: 'long', year: 'numeric'}).toUpperCase();
  };

  const RenderColumna = ({ titulo, llaves, dataAgrupada, color, colorSoft, moneda }) => (
    <Card style={{ padding: 18, borderTop: `4px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontFamily: SERIF, margin: 0, color: C.ink, fontSize: 18 }}>{titulo}</h3>
      </div>
      {llaves.length === 0 ? <div style={{ fontSize: 13, color: C.mut, fontStyle: "italic" }}>No hay pagos programados para este período.</div> : 
        llaves.map(mes => {
          const arr = dataAgrupada[mes];
          const totalMes = arr.reduce((a, c) => a + pendienteDe(st, c), 0);
          return (
            <div key={mes} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: colorSoft, padding: "6px 12px", borderRadius: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: color, letterSpacing: 0.5 }}>{nMonth(mes)}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: color, fontVariantNumeric: "tabular-nums" }}>{money(totalMes, moneda)}</span>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {arr.map(c => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 8 }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{provNom(st, c.proveedorId)}</div>
                      <div style={{ fontSize: 11, color: C.mut, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.descripcion || "Pedido Odoo: " + c.numeroPedidoOdoo} · {c.fechaVencimiento.slice(-2)}/{c.fechaVencimiento.slice(5,7)}</div>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      {money(pendienteDe(st, c), moneda)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      }
    </Card>
  );

  const botonesFiltro = [
    { id: "VENCIDOS", label: "Vencidos" },
    { id: "ESTA_SEMANA", label: "Esta semana" },
    { id: "ESTE_MES", label: "Este mes" },
    { id: "ESTE_TRIMESTRE", label: "Este trimestre" },
    { id: "ESTE_ANO", label: "Este año" },
    { id: "TODOS", label: "Todos" }
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", borderBottom: `1px dashed ${C.line}`, paddingBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.mut, display: "flex", alignItems: "center", marginRight: 8 }}>Filtrar por:</span>
        {botonesFiltro.map(b => (
          <Btn 
            key={b.id} 
            small 
            variant={filtroTiempo === b.id ? "primary" : "ghost"} 
            onClick={() => setFiltroTiempo(b.id)}
          >
            {b.label}
          </Btn>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <RenderColumna titulo="Deuda en Dólares (USD)" llaves={keysUSD} dataAgrupada={ag.USD} color={C.green} colorSoft={C.greenSoft} moneda="USD" />
        <RenderColumna titulo="Deuda en Bolívares (BS)" llaves={keysBS} dataAgrupada={ag.BS} color="#1e40af" colorSoft="#dbeafe" moneda="BS" />
      </div>
    </div>
  );
}

function Compromisos({ st, act, rol }) {
  const [modal, setModal] = useState(null);
  const [f, setF] = useState({});
  const [filtro, setFiltro] = useState("TODOS");
  const [vista, setVista] = useState("lista"); // "lista" | "agenda"

  const puedeCrear = rol === "COMPRAS" || rol === "MASTER";
  const puedeTeso = rol === "TESORERIA" || rol === "MASTER";
  const proveedores = (st.proveedores || []).filter(esProv);

  const abrirNuevo = () => { 
    setF({ 
      proveedorId: proveedores[0]?.id || "", numeroPedidoOdoo: "", descripcion: "", categoria: CLASIF[0], 
      montoOriginal: "", moneda: "USD", fechaPedido: new Date().toISOString().slice(0, 10), fechaVencimiento: new Date().toISOString().slice(0, 10), 
      prioridad: "NORMAL", 
      enCuotas: false, numCuotas: 2, frecuencia: "MENSUAL", montoInicial: "", antOn: false, // Financiamiento
    }); 
    setModal("new"); 
  };

  const guardarNuevo = () => {
    if (!f.proveedorId || !f.montoOriginal) return;
    
    if (f.enCuotas) {
      // Estructurar Financiamiento
      let listaCuotas = [];
      const numCuotas = Number(f.numCuotas) || 1;
      const montoTotal = Number(f.montoOriginal);
      const montoInicial = Number(f.montoInicial || 0);
      const montoRestante = montoTotal - montoInicial;
      const montoPorCuota = montoRestante / numCuotas;

      // 1. Si hay inicial, crear la primera factura separada
      if (montoInicial > 0) {
        listaCuotas.push({
          data: { ...f, descripcion: `${f.descripcion} (Inicial)`, montoOriginal: montoInicial, fechaVencimiento: f.fechaPedido },
          anticipo: f.antOn ? { monto: montoInicial, fecha: f.fechaPedido, tipo: "TRANSFERENCIA", bancoOrigenId: null, referencia: "Pago Inicial" } : null
        });
      }

      // 2. Proyectar las cuotas
      let d = new Date(f.fechaVencimiento + "T00:00:00");
      for(let i=1; i<=numCuotas; i++) {
        listaCuotas.push({
          data: { ...f, descripcion: `${f.descripcion} (Cuota ${i}/${numCuotas})`, montoOriginal: montoPorCuota, fechaVencimiento: d.toISOString().slice(0,10) },
          anticipo: null
        });
        if (f.frecuencia === "MENSUAL") d.setMonth(d.getMonth() + 1);
        else if (f.frecuencia === "QUINCENAL") d.setDate(d.getDate() + 15);
        else if (f.frecuencia === "SEMANAL") d.setDate(d.getDate() + 7);
      }
      act.addCompromisoMulti(listaCuotas);
    } else {
      // Compra simple (Pago único)
      act.addCompromisoMulti([{
        data: { ...f, montoOriginal: Number(f.montoOriginal) },
        anticipo: null // Aquí no pusimos campos de anticipo en la UI simplificada, se maneja como pendiente siempre.
      }]);
    }
    setModal(null);
  };

  const bloqueado = (c) => { const co = (st.corridas || []).find((x) => x.id === c.corridaId); return co && ["AUTORIZADA", "EJECUTADA"].includes(co.estado); };
  const pasa = (c) => { const e = estadoDe(st, c); return filtro === "TODOS" ? e !== "ANULADO" : e === filtro; };
  const lista = (st.compromisos || []).filter((c) => !c.anulado && pasa(c)).sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || ""));

  return (
    <Section title="Módulo de Compras (Cuentas por Pagar)" desc="Registra la deuda con proveedores o compras financiadas en múltiples cuotas.">
      
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: `1px solid ${C.line}`, paddingBottom: 14 }}>
        <Btn small variant={vista === "lista" ? "primary" : "ghost"} onClick={() => setVista("lista")}><FileText size={14} /> Lista de Pedidos</Btn>
        <Btn small variant={vista === "agenda" ? "primary" : "ghost"} onClick={() => setVista("agenda")}><CalendarClock size={14} /> Agenda de Pagos</Btn>
      </div>

      {vista === "lista" && (
        <Fragment>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["TODOS", "PENDIENTE", "PARCIAL", "PAGADO"].map((x) => <Btn key={x} small variant={filtro === x ? "primary" : "ghost"} onClick={() => setFiltro(x)}>{x[0] + x.slice(1).toLowerCase()}</Btn>)}
            </div>
            {puedeCrear && <Btn onClick={abrirNuevo} disabled={proveedores.length === 0}><Plus size={15} /> Nuevo pedido o financiamiento</Btn>}
          </div>

          {lista.length === 0 ? <Empty icon={FileText} title="Sin pedidos de compra" msg="Carga un pedido para iniciar el ciclo de pago." action={puedeCrear && proveedores.length > 0 && <Btn onClick={abrirNuevo}><Plus size={15} /> Nuevo pedido</Btn>} />
            : <Card><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>Proveedor / concepto</Th><Th>Pedido</Th><Th>Vence</Th><Th right>Total</Th><Th right>Abonado</Th><Th right>Pendiente</Th><Th>Estado</Th><Th>Banco</Th><Th right>Acciones</Th></tr></thead>
              <tbody>{lista.map((c) => {
                const e = estadoDe(st, c); const tone = e === "PAGADO" ? "verde" : e === "PARCIAL" ? "amar" : "gold";
                return (
                  <tr key={c.id}>
                    <Td><div style={{ fontWeight: 700 }}>{provNom(st, c.proveedorId)}</div><div style={{ fontSize: 11.5, color: C.mut, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>{c.descripcion || "—"}{c.categoria && <Badge tone="mut">{c.categoria}</Badge>}</div></Td>
                    <Td>{c.numeroPedidoOdoo || <span style={{ color: C.mut }}>—</span>}</Td><Td>{fmtD(c.fechaVencimiento)}</Td><Td right>{money(c.montoOriginal, c.moneda)}</Td><Td right>{pagadoDe(st, c.id) > 0 ? <span style={{ color: C.verde }}>{money(pagadoDe(st, c.id), c.moneda)}</span> : <span style={{ color: C.mut }}>—</span>}</Td><Td right bold>{money(pendienteDe(st, c), c.moneda)}</Td><Td><Badge tone={tone}>{e}</Badge></Td><Td>{c.bancoAsignadoId ? <span style={{ fontSize: 12 }}>{bancoNom(st, c.bancoAsignadoId)}</span> : <span style={{ color: C.mut, fontSize: 12 }}>Sin asignar</span>}</Td>
                    <Td right><div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {puedeTeso && e !== "PAGADO" && !bloqueado(c) && <Btn small variant="soft" title="Registrar Pago" onClick={() => { setF({ compromisoId: c.id, tipo: "TRANSFERENCIA", monto: pendienteDe(st, c), bancoOrigenId: c.bancoAsignadoId || (st.bancos||[])[0]?.id || "", referencia: "" }); setModal("mov"); }}><ArrowRightLeft size={13} /></Btn>}
                      {puedeTeso && e !== "PAGADO" && !bloqueado(c) && <Btn small variant="ghost" title="Asignar Banco" onClick={() => { setF({ compromisoId: c.id, bancoAsignadoId: c.bancoAsignadoId || "", prioridad: c.prioridad }); setModal("asig"); }}><Building2 size={13} /></Btn>}
                      {bloqueado(c) && <Badge tone="mut"><Lock size={11} /> En corrida</Badge>}
                      {puedeCrear && e !== "PAGADO" && !bloqueado(c) && <Btn small variant="danger" title="Eliminar deuda" onClick={() => act.delCompromiso(c.id)}><Trash2 size={13} /></Btn>}
                    </div></Td>
                  </tr>
                );
              })}</tbody></table></div></Card>}
        </Fragment>
      )}

      {modal === "new" && <Modal title="Registrar Compra / Financiamiento" wide onClose={() => setModal(null)}>
        <Field label="Proveedor"><Select value={f.proveedorId} onChange={(e) => setF({ ...f, proveedorId: e.target.value })}>{proveedores.map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}</Select></Field>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="N° de pedido Odoo"><Input value={f.numeroPedidoOdoo} onChange={(e) => setF({ ...f, numeroPedidoOdoo: e.target.value })} placeholder="Ej. P12986" /></Field>
          <Field label="Categoría"><Select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>{CLASIF.map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label="Moneda"><Select value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value })}><option value="USD">USD</option><option value="BS">Bs</option></Select></Field>
        </div>
        
        <Field label="Descripción del bien o servicio"><Input value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} placeholder="Galpón, Maquinaria, Servicio Eléctrico..." /></Field>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Monto Total a Pagar"><Input type="number" value={f.montoOriginal} onChange={(e) => setF({ ...f, montoOriginal: e.target.value })} /></Field>
          <Field label="Fecha base de la operación"><Input type="date" value={f.fechaPedido} onChange={(e) => setF({ ...f, fechaPedido: e.target.value })} /></Field>
        </div>

        <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 4, paddingTop: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: C.greenDk, cursor: "pointer" }}>
            <input type="checkbox" checked={f.enCuotas} onChange={(e) => setF({ ...f, enCuotas: e.target.checked })} />
            Esta compra fue financiada (Múltiples cuotas)
          </label>
          
          {f.enCuotas ? (
            <div style={{ marginTop: 12, padding: 14, background: C.greenSoft, borderRadius: 10, border: `1px solid ${C.green}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Monto Inicial (opcional)"><Input type="number" value={f.montoInicial} onChange={e => setF({...f, montoInicial: e.target.value})} placeholder="Parte pagada de contado" /></Field>
                {Number(f.montoInicial) > 0 && (
                  <div style={{ paddingTop: 22 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: C.ink, cursor: "pointer" }}>
                      <input type="checkbox" checked={f.antOn} onChange={(e) => setF({ ...f, antOn: e.target.checked })} />
                      Marcar la inicial como "Ya Pagada"
                    </label>
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 8 }}>
                <Field label="N° de cuotas (del saldo)"><Input type="number" value={f.numCuotas} onChange={e => setF({...f, numCuotas: e.target.value})} /></Field>
                <Field label="Frecuencia"><Select value={f.frecuencia} onChange={e => setF({...f, frecuencia: e.target.value})}><option value="MENSUAL">Mensual</option><option value="QUINCENAL">Quincenal</option><option value="SEMANAL">Semanal</option></Select></Field>
                <Field label="Vence 1ra cuota el"><Input type="date" value={f.fechaVencimiento} onChange={(e) => setF({ ...f, fechaVencimiento: e.target.value })} /></Field>
              </div>
              <div style={{ fontSize: 12, color: C.greenDk, marginTop: 4, fontWeight: 600 }}>
                El sistema proyectará {f.numCuotas || 0} cuotas de aprox. {money((Number(f.montoOriginal) - Number(f.montoInicial||0)) / (Number(f.numCuotas)||1), f.moneda)}.
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
               <Field label="Fecha límite de pago"><Input type="date" value={f.fechaVencimiento} onChange={(e) => setF({ ...f, fechaVencimiento: e.target.value })} /></Field>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}><Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn><Btn onClick={guardarNuevo}>Generar Deuda</Btn></div>
      </Modal>}

      {modal === "mov" && <Modal title="Registrar pago a Proveedor" onClose={() => setModal(null)}>
        <Field label="Tipo de egreso"><Select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{TIPOS_MOV.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Monto"><Input type="number" value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} /></Field>
        {f.tipo !== "CRUCE" && <Field label="Salió del Banco"><Select value={f.bancoOrigenId} onChange={(e) => setF({ ...f, bancoOrigenId: e.target.value })}><option value="">—</option>{(st.bancos||[]).map((b) => <option key={b.id} value={b.id}>{b.nombre} ({b.moneda})</option>)}</Select></Field>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}><Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn><Btn onClick={() => { if (Number(f.monto) > 0) { act.addMovimiento({ ...f, monto: Number(f.monto) }); setModal(null); } }}>Procesar Pago</Btn></div>
      </Modal>}

      {modal === "asig" && <Modal title="Planificar Banco Pagador" onClose={() => setModal(null)}>
        <Field label="Seleccionar banco para esta cuota"><Select value={f.bancoAsignadoId} onChange={(e) => setF({ ...f, bancoAsignadoId: e.target.value })}><option value="">Sin asignar</option>{(st.bancos||[]).map((b) => <option key={b.id} value={b.id}>{b.nombre} ({b.moneda})</option>)}</Select></Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}><Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn><Btn onClick={() => { act.asignar(f.compromisoId, f.bancoAsignadoId, f.prioridad); setModal(null); }}>Guardar</Btn></div>
      </Modal>}
    </Section>
  );
}

function Corridas({ st, act, rol }) {
  const [sel, setSel] = useState([]);
  const [ver, setVer] = useState(null);
  const puedeAprob = rol === "MASTER";

  const candidatos = (st.compromisos || []).filter((c) => activo(st, c) && !c.corridaId && c.moneda === "BS");
  const toggle = (id) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const crear = () => { if (sel.length) { act.crearCorrida(sel, rol); setSel([]); } };

  const estadoTone = { PENDIENTE_AUTORIZACION: "amar", AUTORIZADA: "green", EJECUTADA: "verde", RECHAZADA: "rojo" };
  const estadoLbl = { PENDIENTE_AUTORIZACION: "Pendiente por autorizar", AUTORIZADA: "Autorizada", EJECUTADA: "Ejecutada", RECHAZADA: "Rechazada" };
  const corrida = ver ? (st.corridas || []).find((c) => c.id === ver) : null;
  const compsDe = (co) => (st.compromisos || []).filter((c) => co.compromisoIds.includes(c.id));

  return (
    <Section title="Corridas de pago" desc="Agrupa compromisos en Bs en un lote y envíalo a autorización de gerencia.">
      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, color: C.greenDk }}>Armar nueva corrida (compromisos en Bs)</div>
          <Btn onClick={crear} disabled={!sel.length}><Layers size={15} /> Crear corrida ({sel.length})</Btn>
        </div>
        {candidatos.length === 0 ? <div style={{ fontSize: 13, color: C.mut, padding: "8px 0" }}>No hay compromisos en Bs disponibles.</div>
          : <div style={{ display: "grid", gap: 6 }}>{candidatos.map((c) => (
            <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", border: `1px solid ${sel.includes(c.id) ? C.green : C.line}`, borderRadius: 9, cursor: "pointer", background: sel.includes(c.id) ? C.greenSoft : "#fff" }}>
              <input type="checkbox" checked={sel.includes(c.id)} onChange={() => toggle(c.id)} /><span style={{ flex: 1, fontSize: 13 }}><b>{provNom(st, c.proveedorId)}</b> · vence {fmtD(c.fechaVencimiento)}</span><span style={{ fontWeight: 700, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{money(pendienteDe(st, c), "BS")}</span>
            </label>
          ))}</div>}
      </Card>

      {(st.corridas || []).length === 0 ? <Empty icon={Layers} title="Sin corridas" msg="Crea tu primera corrida de pago." />
        : <div style={{ display: "grid", gap: 10 }}>{[...(st.corridas || [])].reverse().map((co) => {
          const total = compsDe(co).reduce((a, c) => a + pendienteDe(st, c), 0);
          return (
            <Card key={co.id} style={{ padding: 15 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 16, color: C.ink }}>{co.codigo}</span><Badge tone={estadoTone[co.estado]}>{estadoLbl[co.estado]}</Badge></div>
                  <div style={{ fontSize: 12, color: C.mut, marginTop: 3 }}>{co.compromisoIds.length} compromisos · creada {fmtD(co.fechaCreacion)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 700, color: C.ink }}>{money(total, "BS")}</span><Btn small variant="ghost" onClick={() => setVer(co.id)}>Ver detalle</Btn></div>
              </div>
            </Card>
          );
        })}</div>}

      {corrida && <Modal title={`Corrida ${corrida.codigo}`} wide onClose={() => setVer(null)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><Badge tone={estadoTone[corrida.estado]}>{estadoLbl[corrida.estado]}</Badge><div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700 }}>{money(compsDe(corrida).reduce((a, c) => a + pendienteDe(st, c), 0), "BS")}</div></div>
        <div style={{ overflowX: "auto", border: `1px solid ${C.line}`, borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Proveedor</Th><Th>Concepto</Th><Th>Vence</Th><Th right>Monto</Th></tr></thead>
            <tbody>{compsDe(corrida).map((c) => <tr key={c.id}><Td bold>{provNom(st, c.proveedorId)}</Td><Td>{c.descripcion}</Td><Td>{fmtD(c.fechaVencimiento)}</Td><Td right>{money(pendienteDe(st, c), "BS")}</Td></tr>)}</tbody>
          </table>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {corrida.estado === "PENDIENTE_AUTORIZACION" && puedeAprob && <><Btn variant="danger" onClick={() => { act.rechazarCorrida(corrida.id); setVer(null); }}>Rechazar</Btn><Btn variant="gold" onClick={() => { act.aprobarCorrida(corrida.id, rol); }}><ShieldCheck size={15} /> Aprobar corrida</Btn></>}
          {corrida.estado === "AUTORIZADA" && <Btn onClick={() => { act.ejecutarCorrida(corrida.id); setVer(null); }}><Check size={15} /> Marcar transferencias ejecutadas</Btn>}
        </div>
      </Modal>}
    </Section>
  );
}

function Equipo({ meId }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { listProfiles().then(setRows).catch(console.error); }, []);
  const cambiar = async (id, rol) => { await setProfileRole(id, rol); setRows(await listProfiles()); };
  return (
    <Section title="Equipo y accesos" desc="Asigna el rol que define qué puede ver y hacer cada usuario.">
      {!rows ? <div style={{ color: C.mut, fontSize: 13, padding: "8px 0" }}>Cargando…</div>
        : <Card><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Usuario</Th><Th>Alta</Th><Th>Rol</Th></tr></thead>
          <tbody>{rows.map((p) => (
            <tr key={p.id}>
              <Td bold>{p.email}{p.id === meId ? " (tú)" : ""}</Td><Td>{fmtD((p.created_at || "").slice(0, 10))}</Td>
              <Td><Select value={p.rol} onChange={(e) => cambiar(p.id, e.target.value)}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Td>
            </tr>
          ))}</tbody></table></div></Card>}
    </Section>
  );
}

/* ============================================================
   NUEVO COMPONENTE: LIBRO DE BANCOS (Historial)
   ============================================================ */
function LibroBancos({ st }) {
  const bancos = st.bancos || [];
  const [bancoId, setBancoId] = useState(bancos[0]?.id || "");

  // Si se elimina el banco actual o recién cargan los datos, selecciona el primero válido
  useEffect(() => {
    if (!bancos.find(b => b.id === bancoId) && bancos.length > 0) {
       setBancoId(bancos[0].id);
    }
  }, [bancos, bancoId]);

  const elBanco = bancos.find(b => b.id === bancoId);

  const movsList = useMemo(() => {
    if (!bancoId) return [];
    const list = [];
    
    // Egresos (Pagos a proveedores que salen de este banco)
    (st.movimientos || []).filter(m => m.bancoOrigenId === bancoId).forEach(m => {
       const comp = (st.compromisos || []).find(c => c.id === m.compromisoId);
       list.push({
          id: m.id,
          fecha: m.fecha,
          concepto: `Pago (${m.tipo}) ${m.referencia ? '- Ref: '+m.referencia : ''} ${comp ? " | " + comp.descripcion : ""}`,
          entidad: comp ? provNom(st, comp.proveedorId) : "Desconocido",
          monto: Number(m.monto),
          esIngreso: false
       });
    });

    // Ingresos (Cobranzas de clientes que entran a este banco)
    (st.cobranzas || []).filter(c => c.bancoDestinoId === bancoId).forEach(c => {
       const fac = (st.cuentasCobrar || []).find(f => f.id === c.cuentaCobrarId);
       list.push({
          id: c.id,
          fecha: c.fecha,
          concepto: `Ingreso ${c.descripcion ? '- Ref: '+c.descripcion : ''} ${fac && fac.numeroFactura ? " | Fac: " + fac.numeroFactura : ""}`,
          entidad: provNom(st, c.clienteId),
          monto: Number(c.monto),
          esIngreso: true
       });
    });

    // Ordenar de más reciente a más antiguo
    return list.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [st, bancoId]);

  if (bancos.length === 0) return <Empty icon={Landmark} title="Sin bancos" msg="Registra una cuenta bancaria en la pestaña Ajustes primero." />;

  return (
    <Section title="Libro de Bancos (Estado de Cuenta)" desc="Visualiza el historial combinado de ingresos de clientes y pagos a proveedores por cuenta bancaria.">
      <div style={{ marginBottom: 16 }}>
        <Field label="Seleccionar cuenta bancaria a visualizar">
          <Select value={bancoId} onChange={(e) => setBancoId(e.target.value)} style={{ maxWidth: 400 }}>
            {bancos.map(b => <option key={b.id} value={b.id}>{b.nombre} ({b.moneda})</option>)}
          </Select>
        </Field>
      </div>

      {elBanco && (
        <Card style={{ padding: 18, marginBottom: 16, borderTop: `4px solid ${C.green}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.mut, textTransform: "uppercase" }}>Saldo Actual Registrado</div>
              <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: C.greenDk, marginTop: 4 }}>
                {money(elBanco.saldoActual, elBanco.moneda)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: C.mut }}>Historial combina Cobranzas (Ingresos) y Compras (Pagos)</div>
              <Badge tone="mut">{elBanco.numeroCuenta || "Sin nro de cuenta"}</Badge>
            </div>
          </div>
        </Card>
      )}

      {movsList.length === 0 ? <Empty icon={FileText} title="Sin movimientos" msg="No hay operaciones (ingresos ni egresos) registradas para esta cuenta bancaria." /> : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr><Th>Fecha</Th><Th>Contacto (Cliente/Prov)</Th><Th>Concepto / Referencia</Th><Th right>Ingreso (+)</Th><Th right>Egreso (-)</Th></tr>
              </thead>
              <tbody>
                {movsList.map(m => (
                  <tr key={m.id}>
                    <Td>{fmtD(m.fecha)}</Td>
                    <Td bold>{m.entidad}</Td>
                    <Td><div style={{ fontSize: 12 }}>{m.concepto}</div></Td>
                    <Td right>{m.esIngreso ? <span style={{ color: C.verde, fontWeight: 700 }}>+{money(m.monto, elBanco?.moneda)}</span> : <span style={{ color: C.line }}>—</span>}</Td>
                    <Td right>{!m.esIngreso ? <span style={{ color: C.rojo, fontWeight: 700 }}>-{money(m.monto, elBanco?.moneda)}</span> : <span style={{ color: C.line }}>—</span>}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Section>
  );
}

/* ============================================================
   MÓDULOS AGRUPADORES
   ============================================================ */

function ModuloTesoreria({ st, act, rol }) {
  const [sub, setSub] = useState("cxc");
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: `1px solid ${C.line}`, paddingBottom: 14, overflowX: "auto" }}>
        <Btn small variant={sub === "cxc" ? "primary" : "ghost"} onClick={() => setSub("cxc")}><Receipt size={14} /> Cuentas por Cobrar (Ventas)</Btn>
        <Btn small variant={sub === "cob" ? "primary" : "ghost"} onClick={() => setSub("cob")}><TrendingUp size={14} /> Cobranzas (Ingresos)</Btn>
        <Btn small variant={sub === "cor" ? "primary" : "ghost"} onClick={() => setSub("cor")}><Layers size={14} /> Corridas de Pago a Proveedores</Btn>
        <Btn small variant={sub === "lib" ? "primary" : "ghost"} onClick={() => setSub("lib")}><Wallet size={14} /> Libro de Bancos</Btn>
      </div>
      {sub === "cxc" && <CuentasPorCobrar st={st} act={act} rol={rol} />}
      {sub === "cob" && <Cobranzas st={st} act={act} />}
      {sub === "cor" && <Corridas st={st} act={act} rol={rol} />}
      {sub === "lib" && <LibroBancos st={st} />}
    </div>
  );
}

function ModuloAjustes({ st, act, rol, meId }) {
  const [sub, setSub] = useState("tasas");
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: `1px solid ${C.line}`, paddingBottom: 14, overflowX: "auto" }}>
        <Btn small variant={sub === "tasas" ? "primary" : "ghost"} onClick={() => setSub("tasas")}><Settings size={14} /> Tasas de Cambio</Btn>
        <Btn small variant={sub === "bancos" ? "primary" : "ghost"} onClick={() => setSub("bancos")}><Landmark size={14} /> Bancos</Btn>
        <Btn small variant={sub === "contactos" ? "primary" : "ghost"} onClick={() => setSub("contactos")}><Users size={14} /> Gestor de Contactos</Btn>
        {rol === "MASTER" && <Btn small variant={sub === "equipo" ? "primary" : "ghost"} onClick={() => setSub("equipo")}><UserCog size={14} /> Equipo y Accesos</Btn>}
      </div>
      {sub === "tasas" && <AjustesTasas st={st} act={act} />}
      {sub === "bancos" && <Bancos st={st} act={act} rol={rol} />}
      {sub === "contactos" && <GestorContactos st={st} act={act} rol={rol} />}
      {sub === "equipo" && rol === "MASTER" && <Equipo meId={meId} />}
    </div>
  );
}

/* ============================================================
   ESTADO INICIAL
   ============================================================ */
const EMPTY = { config: { tasaBCV: 40, tasaIntervencion: 42, tasaParalelo: 45, moneda: "USD" }, bancos: [], proveedores: [], compromisos: [], cuentasCobrar: [], movimientos: [], corridas: [], cobranzas: [], log: [], seq: 0 };

/* ============================================================
   APP PRINCIPAL (Workspace)
   ============================================================ */
export default function Workspace() {
  const { role, user, signOut } = useAuth();
  const rol = role || "COMPRAS";
  const [st, setSt] = useState(EMPTY);
  const [tab, setTab] = useState("dashboard");
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(true);
  const savingRef = useRef(false);
  const isLocalChange = useRef(false);
  const meId = user?.id;

  useEffect(() => {
    let unsub;
    (async () => {
      try { const s = await loadState(); if (s) setSt(s); } catch (e) { /* vacio */ }
      setLoaded(true);
      unsub = subscribeState((data) => { 
        if (data && !savingRef.current) { isLocalChange.current = false; setSt(data); }
      });
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  useEffect(() => {
    if (!loaded || !isLocalChange.current) return; 
    setSaved(false);
    const t = setTimeout(async () => {
      try {
        savingRef.current = true;
        await saveState(st, meId);
        setSaved(true);
        isLocalChange.current = false; 
      } catch (e) {
        setSaved(false);
      } finally {
        savingRef.current = false;
      }
    }, 800);
    return () => clearTimeout(t);
  }, [st, loaded, meId]);

  const update = (fn) => {
    isLocalChange.current = true;
    setSt((prev) => { const n = JSON.parse(JSON.stringify(prev)); fn(n); return n; });
  };
  
  const gid = (n) => "id_" + (n.seq = (n.seq || 0) + 1);

  const act = {
    setRate: (key, v) => update((n) => { n.config[key] = v; }), 
    addBanco: (d) => update((n) => { if(!n.bancos) n.bancos=[]; n.bancos.push({ ...d, id: gid(n) }); }),
    updBanco: (d) => update((n) => { n.bancos = n.bancos.map((b) => b.id === d.id ? d : b); }),
    delBanco: (id) => update((n) => { n.bancos = n.bancos.filter((b) => b.id !== id); }),
    addProv: (d) => update((n) => { if(!n.proveedores) n.proveedores=[]; n.proveedores.push({ ...d, id: gid(n) }); }),
    updProv: (d) => update((n) => { n.proveedores = n.proveedores.map((p) => p.id === d.id ? { ...p, ...d } : p); }),
    delProv: (id) => update((n) => { n.proveedores = n.proveedores.filter((p) => p.id !== id); }),
    addCxC: (d) => update((n) => { if (!n.cuentasCobrar) n.cuentasCobrar = []; n.cuentasCobrar.push({ ...d, id: gid(n), anulado: false, tasaBcvRegistro: d.moneda === "BS" ? n.config.tasaBCV : null }); }),
    delCxC: (id) => update((n) => { n.cuentasCobrar = n.cuentasCobrar.filter(c => c.id !== id); }),
    addCobranza: (d) => update((n) => {
      if (!n.cobranzas) n.cobranzas = []; n.cobranzas.push({ ...d, id: gid(n) });
      const b = (n.bancos||[]).find((x) => x.id === d.bancoDestinoId);
      if (b) b.saldoActual = Number(b.saldoActual) + Number(d.monto);
    }),
    delCobranza: (id) => update((n) => {
      const cob = n.cobranzas.find(c => c.id === id);
      if (cob) {
        const b = n.bancos.find(x => x.id === cob.bancoDestinoId);
        if (b) b.saldoActual = Number(b.saldoActual) - Number(cob.monto);
        n.cobranzas = n.cobranzas.filter(c => c.id !== id);
      }
    }),
    
    // Novedad: Recibe un array de compromisos (para el financiamiento)
    addCompromisoMulti: (lista) => update((n) => {
      if(!n.compromisos) n.compromisos=[]; if(!n.movimientos) n.movimientos=[];
      lista.forEach(obj => {
        const id = gid(n);
        const d = obj.data;
        n.compromisos.push({ ...d, id, anulado: false, corridaId: null, bancoAsignadoId: d.bancoAsignadoId || null, tasaBcvRegistro: d.moneda === "BS" ? n.config.tasaBCV : null });
        if (obj.anticipo && Number(obj.anticipo.monto) > 0) {
          n.movimientos.push({ id: gid(n), compromisoId: id, tipo: obj.anticipo.tipo || "ANTICIPO", monto: Number(obj.anticipo.monto), moneda: d.moneda, bancoOrigenId: obj.anticipo.bancoOrigenId || null, fecha: obj.anticipo.fecha || new Date().toISOString().slice(0, 10), referencia: obj.anticipo.referencia || "" });
        }
      });
    }),

    delCompromiso: (id) => update((n) => { n.compromisos = n.compromisos.filter((c) => c.id !== id); }),
    asignar: (id, bancoId, prioridad) => update((n) => { n.compromisos = n.compromisos.map((c) => c.id === id ? { ...c, bancoAsignadoId: bancoId || null, prioridad } : c); }),
    addMovimiento: (d) => update((n) => { if(!n.movimientos) n.movimientos=[]; n.movimientos.push({ ...d, id: gid(n), fecha: d.fecha || new Date().toISOString().slice(0, 10) }); }),
    crearCorrida: (ids, usuario) => update((n) => {
      if(!n.corridas) n.corridas=[];
      const cid = gid(n); const codigo = "CP-" + new Date().getFullYear() + "-" + String(n.corridas.length + 1).padStart(3, "0");
      n.corridas.push({ id: cid, codigo, moneda: "BS", estado: "PENDIENTE_AUTORIZACION", creadoPor: usuario, fechaCreacion: new Date().toISOString().slice(0, 10), autorizadoPor: null, fechaAutorizacion: null, compromisoIds: ids });
      n.compromisos = n.compromisos.map((c) => ids.includes(c.id) ? { ...c, corridaId: cid } : c);
    }),
    aprobarCorrida: (id, usuario) => update((n) => { n.corridas = n.corridas.map((c) => c.id === id ? { ...c, estado: "AUTORIZADA", autorizadoPor: usuario, fechaAutorizacion: new Date().toISOString().slice(0, 10) } : c); }),
    rechazarCorrida: (id) => update((n) => {
      const co = n.corridas.find((c) => c.id === id);
      n.corridas = n.corridas.map((c) => c.id === id ? { ...c, estado: "RECHAZADA" } : c);
      n.compromisos = n.compromisos.map((c) => co.compromisoIds.includes(c.id) ? { ...c, corridaId: null } : c);
    }),
    ejecutarCorrida: (id) => update((n) => {
      const co = n.corridas.find((c) => c.id === id);
      co.compromisoIds.forEach((cid) => {
        const c = n.compromisos.find((x) => x.id === cid);
        const pagado = n.movimientos.filter((m) => m.compromisoId === cid).reduce((a, m) => a + Number(m.monto), 0);
        const pend = c.montoOriginal - pagado;
        if (pend > 0) n.movimientos.push({ id: gid(n), compromisoId: cid, tipo: "TRANSFERENCIA", monto: pend, moneda: c.moneda, bancoOrigenId: c.bancoAsignadoId, fecha: new Date().toISOString().slice(0, 10), referencia: co.codigo });
      });
      n.corridas = n.corridas.map((c) => c.id === id ? { ...c, estado: "EJECUTADA" } : c);
    })
  };

  const navVisible = NAV.filter((n) => n.roles.includes(rol));
  useEffect(() => { if (!navVisible.find((n) => n.id === tab)) setTab(navVisible[0]?.id || "dashboard"); }, [rol]); // eslint-disable-line

  if (!loaded) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, color: C.mut, background: C.paper }}>Cargando datos…</div>;

  return (
    <div style={{ fontFamily: SANS, background: C.paper, minHeight: "100vh", color: C.ink }}>
      <header style={{ background: C.green, color: "#fff", padding: "12px 20px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontWeight: 800, fontSize: 20, color: "#fff" }}>M</div>
            <div>
              <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>El Maizalito · CAD</div>
              <div style={{ fontSize: 11.5, opacity: 0.85 }}>Soporte financiero y proyección de pagos</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.12)", borderRadius: 9, padding: "5px 10px" }}>
              <span style={{ fontSize: 11.5, opacity: 0.9 }}>BCV</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{nf.format(Number(st.config.tasaBCV) || 0)}</span>
            </div>
            <div style={{ textAlign: "right", lineHeight: 1.15 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{ROLES[rol]}</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>{user?.email}</div>
            </div>
            <button onClick={signOut} title="Cerrar sesión" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><LogOut size={14} /> Salir</button>
          </div>
        </div>
      </header>

      <nav style={{ background: "#fff", borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 12px", display: "flex", gap: 2, overflowX: "auto" }}>
          {navVisible.map((n) => {
            const on = tab === n.id;
            return (
              <button key={n.id} onClick={() => setTab(n.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "13px 14px", display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 600, fontFamily: SANS, color: on ? C.green : C.mut, borderBottom: `2.5px solid ${on ? C.green : "transparent"}`, whiteSpace: "nowrap" }}>
                <n.icon size={16} /> {n.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "10px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12, color: C.mut, display: "flex", alignItems: "center", gap: 6 }}>
          <ShieldCheck size={13} color={C.green} /> Operando como <b style={{ color: C.ink }}>{ROLES[rol]}</b> · datos compartidos en tiempo real
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11.5, color: C.mut }}>{saved ? "Guardado" : "Guardando…"}</span>
        </div>
      </div>

      <main style={{ maxWidth: 1160, margin: "0 auto", padding: "18px 20px 60px" }}>
        {tab === "dashboard" && <Tablero st={st} />}
        {tab === "compras" && <Compromisos st={st} act={act} rol={rol} />}
        {tab === "tesoreria" && <ModuloTesoreria st={st} act={act} rol={rol} />}
        {tab === "directorio" && <Directorio st={st} />}
        {tab === "ajustes" && <ModuloAjustes st={st} act={act} rol={rol} meId={meId} />}
      </main>
    </div>
  );
}