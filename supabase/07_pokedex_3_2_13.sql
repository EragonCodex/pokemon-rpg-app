-- 07 · Pokédex 3.2.13 (2026-11-01)
-- Fuente: trabajo/Pokemon_RPG 3.2.13.xlsx (hoja Pokedex). Solo catálogo; no toca datos de jugadores.
-- 1) Región Teselia -> Unova  2) Nidoran: N.º 29 Hembra, N.º 32 Macho  3) 48 megas de Leyendas Z-A
begin;
update public.especies set data = jsonb_set(data, '{18}', '"Unova"') where data->>18 = 'Teselia';
update public.especies set data = jsonb_set(data, '{2}', '"Hembra"') where id = 'P0029_1';
update public.especies set data = jsonb_set(data, '{2}', '"Macho"') where id = 'P0032_1';
insert into public.especies (id, data) values
  ('P0026_3', '["P0026_3", "Raichu", "Mega X", "Electrico", "Electrico", "Mega", "Master", "Nado, Excavar", 25, 5, 4, 3, 4, 4, 3, "Electrogenesis", "Electrogenesis", "Electrogenesis", "Kanto", "P0026"]'::jsonb),
  ('P0026_4', '["P0026_4", "Raichu", "Mega Y", "Electrico", "Electrico", "Mega", "Master", "Nado, Excavar", 25, 3, 2, 6, 3, 5, 3, "Indefenso", "Indefenso", "Indefenso", "Kanto", "P0026"]'::jsonb),
  ('P0036_2', '["P0036_2", "Clefable", "Mega", "Hada", "Volador", "Mega", "Elite", "Excavar, Levitar, Teletransporte", 25, 2, 3, 5, 4, 2, 3, "Espejomagico", "Espejomagico", "Espejomagico", "Kanto", "P0036"]'::jsonb),
  ('P0071_2', '["P0071_2", "Victreebel", "Mega", "Planta", "Veneno", "Mega", "Master", "Terrestre", 25, 5, 3, 5, 3, 2, 3, "Reves", "Reves", "Reves", "Kanto", "P0071"]'::jsonb),
  ('P0121_2', '["P0121_2", "Starmie", "Mega", "Agua", "Psiquico", "Mega", "Legend", "Acuático, Teletransporte", 25, 4, 4, 5, 4, 4, 3, "Potencia", "Potencia", "Potencia", "Kanto", "P0121"]'::jsonb),
  ('P0149_2', '["P0149_2", "Dragonite", "Mega", "Dragon", "Volador", "Mega", "Legend", "Nado, Vuelo", 30, 5, 4, 6, 5, 4, 3, "Multiescamas", "Multiescamas", "Multiescamas", "Kanto", "P0149"]'::jsonb),
  ('P0154_2', '["P0154_2", "Meganium", "Mega", "Planta", "Hada", "Mega", "Legend", "Terrestre", 30, 3, 5, 5, 5, 3, 3, "Megasolar", "Megasolar", "Megasolar", "Johto", "P0154"]'::jsonb),
  ('P0160_2', '["P0160_2", "Feraligatr", "Mega", "Agua", "Dragon", "Mega", "Legend", "Nado, Excavar", 30, 6, 5, 3, 3, 3, 3, "Pieldraconica", "Pieldraconica", "Pieldraconica", "Johto", "P0160"]'::jsonb),
  ('P0227_2', '["P0227_2", "Skarmory", "Mega", "Acero", "Volador", "Mega", "Elite", "Vuelo", 35, 5, 4, 1, 3, 4, 3, "Acerrimo", "Acerrimo", "Acerrimo", "Johto", "P0227"]'::jsonb),
  ('P0358_2', '["P0358_2", "Chimecho", "Mega", "Psiquico", "Acero", "Mega", "Elite", "Levitar", 20, 2, 4, 5, 4, 2, 3, "Levitacion", "Levitacion", "Levitacion", "Hoenn", "P0358"]'::jsonb),
  ('P0359_3', '["P0359_3", "Absol", "Mega Z", "Siniestro", "Fantasma", "Mega", "Master", "Terrestre", 30, 6, 2, 3, 2, 6, 3, "Cortante", "Cortante", "Cortante", "Hoenn", "P0359"]'::jsonb),
  ('P0398_2', '["P0398_2", "Staraptor", "Mega", "Lucha", "Volador", "Mega", "Master", "Vuelo", 35, 5, 3, 2, 3, 4, 3, "Respondon", "Respondon", "Respondon", "Sinnoh", "P0398"]'::jsonb),
  ('P0445_3', '["P0445_3", "Garchomp", "Mega Z", "Dragon", "Dragon", "Mega", "Legend", "Nado, Excavar", 35, 5, 3, 5, 3, 6, 4, "Levitacion", "Levitacion", "Levitacion", "Sinnoh", "P0445"]'::jsonb),
  ('P0448_3', '["P0448_3", "Lucario", "Mega Z", "Lucha", "Acero", "Mega", "Master", "Excavar", 30, 4, 2, 6, 2, 5, 3, "Guardiaaural", "Guardiaaural", "Guardiaaural", "Sinnoh", "P0448"]'::jsonb),
  ('P0478_2', '["P0478_2", "Froslass", "Mega", "Hielo", "Fantasma", "Mega", "Master", "Levitar", 25, 3, 2, 5, 3, 4, 3, "Nevada", "Nevada", "Nevada", "Sinnoh", "P0478"]'::jsonb),
  ('P0485_2', '["P0485_2", "Heatran", "Mega", "Fuego", "Acero", "Mega", "Legend", "Excavar", 30, 4, 4, 7, 5, 3, 3, "Absorbefuego", "Absorbefuego", "Cuerpollama", "Sinnoh", "P0485"]'::jsonb),
  ('P0491_2', '["P0491_2", "Darkrai", "Mega", "Siniestro", "Siniestro", "Mega", "Legend", "Levitar", 30, 4, 5, 6, 5, 3, 3, "Pesadilla", "Pesadilla", "Pesadilla", "Sinnoh", "P0491"]'::jsonb),
  ('P0500_2', '["P0500_2", "Emboar", "Mega", "Fuego", "Lucha", "Mega", "Master", "Excavar", 30, 5, 2, 4, 4, 2, 4, "Rompemoldes", "Rompemoldes", "Rompemoldes", "Unova", "P0500"]'::jsonb),
  ('P0530_2', '["P0530_2", "Excadrill", "Mega", "Tierra", "Acero", "Mega", "Master", "Excavar", 30, 6, 4, 3, 2, 4, 4, "Taladroperforador", "Taladroperforador", "Taladroperforador", "Unova", "P0530"]'::jsonb),
  ('P0545_2', '["P0545_2", "Scolipede", "Mega", "Bicho", "Veneno", "Mega", "Master", "Excavar, Trepar", 30, 6, 5, 3, 3, 2, 3, "Caparazon", "Caparazon", "Caparazon", "Unova", "P0545"]'::jsonb),
  ('P0560_2', '["P0560_2", "Scrafty", "Mega", "Siniestro", "Lucha", "Mega", "Master", "Excavar", 25, 5, 5, 1, 5, 2, 3, "Intimidacion", "Intimidacion", "Intimidacion", "Unova", "P0560"]'::jsonb),
  ('P0604_2', '["P0604_2", "Eelektross", "Mega", "Electrico", "Electrico", "Mega", "Legend", "Levitar", 25, 5, 3, 5, 3, 3, 3, "Electrolevitacion", "Electrolevitacion", "Electrolevitacion", "Unova", "P0604"]'::jsonb),
  ('P0609_2', '["P0609_2", "Chandelure", "Mega", "Fantasma", "Fuego", "Mega", "Legend", "Levitar", 30, 3, 4, 6, 4, 3, 3, "Allanamiento", "Allanamiento", "Allanamiento", "Unova", "P0609"]'::jsonb),
  ('P0623_2', '["P0623_2", "Golurk", "Mega", "Tierra", "Fantasma", "Mega", "Master", "Vuelo, Excavar", 25, 5, 4, 3, 4, 2, 3, "Puñoinvisible", "Puñoinvisible", "Puñoinvisible", "Unova", "P0623"]'::jsonb),
  ('P0652_2', '["P0652_2", "Chesnaught", "Mega", "Planta", "Lucha", "Mega", "Master", "Excavar", 30, 5, 6, 2, 5, 1, 3, "Antibalas", "Antibalas", "Antibalas", "Kalos", "P0652"]'::jsonb),
  ('P0655_2', '["P0655_2", "Delphox", "Mega", "Fuego", "Psiquico", "Mega", "Legend", "Terrestre", 30, 2, 2, 6, 5, 5, 3, "Levitacion", "Levitacion", "Levitacion", "Kalos", "P0655"]'::jsonb),
  ('P0658_3', '["P0658_3", "Greninja", "Mega", "Agua", "Siniestro", "Mega", "Master", "Nado, Excavar, Trepar", 30, 4, 2, 5, 2, 5, 3, "Mutatipo", "Mutatipo", "Mutatipo", "Kalos", "P0658"]'::jsonb),
  ('P0668_2', '["P0668_2", "Pyroar", "Mega", "Fuego", "Normal", "Mega", "Master", "Excavar", 30, 3, 3, 5, 3, 5, 3, "Melenaignea", "Melenaignea", "Melenaignea", "Kalos", "P0668"]'::jsonb),
  ('P0670_3', '["P0670_3", "Floette", "Mega", "Hada", "Hada", "Mega", "Legend", "Levitar", 25, 3, 3, 6, 6, 3, 3, "Aurafeerica", "Aurafeerica", "Aurafeerica", "Kalos", "P0670"]'::jsonb),
  ('P0678_3', '["P0678_3", "Meowstic", "Mega", "Psiquico", "Psiquico", "Mega", "Master", "Excavar", 30, 1, 3, 5, 4, 5, 3, "Calco", "Calco", "Calco", "Kalos", "P0678"]'::jsonb),
  ('P0687_2', '["P0687_2", "Malamar", "Mega", "Siniestro", "Psiquico", "Mega", "Elite", "Levitar", 25, 3, 3, 3, 5, 3, 3, "Respondon", "Respondon", "Respondon", "Kalos", "P0687"]'::jsonb),
  ('P0689_2', '["P0689_2", "Barbaracle", "Mega", "Roca", "Lucha", "Mega", "Master", "Nado, Excavar", 25, 5, 5, 2, 4, 3, 3, "Garradura", "Garradura", "Garradura", "Kalos", "P0689"]'::jsonb),
  ('P0691_2', '["P0691_2", "Dragalge", "Mega", "Veneno", "Dragon", "Mega", "Master", "Nado", 15, 3, 4, 4, 6, 1, 3, "Regeneracion", "Regeneracion", "Regeneracion", "Kalos", "P0691"]'::jsonb),
  ('P0701_2', '["P0701_2", "Hawlucha", "Mega", "Lucha", "Volador", "Mega", "Master", "Vuelo, Excavar", 30, 5, 4, 2, 3, 4, 3, "Indefenso", "Indefenso", "Indefenso", "Kalos", "P0701"]'::jsonb),
  ('P0718_4', '["P0718_4", "Zygarde", "Mega", "Dragon", "Tierra", "Mega", "Legend", "Excavar", 35, 3, 3, 8, 3, 4, 6, "Rompeaura", "Rompeaura", "Rompeaura", "Kalos", "P0718"]'::jsonb),
  ('P0740_2', '["P0740_2", "Crabominable", "Mega", "Lucha", "Hielo", "Mega", "Elite", "Excavar", 25, 6, 5, 2, 4, 1, 3, "Puñoferreo", "Puñoferreo", "Puñoferreo", "Alola", "P0740"]'::jsonb),
  ('P0768_2', '["P0768_2", "Golisopod", "Mega", "Bicho", "Acero", "Mega", "Legend", "Nado", 30, 6, 6, 2, 4, 1, 3, "Garradura", "Garradura", "Garradura", "Alola", "P0768"]'::jsonb),
  ('P0780_2', '["P0780_2", "Drampa", "Mega", "Normal", "Dragon", "Mega", "Master", "Nado, Vuelo", 25, 3, 4, 6, 4, 1, 3, "Colera", "Colera", "Colera", "Alola", "P0780"]'::jsonb),
  ('P0801_3', '["P0801_3", "Magearna", "Mega", "Acero", "Hada", "Mega", "Legend", "Terrestre", 25, 4, 4, 7, 4, 3, 3, "Coranima", "Coranima", "Coranima", "Alola", "P0801"]'::jsonb),
  ('P0801_4', '["P0801_4", "Magearna", "Mega Color Vetusto", "Acero", "Hada", "Mega", "Legend", "Terrestre", 25, 4, 4, 7, 4, 3, 3, "Coranima", "Coranima", "Coranima", "Alola", "P0801"]'::jsonb),
  ('P0807_2', '["P0807_2", "Zeraora", "Mega", "Electrico", "Electrico", "Mega", "Legend", "Terrestre", 30, 6, 3, 6, 3, 5, 3, "Absorbeelectricidad", "Absorbeelectricidad", "Absorbeelectricidad", "Alola", "P0807"]'::jsonb),
  ('P0870_2', '["P0870_2", "Falinks", "Mega", "Lucha", "Lucha", "Mega", "Master", "Terrestre", 30, 5, 5, 2, 2, 4, 3, "Competitivo", "Competitivo", "Competitivo", "Galar", "P0870"]'::jsonb),
  ('P0952_2', '["P0952_2", "Scovillain", "Mega", "Planta", "Fuego", "Mega", "Master", "Terrestre", 25, 5, 3, 5, 3, 3, 3, "Espraypicante", "Espraypicante", "Espraypicante", "Paldea", "P0952"]'::jsonb),
  ('P0970_2', '["P0970_2", "Glimmora", "Mega", "Roca", "Veneno", "Mega", "Legend", "Levitar", 25, 3, 4, 6, 4, 4, 3, "Adaptable", "Adaptable", "Adaptable", "Paldea", "P0970"]'::jsonb),
  ('P0978_4', '["P0978_4", "Tatsugiri", "Mega Curvada", "Dragon", "Agua", "Mega", "Master", "Nado", 20, 3, 3, 5, 4, 3, 3, "Comandar", "Comandar", "Colector", "Paldea", "P0978"]'::jsonb),
  ('P0978_5', '["P0978_5", "Tatsugiri", "Mega Languida", "Dragon", "Agua", "Mega", "Master", "Nado", 20, 3, 3, 5, 4, 3, 3, "Comandar", "Comandar", "Colector", "Paldea", "P0978"]'::jsonb),
  ('P0978_6', '["P0978_6", "Tatsugiri", "Mega Recta", "Dragon", "Agua", "Mega", "Master", "Nado", 20, 3, 3, 5, 4, 3, 3, "Comandar", "Comandar", "Colector", "Paldea", "P0978"]'::jsonb),
  ('P0998_2', '["P0998_2", "Baxcalibur", "Mega", "Dragon", "Hielo", "Mega", "Legend", "Excavar", 35, 6, 4, 4, 4, 3, 4, "Termoconversion", "Termoconversion", "Termoconversion", "Paldea", "P0998"]'::jsonb)
on conflict (id) do update set data = excluded.data;
commit;
