// Genera la versión de la app que vive en Claude (artifact «Fichero Pokémon RPG») a partir del mismo código de la web.
// Uso: node tools/build-claude.mjs  →  dist-claude/fichero.html
// En Claude la base de datos y el usuario los entrega window.claude (capacidades db y user del artifact);
// no hay inicio de sesión de Google ni Supabase. Todo lo demás es idéntico a la web.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = p => readFileSync(join(root, p), 'utf8');
const b64 = p => 'data:image/png;base64,' + readFileSync(join(root, p)).toString('base64');

const css = rd('src/style.css');
// La Pokédex completa no está en el repo (en la web viene de Supabase según lo que cada jugador puede ver).
// Para Claude se pasa aparte: DEX_JSON=/ruta/dex.json node tools/build-claude.mjs (mismo formato que la tabla especies).
const dataObj = JSON.parse(rd('src/data.json'));
if (process.env.DEX_JSON) {
  const dex = JSON.parse(readFileSync(process.env.DEX_JSON, 'utf8'));
  if (!Array.isArray(dex) || dex.length !== dataObj.dex.length) throw new Error('DEX_JSON no tiene las mismas filas que data.json');
  dataObj.dex = dex;
} else console.warn('Aviso: sin DEX_JSON la Pokédex queda vacía en la versión de Claude.');
const data = JSON.stringify(dataObj);
let app = rd('src/app.js');
if (!/^import D from '\.\/data\.json';\s*$/m.test(app)) throw new Error('app.js ya no empieza con el import de data.json: revisa el script');
app = app.replace(/^import D from '\.\/data\.json';\s*$/m, `const D = ${data};`);
if (/^\s*import\s/m.test(app)) throw new Error('app.js tiene otros import: el script no los sabe empaquetar');
app = app.replace(/<\/script/gi, '<\\/script');

const html = rd('index.html');
const body = html.slice(html.indexOf('<div id="app"'), html.indexOf('<script type="module"'))
  .replace('<div id="app" hidden>', '<div id="app">')
  .replace(/\/logo-claro\.png/g, b64('public/logo-claro.png'))
  .replace(/\/logo-oscuro\.png/g, b64('public/logo-oscuro.png'));

const out = `<title>Fichero Pokémon RPG</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
${css}
</style>
${body}
<script>
window.__PRUEBAS = true; /* versión de pruebas en Claude: los cambios se aprueban aquí antes de pasar a la web */
${app}
</script>
`;
mkdirSync(join(root, 'dist-claude'), { recursive: true });
writeFileSync(join(root, 'dist-claude/fichero.html'), out);
console.log('dist-claude/fichero.html', (out.length / 1024).toFixed(0) + ' KB');
