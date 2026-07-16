import React, { useMemo, useState } from "react";
import { ArrowUpRight, ArrowDownLeft, CheckCircle2 } from "lucide-react";

import { C, FONTS } from "../../constants/theme";
import {
  hoy0, parseD, fmtD, diasEntre, money,
  activo, usdComp, provNom,
  activoCxC, usdCxCPendiente
} from "../../utils/finance";
import { Card } from "../../components/ui/Layout";
import { Segmented } from "../../components/ui/Buttons";
import { Badge } from "../../components/ui/Data";

const MAX_VISIBLES = 8;

const OPCIONES_FILTRO = [
  { id: "7", label: "Esta semana" },
  { id: "15", label: "15 días" },
  { id: "30", label: "30 días" },
  { id: "todos", label: "Todos" }
];

/**
 * Widget del Tablero con dos listas: pagos próximos a proveedores (cuentas
 * por pagar activas) y facturas próximas a vencer por cobrar. Se filtran por
 * horizonte (7/15/30 días o todos) mostrando SIEMPRE lo ya vencido, y las
 * cuotas de un mismo financiamiento que caen en el período se colapsan en una
 * sola fila para no inundar la vista con todas las cuotas de un financiado.
 */
export default function ProximosVencimientos({ st, verPagos = true, verCobros = true }) {
  const hoy = hoy0();
  const [filtro, setFiltro] = useState("30");

  // Pasa el filtro: siempre lo vencido (dv < 0), más lo que vence dentro del horizonte.
  const pasaFiltro = (fecha) => {
    const d = fecha ? parseD(fecha) : null;
    if (!d) return filtro === "todos"; // sin fecha solo aparece en "Todos"
    if (filtro === "todos") return true;
    return diasEntre(hoy, d) <= Number(filtro);
  };

  const pagos = useMemo(() => {
    const base = (st.compromisos || [])
      .filter((c) => activo(st, c) && pasaFiltro(c.fechaVencimiento))
      .map((c) => ({
        id: c.id,
        grupo: c.grupoFinanciamientoId || null,
        nombre: provNom(st, c.proveedorId),
        detalle: c.descripcion || (c.numeroPedidoOdoo ? `Pedido ${c.numeroPedidoOdoo}` : "Compromiso de pago"),
        descripcionBase: (c.descripcion || "").replace(/\s*\(.*?\)\s*$/, "").trim() || (c.numeroPedidoOdoo ? `Pedido ${c.numeroPedidoOdoo}` : "Financiamiento"),
        fecha: c.fechaVencimiento,
        usd: usdComp(st, c),
        sinBanco: !c.bancoAsignadoId
      }));

    // Colapsar cuotas del mismo financiamiento que caen en el período
    const map = {};
    const out = [];
    base.forEach((it) => {
      if (!it.grupo) { out.push({ ...it, cuotas: 1 }); return; }
      if (!map[it.grupo]) { map[it.grupo] = { ...it, cuotas: 1 }; out.push(map[it.grupo]); return; }
      const g = map[it.grupo];
      g.cuotas += 1;
      g.usd += it.usd;
      if ((it.fecha || "9999") < (g.fecha || "9999")) g.fecha = it.fecha; // conserva la más próxima
      if (it.sinBanco) g.sinBanco = true;
    });

    return out
      .map((it) => it.cuotas > 1
        ? { ...it, detalle: `${it.descripcionBase} · ${it.cuotas} cuotas en el período` }
        : it)
      .sort((a, b) => (a.fecha || "9999").localeCompare(b.fecha || "9999"));
  }, [st, filtro]);

  const cobros = useMemo(() => (st.cuentasCobrar || [])
    .filter((c) => activoCxC(st, c) && pasaFiltro(c.fechaVencimiento))
    .map((c) => ({
      id: c.id,
      nombre: provNom(st, c.clienteId),
      detalle: c.numeroFactura ? `Factura ${c.numeroFactura}` : (c.descripcion || "Factura por cobrar"),
      fecha: c.fechaVencimiento,
      usd: usdCxCPendiente(st, c),
      cuotas: 1
    }))
    .sort((a, b) => (a.fecha || "9999").localeCompare(b.fecha || "9999")), [st, filtro]);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, color: C.mut, fontWeight: 600 }}>
          Vencimientos {filtro === "todos" ? "(todos)" : `en los próximos ${filtro} días`} · incluye lo ya vencido
        </div>
        <Segmented value={filtro} onChange={setFiltro} options={OPCIONES_FILTRO} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {verPagos && (
          <ListaVencimientos
            titulo="Pagos próximos a proveedores"
            items={pagos}
            icono={ArrowUpRight}
            color={C.gold}
            hoy={hoy}
            vacio="Sin pagos en este período."
            mostrarSinBanco
          />
        )}
        {verCobros && (
          <ListaVencimientos
            titulo="Por cobrar próximas a vencer"
            items={cobros}
            icono={ArrowDownLeft}
            color={C.verde}
            hoy={hoy}
            vacio="Sin cobros en este período."
          />
        )}
      </div>
    </div>
  );
}

