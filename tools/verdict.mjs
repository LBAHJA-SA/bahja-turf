// ===== 3 FILTRES + VERDICT : combien de chevaux retenir =====
// Cible : HANDICAP CLASSE 1 sur 2500m
const RACE = { dist: 2500, minDistTest: 2200, nbMin: 2, formMini: 3.5, monteeMax: 1.5 };

const B = {
  4: { nom:'REMBRAND TO GO', mus:'2p4p1p2p3p5p4p(25)2p1p', recap:1,
       dists:[2400,2000,2400,2400,2400], rangs:[2,4,1,2,3], vhs:[39.5,39.5,36.5,36.5,36.5],
       hippos:['ParisLongchamp','Chantilly','ParisLongchamp','ParisLongchamp','Compiègne'],
       ters:['Bon souple','Bon','Très souple','Bon','Très souple'], corde:8, pds:57, vh:39.5 },
  8: { nom:'COLGAN SENORA', mus:'5p0p9p7p(25)3p1p4p1p0p', recap:4,
       dists:[2000,1900,2000,1900,2000], rangs:[5,13,9,7,3], vhs:[40,40,40.5,40.5,41.5],
       hippos:['ParisLongchamp','Deauville','Deauville','Deauville','ParisLongchamp'],
       ters:['Bon','Lent PSF','Bon','Lent PSF','Très souple'], corde:null, pds:56.5, vh:39 },
  9: { nom:'NITY GALESTE', mus:'3p2p4p2p7p2p1p', recap:3,
       dists:[2000,2400,2000,2400,2000], rangs:[3,2,4,2,7], vhs:[41,41,41.5,42,null],
       hippos:['ParisLongchamp','Saint-Cloud','Deauville','Saint-Cloud','Compiègne'],
       ters:['Bon','Très souple','Bon souple','Bon','Bon souple'], corde:17, pds:55.5, vh:41 },
  13:{ nom:'EBIYAR', mus:'4p4p3p2p6p(25)1p', recap:2,
       dists:[3200,2400,2000,2000,1800], rangs:[4,4,3,2,6], vhs:[41,42.5,43,null,null],
       hippos:['Le Mans','Clairefontaine-Deauville','ParisLongchamp','Compiègne','ParisLongchamp'],
       ters:['Souple','Bon souple','Bon','Bon souple','Bon souple'], corde:3, pds:54.5, vh:40 },
};

const PTS = {0:0,1:10,2:7,3:5,4:3,5:2,6:1,7:1,8:1,9:1,10:1};
const W = i => 1/(1+i*0.55);
const pts = r => r>9?0:(PTS[r]??0);

const F = {
  distance: b => { const n = b.dists.filter(d=>d>=RACE.minDistTest).length;
    return { ok: n>=RACE.nbMin,
      txt: n+'/5 courses >= '+RACE.minDistTest+'m (max '+Math.max(...b.dists)+'m, aujourd\'hui '+RACE.dist+'m)' }; },
  forme: b => { let n=0,d=0; b.rangs.forEach((r,i)=>{n+=W(i)*pts(r);d+=W(i);});
    const s=n/d;
    return { ok: s>=RACE.formMini,
      txt: 'score '+s.toFixed(1)+' (min '+RACE.formMini+')  ['+b.rangs.map(r=>r>9?0:r).join(' ')+']' }; },
  niveau: b => { const l2 = b.vhs.filter(v=>v!=null).slice(0,2);
    const moy = l2.reduce((a,c)=>a+c,0)/l2.length;
    const e = b.vh - moy;
    return { ok: e <= RACE.monteeMax,
      txt: 'aujourd\'hui '+b.vh+' vs '+moy.toFixed(1)+' de ses 2 dernieres = '+(e>0?'+':'')+e.toFixed(1)+
           (e<=RACE.monteeMax ? '  (meme niveau ou plus bas)' : '  (demande de monter)') }; },
};

console.log('='.repeat(102));
console.log('  LES 3 FILTRES   -   Handicap Classe 1 sur ' + RACE.dist + 'm');
console.log('  1. au moins ' + RACE.nbMin + ' courses >= ' + RACE.minDistTest + 'm dans les 5 dernieres');
console.log('  2. score de forme >= ' + RACE.formMini);
console.log('  3. il ne monte pas de niveau (+' + RACE.monteeMax + ' max vs ses 2 dernieres VH)');
console.log('='.repeat(102));

const res = [];
for (const [n,b] of Object.entries(B)) {
  const f = [F.distance(b), F.forme(b), F.niveau(b)];
  const ok = f.filter(x=>x.ok).length;
  const gauches = b.hippos.filter(h=>['Compiègne','Saint-Cloud','Le Mans'].includes(h)).length;
  const psf = b.ters.filter(t=>/PSF/i.test(t)).length;
  const warn = [];
  if (b.corde >= 16) warn.push('corde ' + b.corde + '/18 = exterieur sur piste droite');
  if (gauches >= 3) warn.push(gauches + '/5 courses a gauche, aujourd\'hui a droite');
  if (psf >= 2) warn.push(psf + '/5 en PSF, aujourd\'hui gazon');
  res.push({ n:+n, b, f, ok, warn });
}

const NOMS = ['distance','forme','niveau'];
for (const r of res) {
  const flag = r.ok===3 ? '[A]' : r.ok===2 ? '[B]' : '[C]';
  console.log('\n  ' + flag + '   n°' + r.n + ' ' + r.b.nom + '   ---   ' + r.ok + '/3');
  r.f.forEach((x,i)=>console.log('      ' + (x.ok?'OK  ':'NON ') + NOMS[i].padEnd(9) + x.txt));
  if (r.warn.length) console.log('      ATTENTION : ' + r.warn.join(' / '));
}

res.sort((a,b)=>b.ok-a.ok);
const A = res.filter(r=>r.ok===3), Bs = res.filter(r=>r.ok===2);

console.log('\n' + '='.repeat(102));
console.log('  VERDICT');
console.log('='.repeat(102));
console.log('\n  A (3/3) : ' + (A.map(r=>'n°'+r.n).join('  /  ') || '-'));
console.log('  B (2/3) : ' + (Bs.map(r=>'n°'+r.n).join('  /  ') || '-'));
console.log('\n  >>  ' + (A.length>=3 ? 'PRENDS 3  ->  ' + A.slice(0,3).map(r=>'n°'+r.n).join(' - ')
              : A.length===2 ? 'PRENDS 2  ->  ' + A.map(r=>'n°'+r.n).join(' - ') + '   (pas de 3e qui passe)'
              : 'PRENDS ' + A.length));
console.log('\n  REGLE : 3 chevaux seulement si 3 passent 3/3.');
console.log('          sinon 2. Un cheval a 2/3 = remplacant, jamais une base.');