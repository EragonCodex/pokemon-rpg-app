#!/usr/bin/env python3
"""Extrae la Pokédex completa de la hoja «Pokedex» de BBDD PokemonRPG.xlsx al JSON que usa
tools/build-claude.mjs (DEX_JSON) y que coincide fila a fila con la tabla «especies» de Supabase.

Uso:
  python3 tools/dex-desde-bbdd.py "<ruta>/BBDD PokemonRPG.xlsx" dex.json
  DEX_JSON=dex.json node tools/build-claude.mjs

Formato de cada fila (mismo orden que dex en src/data.json):
  0 ID, 1 Especie, 2 Forma, 3 Tipo Primario, 4 Tipo Secundario, 5 Etapa, 6 Rango, 7 Tipo Mov, 8 Mov Base,
  9-14 FUERZA, VITALIDAD, ENERGIA, SABIDURIA, DESTREZA, CARISMA, 15-17 Habilidad 1-3,
  18 Region, 19 Ndex, 20 Tamaño, 21 Terrenos, 22 Monturas
No se usan: Cadena, HP Test, Base Stats.
Necesita openpyxl (pip install openpyxl). Lee la hoja en modo solo lectura; no modifica el Excel.
"""
import json, sys
import openpyxl

COLS = ['ID', 'Especie', 'Forma', 'Tipo Primario', 'Tipo Secundario', 'Etapa', 'Rango', 'Tipo Mov', 'Mov Base',
        'FUERZA', 'VITALIDAD', 'ENERGIA', 'SABIDURIA', 'DESTREZA', 'CARISMA',
        'Habilidad 1', 'Habilidad 2', 'Habilidad 3', 'Region', 'Ndex', 'Tamaño', 'Terrenos', 'Monturas']
NUM = {'Mov Base', 'FUERZA', 'VITALIDAD', 'ENERGIA', 'SABIDURIA', 'DESTREZA', 'CARISMA'}


def val(c, v):
    if c in NUM:
        if v in (None, ''): return 0
        f = float(v); return int(f) if f.is_integer() else f
    if v is None: return ''
    if isinstance(v, float) and v.is_integer(): v = int(v)
    return str(v)


def main(xlsx, out):
    ws = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)['Pokedex']
    rows = ws.iter_rows(values_only=True)
    head = [str(h).strip() if h is not None else '' for h in next(rows)]
    falta = [c for c in COLS if c not in head]
    if falta: sys.exit(f'La hoja Pokedex no tiene las columnas: {falta}')
    idx = [head.index(c) for c in COLS]
    dex = [[val(c, r[i]) for c, i in zip(COLS, idx)] for r in rows if r and r[idx[0]]]
    with open(out, 'w', encoding='utf-8') as f: json.dump(dex, f, ensure_ascii=False)
    print(f'{out}: {len(dex)} especies')


if __name__ == '__main__':
    if len(sys.argv) != 3: sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
