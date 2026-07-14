import React, { useState } from "react";

// Tema y finanzas
import { C, FONTS } from "../../constants/theme";
import { nf, hoyStr } from "../../utils/finance";
import { fetchTasaBCV, fetchTasaParalelo, fetchSugerenciaIntervencion, fetchTasasBDV } from "../../utils/tasasExternas";

// Componentes UI
import { Section, Card, Modal, Empty } from "../../components/ui/Layout";
import { Btn } from "../../components/ui/Buttons";
import { Field, Input } from "../../components/ui/Forms";
import { Th, Td } from "../../components/ui/Table";
import { RefreshCw, History, Plus, Pencil, Trash2, CalendarClock } from "lucide-react";

export default function AjustesTasas({ st, act }) {
  const [sincronizando, setSincronizando] = useState(false);
  const [resultado, setResultado] = useState(null); // texto del último intento manual
  const [sugerenciaInterv, setSugerenciaInterv] = useState(null); // promedio sugerido (no aplicado solo)
  const [modalHistorial, setModalHistorial] = useState(null); // null | "new" | fecha a editar

  // Definición de las tasas que queremos manejar y sus colores asociados
  const historialOrdenado = Object.entries(st.historialTasas || {}).sort((a, b) => b[0].localeCompare(a[0]));

  const rates = [
    { k: "tasaBCV", lbl: "BCV (oficial, USD)", tone: C.green, auto: true },
    { k: "tasaIntervencion", lbl: "Intervención", tone: C.gold, auto: false },
    { k: "tasaParalelo", lbl: "Mercado paralelo", tone: C.rojo, auto: true },
    { k: "tasaBcvEuro", lbl: "BCV (Euro)", tone: C.azul, auto: true }
  ];

  const hoy = hoyStr();
  const sincronizadoHoy = st.tasasAutoActualizadas === hoy;

  const actualizarAhora = async () => {
    setSincronizando(true);
    setResultado(null);
    // El dólar y el euro del BCV salen del MISMO archivo — lo pedimos una
    // sola vez (en paralelo con Paralelo e Intervención, que son fuentes
    // distintas) en vez de pedirlo dos veces por separado.
    const [bdv, paralelo, sugerencia] = await Promise.all([
      fetchTasasBDV(),
      fetchTasaParalelo(),
      fetchSugerenciaIntervencion()
    ]);
    const bcv = bdv.dolar || await fetchTasaBCV(); // respaldo solo si BDV falló
    const euro = bdv.euro;

    if (bcv) act.setRate("tasaBCV", String(bcv));
    if (paralelo) act.setRate("tasaParalelo", String(paralelo));
    if (euro) act.setRate("tasaBcvEuro", String(euro));
    act.marcarTasasAutoActualizadas(hoy);
    setSugerenciaInterv(sugerencia);

    const logros = [bcv && "BCV", paralelo && "Paralelo", euro && "Euro"].filter(Boolean);
    setResultado(
      logros.length
        ? `Actualizado: ${logros.join(", ")}.`
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
            {sincronizando ? "Actualizando…" : "Actualizar BCV, Paralelo y Euro ahora"}
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
        BCV, Paralelo y BCV Euro se intentan sincronizar solos una vez al día (cuando un Master o
        Tesorería abre la app). Intervención se mantiene manual porque no existe una fuente pública
        que publique exactamente ese dato — al actualizar verás una sugerencia calculada (promedio
        entre BCV y Paralelo) que puedes aceptar con un clic o ignorar y seguir con tu propio número.
      </div>

      {/* Historial de tasas por día */}
      <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <History size={16} color={C.mut} />
          <h3 style={{ fontFamily: FONTS.SANS, fontSize: 15, fontWeight: 800, color: C.ink, margin: 0 }}>Historial de tasas por día</h3>
        </div>
        <Btn small onClick={() => setModalHistorial("new")}>
          <Plus size={13} /> Agregar tasa de un día
        </Btn>
      </div>

      <div style={{ fontSize: 12, color: C.mut, marginBottom: 12, maxWidth: 640 }}>
        Cuando registras un pago con una fecha pasada, el sistema busca aquí la tasa que estaba
        vigente ese día. Si nadie abrió el sistema ese día, no queda foto guardada — aquí puedes
        rellenarla a mano para que los pagos atrasados usen la tasa correcta en vez de la de hoy.
      </div>

      {historialOrdenado.length === 0 ? (
        <Empty icon={CalendarClock} title="Sin historial todavía" msg="Se va guardando solo cada día que alguien abre el sistema." />
      ) : (
        <Card>
          <div className="cad-table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>Fecha</Th>
                  <Th right>BCV</Th>
                  <Th right>Intervención</Th>
                  <Th right>Paralelo</Th>
                  <Th right>BCV Euro</Th>
                  <Th right>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {historialOrdenado.map(([fecha, tasas]) => (
                  <tr key={fecha}>
                    <Td bold>{fecha}</Td>
                    <Td right>{nf.format(Number(tasas.tasaBCV) || 0)}</Td>
                    <Td right>{nf.format(Number(tasas.tasaIntervencion) || 0)}</Td>
                    <Td right>{nf.format(Number(tasas.tasaParalelo) || 0)}</Td>
                    <Td right>{nf.format(Number(tasas.tasaBcvEuro) || 0)}</Td>
                    <Td right>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <Btn small variant="ghost" onClick={() => setModalHistorial(fecha)}>
                          <Pencil size={13} />
                        </Btn>
                        <Btn small variant="danger" onClick={() => act.eliminarTasaHistorica(fecha)}>
                          <Trash2 size={13} />
                        </Btn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {modalHistorial && (
        <TasaHistoricaModal
          fechaInicial={modalHistorial === "new" ? hoy : modalHistorial}
          datosIniciales={modalHistorial !== "new" ? st.historialTasas[modalHistorial] : null}
          fechasExistentes={Object.keys(st.historialTasas || {})}
          onClose={() => setModalHistorial(null)}
          onSave={(fecha, tasas) => { act.guardarTasaHistorica(fecha, tasas); setModalHistorial(null); }}
        />
      )}
    </Section>
  );
}

/* ============================================================
   MODAL: AGREGAR / EDITAR LA TASA DE UN DÍA ESPECÍFICO
   ============================================================ */
function TasaHistoricaModal({ fechaInicial, datosIniciales, fechasExistentes, onClose, onSave }) {
  const [fecha, setFecha] = useState(fechaInicial);
  const [tasas, setTasas] = useState(datosIniciales || { tasaBCV: "", tasaIntervencion: "", tasaParalelo: "", tasaBcvEuro: "" });

  const esEdicion = !!datosIniciales;
  const fechaYaExiste = !esEdicion && fechasExistentes.includes(fecha);

  const guardar = () => {
    if (!fecha) return;
    onSave(fecha, {
      tasaBCV: Number(tasas.tasaBCV) || 0,
      tasaIntervencion: Number(tasas.tasaIntervencion) || 0,
      tasaParalelo: Number(tasas.tasaParalelo) || 0,
      tasaBcvEuro: Number(tasas.tasaBcvEuro) || 0
    });
  };

  return (
    <Modal title={esEdicion ? `Editar tasas del ${fecha}` : "Agregar tasa de un día"} onClose={onClose}>
      <Field label="Fecha">
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} disabled={esEdicion} />
      </Field>
      {fechaYaExiste && (
        <div style={{ fontSize: 11.5, color: C.rojo, marginTop: -8, marginBottom: 12 }}>
          Ya existe una tasa guardada para ese día — si guardas, se reemplaza.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="BCV (oficial, USD)">
          <Input type="number" value={tasas.tasaBCV} onChange={(e) => setTasas({ ...tasas, tasaBCV: e.target.value })} />
        </Field>
        <Field label="Intervención">
          <Input type="number" value={tasas.tasaIntervencion} onChange={(e) => setTasas({ ...tasas, tasaIntervencion: e.target.value })} />
        </Field>
        <Field label="Mercado paralelo">
          <Input type="number" value={tasas.tasaParalelo} onChange={(e) => setTasas({ ...tasas, tasaParalelo: e.target.value })} />
        </Field>
        <Field label="BCV (Euro)">
          <Input type="number" value={tasas.tasaBcvEuro} onChange={(e) => setTasas({ ...tasas, tasaBcvEuro: e.target.value })} />
        </Field>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={guardar}>Guardar</Btn>
      </div>
    </Modal>
  );
}
