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
  const { data, error } = await window.__selectAll('especies', 'id,data', ['id']);
  if(error){ console.warn(error); return; }
  for(const row of data){ const t=dexById.get(row.id); if(t&&Array.isArray(row.data)) row.data.forEach((v,i)=>{ t[i]=v; }); }
  dexByLabel.clear(); D.dex.forEach(r=>{ if(r[1]) dexByLabel.set(dexLabel(r),r[0]); });
  buildDexList(); if(S.db) render();
}
const dexTypes = d=>[d[3],d[4]].filter((t,i,a)=>t&&t!=='-'&&a.indexOf(t)===i);
// atk: 0 id,1 nombre,2 tipo,3 clase,4 atributo,5 nivel,6 prec,7 base,8 prio,9 blanco,10 dist,11 efecto,12 RE,13 categoria,14 concurso,15 costos,16 precio MT
const atkById = new Map(D.atk.map(r=>[r[0],r]));
const atkByName = new Map(D.atk.map(r=>[r[1].toLowerCase(),r[0]]));
const habMap = new Map(D.hab.map(r=>[r[0],r[1]]));
const natMap = new Map(D.nat.map(r=>[r[0],r]));
const estMap = new Map(D.estados.map(r=>[r[0],r]));
const EST_F = D.estados.filter(r=>r[2]==='Fisico').map(r=>r[0]);
const EST_M = D.estados.filter(r=>r[2]==='Mental').map(r=>r[0]);
/* Méritos y Defectos del Entrenador. rasgos: 0 nombre,1 M/D,2 categoría,3 valor,4 aplicación,5 efecto,6 incompatible
   rasgoFx: 0 rasgo,1 clave (tal:X, attr:X, vel, ps%, pd, cdRecv:Tipo, salv:Estado, salvM, all, talSoc, nota),2 mod,3 automático,4 condición,5 campo */
const RASGOS = new Map((D.rasgos||[]).map(r=>[r[0],r]));
const RFX = D.rasgoFx||[];
const N_DEF=3, N_MER=6, PTS_LIBRES=5;
const sg = v=>(num(v)>0?'+':num(v)<0?'−':'')+Math.abs(num(v));
const TAL_SOC=['Presencia','Manipulacion','Perspicacia','Interpretacion'];
const nivelGrupo = n=>{ const m=/^(.*) (I{1,3})(?: \(.*\))?$/.exec(n); return m?m[1]:null; };
function rasgosDe(f){ if(!f||f.tipo!=='E') return []; return [...(f.defectos||[]),...(f.meritos||[])].filter(n=>RASGOS.has(n)); }
function rasgoFxDe(f){ const s=new Set(rasgosDe(f)); return RFX.filter(x=>s.has(x[0])).map(x=>rasgoFxOp(f,x)); }
/* Méritos y Defectos que piden elegir algo: tipo, sentido, Pokémon del equipo, clima, Talento u objeto */
const SENTIDOS=['Vista','Oído','Olfato','Gusto','Tacto'];
const RASGO_OP={'Sentido Agudo':['sentido','Sentido'],'Rito':['talento','Tirada del ritual'],'Estudioso de un Tipo':['tipo','Tipo'],'Vínculo Pokémon':['pokemon','Pokémon'],'Dominio Elemental':['tipo','Tipo'],
  'Alergia a un Tipo I':['tipo','Tipo'],'Alergia a un Tipo II':['tipo','Tipo'],'Alergia a un Tipo III':['tipo','Tipo'],'Sensible al Clima':['clima','Clima'],'Sensible al Campo':['campo','Campo'],'Afinidad al Clima':['clima','Clima'],'Afinidad al Campo':['campo','Campo'],
  'Fobia I':['texto','Miedo a'],'Fobia II':['texto','Miedo a'],'Fobia III':['texto','Miedo a'],'Odio':['texto','Odia a']};
function rasgoOp(f,n){ for(const k of ['meritos','defectos']){ const arr=f[k]||[]; for(let i=0;i<arr.length;i++) if(arr[i]===n){ const v=(((f.rasgoOp||{})[k])||[])[i]; if(v) return v; } } return ''; }
function rasgoOpLabel(f,n,v){ const k=(RASGO_OP[n]||[])[0]; if(k==='talento') return TAL_LABEL(v);
  if(k==='pokemon'){ const t=(S.open?teamOf(S.open):[]).find(x=>x.id===v); return t?charName(t.f):'su Pokémon vinculado'; } return v; }
function rasgoFxOp(f,x){ if(!RASGO_OP[x[0]]) return x; const v=rasgoOp(f,x[0]); if(!v) return x; const y=[...x];
  if(x[0]==='Rito'){ y[1]='tal:'+v; y[4]=`si hace su ritual antes de la tirada de ${TAL_LABEL(v)}`; }
  else y[4]=`${x[4]}: ${rasgoOpLabel(f,x[0],v)}`;
  return y; }
/* Entrenador de un Pokémon (su ficha, o la copia del combate si es del Master) */
function entrenadorDe(f,K){ let src='jug',uid=null; if(K){ [src,uid]=K.split('|'); uid=uid||null; } else if(S.open){ src=S.open.src; uid=S.open.uid; }
  if(src!=='jug'&&src!=='master') return null;
  const x=poolOf(src,uid).find(y=>y.id===f.entrenador); if(x) return x.f;
  return src==='master'?(CB.snaps||{})['master||'+f.entrenador]||null:null; }
/* bono extra de las Órdenes de Comandar por Vínculo Pokémon y Dominio Elemental */
function ordenExtra(f,y){ let b=0; const why=[];
  if(y&&rasgosDe(f).includes('Vínculo Pokémon')&&rasgoOp(f,'Vínculo Pokémon')===y.id){ b+=2; why.push('Vínculo Pokémon +2'); }
  const dt=rasgosDe(f).includes('Dominio Elemental')?rasgoOp(f,'Dominio Elemental'):''; if(y&&dt&&tiposDe(y.f).includes(dt)){ b+=2; why.push(`Dominio Elemental (${dt}) +2`); }
  return {b,why}; }
/* suma automática de una clave (sin preguntar) y los rasgos que la causan */
function rasgoAuto(f,key){ let v=0; const src=[]; for(const x of rasgoFxDe(f)) if(x[3]&&x[1]===key){ v+=num(x[2]); src.push(`${x[0]} ${sg(x[2])}`); } return {v,src}; }
/* efectos condicionales que se consultan al tirar */
function rasgoCond(f,keys){ return rasgoFxDe(f).filter(x=>!x[3]&&keys.includes(x[1])&&num(x[2])!==0); }
const condKeysTal = t=>['tal:'+t].concat(TAL_SOC.includes(t)?['talSoc']:[]);
/* bonus de un Talento: su Rango + los rasgos automáticos */
const talBonus = (f,t)=> rb((f.tal||{})[t]) + (f.tipo==='E'?rasgoAuto(f,'tal:'+t).v:0);
/* marca de color: verde si sube, rojo si baja (automático), amarillo si hay condicional */
function rasgoMark(f,autoKey,condKeys){ const a=autoKey?rasgoAuto(f,autoKey):{v:0,src:[]}; const c=condKeys?rasgoCond(f,condKeys):[];
  const tip=[...a.src,...c.map(x=>`${x[0]} ${x[2]===-99?'falla':sg(x[2])}${x[4]?' ('+x[4]+')':''}: se consulta al tirar`)].join(' · ');
  const cls=a.v>0?'rs-up':a.v<0?'rs-down':c.length?'rs-cond':''; return {cls, tip, auto:a.v, cond:c}; }

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
function estEffects(f,key){ const o={attr:{},prec:0,esq:0,tem:0,cdOwn:{},cdRecv:{},cancel:[],noCrit:false,src:{},vel:0,ic:0,resid:{},skipSalv:[],noEst:'',cn:[]};
  for(const n of [f.estF,f.estM].filter(Boolean)){ if(estImmune(f,n)) continue; const m=estModsOf(n); if(!m) continue;
    for(const [k,v] of Object.entries(m.attr)){ o.attr[k]=(o.attr[k]||0)+v; (o.src[k] ||= []).push(n); }
    o.prec+=m.prec; o.esq+=m.esq; o.tem+=m.tem; Object.assign(o.cdOwn,m.cdOwn); Object.assign(o.cdRecv,m.cdRecv); o.cancel.push(...m.cancel); o.noCrit=o.noCrit||m.noCrit; }
  /* resistencias pasivas de los Méritos: −1 CD al daño recibido de un tipo y + a la Salvación de un estado */
  o.salv={}; o.resist=[];
  for(const x of rasgoFxDe(f)){ const [n,k,v]=x;
    if(k.startsWith('cdRecv:')){ const t=k.slice(7); o.cdRecv[t]=num(o.cdRecv[t])+num(v); o.resist.push(`${n}: ${sg(v)} CD de ${t}`); }
    else if(k.startsWith('salv:')){ const e=k.slice(5); o.salv[e]=num(o.salv[e])+num(v); o.resist.push(`${n}: Salvación de ${e} ${sg(v)}`); }
    else if(k==='salvM'){ EST_M.forEach(e=>o.salv[e]=num(o.salv[e])+num(v)); o.resist.push(`${n}: Salvación de estados Mentales ${sg(v)}`); }
    else if(n==='Dominio Elemental'&&/^CD/.test(String(x[5]))){ const t=deacc(rasgoOp(f,n)); if(t){ o.cdOwn[t]=num(o.cdOwn[t])+1; o.resist.push(`${n}: +1 CD a sus movimientos de tipo ${t}`); } } }
  /* climas, campos y entornos: solo en combate */
  const K=key||condKeyOf(f);
  if(f.tipo==='P'&&f.entrenador){ const tr=entrenadorDe(f,K); const t=tr&&rasgosDe(tr).includes('Dominio Elemental')?deacc(rasgoOp(tr,'Dominio Elemental')):''; if(t){ o.cdOwn[t]=num(o.cdOwn[t])+1; o.resist.push(`Dominio Elemental de ${charName(tr)}: +1 CD a sus movimientos de tipo ${t}`); } }
  if(K&&inCombat(K)){ o.cond=condPara(f,K); condAplica(o,f,o.cond); condEquipo(o,f,o.cond); }
  habAplica(o,f,K&&inCombat(K)?K:'');
  return o; }

/* ---------- Habilidades en combate (Habilidades 1.3, hoja «Efectos en combate») ---------- */
/* fila: [habilidad, n, activación, condición, alcance, clave, valor, prob, automatización, nota] */
const HFX=new Map(); for(const r of (D.habFx||[])) if(r[8]==='Sí'||r[8]==='Botón'){ if(!HFX.has(r[0])) HFX.set(r[0],[]); HFX.get(r[0]).push(r); }
const hval=v=>{ const n=Number(String(v??'').replace(/−/g,'-').replace(',','.').replace(/^×/,'').replace(/\s*%$/,'')); return Number.isFinite(n)?n:0; };
const habOf=f=>f&&f.tipo==='P'?(f.estM==='Mareado'?'Tumbos':(f.habilidad||'')):''; /* Mareado reemplaza la Habilidad por Tumbos mientras dure */
const habRowsOf=(f,acts)=>(HFX.get(habOf(f))||[]).filter(r=>!acts||acts.includes(r[2]));
const PASIVA=['Siempre','Mientras se cumpla'];
function habCondOk(c,f,key,x){ return !c||String(c).split('+').every(p=>habCond1(p,f,key,x||{})); }
function habCond1(c,f,key,x){ let m;
  if(c==='estado') return !!(f.estF||f.estM);
  if((m=/^estado:(\w+)$/.exec(c))) return f.estF===m[1]||f.estM===m[1];
  if(c==='ps<=1/3') return psFrac(f)<=1/3; if(c==='ps<1/2') return psFrac(f)<0.5; if(c==='psMax') return psFrac(f)>=1;
  if((m=/^(clima|campo|entorno):(.+)$/.exec(c))){ if(!key||!inCombat(key)) return false; const P=condPara(f,key); return m[2]==='cualquiera'?!!P[m[1]]:P[m[1]]===m[2]; }
  if(c==='ronda=1') return num(CB.ronda)<=1; if(c==='ronda<=5') return num(CB.ronda)<=5;
  if((m=/^rival:(\w+)$/.exec(c))) return !!key&&combatants().some(y=>!aliados(y.key,key)&&(y.f.estF===m[1]||y.f.estM===m[1]));
  if((m=/^blanco:(\w+)$/.exec(c))) return !!x.blanco&&(x.blanco.estF===m[1]||x.blanco.estM===m[1]);
  if(c==='mov:contacto') return !!x.mov&&/^contacto/i.test(String(x.mov[10]));
  if((m=/^mov:(.+)$/.exec(c))) return !!x.mov&&m[1].split('/').some(n=>deacc(n)===deacc(x.mov[1]));
  if(c.startsWith('recibe:')){ const r=x.recibe; if(!r) return false; const q=c.slice(7);
    if(q==='contacto') return /^contacto/i.test(String(r.mov[10])); if(q==='critico') return !!r.crit;
    if((m=/^clase:(\w+)$/.exec(q))) return deacc(r.mov[3])===deacc(m[1]); if((m=/^cat:(\w+)$/.exec(q))) return hasCat(r.mov,m[1]);
    if((m=/^tipo:(.+)$/.exec(q))) return m[1].split('/').some(t=>deacc(t)===deacc(r.tipo));
    if(q==='mismoTipo') return tiposDe(f).includes(deacc(r.tipo)); return false; }
  if(c==='debilitado') return !!x.ko; if(c==='cruza:ps<1/2') return !!x.cruza; if(c==='rivalBaja') return !!x.rivalBaja;
  return false; }
/* Filas pasivas que alcanzan a esta ficha (las suyas y las de otros combatientes según su Alcance) */
function habPasivas(f,key){ const out=[];
  for(const r of habRowsOf(f,PASIVA)) if(['Propio','Equipo','Todos'].includes(r[4])&&habCondOk(r[3],f,key,{})) out.push(r);
  if(key) for(const y of combatants()){ if(y.key===key) continue; for(const r of habRowsOf(y.f,PASIVA)){ const a=r[4];
      const ok=(a==='Aliados'||a==='Equipo')?aliados(y.key,key):a==='Rivales'?!aliados(y.key,key):(a==='Todos'||a==='Todos los demás');
      if(ok&&habCondOk(r[3],y.f,y.key,{})) out.push(r); } }
  return out; }
const bestAttr=f=>{ const A=attrs(f)||{}; return ATTR.reduce((a,z)=>num(A[z])>num(A[a])?z:a,ATTR[0]); };
function habAplica(o,f,key){
  o.hk=[]; o.inmEst=new Map(); o.salvMul={}; o.residMod={};
  for(const r of habPasivas(f,key)){ const k=r[5], v=r[6], nm=r[0]; let m;
    const at=(a,val)=>{ o.attr[a]=(o.attr[a]||0)+val; (o.src[a] ||= []).push(nm); o.cn.push(`${nm} ${sg(val)} ${a}`); };
    if((m=/^attr:(FUE|VIT|ENE|SAB|DES|CAR)$/.exec(k))) at(m[1],hval(v));
    else if(k==='attr:max') at(bestAttr(f),hval(v));
    else if(k==='evasion'){ o.esq+=hval(v)/100; o.tem+=hval(v)/100; o.cn.push(`${nm} ${sg(hval(v))} % Evasión`); }
    else if(k==='prec'){ o.prec+=hval(v); o.cn.push(`${nm} ${sg(hval(v))} % Precisión`); }
    else if(k==='ic'){ o.ic+=hval(v); o.cn.push(`${nm} +${hval(v)} IC`); }
    else if(k==='vel'){ o.vel+=hval(v); }
    else if((m=/^cdOwn:([^:→]+)$/.exec(k))&&!['todos','super','critico','conRE','siguiente','base<=6'].includes(m[1])){ const t=deacc(m[1]); o.cdOwn[t]=num(o.cdOwn[t])+hval(v); }
    else if((m=/^cdRecv:([^:]+)$/.exec(k))&&!['todos','super'].includes(m[1])){ const t=deacc(m[1]); o.cdRecv[t]=num(o.cdRecv[t])+hval(v); }
    else if((m=/^inmuneEst:(.+)$/.exec(k))) o.inmEst.set(m[1],nm);
    else if((m=/^salv:(\w+)$/.exec(k))) o.salvMul[m[1]]=hval(v)||2;
    else if((m=/^residual:(\w+)$/.exec(k))) o.residMod[m[1]]=String(v);
    else o.hk.push({k,v:String(v),nm});
  } }
const hkOf=(em,re)=>((em&&em.hk)||[]).filter(h=>re.test(h.k));
/* CD, Precisión, Prioridad, tipo y STAB que la Habilidad del atacante da a un movimiento */
function habMov(m,em){
  const o={tipo:m[2],cd:0,prec:0,prio:num(m[8]),stab:null,notes:[],golpea:[],ignEv:false,siempre:false,reMul:null,changed:false};
  for(const h of hkOf(em,/^tipoMov:/)){ const [a,b]=h.k.slice(8).split('→'); const ok=a==='todos'||(a==='cat:Sonido'?hasCat(m,'Sonido'):deacc(a)===m[2]);
    if(ok&&deacc(b)!==o.tipo){ o.tipo=deacc(b); o.changed=true; o.notes.push(`${h.nm}: pasa a ${b}`); } }
  if(m[3]!=='Estado') for(const h of hkOf(em,/^cdOwn:/)){ const q=h.k.slice(6), v=hval(h.v); let ok=false;
    if(q==='todos') ok=true; else if(q==='cat:Contacto') ok=/^contacto/i.test(String(m[10])); else if(q.startsWith('cat:')) ok=hasCat(m,q.slice(4));
    else if(q.startsWith('clase:')) ok=deacc(m[3])===deacc(q.slice(6)); else if(q==='base<=6') ok=typeof m[7]==='number'&&m[7]<=6;
    else if(q==='conRE') ok=typeof m[12]==='number'; else if(q.includes('→')) ok=o.changed&&deacc(q.split('→')[1])===o.tipo;
    if(ok){ o.cd+=v; o.notes.push(`${h.nm} ${sg(v)} CD`); } }
  for(const h of hkOf(em,/^prec:clase:/)) if(deacc(m[3])===deacc(h.k.split(':')[2])){ o.prec+=hval(h.v); o.notes.push(`${h.nm} ${sg(hval(h.v))} % Precisión`); }
  for(const h of hkOf(em,/^prioridad:/)){ const q=h.k.slice(10); const ok=q==='todos'||(q==='Estado'?m[3]==='Estado':/^curaci/.test(q)?hasCat(m,'Curacion'):deacc(q)===o.tipo); if(ok) o.prio+=hval(h.v); }
  for(const h of hkOf(em,/^stab$/)) o.stab=hval(h.v);
  for(const h of hkOf(em,/^golpea:/)){ const [a,b]=h.k.slice(7).split('→'); if(a.split(',').some(t=>deacc(t)===o.tipo)) o.golpea.push(deacc(b)); }
  o.ignEv=hkOf(em,/^ignoraEvasion$/).length>0; o.siempre=hkOf(em,/^siempreGolpea$/).length>0;
  for(const h of hkOf(em,/^re$/)) o.reMul=hval(h.v)===0?0:2;
  return o; }
function bumpAttr(f,k,v){ f.attr ||= blankAttr(); f.attr[k] ||= {r:'',b:0}; const b0=num(f.attr[k].b), b1=clamp(b0+v,-6,6); f.attr[k].b=b1; return b1-b0; }
/* Cambia un atributo por una Habilidad (respeta «No le reducen» y Simple/Respondón) */
function habAttr(f,k,v,why,riv){ if(k==='max') k=bestAttr(f); if(k==='azar') k=pick(ATTR);
  const own=habRowsOf(f);
  if(v<0&&own.some(r=>r[5]==='noBajaAttr:todos'||r[5]==='noBajaAttr:'+k)) return `${charName(f)}: ${habOf(f)} impide bajar ${k}`;
  const ca=own.find(r=>r[5]==='cambiosAttr'); if(ca) v=ca[6]==='×2'?v*2:-v;
  const d=bumpAttr(f,k,v); let t=`${charName(f)} ${d?sg(d):'±0'} ${k} (${why})`;
  if(riv&&d<0) for(const r of habRowsOf(f,['Al cambiar atributos'])) if(r[3]==='rivalBaja'){ const mm=/^attr:(\w+)$/.exec(r[5]); if(mm){ const d2=bumpAttr(f,mm[1],hval(r[6])); t+=` · ${r[0]}: ${sg(d2)} ${mm[1]}`; } }
  return t; }
function rollResid(rank){ const dd=dice(clamp(ri(rank||'Starter')+2,1,24)); const rl=rollDice(dd); return {t:rl.t,txt:`${dd} [${rl.r.join(', ')}]`}; }

/* ---------- climas, campos y entornos (Condiciones de campo) ---------- */
const COND_TIPO={'Tormenta de Arena':'Roca',Granizo:'Hielo',Llovizna:'Agua','Sol Intenso':'Fuego',Miasma:'Veneno',Plaga:'Bicho',Penumbra:'Siniestro',Ectoplasma:'Fantasma','Campo Eléctrico':'Electrico','Campo de Hierba':'Planta','Campo Psíquico':'Psiquico','Campo de Niebla':'Hada','Campo Magnético':'Acero',Alboroto:'Normal','Turbulencia Ancestral':'Dragon','Arena de Combate':'Lucha',Lodazal:'Tierra','Viento Afín':'Volador','Arcoíris':''};
const COND_CLS={clima:'Clima',campo:'Campo',entorno:'Entorno'};
/* +1 CD al primer tipo y −1 CD al segundo */
const COND_CD={Llovizna:['Agua','Fuego'],'Sol Intenso':['Fuego','Agua'],Plaga:['Bicho','Fantasma'],Penumbra:['Siniestro','Bicho'],Ectoplasma:['Fantasma','Siniestro'],'Campo Eléctrico':['Electrico'],'Campo de Hierba':['Planta'],'Campo Psíquico':['Psiquico'],'Campo de Niebla':['Hada','Dragon'],'Turbulencia Ancestral':['Dragon','Hada']};
const COND_EV={Plaga:'Siniestro',Penumbra:'Fantasma',Ectoplasma:'Bicho'};
const condRow=n=>CONDS.find(r=>r[0]===n);
const condsDe=cls=>CONDS.filter(r=>r[1].startsWith(COND_CLS[cls]));
const condCls=n=>{ const r=condRow(n); return !r?'':r[1].startsWith('Clima')?'clima':r[1].startsWith('Campo')?'campo':'entorno'; };
const condDur=n=>/^(Viento Afín|Arcoíris)$/.test(n)?4:5;
/* Aliados: mismo Equipo (1 a 4) en Combate; «Sin Equipo» solo es aliado de sí mismo */
const eqOf=k=>num((CB.eq||{})[k]);
const aliados=(a,b)=>!!a&&!!b&&(a===b||(eqOf(a)>0&&eqOf(a)===eqOf(b)));
/* Habilidad activa (Mareado la reemplaza por Tumbos) */
const habDe=f=>deacc(habOf(f)).toLowerCase();
const CKEY=new WeakMap();
function condKeyOf(f){ if(!f) return ''; const k=CKEY.get(f); if(k) return k; if(f===S.cur&&S.open&&S.open.src!=='hist') return refKey(S.open); return ''; }
function condActivas(){ const C=CB.cond||{}, o={}; for(const k of ['clima','campo','entorno']) if(C[k]&&C[k].n) o[k]=C[k]; return o; }
const anulaClima=()=>combatants().find(x=>['aclimatacion','esclusadeaire'].includes(habDe(x.f)));
function condPara(f,key){
  const A=condActivas(), h=habDe(f);
  const clima=A.clima&&!anulaClima()?A.clima.n:'';
  const campo=A.campo&&h!=='levitacion'?A.campo.n:''; /* Levitación no recibe los efectos de los campos */
  const enSuelo=!tiposDe(f).includes('Volador')&&h!=='levitacion';
  const ent=A.entorno||null;
  return {clima, campo, entorno:ent?ent.n:'', aliado:ent&&ent.by?aliados(key,ent.by):null, rival:!!(ent&&ent.by&&!aliados(key,ent.by)), enSuelo, h, key, climaMov:h==='megasolar'?'Sol Intenso':clima};
}
function condAplica(o,f,P){
  const T=tiposDe(f), h=P.h;
  const add=(k,v,why)=>{ o.attr[k]=(o.attr[k]||0)+v; (o.src[k] ||= []).push(why); o.cn.push(`${why} ${sg(v)} ${k}`); };
  const ev=(v,why)=>{ o.esq+=v; o.tem+=v; o.cn.push(`${why} ${v>0?'+':'−'}${Math.abs(v*100)} % Evasión`); };
  const cd=(t,v,why)=>{ o.cdOwn[t]=num(o.cdOwn[t])+v; };
  const est=n=>[f.estF,f.estM].includes(n);
  { /* también a los Entrenadores */
    if(P.clima==='Tormenta de Arena'&&T.includes('Roca')) add('SAB',2,'Tormenta de Arena');
    if(P.clima==='Granizo'&&T.includes('Hielo')) add('SAB',2,'Granizo');
    if(P.campo==='Campo Magnético'&&T.includes('Acero')){ add('VIT',1,'Campo Magnético'); add('SAB',1,'Campo Magnético'); }
    if(COND_EV[P.clima]&&T.includes(COND_EV[P.clima])) ev(-0.10,P.clima);
    if(P.campo==='Arena de Combate'){ o.ic+=1; o.cn.push('Arena de Combate +1 IC'); }
    if(P.entorno==='Lodazal'&&P.rival) o.cn.push('Lodazal: se desplaza a la mitad');
  }
  for(const n of [P.clima,P.campo]){ const t=COND_CD[n]; if(!t) continue; cd(t[0],1,n); if(t[1]) cd(t[1],-1,n); }
  if(P.entorno==='Viento Afín'&&P.aliado){ add('DES',3,'Viento Afín'); o.vel+=10; }
  /* potencia al estado */
  if(P.entorno==='Lodazal'&&est('Enlodado')) add('DES',-2,'Lodazal (Enlodado)');
  if(P.clima==='Penumbra'&&est('Cegado')){ o.prec-=10; o.cn.push('Penumbra (Cegado) −10 % Precisión'); }
  if(P.entorno==='Viento Afín'&&est('Mareado')){ o.prec-=10; o.cn.push('Viento Afín (Mareado) −10 % Precisión'); }
  const thr={Paralizado:P.campo==='Campo Eléctrico'?30:0,Adormilado:P.campo==='Campo Psíquico'?30:0,Infestado:P.clima==='Plaga'?40:0};
  o.cancel=o.cancel.map(c=>thr[c.est]?{...c,thr:thr[c.est]}:c);
  if(P.campo==='Campo Magnético'&&est('Magnetizado')) for(const t of ['Electrico','Roca']) o.cdRecv[t]=num(o.cdRecv[t])+1;
  if(P.clima==='Granizo') o.salv.Congelado=num(o.salv.Congelado)-10;
  if(P.campo==='Turbulencia Ancestral') o.salv.Aterrado=num(o.salv.Aterrado)-10;
  if(P.clima==='Tormenta de Arena') o.resid.Aprisionado=1;
  if(P.clima==='Sol Intenso') o.resid.Quemado=1;
  if(P.clima==='Miasma') o.resid.Envenenado=1;
  if(P.clima==='Ectoplasma') o.resid.Maldito=1;
  if(P.clima==='Llovizna') o.skipSalv.push('Empapado');
  if(P.campo==='Campo de Niebla') o.skipSalv.push('Encantado');
  if(P.campo==='Arena de Combate') o.skipSalv.push('Provocado');
  /* Habilidades que dependen del clima o del campo */
  if(!h) return;
  const name=(D.hab.find(r=>deacc(r[0]).toLowerCase()===h)||[f.habilidad])[0];
  const up=(c,k,v)=>{ if(c) add(k,v,name); };
  up(P.clima==='Sol Intenso'&&h==='clorofila','DES',3); up(P.clima==='Llovizna'&&h==='nadorapido','DES',3);
  up(P.clima==='Granizo'&&h==='quitanieves','DES',3); up(P.clima==='Tormenta de Arena'&&h==='impetuarena','DES',3);
  up(P.campo==='Campo Eléctrico'&&h==='colasurf','DES',3); up(P.clima==='Sol Intenso'&&h==='latidooricalco','FUE',2);
  up(P.campo==='Campo Eléctrico'&&h==='motorhadronico','ENE',2); up(P.clima==='Sol Intenso'&&h==='podersolar','ENE',2);
  up(P.entorno==='Viento Afín'&&h==='surcavientos','FUE',1);
  if((P.campo==='Campo Eléctrico'&&h==='cargacuark')||(P.clima==='Sol Intenso'&&h==='paleosintesis')){ const A=attrs(f)||{}; const best=ATTR.reduce((a,k)=>num(A[k])>num(A[a])?k:a,ATTR[0]); add(best,2,name); }
  if(P.clima==='Granizo'&&h==='mantoniveo') ev(0.10,name);
  if(P.clima==='Tormenta de Arena'&&h==='veloarena') ev(0.10,name);
  if(P.clima==='Tormenta de Arena'&&h==='poderarena') ['Tierra','Roca','Acero'].forEach(t=>cd(t,1,name));
  if(P.clima==='Sol Intenso'&&h==='defensahoja') o.noEst=name;
  if(P.clima==='Sol Intenso'&&combatants().some(x=>aliados(x.key,P.key)&&habDe(x.f)==='mantofrondoso')) o.noEst='Manto Frondoso';
}
/* Don Floral alcanza al usuario y a sus aliados */
function condEquipo(o,f,P){ if(P.clima!=='Sol Intenso'||f.tipo!=='P') return;
  if(combatants().some(x=>aliados(x.key,P.key)&&habDe(x.f)==='donfloral')){ for(const k of ['FUE','SAB']){ o.attr[k]=(o.attr[k]||0)+1; (o.src[k] ||= []).push('Don Floral'); } o.cn.push('Don Floral +1 FUE y +1 SAB'); } }
