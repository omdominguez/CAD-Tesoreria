import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURACIÓN DEL CLIENTE
// Reemplaza estas variables por las de tu proyecto en Supabase (o usa un .env)
// ============================================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'TU_SUPABASE_URL';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'TU_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// SINCRONIZACIÓN DEL ESTADO GLOBAL (JSON)
// Asume que tienes una tabla llamada 'app_state' con id=1 y una columna 'data' (JSONB)
// ============================================================================

export async function loadState() {
  const { data, error } = await supabase
    .from('app_state')
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
    .from('app_state')
    .upsert({ 
      id: 1, 
      data: st, 
      actualizado_por: userId, 
      actualizado_en: new Date().toISOString() 
    });

  if (error) throw error;
  return true;
}

export function subscribeState(callback) {
  // Escucha cambios en tiempo real en la tabla app_state
  const channel = supabase.channel('realtime-app-state')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'app_state', filter: 'id=eq.1' },
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
    .select('id, email, created_at, rol')
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

// ============================================================================
// ADJUNTOS (SUPABASE STORAGE)
// Asume un bucket público llamado 'adjuntos'
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
  // Si tu bucket es público:
  const { data } = supabase.storage.from('adjuntos').getPublicUrl(path);
  return data.publicUrl;

  /* 
  Si tu bucket es PRIVADO, usa esto en su lugar:
  const { data, error } = await supabase.storage.from('adjuntos').createSignedUrl(path, 3600); // 1 hora
  if (error) throw error;
  return data.signedUrl;
  */
}