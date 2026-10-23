import './style.css';
import { sb, db, makeUser } from './supabase.js';

const gate = document.getElementById('gate');
const logos = `<img class="logo-big logo-l" src="/logo-claro.png" alt="Pokémon RPG"><img class="logo-big logo-d" src="/logo-oscuro.png" alt="Pokémon RPG">`;
const pie = `<p class="note">© 2026 Gonzalo Toro · Pokémon RPG</p>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function showLogin(msg) {
  gate.innerHTML = `<div class="gate-card">${logos}
    <p class="note">Entra con tu cuenta de Google para ver y editar tus fichas.</p>
    <button class="gbtn" id="google">Entrar con Google</button>
    ${msg ? `<p class="ko" style="font-size:13px">${esc(msg)}</p>` : ''}${pie}</div>`;
  document.getElementById('google').onclick = async () => {
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) showLogin('No se pudo iniciar sesión: ' + error.message);
  };
}

async function maybeClaim(session) {
  const uid = session.user.id;
  let skip = null; try { skip = localStorage.getItem('pkrpg.claimSkip'); } catch (_) {}
  if (skip === uid) return;
  const [{ data: yo }, { data: libres }] = await Promise.all([
    sb.from('jugadores').select('legacy_id').eq('id', uid).maybeSingle(),
    sb.from('perfiles_legado').select('legacy_id,alias').is('reclamado', null)]);
  if (!libres || !libres.length || (yo && yo.legacy_id)) return;
  await new Promise(resolve => {
    gate.innerHTML = `<div class="gate-card">${logos}<h1 style="margin:0;font:700 20px var(--f-display)">¿Ya jugabas en la app anterior?</h1>
      <p class="note">Elige tu nombre y tus fichas pasarán a esta cuenta. Si eres nuevo, sigue sin elegir.</p>
      <div class="claim-list">${libres.map(p => `<button class="btn" data-lid="${esc(p.legacy_id)}">${esc(p.alias)}</button>`).join('')}</div>
      <button class="btn" id="nuevo">Soy nuevo, seguir</button><p id="claimErr" class="ko" style="font-size:13px"></p>${pie}</div>`;
    gate.querySelectorAll('[data-lid]').forEach(b => b.onclick = async () => {
      const { error } = await sb.rpc('reclamar_perfil', { lid: b.dataset.lid });
      if (error) { document.getElementById('claimErr').textContent = error.message; return; }
      resolve();
    });
    document.getElementById('nuevo').onclick = () => { try { localStorage.setItem('pkrpg.claimSkip', uid); } catch (_) {} resolve(); };
  });
}

async function start() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { showLogin(); return; }
  await maybeClaim(session);
  window.__sb = sb;
  const user = makeUser(session);
  window.claude = { use: async n => (n === 'db' ? db : n === 'user' ? user : null) };
  gate.hidden = true;
  document.getElementById('app').hidden = false;
  await import('./app.js');
  const who = document.querySelector('.who');
  if (who) {
    const b = document.createElement('button'); b.className = 'btn sm'; b.textContent = 'Salir';
    b.onclick = async () => { await sb.auth.signOut(); location.reload(); };
    who.appendChild(b);
  }
}
sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') location.reload(); });
start().catch(e => { console.error(e); showLogin('Algo falló al conectar. Recarga la página.'); });
