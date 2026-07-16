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