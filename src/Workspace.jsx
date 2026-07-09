import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import {
  LayoutDashboard, Landmark, Users, FileText, CalendarClock, Layers,
  Plus, Trash2, Pencil, X, ShieldCheck, Lock, Check, ArrowRightLeft,
  Wallet, TrendingUp, TrendingDown, Building2, Sparkles, LogOut, UserCog, Settings, Receipt,
  ChevronLeft, ChevronRight, ArrowDownLeft, ArrowUpRight, Search, Wallet2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { useAuth } from "./auth.jsx";
import { loadState, saveState, subscribeState, listProfiles, setProfileRole } from "./store.js";

/* ============================================================
   PALETA CAD · El Maizalito
   ============================================================ */
const C = {
  green: "#1B5E20", greenDk: "#0F3D14", greenSoft: "#E8F1E9",
  gold: "#B8860B", goldSoft: "#F7EFDA",
  paper: "#F6F7F3", ink: "#1F2933", mut: "#6B7A70", line: "#E4E7DF",
  rojo: "#B23B2E", amar: "#C08A00", verde: "#16803C", azul: "#1e40af", azulSoft: "#dbeafe",
  rojoSoft: "#FBEAE7", amarSoft: "#FBF2DA", verdeSoft: "#E6F4EA",
};
const SERIF = "'Iowan Old Style','Palatino Linotype','Book Antiqua',Georgia,serif";
const SANS = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
const RADIUS = 16;
const SHADOW = "0 1px 2px rgba(16,32,20,0.04), 0 12px 32px rgba(16,32,20,0.07)";
const SHADOW_SM = "0 1px 2px rgba(16,32,20,0.06)";
const LOGO = "data:image/png;base64,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";

/* ============================================================
   UTILIDADES
   ============================================================ */
const nf = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 });
const money = (n, m = "USD") => (m === "BS" ? "Bs " : m === "EUR" ? "€ " : "$ ") + nf.format(Number(n || 0));
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
const tasaDe = (st, c) => Number(c.tasaBcvRegistro || st.config.tasaBCV) || 1;
function usdComp(st, c) { return c.moneda === "USD" ? pendienteDe(st, c) : pendienteDe(st, c) / tasaDe(st, c); }
const pedidosProv = (st, pid) => (st.compromisos || []).filter((c) => c.proveedorId === pid && !c.anulado);
const usdPagado = (st, c) => c.moneda === "USD" ? pagadoDe(st, c.id) : pagadoDe(st, c.id) / tasaDe(st, c);
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
const tasaCxC = (st, c) => Number(c.tasaBcvRegistro || st.config.tasaBCV) || 1;
const usdCxCPendiente = (st, c) => c.moneda === "USD" ? pendienteCxC(st, c) : pendienteCxC(st, c) / tasaCxC(st, c);
const usdCxCCobrado = (st, c) => c.moneda === "USD" ? cobradoDeCxC(st, c.id) : cobradoDeCxC(st, c.id) / tasaCxC(st, c);
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

// Estado de cuenta (ledger con saldo corrido en USD equivalente)
function ledgerProv(st, p) {
  const rows = [];
  pedidosProv(st, p.id).forEach((c) => {
    const t = tasaDe(st, c);
    rows.push({ fecha: c.fechaPedido || c.fechaVencimiento, tipo: "Compra", doc: c.numeroPedidoOdoo || "—", detalle: c.descripcion || "Pedido de compra", moneda: c.moneda, cargo: Number(c.montoOriginal), abono: 0, usd: c.moneda === "USD" ? Number(c.montoOriginal) : Number(c.montoOriginal) / t });
    movsDe(st, c.id).forEach((m) => {
      const mu = m.moneda === "USD" ? Number(m.monto) : Number(m.monto) / t;
      rows.push({ fecha: m.fecha, tipo: m.tipo === "CRUCE" ? "Cruce" : "Pago", doc: m.referencia || "—", detalle: c.numeroPedidoOdoo ? "Pedido " + c.numeroPedidoOdoo : (c.descripcion || "Pago"), moneda: m.moneda, cargo: 0, abono: Number(m.monto), usd: -mu });
    });
  });
  rows.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
  let s = 0; rows.forEach((r) => { s += r.usd; r.saldo = s; });
  return rows;
}
function ledgerCli(st, p) {
  const rows = [];
  cxcDeCli(st, p.id).forEach((c) => {
    const t = tasaCxC(st, c);
    rows.push({ fecha: c.fechaEmision || c.fechaVencimiento, tipo: "Factura", doc: c.numeroFactura || "—", detalle: c.descripcion || "Factura de venta", moneda: c.moneda, cargo: Number(c.montoOriginal), abono: 0, usd: c.moneda === "USD" ? Number(c.montoOriginal) : Number(c.montoOriginal) / t });
  });
  (st.cobranzas || []).filter((c) => c.clienteId === p.id).forEach((m) => {
    const mu = m.moneda === "USD" ? Number(m.monto) : Number(m.monto) / (Number(st.config.tasaBCV) || 1);
    rows.push({ fecha: m.fecha, tipo: "Cobro", doc: m.descripcion || "—", detalle: "Cobranza recibida", moneda: m.moneda, cargo: 0, abono: Number(m.monto), usd: -mu });
  });
  rows.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
  let s = 0; rows.forEach((r) => { s += r.usd; r.saldo = s; });
  return rows;
}

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
  const base = { border: "1px solid transparent", borderRadius: 10, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1, fontFamily: SANS, display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", transition: "transform .05s" };
  const pad = small ? { padding: "6px 11px", fontSize: 12.5 } : { padding: "9px 15px", fontSize: 13.5 };
  const styles = {
    primary: { background: C.green, color: "#fff", boxShadow: "0 1px 2px rgba(27,94,32,.35)" },
    gold: { background: C.gold, color: "#fff", boxShadow: "0 1px 2px rgba(184,134,11,.35)" },
    ghost: { background: "#fff", color: C.ink, borderColor: C.line },
    soft: { background: C.greenSoft, color: C.greenDk },
    danger: { background: "#fff", color: C.rojo, borderColor: "#EBC7C1" },
  };
  return <button title={title} disabled={disabled} onClick={onClick} style={{ ...base, ...pad, ...styles[variant] }}>{children}</button>;
}
function Badge({ tone, children }) {
  const map = { verde: [C.verde, C.verdeSoft], amar: [C.amar, C.amarSoft], rojo: [C.rojo, C.rojoSoft], green: [C.greenDk, C.greenSoft], gold: [C.gold, C.goldSoft], mut: [C.mut, "#EEF1EC"], azul: [C.azul, C.azulSoft] };
  const [fg, bg] = map[tone] || map.mut;
  return <span style={{ color: fg, background: bg, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, letterSpacing: 0.2, whiteSpace: "nowrap" }}>{children}</span>;
}
function Card({ children, style }) { return <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: RADIUS, boxShadow: SHADOW, ...style }}>{children}</div>; }
function Field({ label, children, hint }) {
  return (
    <label style={{ display: "block", marginBottom: 13 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.mut, marginBottom: 5, letterSpacing: 0.2 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, color: C.mut, marginTop: 4 }}>{hint}</div>}
    </label>
  );
}
const inputStyle = { width: "100%", padding: "9px 11px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 13.5, fontFamily: SANS, color: C.ink, background: "#fff", boxSizing: "border-box" };
function Input(p) { return <input {...p} style={{ ...inputStyle, ...(p.style || {}) }} />; }
function Select({ children, ...p }) { return <select {...p} style={{ ...inputStyle, ...(p.style || {}) }}>{children}</select>; }
function Modal({ title, onClose, children, wide }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,30,16,0.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "5vh 16px", zIndex: 50, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: wide ? 900 : 480, boxShadow: "0 24px 70px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 700, color: C.greenDk }}>{title}</div>
          <button onClick={onClose} style={{ background: C.paper, border: `1px solid ${C.line}`, width: 32, height: 32, borderRadius: 9, cursor: "pointer", color: C.mut, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
        </div>
        <div style={{ padding: 22, maxHeight: "80vh", overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
function Empty({ icon: Icon, title, msg, action }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px" }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: C.greenSoft, display: "inline-flex", alignItems: "center", justifyContent: "center", color: C.green }}><Icon size={27} /></div>
      <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: C.ink, marginTop: 14 }}>{title}</div>
      <div style={{ color: C.mut, fontSize: 13.5, marginTop: 6, maxWidth: 420, marginInline: "auto" }}>{msg}</div>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
function Th({ children, right }) { return <th style={{ textAlign: right ? "right" : "left", fontSize: 11, color: C.mut, fontWeight: 700, padding: "11px 14px", borderBottom: `1px solid ${C.line}`, letterSpacing: 0.4, textTransform: "uppercase", background: "#FCFDFB", position: "sticky", top: 0 }}>{children}</th>; }
function Td({ children, right, bold }) { return <td style={{ textAlign: right ? "right" : "left", fontSize: 13, padding: "11px 14px", borderBottom: `1px solid ${C.line}`, color: C.ink, fontWeight: bold ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>{children}</td>; }
function Section({ title, desc, action, children }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <div>
          <h2 style={{ fontFamily: SERIF, fontSize: 25, fontWeight: 700, color: C.greenDk, margin: 0 }}>{title}</h2>
          {desc && <p style={{ color: C.mut, fontSize: 13.5, margin: "5px 0 0", maxWidth: 680 }}>{desc}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: "inline-flex", background: "#ECEFEA", border: `1px solid ${C.line}`, borderRadius: 12, padding: 4, gap: 2, flexWrap: "wrap" }}>
      {options.map((o) => {
        const on = value === o.id; const Ic = o.icon;
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "none", cursor: "pointer", borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 600, fontFamily: SANS, whiteSpace: "nowrap", background: on ? "#fff" : "transparent", color: on ? C.greenDk : C.mut, boxShadow: on ? SHADOW_SM : "none" }}>
            {Ic && <Ic size={15} />} {o.label}
          </button>
        );
      })}
    </div>
  );
}
function usePaged(items, size = 10) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(size);
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  useEffect(() => { if (page > pages) setPage(pages); }, [pages, page]);
  const slice = items.slice((page - 1) * perPage, page * perPage);
  return { slice, page, setPage, perPage, setPerPage, pages, total };
}
const pgBtn = (dis) => ({ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.line}`, background: "#fff", color: dis ? "#C9CFC4" : C.ink, cursor: dis ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" });
function Pagination({ pg }) {
  if (pg.total === 0) return null;
  const from = (pg.page - 1) * pg.perPage + 1;
  const to = Math.min(pg.total, pg.page * pg.perPage);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, padding: "12px 14px", borderTop: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 12.5, color: C.mut }}>Mostrando <b style={{ color: C.ink }}>{from}–{to}</b> de {pg.total}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <select value={pg.perPage} onChange={(e) => { pg.setPerPage(Number(e.target.value)); pg.setPage(1); }} style={{ ...inputStyle, width: "auto", padding: "6px 8px", fontSize: 12.5 }}>
          {[10, 20, 50].map((n) => <option key={n} value={n}>{n} / pág.</option>)}
        </select>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => pg.setPage(Math.max(1, pg.page - 1))} disabled={pg.page <= 1} style={pgBtn(pg.page <= 1)}><ChevronLeft size={16} /></button>
          <span style={{ display: "inline-flex", alignItems: "center", padding: "0 10px", fontSize: 13, fontWeight: 600, color: C.ink }}>{pg.page} / {pg.pages}</span>
          <button onClick={() => pg.setPage(Math.min(pg.pages, pg.page + 1))} disabled={pg.page >= pg.pages} style={pgBtn(pg.page >= pg.pages)}><ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}
function KpiCard({ t, v, ic: Ic, tone, sub }) {
  return (
    <Card style={{ padding: 18, borderTop: `3px solid ${tone}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 0.3 }}>{t}</div>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: tone + "18", display: "inline-flex", alignItems: "center", justifyContent: "center", color: tone }}><Ic size={18} /></div>
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 29, fontWeight: 700, color: tone, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>{money(v, "USD")}</div>
      <div style={{ fontSize: 11.5, color: C.mut, marginTop: 4 }}>{sub}</div>
    </Card>
  );
}

