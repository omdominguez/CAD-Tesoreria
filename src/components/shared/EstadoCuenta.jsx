import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";

// Tema y utilidades
import { C, FONTS } from "../../constants/theme";
import { fmtD, money } from "../../utils/finance";
import { exportarCSV, exportarExcel, exportarPDF } from "../../utils/exportar";

// Primitivas de interfaz
import { Th, Td } from "../ui/Table";
import { Badge } from "../ui/Data";
import { Segmented } from "../ui/Buttons";
import { Input } from "../ui/Forms";
import { ExportMenu } from "../ui/ExportMenu";

const slug = (s) =>
  (s || "cuenta")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/**
 * Estado de cuenta con filtros (tipo de movimiento, rango de fechas,
 * búsqueda por pedido/documento) y exportación a CSV — el archivo
 * exportado respeta exactamente lo que esté filtrado en pantalla.
 */
export function EstadoCuenta({ rows, nombreContacto = "cuenta", etiquetaCargo = "Cargo", etiquetaAbono = "Abono" }) {
  const [tipo, setTipo] = useState("TODOS");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [q, setQ] = useState("");

  const tiposDisponibles = useMemo(() => {
    const set = new Set((rows || []).map((r) => r.tipo));
    return Array.from(set);
  }, [rows]);

  const filtradas = useMemo(() => {
    return (rows || []).filter((r) => {
      if (tipo !== "TODOS" && r.tipo !== tipo) return false;
      if (desde && (r.fecha || "") < desde) return false;
      if (hasta && (r.fecha || "") > hasta) return false;
      if (q) {
        const s = q.toLowerCase();
        const enPedido = (r.pedido || "").toLowerCase().includes(s);
        const enDoc = (r.doc || "").toLowerCase().includes(s);
        const enDetalle = (r.detalle || "").toLowerCase().includes(s);
        if (!enPedido && !enDoc && !enDetalle) return false;
      }
      return true;
    });
  }, [rows, tipo, desde, hasta, q]);

  if (!rows || rows.length === 0) {
    return (
      <div style={{ color: C.mut, fontSize: 13, padding: "10px 0" }}>
        Sin movimientos registrados.
      </div>
    );
  }

  const saldoFinal = rows[rows.length - 1].saldo;
  const saldoMostrado = filtradas.length ? filtradas[filtradas.length - 1].saldo : saldoFinal;

  const columnasExport = [
    { key: "fecha", label: "Fecha" },
    { key: "tipo", label: "Tipo" },
    { key: "pedido", label: "Pedido / Factura" },
    { key: "doc", label: "Documento / Referencia" },
    { key: "detalle", label: "Concepto" },
    { key: "moneda", label: "Moneda" },
    { key: "cargo", label: etiquetaCargo },
    { key: "abono", label: etiquetaAbono },
    { key: "saldo", label: "Saldo (USD)" }
  ];

  const filasExport = () => filtradas.map((r) => ({ ...r, fecha: fmtD(r.fecha) }));
  const nombreArchivo = `estado_de_cuenta_${slug(nombreContacto)}`;

  const exportar = async (formato) => {
    if (formato === "csv") return exportarCSV(nombreArchivo, columnasExport, filasExport());
    if (formato === "excel") return exportarExcel(nombreArchivo, columnasExport, filasExport(), "Estado de cuenta");
    if (formato === "pdf") {
      return exportarPDF(nombreArchivo, columnasExport, filasExport(), {
        titulo: `Estado de cuenta — ${nombreContacto}`,
        subtitulo: `Saldo mostrado: ${money(saldoMostrado, "USD")} · generado ${fmtD(new Date().toISOString().slice(0, 10))}`
      });
    }
  };

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <Segmented
          value={tipo}
          onChange={setTipo}
          options={[{ id: "TODOS", label: "Todos" }, ...tiposDisponibles.map((t) => ({ id: t, label: t }))]}
        />
        <div style={{ position: "relative", flex: "1 1 180px", minWidth: 160 }}>
          <Search size={13} style={{ position: "absolute", left: 9, top: 9, color: C.mut }} />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por pedido, documento o concepto…" style={{ paddingLeft: 28, marginBottom: 0, fontSize: 12.5 }} />
        </div>
        <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ width: 132, marginBottom: 0, fontSize: 12.5 }} title="Desde" />
        <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ width: 132, marginBottom: 0, fontSize: 12.5 }} title="Hasta" />
        <ExportMenu onExport={exportar} disabled={filtradas.length === 0} />
      </div>

      {(tipo !== "TODOS" || desde || hasta || q) && (
        <div style={{ fontSize: 11, color: C.mut, marginBottom: 8 }}>
          Mostrando {filtradas.length} de {rows.length} movimientos · la exportación incluye solo lo filtrado
        </div>
      )}

      <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ maxHeight: 320, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Pedido / Documento</Th>
                <Th right>{etiquetaCargo}</Th>
                <Th right>{etiquetaAbono}</Th>
                <Th right>Saldo (USD)</Th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "22px 14px", textAlign: "center", color: C.mut, fontSize: 12.5 }}>
                    Ningún movimiento coincide con el filtro actual.
                  </td>
                </tr>
              ) : (
                filtradas.map((r, i) => (
                  <tr key={i}>
                    <Td>{fmtD(r.fecha)}</Td>
                    <Td>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        <Badge tone={r.cargo > 0 ? "gold" : "verde"}>{r.tipo}</Badge>
                        <span style={{ fontSize: 12.5 }}>{r.doc}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>{r.detalle}</div>
                    </Td>
                    <Td right>{r.cargo > 0 ? money(r.cargo, r.moneda) : "—"}</Td>
                    <Td right>
                      {r.abono > 0 ? (
                        <div>
                          <span style={{ color: C.verde }}>{money(r.abono, r.moneda)}</span>
                          {r.moneda !== "USD" && r.tasa && (
                            <div style={{ fontSize: 10.5, color: C.mut, fontWeight: 500 }}>
                              tasa {r.tasa} → {money(-r.usd, "USD")}
                            </div>
                          )}
                        </div>
                      ) : "—"}
                    </Td>
                    <Td right bold>
                      <span style={{ color: r.saldo > 0.005 ? C.rojo : C.verde }}>{money(r.saldo, "USD")}</span>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Resumen del Saldo */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: C.body, borderTop: `1px solid ${C.line}` }}>
          <span style={{ fontSize: 12.5, color: C.mut, fontWeight: 600 }}>
            {filtradas.length === rows.length ? "Saldo actual (equivalente USD)" : "Saldo al último movimiento filtrado"}
          </span>
          <span style={{ fontFamily: FONTS.SANS, fontSize: 18, fontWeight: 800, color: saldoMostrado > 0.005 ? C.rojo : C.verde }}>
            {money(saldoMostrado, "USD")}
          </span>
        </div>
      </div>
    </div>
  );
}
