// Donnees reelles de l'utilisateur — septembre 2026
// [date, hippodrome, discipline, arrivée(5), La Synthèse(7), section]
const R = [
  // ===== 5/5 — Quinté désordre réussi =====
  ['2026-09-24','COMPIEGNE','PLAT',  [13,8,10,4,16],   [10,8,4,7,16,6,13],  '5/5'],
  ['2026-09-20','VINCENNES','ATTELE',[8,13,12,7,4],    [9,8,12,13,11,4,7],  '5/5'],
  ['2026-09-15','COMPIEGNE','PLAT',  [7,8,6,4,12],     [7,6,1,4,14,8,12],   '5/5'],
  ['2026-09-14','BEAUMONT','ATTELE', [6,10,9,13,14],   [14,6,12,10,13,9,2], '5/5'],
  ['2026-09-09','ANGERS','ATTELE',   [14,3,5,6,12],    [9,5,6,14,2,12,3],   '5/5'],
  // ===== MAROC 5/5 =====
  ['2026-09-07','Anfa','PLAT',      [2,10,8,5,9],     [2,9,3,10,6,8,5],    '5/5'],
  ['2026-09-10','Meknes','PLAT',    [4,3,5,9,11],     [11,9,4,5,3,1,2],    '5/5'],
  ['2026-09-11','Settat','PLAT',    [11,10,3,2,6],    [3,1,6,2,10,5,11],   '5/5'],
  ['2026-09-17','Meknes','PLAT',    [10,5,1,4,3],     [4,3,1,5,10,2,8],    '5/5'],

  // ===== BONUS 4/5 =====
  ['2026-09-16','FEURS','ATTELE',     [9,7,10,6,14],   [7,14,10,15,9,13,4],  'bonus'],
  ['2026-09-13','Longchamp','PLAT',   [12,4,10,14,7],  [12,4,13,10,7,5,3],   'bonus'],
  ['2026-09-12','VINCENNES','ATTELE', [8,9,11,13,15],  [12,14,15,11,3,9,8],  'bonus'],
  ['2026-09-11','VINCENNES','ATTELE', [5,8,14,7,11],   [5,14,8,3,4,11,10],   'bonus'],
  ['2026-09-10','Longchamp','PLAT',   [3,9,13,2,5],    [9,3,2,11,13,1,6],    'bonus'],
  ['2026-09-16','Khemisset','PLAT',   [6,13,1,9,5],    [1,6,13,3,4,5,2],     'bonus'],
  ['2026-09-18','Settat','PLAT',      [4,2,6,8,11],    [4,2,3,5,11,7,6],     'bonus'],
  ['2026-09-24','Meknes','PLAT',      [12,3,5,1,13],   [3,5,8,1,12,4,7],     'bonus'],

  // ===== PERTES =====
  ['2026-09-26','AUTEUIL','HAIE',    [6,5,12,4,1],     [6,2,4,1,8,9,5],      'perte'],
  ['2026-09-22','AUTEUIL','HAIE',    [1,4,3,10,8],     [12,10,3,2,8,1,5],    'perte'],
  ['2026-09-25','VINCENNES','ATTELE',[13,11,12,10,15], [18,13,9,8,12,14,15], 'perte'],
  ['2026-09-21','LA CAPELLE','ATTELE',[13,3,16,4,11],  [16,13,8,14,15,9,4],  'perte'],
  ['2026-09-19','CHANTILLY','PLAT',  [5,1,12,8,2],     [13,14,4,12,7,2,5],   'perte'],
  ['2026-09-18','VINCENNES','ATTELE',[6,1,5,4,14],     [1,2,5,8,7,4,13],     'perte'],
  ['2026-09-08','AUTEUIL','HAIE',    [8,14,9,4,5],     [1,5,10,2,8,9,13],    'perte'],
  ['2026-09-07','CRAON','ATTELE',    [13,16,7,3,6],    [13,14,10,3,16,5,8],  'perte'],
  ['2026-09-23','ARGENTAN','ATTELE', [13,6,5,12,18],   [8,13,12,4,9,15,1],   'perte'],
  ['2026-09-17','VINCENNES','ATTELE',[7,6,3,10,11],    [1,7,5,8,6,4,14],     'perte'],
  ['2026-09-08','Khemisset','PLAT',  [7,9,4,11,8],     [4,3,7,11,13,1,8],   'perte'],
  ['2026-09-12','Anfa','PLAT',        [6,8,10,5,4],     [4,2,5,8,1,6,3],     'perte'],
  ['2026-09-20','Marrakech','PLAT',  [16,1,3,4,6],     [3,1,6,2,4,7,5],     'perte'],
];

const MA = new Set(['Anfa','Meknes','Settat','Khemisset','Marrakech']);
const P = (c,t) => t ? (c/t*100).toFixed(1)+'%' : '—';

console.log('='.repeat(80));
console.log(`  SEPTEMBRE 2026 — ${R.length} courses, La Synthèse (7 numéros)`);
console.log('='.repeat(80));

// ---- 1. verification des (X/5) declares ----
let ok=0, ko=[];
for (const [d,h,disc,arr,syn,sec] of R){
  const c = arr.filter(n=>syn.includes(n)).length;
  const dec = sec==='perte' ? null : parseInt(sec,10);
  if(dec===null) continue;
  if(c===dec) ok++; else ko.push(`${d} ${h}: annoncé ${dec}/5, calculé ${c}/5`);
}
console.log(`\n  Vérification des scores annoncés: ${ok}/${R.filter(r=>r[5]!=='perte').length} corrects`);
ko.forEach(k=>console.log('    ! ' + k));

