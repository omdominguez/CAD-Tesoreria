import React, { useState } from "react";
import { FileBarChart, TrendingUp, PieChart } from "lucide-react";

import { Segmented } from "../../components/ui/Buttons";
import ReporteMensual from "./ReporteMensual";
import AnalisisTasas from "./AnalisisTasas";
import ControlCostos from "./ControlCostos";

/**
 * Contenedor del módulo Reportes: agrupa el reporte financiero mensual, el
 * análisis histórico de tasas de cambio, y el control de costos por
 * categoría, cada uno en su pestaña.
 */
export default function ModuloReportes({ st }) {
  const [sub, setSub] = useState("mensual");

  const opts = [
    { id: "mensual", label: "Reporte Mensual", icon: FileBarChart },
    { id: "costos", label: "Control de Costos", icon: PieChart },
    { id: "tasas", label: "Análisis de Tasas", icon: TrendingUp }
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Segmented value={sub} onChange={setSub} options={opts} />
      </div>

      {sub === "mensual" && <ReporteMensual st={st} />}
      {sub === "costos" && <ControlCostos st={st} />}
      {sub === "tasas" && <AnalisisTasas st={st} />}
    </div>
  );
}