-- =====================================================================
-- Fichero Pokémon RPG · Esquema de base de datos para Supabase
-- © 2026 Gonzalo Toro · Pokémon RPG
--
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo → Run.
-- Se puede ejecutar una sola vez; crea tablas, funciones y permisos.
-- =====================================================================

-- ---------- Jugadores (un registro por cuenta de Google) ----------
create table if not exists public.jugadores (
  id          uuid primary key references auth.users(id) on delete cascade,
  alias       text not null default 'Jugador',
  legacy_id   text unique,               -- id de la app anterior (Claude), si reclamó su perfil
  creado      timestamptz not null default now()
);

-- Al registrarse con Google se crea su fila de jugador automáticamente
create or replace function public.crear_jugador() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.jugadores (id, alias)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Jugador'))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_jugador();

-- ---------- Masters ----------
create table if not exists public.masters (
  user_id uuid primary key references public.jugadores(id) on delete cascade
);
create or replace function public.es_master() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.masters where user_id = auth.uid());
$$;

-- ---------- Fichas (Entrenadores y Pokémon) ----------
create table if not exists public.fichas (
  id            text primary key,
  ambito        text not null check (ambito in ('jug','master')),
  owner         uuid references public.jugadores(id) on delete set null,  -- dueño (null en las del Master)
  legacy_owner  text,                                                     -- dueño en la app anterior
  data          jsonb not null default '{}'::jsonb,
  actualizado   timestamptz not null default now()
);
create index if not exists fichas_owner_idx on public.fichas(owner);

-- ---------- Notas de jugadores y Bitácora del Master ----------
create table if not exists public.notas (
  id text primary key,
  owner uuid references public.jugadores(id) on delete set null,
  legacy_owner text,
  data jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);
create table if not exists public.bitacora (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);

-- ---------- Historial de dados ----------
create table if not exists public.tiradas (
  id      bigint generated always as identity primary key,
  user_id uuid references public.jugadores(id) on delete set null,
  quien   text not null default '',
  txt     text not null,
  val     numeric,
  ts      timestamptz not null default now()
);

-- ---------- Combate en curso (una sola fila, id = 1) ----------
create table if not exists public.combate (
  id    int primary key default 1 check (id = 1),
  data  jsonb not null default '{"parts":[],"ties":{},"last":null,"lastFx":{}}'::jsonb,
  actualizado timestamptz not null default now()
);
insert into public.combate (id) values (1) on conflict do nothing;

-- Una ficha del Master está en combate si su clave aparece en parts
create or replace function public.en_combate(ficha_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.combate c, jsonb_array_elements_text(c.data->'parts') p
                 where p like '%|' || ficha_id);
$$;

-- ---------- Pokédex: catálogo de especies y quién las ve ----------
create table if not exists public.especies (
  id    text primary key,          -- p. ej. P0001_1
  data  jsonb not null             -- fila completa de la Pokédex
);
create table if not exists public.pokedex_visible (
  especie_id text not null references public.especies(id) on delete cascade,
  user_id    uuid references public.jugadores(id) on delete cascade,   -- null = todos los jugadores
  unique (especie_id, user_id)
);
create unique index if not exists pokedex_visible_todos on public.pokedex_visible(especie_id) where user_id is null;
create table if not exists public.config (
  clave text primary key,
  valor jsonb not null
);
insert into public.config (clave, valor) values ('pokedex_evento', 'false'::jsonb) on conflict do nothing;

