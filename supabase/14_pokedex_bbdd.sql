-- 14 · Pokédex de la BBDD (2026-11-15): 17 formas nuevas, 45 especies corregidas y 3 retiradas
-- Fuente: trabajo/BBDD PokemonRPG.xlsx (hoja Pokedex, 1.287 filas). Solo catálogo; no toca datos de jugadores.
-- pokedex_visible no tiene clave primaria y está en el tiempo real: sin esto Postgres rechaza todo borrado
-- en esa tabla (ocultar una especie a un jugador, o retirar una especie del catálogo).
alter table public.pokedex_visible replica identity full;
begin;
-- Cambios puntuales: (especie, posición en la fila, valor nuevo)
do $$ declare v record; begin
for v in select * from (values
  ('P0351_1',7,'"Levitar"'),
  ('P0351_2',7,'"Levitar"'),
  ('P0351_3',7,'"Levitar"'),
  ('P0351_4',7,'"Levitar"'),
  ('P0412_1',2,'"Sinnoh"'),
  ('P0421_1',2,'"Encapotado"'),
  ('P0422_1',10,'2'),
  ('P0423_1',10,'3'),
  ('P0479_1',2,'"Sinnoh"'),
  ('P0479_2',2,'"Horno"'),
  ('P0479_3',2,'"Lavadora"'),
  ('P0479_3',7,'"Levitar"'),
  ('P0479_4',2,'"Refrigerador"'),
  ('P0479_5',2,'"Ventilador"'),
  ('P0479_6',2,'"Podadora"'),
  ('P0550_1',2,'"Raya Roja"'),
  ('P0550_2',2,'"Raya Azul"'),
  ('P0550_3',2,'"Raya Blanca"'),
  ('P0555_4',2,'"Galar Daruma"'),
  ('P0555_1',2,'"Unova"'),
  ('P0555_3',2,'"Unova Daruma"'),
  ('P0585_1',2,'"Primavera"'),
  ('P0585_1',7,'"Terrestre"'),
  ('P0585_1',10,'1'),
  ('P0585_1',13,'4'),
  ('P0586_1',2,'"Primavera"'),
  ('P0586_1',7,'"Terrestre"'),
  ('P0586_1',10,'1'),
  ('P0586_1',13,'4'),
  ('P0647_1',2,'"Unova"'),
  ('P0666_1',2,'"Kalos"'),
  ('P0676_1',2,'"Kalos"'),
  ('P0716_1',2,'"Kalos"'),
  ('P0745_1',9,'5'),
  ('P0745_2',13,'5'),
  ('P0774_1',2,'"Alola"'),
  ('P0801_2',13,'3'),
  ('P0801_2',14,'4'),
  ('P0801_4',13,'4'),
  ('P0801_4',14,'4'),
  ('P0849_1',11,'5'),
  ('P0849_1',14,'4'),
  ('P0849_2',10,'3'),
  ('P0849_2',12,'3'),
  ('P0854_1',2,'"Galar"'),
  ('P0855_1',2,'"Galar"'),
  ('P0855_1',14,'4'),
  ('P0869_1',2,'"Galar"'),
  ('P0925_2',14,'4'),
  ('P0931_1',17,'"Potenciabruta"'),
  ('P0931_2',16,'"Adaptable"'),
  ('P0931_2',21,'"Aire"'),
  ('P0931_2',22,'"Cabina"'),
  ('P0931_3',17,'"Agallas"'),
  ('P0931_3',21,'"Aire"'),
  ('P0931_3',22,'"Cabina"'),
  ('P0931_4',16,'"Adaptable"'),
  ('P0931_4',21,'"Aire"'),
  ('P0931_4',22,'"Cabina"'),
  ('P0982_2',14,'5'),
  ('P1012_1',2,'"Paldea"'),
  ('P1013_1',14,'4'),
  ('P1013_2',11,'5')
) t(id, i, x) loop
  update public.especies set data = jsonb_set(data, array[v.i::text], v.x::jsonb) where id = v.id;
