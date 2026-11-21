-- =====================================================================
-- Fichero Pokémon RPG · 18: NPC en la Mesa
-- © 2026 Gonzalo Toro · Pokémon RPG
--
-- Regla: toda ficha de Master marcada «En Mesa» (data.enMesa = true) es pública
-- para los jugadores de su campaña. Al quitarla de la Mesa vuelve a ser privada
-- (solo Masters, o en combate, como antes).
--
-- Campaña 1 sin lista de miembros en config «mesas»: la ven todos (igual que su Mesa).
-- Otras campañas: solo sus miembros (config «mesas».miembros[N][uid]).
-- Es una política permisiva: se suma a fic_ver y no la reemplaza.
-- Probada en Postgres local (2026-11-21) con esquema de prueba; pendiente aprobación para aplicar.
-- =====================================================================

create policy master_mesa_ver on public.fichas for select to authenticated
  using (
    ambito = 'master'
    and (data->>'enMesa') = 'true'
    and (
      (
        mesa_id = 1
        and not exists (
          select 1 from public.config c
          where c.clave = 'mesas' and (c.valor->'miembros') ? (fichas.mesa_id::text)
        )
      )
      or exists (
        select 1 from public.config c
        where c.clave = 'mesas'
          and (c.valor->'miembros'->(fichas.mesa_id::text)->>(auth.uid()::text)) is not null
      )
    )
  );
