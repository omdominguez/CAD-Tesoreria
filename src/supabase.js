import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Si faltan las variables de entorno, la app muestra una pantalla de configuración
// en vez de romperse.
export const isConfigured = Boolean(url && key);
export const supabase = isConfigured ? createClient(url, key) : null;
