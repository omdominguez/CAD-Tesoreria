-- =====================================================================
--  CAD · Herramienta de Tesorería y Proyección de Pagos
--  Esquema de base de datos para Supabase (PostgreSQL)
--  Ejecuta TODO este archivo una vez en:  Supabase → SQL Editor → New query
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) PERFILES DE USUARIO (cada login tiene un rol)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  nombre     text,
  rol        text not null default 'COMPRAS'
             check (rol in ('COMPRAS', 'TESORERIA', 'MASTER')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Función auxiliar: ¿el usuario actual es Master?
-- SECURITY DEFINER evita recursión de políticas al leer la propia tabla.
create or replace function public.is_master()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and rol = 'MASTER'
  );
$$;

-- Cualquier usuario autenticado puede leer la lista de perfiles.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

-- Solo el Master puede cambiar roles (evita que alguien se autoascienda).
drop policy if exists "profiles_update_master" on public.profiles;
create policy "profiles_update_master" on public.profiles
  for update to authenticated
  using (public.is_master())
  with check (public.is_master());

-- Al registrarse un usuario nuevo se crea su perfil automáticamente.
-- El PRIMER usuario que se registra queda como MASTER; el resto, como COMPRAS.
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
  insert into public.profiles (id, email, rol)
  values (new.id, new.email, case when v_count = 0 then 'MASTER' else 'COMPRAS' end)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2) WORKSPACE COMPARTIDO (un único documento con todos los datos)
--    Bancos, proveedores, compromisos, movimientos, financiamientos,
--    corridas y bitácora viven dentro del campo JSON `data`.
-- ---------------------------------------------------------------------
create table if not exists public.workspace (
  id         int primary key default 1,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint workspace_singleton check (id = 1)
);

insert into public.workspace (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

alter table public.workspace enable row level security;

drop policy if exists "workspace_select" on public.workspace;
create policy "workspace_select" on public.workspace
  for select to authenticated using (true);

drop policy if exists "workspace_update" on public.workspace;
create policy "workspace_update" on public.workspace
  for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- 3) SINCRONIZACIÓN EN VIVO (Realtime sobre el workspace)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workspace'
  ) then
    alter publication supabase_realtime add table public.workspace;
  end if;
end $$;

-- =====================================================================
--  Listo. Notas:
--  · El primer registro de usuario será MASTER automáticamente.
--  · Para cambiar roles luego, usa el panel "Equipo" dentro de la app
--    (o Supabase → Table editor → profiles).
-- =====================================================================
