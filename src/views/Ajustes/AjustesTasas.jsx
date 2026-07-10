import React, { useState } from "react";

// Tema y finanzas
import { C, FONTS } from "../../constants/theme";
import { nf, hoyStr } from "../../utils/finance";
import { fetchTasaBCV, fetchTasaParalelo, fetchSugerenciaIntervencion } from "../../utils/tasasExternas";

// Componentes UI
import { Section, Card } from "../../components/ui/Layout";
import { Btn } from "../../components/ui/Buttons";
import { RefreshCw } from "lucide-react";

export default function AjustesTasas({ st, act }) {
  const [sincronizando, setSincronizando] = useState(false);
  const [resultado, setResultado] = useState(null); // texto del último intento manual
  const [sugerenciaInterv, setSugerenciaInterv] = useState(null); // promedio sugerido (no aplicado solo)

  // Definición de las tasas que queremos manejar y sus colores asociados
  const rates = [
    { k: "tasaBCV", lbl: "BCV (oficial)", tone: C.green, auto: true },
    { k: "tasaIntervencion", lbl: "Intervención", tone: C.gold, auto: false },
    { k: "tasaParalelo", lbl: "Mercado paralelo", tone: C.rojo, auto: true }
  ];

  const hoy = hoyStr();
  const sincronizadoHoy = st.tasasAutoActualizadas === hoy;

  const actualizarAhora = async () => {
    setSincronizando(true);
    setResultado(null);
    const [bcv, paralelo, sugerencia] = await Promise.all([
      fetchTasaBCV(),
      fetchTasaParalelo(),
      fetchSugerenciaIntervencion()
    ]);
    if (bcv) act.setRate("tasaBCV", String(bcv));
    if (paralelo) act.setRate("tasaParalelo", String(paralelo));
    act.marcarTasasAutoActualizadas(hoy);
    setSugerenciaInterv(sugerencia);

    const logros = [bcv && "BCV", paralelo && "Paralelo"].filter(Boolean);
    setResultado(
      logros.length
        ? `Actualizado: ${logros.join(" y ")}.`
        : "No se pudo contactar la fuente externa. Puedes seguir editando las tasas manualmente."
    );
    setSincronizando(false);
  };

  return (
    <Section
      title="Tasas de Cambio"
      desc="Ajusta las tasas del día. Esto revaloriza en tiempo real la deuda en bolívares y sus equivalentes en dólares."
      action={
        <div style={{ textAlign: "right" }}>
          <Btn small variant="ghost" onClick={actualizarAhora} disabled={sincronizando}>
            <RefreshCw size={13} className={sincronizando ? "cad-spin" : ""} />
            {sincronizando ? "Actualizando…" : "Actualizar BCV y Paralelo ahora"}
          </Btn>
          <div style={{ fontSize: 11, color: C.mut, marginTop: 6 }}>
            {sincronizadoHoy ? "✓ Sincronizado automáticamente hoy" : "Aún no se ha sincronizado hoy"}
          </div>
        </div>
      }
    >
      {resultado && (
        <div style={{ background: C.greenSoft, color: C.greenDk, padding: "10px 14px", borderRadius: 10, fontSize: 12.5, marginBottom: 14 }}>
          {resultado}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        {rates.map((r) => (
          <Card key={r.k} style={{ padding: 18, borderTop: `4px solid ${r.tone}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: C.mut, fontWeight: 700, letterSpacing: 0.2 }}>
                {r.lbl}
              </div>
              {r.auto && (
                <span style={{ fontSize: 10, fontWeight: 700, color: C.green, background: C.greenSoft, padding: "2px 7px", borderRadius: 999, letterSpacing: 0.3 }}>
                  AUTO
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 15, color: C.mut, fontWeight: 600 }}>Bs</span>
              <input
                type="number"
                value={st.config[r.k] ?? ""}
                onChange={(e) => act.setRate(r.k, e.target.value)}
                style={{
                  width: "100%",
                  border: "none",
                  borderBottom: `2px solid ${C.line}`,
                  fontFamily: FONTS.SERIF,
                  fontSize: 30,
                  fontWeight: 700,
                  color: r.tone,
                  background: "transparent",
                  padding: "2px 0",
                  outline: "none",
                  fontVariantNumeric: "tabular-nums"
                }}
              />
            </div>

            <div style={{ fontSize: 11.5, color: C.mut, marginTop: 8 }}>
              1 USD = {nf.format(Number(st.config[r.k]) || 0)} Bs
            </div>

            {/* Sugerencia de Intervención: promedio BCV/Paralelo, nunca se aplica sola */}
            {r.k === "tasaIntervencion" && sugerenciaInterv && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${C.line}` }}>
                <div style={{ fontSize: 11, color: C.mut }}>
                  Sugerencia (promedio BCV/Paralelo): <b style={{ color: C.ink }}>Bs {nf.format(sugerenciaInterv)}</b>
                </div>
                <Btn small variant="soft" onClick={() => { act.setRate("tasaIntervencion", String(sugerenciaInterv)); setSugerenciaInterv(null); }}>
                  Usar
                </Btn>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div style={{ fontSize: 11.5, color: C.mut, marginTop: 16, maxWidth: 640 }}>
        BCV y Paralelo se intentan sincronizar solos una vez al día (cuando un Master o Tesorería
        abre la app). Intervención se mantiene manual porque no existe una fuente pública que
        publique exactamente ese dato — al actualizar verás una sugerencia calculada (promedio
        entre BCV y Paralelo) que puedes aceptar con un clic o ignorar y seguir con tu propio número.
      </div>
    </Section>
  );
}
