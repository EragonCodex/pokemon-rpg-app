// Conexión con Supabase y adaptador que imita la base de datos que usaba la app en Claude
// (doc/collection/onSnapshot/set/update/delete), para no reescribir la lógica de la app.
import { createClient } from '@supabase/supabase-js';

export const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

/* ---------- tiempo real: un canal por tabla, refresca a quien escucha ---------- */
const listeners = {};
const channels = {};
function watch(tables, fn) {
  for (const table of tables) {
    (listeners[table] ||= new Set()).add(fn);
    if (!channels[table]) {
      let t = null;
      channels[table] = sb.channel('rt-' + table)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          clearTimeout(t); t = setTimeout(() => listeners[table].forEach(f => f()), 150);
        })
        .subscribe();
    }
  }
  return () => tables.forEach(table => listeners[table].delete(fn));
}

const META = { fromCache: false, hasPendingWrites: false };
const docSnap = (id, data) => ({ id, exists: data !== undefined && data !== null, data: () => data ?? undefined, metadata: META });
const querySnap = docs => ({ docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: META });
const fail = (error) => { if (error) { console.warn(error); throw { code: error.code === '42501' ? 'invalid_argument' : 'unavailable', message: error.message }; } };

function parse(path) {
  const p = path.split('/');
  if (p[0] === 'jug' && p.length === 1) return { kind: 'jugadores' };
  if (p[0] === 'jug' && p.length === 2) return { kind: 'jugador', uid: p[1] };
  if (p[0] === 'jug' && p[2] === 'fichas') return { kind: 'fichas', uid: p[1], id: p[3] };
  if (p[0] === 'jug' && p[2] === 'notas') return { kind: 'notas', uid: p[1], id: p[3] };
  if (p[0] === 'master') return { kind: 'master', id: p[1] };
  if (p[0] === 'bitacora') return { kind: 'bitacora', id: p[1] };
  if (p[0] === 'tiradas') return { kind: 'tiradas', uid: p[1] };
  if (path === 'config/mesa') return { kind: 'masters' };
  if (path === 'pokedex/visibles') return { kind: 'pokedex' };
  if (path === 'combate/actual') return { kind: 'combate' };
  throw new Error('Ruta no soportada: ' + path);
}

/* ---------- lecturas ---------- */
const tiradasCache = {}; // uid -> Map(ts -> id)
async function readCollection(r) {
  if (r.kind === 'jugadores') {
    const { data, error } = await sb.from('jugadores').select('id,alias,creado'); fail(error);
    return data.map(x => docSnap(x.id, { alias: x.alias, creado: x.creado }));
  }
  if (r.kind === 'fichas') {
    const { data, error } = await sb.from('fichas').select('id,data').eq('ambito', 'jug').eq('owner', r.uid); fail(error);
    return data.map(x => docSnap(x.id, x.data));
  }
  if (r.kind === 'notas') {
    const { data, error } = await sb.from('notas').select('id,data').eq('owner', r.uid); fail(error);
    return data.map(x => docSnap(x.id, x.data));
  }
  if (r.kind === 'master') {
    const { data, error } = await sb.from('fichas').select('id,data').eq('ambito', 'master'); fail(error);
    return data.map(x => docSnap(x.id, x.data));
  }
  if (r.kind === 'bitacora') {
    const { data, error } = await sb.from('bitacora').select('id,data'); fail(error);
    return data.map(x => docSnap(x.id, x.data));
  }
  if (r.kind === 'tiradas') {
    const { data, error } = await sb.from('tiradas').select('id,user_id,quien,txt,val,ts').order('ts', { ascending: false }).limit(400); fail(error);
    const by = {};
    for (const k of Object.keys(tiradasCache)) tiradasCache[k] = new Map();
    for (const x of data.reverse()) {
      const ts = new Date(x.ts).getTime(); const u = x.user_id || 'anon';
      (by[u] ||= []).push({ ts, quien: x.quien, txt: x.txt, val: x.val === null ? null : Number(x.val) });
      (tiradasCache[u] ||= new Map()).set(ts, x.id);
    }
    return Object.entries(by).map(([u, log]) => docSnap(u, { log }));
  }
  throw new Error('Colección no soportada');
}
async function readDoc(r) {
  if (r.kind === 'masters') {
    const { data, error } = await sb.from('masters').select('user_id'); fail(error);
    return { masters: data.map(x => x.user_id) };
  }
  if (r.kind === 'pokedex') {
    const [{ data: rows, error: e1 }, { data: cfg, error: e2 }] = await Promise.all([
      sb.from('pokedex_visible').select('especie_id,user_id'),
      sb.from('config').select('valor').eq('clave', 'pokedex_evento').maybeSingle()]);
    fail(e1); fail(e2);
    const ids = [], jug = {};
    for (const x of rows) { if (x.user_id) (jug[x.user_id] ||= []).push(x.especie_id); else ids.push(x.especie_id); }
    return { ids, jug, evento: cfg ? cfg.valor === true : false };
  }
  if (r.kind === 'combate') {
    const { data, error } = await sb.from('combate').select('data').eq('id', 1).maybeSingle(); fail(error);
    return data ? data.data : undefined;
  }
  if (r.kind === 'jugador') {
    const { data, error } = await sb.from('jugadores').select('alias,creado').eq('id', r.uid).maybeSingle(); fail(error);
    return data || undefined;
  }
  const tbl = r.kind === 'master' || r.kind === 'fichas' ? 'fichas' : r.kind;
  const { data, error } = await sb.from(tbl).select('data').eq('id', r.id).maybeSingle(); fail(error);
  return data ? data.data : undefined;
}
const TABLES = {
  jugadores: ['jugadores'], jugador: ['jugadores'], fichas: ['fichas'], master: ['fichas'], notas: ['notas'],
  bitacora: ['bitacora'], tiradas: ['tiradas'], masters: ['masters'], pokedex: ['pokedex_visible', 'config'], combate: ['combate']
};

