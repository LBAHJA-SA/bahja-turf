// ==== G4 (P11-P12) : n°1 ou n°2 ? quota = 1 ====
const RACE={dist:2500,sens:'Droite',surf:'Gazon',type:'Hand. Cl.1',alloc:'72 000',partants:18,ref:'+14,5/+17,5'};

const B={
  2:{ nom:"ANNABEL'S GHOST", presse:12, vh:41, pds:58.5, corde:6, jock:'P.-C.BOUDOT', ent:'M.SEROR',
      mus:'0p5p0p7p3p1p(25)0p5p6p', car:24, jours:64, pays:'France + Angleterre',
      runs:[ ['Goodwood (GB)',4100,'D','Bon léger','Hand. Cl.2',null,13,'ROYAL'],
             ['Ascot (GB)',    4000,'D','Bon léger','Hand.',    null, 5,'ROYAL'],
             ['ParisLongchamp',3000,'D','Bon souple','Hand.',  41.5,13,'FR'],
             ['Fontainebleau', 3000,'G','Souple','Hand.',      41.5, 7,'FR'],
             ['Le Mans',      3200,'G','Collant','Cl. 2',     41.5, 3,'FR'] ] },

  1:{ nom:'LE LAVANDOU', presse:11, vh:42.5, pds:60, corde:13, jock:"O.D'ANDIGNE", ent:'A.COUETIL (S)',
      mus:'9p7p8p6p(25)2p2p7p3p3p', car:16, jours:39, pays:'France',
      runs:[ ['Deauville',    3200,'D','Bon souple','Hand.',  43,  9,'FR'],
             ['Saint-Cloud',  3000,'G','Bon','Listed 47 600',   44,  7,'FR'],
             ['Compiègne',    2400,'G','Bon souple','Cl. 2',  44.5,8,'FR'],
             ['Saint-Cloud',  3000,'G','Souple','Listed 47 600', 44.5,6,'FR'],
             ['Fontainebleau',3000,'G','Souple','Listed 47 600', 40,  2,'FR'] ] },
};

const PTS={0:0,1:10,2:7,3:5,4:3,5:2,6:1,7:1,8:1,9:1,10:1};
const W=i=>1/(1+i*0.55);
const pts=r=>r>9?0:(PTS[r]??0);

for(const [n,b] of Object.entries(B)){
  let f=0,fw=0,d=0,dw=0;
  b.runs.forEach((r,i)=>{ const Wd=W(i);
    f+=Wd*pts(r[6]); fw+=Wd;
    const D=Math.abs(r[1]-RACE.dist); const p=D<=100?10:D<=200?8:D<=400?5:D<=600?3:0;
    d+=Wd*p; dw+=Wd; });
  const l2=b.runs.filter(r=>r[5]!=null).slice(0,2);
  const moy=l2.reduce((a,c)=>a+c[5],0)/l2.length;

  console.log('\n'+'='.repeat(98));
  console.log('  n'+n+'  '+b.nom+'   (P'+b.presse+' dans la Synthèse presse)');
  console.log('  '+'='.repeat(98));
  console.log('  corde '+b.corde+'/'+RACE.partants+'  ·  VH '+b.vh+'  ·  '+b.pds+' kg  ·  '+b.jock+' / '+b.ent);
  console.log('  '+b.jours+' jours sans courir  ·  '+b.car+' courses  ·  '+b.mus);
  console.log('\n  ' + 'date'.padEnd(6) + 'hippo'.padEnd(16) + 'dist'.padStart(6) + '  piste' + '  terrain'.padEnd(12) +
              'type'.padEnd(18) + 'VH'.padStart(6) + '  ->');
  b.runs.forEach(r => console.log('  ' + ' '.repeat(6) + String(r[0]).slice(0,15).padEnd(16) + String(r[1]).padStart(6) +
    '   ' + r[2] + '   ' + String(r[3]).padEnd(12) + String(r[4]).padEnd(18) + String(r[5] ?? '-').padStart(6) + '  ->  ' +
    (r[6]>9?'X':r[6]+'e') + (r[7]==='ROYAL'?'   [ANGLELETERRE]':'')));
  const ecart = 3200 - RACE.dist;
  console.log('\n  FORME            ' + (f/fw).toFixed(2) + '   [min 3.5]  ' + (f/fw>=3.5?'OK':'NON  <-- elimine'));
  console.log('  DISTANCE         ' + (d/dw).toFixed(2) + '   (2500m aujourd hui)');
  console.log('  NIVEAU           ' + b.vh + ' vs ' + moy.toFixed(1) + ' = ' + (b.vh-moy>0?'+':'')+(b.vh-moy).toFixed(1) + '  ' + (b.vh-moy<=1.5?'OK':'NON'));
  const distMax = Math.max(...b.runs.map(r=>r[1]));
  console.log('  SAUTE DISTANCE   ' + b.runs[0][1] + 'm -> ' + RACE.dist + 'm  =  ' + (distMax-RACE.dist) + 'm de chute');
  console.log('  ABSENCE          ' + b.jours + ' jours');
  console.log('  GAUCHE           ' + b.runs.filter(r=>r[2]==='G').length + '/5   (aujourd hui : ' + RACE.sens + ')');
}