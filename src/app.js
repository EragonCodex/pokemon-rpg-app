import D from './data.json';
const ATTR = ['FUE','VIT','ENE','SAB','DES','CAR'];
const ATTR_FULL = {FUE:'Fuerza',VIT:'Vitalidad',ENE:'Energía',SAB:'Sabiduría',DES:'Destreza',CAR:'Carisma'};
const RANGOS = D.rangos.map(r=>r[0]);
const CODE = Object.fromEntries(D.rangos.map(r=>[r[0],r[5]]));
const ATTR_PTS=[3,6,10,14,19,24], TAL_PTS=[6,12,18,24,30,36], FREE_MV=[2,2,3,4,5,6];
const TALENTOS = [
  ['Batalla','#d9822b',['Combatir','Precision','Acrobacias','Herramientas']],
  ['Adaptación','#3f9a5a',['Atletismo','Percepcion','Sigilo','Supervivencia']],
  ['Social','#d6578f',['Presencia','Manipulacion','Perspicacia','Interpretacion']],
  ['Intelecto','#3f7fc1',['Teoria','Aplicacion','Compostura','Comprension']]];
const ALL_TAL = TALENTOS.flatMap(c=>c[2]);
const TAL_LABEL = t=>({Precision:'Precisión',Percepcion:'Percepción',Manipulacion:'Manipulación',Interpretacion:'Interpretación',Teoria:'Teoría',Aplicacion:'Aplicación',Comprension:'Comprensión'}[t]||t);
const TYPE_COLOR = {Bicho:'#8a9a1b',Siniestro:'#5a4a42',Dragon:'#5b4fd1',Electrico:'#c99a00',Hada:'#d1609c',Lucha:'#b23a2e',Fuego:'#e0602a',Volador:'#7c8fd6',Fantasma:'#6a4f93',Planta:'#4f9a35',Tierra:'#b08a3c',Hielo:'#3fa3b5',Normal:'#8b8a72',Veneno:'#9a45a0',Psiquico:'#e04f7a',Roca:'#a3903c',Acero:'#7b8b9a',Agua:'#3f7fd6','Sin Tipo':'#777'};
const SPEEDS = Object.keys(D.speed);
// dex: 0 id,1 especie,2 forma,3 t1,4 t2,5 etapa,6 rango,7 tipoMov,8 movBase,9-14 attrs,15-17 hab,18 region,19 ndex
const dexById = new Map(D.dex.map(r=>[r[0],r]));
const dexLabel = r => r[2] && r[2]!==r[1] ? `${r[1]} (${r[2]})` : r[1];
const dexByLabel = new Map(D.dex.filter(r=>r[1]).map(r=>[dexLabel(r),r[0]]));
/* El catálogo completo de especies viene de Supabase según lo que cada jugador puede ver */
let especiesTimer=null;
function reloadEspecies(){ clearTimeout(especiesTimer); especiesTimer=setTimeout(loadEspecies,300); }
async function loadEspecies(){
  const sb=window.__sb; if(!sb) return;
  const { data, error } = await sb.from('especies').select('id,data');
  if(error){ console.warn(error); return; }
  for(const row of data){ const t=dexById.get(row.id); if(t&&Array.isArray(row.data)) row.data.forEach((v,i)=>{ t[i]=v; }); }
  dexByLabel.clear(); D.dex.forEach(r=>{ if(r[1]) dexByLabel.set(dexLabel(r),r[0]); });
  buildDexList(); if(S.db) render();
}
const dexTypes = d=>[d[3],d[4]].filter((t,i,a)=>t&&t!=='-'&&a.indexOf(t)===i);
// atk: 0 id,1 nombre,2 tipo,3 clase,4 atributo,5 nivel,6 prec,7 base,8 prio,9 blanco,10 dist,11 efecto,12 RE,13 categoria,14 concurso,15 costos
const atkById = new Map(D.atk.map(r=>[r[0],r]));
const atkByName = new Map(D.atk.map(r=>[r[1].toLowerCase(),r[0]]));
const habMap = new Map(D.hab.map(r=>[r[0],r[1]]));
const natMap = new Map(D.nat.map(r=>[r[0],r]));
const estMap = new Map(D.estados.map(r=>[r[0],r]));
const EST_F = D.estados.filter(r=>r[2]==='Fisico').map(r=>r[0]);
const EST_M = D.estados.filter(r=>r[2]==='Mental').map(r=>r[0]);

/* ---------- utilidades ---------- */
const $ = s=>document.querySelector(s);
const esc = s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pct = v=>Math.round(v*100)+'%';
const ri = r=>RANGOS.indexOf(r);
const rb = r=>{const i=ri(r);return i<0?0:D.rangos[i][1]};
const hpBase = r=>{const i=ri(r);return i<0?5:D.rangos[i][2]};
const newId = ()=> (crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()).replace(/[^a-z0-9]/gi,'').slice(0,16);
const TYPE_BG={Normal:'E5DBE3',Fuego:'FF603B',Agua:'49A9F9',Planta:'44B276',Electrico:'FFFF66',Hielo:'66FFFF',Psiquico:'FF00FF',Dragon:'606DCC',Hada:'FF99FF',Lucha:'FF9B09',Volador:'B4C7E7',Veneno:'9933FF',Tierra:'ECB546',Roca:'996600',Bicho:'92D050',Fantasma:'8992D3',Siniestro:'808080',Acero:'B2B2B2','Sin Tipo':'CCCCCC','???':'CCCCCC'};
const RANK_BG={Starter:'B5E7E5',Beginner:'92D050',Amateur:'FEF79A',Elite:'FFC000',Master:'FF5050',Legend:'9966FF'};
const SOCIAL_BG={Dureza:'FFE699',Estilo:'F4B183',Dulzura:'FFCCFF',Astucia:'C5E0B4',Belleza:'B4C7E7'};
const CLASE_C={Fisico:['FF0000','FFCCCC'],Especial:['1F3864','DEEBF7'],Estado:['7030A0','CCCCFF']};
const ATTR_BG={FUE:'E53935',VIT:'8E44AD',ENE:'1E88E5',SAB:'43A047',DES:'F2C200',CAR:'EC6FA8'};
const inkOn=hex=>{const n=parseInt(hex,16),r=n>>16&255,g=n>>8&255,b=n&255;return (0.299*r+0.587*g+0.114*b)>150?'#1a1a1a':'#ffffff'};
const badge=(txt,bg,fg)=>txt?`<span class="chip" style="background:#${bg};color:${fg?'#'+fg:inkOn(bg)}">${esc(txt)}</span>`:'';
const chip = t=>t?badge(t,TYPE_BG[t]||'CCCCCC'):'';
const rankChip = (r,label)=>r&&RANK_BG[r]?badge(label||r,RANK_BG[r]):(r?`<span class="pill">${esc(label||r)}</span>`:'');
const claseChip = c=>CLASE_C[c]?badge(c==='Fisico'?'Físico':c,CLASE_C[c][1],CLASE_C[c][0]):esc(c||'');
const socialChip = x=>SOCIAL_BG[x]?badge(x,SOCIAL_BG[x]):esc(x||'');
const attrChip = k=>ATTR_BG[k]?badge(k,ATTR_BG[k]):esc(k||'');
function selColor(el){ const v=el.value, p=el.dataset.f||'';
  let bg=null;
  if(p==='rango'||/^attr\.\w+\.r$/.test(p)||p.startsWith('tal.')) bg=RANK_BG[v];
  else if(p==='nat'){ const n=natMap.get(v); bg=n?SOCIAL_BG[n[1]]:null; }
  else if(p==='estF'||p==='estM'){ const e=estMap.get(v); bg=e?TYPE_BG[e[1]]:null; }
  else if(p==='tipos.0'||p==='tipos.1') bg=TYPE_BG[v];
  if(bg){ el.style.background='#'+bg; el.style.color=inkOn(bg); el.style.webkitTextFillColor=inkOn(bg); } else { el.style.background=''; el.style.color=''; el.style.webkitTextFillColor=''; } }