function ListaVencimientos({ titulo, items, icono: Icono, color, hoy, vacio, mostrarSinBanco = false }) {
  const total = items.reduce((a, x) => a + (x.usd || 0), 0);
  const vencidos = items.filter((x) => x.fecha && parseD(x.fecha) < hoy).length;
  const visibles = items.slice(0, MAX_VISIBLES);
  const restantes = items.length - visibles.length;

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderTop: `4px solid ${color}`, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: C.body, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
            <Icono size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FONTS.SANS, fontSize: 14.5, fontWeight: 800, color: C.ink, letterSpacing: -0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titulo}</div>
            <div style={{ fontSize: 11, color: C.mut }}>
              {items.length} registro(s){vencidos > 0 ? ` · ${vencidos} vencido(s)` : ""}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: C.mut, fontWeight: 700, letterSpacing: 0.3 }}>TOTAL</div>
          <div style={{ fontFamily: FONTS.SANS, fontSize: 17, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{money(total, "USD")}</div>
        </div>
      </div>

      <div style={{ padding: 12 }}>
        {items.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.mut, fontSize: 13, padding: "14px 6px" }}>
            <CheckCircle2 size={15} color={C.verde} /> {vacio}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {visibles.map((x) => {
              const d = x.fecha ? parseD(x.fecha) : null;
              const dv = d ? diasEntre(hoy, d) : null;
              const venc = dv !== null && dv < 0;
              const prox = dv !== null && dv >= 0 && dv <= 7;

              return (
                <div key={x.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "9px 11px", borderRadius: 10, border: `1px solid ${venc ? "var(--rojo-line)" : C.line}`, background: venc ? C.rojoSoft : C.surface }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.nombre}</div>
                    <div style={{ fontSize: 11, color: C.mut, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.detalle}</div>
                    <div style={{ fontSize: 11, color: C.mut, display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                      {x.fecha ? fmtD(x.fecha) : "Sin fecha"}
                      {venc ? <Badge tone="rojo">Vencido {Math.abs(dv)}d</Badge>
                        : dv === 0 ? <Badge tone="amar">Hoy</Badge>
                        : prox ? <Badge tone="amar">En {dv}d</Badge> : null}
                      {x.cuotas > 1 ? <Badge tone="mut">{x.cuotas} cuotas</Badge> : null}
                      {mostrarSinBanco && x.sinBanco ? <Badge tone="mut">Sin banco</Badge> : null}
                    </div>
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                    {money(x.usd, "USD")}
                  </div>
                </div>
              );
            })}

            {restantes > 0 && (
              <div style={{ textAlign: "center", fontSize: 12, color: C.mut, padding: "6px 0 2px" }}>
                y {restantes} más…
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
