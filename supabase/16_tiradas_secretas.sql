-- Fichero Pokémon RPG · 16: tiradas secretas (2026-11-20)
-- Antes, la app no guardaba el flag «secreta»: el INSERT y el SELECT de «tiradas» no lo incluían y la
-- política tir_ver dejaba leer todas las filas a cualquier usuario autenticado. Las secretas se veían como públicas.
-- 1. Columna sec: las tiradas secretas quedan marcadas.
-- 2. Solo los Masters leen las tiradas secretas (la columna no se puede descifrar en el cliente).
-- Las tiradas guardadas antes de este SQL quedan con sec = false: si ya no deben verse, bórralas a mano.

alter table public.tiradas add column if not exists sec boolean not null default false;

drop policy if exists tir_ver on public.tiradas;
create policy tir_ver on public.tiradas for select to authenticated
  using (not sec or public.es_master());
