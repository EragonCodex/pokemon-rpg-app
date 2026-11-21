-- =====================================================================
-- Fichero Pokémon RPG · 18: NPC en la Mesa (BORRADOR, sin aplicar)
-- © 2026 Gonzalo Toro · Pokémon RPG
--
-- Un NPC (fila ambito = 'master') con data.enMesa = true lo leen los jugadores
-- de su campaña, para que vean sus detalles en la sección Mesa.
-- Las fichas de Master sin marca siguen privadas (solo Masters, o en combate).
--
-- Pendiente: aprobación de Gonzalo y prueba en Postgres local antes de aplicar.
-- Las políticas son permisivas (se suman a fic_ver, no la reemplazan).
-- =====================================================================

create policy master_mesa_ver on public.fichas for select to authenticated
  using (
    ambito = 'master'
    and (data->>'enMesa') = 'true'
    and (
      mesa_id = 1
      or exists (
        select 1 from public.config c
        where c.clave = 'mesas'
          and (c.valor->'miembros'->(mesa_id::text)->>(auth.uid()::text)) is not null
      )
    )
  );
