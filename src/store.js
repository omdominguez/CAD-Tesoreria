import { supabase } from "./supabase.js";

/* El estado completo de la herramienta se guarda como un documento JSON
   compartido en la tabla `workspace` (fila id=1). Toda la lógica de negocio
   ya opera sobre ese objeto, así que el equipo trabaja sobre los mismos datos. */

export async function loadState() {
  const { data, error } = await supabase.from("workspace").select("data").eq("id", 1).single();
  if (error) throw error;
  const d = data?.data;
  return d && Object.keys(d).length ? d : null;
}

export async function saveState(state, userId) {
  const { error } = await supabase
    .from("workspace")
    .update({ data: state, updated_at: new Date().toISOString(), updated_by: userId || null })
    .eq("id", 1);
  if (error) throw error;
}

// Notifica cambios hechos por otros usuarios (sincronización en vivo).
export function subscribeState(cb) {
  const ch = supabase
    .channel("workspace-realtime")
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "workspace", filter: "id=eq.1" },
      (payload) => { if (payload?.new?.data) cb(payload.new.data); })
    .subscribe();
  return () => supabase.removeChannel(ch);
}

/* Gestión de usuarios y roles (panel Equipo, solo Master). */
export async function listProfiles() {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function setProfileRole(id, rol) {
  const { error } = await supabase.from("profiles").update({ rol }).eq("id", id);
  if (error) throw error;
}