create or replace function public.especie_visible(eid text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_master()
      or coalesce((select valor = 'true'::jsonb from public.config where clave = 'pokedex_evento'), false)
      or exists (select 1 from public.pokedex_visible v
                 where v.especie_id = eid and (v.user_id is null or v.user_id = auth.uid()));
$$;

-- ---------- Perfiles de la app anterior, para reclamarlos ----------
create table if not exists public.perfiles_legado (
  legacy_id   text primary key,
  alias       text not null,
  reclamado   uuid references public.jugadores(id) on delete set null
);
create or replace function public.reclamar_perfil(lid text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.perfiles_legado set reclamado = auth.uid()
   where legacy_id = lid and (reclamado is null or public.es_master());
  if not found then raise exception 'Ese perfil ya fue reclamado'; end if;
  update public.jugadores set legacy_id = lid, alias = (select alias from public.perfiles_legado where legacy_id = lid)
   where id = auth.uid();
  update public.fichas set owner = auth.uid() where legacy_owner = lid and ambito = 'jug';
  update public.notas  set owner = auth.uid() where legacy_owner = lid;
end $$;

-- =====================================================================
-- Permisos por fila (RLS)
-- =====================================================================
alter table public.jugadores       enable row level security;
alter table public.masters         enable row level security;
alter table public.fichas          enable row level security;
alter table public.notas           enable row level security;
alter table public.bitacora        enable row level security;
alter table public.tiradas         enable row level security;
alter table public.combate         enable row level security;
alter table public.especies        enable row level security;
alter table public.pokedex_visible enable row level security;
alter table public.config          enable row level security;
alter table public.perfiles_legado enable row level security;

-- Jugadores: todos se ven; cada uno edita su alias; el Master edita a todos
create policy jug_ver     on public.jugadores for select to authenticated using (true);
create policy jug_editar  on public.jugadores for update to authenticated using (id = auth.uid() or public.es_master());

-- Masters: todos saben quién es Master; solo un Master agrega o quita
create policy mas_ver     on public.masters for select to authenticated using (true);
create policy mas_escribir on public.masters for all to authenticated using (public.es_master()) with check (public.es_master());

-- Fichas de jugadores: todos las leen; solo su dueño o un Master las cambian
-- Fichas del Master: solo los Master, salvo las que están en combate (lectura para todos)
create policy fic_ver on public.fichas for select to authenticated
  using (ambito = 'jug' or public.es_master() or public.en_combate(id));
create policy fic_crear on public.fichas for insert to authenticated
  with check ((ambito = 'jug' and owner = auth.uid()) or public.es_master());
create policy fic_editar on public.fichas for update to authenticated
  using ((ambito = 'jug' and owner = auth.uid()) or public.es_master())
  with check ((ambito = 'jug' and owner = auth.uid()) or public.es_master());
create policy fic_borrar on public.fichas for delete to authenticated
  using ((ambito = 'jug' and owner = auth.uid()) or public.es_master());

-- Notas: todos las leen; su dueño o un Master las cambian
create policy not_ver     on public.notas for select to authenticated using (true);
create policy not_escribir on public.notas for all to authenticated
  using (owner = auth.uid() or public.es_master()) with check (owner = auth.uid() or public.es_master());

-- Bitácora: solo Master
create policy bit_master on public.bitacora for all to authenticated
  using (public.es_master()) with check (public.es_master());

-- Tiradas: todos las leen; cada uno registra las suyas; el Master borra
create policy tir_ver    on public.tiradas for select to authenticated using (true);
create policy tir_crear  on public.tiradas for insert to authenticated with check (user_id = auth.uid());
create policy tir_borrar on public.tiradas for delete to authenticated using (public.es_master());

-- Combate: todos leen y registran ataques; solo un Master cambia la lista de combatientes
create or replace function public.proteger_combatientes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_master() and (new.data->'parts') is distinct from (old.data->'parts') then
    raise exception 'Solo un Master puede elegir a los combatientes';
  end if;
  new.actualizado := now();
  return new;
end $$;
drop trigger if exists combate_protegido on public.combate;
create trigger combate_protegido before update on public.combate
  for each row execute function public.proteger_combatientes();
create policy com_ver    on public.combate for select to authenticated using (true);
create policy com_editar on public.combate for update to authenticated using (true) with check (true);

-- Pokédex: cada uno ve solo las especies desbloqueadas para él
create policy esp_ver     on public.especies for select to authenticated using (public.especie_visible(id));
create policy esp_master  on public.especies for all to authenticated using (public.es_master()) with check (public.es_master());
create policy vis_ver     on public.pokedex_visible for select to authenticated
  using (public.es_master() or user_id is null or user_id = auth.uid());
create policy vis_master  on public.pokedex_visible for all to authenticated using (public.es_master()) with check (public.es_master());
create policy cfg_ver     on public.config for select to authenticated using (true);
create policy cfg_master  on public.config for all to authenticated using (public.es_master()) with check (public.es_master());

-- Perfiles anteriores: todos ven cuáles quedan por reclamar; se reclaman con reclamar_perfil()
create policy leg_ver     on public.perfiles_legado for select to authenticated using (true);
create policy leg_master  on public.perfiles_legado for all to authenticated using (public.es_master()) with check (public.es_master());

-- =====================================================================
-- Tiempo real (para ver al instante lo que cambian los demás)
-- =====================================================================
alter publication supabase_realtime add table public.fichas, public.notas, public.tiradas,
  public.combate, public.jugadores, public.masters, public.pokedex_visible, public.config, public.bitacora;
