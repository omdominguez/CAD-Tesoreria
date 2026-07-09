import React, { useState, useMemo } from "react";
import { Landmark, ArrowUpRight, ArrowDownLeft } from "lucide-react";

// Subir 2 niveles para llegar a src/
import { C, FONTS } from "../../constants/theme";
import { money, fmtD, provNom } from "../../utils/finance";
import { usePaged } from "../../hooks/usePaged";

// Componentes UI
import { Section, Card, Empty } from "../../components/ui/Layout";
import { Th, Td, Pagination } from "../../components/ui/Table";
import { Select } from "../../components/ui/Forms";
import { Badge } from "../../components/ui/Data";

export default function LibroBancos({ st }) {
  const bancos = st.bancos || [];
  
  // Inicializar con el primer banco si existe
  const [bancoId, setBancoId] = useState(bancos[0]?.id || "");

  const bancoSel = bancos.find((b) => b.id === bancoId);

  // Construcción eficiente y aislada del libro mayor (Ledger) del banco seleccionado
  const historial = useMemo(() => {
    if (!bancoId) return [];

    const rows = [];

    // 1. Inyectar todos los pagos/egresos que salieron de este banco
    (st.movimientos || [])
      .filter((m) => m.bancoOrigenId === bancoId)
      .forEach((m) => {
        const comp = (st.compromisos || []).find((c) => c.id === m.compromisoId);
        rows.push({
          id: m.id,
          fecha: m.fecha || "",
          concepto: comp ? provNom(st, comp.proveedorId) : "Egreso",
          detalle: comp ? (comp.descripcion || "Pago de compromiso") : "Movimiento de caja",
          referencia: m.referencia || "—",
          tipo: "DEBITO", // El dinero sale del banco
          monto: Number(m.monto || 0),
        });
      });

    // 2. Inyectar todas las cobranzas/ingresos que entraron a este banco
    (st.cobranzas || [])
      .filter((c) => c.bancoDestinoId === bancoId)
      .forEach((c) => {
        rows.push({
          id: c.id,
          fecha: c.fecha || "",
          concepto: provNom(st, c.clienteId),
          detalle: c.descripcion || "Cobranza recibida",
          referencia: "Ingreso directo",
          tipo: "CREDITO", // El dinero entra al banco
          monto: Number(c.monto || 0),
        });
      });

    // 3. Ordenar cronológicamente (de más antiguo a más reciente) para calcular el saldo progresivo
    rows.sort((a, b) => a.fecha.localeCompare(b.fecha));

    // 4. Reconstruir la corrida de saldos partiendo del saldo inicial teórico
    let saldoAcumulado = Number(bancoSel?.saldoInicial || 0);
    
    const rowsConSaldo = rows.map((r) => {
      if (r.tipo === "CREDITO") saldoAcumulado += r.monto;
      else if (r.tipo === "DEBITO") saldoAcumulado -= r.monto;
      
      return { ...r, saldoProgresivo: saldoAcumulado };
    });

    // 5. Invertir el resultado final para que el usuario vea lo más nuevo arriba
    return rowsConSaldo.reverse();
  }, [st.movimientos, st.cobranzas, bancoId, bancoSel]);

  const pg = usePaged(historial, 15);

  if (bancos.length === 0) {
    return (
      <Empty 
        icon={Landmark} 
        title="Sin cuentas bancarias" 
        msg="Registra una cuenta en el panel de Ajustes para auditar sus movimientos." 
      />
    );
  }

  return (
    <Section 
      title="Libro Auxiliar de Bancos" 
      desc="Audita el flujo de caja real. Revisa cronológicamente cada ingreso y egreso que ha impactado el saldo de tus cuentas."
    >
      {/* Selector de cuenta y resumen rápido */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 240, flex: "0 1 350px" }}>
          <Select value={bancoId} onChange={(e) => setBancoId(e.target.value)}>
            {bancos.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre} ({b.moneda})</option>
            ))}
          </Select>
        </div>

        {bancoSel && (
          <div style={{ display: "flex", gap: 24, background: "#fff", padding: "10px 18px", borderRadius: 12, border: `1px solid ${C.line}` }}>
            <div>
              <div style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>SALDO INICIAL</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{money(bancoSel.saldoInicial, bancoSel.moneda)}</div>
            </div>
            <div style={{ borderLeft: `1px solid ${C.line}` }} />
            <div>
              <div style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>SALDO ACTUAL EN LIBROS</div>
              <div style={{ fontFamily: FONTS.SERIF, fontSize: 16, fontWeight: 700, color: C.greenDk }}>
                {money(bancoSel.saldoActual, bancoSel.moneda)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de movimientos */}
      {historial.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "40px 20px", color: C.mut, fontSize: 13.5 }}>
          Esta cuenta bancaria no registra movimientos conciliados en el sistema todavía.
        </Card>
      ) : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>Fecha</Th>
                  <Th>Concepto / Detalle</Th>
                  <Th>Referencia</Th>
                  <Th right>Egresos (Cargo)</Th>
                  <Th right>Ingresos (Abono)</Th>
                  <Th right>Saldo en cuenta</Th>
                </tr>
              </thead>
              <tbody>
                {pg.slice.map((r) => (
                  <tr key={r.id}>
                    <Td>{fmtD(r.fecha)}</Td>
                    <Td>
                      <div style={{ fontWeight: 700, color: C.ink }}>{r.concepto}</div>
                      <div style={{ fontSize: 11.5, color: C.mut }}>{r.detalle}</div>
                    </Td>
                    <Td><Badge tone="mut">{r.referencia}</Badge></Td>
                    <Td right>
                      {r.tipo === "DEBITO" ? (
                        <span style={{ color: C.rojo, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <ArrowUpRight size={12} /> {money(r.monto, bancoSel?.moneda)}
                        </span>
                      ) : "—"}
                    </Td>
                    <Td right>
                      {r.tipo === "CREDITO" ? (
                        <span style={{ color: C.verde, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <ArrowDownLeft size={12} /> {money(r.monto, bancoSel?.moneda)}
                        </span>
                      ) : "—"}
                    </Td>
                    <Td right bold style={{ fontVariantNumeric: "tabular-nums" }}>
                      {money(r.saldoProgresivo, bancoSel?.moneda)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pg={pg} />
        </Card>
      )}
    </Section>
  );
}