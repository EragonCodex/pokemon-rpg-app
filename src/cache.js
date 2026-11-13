// Caché local (IndexedDB) para ahorrar tráfico de Supabase (cuota de egress del plan gratuito).
// Guarda filas ya descargadas; la app solo vuelve a pedir las que cambiaron.
// Si IndexedDB no está disponible (modo privado, etc.) todo sigue funcionando sin caché.
const DB = 'pkrpg-cache', STORE = 'kv';
let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise(res => {
    try {
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore(STORE);
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => res(null);
    } catch (_) { res(null); }
  });
  return dbp;
}
export async function cget(key) {
  const db = await open(); if (!db) return undefined;
  return new Promise(res => {
    try { const rq = db.transaction(STORE).objectStore(STORE).get(key); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(undefined); }
    catch (_) { res(undefined); }
  });
}
export async function cset(key, val) {
  const db = await open(); if (!db) return;
  try { db.transaction(STORE, 'readwrite').objectStore(STORE).put(val, key); } catch (_) { /* sin caché */ }
}
