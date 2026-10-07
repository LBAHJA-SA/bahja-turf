// ===== ANALYSE COMPLETE : musique + distance + niveau + piste + terrain + corde =====
// Course du 03/10/2026 - ParisLongchamp R1C4
const TODAY = {
  hippo: 'ParisLongchamp', dist: 2500, surface: 'Gazon', corde: 'Droite',
  type: 'Hand. Cl.1', alloc: 72000, partants: 18, vh: 39.5,
};
const HAND = { 'ParisLongchamp':'Droite','Chantilly':'Droite','Deauville':'Droite',
  'Clairefontaine-Deauville':'Droite','Compiègne':'Gauche','Saint-Cloud':'Gauche',
  'Le Mans':'Gauche','Lyon':'Gauche' };
const NATURE = { 'ParisLongchamp':'Gazon','Chantilly':'Gazon','Deauville':'Gazon',
  'Clairefontaine-Deauville':'Gazon','Compiègne':'Gazon','Saint-Cloud':'Gazon','Le Mans':'Gazon' };

// données : fichier de l'utilisateur (ttt.txt) + backend
const H = {
  4: { nom:'REMBRAND TO GO', vh:39.5, pds:57, age:4, jock:'M.GRANDIN', ent:'M.RULEC', car:12,
       mus:'2p4p1p2p3p5p4p(25)2p1p', recap:1, corde:8,
       runs:[ ['ParisLongchamp',2400,'Hand.','Bon souple',39.5,2],
              ['Chantilly',     2000,'Hand.','Bon',       39.5,4],
              ['ParisLongchamp',2400,'Hand.','Très souple',36.5,1],
              ['ParisLongchamp',2400,'Hand.','Bon',       36.5,2],
              ['Compiègne',     2400,'Hand.','Très souple',36.5,3] ] },
  8: { nom:'COLGAN SENORA', vh:39, pds:56.5, age:5, jock:'D.PROVOST', ent:'Y.BARBEROT', car:12,
       mus:'5p0p9p7p(25)3p1p4p1p0p', recap:4, corde:null,
       runs:[ ['ParisLongchamp',2000,'Hand.','Bon',       40,  5],
              ['Deauville',      1900,'Hand.','Lent PSF',  40, 13],
              ['Deauville',      2000,'Hand.','Bon',       40.5,9],
              ['Deauville',      1900,'Hand.','Lent PSF',  40.5,7],
              ['ParisLongchamp',2000,'Hand.','Très souple',41.5,3] ] },
  9: { nom:'NITY GALESTE', vh:41, pds:55.5, age:3, jock:'C.LECOEUVRE', ent:'H.GHABRI', car:7,
       mus:'3p2p4p2p7p2p1p', recap:3, corde:17,
       runs:[ ['ParisLongchamp',2000,'Hand.','Bon',       41,  3],
              ['Saint-Cloud',    2400,'Hand.','Très souple',41,  2],
              ['Deauville',      2000,'Cl.2', 'Bon souple', 41.5,4],
              ['Saint-Cloud',    2400,'Cl.2', 'Bon',       42,  2],
              ['Compiègne',      2000,'Cl.2', 'Bon souple', null,7] ] },
  13:{ nom:'EBIYAR', vh:40, pds:54.5, age:3, jock:'M.BARZALONA', ent:'F.H.GRAFFARD', car:6,
       mus:'4p4p3p2p6p(25)1p', recap:2, corde:3,
       runs:[ ['Le Mans',       3200,'Cl.2', 'Souple',     41,  4],
              ['Clairefontaine-Deauville',2400,'Cl.2','Bon souple',42.5,4],
              ['ParisLongchamp',2000,'Cl.2', 'Bon',        43,  3],
              ['Compiègne',      2000,'Cl.2', 'Bon souple', null,2],
              ['ParisLongchamp',1800,'MP',   'Bon souple', null,6] ] },
};

const PTS = { 0:0,1:10,2:7,3:5,4:3,5:2,6:1,7:1,8:1,9:1,10:1 };
const pts = r => r > 9 ? 0 : (PTS[r] ?? 0);
const W = i => 1 / (1 + i * 0.55);

const sForm  = (rg) => { let n=0,d=0; rg.forEach((r,i)=>{n+=W(i)*pts(r[5]);d+=W(i);}); return n/d; };
const sDist  = (rg) => { let n=0,d=0; rg.forEach((r,i)=>{n+=W(i)*sDistP(r[1]);d+=W(i);}); return n/d; };
function sDistP(d){ const D=Math.abs(d-TODAY.dist);
  if(D<=100)return 10; if(D<=200)return 8; if(D<=400)return 5; if(D<=600)return 3; return 0; }
const sLvl   = (rg) => { let n=0,d=0; rg.forEach((r,i)=>{n+=W(i)*sLvlP(r[4]);d+=W(i);}); return n/d; };
function sLvlP(vh){ if(vh==null) return 6; const d=TODAY.vh-vh;
  if(d<=-1)return 10; if(d<=0.5)return 8; if(d<=2)return 5; if(d<=4)return 3; return 1; }
