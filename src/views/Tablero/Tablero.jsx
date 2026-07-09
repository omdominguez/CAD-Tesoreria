import React, { useState, useMemo } from "react";
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp, 
  Sparkles 
} from "lucide-react";
import { 
  BarChart, 
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
  eqUSD, 
  comprometidoBanco 
} from "../../utils/finance";

// Componentes UI
import { Card, Empty } from "../../components/ui/Layout";
import { Btn } from "../../components/ui/Buttons";
import { KpiCard, Badge } from "../../components/ui/Data";
import { Th, Td } from "../../components/ui/Table";

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

  // Proyección del Flujo de Caja
  const proj = useMemo(() => {
    const t = hoy0(); 
    const w0 = startWeek(t);
    const arr = Array.from({ length: semanas }, (_, i) => ({ name: "S" + (i + 1), ingreso: 0, egreso: 0 }));
    let vEg = 0, vIn = 0;
    
    // Egresos proyectados
    (st.compromisos || [])
      .filter((c) => activo(st, c) && !(estres && c.prioridad === "FLEXIBLE"))
      .forEach((c) => {
        const idx = Math.floor(diasEntre(w0, parseD(c.fechaVencimiento)) / 7);
        const v = usdComp(st, c); 
        
        if (idx < 0) vEg += v; 
        else if (idx < semanas) arr[idx].egreso += v;
      });
      
    // Ingresos proyectados
    (st.cuentasCobrar || [])
      .filter((c) => activoCxC(st, c))
      .forEach((c) => {
        const idx = Math.floor(diasEntre(w0, parseD(c.fechaVencimiento)) / 7);
        const v = usdCxCPendiente(st, c); 
        
        if (idx < 0) vIn += v; 
        else if (idx < semanas) arr[idx].ingreso += v;
      });
      
    return [{ name: "Venc.", ingreso: vIn, egreso: vEg }, ...arr];
  }, [st, semanas, estres]);

  const totIn = proj.reduce((a, r) => a + r.ingreso, 0);
  const totEg = proj.reduce((a, r) => a + r.egreso, 0);

  if ((st.bancos || []).length === 0 && (st.proveedores || []).length === 0) {
    return (
      <Empty 
        icon={LayoutDashboard} 
        title="Aún no hay datos operativos" 
        msg="Ve a Ajustes y registra bancos y contactos para comenzar a proyectar tu caja." 
      />
    );
  }

  return (
    <div>
      {/* 1. Tarjetas Superiores (KPIs) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14, marginBottom: 16 }}>
        <KpiCard t="Disponible en bancos" v={kpi.disp} ic={Wallet} tone={C.green} sub="Saldo bruto consolidado (USD)" />
        <KpiCard t="Por cobrar" v={kpi.cobrar} ic={ArrowDownLeft} tone={C.verde} sub="Facturas de clientes (USD)" />
        <KpiCard t="Por pagar" v={kpi.comp} ic={ArrowUpRight} tone={C.gold} sub="Egresos pendientes (USD)" />
        <KpiCard t="Posición neta" v={kpi.neto} ic={TrendingUp} tone={kpi.neto >= 0 ? C.verde : C.rojo} sub="Disponible + por cobrar − por pagar" />
      </div>

      {/* 2. Gráfica de Proyección */}
      <Card style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: FONTS.SERIF, fontSize: 18, fontWeight: 700, color: C.greenDk }}>
              Proyección de flujo de caja
            </div>
            <div style={{ fontSize: 12.5, color: C.mut }}>
              Ingresos por cobrar vs. egresos por pagar, por semana (USD)
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn small variant={semanas === 4 ? "primary" : "ghost"} onClick={() => setSemanas(4)}>4 sem</Btn>
            <Btn small variant={semanas === 12 ? "primary" : "ghost"} onClick={() => setSemanas(12)}>12 sem</Btn>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: 20, margin: "10px 0 4px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: C.verde }} />
            <span style={{ fontSize: 12.5, color: C.mut }}>Ingresos <b style={{ color: C.verde }}>{money(totIn)}</b></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: C.gold }} />
            <span style={{ fontSize: 12.5, color: C.mut }}>Egresos <b style={{ color: C.gold }}>{money(totEg)}</b></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 12.5, color: C.mut }}>
              Balance del período <b style={{ color: (totIn - totEg) >= 0 ? C.verde : C.rojo }}>{money(totIn - totEg)}</b>
            </span>
          </div>
        </div>
        
        <div style={{ height: 250, marginTop: 8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={proj} margin={{ top: 6, right: 6, left: -12, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.mut }} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: C.mut }} tickFormatter={(v) => (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)} />
              <Tooltip 
                formatter={(v, n) => [money(v, "USD"), n === "ingreso" ? "Ingresos" : "Egresos"]} 
                labelStyle={{ color: C.ink }} 
                contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${C.line}` }} 
              />
              <Bar dataKey="ingreso" fill={C.verde} radius={[4, 4, 0, 0]} />
              <Bar dataKey="egreso" fill={C.gold} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12.5, color: C.ink, cursor: "pointer" }}>
          <input type="checkbox" checked={estres} onChange={(e) => setEstres(e.target.checked)} />
          <Sparkles size={14} color={C.gold} /> Simular escenario: excluir egresos marcados como flexibles
        </label>
      </Card>

      {/* 3. Tabla de Saldos Bancarios Consolidados */}
      {(st.bancos || []).length > 0 && (
        <Card style={{ padding: 20 }}>
          <div style={{ fontFamily: FONTS.SERIF, fontSize: 18, fontWeight: 700, color: C.greenDk, marginBottom: 4 }}>
            Saldos disponibles por banco
          </div>
          <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 12 }}>
            Disponible neto = saldo real − comprometido. Las cuentas en Bs muestran su equivalente en USD a cada tasa.
          </div>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>Banco</Th>
                  <Th>Moneda</Th>
                  <Th right>Disponible neto</Th>
                  <Th right>≈ USD (BCV)</Th>
                  <Th right>≈ USD (Interv.)</Th>
                  <Th right>≈ USD (Paralelo)</Th>
                </tr>
              </thead>
              <tbody>
                {(st.bancos || []).map((b) => {
                  const comp = comprometidoBanco(st, b); 
                  const neto = Number(b.saldoActual) - comp; 
                  const esUSD = b.moneda === "USD";
                  
                  return (
                    <tr key={b.id}>
                      <Td>
                        <div style={{ fontWeight: 700 }}>{b.nombre}</div>
                        <div style={{ fontSize: 11, color: C.mut }}>
                          bruto {money(b.saldoActual, b.moneda)} · comprom. {money(comp, b.moneda)}
                        </div>
                      </Td>
                      <Td><Badge tone="mut">{b.moneda}</Badge></Td>
                      <Td right bold>
                        <span style={{ color: neto >= 0 ? C.verde : C.rojo }}>{money(neto, b.moneda)}</span>
                      </Td>
                      <Td right>
                        {esUSD ? <span style={{ color: C.mut }}>—</span> : money(eqUSD(neto, st.config.tasaBCV), "USD")}
                      </Td>
                      <Td right>
                        {esUSD ? <span style={{ color: C.mut }}>—</span> : money(eqUSD(neto, st.config.tasaIntervencion), "USD")}
                      </Td>
                      <Td right>
                        {esUSD ? <span style={{ color: C.mut }}>—</span> : money(eqUSD(neto, st.config.tasaParalelo), "USD")}
                      </Td>
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