import React, { useState } from "react";
import { TrendingDown, Landmark, Users, UserCog } from "lucide-react";

// Componentes UI
import { Segmented } from "../../components/ui/Buttons";

// Subvistas del módulo
import AjustesTasas from "./AjustesTasas";
import Bancos from "./Bancos";
import GestorContactos from "./GestorContactos";
import Equipo from "./Equipo";

export default function ModuloAjustes({ st, act, rol, meId }) {
  const [sub, setSub] = useState("tasas");
  
  // Opciones base disponibles para TESORERIA y MASTER
  const opts = [
    { id: "tasas", label: "Tasas de Cambio", icon: TrendingDown },
    { id: "bancos", label: "Bancos", icon: Landmark },
    { id: "contactos", label: "Contactos", icon: Users },
  ];
  
  // Solo los administradores principales pueden gestionar el equipo
  if (rol === "MASTER") {
    opts.push({ id: "equipo", label: "Equipo", icon: UserCog });
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Segmented value={sub} onChange={setSub} options={opts} />
      </div>
      
      {sub === "tasas" && <AjustesTasas st={st} act={act} />}
      {sub === "bancos" && <Bancos st={st} act={act} rol={rol} />}
      {sub === "contactos" && <GestorContactos st={st} act={act} rol={rol} />}
      {sub === "equipo" && rol === "MASTER" && <Equipo meId={meId} st={st} act={act} />}
    </div>
  );
}