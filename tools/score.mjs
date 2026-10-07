// ==== SCORE AVEC DISTANCE + NIVEAU ====
// Les données ci-dessous sont extraites du fichier fourni par l'utilisateur (ttt.txt)
// format : [n°, date, hippo, distance, type, terrain, VH, rang]

const TODAY = { dist: 2500, type: 'Hand.', vh: 39.5, hippo: 'ParisLongchamp' };

const H = {
  4: { nom: 'REMBRAND TO GO', mus: '2p4p1p2p3p5p4p(25)2p1p', vh: 39.5, pds: 57, age: 4, jock: 'M.GRANDIN', ent: 'M.RULEC', car: 12,
       runs: [
         ['06/09/26','ParisLongchamp',2400,'Hand.','Bon souple',39.5,2],
         ['31/05/26','Chantilly',     2000,'Hand.','Bon',        39.5,4],
         ['07/05/26','ParisLongchamp',2400,'Hand.','Très souple',36.5,1],
         ['12/04/26','ParisLongchamp',2400,'Hand.','Bon',        36.5,2],
         ['27/03/26','Compiègne',     2400,'Hand.','Très souple',36.5,3],
       ]},
  8: { nom: 'COLGAN SENORA', mus: '5p0p9p7p(25)3p1p4p1p0p', vh: 39, pds: 56.5, age: 5, jock: 'D.PROVOST', ent: 'Y.BARBEROT', car: 12,
       runs: [
         ['13/09/26','ParisLongchamp',2000,'Hand.','Bon',        40,  5],
         ['27/08/26','Deauville',      1900,'Hand.','Lent PSF',   40, 13],
         ['04/08/26','Deauville',      2000,'Hand.','Bon',        40.5,9],
         ['04/07/26','Deauville',      1900,'Hand.','Lent PSF',   40.5,7],
         ['05/10/25','ParisLongchamp',2000,'Hand.','Très souple',41.5,3],
       ]},
  9: { nom: 'NITY GALESTE', mus: '3p2p4p2p7p2p1p', vh: 41, pds: 55.5, age: 3, jock: 'C.LECOEUVRE', ent: 'H.GHABRI', car: 7,
       runs: [
         ['13/09/26','ParisLongchamp',2000,'Hand.','Bon',        41,   3],
         ['31/08/26','Saint-Cloud',    2400,'Hand.','Très souple',41,   2],
         ['18/08/26','Deauville',      2000,'Cl.2', 'Bon souple', 41.5, 4],
         ['12/06/26','Saint-Cloud',    2400,'Cl.2', 'Bon',        42,   2],
         ['05/06/26','Compiègne',      2000,'Cl.2', 'Bon souple', null, 7],
       ]},
  13:{ nom: 'EBIYAR', mus: '4p4p3p2p6p(25)1p', vh: 40, pds: 54.5, age: 3, jock: 'M.BARZALONA', ent: 'F.H.GRAFFARD', car: 6,
       runs: [
         ['11/09/26','Le Mans',       3200,'Cl.2', 'Souple',     41,   4],
         ['07/08/26','Clairfontaine', 2400,'Cl.2', 'Bon souple', 42.5, 4],
         ['09/07/26','ParisLongchamp',2000,'Cl.2', 'Bon',        43,   3],
         ['05/06/26','Compiègne',      2000,'Cl.2', 'Bon souple', null, 2],
         ['05/04/26','ParisLongchamp',1800,'MP',   'Bon souple', null, 6],
       ]},
};

const PTS = { 0:0, 1:10, 2:7, 3:5, 4:3, 5:2, 6:1, 7:1, 8:1, 9:1, 10:1 };
const pts = r => (r > 9 ? 0 : (PTS[r] ?? 0));   // au-delà de 9e = la musique note "0"
const w = i => 1 / (1 + i * 0.55);

