import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, AlertCircle } from "lucide-react";
import { C, FONTS } from "../../constants/theme";
import { activo, pendienteDe, provNom, fmtD, money, hoy0 } from "../../utils/finance";
import { feriadosDeFecha, esFinDeSemana, PAISES } from "../../utils/feriados";
import { Card } from "../../components/ui/Layout";
import { Btn } from "../../components/ui/Buttons";
import { Badge } from "../../components/ui/Data";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function yyyymmdd(d) {
  return d.toISOString().slice(0, 10);
}

/** Arma la grilla del mes: días del mes anterior/siguiente incluidos para completar semanas. */
function construirGrilla(anio, mes) {
  const primerDia = new Date(anio, mes, 1);
  const offset = (primerDia.getDay() + 6) % 7; // 0=lunes..6=domingo
  const inicio = new Date(anio, mes, 1 - offset);

  const celdas = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    celdas.push(d);
  }
  const ultimaFilaFueraDelMes = celdas.slice(35, 42).every((d) => d.getMonth() !== mes);
  return ultimaFilaFueraDelMes ? celdas.slice(0, 35) : celdas;
}

/**
 * Calendario mensual: cada día muestra si hay pagos pendientes venciendo
 * ese día (color según urgencia), si es fin de semana, y si es feriado
 * bancario en Venezuela, Estados Unidos o Panamá — para planificar pagos
 * considerando cuándo la banca de cada país sí opera.
 */