// ---- 2. couverture par position ----
console.log('\n' + '='.repeat(80));
console.log('  COUVERTURE : le arrivé était dans la Synthèse ? (par position)');
console.log('='.repeat(80));
const byPos = [[],[],[],[],[]];
for (const [d,h,disc,arr,syn] of R) arr.forEach((n,i)=>byPos[i].push(syn.includes(n)));
console.log('\n  Position   présent      absent');
byPos.forEach((v,i)=>{
  const c=v.filter(Boolean).length;
  console.log(`  ${String(i+1).padEnd(9)} ${String(c).padStart(3)}/${v.length}  ${P(c,v.length).padStart(7)}   ${String(v.length-c).padStart(3)}`);
});

// ---- 3. ou etait le cheval manque ? (rang dans la Synthese) ----
console.log('\n' + '='.repeat(80));
console.log('  Le cheval ABSENT : ou etait-il dans la Synthèse ? (rang 1-7)');
console.log('='.repeat(80));
const missRank = [];
for (const [d,h,disc,arr,syn] of R){
  arr.forEach((n,i)=>{ if(!syn.includes(n)) missRank.push([i+1, null, d, h]); });
}
console.log(`  Total de chevaux manqués: ${missRank.length}`);
const parPos = {};
missRank.forEach(([p])=>parPos[p]=(parPos[p]||0)+1);
console.log(`  Par position: ${Object.entries(parPos).map(([k,v])=>k+'ère='+v).join('  ')}`);

// ---- 4. correlation Synthese-rang vs place reelle ----
console.log('\n' + '='.repeat(80));
console.log('  CORRÉLATION : le rang dans la Synthèse prédit-il la place ?');
console.log('='.repeat(80));
let sp=0, n2=0;
const detail = [];
for (const [d,h,disc,arr,syn] of R){
  arr.forEach((n,i)=>{
    const r = syn.indexOf(n);
    if(r<0) return;
    sp += (i+1)*(r+1); n2++;
    detail.push({pos:i+1, rank:r+1, hip:h, disc, d});
  });
}
console.log(`  ${n2} chevaux présents (sur ${R.length*5} places)`);
// Spearman simplifie : rang moyen par position
console.log('\n  Rang MOYEN dans la Synthèse, par place réelle :');
console.log('  (si la Synthèse est bonne, ça monte 1→5)');
const rankByPos=[[],[],[],[],[]];
detail.forEach(x=>rankByPos[x.pos-1].push(x.rank));
rankByPos.forEach((v,i)=>{
  const m=v.reduce((a,b)=>a+b,0)/v.length;
  const bar='█'.repeat(Math.round(m*2));
  console.log(`  ${i+1}ère   rang moyen = ${m.toFixed(2)}  ${bar}`);
});

// ---- 5. le vainqueur etait a quel rang ? ----
console.log('\n' + '='.repeat(80));
console.log('  LE VAINQUEUR : à quel rang dans la Synthèse ?');
console.log('='.repeat(80));
const winRanks=[];
for (const [d,h,disc,arr,syn] of R){
  const r=syn.indexOf(arr[0]);
  winRanks.push({r, h, disc, d, num:arr[0]});
}
const found = winRanks.filter(w=>w.r>=0);
console.log(`  Vainqueur présent dans la Synthèse: ${found.length}/${R.length}`);
const wr = found.map(w=>w.r+1);
console.log(`  distribution des rangs: ${[1,2,3,4,5,6,7].map(k=>`${k}ère:${wr.filter(x=>x===k).length}`).join('  ')}`);
console.log(`  rang moyen du vainqueur: ${(wr.reduce((a,b)=>a+b,0)/wr.length).toFixed(2)} / 7`);
const absents = winRanks.filter(w=>w.r<0);
if(absents.length) console.log(`  ABSENTS (${absents.length}): ${absents.map(a=>a.h+' '+a.d).join(' | ')}`);

// ---- 6. France vs Maroc ----
console.log('\n' + '='.repeat(80));
console.log('  FRANCE vs MAROC');
console.log('='.repeat(80));
for (const [lab,f] of [['France',r=>!MA.has(r[1])],['Maroc',r=>MA.has(r[1])]]){
  const S=R.filter(f);
  const c=S.map(([,,,arr,syn])=>arr.filter(n=>syn.includes(n)).length);
  const tot=c.reduce((a,b)=>a+b,0);
  console.log(`\n  ${lab} — ${S.length} courses, ${S.length*5} places`);
  console.log(`    couverture moyenne: ${(tot/(S.length*5)*100).toFixed(1)}%`);
  console.log(`    5/5: ${c.filter(x=>x===5).length}   4/5: ${c.filter(x=>x===4).length}   3/5: ${c.filter(x=>x===3).length}   2/5: ${c.filter(x=>x===2).length}`);
  const w=S.filter(([,,,arr,syn])=>syn.includes(arr[0])).length;
  console.log(`    vainqueur présent: ${w}/${S.length} (${P(w,S.length)})`);
}

// ---- 7. par discipline ----
console.log('\n' + '='.repeat(80));
console.log('  PAR DISCIPLINE');
console.log('='.repeat(80));
for (const disc of ['ATTELE','PLAT','HAIE']){
  const S=R.filter(r=>r[2]===disc);
  if(!S.length) continue;
  const c=S.map(([,,,arr,syn])=>arr.filter(n=>syn.includes(n)).length);
  const tot=c.reduce((a,b)=>a+b,0);
  const w=S.filter(([,,,arr,syn])=>syn.includes(arr[0])).length;
  console.log(`  ${disc.padEnd(7)} ${String(S.length).padStart(2)} courses  couverture ${P(tot,S.length*5).padStart(7)}  vainqueur ${P(w,S.length).padStart(7)}`);
}