/* ---------- escrituras ---------- */
const isPlainObj = v => v && typeof v === 'object' && !Array.isArray(v);
function deepMerge(a, b) { const o = { ...(a || {}) }; for (const [k, v] of Object.entries(b)) o[k] = isPlainObj(v) && isPlainObj(o[k]) ? deepMerge(o[k], v) : v; return o; }

async function writeDoc(r, data, uidActual) {
  switch (r.kind) {
    case 'jugador': { const { error } = await sb.from('jugadores').update({ alias: data.alias }).eq('id', r.uid); return fail(error); }
    case 'fichas': { const { error } = await sb.from('fichas').upsert({ id: r.id, ambito: 'jug', owner: r.uid, data, actualizado: new Date().toISOString() }); return fail(error); }
    case 'master': { const { error } = await sb.from('fichas').upsert({ id: r.id, ambito: 'master', owner: null, data, actualizado: new Date().toISOString() }); return fail(error); }
    case 'notas': { const { error } = await sb.from('notas').upsert({ id: r.id, owner: r.uid, data, actualizado: new Date().toISOString() }); return fail(error); }
    case 'bitacora': { const { error } = await sb.from('bitacora').upsert({ id: r.id, data, actualizado: new Date().toISOString() }); return fail(error); }
    case 'combate': { const { error } = await sb.from('combate').update({ data }).eq('id', 1); return fail(error); }
    case 'masters': {
      const { data: cur, error } = await sb.from('masters').select('user_id'); fail(error);
      const have = new Set(cur.map(x => x.user_id)), want = new Set(data.masters || []);
      const add = [...want].filter(u => !have.has(u)), del = [...have].filter(u => !want.has(u));
      if (add.length) fail((await sb.from('masters').insert(add.map(user_id => ({ user_id })))).error);
      if (del.length) fail((await sb.from('masters').delete().in('user_id', del)).error);
      return;
    }
    case 'pokedex': {
      const { data: cur, error } = await sb.from('pokedex_visible').select('especie_id,user_id'); fail(error);
      const key = (e, u) => e + '|' + (u || '');
      const have = new Set(cur.map(x => key(x.especie_id, x.user_id)));
      const want = new Set([...(data.ids || []).map(e => key(e, null)), ...Object.entries(data.jug || {}).flatMap(([u, l]) => l.map(e => key(e, u)))]);
      const add = [...want].filter(k => !have.has(k)).map(k => { const [e, u] = k.split('|'); return { especie_id: e, user_id: u || null }; });
      const del = [...have].filter(k => !want.has(k)).map(k => k.split('|'));
      for (let i = 0; i < add.length; i += 500) fail((await sb.from('pokedex_visible').insert(add.slice(i, i + 500))).error);
      const delAll = del.filter(([, u]) => !u).map(([e]) => e);
      for (let i = 0; i < delAll.length; i += 200) fail((await sb.from('pokedex_visible').delete().is('user_id', null).in('especie_id', delAll.slice(i, i + 200))).error);
      const byU = {}; del.filter(([, u]) => u).forEach(([e, u]) => (byU[u] ||= []).push(e));
      for (const [u, l] of Object.entries(byU)) for (let i = 0; i < l.length; i += 200) fail((await sb.from('pokedex_visible').delete().eq('user_id', u).in('especie_id', l.slice(i, i + 200))).error);
      fail((await sb.from('config').upsert({ clave: 'pokedex_evento', valor: !!data.evento })).error);
      return;
    }
    case 'tiradas': {
      const u = r.uid; const cache = tiradasCache[u] ||= new Map();
      const log = data.log || [];
      const nuevos = log.filter(e => !cache.has(e.ts));
      if (nuevos.length) {
        const { data: ins, error } = await sb.from('tiradas').insert(nuevos.map(e => ({ user_id: u, quien: e.quien || '', txt: e.txt, val: e.val, ts: new Date(e.ts).toISOString() }))).select('id,ts'); fail(error);
        ins.forEach(x => cache.set(new Date(x.ts).getTime(), x.id));
      }
      // Borrados: vaciar el historial, o quitar una tirada concreta (no las que solo salen por el recorte a 50)
      const keep = new Set(log.map(e => e.ts)); const minTs = log.length ? Math.min(...log.map(e => e.ts)) : Infinity;
      const borrar = [...cache.entries()].filter(([ts]) => !keep.has(ts) && (log.length === 0 || ts >= minTs)).map(([, id]) => id);
      if (borrar.length) { fail((await sb.from('tiradas').delete().in('id', borrar)).error); }
      return;
    }
  }
  throw new Error('Escritura no soportada');
}
async function deleteDoc(r) {
  if (r.kind === 'fichas') return fail((await sb.from('fichas').delete().eq('id', r.id).eq('ambito', 'jug')).error);
  if (r.kind === 'master') return fail((await sb.from('fichas').delete().eq('id', r.id).eq('ambito', 'master')).error);
  if (r.kind === 'notas') return fail((await sb.from('notas').delete().eq('id', r.id)).error);
  if (r.kind === 'bitacora') return fail((await sb.from('bitacora').delete().eq('id', r.id)).error);
  throw new Error('Borrado no soportado');
}

