-- =====================================================================
-- Fichero Pokémon RPG · 15: en el Duelo de Gala los finalistas guardan el Clamor
-- © 2026 Gonzalo Toro · Pokémon RPG
--
-- En la Fase 4 el Clamor cambia con cada ataque, y el ataque lo hace la app de quien
-- ataca. Hasta ahora guardar_concurso() descartaba ese cambio si atacaba un jugador,
-- así que el Clamor del Duelo no llegaba al Concurso. Ahora un jugador que es finalista
-- puede cambiar el estado del Duelo (Clamor, Furor, efectos y registro), pero no quiénes
-- son los finalistas, las rondas, el Clamor inicial, si el Duelo está armado ni el resultado.
-- Solo estructura: no contiene datos de jugadores.
-- =====================================================================
create or replace function public.guardar_concurso(m int, parche jsonb, completo boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare
  yo text := auth.uid()::text;
  pref text := 'u_jug_' || replace(auth.uid()::text, '-', '_') || '_';
  mio text := 'jug|' || auth.uid()::text || '|';
  viejo jsonb; permitido jsonb := '{}'::jsonb; k text; v jsonb;
begin
  if yo is null then raise exception 'Sin sesión'; end if;
  if jsonb_typeof(parche) is distinct from 'object' then raise exception 'Parche inválido'; end if;

  if public.es_master_de(m) then
    insert into public.concurso (id, data) values (m, parche)
    on conflict (id) do update
      set data = case when completo then excluded.data else public.concurso.data || excluded.data end,
          actualizado = now();
    return;
  end if;

  insert into public.concurso (id) values (m) on conflict (id) do nothing;
  select data into viejo from public.concurso where id = m for update;

  for k, v in select * from jsonb_each(parche) loop
    if left(k, length(pref)) = pref then
      permitido := permitido || jsonb_build_object(k, v);
    elsif k = 'parts' and jsonb_typeof(v) = 'array' and coalesce((viejo->>'fase')::int, 0) = 0 then
      if not exists (
        select 1 from (
          (select jsonb_array_elements_text(v)
           except select jsonb_array_elements_text(coalesce(viejo->'parts', '[]'::jsonb)))
          union
          (select jsonb_array_elements_text(coalesce(viejo->'parts', '[]'::jsonb))
           except select jsonb_array_elements_text(v))
        ) d(p) where left(p, length(mio)) <> mio
      ) then
        permitido := permitido || jsonb_build_object('parts', v);
      end if;
    elsif k = 'f4' and jsonb_typeof(v) = 'object' and (viejo->>'fase')::int = 4
          and jsonb_typeof(viejo->'f4') = 'object' and coalesce((viejo->'f4'->>'armado')::boolean, false)
          and jsonb_typeof(viejo->'f4'->'res') is distinct from 'object'
          and exists (select 1 from jsonb_array_elements_text(coalesce(viejo->'f4'->'fin', '[]'::jsonb)) x(p)
                      where left(p, length(mio)) = mio) then
      permitido := permitido || jsonb_build_object('f4',
        (viejo->'f4') || (v - 'fin' - 'n' - 'c0' - 'armado' - 'res'));
    end if;
  end loop;

  if permitido <> '{}'::jsonb then
    update public.concurso set data = data || permitido, actualizado = now() where id = m;
  end if;
end $$;
