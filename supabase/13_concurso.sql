-- =====================================================================
-- Fichero Pokémon RPG · 13: Concurso Pokémon
-- © 2026 Gonzalo Toro · Pokémon RPG
--
-- 1. Tabla concurso: una fila por mesa (id = mesa), igual que combate.
-- 2. Todos los de la mesa la leen; nadie la escribe directo salvo con
--    guardar_concurso(), que mezcla los campos en una sola operación para
--    que dos personas no se pisen al escoger a la vez.
-- 3. Un Master de la mesa puede cambiar todo. Un jugador solo puede:
--    a) cambiar sus propios campos u_jug_<su id>_…  (sus elecciones), y
--    b) inscribir o retirar a sus propios Entrenadores antes de empezar (fase 0).
--    Lo demás que mande un jugador se descarta.
-- Solo estructura: no contiene datos de jugadores.
-- =====================================================================

create table if not exists public.concurso (
  id    int primary key,
  data  jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);
alter table public.concurso enable row level security;
drop policy if exists con_ver on public.concurso;
create policy con_ver on public.concurso for select to authenticated using (true);
revoke insert, update, delete on public.concurso from anon, authenticated;
grant select on public.concurso to authenticated;

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
    end if;
  end loop;

  if permitido <> '{}'::jsonb then
    update public.concurso set data = data || permitido, actualizado = now() where id = m;
  end if;
end $$;

revoke execute on function public.guardar_concurso(int, jsonb, boolean) from public, anon;
grant execute on function public.guardar_concurso(int, jsonb, boolean) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.concurso;
exception when duplicate_object then null; when undefined_object then null; end $$;
