# Fichero Pokémon RPG

Registro de fichas para el sistema **Pokémon RPG** (entrenadores, Pokémon, NPC, Pokédex, combate y dados).

© 2026 Gonzalo Toro · Pokémon RPG

## Piezas

- **Supabase**: base de datos (Postgres), inicio de sesión con Google y permisos por fila.
- **Vercel**: publica la página desde este repositorio.

## Puesta en marcha

1. En Supabase, abre *SQL Editor* y ejecuta `supabase/01_esquema.sql` y luego `supabase/03_ajustes.sql`.
   El catálogo de especies y los datos de la app anterior se cargan con archivos SQL aparte (no están en el repositorio).
2. Configura Google en *Authentication → Sign In / Providers → Google*.
3. Entra una vez a la app con tu cuenta de Google y ejecuta `supabase/02_primer_master.sql` con tu correo.
4. En Vercel, importa este repositorio y define las variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

Cambios posteriores del esquema (ya aplicados): `supabase/06_combate_jugadores.sql` (los jugadores entran solos al combate, daño y efectos entre fichas en combate, fin de ronda sin duplicados).

La clave publicable es pública por diseño. Nunca subas al repositorio la clave secreta (`service_role`) ni el secreto de Google.

## Desarrollo local

```bash
npm install
cp .env.example .env.local
npm run dev
```
