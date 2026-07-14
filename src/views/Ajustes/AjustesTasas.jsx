import React, { useState } from "react";

// Tema y finanzas
import { C, FONTS } from "../../constants/theme";
import { nf, hoyStr } from "../../utils/finance";
import { fetchTasaBCV, fetchTasaParalelo, fetchSugerenciaIntervencion, fetchTasasBDV } from "../../utils/tasasExternas";
import { extraerTextoPDF } from "../../utils/leerPdfTexto";
import { useArrastrarArchivo } from "../../hooks/useArrastrarArchivo";

// Componentes UI
import { Section, Card, Modal, Empty } from "../../components/ui/Layout";
import { Btn } from "../../components/ui/Buttons";
import { Field, Input } from "../../components/ui/Forms";
import { Th, Td, Pagination } from "../../components/ui/Table";
import { usePaged } from "../../hooks/usePaged";
import { RefreshCw, History, Plus, Pencil, Trash2, CalendarClock, Upload } from "lucide-react";

export default function AjustesTasas({ st, act }) {
  const [sincronizando, setSincronizando] = useState(false);
  const [resultado, setResultado] = useState(null); // texto del último intento manual
  const [sugerenciaInterv, setSugerenciaInterv] = useState(null); // promedio sugerido (no aplicado solo)
  const [modalHistorial, setModalHistorial] = useState(null); // null | "new" | fecha a editar
  const [modalImportar, setModalImportar] = useState(false);
  const [resultadoImport, setResultadoImport] = useState(null); // texto tras importar en lote

  // Definición de las tasas que queremos manejar y sus colores asociados
  const historialOrdenado = Object.entries(st.historialTasas || {}).sort((a, b) => b[0].localeCompare(a[0]));
  const pgHistorial = usePaged(historialOrdenado, 15);

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
        <div style={{ display: "flex", gap: 8 }}>
          <Btn small variant="ghost" onClick={() => { setResultadoImport(null); setModalImportar(true); }}>
            <Upload size={13} /> Importar reporte
          </Btn>
          <Btn small onClick={() => setModalHistorial("new")}>
            <Plus size={13} /> Agregar tasa de un día
          </Btn>
        </div>
      </div>

      <div style={{ fontSize: 12, color: C.mut, marginBottom: 12, maxWidth: 640 }}>
        Cuando registras un pago con una fecha pasada, el sistema busca aquí la tasa que estaba
        vigente ese día. Si nadie abrió el sistema ese día, no queda foto guardada — aquí puedes
        rellenarla a mano para que los pagos atrasados usen la tasa correcta en vez de la de hoy.
      </div>

      {resultadoImport && (
        <div style={{ background: C.greenSoft, color: C.greenDk, padding: "10px 14px", borderRadius: 10, fontSize: 12.5, marginBottom: 14 }}>
          {resultadoImport}
        </div>
      )}

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
                {pgHistorial.slice.map(([fecha, tasas]) => (
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
          <Pagination pg={pgHistorial} opciones={[5, 10, 15, 20]} />
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
      {modalImportar && (
        <ImportarHistorialModal
          historialActual={st.historialTasas || {}}
          onClose={() => setModalImportar(false)}
          onImportar={(registros, sobrescribir, resumen) => {
            act.importarHistorialTasas(registros, sobrescribir);
            setModalImportar(false);
            setResultadoImport(resumen);
          }}
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

/* ============================================================
   IMPORTADOR EN LOTE: pega la tabla del reporte histórico
   ------------------------------------------------------------
   Acepta filas pegadas desde Excel/Sheets o copiadas del PDF.
   Cada fila debe traer, EN ESTE ORDEN: Fecha, BCV ($), BCV (€),
   Paralelo. Ignora en silencio cualquier línea sin fecha válida
   (encabezados, totales, texto suelto), así se puede pegar el
   reporte completo sin limpiarlo antes.
   ============================================================ */

/** Convierte "336,00" / "1.234,56" / "336.00" a número. Devuelve null si no es número. */
function aNumero(raw) {
  let s = String(raw ?? "").replace(/[^\d.,-]/g, "");
  if (s.includes(",") && s.includes(".")) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Normaliza una fecha DD/MM/AAAA (o AAAA-MM-DD) a AAAA-MM-DD. Devuelve null si no reconoce. */
function aFechaISO(texto) {
  const iso = texto.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = texto.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dmy) {
    let [, d, m, y] = dmy;
    if (y.length === 2) y = "20" + y;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

/**
 * Parsea el texto pegado. Devuelve { validas: [{fecha, tasaBCV, tasaBcvEuro,
 * tasaParalelo}], invalidas: [textoLinea] }. Una línea es "inválida" solo si
 * TIENE fecha pero le faltan las 3 tasas; las líneas sin fecha se ignoran.
 */
function parsearReporte(texto) {
  const validas = [];
  const invalidas = [];
  texto.split(/\r?\n/).forEach((linea) => {
    const raw = linea.trim();
    if (!raw) return;
    const mFecha = raw.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/);
    if (!mFecha) return; // sin fecha → encabezado/ruido, se ignora
    const fecha = aFechaISO(mFecha[0]);
    if (!fecha) return;
    const restante = raw.slice(mFecha.index + mFecha[0].length);
    const numeros = (restante.match(/[\d.,]+/g) || [])
      .map(aNumero)
      .filter((n) => n !== null && n > 0);
    if (numeros.length >= 3) {
      validas.push({ fecha, tasaBCV: numeros[0], tasaBcvEuro: numeros[1], tasaParalelo: numeros[2] });
    } else {
      invalidas.push(raw);
    }
  });
  return { validas, invalidas };
}

function ImportarHistorialModal({ historialActual, onClose, onImportar }) {
  const [texto, setTexto] = useState("");
  const [sobrescribir, setSobrescribir] = useState(false);
  const [leyendo, setLeyendo] = useState(false);

  // Lee un archivo soltado o elegido y vuelca su contenido en el área de
  // texto (que ya alimenta el parser y la vista previa). Acepta texto plano
  // (.txt/.csv/.tsv) y también el PDF del reporte directamente.
  const leerArchivo = async (archivo) => {
    if (!archivo) return;
    setLeyendo(true);
    try {
      const nombre = (archivo.name || "").toLowerCase();
      const contenido = nombre.endsWith(".pdf") ? await extraerTextoPDF(archivo) : await archivo.text();
      setTexto(contenido);
    } catch (e) {
      console.warn("No se pudo leer el archivo:", e);
    }
    setLeyendo(false);
  };

  const { arrastrando, dragProps } = useArrastrarArchivo((files) => leerArchivo(files[0]), leyendo);

  const { validas, invalidas } = parsearReporte(texto);
  const yaExisten = validas.filter((v) => historialActual[v.fecha]).length;
  const nuevas = validas.length - yaExisten;
  const aCargar = sobrescribir ? validas.length : nuevas;

  const importar = () => {
    if (validas.length === 0) return;
    const registros = {};
    validas.forEach((v) => {
      registros[v.fecha] = { tasaBCV: v.tasaBCV, tasaBcvEuro: v.tasaBcvEuro, tasaParalelo: v.tasaParalelo };
    });
    const partes = [];
    if (nuevas > 0) partes.push(`${nuevas} día(s) nuevo(s)`);
    if (sobrescribir && yaExisten > 0) partes.push(`${yaExisten} actualizado(s)`);
    if (!sobrescribir && yaExisten > 0) partes.push(`${yaExisten} ya existente(s) sin tocar`);
    onImportar(registros, sobrescribir, `Historial importado: ${partes.join(", ")}.`);
  };

  return (
    <Modal title="Importar reporte de tasas por día" wide onClose={onClose}>
      <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 10, lineHeight: 1.5 }}>
        Pega la tabla desde Excel/Sheets o directo del PDF. Cada fila debe traer, en este orden:
        {" "}<b style={{ color: C.ink }}>Fecha · BCV ($) · BCV (€) · Paralelo</b>. Las líneas sin
        fecha (encabezados, totales) se ignoran solas — puedes pegar el reporte completo.
        La <b>Intervención</b> no se importa (no viene en el reporte); se sigue cargando a mano.
      </div>

      <label
        {...dragProps}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "18px 14px",
          marginBottom: 12,
          border: `2px dashed ${arrastrando ? C.green : C.line}`,
          borderRadius: 12,
          background: arrastrando ? C.greenSoft : C.body,
          cursor: leyendo ? "default" : "pointer",
          textAlign: "center",
          transition: "border-color .15s, background .15s"
        }}
      >
        <input
          type="file"
          accept=".txt,.csv,.tsv,.pdf"
          hidden
          disabled={leyendo}
          onChange={(e) => { const a = e.target.files?.[0]; e.target.value = ""; leerArchivo(a); }}
        />
        <Upload size={20} color={arrastrando ? C.greenDk : C.mut} />
        <div style={{ fontSize: 12.5, fontWeight: 700, color: arrastrando ? C.greenDk : C.ink }}>
          {leyendo ? "Leyendo archivo…" : "Arrastra el archivo aquí o haz clic para elegirlo"}
        </div>
        <div style={{ fontSize: 11, color: C.mut }}>
          Acepta el reporte en PDF o un archivo de texto (.txt, .csv). También puedes pegar la tabla abajo.
        </div>
      </label>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={"01/01/2026\tBs. 336,00\tBs. 368,00\tBs. 415,00\n02/01/2026\tBs. 338,75\tBs. 371,44\tBs. 417,40\n..."}
        rows={10}
        style={{
          width: "100%",
          fontFamily: "monospace",
          fontSize: 12,
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          padding: 10,
          resize: "vertical",
          outline: "none",
          boxSizing: "border-box"
        }}
      />

      {texto.trim() && (
        <div style={{ background: C.body, padding: "10px 14px", borderRadius: 10, marginTop: 12, fontSize: 12.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: C.mut }}>Días detectados</span>
            <b style={{ color: C.ink }}>{validas.length}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: C.mut }}>Nuevos / ya en el historial</span>
            <b style={{ color: C.ink }}>{nuevas} / {yaExisten}</b>
          </div>
          {invalidas.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", color: C.rojo }}>
              <span>Líneas con fecha pero sin 3 tasas (se omiten)</span>
              <b>{invalidas.length}</b>
            </div>
          )}
          {validas.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.line}`, color: C.mut, fontSize: 11.5 }}>
              Ej.: {validas[0].fecha} → BCV {nf.format(validas[0].tasaBCV)} · € {nf.format(validas[0].tasaBcvEuro)} · Paralelo {nf.format(validas[0].tasaParalelo)}
              {validas.length > 1 && <> … hasta {validas[validas.length - 1].fecha}</>}
            </div>
          )}
        </div>
      )}

      {yaExisten > 0 && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 12.5, color: C.ink, cursor: "pointer" }}>
          <input type="checkbox" checked={sobrescribir} onChange={(e) => setSobrescribir(e.target.checked)} />
          Sobrescribir también los {yaExisten} día(s) que ya están guardados (la Intervención de esos días se conserva)
        </label>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={importar} disabled={aCargar === 0}>
          Importar {aCargar > 0 ? `${aCargar} día(s)` : ""}
        </Btn>
      </div>
    </Modal>
  );
}