const sPiste = (rg) => { let n=0,d=0; rg.forEach((r,i)=>{n+=W(i)*sPisteP(r[0]);d+=W(i);}); return n/d; };
function sPisteP(hip){
  const hand = HAND[hip]==='Droite' ? 10 : 6;             // aujourd'hui : droite
  const loc  = hip===TODAY.hippo ? 10 : (['Deauville','Chantilly','Saint-Cloud'].includes(hip) ? 7 : 5);
  return Math.round(loc*0.6 + hand*0.4);
}
const sTerr  = (rg) => { let n=0,d=0; rg.forEach((r,i)=>{n+=W(i)*sTerrP(r[3]);d+=W(i);}); return n/d; };
function sTerrP(t){ return /PSF|Lourd|Collant/i.test(t) ? 5 : 8; }   // gazon bon/souple = compatible
function sCorde(c){ if(c==null) return 6; if(c<=6)return 10; if(c<=11)return 8; if(c<=15)return 5; return 3; }

const P = { FORM:0.22, DIST:0.22, NIVEAU:0.13, PISTE:0.18, TERRAIN:0.13, CORDE:0.12 };

console.log('='.repeat(112));
console.log(`  ${TODAY.hippo.toUpperCase()} · ${TODAY.dist}m · ${TODAY.surface} · ${TODAY.corde} · ${TODAY.type} · ${TODAY.alloc} € · ${TODAY.partants} partants`);
console.log('='.repeat(112));

const rows = Object.entries(H).map(([n,h]) => {
  const f=sForm(h.runs), d=sDist(h.runs), l=sLvl(h.runs), p=sPiste(h.runs), t=sTerr(h.runs), c=sCorde(h.corde);
  const g = +(f*P.FORM + d*P.DIST + l*P.NIVEAU + p*P.PISTE + t*P.TERRAIN + c*P.CORDE).toFixed(2);
  return { n:+n, h, f, d, l, p, t, c, g };
}).sort((a,b)=>b.g-a.g);

console.log('\n  N°  CHEVAL               FORM  DIST  NIVEAU PISTE TERR CORDE  ==>  GLOBAL   marché');
console.log('  '+'-'.repeat(96));
for(const o of rows)
  console.log(`  ${String(o.n).padStart(2)}  ${o.h.nom.padEnd(20)} ${String(o.f.toFixed(1)).padStart(5)} ${String(o.d.toFixed(1)).padStart(5)} ${String(o.l.toFixed(1)).padStart(6)} ${String(o.p.toFixed(1)).padStart(5)} ${String(o.t.toFixed(1)).padStart(4)} ${String(o.c).padStart(5)}  ==>  ${String(o.g).padStart(5)}     ${o.h.recap}e cité`);

console.log('\n'+'='.repeat(112));
console.log('  LECTURE');
console.log('='.repeat(112));
for(const o of rows){
  const h=o.h, dists=h.runs.map(r=>r[1]).join(' · ');
  const gauches = h.runs.filter(r=>HAND[r[0]]==='Gauche').length;
  console.log(`\n  n°${o.n} ${h.nom}  →  ${o.g}`);
  console.log(`     musique   ${h.mus}`);
  console.log(`     distances ${dists}m   (aujourd'hui 2500m)`);
  console.log(`     niveau    VH ${h.vh}  ·  courses passées : ${h.runs.map(r=>r[4]??'-').join(' · ')}`);
  console.log(`     piste     ${h.runs.map(r=>r[0]).join(' · ')}   →  ${gauches} à gauche / ${h.runs.length-gauches} à droite (aujourd'hui: droite)`);
  console.log(`     terrain   ${h.runs.map(r=>r[3]).join(' · ')}`);
  console.log(`     corde     ${h.corde??'?'} / 18`);
}

console.log('\n'+'='.repeat(112));
console.log('  SÉLECTION');
console.log('='.repeat(112));
const keep = rows.slice(0,3), out = rows.slice(3);
console.log('\n  ✅ À RETENIR (3) : ' + keep.map(o=>`n°${o.n} ${o.h.nom} (${o.g})`).join('  ·  '));
for(const o of out){
  let why=[];
  const dmin = Math.min(...o.h.runs.map(r=>Math.abs(r[1]-2500)));
  if(dmin>=400) why.push(`jamais au-delà de ${Math.max(...o.h.runs.map(r=>r[1]))}m (aujourd'hui 2500m, écart ${dmin}m)`);
  if(o.f<3) why.push(`forme faible (${o.f.toFixed(1)})`);
  if(o.c<=3) why.push(`corde ${o.h.corde} / 18 = parcours extérieur`);
  const gauches = o.h.runs.filter(r=>HAND[r[0]]==='Gauche').length;
  if(gauches>=3) why.push(`${gauches}/5 courses à gauche, aujourd'hui à droite`);
  const psf = o.h.runs.filter(r=>/PSF/i.test(r[3])).length;
  if(psf>=2) why.push(`${psf}/5 courses en PSF, aujourd'hui gazon`);
  console.log(`  ❌ À ÉCARTER  : n°${o.n} ${o.h.nom} (${o.g})  — ${why.join(' ; ')}`);
}