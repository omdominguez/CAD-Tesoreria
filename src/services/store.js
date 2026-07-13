// Reutiliza el mismo cliente de Supabase que usa la autenticación (src/supabase.js),
// en vez de crear uno nuevo aquí. Tener dos clientes por separado generaba el aviso
// "Multiple GoTrueClient instances detected" en la consola del navegador — no rompía
// nada, pero no es buena práctica.
import { supabase } from "../supabase.js";

// ============================================================================
// SINCRONIZACIÓN DEL ESTADO GLOBAL (JSON)
// Asume que tienes una tabla llamada 'app_state' con id=1 y una columna 'data' (JSONB)
// ============================================================================

export async function loadState() {
  const { data, error } = await supabase
    .from('workspace')
    .select('data')
    .eq('id', 1)
    .single();

  if (error) {
    console.warn("No se encontró estado previo o hubo un error:", error);
    return null; // El frontend usará EMPTY_STATE
  }
  return data.data;
}

export async function saveState(st, userId) {
  const { error } = await supabase
    .from('workspace')
    .update({
      data: st,
      updated_by: userId || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', 1);

  if (error) throw error;
  return true;
}

export function subscribeState(callback) {
  // Escucha cambios en tiempo real en la tabla workspace
  const channel = supabase.channel('realtime-workspace')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'workspace', filter: 'id=eq.1' },
      (payload) => {
        // Ejecuta el callback con el nuevo JSON recibido
        if (payload.new && payload.new.data) {
          callback(payload.new.data);
        }
      }
    )
    .subscribe();

  // Retorna una función para limpiar la suscripción cuando el componente se desmonte
  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================================================
// GESTIÓN DE EQUIPO (PERFILES)
// Asume una tabla 'profiles' conectada a auth.users de Supabase
// ============================================================================

export async function listProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, created_at, rol, activo, nombre, apellido')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function setProfileRole(id, rol) {
  const { error } = await supabase
    .from('profiles')
    .update({ rol })
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Actualiza los datos personales del usuario que hace la llamada
 * (nombre, apellido, foto, fecha de nacimiento). Nunca puede cambiar
 * su propio rol o estado de activación desde aquí — eso lo protege
 * un trigger del lado de la base de datos, no solo esta función.
 */
export async function actualizarMiPerfil(id, campos) {
  const { error } = await supabase
    .from('profiles')
    .update(campos)
    .eq('id', id);

  if (error) throw error;
  return true;
}
export async function aprobarUsuario(id, rol) {
  const { error } = await supabase
    .from('profiles')
    .update({ rol, activo: true })
    .eq('id', id);

  if (error) throw error;
  return true;
}

/** Revoca el acceso de un usuario (por ejemplo, si alguien deja el equipo). */
export async function revocarUsuario(id) {
  const { error } = await supabase
    .from('profiles')
    .update({ activo: false })
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Elimina POR COMPLETO la cuenta de un usuario (no solo le quita el
 * acceso): su correo queda libre para poder registrarse de nuevo más
 * adelante. Solo funciona si quien llama es Master — lo valida la
 * función del lado del servidor, no aquí.
 */
export async function eliminarUsuario(id) {
  const { data, error } = await supabase.functions.invoke('eliminar-usuario', {
    body: { userId: id }
  });
  if (error) throw error;
  if (data && data.ok === false) throw new Error(data.error || 'No se pudo eliminar la cuenta.');
  return true;
}

// ============================================================================
// ADJUNTOS (SUPABASE STORAGE)
// El bucket 'adjuntos' es privado (ver migración de Storage)
// ============================================================================

export async function uploadAdjunto(file) {
  // Genera un nombre único para evitar sobreescrituras
  const ext = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  const filePath = `documentos/${fileName}`;

  const { data, error } = await supabase.storage
    .from('adjuntos')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  // Retornamos la ruta y el nombre original para mostrarlo en la UI
  return { path: data.path, name: file.name };
}

export async function getAdjuntoUrl(path) {
  // El bucket 'adjuntos' es privado (ver migración), así que se requiere
  // una URL firmada con vigencia temporal en vez de una URL pública.
  const { data, error } = await supabase.storage.from('adjuntos').createSignedUrl(path, 3600); // 1 hora
  if (error) throw error;
  return data.signedUrl;
}