/* ============================================================
   VISTAS
   ============================================================ */

function AjustesTasas({ st, act }) {
  const rates = [{ k: "tasaBCV", lbl: "BCV (oficial)", tone: C.green }, { k: "tasaIntervencion", lbl: "Intervención", tone: C.gold }, { k: "tasaParalelo", lbl: "Mercado paralelo", tone: C.rojo }];
  return (
    <Section title="Tasas de Cambio" desc="Ajusta las tasas del día. Esto revaloriza en tiempo real la deuda en bolívares y sus equivalentes en dólares.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        {rates.map((r) => (
          <Card key={r.k} style={{ padding: 18, borderTop: `4px solid ${r.tone}` }}>
            <div style={{ fontSize: 12, color: C.mut, fontWeight: 700, marginBottom: 8, letterSpacing: 0.2 }}>{r.lbl}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 15, color: C.mut, fontWeight: 600 }}>Bs</span>
              <input type="number" value={st.config[r.k] ?? ""} onChange={(e) => act.setRate(r.k, e.target.value)}
                style={{ width: "100%", border: "none", borderBottom: `2px solid ${C.line}`, fontFamily: SERIF, fontSize: 30, fontWeight: 700, color: r.tone, background: "transparent", padding: "2px 0", outline: "none", fontVariantNumeric: "tabular-nums" }} />
            </div>
            <div style={{ fontSize: 11.5, color: C.mut, marginTop: 8 }}>1 USD = {nf.format(Number(st.config[r.k]) || 0)} Bs</div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function Tablero({ st }) {
  const [semanas, setSemanas] = useState(12);
  const [estres, setEstres] = useState(false);

  const kpi = useMemo(() => {
    const disp = (st.bancos || []).reduce((a, b) => a + brutoUSD(st, b), 0);
    const comp = (st.compromisos || []).filter((c) => activo(st, c) && !(estres && c.prioridad === "FLEXIBLE")).reduce((a, c) => a + usdComp(st, c), 0);
    const cobrar = (st.cuentasCobrar || []).filter((c) => activoCxC(st, c)).reduce((a, c) => a + usdCxCPendiente(st, c), 0);
    return { disp, comp, cobrar, neto: disp + cobrar - comp };
  }, [st, estres]);

  const proj = useMemo(() => {
    const t = hoy0(); const w0 = startWeek(t);
    const arr = Array.from({ length: semanas }, (_, i) => ({ name: "S" + (i + 1), ingreso: 0, egreso: 0 }));
    let vEg = 0, vIn = 0;
    (st.compromisos || []).filter((c) => activo(st, c) && !(estres && c.prioridad === "FLEXIBLE")).forEach((c) => {
      const idx = Math.floor(diasEntre(w0, parseD(c.fechaVencimiento)) / 7);
      const v = usdComp(st, c); if (idx < 0) vEg += v; else if (idx < semanas) arr[idx].egreso += v;
    });
    (st.cuentasCobrar || []).filter((c) => activoCxC(st, c)).forEach((c) => {
      const idx = Math.floor(diasEntre(w0, parseD(c.fechaVencimiento)) / 7);
      const v = usdCxCPendiente(st, c); if (idx < 0) vIn += v; else if (idx < semanas) arr[idx].ingreso += v;
    });
    return [{ name: "Venc.", ingreso: vIn, egreso: vEg }, ...arr];
  }, [st, semanas, estres]);

  const totIn = proj.reduce((a, r) => a + r.ingreso, 0);
  const totEg = proj.reduce((a, r) => a + r.egreso, 0);

  if ((st.bancos || []).length === 0 && (st.proveedores || []).length === 0)
    return <Empty icon={LayoutDashboard} title="Aún no hay datos operativos" msg="Ve a Ajustes y registra bancos y contactos para comenzar a proyectar tu caja." />;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14, marginBottom: 16 }}>
        <KpiCard t="Disponible en bancos" v={kpi.disp} ic={Wallet} tone={C.green} sub="Saldo bruto consolidado (USD)" />
        <KpiCard t="Por cobrar" v={kpi.cobrar} ic={ArrowDownLeft} tone={C.verde} sub="Facturas de clientes (USD)" />
        <KpiCard t="Por pagar" v={kpi.comp} ic={ArrowUpRight} tone={C.gold} sub="Egresos pendientes (USD)" />
        <KpiCard t="Posición neta" v={kpi.neto} ic={TrendingUp} tone={kpi.neto >= 0 ? C.verde : C.rojo} sub="Disponible + por cobrar − por pagar" />
      </div>

      <Card style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: C.greenDk }}>Proyección de flujo de caja</div>
            <div style={{ fontSize: 12.5, color: C.mut }}>Ingresos por cobrar vs. egresos por pagar, por semana (USD)</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn small variant={semanas === 4 ? "primary" : "ghost"} onClick={() => setSemanas(4)}>4 sem</Btn>
            <Btn small variant={semanas === 12 ? "primary" : "ghost"} onClick={() => setSemanas(12)}>12 sem</Btn>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, margin: "10px 0 4px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: C.verde }} /><span style={{ fontSize: 12.5, color: C.mut }}>Ingresos <b style={{ color: C.verde }}>{money(totIn)}</b></span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: C.gold }} /><span style={{ fontSize: 12.5, color: C.mut }}>Egresos <b style={{ color: C.gold }}>{money(totEg)}</b></span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 12.5, color: C.mut }}>Balance del período <b style={{ color: (totIn - totEg) >= 0 ? C.verde : C.rojo }}>{money(totIn - totEg)}</b></span></div>
        </div>
        <div style={{ height: 250, marginTop: 8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={proj} margin={{ top: 6, right: 6, left: -12, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.mut }} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: C.mut }} tickFormatter={(v) => (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)} />
              <Tooltip formatter={(v, n) => [money(v, "USD"), n === "ingreso" ? "Ingresos" : "Egresos"]} labelStyle={{ color: C.ink }} contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${C.line}` }} />
              <Bar dataKey="ingreso" fill={C.verde} radius={[4, 4, 0, 0]} />
              <Bar dataKey="egreso" fill={C.gold} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12.5, color: C.ink, cursor: "pointer" }}><input type="checkbox" checked={estres} onChange={(e) => setEstres(e.target.checked)} /><Sparkles size={14} color={C.gold} /> Simular escenario: excluir egresos marcados como flexibles</label>
      </Card>

      {(st.bancos || []).length > 0 && (
        <Card style={{ padding: 20 }}>
          <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: C.greenDk, marginBottom: 4 }}>Saldos disponibles por banco</div>
          <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 12 }}>Disponible neto = saldo real − comprometido. Las cuentas en Bs muestran su equivalente en USD a cada tasa.</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>Banco</Th><Th>Moneda</Th><Th right>Disponible neto</Th><Th right>≈ USD (BCV)</Th><Th right>≈ USD (Interv.)</Th><Th right>≈ USD (Paralelo)</Th></tr></thead>
              <tbody>
                {(st.bancos || []).map((b) => {
                  const comp = comprometidoBanco(st, b); const neto = Number(b.saldoActual) - comp; const esUSD = b.moneda === "USD";
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
    <Section title="Cuentas Bancarias" desc="Registra tus cuentas. Tesorería las usará para emitir pagos o recibir cobranzas." action={<Btn onClick={() => abrir(null)}><Plus size={15} /> Agregar banco</Btn>}>
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

function EstadoCuenta({ rows, positivoEs }) {
  // positivoEs: "deuda" (le debemos / nos deben) — saldo>0 en rojo
  if (rows.length === 0) return <div style={{ color: C.mut, fontSize: 13, padding: "10px 0" }}>Sin movimientos registrados.</div>;
  const saldoFinal = rows[rows.length - 1].saldo;
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ maxHeight: 300, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Fecha</Th><Th>Documento</Th><Th right>Cargo</Th><Th right>Abono</Th><Th right>Saldo (USD)</Th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={i}>
              <Td>{fmtD(r.fecha)}</Td>
              <Td><div style={{ display: "flex", alignItems: "center", gap: 7 }}><Badge tone={r.cargo > 0 ? "gold" : "verde"}>{r.tipo}</Badge><span style={{ fontSize: 12.5 }}>{r.doc}</span></div><div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>{r.detalle}</div></Td>
              <Td right>{r.cargo > 0 ? money(r.cargo, r.moneda) : "—"}</Td>
              <Td right>{r.abono > 0 ? <span style={{ color: C.verde }}>{money(r.abono, r.moneda)}</span> : "—"}</Td>
              <Td right bold><span style={{ color: r.saldo > 0.005 ? C.rojo : C.verde }}>{money(r.saldo, "USD")}</span></Td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#FCFDFB", borderTop: `1px solid ${C.line}` }}>
        <span style={{ fontSize: 12.5, color: C.mut, fontWeight: 600 }}>Saldo actual (equivalente USD)</span>
        <span style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: saldoFinal > 0.005 ? C.rojo : C.verde }}>{money(saldoFinal, "USD")}</span>
      </div>
    </div>
  );
}

function ContactoFicha({ st, prov: p, onClose }) {
  const provMode = esProv(p); const cliMode = esCli(p);
  const [tab, setTab] = useState(provMode ? "prov" : "cli");
  const cuentas = bancosProv(p);
  const rowsProv = useMemo(() => ledgerProv(st, p), [st, p]);
  const rowsCli = useMemo(() => ledgerCli(st, p), [st, p]);

  return (
    <Modal title={p.razonSocial} wide onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {provMode && <Badge tone="gold">Proveedor</Badge>}{cliMode && <Badge tone="verde">Cliente</Badge>}
          <span style={{ fontSize: 12.5, color: C.mut, marginLeft: 6 }}>RIF {p.rif}</span>
          {cuentas.length > 0 && <span style={{ fontSize: 12.5, color: C.mut }}>· {cuentas.map((b) => b.banco).filter(Boolean).join(", ")}</span>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${(provMode ? 1 : 0) + (cliMode ? 1 : 0) + 1}, 1fr)`, gap: 12, marginBottom: 18 }}>
        {provMode && <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px" }}><div style={{ fontSize: 11.5, color: C.mut, fontWeight: 700 }}>LE DEBEMOS</div><div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: pendienteProv(st, p.id) > 0.005 ? C.rojo : C.verde, marginTop: 4 }}>{money(pendienteProv(st, p.id))}</div></div>}
        {cliMode && <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px" }}><div style={{ fontSize: 11.5, color: C.mut, fontWeight: 700 }}>NOS DEBE</div><div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: pendienteCli(st, p.id) > 0.005 ? C.verde : C.mut, marginTop: 4 }}>{money(pendienteCli(st, p.id))}</div></div>}
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px" }}><div style={{ fontSize: 11.5, color: C.mut, fontWeight: 700 }}>BALANCE NETO</div><div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: C.ink, marginTop: 4 }}>{money((cliMode ? pendienteCli(st, p.id) : 0) - (provMode ? pendienteProv(st, p.id) : 0))}</div></div>
      </div>

      {provMode && cliMode && (
        <div style={{ marginBottom: 14 }}><Segmented value={tab} onChange={setTab} options={[{ id: "prov", label: "Cuenta por pagar", icon: ArrowUpRight }, { id: "cli", label: "Cuenta por cobrar", icon: ArrowDownLeft }]} /></div>
      )}

      {(provMode && (!cliMode || tab === "prov")) && (
        <div style={{ marginBottom: cliMode && !provMode ? 0 : 8 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Estado de cuenta — Compras (lo que le pagamos)</div>
          <EstadoCuenta rows={rowsProv} />
        </div>
      )}
      {(cliMode && (!provMode || tab === "cli")) && (
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Estado de cuenta — Ventas (lo que nos paga)</div>
          <EstadoCuenta rows={rowsCli} />
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
  const lista = (st.proveedores || []).filter((p) => { if (filtro === "PROVEEDORES" && !esProv(p)) return false; if (filtro === "CLIENTES" && !esCli(p)) return false; return true; });
  return (
    <Section title="Gestor de Contactos" desc="Crea o edita la base de datos de clientes y proveedores." action={<Btn onClick={() => abrir(null)}><Plus size={15} /> Agregar contacto</Btn>}>
      <div style={{ marginBottom: 12 }}><Segmented value={filtro} onChange={setFiltro} options={[{ id: "TODOS", label: "Todos" }, { id: "PROVEEDORES", label: "Proveedores" }, { id: "CLIENTES", label: "Clientes" }]} /></div>
      {(st.proveedores || []).length === 0 ? <Empty icon={Users} title="Directorio vacío" msg="Registra empresas o personas." action={<Btn onClick={() => abrir(null)}><Plus size={15} /> Agregar contacto</Btn>} />
        : <Card><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>RIF</Th><Th>Razón social</Th><Th>Perfil</Th><Th right>Acciones</Th></tr></thead>
          <tbody>{lista.map((p) => (
            <tr key={p.id}>
              <Td>{p.rif}</Td><Td bold>{p.razonSocial}</Td>
              <Td><div style={{ display: "flex", gap: 4 }}>{esProv(p) && <Badge tone="gold">Prov</Badge>}{esCli(p) && <Badge tone="verde">Cli</Badge>}</div></Td>
              <Td right><div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}><Btn small variant="ghost" onClick={() => abrir(p)}><Pencil size={13} /></Btn><Btn small variant="danger" onClick={() => act.delProv(p.id)}><Trash2 size={13} /></Btn></div></Td>
            </tr>
          ))}</tbody></table></div></Card>}
      {modal && <Modal title={modal === "edit" ? "Editar contacto" : "Agregar contacto"} onClose={() => setModal(null)}>
        <div style={{ display: "flex", gap: 16, marginBottom: 16, background: C.paper, padding: 12, borderRadius: 10, border: `1px solid ${C.line}` }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}><input type="checkbox" checked={f.esProveedor} onChange={(e) => setF({ ...f, esProveedor: e.target.checked })} /> Es Proveedor</label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}><input type="checkbox" checked={f.esCliente} onChange={(e) => setF({ ...f, esCliente: e.target.checked })} /> Es Cliente</label>
        </div>
        <Field label="RIF"><Input value={f.rif} onChange={(e) => setF({ ...f, rif: e.target.value })} placeholder="J-XXXXXXXX-X" /></Field>
        <Field label="Razón social"><Input value={f.razonSocial} onChange={(e) => setF({ ...f, razonSocial: e.target.value })} /></Field>
        {f.esProveedor && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.mut, marginBottom: 6 }}>Cuentas bancarias del proveedor</div>
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
  const [q, setQ] = useState("");
  const base = (st.proveedores || []).filter((p) => {
    if (filtro === "PROVEEDORES" && !esProv(p)) return false;
    if (filtro === "CLIENTES" && !esCli(p)) return false;
    if (q && !((p.razonSocial || "").toLowerCase().includes(q.toLowerCase()) || (p.rif || "").toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  const pg = usePaged(base, 10);
  const provVer = verProv ? (st.proveedores || []).find((p) => p.id === verProv) : null;

  return (
    <Section title="Directorio de Contactos" desc="Busca un proveedor o cliente para ver sus saldos y su estado de cuenta detallado.">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Segmented value={filtro} onChange={setFiltro} options={[{ id: "TODOS", label: "Todos" }, { id: "PROVEEDORES", label: "Proveedores" }, { id: "CLIENTES", label: "Clientes" }]} />
        <div style={{ position: "relative", minWidth: 220, flex: "0 1 300px" }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: 10, color: C.mut }} />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o RIF…" style={{ paddingLeft: 34, marginBottom: 0 }} />
        </div>
      </div>
      {(st.proveedores || []).length === 0 ? <Empty icon={Users} title="Directorio vacío" msg="Ve a Ajustes para registrar empresas o personas." />
        : <Card><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Razón social</Th><Th>Perfil</Th><Th right>Por pagar (USD)</Th><Th right>Por cobrar (USD)</Th><Th right>Estado de cuenta</Th></tr></thead>
          <tbody>{pg.slice.map((p) => {
            const pendProv = esProv(p) ? pendienteProv(st, p.id) : 0;
            const pendCli = esCli(p) ? pendienteCli(st, p.id) : 0;
            return (
              <tr key={p.id}>
                <Td><div style={{ fontWeight: 700 }}>{p.razonSocial}</div><div style={{ fontSize: 11.5, color: C.mut }}>{p.rif}</div></Td>
                <Td><div style={{ display: "flex", gap: 4 }}>{esProv(p) && <Badge tone="gold">Prov</Badge>}{esCli(p) && <Badge tone="verde">Cli</Badge>}</div></Td>
                <Td right bold><span style={{ color: pendProv > 0.005 ? C.rojo : C.mut }}>{pendProv > 0.005 ? money(pendProv) : "—"}</span></Td>
                <Td right bold><span style={{ color: pendCli > 0.005 ? C.verde : C.mut }}>{pendCli > 0.005 ? money(pendCli) : "—"}</span></Td>
                <Td right><Btn small variant="ghost" onClick={() => setVerProv(p.id)}><FileText size={13} /> Ver estado</Btn></Td>
              </tr>
            );
          })}</tbody></table></div><Pagination pg={pg} /></Card>}
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
  const pg = usePaged(lista, 10);

  return (
    <Section title="Cuentas por Cobrar (Ventas)" desc="Registra facturas emitidas a clientes. Se cobran en la pestaña de Cobranzas." action={puedeCrear && <Btn onClick={abrirNuevo} disabled={clientes.length === 0}><Plus size={15} /> Nueva factura</Btn>}>
      <div style={{ marginBottom: 12 }}><Segmented value={filtro} onChange={setFiltro} options={["TODOS", "PENDIENTE", "PARCIAL", "COBRADO"].map((x) => ({ id: x, label: x[0] + x.slice(1).toLowerCase() }))} /></div>
      {lista.length === 0 ? <Empty icon={Receipt} title="Sin facturas" msg="Registra facturas para controlar la deuda de clientes." action={puedeCrear && clientes.length > 0 && <Btn onClick={abrirNuevo}><Plus size={15} /> Nueva factura</Btn>} />
        : <Card><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Cliente / concepto</Th><Th>Factura</Th><Th>Vence</Th><Th right>Total</Th><Th right>Cobrado</Th><Th right>Pendiente</Th><Th>Estado</Th><Th right>Acciones</Th></tr></thead>
          <tbody>{pg.slice.map((c) => {
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
          })}</tbody></table></div><Pagination pg={pg} /></Card>}
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
  const pg = usePaged(lista, 10);
  const bancosFiltrados = (st.bancos || []).filter((b) => b.moneda === f.moneda);
  const cxcPendientes = f.clienteId ? (st.cuentasCobrar || []).filter((c) => c.clienteId === f.clienteId && c.moneda === f.moneda && activoCxC(st, c)) : [];

  return (
    <Section title="Cobranzas (Ingresos)" desc="Registra pagos de clientes cruzados con sus facturas. Suben el saldo del banco destino." action={<Btn onClick={abrir} disabled={(st.bancos || []).length === 0 || clientes.length === 0}><Plus size={15} /> Registrar ingreso</Btn>}>
      {lista.length === 0 ? <Empty icon={TrendingUp} title="Sin cobranzas registradas" msg="No hay ingresos de clientes." action={<Btn onClick={abrir} disabled={(st.bancos || []).length === 0 || clientes.length === 0}><Plus size={15} /> Registrar ingreso</Btn>} />
        : <Card><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Fecha</Th><Th>Cliente</Th><Th>Factura / Concepto</Th><Th>Banco destino</Th><Th right>Monto</Th><Th right>Acciones</Th></tr></thead>
          <tbody>{pg.slice.map((c) => {
            const factura = (st.cuentasCobrar || []).find((x) => x.id === c.cuentaCobrarId);
            return (
              <tr key={c.id}>
                <Td>{fmtD(c.fecha)}</Td><Td bold>{provNom(st, c.clienteId)}</Td>
                <Td><div style={{ fontSize: 12.5 }}>{factura ? <span style={{ fontWeight: 600 }}>Fac: {factura.numeroFactura || "S/N"}</span> : <span style={{ color: C.mut, fontStyle: "italic" }}>Anticipo / Pago libre</span>}</div><div style={{ fontSize: 11.5, color: C.mut }}>{c.descripcion || "—"}</div></Td>
                <Td>{bancoNom(st, c.bancoDestinoId)}</Td><Td right bold><span style={{ color: C.verde }}>+{money(c.monto, c.moneda)}</span></Td>
                <Td right><Btn small variant="danger" onClick={() => { if (window.confirm("¿Revertir cobranza?")) act.delCobranza(c.id); }}><Trash2 size={13} /></Btn></Td>
              </tr>
            );
          })}</tbody></table></div><Pagination pg={pg} /></Card>}
      {modal && <Modal title="Registrar Cobranza" onClose={() => setModal(false)}>
        <Field label="Cliente"><Select value={f.clienteId} onChange={(e) => setF({ ...f, clienteId: e.target.value, cuentaCobrarId: "" })}>{clientes.map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}</Select></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="Moneda del pago"><Select value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value, bancoDestinoId: "", cuentaCobrarId: "" })}><option value="USD">USD</option><option value="BS">Bs</option><option value="EUR">EUR</option></Select></Field><Field label="Fecha de pago"><Input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Field></div>
        <div style={{ background: C.greenSoft, padding: "10px 14px", borderRadius: 10, marginBottom: 14 }}>
          <Field label="Aplicar a factura (opcional)"><Select value={f.cuentaCobrarId} onChange={(e) => { const fac = cxcPendientes.find((x) => x.id === e.target.value); setF({ ...f, cuentaCobrarId: e.target.value, monto: fac ? pendienteCxC(st, fac) : f.monto }); }}><option value="">— Anticipo o libre —</option>{cxcPendientes.map((fac) => <option key={fac.id} value={fac.id}>Fac: {fac.numeroFactura || "S/N"} ({money(pendienteCxC(st, fac), fac.moneda)})</option>)}</Select></Field>
        </div>
        <Field label="Monto recibido"><Input type="number" value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} /></Field>
        <Field label="Descripción / Concepto"><Input value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} placeholder="Ref. Zelle..." /></Field>
        <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 4, paddingTop: 12 }}>
          <Field label="Banco destino"><Select value={f.bancoDestinoId} onChange={(e) => setF({ ...f, bancoDestinoId: e.target.value })}><option value="">— Seleccionar banco —</option>{bancosFiltrados.map((b) => <option key={b.id} value={b.id}>{b.nombre} ({b.moneda})</option>)}</Select></Field>
          {bancosFiltrados.length === 0 && <div style={{ fontSize: 12, color: C.rojo, marginTop: -8, marginBottom: 12 }}>⚠️ No hay bancos en {f.moneda}.</div>}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}><Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn><Btn onClick={guardar} disabled={!f.bancoDestinoId || !f.clienteId || !f.monto}>Registrar</Btn></div>
      </Modal>}
    </Section>
  );
}

/* ---- AGENDA DE PAGOS (mejorada) ---- */
function AgendaPagos({ st }) {
  const [filtroTiempo, setFiltroTiempo] = useState("TODOS");
  const hoy = hoy0();
  const currYear = hoy.getFullYear(), currMonth = hoy.getMonth(), currQuarter = Math.floor(currMonth / 3);
  const w0 = startWeek(hoy); const w1 = new Date(w0); w1.setDate(w1.getDate() + 6);
  const pasaFiltro = (fechaStr) => {
    if (filtroTiempo === "TODOS") return true;
    const d = parseD(fechaStr); if (!d) return false;
    if (filtroTiempo === "VENCIDOS") return d < hoy;
    if (filtroTiempo === "ESTA_SEMANA") return d >= w0 && d <= w1;
    if (filtroTiempo === "ESTE_MES") return d.getFullYear() === currYear && d.getMonth() === currMonth;
    if (filtroTiempo === "ESTE_TRIMESTRE") return d.getFullYear() === currYear && Math.floor(d.getMonth() / 3) === currQuarter;
    if (filtroTiempo === "ESTE_ANO") return d.getFullYear() === currYear;
    return true;
  };
  const ag = { USD: {}, BS: {} };
  (st.compromisos || []).filter((c) => activo(st, c) && pasaFiltro(c.fechaVencimiento)).forEach((c) => {
    const d = parseD(c.fechaVencimiento); const key = d.toISOString().slice(0, 7);
    const target = c.moneda === "USD" ? ag.USD : ag.BS; if (!target[key]) target[key] = []; target[key].push(c);
  });
  const keysUSD = Object.keys(ag.USD).sort(); const keysBS = Object.keys(ag.BS).sort();
  const nMonth = (k) => new Date(k + "-02").toLocaleString("es-VE", { month: "long", year: "numeric" }).toUpperCase();
  const totCol = (keys, data) => keys.reduce((a, k) => a + data[k].reduce((s, c) => s + pendienteDe(st, c), 0), 0);
  const cntCol = (keys, data) => keys.reduce((a, k) => a + data[k].length, 0);

  const Columna = ({ titulo, llaves, data, color, colorSoft, moneda }) => (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${C.line}`, borderTop: `4px solid ${color}` }}>
        <div><div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: C.ink }}>{titulo}</div><div style={{ fontSize: 11.5, color: C.mut }}>{cntCol(llaves, data)} pago(s) programado(s)</div></div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 10.5, color: C.mut, fontWeight: 700, letterSpacing: 0.3 }}>TOTAL</div><div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color }}>{money(totCol(llaves, data), moneda)}</div></div>
      </div>
      <div style={{ padding: 16 }}>
        {llaves.length === 0 ? <div style={{ fontSize: 13, color: C.mut, fontStyle: "italic", padding: "8px 2px" }}>Sin pagos en este período.</div>
          : llaves.map((mes) => {
            const arr = data[mes].sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || ""));
            const totalMes = arr.reduce((a, c) => a + pendienteDe(st, c), 0);
            return (
              <div key={mes} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: colorSoft, padding: "6px 12px", borderRadius: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color, letterSpacing: 0.5 }}>{nMonth(mes)}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{money(totalMes, moneda)}</span>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {arr.map((c) => {
                    const dv = diasEntre(hoy, parseD(c.fechaVencimiento));
                    const venc = dv < 0, prox = dv >= 0 && dv <= 7;
                    return (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 11px", border: `1px solid ${venc ? "#EBC7C1" : C.line}`, background: venc ? C.rojoSoft : "#fff", borderRadius: 10 }}>
                        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{provNom(st, c.proveedorId)}</div>
                          <div style={{ fontSize: 11, color: C.mut, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {fmtD(c.fechaVencimiento)}
                            {venc ? <Badge tone="rojo">Vencido {Math.abs(dv)}d</Badge> : prox ? <Badge tone="amar">En {dv}d</Badge> : null}
                          </div>
                        </div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{money(pendienteDe(st, c), moneda)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </Card>
  );

  const botones = [{ id: "VENCIDOS", label: "Vencidos" }, { id: "ESTA_SEMANA", label: "Esta semana" }, { id: "ESTE_MES", label: "Este mes" }, { id: "ESTE_TRIMESTRE", label: "Trimestre" }, { id: "ESTE_ANO", label: "Este año" }, { id: "TODOS", label: "Todos" }];
  return (
    <div>
      <div style={{ marginBottom: 16 }}><Segmented value={filtroTiempo} onChange={setFiltroTiempo} options={botones} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 16 }}>
        <Columna titulo="Deuda en Dólares" llaves={keysUSD} data={ag.USD} color={C.green} colorSoft={C.greenSoft} moneda="USD" />
        <Columna titulo="Deuda en Bolívares" llaves={keysBS} data={ag.BS} color={C.azul} colorSoft={C.azulSoft} moneda="BS" />
      </div>
    </div>
  );
}

function Compromisos({ st, act, rol }) {
  const [modal, setModal] = useState(null);
  const [f, setF] = useState({});
  const [filtro, setFiltro] = useState("TODOS");
  const [vista, setVista] = useState("lista");
  const puedeCrear = rol === "COMPRAS" || rol === "MASTER";
  const puedeTeso = rol === "TESORERIA" || rol === "MASTER";
  const proveedores = (st.proveedores || []).filter(esProv);

  const abrirNuevo = () => { setF({ proveedorId: proveedores[0]?.id || "", numeroPedidoOdoo: "", descripcion: "", categoria: CLASIF[0], montoOriginal: "", moneda: "USD", fechaPedido: new Date().toISOString().slice(0, 10), fechaVencimiento: new Date().toISOString().slice(0, 10), prioridad: "NORMAL", enCuotas: false, numCuotas: 2, frecuencia: "MENSUAL", montoInicial: "", antOn: false }); setModal("new"); };
  const guardarNuevo = () => {
    if (!f.proveedorId || !f.montoOriginal) return;
    if (f.enCuotas) {
      let listaCuotas = [];
      const numCuotas = Number(f.numCuotas) || 1;
      const montoInicial = Number(f.montoInicial || 0);
      const montoRestante = Number(f.montoOriginal) - montoInicial;
      const montoPorCuota = montoRestante / numCuotas;
      if (montoInicial > 0) listaCuotas.push({ data: { ...f, descripcion: `${f.descripcion} (Inicial)`, montoOriginal: montoInicial, fechaVencimiento: f.fechaPedido }, anticipo: f.antOn ? { monto: montoInicial, fecha: f.fechaPedido, tipo: "TRANSFERENCIA", bancoOrigenId: null, referencia: "Pago Inicial" } : null });
      let d = new Date(f.fechaVencimiento + "T00:00:00");
      for (let i = 1; i <= numCuotas; i++) {
        listaCuotas.push({ data: { ...f, descripcion: `${f.descripcion} (Cuota ${i}/${numCuotas})`, montoOriginal: montoPorCuota, fechaVencimiento: d.toISOString().slice(0, 10) }, anticipo: null });
        if (f.frecuencia === "MENSUAL") d.setMonth(d.getMonth() + 1); else if (f.frecuencia === "QUINCENAL") d.setDate(d.getDate() + 15); else if (f.frecuencia === "SEMANAL") d.setDate(d.getDate() + 7);
      }
      act.addCompromisoMulti(listaCuotas);
    } else {
      act.addCompromisoMulti([{ data: { ...f, montoOriginal: Number(f.montoOriginal) }, anticipo: null }]);
    }
    setModal(null);
  };

  const bloqueado = (c) => { const co = (st.corridas || []).find((x) => x.id === c.corridaId); return co && ["AUTORIZADA", "EJECUTADA"].includes(co.estado); };
  const pasa = (c) => { const e = estadoDe(st, c); return filtro === "TODOS" ? e !== "ANULADO" : e === filtro; };
  const lista = (st.compromisos || []).filter((c) => !c.anulado && pasa(c)).sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || ""));
  const pg = usePaged(lista, 10);

  return (
    <Section title="Compras — Cuentas por Pagar" desc="Registra deuda con proveedores o compras financiadas en múltiples cuotas.">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <Segmented value={vista} onChange={setVista} options={[{ id: "lista", label: "Lista de pedidos", icon: FileText }, { id: "agenda", label: "Agenda de pagos", icon: CalendarClock }]} />
        {puedeCrear && vista === "lista" && <Btn onClick={abrirNuevo} disabled={proveedores.length === 0}><Plus size={15} /> Nuevo pedido / financiamiento</Btn>}
      </div>

      {vista === "lista" && (
        <Fragment>
          <div style={{ marginBottom: 12 }}><Segmented value={filtro} onChange={setFiltro} options={["TODOS", "PENDIENTE", "PARCIAL", "PAGADO"].map((x) => ({ id: x, label: x[0] + x.slice(1).toLowerCase() }))} /></div>
          {lista.length === 0 ? <Empty icon={FileText} title="Sin pedidos de compra" msg="Carga un pedido para iniciar el ciclo de pago." action={puedeCrear && proveedores.length > 0 && <Btn onClick={abrirNuevo}><Plus size={15} /> Nuevo pedido</Btn>} />
            : <Card><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>Proveedor / concepto</Th><Th>Pedido</Th><Th>Vence</Th><Th right>Total</Th><Th right>Abonado</Th><Th right>Pendiente</Th><Th>Estado</Th><Th>Banco</Th><Th right>Acciones</Th></tr></thead>
              <tbody>{pg.slice.map((c) => {
                const e = estadoDe(st, c); const tone = e === "PAGADO" ? "verde" : e === "PARCIAL" ? "amar" : "gold";
                return (
                  <tr key={c.id}>
                    <Td><div style={{ fontWeight: 700 }}>{provNom(st, c.proveedorId)}</div><div style={{ fontSize: 11.5, color: C.mut, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>{c.descripcion || "—"}{c.categoria && <Badge tone="mut">{c.categoria}</Badge>}</div></Td>
                    <Td>{c.numeroPedidoOdoo || <span style={{ color: C.mut }}>—</span>}</Td><Td>{fmtD(c.fechaVencimiento)}</Td><Td right>{money(c.montoOriginal, c.moneda)}</Td><Td right>{pagadoDe(st, c.id) > 0 ? <span style={{ color: C.verde }}>{money(pagadoDe(st, c.id), c.moneda)}</span> : <span style={{ color: C.mut }}>—</span>}</Td><Td right bold>{money(pendienteDe(st, c), c.moneda)}</Td><Td><Badge tone={tone}>{e}</Badge></Td><Td>{c.bancoAsignadoId ? <span style={{ fontSize: 12 }}>{bancoNom(st, c.bancoAsignadoId)}</span> : <span style={{ color: C.mut, fontSize: 12 }}>Sin asignar</span>}</Td>
                    <Td right><div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {puedeTeso && e !== "PAGADO" && !bloqueado(c) && <Btn small variant="soft" title="Registrar pago" onClick={() => { setF({ compromisoId: c.id, tipo: "TRANSFERENCIA", monto: pendienteDe(st, c), bancoOrigenId: c.bancoAsignadoId || (st.bancos || [])[0]?.id || "", referencia: "" }); setModal("mov"); }}><ArrowRightLeft size={13} /></Btn>}
                      {puedeTeso && e !== "PAGADO" && !bloqueado(c) && <Btn small variant="ghost" title="Asignar banco" onClick={() => { setF({ compromisoId: c.id, bancoAsignadoId: c.bancoAsignadoId || "", prioridad: c.prioridad }); setModal("asig"); }}><Building2 size={13} /></Btn>}
                      {bloqueado(c) && <Badge tone="mut"><Lock size={11} /> En corrida</Badge>}
                      {puedeCrear && e !== "PAGADO" && !bloqueado(c) && <Btn small variant="danger" title="Eliminar" onClick={() => act.delCompromiso(c.id)}><Trash2 size={13} /></Btn>}
                    </div></Td>
                  </tr>
                );
              })}</tbody></table></div><Pagination pg={pg} /></Card>}
        </Fragment>
      )}

      {vista === "agenda" && <AgendaPagos st={st} />}

      {modal === "new" && <Modal title="Registrar Compra / Financiamiento" wide onClose={() => setModal(null)}>
        <Field label="Proveedor"><Select value={f.proveedorId} onChange={(e) => setF({ ...f, proveedorId: e.target.value })}>{proveedores.map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}</Select></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="N° de pedido Odoo"><Input value={f.numeroPedidoOdoo} onChange={(e) => setF({ ...f, numeroPedidoOdoo: e.target.value })} placeholder="Ej. P12986" /></Field>
          <Field label="Categoría"><Select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>{CLASIF.map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label="Moneda"><Select value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value })}><option value="USD">USD</option><option value="BS">Bs</option></Select></Field>
        </div>
        <Field label="Descripción del bien o servicio"><Input value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} placeholder="Galpón, maquinaria, servicio eléctrico..." /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Monto total a pagar"><Input type="number" value={f.montoOriginal} onChange={(e) => setF({ ...f, montoOriginal: e.target.value })} /></Field>
          <Field label="Fecha base de la operación"><Input type="date" value={f.fechaPedido} onChange={(e) => setF({ ...f, fechaPedido: e.target.value })} /></Field>
        </div>
        <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 4, paddingTop: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: C.greenDk, cursor: "pointer" }}><input type="checkbox" checked={f.enCuotas} onChange={(e) => setF({ ...f, enCuotas: e.target.checked })} /> Esta compra fue financiada (múltiples cuotas)</label>
          {f.enCuotas ? (
            <div style={{ marginTop: 12, padding: 14, background: C.greenSoft, borderRadius: 12, border: `1px solid ${C.green}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Monto inicial (opcional)"><Input type="number" value={f.montoInicial} onChange={(e) => setF({ ...f, montoInicial: e.target.value })} placeholder="Parte pagada de contado" /></Field>
                {Number(f.montoInicial) > 0 && <div style={{ paddingTop: 22 }}><label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: C.ink, cursor: "pointer" }}><input type="checkbox" checked={f.antOn} onChange={(e) => setF({ ...f, antOn: e.target.checked })} /> Marcar la inicial como "ya pagada"</label></div>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 8 }}>
                <Field label="N° de cuotas (del saldo)"><Input type="number" value={f.numCuotas} onChange={(e) => setF({ ...f, numCuotas: e.target.value })} /></Field>
                <Field label="Frecuencia"><Select value={f.frecuencia} onChange={(e) => setF({ ...f, frecuencia: e.target.value })}><option value="MENSUAL">Mensual</option><option value="QUINCENAL">Quincenal</option><option value="SEMANAL">Semanal</option></Select></Field>
                <Field label="Vence 1ra cuota el"><Input type="date" value={f.fechaVencimiento} onChange={(e) => setF({ ...f, fechaVencimiento: e.target.value })} /></Field>
              </div>
              <div style={{ fontSize: 12, color: C.greenDk, marginTop: 4, fontWeight: 600 }}>El sistema proyectará {f.numCuotas || 0} cuotas de aprox. {money((Number(f.montoOriginal) - Number(f.montoInicial || 0)) / (Number(f.numCuotas) || 1), f.moneda)}.</div>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}><Field label="Fecha límite de pago"><Input type="date" value={f.fechaVencimiento} onChange={(e) => setF({ ...f, fechaVencimiento: e.target.value })} /></Field></div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}><Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn><Btn onClick={guardarNuevo}>Generar deuda</Btn></div>
      </Modal>}

      {modal === "mov" && <Modal title="Registrar pago a proveedor" onClose={() => setModal(null)}>
        <Field label="Tipo de egreso"><Select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{TIPOS_MOV.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Monto"><Input type="number" value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} /></Field>
        {f.tipo !== "CRUCE" && <Field label="Salió del banco"><Select value={f.bancoOrigenId} onChange={(e) => setF({ ...f, bancoOrigenId: e.target.value })}><option value="">—</option>{(st.bancos || []).map((b) => <option key={b.id} value={b.id}>{b.nombre} ({b.moneda})</option>)}</Select></Field>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}><Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn><Btn onClick={() => { if (Number(f.monto) > 0) { act.addMovimiento({ ...f, monto: Number(f.monto) }); setModal(null); } }}>Procesar pago</Btn></div>
      </Modal>}

      {modal === "asig" && <Modal title="Planificar banco pagador" onClose={() => setModal(null)}>
        <Field label="Seleccionar banco para esta cuota"><Select value={f.bancoAsignadoId} onChange={(e) => setF({ ...f, bancoAsignadoId: e.target.value })}><option value="">Sin asignar</option>{(st.bancos || []).map((b) => <option key={b.id} value={b.id}>{b.nombre} ({b.moneda})</option>)}</Select></Field>
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
            <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", border: `1px solid ${sel.includes(c.id) ? C.green : C.line}`, borderRadius: 10, cursor: "pointer", background: sel.includes(c.id) ? C.greenSoft : "#fff" }}>
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
                <div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 16, color: C.ink }}>{co.codigo}</span><Badge tone={estadoTone[co.estado]}>{estadoLbl[co.estado]}</Badge></div><div style={{ fontSize: 12, color: C.mut, marginTop: 3 }}>{co.compromisoIds.length} compromisos · creada {fmtD(co.fechaCreacion)}</div></div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 700, color: C.ink }}>{money(total, "BS")}</span><Btn small variant="ghost" onClick={() => setVer(co.id)}>Ver detalle</Btn></div>
              </div>
            </Card>
          );
        })}</div>}
      {corrida && <Modal title={`Corrida ${corrida.codigo}`} wide onClose={() => setVer(null)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><Badge tone={estadoTone[corrida.estado]}>{estadoLbl[corrida.estado]}</Badge><div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700 }}>{money(compsDe(corrida).reduce((a, c) => a + pendienteDe(st, c), 0), "BS")}</div></div>
        <div style={{ overflowX: "auto", border: `1px solid ${C.line}`, borderRadius: 12 }}>
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
            <tr key={p.id}><Td bold>{p.email}{p.id === meId ? " (tú)" : ""}</Td><Td>{fmtD((p.created_at || "").slice(0, 10))}</Td><Td><Select value={p.rol} onChange={(e) => cambiar(p.id, e.target.value)} style={{ maxWidth: 220 }}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Td></tr>
          ))}</tbody></table></div></Card>}
    </Section>
  );
}