// --- score distance : plus la course est proche de 2500m, mieux c'est ---
function distPts(d) {
  const D = Math.abs(d - TODAY.dist);
  if (D <= 100) return 10;
  if (D <= 200) return 8;
  if (D <= 400) return 5;
  if (D <= 600) return 3;
  return 0;
}
// --- score niveau : la course passée vaut-elle le même niveau que celle du jour ? ---
function lvlPts(vh, type) {
  if (vh == null) return 6;                                  // inconnu -> neutre
  const d = TODAY.vh - vh;                                   // deficit de valeur
  if (d <= -1) return 10;                                     // il montait de niveau
  if (d <= 0.5) return 8;
  if (d <= 2)  return 5;
  if (d <= 4)  return 3;                                     // il descendait de niveau
  return 1;
}

console.log('='.repeat(104));
console.log(`  ANALYSE AVEC DISTANCE + NIVEAU   ·   ${TODAY.hippo} ${TODAY.dist}m ${TODAY.type} ref VH ${TODAY.vh}`);
console.log('='.repeat(104));

const out = [];
for (const [num, h] of Object.entries(H)) {
  let f = 0, fw = 0, d = 0, l = 0, lw = 0;
  h.runs.forEach((r, i) => {
    const W = w(i);
    f  += W * pts(r[6]);  fw += W;
    d  += W * distPts(r[2]); dw_unused: 0;
    d  = d; // noop
    l  += W * lvlPts(r[5], r[3]); lw += W;
  });
  // recalcul propre distance
  let dnum = 0; h.runs.forEach((r, i) => { dnum += w(i) * distPts(r[2]); });

  const form = f / fw, dist = dnum / fw, lvl = l / lw;
  const global = +(form * 0.34 + dist * 0.40 + lvl * 0.26).toFixed(2);
  out.push({ num: +num, h, form: +form.toFixed(2), dist: +dist.toFixed(2), lvl: +lvl.toFixed(2), global });
}

out.sort((a, b) => b.global - a.global);
console.log('\n  N°  CHEVAL               MUSIQUE                            FORM  DIST  NIVEAU  ==>  GLOBAL');
console.log('  ' + '-'.repeat(100));
for (const o of out) {
  console.log(`  ${String(o.num).padStart(2)}  ${o.h.nom.padEnd(20)} ${o.h.mus.padEnd(31)} ${String(o.form).padStart(5)} ${String(o.dist).padStart(5)} ${String(o.lvl).padStart(6)}  ==>  ${String(o.global).padStart(5)}`);
}

console.log('\n' + '='.repeat(104));
console.log('  DÉTAIL PAR CHEVAL');
console.log('='.repeat(104));
for (const o of out) {
  const h = o.h;
  console.log(`\n  n°${o.num} ${h.nom}  ·  VH ${h.vh} · ${h.pds}kg · ${h.age} ans · ${h.jock} / ${h.ent}  ·  ${h.car} courses`);
  console.log(`      aujourd'hui : ${TODAY.dist}m  ->  FORM ${o.form}  DIST ${o.dist}  NIVEAU ${o.lvl}  =  ${o.global}`);
  console.log('      ' + 'date'.padEnd(12) + 'hippo'.padEnd(15) + 'dist'.padEnd(6) + 'type'.padEnd(6) + 'VH'.padEnd(7) + 'rang'.padEnd(5) + 'dist_pts  lvl_pts');
  h.runs.forEach((r, i) => {
    console.log('      ' + r[0].padEnd(12) + String(r[1]).slice(0, 14).padEnd(15) + String(r[2]).padEnd(6) + r[3].padEnd(6) +
      String(r[5] ?? '-').padEnd(7) + (r[6] === 0 ? 'X' : r[6] + 'e').padEnd(5) +
      String(distPts(r[2])).padStart(4) + '     ' + String(lvlPts(r[5], r[3])).padStart(3));
  });
  const ds = h.runs.map(r => r[2]);
  console.log(`      distances : ${ds.join(' · ')}   (aujourd'hui ${TODAY.dist}m)`);
}