/* ---------- API que usa la app ---------- */
function docRef(path) {
  const r = parse(path);
  return {
    id: path.split('/').pop(), path,
    get: async () => docSnap(path.split('/').pop(), await readDoc(r)),
    set: async data => writeDoc(r, data),
    update: async fields => {
      if (r.kind !== 'combate') throw new Error('update solo en combate');
      const cur = await readDoc(r); return writeDoc(r, deepMerge(cur, fields));
    },
    delete: async () => deleteDoc(r),
    onSnapshot(next, onErr) {
      const id = path.split('/').pop();
      const run = () => readDoc(r).then(d => next(docSnap(id, d))).catch(e => onErr && onErr(e));
      run(); return watch(TABLES[r.kind], run);
    },
    collection: sub => collectionRef(path + '/' + sub)
  };
}
function collectionRef(path) {
  const r = parse(path);
  const q = {
    path,
    doc: id => docRef(path + '/' + (id || crypto.randomUUID().replace(/-/g, '').slice(0, 16))),
    get: async () => querySnap(await readCollection(r)),
    onSnapshot(next, onErr) {
      const run = () => readCollection(r).then(d => next(querySnap(d))).catch(e => onErr && onErr(e));
      run(); return watch(TABLES[r.kind], run);
    }
  };
  return q;
}
export const db = { doc: docRef, collection: collectionRef };

export function makeUser(session) {
  const u = session.user; const md = u.user_metadata || {};
  let master = null;
  const isMaster = async () => { if (master === null) { const { data } = await sb.rpc('es_master'); master = !!data; } return master; };
  return {
    me: async () => ({ id: u.id, name: md.full_name || md.name || u.email, avatarUrl: md.avatar_url || md.picture || '', color: '#888', email: u.email, isOwner: await isMaster(), canEdit: true }),
    id: async () => u.id,
    can: async () => true,
    canEdit: async () => true,
    isOwner: isMaster,
    profiles: async ids => Object.fromEntries(ids.map(i => [i, { id: i, name: '', avatarUrl: '', color: '#888', email: null, isMe: i === u.id, guest: false }]))
  };
}
