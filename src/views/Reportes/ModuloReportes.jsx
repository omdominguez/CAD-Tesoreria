import React, { useState } from "react";
import { FileBarChart, TrendingUp } from "lucide-react";

import { Segmented } from "../../components/ui/Buttons";
import ReporteMensual from "./ReporteMensual";
import AnalisisTasas from "./AnalisisTasas";

/**
 * Contenedor del módulo Reportes: agrupa el reporte financiero mensual
 * (existente) y el análisis histórico de tasas de cambio (nuevo), cada
 * uno en su pestaña.
 */
export default function ModuloReportes({ st }) {
  const [sub, setSub] = useState("mensual");

  const opts = [
    { id: "mensual", label: "Reporte Mensual", icon: FileBarChart },
    { id: "tasas", label: "Análisis de Tasas", icon: TrendingUp }
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Segmented value={sub} onChange={setSub} options={opts} />
      </div>

      {sub === "mensual" && <ReporteMensual st={st} />}
      {sub === "tasas" && <AnalisisTasas st={st} />}
    </div>
  );
}