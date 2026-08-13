import React, { useState } from "react";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, ArrowLeft } from "lucide-react";

import { C, FONTS } from "../../constants/theme";
import { leerArchivoTabular, normalizarFilasOdoo, sugerirTasaHistorica, convertirConTasaManual } from "../../utils/importarOdooManual";
import { useArrastrarArchivo } from "../../hooks/useArrastrarArchivo";

import { Card } from "../../components/ui/Layout";
import { Segmented, Btn } from "../../components/ui/Buttons";
import { Field, Select } from "../../components/ui/Forms";
import { Th, Td } from "../../components/ui/Table";

/**
 * Prueba del flujo de integración SIN necesitar la API todavía, con un
 * paso de REVISIÓN MANUAL a propósito: en vez de confiar ciegamente en la
 * columna de moneda que trae el export de Odoo (el equipo a veces registra
 * en Bs pedidos que en el fondo son en dólares, o al revés), primero se
 * revisa pedido por pedido y se decide $/Bs a mano, y SOLO ENTONCES se
 * convierte con la tasa BCV de la fecha del pedido.
 */
export default function ImportarOdooManual({ st, act }) {
  const [tipo, setTipo] = useState("COMPRA"); // "COMPRA" | "VENTA"
  const [paso, setPaso] = useState(0); // 0: archivo + mapeo · 1: revisar moneda por fila

  const [nombreArchivo, setNombreArchivo] = useState("");
  const [filasCrudas, setFilasCrudas] = useState(null);
  const [errorArchivo, setErrorArchivo] = useState(null);
  const [leyendo, setLeyendo] = useState(false);

  const [colNumero, setColNumero] = useState(null);
  const [colContacto, setColContacto] = useState(null);
  const [colRif, setColRif] = useState(null);
  const [colMonto, setColMonto] = useState(null);
  const [colFecha, setColFecha] = useState(null);
  const [colMoneda, setColMoneda] = useState(null);
  const [colProducto, setColProducto] = useState(null);

  const [filasRevision, setFilasRevision] = useState([]);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const encabezados = filasCrudas ? filasCrudas[0] : [];
  const datos = filasCrudas ? filasCrudas.slice(1) : [];

  const onArchivo = async (file) => {
    if (!file) return;
    setLeyendo(true);
    setErrorArchivo(null);
    setNombreArchivo(file.name);
    try {
      const nombre = (file.name || "").toLowerCase();
      if (!/\.(csv|xls|xlsx)$/.test(nombre)) {
        throw new Error("Formato no soportado — sube un archivo .csv, .xls o .xlsx (el que exporta Odoo).");
      }
      const filas = await leerArchivoTabular(file);
      if (filas.length < 2) throw new Error("El archivo no tiene filas suficientes (se espera un encabezado + datos).");
      setFilasCrudas(filas);

      const hdrs = filas[0];
      const guess = (palabras, excluir = []) => hdrs.findIndex((h) => {
        const s = String(h).toLowerCase();
        if (excluir.some((e) => s.includes(e))) return false;
        return palabras.some((p) => s.includes(p));
      });
      const iNum = guess(["referencia", "número", "numero", "num.", "factura"]);
      const iCon = guess(["proveedor", "cliente", "contacto", "empresa"], ["identificación", "identificacion"]);
      const iRif = guess(["identificación fiscal", "identificacion fiscal", "rif", "nif", "vat"]);
      const iMonto = guess(["total", "monto", "importe"]);
      const iFecha = guess(["fecha"]);
      const iMoneda = guess(["símbolo", "simbolo"], ["creado"]);
      const iProducto = guess(["producto", "descripción", "descripcion", "detalle", "concepto"]);
      setColNumero(iNum >= 0 ? iNum : 0);
      setColContacto(iCon >= 0 ? iCon : null);
      setColRif(iRif >= 0 ? iRif : null);
      setColMonto(iMonto >= 0 ? iMonto : null);
      setColFecha(iFecha >= 0 ? iFecha : null);
      setColMoneda(iMoneda >= 0 ? iMoneda : null);
      setColProducto(iProducto >= 0 ? iProducto : null);
    } catch (e) {
      setErrorArchivo(e.message || "No se pudo leer el archivo.");
      setFilasCrudas(null);
    }
    setLeyendo(false);
  };

  const { arrastrando, dragProps } = useArrastrarArchivo((archivos) => onArchivo(archivos[0]), leyendo);

  const mapeo = { colNumero, colContacto, colRif, colMonto, colFecha, colMoneda, colProducto };
  const listoParaMapeo = colNumero != null && colMonto != null;

  const [tasaMasiva, setTasaMasiva] = useState("");

  const irARevision = () => {
    const base = normalizarFilasOdoo(datos, mapeo);
    // Punto de partida: lo que diga la columna detectada de Odoo — pero
    // queda 100% editable a mano en el paso siguiente, fila por fila. La
    // tasa se PRE-SUGIERE del historial (si hay), pero es solo un punto de
    // partida — la que de verdad se usa es la que el usuario confirme o
    // corrija, porque puede conocer la tasa real de la transferencia. El
    // RIF de Odoo llega solo con números (sin la letra V/J/E/G) — se
    // sugiere "J" por defecto (lo normal para un proveedor tipo empresa),
    // editable por fila si alguno es persona natural u otro tipo.
    const conEleccion = base.map((f) => {
      const esBs = /bs/i.test(f.monedaOriginal || "");
      const sugerida = esBs && st ? sugerirTasaHistorica(st, f.fecha) : 0;
      return { ...f, monedaElegida: esBs ? "BS" : "USD", tasaManual: sugerida > 0 ? String(sugerida.toFixed(2)) : "", letraRif: "J" };
    });
    setFilasRevision(conEleccion);
    setResultado(null);
    setPaso(1);
  };

  const cambiarMoneda = (idx, valor) => {
    setFilasRevision((prev) => prev.map((f, i) => {
      if (i !== idx) return f;
      // Al pasar a Bs sin tasa todavía, sugiere la del historial como punto de partida
      const tasaManual = valor === "BS" && !f.tasaManual && st ? (() => {
        const s = sugerirTasaHistorica(st, f.fecha);
        return s > 0 ? String(s.toFixed(2)) : "";
      })() : f.tasaManual;
      return { ...f, monedaElegida: valor, tasaManual };
    }));
  };

  const cambiarTasa = (idx, valor) => {
    setFilasRevision((prev) => prev.map((f, i) => (i === idx ? { ...f, tasaManual: valor } : f)));
  };

  const cambiarLetraRif = (idx, valor) => {
    setFilasRevision((prev) => prev.map((f, i) => (i === idx ? { ...f, letraRif: valor } : f)));
  };

  const marcarTodos = (valor) => setFilasRevision((prev) => prev.map((f) => ({ ...f, monedaElegida: valor })));

  const aplicarTasaATodasEnBs = () => {
    if (!tasaMasiva) return;
    setFilasRevision((prev) => prev.map((f) => (f.monedaElegida === "BS" ? { ...f, tasaManual: tasaMasiva } : f)));
  };

  const filasConvertidas = convertirConTasaManual(filasRevision);
  const totalUSD = filasConvertidas.filter((f) => f.monedaElegida === "USD").length;
  const totalBS = filasConvertidas.filter((f) => f.monedaElegida === "BS" && !f.sinTasa).length;
  const totalSinTasa = filasConvertidas.filter((f) => f.sinTasa).length;

  const importar = () => {
    setImportando(true);
    // El RIF final lleva la letra recién aquí, al momento de importar — en
    // pantalla se sigue mostrando el número crudo de Odoo + el selector,
    // por separado, para no duplicar la letra visualmente.
    const filasParaImportar = filasConvertidas.map((f) => ({
      ...f,
      rif: f.rif && f.letraRif ? `${f.letraRif}-${f.rif}` : f.rif
    }));
    const r = tipo === "COMPRA" ? act.importarPedidosOdooManual(filasParaImportar) : act.importarFacturasOdooManual(filasParaImportar);
    setResultado(r);
    setImportando(false);
  };

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ fontFamily: FONTS.SANS, fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 6 }}>
        Probar ahora: importar desde un archivo exportado de Odoo
      </div>
      <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 14, lineHeight: 1.5 }}>
        Mientras no tengas la API habilitada, exporta la lista desde Odoo (vista de lista → ícono ⚙ →
        Exportar, en CSV o Excel) y súbela aquí. Antes de importar, revisas TÚ pedido por pedido si es
        realmente en dólares o en bolívares, y si es en Bs, escribes la tasa que de verdad usaste en la
        transferencia (el sistema te sugiere la BCV histórica como punto de partida, pero la que manda es
        la que tú confirmes).
      </div>

      <div style={{ marginBottom: 14 }}>
        <Segmented
          value={tipo}
          onChange={(v) => { setTipo(v); setPaso(0); setFilasCrudas(null); setResultado(null); }}
          options={[{ id: "COMPRA", label: "Pedidos de compra" }, { id: "VENTA", label: "Facturas de venta" }]}
        />
      </div>

      {paso === 0 && (
        <>
          <label
            {...dragProps}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "22px 14px", marginBottom: 14, border: `2px dashed ${arrastrando ? C.verde : C.line}`, borderRadius: 12,
              background: arrastrando ? C.greenSoft : C.body, cursor: leyendo ? "default" : "pointer", textAlign: "center",
              transition: "border-color .15s, background .15s"
            }}
          >
            <input type="file" accept=".csv,.xls,.xlsx" hidden disabled={leyendo} onChange={(e) => { onArchivo(e.target.files?.[0]); e.target.value = ""; }} />
            <Upload size={20} color={arrastrando ? C.verde : C.mut} />
            <div style={{ fontSize: 12.5, fontWeight: 700, color: arrastrando ? C.verde : C.ink }}>
              {leyendo ? "Leyendo archivo…" : arrastrando ? "Suelta aquí el archivo" : nombreArchivo || "Arrastra el archivo aquí o haz clic para elegirlo"}
            </div>
            <div style={{ fontSize: 11, color: C.mut }}>
              {filasCrudas && !leyendo ? `${datos.length} fila(s) de datos detectadas` : "Acepta .csv, .xls o .xlsx"}
            </div>
          </label>

          {errorArchivo && (
            <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: C.rojoSoft, borderRadius: 10, marginBottom: 14, fontSize: 12.5 }}>
              <AlertTriangle size={15} color={C.rojo} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{errorArchivo}</span>
            </div>
          )}

          {filasCrudas && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 8 }}>¿Qué columna es cuál?</div>
              {colNumero != null && colContacto != null && colRif != null && colMonto != null && colFecha != null && colMoneda != null && (
                <div style={{ display: "flex", gap: 8, padding: "9px 11px", background: C.greenSoft, borderRadius: 10, marginBottom: 12, fontSize: 11.5 }}>
                  <CheckCircle2 size={14} color={C.verde} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>El sistema detectó solo todas las columnas de este formato. Revisa que estén bien abajo y continúa — no debería hacer falta cambiar nada.</span>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <Field label={tipo === "COMPRA" ? "Columna del N° de pedido" : "Columna del N° de factura"}>
                  <Select value={colNumero ?? ""} onChange={(e) => setColNumero(Number(e.target.value))}>
                    {encabezados.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                  </Select>
                </Field>
                <Field label={tipo === "COMPRA" ? "Columna del proveedor" : "Columna del cliente"}>
                  <Select value={colContacto ?? ""} onChange={(e) => setColContacto(e.target.value === "" ? null : Number(e.target.value))}>
                    <option value="">(ninguna)</option>
                    {encabezados.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                  </Select>
                </Field>
                <Field label="Columna de RIF (opcional, recomendada)">
                  <Select value={colRif ?? ""} onChange={(e) => setColRif(e.target.value === "" ? null : Number(e.target.value))}>
                    <option value="">(ninguna — empareja solo por nombre)</option>
                    {encabezados.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                  </Select>
                </Field>
                <Field label="Columna de monto total">
                  <Select value={colMonto ?? ""} onChange={(e) => setColMonto(Number(e.target.value))}>
                    <option value="">Elegir…</option>
                    {encabezados.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                  </Select>
                </Field>
                <Field label="Columna de fecha">
                  <Select value={colFecha ?? ""} onChange={(e) => setColFecha(e.target.value === "" ? null : Number(e.target.value))}>
                    <option value="">(ninguna — usa hoy)</option>
                    {encabezados.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                  </Select>
                </Field>
                <Field label="Columna de moneda ($ / Bs) — solo como punto de partida">
                  <Select value={colMoneda ?? ""} onChange={(e) => setColMoneda(e.target.value === "" ? null : Number(e.target.value))}>
                    <option value="">(ninguna — parte de $ para todos)</option>
                    {encabezados.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                  </Select>
                </Field>
                <Field label="Columna de producto/descripción (opcional)">
                  <Select value={colProducto ?? ""} onChange={(e) => setColProducto(e.target.value === "" ? null : Number(e.target.value))}>
                    <option value="">(ninguna)</option>
                    {encabezados.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                  </Select>
                </Field>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn onClick={irARevision} disabled={!listoParaMapeo}>Continuar a revisión de moneda →</Btn>
              </div>
            </>
          )}
        </>
      )}

      {paso === 1 && (
        <>
          <button
            onClick={() => setPaso(0)}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: C.mut, fontSize: 12, fontWeight: 600, padding: 0, marginBottom: 12 }}
          >
            <ArrowLeft size={13} /> Volver a elegir columnas
          </button>

          <div style={{ fontSize: 12.5, color: C.ink, marginBottom: 12, lineHeight: 1.5 }}>
            Revisa cada pedido y confirma si de verdad es en <b>$</b> o en <b>Bs</b> — el punto de partida es lo
            que dice Odoo, pero puedes cambiarlo. Para lo que dejes en Bs, escribe la tasa que usaste
            realmente en la transferencia (te sugerimos la BCV histórica, pero tú confirmas la real).
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Btn small variant="ghost" onClick={() => marcarTodos("USD")}>Marcar todos como $</Btn>
            <Btn small variant="ghost" onClick={() => marcarTodos("BS")}>Marcar todos como Bs</Btn>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
              <input
                type="number"
                value={tasaMasiva}
                onChange={(e) => setTasaMasiva(e.target.value)}
                placeholder="Tasa usada, ej. 740.10"
                style={{ width: 140, padding: "7px 10px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12.5 }}
              />
              <Btn small variant="soft" onClick={aplicarTasaATodasEnBs} disabled={!tasaMasiva}>
                Aplicar a todas las marcadas en Bs
              </Btn>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10, fontSize: 12 }}>
            <span style={{ color: C.mut }}>En $ <b style={{ color: C.ink }}>{totalUSD}</b></span>
            <span style={{ color: C.mut }}>En Bs, con tasa confirmada <b style={{ color: C.verde }}>{totalBS}</b></span>
            {totalSinTasa > 0 && <span style={{ color: C.rojo, fontWeight: 700 }}>Falta escribir la tasa {totalSinTasa}</span>}
          </div>

          <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden", marginBottom: 16, maxHeight: 380, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, background: C.surface, zIndex: 1 }}>
                <tr><Th>N°</Th><Th>Contacto</Th><Th>Producto</Th><Th>Fecha</Th><Th right>Monto</Th><Th>Es en…</Th><Th right>Tasa</Th><Th right>Monto USD</Th></tr>
              </thead>
              <tbody>
                {filasConvertidas.map((f, i) => (
                  <tr key={i} style={{ background: f.sinTasa ? C.rojoSoft : "transparent" }}>
                    <Td>{f.numero}</Td>
                    <Td style={{ maxWidth: 150 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.contacto || "—"}</div>
                      {f.rif && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                          <select
                            value={f.letraRif}
                            onChange={(e) => cambiarLetraRif(i, e.target.value)}
                            style={{ fontSize: 10.5, padding: "1px 3px", borderRadius: 5, border: `1px solid ${C.line}`, background: C.surface }}
                          >
                            <option value="J">J</option>
                            <option value="V">V</option>
                            <option value="E">E</option>
                            <option value="G">G</option>
                            <option value="P">P</option>
                          </select>
                          <span style={{ fontSize: 10.5, color: C.mut }}>-{f.rif}</span>
                        </div>
                      )}
                    </Td>
                    <Td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.producto}>{f.producto || "—"}</Td>
                    <Td>{f.fecha || "(hoy)"}</Td>
                    <Td right>{f.monto?.toFixed(2)}</Td>
                    <Td>
                      <Segmented
                        value={f.monedaElegida}
                        onChange={(v) => cambiarMoneda(i, v)}
                        options={[{ id: "USD", label: "$" }, { id: "BS", label: "Bs" }]}
                      />
                    </Td>
                    <Td right>
                      {f.monedaElegida === "BS" ? (
                        <input
                          type="number"
                          value={f.tasaManual}
                          onChange={(e) => cambiarTasa(i, e.target.value)}
                          placeholder="Tasa"
                          style={{ width: 84, padding: "5px 7px", borderRadius: 7, border: `1px solid ${f.sinTasa ? C.rojo : C.line}`, fontSize: 12, textAlign: "right" }}
                        />
                      ) : (
                        <span style={{ color: C.mut }}>—</span>
                      )}
                    </Td>
                    <Td right bold style={{ color: f.sinTasa ? C.rojo : C.ink }}>
                      {f.sinTasa ? "Sin tasa" : `$${f.montoUSD.toFixed(2)}`}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalSinTasa > 0 && (
            <div style={{ display: "flex", gap: 8, padding: "9px 11px", background: C.rojoSoft, borderRadius: 10, marginBottom: 14, fontSize: 11.5 }}>
              <AlertTriangle size={14} color={C.rojo} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                {totalSinTasa} pedido(s) marcados en Bs no tienen una tasa escrita todavía — se omitirán de esta
                importación hasta que escribas la tasa que usaste (o los marques como $ si al revisarlos
                confirmas que en realidad eran en dólares).
              </span>
            </div>
          )}

          <Btn onClick={importar} disabled={importando}>
            <Upload size={14} /> Importar {filasConvertidas.length - totalSinTasa} registro(s)
          </Btn>

          {resultado && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: C.greenSoft, display: "flex", gap: 10 }}>
              <CheckCircle2 size={18} color={C.verde} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 12.5, color: C.ink }}>
                {resultado.creados} nuevo(s), {resultado.omitidos} ya existía(n) (sin duplicar)
                {resultado.sinTasa > 0 && <>, {resultado.sinTasa} omitido(s) por falta de tasa</>}.
                Revisa {tipo === "COMPRA" ? "Módulo Compras" : "Módulo Ventas"} — verás el badge "Odoo" y, en los
                convertidos, el monto original en Bs junto al USD sincerado.
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
