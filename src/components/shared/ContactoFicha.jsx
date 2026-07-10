import React, { useState, useMemo } from "react";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";

// Ajusta las rutas según tu estructura final
import { C, FONTS } from "../../constants/theme";
import { 
  esProv, 
  esCli, 
  bancosProv, 
  ledgerProv, 
  ledgerCli, 
  pendienteProv, 
  pendienteCli, 
  money 
} from "../../utils/finance";

// Componentes UI (asumiendo que los organizaste en la carpeta ui)
import { Modal } from "../ui/Layout";
import { Badge } from "../ui/Data";
import { Segmented } from "../ui/Buttons";

// Componente hermano
import { EstadoCuenta } from "./EstadoCuenta";

export function ContactoFicha({ st, prov: p, onClose }) {
  const provMode = esProv(p); 
  const cliMode = esCli(p);
  
  const [tab, setTab] = useState(provMode ? "prov" : "cli");
  const cuentas = bancosProv(p);
  
  // Memorizamos el cálculo del historial para evitar recalcular en cada render
  const rowsProv = useMemo(() => ledgerProv(st, p), [st, p]);
  const rowsCli = useMemo(() => ledgerCli(st, p), [st, p]);

  // Cálculos de saldo actual
  const deudaProveedor = pendienteProv(st, p.id);
  const deudaCliente = pendienteCli(st, p.id);
  const balanceNeto = (cliMode ? deudaCliente : 0) - (provMode ? deudaProveedor : 0);

  return (
    <Modal title={p.razonSocial} wide onClose={onClose}>
      {/* Encabezado e Insignias */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {provMode && <Badge tone="gold">Proveedor</Badge>}
          {cliMode && <Badge tone="verde">Cliente</Badge>}
          <span style={{ fontSize: 12.5, color: C.mut, marginLeft: 6 }}>RIF {p.rif}</span>
          
          {cuentas.length > 0 && (
            <span style={{ fontSize: 12.5, color: C.mut }}>
              · {cuentas.map((b) => b.banco).filter(Boolean).join(", ")}
            </span>
          )}
        </div>
      </div>

      {/* Tarjetas de Saldo (KPIs) */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${(provMode ? 1 : 0) + (cliMode ? 1 : 0) + 1}, 1fr)`, gap: 12, marginBottom: 18 }}>
        {provMode && (
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px", background: C.body }}>
            <div style={{ fontSize: 11.5, color: C.mut, fontWeight: 700 }}>LE DEBEMOS</div>
            <div style={{ fontFamily: FONTS.SERIF, fontSize: 22, fontWeight: 700, color: deudaProveedor > 0.005 ? C.rojo : C.verde, marginTop: 4 }}>
              {money(deudaProveedor)}
            </div>
          </div>
        )}
        
        {cliMode && (
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px", background: C.body }}>
            <div style={{ fontSize: 11.5, color: C.mut, fontWeight: 700 }}>NOS DEBE</div>
            <div style={{ fontFamily: FONTS.SERIF, fontSize: 22, fontWeight: 700, color: deudaCliente > 0.005 ? C.verde : C.mut, marginTop: 4 }}>
              {money(deudaCliente)}
            </div>
          </div>
        )}
        
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px", background: C.body }}>
          <div style={{ fontSize: 11.5, color: C.mut, fontWeight: 700 }}>BALANCE NETO</div>
          <div style={{ fontFamily: FONTS.SERIF, fontSize: 22, fontWeight: 700, color: C.ink, marginTop: 4 }}>
            {money(balanceNeto)}
          </div>
        </div>
      </div>

      {/* Selector de pestañas (solo si es cliente Y proveedor al mismo tiempo) */}
      {provMode && cliMode && (
        <div style={{ marginBottom: 14 }}>
          <Segmented 
            value={tab} 
            onChange={setTab} 
            options={[
              { id: "prov", label: "Cuenta por pagar", icon: ArrowUpRight }, 
              { id: "cli", label: "Cuenta por cobrar", icon: ArrowDownLeft }
            ]} 
          />
        </div>
      )}

      {/* Tabla del Ledger del Proveedor */}
      {(provMode && (!cliMode || tab === "prov")) && (
        <div style={{ marginBottom: cliMode && !provMode ? 0 : 8 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
            Estado de cuenta — Compras (lo que le pagamos)
          </div>
          <EstadoCuenta rows={rowsProv} nombreContacto={p.razonSocial} etiquetaCargo="Compra" etiquetaAbono="Pago" />
        </div>
      )}
      
      {/* Tabla del Ledger del Cliente */}
      {(cliMode && (!provMode || tab === "cli")) && (
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
            Estado de cuenta — Ventas (lo que nos paga)
          </div>
          <EstadoCuenta rows={rowsCli} nombreContacto={p.razonSocial} etiquetaCargo="Factura" etiquetaAbono="Cobro" />
        </div>
      )}
    </Modal>
  );
}