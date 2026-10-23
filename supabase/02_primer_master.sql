-- =====================================================================
-- Ejecutar UNA vez, después de haber entrado a la app con tu cuenta de Google.
-- Reemplaza TU_CORREO por el correo de esa cuenta.
-- =====================================================================
insert into public.masters (user_id)
select id from auth.users where email = 'TU_CORREO'
on conflict do nothing;
