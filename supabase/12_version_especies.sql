-- Ahorro de egress: la app guarda el catálogo de especies en el navegador.
-- Este trigger sube config.especies_version cada vez que se edita la tabla especies,
-- para que los navegadores descarten su copia y vuelvan a descargarla.
insert into public.config (clave, valor) values ('especies_version', to_jsonb(extract(epoch from now())::bigint))
on conflict (clave) do nothing;

create or replace function public.subir_version_especies() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.config (clave, valor) values ('especies_version', to_jsonb(extract(epoch from clock_timestamp())::bigint))
  on conflict (clave) do update set valor = excluded.valor;
  return null;
end $$;
revoke all on function public.subir_version_especies() from public, anon, authenticated;

drop trigger if exists especies_version on public.especies;
create trigger especies_version after insert or update or delete or truncate on public.especies
for each statement execute function public.subir_version_especies();
