import React, { useState } from "react";
import { Receipt, ArrowDownLeft } from "lucide-react";

import { Segmented } from "../../components/ui/Buttons";
import CuentasPorCobrar from "../Tesoreria/CuentasPorCobrar";
import Cobranzas from "../Tesoreria/Cobranzas";

/**
 * Módulo de Ventas: registrar facturas de venta (cuentas por cobrar) para
 * proyectar las cobranzas, y registrar los cobros recibidos. Antes vivía
 * dentro de Tesorería; ahora es un módulo aparte para separar la operación
 * de ventas de la de pagos.
 */
export default function ModuloVentas({ st, act, rol }) {
  const [sub, setSub] = useState("facturas");

  const opts = [
    { id: "facturas", label: "Facturas de Venta", icon: Receipt },
    { id: "cobranzas", label: "Cobranzas", icon: ArrowDownLeft }
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Segmented value={sub} onChange={setSub} options={opts} />
      </div>

      {sub === "facturas" && <CuentasPorCobrar st={st} act={act} rol={rol} />}
      {sub === "cobranzas" && <Cobranzas st={st} act={act} />}
    </div>
  );
}
