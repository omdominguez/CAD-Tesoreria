import React from "react";

// Importa el tema y la lógica de formato
import { C, FONTS } from "../../constants/theme";
import { fmtD, money } from "../../utils/finance";

// Importa las primitivas de interfaz
import { Th, Td } from "../ui/Table";
import { Badge } from "../ui/Data";

export function EstadoCuenta({ rows, positivoEs }) {
  // positivoEs: nos sirve en un futuro para invertir la lógica de colores si es necesario.
  
  if (!rows || rows.length === 0) {
    return (
      <div style={{ color: C.mut, fontSize: 13, padding: "10px 0" }}>
        Sin movimientos registrados.
      </div>
    );
  }

  const saldoFinal = rows[rows.length - 1].saldo;

  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ maxHeight: 300, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Documento</Th>
              <Th right>Cargo</Th>
              <Th right>Abono</Th>
              <Th right>Saldo (USD)</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <Td>{fmtD(r.fecha)}</Td>
                <Td>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Badge tone={r.cargo > 0 ? "gold" : "verde"}>{r.tipo}</Badge>
                    <span style={{ fontSize: 12.5 }}>{r.doc}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>
                    {r.detalle}
                  </div>
                </Td>
                <Td right>
                  {r.cargo > 0 ? money(r.cargo, r.moneda) : "—"}
                </Td>
                <Td right>
                  {r.abono > 0 ? (
                    <span style={{ color: C.verde }}>{money(r.abono, r.moneda)}</span>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td right bold>
                  <span style={{ color: r.saldo > 0.005 ? C.rojo : C.verde }}>
                    {money(r.saldo, "USD")}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Resumen del Saldo Final */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: C.body, borderTop: `1px solid ${C.line}` }}>
        <span style={{ fontSize: 12.5, color: C.mut, fontWeight: 600 }}>
          Saldo actual (equivalente USD)
        </span>
        <span style={{ fontFamily: FONTS.SERIF, fontSize: 18, fontWeight: 700, color: saldoFinal > 0.005 ? C.rojo : C.verde }}>
          {money(saldoFinal, "USD")}
        </span>
      </div>
    </div>
  );
}