end loop; end $$;
insert into public.especies (id, data) values
  ('P0351_5','["P0351_5","Castform","Forma Arena","Roca","Roca","Unica","Beginner","Levitar",20,2,2,2,2,2,3,"Prediccion","Prediccion","Prediccion","Hoenn","P0351","Pequeño","-","-"]'::jsonb),
  ('P0351_6','["P0351_6","Castform","Forma Sieno","Veneno","Veneno","Unica","Beginner","Levitar",20,2,2,2,2,2,3,"Prediccion","Prediccion","Prediccion","Hoenn","P0351","Pequeño","-","-"]'::jsonb),
  ('P0351_7','["P0351_7","Castform","Forma Enjambre","Bicho","Bicho","Unica","Beginner","Levitar",20,2,2,2,2,2,3,"Prediccion","Prediccion","Prediccion","Hoenn","P0351","Pequeño","-","-"]'::jsonb),
  ('P0351_8','["P0351_8","Castform","Forma Sombra","Siniestro","Siniestro","Unica","Beginner","Levitar",20,2,2,2,2,2,3,"Prediccion","Prediccion","Prediccion","Hoenn","P0351","Pequeño","-","-"]'::jsonb),
  ('P0351_9','["P0351_9","Castform","Forma Espiritu","Fantasma","Fantasma","Unica","Beginner","Levitar",20,2,2,2,2,2,3,"Prediccion","Prediccion","Prediccion","Hoenn","P0351","Pequeño","-","-"]'::jsonb),
  ('P0421_2','["P0421_2","Cherrim","Soleado","Planta","Planta","Evolucion","Amateur","Terrestre",20,2,2,4,3,4,3,"Donfloral","Donfloral","Donfloral","Sinnoh","P0421","Pequeño","-","-"]'::jsonb),
  ('P0422_2','["P0422_2","Shellos","Mar Este","Agua","Agua","Basico","Beginner","Acuático, Trepar",20,1,1,2,3,1,3,"Viscosidad","Colector","Poderarena","Sinnoh","P0422","Pequeño","-","-"]'::jsonb),
  ('P0423_2','["P0423_2","Gastrodon","Mar Este","Agua","Tierra","Evolucion","Amateur","Acuático, Excavar, Trepar",25,3,2,3,4,1,4,"Viscosidad","Colector","Poderarena","Sinnoh","P0423","Pequeño","-","-"]'::jsonb),
  ('P0479_7','["P0479_7","Rotom","DJ","Electrico","Normal","Unica","Master","Levitar",20,2,4,4,4,3,3,"Levitacion","Levitacion","Levitacion","Sinnoh","P0479","Pequeño","-","-"]'::jsonb),
  ('P0646_4','["P0646_4","Kyurem","Completo","Electrico","Fuego","Legendario","Legend","Vuelo",30,6,4,6,4,4,4,"Levitacion","Levitacion","Levitacion","Unova","P0646","Grande","-","-"]'::jsonb),
  ('P0855_2','["P0855_2","Polteageist","Forma Falsificada","Fantasma","Fantasma","Evolucion","Elite","Levitar",25,2,2,6,4,2,3,"Armadurafragil","Armadurafragil","Cuerpomaldito","Galar","P0855","Pequeño","-","-"]'::jsonb),
  ('P0585_2','["P0585_2","Deerling","Verano","Normal","Planta","Basico","Beginner","Terrestre",20,3,2,1,2,2,3,"Clorofila","Herbivoro","Dicha","Unova","P0585","Pequeño","-","-"]'::jsonb),
  ('P0586_2','["P0586_2","Sawsbuck","Verano","Normal","Planta","Evolucion","Amateur","Terrestre",25,5,2,2,2,2,3,"Clorofila","Herbivoro","Dicha","Unova","P0586","Mediano","Tierra firme","Silla de montar, Remolque"]'::jsonb),
  ('P0585_3','["P0585_3","Deerling","Otoño","Normal","Planta","Basico","Beginner","Terrestre",20,2,3,1,1,3,3,"Clorofila","Herbivoro","Dicha","Unova","P0585","Pequeño","-","-"]'::jsonb),
  ('P0586_3','["P0586_3","Sawsbuck","Otoño","Normal","Planta","Evolucion","Amateur","Terrestre",25,4,3,2,1,3,3,"Clorofila","Herbivoro","Dicha","Unova","P0586","Mediano","Tierra firme","Silla de montar, Remolque"]'::jsonb),
  ('P0585_4','["P0585_4","Deerling","Invierno","Normal","Planta","Basico","Beginner","Terrestre",20,2,2,2,2,3,2,"Clorofila","Herbivoro","Dicha","Unova","P0585","Pequeño","-","-"]'::jsonb),
  ('P0586_4','["P0586_4","Sawsbuck","Invierno","Normal","Planta","Evolucion","Amateur","Terrestre",25,4,2,3,2,3,2,"Clorofila","Herbivoro","Dicha","Unova","P0586","Mediano","Tierra firme","Silla de montar, Remolque"]'::jsonb)
on conflict (id) do update set data = excluded.data;
-- Las retiradas se borran solo si ninguna ficha las usa
delete from public.especies e where e.id in ('P0845_2', 'P0845_3', 'P1012_2')
  and not exists (select 1 from public.fichas f where f.data->>'especie' = e.id);
commit;
