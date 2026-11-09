-- =====================================================================
-- Fichero Pokémon RPG · 11: varias mesas y perfil
-- © 2026 Gonzalo Toro · Pokémon RPG
--
-- 1. Perfil del jugador: foto, color propio, tema y última conexión (visto).
-- 2. Cada fila de fichas, notas, Bitácora, tiradas y Pokédex visible guarda su mesa (mesa_id).
--    Lo que ya existía queda en la mesa 1 (RPG 1); no se borra nada.
-- 3. Masters por mesa: masters(user_id, mesa_id). mesa_id = 0 es el dueño, Master en todas las mesas.
--    Solo el dueño agrega o quita Masters y edita la lista de mesas (config «mesas»).
-- 4. El combate de la mesa N es la fila combate.id = N; avanzar_ronda recibe la mesa.
-- 5. Historial: se guardan las últimas 50 tiradas de cada mesa.
-- 6. La Pokédex en modo evento se reconoce por mesa (config «pokedex_evento» y «pokedex_evento:N»).
--
-- Paso aparte (no va en el repo porque usa el correo del dueño):
--   insert into public.masters (user_id, mesa_id) select id, 0 from auth.users where email = '<correo del dueño>' on conflict do nothing;
-- =====================================================================

-- 1. Perfil ------------------------------------------------------------
alter table public.jugadores
  add column if not exists foto  text,
  add column if not exists color text,
  add column if not exists tema  text,
  add column if not exists visto timestamptz;

-- 2. Mesa de cada fila --------------------------------------------------
alter table public.fichas          add column if not exists mesa_id int not null default 1;
alter table public.notas           add column if not exists mesa_id int not null default 1;
alter table public.bitacora        add column if not exists mesa_id int not null default 1;
alter table public.tiradas         add column if not exists mesa_id int not null default 1;
alter table public.pokedex_visible add column if not exists mesa_id int not null default 1;
create index if not exists fichas_mesa_idx   on public.fichas(mesa_id);
create index if not exists notas_mesa_idx    on public.notas(mesa_id);
create index if not exists bitacora_mesa_idx on public.bitacora(mesa_id);
create index if not exists tiradas_mesa_idx  on public.tiradas(mesa_id, ts desc);

alter table public.pokedex_visible drop constraint if exists pokedex_visible_especie_id_user_id_key;
drop index if exists public.pokedex_visible_todos;
create unique index if not exists pokedex_visible_todos_m on public.pokedex_visible(especie_id, mesa_id) where user_id is null;
create unique index if not exists pokedex_visible_jug_m   on public.pokedex_visible(especie_id, user_id, mesa_id) where user_id is not null;

-- 3. Masters por mesa ---------------------------------------------------
alter table public.masters add column if not exists mesa_id int not null default 1;
alter table public.masters drop constraint if exists masters_pkey;
alter table public.masters add primary key (user_id, mesa_id);

create or replace function public.es_dueno() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.masters where user_id = auth.uid() and mesa_id = 0);
$$;
create or replace function public.es_master_de(m int) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.masters where user_id = auth.uid() and mesa_id in (0, m));
$$;
grant execute on function public.es_dueno() to authenticated;
grant execute on function public.es_master_de(int) to authenticated;

drop policy if exists mas_escribir on public.masters;
create policy mas_escribir on public.masters for all to authenticated
  using (public.es_dueno()) with check (public.es_dueno());

drop policy if exists cfg_master on public.config;
create policy cfg_master on public.config for all to authenticated
  using ((public.es_master() and clave <> 'mesas') or public.es_dueno())
  with check ((public.es_master() and clave <> 'mesas') or public.es_dueno());

-- 4. Combate por mesa ---------------------------------------------------
alter table public.combate drop constraint if exists combate_id_check;
alter table public.combate alter column id drop default;
drop policy if exists com_crear on public.combate;
create policy com_crear on public.combate for insert to authenticated with check (public.es_master_de(id));

drop function if exists public.avanzar_ronda(int);
create or replace function public.avanzar_ronda(esperada int, mesa int default 1) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.participa_en_combate() then return false; end if;
  update public.combate
     set data = jsonb_set(data, '{ronda}', to_jsonb(esperada + 1))
   where id = mesa and coalesce(nullif((data->>'ronda')::int, 0), 1) = esperada;
  return found;
end $$;
revoke execute on function public.avanzar_ronda(int, int) from anon;
grant execute on function public.avanzar_ronda(int, int) to authenticated;

-- 5. Últimas 50 tiradas de cada mesa ------------------------------------
create or replace function public.recortar_tiradas() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.tiradas t
   where t.id in (select id from (select id, row_number() over (partition by mesa_id order by ts desc, id desc) rn
                                    from public.tiradas) x where x.rn > 50);
  return null;
end $$;

-- 6. Modo evento por mesa -----------------------------------------------
create or replace function public.especie_visible(eid text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_master()
      or exists (select 1 from public.config where (clave = 'pokedex_evento' or clave like 'pokedex_evento:%') and valor = 'true'::jsonb)
      or exists (select 1 from public.pokedex_visible v
                 where v.especie_id = eid and (v.user_id is null or v.user_id = auth.uid()))
      or exists (select 1 from public.fichas f
                 where f.data->>'especie' = eid and (f.ambito = 'jug' or public.en_combate(f.id)));
$$;
