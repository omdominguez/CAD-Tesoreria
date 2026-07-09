import React, { useState } from "react";

// Tema y Utilidades
import { C, FONTS } from "../../constants/theme";
import { 
  hoy0, 
  startWeek, 
  parseD, 
  fmtD, 
  diasEntre, 
  activo, 
  pendienteDe, 
  provNom, 
  money 
} from "../../utils/finance";

// Componentes UI
import { Card } from "../../components/ui/Layout";
import { Segmented } from "../../components/ui/Buttons";
import { Badge } from "../../components/ui/Data";

export default function AgendaPagos({ st }) {
  const [filtroTiempo, setFiltroTiempo] = useState("TODOS");
  
  const hoy = hoy0();
  const currYear = hoy.getFullYear();
  const currMonth = hoy.getMonth();
  const currQuarter = Math.floor(currMonth / 3);
  
  const w0 = startWeek(hoy); 
  const w1 = new Date(w0); 
  w1.setDate(w1.getDate() + 6);
  
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
  
  const ag = { USD: {}, BS: {} };
  
  (st.compromisos || []).filter((c) => activo(st, c) && pasaFiltro(c.fechaVencimiento)).forEach((c) => {
    const d = parseD(c.fechaVencimiento); 
    const key = d.toISOString().slice(0, 7);
    const target = c.moneda === "USD" ? ag.USD : ag.BS; 
    
    if (!target[key]) target[key] = []; 
    target[key].push(c);
  });
  
  const keysUSD = Object.keys(ag.USD).sort(); 
  const keysBS = Object.keys(ag.BS).sort();

  const botones = [
    { id: "VENCIDOS", label: "Vencidos" }, 
    { id: "ESTA_SEMANA", label: "Esta semana" }, 
    { id: "ESTE_MES", label: "Este mes" }, 
    { id: "ESTE_TRIMESTRE", label: "Trimestre" }, 
    { id: "ESTE_ANO", label: "Este año" }, 
    { id: "TODOS", label: "Todos" }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Segmented value={filtroTiempo} onChange={setFiltroTiempo} options={botones} />
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 16 }}>
        <Columna 
          st={st}
          titulo="Deuda en Dólares" 
          llaves={keysUSD} 
          data={ag.USD} 
          color={C.green} 
          colorSoft={C.greenSoft} 
          moneda="USD" 
        />
        <Columna 
          st={st}
          titulo="Deuda en Bolívares" 
          llaves={keysBS} 
          data={ag.BS} 
          color={C.azul} 
          colorSoft={C.azulSoft} 
          moneda="BS" 
        />
      </div>
    </div>
  );
}

/* ============================================================
   SUB-COMPONENTE AISLADO: COLUMNA
   Renderiza la lista agrupada de pagos para una moneda en particular
   ============================================================ */
function Columna({ st, titulo, llaves, data, color, colorSoft, moneda }) {
  const hoy = hoy0();
  const totCol = (keys, data) => keys.reduce((a, k) => a + data[k].reduce((s, c) => s + pendienteDe(st, c), 0), 0);
  const cntCol = (keys, data) => keys.reduce((a, k) => a + data[k].length, 0);
  const nMonth = (k) => new Date(k + "-02").toLocaleString("es-VE", { month: "long", year: "numeric" }).toUpperCase();

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {/* Cabecera de la columna */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${C.line}`, borderTop: `4px solid ${color}` }}>
        <div>
          <div style={{ fontFamily: FONTS.SERIF, fontSize: 17, fontWeight: 700, color: C.ink }}>{titulo}</div>
          <div style={{ fontSize: 11.5, color: C.mut }}>{cntCol(llaves, data)} pago(s) programado(s)</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10.5, color: C.mut, fontWeight: 700, letterSpacing: 0.3 }}>TOTAL</div>
          <div style={{ fontFamily: FONTS.SERIF, fontSize: 20, fontWeight: 700, color }}>{money(totCol(llaves, data), moneda)}</div>
        </div>
      </div>
      
      {/* Cuerpo y listado */}
      <div style={{ padding: 16 }}>
        {llaves.length === 0 ? (
          <div style={{ fontSize: 13, color: C.mut, fontStyle: "italic", padding: "8px 2px" }}>
            Sin pagos en este período.
          </div>
        ) : (
          llaves.map((mes) => {
            const arr = data[mes].sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || ""));
            const totalMes = arr.reduce((a, c) => a + pendienteDe(st, c), 0);
            
            return (
              <div key={mes} style={{ marginBottom: 18 }}>
                {/* Separador de Mes */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: colorSoft, padding: "6px 12px", borderRadius: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color, letterSpacing: 0.5 }}>{nMonth(mes)}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{money(totalMes, moneda)}</span>
                </div>
                
                {/* Lista de facturas de ese mes */}
                <div style={{ display: "grid", gap: 6 }}>
                  {arr.map((c) => {
                    const dv = diasEntre(hoy, parseD(c.fechaVencimiento));
                    const venc = dv < 0;
                    const prox = dv >= 0 && dv <= 7;
                    
                    return (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 11px", border: `1px solid ${venc ? "var(--rojo-line)" : C.line}`, background: venc ? C.rojoSoft : C.surface, borderRadius: 10 }}>
                        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {provNom(st, c.proveedorId)}
                          </div>
                          <div style={{ fontSize: 11, color: C.mut, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {fmtD(c.fechaVencimiento)}
                            {venc ? <Badge tone="rojo">Vencido {Math.abs(dv)}d</Badge> : prox ? <Badge tone="amar">En {dv}d</Badge> : null}
                            {!c.bancoAsignadoId ? <Badge tone="mut">Sin banco</Badge> : null}
                          </div>
                        </div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                          {money(pendienteDe(st, c), moneda)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}