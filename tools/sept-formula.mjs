import fs from 'node:fs';

const R = JSON.parse(fs.readFileSync('C:/bahja-TURF/tools/quinte-2026-09.json', 'utf8'));
const MA = new Set(['Anfa','Meknes','Settat','Khemisset','Marrakech','Casablanca','Tanger','Rabat','Marrakech']);
const P = (c,t) => t ? (c/t*100).toFixed(1)+'%' : '—';

const FR_HIP = new Set(['VICHY',"LE LION D'ANGERS",'CAGNES/MER','CABOURG','ARGENTAN','PORNICHET',
  'LES SABLES D OLONNE','SAINT-CLOUD','ENGHIEN','ENGHIEN SOISY','LA CAPELLE','DEAUVILLE',
  'LE CROISE LAROCHE','LYON LA SOIE','LYON PARILLY','LAVAL','PONT DE VIVAUX','GRAIGNES',
  'SAINT GALMIER','MAUQUENCHY','HYERES','SAINT BRIEUC','ANGERS','CHANTILLY','STRASBOURG',
  'LE MANS','CHATEAUBRIANT','REIMS','NANTES','EVREUX','MARSEILLE VIVAUX','MARSEILLE BORELY',
  'VINCENNES','LONGCHAMP','PARISLONGCHAMP','FONTABLEAU','SAINT CYR','BORDEAUX',
  'BORDEAUX LE BOUSCAT','CAEN','COMPIEGNE','BEAUMONT DE LOMAGNE','BEAUMONT-DE-LOMAGNE',
  'AGEN','AGEN LA GARENNE','MOULINS','PONTCHATEAU','CHATILLON','SAINT MALO','AUTEUIL','FEURS',
  'CROON','CRAON','LA ROCHE SUR YON','SARATOGA','SANOIS','LA FLECHE']);

console.log('='.repeat(78));
console.log(`  SEPTEMBRE 2026 — ${R.length} Quinté (R1), avec cotes + arrivée`);
console.log('='.repeat(78));

// filtrer France + 13+ chevaux
const FR = R.filter(r => FR_HIP.has(String(r.hip||'').toUpperCase()) && r.nRated >= 13);
console.log(`  France, 13+ chevaux : ${FR.length} courses`);

// ---- Pour chaque course : rangs de cotes des 5 arrivants ----
console.log('\n' + '='.repeat(78));
console.log('  RANGS DE COTES DES 5 ARRIVANTS (P1..P5)');
console.log('='.repeat(78));
console.log('\nDate        Hippodrome      disc    n  P1  P2  P3  P4  P5   max');
const rows = [];
for (const r of FR) {
  const rk = r.top.map(x => x.rk);
  rows.push({ ...r, rk });
  console.log(`${r.date}  ${String(r.hip).padEnd(15)} ${String(r.disc).padEnd(7)} ${String(r.nRated).padStart(2)}  `
    + rk.map(x => String(x).padStart(3)).join(' ') + String(Math.max(...rk)).padStart(6));
}

// ---- Quelle taille de sélection garantit 5/5 ? ----
console.log('\n' + '='.repeat(78));
console.log('  P(top 5 arrivants ⊆ sélection de N par cotes)');
console.log('='.repeat(78));
console.log('\n  N      succès      courses        rendement');
for (let n = 5; n <= 18; n++) {
  const ok = rows.filter(x => Math.max(...x.rk) <= n).length;
  const bar = '█'.repeat(Math.round(ok / rows.length * 40));
  console.log(`  Top-${String(n).padEnd(3)} ${String(ok).padStart(3)}/${rows.length}  ${P(ok,rows.length).padStart(8)}  ${bar}`);
}

// ---- Couverture par position ----
console.log('\n' + '='.repeat(78));
console.log('  P(chaque position dans Top-N)');
console.log('='.repeat(78));
console.log('\n  N      P1       P2       P3       P4       P5');
for (const n of [6, 7, 8, 9, 10, 11, 12]) {
  const cells = [0,1,2,3,4].map(i => {
    const c = rows.filter(x => x.rk[i] <= n).length;
    return P(c, rows.length).padStart(9);
  }).join('');
  console.log(`  Top-${String(n).padEnd(3)}${cells}`);
}

// ---- quel rang de cote est le plus utile ? ----
console.log('\n' + '='.repeat(78));
console.log('  RANG DE COTE DE L’ARRIVANT (les 5 premiers)');
console.log('='.repeat(78));
const allRk = rows.flatMap(x => x.rk);
const mx = Math.max(...allRk);
console.log('\n  rang   count    %');
for (let k = 1; k <= mx; k++) {
  const c = allRk.filter(x => x === k).length;
  const bar = '█'.repeat(Math.round(c / rows.length * 40));
  console.log(`  ${String(k).padStart(4)}  ${String(c).padStart(4)}  ${P(c, allRk.length).padStart(7)}  ${bar}`);
}

// ---- discipline ----
console.log('\n' + '='.repeat(78));
console.log('  PAR DISCIPLINE : Top-9 suffit pour 5/5 ?');
console.log('='.repeat(78));
for (const disc of ['ATTELE', 'PLAT', 'MONTE']) {
  const S = rows.filter(x => x.disc === disc);
  if (!S.length) continue;
  const ok9 = S.filter(x => Math.max(...x.rk) <= 9).length;
  const ok10 = S.filter(x => Math.max(...x.rk) <= 10).length;
  const need = S.map(x => Math.max(...x.rk)).sort((a,b)=>a-b);
  console.log(`  ${disc.padEnd(7)} ${String(S.length).padStart(2)} courses   Top-9: ${P(ok9,S.length).padStart(7)}   Top-10: ${P(ok10,S.length).padStart(7)}   N median requis = ${need[Math.floor(need.length/2)]}   max = ${need[need.length-1]}`);
}

fs.writeFileSync('C:/bahja-TURF/tools/sept-ranks.json', JSON.stringify(rows.map(x => ({ date: x.date, hip: x.hip, disc: x.disc, n: x.nRated, rk: x.rk })), null, 1));
