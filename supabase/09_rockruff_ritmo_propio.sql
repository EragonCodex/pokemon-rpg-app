-- Habilidades 1.2 (2026-11-02): se quitó la habilidad duplicada «Impasible/Ritmopropio».
-- Rockruff (P0744_1) pasa a tener Ritmo Propio en su tercera Habilidad, como en Pokemon_RPG 3.2.14.
update public.especies
set data = jsonb_set(data, '{17}', '"Ritmopropio"')
where id = 'P0744_1' and data->>17 = 'Impasible/Ritmopropio';