function colorSelects(){ document.querySelectorAll('#sheet select[data-f]').forEach(selColor); }
const opts = (list,sel,blank)=> (blank!==undefined?`<option value="">${esc(blank)}</option>`:'')+list.map(o=>`<option${o===sel?' selected':''}>${esc(o)}</option>`).join('');
const optsCode = (sel)=>`<option value="">—</option>`+RANGOS.map(r=>`<option value="${r}"${r===sel?' selected':''}>${CODE[r]}</option>`).join('');
const natOpts = sel=>`<option value="">—</option>`+D.nat.map(n=>`<option value="${esc(n[0])}"${n[0]===sel?' selected':''}>${esc(n[0])}  (+${n[2]} −${n[3]})</option>`).join('');
const short = full=>String(full||'').slice(0,3).toUpperCase();
const pick = a=>a[Math.floor(Math.random()*a.length)];
const d = n=>1+Math.floor(Math.random()*n);
const hhmm = ts=>{try{return new Date(ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}catch(e){return ''}};

/* ---------- reglas ---------- */
function attrs(f){
  const o={};
  if(f.tipo==='E'){ for(const k of ATTR){const a=(f.attr||{})[k]||{}; o[k]=rb(a.r)+num(a.b)+rb(f.rango);} return o;}
  const dx=dexById.get(f.especie); if(!dx) return null;
  const nat=natMap.get(f.nat);
  ATTR.forEach((k,i)=>{const a=(f.attr||{})[k]||{};
    const nm = nat? (nat[2]===k?1:nat[3]===k?-1:0):0;
    o[k]=rb(a.r)+num(dx[9+i])+nm+num(a.b)+rb(f.rango);});
  return o;
}
const deacc = x => String(x).normalize('NFD').replace(/[̀-ͯ]/g, '');
function estModsOf(name){ const e=estMap.get(name); if(!e) return null; const t=String(e[3]); const o={attr:{},prec:0,esq:0,tem:0,cdOwn:{},cdRecv:{},cancel:[],noCrit:false}; let m;
  const re=/Reduce -(\d+) (FUE|VIT|ENE|SAB|DES|CAR)/g; while((m=re.exec(t))) o.attr[m[2]]=(o.attr[m[2]]||0)-Number(m[1]);
  if((m=/Reduce -?(\d+)% Precisi/.exec(t))) o.prec=-Number(m[1]);
  if((m=/(\d+)% la Evasi[oó]n F[ií]sica/.exec(t))) o.esq=-Number(m[1])/100;
  if((m=/(\d+)% la Evasi[oó]n Mental/.exec(t))) o.tem=-Number(m[1])/100;
  if((m=/Sus movimientos de tipo (\S+) reducen (\d+) CD/.exec(t))) o.cdOwn[deacc(m[1])]=-Number(m[2]);
  if((m=/Recibe \+(\d+) CD de movimientos de tipo (\S+?)(?: y (\S+?))?\./.exec(t))) [m[2],m[3]].filter(Boolean).forEach(x=>o.cdRecv[deacc(x)]=Number(m[1]));
  if((m=/Tirada de Precisi[oó]n es mayor a (\d+)/.exec(t))) o.cancel.push({est:name,thr:Number(m[1]),kind:/pierde la acci/.test(t)?'pierde':/cambia de objetivo/.test(t)?'self':'causante'});
  if(/^Pierde su siguiente Acci/.test(t)) o.cancel.push({est:name,thr:0,kind:'aturdido'});
  if(/Rango Cr[ií]tico y el Rango Extra a 0/.test(t)) o.noCrit=true;
  return o; }
function estImmune(f,name){ const e=estMap.get(name); return !!(e&&f.tipo==='P'&&tiposDe(f).includes(e[1])); }
function estEffects(f){ const o={attr:{},prec:0,esq:0,tem:0,cdOwn:{},cdRecv:{},cancel:[],noCrit:false,src:{}};
  for(const n of [f.estF,f.estM].filter(Boolean)){ if(estImmune(f,n)) continue; const m=estModsOf(n); if(!m) continue;
    for(const [k,v] of Object.entries(m.attr)){ o.attr[k]=(o.attr[k]||0)+v; (o.src[k] ||= []).push(n); }
    o.prec+=m.prec; o.esq+=m.esq; o.tem+=m.tem; Object.assign(o.cdOwn,m.cdOwn); Object.assign(o.cdRecv,m.cdRecv); o.cancel.push(...m.cancel); o.noCrit=o.noCrit||m.noCrit; }
  return o; }
function tiposDe(f){ if(f.tipo==='E') return (f.tipos||[]).filter(Boolean); const dx=dexById.get(f.especie); return dx?dexTypes(dx):[]; }
function calc(f){
  const A0=attrs(f)||{FUE:0,VIT:0,ENE:0,SAB:0,DES:0,CAR:0};
  const em=estEffects(f); const A={...A0}; for(const [k,v] of Object.entries(em.attr)) A[k]+=v;
  const dx=f.tipo==='P'?dexById.get(f.especie):null;
  let ps;
  if(f.tipo==='E') ps=Math.ceil(0.8*hpBase(f.rango)+1.5*(A0.VIT+A0.CAR));
  else ps=dx?Math.ceil(hpBase(f.rango)+(A0.VIT+A0.CAR)*(D.etapa[dx[5]]??1)):0;
  const base = f.tipo==='E'?25:(dx?num(dx[8])||25:25);
  const vel = clamp(base+num(D.speed[f.velMod||'Normal']),10,60);
  const ev=(c,a,x)=>clamp(1-0.15*num(c)+0.15*Math.floor(a/2)+0.15*num(f.bEv)+x,0.2,1);
  const talB = f.tipo==='E'&&f.iniTal? rb((f.tal||{})[f.iniTal]) : 0;
  return {A, A0, em, ps, act:ps-num(f.dano), vel, talB, ini: vel/5+A.DES+A.SAB+talB,
    esq:ev(f.cEsq,A.DES,em.esq), tem:ev(f.cTem,A.CAR,em.tem), crit:em.noCrit?0:D.crit[clamp(num(f.ic),0,5)], prec:clamp(clamp(75+5*num(f.prec),30,100)+em.prec,0,100), tipos:tiposDe(f)};
}
const dice = idx=>D.dados[clamp(idx,1,24)-1];
function moveInfo(f,id,c){
  const m=atkById.get(id); if(!m) return null;
  const stab = c.tipos.includes(m[2])?1:0;
  const prec = clamp(clamp(75+5*(num(m[6])+num(f.prec)),30,100)+(c.em?c.em.prec:0),0,100);
  const isNum = typeof m[7]==='number' && m[7]>0;
  const ak = short(m[4]);
  const idx = isNum? clamp(m[7]+stab+num(c.em&&c.em.cdOwn[deacc(m[2])]),1,24):0;
  return {m, stab, prec, dice: isNum?dice(idx):'-', idx, atr: isNum? (c.A[ak]??0):null, ak};
}
function effectiveness(mtype, defTypes){
  const row=D.chart[mtype]; if(!row) return {steps:0,immune:false};
  let s=0, imm=false;
  for(const t of defTypes){ const i=D.types.indexOf(t); if(i<0) continue; const v=row[i];
    if(v==='x0') imm=true; else if(typeof v==='number') s+=v; }
  return {steps:s, immune:imm};
}
/* límites de Creación de Personaje */
function checkSheet(f,c){
  const R=ri(f.rango); const out={attr:[],tal:[],mv:[]}; if(R<0) return out;
  const isP=f.tipo==='P';
  let used=0; const over=[];
  ATTR.forEach(k=>{const r=((f.attr||{})[k]||{}).r; used+=rb(r); if(rb(r)>R+1) over.push(k);});
  out.attrUsed=used; out.attrMax=ATTR_PTS[R];
  if(used>ATTR_PTS[R]) out.attr.push(`Usas ${used} puntos y el máximo es ${ATTR_PTS[R]}.`);
  if(over.length) out.attr.push(`${over.join(', ')} supera${over.length>1?'n':''} el techo (${f.rango}).`);
  if(!isP){ let tu=0; const to=[]; ALL_TAL.forEach(t=>{const r=(f.tal||{})[t]; tu+=rb(r); if(rb(r)>R+1) to.push(TAL_LABEL(t));});
    out.talUsed=tu; out.talMax=TAL_PTS[R];
    if(tu>TAL_PTS[R]) out.tal.push(`Usas ${tu} puntos y el máximo es ${TAL_PTS[R]}.`);
    if(to.length) out.tal.push(`${to.join(', ')} supera${to.length>1?'n':''} el techo (${f.rango}).`); }
  const mv=(f.moves||[]).slice(0,6).map(id=>atkById.get(id)).filter(Boolean);
  const ors=mv.filter(m=>ri(m[5])===R+1), bad=mv.filter(m=>ri(m[5])>R+1), free=mv.filter(m=>ri(m[5])<=R);
  out.orN=ors.length; out.freeN=free.length; out.freeMax=R===5?6:FREE_MV[R];
  if(bad.length) out.mv.push(`${bad.map(m=>m[1]).join(', ')}: más de un Rango por encima.`);
  if(R<5 && ors.length>1) out.mv.push(`Solo se permite 1 OverRanked y hay ${ors.length}.`);
  ors.forEach(m=>{ if(!c.tipos.includes(m[2])) out.mv.push(`${m[1]} (OverRanked) no es de ${c.tipos.length?c.tipos.join(' ni '):'su tipo'}.`); });
  if(free.length>out.freeMax) out.mv.push(`Tiene ${free.length} movimientos libres y el máximo es ${out.freeMax}.`);
  return out;
}

/* ---------- estado ---------- */
const S = { db:null, user:null, uid:null, me:null, owner:false, canWrite:false, masters:[], players:{}, fichas:{}, notas:{}, master:{}, bit:{}, tir:{}, vis:new Set(), visJ:{}, evento:false, view:'mis', open:null, cur:null, subs:{}, tool:'dex', folders:{} };
try{ const v=localStorage.getItem('pkrpg.view'); if(v) S.view=v; const t=localStorage.getItem('pkrpg.tool'); if(t) S.tool=t; const fo=JSON.parse(localStorage.getItem('pkrpg.folders')||'{}'); S.folders=fo||{}; }catch(e){}
const isMaster = ()=> S.owner || (!!S.uid && S.masters.includes(S.uid));
const setStatus = t=>{ $('#status').textContent=t; };
function pathOf(r){ return r.src==='master'?`master/${r.id}`: r.src==='bit'?`bitacora/${r.id}` : r.src==='nota'?`jug/${r.uid}/notas/${r.id}` : `jug/${r.uid}/fichas/${r.id}`; }
function bucket(r,create){ if(r.src==='master') return S.master; if(r.src==='bit') return S.bit; const m=r.src==='nota'?S.notas:S.fichas; if(create) m[r.uid] ||= {}; return m[r.uid]||{}; }
const getF = r=>bucket(r)[r.id];
const putF = (r,f)=>{ bucket(r,true)[r.id]=f; };
const delLocal = r=>{ delete bucket(r)[r.id]; };
function canEditRef(r){ if(!S.canWrite||!r) return false; if(r.src==='master'||r.src==='bit') return isMaster(); return r.uid===S.uid || isMaster(); }
const refKey = r=>`${r.src}|${r.uid||''}|${r.id}`;
function refByKey(k){ if(!k) return null; const [src,uid,id]=k.split('|'); const r={src,uid:uid||null,id}; const f=getF(r); return f?{...r,f}:null; }
function visFor(id,uid){ uid=uid===undefined?S.uid:uid; return !!(S.evento || S.vis.has(id) || (uid&&S.visJ[uid]&&S.visJ[uid].has(id))); }
function speciesAllowed(id){ return isMaster() || visFor(id); }
function dexPlayers(){ return Object.keys(S.players).filter(u=>!S.masters.includes(u)&&!(S.owner&&u===S.uid)); }
function visState(id){ if(S.vis.has(id)) return 'all'; return dexPlayers().some(u=>S.visJ[u]&&S.visJ[u].has(id))?'some':'none'; }
function saveVis(){ const jug={}; for(const [u,set] of Object.entries(S.visJ)) if(set.size) jug[u]=[...set]; queueSave('pokedex/visibles',{ids:[...S.vis],jug,evento:!!S.evento},600); buildDexList(); renderSheet(); }

/* ---------- guardado (una escritura a la vez por documento) ---------- */
const pend={}, inflight={}, timers={};
function queueSave(path,data,delay=450){ pend[path]=data; clearTimeout(timers[path]); timers[path]=setTimeout(()=>flush(path),delay); setStatus('Cambios sin guardar'); }
async function flush(path){
  if(inflight[path]){ timers[path]=setTimeout(()=>flush(path),300); return; }
  const data=pend[path]; if(!data) return; delete pend[path];
  inflight[path]=true; setStatus('Guardando…');
  try{ await S.db.doc(path).set(data); setStatus(Object.keys(pend).length?'Guardando…':'Guardado'); }
  catch(e){ onWriteError(e); }
  finally{ inflight[path]=false; }
}
function onWriteError(e){
  console.warn(e); setStatus('No se guardó');
  if(e&&e.code==='invalid_argument'){ showBanner('No se pudo guardar: tu cuenta no tiene permiso para cambiar eso.'); }
  else if(e&&e.code==='quota_exceeded') showBanner('La base de datos llegó a su límite. Borra fichas o notas que ya no uses.');
  else showBanner('No se pudo guardar el último cambio. Revisa tu conexión y vuelve a intentarlo.');
}
function showBanner(t){ const b=$('#banner'); b.textContent=t; b.hidden=!t; }
async function ensurePlayerDoc(){
  if(!S.uid||S.players[S.uid]) return;
  const dd={alias:S.me?.name||'Jugador', creado:new Date().toISOString()};
  S.players[S.uid]=dd;
  try{ await S.db.doc(`jug/${S.uid}`).set(dd);}catch(e){onWriteError(e)}
}

/* ---------- historial de dados (compartido) ---------- */
function logRoll(quien,txt,val){
  const e={ts:Date.now(),quien:String(quien||''),txt:String(txt),val:val??null};
  if(S.uid && S.canWrite && S.db){
    const mine=(S.tir[S.uid]?.log||[]).slice(-49); mine.push(e);
    S.tir[S.uid]={log:mine}; queueSave(`tiradas/${S.uid}`,{log:mine},250);
  } else { (S.tir.__local ||= {log:[]}).log.push(e); }
  if(S.view==='mesa'&&S.open?.src==='hist' || S.view==='tools'&&S.tool==='dados') safeSheet();
}
function allRolls(){
  const out=[]; for(const [u,dd] of Object.entries(S.tir)) for(const e of (dd.log||[])) out.push({...e,uid:u});
  return out.sort((a,b)=>b.ts-a.ts).slice(0,120);
}
function histHTML(limit=120){
  const rs=allRolls().slice(0,limit);
  if(!rs.length) return '<p class="note">Todavía no hay tiradas. Tira un dado desde una ficha (clic en un atributo, un talento o el botón d100 de un movimiento) o desde Herramientas › Dados.</p>';
  return `<div class="hist">${rs.map(r=>`<div class="h"><span class="t">${hhmm(r.ts)}</span><span><b>${esc(r.quien||'—')}</b> <span class="w">${esc(r.uid==='__local'?'(solo tú)':(S.players[r.uid]?.alias||''))}</span></span><span class="v">${r.val??''}</span><span class="d">${esc(r.txt)}${canDelRolls()&&r.uid!=='__local'?` <button class="btn sm" data-act="rmRoll" data-u="${esc(r.uid)}" data-ts="${r.ts}" aria-label="Eliminar tirada">Eliminar</button>`:''}</span></div>`).join('')}</div>`;
}


const canDelRolls = ()=> isMaster() && S.canWrite;
function delRoll(u,ts){ if(!canDelRolls()||!S.tir[u]) return; const log=(S.tir[u].log||[]).filter(e=>e.ts!==ts); S.tir[u]={log}; queueSave(`tiradas/${u}`,{log},200); render(); }
function clearRolls(){ if(!canDelRolls()) return; for(const u of Object.keys(S.tir)){ if(u==='__local') continue; if((S.tir[u].log||[]).length){ S.tir[u]={log:[]}; queueSave(`tiradas/${u}`,{log:[]},200); } } render(); }
function estOpts(list,sel){ return `<option value="">Ninguno</option>`+list.map(n=>{const e=estMap.get(n); const t=e?({Electrico:'Eléctrico',Psiquico:'Psíquico',Dragon:'Dragón'}[e[1]]||e[1]):''; return `<option value="${esc(n)}"${n===sel?' selected':''}>${esc(n)} · ${esc(t)}</option>`;}).join(''); }
function speedOpts(sel){ return SPEEDS.map(s=>`<option value="${esc(s)}"${s===sel?' selected':''}>${esc(s)} ${D.speed[s]>0?'+'+D.speed[s]:D.speed[s]<0?'−'+(-D.speed[s]):'±0'}</option>`).join(''); }
/* mochila */
function trainerOf(f){ if(f.tipo==='E') return {ref:S.open,f}; if(!f.entrenador||!S.open) return null; const r={src:S.open.src,uid:S.open.uid,id:f.entrenador}; const tf=r.id===S.open.id?f:getF(r); return tf?{ref:r,f:tf}:null; }
function eqItemHTML(f){
  const tr=trainerOf(f); if(!tr) return '';
  const holder = f.tipo==='E'?'E':S.open.id;
  const it=(tr.f.mochila||[]).find(x=>x.eq===holder&&x.obj);
  return it? `<b>${esc(it.obj)}</b>${it.efecto?` <span class="note">— ${esc(it.efecto)}</span>`:''}` : '<span class="note">Selecciona en Mochila</span>';
}
function mochilaTotals(f){ const c=calc(f); let peso=0,valor=0; (f.mochila||[]).forEach(it=>{ peso+=num(it.peso)*num(it.cant); valor+=num(it.precio)*num(it.cant); }); return {peso:Math.round(peso*100)/100,valor,cap:Math.max(0,c.A.FUE)*5}; }
function mochilaHTML(f){
  const items=f.mochila||[]; const team=teamOf(S.open).filter(p=>p.f.lugar!=='caja');
  const holders=[['E',(f.nombre||'Entrenador')+' (Entrenador)'],...team.map(p=>[p.id,charName(p.f)])];
  const dis=S.ro?'disabled':'';
  let h=`<div class="card"><h2>Mochila <span class="pill" data-c="mochTot"></span></h2><div class="tw"><table class="moch"><thead><tr><th>Objeto</th><th>Equipado</th><th>Cant.</th><th>Peso (kg)</th><th>Precio</th><th>Efecto</th>${S.ro?'':'<th></th>'}</tr></thead><tbody>`;
  items.forEach((it,i)=>{ h+=`<tr><td style="min-width:140px"><input data-f="mochila.${i}.obj" value="${esc(it.obj)}" ${dis} aria-label="Objeto"></td>
    <td style="min-width:130px"><select data-f="mochila.${i}.eq" ${dis} aria-label="Equipado por"><option value="">—</option>${holders.map(([id,n])=>`<option value="${esc(id)}"${it.eq===id?' selected':''}>${esc(n)}</option>`).join('')}</select></td>
    <td style="width:70px"><input type="number" min="0" data-f="mochila.${i}.cant" value="${num(it.cant)}" ${dis} aria-label="Cantidad"></td>
    <td style="width:80px"><input type="number" min="0" step="0.1" data-f="mochila.${i}.peso" value="${num(it.peso)}" ${dis} aria-label="Peso en kg"></td>
    <td style="width:90px"><input type="number" min="0" data-f="mochila.${i}.precio" value="${num(it.precio)}" ${dis} aria-label="Precio unitario"></td>
    <td style="min-width:200px"><input data-f="mochila.${i}.efecto" value="${esc(it.efecto)}" ${dis} aria-label="Efecto"></td>
    ${S.ro?'':`<td><button class="btn sm" data-act="rmItem" data-i="${i}" aria-label="Quitar objeto">✕</button></td>`}</tr>`; });
  if(!items.length) h+=`<tr><td colspan="7" class="note">La mochila está vacía.</td></tr>`;
  h+=`</tbody></table></div>${S.ro?'':'<div class="row" style="margin-top:8px"><button class="btn" data-act="addItem">+ Objeto</button></div>'}<p class="note">Cada punto de Fuerza del Entrenador carga 5 kg. Cada personaje (Entrenador y cada Pokémon del equipo) puede tener 1 objeto equipado; el objeto equipado aparece en su ficha.</p></div>`;
  return h;
}
function fillMochila(){ const f=S.cur; if(!f||f.tipo!=='E') return; const t=mochilaTotals(f); const el=document.querySelector('[data-c="mochTot"]'); if(el){ el.textContent=`Peso ${t.peso}/${t.cap} kg · Valor $${t.valor}`; el.classList.toggle('ko',t.peso>t.cap); } }

/* ---------- plantillas ---------- */
function blankAttr(){ const o={}; ATTR.forEach(k=>o[k]={r:'',b:0}); return o; }
function newTrainer(extra={}){ const tal={}; ALL_TAL.forEach(t=>tal[t]=''); return Object.assign({tipo:'E',genero:'M',nombre:'Nuevo entrenador',rango:'Starter',attr:blankAttr(),tal,tipos:['',''],habilidad:'',estF:'',estM:'',profesion:'',edad:'',dinero:0,exp:0,pd:3,dano:0,velMod:'Normal',iniTal:'',cEsq:0,cTem:0,bEv:0,ic:0,prec:0,moves:['','','','','',''],notas:'',img:'',creado:new Date().toISOString()},extra); }
function newPokemon(extra={}){ return Object.assign({tipo:'P',genero:'M',nombre:'',especie:'',rango:'Starter',nat:'',attr:blankAttr(),habilidad:'',estF:'',estM:'',dano:0,velMod:'Normal',cEsq:0,cTem:0,bEv:0,ic:0,prec:0,moves:['','','','','',''],entrenador:'',lugar:'',objeto:'',notas:'',img:'',creado:new Date().toISOString()},extra); }

async function createDoc(src,f){
  if(!S.canWrite) return;
  const id=newId(); const r={src,uid:(src==='jug'||src==='nota')?S.uid:null,id};
  if(src==='jug'||src==='nota') await ensurePlayerDoc();
  putF(r,f); openRef(r);
  try{ await S.db.doc(pathOf(r)).set(f); setStatus('Guardado'); }catch(e){ onWriteError(e); }
}
async function deleteRef(r){
  if(!getF(r)) return;
  const kids = (r.src==='jug'||r.src==='master')? teamOf(r):[];
  delLocal(r); S.open=null; S.cur=null; render();
  try{
    await S.db.doc(pathOf(r)).delete();
    for(const k of kids){ const kf=structuredClone(getF(k)); if(!kf) continue; kf.entrenador=''; kf.lugar=''; putF(k,kf); await S.db.doc(pathOf(k)).set(kf); }
    setStatus('Borrado');
  }catch(e){ onWriteError(e); }
}
function poolOf(src,uid){ return src==='master'? Object.entries(S.master).map(([id,f])=>({src,uid:null,id,f})) : Object.entries(S.fichas[uid]||{}).map(([id,f])=>({src:'jug',uid,id,f})); }
function teamOf(r){
  return poolOf(r.src,r.uid).filter(x=>x.f.tipo==='P'&&x.f.entrenador===r.id).sort((a,b)=>(a.f.lugar==='caja')-(b.f.lugar==='caja')||(a.f.creado||'').localeCompare(b.f.creado||''));
}

/* ---------- listas ---------- */
function itemHTML(x,sub){
  const f=x.f, c=calc(f), dx=f.tipo==='P'?dexById.get(f.especie):null;
  const r=c.ps?clamp(c.act/c.ps,0,1):0;
  const nm = f.tipo==='P'?(f.nombre||(dx?dx[1]:'Pokémon sin especie')):(f.nombre||'Entrenador');
  const sub2 = f.tipo==='P'? `${dx?dexLabel(dx):'—'} · ${f.rango||''}${f.lugar==='caja'?' · caja':''}` : `Entrenador · ${f.rango||''}`;
  const cur = S.open&&S.open.id===x.id;
  const btn=`<button class="item${sub?' sub':''}" data-open="${esc(refKey(x))}" aria-current="${cur}"><span class="n">${inCombat(refKey(x))?'🥊 ':''}${esc(nm)}</span><span class="pill">${c.act}/${c.ps}</span><span class="s">${esc(sub2)}</span><span class="hp"><i class="${r<.25?'low':r<.5?'mid':''}" style="width:${r*100}%"></i></span></button>`;
  if(canGlove(x)&&(S.view==='mesa'||S.view==='master'||S.view==='mis')) return `<div class="irow${sub?' sub':''}">${btn.replace('class="item sub"','class="item"')}${gloveBtn(refKey(x))}</div>`;
  return btn;
}
function noteItem(x){ const cur=S.open&&S.open.id===x.id; return `<button class="item note-i" data-open="${esc(refKey(x))}" aria-current="${cur}"><span class="n">${esc(x.f.titulo||'Sin título')}</span><span class="pill">${esc(x.f.fecha||'')}</span><span class="s">${esc((x.f.texto||'').slice(0,80))}</span></button>`; }
/* orden propio de cada jugador (en este navegador) y equipos desplegables */
const ordKey=scope=>'pkrpg.ord.'+(S.uid||'')+'.'+scope;
function loadOrder(scope){ try{ return JSON.parse(localStorage.getItem(ordKey(scope))||'[]')||[]; }catch(_){ return []; } }
function saveOrder(scope,ids){ try{ localStorage.setItem(ordKey(scope),JSON.stringify(ids)); }catch(_){} }
const TEAM_OPEN=new Set((()=>{ try{ return JSON.parse(localStorage.getItem('pkrpg.teams')||'[]')||[]; }catch(_){ return []; } })());
function toggleTeam(k){ TEAM_OPEN.has(k)?TEAM_OPEN.delete(k):TEAM_OPEN.add(k); try{ localStorage.setItem('pkrpg.teams',JSON.stringify([...TEAM_OPEN])); }catch(_){} renderList(); }
function groupHTML(pool,scope='mis'){
  const o=loadOrder(scope); const pos=id=>{ const i=o.indexOf(id); return i<0?1e9:i; };
  const trainers=pool.filter(x=>x.f.tipo==='E').sort((a,b)=>pos(a.id)-pos(b.id)||(a.f.creado||'').localeCompare(b.f.creado||''));
  const ids=new Set(trainers.map(t=>t.id));
  let h='';
  for(const t of trainers){ const team=teamOf(t); const k=refKey(t); const open=TEAM_OPEN.has(k);
    h+=`<div class="tgrp" data-drag="${esc(t.id)}"><div class="trow"><span class="grip" data-grip title="Arrastra para ordenar" aria-label="Arrastrar ${esc(charName(t.f))}">⋮⋮</span><button class="tog" data-team="${esc(k)}" aria-expanded="${open}" title="${open?'Ocultar':'Mostrar'} equipo" aria-label="${open?'Ocultar':'Mostrar'} el equipo de ${esc(charName(t.f))}" ${team.length?'':'disabled'}>${open?'▾':'▸'}<small>${team.length}</small></button>${itemHTML(t)}</div>${open&&team.length?`<div class="team">${team.map(p=>itemHTML(p,true)).join('')}</div>`:''}</div>`; }
  const loose=pool.filter(x=>x.f.tipo==='P'&&!ids.has(x.f.entrenador));
  return {h: h?`<div class="tlist" data-scope="${esc(scope)}">${h}</div>`:'', loose:loose.map(p=>itemHTML(p)).join('')};
}
/* arrastrar para ordenar (mouse y pantalla táctil) */
let DRAG=null;
document.addEventListener('pointerdown',e=>{ const g=e.target.closest('[data-grip]'); if(!g) return; const el=g.closest('.tgrp'), box=g.closest('.tlist'); if(!el||!box) return;
  e.preventDefault(); DRAG={el,box,id:e.pointerId}; el.classList.add('dragging'); try{ g.setPointerCapture(e.pointerId); }catch(_){} });
document.addEventListener('pointermove',e=>{ if(!DRAG||e.pointerId!==DRAG.id) return; e.preventDefault();
  const sibs=[...DRAG.box.children].filter(x=>x!==DRAG.el&&x.classList.contains('tgrp'));
  const after=sibs.find(x=>{ const r=x.getBoundingClientRect(); return e.clientY<r.top+r.height/2; });
  if(after) DRAG.box.insertBefore(DRAG.el,after); else DRAG.box.appendChild(DRAG.el); });
function endDrag(e){ if(!DRAG||e.pointerId!==DRAG.id) return; const {el,box}=DRAG; DRAG=null; el.classList.remove('dragging');
  saveOrder(box.dataset.scope,[...box.querySelectorAll(':scope > .tgrp')].map(x=>x.dataset.drag)); renderList(); }
document.addEventListener('pointerup',endDrag); document.addEventListener('pointercancel',endDrag);
function folderHTML(pool,addAct){
  const groups={}; pool.forEach(x=>{ if(x.f.tipo==='P'&&x.f.entrenador&&pool.some(t=>t.id===x.f.entrenador)) return; const k=x.f.carpeta||''; (groups[k] ||= []).push(x); });
  const names=Object.keys(groups).sort((a,b)=>(a==='')-(b==='')||a.localeCompare(b));
  if(!names.length) return '';
  return names.map(n=>{ const sel=groups[n]; const all=pool.filter(x=>sel.includes(x)||sel.some(t=>t.id===x.f.entrenador));
    const key=addAct+'|'+n; const g=groupHTML(all,'m.'+key); const open=S.folders[key]!==false;
    return `<details class="fold" data-fold="${esc(key)}" ${open?'open':''}><summary><span>${esc(n||'Sin carpeta')} <span class="pill">${sel.length}</span></span>${S.canWrite?`<button class="btn sm" data-act="${addAct}" data-folder="${esc(n)}">+</button>`:''}</summary><div class="items">${g.h+g.loose}</div></details>`; }).join('');
}
function renderList(){
  const L=$('#list'); let h='';
  if(S.view==='mis'){
    const g=groupHTML(poolOf('jug',S.uid),'mis');
    const alias = (S.players[S.uid]||{}).alias || S.me?.name || '';
    const notas=Object.entries(S.notas[S.uid]||{}).map(([id,f])=>({src:'nota',uid:S.uid,id,f})).sort((a,b)=>(b.f.creado||'').localeCompare(a.f.creado||''));
    h+=`<div class="grp"><h3>Tu nombre en la mesa</h3><input id="alias" class="btn" style="width:100%;text-align:left" value="${esc(alias)}" ${S.canWrite?'':'disabled'} aria-label="Tu nombre en la mesa"></div>`;
    h+=`<div class="grp"><h3>Entrenadores ${S.canWrite?'<button class="btn sm" data-act="newE">+ Entrenador</button>':''}</h3><div class="items">${g.h||'<p class="note">Aún no tienes entrenadores.</p>'}</div></div>`;
    h+=`<div class="grp"><h3>Pokémon sueltos ${S.canWrite?'<button class="btn sm" data-act="newP">+ Pokémon</button>':''}</h3><div class="items">${g.loose||'<p class="note">Pokémon sin entrenador, para probar o guardar.</p>'}</div></div>`;
    h+=`<div class="grp"><h3>Mis notas ${S.canWrite?'<button class="btn sm" data-act="newNota">+ Nota</button>':''}</h3><div class="items">${notas.map(noteItem).join('')||'<p class="note">Notas de tu personaje. Las ve toda la mesa.</p>'}</div></div>`;
  } else if(S.view==='mesa'){
    h+=`<div class="grp"><h3>Mesa</h3><div class="items"><button class="item" data-hist="1" aria-current="${S.open?.src==='hist'}"><span class="n">Historial de dados</span><span class="pill">${allRolls().length}</span></button></div></div>`;
    const uids=Object.keys(S.players).sort((a,b)=>(a===S.uid)-(b===S.uid)||String(S.players[a].alias).localeCompare(String(S.players[b].alias)));
    for(const u of uids){ const g=groupHTML(poolOf('jug',u),'mesa.'+u); const notas=Object.entries(S.notas[u]||{}).map(([id,f])=>({src:'nota',uid:u,id,f}));
      h+=`<div class="grp"><h3>${esc(S.players[u].alias||'Jugador')}${u===S.uid?' (tú)':''}${S.masters.includes(u)?' · Master':''}</h3><div class="items">${(g.h+g.loose+notas.map(noteItem).join(''))||'<p class="note">Sin fichas.</p>'}</div></div>`; }
  } else if(S.view==='master'){
    const pool=Object.entries(S.master).map(([id,f])=>({src:'master',uid:null,id,f}));
    const npcs=pool.filter(x=>x.f.cat!=='salvaje'); const wild=pool.filter(x=>x.f.cat==='salvaje');
    const bits=Object.entries(S.bit).map(([id,f])=>({src:'bit',uid:null,id,f})).sort((a,b)=>(b.f.fecha||'').localeCompare(a.f.fecha||'')||(b.f.creado||'').localeCompare(a.f.creado||''));
    h+=`<div class="grp"><h3>Bitácora y notas ${S.canWrite?'<button class="btn sm" data-act="newBit">+ Entrada</button>':''}</h3><div class="items">${bits.map(noteItem).join('')||'<p class="note">Resúmenes de sesión y notas privadas del Master.</p>'}</div></div>`;
    h+=`<div class="grp"><h3>NPC ${S.canWrite?'<button class="btn sm" data-act="newNpc" data-folder="">+ NPC</button>':''}</h3>
      ${S.canWrite?`<div class="row" style="margin-bottom:6px"><input id="newFolder" class="btn" style="flex:1;min-width:0;text-align:left" placeholder="Nueva carpeta (p. ej. Gimnasio Plateada)" aria-label="Nombre de la carpeta"><button class="btn sm" data-act="newFolderNpc">Crear</button></div>`:''}
      ${folderHTML(npcs,'newNpc')||'<p class="note">Entrenadores y Pokémon de NPC, ordenados por carpeta.</p>'}</div>`;
    h+=`<div class="grp"><h3>Salvajes ${S.canWrite?'<button class="btn sm" data-act="newWild" data-folder="">+ Salvaje</button>':''}</h3>${folderHTML(wild,'newWild')||'<p class="note">Pokémon salvajes para los encuentros. También admiten carpetas (p. ej. Ruta 1).</p>'}</div>`;
    if(S.owner){
      const others=Object.keys(S.players).filter(u=>u!==S.uid&&!S.masters.includes(u));
      h+=`<div class="grp"><h3>Masters</h3><div class="items">${S.masters.map(u=>`<div class="row"><span>${esc((S.players[u]||{}).alias||'Jugador')}</span><button class="btn sm" data-rmmaster="${esc(u)}">Quitar</button></div>`).join('')||'<p class="note">Solo tú.</p>'}
      ${others.length?`<div class="row"><select id="addMasterSel" class="btn">${others.map(u=>`<option value="${esc(u)}">${esc(S.players[u].alias||'Jugador')}</option>`).join('')}</select><button class="btn sm" data-act="addMaster">Hacer Master</button></div>`:''}</div></div>`;
    }
  } else if(S.view==='combate'){
    const ord=cbOrder();
    h+=`<div class="grp"><h3>Combatientes</h3><div class="items">${ord.map(({x})=>x.src==='master'&&!isMaster()?`<div class="item"><span class="n">${esc(charName(x.f))}</span><span class="pill">${calc(x.f).act}/${calc(x.f).ps}</span><span class="s">Master</span></div>`:itemHTML(x)).join('')||'<p class="note">Sin combatientes.</p>'}</div></div>`;
  } else if(S.view==='glos'){
    h+=`<div class="grp"><h3>Glosario</h3><div class="items">${GLOS.map(g=>`<button class="item" data-glos="${g.id}" aria-current="${GLOS_OPEN===g.id}"><span class="n">${g.t}</span></button>`).join('')}</div></div>`;
  } else {
    const tools=[['dex','Pokédex'],['gen','Generador de Pokémon'],['mov','Movimientos'],['dados','Dados']];
    h+=`<div class="grp"><h3>Herramientas</h3><div class="items">${tools.map(([k,n])=>`<button class="item" data-tool="${k}" aria-current="${S.tool===k}"><span class="n">${n}</span></button>`).join('')}</div></div>`;
  }
  L.innerHTML=h;
}

/* ---------- hoja ---------- */
function openRef(r){ S.open=r; const f=getF(r); S.cur=f?structuredClone(f):null; render(); window.scrollTo({top:0}); }
function field(lbl,path,val,kind,extra=''){
  const dis=S.ro?'disabled':'';
  if(kind==='sel') return `<label class="f">${lbl}<select data-f="${path}" ${dis}>${val}</select></label>`;
  if(kind==='area') return `<label class="f">${lbl}<textarea data-f="${path}" rows="${extra||3}" ${dis}>${esc(val)}</textarea></label>`;
  return `<label class="f">${lbl}<input data-f="${path}" ${kind==='num'?'type="number"':kind==='date'?'type="date"':''} value="${esc(val)}" ${extra} ${dis}></label>`;
}
function renderSheet(){
  const el=$('#sheet');
  if(S.view==='tools'){ el.innerHTML=renderTool(); bindTool(); return; }
  if(S.view==='glos'){ el.innerHTML=glosHTML(); return; }
  if(S.view==='combate'){ el.innerHTML=combatHTML(); return; }
  if(S.view==='mesa' && (!S.open || S.open.src==='hist')){ el.innerHTML=`<div class="card"><h2>Historial de dados <span class="row"><span class="note" style="text-transform:none;letter-spacing:0">Tiradas de toda la mesa, la más nueva arriba</span>${canDelRolls()&&allRolls().length?'<button class="btn sm danger" data-act="clearRolls">Vaciar historial</button><span id="clrConfirm"></span>':''}</span></h2>${histHTML()}</div>`; return; }
  const f=S.cur;
  if(!f){ el.innerHTML=emptyHTML(); return; }
  S.ro=!canEditRef(S.open);
  if(S.open.src==='nota'||S.open.src==='bit'){ el.innerHTML=noteHTML(f); return; }
  const isP=f.tipo==='P'; const dx=isP?dexById.get(f.especie):null;
  let h='';
  const kind = isP?(S.open.src==='master'?(f.cat==='salvaje'?'Pokémon salvaje':'Pokémon de NPC'):'Pokémon'):(S.open.src==='master'?'Entrenador NPC':'Entrenador');
  const img = f.img?`<img src="${esc(f.img)}" alt="Imagen de ${esc(f.nombre||'la ficha')}">`:`<span>${S.ro?'Sin imagen':'Agrega una imagen'}</span>`;
  h+=`<div class="card"><div class="head"><div><div class="portrait">${img}${S.ro?'':`<label for="imgIn">${f.img?'Cambiar':'Subir'} imagen</label><input type="file" id="imgIn" accept="image/*">`}</div>${S.ro?'':'<button class="btn sm restore" data-act="restore" title="Daño 0, intentos 0, IC, bonos y estados a 0, repeticiones reiniciadas">Restaurar Todo</button><span id="restoreConfirm"></span>'}${isP?'':`<div class="pdest">P. Destino<b>${num(f.pd)}/3</b>Quedan <input type="number" min="0" max="3" data-f="pd" value="${num(f.pd)}" ${S.ro?'disabled':''} aria-label="Puntos de Destino"></div>`}</div><div style="min-width:0">
    <div class="kind">${kind}${S.ro?' · solo lectura':''}</div><div class="headline">
    <span class="namewrap">${genderBtn(f)}<input class="name" data-f="nombre" value="${esc(f.nombre)}" placeholder="${isP?(dx?esc(dx[1]):'Apodo'):'Nombre'}" aria-label="Nombre" ${S.ro?'disabled':''}></span>
    <span data-c="tipos"></span>${f.img&&!S.ro?'<button class="btn sm" data-act="rmImg">Quitar imagen</button>':''}</div>
    <div class="grid ${isP?'g3':'g4'}" style="margin-top:12px">`;
  if(isP){
    h+=`<label class="f">Especie<input data-f="especieL" list="dl-dex" value="${esc(dx?dexLabel(dx):'')}" placeholder="Escribe la especie" ${S.ro?'disabled':''}></label>`;
    h+=field('Rango','rango',opts(RANGOS,f.rango),'sel');
    h+=field('Naturaleza','nat',natOpts(f.nat),'sel');
    const pool = poolOf(S.open.src,S.open.uid).filter(x=>x.f.tipo==='E');
    const own=pool.map(x=>`<option value="${x.id}"${f.entrenador===x.id?' selected':''}>${esc(x.f.nombre||'Entrenador')}</option>`).join('');
    let trOpts=`<option value="">${S.open.src==='master'?'Sin entrenador':'Sin entrenador (suelto)'}</option>`;
    if(S.open.src==='master'&&isMaster()){
      trOpts+=`<optgroup label="NPC">${own}</optgroup>`;
      Object.keys(S.players).forEach(u=>{ const ts=poolOf('jug',u).filter(x=>x.f.tipo==='E'); if(ts.length) trOpts+=`<optgroup label="Capturar para ${esc(S.players[u].alias||'Jugador')}">${ts.map(x=>`<option value="jug|${esc(u)}|${x.id}">${esc(x.f.nombre||'Entrenador')} (${esc(S.players[u].alias||'Jugador')})</option>`).join('')}</optgroup>`; });
    } else trOpts+=own;
    h+=field('Entrenador','entrenador',trOpts,'sel');
    if(f.entrenador) h+=field('Lugar','lugar',`<option value="">Equipo</option><option value="caja"${f.lugar==='caja'?' selected':''}>Caja</option>`,'sel');
    if(S.open.src==='master'){ h+=field('Categoría','cat',`<option value="npc">De NPC</option><option value="salvaje"${f.cat==='salvaje'?' selected':''}>Salvaje</option>`,'sel'); if(!f.entrenador) h+=`<label class="f">Carpeta<input data-f="carpeta" list="dl-fold" value="${esc(f.carpeta||'')}" ${S.ro?'disabled':''}></label>`; }
    h+= f.entrenador? `<label class="f">Objeto<span class="fx-box" style="margin:0;text-transform:none;letter-spacing:0;font-size:13px;color:var(--ink)" data-c="eqItem"></span></label>` : field('Objeto','objeto',f.objeto||'','txt');
  } else {
    h+=field('Rango','rango',opts(RANGOS,f.rango),'sel');
    h+=field('Tipo primario','tipos.0',opts(D.types,f.tipos?.[0],'—'),'sel');
    h+=field('Tipo secundario','tipos.1',opts(D.types,f.tipos?.[1],'—'),'sel');
    h+=`<label class="f">Objeto<span class="fx-box" style="margin:0;text-transform:none;letter-spacing:0;font-size:13px;color:var(--ink)" data-c="eqItem"></span></label>`;
    h+=field('Profesión','profesion',f.profesion||'','txt');
    h+=field('Edad','edad',f.edad||'','txt');
    h+=field('Dinero','dinero',f.dinero||0,'num');
    h+=field('Experiencia','exp',f.exp||0,'num');
    if(S.open.src==='master') h+=`<label class="f">Carpeta<input data-f="carpeta" list="dl-fold" value="${esc(f.carpeta||'')}" ${S.ro?'disabled':''}></label>`;
  }
  h+=`</div><div class="note" data-c="sub" style="margin-top:8px"></div></div></div></div>`;
  // combate
  h+=`<div class="card"><h2>Combate</h2><div class="cstats">
    <div class="stat" style="grid-area:ps"><div class="k">PS</div><div class="v" data-c="ps"></div><div class="psbar"><i data-c="psbar"></i></div><div class="x">Daño <input type="text" inputmode="text" data-f="dano" value="${num(f.dano)}" ${S.ro?'disabled':''} aria-label="Daño recibido (admite +15 o −5)" title="Escribe un número, o +15 / −5 para sumar o restar" style="width:72px"></div></div>
    <div class="stat" style="grid-area:ini"><div class="k">Iniciativa</div><div class="v" data-c="ini"></div>${isP?'<div class="x">Vel ÷ 5 + DES + SAB</div>':`<div class="x"><select data-f="iniTal" ${S.ro?'disabled':''} aria-label="Talento para la Iniciativa"><option value="">Sin talento</option>${ALL_TAL.map(t=>`<option value="${t}"${f.iniTal===t?' selected':''}>+ ${TAL_LABEL(t)}</option>`).join('')}</select></div>`}</div>
    <div class="stat" style="grid-area:vel"><div class="k">Velocidad</div><div class="v" data-c="vel"></div><div class="x"><select data-f="velMod" ${S.ro?'disabled':''} aria-label="Modificador de Velocidad">${speedOpts(f.velMod||'Normal')}</select></div><div class="x" data-c="velx"></div></div>
    <div class="stat evs" style="grid-area:esq"><div style="min-width:0"><div class="k">Esquiva</div><div class="v" data-c="esq"></div><div class="x">Intentos <input type="number" min="0" data-f="cEsq" value="${num(f.cEsq)}" ${S.ro?'disabled':''} aria-label="Intentos de Esquiva"></div></div>${S.ro?'':`<button class="d20btn" data-act="evade" data-k="esq" title="Tirar Esquiva" aria-label="Tirar Esquiva">${D20_SVG}</button>`}</div>
    <div class="stat evs" style="grid-area:tem"><div style="min-width:0"><div class="k">Temple</div><div class="v" data-c="tem"></div><div class="x">Intentos <input type="number" min="0" data-f="cTem" value="${num(f.cTem)}" ${S.ro?'disabled':''} aria-label="Intentos de Temple"></div></div>${S.ro?'':`<button class="d20btn" data-act="evade" data-k="tem" title="Tirar Temple" aria-label="Tirar Temple">${D20_SVG}</button>`}</div>
    <div class="stat" style="grid-area:bev"><div class="k">Bono de Evasión</div><div class="v" data-c="bEv"></div><div class="x">−3 a +3 <input type="number" min="-3" max="3" data-f="bEv" value="${num(f.bEv)}" ${S.ro?'disabled':''} aria-label="Bono de Evasión"></div></div>
    <div class="stat" style="grid-area:ic"><div class="k">Índice Crítico</div><div class="v" data-c="crit"></div><div class="x">IC <input type="number" min="0" max="5" data-f="ic" value="${num(f.ic)}" ${S.ro?'disabled':''} aria-label="Índice de Crítico"></div></div>
    <div class="stat" style="grid-area:pre"><div class="k">Precisión base</div><div class="v" data-c="prec"></div><div class="x">Mod <input type="number" data-f="prec" value="${num(f.prec)}" ${S.ro?'disabled':''} aria-label="Modificador de Precisión"></div></div>
    </div>
    <div class="grid g2" style="margin-top:10px">
      ${field('Estado físico','estF',estOpts(EST_F,f.estF),'sel')}
      ${field('Estado mental','estM',estOpts(EST_M,f.estM),'sel')}
    </div><div data-c="estfx"></div></div>`;
  let habOpts;
  if(isP && dx){ habOpts=[...new Set([dx[15],dx[16],dx[17]].filter(x=>x&&x!=='-'))]; }
  h+=`<div class="card"><h2>Habilidad</h2><div class="grid g2">`;
  if(habOpts) h+=field('De su especie','habilidad',opts(habOpts.includes(f.habilidad)||!f.habilidad?habOpts:[...habOpts,f.habilidad],f.habilidad,'—'),'sel');
  else h+=`<label class="f">Habilidad<input data-f="habilidad" list="dl-hab" value="${esc(f.habilidad||'')}" placeholder="Escribe una habilidad" ${S.ro?'disabled':''}></label>`;
  h+=`</div><div class="fx-box" data-c="habfx"></div></div>`;
  // atributos
  h+=`<div class="card"><h2>Atributos <span class="pill" data-c="attrPts"></span></h2><div class="tw"><table class="attrt"><thead><tr><th>Atributo</th>${isP?'<th>Especie</th><th>Nat.</th>':''}<th class="wide">Entrenado</th><th>Bonus</th><th>Rango</th><th>Total</th><th>Tirar</th></tr></thead><tbody>`;
  ATTR.forEach(k=>{ const a=(f.attr||{})[k]||{};
    h+=`<tr><td class="attr-name"><span class="attrdot" style="background:#${ATTR_BG[k]}"></span>${ATTR_FULL[k]}</td>${isP?`<td class="num" data-c="sp${k}"></td><td class="num" data-c="nt${k}"></td>`:''}
      <td><select data-f="attr.${k}.r" ${S.ro?'disabled':''} aria-label="Rango de ${ATTR_FULL[k]}">${opts(RANGOS,a.r,'—')}</select></td>
      <td><input type="number" data-f="attr.${k}.b" value="${num(a.b)}" ${S.ro?'disabled':''} aria-label="Bonus de ${ATTR_FULL[k]}"></td>
      <td class="num" data-c="rk${k}"></td><td class="tot" data-c="at${k}"></td><td><button class="d20btn" data-rollattr="${k}" title="Tirar 1d20 + ${ATTR_FULL[k]}" aria-label="Tirar 1d20 + ${ATTR_FULL[k]}">${D20_SVG}</button></td></tr>`; });
  h+=`</tbody></table></div><div class="check" data-c="attrChk"></div><p class="note">${isP?'Total = entrenamiento + especie + naturaleza + bonus + rango del Pokémon.':'Total = rango del atributo + bonus + rango del Entrenador.'} Cada nivel entrenado cuesta 1 punto y ninguno supera el Rango del personaje.</p></div>`;
  if(!isP){
    h+=`<div class="card"><h2>Talentos <span class="pill" data-c="talPts"></span></h2><div class="tal">`;
    for(const [cat,col,list] of TALENTOS){ h+=`<div><div class="cat" style="color:${col}">${cat}</div>`;
      for(const t of list){ const r=(f.tal||{})[t]||''; h+=`<div class="t"><button class="linkbtn" data-rolltal="${t}">${TAL_LABEL(t)}</button><select data-f="tal.${t}" ${S.ro?'disabled':''} aria-label="Rango de ${TAL_LABEL(t)}">${optsCode(r)}</select><b>${rb(r)}</b></div>`; }
      h+=`</div>`; }
    h+=`</div><div class="check" data-c="talChk"></div><p class="note">Clic en un talento para tirar 1d20 + talento + el atributo que elijas.</p></div>`;
  }
  h+=`<div class="card"><h2>Movimientos <span class="pill" data-c="mvPts"></span></h2><div class="moves">`;
  const nMv=Math.max(6,(f.moves||[]).length);
  const mvCard=i=>{ const m=atkById.get((f.moves||[])[i]); return `<div class="mv"><div class="top"><input data-f="moves.${i}" list="dl-atk" value="${esc(m?m[1]:'')}" placeholder="Movimiento ${i+1}" ${S.ro?'disabled':''} aria-label="Movimiento ${i+1}">${m?`<button class="btn sm" data-rollmv="${i}" title="Tirar Precisión">d100</button>`:''}${i>=6&&!S.ro?`<button class="btn sm" data-act="rmMove" data-i="${i}" aria-label="Quitar movimiento ${i+1}">✕</button>`:''}</div><div class="meta" data-c="mv${i}"></div><div class="fx" data-c="mvfx${i}"></div></div>`; };
  for(let i=0;i<6;i++) h+=mvCard(i);
  h+=`</div>`;
  if(nMv>6||!S.ro){ h+=`<h3 class="subh">Movimientos adicionales</h3><div class="moves">`; for(let i=6;i<nMv;i++) h+=mvCard(i); h+=`</div>${S.ro?'':'<div class="row" style="margin-top:8px"><button class="btn sm" data-act="addMove">+ Movimiento</button><span class="note">Los adicionales no cuentan para los límites de creación.</span></div>'}`; }
  h+=`<div class="check" data-c="mvChk"></div><p class="note">Precisión = 75 % + 5 % × (precisión del movimiento + modificador). Daño = dado de (Base + STAB) + atributo. Máximo 6: 1 OverRanked (un Rango más, de su tipo) + los libres de su Rango.</p></div>`;
  if(!isP){
    const team=teamOf(S.open);
    h+=`<div class="card"><h2>Equipo y caja</h2><div class="items">${team.map(p=>itemHTML(p)).join('')||'<p class="note">Sin Pokémon todavía.</p>'}</div>
      ${S.ro?'':`<div class="row" style="margin-top:8px"><button class="btn" data-act="addTeam">+ Pokémon al equipo</button><span class="note">${team.filter(p=>p.f.lugar!=='caja').length}/6 en el equipo</span></div>`}</div>`;
  }
  if(!isP) h+=mochilaHTML(f);
  h+=`<div class="card"><h2>Notas</h2>${field('','notas',f.notas||'','area')}</div>`;
  if(!S.ro) h+=`<div class="row">${isP&&S.open.src==='jug'?'<button class="btn" data-act="free">Liberar</button><span id="freeConfirm"></span>':''}<button class="btn danger" data-act="del">Borrar ficha</button><span id="delConfirm"></span></div>`;
  el.innerHTML=h; fillComputed(); fillMochila(); colorSelects();
  const im=$('#imgIn'); if(im) im.addEventListener('change',onImage);
}
function noteHTML(f){
  const isBit=S.open.src==='bit';
  return `<div class="card"><div class="kind">${isBit?'Bitácora del Master':'Nota de '+esc(S.players[S.open.uid]?.alias||'jugador')}${S.ro?' · solo lectura':''}</div>
    <div class="headline"><input class="name" data-f="titulo" value="${esc(f.titulo||'')}" placeholder="Título" aria-label="Título" ${S.ro?'disabled':''}></div>
    <div class="grid g3" style="margin-top:12px">${field('Fecha','fecha',f.fecha||'','date')}${isBit?field('Tipo','clase',opts(['Sesión','Nota','Trama','Lugar','Personaje'],f.clase||'Sesión'),'sel'):''}</div>
    <div style="margin-top:10px">${field('Texto','texto',f.texto||'','area',16)}</div>
    <p class="note">${isBit?'Solo los Master ven la bitácora.':'Toda la mesa puede leer esta nota.'} </p></div>
    ${S.ro?'':`<div class="row"><button class="btn danger" data-act="del">Borrar</button><span id="delConfirm"></span></div>`}`;
}
function emptyHTML(){
  if(S.view==='mis') return `<div class="card empty"><h2>Tus fichas</h2><p>Crea un entrenador con su equipo, o un Pokémon suelto. Los PS, atributos, evasión, iniciativa y el daño de cada movimiento se calculan solos.</p>${S.canWrite?'<div class="row" style="justify-content:center"><button class="btn pri" data-act="newE">Crear entrenador</button><button class="btn" data-act="newP">Crear Pokémon suelto</button></div>':''}</div>`;
  return `<div class="card empty"><h2>Panel del Master</h2><p>Registra NPC en carpetas, Pokémon salvajes y la bitácora de la campaña. Los jugadores no ven esta sección.</p></div>`;
}
function fillComputed(){
  const f=S.cur; if(!f||f.tipo===undefined) return; const c=calc(f); const isP=f.tipo==='P'; const dx=isP?dexById.get(f.especie):null;
  const set=(k,v)=>document.querySelectorAll(`[data-c="${k}"]`).forEach(e=>e.innerHTML=v);
  set('tipos',c.tipos.map(chip).join(' '));
  set('sub', isP? (dx?`${esc(dx[5])} · ${rankChip(dx[6])} en la Pokédex · ${esc(dx[18])} · Movimiento: ${esc(dx[7])} (${dx[8]} ft)`:'Elige una especie para calcular la ficha.') : `${rankChip(f.rango)} · bonus de rango +${rb(f.rango)}`);
  set('ps',`${c.act}<span class="note"> / ${c.ps}</span>`);
  const r=c.ps?clamp(c.act/c.ps,0,1):0; const pb=document.querySelector('[data-c="psbar"]'); if(pb){pb.style.width=(r*100)+'%';pb.style.background=r<.25?'var(--bad)':r<.5?'var(--warn)':'var(--good)';}
  set('ini',(Number.isInteger(c.ini)?c.ini:c.ini.toFixed(1))+(c.talB?` <span class="note">(+${c.talB})</span>`:''));
  set('vel',c.vel+' ft'); set('velx',`${isP?'Base '+(dx?dx[8]:25):'Humano 25'} ft`);
  set('eqItem', eqItemHTML(f));
  set('esq',pct(c.esq)); set('tem',pct(c.tem)); set('bEv',(num(f.bEv)>0?'+':'')+num(f.bEv)); set('crit',pct(c.crit)); set('prec',c.prec+'%');
  const imm = isP? c.tipos.map(t=>D.estados.find(e=>e[1]===t)?.[0]).filter(Boolean):[];
  const ef=[f.estF,f.estM].filter(Boolean).map(e=>{const rr=estMap.get(e);return rr?`<div class="fx-box"><b>${esc(e)}</b> (${esc(rr[1])}) — ${esc(rr[3])} <span class="note">Salvación ${esc(rr[4])}${rr[5]!=='-'?' · +'+esc(rr[5])+' por ronda':''}</span>${imm.includes(e)?' <b class="ko">Es inmune a este estado por su tipo.</b>':''}</div>`:''}).join('');
  const ap=[...Object.entries(c.em.attr).map(([k,v])=>`${v} ${k}`), c.em.prec?`${c.em.prec}% Precisión`:'', c.em.esq?`${Math.round(c.em.esq*100)}% Esquiva`:'', c.em.tem?`${Math.round(c.em.tem*100)}% Temple`:'', c.em.noCrit?'Crítico 0%':''].filter(Boolean);
  set('estfx',ef+(ap.length?`<p class="note">Ya aplicado en la ficha: ${ap.join(' · ')}.</p>`:'')+(imm.length?`<p class="note">Inmune por su tipo: ${imm.join(', ')}.</p>`:''));
  const nat=natMap.get(f.nat);
  ATTR.forEach((k,i)=>{ set('at'+k, (attrs(f)?c.A[k]+(c.em.attr[k]?` <span class="ko" style="font-size:12px" title="${esc((c.em.src[k]||[]).join(', '))}">(${c.em.attr[k]} ${esc((c.em.src[k]||[]).join(', '))})</span>`:''):'—')); set('rk'+k,'+'+rb(f.rango));
    if(isP){ set('sp'+k, dx?dx[9+i]:'—'); set('nt'+k, nat?(nat[2]===k?'<span class="ok">+1</span>':nat[3]===k?'<span class="ko">−1</span>':'0'):'0'); }});
  set('habfx', f.habilidad? esc(habMap.get(f.habilidad)||'Habilidad fuera de la lista.') : '<span class="note">Sin habilidad elegida.</span>');
  const ck=checkSheet(f,c);
  const list=a=>a.map(x=>`<span class="ko">${esc(x)}</span>`).join('');
  if(ck.attrMax!==undefined){ set('attrPts',`${ck.attrUsed}/${ck.attrMax} pts`); document.querySelector('[data-c="attrPts"]')?.classList.toggle('ko',ck.attr.length>0); }
  set('attrChk',list(ck.attr));
  if(ck.talMax!==undefined){ set('talPts',`${ck.talUsed}/${ck.talMax} pts`); document.querySelector('[data-c="talPts"]')?.classList.toggle('ko',ck.tal.length>0); }
  set('talChk',list(ck.tal||[]));
  if(ck.freeMax!==undefined){ set('mvPts',`OverRanked ${ck.orN}/${ri(f.rango)===5?0:1} · libres ${ck.freeN}/${ck.freeMax}`); document.querySelector('[data-c="mvPts"]')?.classList.toggle('ko',ck.mv.length>0); }
  set('mvChk',list(ck.mv));
  const R=ri(f.rango);
  for(let i=0;i<Math.max(6,(f.moves||[]).length);i++){ const mi=moveInfo(f,(f.moves||[])[i],c);
    if(!mi){ set('mv'+i,''); set('mvfx'+i,''); continue; }
    set('mv'+i, moveMeta(f,mi,c,i<6&&ri(mi.m[5])===R+1));
    set('mvfx'+i, esc(mi.m[11]));
  }
}
function moveMeta(f,mi,c,isOR){ const m=mi.m; return `${chip(m[2])} ${claseChip(m[3])} <span>${rankChip(m[5])}${isOR?' <span class="pill">OverRanked</span>':''}</span><span>Prec <b>${mi.prec}%</b></span><span>Daño <b>${mi.dice==='-'?'—':mi.dice+' + '+mi.atr}</b> ${mi.dice==='-'?'':attrChip(mi.ak)}${mi.stab?' <span class="pill">STAB</span>':''}</span>${typeof m[12]==='number'?`<span>R. Extra <b>${pct(m[12])}</b></span>`:''}${num(m[8])?`<span>Prioridad <b>${m[8]>0?'+':''}${m[8]}</b></span>`:''}<span>${esc(m[10])}</span>${m[14]&&m[14]!=='-'?`<span>Concurso ${socialChip(m[14])}</span>`:''}${m[13]&&m[13]!=='-'?`<span class="pill">${esc(m[13])}</span>`:''}`; }
function restoreAll(f){ f.dano=0; f.cEsq=0; f.cTem=0; f.ic=0; f.bEv=0; f.prec=0; f.estF=''; f.estM=''; f.estFx={}; f.rep=null;
  ATTR.forEach(k=>{ if(f.attr&&f.attr[k]) f.attr[k].b=0; }); return f; }
function setPath(o,path,v){ const ks=path.split('.'); let t=o; for(let i=0;i<ks.length-1;i++){ const k=ks[i]; if(t[k]==null) t[k]= /^\d+$/.test(ks[i+1])?[]:{}; t=t[k]; } t[ks.at(-1)]=v; }
function commit(full){
  putF(S.open,structuredClone(S.cur));
  queueSave(pathOf(S.open), structuredClone(S.cur));
  { const k=refKey(S.open); if(S.open.src==='master'&&inCombat(k)) cbWrite({snaps:{[k]:snapOf(S.cur)}}); }
  renderList(); if(full) renderSheet(); else fillComputed();
}
function onField(e){
  const el=e.target; const p=el.dataset.f; if(!p||!S.cur||S.ro) return;
  if(el.tagName==='SELECT') selColor(el);
  const f=S.cur; let v=el.value; let full=false;
  if(el.type==='number') v=num(v);
  if(p==='dano'){ const r=calcExpr(f.dano,v); if(r===null){ el.setCustomValidity('Usa un número, o +15 / −5'); el.reportValidity(); return; } el.setCustomValidity(''); f.dano=r; el.value=r; commit(false); return; }
  if(p==='especieL'){ const id=dexByLabel.get(v)||''; if(v&&(!id||!speciesAllowed(id)&&f.especie!==id)){ el.setCustomValidity(id?'El Master aún no desbloquea esta especie en la Pokédex':'Especie no encontrada'); el.reportValidity(); return;} el.setCustomValidity(''); f.especie=id; const dx=dexById.get(id); if(dx) f.habilidad=dx[15]||''; full=true; }
  else if(p.startsWith('moves.')){ const id=v?atkByName.get(v.toLowerCase().trim())||'':''; if(v&&!id){ el.setCustomValidity('Movimiento no encontrado'); el.reportValidity(); return;} el.setCustomValidity(''); setPath(f,p,id); full=true; }
  else if(p==='entrenador'&&v.startsWith('jug|')){ const [,u,tid]=v.split('|'); capturePokemon(u,tid); return; }
  else if(p==='entrenador'){ if(v){ const team=teamOf({...S.open,id:v}).filter(x=>x.id!==S.open.id&&x.f.lugar!=='caja'); f.lugar= team.length>=6?'caja':''; } else f.lugar=''; f.entrenador=v; full=true; }
  else if(p==='lugar'){ if(!v){ const team=teamOf({...S.open,id:f.entrenador}).filter(x=>x.id!==S.open.id&&x.f.lugar!=='caja'); if(team.length>=6){ showBanner('El equipo ya tiene 6 Pokémon. Pasa uno a la caja primero.'); el.value='caja'; return;} } f.lugar=v; }
  else if(/^mochila\.\d+\.eq$/.test(p)){ if(v) (f.mochila||[]).forEach(it=>{ if(it.eq===v) it.eq=''; }); setPath(f,p,v); full=true; }
  else if(p.startsWith('mochila.')){ setPath(f,p,v); fillMochila(); }
  else if(p.startsWith('tal.')||p==='cat'){ setPath(f,p,v); full=true; }
  else if(p==='estF'||p==='estM'){ setPath(f,p,v); setEstFx(f,p==='estF'?'F':'M',v?{r:f.rango||'Starter'}:null); full=true; }
  else setPath(f,p,v);
  commit(full);
}
function calcExpr(cur,str){ let s=String(str).replace(/\s+/g,'').replace(/[−–]/g,'-'); if(s==='') return 0; if(/^[+\-]/.test(s)) s=String(num(cur))+s; if(!/^\d+(?:[+\-]\d+)*$/.test(s)) return null; const v=(s.match(/[+\-]?\d+/g)||[]).reduce((a,b)=>a+Number(b),0); return Math.max(0,v); }
function onImage(e){
  const file=e.target.files&&e.target.files[0]; if(!file||!S.cur) return;
  const fr=new FileReader();
  fr.onload=()=>{ const im=new Image(); im.onload=()=>{ const max=360; let w=im.width,h=im.height; const s=Math.min(1,max/Math.max(w,h)); w=Math.round(w*s); h=Math.round(h*s);
      const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const cx=cv.getContext('2d'); cx.fillStyle='#ffffff'; cx.fillRect(0,0,w,h); cx.drawImage(im,0,0,w,h);
      let url=cv.toDataURL('image/jpeg',0.8); if(url.length>150000) url=cv.toDataURL('image/jpeg',0.6);
      if(url.length>200000){ showBanner('La imagen es demasiado pesada incluso reducida. Prueba con otra.'); return; }
      S.cur.img=url; commit(true); };
    im.onerror=()=>showBanner('No se pudo leer esa imagen. Usa un archivo JPG o PNG.'); im.src=fr.result; };
  fr.readAsDataURL(file);
}

/* ---------- panel de tiradas ---------- */
let RP=null;

const GEN_SVG={
  M:'<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="14" r="6"/><path d="M14.5 9.5 20 4M14.5 4H20v5.5"/></svg>',
  F:'<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="9" r="6"/><path d="M12 15v7M8.5 18.5h7"/></svg>',
  N:'<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="9" r="6"/><path d="M12 15v7"/></svg>'};
const GEN_TXT={M:'Masculino',F:'Femenino',N:'Sin género'};
function genderBtn(f){ let g=f.genero||'M'; if(f.tipo!=='P'&&g==='N') g='M';
  return `<button class="gender ${g.toLowerCase()}" data-act="gen" title="${GEN_TXT[g]}" aria-label="Género: ${GEN_TXT[g]}" ${S.ro?'disabled':''}>${GEN_SVG[g]}</button>`; }
const D20_SVG='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 2 21 7v10l-9 5-9-5V7z"/><path d="M12 6.5 17.5 15h-11z"/><path d="M12 2v4.5M21 7l-3.5 8M3 7l3.5 8M6.5 15 3 17M17.5 15 21 17M6.5 15 12 22l5.5-7"/></svg>';
function charName(f){ const dx=f.tipo==='P'?dexById.get(f.especie):null; return f.nombre||(dx?dx[1]:'Sin nombre'); }
function openRP(o){ RP=o; renderRP(); }
function renderRP(){
  const el=$('#rp'); if(!RP||!S.cur){ el.hidden=true; return; }
  if(RP.kind==='res'){ el.innerHTML=`<h4>${esc(RP.title)} <button class="btn sm" data-rp="close" aria-label="Cerrar">✕</button></h4><div class="out"><span class="big ${RP.res.cls}">${RP.res.v}</span><span class="note" style="text-align:right">${RP.res.html}</span></div>`; el.hidden=false; return; }
  const f=S.cur, c=calc(f); let h='';
  if(RP.kind==='attr'||RP.kind==='tal'){
    const isE=f.tipo==='E';
    h+=`<h4>Tirada 1d20 <button class="btn sm" data-rp="close" aria-label="Cerrar">✕</button></h4><div class="note"><b>${esc(charName(f))}</b></div>`;
    h+=`<div class="grid g2"><label class="f">Atributo<select id="rpA">${ATTR.map(k=>`<option value="${k}"${RP.attr===k?' selected':''}>${ATTR_FULL[k]} (${c.A[k]>=0?'+':''}${c.A[k]})</option>`).join('')}${RP.kind==='tal'?'':''}</select></label>`;
    h+= isE?`<label class="f">Talento<select id="rpT"><option value="">Ninguno</option>${ALL_TAL.map(t=>`<option value="${t}"${RP.tal===t?' selected':''}>${TAL_LABEL(t)} (+${rb((f.tal||{})[t])})</option>`).join('')}</select></label>`:'<div></div>';
    h+=`</div><label class="f">Bonus extra<input type="number" id="rpX" value="${num(RP.x)}"></label><button class="btn pri" data-rp="roll">Tirar</button>`;
  } else if(RP.kind==='move'){
    const mi=moveInfo(f,(f.moves||[])[RP.i],c); if(!mi){ el.hidden=true; return; }
    h+=`<h4>${esc(mi.m[1])} <button class="btn sm" data-rp="close" aria-label="Cerrar">✕</button></h4>
      <div class="row"><span class="pill">Precisión ${mi.prec}%</span><span class="pill">R. Extra ${typeof mi.m[12]==='number'?pct(mi.m[12]):'—'}</span><span class="pill">Crítico ${pct(c.crit)}</span></div>
      <button class="btn pri" data-rp="roll">Tirar d100</button>`;
  }
  if(RP.res) h+=`<div class="out"><span class="big ${RP.res.cls||''}">${RP.res.v}</span><span class="note" style="text-align:right">${RP.res.html}</span></div>`;
  el.innerHTML=h; el.hidden=false;
}
function doRP(){
  const f=S.cur, c=calc(f);
  if(RP.kind==='attr'||RP.kind==='tal'){
    RP.attr=$('#rpA').value; RP.tal=$('#rpT')?$('#rpT').value:''; RP.x=num($('#rpX').value);
    const r=d(20); const a=c.A[RP.attr]; const t=RP.tal?rb((f.tal||{})[RP.tal]):0; const tot=r+a+t+RP.x;
    const nat = r===20?'<b class="ok">20 natural: éxito</b>':r===1?'<b class="ko">1 natural: fallo</b>':'';
    const txt=`1d20 [${r}] + ${RP.attr} ${a}${RP.tal?` + ${TAL_LABEL(RP.tal)} ${t}`:''}${RP.x?` + ${RP.x}`:''}`;
    RP.res={v:tot,cls:r===20?'ok':r===1?'ko':'',html:esc(txt)+(nat?'<br>'+nat:'')};
    logRoll(charName(f),txt+(r===20?' · 20 natural':r===1?' · 1 natural':''),tot);
  } else {
    const mi=moveInfo(f,(f.moves||[])[RP.i],c); const r=d(100);
    const hit=r<=mi.prec&&r!==100, crit=hit&&r<=Math.round(c.crit*100), re=hit&&typeof mi.m[12]==='number'&&r<=Math.round(mi.m[12]*100);
    let parts=[hit?(crit?'<b class="ok">Crítico</b>':'<b>Conecta</b>'):'<b class="ko">Falla</b>'];
    if(re) parts.push('<span class="ok">Rango Extra</span>');
    if(r===1) parts.push('<span class="ok">01: +1 Bono de Evasión y decisión del Narrador</span>');
    if(r===100) parts.push('<span class="ko">100: fallo crítico, −1 Bono de Evasión y decisión del Narrador</span>');
    RP.res={v:r,cls:hit?'ok':'ko',html:parts.join('<br>')};
    logRoll(charName(f),`${mi.m[1]}: d100 [${r}] vs ${mi.prec}% · ${hit?(crit?'crítico':'conecta'):'falla'}${re?' · Rango Extra':''}`,r);
  }
  renderRP();
}
document.getElementById('rp').addEventListener('click',e=>{ const b=e.target.closest('[data-rp]'); if(!b) return; if(b.dataset.rp==='close'){ RP=null; renderRP(); } else doRP(); });

/* ---------- glosario ---------- */
const tbl=(hd,rows)=>`<div class="tw"><table class="gt"><thead><tr>${hd.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td${i===0?' class="attr-name"':''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const ej=t=>`<div class="ej"><b>Ejemplo.</b> ${t}</div>`;
const SOC=[['Dureza','Picante','Amarillo','Ácida, Salada','Dulce, Amarga'],['Estilo','Ácida','Rojo','Amarga, Picante','Salada, Dulce'],['Belleza','Amarga','Azul','Dulce, Ácida','Picante, Salada'],['Dulzura','Dulce','Rosa','Salada, Amarga','Ácida, Picante'],['Astucia','Salada','Verde','Picante, Dulce','Amarga, Ácida']];
const CONDS=[['Tormenta de Arena','Clima','Roca +2 SAB. Quien no es Roca, Tierra ni Acero recibe residual cada ronda.','Aprisionado: residual +1 Rango.'],['Granizo','Clima','Hielo +2 SAB. Quien no es Hielo recibe residual cada ronda.','Congelado: Salvación −10.'],['Llovizna','Clima','Agua +1 CD y Fuego −1 CD.','Empapado: evita la Salvación 1 ronda.'],['Sol Intenso','Clima','Fuego +1 CD y Agua −1 CD.','Quemado: residual +1 Rango.'],['Miasma','Clima','Al final de cada ronda, quien no es Veneno puede quedar Envenenado.','Envenenado: residual +1 Rango.'],['Plaga','Clima','Bicho +1 CD, Fantasma −1 CD; los Siniestro −10 % de Evasión.','Infestado: umbral 40 (en vez de 50).'],['Penumbra','Clima','Siniestro +1 CD, Bicho −1 CD; los Fantasma −10 % de Evasión.','Cegado: −10 % de Precisión extra.'],['Ectoplasma','Clima','Fantasma +1 CD, Siniestro −1 CD; los Bicho −10 % de Evasión.','Maldito: residual +1 Rango.'],['Campo Eléctrico','Campo','Eléctrico +1 CD. Nadie en el suelo puede quedar Adormilado.','Paralizado: umbral 30 (en vez de 45).'],['Campo de Hierba','Campo','Planta +1 CD. Quien está en el suelo recupera residual cada ronda.','Drenado: quien lo causó recupera el doble.'],['Campo Psíquico','Campo','Psíquico +1 CD. Bloquea los movimientos con Prioridad.','Adormilado: umbral 30 (en vez de 45).'],['Campo de Niebla','Campo','Hada +1 CD y Dragón −1 CD. Nadie en el suelo recibe estados Físicos.','Encantado: evita la Salvación 1 ronda.'],['Campo Magnético','Campo','Acero +1 VIT y +1 SAB.','Magnetizado: Eléctrico y Roca +1 CD extra.'],['Alboroto','Campo','Movimientos de Sonido +1 CD. Nadie puede quedar Adormilado.','Aturdido: además no puede moverse.'],['Turbulencia Ancestral','Campo','Dragón +1 CD y Hada −1 CD.','Aterrado: Salvación −10.'],['Arena de Combate','Campo','+1 al IC de todos los Pokémon en el campo.','Provocado: evita la Salvación 1 ronda.'],['Lodazal','Entorno','Los rivales se desplazan a la mitad.','Enlodado: además −2 DES.'],['Viento Afín','Entorno','Los aliados ganan +3 DES durante 4 rondas (y +10 ft de Velocidad).','Mareado: −10 % de Precisión extra.'],['Arcoíris','Entorno (4 rondas)','Se crea al combinar 2 movimientos Voto en la misma ronda. Duplica el Rango Extra del equipo.','—']];
const condTipo=t=>{const e=estMap.get(String(t).split(':')[0].trim()); return e?chip(e[1]):'—';};
const GLOS=[
{id:'atacar',t:'Atacar, paso a paso',h:()=>`<ol class="steps"><li><b>Declarar</b> el movimiento y su objetivo.</li><li><b>Tirada de Precisión (1d100):</b> conecta si el resultado es menor o igual que la Precisión del movimiento.</li><li><b>Efecto secundario:</b> si la misma tirada es menor o igual que su <b>Rango Extra</b>, el efecto se aplica.</li><li><b>Crítico:</b> si la misma tirada es menor o igual que el Ratio del Índice de Crítico del atacante.</li><li><b>Respuesta del objetivo:</b> tras ver la tirada, decide si esquiva o colisiona.</li><li><b>Daño</b> (o el efecto del movimiento).</li></ol>
<p><b>Precisión del movimiento = 75 % + 5 % × (Precisión del movimiento + modificador)</b>, entre 30 % y 100 %. Un 100 en el dado siempre es fallo crítico; un 01 da +1 al Bono de Evasión.</p>
${tbl(['Penalización por repetición','Starter','Beginner','Amateur','Elite','Master','Legend'],[['Precisión','0','−10','−20','−30','−40','−40']])}
${tbl(['Índice de Crítico','{0}','{1}','{2}','{3}','{4}','{5}'],[['Ratio','1 %','20 %','40 %','60 %','80 %','99 %']])}
<p><b>Daño = dado de la Clase de Daño + Atributo del movimiento − defensa del objetivo</b> (VIT contra Físico, SAB contra Especial). STAB +1 CD; cada relación de tipos ±1 CD (x0 = inmune); máximo CD 24. El crítico duplica el daño y aplica el estado del tipo del movimiento.</p>
${ej('Un Pokémon de tipo Fuego usa un movimiento Especial de Fuego con Precisión +1 y Base 3, sin modificador: su Precisión es 80 %. Saca 12 en el d100: conecta (12 ≤ 80) y, si el Rango Extra es 20 %, también aplica el efecto secundario (12 ≤ 20). Con IC {0} (1 %) no es crítico. La CD es 3 + 1 por STAB = 4, o sea 2d4. Con ENE 3 contra un rival de SAB 2, el daño es 2d4 + 3 − 2.')}`},
{id:'tipos',t:'Tabla de tipos',h:()=>`<p>Fila: tipo del <b>movimiento</b>. Columna: tipo del <b>defensor</b>. Cada <b>+1</b> sube un paso la Clase de Dado (súper eficaz), cada <b>−1</b> la baja (poco eficaz) y <b>x0</b> deja inmune. Con dos tipos, se suman.</p>
<div class="tw"><table class="typet"><thead><tr><th class="corner">Mov. \\ Def.</th>${D.types.map(t=>`<th><span class="tcol" style="background:#${TYPE_BG[t]||'CCCCCC'};color:${inkOn(TYPE_BG[t]||'CCCCCC')}" title="${esc(t)}">${esc(TYPE_ABBR(t))}</span></th>`).join('')}</tr></thead>
<tbody>${D.types.map(a=>`<tr><th>${chip(a)}</th>${(D.chart[a]||[]).map((v,i)=>{ const cls=v==='x0'?'x0':v>0?'up':v<0?'dn':''; const txt=v==='x0'?'x0':typeof v==='number'&&v!==0?(v>0?'+'+v:'−'+(-v)):''; return `<td class="${cls}" title="${esc(a)} contra ${esc(D.types[i])}">${txt}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
${ej('Un movimiento de Agua contra un Pokémon Fuego/Roca: +1 (Fuego) +1 (Roca) = +2 pasos, así que una CD 4 (2d4) pasa a CD 6 (2d6).')}`},
{id:'evasion',t:'Esquiva y Temple',h:()=>`<p>Esquivar es gratis y se decide justo después de ver la Precisión del atacante. <b>Esquiva</b> se usa contra movimientos Físicos, Especiales y trampas (atributo DES); <b>Temple</b> contra movimientos de Estado (atributo CAR).</p>
<p><b>Evasión = 100 % − 15 % × intentos previos + 15 % × ⌊atributo ÷ 2⌋ + 15 % × Bono de Evasión</b>, entre 20 % y 100 %.</p>
<p>Para esquivar, la tirada de 1d100 debe ser <b>menor o igual que la Evasión y también que la tirada de Precisión del atacante</b>. Por eso un crítico solo se esquiva con otro crítico.</p>
${tbl(['Intentos previos','0','1','2','3','4','5','6+'],[['Evasión base','100 %','85 %','70 %','55 %','40 %','25 %','20 %']])}
<ul><li><b>Desgaste:</b> cada intento cuenta, salga bien o mal.</li><li><b>Bono de Evasión</b> (−3 a +3, 15 % por punto): Reposicionar +1 o +2, 01 natural +1, fallo crítico −1.</li><li>Fuera del combate, un Pokémon recupera 1 intento por ronda.</li></ul>
${ej('Un Pokémon con DES 5, 2 intentos previos y Bono +1 tiene 100 − 30 + 30 + 15 = 115 %, que queda en 100 %. El atacante sacó 12 y conectó; el defensor tira 9, que es ≤ 100 y ≤ 12: esquiva. Si el atacante hubiera sacado 3 (crítico), el defensor necesitaría 3 o menos.')}`},
{id:'colision',t:'Colisión',h:()=>`<p>En vez de esquivar, el objetivo puede <b>chocar</b> el ataque con un movimiento de daño propio. Gasta su Acción (o toma prestada la de la ronda siguiente; solo una a la vez). Tira la Precisión de su movimiento: si falla, recibe el golpe completo y pierde su Acción. Si conecta, cada lado suma puntos:</p>
${tbl(['Factor','Puntos'],[['Ser el atacante','+1'],['Nivel del movimiento','Starter 1 · Beginner 2 · Amateur 3 · Elite 4 · Master 5 · Legend 6'],['Tamaño','Contacto 0 · A distancia +1 · Cono, Línea o Área 5 ft +2 · Área 15 ft o Campo +3'],['Tipo contra tipo','Súper eficaz +2 · Poco eficaz −2 · Sin efecto −4'],['Crítico (cualquiera)','+2']])}
${tbl(['Diferencia','Resultado'],[['Empate','Ambos reciben el promedio de la CD de los dos movimientos.'],['1 a 3','El perdedor recibe el promedio de la CD de los dos movimientos.'],['4 o más','El perdedor recibe el daño completo del movimiento ganador.']])}
<ul><li>Solo el ganador aplica sus efectos secundarios; si es crítico, su daño aumenta como en un crítico normal.</li><li>Contra un área, cada defensor colisiona por separado. Una trampa también se puede colisionar.</li><li>El movimiento usado cuenta para la penalización por repetición.</li></ul>
${ej('El atacante lanza un movimiento Starter de Fuego a distancia: 1 (atacante) + 1 (nivel) + 1 (tamaño) = 3. El defensor responde con un movimiento Starter de Agua a distancia, súper eficaz contra Fuego: 1 + 1 + 2 = 4. Gana el defensor por 1, así que el atacante recibe el promedio de la CD de ambos movimientos.')}`},
{id:'comandar',t:'Comandar',h:()=>`<p>El Entrenador usa su Acción para dirigir a uno de sus Pokémon en vez de atacar. No agrega tiradas: usa directamente el bonus del Talento (de +0 a +6).</p>
${tbl(['Orden','Talento','Efecto (hasta el final del próximo turno del Pokémon)'],[['¡Apunta!','Precisión','Resta 5 × bonus a la tirada de Precisión de su próximo movimiento.'],['¡Esquiva!','Perspicacia','Resta 5 × bonus a su próxima tirada de Esquiva o Temple.'],['¡Punto débil!','Teoría','Suma la mitad del bonus, redondeada hacia arriba, a su Índice de Crítico.'],['¡Muévete!','Presencia','+5 ft de Velocidad por cada 2 puntos de bonus (máximo 60 ft).']])}
<ul><li><b>¡Ahora!:</b> el Entrenador cede su turno para que uno de sus Pokémon con menor Iniciativa actúe en ese momento.</li><li><b>Retrasar Acción:</b> el Pokémon espera; cuando llega el momento indicado, el Entrenador gasta su Reacción y el Pokémon actúa. Si la ronda termina, se pierde.</li><li>Una Orden por ronda; el Pokémon debe estar a menos de 50 ft o en su línea de vista.</li></ul>
${ej('Un Entrenador con Precisión [B] (+2) grita «¡Apunta!». Su Pokémon saca 58 en la Precisión de su movimiento y cuenta como 48, así que conecta con un movimiento de 50 %.')}`},
{id:'naturalezas',t:'Naturalezas y Sabores',h:()=>`<p>Cada naturaleza da <b>+1 a un atributo</b> y <b>−1 a otro</b>, y se asocia a un atributo social con un sabor favorito, que importa para las Balls de Bonguri.</p>
${tbl(['Naturaleza','+1','−1','Social'],D.nat.map(n=>[esc(n[0]),attrChip(n[2]),attrChip(n[3]),socialChip(n[1])]))}
${tbl(['Atributo social','Sabor favorito','Bonguri','Sabores neutros','Sabores que rechaza'],SOC.map(r=>[socialChip(r[0]),...r.slice(1)]))}
${ej('Un Pokémon Alegre gana +1 DES y pierde 1 ENE. Su atributo social es Belleza: su sabor favorito es el Amargo, y una Ball hecha con Bonguris Azules le da +2 por cada uno.')}`},
{id:'estados',t:'Estados Alterados',h:()=>`<p>18 estados, uno por tipo. Cada criatura puede tener <b>uno Físico y uno Mental</b> a la vez; uno nuevo de la misma clase no reemplaza al anterior, salvo con un crítico. <b>Cada Pokémon es inmune al estado de su propio tipo.</b></p>
<ul><li><b>Salvación X (+Y):</b> al final de cada ronda tira 1d100 y se libera con un resultado ≤ X; cada fallo suma Y.</li><li><b>Daño residual</b> según el Nivel del movimiento que lo causó: Starter 1d6 · Beginner 1d8 · Amateur 2d4 · Elite 1d10 · Master 2d6 · Legend 3d4.</li></ul>
${tbl(['Estado','Tipo','Clase','Efecto','Salvación'],D.estados.map(e=>[esc(e[0]),chip(e[1]),e[2]==='Fisico'?'Físico':esc(e[2]),esc(e[3]),e[4]==='-'?'—':`${e[4]} (+${e[5]})`]))}
${ej('Un Pokémon queda Quemado (Salvación 15 +30). Al final de la ronda 1 recibe el residual y tira 1d100: saca 40, falla. En la ronda 2 necesita 45 o menos; saca 33 y se libera. Un Pokémon de tipo Fuego nunca podría quedar Quemado.')}`},
{id:'campo',t:'Condiciones de Campo',h:()=>`<p>Climas, campos y entornos que afectan a todo el terreno. Duran 5 rondas salvo que se indique otra cosa, y potencian al estado alterado afín.</p>
${tbl(['Condición','Tipo','Clase','Efecto general','Potencia al estado'],CONDS.map(r=>[r[0],condTipo(r[3]),r[1],r[2],r[3]]))}
${ej('Con Sol Intenso, un movimiento de Fuego de CD 6 (2d6) pasa a CD 7 (3d4) y uno de Agua de CD 6 baja a CD 5 (1d10). Además, el daño residual de Quemado sube un Rango.')}`},
{id:'captura',t:'Captura',h:()=>`<p><b>Tirada de captura = 1d20 + Talento Precisión + Atributo + méritos + Ball</b>, contra la dificultad del Pokémon. En combate cuesta la Acción. Un 1 natural siempre falla y un 20 natural siempre captura.</p>
${tbl(['Rango del Pokémon','Starter','Beginner','Amateur','Elite','Master','Legend'],[['Dificultad','10','15','20','25','30','35']])}
<ul><li><b>Deméritos:</b> +5 a la dificultad por cada Rango que el Pokémon esté por encima del Entrenador.</li><li><b>Méritos (0 a +6):</b> a criterio del Narrador (p. ej., PS ≤ 33 % +1, PS ≤ 10 % +2).</li><li><b>Ball (0 a +4)</b>.</li></ul>
${tbl(['Bono','Ball','Condición'],[['+0','Poké Ball','Siempre'],['+1','Super Ball','Siempre'],['+2','Ultra Ball','Siempre'],['+3','Veloz Ball','Solo en la 1.ª ronda'],['+3','Luna Ball','Evolucionan con Piedra Lunar'],['+3','Ensueño Ball','El Pokémon está Adormilado'],['+3','Ente Ball','Ultraentes (contra otros, −2)'],['+3','Amor Ball','Misma especie y género opuesto que tu Pokémon'],['+1 a +3','Turno Ball','+1 desde la ronda 4, +2 desde la 7, +3 desde la 10'],['+2','Buceo Ball','Bajo el agua'],['+2','Cebo Ball','Pokémon pescado'],['+2','Ocaso Ball','De noche, en cueva o con Penumbra'],['+2','Malla Ball','Tipo Agua o Bicho'],['+1 a +2','Peso Ball','VIT del salvaje: +1 si es mayor a 3, +2 si es mayor a 6'],['+2','Rapid Ball','Mov Base de 35 ft o más'],['+2','Nivel Ball','Tu Pokémon activo es de Rango mayor'],['+1','Acopio Ball','Especie ya capturada'],['+1','Nido Ball','Rango menor que el Entrenador'],['+1','Safari, Parque y Competi Ball','Solo en sus eventos'],['+0','Amigo, Lujo, Sana, Honor y Gloria Ball','Efectos no numéricos'],['—','Master Ball','Captura segura']])}
${tbl(['Bonguri (2 por Ball)','Bonus'],[['De color','+2 si su sabor es el favorito del Pokémon'],['Negro','+2 contra Rango superior al Entrenador'],['Blanco','+2 contra Rango inferior al Entrenador'],['Blanco + Negro','+1 en cualquier caso']])}
${ej('Un Entrenador Beginner con Precisión [S] (+1) y DES 4 lanza una Ultra Ball (+2) a un Pokémon Amateur al que dejó con un 30 % de PS (mérito +1). La dificultad es 20 + 5 (está un Rango por encima) = 25. Saca 15: 15 + 1 + 4 + 1 + 2 = 23, no lo captura.')}`}];
let GLOS_OPEN='';
const TYPE_ABBR=t=>({Electrico:'ELÉ',Psiquico:'PSÍ',Dragon:'DRA',Siniestro:'SIN',Fantasma:'FAN'}[t]||deacc(t).slice(0,3).toUpperCase());
function glosHTML(){ return `<p class="note">Elige un tema en el índice para desplegarlo.</p>`+GLOS.map(g=>`<details class="card glos" id="g-${g.id}" ${GLOS_OPEN===g.id?'open':''}><summary>${g.t}</summary>${GLOS_OPEN===g.id?g.h():''}</details>`).join(''); }

/* ---------- herramientas ---------- */
function visibleRefs(){
  const out=[];
  for(const [u,fs] of Object.entries(S.fichas)) for(const [id,f] of Object.entries(fs)) out.push({src:'jug',uid:u,id,f});
  if(isMaster()) for(const [id,f] of Object.entries(S.master)) out.push({src:'master',uid:null,id,f});
  return out;
}
const refName = r=>charName(r.f)+(r.src==='master'?' · Master':(S.players[r.uid]?' · '+S.players[r.uid].alias:''));
const T = {atk:'', mv:'', ex:0, riv:[{k:'',t1:'',t2:'',vit:0,sab:0}], roll:null, ini:new Set(), tie:{}, q:'', fl:{niv:'',tipo:'',clase:'',atr:'',cat:'',con:''},
  dq:'', dfl:{tipo:'',region:'',rango:'',estado:'',pest:'todos',hab:'',bmin:'',bmax:''}, msort:{col:'',dir:0}, dpage:0, dsel:'', g:{rango:'Starter',t1:'',t2:'',region:''}, gen:null};
function renderTool(){
  return ({mov:toolMov,dex:toolDex,gen:toolGen,dados:toolDados}[S.tool]||toolDex)();
}
function toolDano(){
  const refs=visibleRefs().filter(r=>r.f.tipo==='E'||dexById.get(r.f.especie));
  const atk=refByKey(T.atk);
  let h=`<div class="card"><h2>Calculadora de daño</h2><div class="grid g3">
    <label class="f">Atacante<select id="t-atk"><option value="">Elige una ficha</option>${refs.map(r=>`<option value="${esc(refKey(r))}"${refKey(r)===T.atk?' selected':''}>${esc(refName(r))}</option>`).join('')}</select></label>`;
  let mi=null, c=null;
  if(atk){ c=calc(atk.f); const mvs=(atk.f.moves||[]).filter(Boolean);
    h+=`<label class="f">Movimiento<select id="t-mv"><option value="">Elige</option>${mvs.map(id=>`<option value="${id}"${id===T.mv?' selected':''}>${esc(atkById.get(id)?.[1]||id)}</option>`).join('')}</select></label>`;
    mi=moveInfo(atk.f,T.mv,c);
  } else h+=`<div></div>`;
  h+=`<label class="f">CD extra (habilidades, climas…)<input type="number" id="t-ex" value="${T.ex}"></label></div>`;
  if(mi) h+=`<p class="note" style="margin-top:8px">${chip(mi.m[2])} ${esc(mi.m[3])} · Base ${esc(mi.m[7])} · Precisión ${mi.prec}% · IC ${pct(c.crit)}${typeof mi.m[12]==='number'?' · Rango Extra '+pct(mi.m[12]):''} · ${esc(mi.m[11])}</p>`;
  h+=`</div><div class="card"><h2>Rivales <button class="btn sm" id="t-addriv">+ Rival</button></h2><div class="tw"><table><thead><tr><th>Rival</th><th>Tipo 1</th><th>Tipo 2</th><th>VIT</th><th>SAB</th><th>Efectividad</th><th>Daño</th><th></th></tr></thead><tbody>`;
  T.riv.forEach((r,i)=>{
    const rr=refByKey(r.k); let t1=r.t1,t2=r.t2,vit=r.vit,sab=r.sab;
    if(rr){ const cc=calc(rr.f); [t1,t2]=[cc.tipos[0]||'',cc.tipos[1]||'']; vit=cc.A.VIT; sab=cc.A.SAB; }
    let eff='—', dmg='—';
    if(mi && (t1||t2||r.k||vit||sab)){
      const e=effectiveness(mi.m[2],[t1,t2].filter(Boolean));
      const isNum=typeof mi.m[7]==='number'&&mi.m[7]>0;
      if(e.immune){ eff='<span class="ko">Inmune</span>'; dmg='0'; }
      else { eff = e.steps>0?`<span class="ok">Súper eficaz +${e.steps}</span>`:e.steps<0?`<span class="wa">Poco eficaz ${e.steps}</span>`:'Normal';
        if(isNum){ const idx=clamp(mi.m[7]+mi.stab+e.steps+num(T.ex),1,24); const def=mi.m[3]==='Fisico'?vit:mi.m[3]==='Especial'?sab:0; dmg=`<b>${dice(idx)}</b> + ${mi.atr} ${mi.ak}${def?' − '+def+(mi.m[3]==='Fisico'?' VIT':' SAB'):''}`; }
        else dmg='Sin dado'; }
    }
    h+=`<tr><td><select data-riv="${i}.k"><option value="">Manual</option>${refs.map(x=>`<option value="${esc(refKey(x))}"${refKey(x)===r.k?' selected':''}>${esc(refName(x))}</option>`).join('')}</select></td>
      <td><select data-riv="${i}.t1" ${rr?'disabled':''}>${opts(D.types,t1,'—')}</select></td><td><select data-riv="${i}.t2" ${rr?'disabled':''}>${opts(D.types,t2,'—')}</select></td>
      <td style="width:70px"><input type="number" data-riv="${i}.vit" value="${vit}" ${rr?'disabled':''}></td><td style="width:70px"><input type="number" data-riv="${i}.sab" value="${sab}" ${rr?'disabled':''}></td>
      <td>${eff}</td><td>${dmg}</td><td><button class="btn sm" data-rmriv="${i}" aria-label="Quitar rival ${i+1}">✕</button></td></tr>`; });
  if(!T.riv.length) h+=`<tr><td colspan="8" class="note">Sin rivales. Agrega uno con «+ Rival».</td></tr>`;
  h+=`</tbody></table></div><p class="note">Cada +1 o −1 de la tabla de tipos sube o baja un paso de Daño; con dos tipos se suman. Defensa: VIT contra Físico, SAB contra Especial. El crítico duplica el daño.</p></div>`;
  if(mi) h+=`<div class="card"><h2>Tirada</h2><div class="row"><button class="btn pri" id="t-roll">Tirar Precisión y daño</button><span class="note">Una tirada de Precisión y el daño contra cada rival · queda en el historial de la mesa</span></div>${T.roll?rollHTML(T.roll):''}</div>`;
  return h;
}
function rollDice(expr){ const m=/^(\d+)d(\d+)$/.exec(expr); if(!m) return {t:0,r:[]}; const r=[]; for(let i=0;i<+m[1];i++) r.push(d(+m[2])); return {t:r.reduce((a,b)=>a+b,0),r}; }
function doRoll(){
  const atk=refByKey(T.atk); if(!atk) return; const c=calc(atk.f); const mi=moveInfo(atk.f,T.mv,c); if(!mi) return;
  const d100=d(100);
  const hit=d100<=mi.prec && d100!==100; const crit=hit && d100<=Math.round(c.crit*100);
  const re=typeof mi.m[12]==='number' && hit && d100<=Math.round(mi.m[12]*100);
  const res=[];
  T.riv.forEach((r,i)=>{ const rr=refByKey(r.k); let types=[r.t1,r.t2].filter(Boolean), vit=r.vit, sab=r.sab;
    if(rr){ const cc=calc(rr.f); types=cc.tipos; vit=cc.A.VIT; sab=cc.A.SAB; }
    const e=effectiveness(mi.m[2],types); const name=rr?charName(rr.f):`Rival ${i+1}`;
    if(!hit) return;
    if(e.immune){ res.push({name,dmg:0,det:'Inmune'}); return; }
    if(!(typeof mi.m[7]==='number' && mi.m[7]>0)) return;
    const idx=clamp(mi.m[7]+mi.stab+e.steps+num(T.ex),1,24); const dd=dice(idx); const rl=rollDice(dd);
    const def=mi.m[3]==='Fisico'?vit:mi.m[3]==='Especial'?sab:0;
    let v=Math.max(0,rl.t+mi.atr-def); if(crit) v*=2;
    res.push({name,dmg:v,det:`${dd} [${rl.r.join(', ')}] + ${mi.atr} ${mi.ak}${def?' − '+def:''}${crit?' × 2 (crítico)':''}`}); });
  T.roll={d100,prec:mi.prec,hit,crit,re,res};
  logRoll(charName(atk.f),`${mi.m[1]}: d100 [${d100}] vs ${mi.prec}% · ${hit?(crit?'crítico':'conecta'):'falla'}${res.length?' · '+res.map(x=>`${x.name} ${x.dmg}`).join(' · '):''}`,res.length===1?res[0].dmg:d100);
}
function rollHTML(r){
  const tags=[]; if(r.d100===1) tags.push('<span class="ok">01 natural: +1 al Bono de Evasión y algo a decisión del Narrador</span>');
  if(r.d100===100) tags.push('<span class="ko">100: fallo crítico, −1 al Bono de Evasión y algo a decisión del Narrador</span>');
  return `<div class="res" style="margin-top:10px"><div class="r"><div><div class="note">Precisión (d100 ≤ ${r.prec})</div><div class="big ${r.hit?'ok':'ko'}">${r.d100}</div></div><div style="text-align:right">${r.hit?(r.crit?'<b class="ok">Crítico</b>':'<b>Conecta</b>'):'<b class="ko">Falla</b>'}${r.re?'<br><span class="ok">Rango Extra activado</span>':''}</div>
  ${tags.length?`<div style="grid-column:1/-1">${tags.join('<br>')}</div>`:''}</div>
  ${(r.res||[]).map(x=>`<div class="r"><div><div class="note">Daño a ${esc(x.name)}</div><div class="big">${x.dmg}</div></div><div class="note" style="text-align:right">${esc(x.det)}</div></div>`).join('')}
  <p class="note">El rival aún puede esquivar o colisionar: para evitar un crítico, su tirada de Esquiva debe ser menor o igual a ${r.d100}.</p></div>`;
}
function iniList(){
  const refs=visibleRefs().filter(r=>r.f.tipo==='E'||(dexById.get(r.f.especie)&&r.f.lugar!=='caja'));
  const sel=refs.filter(r=>T.ini.has(refKey(r))).map(r=>({r,c:calc(r.f),k:refKey(r)}));
  sel.sort((a,b)=>b.c.ini-a.c.ini || (T.tie[b.k]||0)-(T.tie[a.k]||0));
  return {refs,sel};
}
function toolIni(){
  const {refs,sel}=iniList();
  const tied=sel.filter(x=>sel.some(y=>y!==x&&y.c.ini===x.c.ini));
  let h=`<div class="card"><h2>Orden de iniciativa ${tied.length?'<button class="btn sm pri" id="t-tie">Desempatar con 1d20</button>':''}</h2>${sel.length?`<div class="res">${sel.map((x,i)=>{const tie=tied.includes(x);return `<div class="r"><div><b>${i+1}. ${esc(refName(x.r))}</b><div class="note">Vel ${x.c.vel} ft · DES ${x.c.A.DES} · SAB ${x.c.A.SAB}${x.c.talB?' · Talento +'+x.c.talB:''}</div></div><div class="big">${x.c.ini}${tie?` <span class="pill">${T.tie[x.k]?'d20: '+T.tie[x.k]:'empate'}</span>`:''}</div></div>`}).join('')}</div>`:'<p class="note">Marca quiénes participan en el combate.</p>'}
    <p class="note">Iniciativa = Velocidad ÷ 5 + DES + SAB (los Entrenadores pueden sumar un Talento). Los empates se definen con 1d20; vuelve a desempatar si sale otro empate. Se recalcula al final de la ronda si algo cambió.</p></div>
    <div class="card"><h2>Participantes</h2>${iniGroups(refs)}</div>`;
  return h;
}
function iniGroups(refs){
  const set=new Set(refs.map(refKey));
  const cb=x=>set.has(refKey(x))?`<label class="row" style="gap:6px"><input type="checkbox" data-ini="${esc(refKey(x))}" ${T.ini.has(refKey(x))?'checked':''}> ${esc(charName(x.f))}${x.f.tipo==='E'?' <span class="pill">Entrenador</span>':''}</label>`:'';
  const block=pool=>{ const tr=pool.filter(x=>x.f.tipo==='E'); const ids=new Set(tr.map(t=>t.id)); let h='';
    tr.forEach(t=>{ h+=`<div class="inig">${cb(t)}<div style="padding-left:20px">${teamOf(t).map(cb).join('')}</div></div>`; });
    const loose=pool.filter(x=>x.f.tipo==='P'&&!ids.has(x.f.entrenador)).map(cb).join(''); if(loose) h+=`<div class="inig"><div class="note">Sueltos</div>${loose}</div>`; return h; };
  let h='';
  Object.keys(S.players).forEach(u=>{ const b=block(poolOf('jug',u)); if(b) h+=`<div class="grp"><h3>${esc(S.players[u].alias||'Jugador')}</h3><div class="inigrid">${b}</div></div>`; });
  if(isMaster()){ const pool=poolOf('master',null); const folders={}; pool.forEach(x=>{ if(x.f.tipo==='P'&&x.f.entrenador&&pool.some(t=>t.id===x.f.entrenador)) return; (folders[(x.f.cat==='salvaje'?'Salvajes · ':'NPC · ')+(x.f.carpeta||'Sin carpeta')] ||= []).push(x); });
    Object.keys(folders).sort().forEach(k=>{ const sel=folders[k]; const all=pool.filter(x=>sel.includes(x)||sel.some(t=>t.id===x.f.entrenador)); const b=block(all); if(b) h+=`<div class="grp"><h3>Master · ${esc(k)}</h3><div class="inigrid">${b}</div></div>`; }); }
  return h||'<p class="note">No hay fichas todavía.</p>';
}
function doTie(){
  const {sel}=iniList(); const tied=sel.filter(x=>sel.some(y=>y!==x&&y.c.ini===x.c.ini));
  const parts=[]; tied.forEach(x=>{ T.tie[x.k]=d(20); parts.push(`${charName(x.r.f)} ${T.tie[x.k]}`); });
  if(parts.length) logRoll('Iniciativa','Desempate 1d20: '+parts.join(' · '),null);
}
const MCOLS=[['Movimiento',1],['Tipo',2],['Clase',3],['Nivel',5],['Prec',6],['Base',7],['Atrib.',4],['Distancia',10],['R.E.',12]];
const uniq=(i)=>[...new Set(D.atk.map(a=>a[i]).filter(x=>x&&x!=='-'))].sort();
const CATS=[...new Set(D.atk.flatMap(a=>String(a[13]||'').split(/[,;]\s*/)).map(s=>s.trim()).filter(x=>x&&x!=='-'))].sort();
function toolMov(){
  const fl=T.fl; const q=T.q.toLowerCase();
  const res=D.atk.filter(a=>(!q||a[1].toLowerCase().includes(q)||String(a[11]).toLowerCase().includes(q))&&(!fl.niv||a[5]===fl.niv)&&(!fl.tipo||a[2]===fl.tipo)&&(!fl.clase||a[3]===fl.clase)&&(!fl.atr||a[4]===fl.atr)&&(!fl.cat||String(a[13]).includes(fl.cat))&&(!fl.con||a[14]===fl.con));
  const sel=(k,lbl,list)=>`<label class="f">${lbl}<select data-fl="${k}">${opts(list,fl[k],'Todos')}</select></label>`;
  let h=`<div class="card"><h2>Buscador de movimientos</h2><div class="grid g4">
    <label class="f">Nombre o efecto<input id="mq" value="${esc(T.q)}" placeholder="p. ej. Quemado"></label>
    ${sel('niv','Nivel',RANGOS)}${sel('tipo','Tipo',uniq(2))}${sel('clase','Clase',uniq(3))}${sel('atr','Atributo',uniq(4))}${sel('cat','Categoría',CATS)}${sel('con','Concurso',uniq(14))}
    <div class="f" style="justify-content:end"><span class="pill">${res.length} movimientos</span></div></div></div>
    <div class="card"><div class="tw"><table class="mtable"><thead><tr>${MCOLS.map(([lbl,i])=>{ const on=T.msort.col===i&&T.msort.dir; return `<th><button class="sortbtn" data-msort="${i}" aria-sort="${on?(T.msort.dir>0?'ascending':'descending'):'none'}">${lbl}<span class="arw">${on?(T.msort.dir>0?' ▲':' ▼'):''}</span></button></th>`; }).join('')}</tr></thead><tbody>`;
  if(T.msort.col!==''&&T.msort.dir){ const i=num(T.msort.col), dir=T.msort.dir; const key=a=>{ const v=i===5?ri(a[5]):a[i]; return v===''||v==='-'||v==null?null:v; };
    res.sort((x,y)=>{ const A=key(x),B=key(y);
      if(A===null||B===null){ if(A===null&&B===null) return x[1].localeCompare(y[1],'es'); return A===null?1:-1; }
      const an=typeof A==='number', bn=typeof B==='number'; let r;
      if(an&&bn) r=A-B; else if(an) r=-1; else if(bn) r=1; else r=String(A).localeCompare(String(B),'es',{sensitivity:'base',numeric:true}); return r*dir||x[1].localeCompare(y[1],'es'); }); }
  for(const a of res.slice(0,150)) h+=`<tr class="main"><td><b>${esc(a[1])}</b></td><td>${chip(a[2])}</td><td>${claseChip(a[3])}</td><td>${rankChip(a[5])}</td><td class="num">${a[6]>0?'+':''}${esc(a[6])}</td><td class="num">${esc(a[7])}${typeof a[7]==='number'&&a[7]>0?' <span class="note">'+dice(a[7])+'</span>':''}</td><td>${attrChip(short(a[4]))}</td><td>${esc(a[10])}</td><td class="num">${typeof a[12]==='number'?pct(a[12]):'—'}</td></tr><tr class="fx"><td colspan="9">${esc(a[11])}${a[13]&&a[13]!=='-'?' <span class="pill">'+esc(a[13])+'</span>':''}</td></tr>`;
  h+=`</tbody></table></div>${res.length>150?'<p class="note">Se muestran los primeros 150. Afina los filtros para ver el resto.</p>':''}</div>`;
  return h;
}
/* Pokédex */
const baseStats=r=>[9,10,11,12,13,14].reduce((a,i)=>a+num(r[i]),0);
function dexFiltered(){
  const q=T.dq.toLowerCase(), fl=T.dfl, M=isMaster();
  return D.dex.filter(r=>{
    const shown = M || visFor(r[0]); const st=M?visState(r[0]):'';
    if(fl.estado==='vis'&&st!=='all') return false;
    if(fl.estado==='parcial'&&st!=='some') return false;
    if(fl.estado==='oculto'&&st!=='none') return false;
    if(!M){ const all=S.evento||S.vis.has(r[0]); const mine=!all&&S.uid&&S.visJ[S.uid]&&S.visJ[S.uid].has(r[0]);
      if(fl.pest==='todos'&&!all) return false;
      if(fl.pest==='mio'&&!mine) return false;
      if(fl.pest==='bloq'&&(all||mine)) return false; }
    if(q){ if(!shown) return false; if(!(dexLabel(r).toLowerCase().includes(q)||String(r[19]).toLowerCase().includes(q))) return false; }
    if(fl.region&&r[18]!==fl.region) return false;
    if(fl.tipo&&(!shown||!dexTypes(r).includes(fl.tipo))) return false;
    if(fl.rango&&(!shown||r[6]!==fl.rango)) return false;
    if(fl.hab&&(!shown||![r[15],r[16],r[17]].some(h=>String(h||'').toLowerCase()===fl.hab.toLowerCase()))) return false;
    if((fl.bmin!==''||fl.bmax!=='')&&!shown) return false;
    if(fl.bmin!==''&&baseStats(r)<num(fl.bmin)) return false;
    if(fl.bmax!==''&&baseStats(r)>num(fl.bmax)) return false;
    return true; });
}
function toolDex(){
  const M=isMaster(); const res=dexFiltered(); const per=96; const pages=Math.max(1,Math.ceil(res.length/per)); T.dpage=clamp(T.dpage,0,pages-1);
  const pageRows=res.slice(T.dpage*per,(T.dpage+1)*per);
  const nPart=M?D.dex.filter(r=>visState(r[0])==='some').length:0; const nMine=M?0:D.dex.filter(r=>visFor(r[0])).length;
  let h=`<div class="card"><h2>Pokédex <span class="pill">${M?`${S.vis.size} para todos · ${nPart} por jugador`:`${nMine} de ${D.dex.length} desbloqueadas`}${S.evento?' · modo evento':''}</span></h2>
    ${M&&S.canWrite?`<div class="row" style="margin-bottom:10px"><button class="btn sm ${S.evento?'pri':''}" data-act="dexEvento" aria-pressed="${!!S.evento}">${S.evento?'Modo evento activo: todas visibles · Desactivar':'Activar modo evento (mostrar todas)'}</button><span class="note">El modo evento muestra todas las especies sin tocar las desbloqueadas; al desactivarlo vuelven las de antes.</span></div>`:(S.evento?'<p class="note ok">Modo evento: todas las especies están visibles por ahora.</p>':'')}
    <div class="grid g4">
    <label class="f">Nombre o número<input id="dq" value="${esc(T.dq)}" placeholder="p. ej. Pikachu o P0025"></label>
    <label class="f">Tipo<select data-dfl="tipo">${opts(D.types,T.dfl.tipo,'Todos')}</select></label>
    <label class="f">Región<select data-dfl="region">${opts(D.regions,T.dfl.region,'Todas')}</select></label>
    <label class="f">Rango<select data-dfl="rango">${opts(RANGOS,T.dfl.rango,'Todos')}</select></label>
    <label class="f">Habilidad<input data-dfl="hab" list="dl-hab" value="${esc(T.dfl.hab)}" placeholder="p. ej. Espesura"></label>
    <label class="f">Puntos Base<div class="row" style="gap:6px;flex-wrap:nowrap"><input type="number" min="0" data-dfl="bmin" value="${esc(T.dfl.bmin)}" placeholder="mín." aria-label="Puntos Base mínimos" style="width:50%"><input type="number" min="0" data-dfl="bmax" value="${esc(T.dfl.bmax)}" placeholder="máx." aria-label="Puntos Base máximos" style="width:50%"></div></label>
    ${M?`<label class="f">Estado<select data-dfl="estado"><option value="">Todas</option><option value="vis"${T.dfl.estado==='vis'?' selected':''}>Para todos</option><option value="parcial"${T.dfl.estado==='parcial'?' selected':''}>Para algunos jugadores</option><option value="oculto"${T.dfl.estado==='oculto'?' selected':''}>Ocultas</option></select></label>`:`<label class="f">Estado<select data-dfl="pest"><option value="todos"${T.dfl.pest==='todos'?' selected':''}>Desbloqueadas para todos</option><option value="mio"${T.dfl.pest==='mio'?' selected':''}>Desbloqueadas para mí</option><option value="bloq"${T.dfl.pest==='bloq'?' selected':''}>Bloqueadas</option><option value=""${!T.dfl.pest?' selected':''}>Pokédex completa</option></select></label>`}
    </div>${M&&S.canWrite?`<div class="row" style="margin-top:10px"><select id="dexFor" class="btn sm" aria-label="Para quién"><option value="">Para todos</option>${dexPlayers().map(u=>`<option value="${esc(u)}"${T.dfor===u?' selected':''}>Para ${esc(S.players[u].alias||'Jugador')}</option>`).join('')}</select><button class="btn sm" data-dexall="1">Desbloquear las ${res.length} filtradas</button><button class="btn sm" data-dexall="0">Ocultar las ${res.length} filtradas</button><span class="note">Toca la Poké Ball de una especie para elegir qué jugadores la ven.</span></div>`:(M?'':'<p class="note">El Master va desbloqueando especies a medida que las encuentran.</p>')}</div>`;
  const sel=T.dsel&&dexById.get(T.dsel); if(sel&&(M||visFor(sel[0]))) h+=dexDetail(sel);
  h+=`<div class="card"><div class="dex">${pageRows.map(r=>{ const v=visFor(r[0]); const st=M?visState(r[0]):''; const shown=M||v;
      const pop = M&&T.dpop===r[0] ? `<div class="dexpop"><label class="row" style="gap:6px"><input type="checkbox" data-dexall1="${r[0]}" ${st==='all'?'checked':''} ${S.canWrite?'':'disabled'}> <b>Todos los jugadores</b></label>${dexPlayers().map(u=>`<label class="row" style="gap:6px"><input type="checkbox" data-dexj="${esc(u)}" data-id="${r[0]}" ${st==='all'||(S.visJ[u]&&S.visJ[u].has(r[0]))?'checked':''} ${st==='all'||!S.canWrite?'disabled':''}> ${esc(S.players[u].alias||'Jugador')}</label>`).join('')||'<span class="note">Aún no hay jugadores.</span>'}<button class="btn sm" data-dexpop="">Listo</button></div>` : '';
      return `<div class="sp${shown?'':' hidden'}" ${shown?`data-dsel="${r[0]}" role="button" tabindex="0"`:''} aria-current="${T.dsel===r[0]}"><div class="no"><span>#${esc(String(r[19]).slice(1))} · ${esc(r[18])}</span>${M?`<button class="ballbtn" data-dexpop="${r[0]}" title="${st==='all'?'Visible para todos':st==='some'?'Visible para algunos jugadores':'Oculta'}: clic para elegir quién la ve" aria-label="Elegir quién ve ${esc(dexLabel(r))}"><span class="ball${st==='none'?' off':st==='some'?' some':''}"></span></button>`:(v?'<span class="ball" aria-hidden="true"></span>':'')}</div>
        <div class="nm">${shown?esc(dexLabel(r)):'???'}</div><div>${shown?dexTypes(r).map(chip).join(' '):'<span class="note">Sin registrar</span>'}</div>${pop}</div>`;}).join('')||'<p class="note">Nada coincide con los filtros.</p>'}</div>
      ${pages>1?`<div class="row" style="margin-top:10px;justify-content:center"><button class="btn sm" data-dpage="-1" ${T.dpage===0?'disabled':''}>Anterior</button><span class="pill">Página ${T.dpage+1} de ${pages}</span><button class="btn sm" data-dpage="1" ${T.dpage>=pages-1?'disabled':''}>Siguiente</button></div>`:''}</div>`;
  return h;
}
function dexDetail(r){
  const hab=[...new Set([r[15],r[16],r[17]].filter(x=>x&&x!=='-'))];
  return `<div class="card"><h2>${esc(dexLabel(r))} <button class="btn sm" data-dsel="">Cerrar</button></h2><div class="grid g2">
    <div><div class="row">${dexTypes(r).map(chip).join(' ')}<span class="pill">${esc(r[18])}</span>${rankChip(r[6])}<span class="pill">${esc(r[5])}</span></div>
    <p class="note">Puntos Base ${baseStats(r)} · Movimiento: ${esc(r[7])} · ${r[8]} ft · PS en Starter: ${Math.ceil(15+(num(r[10])+num(r[14]))*(D.etapa[r[5]]??1))}</p>
    <div class="statbars">${ATTR.map((k,i)=>`${attrChip(k)}<i style="width:${Math.min(100,num(r[9+i])*11)}%;background:#${ATTR_BG[k]}"></i><b>${r[9+i]}</b>`).join('')}</div></div>
    <div>${hab.map(x=>`<div class="fx-box"><b>${esc(x)}</b> — ${esc(habMap.get(x)||'')}</div>`).join('')}</div></div></div>`;
}
function setVis(ids,on,uid){ if(!isMaster()||!S.canWrite) return;
  if(uid){ const set=(S.visJ[uid] ||= new Set()); ids.forEach(id=>on?set.add(id):set.delete(id)); }
  else ids.forEach(id=>{ if(on) S.vis.add(id); else { S.vis.delete(id); for(const st of Object.values(S.visJ)) st.delete(id); } });
  saveVis(); }
/* Generador */
function genPool(){
  const g=T.g; const R=ri(g.rango);
  return D.dex.filter(r=>{ if(!(isMaster()||visFor(r[0]))) return false; if(ri(r[6])>R) return false;
    const ts=dexTypes(r);
    if(g.t1&&g.t2){ if(!(ts.includes(g.t1)&&ts.includes(g.t2))) return false; }
    else if(g.t1||g.t2){ if(!ts.includes(g.t1||g.t2)) return false; }
    if(g.region&&r[18]!==g.region) return false; return true; });
}
function pickMove(level,cls,types,taken,stab){
  const isCls=a=>cls==='FE'?(a[3]==='Fisico'||a[3]==='Especial'):a[3]==='Estado';
  const ok=a=>a[0]!=='M0000'&&!taken.has(a[0])&&isCls(a);
  const Lv=ri(level);
  const tries= stab ? [ a=>a[5]===level&&types.includes(a[2]) ]
    : [ a=>a[5]===level&&a[2]!=='Sin Tipo', a=>ri(a[5])<=Lv&&ri(a[5])>=Lv-1 ];
  for(const t of tries){ const pool=D.atk.filter(a=>ok(a)&&t(a)); if(pool.length){ const m=pick(pool); taken.add(m[0]); return m[0]; } }
  return '';
}
function generate(){
  const pool=genPool(); if(!pool.length){ T.gen={error:'Ninguna especie cumple esos filtros'+(isMaster()?'.':' entre las desbloqueadas.')}; return; }
  const sp=pick(pool); const R=ri(T.g.rango); const types=dexTypes(sp);
  const attr=blankAttr(); const lv={}; ATTR.forEach(k=>lv[k]=0);
  for(let p=0;p<ATTR_PTS[R];p++){ const can=ATTR.filter(k=>lv[k]<R+1); if(!can.length) break; lv[pick(can)]++; }
  ATTR.forEach(k=>attr[k].r=lv[k]?RANGOS[lv[k]-1]:'');
  const taken=new Set(); const L=i=>RANGOS[i];
  const plan=[[['OR','FE'],[L(0),'FE'],[L(0),'Est']],[['OR','FE'],[L(1),'FE'],[L(0),'Est']],[['OR','FE'],[L(2),'FE'],[L(2),'Est'],[L(1),'FE']],
    [['OR','FE'],[L(3),'FE'],[L(3),'FE'],[L(3),'Est'],[L(2),'Est']],[['OR','FE'],[L(4),'FE'],[L(4),'FE'],[L(4),'Est'],[L(4),'Est'],[L(2),'FE']],
    [[L(5),'FE'],[L(5),'FE'],[L(5),'FE'],[L(5),'FE'],[L(5),'Est'],[L(5),'Est']]][R];
  const moves=plan.map(([lvl,cls])=> lvl==='OR'? pickMove(L(R+1),'FE',types,taken,true) : pickMove(lvl,cls,types,taken,false)).filter(Boolean);
  while(moves.length<6) moves.push('');
  const hab=[...new Set([sp[15],sp[16],sp[17]].filter(x=>x&&x!=='-'))];
  T.gen={f:newPokemon({especie:sp[0],rango:T.g.rango,nat:pick(D.nat)[0],attr,moves,habilidad:pick(hab)||''})};
}
function toolGen(){
  const g=T.g; const n=genPool().length;
  let h=`<div class="card"><h2>Generador de Pokémon</h2><div class="grid g4">
    <label class="f">Rango<select data-g="rango">${opts(RANGOS,g.rango)}</select></label>
    <label class="f">Tipo 1<select data-g="t1">${opts(D.types,g.t1,'Cualquiera')}</select></label>
    <label class="f">Tipo 2<select data-g="t2">${opts(D.types,g.t2,'Cualquiera')}</select></label>
    <label class="f">Región<select data-g="region">${opts(D.regions,g.region,'Todas')}</select></label></div>
    <div class="row" style="margin-top:10px"><button class="btn pri" id="g-go">Generar</button><span class="note">${n} especies posibles${isMaster()?'':' (solo las desbloqueadas)'}. Con un tipo, sirve como primario o secundario; con dos, debe tener ambos.</span></div>
    <p class="note">Especies de Rango igual o menor al elegido. Reparte ${ATTR_PTS[ri(g.rango)]} puntos de Atributo con techo ${esc(g.rango)}, elige naturaleza y habilidad al azar, y arma los movimientos con la distribución sugerida: el OverRanked es de su tipo (con STAB) y el resto son de tipos al azar.</p></div>`;
  if(T.gen?.error) h+=`<div class="card"><p class="ko">${esc(T.gen.error)}</p></div>`;
  else if(T.gen?.f){ const f=T.gen.f, c=calc(f), dx=dexById.get(f.especie), nat=natMap.get(f.nat);
    h+=`<div class="card"><h2>${esc(dexLabel(dx))} <span class="row">${c.tipos.map(chip).join(' ')}<span class="pill">${esc(dx[18])}</span></span></h2>
      <div class="stats"><div class="stat"><div class="k">Rango</div><div class="v">${rankChip(f.rango)}</div></div><div class="stat"><div class="k">PS</div><div class="v">${c.ps}</div></div><div class="stat"><div class="k">Iniciativa</div><div class="v">${c.ini}</div></div><div class="stat"><div class="k">Naturaleza</div><div class="v" style="font-size:16px">${esc(f.nat)}</div><div class="x">+${nat[2]} −${nat[3]} ${socialChip(nat[1])}</div></div><div class="stat"><div class="k">Habilidad</div><div class="v" style="font-size:16px">${esc(f.habilidad)}</div></div></div>
      <div class="tw" style="margin-top:10px"><table><thead><tr>${ATTR.map(k=>`<th>${k}</th>`).join('')}</tr></thead><tbody><tr>${ATTR.map(k=>`<td class="tot" style="text-align:left">${c.A[k]} <span class="note">${f.attr[k].r?CODE[f.attr[k].r]:''}</span></td>`).join('')}</tr></tbody></table></div>
      <div class="res" style="margin-top:10px">${f.moves.filter(Boolean).map(id=>{const mi=moveInfo(f,id,c); const m=mi.m; return `<div class="r"><div><b>${esc(m[1])}</b> ${chip(m[2])} ${claseChip(m[3])} ${rankChip(m[5])}${ri(m[5])===ri(f.rango)+1?' <span class="pill">OverRanked</span>':''}</div><span class="pill">${mi.dice==='-'?'—':mi.dice+' + '+mi.atr}</span></div>`}).join('')}</div>
      <div class="row" style="margin-top:10px">${S.canWrite?(isMaster()?'<button class="btn pri" data-act="genSave" data-to="salvaje">Guardar como salvaje</button>':'')+'<button class="btn" data-act="genSave" data-to="suelto">Guardar en Mis fichas</button>':''}<button class="btn" id="g-go2">Otro</button></div></div>`; }
  return h;
}
function toolDados(){
  return `<div class="card"><h2>Dados</h2><div class="row">${['1d100','1d20','1d4','1d6','1d8','1d10','2d6'].map(x=>`<button class="btn" data-dice="${x}">${x}</button>`).join('')}</div>
  <div class="row" style="margin-top:10px"><label class="f" style="flex:1">Expresión<input id="dexpr" placeholder="3d6+2" value=""></label><button class="btn pri" id="droll" style="align-self:end">Tirar</button></div>
  <div class="row" style="margin-top:10px"><label class="f">Daño (1–24)<input type="number" id="ddmg" min="1" max="24" value="6"></label><span id="ddmgout" class="pill" style="align-self:end">${dice(6)}</span><button class="btn" id="ddmgroll" style="align-self:end">Tirar ese dado</button></div></div>
  <div class="card"><h2>Historial de la mesa</h2>${histHTML(40)}</div>`;
}
function rollExpr(s){
  s=s.replace(/\s+/g,'').toLowerCase(); if(!/^[0-9d+\-]+$/.test(s)) return null;
  let tot=0, parts=[];
  for(const tok of s.match(/[+\-]?[^+\-]+/g)||[]){ const sg=tok[0]==='-'?-1:1; const t=tok.replace(/^[+\-]/,'');
    if(t.includes('d')){ const [n,f]=t.split('d').map(Number); if(!(f>0)||(n||1)>100) return null; const r=rollDice(`${n||1}d${f}`); tot+=sg*r.t; parts.push(`${sg<0?'−':''}${t}[${r.r.join(',')}]`); }
    else { tot+=sg*Number(t); parts.push(`${sg<0?'−':'+'}${t}`); } }
  return {txt:`${s}: ${parts.join(' ')}`,tot};
}
function bindTool(){
  const on=(id,ev,fn)=>{const e=document.getElementById(id); if(e) e.addEventListener(ev,fn);};
  on('t-atk','change',e=>{T.atk=e.target.value;T.mv='';T.roll=null;renderSheet();});
  on('t-mv','change',e=>{T.mv=e.target.value;T.roll=null;renderSheet();});
  on('t-ex','change',e=>{T.ex=num(e.target.value);renderSheet();});
  on('t-roll','click',()=>{doRoll();renderSheet();});
  on('t-addriv','click',()=>{T.riv.push({k:'',t1:'',t2:'',vit:0,sab:0}); renderSheet();});
  document.querySelectorAll('[data-rmriv]').forEach(b=>b.addEventListener('click',()=>{T.riv.splice(num(b.dataset.rmriv),1); T.roll=null; renderSheet();}));
  on('t-tie','click',()=>{doTie();renderSheet();});
  document.querySelectorAll('[data-riv]').forEach(el=>el.addEventListener('change',e=>{const [i,k]=e.target.dataset.riv.split('.'); T.riv[i][k]=e.target.type==='number'?num(e.target.value):e.target.value; renderSheet();}));
  document.querySelectorAll('[data-ini]').forEach(el=>el.addEventListener('change',e=>{const k=e.target.dataset.ini; e.target.checked?T.ini.add(k):T.ini.delete(k); renderSheet();}));
  document.querySelectorAll('[data-fl]').forEach(el=>el.addEventListener('change',e=>{T.fl[e.target.dataset.fl]=e.target.value; renderSheet();}));
  document.querySelectorAll('[data-dfl]').forEach(el=>el.addEventListener('change',e=>{T.dfl[e.target.dataset.dfl]=e.target.value; T.dpage=0; renderSheet();}));
  document.querySelectorAll('[data-msort]').forEach(b=>b.addEventListener('click',()=>{ const c=b.dataset.msort; if(T.msort.col!==c) T.msort={col:c,dir:1}; else T.msort.dir=T.msort.dir===1?-1:T.msort.dir===-1?0:1; renderSheet(); }));
  document.querySelectorAll('[data-g]').forEach(el=>el.addEventListener('change',e=>{T.g[e.target.dataset.g]=e.target.value; renderSheet();}));
  on('g-go','click',()=>{generate();renderSheet();}); on('g-go2','click',()=>{generate();renderSheet();});
  on('mq','change',e=>{T.q=e.target.value;renderSheet();});
  on('dq','change',e=>{T.dq=e.target.value;T.dpage=0;renderSheet();});
  const quien=()=> (S.players[S.uid]?.alias||S.me?.name||'Dados');
  document.querySelectorAll('[data-dice]').forEach(b=>b.addEventListener('click',()=>{const r=rollExpr(b.dataset.dice); logRoll(quien(),r.txt,r.tot);}));
  on('droll','click',()=>{const v=$('#dexpr').value; const r=rollExpr(v); if(!r){ $('#dexpr').setCustomValidity('Usa el formato 2d6+3'); $('#dexpr').reportValidity(); return;} logRoll(quien(),r.txt,r.tot);});
  on('ddmg','input',e=>{$('#ddmgout').textContent=dice(clamp(num(e.target.value),1,24));});
  on('ddmgroll','click',()=>{const n=clamp(num($('#ddmg').value),1,24); const r=rollExpr(dice(n)); logRoll(quien(),'Daño '+n+' → '+r.txt,r.tot);});
}

/* ---------- combate ---------- */
const PEN={Starter:0,Beginner:10,Amateur:20,Elite:30,Master:40,Legend:40};
const CB={exists:false,parts:[],snaps:{},ties:{},last:null,lastFx:{},ronda:0,rondaLog:null};
const CBU={atk:'',mv:'',bon:{},picking:false,targets:[],colFor:''};
let cbChain=Promise.resolve();
function cbWrite(fields,full){
  for(const [k,v] of Object.entries(fields)){ if(!full&&['snaps','ties','lastFx'].includes(k)) CB[k]={...CB[k],...v}; else CB[k]=v; }
  cbChain=cbChain.then(async()=>{ try{
      const ref=S.db.doc('combate/actual');
      if(full||!CB.exists){ await ref.set({parts:CB.parts,snaps:CB.snaps,ties:CB.ties,last:CB.last,lastFx:CB.lastFx,ronda:num(CB.ronda),rondaLog:CB.rondaLog||null}); CB.exists=true; }
      else await ref.update(fields);
      setStatus('Guardado');
    }catch(e){ onWriteError(e); } });
}
const snapOf=f=>{ const o=structuredClone(f); delete o.img; return o; };
const inCombat=k=>CB.parts.includes(k);
function combatant(k){ if(!k) return null; const [src,uid,id]=k.split('|'); const ref={src,uid:uid||null,id};
  let f = src==='master' ? (isMaster()? S.master[id] : CB.snaps[k]) : (S.fichas[uid]||{})[id];
  return f?{...ref,key:k,f}:null; }
function ownerLabel(x){ return x.src==='master'?'Master':(S.players[x.uid]?.alias||''); }
function saveFicha(ref,f){
  putF(ref,f);
  if(S.open&&S.open.src===ref.src&&S.open.id===ref.id) S.cur=structuredClone(f);
  queueSave(pathOf(ref),structuredClone(f),250);
  const k=refKey(ref); if(ref.src==='master'&&inCombat(k)) cbWrite({snaps:{[k]:snapOf(f)}});
}
/* Guarda una ficha en combate aunque sea de otro jugador o del Master (colisión, residuales, efectos) */
function saveAny(x,f){
  if(canEditRef(x)){ saveFicha(x,f); return; }
  if(!S.canWrite||!inCombat(x.key)) return;
  if(x.src==='master') cbWrite({snaps:{[x.key]:snapOf(f)}}); else putF(x,f);
  if(S.open&&S.open.src===x.src&&S.open.id===x.id) S.cur=structuredClone(f);
  const sb=window.__sb; if(!sb) return;
  setStatus('Guardando…');
  sb.rpc('guardar_ficha_combate',{fid:x.id,nueva:snapOf(f)}).then(({error})=>{ if(error) onWriteError({code:'invalid_argument',message:error.message}); else setStatus('Guardado'); });
}
function mutate(key,fn){ const x=combatant(key); if(!x) return null; const f=structuredClone(x.f); const out=fn(f); saveAny(x,f); return out; }
function canGlove(x){ if(!S.canWrite||!x) return false; return isMaster() || (x.src==='jug'&&x.uid===S.uid); }
function toggleGlove(k){
  const [src,uid,id]=k.split('|'); if(!canGlove({src,uid:uid||null,id})) return;
  let parts=[...CB.parts], snaps={...CB.snaps};
  if(parts.includes(k)){ parts=parts.filter(x=>x!==k); delete snaps[k]; }
  else { parts.push(k); const c=combatant(k); if(c&&c.src==='master') snaps[k]=snapOf(c.f); }
  if(isMaster()) cbWrite({parts,snaps},true); else cbWrite({parts});
  render();
}
function gloveBtn(k){ const on=inCombat(k); return `<button class="glove" data-glove="${esc(k)}" aria-pressed="${on}" title="${on?'Quitar del combate':'Agregar al combate'}" aria-label="${on?'Quitar del combate':'Agregar al combate'}">🥊</button>`; }
function combatants(){ return CB.parts.map(combatant).filter(Boolean); }
const iAmIn=()=> isMaster() || CB.parts.some(k=>k.startsWith(`jug|${S.uid}|`));
function cbOrder(){ return combatants().map(x=>({x,c:calc(x.f)})).sort((a,b)=>b.c.ini-a.c.ini||(CB.ties[b.x.key]||0)-(CB.ties[a.x.key]||0)); }
function targetMode(m){ const b=m[9], dist=String(m[10]);
  if(b==='Usuario'||dist==='Propio') return 'none';
  if(['Area','Oponentes','Equipo','Campo','Aliados'].includes(b)) return 'multi';
  return 'single'; }
const hasCat=(m,c)=>String(m[13]||'').split(/[;,]\s*/).map(x=>x.trim().toLowerCase()).includes(c.toLowerCase());
function repOf(f,mv){ return f.rep&&f.rep.mv===mv?num(f.rep.n):0; }
function attackInfo(x,mv){
  const f=x.f, c=calc(f), mi=moveInfo(f,mv,c); if(!mi) return null;
  const n=repOf(f,mv), rec=hasCat(mi.m,'Recurrente');
  const pen = rec?0:n*(PEN[mi.m[5]]||0);
  const prec=clamp(mi.prec-pen,0,100);
  let ic=clamp(num(f.ic)+(hasCat(mi.m,'Preciso')?1:0),0,5);
  let critR=D.crit[ic]; let reR=typeof mi.m[12]==='number'?mi.m[12]:null;
  if(c.em.noCrit){ critR=0; if(reR!==null) reR=0; }
  return {f,c,mi,n,rec,pen,prec,ic,critR,reR};
}

/* ---------- efectos automáticos de los movimientos ---------- */
const EST_NAMES=D.estados.map(e=>e[0]);
const EST_RX=new RegExp('\\b('+EST_NAMES.join('|')+')\\b','g');
const FX_CACHE=new Map();
function parseFx(m){
  if(FX_CACHE.has(m[0])) return FX_CACHE.get(m[0]);
  const ops=[]; const txt=String(m[11]||'');
  for(let s of txt.split(/(?<=\.)\s+/)){ s=s.trim(); if(!s) continue;
    if(/^(Si |Con |Requiere|Mientras|Durante|Tras usarlo|El siguiente|Cuando|Debe |Usa |Cancela|Esparce|Planta |Como |Cura |Evita|Ignora|Los movimientos)/i.test(s)) continue;
    if(/(cada ronda|por cada|cada vez|al final de|en su lugar|según|a quien|\bsi (el|la|es|hay|en)\b|hasta el final|siguiente ronda|por punto|durante \d)/i.test(s)) continue;
    const both=/(al Blanco y al usuario|incluido el usuario)/i.test(s);
    const self=!both&&/(al usuario|del usuario|su Precisi[oó]n|a s[ií] mismo)/i.test(s)&&!/(al rival|al Blanco|del rival|a todos los rivales)/i.test(s);
    if(!self&&!both&&/\ba sus aliados\b/i.test(s)) continue;
    const who=both?'both':self?'self':'target';
    const puede=/\b[Pp]uede\b/.test(s);
    if(/(Inflige|inflige|[Pp]uede causar)/.test(s)){ const names=[...new Set(s.match(EST_RX)||[])]; if(names.length) ops.push({k:'est',names,rand:/al azar/i.test(s),who,ch:'re'}); }
    const at={}; let mm; const rx=/([+-])(\d+)\s+(FUE|VIT|ENE|SAB|DES|CAR)\b/g;
    while((mm=rx.exec(s))) at[mm[3]]=(at[mm[3]]||0)+(mm[1]==='-'?-1:1)*Number(mm[2]);
    if((mm=/\+(\d+) a todos los atributos/.exec(s))) ATTR.forEach(k=>at[k]=(at[k]||0)+Number(mm[1]));
    if((mm=/\+(\d+) a un atributo al azar/.exec(s))) at.__rand=Number(mm[1]);
    if(Object.keys(at).length) ops.push({k:'attr',at,who,ch:puede?'re':'always'});
    if((mm=/(Reduce|reduce|reducir|Aumenta|aumenta|aumentar)[^.]*?Precisi[oó]n[^.]*?en (\d+)\s*%/.exec(s))){ const v=Math.max(1,Math.round(Number(mm[2])/5))*(/^[Rr]educ/.test(mm[1])?-1:1); ops.push({k:'prec',v,who:/del rival/.test(s)?'target':who,ch:puede?'re':'always'}); }
    if((mm=/Evasi[oó]n del rival en (\d+)\s*%/.exec(s))) ops.push({k:'bev',v:-Math.max(1,Math.round(Number(mm[1])/15)),who:'target',ch:puede?'re':'always'});
    if((mm=/\(\+(\d+) al bono de Evasi[oó]n\)/i.exec(s))) ops.push({k:'bev',v:Number(mm[1]),who:'self',ch:'always'});
  }
  FX_CACHE.set(m[0],ops); return ops;
}
function setEstFx(f,cls,meta){ f.estFx={...(f.estFx||{})}; if(meta) f.estFx[cls]={r:meta.r||'Starter',by:meta.by||'',n:0,pr:0}; else delete f.estFx[cls]; }
function giveEstado(f,name,ctx,force){
  const e=estMap.get(name); if(!e) return '';
  const cls=e[2]==='Fisico'?'F':'M', field=cls==='F'?'estF':'estM';
  if(estImmune(f,name)) return `inmune a ${name}`;
  if(f[field]&&!force) return f[field]===name?`ya estaba ${name}`:`ya tiene ${f[field]}, no se aplica ${name}`;
  const prev=f[field]; f[field]=name; setEstFx(f,cls,{r:ctx.rank,by:ctx.by});
  return prev&&prev!==name?`${name} (reemplaza a ${prev})`:name;
}
/* Aplica los efectos de un movimiento a una ficha. role: 'target' o 'self' */
function applyOps(f,ops,role,ctx){
  const notes=[];
  for(const op of ops){
    if(!(role==='all'||op.who===role||op.who==='both')) continue;
    if(op.ch==='re'&&!ctx.re) continue;
    if(op.k==='est'){ const n=op.rand?pick(op.names):op.names[0]; const t=giveEstado(f,n,ctx,false); if(t) notes.push(t); }
    else if(op.k==='attr'){ const at={...op.at}; if(at.__rand){ at[pick(ATTR)]=(at[pick(ATTR)]||0)+at.__rand; delete at.__rand; }
      f.attr ||= blankAttr();
      for(const [k,v] of Object.entries(at)){ if(!ATTR.includes(k)) continue; f.attr[k] ||= {r:'',b:0}; const b0=num(f.attr[k].b); const b1=clamp(b0+v,-6,6); f.attr[k].b=b1; if(b1!==b0) notes.push(`${b1-b0>0?'+':''}${b1-b0} ${k} (bono ${b1>0?'+':''}${b1})`); else notes.push(`${k} ya está en el tope (${b0>0?'+':''}${b0})`); } }
    else if(op.k==='prec'){ const p0=num(f.prec), p1=clamp(p0+op.v,-6,6); f.prec=p1; notes.push(`Precisión ${p1-p0>0?'+':''}${(p1-p0)*5}% (mod ${p1>0?'+':''}${p1})`); }
    else if(op.k==='bev'){ const b0=num(f.bEv), b1=clamp(b0+op.v,-3,3); f.bEv=b1; notes.push(`Bono de Evasión ${b1>0?'+':''}${b1}`); }
  }
  return notes;
}
function critEstado(m){ return D.estados.find(e=>e[1]===m[2])?.[0]||''; }

/* ---------- orden de iniciativa y rondas ---------- */
function cbOrderHTML(){
  const ord=cbOrder(); const tied=ord.filter(a=>ord.some(b=>b!==a&&b.c.ini===a.c.ini));
  let h=`<div class="card"><h2><span>Orden de iniciativa <span class="ronda">Ronda ${num(CB.ronda)}</span></span><span class="row">${tied.length?'<button class="btn sm" data-cb="tie">Desempatar con 1d20</button>':''}${isMaster()&&CB.parts.length?'<button class="btn sm danger" data-cb="end">Terminar combate</button><span id="endConfirm"></span>':''}${CB.parts.length&&S.canWrite&&iAmIn()?'<button class="btn sm pri" data-cb="round">Finalizar Ronda</button><span id="roundConfirm"></span>':''}</span></h2>`;
  if(!ord.length) return h+`<p class="note">${isMaster()?'Agrega combatientes con el guante 🥊 junto a cada personaje en Mesa o en Master.':'Nadie entró al combate todavía. Usa el guante 🥊 junto a tus personajes (en Mis fichas o en Mesa) para entrar.'}</p></div>`;
  h+=`<div class="res">`+ord.map(({x,c},i)=>{ const r=c.ps?clamp(c.act/c.ps,0,1):0; const ests=[x.f.estF,x.f.estM].filter(Boolean).map(e=>{const er=estMap.get(e); const cls=er&&er[2]==='Fisico'?'F':'M'; const fx=(x.f.estFx||{})[cls]; return er?badge(e+(fx&&num(fx.n)?` ·${fx.n}`:''),TYPE_BG[er[1]]||'CCCCCC'):''}).join(' ');
    return `<div class="r cbrow"><div style="min-width:0"><b>${i+1}. ${esc(charName(x.f))}</b> <span class="note">${esc(ownerLabel(x))}</span> ${c.tipos.map(chip).join(' ')} ${ests}
      <div class="psbar" style="max-width:260px"><i style="width:${r*100}%;background:${r<.25?'var(--bad)':r<.5?'var(--warn)':'var(--good)'}"></i></div>
      <div class="note">PS ${c.act}/${c.ps} · Esquiva ${pct(c.esq)} (${num(x.f.cEsq)}) · Temple ${pct(c.tem)} (${num(x.f.cTem)}) · Vel ${c.vel} ft</div></div>
      <div style="text-align:right"><span class="big">${Number.isInteger(c.ini)?c.ini:c.ini.toFixed(1)}</span>${tied.some(t=>t.x===x)?`<div><span class="pill">${CB.ties[x.key]?'d20: '+CB.ties[x.key]:'empate'}</span></div>`:''}${canGlove(x)?`<div><button class="btn sm" data-glove="${esc(x.key)}">Quitar</button></div>`:''}</div></div>`; }).join('')+`</div>
    <p class="note">Iniciativa = Velocidad ÷ 5 + DES + SAB (+ Talento del Entrenador). Los empates se definen con 1d20. «Finalizar Ronda» aplica el daño residual, tira las Salvaciones y quita los estados superados.</p>`;
  const RL=CB.rondaLog; if(RL&&RL.lines) h+=`<details class="rlog" open><summary>Fin de la ronda ${num(RL.n)-1}</summary><div class="steps-res">${RL.lines.map(l=>`<div class="${l.k||''}">${esc(l.t)}</div>`).join('')||'<div>Nadie tenía estados alterados.</div>'}</div></details>`;
  return h+`</div>`;
}
async function endRound(){
  if(!CB.parts.length||!S.canWrite||!iAmIn()) return;
  const cur=num(CB.ronda); const sb=window.__sb;
  if(sb){ const {data,error}=await sb.rpc('avanzar_ronda',{esperada:cur}); if(error){ onWriteError({code:'invalid_argument'}); return; } if(!data){ showBanner('Otra persona ya terminó esta ronda. Revisa el resumen.'); return; } }
  CB.ronda=cur+1;
  const lines=[], heals=[];
  for(const x of combatants()){
    const f=structuredClone(x.f); let changed=false; const name=charName(f);
    for(const cls of ['F','M']){ const field=cls==='F'?'estF':'estM'; const est=f[field]; if(!est) continue; const e=estMap.get(est); if(!e) continue;
      const fx={r:f.rango||'Starter',n:0,pr:0,...((f.estFx||{})[cls]||{})};
      if(estImmune(f,est)){ f[field]=''; setEstFx(f,cls,null); changed=true; lines.push({k:'ok',t:`${name}: es inmune a ${est} por su tipo; se quita.`}); continue; }
      if(e[4]==='-'||e[4]===''||e[4]==null){ f[field]=''; setEstFx(f,cls,null); changed=true; lines.push({k:'ok',t:`${name}: ${est} termina.`}); continue; }
      const th=num(e[4])+num(e[5])*num(fx.n);
      if(th>=100){ f[field]=''; setEstFx(f,cls,null); changed=true; lines.push({k:'ok',t:`${name}: su Salvación de ${est} llegó a ${th}; se libera sin residual.`}); continue; }
      if(/Residual/i.test(e[3])){ const poison=est==='Envenenado'; const idx=clamp(ri(fx.r)+(poison?1+num(fx.pr):2),1,24); const dd=dice(idx); const rl=rollDice(dd);
        f.dano=num(f.dano)+rl.t; changed=true;
        lines.push({k:'ko',t:`${name}: residual de ${est} (${fx.r}${poison?`, ronda ${num(fx.pr)+1}`:''}) ${dd} [${rl.r.join(', ')}] = ${rl.t} de daño.`});
        if(est==='Drenado'&&fx.by&&fx.by!==x.key&&inCombat(fx.by)) heals.push({key:fx.by,val:rl.t,from:name});
        if(poison) fx.pr=num(fx.pr)+1; }
      const r=d(100);
      if(r<=th){ f[field]=''; setEstFx(f,cls,null); lines.push({k:'ok',t:`${name}: Salvación de ${est} d100 [${r}] ≤ ${th} → se libera.`}); }
      else { fx.n=num(fx.n)+1; f.estFx={...(f.estFx||{}),[cls]:fx}; lines.push({k:'',t:`${name}: Salvación de ${est} d100 [${r}] > ${th} → sigue (próxima: ${Math.min(100,th+num(e[5]))}).`}); }
      changed=true; }
    if(changed) saveAny(x,f);
  }
  for(const hl of heals){ mutate(hl.key,f=>{ f.dano=Math.max(0,num(f.dano)-hl.val); }); const t=combatant(hl.key); lines.push({k:'ok',t:`${t?charName(t.f):'Quien lo causó'} recupera ${hl.val} PS por el Drenado de ${hl.from}.`}); }
  CB.rondaLog={n:CB.ronda,lines};
  cbWrite({ronda:CB.ronda,rondaLog:CB.rondaLog});
  logRoll('Fin de ronda',`Ronda ${cur} terminada${lines.length?' · '+lines.map(l=>l.t).join(' · '):' · sin estados'}`,null);
  renderSheet();
}

/* ---------- atacar ---------- */
function cbAttackHTML(){
  const mine=combatants().filter(x=>canEditRef(x));
  let h=`<div class="card"><h2>Atacar</h2>`;
  if(!mine.length) return h+`<p class="note">No controlas a ningún combatiente.</p></div>`;
  if(!mine.some(x=>x.key===CBU.atk)){ CBU.atk=mine[0].key; CBU.mv=''; CBU.picking=false; }
  const x=combatant(CBU.atk); const mvs=(x.f.moves||[]).filter(Boolean);
  h+=`<div class="grid g3"><label class="f">Personaje<select data-cbf="atk">${mine.map(y=>`<option value="${esc(y.key)}"${y.key===CBU.atk?' selected':''}>${esc(charName(y.f))} · ${esc(ownerLabel(y))}</option>`).join('')}</select></label></div>`;
  if(!mvs.length) return h+`<p class="note">Este personaje no tiene movimientos.</p></div>`;
  h+=`<div class="mvlist">`;
  for(const id of mvs){ const ai=attackInfo(x,id); if(!ai) continue; const m=ai.mi.m; const on=CBU.picking&&CBU.mv===id; const mode=targetMode(m);
    h+=`<div class="mvrow${on?' on':''}"><div class="mvhead"><button class="mvname" data-cb="pick" data-mv="${id}" title="Atacar con ${esc(m[1])}">${esc(m[1])}</button>
        <label class="mini" title="Bonus a la Clase de Dado">CD <input type="number" data-cbf="bonus" data-mv="${id}" value="${num(CBU.bon[id])}" aria-label="Bonus CD de ${esc(m[1])}"></label>
        <label class="mini" title="Repeticiones seguidas">Rep. <input type="number" min="0" data-cbf="rep" data-mv="${id}" value="${ai.n}" aria-label="Repeticiones de ${esc(m[1])}"></label></div>
      <div class="mvdata">${chip(m[2])} ${claseChip(m[3])} <span>Prec <b>${ai.prec}%</b>${ai.pen?` <span class="ko">(−${ai.pen})</span>`:''}</span><span>CD <b>${ai.mi.dice==='-'?'—':ai.mi.dice}</b></span><span>Prio <b>${num(m[8])>0?'+':''}${num(m[8])}</b></span><span>${esc(m[10])}</span>${m[14]&&m[14]!=='-'?socialChip(m[14]):''}</div>
      <div class="mvfx">${esc(m[11])}${ai.reR!==null?`<div class="re">R. Extra <b>${pct(ai.reR)}</b></div>`:''}</div>`;
    if(on){ const others=combatants().filter(y=>y.key!==x.key);
      h+=`<div class="mvpick">${mode==='none'?'':`<div class="note">${mode==='single'?'Elige el objetivo':'Elige los objetivos'}</div><div class="grid g2" style="margin-top:6px">${others.map(y=>`<label class="row" style="gap:6px"><input type="${mode==='single'?'radio':'checkbox'}" name="cbt" data-cbt="${esc(y.key)}" ${CBU.targets.includes(y.key)?'checked':''}> ${esc(charName(y.f))} <span class="note">${esc(ownerLabel(y))}</span></label>`).join('')||'<p class="note">No hay otros combatientes.</p>'}</div>`}
        <div class="row" style="margin-top:8px"><button class="btn pri" data-cb="roll" ${mode!=='none'&&!CBU.targets.length?'disabled':''}>Lanzar dados</button><button class="btn" data-cb="cancel">Cancelar</button></div></div>`; }
    h+=`</div>`; }
  return h+`</div><p class="note">Clic en el nombre de un movimiento para atacar con él. La Precisión ya descuenta las repeticiones.</p></div>`;
}
function rollDamage(ai,target,crit,bonus){
  const m=ai.mi.m; const tc=calc(target.f); const heal=hasCat(m,'Curacion')&&!hasCat(m,'Drenaje');
  const isNum=typeof m[7]==='number'&&m[7]>0;
  if(heal){ if(!isNum) return {heal:true,val:null,det:'Sin dado'}; const idx=clamp(m[7]+ai.mi.stab+num(bonus),1,24); const dd=dice(idx); const rl=rollDice(dd); let v=rl.t+(ai.mi.atr||0); if(crit) v*=2; return {heal:true,val:v,det:`${dd} [${rl.r.join(', ')}] + ${ai.mi.atr||0}${crit?' × 2 (crítico)':''}`}; }
  const e=effectiveness(m[2],tc.tipos);
  if(e.immune) return {val:0,det:'Inmune',immune:true};
  if(!isNum){ if(m[3]==='Estado'&&crit){ const ak=short(m[4]); const v=ai.c.A[ak]||0; return {val:v,det:`Crítico de Estado: daño igual a ${ak} (${v})`}; } return {val:null,det:'Sin daño'}; }
  const own=num(ai.c.em.cdOwn[deacc(m[2])]), recv=num(tc.em.cdRecv[deacc(m[2])]);
  const idx=clamp(m[7]+ai.mi.stab+e.steps+num(bonus)+own+recv,1,24); const dd=dice(idx); const rl=rollDice(dd);
  const def=m[3]==='Fisico'?tc.A.VIT:m[3]==='Especial'?tc.A.SAB:0;
  let v=Math.max(0,rl.t+ai.mi.atr-def); if(crit) v*=2;
  const ex=[e.steps>0?`súper eficaz +${e.steps}`:e.steps<0?`poco eficaz ${e.steps}`:'',own?`estado propio ${own} CD`:'',recv?`estado del objetivo +${recv} CD`:''].filter(Boolean).join(', ');
  return {val:v,det:`${dd} [${rl.r.join(', ')}] + ${ai.mi.atr} ${ai.mi.ak}${def?' − '+def+(m[3]==='Fisico'?' VIT':' SAB'):''}${crit?' × 2 (crítico)':''}${ex?' · '+ex:''}`};
}
function doAttack(){
  const x=combatant(CBU.atk); if(!x||!canEditRef(x)) return; const mvId=CBU.mv; const ai=attackInfo(x,mvId); if(!ai) return; const m=ai.mi.m;
  const mode=targetMode(m); let tkeys=mode==='none'?[]:CBU.targets.slice();
  const bonus=num(CBU.bon[mvId]);
  const r=d(100); const steps=[]; const ts=Date.now();
  const hit=r<=ai.prec&&r!==100;
  steps.push({k:hit?'ok':'ko',t:`Precisión: d100 [${r}] contra ${ai.prec}% → ${hit?'conecta':'falla'}`});
  if(r===1) steps.push({k:'ok',t:'01 natural: +1 al Bono de Evasión y algo a decisión del Narrador.'});
  if(r===100) steps.push({k:'ko',t:'100: fallo crítico, −1 al Bono de Evasión y algo a decisión del Narrador.'});
  let go=hit, crit=false, re=false;
  if(go){ for(const cn of ai.c.em.cancel){
      if(cn.kind==='aturdido'){ steps.push({k:'ko',t:`${cn.est}: pierde su Acción.`}); go=false; break; }
      if(r>cn.thr){ if(cn.kind==='pierde'){ steps.push({k:'ko',t:`${cn.est}: la tirada (${r}) supera ${cn.thr}, pierde la acción.`}); go=false; break; }
        if(cn.kind==='self'){ steps.push({k:'wa',t:`${cn.est}: la tirada (${r}) supera ${cn.thr}, el ataque cambia de objetivo hacia sí mismo.`}); tkeys=[x.key]; }
        if(cn.kind==='causante') steps.push({k:'wa',t:`${cn.est}: la tirada (${r}) supera ${cn.thr}, no puede atacar a quien se lo causó.`}); }
      else steps.push({k:'',t:`${cn.est}: la tirada (${r}) no supera ${cn.thr}, actúa con normalidad.`}); } }
  const res=[];
  const nf=structuredClone(x.f); nf.rep={mv:mvId,n:ai.n+1};
  let selfNow=false;
  if(go){ crit=r<=Math.round(ai.critR*100); steps.push({k:crit?'ok':'',t:`Crítico (${pct(ai.critR)}${hasCat(m,'Preciso')?', Preciso +1 IC':''}): ${crit?'¡sí!':'no'}`});
    if(ai.reR!==null){ re=r<=Math.round(ai.reR*100); steps.push({k:re?'ok':'',t:`Rango Extra ${pct(ai.reR)}: ${re?'se activa el efecto':'no se activa'}`}); }
    steps.push({k:'fx',t:`Efecto: ${m[11]}`});
    if(mode==='none'||!tkeys.length){
      const dr=rollDamage(ai,x,crit,bonus); if(dr.val!==null&&dr.heal) res.push({key:x.key,name:charName(x.f),...dr,selfMove:true});
      const notes=applyOps(nf,parseFx(m),'all',{re,rank:m[5],by:x.key});
      if(notes.length) steps.push({k:'ok',t:`Efectos en ${charName(x.f)}: ${notes.join(' · ')}`});
      selfNow=true; }
    else for(const k of tkeys){ const t=combatant(k); if(!t) continue; const dr=rollDamage(ai,t,crit,bonus);
      let est=''; if(crit&&!dr.heal){ const ce=critEstado(m); if(ce) est=estImmune(t.f,ce)?`Inmune a ${ce}`:`Crítico: aplica ${ce}`; }
      res.push({key:k,name:charName(t.f),...dr,est,kind:m[3]==='Estado'?'tem':'esq'}); }
  }
  saveFicha(x,nf);
  const last={ts,by:charName(x.f),byKey:x.key,mv:m[1],mvId,cls:m[3],rank:m[5],d100:r,prec:ai.prec,hit,crit,re,go,steps,res,selfDone:selfNow};
  CBU.picking=false; CBU.targets=[]; CBU.colFor='';
  CL.a=x.key; if(dmgMoves(x.f).includes(mvId)) CL.am=mvId; if(tkeys[0]&&tkeys[0]!==x.key){ CL.d=tkeys[0]; CL.dm=''; } CL.res=null;
  cbWrite({last});
  logRoll(charName(x.f),`${m[1]}: d100 [${r}] vs ${ai.prec}% · ${!hit?'falla':!go?'pierde la acción':crit?'crítico':'conecta'}${res.length?' · '+res.map(z=>`${z.name} ${z.heal?'+':''}${z.val??'—'}`).join(' · '):''}`,r);
  renderSheet();
}
/* El ataque conecta con un objetivo: daño (o curación), estado por crítico y efectos */
function connectHit(L,z,extra){
  const t=combatant(z.key); if(!t) return [];
  const A=combatant(L.byKey); const m=atkById.get(L.mvId); const ops=m?parseFx(m):[]; const ctx={re:!!L.re,rank:L.rank,by:L.byKey};
  const out=[];
  mutate(z.key,f=>{
    if(z.val){ if(z.heal) f.dano=Math.max(0,num(f.dano)-z.val); else f.dano=num(f.dano)+z.val; out.push(z.heal?`recupera ${z.val} PS`:`recibe ${z.val} de daño`); }
    if(z.selfMove) return;
    if(L.crit&&m&&!z.heal){ const ce=critEstado(m); if(ce){ const tx=giveEstado(f,ce,ctx,true); if(tx) out.push('crítico: '+tx); } }
    const n=applyOps(f,ops,'target',ctx); out.push(...n);
  });
  if(m&&hasCat(m,'Drenaje')&&!z.heal&&num(z.val)>0&&A){ const hv=Math.floor(num(z.val)/2); if(hv){ mutate(L.byKey,f=>{ f.dano=Math.max(0,num(f.dano)-hv); }); out.push(`${charName(A.f)} recupera ${hv} PS (Drenaje)`); } }
  if(!L.selfDone&&!z.selfMove&&A&&m){ const n=[]; mutate(L.byKey,f=>{ n.push(...applyOps(f,ops,'self',ctx)); }); if(n.length) out.push(`${charName(A.f)}: ${n.join(' · ')}`); L.selfDone=true; cbWrite({last:L}); }
  logRoll(charName(t.f),`${L.mv} de ${L.by}: ${out.join(' · ')||'sin efecto'}${extra?' · '+extra:''}`,z.val??null);
  return out;
}
function cbLastHTML(){
  const L=CB.last; if(!L) return '';
  let h=`<div class="card"><h2>Último ataque <span class="note" style="text-transform:none;letter-spacing:0">${esc(L.by)} · ${esc(L.mv)} · ${hhmm(L.ts)}</span></h2><div class="steps-res">${L.steps.map(s=>`<div class="${s.k==='fx'?'fx-box':s.k||''}">${esc(s.t)}</div>`).join('')}</div>`;
  if(L.res&&L.res.length) h+=`<div class="res" style="margin-top:10px">`+L.res.map(z=>{ const fk=`${L.ts}|${z.key}`; const fx=CB.lastFx[fk]||{}; const t=combatant(z.key); const can=t&&canEditRef(t)&&S.canWrite;
    const canCol=!z.heal&&L.cls!=='Estado'&&t&&dmgMoves(t.f).length>0&&z.key!==L.byKey;
    let btns='';
    if(can&&!fx.done){
      if(!z.heal&&z.kind) btns+=`<button class="btn sm" data-cb="evade" data-k="${esc(z.key)}">Evadir (${z.kind==='tem'?'Temple':'Esquiva'})</button>`;
      if(canCol) btns+=`<button class="btn sm" data-cb="col" data-k="${esc(z.key)}" aria-expanded="${CBU.colFor===fk}">Colisionar</button>`;
      btns+=`<button class="btn sm pri" data-cb="apply" data-k="${esc(z.key)}">${z.heal?'Aplicar curación':z.val?'Recibir':'Recibir efecto'}</button>`; }
    let colPick='';
    if(can&&!fx.done&&CBU.colFor===fk&&t){ colPick=`<div class="colpick"><div class="note">Elige el movimiento para colisionar (se tira su Precisión):</div><div class="row" style="margin-top:6px">${dmgMoves(t.f).map(id=>{ const ai=attackInfo(t,id); return ai?`<button class="btn sm" data-cb="colmv" data-k="${esc(z.key)}" data-mv="${id}">${esc(ai.mi.m[1])} <span class="note">${ai.prec}%${ai.pen?' (−'+ai.pen+')':''}</span></button>`:''; }).join('')}<button class="btn sm" data-cb="colno">Cancelar</button></div></div>`; }
    return `<div class="r"><div><div class="note">${z.heal?'Curación a':'Daño a'} ${esc(z.name)}${z.est?` · ${esc(z.est)}`:''}</div><div class="big ${fx.ev?'ko':''}">${z.val??'—'}</div><div class="note">${esc(z.det)}</div>${(fx.log||[]).map(l=>`<div class="${l.k||''}">${esc(l.t)}</div>`).join('')}</div>
      <div class="row" style="justify-content:flex-end;align-content:flex-start">${btns}</div>${colPick}</div>`; }).join('')+`</div>`;
  return h+`<p class="note">Cada defensor elige: <b>Evadir</b> (su d100 debe ser ≤ su Evasión y ≤ ${L.d100}), <b>Colisionar</b> con un movimiento de daño, o <b>Recibir</b>. Si no logra evitarlo, el daño y los efectos se aplican solos.</p></div>`;
}
function combatHTML(){ return cbOrderHTML()+cbAttackHTML()+cbLastHTML()+cbClashHTML(); }
/* ---------- colisión ---------- */
const CL={a:'',am:'',d:'',dm:'',ca:false,cd:false,res:null};
const dmgMoves=f=>(f.moves||[]).filter(id=>{ const m=atkById.get(id); return m&&m[3]!=='Estado'; });
function clashSize(dist){ const t=String(dist).toLowerCase();
  if(t.startsWith('contacto')) return {p:0,t:'Contacto'};
  if(/^(corta|lanzar|larga)/.test(t)) return {p:1,t:'A distancia, un objetivo'};
  if(/^(cono|l[ií]nea)/.test(t)||/^[áa]rea \(5/.test(t)) return {p:2,t:'Cono, Línea o Área (5 ft)'};
  if(/^[áa]rea \(15/.test(t)||t.startsWith('campo')) return {p:3,t:'Área (15 ft) o Campo'};
  return {p:0,t:`${dist}: sin puntos`}; }
function clashSide(x,mv,other,isAtk,crit){
  const c=calc(x.f), mi=moveInfo(x.f,mv,c); if(!mi) return null; const m=mi.m;
  const rows=[]; let tot=0; const add=(t,v)=>{ rows.push([t,v]); tot+=v; };
  if(isAtk) add('Ser el atacante',1);
  add(`Nivel ${m[5]}`,ri(m[5])+1);
  const sz=clashSize(m[10]); add(`Tamaño: ${sz.t}`,sz.p);
  const om=atkById.get(other); const e=om?effectiveness(m[2],[om[2]]):{steps:0,immune:false};
  if(e.immune) add(`${m[2]} contra ${om[2]}: sin efecto`,-4);
  else if(e.steps>0) add(`${m[2]} contra ${om[2]}: súper eficaz`,2);
  else if(e.steps<0) add(`${m[2]} contra ${om[2]}: poco eficaz`,-2);
  if(crit) add('Crítico',2);
  return {x,c,mi,m,rows,tot,ai:attackInfo(x,mv)};
}
function cbClashHTML(){
  const all=combatants();
  let h=`<div class="card"><h2>Calculadora de Colisión</h2>`;
  if(all.length<2) return h+`<p class="note">Se necesitan al menos dos combatientes.</p></div>`;
  if(!all.some(x=>x.key===CL.a)){ CL.a=all[0].key; CL.am=''; }
  if(CL.d===CL.a||!all.some(x=>x.key===CL.d)){ CL.d=(all.find(x=>x.key!==CL.a)||{}).key; CL.dm=''; }
  const A=combatant(CL.a), B=combatant(CL.d); const am=dmgMoves(A.f), bm=dmgMoves(B.f);
  if(!am.includes(CL.am)) CL.am=am.includes(A.f.rep?.mv)?A.f.rep.mv:(am[0]||''); if(!bm.includes(CL.dm)) CL.dm=bm.includes(B.f.rep?.mv)?B.f.rep.mv:(bm[0]||'');
  const who=(k,sel)=>all.map(y=>`<option value="${esc(y.key)}"${y.key===sel?' selected':''}${k==='d'&&y.key===CL.a?' disabled':''}>${esc(charName(y.f))} · ${esc(ownerLabel(y))}</option>`).join('');
  const mvo=(list,sel)=>list.map(id=>`<option value="${id}"${id===sel?' selected':''}>${esc(atkById.get(id)?.[1]||id)}</option>`).join('')||'<option value="">Sin movimientos de daño</option>';
  h+=`<div class="grid g2"><div class="grid g2"><label class="f">Atacante<select data-clf="a">${who('a',CL.a)}</select></label><label class="f">Movimiento atacante<select data-clf="am">${mvo(am,CL.am)}</select></label></div>
    <div class="grid g2"><label class="f">Defensor<select data-clf="d">${who('d',CL.d)}</select></label><label class="f">Movimiento defensivo<select data-clf="dm">${mvo(bm,CL.dm)}</select></label></div></div>
    <div class="row" style="margin-top:8px"><label class="row" style="gap:6px"><input type="checkbox" data-clf="ca" ${CL.ca?'checked':''}> Crítico del atacante</label><label class="row" style="gap:6px"><input type="checkbox" data-clf="cd" ${CL.cd?'checked':''}> Crítico del defensor</label></div>`;
  if(!CL.am||!CL.dm) return h+`<p class="note">Cada lado necesita un movimiento de daño (Físico o Especial) para colisionar.</p></div>`;
  const SA=clashSide(A,CL.am,CL.dm,true,CL.ca), SB=clashSide(B,CL.dm,CL.am,false,CL.cd);
  const diff=SA.tot-SB.tot, ad=Math.abs(diff); const win=diff>0?SA:diff<0?SB:null, lose=diff>0?SB:diff<0?SA:null;
  const avgIdx=Math.round((SA.mi.idx+SB.mi.idx)/2), avgDice=SA.mi.idx&&SB.mi.idx?dice(avgIdx):'—';
  const side=(S_,lbl)=>`<div class="side${win===S_?' win':''}"><div class="note">${lbl}</div><b>${esc(charName(S_.x.f))}</b> · ${esc(S_.m[1])} ${chip(S_.m[2])} ${rankChip(S_.m[5])}
    <div class="note">Repeticiones de ${esc(S_.m[1])}: ${S_.ai.n} · Precisión ${S_.ai.prec}%${S_.ai.pen?` (−${S_.ai.pen})`:''}</div>
    <table><tbody>${S_.rows.map(([t,v])=>`<tr><td>${esc(t)}</td><td>${v>0?'+':''}${v}</td></tr>`).join('')}<tr><td><b>Total</b></td><td><b>${S_.tot}</b></td></tr></tbody></table></div>`;
  h+=`<div class="clpts">${side(SA,'Atacante')}${side(SB,'Defensor')}</div>`;
  let out;
  if(!win) out=`<b>Empate.</b> Ambos reciben el promedio de la CD de los dos movimientos: <b>${avgDice}</b>. Ninguno aplica efectos secundarios.`;
  else if(ad<=3) out=`<b>Gana ${esc(charName(win.x.f))} por ${ad}.</b> ${esc(charName(lose.x.f))} recibe el promedio de la CD de los dos movimientos: <b>${avgDice}</b>${(win===SA?CL.ca:CL.cd)?' × 2 (crítico del ganador)':''}. Solo el ganador aplica sus efectos secundarios.`;
  else out=`<b>Gana ${esc(charName(win.x.f))} por ${ad}.</b> ${esc(charName(lose.x.f))} recibe el daño completo de ${esc(win.m[1])} (${win.mi.dice} + ${win.mi.atr} ${win.mi.ak}, con su efectividad y la defensa del objetivo)${(win===SA?CL.ca:CL.cd)?' × 2 (crítico)':''}. Solo el ganador aplica sus efectos secundarios.`;
  h+=`<div class="fx-box" style="margin-top:10px">${out}${win?`<div class="note" style="margin-top:4px">Efecto de ${esc(win.m[1])}: ${esc(win.m[11])}</div>`:''}</div>
    <div class="row" style="margin-top:10px"><button class="btn pri" data-cl="roll">Tirar daño</button></div>`;
  if(CL.res&&CL.res.sig===`${CL.a}|${CL.am}|${CL.d}|${CL.dm}|${CL.ca}|${CL.cd}`) h+=`<div class="res" style="margin-top:10px">${CL.res.list.map((z,i)=>{ const t=combatant(z.key); const can=t&&canEditRef(t)&&z.val;
      return `<div class="r"><div><div class="note">Daño a ${esc(z.name)}</div><div class="big">${z.val??'—'}</div><div class="note">${esc(z.det)}</div>${z.ap?'<div class="ok">Daño aplicado</div>':''}</div><div class="row" style="justify-content:flex-end">${can&&!z.ap?`<button class="btn sm pri" data-cl="apply" data-i="${i}">Aplicar daño</button>`:''}</div></div>`; }).join('')}</div>`;
  return h+`<p class="note">Se usa después de que el ataque conectó y en lugar de esquivar; gasta la Acción del defensor (o la toma prestada de la ronda siguiente). Al tirar el daño, el movimiento del defensor suma 1 a su contador de repeticiones. Si el defensor falla la Precisión de su movimiento (${SB.ai.prec}%), recibe el golpe completo y pierde su Acción. El promedio de la CD es la Clase de Dado intermedia entre los dos movimientos.</p></div>`;
}
function clashRoll(){
  const A=combatant(CL.a), B=combatant(CL.d); if(!A||!B) return;
  const SA=clashSide(A,CL.am,CL.dm,true,CL.ca), SB=clashSide(B,CL.dm,CL.am,false,CL.cd); if(!SA||!SB) return;
  const diff=SA.tot-SB.tot, ad=Math.abs(diff); const win=diff>0?SA:diff<0?SB:null, lose=diff>0?SB:diff<0?SA:null;
  const wcrit=win?(win===SA?CL.ca:CL.cd):false;
  const avg=(crit)=>{ const dd=dice(Math.round((SA.mi.idx+SB.mi.idx)/2)); const rl=rollDice(dd); const v=rl.t*(crit?2:1); return {val:v,det:`Promedio de CD ${dd} [${rl.r.join(', ')}]${crit?' × 2 (crítico del ganador)':''}`}; };
  const list=[];
  if(!win){ for(const S_ of [SA,SB]) list.push({key:S_.x.key,name:charName(S_.x.f),...avg(false)}); }
  else if(ad<=3) list.push({key:lose.x.key,name:charName(lose.x.f),...avg(wcrit)});
  else { const dr=rollDamage(win.ai,lose.x,wcrit,0); list.push({key:lose.x.key,name:charName(lose.x.f),val:dr.val,det:dr.det}); }
  if(canEditRef(B)){ const nf=structuredClone(B.f); nf.rep={mv:CL.dm,n:SB.ai.n+1}; saveFicha(B,nf); }
  CL.res={sig:`${CL.a}|${CL.am}|${CL.d}|${CL.dm}|${CL.ca}|${CL.cd}`,list,mv:`${SA.m[1]} contra ${SB.m[1]}`};
  logRoll('Colisión',`${charName(A.f)} (${SA.m[1]}, ${SA.tot}) contra ${charName(B.f)} (${SB.m[1]}, ${SB.tot}) · ${win?'gana '+charName(win.x.f):'empate'}${list.length?' · '+list.map(z=>`${z.name} ${z.val??'—'}`).join(' · '):''}`,null);
  renderSheet();
}
function clClick(b){
  const act=b.dataset.cl;
  if(act==='roll') clashRoll();
  else if(act==='apply'&&CL.res){ const z=CL.res.list[num(b.dataset.i)]; const t=z&&combatant(z.key); if(!t||!canEditRef(t)||z.ap||!z.val) return;
    const nf=structuredClone(t.f); nf.dano=num(nf.dano)+z.val; saveFicha(t,nf); z.ap=true; logRoll(charName(t.f),`Recibe ${z.val} de daño (Colisión: ${CL.res.mv})`,z.val); renderSheet(); }
}
function clChange(el){
  const k=el.dataset.clf;
  if(k==='a'){ CL.a=el.value; CL.am=''; if(CL.d===CL.a){ CL.d=''; CL.dm=''; } }
  else if(k==='d'){ CL.d=el.value; CL.dm=''; }
  else if(k==='am'||k==='dm') CL[k]=el.value;
  else if(k==='ca'||k==='cd') CL[k]=el.checked;
  renderSheet();
}
function doEvade(ref,f,kind,against){
  const c=calc(f); const need=Math.round((kind==='esq'?c.esq:c.tem)*100); const r=d(100);
  const lim=against?Math.min(need,against.d100):need; const ok=r<=lim&&r!==100;
  const nf=structuredClone(f); const key=kind==='esq'?'cEsq':'cTem'; nf[key]=num(nf[key])+1; if(ref.key) saveAny(ref,nf); else saveFicha(ref,nf);
  const txt=`Intentó evitar ${against?`${against.mv} de ${against.by}`:'un movimiento'} con ${kind==='esq'?'Esquiva':'Temple'}: d100 [${r}] vs ${need}%${against?` y ≤ ${against.d100}`:''} → ${ok?'lo evita':'no lo evita'}`;
  logRoll(charName(f),txt,r);
  return {r,ok,txt};
}
/* Colisión desde el último ataque */
function doCollide(L,z,mv){
  const t=combatant(z.key), A=combatant(L.byKey); if(!t||!A) return [];
  const log=[]; const dai=attackInfo(t,mv); if(!dai) return [];
  const dm=dai.mi.m; const r=d(100); const hit=r<=dai.prec&&r!==100;
  mutate(t.key,f=>{ f.rep={mv,n:dai.n+1}; });
  log.push({k:hit?'ok':'ko',t:`Colisiona con ${dm[1]}: d100 [${r}] contra ${dai.prec}% → ${hit?'conecta':'falla'}`});
  if(!hit){ log.push({k:'ko',t:'Falla la Colisión: recibe el golpe completo y pierde su Acción.'}); const out=connectHit(L,z,`Colisión fallida con ${dm[1]}`); out.forEach(o=>log.push({k:'',t:o})); return log; }
  const dcrit=r<=Math.round(dai.critR*100); const dre=dai.reR!==null&&r<=Math.round(dai.reR*100);
  if(dcrit) log.push({k:'ok',t:'¡Crítico del defensor!'});
  const SA=clashSide(A,L.mvId,mv,true,!!L.crit), SB=clashSide(t,mv,L.mvId,false,dcrit);
  const diff=SA.tot-SB.tot, ad=Math.abs(diff); const win=diff>0?SA:diff<0?SB:null, lose=diff>0?SB:diff<0?SA:null;
  log.push({k:'',t:`Puntos: ${charName(A.f)} ${SA.tot} · ${charName(t.f)} ${SB.tot} → ${win?`gana ${charName(win.x.f)} por ${ad}`:'empate'}`});
  const avgDice=dice(Math.round((SA.mi.idx+SB.mi.idx)/2));
  const avgHit=(S_,crit)=>{ const rl=rollDice(avgDice); const v=rl.t*(crit?2:1); mutate(S_.x.key,f=>{ f.dano=num(f.dano)+v; }); log.push({k:'ko',t:`${charName(S_.x.f)} recibe ${v} (promedio de CD ${avgDice} [${rl.r.join(', ')}]${crit?' × 2 por el crítico del ganador':''}).`}); };
  if(!win){ avgHit(SA,false); avgHit(SB,false); log.push({k:'',t:'Empate: nadie aplica efectos secundarios.'}); }
  else {
    const wcrit=win===SA?!!L.crit:dcrit;
    if(win===SA){ // gana el atacante: su golpe conecta con el defensor
      if(ad<=3){ avgHit(SB,wcrit); const zz={...z,val:null}; connectHit(L,zz,'Colisión perdida').forEach(o=>log.push({k:'',t:o})); }
      else { connectHit(L,z,'Colisión perdida por 4 o más').forEach(o=>log.push({k:'',t:o})); }
    } else { // gana el defensor: su movimiento conecta con el atacante
      const ctx={re:dre,rank:dm[5],by:t.key}; const ops=parseFx(dm); const out=[];
      let val=null, det='';
      if(ad<=3){ const rl=rollDice(avgDice); val=rl.t*(wcrit?2:1); det=`promedio de CD ${avgDice} [${rl.r.join(', ')}]${wcrit?' × 2':''}`; }
      else { const dr=rollDamage(dai,A,wcrit,0); val=dr.val; det=dr.det; }
      mutate(A.key,f=>{ if(val) f.dano=num(f.dano)+val; if(wcrit){ const ce=critEstado(dm); if(ce){ const tx=giveEstado(f,ce,ctx,true); if(tx) out.push('crítico: '+tx); } } out.push(...applyOps(f,ops,'target',ctx)); });
      log.push({k:'ko',t:`${charName(A.f)} recibe ${val??0} (${det}).`}); if(out.length) log.push({k:'',t:`Efectos en ${charName(A.f)}: ${out.join(' · ')}`});
      const so=[]; mutate(t.key,f=>{ so.push(...applyOps(f,ops,'self',ctx)); }); if(so.length) log.push({k:'',t:`Efectos en ${charName(t.f)}: ${so.join(' · ')}`});
    }
  }
  logRoll('Colisión',`${charName(t.f)} colisiona ${L.mv} de ${L.by} con ${dm[1]} · `+log.map(l=>l.t).join(' · '),r);
  return log;
}
function cbClick(b){
  const act=b.dataset.cb;
  if(act==='tie'){ const ord=cbOrder(); const tied=ord.filter(a=>ord.some(z=>z!==a&&z.c.ini===a.c.ini)); const ties={}; const parts=[]; tied.forEach(t=>{ ties[t.x.key]=d(20); parts.push(`${charName(t.x.f)} ${ties[t.x.key]}`); }); if(parts.length){ cbWrite({ties}); logRoll('Iniciativa','Desempate 1d20: '+parts.join(' · '),null); } renderSheet(); }
  else if(act==='end'){ $('#endConfirm').innerHTML='<button class="btn sm danger" data-cb="endYes">Sí, terminar</button> <button class="btn sm" data-cb="endNo">Cancelar</button>'; }
  else if(act==='endNo'){ $('#endConfirm').innerHTML=''; }
  else if(act==='endYes'){ cbWrite({parts:[],snaps:{},ties:{},last:null,lastFx:{},ronda:0,rondaLog:null},true); render(); }
  else if(act==='round'){ $('#roundConfirm').innerHTML=`<button class="btn sm pri" data-cb="roundYes">Sí, terminar la ronda ${num(CB.ronda)}</button> <button class="btn sm" data-cb="roundNo">Cancelar</button>`; }
  else if(act==='roundNo'){ $('#roundConfirm').innerHTML=''; }
  else if(act==='roundYes'){ b.disabled=true; endRound(); }
  else if(act==='pick'){ const mv=b.dataset.mv; const x=combatant(CBU.atk); const m=atkById.get(mv); if(!x||!m) return; CBU.mv=mv; CBU.targets=[];
    if(targetMode(m)==='none'){ CBU.picking=false; doAttack(); return; } CBU.picking=true; renderSheet(); }
  else if(act==='cancel'){ CBU.picking=false; CBU.targets=[]; renderSheet(); }
  else if(act==='roll'){ doAttack(); }
  else if(act==='colno'){ CBU.colFor=''; renderSheet(); }
  else if(['evade','apply','col','colmv'].includes(act)){
    const L=CB.last; if(!L) return; const z=L.res.find(q=>q.key===b.dataset.k); const t=combatant(b.dataset.k); if(!z||!t||!canEditRef(t)) return;
    const fk=`${L.ts}|${z.key}`; const fx={...(CB.lastFx[fk]||{})}; if(fx.done) return; const log=[...(fx.log||[])];
    if(act==='col'){ CBU.colFor=CBU.colFor===fk?'':fk; renderSheet(); return; }
    if(act==='evade'){ const ev=doEvade(t,t.f,z.kind,{d100:L.d100,mv:L.mv,by:L.by}); log.push({k:ev.ok?'ok':'ko',t:ev.txt});
      if(ev.ok){ fx.ev=true; fx.done=true; }
      else { connectHit(L,z,'no logró evadir').forEach(o=>log.push({k:'',t:o})); fx.done=true; } }
    else if(act==='apply'){ const out=connectHit(L,z,''); log.push({k:'ok',t:(z.heal?'Curación aplicada':'Recibido')+(out.length?': '+out.join(' · '):'')}); fx.done=true; }
    else if(act==='colmv'){ log.push(...doCollide(L,z,b.dataset.mv)); fx.done=true; CBU.colFor=''; }
    fx.log=log; cbWrite({lastFx:{[fk]:fx}}); renderSheet(); }
}
function cbChange(el){
  const k=el.dataset.cbf;
  if(k==='atk'){ CBU.atk=el.value; CBU.mv=''; CBU.picking=false; CBU.targets=[]; }
  else if(k==='bonus'){ CBU.bon[el.dataset.mv]=num(el.value); }
  else if(k==='rep'){ const x=combatant(CBU.atk); if(x&&canEditRef(x)){ const nf=structuredClone(x.f); nf.rep={mv:el.dataset.mv,n:Math.max(0,num(el.value))}; saveFicha(x,nf); } }
  renderSheet();
}

/* ---------- eventos globales ---------- */
function render(){
  document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===S.view)));
  $('#tabMaster').hidden=!isMaster();
  if(S.view==='master'&&!isMaster()) S.view='mis';
  renderList(); renderSheet(); renderRP();
}
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('button'); if(!b) return; S.view=b.dataset.v; S.open=null; S.cur=null; RP=null; try{localStorage.setItem('pkrpg.view',S.view)}catch(_){} render();});
document.addEventListener('change',e=>{
  if(e.target.dataset.dexall1){ setVis([e.target.dataset.dexall1],e.target.checked); return; }
  if(e.target.dataset.dexj){ setVis([e.target.dataset.id],e.target.checked,e.target.dataset.dexj); return; }
  if(e.target.id==='dexFor'){ T.dfor=e.target.value; return; }
  if(e.target.dataset.cbf){ cbChange(e.target); return; }
  if(e.target.dataset.clf){ clChange(e.target); return; }
  if(e.target.dataset.cbt){ const k=e.target.dataset.cbt; if(e.target.type==='radio') CBU.targets=[k]; else CBU.targets=e.target.checked?[...new Set([...CBU.targets,k])]:CBU.targets.filter(x=>x!==k); renderSheet(); return; }
  if(e.target.closest('#sheet') && e.target.dataset.f) onField(e);
  if(e.target.id==='alias'&&S.canWrite){ const a=e.target.value.trim()||'Jugador'; const dd={...(S.players[S.uid]||{creado:new Date().toISOString()}),alias:a}; S.players[S.uid]=dd; queueSave(`jug/${S.uid}`,dd); }});
document.addEventListener('toggle',e=>{ const k=e.target.dataset&&e.target.dataset.fold; if(k===undefined) return; S.folders[k]=e.target.open; try{localStorage.setItem('pkrpg.folders',JSON.stringify(S.folders))}catch(_){} },true);
document.addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-dsel]')){ e.preventDefault(); e.target.click(); }});
document.addEventListener('click',async e=>{
  const gv=e.target.closest('[data-glove]'); if(gv){ toggleGlove(gv.dataset.glove); return; }
  const tg=e.target.closest('[data-team]'); if(tg){ toggleTeam(tg.dataset.team); return; }
  const cb=e.target.closest('[data-cb]'); if(cb){ cbClick(cb); return; }
  const clb=e.target.closest('[data-cl]'); if(clb){ clClick(clb); return; }
  const dpp=e.target.closest('[data-dexpop]'); if(dpp){ e.stopPropagation(); T.dpop=T.dpop===dpp.dataset.dexpop?'':dpp.dataset.dexpop; renderSheet(); return; }
  if(e.target.closest('.dexpop')){ e.stopPropagation(); return; }
  const da=e.target.closest('[data-dexall]'); if(da){ setVis(dexFiltered().map(r=>r[0]),da.dataset.dexall==='1',T.dfor||''); return; }
  const dsl=e.target.closest('[data-dsel]'); if(dsl){ T.dsel=dsl.dataset.dsel; renderSheet(); if(T.dsel) window.scrollTo({top:0}); return; }
  const dp=e.target.closest('[data-dpage]'); if(dp){ T.dpage+=num(dp.dataset.dpage); renderSheet(); return; }
  const o=e.target.closest('[data-open]'); if(o){ const [src,uid,id]=o.dataset.open.split('|'); RP=null; if(S.view==='combate') S.view=src==='master'?'master':'mesa'; openRef({src,uid:uid||null,id}); return; }
  const gl=e.target.closest('[data-glos]'); if(gl){ GLOS_OPEN=gl.dataset.glos; renderList(); renderSheet(); window.scrollTo({top:0}); return; }
  const gs=e.target.closest('details.glos>summary'); if(gs){ e.preventDefault(); const id=gs.parentElement.id.slice(2); GLOS_OPEN=GLOS_OPEN===id?'':id; renderList(); renderSheet(); return; }
  if(e.target.closest('[data-hist]')){ S.open={src:'hist'}; S.cur=null; render(); return; }
  const t=e.target.closest('[data-tool]'); if(t){ S.tool=t.dataset.tool; try{localStorage.setItem('pkrpg.tool',S.tool)}catch(_){} render(); return; }
  const ra=e.target.closest('[data-rollattr]'); if(ra){ openRP({kind:'attr',attr:ra.dataset.rollattr,tal:'',x:0}); return; }
  const rt=e.target.closest('[data-rolltal]'); if(rt){ openRP({kind:'tal',attr:'DES',tal:rt.dataset.rolltal,x:0}); return; }
  const rm2=e.target.closest('[data-rollmv]'); if(rm2){ openRP({kind:'move',i:num(rm2.dataset.rollmv)}); return; }
  const rm=e.target.closest('[data-rmmaster]'); if(rm){ S.masters=S.masters.filter(u=>u!==rm.dataset.rmmaster); saveMasters(); return; }
  const a=e.target.closest('[data-act]'); if(!a) return; const act=a.dataset.act;
  if(a.closest('summary')) e.preventDefault();
  const folder=a.dataset.folder||'';
  if(act==='newE') createDoc('jug',newTrainer());
  else if(act==='newP') createDoc('jug',newPokemon());
  else if(act==='newNota') createDoc('nota',{titulo:'Nueva nota',fecha:new Date().toISOString().slice(0,10),texto:'',creado:new Date().toISOString()});
  else if(act==='newBit') createDoc('bit',{titulo:'Sesión',clase:'Sesión',fecha:new Date().toISOString().slice(0,10),texto:'',creado:new Date().toISOString()});
  else if(act==='newNpc') createDoc('master',newTrainer({nombre:'Nuevo NPC',cat:'npc',carpeta:folder}));
  else if(act==='newFolderNpc'){ const n=$('#newFolder').value.trim(); if(!n){ $('#newFolder').focus(); return; } createDoc('master',newTrainer({nombre:'Nuevo NPC',cat:'npc',carpeta:n})); }
  else if(act==='newWild') createDoc('master',newPokemon({cat:'salvaje',nat:pick(D.nat)[0],carpeta:folder}));
  else if(act==='addTeam'){ const team=teamOf(S.open).filter(p=>p.f.lugar!=='caja'); createDoc(S.open.src,newPokemon(Object.assign({entrenador:S.open.id,lugar:team.length>=6?'caja':''},S.open.src==='master'?{cat:'npc'}:{}))); }
  else if(act==='genSave'&&T.gen?.f){ const f=structuredClone(T.gen.f); if(a.dataset.to==='salvaje'){ f.cat='salvaje'; f.carpeta=''; S.view='master'; createDoc('master',f);} else { S.view='mis'; createDoc('jug',f);} }
  else if(act==='dexEvento'&&isMaster()&&S.canWrite){ S.evento=!S.evento; saveVis(); }
  else if(act==='rmImg'&&S.cur){ S.cur.img=''; commit(true); }
  else if(act==='gen'&&S.cur&&!S.ro){ const g=S.cur.genero||'M'; S.cur.genero=S.cur.tipo==='P'?(g==='M'?'F':g==='F'?'N':'M'):(g==='F'?'M':'F'); commit(true); }
  else if(act==='addMove'&&S.cur&&!S.ro){ const mv=[...(S.cur.moves||[])]; while(mv.length<6) mv.push(''); mv.push(''); S.cur.moves=mv; commit(true); }
  else if(act==='rmMove'&&S.cur&&!S.ro){ S.cur.moves.splice(num(a.dataset.i),1); commit(true); }
  else if(act==='restore'&&S.cur&&!S.ro){ const c=$('#restoreConfirm'); if(c) c.innerHTML='<button class="btn sm pri" data-act="restoreYes">Sí, restaurar</button> <button class="btn sm" data-act="restoreNo">Cancelar</button>'; }
  else if(act==='restoreNo'){ const c=$('#restoreConfirm'); if(c) c.innerHTML=''; }
  else if(act==='restoreYes'&&S.cur&&!S.ro){ restoreAll(S.cur); commit(true); logRoll(charName(S.cur),'Restaurar Todo: daño, intentos, IC, bonos, estados y repeticiones a 0',null); }
  else if(act==='evade'&&S.cur&&!S.ro){ const L=CB.last; const ev=doEvade(S.open,S.cur,a.dataset.k,L?{d100:L.d100,mv:L.mv,by:L.by}:null); renderSheet(); openRP({kind:'res',title:a.dataset.k==='esq'?'Esquiva':'Temple',res:{v:ev.r,cls:ev.ok?'ok':'ko',html:esc(ev.txt)}}); }
  else if(act==='addItem'&&S.cur&&!S.ro){ (S.cur.mochila ||= []).push({obj:'',eq:'',cant:1,peso:0,precio:0,efecto:''}); commit(true); }
  else if(act==='rmItem'&&S.cur&&!S.ro){ S.cur.mochila.splice(num(a.dataset.i),1); commit(true); }
  else if(act==='rmRoll'){ delRoll(a.dataset.u,num(a.dataset.ts)); }
  else if(act==='clearRolls'){ const c=$('#clrConfirm'); if(c) c.innerHTML='<button class="btn sm danger" data-act="clearYes">Sí, vaciar</button> <button class="btn sm" data-act="clearNo">Cancelar</button>'; }
  else if(act==='clearNo'){ const c=$('#clrConfirm'); if(c) c.innerHTML=''; }
  else if(act==='clearYes'){ clearRolls(); }
  else if(act==='del'){ const c=$('#delConfirm'); c.innerHTML='<button class="btn danger" data-act="delYes">Sí, borrar para siempre</button> <button class="btn" data-act="delNo">Cancelar</button>'; }
  else if(act==='delNo'){ $('#delConfirm').innerHTML=''; }
  else if(act==='delYes'){ deleteRef(S.open); }
  else if(act==='free'){ const c=$('#freeConfirm'); c.innerHTML='<span class="note">Pasará a los Salvajes del Master y saldrá de tus fichas.</span> <button class="btn pri" data-act="freeYes">Sí, liberar</button> <button class="btn" data-act="freeNo">Cancelar</button>'; }
  else if(act==='freeNo'){ $('#freeConfirm').innerHTML=''; }
  else if(act==='freeYes'){ releasePokemon(); }
  else if(act==='addMaster'){ const u=$('#addMasterSel').value; if(u&&!S.masters.includes(u)){ S.masters=[...S.masters,u]; saveMasters(); } }
});
async function moveDoc(from,to,f){
  await S.db.doc(pathOf(to)).set(f);
  putF(to,f);
  await S.db.doc(pathOf(from)).delete();
  delLocal(from);
}
async function capturePokemon(u,tid){
  if(!isMaster()||!S.canWrite||!S.cur) return;
  const from=S.open, f=structuredClone(S.cur);
  const tr=getF({src:'jug',uid:u,id:tid}); if(!tr) return;
  delete f.cat; delete f.carpeta;
  const team=teamOf({src:'jug',uid:u,id:tid}).filter(x=>x.f.lugar!=='caja');
  f.entrenador=tid; f.lugar=team.length>=6?'caja':'';
  const to={src:'jug',uid:u,id:from.id};
  setStatus('Guardando…');
  try{ await moveDoc(from,to,f); setStatus('Guardado');
    logRoll(tr.nombre||'Entrenador',`Capturó a ${charName(f)}${f.lugar==='caja'?' (va a la caja)':''}`,null);
    S.view='mesa'; openRef(to); }
  catch(e){ onWriteError(e); renderSheet(); }
}
async function releasePokemon(){
  if(!S.cur||S.open.src!=='jug'||!canEditRef(S.open)) return;
  const from=S.open, f=structuredClone(S.cur), oldTr=f.entrenador;
  f.cat='salvaje'; f.entrenador=''; f.lugar=''; f.carpeta='Liberados';
  const to={src:'master',uid:null,id:from.id};
  setStatus('Guardando…');
  try{
    await S.db.doc(pathOf(to)).set(f);
    await S.db.doc(pathOf(from)).delete(); delLocal(from);
    if(isMaster()) putF(to,f);
    if(oldTr){ const tref={src:'jug',uid:from.uid,id:oldTr}; const tf=getF(tref);
      if(tf&&(tf.mochila||[]).some(it=>it.eq===from.id)){ const t2=structuredClone(tf); t2.mochila.forEach(it=>{ if(it.eq===from.id) it.eq=''; }); putF(tref,t2); await S.db.doc(pathOf(tref)).set(t2); } }
    logRoll(charName(f),'Fue liberado',null);
    setStatus('Guardado'); S.open=null; S.cur=null; render();
  }catch(e){ onWriteError(e); showBanner('No se pudo liberar: solo quien tiene permiso de edición en la app puede pasar Pokémon a los Salvajes del Master.'); }
}
async function saveMasters(){ render(); try{ await S.db.doc('config/mesa').set({masters:S.masters}); setStatus('Guardado'); }catch(e){ onWriteError(e); } }

/* listas de autocompletado */
function mkDL(id,list){ let dl=document.getElementById(id); if(!dl){ dl=document.createElement('datalist'); dl.id=id; document.body.appendChild(dl);} dl.innerHTML=list.map(v=>`<option value="${esc(v)}">`).join(''); }
function buildDexList(){ mkDL('dl-dex',D.dex.filter(r=>speciesAllowed(r[0])).map(dexLabel)); }
function buildFolderList(){ mkDL('dl-fold',[...new Set(Object.values(S.master).map(f=>f.carpeta).filter(Boolean))].sort()); }
buildDexList(); mkDL('dl-atk',D.atk.map(a=>a[1])); mkDL('dl-hab',D.hab.map(h=>h[0]));

/* ---------- conexión ---------- */
function busy(){ const a=document.activeElement; return !!(a&&a.closest&&a.closest('#sheet')&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)); }
function safeSheet(){ if(!busy()) renderSheet(); }
function missingSpecies(){ const all=[...Object.values(S.fichas).flatMap(o=>Object.values(o)),...Object.values(S.master),...Object.values(CB.snaps||{})];
  return all.some(f=>f&&f.especie&&!(dexById.get(f.especie)||[])[1]); }
function onRemote(){
  if(missingSpecies()) reloadEspecies();
  if(S.view==='tools'||S.view==='glos'||S.view==='combate'){ renderList(); if(S.view==='combate'||S.view==='tools'&&S.tool!=='mov') safeSheet(); return; }
  if(S.open&&S.open.src!=='hist'){ const f=getF(S.open); const path=pathOf(S.open);
    if(!f){ S.open=null; S.cur=null; RP=null; }
    else if(!pend[path] && !inflight[path]){ const typing=document.activeElement && document.activeElement.closest && document.activeElement.closest('#sheet');
      S.cur=structuredClone(f); if(typing){ renderList(); fillComputed(); return; } } }
  render();
}
function keepPending(prefix,cur,next){ for(const [id,f] of Object.entries(cur||{})){ const p=prefix+id; if(pend[p]||inflight[p]) next[id]=f; } return next; }
function snapMap(snap){ const m={}; snap.docs.forEach(x=>{ if(x.exists) m[x.id]=x.data(); }); return m; }
function subPlayer(u){
  if(S.subs[u]) return;
  S.subs[u]=S.db.collection(`jug/${u}/fichas`).onSnapshot(snap=>{ S.fichas[u]=keepPending(`jug/${u}/fichas/`,S.fichas[u],snapMap(snap)); onRemote(); },err=>console.warn(err));
  S.subs['n'+u]=S.db.collection(`jug/${u}/notas`).onSnapshot(snap=>{ S.notas[u]=keepPending(`jug/${u}/notas/`,S.notas[u],snapMap(snap)); onRemote(); },err=>console.warn(err));
}
function subMaster(){ if(S.subs.__m) return;
  S.subs.__m=S.db.collection('master').onSnapshot(snap=>{ S.master=keepPending('master/',S.master,snapMap(snap)); buildFolderList(); onRemote(); },e=>console.warn(e));
  S.subs.__b=S.db.collection('bitacora').onSnapshot(snap=>{ S.bit=keepPending('bitacora/',S.bit,snapMap(snap)); onRemote(); },e=>console.warn(e));
}
async function boot(){
  render();
  const C=window.claude; const db=C&&C.use?await C.use('db'):null; const user=C&&C.use?await C.use('user'):null;
  if(!db){ setStatus('Sin conexión'); showBanner('No se pudo conectar con la base de datos. Recarga la página.'); return; }
  S.db=db; S.user=user;
  if(user){ S.me=await user.me(); S.uid=S.me.id; S.owner=!!S.me.isOwner;
    let w=null; try{ w=await user.can('data.write'); }catch(_){}
    S.canWrite = !!S.uid && w!==false;
    $('#whoName').textContent=S.me.name||''; if(S.me.avatarUrl){ $('#avatar').src=S.me.avatarUrl; $('#avatar').hidden=false; } }
  if(!S.uid) showBanner('Entra con tu cuenta de Google para crear fichas.');
  
  setStatus('Conectado');
  db.doc('config/mesa').onSnapshot(s=>{ S.masters=(s.exists&&s.data().masters)||[]; buildDexList(); $('#tabMaster').hidden=!isMaster(); onRemote(); if(isMaster()) subMaster(); },e=>console.warn(e));
  db.doc('combate/actual').onSnapshot(s=>{ const dd=s.exists?s.data():{}; CB.exists=s.exists; CB.parts=dd.parts||[]; CB.snaps=dd.snaps||{}; CB.ties=dd.ties||{}; CB.last=dd.last||null; CB.lastFx=dd.lastFx||{}; CB.ronda=num(dd.ronda); CB.rondaLog=dd.rondaLog||null;
    if(S.view==='combate'){ renderList(); safeSheet(); } else if(S.view==='mesa'||S.view==='master') renderList(); },e=>console.warn(e));
  db.doc('pokedex/visibles').onSnapshot(s=>{ if(pend['pokedex/visibles']||inflight['pokedex/visibles']) return; const dd=s.exists?s.data():{}; S.vis=new Set(dd.ids||[]); S.visJ={}; for(const [u,l] of Object.entries(dd.jug||{})) S.visJ[u]=new Set(l); S.evento=!!dd.evento; reloadEspecies(); buildDexList(); if(S.view==='tools') safeSheet(); },e=>console.warn(e));
  db.collection('tiradas').onSnapshot(snap=>{ const m=snapMap(snap); if(S.uid&&(pend[`tiradas/${S.uid}`]||inflight[`tiradas/${S.uid}`])) m[S.uid]=S.tir[S.uid]; if(S.tir.__local) m.__local=S.tir.__local; S.tir=m;
    if(S.view==='mesa'&&(!S.open||S.open.src==='hist') || S.view==='tools'&&S.tool==='dados') safeSheet(); if(S.view==='mesa') renderList(); },e=>console.warn(e));
  db.collection('jug').onSnapshot(snap=>{ const m=snapMap(snap);
    if(S.uid && S.players[S.uid] && !m[S.uid]) m[S.uid]=S.players[S.uid];
    S.players=m; Object.keys(m).forEach(subPlayer); if(S.uid) subPlayer(S.uid); onRemote(); },e=>console.warn(e));
  if(S.uid) subPlayer(S.uid);
  if(S.owner) subMaster();
}
boot().then(loadEspecies);
