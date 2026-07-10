-- =====================================================================
--  MIGRACIÓN · Nombre y apellido de cada usuario
--  Córrela UNA VEZ en: Supabase → SQL Editor → New query → Run.
-- =====================================================================

-- 1) Nueva columna (la de "nombre" ya existía, pero no se usaba)
alter table public.profiles
  add column if not exists apellido text;

-- 2) El trigger de usuario nuevo ahora también guarda nombre y apellido,
--    que llegan desde el formulario de registro como "metadata" del
--    usuario (auth.users.raw_user_meta_data).
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
  insert into public.profiles (id, email, rol, activo, nombre, apellido)
  values (
    new.id,
    new.email,
    case when v_count = 0 then 'MASTER' else 'COMPRAS' end,
    case when v_count = 0 then true else false end,
    new.raw_user_meta_data ->> 'nombre',
    new.raw_user_meta_data ->> 'apellido'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Listo. De aquí en adelante, quien se registre con nombre y apellido
-- en el formulario, quedará guardado en su perfil.