export default function CalendarioPagos({ st }) {
  const hoy = hoy0();
  const [cursor, setCursor] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [diaSel, setDiaSel] = useState(yyyymmdd(hoy));

  const anio = cursor.getFullYear();
  const mes = cursor.getMonth();

  const porDia = useMemo(() => {
    const mapa = {};
    (st.compromisos || []).filter((c) => activo(st, c) && c.fechaVencimiento).forEach((c) => {
      const key = c.fechaVencimiento;
      if (!mapa[key]) mapa[key] = [];
      mapa[key].push(c);
    });
    return mapa;
  }, [st]);

  const celdas = useMemo(() => construirGrilla(anio, mes), [anio, mes]);
  const hoyStr = yyyymmdd(hoy);

  const listaDelDia = (porDia[diaSel] || []).sort((a, b) => provNom(st, a.proveedorId).localeCompare(provNom(st, b.proveedorId)));
  const totalDelDia = listaDelDia.reduce((a, c) => a + pendienteDe(st, c), 0);
  const feriadosSel = feriadosDeFecha(diaSel);
  const findeSel = esFinDeSemana(diaSel);
  const noBancarioSel = findeSel || feriadosSel.length > 0;

  const irMesAnterior = () => setCursor(new Date(anio, mes - 1, 1));
  const irMesSiguiente = () => setCursor(new Date(anio, mes + 1, 1));
  const irHoy = () => { setCursor(new Date(hoy.getFullYear(), hoy.getMonth(), 1)); setDiaSel(hoyStr); };

  return (
    <Card style={{ padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: C.greenSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CalendarDays size={16} color={C.greenDk} />
          </div>
          <div style={{ fontFamily: FONTS.SANS, fontSize: 17, fontWeight: 800, color: C.ink, letterSpacing: -0.3, textTransform: "capitalize" }}>
            {cursor.toLocaleDateString("es-VE", { month: "long", year: "numeric" })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn small variant="ghost" onClick={irMesAnterior}><ChevronLeft size={15} /></Btn>
          <Btn small variant="ghost" onClick={irHoy}>Hoy</Btn>
          <Btn small variant="ghost" onClick={irMesSiguiente}><ChevronRight size={15} /></Btn>
        </div>
      </div>

      {/* Encabezado de días de la semana */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 8 }}>
        {DIAS_SEMANA.map((d, i) => (
          <div key={d} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, color: i >= 5 ? C.mut2 : C.mut, textTransform: "uppercase", letterSpacing: 0.4 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grilla del mes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {celdas.map((d) => {
          const key = yyyymmdd(d);
          const fueraDelMes = d.getMonth() !== mes;
          const esHoy = key === hoyStr;
          const seleccionado = key === diaSel;
          const compromisosDia = porDia[key] || [];
          const totalDia = compromisosDia.reduce((a, c) => a + pendienteDe(st, c), 0);
          const vencido = key < hoyStr && compromisosDia.length > 0;
          const urgente = !vencido && key >= hoyStr && (new Date(key) - hoy) / 86400000 <= 7 && compromisosDia.length > 0;
          const colorPunto = vencido ? C.rojo : urgente ? C.amar : C.azul;

          const feriados = feriadosDeFecha(key);
          const finde = esFinDeSemana(key);
          const noLaboral = finde || feriados.length > 0;
          const monedaUnif = compromisosDia.length && compromisosDia.every((c) => c.moneda === compromisosDia[0].moneda) ? compromisosDia[0].moneda : "USD";
          const tituloFeriados = feriados.map((f) => `${PAISES[f.pais].bandera} ${f.nombre}`).join(" · ") || undefined;

          return (
            <button
              key={key}
              className="cad-cal-day"
              title={tituloFeriados}
              onClick={() => setDiaSel(key)}
              style={{
                minHeight: 74,
                padding: "7px 7px",
                borderRadius: 12,
                border: seleccionado ? `1.5px solid ${C.green}` : `1px solid ${C.line}`,
                background: seleccionado ? C.greenSoft : noLaboral && !fueraDelMes ? C.body : C.surface,
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                opacity: fueraDelMes ? 0.4 : 1,
                position: "relative"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{
                  fontSize: 11.5,
                  fontWeight: esHoy ? 800 : 600,
                  color: esHoy ? "#fff" : noLaboral ? C.mut : C.ink,
                  width: 21, height: 21, borderRadius: 999,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: esHoy ? C.green : "transparent"
                }}>
                  {d.getDate()}
                </div>
                {feriados.length > 0 && !fueraDelMes && (
                  <div style={{ display: "flex", gap: 2 }}>
                    {feriados.map((f) => (
                      <span key={f.pais} style={{ width: 6, height: 6, borderRadius: 999, background: PAISES[f.pais].color, flexShrink: 0 }} />
                    ))}
                  </div>
                )}
              </div>

              {compromisosDia.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: colorPunto, flexShrink: 0 }} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: colorPunto, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {compromisosDia.length} · {money(totalDia, monedaUnif)}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Detalle del día seleccionado */}
      <div style={{ marginTop: 20, paddingTop: 18, borderTop: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{fmtD(diaSel)}</span>
            {diaSel === hoyStr && <Badge tone="green">Hoy</Badge>}
            {findeSel && <Badge tone="mut">Fin de semana</Badge>}
          </div>
          {listaDelDia.length > 0 && (
            <div style={{ fontSize: 12.5, color: C.mut }}>
              {listaDelDia.length} pago(s) · total <b style={{ color: C.ink }}>{money(totalDelDia)}</b>
            </div>
          )}
        </div>

        {/* Feriados de cada país ese día */}
        {feriadosSel.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {feriadosSel.map((f) => (
              <span
                key={f.pais}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: PAISES[f.pais].color + "1A", color: PAISES[f.pais].color,
                  fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999
                }}
              >
                {PAISES[f.pais].bandera} {f.nombre}
              </span>
            ))}
          </div>
        )}

        {noBancarioSel && listaDelDia.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.amarSoft, color: C.amar, padding: "9px 12px", borderRadius: 10, fontSize: 12, marginBottom: 10 }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            {feriadosSel.length > 0
              ? `Hay pagos programados este día, pero no opera la banca en: ${feriadosSel.map((f) => PAISES[f.pais].etiqueta).join(", ")}. Considera si el banco del pago está en uno de esos países.`
              : "Es fin de semana — la banca generalmente no opera. Conviene mover estos pagos a un día hábil anterior."}
          </div>
        )}

        {listaDelDia.length === 0 ? (
          <div style={{ fontSize: 12.5, color: C.mut, fontStyle: "italic" }}>Sin pagos programados este día.</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {listaDelDia.map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 11px", border: `1px solid ${C.line}`, borderRadius: 10 }}>
                <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {provNom(st, c.proveedorId)}
                  </div>
                  <div style={{ fontSize: 11, color: C.mut, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.descripcion || c.numeroPedidoOdoo || "—"}
                  </div>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {money(pendienteDe(st, c), c.moneda)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div style={{ display: "flex", gap: 16, marginTop: 18, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: C.mut }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: C.rojo }} /> Vencido
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: C.mut }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: C.amar }} /> Próximos 7 días
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: C.mut }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: C.azul }} /> Programado
        </span>
        {Object.entries(PAISES).map(([cod, p]) => (
          <span key={cod} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: C.mut }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: p.color }} /> Feriado {p.bandera} {p.etiqueta}
          </span>
        ))}
      </div>
    </Card>
  );
}