/* ¿La condición impide recibir este estado? */
function condInmune(f,name){ const em=estEffects(f); const P=em.cond; if(!P) return ''; const e=estMap.get(name);
  if(em.noEst) return em.noEst;
  if(name==='Adormilado'&&P.campo==='Alboroto') return 'Alboroto';
  if(name==='Adormilado'&&P.campo==='Campo Eléctrico'&&P.enSuelo) return 'Campo Eléctrico';
  if(e&&e[2]==='Fisico'&&P.campo==='Campo de Niebla'&&P.enSuelo) return 'Campo de Niebla';
  return ''; }
/* Efecto del clima o del campo en un movimiento concreto (Precisión, CD, bloqueo) */
function condMov(m,P){ const o={cd:0,prec:0,prio:0,x2:false,block:'',notes:[]}; if(!P) return o; const t=String(m[11]||''); let r;
  const act=n=>[P.climaMov,P.campo,P.entorno].includes(n.trim());
  if(P.campo==='Alboroto'&&hasCat(m,'Sonido')){ o.cd+=1; o.notes.push('Alboroto +1 CD'); }
  if((r=/Con ([^,;]+?), aumenta su Precisi[oó]n en (\d+)\s*%; con otro clima, la reduce en (\d+)\s*%/.exec(t))){ if(act(r[1])){ o.prec+=Number(r[2]); o.notes.push(`${r[1]} +${r[2]} % Precisión`); } else if(P.climaMov){ o.prec-=Number(r[3]); o.notes.push(`${P.climaMov} −${r[3]} % Precisión`); } }
  if((r=/Con ([^,;]+?), aumenta la Clase de Dado \(CD\) en (\d+)/.exec(t))&&act(r[1])){ o.cd+=Number(r[2]); o.notes.push(`${r[1]} +${r[2]} CD`); }
  if((r=/Con ([^;]+?), reduce la Clase de Dado \(CD\) en (\d+)/.exec(t))&&r[1].split(/,\s*|\s+o\s+/).some(act)){ o.cd-=Number(r[2]); o.notes.push(`${P.climaMov} −${r[2]} CD`); }
  if((r=/Con ([^,;]+?), \+(\d+) CD; con otro (clima|Campo), −(\d+) CD/.exec(t))){ if(act(r[1])){ o.cd+=Number(r[2]); o.notes.push(`${r[1]} +${r[2]} CD`); } else if(r[3]==='clima'?P.climaMov:P.campo){ o.cd-=Number(r[4]); o.notes.push(`${r[3]==='clima'?P.climaMov:P.campo} −${r[4]} CD`); } }
  if((r=/Con ([^,;]+?), gana Prioridad \+(\d+)/.exec(t))&&act(r[1])){ o.prio+=Number(r[2]); o.notes.push(`${r[1]}: Prioridad +${r[2]}`); }
  if((r=/El da[ñn]o es doble con ([^.]+)\./.exec(t))&&act(r[1])){ o.x2=true; o.notes.push(`${r[1]}: daño doble`); }
  const C=(CB.cond||{}).clima; if(C&&C.anula&&m[2]===C.anula&&P.clima) o.block=`${C.n} anula los movimientos de tipo ${C.anula}`;
  if(P.campo==='Campo Psíquico'&&num(m[8])>0) o.block='Campo Psíquico bloquea los movimientos con Prioridad';
  return o; }