function LibroBancos({ st }) {
  const bancos = st.bancos || [];
  const [bancoId, setBancoId] = useState(bancos[0]?.id || "");
  useEffect(() => { if (!bancos.find((b) => b.id === bancoId) && bancos.length > 0) setBancoId(bancos[0].id); }, [bancos, bancoId]);
  const elBanco = bancos.find((b) => b.id === bancoId);
  const movsList = useMemo(() => {
    if (!bancoId) return [];
    const list = [];
    (st.movimientos || []).filter((m) => m.bancoOrigenId === bancoId).forEach((m) => {
      const comp = (st.compromisos || []).find((c) => c.id === m.compromisoId);
      list.push({ id: m.id, fecha: m.fecha, concepto: `Pago (${m.tipo})${m.referencia ? " · Ref: " + m.referencia : ""}${comp ? " | " + comp.descripcion : ""}`, entidad: comp ? provNom(st, comp.proveedorId) : "—", monto: Number(m.monto), esIngreso: false });
    });
    (st.cobranzas || []).filter((c) => c.bancoDestinoId === bancoId).forEach((c) => {
      const fac = (st.cuentasCobrar || []).find((f) => f.id === c.cuentaCobrarId);
      list.push({ id: c.id, fecha: c.fecha, concepto: `Ingreso${c.descripcion ? " · " + c.descripcion : ""}${fac && fac.numeroFactura ? " | Fac: " + fac.numeroFactura : ""}`, entidad: provNom(st, c.clienteId), monto: Number(c.monto), esIngreso: true });
    });
    return list.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [st, bancoId]);
  const pg = usePaged(movsList, 15);

  if (bancos.length === 0) return <Empty icon={Landmark} title="Sin bancos" msg="Registra una cuenta bancaria en Ajustes primero." />;

  return (
    <Section title="Libro de Bancos (Estado de Cuenta)" desc="Historial combinado de ingresos de clientes y pagos a proveedores por cuenta.">
      <div style={{ marginBottom: 16, maxWidth: 420 }}><Field label="Cuenta bancaria"><Select value={bancoId} onChange={(e) => setBancoId(e.target.value)}>{bancos.map((b) => <option key={b.id} value={b.id}>{b.nombre} ({b.moneda})</option>)}</Select></Field></div>
      {elBanco && (
        <Card style={{ padding: 20, marginBottom: 16, borderTop: `4px solid ${C.green}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div><div style={{ fontSize: 12, fontWeight: 700, color: C.mut, textTransform: "uppercase" }}>Saldo actual registrado</div><div style={{ fontFamily: SERIF, fontSize: 27, fontWeight: 700, color: C.greenDk, marginTop: 4 }}>{money(elBanco.saldoActual, elBanco.moneda)}</div></div>
            <Badge tone="mut">{elBanco.numeroCuenta || "Sin número"}</Badge>
          </div>
        </Card>
      )}
      {movsList.length === 0 ? <Empty icon={FileText} title="Sin movimientos" msg="No hay operaciones registradas para esta cuenta." />
        : <Card><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Fecha</Th><Th>Contacto</Th><Th>Concepto</Th><Th right>Ingreso</Th><Th right>Egreso</Th></tr></thead>
          <tbody>{pg.slice.map((m) => (
            <tr key={m.id}><Td>{fmtD(m.fecha)}</Td><Td bold>{m.entidad}</Td><Td><div style={{ fontSize: 12 }}>{m.concepto}</div></Td>
              <Td right>{m.esIngreso ? <span style={{ color: C.verde, fontWeight: 700 }}>+{money(m.monto, elBanco?.moneda)}</span> : <span style={{ color: "#D6DAD2" }}>—</span>}</Td>
              <Td right>{!m.esIngreso ? <span style={{ color: C.rojo, fontWeight: 700 }}>−{money(m.monto, elBanco?.moneda)}</span> : <span style={{ color: "#D6DAD2" }}>—</span>}</Td>
            </tr>
          ))}</tbody></table></div><Pagination pg={pg} /></Card>}
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
      <div style={{ marginBottom: 20 }}>
        <Segmented value={sub} onChange={setSub} options={[
          { id: "cxc", label: "Por Cobrar", icon: Receipt },
          { id: "cob", label: "Cobranzas", icon: TrendingUp },
          { id: "cor", label: "Corridas de Pago", icon: Layers },
          { id: "lib", label: "Libro de Bancos", icon: Wallet2 },
        ]} />
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
  const opts = [
    { id: "tasas", label: "Tasas de Cambio", icon: TrendingDown },
    { id: "bancos", label: "Bancos", icon: Landmark },
    { id: "contactos", label: "Contactos", icon: Users },
  ];
  if (rol === "MASTER") opts.push({ id: "equipo", label: "Equipo", icon: UserCog });
  return (
    <div>
      <div style={{ marginBottom: 20 }}><Segmented value={sub} onChange={setSub} options={opts} /></div>
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
      unsub = subscribeState((data) => { if (data && !savingRef.current) { isLocalChange.current = false; setSt(data); } });
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  useEffect(() => {
    if (!loaded || !isLocalChange.current) return;
    setSaved(false);
    const t = setTimeout(async () => {
      try { savingRef.current = true; await saveState(st, meId); setSaved(true); isLocalChange.current = false; }
      catch (e) { setSaved(false); }
      finally { savingRef.current = false; }
    }, 800);
    return () => clearTimeout(t);
  }, [st, loaded, meId]);

  const update = (fn) => { isLocalChange.current = true; setSt((prev) => { const n = JSON.parse(JSON.stringify(prev)); fn(n); return n; }); };
  const gid = (n) => "id_" + (n.seq = (n.seq || 0) + 1);

  const act = {
    setRate: (key, v) => update((n) => { n.config[key] = v; }),
    addBanco: (d) => update((n) => { if (!n.bancos) n.bancos = []; n.bancos.push({ ...d, id: gid(n) }); }),
    updBanco: (d) => update((n) => { n.bancos = n.bancos.map((b) => b.id === d.id ? d : b); }),
    delBanco: (id) => update((n) => { n.bancos = n.bancos.filter((b) => b.id !== id); }),
    addProv: (d) => update((n) => { if (!n.proveedores) n.proveedores = []; n.proveedores.push({ ...d, id: gid(n) }); }),
    updProv: (d) => update((n) => { n.proveedores = n.proveedores.map((p) => p.id === d.id ? { ...p, ...d } : p); }),
    delProv: (id) => update((n) => { n.proveedores = n.proveedores.filter((p) => p.id !== id); }),
    addCxC: (d) => update((n) => { if (!n.cuentasCobrar) n.cuentasCobrar = []; n.cuentasCobrar.push({ ...d, id: gid(n), anulado: false, tasaBcvRegistro: d.moneda === "BS" ? n.config.tasaBCV : null }); }),
    delCxC: (id) => update((n) => { n.cuentasCobrar = n.cuentasCobrar.filter((c) => c.id !== id); }),
    addCobranza: (d) => update((n) => {
      if (!n.cobranzas) n.cobranzas = []; n.cobranzas.push({ ...d, id: gid(n) });
      const b = (n.bancos || []).find((x) => x.id === d.bancoDestinoId); if (b) b.saldoActual = Number(b.saldoActual) + Number(d.monto);
    }),
    delCobranza: (id) => update((n) => {
      const cob = n.cobranzas.find((c) => c.id === id);
      if (cob) { const b = n.bancos.find((x) => x.id === cob.bancoDestinoId); if (b) b.saldoActual = Number(b.saldoActual) - Number(cob.monto); n.cobranzas = n.cobranzas.filter((c) => c.id !== id); }
    }),
    addCompromisoMulti: (lista) => update((n) => {
      if (!n.compromisos) n.compromisos = []; if (!n.movimientos) n.movimientos = [];
      lista.forEach((obj) => {
        const id = gid(n); const d = obj.data;
        n.compromisos.push({ ...d, id, anulado: false, corridaId: null, bancoAsignadoId: d.bancoAsignadoId || null, tasaBcvRegistro: d.moneda === "BS" ? n.config.tasaBCV : null });
        if (obj.anticipo && Number(obj.anticipo.monto) > 0) n.movimientos.push({ id: gid(n), compromisoId: id, tipo: obj.anticipo.tipo || "ANTICIPO", monto: Number(obj.anticipo.monto), moneda: d.moneda, bancoOrigenId: obj.anticipo.bancoOrigenId || null, fecha: obj.anticipo.fecha || new Date().toISOString().slice(0, 10), referencia: obj.anticipo.referencia || "" });
      });
    }),
    delCompromiso: (id) => update((n) => { n.compromisos = n.compromisos.filter((c) => c.id !== id); }),
    asignar: (id, bancoId, prioridad) => update((n) => { n.compromisos = n.compromisos.map((c) => c.id === id ? { ...c, bancoAsignadoId: bancoId || null, prioridad } : c); }),
    addMovimiento: (d) => update((n) => { if (!n.movimientos) n.movimientos = []; n.movimientos.push({ ...d, id: gid(n), fecha: d.fecha || new Date().toISOString().slice(0, 10) }); }),
    crearCorrida: (ids, usuario) => update((n) => {
      if (!n.corridas) n.corridas = [];
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
    }),
  };

  const navVisible = NAV.filter((n) => n.roles.includes(rol));
  useEffect(() => { if (!navVisible.find((n) => n.id === tab)) setTab(navVisible[0]?.id || "dashboard"); }, [rol]); // eslint-disable-line

  if (!loaded) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, color: C.mut, background: C.paper }}>Cargando datos…</div>;

  return (
    <div style={{ fontFamily: SANS, background: C.paper, minHeight: "100vh", color: C.ink }}>
      <header style={{ background: `linear-gradient(120deg, ${C.greenDk}, ${C.green})`, color: "#fff", padding: "14px 20px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: "7px 12px", display: "flex", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}>
              <img src={LOGO} alt="CAD Venezuela" style={{ height: 30, display: "block" }} />
            </div>
            <div>
              <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, lineHeight: 1.05 }}>Tesorería &amp; Proyección de Pagos</div>
              <div style={{ fontSize: 11.5, opacity: 0.8 }}>Comercializadora Agrícola Domínguez · El Maizalito</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.14)", borderRadius: 10, padding: "6px 11px" }}>
              <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 700, letterSpacing: 0.3 }}>BCV</span>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{nf0.format(Number(st.config.tasaBCV) || 0)}</span>
            </div>
            <div style={{ textAlign: "right", lineHeight: 1.15 }}><div style={{ fontSize: 12.5, fontWeight: 700 }}>{ROLES[rol]}</div><div style={{ fontSize: 11, opacity: 0.85 }}>{user?.email}</div></div>
            <button onClick={signOut} title="Cerrar sesión" style={{ background: "rgba(255,255,255,0.16)", color: "#fff", border: "none", borderRadius: 9, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><LogOut size={14} /> Salir</button>
          </div>
        </div>
      </header>

      <nav style={{ background: "#fff", borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, zIndex: 20, boxShadow: SHADOW_SM }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "8px 12px", display: "flex", gap: 4, overflowX: "auto" }}>
          {navVisible.map((n) => {
            const on = tab === n.id;
            return (
              <button key={n.id} onClick={() => setTab(n.id)} style={{ background: on ? C.greenSoft : "transparent", border: "none", cursor: "pointer", padding: "9px 15px", borderRadius: 10, display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 600, fontFamily: SANS, color: on ? C.greenDk : C.mut, whiteSpace: "nowrap" }}>
                <n.icon size={16} /> {n.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "10px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12, color: C.mut, display: "flex", alignItems: "center", gap: 6 }}><ShieldCheck size={13} color={C.green} /> Operando como <b style={{ color: C.ink }}>{ROLES[rol]}</b> · datos compartidos en tiempo real</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: saved ? C.verde : C.amar }} />
          <span style={{ fontSize: 11.5, color: C.mut }}>{saved ? "Guardado" : "Guardando…"}</span>
        </div>
      </div>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 20px 60px" }}>
        {tab === "dashboard" && <Tablero st={st} />}
        {tab === "compras" && <Compromisos st={st} act={act} rol={rol} />}
        {tab === "tesoreria" && <ModuloTesoreria st={st} act={act} rol={rol} />}
        {tab === "directorio" && <Directorio st={st} />}
        {tab === "ajustes" && <ModuloAjustes st={st} act={act} rol={rol} meId={meId} />}
      </main>
    </div>
  );
}
