-- =====================================================================
-- Ajustes (ejecutar una vez, después de 01_esquema.sql)
-- 1) Un jugador ve las especies de las fichas de la mesa aunque no estén desbloqueadas
-- 2) Un jugador puede «Liberar» su Pokémon (pasa a Salvajes del Master)
-- 3) Al reclamar un perfil anterior se recuperan su rol de Master y sus especies desbloqueadas
-- =====================================================================
create or replace function public.especie_visible(eid text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_master()
      or coalesce((select valor = 'true'::jsonb from public.config where clave = 'pokedex_evento'), false)
      or exists (select 1 from public.pokedex_visible v
                 where v.especie_id = eid and (v.user_id is null or v.user_id = auth.uid()))
      or exists (select 1 from public.fichas f
                 where f.data->>'especie' = eid and (f.ambito = 'jug' or public.en_combate(f.id)));
$$;

drop policy if exists fic_editar on public.fichas;
create policy fic_editar on public.fichas for update to authenticated
  using ((ambito = 'jug' and owner = auth.uid()) or public.es_master())
  with check ((ambito = 'jug' and owner = auth.uid()) or public.es_master()
              or (ambito = 'master' and owner is null and data->>'cat' = 'salvaje'));

alter table public.perfiles_legado add column if not exists era_master boolean not null default false;
create table if not exists public.pokedex_visible_legado (
  especie_id text not null references public.especies(id) on delete cascade,
  legacy_id  text not null references public.perfiles_legado(legacy_id) on delete cascade,
  primary key (especie_id, legacy_id)
);
alter table public.pokedex_visible_legado enable row level security;
drop policy if exists vleg_master on public.pokedex_visible_legado;
create policy vleg_master on public.pokedex_visible_legado for all to authenticated using (public.es_master()) with check (public.es_master());

create or replace function public.reclamar_perfil(lid text) returns void
language plpgsql security definer set search_path = public as $$
declare p public.perfiles_legado;
begin
  update public.perfiles_legado set reclamado = auth.uid()
   where legacy_id = lid and (reclamado is null or public.es_master())
   returning * into p;
  if not found then raise exception 'Ese perfil ya fue reclamado'; end if;
  update public.jugadores set legacy_id = lid, alias = p.alias where id = auth.uid();
  update public.fichas set owner = auth.uid() where legacy_owner = lid and ambito = 'jug';
  update public.notas  set owner = auth.uid() where legacy_owner = lid;
  if p.era_master then insert into public.masters (user_id) values (auth.uid()) on conflict do nothing; end if;
  insert into public.pokedex_visible (especie_id, user_id)
    select especie_id, auth.uid() from public.pokedex_visible_legado where legacy_id = lid
    on conflict do nothing;
end $$;
