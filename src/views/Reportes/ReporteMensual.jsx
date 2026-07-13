import React, { useMemo, useState } from "react";
import { Download, TrendingUp, TrendingDown, ShoppingCart, Receipt, ArrowDownLeft, ArrowUpRight, Info } from "lucide-react";
import { C, FONTS } from "../../constants/theme";
import { money } from "../../utils/finance";
import { generarReporteMensual } from "../../utils/reporteMensual";
import { exportarReporteMensualPDF, exportarReporteMensualExcel } from "../../utils/exportar";
import { Section, Card } from "../../components/ui/Layout";
import { Btn } from "../../components/ui/Buttons";
import { Th, Td } from "../../components/ui/Table";

function hoyYYYYMM() {
  return new Date().toISOString().slice(0, 7);
}

function KpiMini({ icono: Icono, etiqueta, valor, cantidad, tono }) {
  return (
    <div style={{ flex: "1 1 180px", minWidth: 170, padding: "16px 18px", borderRight: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: C.body, display: "flex", alignItems: "center", justifyContent: "center", color: tono }}>
          <Icono size={13} />
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 0.3 }}>{etiqueta}</div>
      </div>
      <div style={{ fontFamily: FONTS.SANS, fontSize: 21, fontWeight: 800, color: C.ink, letterSpacing: -0.4 }}>{money(valor, "USD")}</div>
      <div style={{ fontSize: 11, color: C.mut, marginTop: 4 }}>{cantidad} registro(s)</div>
    </div>
  );
}

export default function ReporteMensual({ st }) {
  const [periodo, setPeriodo] = useState(hoyYYYYMM());

  const [anio, mesUno] = periodo.split("-").map(Number);
  const mes = mesUno - 1;

  const reporte = useMemo(() => generarReporteMensual(st, anio, mes), [st, anio, mes]);

  return (
    <Section
      title="Reporte Financiero Mensual"
      desc="Resumen de compras, pagos, ventas y cobros realmente ocurridos en el mes elegido."
      action={
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            style={{ padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 13.5, fontFamily: FONTS.SANS, background: C.surface, color: C.ink }}
          />
          <Btn small variant="ghost" onClick={() => exportarReporteMensualExcel(reporte)}>
            <Download size={13} /> Excel
          </Btn>
          <Btn small onClick={() => exportarReporteMensualPDF(reporte)}>
            <Download size={13} /> PDF
          </Btn>
        </div>
      }
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: C.body, padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontSize: 12, color: C.mut }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        Este reporte muestra los movimientos que de verdad ocurrieron en {reporte.etiqueta} (no un saldo bancario retroactivo — el sistema no guarda "fotos" históricas de saldos día a día, así que evitamos mostrar un número que podría ser engañoso).
      </div>

      <Card style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <KpiMini icono={ShoppingCart} etiqueta="Compras" valor={reporte.compras.totalUSD} cantidad={reporte.compras.cantidad} tono={C.gold} />
          <KpiMini icono={ArrowUpRight} etiqueta="Pagos" valor={reporte.pagos.totalUSD} cantidad={reporte.pagos.cantidad} tono={C.rojo} />
          <KpiMini icono={Receipt} etiqueta="Ventas" valor={reporte.ventas.totalUSD} cantidad={reporte.ventas.cantidad} tono={C.azul} />
          <KpiMini icono={ArrowDownLeft} etiqueta="Cobros" valor={reporte.cobros.totalUSD} cantidad={reporte.cobros.cantidad} tono={C.verde} />
          <div style={{ flex: "1 1 180px", minWidth: 170, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: C.body, display: "flex", alignItems: "center", justifyContent: "center", color: reporte.balanceNeto >= 0 ? C.verde : C.rojo }}>
                {reporte.balanceNeto >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 0.3 }}>Balance neto</div>
            </div>
            <div style={{ fontFamily: FONTS.SANS, fontSize: 21, fontWeight: 800, color: reporte.balanceNeto >= 0 ? C.verde : C.rojo, letterSpacing: -0.4 }}>
              {money(reporte.balanceNeto, "USD")}
            </div>
            <div style={{ fontSize: 11, color: C.mut, marginTop: 4 }}>Cobros − Pagos</div>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginBottom: 10 }}>Compras por categoría</div>
          {reporte.porCategoria.length === 0 ? (
            <div style={{ fontSize: 12.5, color: C.mut, fontStyle: "italic" }}>Sin compras este mes.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>Categoría</Th><Th right>Total</Th></tr></thead>
              <tbody>
                {reporte.porCategoria.map((c) => (
                  <tr key={c.categoria}><Td>{c.categoria}</Td><Td right bold>{money(c.totalUSD, "USD")}</Td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginBottom: 10 }}>Proveedores más pagados</div>
          {reporte.topProveedores.length === 0 ? (
            <div style={{ fontSize: 12.5, color: C.mut, fontStyle: "italic" }}>Sin pagos este mes.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>Proveedor</Th><Th right>Total</Th></tr></thead>
              <tbody>
                {reporte.topProveedores.map((p) => (
                  <tr key={p.nombre}><Td>{p.nombre}</Td><Td right bold>{money(p.totalUSD, "USD")}</Td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginBottom: 10 }}>Clientes que más pagaron</div>
          {reporte.topClientes.length === 0 ? (
            <div style={{ fontSize: 12.5, color: C.mut, fontStyle: "italic" }}>Sin cobros este mes.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>Cliente</Th><Th right>Total</Th></tr></thead>
              <tbody>
                {reporte.topClientes.map((c) => (
                  <tr key={c.nombre}><Td>{c.nombre}</Td><Td right bold>{money(c.totalUSD, "USD")}</Td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </Section>
  );
}
