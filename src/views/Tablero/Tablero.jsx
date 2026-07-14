import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Landmark,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

// Utilidades y Tema
import { C, FONTS } from "../../constants/theme";
import {
  brutoUSD,
  activo,
  usdComp,
  activoCxC,
  usdCxCPendiente,
  hoy0,
  startWeek,
  diasEntre,
  parseD,
  money,
  nf,
  eqUSD,
  comprometidoBanco
} from "../../utils/finance";

// Componentes UI
import { Section, Card, Empty } from "../../components/ui/Layout";
import { Btn } from "../../components/ui/Buttons";
import { Badge } from "../../components/ui/Data";
import ComportamientoTasas from "./ComportamientoTasas";
import ProximosVencimientos from "./ProximosVencimientos";
import { AvatarBanco } from "../../components/shared/AvatarBanco";
import { useIsMobile } from "../../hooks/useIsMobile";

/* ============================================================
   Franja de KPIs: una sola tarjeta dividida por líneas finas,
   en vez de 4 tarjetas sueltas — se ve más unificado.
   ============================================================ */
function KpiStrip({ items }) {
  return (
    <Card style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {items.map((it, i) => (
          <div
            key={it.t}
            style={{
              flex: "1 1 210px",
              minWidth: 190,
              padding: "18px 20px",
              borderRight: i < items.length - 1 ? `1px solid ${C.line}` : "none",
              borderBottom: "1px solid transparent"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: C.body, display: "inline-flex", alignItems: "center", justifyContent: "center", color: it.tone, flexShrink: 0 }}>
                <it.ic size={14} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 0.4 }}>
                {it.t}
              </div>
            </div>

            <div style={{ fontFamily: FONTS.SANS, fontSize: 25, fontWeight: 800, color: C.ink, letterSpacing: -0.5, fontVariantNumeric: "tabular-nums" }}>
              {money(it.v, "USD")}
            </div>
            <div style={{ width: 28, height: 3, borderRadius: 999, background: it.tone, marginTop: 8, marginBottom: 8 }} />
            <div style={{ fontSize: 11.5, color: C.mut }}>{it.sub}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}



/** Tarjeta individual de banco (en vez de fila de tabla). */
function TarjetaBanco({ b, st }) {
  const comp = comprometidoBanco(st, b);
  const neto = Number(b.saldoActual) - comp;
  const esUSD = b.moneda === "USD";
  const bruto = Number(b.saldoActual) || 0;
  const pctComprometido = bruto > 0 ? Math.min(100, (comp / bruto) * 100) : 0;
  const barColor = pctComprometido >= 90 ? C.rojo : pctComprometido >= 60 ? C.gold : C.verde;

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <AvatarBanco nombre={b.nombre} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {b.nombre}
          </div>
          <div style={{ fontSize: 11, color: C.mut }}>bruto {money(b.saldoActual, b.moneda)}</div>
        </div>
        <Badge tone="mut">{b.moneda}</Badge>
      </div>

      <div style={{ fontFamily: FONTS.SANS, fontSize: 22, fontWeight: 800, letterSpacing: -0.4, color: neto >= 0 ? C.verde : C.rojo, fontVariantNumeric: "tabular-nums" }}>
        {money(neto, b.moneda)}
      </div>
      <div style={{ fontSize: 11, color: C.mut, marginTop: 2, marginBottom: 8 }}>disponible neto</div>

      <div style={{ width: "100%", height: 5, borderRadius: 999, background: C.body, overflow: "hidden", marginBottom: 4 }}>
        <div style={{ width: `${pctComprometido}%`, height: "100%", background: barColor, borderRadius: 999 }} />
      </div>
      <div style={{ fontSize: 10.5, color: C.mut2, marginBottom: esUSD ? 0 : 12 }}>
        {nf.format(pctComprometido)}% comprometido · {money(comp, b.moneda)}
      </div>

      {!esUSD && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, paddingTop: 10, borderTop: `1px dashed ${C.line}` }}>
          <div>
            <div style={{ fontSize: 9.5, color: C.mut, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>BCV</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{money(eqUSD(neto, st.config.tasaBCV), "USD")}</div>
          </div>
          <div>
            <div style={{ fontSize: 9.5, color: C.mut, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Interv.</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{money(eqUSD(neto, st.config.tasaIntervencion), "USD")}</div>
          </div>
          <div>
            <div style={{ fontSize: 9.5, color: C.mut, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Paralelo</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{money(eqUSD(neto, st.config.tasaParalelo), "USD")}</div>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ============================================================
   Carrusel de bancos: muestra un par de bancos a la vez, se
   desliza solo cada pocos segundos (se pausa al pasar el mouse)
   y permite avanzar/retroceder a mano con flechas o puntos para
   ubicar la disponibilidad de un banco puntual.
   ============================================================ */
function CarruselBancos({ bancos, st }) {
  const isMobile = useIsMobile();
  const porPagina = isMobile ? 1 : 2;
  const [pagina, setPagina] = useState(0);
  const [pausado, setPausado] = useState(false);

  const paginas = useMemo(() => {
    const grupos = [];
    for (let i = 0; i < bancos.length; i += porPagina) grupos.push(bancos.slice(i, i + porPagina));
    return grupos;
  }, [bancos, porPagina]);

  // Si cambia la cantidad de páginas (resize, más/menos bancos) y quedamos fuera de rango
  useEffect(() => { if (pagina >= paginas.length) setPagina(0); }, [paginas.length, pagina]);

  // Rotación automática (se reinicia en cada cambio, así al pasarlo a mano espera de nuevo)
  useEffect(() => {
    if (pausado || paginas.length <= 1) return;
    const t = setTimeout(() => setPagina((p) => (p + 1) % paginas.length), 5000);
    return () => clearTimeout(t);
  }, [pagina, pausado, paginas.length]);

  const ir = (i) => setPagina(((i % paginas.length) + paginas.length) % paginas.length);
  const hayControles = paginas.length > 1;

  return (
    <div>
      <div
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
        style={{ overflow: "hidden" }}
      >
        <div style={{ display: "flex", transition: "transform 0.5s ease", transform: `translateX(-${pagina * 100}%)` }}>
          {paginas.map((grupo, i) => (
            <div key={i} style={{ flex: "0 0 100%", minWidth: "100%" }}>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${porPagina}, 1fr)`, gap: 14, alignItems: "start", paddingBottom: 2 }}>
                {grupo.map((b) => <TarjetaBanco key={b.id} b={b} st={st} />)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {hayControles && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 14 }}>
          <button onClick={() => ir(pagina - 1)} aria-label="Anterior" style={flechaEstilo}>
            <ChevronLeft size={16} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {paginas.map((_, i) => (
              <button
                key={i}
                onClick={() => setPagina(i)}
                aria-label={`Ir al grupo ${i + 1}`}
                style={{
                  width: i === pagina ? 20 : 8,
                  height: 8,
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  background: i === pagina ? C.verde : C.line,
                  transition: "width 0.25s ease, background 0.25s ease"
                }}
              />
            ))}
          </div>

          <button onClick={() => ir(pagina + 1)} aria-label="Siguiente" style={flechaEstilo}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

const flechaEstilo = {
  width: 32,
  height: 32,
  borderRadius: 999,
  border: `1px solid ${C.line}`,
  background: C.surface,
  color: C.mut,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer"
};

export default function Tablero({ st }) {
  const [semanas, setSemanas] = useState(12);
  const [estres, setEstres] = useState(false);

  // Cálculos de KPIs principales
  const kpi = useMemo(() => {
    const disp = (st.bancos || []).reduce((a, b) => a + brutoUSD(st, b), 0);
    const comp = (st.compromisos || [])
      .filter((c) => activo(st, c) && !(estres && c.prioridad === "FLEXIBLE"))
      .reduce((a, c) => a + usdComp(st, c), 0);

    const cobrar = (st.cuentasCobrar || [])
      .filter((c) => activoCxC(st, c))
      .reduce((a, c) => a + usdCxCPendiente(st, c), 0);

    return { disp, comp, cobrar, neto: disp + cobrar - comp };
  }, [st, estres]);

  // Cobertura: qué tanto de lo pendiente por pagar cubre lo que ya tienes disponible
  const cobertura = useMemo(() => {
    if (kpi.comp <= 0) return null;
    const pct = (kpi.disp / kpi.comp) * 100;
    let tono, Icono, mensaje;
    if (pct >= 100) {
      tono = C.verde; Icono = ShieldCheck;
      mensaje = `Tu disponible en bancos cubre el ${Math.round(pct)}% de tus pagos pendientes — estás cubierto sin necesidad de cobrar.`;
    } else if (pct + (kpi.cobrar / kpi.comp) * 100 >= 100) {
      tono = C.amar; Icono = TrendingUp;
      mensaje = `Tu disponible cubre el ${Math.round(pct)}% de tus pagos pendientes; sumando lo por cobrar, alcanzas a cubrir el resto.`;
    } else {
      tono = C.rojo; Icono = AlertTriangle;
      mensaje = `Tu disponible + por cobrar solo cubre el ${Math.round(pct + (kpi.cobrar / kpi.comp) * 100)}% de tus pagos pendientes. Revisa prioridades en Compras.`;
    }
    return { pct, tono, Icono, mensaje };
  }, [kpi]);

  // Proyección del Flujo de Caja
  const proj = useMemo(() => {
    const t = hoy0();
    const w0 = startWeek(t);
    const arr = Array.from({ length: semanas }, (_, i) => ({ name: "S" + (i + 1), ingreso: 0, egreso: 0 }));
    let vEg = 0, vIn = 0;

    (st.compromisos || [])
      .filter((c) => activo(st, c) && !(estres && c.prioridad === "FLEXIBLE"))
      .forEach((c) => {
        const idx = Math.floor(diasEntre(w0, parseD(c.fechaVencimiento)) / 7);
        const v = usdComp(st, c);
        if (idx < 0) vEg += v;
        else if (idx < semanas) arr[idx].egreso += v;
      });

    (st.cuentasCobrar || [])
      .filter((c) => activoCxC(st, c))
      .forEach((c) => {
        const idx = Math.floor(diasEntre(w0, parseD(c.fechaVencimiento)) / 7);
        const v = usdCxCPendiente(st, c);
        if (idx < 0) vIn += v;
        else if (idx < semanas) arr[idx].ingreso += v;
      });

    const conNeto = [{ name: "Venc.", ingreso: vIn, egreso: vEg }, ...arr];
    conNeto.forEach((r) => { r.neto = r.ingreso - r.egreso; });
    return conNeto;
  }, [st, semanas, estres]);

  const totIn = proj.reduce((a, r) => a + r.ingreso, 0);
  const totEg = proj.reduce((a, r) => a + r.egreso, 0);

  if ((st.bancos || []).length === 0 && (st.proveedores || []).length === 0) {
    return (
      <Section title="Tablero Principal" eyebrow="Resumen general">
        <Empty
          icon={LayoutDashboard}
          title="Aún no hay datos operativos"
          msg="Ve a Ajustes y registra bancos y contactos para comenzar a proyectar tu caja."
        />
      </Section>
    );
  }

  const kpiItems = [
    { t: "Disponible en bancos", v: kpi.disp, ic: Wallet, tone: C.green, sub: "Saldo bruto consolidado (USD)" },
    { t: "Por cobrar", v: kpi.cobrar, ic: ArrowDownLeft, tone: C.verde, sub: "Facturas de clientes (USD)" },
    { t: "Por pagar", v: kpi.comp, ic: ArrowUpRight, tone: C.gold, sub: "Egresos pendientes (USD)" },
    { t: "Posición neta", v: kpi.neto, ic: kpi.neto >= 0 ? TrendingUp : TrendingDown, tone: kpi.neto >= 0 ? C.verde : C.rojo, sub: "Disponible + por cobrar − por pagar" }
  ];

  return (
    <Section title="Tablero Principal" eyebrow="Resumen general" desc="Vista consolidada de tu posición de caja, proyección de pagos y saldos por banco.">
      {/* 0. Lectura rápida de cobertura */}
      {cobertura && (
        <Card style={{ padding: "14px 18px", marginBottom: 16, borderLeft: `3px solid ${cobertura.tono}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: C.body, display: "flex", alignItems: "center", justifyContent: "center", color: cobertura.tono, flexShrink: 0 }}>
              <cobertura.Icono size={17} />
            </div>
            <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.4 }}>{cobertura.mensaje}</div>
          </div>
        </Card>
      )}

      {/* 1. KPIs unificados */}
      <KpiStrip items={kpiItems} />

      {/* 2. Gráfica de Proyección (con línea de balance neto superpuesta) */}
      <Card style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: FONTS.SANS, fontSize: 16, fontWeight: 800, color: C.ink, letterSpacing: -0.3 }}>
              Proyección de flujo de caja
            </div>
            <div style={{ fontSize: 12.5, color: C.mut, marginTop: 2 }}>
              Ingresos por cobrar vs. egresos por pagar, por semana (USD)
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn small variant={semanas === 4 ? "primary" : "ghost"} onClick={() => setSemanas(4)}>4 sem</Btn>
            <Btn small variant={semanas === 12 ? "primary" : "ghost"} onClick={() => setSemanas(12)}>12 sem</Btn>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, margin: "12px 0 4px", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.body, borderRadius: 999, padding: "4px 10px 4px 8px", fontSize: 11.5, color: C.mut }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: C.verde }} />
            Ingresos <b style={{ color: C.ink }}>{money(totIn)}</b>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.body, borderRadius: 999, padding: "4px 10px 4px 8px", fontSize: 11.5, color: C.mut }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: C.gold }} />
            Egresos <b style={{ color: C.ink }}>{money(totEg)}</b>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.body, borderRadius: 999, padding: "4px 10px", fontSize: 11.5, color: C.mut }}>
            Balance del período <b style={{ color: (totIn - totEg) >= 0 ? C.verde : C.rojo }}>{money(totIn - totEg)}</b>
          </span>
        </div>

        <div style={{ height: 250, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={proj} margin={{ top: 6, right: 6, left: -12, bottom: 0 }} barGap={3} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.mut }} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: C.mut }} tickFormatter={(v) => (v >= 1000 || v <= -1000 ? (v / 1000).toFixed(0) + "k" : v)} />
              <Tooltip
                formatter={(v, n) => [money(v, "USD"), n === "ingreso" ? "Ingresos" : "Egresos"]}
                labelStyle={{ color: C.ink }}
                contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${C.line}`, background: C.surface }}
              />
              <Bar dataKey="ingreso" name="ingreso" fill={C.verde} radius={[3, 3, 0, 0]} maxBarSize={26} minPointSize={2} />
              <Bar dataKey="egreso" name="egreso" fill={C.gold} radius={[3, 3, 0, 0]} maxBarSize={26} minPointSize={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 12.5, color: C.ink, cursor: "pointer" }}>
          <input type="checkbox" checked={estres} onChange={(e) => setEstres(e.target.checked)} />
          <Sparkles size={14} color={C.gold} /> Simular escenario: excluir egresos marcados como flexibles
        </label>
      </Card>

      {/* 2.5 Próximos vencimientos: pagos a proveedores y facturas por cobrar */}
      <ProximosVencimientos st={st} />

      {/* 3. Saldos por banco: tarjetas en vez de tabla */}
      {(st.bancos || []).length > 0 && (
        <Card style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Landmark size={17} color={C.mut} />
            <div style={{ fontFamily: FONTS.SANS, fontSize: 16, fontWeight: 800, color: C.ink, letterSpacing: -0.3 }}>
              Saldos disponibles por banco
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 16 }}>
            Disponible neto = saldo real − comprometido. Las cuentas en Bs muestran su equivalente en USD a cada tasa.
          </div>

          <CarruselBancos bancos={st.bancos || []} st={st} />
        </Card>
      )}

      {/* 4. Comportamiento de las tasas de cambio (panel interactivo) */}
      <ComportamientoTasas st={st} />
    </Section>
  );
}