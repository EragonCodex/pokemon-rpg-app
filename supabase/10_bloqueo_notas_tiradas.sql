-- =====================================================================
-- Fichero Pokémon RPG · 10: fichas fijadas, notas privadas e historial de 50 tiradas
-- © 2026 Gonzalo Toro · Pokémon RPG
--
-- 1. Fichas fijadas (data.bloq = true): un jugador no puede cambiar su Habilidad, el Rango
--    de sus Atributos (el bonus sí), sus Talentos ni sus Méritos y Defectos, ni quitar el candado.
--    Solo un Master fija o desbloquea.
-- 2. Notas de jugador: data.vis = 'priv' (por defecto: su dueño y los Masters), 'pub' (toda la mesa)
--    o 'yo' (solo su dueño; opción de los Masters).
-- 3. Bitácora: data.vis = 'yo' la deja solo para su autor (data.autor); si no, la ven todos los Masters.
-- 4. Historial de dados: se guardan solo las últimas 50 tiradas de la mesa.
-- =====================================================================

-- 1. Fichas fijadas ---------------------------------------------------
create or replace function public.proteger_ficha_fijada() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text; na jsonb;
begin
  if public.es_master() then return new; end if;
  -- el candado solo lo pone o lo quita un Master
  if (new.data->'bloq') is distinct from (old.data->'bloq') then
    new.data := case when old.data ? 'bloq' then jsonb_set(new.data, '{bloq}', old.data->'bloq') else new.data - 'bloq' end;
  end if;
  if coalesce((old.data->>'bloq')::boolean, false) then
    foreach k in array array['habilidad','tal','meritos','defectos','rasgoOp'] loop
      if old.data ? k then new.data := jsonb_set(new.data, array[k], old.data->k);
      else new.data := new.data - k; end if;
    end loop;
    if old.data ? 'attr' then
      na := coalesce(new.data->'attr', '{}'::jsonb);
      foreach k in array array['FUE','VIT','ENE','SAB','DES','CAR'] loop
        if old.data->'attr' ? k then
          na := jsonb_set(na, array[k], coalesce(na->k, '{}'::jsonb) || jsonb_build_object('r', coalesce(old.data->'attr'->k->'r', '""'::jsonb)));
        end if;
      end loop;
      new.data := jsonb_set(new.data, '{attr}', na);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists ficha_fijada on public.fichas;
create trigger ficha_fijada before update on public.fichas
  for each row execute function public.proteger_ficha_fijada();

-- 2. Notas de jugador -------------------------------------------------
drop policy if exists not_ver on public.notas;
drop policy if exists not_escribir on public.notas;
create policy not_ver on public.notas for select to authenticated
  using (owner = auth.uid()
         or coalesce(data->>'vis','priv') = 'pub'
         or (public.es_master() and coalesce(data->>'vis','priv') = 'priv'));
create policy not_crear on public.notas for insert to authenticated
  with check (owner = auth.uid() or public.es_master());
create policy not_editar on public.notas for update to authenticated
  using (owner = auth.uid() or (public.es_master() and coalesce(data->>'vis','priv') <> 'yo'))
  with check (owner = auth.uid() or public.es_master());
create policy not_borrar on public.notas for delete to authenticated
  using (owner = auth.uid() or (public.es_master() and coalesce(data->>'vis','priv') <> 'yo'));

-- 3. Bitácora ---------------------------------------------------------
drop policy if exists bit_master on public.bitacora;
create policy bit_ver on public.bitacora for select to authenticated
  using (public.es_master() and (coalesce(data->>'vis','masters') <> 'yo' or coalesce(data->>'autor','') in ('', auth.uid()::text)));
create policy bit_crear on public.bitacora for insert to authenticated
  with check (public.es_master());
create policy bit_editar on public.bitacora for update to authenticated
  using (public.es_master() and (coalesce(data->>'vis','masters') <> 'yo' or coalesce(data->>'autor','') in ('', auth.uid()::text)))
  with check (public.es_master());
create policy bit_borrar on public.bitacora for delete to authenticated
  using (public.es_master() and (coalesce(data->>'vis','masters') <> 'yo' or coalesce(data->>'autor','') in ('', auth.uid()::text)));

-- 4. Historial de dados: últimas 50 -----------------------------------
create or replace function public.recortar_tiradas() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.tiradas t
   where t.id not in (select id from public.tiradas order by ts desc, id desc limit 50);
  return null;
end $$;
drop trigger if exists tiradas_50 on public.tiradas;
create trigger tiradas_50 after insert on public.tiradas
  for each statement execute function public.recortar_tiradas();
delete from public.tiradas t where t.id not in (select id from public.tiradas order by ts desc, id desc limit 50);
