import React, { useState } from "react";
import { Eye, Upload, Loader2, X } from "lucide-react";

// Ajusta las rutas según dónde tengas finalmente estos archivos
import { getAdjuntoUrl, uploadAdjunto } from "../../services/store";
import { C } from "../../constants/theme";
import { useArrastrarArchivo } from "../../hooks/useArrastrarArchivo";

export function AdjuntoChip({ a, onDelete }) {
  const [busy, setBusy] = useState(false);
  
  const abrir = async () => {
    setBusy(true);
    try { 
      const url = await getAdjuntoUrl(a.path); 
      window.open(url, "_blank", "noopener"); 
    } catch (e) { 
      alert("No se pudo abrir el archivo. Verifica que corriste la migración de adjuntos en Supabase."); 
    }
    setBusy(false);
  };
  
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.greenSoft, border: `1px solid ${C.line}`, borderRadius: 999, padding: "3px 4px 3px 10px", fontSize: 11.5, color: C.greenDk, maxWidth: 200 }}>
      <button onClick={abrir} title={a.name} style={{ background: "none", border: "none", cursor: "pointer", color: C.greenDk, display: "inline-flex", alignItems: "center", gap: 5, maxWidth: 150, overflow: "hidden" }}>
        {busy ? <Loader2 size={12} className="cad-spin" /> : <Eye size={12} />}
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</span>
      </button>
      {onDelete && (
        <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: C.mut, display: "inline-flex" }}>
          <X size={12} />
        </button>
      )}
    </span>
  );
}

export function AdjuntosInput({ value = [], onChange, label = "Adjuntar PDF o imagen" }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  
  const subirArchivos = async (files) => {
    const lista = Array.from(files || []); 
    if (!lista.length) return;
    
    setBusy(true); 
    setErr(null);
    
    try {
      const nuevos = [];
      for (const f of lista) {
        if (f.size > 15 * 1024 * 1024) { 
          setErr("Cada archivo debe pesar menos de 15 MB."); 
          continue; 
        }
        nuevos.push(await uploadAdjunto(f));
      }
      onChange([...(value || []), ...nuevos]);
    } catch (e2) { 
      setErr("No se pudo subir. ¿Corriste la migración de adjuntos en Supabase?"); 
    }
    
    setBusy(false);
  };

  const subir = (e) => {
    subirArchivos(e.target.files);
    e.target.value = "";
  };

  const { arrastrando, dragProps } = useArrastrarArchivo(subirArchivos, busy);
  
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.mut, marginBottom: 5 }}>{label}</div>
      <label
        {...dragProps}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 14px",
          border: `1.5px dashed ${arrastrando ? C.green : C.line}`,
          borderRadius: 10,
          cursor: busy ? "wait" : "pointer",
          color: C.greenDk,
          background: arrastrando ? C.greenSoft : C.paper,
          fontSize: 13,
          fontWeight: 600,
          transition: "background-color .12s, border-color .12s"
        }}
      >
        {busy ? <Loader2 size={15} className="cad-spin" /> : <Upload size={15} />} 
        {busy ? "Subiendo…" : arrastrando ? "Suelta aquí para subir" : "Elegir archivo(s) o arrástralos aquí"}
        <input type="file" accept=".pdf,image/png,image/jpeg" multiple onChange={subir} disabled={busy} style={{ display: "none" }} />
      </label>
      {err && <div style={{ fontSize: 11.5, color: C.rojo, marginTop: 6 }}>{err}</div>}
      
      {(value || []).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {value.map((a, i) => (
            <AdjuntoChip 
              key={i} 
              a={a} 
              onDelete={() => onChange(value.filter((_, j) => j !== i))} 
            />
          ))}
        </div>
      )}
    </div>
  );
}