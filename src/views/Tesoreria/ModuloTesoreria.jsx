import React, { useState } from "react";
import { Layers, CreditCard, Landmark } from "lucide-react";

// Componentes UI
import { Segmented } from "../../components/ui/Buttons";

// Subvistas del módulo de Tesorería (Ventas se movió a su propio módulo)
import Corridas from "./Corridas";
import CuentasPorPagar from "./CuentasPorPagar";
import LibroBancos from "./LibroBancos";

export default function ModuloTesoreria({ st, act, rol, usuario }) {
  const [sub, setSub] = useState("cxp");

  // Opciones de navegación con íconos semánticos para el módulo financiero
  const opts = [
    { id: "cxp", label: "Cuentas por Pagar", icon: CreditCard },
    { id: "corridas", label: "Corridas de Pago", icon: Layers },
    { id: "libro", label: "Libro de Bancos", icon: Landmark }
  ];

  return (
    <div>
      {/* Barra de navegación interna del módulo */}
      <div style={{ marginBottom: 20 }}>
        <Segmented value={sub} onChange={setSub} options={opts} />
      </div>

      {/* Renderizado dinámico de la subvista activa */}
      {sub === "cxp" && <CuentasPorPagar st={st} act={act} rol={rol} />}
      {sub === "corridas" && <Corridas st={st} act={act} rol={rol} usuario={usuario} />}
      {sub === "libro" && <LibroBancos st={st} act={act} rol={rol} usuario={usuario} />}
    </div>
  );
}