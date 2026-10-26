-- =====================================================================
-- Fichero Pokémon RPG · 06: los jugadores entran solos al combate
-- © 2026 Gonzalo Toro · Pokémon RPG
--
-- 1. Un jugador puede agregar o quitar del combate solo a sus propios personajes.
-- 2. guardar_ficha_combate: aplica daño, estados y bonos a una ficha que está
--    en combate aunque sea de otro jugador o del Master (colisión, residuales,
--    efectos de movimientos). Solo lo usa quien participa en el combate.
-- 3. avanzar_ronda: suma 1 a la ronda solo si nadie la avanzó antes, para que
--    dos personas no procesen el fin de ronda a la vez.
-- =====================================================================

create or replace function public.participa_en_combate() returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_master() or exists (
    select 1 from public.combate c, jsonb_array_elements_text(coalesce(c.data->'parts','[]'::jsonb)) p
    where p like 'jug|' || auth.uid()::text || '|%');
$$;

create or replace function public.proteger_combatientes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_master() and (new.data->'parts') is distinct from (old.data->'parts') then
    if exists (
      select 1 from (
        (select jsonb_array_elements_text(coalesce(new.data->'parts','[]'::jsonb))
         except select jsonb_array_elements_text(coalesce(old.data->'parts','[]'::jsonb)))
        union
        (select jsonb_array_elements_text(coalesce(old.data->'parts','[]'::jsonb))
         except select jsonb_array_elements_text(coalesce(new.data->'parts','[]'::jsonb)))
      ) d(k)
      where k not like 'jug|' || auth.uid()::text || '|%'
    ) then
      raise exception 'Solo puedes agregar o quitar del combate a tus propios personajes';
    end if;
  end if;
  new.actualizado := now();
  return new;
end $$;

create or replace function public.guardar_ficha_combate(fid text, nueva jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.en_combate(fid) then raise exception 'Esa ficha no está en combate'; end if;
  if not public.participa_en_combate() then raise exception 'No participas en el combate'; end if;
  update public.fichas set data = data || nueva, actualizado = now() where id = fid;  -- mezcla: conserva la imagen y lo que no venga
end $$;

create or replace function public.avanzar_ronda(esperada int) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.participa_en_combate() then return false; end if;
  update public.combate
     set data = jsonb_set(data, '{ronda}', to_jsonb(esperada + 1))
   where id = 1 and coalesce((data->>'ronda')::int, 0) = esperada;
  return found;
end $$;

revoke execute on function public.guardar_ficha_combate(text, jsonb) from anon;
revoke execute on function public.avanzar_ronda(int) from anon;
grant execute on function public.guardar_ficha_combate(text, jsonb) to authenticated;
grant execute on function public.avanzar_ronda(int) to authenticated;
grant execute on function public.participa_en_combate() to authenticated;