/* Condición que crea un movimiento o una Habilidad (texto del efecto) */
function condDeTexto(t){ t=String(t||''); let r;
  if((r=/[Pp]uede crear (?:la condici[oó]n de campo|el campo|el entorno|el clima) ([A-ZÁÉÍÓÚ][^.(;]*?) durante (\d+) rondas/.exec(t))&&condRow(r[1].trim())) return {n:r[1].trim(),r:Number(r[2]),re:true};
  if(/elimina el clima y la condici[oó]n de campo/i.test(t)) return {clear:true};
  if((r=/(?:[Cc]ambia el clima a|[Cc]rea la condici[oó]n de campo|[Cc]rea el entorno) ([A-ZÁÉÍÓÚ][^.(;]*?)(?: \(\w+\))? (?:durante (\d+) rondas|mientras siga)/.exec(t))){ const n=r[1].trim(); if(!condRow(n)) return null;
    const an=/anula los movimientos de tipo (\w+)/.exec(t); return {n,r:r[2]?Number(r[2]):null,anula:an?an[1]:''}; }
  return null; }
const condDeMov=m=>m[0]==='M0830'?{n:'Viento Afín',r:4}:m[0]==='M0364'?{n:'Alboroto',r:2}:condDeTexto(m[11]);
function setCond(cls,n,r,by,anula,rk){
  const prev=((CB.cond||{})[cls]||{}).n||''; const v=n?{n,r:r===undefined?condDur(n):r,by:by||'',anula:anula||'',rk:rk||'Starter'}:null;
  cbWrite({cond:{[cls]:v}});
  if(prev!==(n||'')) prediccion();
  return v; }
/* Una condición creada por un combatiente (movimiento o Habilidad) */
function crearCond(c,key,lines,why,rk){
  if(c.clear){ setCond('clima',''); setCond('campo',''); lines.push(`${why}: elimina el clima y el campo.`); return; }
  const cls=condCls(c.n); if(!cls) return; setCond(cls,c.n,c.r,key,c.anula,rk||((combatant(key)||{}).f||{}).rango);
  lines.push(`${why}: ${cls==='clima'?'el clima pasa a':cls==='campo'?'crea el campo':'crea el entorno'} ${c.n}${c.r?` (${c.r} rondas)`:' (mientras siga en combate)'}.`); }
const habNombre=h=>{ const r=D.hab.find(z=>z[0]===h); return r?r[0]:h; };
/* Botón de Habilidad en Atacar: activa su efecto cuando el jugador lo decide (al entrar, en la ronda 0 o cuando corresponda) */
function activarHab(){ const x=combatant(CBU.atk); if(!x||!canEditRef(x)||x.f.tipo!=='P') return; const h=x.f.habilidad; const ht=habMap.get(h)||'';
  const lines=[]; const nc=/^Cuando recibe/.test(ht)?null:condDeTexto(ht);
  if(x.f.estM==='Mareado') lines.push(`${h} está reemplazada por Tumbos mientras siga Mareado.`);
  else { if(nc) crearCond(nc,x.key,lines,`${charName(x.f)} (${h})`,x.f.rango);
    const rows=habRowsOf(x.f,['Botón']).filter(r=>r[8]==='Botón');
    const rivales=combatants().filter(y=>!aliados(y.key,x.key)), otros=combatants().filter(y=>y.key!==x.key), alis=combatants().filter(y=>y.key!==x.key&&aliados(y.key,x.key));
    for(const r of rows){ const k=r[5], v=hval(r[6]); let mm;
      if((mm=/^attr:(\w+)(?:\/(\w+))?$/.exec(k))){ let a=mm[1];
        if(mm[2]){ const rv=rivales[0]; const A=rv?calc(rv.f).A:null; a=A&&A.VIT<A.SAB?mm[1]:mm[2]; }
        const dest=r[4]==='Rivales'?rivales:r[4]==='Todos los demás'?otros:r[4]==='Aliados'?alis:r[4]==='Equipo'?[x,...alis]:[x];
        for(const y of dest){ let n=''; mutate(y.key,f=>{ n=habAttr(f,a,v,h,!aliados(y.key,x.key)); }); if(n) lines.push(n); }
        if(!dest.length) lines.push(`${h}: no hay a quién afectar.`); }
      else if(k==='curaPS'&&r[4]==='Aliado'){ const best=alis.map(y=>({y,c:calc(y.f)})).sort((a,b)=>a.c.act/a.c.ps-b.c.act/b.c.ps)[0];
        if(best){ const val=num(calc(x.f).A.CAR); mutate(best.y.key,f=>{ f.dano=Math.max(0,num(f.dano)-val); }); lines.push(`${charName(best.y.f)} recupera ${val} PS (${h}).`); } else lines.push(`${h}: no hay aliados en su Equipo.`); }
      else if(k==='nota'||k==='evasion') lines.push(`${h}: ${r[9]||ht}`); }
    if(/^(Aclimatacion|Esclusadeaire|Prediccion)$/.test(h)) prediccion();
    if(!lines.length) lines.push(`${charName(x.f)} activa ${h}: ${ht||'sin texto.'}`); }
  CBU.habMsg={k:x.key,lines}; logRoll(charName(x.f),`Habilidad ${h}: ${lines.join(' ')}`,null); renderSheet(); }
/* Predicción: Castform cambia de forma según el clima */
function prediccion(){ if(!S.canWrite) return; const cl=((CB.cond||{}).clima||{}).n||''; const clima=anulaClima()?'':cl;
  const want=clima==='Sol Intenso'?/Sol/:clima==='Llovizna'?/Lluvia/:clima==='Granizo'?/Nieve/:null;
  for(const x of combatants()){ if(habDe(x.f)!=='prediccion') continue; const dx=dexById.get(x.f.especie); if(!dx) continue;
    const all=[dx,...formasDe(dx)]; const to=want?all.find(r=>want.test(r[2])):all.find(r=>!/Sol|Lluvia|Nieve/.test(r[2]));
    if(to&&to[0]!==dx[0]&&canWriteCombat(x)) mutate(x.key,f=>{ f.especie=to[0]; }); } }
const canWriteCombat=x=>canEditRef(x)||(S.canWrite&&inCombat(x.key));
function cbCondHTML(){
  const C=CB.cond||{}; const M=isMaster()&&S.canWrite; const an=anulaClima();
  const box=(cls,lbl,none)=>{ const c=C[cls]; const n=c&&c.n||''; const row=condRow(n);
    const sel=M?`<select data-cond="${cls}" aria-label="${lbl}"><option value="">${none}</option>${condsDe(cls).map(r=>`<option${r[0]===n?' selected':''}>${esc(r[0])}</option>`).join('')}</select>`:`<div class="cond-ro">${esc(n||none)}</div>`;
    let ex='';
    if(n&&row){ const by=c.by?combatant(c.by):null;
      ex+=`<div class="cond-meta">${M&&c.r!=null?`<label class="mini">Rondas <input type="number" min="1" max="20" data-condr="${cls}" value="${num(c.r)}"></label>`:`<span>${c.r==null?'Mientras siga su causante':`Quedan ${c.r} ${c.r===1?'ronda':'rondas'}`}</span>`}`;
      if(cls==='entorno'&&M) ex+=`<label class="mini">Causante <select data-condby="${cls}"><option value="">—</option>${combatants().map(y=>`<option value="${esc(y.key)}"${y.key===c.by?' selected':''}>${esc(charName(y.f))} · ${esc(ownerLabel(y))}</option>`).join('')}</select></label>`;
      else if(by||cls==='entorno') ex+=`<span>Causante: ${by?esc(charName(by.f)):'—'}</span>`;
      ex+=`</div><div class="cond-fx">${esc(row[2])}${row[3]&&row[3]!=='—'?`<br>Potencia: ${esc(row[3])}`:''}${c.anula?`<br>Anula los movimientos de tipo ${esc(c.anula)}.`:''}${cls==='clima'&&an?`<br><b>${esc(charName(an.f))}</b> anula los efectos del clima.`:''}</div>`; }
    return `<div class="cond-box${n?' on':''}"${n&&COND_TIPO[n]?` style="--ct:#${TYPE_BG[COND_TIPO[n]]||'CCCCCC'}"`:''}><div class="k">${lbl}</div>${sel}${ex}</div>`; };
  return `<div class="cond-grid">${box('clima','Clima','Sin Clima')}${box('campo','Campo','Sin Campo')}${box('entorno','Entorno','Sin Entorno')}</div>`; }
/* Fondo de Combate: color del tipo del clima; si no hay, del campo; si no, del entorno */
function cbTint(){ const b=document.body; const C=CB.cond||{}; const n=S.view==='combate'?((C.clima||{}).n||(C.campo||{}).n||(C.entorno||{}).n||''):'';
  b.classList.toggle('cb-tint',!!n&&!!COND_TIPO[n]); b.classList.toggle('cb-rainbow',n==='Arcoíris');
  if(n&&COND_TIPO[n]) b.style.setProperty('--cb-tint','#'+(TYPE_BG[COND_TIPO[n]]||'CCCCCC')); else b.style.removeProperty('--cb-tint'); }
function tiposDe(f){ if(f.tipo==='E') return (f.tipos||[]).filter(Boolean); const dx=dexById.get(f.especie); return dx?dexTypes(dx):[]; }
function hpOf(f,A0){ A0=A0||attrs(f)||{FUE:0,VIT:0,ENE:0,SAB:0,DES:0,CAR:0}; const dx=f.tipo==='P'?dexById.get(f.especie):null;
  if(f.tipo==='E') return Math.ceil((0.8*hpBase(f.rango)+1.5*(A0.VIT+A0.CAR))*(1+rasgoAuto(f,'ps%').v/100));
  // Megaevolución: la Vida usa el HP Base de un Rango más (tope Legend); los atributos no cambian
  return dx?Math.ceil(hpBase(dx[5]==='Mega'&&ri(f.rango)>=0?RANGOS[Math.min(RANGOS.length-1,ri(f.rango)+1)]:f.rango)+(A0.VIT+A0.CAR)*(D.etapa[dx[5]]??1)):0; }
const psFrac=f=>{ const p=hpOf(f); return p?clamp((p-num(f.dano))/p,0,1):1; };
function calc(f){
  const A0=attrs(f)||{FUE:0,VIT:0,ENE:0,SAB:0,DES:0,CAR:0};
  const em=estEffects(f); const A={...A0}; for(const [k,v] of Object.entries(em.attr)) A[k]+=v;
  const dx=f.tipo==='P'?dexById.get(f.especie):null;
  const ps=hpOf(f,A0);
  const base = f.tipo==='E'?25:(dx?num(dx[8])||25:25);
  const vel = clamp(base+num(D.speed[f.velMod||'Normal'])+rasgoAuto(f,'vel').v+num(em.vel)+(f.orden&&f.orden.k==='mueve'?num(f.orden.v):0),10,60);
  const ev=(c,a,x)=>clamp(1-0.15*num(c)+0.15*Math.floor(a/2)+0.15*num(f.bEv)+x,0.2,1);
  const talB = f.tipo==='E'&&f.iniTal? talBonus(f,f.iniTal) : 0;
  const pdMax = f.tipo==='E'? Math.max(0,3+rasgoAuto(f,'pd').v) : 0;
  return {A, A0, em, ps, act:ps-num(f.dano), vel, talB, pdMax, ini: vel/5+A.DES+A.SAB+talB,
    esq:ev(f.cEsq,A.DES,em.esq), tem:ev(f.cTem,A.CAR,em.tem), crit:em.noCrit?0:D.crit[clamp(num(f.ic)+num(em.ic),0,5)], prec:clamp(clamp(75+5*num(f.prec),30,100)+em.prec,0,100), tipos:tiposDe(f)};
}
const dice = idx=>D.dados[clamp(idx,1,24)-1];
function moveInfo(f,id,c){
  const m=atkById.get(id); if(!m) return null;
  const hm = habMov(m, c.em); const tipo = hm.tipo;
  const stab = c.tipos.includes(tipo)?(hm.stab??1):0;
  const prec = clamp(clamp(75+5*(num(m[6])+num(f.prec)),30,100)+(c.em?c.em.prec:0),0,100);
  const isNum = typeof m[7]==='number' && m[7]>0;
  const ak = short(m[4]);
  const cm = condMov(m, c.em&&c.em.cond);
  const idx = isNum? clamp(m[7]+stab+num(c.em&&c.em.cdOwn[deacc(tipo)])+cm.cd+hm.cd,1,24):0;
  const prio = hm.prio+cm.prio;
  if(prio>0&&!cm.block&&c.em&&c.em.cond&&c.em.cond.campo==='Campo Psíquico') cm.block='Campo Psíquico bloquea los movimientos con Prioridad';
  return {m, stab, prec:clamp(prec+cm.prec+hm.prec,0,100), dice: isNum?dice(idx):'-', idx, atr: isNum? (c.A[ak]??0):null, ak, cm, hm, tipo, prio};
}
/* movimientos que alcanzan a un tipo que sería inmune (Luz Devastadora alcanza a los tipo Hada) */
const IGNORA_INMUNIDAD={M0832:['Hada']};
function effectiveness(mtype, defTypes, mvId, extra){
  const row=D.chart[mtype]; if(!row) return {steps:0,immune:false};
  let s=0, imm=false; const ign=[...(IGNORA_INMUNIDAD[mvId]||[]),...(extra||[])];
  for(const t of defTypes){ const i=D.types.indexOf(t); if(i<0) continue; const v=row[i];
    if(v==='x0'){ if(!ign.includes(t)) imm=true; } else if(typeof v==='number') s+=v; }
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
  if(!isP){ let tu=0; const to=[], or=[];
    /* Talento OverRanked: uno solo puede quedar 1 Rango sobre el del Entrenador; ese nivel extra es un punto adicional */
    ALL_TAL.forEach(t=>{const r=(f.tal||{})[t]; tu+=rb(r); const ex=ri(r)-R; if(ex===1) or.push(TAL_LABEL(t)); else if(ex>1) to.push(TAL_LABEL(t));});
    out.talOR=or.length; out.talUsed=tu; out.talMax=TAL_PTS[R]+(or.length?1:0);
    if(tu>out.talMax) out.tal.push(`Usas ${tu} puntos y el máximo es ${out.talMax}${or.length?' (incluye el punto OverRanked)':''}.`);
    if(or.length>1) out.tal.push(`Solo 1 Talento puede ser OverRanked y hay ${or.length}: ${or.join(', ')}.`);
    if(to.length) out.tal.push(`${to.join(', ')} supera${to.length>1?'n':''} el techo (${f.rango}) en más de 1 Rango.`);
    /* Méritos y Defectos: 3 puntos libres + Defectos − Méritos; avisos sin bloquear */
    const elegidos=rasgosDe(f), rs=[];
    const desconocidos=[...(f.defectos||[]),...(f.meritos||[])].filter(n=>n&&!RASGOS.has(n));
    const dPts=(f.defectos||[]).filter(n=>RASGOS.has(n)).reduce((a,n)=>a+Math.abs(num(RASGOS.get(n)[3])),0);
    const mPts=(f.meritos||[]).filter(n=>RASGOS.has(n)).reduce((a,n)=>a+num(RASGOS.get(n)[3]),0);
    out.rasLibres=PTS_LIBRES; out.rasDef=dPts; out.rasMer=mPts; out.rasSaldo=PTS_LIBRES+dPts-mPts;
    if(out.rasSaldo<0) rs.push(`Los Méritos cuestan ${mPts} y tienes ${PTS_LIBRES+dPts} puntos (${PTS_LIBRES} libres + ${dPts} de Defectos).`);
    if(desconocidos.length) rs.push(`${desconocidos.join(', ')}: no está en la lista.`);
    (f.defectos||[]).forEach(n=>{ const r=RASGOS.get(n); if(r&&r[1]!=='D') rs.push(`${n} es un Mérito, no un Defecto.`); });
    (f.meritos||[]).forEach(n=>{ const r=RASGOS.get(n); if(r&&r[1]!=='M') rs.push(`${n} es un Defecto, no un Mérito.`); });
    const norm=s=>deacc(String(s)).toLowerCase().trim();
    const vistos=new Set();
    for(const a of elegidos){ for(const b of elegidos){ if(a>=b) continue; const k=a+'|'+b; if(vistos.has(k)) continue; vistos.add(k);
      const ga=nivelGrupo(a), gb=nivelGrupo(b);
      if(a===b || (ga&&ga===gb)){ rs.push(`${a} y ${b}: solo se toma un nivel de ${ga||a}.`); continue; }
      const hits=(x,y)=>{ const items=String(RASGOS.get(x)[6]||'').split(/[,()]/).map(norm).filter(Boolean); const ny=norm(y), gy=norm(nivelGrupo(y)||y);
        return items.some(it=>it===ny||it===gy||it.startsWith(ny+' ')||it.startsWith(gy+' ')); };
      if(hits(a,b)||hits(b,a)) rs.push(`${a} y ${b} son incompatibles (el Narrador puede hacer una excepción).`); } }
    if(elegidos.length!==new Set(elegidos).size) rs.push('Hay un rasgo repetido.');
    out.ras=rs; }
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
const MAX_TIR=50; /* el historial guarda solo las últimas 50 tiradas */
function allRolls(){
  const out=[]; for(const [u,dd] of Object.entries(S.tir)) for(const e of (dd.log||[])) out.push({...e,uid:u});
  return out.sort((a,b)=>b.ts-a.ts).slice(0,MAX_TIR);
}
function histHTML(limit=MAX_TIR){
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
function newTrainer(extra={}){ const tal={}; ALL_TAL.forEach(t=>tal[t]=''); return Object.assign({tipo:'E',genero:'M',nombre:'Nuevo entrenador',rango:'Starter',attr:blankAttr(),tal,tipos:['',''],habilidad:'',estF:'',estM:'',profesion:'',edad:'',dinero:0,exp:0,pd:3,defectos:['','',''],meritos:['','','','','',''],dano:0,velMod:'Normal',iniTal:'',cEsq:0,cTem:0,bEv:0,ic:0,prec:0,moves:['','','','','',''],notas:'',img:'',creado:new Date().toISOString()},extra); }
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
/* visibilidad de las notas: pub = toda la mesa · priv = su dueño y los Masters (por defecto) · yo = solo su dueño (opción de los Masters) */
const NOTA_VIS={pub:'Pública',priv:'Privada',yo:'Solo yo'};
const notaVis=f=>NOTA_VIS[f.vis]?f.vis:'priv';
function notaVisible(u,f){ if(u===S.uid) return true; const v=notaVis(f); return v==='pub'||(v==='priv'&&isMaster()); }
const bitVis=f=>f.vis==='yo'?'yo':'masters';
const bitVisible=f=>bitVis(f)!=='yo'||!f.autor||f.autor===S.uid;
function notasDe(u){ return Object.entries(S.notas[u]||{}).filter(([,f])=>notaVisible(u,f)).map(([id,f])=>({src:'nota',uid:u,id,f})).sort((a,b)=>(b.f.creado||'').localeCompare(a.f.creado||'')); }
const NOTES_OPEN=new Set((()=>{ try{ return JSON.parse(localStorage.getItem('pkrpg.notas')||'[]')||[]; }catch(_){ return []; } })());
function toggleNotes(u){ NOTES_OPEN.has(u)?NOTES_OPEN.delete(u):NOTES_OPEN.add(u); try{ localStorage.setItem('pkrpg.notas',JSON.stringify([...NOTES_OPEN])); }catch(_){} renderList(); }
function notesBlock(u,notas,empty){ if(!notas.length) return empty?`<p class="note">${empty}</p>`:''; const open=NOTES_OPEN.has(u);
  return `<div class="nblk"><button class="item ntog" data-notes="${esc(u)}" aria-expanded="${open}"><span class="n">${open?'▾':'▸'} Notas</span><span class="pill">${notas.length}</span></button>${open?`<div class="team">${notas.map(noteItem).join('')}</div>`:''}</div>`; }
function noteItem(x){ const cur=S.open&&S.open.id===x.id; const vis=x.src==='bit'?(bitVis(x.f)==='yo'?'Solo yo':''):NOTA_VIS[notaVis(x.f)]; return `<button class="item note-i" data-open="${esc(refKey(x))}" aria-current="${cur}"><span class="n">${vis&&vis!=='Pública'?'🔒 ':''}${esc(x.f.titulo||'Sin título')}</span><span class="pill">${esc(x.f.fecha||'')}</span><span class="s">${esc((x.f.texto||'').slice(0,80))}</span></button>`; }
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
    h+=`<div class="tgrp ditem" data-drag="${esc(t.id)}"><div class="trow"><span class="grip" data-grip title="Arrastra para ordenar" aria-label="Arrastrar ${esc(charName(t.f))}">⋮⋮</span><button class="tog" data-team="${esc(k)}" aria-expanded="${open}" title="${open?'Ocultar':'Mostrar'} equipo" aria-label="${open?'Ocultar':'Mostrar'} el equipo de ${esc(charName(t.f))}" ${team.length?'':'disabled'}>${open?'▾':'▸'}<small>${team.length}</small></button>${itemHTML(t)}</div>${open&&team.length?`<div class="team">${team.map(p=>itemHTML(p,true)).join('')}</div>`:''}</div>`; }
  const loose=pool.filter(x=>x.f.tipo==='P'&&!ids.has(x.f.entrenador));
  return {h: h?`<div class="tlist dlist" data-scope="${esc(scope)}">${h}</div>`:'', loose:loose.map(p=>itemHTML(p)).join('')};
}
/* arrastrar para ordenar (mouse y pantalla táctil): .dlist[data-scope] > .ditem[data-drag], asa [data-grip] */
let DRAG=null, DRAG_END=0;
function sortByOrder(list,scope,idOf){ const o=loadOrder(scope); const pos=x=>{ const i=o.indexOf(idOf(x)); return i<0?1e9:i; }; return list.map((x,i)=>[x,i]).sort((a,b)=>pos(a[0])-pos(b[0])||a[1]-b[1]).map(a=>a[0]); }
document.addEventListener('pointerdown',e=>{ const g=e.target.closest('[data-grip]'); if(!g||(e.button!==undefined&&e.button>0)) return; const el=g.closest('.ditem'); const box=el&&el.parentElement; if(!el||!box||!box.classList.contains('dlist')) return;
  e.preventDefault(); DRAG={el,box,id:e.pointerId,moved:false}; el.classList.add('dragging'); document.body.classList.add('is-dragging'); });
window.addEventListener('pointermove',e=>{ if(!DRAG||e.pointerId!==DRAG.id) return; e.preventDefault();
  const sibs=[...DRAG.box.children].filter(x=>x!==DRAG.el&&x.classList.contains('ditem'));
  const after=sibs.find(x=>{ const r=x.getBoundingClientRect(); return e.clientY<r.top+r.height/2; });
  const ref=after||null; if(DRAG.el.nextElementSibling!==ref||(!ref&&DRAG.box.lastElementChild!==DRAG.el)){ DRAG.box.insertBefore(DRAG.el,ref); DRAG.moved=true; } },{passive:false});
function endDrag(e){ if(!DRAG||e.pointerId!==DRAG.id) return; const {el,box,moved}=DRAG; DRAG=null; el.classList.remove('dragging'); document.body.classList.remove('is-dragging'); DRAG_END=Date.now();
  if(moved) saveOrder(box.dataset.scope,[...box.children].filter(x=>x.classList.contains('ditem')).map(x=>x.dataset.drag)); renderList(); }
window.addEventListener('pointerup',endDrag); window.addEventListener('pointercancel',endDrag);
/* tocar el asa no abre ni pliega nada */
document.addEventListener('click',e=>{ if(e.target.closest('[data-grip]')||Date.now()-DRAG_END<250&&e.target.closest('.dlist')){ e.preventDefault(); e.stopPropagation(); } },true);
function folderHTML(pool,addAct){
  const groups={}; pool.forEach(x=>{ if(x.f.tipo==='P'&&x.f.entrenador&&pool.some(t=>t.id===x.f.entrenador)) return; const k=x.f.carpeta||''; (groups[k] ||= []).push(x); });
  const names=sortByOrder(Object.keys(groups).sort((a,b)=>(a==='')-(b==='')||a.localeCompare(b)),'mf.'+addAct,n=>n);
  if(!names.length) return '';
  return `<div class="dlist" data-scope="${esc('mf.'+addAct)}">`+names.map(n=>{ const sel=groups[n]; const all=pool.filter(x=>sel.includes(x)||sel.some(t=>t.id===x.f.entrenador));
    const key=addAct+'|'+n; const g=groupHTML(all,'m.'+key); const open=S.folders[key]!==false;
    return `<details class="fold ditem" data-drag="${esc(n)}" data-fold="${esc(key)}" ${open?'open':''}><summary><span><span class="grip" data-grip title="Arrastra para ordenar" aria-label="Arrastrar la carpeta ${esc(n||'Sin carpeta')}">⋮⋮</span>${esc(n||'Sin carpeta')} <span class="pill">${sel.length}</span></span>${S.canWrite?`<button class="btn sm" data-act="${addAct}" data-folder="${esc(n)}">+</button>`:''}</summary><div class="items">${g.h+g.loose}</div></details>`; }).join('')+`</div>`;
}
function renderList(){
  if(DRAG) return;
  const L=$('#list'); let h='';
  if(S.view==='mis'){
    const g=groupHTML(poolOf('jug',S.uid),'mis');
    const alias = (S.players[S.uid]||{}).alias || S.me?.name || '';
    const notas=notasDe(S.uid);
    h+=`<div class="grp"><h3>Tu nombre en la mesa</h3><input id="alias" class="btn" style="width:100%;text-align:left" value="${esc(alias)}" ${S.canWrite?'':'disabled'} aria-label="Tu nombre en la mesa"></div>`;
    h+=`<div class="grp"><h3>Mis notas ${S.canWrite?'<button class="btn sm" data-act="newNota">+ Nota</button>':''}</h3><div class="items">${notesBlock(S.uid,notas,'Notas de tu personaje. Son privadas (solo tú y los Masters) hasta que las hagas públicas.')}</div></div>`;
    h+=`<div class="grp"><h3>Entrenadores ${S.canWrite?'<button class="btn sm" data-act="newE">+ Entrenador</button>':''}</h3><div class="items">${g.h||'<p class="note">Aún no tienes entrenadores.</p>'}</div></div>`;
    h+=`<div class="grp"><h3>Pokémon sueltos ${S.canWrite?'<button class="btn sm" data-act="newP">+ Pokémon</button>':''}</h3><div class="items">${g.loose||'<p class="note">Pokémon sin entrenador, para probar o guardar.</p>'}</div></div>`;
  } else if(S.view==='mesa'){
    h+=`<div class="grp"><h3>Mesa</h3><div class="items"><button class="item" data-hist="1" aria-current="${S.open?.src==='hist'}"><span class="n">Historial de dados</span><span class="pill">${allRolls().length}</span></button></div></div>`;
    const uids=sortByOrder(Object.keys(S.players).sort((a,b)=>(a===S.uid)-(b===S.uid)||String(S.players[a].alias).localeCompare(String(S.players[b].alias))),'mesa',u=>u);
    h+=`<div class="dlist" data-scope="mesa">`;
    for(const u of uids){ const g=groupHTML(poolOf('jug',u),'mesa.'+u); const notas=notasDe(u);
      h+=`<div class="grp ditem" data-drag="${esc(u)}"><h3><span class="row" style="gap:6px;flex-wrap:nowrap"><span class="grip" data-grip title="Arrastra para ordenar" aria-label="Arrastrar a ${esc(S.players[u].alias||'Jugador')}">⋮⋮</span>${esc(S.players[u].alias||'Jugador')}${u===S.uid?' (tú)':''}${S.masters.includes(u)?' · Master':''}</span></h3><div class="items">${(notesBlock(u,notas)+g.h+g.loose)||'<p class="note">Sin fichas.</p>'}</div></div>`; }
    h+=`</div>`;
  } else if(S.view==='master'){
    const pool=Object.entries(S.master).map(([id,f])=>({src:'master',uid:null,id,f}));
    const npcs=pool.filter(x=>x.f.cat!=='salvaje'); const wild=pool.filter(x=>x.f.cat==='salvaje');
    const bits=Object.entries(S.bit).filter(([,f])=>bitVisible(f)).map(([id,f])=>({src:'bit',uid:null,id,f})).sort((a,b)=>(b.f.fecha||'').localeCompare(a.f.fecha||'')||(b.f.creado||'').localeCompare(a.f.creado||''));
    h+=`<div class="grp"><h3>Bitácora y notas ${S.canWrite?'<button class="btn sm" data-act="newBit">+ Entrada</button>':''}</h3><div class="items">${notesBlock('__bit',bits,'Resúmenes de sesión y notas de los Masters. Cada entrada puede quedar solo para ti.')}</div></div>`;
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
    const tools=[['dex','Pokédex'],['gen','Generador de Pokémon'],['mov','Movimientos'],['hab','Habilidades'],['ras','Méritos y Defectos'],['dados','Dados'],...(isMaster()?[['bloq','Bloquear Fichas']]:[])];
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
  const el=$('#sheet'); cbTint();
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
  h+=`<div class="card"><div class="head"><div><div class="portrait">${img}${S.ro?'':`<label for="imgIn">${f.img?'Cambiar':'Subir'} imagen</label><input type="file" id="imgIn" accept="image/*">`}</div>${S.ro?'':'<button class="btn sm restore" data-act="restore" title="Daño 0, intentos 0, IC, bonos y estados a 0, repeticiones reiniciadas">Restaurar Todo</button><span id="restoreConfirm"></span>'}${isP?'':`<div class="pdest">P. Destino<b data-c="pdv">${num(f.pd)}/3</b>Quedan <input type="number" min="0" max="6" data-f="pd" value="${num(f.pd)}" ${S.ro?'disabled':''} aria-label="Puntos de Destino"></div>`}</div><div style="min-width:0">
    <div class="kind">${kind}${S.ro?' · solo lectura':''}${isLocked(f)?' · <span class="lockpill" title="El Master fijó esta ficha: Habilidad, Atributos (salvo el bonus), Talentos y Méritos y Defectos no se pueden cambiar">🔒 Fijada</span>':''}</div><div class="headline">
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
    h+=`<label class="f">Dinero<input type="text" inputmode="text" data-f="dinero" value="${num(f.dinero)}" ${S.ro?'disabled':''} title="Escribe un número, o +500 / −200 para sumar o restar" aria-label="Dinero (admite +500 o −200)"></label>`;
    h+=`<label class="f">Experiencia<input type="text" inputmode="text" data-f="exp" value="${num(f.exp)}" ${S.ro?'disabled':''} title="Escribe un número, o +15 / −5 para sumar o restar" aria-label="Experiencia (admite +15 o −5)"></label>`;
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
    </div><div data-c="estfx"></div><div data-c="rascomb"></div></div>`;
  let habOpts;
  if(isP && dx){ habOpts=[...new Set([dx[15],dx[16],dx[17]].filter(x=>x&&x!=='-'))]; }
  const LK=isLocked(f)&&!S.ro; const lockDis=html=>LK?html.replace(/<(select|input|textarea)\b/g,'<$1 disabled').replace(/<button class="btn sm" data-act="(addMer|rmMer|forma[^"]*)"[^>]*>[^<]*<\/button>/g,''):html; let h0=h.length;
  h+=`<div class="card"><h2>Habilidad</h2><div class="grid g2">`;
  if(habOpts) h+=field('De su especie','habilidad',opts(habOpts.includes(f.habilidad)||!f.habilidad?habOpts:[...habOpts,f.habilidad],f.habilidad,'—'),'sel');
  else h+=`<label class="f">Habilidad<input data-f="habilidad" list="dl-hab" value="${esc(f.habilidad||'')}" placeholder="Escribe una habilidad" ${S.ro?'disabled':''}></label>`;
  h+=`</div><div class="fx-box" data-c="habfx"></div>${isP?formaHTML(f,dx):''}</div>`;
  h=h.slice(0,h0)+lockDis(h.slice(h0)); h0=h.length;
  // atributos
  h+=`<div class="card"><h2>Atributos <span class="pill" data-c="attrPts"></span></h2><div class="tw"><table class="attrt"><thead><tr><th>Atributo</th>${isP?'<th>Especie</th><th>Nat.</th>':''}<th class="wide">Entrenado</th><th>Bonus</th><th>Rango</th><th>Total</th><th>Tirar</th></tr></thead><tbody>`;
  ATTR.forEach(k=>{ const a=(f.attr||{})[k]||{};
    const amk=isP?{cls:'',tip:''}:rasgoMark(f,null,['attr:'+k]);
    h+=`<tr><td class="attr-name"><span class="attrdot" style="background:#${ATTR_BG[k]}"></span><span class="${amk.cls}"${amk.tip?` title="${esc(amk.tip)}"`:''}>${ATTR_FULL[k]}</span></td>${isP?`<td class="num" data-c="sp${k}"></td><td class="num" data-c="nt${k}"></td>`:''}
      <td><select data-f="attr.${k}.r" ${S.ro?'disabled':''} aria-label="Rango de ${ATTR_FULL[k]}">${opts(RANGOS,a.r,'—')}</select></td>
      <td><input type="number" data-f="attr.${k}.b" value="${num(a.b)}" ${S.ro?'disabled':''} aria-label="Bonus de ${ATTR_FULL[k]}"></td>
      <td class="num" data-c="rk${k}"></td><td class="tot" data-c="at${k}"></td><td><button class="d20btn" data-rollattr="${k}" title="Tirar 1d20 + ${ATTR_FULL[k]}" aria-label="Tirar 1d20 + ${ATTR_FULL[k]}">${D20_SVG}</button></td></tr>`; });
  h+=`</tbody></table></div><div class="check" data-c="attrChk"></div>${LK?'<p class="note lknote">🔒 Ficha fijada: solo el bonus se puede cambiar.</p>':''}<p class="note">${isP?'Total = entrenamiento + especie + naturaleza + bonus + rango del Pokémon.':'Total = rango del atributo + bonus + rango del Entrenador.'} Cada nivel entrenado cuesta 1 punto y ninguno supera el Rango del personaje.</p></div>`;
  if(LK) h=h.slice(0,h0)+h.slice(h0).replace(/<select data-f="attr\./g,'<select disabled data-f="attr.'); h0=h.length;
  if(!isP){
    h+=`<div class="card"><h2>Talentos <span class="pill" data-c="talPts"></span></h2><div class="tal">`;
    for(const [cat,col,list] of TALENTOS){ h+=`<div><div class="cat" style="color:${col}">${cat}</div>`;
      for(const t of list){ const r=(f.tal||{})[t]||''; const mk=rasgoMark(f,'tal:'+t,condKeysTal(t));
        h+=`<div class="t"><button class="linkbtn ${mk.cls}" data-rolltal="${t}"${mk.tip?` title="${esc(mk.tip)}"`:''}>${TAL_LABEL(t)}</button><select data-f="tal.${t}" ${S.ro?'disabled':''} aria-label="Rango de ${TAL_LABEL(t)}">${optsCode(r)}</select><b class="${mk.auto>0?'rs-up':mk.auto<0?'rs-down':''}">${talBonus(f,t)}</b></div>`; }
      h+=`</div>`; }
    h+=`</div><div class="check" data-c="talChk"></div><p class="note">Clic en un talento para tirar 1d20 + talento + el atributo que elijas.</p></div>`;
    h+=rasgosCardHTML(f);
    h=h.slice(0,h0)+lockDis(h.slice(h0));
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
const AP_CLS={'Ficha (automático)':'ap-auto','Situacional':'ap-sit','Combate':'ap-comb','Creación':'ap-crea','Narrativo':'ap-narr'};
/* Cambios de forma: cambian la especie (ID de la Pokédex) y conservan todo lo demás */
const FORMA_HAB={Mododaruma:'ps50',Fuerteafecto:'master+ps50',Escudolimitado:'ps50',Agrupamiento:'ps50',Banco:'banco',Cambioheroico:'',Cambiotactico:'',Mutapetito:'',Teracambio:'',Disfraz:'',Caradehielo:''};
const formasDe = dx => dx? D.dex.filter(r=>r[1]===dx[1]&&r[0]!==dx[0]&&r[5]!=='Mega') : [];
function formaLista(f,c,dx){ const k=FORMA_HAB[f.habilidad]; if(!k||!dx) return false; const pr=c.ps?c.act/c.ps:1, M=ri(f.rango)>=4;
  if(k==='ps50') return pr<0.5 && !/Daruma|Completa|N[uú]cleo|V[ií]nculo/i.test(dx[2]);
  if(k==='master+ps50') return M&&pr<0.5 && !/V[ií]nculo/i.test(dx[2]);
  if(k==='banco') return (M&&pr>0.25)!==/Banco/i.test(dx[2]);
  return false; }
function formaHTML(f,dx){ if(!(f.habilidad in FORMA_HAB)) return ''; const fs=formasDe(dx); if(!fs.length) return '';
  let h=`<div class="row" style="margin-top:8px"><button class="btn sm" data-act="formas" data-c="formaBtn" ${S.ro?'disabled':''}>Cambiar forma</button><span class="note" data-c="formaHint"></span></div>`;
  if(S.formOpen&&!S.ro){ h+=`<div class="row" style="margin-top:6px">${fs.map(r=>`<button class="btn sm" data-act="setForma" data-id="${esc(r[0])}" title="${esc(dexTypes(r).join(' / '))}">${esc(r[2]||r[1])}${fs.filter(x=>x[2]===r[2]).length>1?` (${esc(dexTypes(r).join('/'))})`:''}</button>`).join('')}${f.habilidad==='Escudolimitado'?'<button class="btn sm pri" data-act="setForma" data-id="__nucleo">Núcleo al azar</button>':''}</div>`; }
  return h; }
function rasgoOpHTML(f,kind,i,n){ const [k,lbl]=RASGO_OP[n]; const v=(((f.rasgoOp||{})[kind])||[])[i]||''; const path=`rasgoOp.${kind}.${i}`, dis=S.ro?'disabled':'';
  const sel=list=>`<select data-f="${path}" ${dis} aria-label="${esc(lbl)} de ${esc(n)}"><option value="">Elegir…</option>${list.map(([val,t])=>`<option value="${esc(val)}"${val===v?' selected':''}>${esc(t)}</option>`).join('')}</select>`;
  let ctl;
  if(k==='tipo') ctl=sel(D.types.map(t=>[t,t]));
  else if(k==='tipoPropio'){ const ts=tiposDe(f); ctl=ts.length?sel(ts.map(t=>[t,t])):'<span class="note">Primero elige los tipos del Entrenador</span>'; }
  else if(k==='sentido') ctl=sel(SENTIDOS.map(t=>[t,t]));
  else if(k==='clima') ctl=sel(condsDe('clima').map(r=>[r[0],r[0]]));
  else if(k==='campo') ctl=sel(condsDe('campo').map(r=>[r[0],r[0]]));
  else if(k==='talento') ctl=sel(ALL_TAL.map(t=>[t,TAL_LABEL(t)]));
  else if(k==='pokemon'){ const team=S.open?teamOf(S.open):[]; ctl=team.length?sel(team.map(x=>[x.id,charName(x.f)])):'<span class="note">Sin Pokémon en su equipo</span>'; }
  else ctl=`<input data-f="${path}" value="${esc(v)}" list="dl-tipos" placeholder="Un tipo, una especie, un Team…" ${dis} aria-label="${esc(lbl)}">`;
  return `<label class="rasop${v?'':' falta'}"><span>${esc(lbl)}</span>${ctl}</label>`; }
function rasgosCardHTML(f){
  const def=[...(f.defectos||[])]; while(def.length<N_DEF) def.push('');
  const mer=[...(f.meritos||[])]; while(mer.length<N_MER) mer.push('');
  const slot=(kind,i,n)=>{ const r=RASGOS.get(n); const isD=kind==='defectos';
    return `<div class="ras ${isD?'def':'mer'}"><input data-f="${kind}.${i}" list="dl-${isD?'def':'mer'}" value="${esc(n||'')}" placeholder="${isD?'Defecto':'Mérito'} ${i+1}" ${S.ro?'disabled':''} aria-label="${isD?'Defecto':'Mérito'} ${i+1}">${r&&RASGO_OP[n]?rasgoOpHTML(f,kind,i,n):''}${r?`<div class="meta"><b class="${r[3]<0?'ko':'ok'}">${sg(r[3])}</b><span class="pill ${AP_CLS[r[4]]||''}">${esc(r[4])}</span><span>${esc(r[2])}</span></div><div class="fx">${esc(r[5])}</div>`:''}</div>`; };
  const nM=mer.length, last3=mer.slice(-3).every(x=>!x);
  return `<div class="card"><h2>Méritos y Defectos <span class="pill" data-c="rasPts"></span></h2>
    <h3 class="subh" style="margin-top:0">Defectos · máximo ${N_DEF}</h3><div class="ras-grid">${def.slice(0,N_DEF).map((n,i)=>slot('defectos',i,n)).join('')}</div>
    <h3 class="subh">Méritos</h3><div class="ras-grid">${mer.map((n,i)=>slot('meritos',i,n)).join('')}</div>
    ${S.ro?'':`<div class="row" style="margin-top:8px"><button class="btn sm" data-act="addMer">+Agregar</button>${nM>N_MER&&last3?'<button class="btn sm" data-act="rmMer">Quitar 3 vacíos</button>':''}</div>`}
    <div class="check" data-c="rasChk"></div>
    </div>`;
}
function visHTML(f,isBit){
  const mine=isBit?(!f.autor||f.autor===S.uid):S.open.uid===S.uid; const dis=S.ro||!mine?'disabled':'';
  const o=isBit?[['masters','Masters (todos los Masters la ven)'],['yo','Solo yo (oculta para los demás Masters)']]
    :[['priv','Privada (tú y los Masters)'],['pub','Pública (toda la mesa)'],...(isMaster()?[['yo','Solo yo (oculta también para los demás Masters)']]:[])];
  const cur=isBit?bitVis(f):notaVis(f);
  return `<div class="grid g2" style="margin-top:10px"><label class="f">Visibilidad<select data-f="vis" ${dis}>${o.map(([v,t])=>`<option value="${v}"${v===cur?' selected':''}>${t}</option>`).join('')}</select></label></div>
    <p class="note">${isBit?(cur==='yo'?'Solo tú ves esta entrada.':'Solo los Masters ven la bitácora.'):cur==='pub'?'Toda la mesa puede leer esta nota.':cur==='yo'?'Solo tú ves esta nota.':'Solo tú y los Masters ven esta nota.'}${mine?'':' Solo su autor cambia la visibilidad.'}</p>`; }
function noteHTML(f){
  const isBit=S.open.src==='bit';
  return `<div class="card"><div class="kind">${isBit?'Bitácora del Master':'Nota de '+esc(S.players[S.open.uid]?.alias||'jugador')}${S.ro?' · solo lectura':''}</div>
    <div class="headline"><input class="name" data-f="titulo" value="${esc(f.titulo||'')}" placeholder="Título" aria-label="Título" ${S.ro?'disabled':''}></div>
    <div class="grid g3" style="margin-top:12px">${field('Fecha','fecha',f.fecha||'','date')}${isBit?field('Tipo','clase',opts(['Sesión','Nota','Trama','Lugar','Personaje'],f.clase||'Sesión'),'sel'):''}</div>
    <div style="margin-top:10px">${field('Texto','texto',f.texto||'','area',16)}</div>
    ${visHTML(f,isBit)}</div>
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
  const ef=[f.estF,f.estM].filter(Boolean).map(e=>{const rr=estMap.get(e);return rr?`<div class="fx-box"><b>${esc(e)}</b> (${esc(rr[1])}) — ${esc(rr[3])} <span class="note">Salvación ${esc(rr[4])}${num((c.em.salv||{})[e])?` <span class="rs-up">${sg(c.em.salv[e])} por rasgo</span>`:''}${rr[5]!=='-'?' · +'+esc(rr[5])+' por ronda':''}</span>${imm.includes(e)?' <b class="ko">Es inmune a este estado por su tipo.</b>':''}</div>`:''}).join('');
  const ap=[...Object.entries(c.em.attr).map(([k,v])=>`${v} ${k}`), c.em.prec?`${c.em.prec}% Precisión`:'', c.em.esq?`${Math.round(c.em.esq*100)}% Esquiva`:'', c.em.tem?`${Math.round(c.em.tem*100)}% Temple`:'', c.em.noCrit?'Crítico 0%':''].filter(Boolean);
  set('estfx',ef+(ap.length?`<p class="note">Ya aplicado en la ficha: ${ap.join(' · ')}.</p>`:'')+(imm.length?`<p class="note">Inmune por su tipo: ${imm.join(', ')}.</p>`:''));
  const nat=natMap.get(f.nat);
  ATTR.forEach((k,i)=>{ set('at'+k, (attrs(f)?c.A[k]+(c.em.attr[k]?` <span class="ko" style="font-size:12px" title="${esc((c.em.src[k]||[]).join(', '))}">(${c.em.attr[k]} ${esc((c.em.src[k]||[]).join(', '))})</span>`:''):'—')); set('rk'+k,'+'+rb(f.rango));
    if(isP){ set('sp'+k, dx?dx[9+i]:'—'); set('nt'+k, nat?(nat[2]===k?'<span class="ok">+1</span>':nat[3]===k?'<span class="ko">−1</span>':'0'):'0'); }});
  set('habfx', (f.tipo==='P'&&f.estM==='Mareado'?`<b>Mareado: reemplazada por Tumbos mientras dure.</b> ${esc(habMap.get('Tumbos')||'')}<br><span class="note">${f.habilidad?esc(f.habilidad)+' vuelve al terminar Mareado.':''}</span>`:'')||(f.habilidad? esc(habMap.get(f.habilidad)||'Habilidad fuera de la lista.') : '<span class="note">Sin habilidad elegida.</span>'));
  if(isP){ const fb=document.querySelector('[data-c="formaBtn"]'); if(fb){ const ok=formaLista(f,c,dx); fb.classList.toggle('pri',ok); set('formaHint',ok?'Se cumple la condición para cambiar de forma.':''); } }
  const ck=checkSheet(f,c);
  const list=a=>a.map(x=>`<span class="ko">${esc(x)}</span>`).join('');
  if(ck.attrMax!==undefined){ set('attrPts',`${ck.attrUsed}/${ck.attrMax} pts`); document.querySelector('[data-c="attrPts"]')?.classList.toggle('ko',ck.attr.length>0); }
  set('attrChk',list(ck.attr));
  if(ck.talMax!==undefined){ set('talPts',`${ck.talUsed}/${ck.talMax} pts`); document.querySelector('[data-c="talPts"]')?.classList.toggle('ko',ck.tal.length>0); }
  set('talChk',list(ck.tal||[]));
  if(!isP){
    if(ck.talMax!==undefined) set('talPts',`${ck.talUsed}/${ck.talMax} pts · OR ${Math.min(1,ck.talOR)}/1`);
    const sal=ck.rasSaldo; set('rasPts',`${ck.rasLibres} libres + ${ck.rasDef} Defectos − ${ck.rasMer} Méritos = ${sal}`);
    document.querySelector('[data-c="rasPts"]')?.classList.toggle('ko',(ck.ras||[]).length>0);
    set('rasChk',list(ck.ras||[]));
    const mark=(k,key)=>{ const a=rasgoAuto(f,key); document.querySelectorAll(`[data-c="${k}"]`).forEach(e=>{ e.classList.toggle('rs-up',a.v>0); e.classList.toggle('rs-down',a.v<0); e.title=a.src.join(' · '); }); };
    mark('ps','ps%'); mark('vel','vel'); mark('pdv','pd');
    set('pdv',`${num(f.pd)}/${c.pdMax}`);
    const comb=rasgosDe(f).map(n=>RASGOS.get(n)).filter(r=>r[4]==='Combate'&&!RFX.some(x=>x[0]===r[0]&&/^(cdRecv|salv)/.test(x[1])));
    const res=c.em.resist||[];
    set('rascomb',(res.length?`<p class="note">Resistencias pasivas (se aplican solas): ${res.map(x=>`<span class="rs-up">${esc(x)}</span>`).join(' · ')}.</p>`:'')
      +(comb.length?`<p class="note">Rasgos de combate: ${comb.map(r=>`<span class="rs-cond" title="${esc(r[5])}">${esc(r[0])}</span>`).join(' · ')}.</p>`:''));
  }
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
  if(isLocked(S.cur)&&LOCK_RX.test(p)){ showBanner('Esta ficha está fijada por el Master.'); renderSheet(); return; }
  if(el.tagName==='SELECT') selColor(el);
  const f=S.cur; let v=el.value; let full=false;
  if(el.type==='number') v=num(v);
  if(p==='dano'||p==='exp'||p==='dinero'){ const r=calcExpr(f[p],v); if(r===null){ el.setCustomValidity('Usa un número, o +15 / −5'); el.reportValidity(); return; } el.setCustomValidity(''); f[p]=r; el.value=r; commit(false); return; }
  if(p==='especieL'){ const id=dexByLabel.get(v)||''; if(v&&(!id||!speciesAllowed(id)&&f.especie!==id)){ el.setCustomValidity(id?'El Master aún no desbloquea esta especie en la Pokédex':'Especie no encontrada'); el.reportValidity(); return;} el.setCustomValidity(''); f.especie=id; const dx=dexById.get(id); if(dx) f.habilidad=dx[15]||''; full=true; }
  else if(p.startsWith('moves.')){ const id=v?atkByName.get(v.toLowerCase().trim())||'':''; if(v&&!id){ el.setCustomValidity('Movimiento no encontrado'); el.reportValidity(); return;} el.setCustomValidity(''); setPath(f,p,id); full=true; }
  else if(p==='entrenador'&&v.startsWith('jug|')){ const [,u,tid]=v.split('|'); capturePokemon(u,tid); return; }
  else if(p==='entrenador'){ if(v){ const team=teamOf({...S.open,id:v}).filter(x=>x.id!==S.open.id&&x.f.lugar!=='caja'); f.lugar= team.length>=6?'caja':''; } else f.lugar=''; f.entrenador=v; full=true; }
  else if(p==='lugar'){ if(!v){ const team=teamOf({...S.open,id:f.entrenador}).filter(x=>x.id!==S.open.id&&x.f.lugar!=='caja'); if(team.length>=6){ showBanner('El equipo ya tiene 6 Pokémon. Pasa uno a la caja primero.'); el.value='caja'; return;} } f.lugar=v; }
  else if(/^mochila\.\d+\.eq$/.test(p)){ if(v) (f.mochila||[]).forEach(it=>{ if(it.eq===v) it.eq=''; }); setPath(f,p,v); full=true; }
  else if(p.startsWith('mochila.')){ setPath(f,p,v); fillMochila(); }
  else if(p.startsWith('tal.')||p==='cat'){ setPath(f,p,v); full=true; }
  else if(/^(defectos|meritos)\.\d+$/.test(p)){ v=v.trim(); const r=RASGOS.get(v); const want=p.startsWith('defectos')?'D':'M';
    if(v&&(!r||r[1]!==want)){ el.setCustomValidity(r?(want==='D'?'Ese es un Mérito: va en Méritos':'Ese es un Defecto: va en Defectos'):'No está en la lista de '+(want==='D'?'Defectos':'Méritos')); el.reportValidity(); return; }
    el.setCustomValidity(''); const k=p.split('.')[0]; const arr=[...(f[k]||[])]; while(arr.length<(k==='defectos'?N_DEF:N_MER)) arr.push(''); arr[num(p.split('.')[1])]=v; f[k]=arr; if(f.rasgoOp&&f.rasgoOp[k]) f.rasgoOp[k][num(p.split('.')[1])]=''; full=true; }
  else if(p.startsWith('rasgoOp.')){ setPath(f,p,v.trim()); full=true; }
  else if(p==='vis'){ if(S.open.src==='bit'){ if(f.autor&&f.autor!==S.uid) return; if(!f.autor) f.autor=S.uid; } else if(S.open.uid!==S.uid) return; f.vis=v; full=true; }
  else if(p==='estF'||p==='estM'){ setPath(f,p,v); setEstFx(f,p==='estF'?'F':'M',v?{r:f.rango||'Starter'}:null); if(v==='Aturdido'){ const m=aturdir(refKey(S.open),f); if(m) showBanner(`${charName(f)}: ${m}.`); } full=true; }
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
/* consultas de rasgos para una tirada d20: las del Talento y del Atributo elegidos y las que valen para cualquier tirada */
function rpConsultas(f){ if(!f||f.tipo!=='E') return []; const keys=['all','attr:'+RP.attr].concat(RP.tal?condKeysTal(RP.tal):[]);
  return rasgoFxDe(f).map((r,i)=>({r,id:r[0]+'|'+r[1]+'|'+r[4],auto:rasgoOpAuto(f,r[0])})).filter(x=>!x.r[3]&&keys.includes(x.r[1])&&num(x.r[2])!==0); }
/* ¿La condición de la subopción se cumple ahora? (clima activo, o alguien de ese tipo en el combate) */
function rasgoOpAuto(f,n){ const v=rasgoOp(f,n); if(!v) return false; const K=condKeyOf(f); if(!K||!inCombat(K)) return false;
  if(/^(Sensible|Afinidad) al Clima$/.test(n)) return (((CB.cond||{}).clima||{}).n||'')===v&&!anulaClima();
  if(/^(Sensible|Afinidad) al Campo$/.test(n)) return (((CB.cond||{}).campo||{}).n||'')===v;
  if(/^Alergia a un Tipo/.test(n)) return combatants().some(y=>y.key!==K&&tiposDe(y.f).includes(v));
  return false; }
function renderRP(){
  const el=$('#rp'); if(!RP||!S.cur){ el.hidden=true; return; }
  if(RP.kind==='res'){ el.innerHTML=`<h4>${esc(RP.title)} <button class="btn sm" data-rp="close" aria-label="Cerrar">✕</button></h4><div class="out"><span class="big ${RP.res.cls}">${RP.res.v}</span><span class="note" style="text-align:right">${RP.res.html}</span></div>`; el.hidden=false; return; }
  const f=S.cur, c=calc(f); let h='';
  if(RP.kind==='attr'||RP.kind==='tal'){
    const isE=f.tipo==='E';
    h+=`<h4>Tirada 1d20 <button class="btn sm" data-rp="close" aria-label="Cerrar">✕</button></h4><div class="note"><b>${esc(charName(f))}</b></div>`;
    h+=`<div class="grid g2"><label class="f">Atributo<select id="rpA">${ATTR.map(k=>`<option value="${k}"${RP.attr===k?' selected':''}>${ATTR_FULL[k]} (${c.A[k]>=0?'+':''}${c.A[k]})</option>`).join('')}${RP.kind==='tal'?'':''}</select></label>`;
    h+= isE?`<label class="f">Talento<select id="rpT"><option value="">Ninguno</option>${ALL_TAL.map(t=>`<option value="${t}"${RP.tal===t?' selected':''}>${TAL_LABEL(t)} (${talBonus(f,t)>=0?'+':''}${talBonus(f,t)})</option>`).join('')}</select></label>`:'<div></div>';
    h+=`</div>`;
    const cq=rpConsultas(f); RP.cq=cq; RP.chk ||= {}; cq.forEach(x=>{ if(x.auto&&RP.chk[x.id]===undefined) RP.chk[x.id]=true; });
    if(cq.length) h+=`<div class="rs-ask"><div class="k">¿Aplica algún rasgo?</div>${cq.map((x,i)=>`<label><input type="checkbox" data-rc="${i}"${RP.chk[x.id]?' checked':''}> <b class="rs-cond">${esc(x.r[0])}</b> ${x.r[2]===-99?'falla automáticamente':sg(x.r[2])}${x.r[4]?` <span class="note">(${esc(x.r[4])})</span>`:''}</label>`).join('')}</div>`;
    h+=`<label class="f">Bonus extra<input type="number" id="rpX" value="${num(RP.x)}"></label><button class="btn pri" data-rp="roll">Tirar</button>`;
  } else if(RP.kind==='move'){
    const mi=moveInfo(f,(f.moves||[])[RP.i],c); if(!mi){ el.hidden=true; return; }
    h+=`<h4>${esc(mi.m[1])} <button class="btn sm" data-rp="close" aria-label="Cerrar">✕</button></h4>
      <div class="row"><span class="pill">Precisión ${mi.prec}%</span><span class="pill">R. Extra ${typeof mi.m[12]==='number'?pct(mi.m[12]):'—'}</span><span class="pill">Crítico ${pct(c.crit)}</span></div>
      <button class="btn pri" data-rp="roll">Tirar d100</button>`;
    if(f.tipo==='E'){ const comb=rasgosDe(f).map(n=>RASGOS.get(n)).filter(r=>r[4]==='Combate'); if(comb.length) h+=`<div class="rs-ask"><div class="k">Rasgos de combate</div>${comb.map(r=>`<div><b class="rs-cond">${esc(r[0])}</b> <span class="note">${esc(r[5])}</span></div>`).join('')}</div>`; }
  }
  if(RP.res) h+=`<div class="out"><span class="big ${RP.res.cls||''}">${RP.res.v}</span><span class="note" style="text-align:right">${RP.res.html}</span></div>`;
  el.innerHTML=h; el.hidden=false;
}
function doRP(){
  const f=S.cur, c=calc(f);
  if(RP.kind==='attr'||RP.kind==='tal'){
    RP.attr=$('#rpA').value; RP.tal=$('#rpT')?$('#rpT').value:''; RP.x=num($('#rpX').value);
    const cq=(RP.cq||[]).filter(x=>RP.chk&&RP.chk[x.id]); const fail=cq.some(x=>x.r[2]===-99); const rmod=cq.filter(x=>x.r[2]!==-99).reduce((s,x)=>s+num(x.r[2]),0);
    const r=d(20); const a=c.A[RP.attr]; const t=RP.tal?(f.tipo==='E'?talBonus(f,RP.tal):rb((f.tal||{})[RP.tal])):0; const tot=r+a+t+rmod+RP.x;
    const nat = fail?'<b class="ko">Falla automáticamente por un rasgo</b>':r===20?'<b class="ok">20 natural: éxito</b>':r===1?'<b class="ko">1 natural: fallo</b>':'';
    const txt=`1d20 [${r}] + ${RP.attr} ${a}${RP.tal?` + ${TAL_LABEL(RP.tal)} ${t}`:''}${cq.filter(x=>x.r[2]!==-99).map(x=>` ${x.r[2]<0?'−':'+'} ${Math.abs(x.r[2])} ${x.r[0]}`).join('')}${RP.x?` + ${RP.x}`:''}${fail?' · '+cq.filter(x=>x.r[2]===-99).map(x=>x.r[0]).join(', ')+': falla':''}`;
    RP.res={v:tot,cls:fail||r===1?'ko':r===20?'ok':'',html:esc(txt)+(nat?'<br>'+nat:'')};
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
document.getElementById('rp').addEventListener('change',e=>{ if(!RP) return; const el=e.target;
  if(el.dataset.rc!==undefined){ const x=(RP.cq||[])[num(el.dataset.rc)]; if(x){ RP.chk ||= {}; RP.chk[x.id]=el.checked; } return; }
  if(el.id==='rpA'||el.id==='rpT'){ RP.attr=$('#rpA').value; RP.tal=$('#rpT')?$('#rpT').value:''; RP.x=num($('#rpX')?.value); renderRP(); } });
document.getElementById('rp').addEventListener('click',e=>{ const b=e.target.closest('[data-rp]'); if(!b) return; if(b.dataset.rp==='close'){ RP=null; renderRP(); } else doRP(); });

/* ---------- glosario ---------- */
const tbl=(hd,rows)=>`<div class="tw"><table class="gt"><thead><tr>${hd.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td${i===0?' class="attr-name"':''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const ej=t=>`<div class="ej"><b>Ejemplo.</b> ${t}</div>`;
const SOC=[['Dureza','Picante','Amarillo','Ácida, Salada','Dulce, Amarga'],['Estilo','Ácida','Rojo','Amarga, Picante','Salada, Dulce'],['Belleza','Amarga','Azul','Dulce, Ácida','Picante, Salada'],['Dulzura','Dulce','Rosa','Salada, Amarga','Ácida, Picante'],['Astucia','Salada','Verde','Picante, Dulce','Amarga, Ácida']];
const CONDS=[['Tormenta de Arena','Clima','Roca +2 SAB. Quien no es Roca, Tierra ni Acero recibe residual cada ronda.','Aprisionado: residual +1 Rango.'],['Granizo','Clima','Hielo +2 SAB. Quien no es Hielo recibe residual cada ronda.','Congelado: Salvación −10.'],['Llovizna','Clima','Agua +1 CD y Fuego −1 CD.','Empapado: evita la Salvación 1 ronda.'],['Sol Intenso','Clima','Fuego +1 CD y Agua −1 CD.','Quemado: residual +1 Rango.'],['Miasma','Clima','Al final de cada ronda, quien no es Veneno puede quedar Envenenado.','Envenenado: residual +1 Rango.'],['Plaga','Clima','Bicho +1 CD, Fantasma −1 CD; los Siniestro −10 % de Evasión.','Infestado: umbral 40 (en vez de 50).'],['Penumbra','Clima','Siniestro +1 CD, Bicho −1 CD; los Fantasma −10 % de Evasión.','Cegado: −10 % de Precisión extra.'],['Ectoplasma','Clima','Fantasma +1 CD, Siniestro −1 CD; los Bicho −10 % de Evasión.','Maldito: residual +1 Rango.'],['Campo Eléctrico','Campo','Eléctrico +1 CD. Nadie en el suelo puede quedar Adormilado.','Paralizado: umbral 30 (en vez de 45).'],['Campo de Hierba','Campo','Planta +1 CD. Quien está en el suelo recupera residual cada ronda.','Drenado: quien lo causó recupera el doble.'],['Campo Psíquico','Campo','Psíquico +1 CD. Bloquea los movimientos con Prioridad.','Adormilado: umbral 30 (en vez de 45).'],['Campo de Niebla','Campo','Hada +1 CD y Dragón −1 CD. Nadie en el suelo recibe estados Físicos.','Encantado: evita la Salvación 1 ronda.'],['Campo Magnético','Campo','Acero +1 VIT y +1 SAB.','Magnetizado: Eléctrico y Roca +1 CD extra.'],['Alboroto','Campo','Movimientos de Sonido +1 CD. Nadie puede quedar Adormilado.','Aturdido: además no puede moverse.'],['Turbulencia Ancestral','Campo','Dragón +1 CD y Hada −1 CD.','Aterrado: Salvación −10.'],['Arena de Combate','Campo','+1 al IC de todos los Pokémon en el campo.','Provocado: evita la Salvación 1 ronda.'],['Lodazal','Entorno','Los rivales se desplazan a la mitad.','Enlodado: además −2 DES.'],['Viento Afín','Entorno','Los aliados ganan +3 DES y +10 ft de Velocidad durante 4 rondas.','Mareado: −10 % de Precisión extra.'],['Arcoíris','Entorno (4 rondas)','Se crea al combinar 2 movimientos Voto en la misma ronda. Duplica el Rango Extra del equipo.','—']];
const condTipo=t=>{const e=estMap.get(String(t).split(':')[0].trim()); return e?chip(e[1]):'—';};
const MONTURAS=[["Arnés de hombro", 1, "Mediano", 4, "Tierra firme (Pokémon bípedos medianos)", "Caídas leves", 2000], ["Silla de montar", 1, "Mediano", 3, "Tierra firme, Montaña, Arena, Nieve y hielo", "Caídas leves, polvo y barro", 3500], ["Cesta de carga", 1, "Mediano", 4, "Aire (corto alcance), Montaña (escalada)", "Caídas y golpes contra la roca", 4000], ["Silla marina", 1, "Mediano", 3, "Agua, Corrientes y cascadas", "Agua, oleaje y corrientes", 4500], ["Balsa", 2, "Pequeño", 5, "Agua (aguas tranquilas; no sube cascadas)", "Agua y oleaje leve", 5000], ["Remolque", 2, "Pequeño", 5, "Tierra firme, Subterráneo (túnel terminado)", "Carga pesada y terreno irregular", 6000], ["Silla de montar doble", 2, "Grande", 6, "Tierra firme, Montaña, Arena, Nieve y hielo", "Caídas leves, polvo y barro", 7000], ["Silla ignífuga", 1, "Mediano", 3, "La del Pokémon (obligatoria si es de tipo Fuego)", "Fuego, calor extremo y Quemado", 8000], ["Silla aislante", 1, "Mediano", 3, "La del Pokémon (obligatoria si es de tipo Eléctrico)", "Descargas eléctricas, Paralizado y Magnetizado", 8000], ["Silla marina doble", 2, "Grande", 6, "Agua, Corrientes y cascadas", "Agua, oleaje y corrientes", 9000], ["Traje de buceo", 1, "Mediano", 3, "Bajo el agua (lo usa el jinete, con la Silla marina)", "Falta de aire, presión y frío del agua", 9000], ["Arnés de vuelo", 1, "Mediano", 4, "Aire", "Viento, frío de altura y maniobras bruscas", 12000], ["Silla ignífuga doble", 2, "Grande", 6, "La del Pokémon (obligatoria si es de tipo Fuego)", "Fuego, calor extremo y Quemado", 15000], ["Silla aislante doble", 2, "Grande", 6, "La del Pokémon (obligatoria si es de tipo Eléctrico)", "Descargas eléctricas, Paralizado y Magnetizado", 15000], ["Cabina de excavación", 3, "Grande", 7, "Subterráneo", "Derrumbes, oscuridad y gases", 15000], ["Cabina", 3, "Grande (o bandada)", 7, "Aire (aerotaxi; en bandada si la especie es Mediana o menor)", "Clima: lluvia, viento, frío y granizo", 25000], ["Cabina sumergible", 3, "Grande", 7, "Bajo el agua, Agua", "Falta de aire, presión y frío del agua", 32000], ["Plataforma", 4, "Enorme", 8, "Tierra firme, Agua, Aire", "Oleaje, caídas y clima", 35000], ["Plataforma grande", 6, "Colosal", 10, "Tierra firme, Agua, Aire", "Oleaje, caídas y clima", 60000]]; // Pokemon_RPG 3.2.14, hoja Monturas
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
<ul><li><b>Desgaste:</b> cada intento cuenta, salga bien o mal.</li><li><b>Bono de Evasión</b> (−3 a +3, 15 % por punto): Reposicionar +1 o +2, 01 natural +1, fallo crítico −1.</li><li>Fuera del combate, un Pokémon recupera 1 intento por ronda.</li><li><b>Esquiva crítica:</b> si la tirada que esquiva es ≤ su probabilidad de crítico (siempre con 01), puede atacar otra vez esta ronda: si ya atacó recupera su Acción; si no, su próximo ataque no la gasta.</li></ul>
${ej('Un Pokémon con DES 5, 2 intentos previos y Bono +1 tiene 100 − 30 + 30 + 15 = 115 %, que queda en 100 %. El atacante sacó 12 y conectó; el defensor tira 9, que es ≤ 100 y ≤ 12: esquiva. Si el atacante hubiera sacado 3 (crítico), el defensor necesitaría 3 o menos.')}`},
{id:'colision',t:'Colisión',h:()=>`<p>En vez de esquivar, el objetivo puede <b>chocar</b> el ataque con un movimiento de daño propio. Gasta su Acción (o toma prestada la de la ronda siguiente; solo una a la vez). Tira la Precisión de su movimiento: si falla, recibe el golpe completo y pierde su Acción. Si conecta, cada lado suma puntos:</p>
${tbl(['Factor','Puntos'],[['Ser el atacante','+1'],['Nivel del movimiento','Starter 1 · Beginner 2 · Amateur 3 · Elite 4 · Master 5 · Legend 6'],['Tamaño','Contacto 0 · A distancia +1 · Cono, Línea o Área 5 ft +2 · Área 15 ft o Campo +3'],['Tipo contra tipo','Súper eficaz +2 · Poco eficaz −2 · Sin efecto −4'],['Atributo del Pokémon','FUE ÷ 3 si el movimiento es Físico, ENE ÷ 3 si es Especial (hacia arriba)'],['Crítico (cualquiera)','+2']])}
${tbl(['Diferencia','Resultado'],[['Empate','Ambos reciben el promedio de la CD y del Atributo de los dos movimientos, sin restar defensas.'],['1 a 3','El perdedor recibe el promedio de la CD de los dos movimientos.'],['4 o más','El perdedor recibe el daño completo del movimiento ganador.']])}
<ul><li>Si el defensor ya usó su Acción, toma prestada la de la ronda siguiente: empezará esa ronda sin Acción.</li><li>Solo el ganador aplica sus efectos secundarios; si es crítico, su daño aumenta como en un crítico normal.</li><li>Contra un área, cada defensor colisiona por separado. Una trampa también se puede colisionar.</li><li>El movimiento usado cuenta para la penalización por repetición.</li></ul>
${ej('El atacante lanza un movimiento Starter de Fuego a distancia: 1 (atacante) + 1 (nivel) + 1 (tamaño) = 3. El defensor responde con un movimiento Starter de Agua a distancia, súper eficaz contra Fuego: 1 + 1 + 2 = 4. Gana el defensor por 1, así que el atacante recibe el promedio de la CD de ambos movimientos.')}`},
{id:'comandar',t:'Comandar',h:()=>`<p>En Atacar, el Entrenador tiene la opción <b>Comandar</b> («Toma una acción de entrenador»), que despliega sus acciones. Usa su Acción en vez de atacar; una acción de Entrenador por ronda. Todo Entrenador tiene además <b>Forcejeo</b> como movimiento estándar, sin penalización por repetición.</p>
${tbl(['Acción','Tirada','Efecto si tiene éxito'],[['¡Apunta!','1d20 + DES + Precisión','El Pokémon resta 10 a la tirada de Precisión de su siguiente ataque.'],['¡Esquiva!','1d20 + SAB + Perspicacia','El Pokémon resta 10 a su siguiente tirada de Esquiva o Temple.'],['¡Punto débil!','1d20 + SAB + Teoría','+1 al Índice de Crítico del siguiente ataque del Pokémon.'],['¡Muévete!','1d20 + CAR + Presencia','+1 etapa de Velocidad (+5 ft).'],['Retrasar Acción','Sin tirada','El Pokémon espera; el jugador indica cuándo actúa, gastando la Reacción del Entrenador.'],['Usar Objeto','1d20 + ENE + Aplicación','El Entrenador usa un objeto de su mochila. Si falla, el rival se antepone sin darle tiempo de usarlo.'],['Lanzar Pokéball','1d20 + DES + Precisión','Intenta capturar al Pokémon salvaje (efectos pendientes).']])}
<ul><li>Las Órdenes (¡Apunta!, ¡Esquiva!, ¡Punto débil! y ¡Muévete!) y Usar Objeto se tiran contra la dificultad del rival de mayor Rango: Starter 9 · Beginner 13 · Amateur 17 · Elite 21 · Master 27 · Legend 33. El 1 natural falla y el 20 natural acierta.</li><li>El bono es fijo: dura hasta usarse o hasta el final de la siguiente ronda.</li><li>El Atributo de cada tirada se puede cambiar al ordenar.</li></ul>
${ej('En la ronda 2, un Entrenador con DES +2 y Precisión +2 grita «¡Apunta!» contra un rival Beginner (13): saca 11 y suma 15, éxito. Si su Pokémon saca 58 en la Precisión de su siguiente ataque, cuenta como 48. Si no ataca antes del final de la ronda 3, la Orden se pierde.')}`},
{id:'naturalezas',t:'Naturalezas y Sabores',h:()=>`<p>Cada naturaleza da <b>+1 a un atributo</b> y <b>−1 a otro</b>, y se asocia a un atributo social con un sabor favorito, que importa para las Balls de Bonguri.</p>
${tbl(['Naturaleza','+1','−1','Social'],D.nat.map(n=>[esc(n[0]),attrChip(n[2]),attrChip(n[3]),socialChip(n[1])]))}
${tbl(['Atributo social','Sabor favorito','Bonguri','Sabores neutros','Sabores que rechaza'],SOC.map(r=>[socialChip(r[0]),...r.slice(1)]))}
${ej('Un Pokémon Alegre gana +1 DES y pierde 1 ENE. Su atributo social es Belleza: su sabor favorito es el Amargo, y una Ball hecha con Bonguris Azules le da +2 por cada uno.')}`},
{id:'estados',t:'Estados Alterados',h:()=>`<p>18 estados, uno por tipo. Cada criatura puede tener <b>uno Físico y uno Mental</b> a la vez; uno nuevo de la misma clase no reemplaza al anterior, salvo con un crítico. <b>Cada Pokémon es inmune al estado de su propio tipo.</b></p>
<ul><li><b>Duración mínima:</b> todo estado dura al menos 1 ronda: en el primer fin de ronda no se tira Salvación (el residual sí se aplica).</li><li><b>Aturdido</b> quita la Acción: si el afectado ya la usó, empieza la ronda siguiente sin Acción; si además tenía prestada la Acción de una Colisión, queda Aturdido una ronda más.</li><li><b>Mareado</b> reemplaza la Habilidad del Pokémon por Tumbos mientras dure.</li><li><b>Salvación X (+Y):</b> al final de cada ronda tira 1d100 y se libera con un resultado ≤ X; cada fallo suma Y.</li><li><b>Daño residual</b> según el Nivel del movimiento que lo causó: Starter 1d6 · Beginner 1d8 · Amateur 2d4 · Elite 1d10 · Master 2d6 · Legend 3d4.</li></ul>
${tbl(['Estado','Tipo','Clase','Efecto','Salvación'],D.estados.map(e=>[esc(e[0])+(e[0]==='Aturdido'?' <span class="note">(Retroceso)</span>':''),chip(e[1]),e[2]==='Fisico'?'Físico':esc(e[2]),esc(e[3]),e[4]==='-'?'—':`${e[4]} (+${e[5]})`]))}
${ej('Un Pokémon queda Quemado (Salvación 15 +30). Al final de la ronda 1 recibe el residual y tira 1d100: saca 40, falla. En la ronda 2 necesita 45 o menos; saca 33 y se libera. Un Pokémon de tipo Fuego nunca podría quedar Quemado.')}`},
{id:'campo',t:'Condiciones de Campo',h:()=>`<p>Climas, campos y entornos que afectan a todo el terreno. Duran 5 rondas salvo que se indique otra cosa, y potencian al estado alterado afín.</p>
${tbl(['Condición','Tipo','Clase','Efecto general','Potencia al estado'],CONDS.map(r=>[r[0],condTipo(r[3]),r[1],r[2],r[3]]))}
${ej('Con Sol Intenso, un movimiento de Fuego de CD 6 (2d6) pasa a CD 7 (3d4) y uno de Agua de CD 6 baja a CD 5 (1d10). Además, el daño residual de Quemado sube un Rango.')}`},
{id:'captura',t:'Captura',h:()=>`<p><b>Tirada de captura = 1d20 + Talento Precisión + Atributo + méritos + Ball</b>, contra la dificultad del Pokémon. En combate cuesta la Acción. Un 1 natural siempre falla y un 20 natural siempre captura.</p>
${tbl(['Rango del Pokémon','Starter','Beginner','Amateur','Elite','Master','Legend'],[['Dificultad','10','15','20','25','30','35']])}
<ul><li><b>Deméritos:</b> +5 a la dificultad por cada Rango que el Pokémon esté por encima del Entrenador.</li><li><b>Méritos (0 a +6):</b> a criterio del Narrador (p. ej., PS ≤ 33 % +1, PS ≤ 10 % +2).</li><li><b>Ball (0 a +4)</b>.</li></ul>
${tbl(['Bono','Ball','Condición'],[['+0','Poké Ball','Siempre'],['+1','Super Ball','Siempre'],['+2','Ultra Ball','Siempre'],['+3','Veloz Ball','Solo en la 1.ª ronda'],['+3','Luna Ball','Evolucionan con Piedra Lunar'],['+3','Ensueño Ball','El Pokémon está Adormilado'],['+3','Ente Ball','Ultraentes (contra otros, −2)'],['+3','Amor Ball','Misma especie y género opuesto que tu Pokémon'],['+1 a +3','Turno Ball','+1 desde la ronda 4, +2 desde la 7, +3 desde la 10'],['+2','Buceo Ball','Bajo el agua'],['+2','Cebo Ball','Pokémon pescado'],['+2','Ocaso Ball','De noche, en cueva o con Penumbra'],['+2','Malla Ball','Tipo Agua o Bicho'],['+1 a +2','Peso Ball','VIT del salvaje: +1 si es mayor a 3, +2 si es mayor a 6'],['+2','Rapid Ball','Mov Base de 35 ft o más'],['+2','Nivel Ball','Tu Pokémon activo es de Rango mayor'],['+1','Acopio Ball','Especie ya capturada'],['+1','Nido Ball','Rango menor que el Entrenador'],['+1','Safari, Parque y Competi Ball','Solo en sus eventos'],['+0','Amigo, Lujo, Sana, Honor y Gloria Ball','Efectos no numéricos'],['—','Master Ball','Captura segura']])}
${tbl(['Bonguri (2 por Ball)','Bonus'],[['De color','+2 si su sabor es el favorito del Pokémon'],['Negro','+2 contra Rango superior al Entrenador'],['Blanco','+2 contra Rango inferior al Entrenador'],['Blanco + Negro','+1 en cualquier caso']])}
${ej('Un Entrenador Beginner con Precisión [S] (+1) y DES 4 lanza una Ultra Ball (+2) a un Pokémon Amateur al que dejó con un 30 % de PS (mérito +1). La dificultad es 20 + 5 (está un Rango por encima) = 25. Saca 15: 15 + 1 + 4 + 1 + 2 = 23, no lo captura.')}`},
{id:'monturas',t:'PokéMonturas',h:()=>`<p>Con la especie en tu <b>equipo</b> puedes viajar sobre ella. Hay dos formas: <b>treparte</b> sin montura (con tirada) o usar la <b>montura indicada</b>. Cada especie de la <b>Pokédex</b> indica su Tamaño y, si se puede montar, sus Terrenos y las Monturas que admite; un <b>—</b> significa que no es montura.</p>
<p><b>Treparse sin montura:</b> tirada de Equilibrio = <b>1d20 + DES + Acrobacias</b>. Parte en <b>Media (17)</b> y cada condición sube un escalón: Media 17 → Desafiante 21 → Difícil 27 → Imposible 33; más allá, no se puede. Se tira al subir y cada vez que cambia el terreno o el clima. Sin montura solo va el Entrenador.</p>
${tbl(['Condición','Escalones'],[['Velocidad 35 ft','+1'],['Velocidad 40 ft','+2'],['Tamaño Mediano (poco lomo)','+1'],['Tamaño Grande o Enorme','+0'],['Tamaño Colosal (altura de caída)','+1'],['Tamaño Pequeño','No se puede trepar'],['Tierra firme','+0'],['Montaña, Arena, Nieve y hielo, Agua','+1'],['Corrientes y cascadas, Aire','+2'],['Bajo el agua, Subterráneo, Especial','No se puede sin montura'],['Clima adverso (Llovizna, Granizo, Tormenta de Arena…)','+1']])}
<p><b>Con la montura indicada</b> (cumple el Tamaño y la FUE mínimos, y el terreno está en su Tipo de viaje) la tirada es <b>Natural (5)</b>.</p>
<ul><li>Las <b>Plazas</b> incluyen al Entrenador. La <b>FUE mínima</b> se compara con la FUE del Pokémon en su ficha.</li><li>Un Pokémon de tipo <b>Fuego</b> solo admite la Silla ignífuga y uno de tipo <b>Eléctrico</b> la Silla aislante (o sus versiones dobles); ambos pueden usar Cabinas y Plataformas, pero no cestas, arneses ni sillas normales.</li><li>Un Pokémon <b>Pequeño</b> solo tira de un Remolque o una Balsa, o lleva una Cabina en bandada.</li><li>Para ir <b>bajo el agua</b> el jinete necesita el <b>Traje de buceo</b> (junto con la Silla marina) o una <b>Cabina sumergible</b>.</li><li>El viaje y las distancias se definirán con el mapa.</li></ul>
${tbl(['Montura','Plazas','Tamaño mín.','FUE mín.','Tipo de viaje','Resistencias','Precio'],MONTURAS.map(m=>[esc(m[0]),m[1],esc(m[2]),m[3],esc(m[4]),esc(m[5]),m[6].toLocaleString('es-CL')+'\u00a0₽']))}
<p><b>Consecuencias al fallar</b> (o si el terreno trae un peligro que la montura no resiste). El daño residual es el del Rango del Entrenador: Starter 1d6 · Beginner 1d8 · Amateur 2d4 · Elite 1d10 · Master 2d6 · Legend 3d4.</p>
${tbl(['Terreno','Consecuencia'],[['Tierra firme','Cae: pierde PS iguales al daño residual.'],['Montaña','Rueda por la ladera: el doble del daño residual.'],['Arena','Caída blanda: sin daño, queda Enlodado y pierde el rumbo.'],['Nieve y hielo','Daño residual y queda Congelado.'],['Agua','Cae al agua: queda Empapado y se estropea lo que no resista el agua.'],['Corrientes y cascadas','Lo arrastra la corriente: daño residual, Empapado y separado de su Pokémon.'],['Aire','Cae desde la altura: el triple del daño residual y queda Mareado, salvo que el Narrador permita un rescate.'],['Bajo el agua','Le falta el aire: daño residual cada ronda hasta salir a la superficie.'],['Subterráneo','Derrumbe: daño residual y queda Aprisionado hasta que lo saquen.']])}
<p>Si la montura recibe un peligro que no está en sus Resistencias, o el jinete saca un <b>1 natural</b> usándola, la montura <b>se rompe</b> y no sirve hasta repararla.</p>
${ej('Un Entrenador con DES 3 y Acrobacias [B] (+2) se trepa a un Mudsdale (Grande, 30 ft) para cruzar una montaña: Media +1 (Montaña) = Desafiante (21); necesita 16 o más en el d20. Si falla, rueda por la ladera y pierde el doble del daño residual de su Rango. Con una Silla de montar (Mudsdale tiene FUE 3 o más), la tirada es Natural (5).')}`}];
/* Rasgos: explicación y tablas de Méritos y Defectos (datos de D.rasgos) */
const RAS_CAT=['Físico','Mental','Social','Sobrenatural'];
GLOS.push({id:'rasgos',t:'Rasgos',h:()=>`<p>Los <b>Méritos</b> y <b>Defectos</b> son rasgos opcionales del Entrenador que dan más detalle a su historia y a sus capacidades. Se eligen <b>solo al crear el personaje</b>, en la sección Méritos y Defectos de su ficha.</p>
<ul><li><b>Puntos:</b> cada jugador parte con <b>${PTS_LIBRES} puntos</b> para Méritos y puede tomar <b>hasta ${N_DEF} Defectos</b>, que suman sus puntos. Con el total compra los Méritos que le alcancen.</li>
<li><b>Valores:</b> un Mérito cuesta de +1 a +6 y un Defecto aporta de −1 a −6. Hay 4 categorías: Físicos, Mentales, Sociales y Sobrenaturales.</li>
<li><b>Coherencia:</b> no se toman rasgos que se contradigan (columna «Incompatible con»). De los rasgos con niveles (I, II, III) se toma uno solo. La ficha lo avisa en rojo, y el Narrador puede hacer excepciones.</li>
<li><b>Bonos de Talento:</b> un Mérito que siempre aplica da <b>+1</b>; uno que aplica solo en cierta situación da <b>+2</b>.</li>
<li><b>Atributos:</b> un rasgo que afecta un Atributo solo en cierta situación da <b>±1</b>; si lo afecta siempre, cuesta u otorga <b>2 puntos</b>.</li>
<li><b>En la ficha:</b> lo que se suma solo se ve en <span class="rs-up">verde</span> si sube y en <span class="rs-down">rojo</span> si baja (Talentos, PS, Velocidad, Puntos de Destino). Lo condicional se pinta en <span class="rs-cond">amarillo</span> y, al tirar, el panel pregunta si el rasgo aplica.</li>
<li><b>Resistencias pasivas:</b> se aplican solas: −1 CD al daño recibido del tipo y +20 a la Salvación de su estado.</li>
<li><b>Narrativos:</b> los demás los maneja el Narrador en la historia (Favor, Enemigo, Aristócrata, Pobre…).</li></ul>
${ej(`Un Entrenador toma Cojera (−3) y Timidez (−2): suma ${PTS_LIBRES} + 5 = ${PTS_LIBRES+5} puntos. Compra Rastreador (+1), Suerte (+3) y Resistencia al Calor (+2), y le sobran 4. Su Velocidad baja 10 ft y su Atletismo y Acrobacias −2 (rojo), sus Talentos sociales −1 (rojo), su máximo de Puntos de Destino sube a 4 (verde) y, al tirar Supervivencia, el panel pregunta si aplica Rastreador (+2).`)}
<p>Las listas completas, con filtros, están en <b>Herramientas › Méritos y Defectos</b>.</p>`});
/* el índice del Glosario va en orden alfabético */
GLOS.sort((a,b)=>a.t.localeCompare(b.t,'es'));
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
const T = {hq:'', hfl:{g:'',a:'',d:''}, hsort:{col:'',dir:0}, rq:'', rfl:{t:'',c:'',a:'',v:''}, rsort:{col:'',dir:0}, atk:'', mv:'', ex:0, riv:[{k:'',t1:'',t2:'',vit:0,sab:0}], roll:null, ini:new Set(), tie:{}, q:'', fl:{niv:'',tipo:'',clase:'',atr:'',cat:'',con:''},
  dq:'', dfl:{tipo:'',region:'',rango:'',estado:'',pest:'todos',hab:'',bmin:'',bmax:''}, msort:{col:'',dir:0}, dpage:0, dsel:'', g:{rango:'Starter',t1:'',t2:'',region:''}, gen:null};
function renderTool(){
  return ({mov:toolMov,hab:toolHab,ras:toolRas,dex:toolDex,gen:toolGen,dados:toolDados,bloq:isMaster()?toolBloq:toolDex}[S.tool]||toolDex)();
}
/* Bloquear Fichas (solo Master): una ficha fijada no deja cambiar Habilidad, Atributos (salvo el bonus), Talentos ni Méritos y Defectos */
const LOCK_SVG=on=>on?'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>'
  :'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7"/></svg>';
const isLocked=f=>!!(f&&f.bloq);
const LOCK_RX=/^(habilidad|attr\.[A-Z]{3}\.r|tal\.|meritos\.|defectos\.|rasgoOp\.)/;
function lockBtn(x){ const on=isLocked(x.f); return `<button class="lockbtn${on?' on':''}" data-lock="${esc(refKey(x))}" aria-pressed="${on}" title="${on?'Desbloquear':'Fijar'} la ficha de ${esc(charName(x.f))}" aria-label="${on?'Desbloquear':'Fijar'} la ficha de ${esc(charName(x.f))}">${LOCK_SVG(on)}</button>`; }
function toolBloq(){
  const row=(x,sub)=>`<div class="lkrow${sub?' sub':''}${isLocked(x.f)?' on':''}"><span class="n">${esc(charName(x.f))}</span><span class="note">${x.f.tipo==='E'?'Entrenador':'Pokémon'}${x.f.lugar==='caja'?' · caja':''}</span>${lockBtn(x)}</div>`;
  let h=`<div class="card"><h2>Bloquear Fichas</h2><p class="note">Una ficha fijada ya no deja cambiar su <b>Habilidad</b>, sus <b>Atributos</b> (el bonus sí), sus <b>Talentos</b> ni sus <b>Méritos y Defectos</b>. Vale para todos, Masters incluidos: para editarla, desbloquéala aquí.</p></div>`;
  const uids=Object.keys(S.players).sort((a,b)=>String(S.players[a].alias).localeCompare(String(S.players[b].alias)));
  for(const u of uids){ const pool=poolOf('jug',u); if(!pool.length) continue;
    const tr=pool.filter(x=>x.f.tipo==='E'); const ids=new Set(tr.map(t=>t.id)); const loose=pool.filter(x=>x.f.tipo==='P'&&!ids.has(x.f.entrenador));
    const all=pool.every(x=>isLocked(x.f));
    h+=`<div class="card"><h2><span>${esc(S.players[u].alias||'Jugador')}</span><button class="btn sm" data-lockall="${esc(u)}" data-v="${all?0:1}">${all?'Desbloquear todas':'Fijar todas'}</button></h2>`;
    for(const t of tr){ h+=`<div class="lkgrp">${row(t,false)}${teamOf(t).map(p=>row(p,true)).join('')}</div>`; }
    if(loose.length) h+=`<div class="lkgrp"><div class="note" style="margin:4px 0">Pokémon sueltos</div>${loose.map(p=>row(p,true)).join('')}</div>`;
    h+=`</div>`; }
  return h;
}
function setLock(x,on){ if(!isMaster()||!S.canWrite||!x) return; if(isLocked(x.f)===on) return; const nf=structuredClone(x.f); if(on) nf.bloq=true; else delete nf.bloq; saveFicha(x,nf); }
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
      const e=effectiveness(mi.m[2],[t1,t2].filter(Boolean),mi.m[0]);
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
    const e=effectiveness(mi.m[2],types,mi.m[0]); const name=rr?charName(rr.f):`Rival ${i+1}`;
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
const MCOLS=[['Movimiento',1],['Tipo',2],['Clase',3],['Nivel',5],['Prec',6],['Base',7],['Atrib.',4],['Distancia',10],['R.E.',12],['Precio MT',16]];
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
  for(const a of res.slice(0,150)) h+=`<tr class="main"><td><b>${esc(a[1])}</b></td><td>${chip(a[2])}</td><td>${claseChip(a[3])}</td><td>${rankChip(a[5])}</td><td class="num">${a[6]>0?'+':''}${esc(a[6])}</td><td class="num">${esc(a[7])}${typeof a[7]==='number'&&a[7]>0?' <span class="note">'+dice(a[7])+'</span>':''}</td><td>${attrChip(short(a[4]))}</td><td>${esc(a[10])}</td><td class="num">${typeof a[12]==='number'?pct(a[12]):'—'}</td><td class="num">${typeof a[16]==='number'?a[16].toLocaleString('es-CL')+' ₽':'—'}</td></tr><tr class="fx"><td colspan="10">${esc(a[11])}${a[13]&&a[13]!=='-'?' <span class="pill">'+esc(a[13])+'</span>':''}</td></tr>`;
  h+=`</tbody></table></div>${res.length>150?'<p class="note">Se muestran los primeros 150. Afina los filtros para ver el resto.</p>':''}</div>`;
  return h;
}
/* Buscadores de Habilidades y de Méritos y Defectos: mismos filtros y orden por columna que Movimientos */
const listOpts=(rows,i)=>[...new Set(rows.map(r=>r[i]).filter(x=>x!==''&&x!=null&&x!=='-'))].sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true}));
function sortRows(rows,st,nameIdx){ if(st.col===''||!st.dir) return rows; const i=num(st.col), dir=st.dir;
  return rows.sort((x,y)=>{ const A=x[i],B=y[i]; const an=typeof A==='number', bn=typeof B==='number'; let r;
    if(an&&bn) r=A-B; else r=String(A??'').localeCompare(String(B??''),'es',{sensitivity:'base',numeric:true}); return r*dir||String(x[nameIdx]).localeCompare(String(y[nameIdx]),'es'); }); }
const sortHead=(cols,st,attr)=>cols.map(([lbl,i])=>{ const on=String(st.col)===String(i)&&st.dir; return `<th><button class="sortbtn" data-${attr}="${i}" aria-sort="${on?(st.dir>0?'ascending':'descending'):'none'}">${lbl}<span class="arw">${on?(st.dir>0?' ▲':' ▼'):''}</span></button></th>`; }).join('');
const AP_HAB={'Ficha (automático)':'ap-auto','Combate (pasiva)':'ap-auto','Situacional':'ap-sit','Evento':'ap-comb','Regla especial':'ap-comb','Forma':'ap-crea','Narrativo':''};
// hab: 0 nombre,1 efecto RPG,2 grupo,3 aplicación,4 disparador,5 condición,6 efecto en ficha,7 especies
const HCOLS=[['Habilidad',0],['Grupo',2],['Aplicación',3],['Disparador',4],['Especies',7]];
function toolHab(){
  const fl=T.hfl, q=T.hq.toLowerCase();
  const res=sortRows(D.hab.filter(h=>(!q||h[0].toLowerCase().includes(q)||String(h[1]).toLowerCase().includes(q))&&(!fl.g||h[2]===fl.g)&&(!fl.a||h[3]===fl.a)&&(!fl.d||h[4]===fl.d)),T.hsort,0);
  const sel=(k,lbl,i)=>`<label class="f">${lbl}<select data-hfl="${k}">${opts(listOpts(D.hab,i),fl[k],'Todos')}</select></label>`;
  let h=`<div class="card"><h2>Buscador de habilidades</h2><div class="grid g4">
    <label class="f">Nombre o efecto<input id="hq" value="${esc(T.hq)}" placeholder="p. ej. Llovizna"></label>
    ${sel('g','Grupo',2)}${sel('a','Aplicación',3)}${sel('d','Disparador',4)}
    <div class="f" style="justify-content:end"><span class="pill">${res.length} habilidades</span></div></div></div>
    <div class="card"><div class="tw"><table class="mtable"><thead><tr>${sortHead(HCOLS,T.hsort,'hsort')}</tr></thead><tbody>`;
  for(const r of res.slice(0,150)) h+=`<tr class="main"><td><b>${esc(r[0])}</b></td><td>${esc(r[2])}</td><td><span class="pill ${AP_HAB[r[3]]||''}">${esc(r[3])}</span></td><td>${esc(r[4]||'—')}${r[5]?` <span class="note">(${esc(r[5])})</span>`:''}</td><td class="num">${num(r[7])}</td></tr><tr class="fx"><td colspan="5">${esc(r[1])}${r[6]?` <span class="note">· En la ficha: ${esc(r[6])}</span>`:''}</td></tr>`;
  h+=`</tbody></table></div>${res.length>150?'<p class="note">Se muestran las primeras 150. Afina los filtros para ver el resto.</p>':''}</div>`;
  return h;
}
// rasgos: 0 nombre,1 M/D,2 categoría,3 valor,4 aplicación,5 efecto,6 incompatible
const RCOLS=[['Rasgo',0],['Tipo',1],['Valor',3],['Categoría',2],['Aplicación',4]];
function toolRas(){
  const fl=T.rfl, q=T.rq.toLowerCase(), R=D.rasgos||[];
  const res=sortRows(R.filter(r=>(!q||r[0].toLowerCase().includes(q)||String(r[5]).toLowerCase().includes(q))&&(!fl.t||r[1]===fl.t)&&(!fl.c||r[2]===fl.c)&&(!fl.a||r[4]===fl.a)&&(!fl.v||String(Math.abs(r[3]))===fl.v)),T.rsort,0);
  if(T.rsort.col===''||!T.rsort.dir) res.sort((a,b)=>a[1].localeCompare(b[1])*-1||RAS_CAT.indexOf(a[2])-RAS_CAT.indexOf(b[2])||Math.abs(a[3])-Math.abs(b[3])||a[0].localeCompare(b[0],'es'));
  const sel=(k,lbl,list,labels)=>`<label class="f">${lbl}<select data-rfl="${k}"><option value="">Todos</option>${list.map((o,i)=>`<option value="${esc(o)}"${o===fl[k]?' selected':''}>${esc(labels?labels[i]:o)}</option>`).join('')}</select></label>`;
  let h=`<div class="card"><h2>Méritos y Defectos</h2><div class="grid g4">
    <label class="f">Nombre o efecto<input id="rq" value="${esc(T.rq)}" placeholder="p. ej. Fuerza"></label>
    ${sel('t','Tipo',['M','D'],['Méritos','Defectos'])}${sel('c','Categoría',RAS_CAT)}${sel('a','Aplicación',listOpts(R,4))}${sel('v','Valor',['1','2','3','4','5','6'])}
    <div class="f" style="justify-content:end"><span class="pill">${res.length} rasgos</span></div></div><p class="note">Cómo funcionan: Glosario › Rasgos.</p></div>
    <div class="card"><div class="tw"><table class="mtable"><thead><tr>${sortHead(RCOLS,T.rsort,'rsort')}</tr></thead><tbody>`;
  for(const r of res) h+=`<tr class="main"><td><b>${esc(r[0])}</b></td><td>${r[1]==='M'?'Mérito':'Defecto'}</td><td class="num"><b class="${r[3]<0?'ko':'ok'}">${sg(r[3])}</b></td><td>${esc(r[2])}</td><td><span class="pill ${AP_CLS[r[4]]||''}">${esc(r[4])}</span></td></tr><tr class="fx"><td colspan="5">${esc(r[5])}${r[6]?` <span class="note">· Incompatible con: ${esc(r[6])}</span>`:''}</td></tr>`;
  h+=`</tbody></table></div></div>`;
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
    <div class="statbars">${ATTR.map((k,i)=>`${attrChip(k)}<i style="width:${Math.min(100,num(r[9+i])*11)}%;background:#${ATTR_BG[k]}"></i><b>${r[9+i]}</b>`).join('')}</div>
    <p class="note">Tamaño ${esc(r[20]||'—')}${r[21]&&r[21]!=='-'?` · Terrenos: ${esc(r[21])}`:''}</p>
    ${r[22]&&r[22]!=='-'?`<div class="fx-box"><b>Monturas</b> — ${esc(r[22])}. Ver <b>Glosario › PokéMonturas</b>.</div>`:'<p class="note">No se puede montar.</p>'}</div>
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
  on('hq','change',e=>{T.hq=e.target.value;renderSheet();}); on('rq','change',e=>{T.rq=e.target.value;renderSheet();});
  document.querySelectorAll('[data-hfl]').forEach(el=>el.addEventListener('change',e=>{T.hfl[e.target.dataset.hfl]=e.target.value; renderSheet();}));
  document.querySelectorAll('[data-rfl]').forEach(el=>el.addEventListener('change',e=>{T.rfl[e.target.dataset.rfl]=e.target.value; renderSheet();}));
  const cyc=(st,c)=>{ if(String(st.col)!==String(c)){ st.col=c; st.dir=1; } else st.dir=st.dir===1?-1:st.dir===-1?0:1; };
  document.querySelectorAll('[data-hsort]').forEach(b=>b.addEventListener('click',()=>{ cyc(T.hsort,b.dataset.hsort); renderSheet(); }));
  document.querySelectorAll('[data-rsort]').forEach(b=>b.addEventListener('click',()=>{ cyc(T.rsort,b.dataset.rsort); renderSheet(); }));
  on('dq','change',e=>{T.dq=e.target.value;T.dpage=0;renderSheet();});
  const quien=()=> (S.players[S.uid]?.alias||S.me?.name||'Dados');
  document.querySelectorAll('[data-dice]').forEach(b=>b.addEventListener('click',()=>{const r=rollExpr(b.dataset.dice); logRoll(quien(),r.txt,r.tot);}));
  on('droll','click',()=>{const v=$('#dexpr').value; const r=rollExpr(v); if(!r){ $('#dexpr').setCustomValidity('Usa el formato 2d6+3'); $('#dexpr').reportValidity(); return;} logRoll(quien(),r.txt,r.tot);});
  on('ddmg','input',e=>{$('#ddmgout').textContent=dice(clamp(num(e.target.value),1,24));});
  on('ddmgroll','click',()=>{const n=clamp(num($('#ddmg').value),1,24); const r=rollExpr(dice(n)); logRoll(quien(),'Daño '+n+' → '+r.txt,r.tot);});
}

/* ---------- combate ---------- */
const PEN={Starter:0,Beginner:10,Amateur:20,Elite:30,Master:40,Legend:40};
const CB={exists:false,parts:[],snaps:{},ties:{},last:null,lastFx:{},ronda:0,rondaLog:null,cond:{},voto:null,eq:{},acted:null,tn:null};
const CBU={atk:'',mv:'',bon:{},picking:false,targets:[],colFor:''};
let cbChain=Promise.resolve();
function cbWrite(fields,full){
  for(const [k,v] of Object.entries(fields)){ if(!full&&['snaps','ties','lastFx','cond','eq'].includes(k)) CB[k]={...(CB[k]||{}),...v}; else CB[k]=v; }
  cbChain=cbChain.then(async()=>{ try{
      const ref=S.db.doc('combate/actual');
      if(full||!CB.exists){ await ref.set({parts:CB.parts,snaps:CB.snaps,ties:CB.ties,last:CB.last,lastFx:CB.lastFx,ronda:num(CB.ronda),rondaLog:CB.rondaLog||null,cond:CB.cond||{},voto:CB.voto||null,eq:CB.eq||{},acted:CB.acted||null,tn:CB.tn||null}); CB.exists=true; }
      else { const up={...fields}; for(const k of ['cond','eq']) if(k in up) up[k]=CB[k]; await ref.update(up); } /* condición y equipos se mandan completos */
      setStatus('Guardado');
    }catch(e){ onWriteError(e); } });
}
const snapOf=f=>{ const o=structuredClone(f); delete o.img; return o; };
const inCombat=k=>CB.parts.includes(k);
function combatant(k){ if(!k) return null; const [src,uid,id]=k.split('|'); const ref={src,uid:uid||null,id};
  let f = src==='master' ? (isMaster()? S.master[id] : CB.snaps[k]) : (S.fichas[uid]||{})[id];
  if(f) CKEY.set(f,k);
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
function mutate(key,fn){ const x=combatant(key); if(!x) return null; const f=structuredClone(x.f); CKEY.set(f,key); const out=fn(f); saveAny(x,f); return out; }
function canGlove(x){ if(!S.canWrite||!x) return false; return isMaster() || (x.src==='jug'&&x.uid===S.uid); }
function toggleGlove(k){
  const [src,uid,id]=k.split('|'); if(!canGlove({src,uid:uid||null,id})) return;
  let parts=[...CB.parts], snaps={...CB.snaps};
  if(parts.includes(k)){ parts=parts.filter(x=>x!==k); delete snaps[k]; }
  else { parts.push(k); const c=combatant(k); if(c&&c.src==='master') snaps[k]=snapOf(c.f); }
  const entra=!CB.parts.includes(k);
  if(isMaster()) cbWrite({parts,snaps},true); else cbWrite({parts});
  if(entra){ const c=combatant(k); const h=c&&c.f.tipo==='P'?c.f.habilidad:'';
    if(/^(Aclimatacion|Esclusadeaire|Prediccion)$/.test(h)) prediccion(); }
  else { for(const cls of ['clima','campo','entorno']){ const c=(CB.cond||{})[cls]; if(c&&c.by===k&&c.r==null){ setCond(cls,''); logRoll('Condición',`${c.n} termina: su causante salió del combate.`,null); } }
    prediccion(); }
  render();
}
function gloveBtn(k){ const on=inCombat(k); return `<button class="glove" data-glove="${esc(k)}" aria-pressed="${on}" title="${on?'Quitar del combate':'Agregar al combate'}" aria-label="${on?'Quitar del combate':'Agregar al combate'}">🥊</button>`; }
function combatants(){ return CB.parts.map(combatant).filter(Boolean); }
/* Quién ya usó su Acción en la ronda (se reinicia sola al cambiar de ronda) */
const actedKeys=()=>CB.acted&&num(CB.acted.r)===num(CB.ronda)?(CB.acted.k||[]):[];
/* tn: {r, prest:[quien tomó prestada la Acción de la ronda siguiente], extra:[quien puede atacar otra vez], debt:{clave: rondas que empezará sin Acción}} */
function TN(){ const t=CB.tn||{}; const same=num(t.r)===num(CB.ronda); return {r:num(CB.ronda),prest:same?[...(t.prest||[])]:[],extra:same?[...(t.extra||[])]:[],debt:{...(t.debt||{})}}; }
function markActed(k){ if(!k) return; const t=TN(); if(t.extra.includes(k)){ t.extra=t.extra.filter(x=>x!==k); cbWrite({tn:t}); return; } /* Esquiva crítica: este ataque no gasta la Acción */
  const ks=actedKeys(); if(!ks.includes(k)) cbWrite({acted:{r:num(CB.ronda),k:[...ks,k]}}); }
function esquivaCritica(k){ if(!inCombat(k)) return 'Esquiva crítica.'; if(actedKeys().includes(k)){ unAct(k); return 'Esquiva crítica: recupera su Acción y puede atacar otra vez esta ronda.'; }
  const t=TN(); t.extra=[...new Set([...t.extra,k])]; cbWrite({tn:t}); return 'Esquiva crítica: su próximo ataque de esta ronda no gasta la Acción, así que puede atacar otra vez.'; }
function unAct(k){ const ks=actedKeys(); if(ks.includes(k)) cbWrite({acted:{r:num(CB.ronda),k:ks.filter(x=>x!==k)}}); }
/* Colisionar gasta la Acción; si ya la usó, toma prestada la de la ronda siguiente (solo una a la vez) */
const puedeColisionar=k=>!(actedKeys().includes(k)&&TN().prest.includes(k));
function accionColision(k){ if(!actedKeys().includes(k)){ markActed(k); return ''; } const t=TN(); t.prest=[...new Set([...t.prest,k])]; t.debt[k]=num(t.debt[k])+1; cbWrite({tn:t}); return 'Ya había usado su Acción: toma prestada la de la ronda siguiente.'; }
/* Aturdido: quita la Acción. Si ya la usó, empieza la ronda siguiente sin Acción; si además la tenía prestada, dura una ronda más */
function aturdir(k,f){ if(!k||!inCombat(k)) return ''; const cur=num(CB.ronda); let hasta=cur, msg='pierde su Acción de esta ronda';
  if(!actedKeys().includes(k)) markActed(k);
  else { const t=TN(); const pres=t.prest.includes(k); t.debt[k]=num(t.debt[k])+1; cbWrite({tn:t}); hasta=cur+(pres?2:1); msg=pres?'ya tenía prestada la Acción siguiente: queda Aturdido una ronda más y pierde la Acción de la ronda que sigue':'ya usó su Acción: empieza la ronda siguiente sin Acción'; }
  f.estFx={...(f.estFx||{}),M:{...((f.estFx||{}).M||{}),hasta}}; return msg; }
const iAmIn=()=> isMaster() || CB.parts.some(k=>k.startsWith(`jug|${S.uid}|`));
function cbOrder(){ return combatants().map(x=>({x,c:calc(x.f)})).sort((a,b)=>b.c.ini-a.c.ini||(CB.ties[b.x.key]||0)-(CB.ties[a.x.key]||0)); }
function targetMode(m){ const b=m[9], dist=String(m[10]);
  if(b==='Usuario'||dist==='Propio') return 'none';
  if(m[3]==='Estado'&&condDeMov(m)) return 'none'; /* crea un clima, campo o entorno */
  if(['Area','Oponentes','Equipo','Campo','Aliados'].includes(b)) return 'multi';
  return 'single'; }
const hasCat=(m,c)=>String(m[13]||'').split(/[;,]\s*/).map(x=>x.trim().toLowerCase()).includes(c.toLowerCase());
function repOf(f,mv){ return f.rep&&f.rep.mv===mv?num(f.rep.n):0; }
function attackInfo(x,mv){
  const f=x.f, c=calc(f), mi=moveInfo(f,mv,c); if(!mi) return null;
  const n=repOf(f,mv), rec=hasCat(mi.m,'Recurrente')||mv==='M0000'; /* Forcejeo no se penaliza por repetición */
  const pen = rec?0:n*(PEN[mi.m[5]]||0);
  const od=f.orden||null; const prec=clamp(mi.prec-pen+(od&&od.k==='apunta'?num(od.v):0),0,100);
  let ic=clamp(num(f.ic)+num(c.em.ic)+(hasCat(mi.m,'Preciso')?1:0)+(od&&od.k==='critico'?num(od.v):0),0,5);
  let critR=D.crit[ic]; let reR=typeof mi.m[12]==='number'?mi.m[12]:null;
  if(reR!==null&&c.em.cond&&c.em.cond.entorno==='Arcoíris'&&c.em.cond.aliado) reR=Math.min(1,reR*2); /* Arcoíris duplica el Rango Extra del equipo */
  if(reR!==null&&mi.hm.reMul!==null) reR=Math.min(1,reR*mi.hm.reMul); /* Dicha ×2, Potencia Bruta 0 */
  if(c.em.noCrit){ critR=0; if(reR!==null) reR=0; }
  return {x,f,c,mi,n,rec,pen,prec,ic,critR,reR};
}

/* ---------- efectos automáticos de los movimientos ---------- */
const EST_NAMES=D.estados.map(e=>e[0]);
const EST_RX=new RegExp('\\b('+EST_NAMES.join('|')+')\\b','g');
const FX_CACHE=new Map();
function parseFx(m){
  if(FX_CACHE.has(m[0])) return FX_CACHE.get(m[0]);
  const ops=[]; const txt=String(m[11]||'');
  for(let s of txt.split(/(?<=\.)\s+/)){ s=s.trim(); if(!s) continue;
    if(/^(Si |Con |Requiere|Mientras|Durante|Tras usarlo|El siguiente|Cuando|Debe |Usa |Cancela|Esparce|Planta |Como |Cura |Evita|Ignora|Los movimientos|Los aliados|Puede crear)/i.test(s)) continue;
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
function setEstFx(f,cls,meta){ f.estFx={...(f.estFx||{})}; if(meta) f.estFx[cls]={r:meta.r||'Starter',by:meta.by||'',n:0,pr:0,desde:num(CB.ronda)}; else delete f.estFx[cls]; }
function giveEstado(f,name,ctx,force){
  const e=estMap.get(name); if(!e) return '';
  const cls=e[2]==='Fisico'?'F':'M', field=cls==='F'?'estF':'estM';
  if(estImmune(f,name)) return `inmune a ${name}`;
  const ci=condInmune(f,name); if(ci) return `${ci}: no puede quedar ${name}`;
  const ih=estEffects(f).inmEst; const hi=ih&&(ih.get('todos')||ih.get(name)); if(hi) return `${hi}: no puede quedar ${name}`;
  if(f[field]&&!force) return f[field]===name?`ya estaba ${name}`:`ya tiene ${f[field]}, no se aplica ${name}`;
  const prev=f[field]; f[field]=name; setEstFx(f,cls,{r:ctx.rank,by:ctx.by});
  const at=name==='Aturdido'?aturdir(CKEY.get(f),f):'';
  return (prev&&prev!==name?`${name} (reemplaza a ${prev})`:name)+(at?` (${at})`:'');
}
/* Aplica los efectos de un movimiento a una ficha. role: 'target' o 'self' */
function applyOps(f,ops,role,ctx){
  const notes=[];
  for(const op of ops){
    if(!(role==='all'||op.who===role||op.who==='both')) continue;
    if(op.ch==='re'&&!ctx.re) continue;
    if(op.k==='est'){ const n=op.rand?pick(op.names):op.names[0]; const t=giveEstado(f,n,ctx,false); if(t) notes.push(t); }
    else if(op.k==='attr'){ const at={...op.at}; if(at.__rand){ at[pick(ATTR)]=(at[pick(ATTR)]||0)+at.__rand; delete at.__rand; }
      f.attr ||= blankAttr(); const own=role==='target'?habRowsOf(f):[]; const ca=own.find(r=>r[5]==='cambiosAttr');
      for(let [k,v] of Object.entries(at)){ if(!ATTR.includes(k)) continue;
        if(v<0&&own.some(r=>r[5]==='noBajaAttr:todos'||r[5]==='noBajaAttr:'+k)){ notes.push(`${habOf(f)} impide bajar ${k}`); continue; }
        if(ca){ v=ca[6]==='×2'?v*2:-v; }
        if(v<0&&role==='target'&&ctx.by&&ctx.tk&&ctx.by!==ctx.tk&&!aliados(ctx.by,ctx.tk)) ctx.rivalBaja=true;
        f.attr[k] ||= {r:'',b:0}; const b0=num(f.attr[k].b); const b1=clamp(b0+v,-6,6); f.attr[k].b=b1; if(b1!==b0) notes.push(`${b1-b0>0?'+':''}${b1-b0} ${k} (bono ${b1>0?'+':''}${b1})`); else notes.push(`${k} ya está en el tope (${b0>0?'+':''}${b0})`); }
      if(ctx.rivalBaja&&!ctx.rbDone){ ctx.rbDone=true; for(const r of habRowsOf(f,['Al cambiar atributos'])) if(r[3]==='rivalBaja'){ const mm=/^attr:(\w+)$/.exec(r[5]); if(mm){ const d=bumpAttr(f,mm[1],hval(r[6])); notes.push(`${r[0]}: ${sg(d)} ${mm[1]}`); } } } }
    else if(op.k==='prec'&&op.v<0&&role==='target'&&habRowsOf(f).some(r=>/^noBajaAttr:Precisi/.test(r[5]))){ notes.push(`${habOf(f)} impide bajar la Precisión`); }
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
  h+=cbCondHTML();
  if(!ord.length) return h+`<p class="note">${isMaster()?'Agrega combatientes con el guante 🥊 junto a cada personaje en Mesa o en Master.':'Nadie entró al combate todavía. Usa el guante 🥊 junto a tus personajes (en Mis fichas o en Mesa) para entrar.'}</p></div>`;
  h+=`<div class="res">`+ord.map(({x,c},i)=>{ const r=c.ps?clamp(c.act/c.ps,0,1):0; const ests=[x.f.estF,x.f.estM].filter(Boolean).map(e=>{const er=estMap.get(e); const cls=er&&er[2]==='Fisico'?'F':'M'; const fx=(x.f.estFx||{})[cls]; return er?badge(e+(fx&&num(fx.n)?` ·${fx.n}`:''),TYPE_BG[er[1]]||'CCCCCC'):''}).join(' ');
    const rsOn=CBU.rs&&CBU.rs.k===x.key;
    return `<div class="r cbrow${canGlove(x)?' rsable':''}${actedKeys().includes(x.key)?' acted':''}"${actedKeys().includes(x.key)?' title="Ya usó su Acción esta ronda"':''}>${canGlove(x)?`<div class="rsbtns"><button class="btn sm" data-cb="rs" data-k="${esc(x.key)}" data-m="heal" aria-pressed="${rsOn&&CBU.rs.m==='heal'}">Curar</button><button class="btn sm" data-cb="rs" data-k="${esc(x.key)}" data-m="dmg" aria-pressed="${rsOn&&CBU.rs.m==='dmg'}">Dañar</button></div>`:''}<div style="min-width:0"><b>${i+1}. ${esc(charName(x.f))}</b> <span class="note">${esc(ownerLabel(x))}</span> ${c.tipos.map(chip).join(' ')} ${ests}
      <div class="psbar" style="max-width:260px"><i style="width:${r*100}%;background:${r<.25?'var(--bad)':r<.5?'var(--warn)':'var(--good)'}"></i></div>
      <div class="note">PS ${c.act}/${c.ps} · Esquiva ${pct(c.esq)} (${num(x.f.cEsq)}) · Temple ${pct(c.tem)} (${num(x.f.cTem)}) · Vel ${c.vel} ft</div>${c.em.cn.length?`<div class="note cond-cn">${esc(c.em.cn.join(' · '))}</div>`:''}${x.f.orden?`<div class="note cond-cn">Orden ${esc(x.f.orden.n)} de ${esc(x.f.orden.by)}: ${esc(ORDEN_TXT(x.f.orden))} en su siguiente movimiento</div>`:''}</div>
      <div style="text-align:right"><div class="row" style="justify-content:flex-end;align-items:center;gap:8px;flex-wrap:nowrap">${canGlove(x)?`<select class="eqsel" data-cbeq="${esc(x.key)}" aria-label="Equipo de ${esc(charName(x.f))}">${[0,1,2,3,4].map(n=>`<option value="${n}"${eqOf(x.key)===n?' selected':''}>${n?'Equipo '+n:'Sin Equipo'}</option>`).join('')}</select>`:(eqOf(x.key)?`<span class="pill">Equipo ${eqOf(x.key)}</span>`:'')}<span class="big">${Number.isInteger(c.ini)?c.ini:c.ini.toFixed(1)}</span></div>${tied.some(t=>t.x===x)?`<div><span class="pill">${CB.ties[x.key]?'d20: '+CB.ties[x.key]:'empate'}</span></div>`:''}${canGlove(x)?`<div><button class="btn sm" data-glove="${esc(x.key)}">Quitar</button></div>`:''}</div>${rsOn?rsPanelHTML(x):''}</div>`; }).join('')+`</div>
    <p class="note">Iniciativa = Velocidad ÷ 5 + DES + SAB (+ Talento del Entrenador). Los empates se definen con 1d20. «Finalizar Ronda» aplica el daño residual, tira las Salvaciones, quita los estados superados y descuenta las rondas del clima, el campo y el entorno. El Master los elige a mano; los jugadores los crean con un movimiento o una Habilidad.</p>`;
  const RL=CB.rondaLog; if(RL&&RL.lines) h+=`<details class="rlog" open><summary>Fin de la ronda ${num(RL.n)-1}</summary><div class="steps-res">${RL.lines.map(l=>`<div class="${l.k||''}">${esc(l.t)}</div>`).join('')||'<div>Nadie tenía estados alterados.</div>'}</div></details>`;
  return h+`</div>`;
}
/* Habilidades de fin de ronda (Impulso, Veleta, Mudar) y Pesadilla de los rivales */
function habFinRonda(f,key,name,lines){ let ch=false;
  for(const r of habRowsOf(f,['Fin de ronda'])){ if(!habCondOk(r[3],f,key,{})) continue; const k=r[5]; let mm;
    if(r[7]&&!/^attr/.test(k)&&d(100)>hval(r[7])){ continue; }
    if((mm=/^attr:(\w+)$/.exec(k))){ const n=habAttr(f,mm[1],hval(r[6]),r[0]); lines.push({k:'',t:n}); ch=true; }
    else if(k==='liberaEst'&&(f.estF||f.estM)){ lines.push({k:'ok',t:`${name}: ${r[0]}, se libera de ${[f.estF,f.estM].filter(Boolean).join(' y ')}.`}); f.estF=''; f.estM=''; f.estFx={}; ch=true; } }
  if(f.estM==='Adormilado') for(const y of combatants()){ if(y.key===key||aliados(y.key,key)) continue;
    for(const r of habRowsOf(y.f,['Fin de ronda'])) if(r[5]==='pierdePS'&&r[4]==='Rivales'){ const rr=rollResid(y.f.rango); f.dano=num(f.dano)+rr.t; ch=true; lines.push({k:'ko',t:`${name}: ${r[0]} de ${charName(y.f)}, ${rr.txt} = ${rr.t} de daño.`}); } }
  return ch; }
/* Efectos de fin de ronda del clima y el campo sobre un Pokémon */
function condFinRonda(f,em,name,lines){ const P=em.cond; if(!P) return false; const T=tiposDe(f), h=P.h; let ch=false;
  /* el residual de la condición usa el Rango de quien la creó (mínimo si la puso el Master); las Habilidades usan el Rango propio */
  const C=CB.cond||{}; const rk=cls=>ri((C[cls]&&C[cls].rk)||'Starter');
  const idxC=cls=>clamp(rk(cls)+2,1,24), idxP=clamp(ri(f.rango||'Starter')+2,1,24);
  const pierde=(why,idx)=>{ const dd=dice(idx), rl=rollDice(dd); f.dano=num(f.dano)+rl.t; ch=true; lines.push({k:'ko',t:`${name}: ${why}, residual ${dd} [${rl.r.join(', ')}] = ${rl.t} de daño.`}); };
  const gana=(why,idx)=>{ const dd=dice(idx), rl=rollDice(dd); const v=Math.min(num(f.dano),rl.t); f.dano=num(f.dano)-v; ch=true; lines.push({k:'ok',t:`${name}: ${why}, recupera ${dd} [${rl.r.join(', ')}] = ${v} PS.`}); };
  const sinDanoClima=['funda','muromagico'].includes(h);
  if(P.clima==='Tormenta de Arena'&&!T.some(t=>['Roca','Tierra','Acero'].includes(t))&&!sinDanoClima&&!['poderarena','veloarena'].includes(h)) pierde('Tormenta de Arena',idxC('clima'));
  if(P.clima==='Granizo'){ if(h==='gelido') gana('Gélido con Granizo',idxP); else if(!T.includes('Hielo')&&!sinDanoClima) pierde('Granizo',idxC('clima')); }
  if(P.clima==='Llovizna'&&(h==='curalluvia'||h==='pielseca')) gana(`${f.habilidad} con Llovizna`,idxP);
  if(P.clima==='Sol Intenso'&&(h==='pielseca'||h==='podersolar')) pierde(`${f.habilidad} con Sol Intenso`,idxP);
  if(P.clima==='Llovizna'&&h==='hidratacion'&&(f.estF||f.estM)){ lines.push({k:'ok',t:`${name}: Hidratación con Llovizna, se libera de ${[f.estF,f.estM].filter(Boolean).join(' y ')}.`}); f.estF=''; f.estM=''; f.estFx={}; ch=true; }
  if(P.campo==='Campo de Hierba'&&P.enSuelo&&num(f.dano)>0) gana('Campo de Hierba',idxC('campo'));
  /* Miasma: 90 % de quedar Envenenado (se salva con 10 o menos) */
  if(P.clima==='Miasma'&&!T.includes('Veneno')&&!f.estF){ const r=d(100);
    if(r<=10) lines.push({k:'ok',t:`${name}: Miasma, d100 [${r}] ≤ 10 → no queda Envenenado.`});
    else { const t=giveEstado(f,'Envenenado',{rank:(C.clima&&C.clima.rk)||'Starter',by:''},false); ch=true; lines.push({k:'ko',t:`${name}: Miasma, d100 [${r}] > 10 → ${t}.`}); } }
  return ch; }
/* Curar o Dañar a mano con un daño residual (trampas, efectos que la app no calcula) */
function rsPanelHTML(x){ const R=CBU.rs; const dmg=R.m==='dmg'; const rk=R.r||x.f.rango||'Starter';
  return `<div class="rspanel"><label class="f">Residual de Rango<select data-rs="r">${RANGOS.map(n=>`<option value="${esc(n)}"${n===rk?' selected':''}>${esc(n)} · ${dice(ri(n)+2)}</option>`).join('')}</select></label>
    ${dmg?`<label class="f">Tipo del daño<select data-rs="t"><option value="">Sin tipo</option>${D.types.map(t=>`<option value="${esc(t)}"${t===R.t?' selected':''}>${esc(t)}</option>`).join('')}</select></label>`:''}
    <div class="row" style="align-self:end"><button class="btn sm pri" data-cb="rsGo">${dmg?'Tirar daño':'Tirar curación'}</button><button class="btn sm" data-cb="rsNo">Cerrar</button></div>
    ${R.msg?`<div class="note rsmsg">${esc(R.msg)}</div>`:''}</div>`; }
function rsGo(){ const R=CBU.rs; if(!R) return; const x=combatant(R.k); if(!x||!canGlove(x)) return; const rk=R.r||x.f.rango||'Starter'; const dmg=R.m==='dmg';
  const c=calc(x.f); let idx=ri(rk)+2; const ex=[];
  if(dmg&&R.t){ const e=effectiveness(R.t,c.tipos,'');
    if(e.immune){ R.msg=`${charName(x.f)} es inmune al tipo ${R.t}: no recibe daño.`; logRoll(charName(x.f),`Daño residual ${R.t}: inmune`,0); renderSheet(); return; }
    if(e.steps){ idx+=e.steps; ex.push(e.steps>0?`súper eficaz +${e.steps}`:`poco eficaz ${e.steps}`); }
    const rv=num(c.em.cdRecv[R.t]); if(rv){ idx+=rv; ex.push(`${rv>0?'+':''}${rv} CD recibida`); }
    if(R.t==='Roca'&&((CB.cond||{}).clima||{}).n==='Tormenta de Arena'){ idx+=1; ex.push('Tormenta de Arena +1 Rango'); } }
  if(dmg){ const mur=(c.em.hk||[]).find(h=>h.k==='sinDañoIndirecto'); if(mur){ R.msg=`${mur.nm}: ${charName(x.f)} no recibe daño residual.`; renderSheet(); return; } }
  const dd=dice(clamp(idx,1,24)), rl=rollDice(dd); let v=rl.t;
  mutate(x.key,f=>{ if(dmg) f.dano=num(f.dano)+v; else { v=Math.min(v,num(f.dano)); f.dano=num(f.dano)-v; } });
  R.msg=`${dmg?'Daño':'Curación'} residual ${rk}${R.t&&dmg?` de tipo ${R.t}`:''}: ${dd} [${rl.r.join(', ')}] = ${v}${ex.length?' · '+ex.join(', '):''}.`;
  logRoll(charName(x.f),`${dmg?'Recibe':'Recupera'} ${v} PS · ${R.msg}`,v); renderSheet(); }
async function endRound(){
  if(!CB.parts.length||!S.canWrite||!iAmIn()) return;
  const cur=num(CB.ronda); const sb=window.__sb;
  if(sb){ const {data,error}=await sb.rpc('avanzar_ronda',{esperada:cur}); if(error){ onWriteError({code:'invalid_argument'}); return; } if(!data){ showBanner('Otra persona ya terminó esta ronda. Revisa el resumen.'); return; } }
  CB.ronda=cur+1;
  const lines=[], heals=[];
  for(const x of combatants()){
    const f=structuredClone(x.f); CKEY.set(f,x.key); let changed=false; const name=charName(f); const em=estEffects(f,x.key);
    if(f.orden&&(f.orden.hasta==null||num(f.orden.hasta)<=cur)){ lines.push({k:'',t:`${name}: la Orden ${f.orden.n||''} de ${f.orden.by||'su Entrenador'} se pierde sin usar.`}); delete f.orden; changed=true; }
    for(const cls of ['F','M']){ const field=cls==='F'?'estF':'estM'; const est=f[field]; if(!est) continue; const e=estMap.get(est); if(!e) continue;
      const fx={r:f.rango||'Starter',n:0,pr:0,...((f.estFx||{})[cls]||{})};
      if(estImmune(f,est)){ f[field]=''; setEstFx(f,cls,null); changed=true; lines.push({k:'ok',t:`${name}: es inmune a ${est} por su tipo; se quita.`}); continue; }
      if(e[4]==='-'||e[4]===''||e[4]==null){ if(fx.hasta!=null&&num(fx.hasta)>cur){ lines.push({k:'',t:`${name}: sigue ${est} (hasta el final de la ronda ${fx.hasta}).`}); continue; }
        f[field]=''; setEstFx(f,cls,null); changed=true; lines.push({k:'ok',t:`${name}: ${est} termina.`}); continue; }
      const th=num(e[4])*(em.salvMul[est]||1)+num(e[5])*num(fx.n)+num((em.salv||{})[est]); /* + resistencias pasivas, condiciones y Habilidades */
      const primera=fx.desde!=null&&num(fx.desde)===cur; /* todo estado dura al menos 1 ronda */
      if(th>=100&&!primera){ f[field]=''; setEstFx(f,cls,null); changed=true; lines.push({k:'ok',t:`${name}: su Salvación de ${est} llegó a ${th}; se libera sin residual.`}); continue; }
      if(/Residual/i.test(e[3])){ const poison=est==='Envenenado'; const up=num(em.resid[est]); const idx=clamp(ri(fx.r)+(poison?1+num(fx.pr):2)+up,1,24); const dd=dice(idx); const rl=rollDice(dd);
        const rm=em.residMod[est], mur=(em.hk||[]).find(h=>h.k==='sinDañoIndirecto'); let rt=rl.t, why='';
        if(rm==='×0,5'){ rt=Math.floor(rt/2); why=` (mitad por ${habOf(f)})`; }
        if(rm==='cura'){ f.dano=Math.max(0,num(f.dano)-rt); changed=true; lines.push({k:'ok',t:`${name}: ${habOf(f)}, el residual de ${est} lo cura ${dd} [${rl.r.join(', ')}] = ${rt} PS.`}); }
        else if(mur){ changed=true; lines.push({k:'ok',t:`${name}: ${mur.nm}, no recibe el residual de ${est}.`}); }
        else { f.dano=num(f.dano)+rt; changed=true;
        lines.push({k:'ko',t:`${name}: residual de ${est} (${fx.r}${poison?`, ronda ${num(fx.pr)+1}`:''}${up?`, +${up} Rango por ${em.cond.clima}`:''}) ${dd} [${rl.r.join(', ')}] = ${rt} de daño${why}.`}); }
        const hierba=((CB.cond||{}).campo||{}).n==='Campo de Hierba';
        if(est==='Drenado'&&fx.by&&fx.by!==x.key&&inCombat(fx.by)) heals.push({key:fx.by,val:hierba?rl.t*2:rl.t,from:name+(hierba?' (doble por Campo de Hierba)':'')});
        if(poison) fx.pr=num(fx.pr)+1; }
      if(primera){ lines.push({k:'',t:`${name}: primera ronda con ${est}, todavía no tira Salvación.`}); continue; }
      if(em.skipSalv.includes(est)&&!fx.sk){ fx.sk=1; f.estFx={...(f.estFx||{}),[cls]:fx}; changed=true; lines.push({k:'',t:`${name}: ${est} evita la Salvación esta ronda (${em.cond.clima==='Llovizna'&&est==='Empapado'?'Llovizna':em.cond.campo}).`}); continue; }
      const r=d(100);
      if(r<=th){ f[field]=''; setEstFx(f,cls,null); lines.push({k:'ok',t:`${name}: Salvación de ${est} d100 [${r}] ≤ ${th} → se libera.`}); }
      else { fx.n=num(fx.n)+1; f.estFx={...(f.estFx||{}),[cls]:fx}; lines.push({k:'',t:`${name}: Salvación de ${est} d100 [${r}] > ${th} → sigue (próxima: ${Math.min(100,th+num(e[5]))}).`}); }
      changed=true; }
    if(condFinRonda(f,em,name,lines)) changed=true;
    if(habFinRonda(f,x.key,name,lines)) changed=true;
    if(f.tipo==='P'&&f.habilidad==='Mutapetito'){ const dx=dexById.get(f.especie); const alt=formasDe(dx).find(r=>/Saciada|Voraz/i.test(r[2]));
      if(alt){ f.especie=alt[0]; changed=true; lines.push({k:'',t:`${name}: Mutapetito, pasa a ${alt[2]}.`}); } }
    if(changed) saveAny(x,f);
  }
  for(const hl of heals){ mutate(hl.key,f=>{ f.dano=Math.max(0,num(f.dano)-hl.val); }); const t=combatant(hl.key); lines.push({k:'ok',t:`${t?charName(t.f):'Quien lo causó'} recupera ${hl.val} PS por el Drenado de ${hl.from}.`}); }
  /* duración de climas, campos y entornos */
  for(const cls of ['clima','campo','entorno']){ const c=(CB.cond||{})[cls]; if(!c||!c.n||c.r==null) continue;
    if(num(c.r)<=1){ setCond(cls,''); lines.push({k:'',t:`${c.n} termina.`}); } else { cbWrite({cond:{[cls]:{...c,r:num(c.r)-1}}}); lines.push({k:'',t:`${c.n}: quedan ${num(c.r)-1} rondas.`}); } }
  { const t=CB.tn||{}; const debt={...(t.debt||{})}; const sin=Object.entries(debt).filter(([k,n])=>num(n)>0&&inCombat(k)).map(([k])=>k);
    for(const k of Object.keys(debt)) debt[k]=Math.max(0,num(debt[k])-1);
    sin.forEach(k=>{ const y=combatant(k); lines.push({k:'',t:`${y?charName(y.f):k} empieza la ronda ${CB.ronda} sin Acción (prestada en una Colisión o por Aturdido).`}); });
    CB.acted={r:CB.ronda,k:sin}; CB.tn={r:CB.ronda,prest:[],extra:[],debt}; }
  CB.rondaLog={n:CB.ronda,lines};
  cbWrite({ronda:CB.ronda,rondaLog:CB.rondaLog,acted:CB.acted,tn:CB.tn});
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
  if(x.key!==CBU.cmdFor){ CBU.cmdFor=x.key; CBU.cmdOpen=false; }
  const hb=x.f.tipo==='P'&&x.f.habilidad?x.f.habilidad:'';
  h+=`<div class="grid g3"><label class="f">Personaje<select data-cbf="atk">${mine.map(y=>`<option value="${esc(y.key)}"${y.key===CBU.atk?' selected':''}>${esc(charName(y.f))} · ${esc(ownerLabel(y))}</option>`).join('')}</select></label>${hb?`<div class="f habact"><span>Habilidad</span><button class="btn" data-cb="hab" title="${esc(habMap.get(hb)||'')}">✦ ${esc(habNombre(hb))}</button></div>`:''}</div>`;
  if(hb&&CBU.habMsg&&CBU.habMsg.k===x.key) h+=`<div class="steps-res" style="margin-top:8px">${CBU.habMsg.lines.map(t=>`<div class="ok">${esc(t)}</div>`).join('')}</div>`;
  if(x.f.tipo==='E'&&!mvs.includes('M0000')) mvs.unshift('M0000'); /* Forcejeo: movimiento estándar de todo Entrenador */
  if(!mvs.length) return h+`<p class="note">Este personaje no tiene movimientos.</p></div>`;
  h+=`<div class="mvlist">`;
  if(x.f.tipo==='E') h+=`<div class="mvrow cmdrow${CBU.cmdOpen?' on':''}"><div class="mvhead"><button class="mvname" data-cb="cmdopen" aria-expanded="${!!CBU.cmdOpen}" title="Ver las acciones de Entrenador">Comandar</button></div>
      <div class="mvdata">${badge('Sin Tipo','DDDDDD')} <span class="pill">Acción de Entrenador</span></div>
      <div class="mvfx">Toma una acción de entrenador.</div>${CBU.cmdOpen?cmdHTML(x):''}</div>`;
  for(const id of mvs){ const ai=attackInfo(x,id); if(!ai) continue; const m=ai.mi.m; const on=CBU.picking&&CBU.mv===id; const mode=targetMode(m);
    h+=`<div class="mvrow${on?' on':''}"><div class="mvhead"><button class="mvname" data-cb="pick" data-mv="${id}" title="Atacar con ${esc(m[1])}">${esc(m[1])}</button>
        <label class="mini" title="Bonus a la Clase de Dado">CD <input type="number" data-cbf="bonus" data-mv="${id}" value="${num(CBU.bon[id])}" aria-label="Bonus CD de ${esc(m[1])}"></label>
        <label class="mini" title="Repeticiones seguidas">Rep. <input type="number" min="0" data-cbf="rep" data-mv="${id}" value="${ai.n}" aria-label="Repeticiones de ${esc(m[1])}"></label></div>
      <div class="mvdata">${chip(ai.mi.tipo)} ${claseChip(m[3])} <span>Prec <b>${ai.prec}%</b>${ai.pen?` <span class="ko">(−${ai.pen})</span>`:''}</span><span>CD <b>${ai.mi.dice==='-'?'—':ai.mi.dice}</b></span><span>Prio <b>${ai.mi.prio>0?'+':''}${ai.mi.prio}</b></span><span>${esc(m[10])}</span>${m[14]&&m[14]!=='-'?socialChip(m[14]):''}</div>
      <div class="mvfx">${esc(m[11])}${ai.reR!==null?`<div class="re">R. Extra <b>${pct(ai.reR)}</b></div>`:''}</div>`;
    if(on){ const others=combatants().filter(y=>y.key!==x.key);
      h+=`<div class="mvpick">${mode==='none'?'':`<div class="note">${mode==='single'?'Elige el objetivo':'Elige los objetivos'}</div><div class="grid g2" style="margin-top:6px">${others.map(y=>`<label class="row" style="gap:6px"><input type="${mode==='single'?'radio':'checkbox'}" name="cbt" data-cbt="${esc(y.key)}" ${CBU.targets.includes(y.key)?'checked':''}> ${esc(charName(y.f))} <span class="note">${esc(ownerLabel(y))}</span></label>`).join('')||'<p class="note">No hay otros combatientes.</p>'}</div>`}
        <div class="row" style="margin-top:8px"><button class="btn pri" data-cb="roll" ${mode!=='none'&&!CBU.targets.length?'disabled':''}>Lanzar dados</button><button class="btn" data-cb="cancel">Cancelar</button></div></div>`; }
    h+=`</div>`; }
  return h+`</div><p class="note">Clic en el nombre de un movimiento para atacar con él. La Precisión ya descuenta las repeticiones.</p></div>`;
}
/* ---------- Comandar: acciones del Entrenador (se despliegan desde la opción «Comandar») ---------- */
/* [nombre, Talento, Atributo por defecto, efecto, clave] · las Órdenes (clave apunta/esquiva/critico/mueve) van a un Pokémon suyo y se tiran contra la dificultad del rival */
const COMANDAR=[
  ['¡Apunta!','Precision','DES','El Pokémon resta 10 a la tirada de Precisión de su siguiente ataque.','apunta'],
  ['¡Esquiva!','Perspicacia','SAB','El Pokémon resta 10 a su siguiente tirada de Esquiva o Temple.','esquiva'],
  ['¡Punto débil!','Teoria','SAB','+1 al Índice de Crítico del siguiente ataque del Pokémon.','critico'],
  ['¡Muévete!','Presencia','CAR','+1 etapa de Velocidad del Pokémon (+5 ft).','mueve'],
  ['Retrasar Acción','','','El Pokémon espera: el jugador indica cuándo actúa, gastando la Reacción del Entrenador. Si la ronda termina, se pierde.',''],
  ['Usar Objeto','Aplicacion','ENE','Si supera la dificultad, el Entrenador usa un objeto de su mochila.','obj'],
  ['Lanzar Pokéball','Precision','DES','El Entrenador intenta capturar al Pokémon salvaje. (Los efectos de la captura están pendientes.)','ball']];
const ORDEN_FIJA={apunta:10,esquiva:10,critico:1,mueve:5};
const DIF_RANGO={Starter:['Fácil',9],Beginner:['Sencilla',13],Amateur:['Media',17],Elite:['Desafiante',21],Master:['Difícil',27],Legend:['Imposible',33]};
/* Dificultad de Comandar: la del rival de mayor Rango (Starter = Fácil, Beginner = Sencilla…) */
function cmdDif(x){ const riv=combatants().filter(y=>!aliados(y.key,x.key)&&!(y.src===x.src&&y.uid===x.uid)); let best=null;
  for(const y of riv) if(!best||ri(y.f.rango)>ri(best.f.rango)) best=y;
  const rk=best&&DIF_RANGO[best.f.rango]?best.f.rango:'Starter'; const [n,v]=DIF_RANGO[rk]; return {n,v,rk,by:best?charName(best.f):''}; }
const ORDEN_TXT=o=>o.k==='apunta'?`−${o.v} a su tirada de Precisión`:o.k==='esquiva'?`−${o.v} a su tirada de Esquiva o Temple`:o.k==='critico'?`+${o.v} al Índice de Crítico`:`+1 etapa de Velocidad (+${o.v} ft)`;
const misPokemon=x=>combatants().filter(y=>y.f.tipo==='P'&&y.src===x.src&&y.uid===x.uid&&(!y.f.entrenador||y.f.entrenador===x.id));
function cmdHTML(x){ const f=x.f, c=calc(f); const pk=misPokemon(x); CBU.cmdA ||= {};
  if(!pk.some(y=>y.key===CBU.cmdT)) CBU.cmdT=pk[0]?pk[0].key:'';
  const dif=cmdDif(x);
  let h=`<div class="mvpick cmdpick"><p class="note" style="margin:0 0 6px">Las Órdenes y Usar Objeto se tiran contra la dificultad <b>${dif.n} (${dif.v})</b>${dif.by?`, por el rival de mayor Rango: ${esc(dif.by)} (${esc(dif.rk)})`:' (no hay rivales)'}. Si tienen éxito, el bono dura hasta usarse o hasta el final de la siguiente ronda. Una acción de Entrenador por ronda.</p>`;
  h+=pk.length?`<div class="grid g3"><label class="f">Pokémon que recibe la Orden<select data-cmdt>${pk.map(y=>`<option value="${esc(y.key)}"${y.key===CBU.cmdT?' selected':''}>${esc(charName(y.f))}</option>`).join('')}</select></label></div>`:'<p class="note">No tiene Pokémon suyos en el combate: las Órdenes y Retrasar Acción no están disponibles.</p>';
  h+=`<div class="mvlist">`+COMANDAR.map((o,i)=>{ const t=o[1], orden=!!ORDEN_FIJA[o[4]], need=orden||!o[4]; const ex=orden?ordenExtra(f,combatant(CBU.cmdT)):{b:0,why:[]}, b=t?talBonus(f,t)+ex.b:0, a=CBU.cmdA[i]||o[2];
    return `<div class="mvrow"><div class="mvhead"><button class="mvname" data-cb="cmd" data-i="${i}" ${need&&!pk.length?'disabled':''}>${esc(o[0])}</button>
      ${t?`<label class="mini">Atributo <select data-cmda="${i}">${ATTR.map(k=>`<option value="${k}"${k===a?' selected':''}>${k} (${sg(c.A[k])||0})</option>`).join('')}</select></label>`:''}</div>
      <div class="mvdata">${badge('Sin Tipo','DDDDDD')} <span class="pill">Comandar</span>${t?`<span>${esc(TAL_LABEL(t))} <b>${sg(b)||0}</b>${ex.why.length?` <span class="note">(${esc(ex.why.join(', '))})</span>`:''}</span><span>Tirada <b>1d20 + ${a} + ${esc(TAL_LABEL(t))}</b></span>`:'<span>Sin tirada</span>'}</div>
      <div class="mvfx">${esc(o[3])}</div></div>`; }).join('')+`</div></div>`;
  return h; }
function doComandar(i){ const x=combatant(CBU.atk); if(!x||!canEditRef(x)||x.f.tipo!=='E') return; const o=COMANDAR[i]; if(!o) return;
  const orden=!!ORDEN_FIJA[o[4]], need=orden||!o[4]; const y=combatant(CBU.cmdT); if(need&&!y) return;
  const f=x.f, c=calc(f), t=o[1], ex=orden?ordenExtra(f,y):{b:0,why:[]}, b=t?talBonus(f,t)+ex.b:0; const steps=[]; let val=null, short;
  if(t){ const a=(CBU.cmdA||{})[i]||o[2]; const r=d(20), tot=r+num(c.A[a])+b; val=tot;
    const roll=`1d20 [${r}] + ${a} ${sg(c.A[a])||0} + ${TAL_LABEL(t)} ${sg(b)||0}${ex.why.length?` (${ex.why.join(', ')})`:''} = ${tot}`;
    if(o[4]==='obj'){ const dif=cmdDif(x); const ok=r!==1&&(r===20||tot>=dif.v);
      steps.push({k:ok?'ok':'ko',t:`${roll} contra ${dif.n} (${dif.v}) → ${ok?'éxito':'falla'}${r===20?' (20 natural)':r===1?' (1 natural)':''}`});
      steps.push({k:ok?'ok':'ko',t:ok?'El Entrenador usa un objeto de su mochila.':'El rival se antepone al Entrenador sin dar tiempo de usarlo.'});
      short=`${o[0]}: ${roll} vs ${dif.v} · ${ok?'éxito':'falla'}`; }
    else if(orden){ const dif=cmdDif(x); const ok=r!==1&&(r===20||tot>=dif.v); const k=o[4], v=ORDEN_FIJA[k];
      steps.push({k:ok?'ok':'ko',t:`${roll} contra ${dif.n} (${dif.v}) → ${ok?'éxito':'falla'}${r===20?' (20 natural)':r===1?' (1 natural)':''}`});
      if(ok){ mutate(y.key,pf=>{ pf.orden={k,v,n:o[0],by:charName(f),hasta:num(CB.ronda)+1}; }); steps.push({k:'ok',t:`${charName(y.f)}: ${ORDEN_TXT({k,v})} hasta usarlo o hasta el final de la ronda ${num(CB.ronda)+1}.`}); }
      else steps.push({k:'ko',t:'La Orden no se cumple.'});
      short=`${o[0]} (${charName(y.f)}): ${roll} vs ${dif.v} · ${ok?'éxito':'falla'}`; }
    else { steps.push({k:'',t:roll}); steps.push({k:'fx',t:o[3]}); short=`${o[0]}: ${roll}`; } }
  else { steps.push({k:'fx',t:`${charName(y.f)} espera. ${o[3]}`}); short=`${o[0]} (${charName(y.f)})`; }
  const last={ts:Date.now(),by:charName(f),byKey:x.key,mv:o[0],mvId:'',cls:'Comandar',cmd:true,go:true,steps,res:[],selfDone:true};
  cbWrite({last}); logRoll(charName(f),'Comandar '+short,val);
  CBU.cmdOpen=false; markActed(x.key); renderSheet(); }
function rollDamage(ai,target,crit,bonus){
  const m=ai.mi.m; const tc=calc(target.f); const heal=hasCat(m,'Curacion')&&!hasCat(m,'Drenaje');
  const isNum=typeof m[7]==='number'&&m[7]>0;
  if(heal){ if(!isNum) return {heal:true,val:null,det:'Sin dado'}; const idx=clamp(m[7]+ai.mi.stab+num(bonus)+ai.mi.cm.cd,1,24); const dd=dice(idx); const rl=rollDice(dd); let v=rl.t+(ai.mi.atr||0); if(crit) v*=2; return {heal:true,val:v,det:`${dd} [${rl.r.join(', ')}] + ${ai.mi.atr||0}${crit?' × 2 (crítico)':''}`}; }
  const T=ai.mi.tipo, hm=ai.mi.hm, th=tc.em.hk||[], self=ai.x&&ai.x.key===target.key;
  /* inmunidades por la Habilidad del objetivo */
  if(!self){
    const ab=th.find(h=>/^(inmuneTipo|absorbe):/.test(h.k)&&deacc(h.k.split(':')[1])===T);
    if(ab&&!ab.k.startsWith('absorbe')) return {val:0,det:`Inmune (${ab.nm})`,immune:true};
    if(ab) var absorbe=ab.nm;
    const ic=th.find(h=>h.k.startsWith('inmuneCat:')&&hasCat(m,h.k.slice(10))); if(ic) return {val:0,det:`Inmune (${ic.nm})`,immune:true};
    const ie=th.find(h=>h.k==='inmuneClase:Estado'); if(ie&&m[3]==='Estado') return {val:null,det:`Sin efecto (${ie.nm})`,immune:true};
    const sa=th.find(h=>h.k==='sinDañoAliados'); if(sa&&ai.x&&aliados(ai.x.key,target.key)) return {val:0,det:`Sin daño de aliados (${sa.nm})`,immune:true}; }
  const e=effectiveness(T,tc.tipos,m[0],hm.golpea);
  if(e.immune) return {val:0,det:'Inmune',immune:true};
  const sg2=th.find(h=>h.k==='soloSuper'); if(sg2&&!self&&e.steps<=0&&m[3]!=='Estado') return {val:0,det:`Inmune: solo le daña lo súper eficaz (${sg2.nm})`,immune:true};
  const pe=th.find(h=>h.k==='pocoEficazRecv'); if(pe&&!self) e.steps=Math.min(e.steps,-1);
  const hx=[];
  const nc=th.find(h=>h.k==='noCritRecv'); if(crit&&nc){ crit=false; hx.push(`${nc.nm}: no recibe críticos`); }
  if(!crit&&ai.x&&habRowsOf(ai.f,['Siempre']).some(r=>r[5]==='critico'&&habCondOk(r[3],ai.f,ai.x.key,{blanco:target.f}))){ crit=true; hx.push(`${habOf(ai.f)}: siempre crítico`); }
  if(!isNum){ if(m[3]==='Estado'&&crit){ const ak=short(m[4]); const v=ai.c.A[ak]||0; return {val:v,det:`Crítico de Estado: daño igual a ${ak} (${v})`}; } return {val:null,det:'Sin daño'}; }
  const own=num(ai.c.em.cdOwn[T]), recv=num(tc.em.cdRecv[T]);
  let hcd=0;
  for(const h of hkOf(ai.c.em,/^cdOwn:(super|critico)$/)) if(h.k==='cdOwn:super'?e.steps>0:crit){ hcd+=hval(h.v); hx.push(`${h.nm} ${sg(hval(h.v))} CD`); }
  for(const h of th.filter(h=>h.k.startsWith('cdRecv:'))){ const q=h.k.slice(7); let ok=false;
    if(q==='todos') ok=true; else if(q==='super') ok=e.steps>0; else if(q==='cat:Contacto') ok=/^contacto/i.test(String(m[10])); else if(q.startsWith('cat:')) ok=hasCat(m,q.slice(4)); else if(q.startsWith('clase:')) ok=deacc(m[3])===deacc(q.slice(6));
    if(ok){ hcd+=hval(h.v); hx.push(`${h.nm} ${sg(hval(h.v))} CD`); } }
  const cm=ai.mi.cm;
  const idx=clamp(m[7]+ai.mi.stab+e.steps+num(bonus)+own+recv+cm.cd+hcd,1,24); const dd=dice(idx); const rl=rollDice(dd);
  const def=m[3]==='Fisico'?tc.A.VIT:m[3]==='Especial'?tc.A.SAB:0;
  let v=Math.max(0,rl.t+ai.mi.atr-def); if(crit) v*=2; if(cm.x2) v*=2;
  const x2=th.find(h=>h.k.startsWith('dañoRecv×2:')&&deacc(h.k.split(':')[1])===T); if(x2){ v*=2; hx.push(`${x2.nm}: recibe doble de ${T}`); }
  const pc=hkOf(ai.c.em,/^daño×2:pocoEficaz$/)[0]; if(pc&&e.steps<0){ v*=2; hx.push(`${pc.nm}: doble daño (poco eficaz)`); }
  if(typeof absorbe!=='undefined'&&absorbe) return {heal:true,val:v,det:`${absorbe}: en vez de recibir daño recupera ${v} PS (${dd} [${rl.r.join(', ')}])`,absorbe:true,immune:true};
  const ex=[e.steps>0?`súper eficaz +${e.steps}`:e.steps<0?`poco eficaz ${e.steps}`:'',own?`propio ${own>0?'+':''}${own} CD`:'',recv?`objetivo ${recv>0?'+':''}${recv} CD`:'',...cm.notes,...hm.notes,...hx].filter(Boolean).join(', ');
  return {val:v,crit,det:`${dd} [${rl.r.join(', ')}] + ${ai.mi.atr} ${ai.mi.ak}${def?' − '+def+(m[3]==='Fisico'?' VIT':' SAB'):''}${crit?' × 2 (crítico)':''}${cm.x2?' × 2':''}${ex?' · '+ex:''}`};
}
function doAttack(){
  const x=combatant(CBU.atk); if(!x||!canEditRef(x)) return; const mvId=CBU.mv; const ai=attackInfo(x,mvId); if(!ai) return; const m=ai.mi.m;
  const mode=targetMode(m); let tkeys=mode==='none'?[]:CBU.targets.slice();
  const bonus=num(CBU.bon[mvId]);
  const r=d(100); const steps=[]; const ts=Date.now();
  const hit=(r<=ai.prec||ai.mi.hm.siempre)&&r!==100;
  steps.push({k:hit?'ok':'ko',t:`Precisión: d100 [${r}] contra ${ai.prec}% → ${hit?'conecta':'falla'}${ai.mi.hm.siempre&&r>ai.prec&&r!==100?` (${habOf(x.f)}: siempre golpea)`:''}`});
  if(r===1) steps.push({k:'ok',t:'01 natural: +1 al Bono de Evasión y algo a decisión del Narrador.'});
  if(r===100) steps.push({k:'ko',t:'100: fallo crítico, −1 al Bono de Evasión y algo a decisión del Narrador.'});
  let go=hit, crit=false, re=false, postCond=null;
  if(go&&ai.mi.cm.block){ steps.push({k:'ko',t:ai.mi.cm.block+': el movimiento no tiene efecto.'}); go=false; }
  if(go){ for(const cn of ai.c.em.cancel){
      if(cn.kind==='aturdido'){ steps.push({k:'ko',t:`${cn.est}: pierde su Acción.`}); go=false; break; }
      if(r>cn.thr){ if(cn.kind==='pierde'){ steps.push({k:'ko',t:`${cn.est}: la tirada (${r}) supera ${cn.thr}, pierde la acción.`}); go=false; break; }
        if(cn.kind==='self'){ steps.push({k:'wa',t:`${cn.est}: la tirada (${r}) supera ${cn.thr}, el ataque cambia de objetivo hacia sí mismo.`}); tkeys=[x.key]; }
        if(cn.kind==='causante') steps.push({k:'wa',t:`${cn.est}: la tirada (${r}) supera ${cn.thr}, no puede atacar a quien se lo causó.`}); }
      else steps.push({k:'',t:`${cn.est}: la tirada (${r}) no supera ${cn.thr}, actúa con normalidad.`}); } }
  const res=[];
  const nf=structuredClone(x.f); CKEY.set(nf,x.key); nf.rep={mv:mvId,n:ai.n+1};
  if(nf.orden&&nf.orden.k!=='esquiva'){ steps.splice(1,0,{k:'ok',t:`Orden ${nf.orden.n} de ${nf.orden.by}: ${ORDEN_TXT(nf.orden)} (se usa en este movimiento).`}); delete nf.orden; }
  let selfNow=false;
  if(go){ crit=r<=Math.round(ai.critR*100); steps.push({k:crit?'ok':'',t:`Crítico (${pct(ai.critR)}${hasCat(m,'Preciso')?', Preciso +1 IC':''}): ${crit?'¡sí!':'no'}`});
    if(ai.reR!==null){ re=r<=Math.round(ai.reR*100); steps.push({k:re?'ok':'',t:`Rango Extra ${pct(ai.reR)}: ${re?'se activa el efecto':'no se activa'}`}); }
    steps.push({k:'fx',t:`Efecto: ${m[11]}`});
    if(ai.mi.cm.notes.length) steps.push({k:'',t:`Condición: ${ai.mi.cm.notes.join(' · ')}`});
    const cl=[]; const nc=condDeMov(m); if(nc&&(!nc.re||re)) postCond=()=>crearCond(nc,x.key,cl,m[1],m[5]);
    if(/^Voto (Agua|Fuego|Planta)$/.test(m[1])){ const V=CB.voto; const ally=V&&num(V.ronda)===num(CB.ronda)&&V.key!==x.key&&V.mv!==mvId&&aliados(V.key,x.key)&&inCombat(V.key);
      if(ally) postCond=()=>crearCond({n:'Arcoíris',r:4},x.key,cl,`${V.name} y ${charName(x.f)} combinan sus Voto`,m[5]);
      cbWrite({voto:ally?null:{ronda:num(CB.ronda),key:x.key,mv:mvId,name:charName(x.f)}}); }
    if(postCond) steps.push({k:'ok',t:'',cl});
    if(mode==='none'||!tkeys.length){
      const dr=rollDamage(ai,x,crit,bonus); if(dr.val!==null&&dr.heal) res.push({key:x.key,name:charName(x.f),...dr,selfMove:true});
      const notes=applyOps(nf,parseFx(m),'all',{re,rank:m[5],by:x.key});
      if(notes.length) steps.push({k:'ok',t:`Efectos en ${charName(x.f)}: ${notes.join(' · ')}`});
      selfNow=true; }
    else for(const k of tkeys){ const t=combatant(k); if(!t) continue; const dr=rollDamage(ai,t,crit,bonus);
      const ck=dr.crit??crit; let est=''; if(ck&&!dr.heal&&!dr.immune){ const ce=critEstado(m); if(ce) est=estImmune(t.f,ce)?`Inmune a ${ce}`:`Crítico: aplica ${ce}`; }
      const noEv=ai.mi.hm.ignEv||ai.mi.hm.siempre;
      res.push({key:k,name:charName(t.f),...dr,crit:ck,est,kind:dr.immune||noEv?null:m[3]==='Estado'?'tem':'esq'}); }
  }
  saveFicha(x,nf);
  /* la condición se crea después de guardar al atacante (Predicción puede cambiar su forma) */
  if(postCond){ postCond(); const i=steps.findIndex(z=>z.cl); const cl=steps[i].cl; steps.splice(i,1,...cl.map(t=>({k:'ok',t}))); }
  const last={ts,by:charName(x.f),byKey:x.key,mv:m[1],mvId,tipo:ai.mi.tipo,cls:m[3],rank:m[5],d100:r,prec:ai.prec,hit,crit,re,go,steps,res,selfDone:selfNow};
  CBU.picking=false; CBU.targets=[]; CBU.colFor='';
  if(dmgMoves(x.f).includes(mvId)){ CL.am=mvId; CL.ca=crit; }
  cbWrite({last}); markActed(x.key);
  logRoll(charName(x.f),`${m[1]}: d100 [${r}] vs ${ai.prec}% · ${!hit?'falla':!go?'pierde la acción':crit?'crítico':'conecta'}${res.length?' · '+res.map(z=>`${z.name} ${z.heal?'+':''}${z.val??'—'}`).join(' · '):''}`,r);
  renderSheet();
}
/* Habilidades que reaccionan al golpe: del que recibe (al recibir un ataque) y del atacante (causa estados, al debilitar) */
function habAlGolpear(L,z,t,A,m,act0,act1,ps){ const out=[]; const dmg=num(z.val)>0;
  const x={recibe:{mov:m,crit:!!(z.crit??L.crit),tipo:L.tipo||m[2]},ko:act1<=0&&act0>0,cruza:act0>=ps/2&&act1<ps/2&&act1>0};
  if(dmg) for(const r of habRowsOf(t.f,['Al recibir un ataque'])){ if(!habCondOk(r[3],t.f,z.key,x)) continue; const k=r[5], v=r[6]; let mm;
    if(r[7]&&d(100)>hval(r[7])) continue;
    if((mm=/^attr:(\w+)$/.exec(k))){ let n=''; mutate(r[4]==='Atacante'?L.byKey:z.key,f=>{ n=habAttr(f,mm[1],hval(v),r[0],r[4]==='Atacante'&&!aliados(L.byKey,z.key)); }); if(n) out.push(n); }
    else if((mm=/^causaEst:(\w+)$/.exec(k))){ let n=''; mutate(L.byKey,f=>{ n=giveEstado(f,mm[1],{rank:t.f.rango||'Starter',by:z.key},false); }); if(n) out.push(`${r[0]}: ${charName(A.f)} ${n}`); }
    else if(k==='dañoAtacante'){ const pa=calc(A.f).ps; const val=v==='1/4'?Math.floor(pa/4):/^2×/.test(v)?2*num(z.val):rollResid(t.f.rango).t; mutate(L.byKey,f=>{ f.dano=num(f.dano)+val; }); out.push(`${r[0]}: ${charName(A.f)} pierde ${val} PS`); } }
  if(dmg&&m[3]!=='Estado') for(const r of habRowsOf(A.f,['Siempre'])){ let mm=/^causaEst:(.+)$/.exec(r[5]); if(!mm||!habCondOk(r[3],A.f,L.byKey,{blanco:t.f,mov:m})) continue;
    if(d(100)>hval(r[7]||100)) continue; const e=pick(mm[1].split('/')); let n=''; mutate(z.key,f=>{ n=giveEstado(f,e,{rank:A.f.rango||'Starter',by:L.byKey},false); }); if(n) out.push(`${r[0]}: ${n}`); }
  if(x.ko) for(const r of habRowsOf(A.f,['Al debilitar'])){ const mm=/^attr:(\w+)(?:\/(\w+))?$/.exec(r[5]); if(!mm) continue; let n=''; mutate(L.byKey,f=>{ n=habAttr(f,mm[1],hval(r[6]),r[0]); }); if(n) out.push(n); }
  return out; }
/* El ataque conecta con un objetivo: daño (o curación), estado por crítico y efectos */
function connectHit(L,z,extra){
  const t=combatant(z.key); if(!t) return [];
  const A=combatant(L.byKey); const m=atkById.get(L.mvId); const ops=m?parseFx(m):[]; const ctx={re:!!L.re,rank:L.rank,by:L.byKey,tk:z.key};
  const out=[]; const tc0=calc(t.f); const ps=tc0.ps, act0=tc0.act; let act1=act0;
  if((tc0.em.hk||[]).some(h=>h.k==='noReRecv')) ctx.re=false; /* Polvo Escudo */
  mutate(z.key,f=>{
    if(z.val){ if(z.heal) f.dano=Math.max(0,num(f.dano)-z.val); else { f.dano=num(f.dano)+z.val;
        const sv=(tc0.em.hk||[]).find(h=>h.k==='sobrevive1PS'); if(sv&&act0>=ps&&num(f.dano)>=ps){ f.dano=ps-1; out.push(`${sv.nm}: queda con 1 PS`); } }
      act1=ps-num(f.dano); out.push(z.heal?`recupera ${z.val} PS`:`recibe ${z.val} de daño`); }
    if(z.selfMove||z.immune) return;
    if((z.crit??L.crit)&&m&&!z.heal){ const ce=critEstado(m); if(ce){ const tx=giveEstado(f,ce,ctx,true); if(tx) out.push('crítico: '+tx); } }
    const n=applyOps(f,ops,'target',ctx); out.push(...n);
  });
  if(m&&A&&!z.heal&&!z.selfMove&&z.key!==L.byKey) out.push(...habAlGolpear(L,z,t,A,m,act0,act1,ps));
  if(m&&hasCat(m,'Drenaje')&&!z.heal&&num(z.val)>0&&A){ const hv=Math.floor(num(z.val)/2); if(hv){ mutate(L.byKey,f=>{ f.dano=Math.max(0,num(f.dano)-hv); }); out.push(`${charName(A.f)} recupera ${hv} PS (Drenaje)`); } }
  if(!L.selfDone&&!z.selfMove&&A&&m){ const n=[]; mutate(L.byKey,f=>{ n.push(...applyOps(f,ops,'self',ctx)); }); if(n.length) out.push(`${charName(A.f)}: ${n.join(' · ')}`); L.selfDone=true; cbWrite({last:L}); }
  if(!z.heal&&!z.immune&&num(z.val)>0&&z.key!==L.byKey){ const tf=(combatant(z.key)||{}).f; const h=tf&&tf.estM!=='Mareado'?habOf(tf):''; const ht=h?habMap.get(h):'';
    if(ht&&/^Cuando recibe un ataque/.test(ht)){ const c=condDeTexto(ht); if(c){ const cl=[]; crearCond(c,z.key,cl,h); out.push(...cl); } } }
  logRoll(charName(t.f),`${L.mv} de ${L.by}: ${out.join(' · ')||'sin efecto'}${extra?' · '+extra:''}`,z.val??null);
  return out;
}
function cbLastHTML(){
  const L=CB.last; if(!L) return '';
  let h=`<div class="card"><h2>Último ataque <span class="note" style="text-transform:none;letter-spacing:0">${esc(L.by)} · ${L.cmd?'Comandar: ':''}${esc(L.mv)} · ${hhmm(L.ts)}</span></h2><div class="steps-res">${L.steps.map(s=>`<div class="${s.k==='fx'?'fx-box':s.k||''}">${esc(s.t)}</div>`).join('')}</div>`;
  if(L.res&&L.res.length) h+=`<div class="res" style="margin-top:10px">`+L.res.map(z=>{ const fk=`${L.ts}|${z.key}`; const fx=CB.lastFx[fk]||{}; const t=combatant(z.key); const can=t&&canEditRef(t)&&S.canWrite;
    const canCol=!z.heal&&L.cls!=='Estado'&&t&&dmgMoves(t.f).length>0&&z.key!==L.byKey&&puedeColisionar(z.key);
    let btns='';
    if(can&&!fx.done){
      if(!z.heal&&z.kind) btns+=`<button class="btn sm" data-cb="evade" data-k="${esc(z.key)}">Evadir (${z.kind==='tem'?'Temple':'Esquiva'})</button>`;
      if(canCol) btns+=`<button class="btn sm" data-cb="col" data-k="${esc(z.key)}" aria-expanded="${CBU.colFor===fk}">Colisionar</button>`;
      btns+=`<button class="btn sm pri" data-cb="apply" data-k="${esc(z.key)}">${z.heal?'Aplicar curación':z.val?'Recibir':'Recibir efecto'}</button>`; }
    let colPick='';
    if(can&&!fx.done&&CBU.colFor===fk&&t){ colPick=`<div class="colpick"><div class="note">Elige el movimiento para colisionar (se tira su Precisión):</div><div class="row" style="margin-top:6px">${dmgMoves(t.f).map(id=>{ const ai=attackInfo(t,id); return ai?`<button class="btn sm" data-cb="colmv" data-k="${esc(z.key)}" data-mv="${id}">${esc(ai.mi.m[1])} <span class="note">${ai.prec}%${ai.pen?' (−'+ai.pen+')':''}</span></button>`:''; }).join('')}<button class="btn sm" data-cb="colno">Cancelar</button></div></div>`; }
    return `<div class="r"><div><div class="note">${z.heal?'Curación a':'Daño a'} ${esc(z.name)}${z.est?` · ${esc(z.est)}`:''}</div><div class="big ${fx.ev?'ko':''}">${z.val??'—'}</div><div class="note">${esc(z.det)}</div>${(fx.log||[]).map(l=>`<div class="${l.k||''}">${esc(l.t)}</div>`).join('')}</div>
      <div class="row" style="justify-content:flex-end;align-content:flex-start">${btns}</div>${colPick}</div>`; }).join('')+`</div>`;
  if(!L.res||!L.res.length) return h+`</div>`;
  return h+`<p class="note">Cada defensor elige: <b>Evadir</b> (su d100 debe ser ≤ su Evasión y ≤ ${L.d100}), <b>Colisionar</b> con un movimiento de daño, o <b>Recibir</b>. Si no logra evitarlo, el daño y los efectos se aplican solos.</p></div>`;
}
function combatHTML(){ return cbOrderHTML()+cbLastHTML()+cbAttackHTML()+cbClashHTML(); }
/* ---------- colisión ---------- */
const CL={am:'',dm:'',ca:false,cd:false};
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
  const ak=m[3]==='Fisico'?'FUE':m[3]==='Especial'?'ENE':''; if(ak){ const av=num(c.A[ak]); add(`${ak} ${av} ÷ 3 (hacia arriba)`,Math.ceil(av/3)); }
  if(crit) add('Crítico',2);
  return {x,c,mi,m,rows,tot,ai:attackInfo(x,mv)};
}
/* Calculadora de Colisión: solo informativa, con los movimientos de daño de los combatientes */
function clashMovePts(m,om,isAtk,crit){
  const rows=[]; let tot=0; const add=(t,v)=>{ rows.push([t,v]); tot+=v; };
  if(isAtk) add('Ser el atacante',1);
  add(`Nivel ${m[5]}`,ri(m[5])+1);
  const sz=clashSize(m[10]); add(`Tamaño: ${sz.t}`,sz.p);
  const e=om?effectiveness(m[2],[om[2]]):{steps:0,immune:false};
  if(e.immune) add(`${m[2]} contra ${om[2]}: sin efecto`,-4);
  else if(e.steps>0) add(`${m[2]} contra ${om[2]}: súper eficaz`,2);
  else if(e.steps<0) add(`${m[2]} contra ${om[2]}: poco eficaz`,-2);
  if(crit) add('Crítico',2);
  return {m,rows,tot};
}
function cbClashHTML(){
  const ids=[...new Set(combatants().flatMap(x=>dmgMoves(x.f)))].map(id=>atkById.get(id)).filter(Boolean)
    .sort((a,b)=>deacc(a[2]).localeCompare(deacc(b[2]))||a[1].localeCompare(b[1],'es'));
  let h=`<div class="card"><h2>Calculadora de Colisión <span class="note" style="text-transform:none;letter-spacing:0">Solo informativa</span></h2>`;
  if(!ids.length) return h+`<p class="note">Los combatientes no tienen movimientos de daño.</p></div>`;
  if(!ids.some(m=>m[0]===CL.am)) CL.am=ids[0][0]; if(!ids.some(m=>m[0]===CL.dm)) CL.dm=(ids[1]||ids[0])[0];
  const mvo=sel=>ids.map(m=>`<option value="${m[0]}"${m[0]===sel?' selected':''}>${esc(m[2]==='Electrico'?'Eléctrico':m[2]==='Psiquico'?'Psíquico':m[2]==='Dragon'?'Dragón':m[2])} · ${esc(m[1])}</option>`).join('');
  h+=`<div class="grid g2"><label class="f">Movimiento atacante<select data-clf="am">${mvo(CL.am)}</select></label><label class="f">Movimiento defensivo<select data-clf="dm">${mvo(CL.dm)}</select></label></div>
    <div class="row" style="margin-top:8px"><label class="row" style="gap:6px"><input type="checkbox" data-clf="ca" ${CL.ca?'checked':''}> Crítico del atacante</label><label class="row" style="gap:6px"><input type="checkbox" data-clf="cd" ${CL.cd?'checked':''}> Crítico del defensor</label></div>`;
  const ma=atkById.get(CL.am), md=atkById.get(CL.dm);
  const SA=clashMovePts(ma,md,true,CL.ca), SB=clashMovePts(md,ma,false,CL.cd);
  const diff=SA.tot-SB.tot, ad=Math.abs(diff); const win=diff>0?SA:diff<0?SB:null, lose=diff>0?SB:diff<0?SA:null;
  const cd=m=>typeof m[7]==='number'&&m[7]>0?m[7]:1;
  const avgDice=dice(Math.round((cd(ma)+cd(md))/2));
  const side=(S_,lbl)=>`<div class="side${win===S_?' win':''}"><div class="note">${lbl}</div><b>${esc(S_.m[1])}</b> ${chip(S_.m[2])} ${claseChip(S_.m[3])} ${rankChip(S_.m[5])}
    <table><tbody>${S_.rows.map(([t,v])=>`<tr><td>${esc(t)}</td><td>${v>0?'+':''}${v}</td></tr>`).join('')}<tr><td><b>Total</b></td><td><b>${S_.tot}</b></td></tr></tbody></table></div>`;
  h+=`<div class="clpts">${side(SA,'Atacante')}${side(SB,'Defensor')}</div>`;
  let out;
  if(!win) out=`<b>Empate.</b> Ambos reciben el promedio de las CD (<b>${avgDice}</b>, sin STAB) más el promedio del Atributo de los dos movimientos, sin restar defensas. Nadie aplica efectos secundarios.`;
  else if(ad<=3) out=`<b>Gana ${esc(win.m[1])} por ${ad}.</b> El perdedor recibe el promedio de las CD de los dos movimientos (<b>${avgDice}</b>, sin STAB)${(win===SA?CL.ca:CL.cd)?' × 2 por el crítico del ganador':''}. Solo el ganador aplica sus efectos secundarios.`;
  else out=`<b>Gana ${esc(win.m[1])} por ${ad}.</b> El perdedor recibe el daño completo de ${esc(win.m[1])}${(win===SA?CL.ca:CL.cd)?' × 2 por el crítico':''}. Solo el ganador aplica sus efectos secundarios.`;
  return h+`<div class="fx-box" style="margin-top:10px">${out}${win?`<div class="note" style="margin-top:4px">Efecto de ${esc(win.m[1])}: ${esc(win.m[11])}</div>`:''}</div><p class="note">En combate cada lado suma además su FUE ÷ 3 (movimiento Físico) o su ENE ÷ 3 (Especial), redondeado hacia arriba; aquí no se cuenta porque no hay participantes.</p></div>`;
}
function clChange(el){
  const k=el.dataset.clf;
  if(k==='am'||k==='dm') CL[k]=el.value;
  else if(k==='ca'||k==='cd') CL[k]=el.checked;
  renderSheet();
}

function doEvade(ref,f,kind,against){
  const c=calc(f); const od=f.orden&&f.orden.k==='esquiva'?f.orden:null; const need=Math.min(100,Math.round((kind==='esq'?c.esq:c.tem)*100)+(od?num(od.v):0)); const r=d(100);
  const lim=against?Math.min(need,against.d100):need; const ok=r<=lim&&r!==100; const crit=ok&&r<=Math.max(1,Math.round(c.crit*100)); /* Esquiva crítica: tirada ≤ su probabilidad de crítico (siempre con 01) */
  const nf=structuredClone(f); const key=kind==='esq'?'cEsq':'cTem'; nf[key]=num(nf[key])+1; if(od) delete nf.orden; if(ref.key) saveAny(ref,nf); else saveFicha(ref,nf);
  const txt=`${od?`Orden ${od.n}: +${od.v} % a la Evasión. `:''}Intentó evitar ${against?`${against.mv} de ${against.by}`:'un movimiento'} con ${kind==='esq'?'Esquiva':'Temple'}: d100 [${r}] vs ${need}%${against?` y ≤ ${against.d100}`:''} → ${ok?(crit?'¡Esquiva crítica! Lo evita y puede atacar otra vez':'lo evita'):'no lo evita'}`;
  logRoll(charName(f),txt,r);
  return {r,ok,txt,crit};
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
  if(!win){ const atr=Math.round((num(SA.mi.atr)+num(SB.mi.atr))/2);
    for(const S_ of [SA,SB]){ const rl=rollDice(avgDice); const v=rl.t+atr; mutate(S_.x.key,f=>{ f.dano=num(f.dano)+v; }); log.push({k:'ko',t:`${charName(S_.x.f)} recibe ${v} (promedio de CD ${avgDice} [${rl.r.join(', ')}] + promedio de Atributo ${atr}, sin defensa).`}); }
    log.push({k:'',t:'Empate: nadie aplica efectos secundarios.'}); }
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
  else if(act==='end'){ document.querySelectorAll('[data-cb="end"],[data-cb="round"],[data-cb="tie"]').forEach(e=>e.hidden=true); $('#endConfirm').innerHTML='<button class="btn sm danger" data-cb="endYes">Sí, terminar</button> <button class="btn sm" data-cb="endNo">Cancelar</button>'; }
  else if(act==='endNo'){ $('#endConfirm').innerHTML=''; document.querySelectorAll('[data-cb="end"],[data-cb="round"],[data-cb="tie"]').forEach(e=>e.hidden=false); }
  else if(act==='endYes'){ cbWrite({parts:[],snaps:{},ties:{},last:null,lastFx:{},ronda:0,rondaLog:null,cond:{},voto:null,eq:{},acted:null,tn:null},true); render(); }
  else if(act==='round'){ document.querySelectorAll('[data-cb="end"],[data-cb="round"],[data-cb="tie"]').forEach(e=>e.hidden=true); $('#endConfirm')&&($('#endConfirm').innerHTML=''); $('#roundConfirm').innerHTML=`<button class="btn sm pri" data-cb="roundYes">Sí, terminar la ronda ${num(CB.ronda)}</button> <button class="btn sm" data-cb="roundNo">Cancelar</button>`; }
  else if(act==='roundNo'){ $('#roundConfirm').innerHTML=''; document.querySelectorAll('[data-cb="end"],[data-cb="round"],[data-cb="tie"]').forEach(e=>e.hidden=false); }
  else if(act==='roundYes'){ b.disabled=true; endRound(); }
  else if(act==='pick'){ const mv=b.dataset.mv; const x=combatant(CBU.atk); const m=atkById.get(mv); if(!x||!m) return; CBU.mv=mv; CBU.targets=[];
    /* movimientos a aliados: se marcan los del mismo Equipo, pero se pueden quitar (distancias en el mapa) */
    const al=combatants().filter(y=>y.key!==x.key&&aliados(y.key,x.key)).map(y=>y.key);
    if(['Aliados','Equipo'].includes(m[9])) CBU.targets=al; else if(m[9]==='Aliado'&&al.length===1) CBU.targets=al;
    if(targetMode(m)==='none'){ CBU.picking=false; doAttack(); return; } CBU.picking=true; renderSheet(); }
  else if(act==='hab'){ activarHab(); }
  else if(act==='cmd'){ doComandar(num(b.dataset.i)); }
  else if(act==='cmdopen'){ CBU.cmdOpen=!CBU.cmdOpen; CBU.picking=false; renderSheet(); }
  else if(act==='rs'){ const k=b.dataset.k, mm=b.dataset.m; CBU.rs=CBU.rs&&CBU.rs.k===k&&CBU.rs.m===mm?null:{k,m:mm,r:'',t:'',msg:''}; renderSheet(); }
  else if(act==='rsNo'){ CBU.rs=null; renderSheet(); }
  else if(act==='rsGo'){ rsGo(); }
  else if(act==='cancel'){ CBU.picking=false; CBU.targets=[]; renderSheet(); }
  else if(act==='roll'){ doAttack(); }
  else if(act==='colno'){ CBU.colFor=''; renderSheet(); }
  else if(['evade','apply','col','colmv'].includes(act)){
    const L=CB.last; if(!L) return; const z=L.res.find(q=>q.key===b.dataset.k); const t=combatant(b.dataset.k); if(!z||!t||!canEditRef(t)) return;
    const fk=`${L.ts}|${z.key}`; const fx={...(CB.lastFx[fk]||{})}; if(fx.done) return; const log=[...(fx.log||[])];
    if(act==='col'){ CBU.colFor=CBU.colFor===fk?'':fk; renderSheet(); return; }
    if(act==='evade'){ const ev=doEvade(t,t.f,z.kind,{d100:L.d100,mv:L.mv,by:L.by}); log.push({k:ev.ok?'ok':'ko',t:ev.txt});
      if(ev.crit) log.push({k:'ok',t:esquivaCritica(t.key)});
      if(ev.ok){ fx.ev=true; fx.done=true; }
      else { connectHit(L,z,'no logró evadir').forEach(o=>log.push({k:'',t:o})); fx.done=true; } }
    else if(act==='apply'){ const out=connectHit(L,z,''); log.push({k:'ok',t:(z.heal?'Curación aplicada':'Recibido')+(out.length?': '+out.join(' · '):'')}); fx.done=true; }
    else if(act==='colmv'){ const pa=accionColision(z.key); if(pa) log.push({k:'wa',t:pa}); log.push(...doCollide(L,z,b.dataset.mv)); fx.done=true; CBU.colFor=''; }
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
  if('cmdt' in e.target.dataset){ CBU.cmdT=e.target.value; return; }
  if(e.target.dataset.cmda){ (CBU.cmdA ||= {})[e.target.dataset.cmda]=e.target.value; renderSheet(); return; }
  if(e.target.dataset.rs&&CBU.rs){ CBU.rs[e.target.dataset.rs]=e.target.value; CBU.rs.msg=''; return; }
  if(e.target.dataset.cbeq){ const k=e.target.dataset.cbeq; const c=combatant(k); if(c&&canGlove(c)){ const n=num(e.target.value); cbWrite({eq:{[k]:n||null}}); } renderSheet(); return; }
  if(e.target.dataset.cond&&isMaster()){ const cls=e.target.dataset.cond, n=e.target.value; setCond(cls,n,n?condDur(n):undefined,''); logRoll('Condición',n?`El Master define ${COND_CLS[cls].toLowerCase()}: ${n} (${condDur(n)} rondas).`:`El Master quita ${COND_CLS[cls].toLowerCase()==='clima'?'el clima':COND_CLS[cls].toLowerCase()==='campo'?'el campo':'el entorno'}.`,null); renderSheet(); return; }
  if(e.target.dataset.condr&&isMaster()){ const cls=e.target.dataset.condr; const c=(CB.cond||{})[cls]; if(c) cbWrite({cond:{[cls]:{...c,r:clamp(num(e.target.value),1,20)}}}); renderSheet(); return; }
  if(e.target.dataset.condby&&isMaster()){ const cls=e.target.dataset.condby; const c=(CB.cond||{})[cls]; if(c) cbWrite({cond:{[cls]:{...c,by:e.target.value}}}); renderSheet(); return; }
  if(e.target.dataset.clf){ clChange(e.target); return; }
  if(e.target.dataset.cbt){ const k=e.target.dataset.cbt; if(e.target.type==='radio') CBU.targets=[k]; else CBU.targets=e.target.checked?[...new Set([...CBU.targets,k])]:CBU.targets.filter(x=>x!==k); renderSheet(); return; }
  if(e.target.closest('#sheet') && e.target.dataset.f) onField(e);
  if(e.target.id==='alias'&&S.canWrite){ const a=e.target.value.trim()||'Jugador'; const dd={...(S.players[S.uid]||{creado:new Date().toISOString()}),alias:a}; S.players[S.uid]=dd; queueSave(`jug/${S.uid}`,dd); }});
document.addEventListener('toggle',e=>{ const k=e.target.dataset&&e.target.dataset.fold; if(k===undefined) return; S.folders[k]=e.target.open; try{localStorage.setItem('pkrpg.folders',JSON.stringify(S.folders))}catch(_){} },true);
document.addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-dsel]')){ e.preventDefault(); e.target.click(); }});
document.addEventListener('click',async e=>{
  const gv=e.target.closest('[data-glove]'); if(gv){ toggleGlove(gv.dataset.glove); return; }
  const lk=e.target.closest('[data-lock]'); if(lk){ const x=refByKey(lk.dataset.lock); if(x) setLock(x,!isLocked(x.f)); renderSheet(); return; }
  const la=e.target.closest('[data-lockall]'); if(la){ const on=la.dataset.v==='1'; poolOf('jug',la.dataset.lockall).forEach(x=>setLock(x,on)); renderSheet(); return; }
  const nt=e.target.closest('[data-notes]'); if(nt){ toggleNotes(nt.dataset.notes); return; }
  const tg=e.target.closest('[data-team]'); if(tg){ toggleTeam(tg.dataset.team); return; }
  const cb=e.target.closest('[data-cb]'); if(cb){ cbClick(cb); return; }
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
  else if(act==='newNota') createDoc('nota',{vis:'priv',titulo:'Nueva nota',fecha:new Date().toISOString().slice(0,10),texto:'',creado:new Date().toISOString()});
  else if(act==='newBit') createDoc('bit',{autor:S.uid,vis:'masters',titulo:'Sesión',clase:'Sesión',fecha:new Date().toISOString().slice(0,10),texto:'',creado:new Date().toISOString()});
  else if(act==='newNpc') createDoc('master',newTrainer({nombre:'Nuevo NPC',cat:'npc',carpeta:folder}));
  else if(act==='newFolderNpc'){ const n=$('#newFolder').value.trim(); if(!n){ $('#newFolder').focus(); return; } createDoc('master',newTrainer({nombre:'Nuevo NPC',cat:'npc',carpeta:n})); }
  else if(act==='newWild') createDoc('master',newPokemon({cat:'salvaje',nat:pick(D.nat)[0],carpeta:folder}));
  else if(act==='addTeam'){ const team=teamOf(S.open).filter(p=>p.f.lugar!=='caja'); createDoc(S.open.src,newPokemon(Object.assign({entrenador:S.open.id,lugar:team.length>=6?'caja':''},S.open.src==='master'?{cat:'npc'}:{}))); }
  else if(act==='genSave'&&T.gen?.f){ const f=structuredClone(T.gen.f); if(a.dataset.to==='salvaje'){ f.cat='salvaje'; f.carpeta=''; S.view='master'; createDoc('master',f);} else { S.view='mis'; createDoc('jug',f);} }
  else if(act==='dexEvento'&&isMaster()&&S.canWrite){ S.evento=!S.evento; saveVis(); }
  else if(act==='rmImg'&&S.cur){ S.cur.img=''; commit(true); }
  else if(act==='gen'&&S.cur&&!S.ro){ const g=S.cur.genero||'M'; S.cur.genero=S.cur.tipo==='P'?(g==='M'?'F':g==='F'?'N':'M'):(g==='F'?'M':'F'); commit(true); }
  else if(act==='formas'&&S.cur&&!S.ro){ S.formOpen=!S.formOpen; renderSheet(); }
  else if(act==='setForma'&&S.cur&&!S.ro){ const f=S.cur, dx=dexById.get(f.especie); let id=a.dataset.id;
    if(id==='__nucleo'){ const ns=formasDe(dx).filter(r=>/N[uú]cleo/i.test(r[2])); if(!ns.length) return; id=pick(ns)[0]; }
    const nx=dexById.get(id); if(!nx) return; f.especie=id; S.formOpen=false; commit(true);
    logRoll(charName(f),`${f.habilidad}: cambia a ${nx[2]||nx[1]}`,null); }
  else if(act==='addMer'&&S.cur&&!S.ro){ const m=[...(S.cur.meritos||[])]; while(m.length<N_MER) m.push(''); m.push('','',''); S.cur.meritos=m; commit(true); }
  else if(act==='rmMer'&&S.cur&&!S.ro){ const m=[...(S.cur.meritos||[])]; if(m.length>N_MER&&m.slice(-3).every(x=>!x)) m.splice(-3,3); S.cur.meritos=m; commit(true); }
  else if(act==='addMove'&&S.cur&&!S.ro){ const mv=[...(S.cur.moves||[])]; while(mv.length<6) mv.push(''); mv.push(''); S.cur.moves=mv; commit(true); }
  else if(act==='rmMove'&&S.cur&&!S.ro){ S.cur.moves.splice(num(a.dataset.i),1); commit(true); }
  else if(act==='restore'&&S.cur&&!S.ro){ const c=$('#restoreConfirm'); if(c) c.innerHTML='<button class="btn sm pri" data-act="restoreYes">Sí, restaurar</button> <button class="btn sm" data-act="restoreNo">Cancelar</button>'; }
  else if(act==='restoreNo'){ const c=$('#restoreConfirm'); if(c) c.innerHTML=''; }
  else if(act==='restoreYes'&&S.cur&&!S.ro){ restoreAll(S.cur); commit(true); logRoll(charName(S.cur),'Restaurar Todo: daño, intentos, IC, bonos, estados y repeticiones a 0',null); }
  else if(act==='evade'&&S.cur&&!S.ro){ const L=CB.last; const ev=doEvade(S.open,S.cur,a.dataset.k,L?{d100:L.d100,mv:L.mv,by:L.by}:null); if(ev.crit){ const k=refKey(S.open); if(inCombat(k)) ev.txt+=' · '+esquivaCritica(k); } renderSheet(); openRP({kind:'res',title:a.dataset.k==='esq'?'Esquiva':'Temple',res:{v:ev.r,cls:ev.ok?'ok':'ko',html:esc(ev.txt)}}); }
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
buildDexList(); mkDL('dl-atk',D.atk.map(a=>a[1])); mkDL('dl-hab',D.hab.map(h=>h[0])); mkDL('dl-def',(D.rasgos||[]).filter(r=>r[1]==='D').map(r=>r[0])); mkDL('dl-mer',(D.rasgos||[]).filter(r=>r[1]==='M').map(r=>r[0])); mkDL('dl-tipos',D.types);

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
  if(window.__PRUEBAS) showBanner('Versión de pruebas en Claude: aquí se revisan los cambios antes de pasarlos a la app de la mesa. Las fichas de esta versión no son las de la web.');
  db.doc('config/mesa').onSnapshot(s=>{ S.masters=(s.exists&&s.data().masters)||[]; buildDexList(); $('#tabMaster').hidden=!isMaster(); onRemote(); if(isMaster()) subMaster(); },e=>console.warn(e));
  db.doc('combate/actual').onSnapshot(s=>{ const dd=s.exists?s.data():{}; CB.exists=s.exists; CB.parts=dd.parts||[]; CB.snaps=dd.snaps||{}; CB.ties=dd.ties||{}; CB.last=dd.last||null; CB.lastFx=dd.lastFx||{}; CB.ronda=num(dd.ronda); CB.rondaLog=dd.rondaLog||null; CB.cond=dd.cond||{}; CB.voto=dd.voto||null; CB.eq=dd.eq||{}; CB.acted=dd.acted||null; CB.tn=dd.tn||null;
    if(missingSpecies()) reloadEspecies(); /* las copias de los Pokémon del Master traen especies que aún no se cargaron */
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
