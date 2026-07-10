-- =====================================================================
--  MIGRACIÓN · Aprobación manual de cuentas nuevas
--  Córrela UNA VEZ en tu proyecto:
--    Supabase → SQL Editor → New query → pega TODO esto → Run
--  (No borra datos existentes.)
-- =====================================================================

-- 1) Nueva columna: si la cuenta ya fue autorizada por un Master
alter table public.profiles
  add column if not exists activo boolean not null default false;

-- 2) Los usuarios que YA existían (antes de esta migración) quedan
--    autorizados automáticamente — no queremos bloquear a tu equipo
--    actual. Solo los que se registren DE AQUÍ EN ADELANTE arrancan
--    pendientes de aprobación.
update public.profiles set activo = true where activo = false;

-- 3) El trigger de usuario nuevo: el PRIMER usuario del sistema (Master)
--    sigue quedando activo automáticamente; cualquiera después de ese
--    arranca inactivo hasta que un Master lo apruebe.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count from public.profiles;
  insert into public.profiles (id, email, rol, activo)
  values (
    new.id,
    new.email,
    case when v_count = 0 then 'MASTER' else 'COMPRAS' end,
    case when v_count = 0 then true else false end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Listo. Ahora en Ajustes → Equipo vas a ver quién está pendiente de
-- aprobación, y podrás asignarle rol y activarlo con un clic.
