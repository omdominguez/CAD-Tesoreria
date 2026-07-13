-- =====================================================================
--  MIGRACIÓN · Foto de perfil y fecha de nacimiento
--  Córrela UNA VEZ en: Supabase → SQL Editor → New query → Run.
--  (Reutiliza el mismo bucket 'adjuntos' que ya usas para comprobantes,
--  así que si ya corriste esa migración antes, no hace falta nada más
--  de Storage — solo estas dos columnas nuevas.)
-- =====================================================================

alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists fecha_nacimiento date;

-- Cualquier usuario autenticado puede actualizar SU PROPIO perfil
-- (nombre, apellido, foto, fecha de nacimiento) — antes solo el Master
-- podía editar perfiles (para cambiar roles). Ahora agregamos este
-- permiso adicional para que cada quien edite lo suyo.
drop policy if exists "profiles_update_propio" on public.profiles;
create policy "profiles_update_propio" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- IMPORTANTE: lo anterior por sí solo dejaría que cualquiera se
-- autoasigne el rol Master o se autoapruebe saltándose la interfaz.
-- Este trigger lo evita: si quien edita NO es Master, se ignoran los
-- cambios a "rol" y "activo" (quedan igual que antes), sin importar
-- qué se haya intentado mandar.
create or replace function public.proteger_columnas_sensibles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_master() then
    new.rol := old.rol;
    new.activo := old.activo;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_update_proteger on public.profiles;
create trigger on_profile_update_proteger
  before update on public.profiles
  for each row execute function public.proteger_columnas_sensibles();
