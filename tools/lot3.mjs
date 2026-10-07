// ===== LOT 3 (partiel) — 03/10/2026 ParisLongchamp R1C4 =====
const RACE={hippo:'ParisLongchamp',dist:2500,sens:'Droite',surf:'Gazon',
  type:'Hand. Classe 1',alloc:'72 000',partants:18,minDist:2200,nbMin:2,formMini:3.5,monteeMax:1.5};

const B={
  5:{ nom:'SHRIHARA', vh:39.5, pds:57, corde:5, recap:9, jock:'E.HARDOUIN', ent:'C.FEY (S)',
      mus:'8p1p3p5p(25)1p3p1p2p4p', car:12,
      runs:[ ['ParisLongchamp',2400,'D','Bon souple','Hand. GP',39.5,8],
             ['Strasbourg',3000,'D','Bon souple','Hand.',36.5,1],
             ['ParisLongchamp',2400,'D','Bon','Hand. GP',36.5,3],
             ['Saint-Cloud',2000,'G','Très souple','Hand.',36.5,5],
             ['Saint-Cloud',2400,'G','Collant','Hand.',34,1] ] },

  16:{ nom:'ZELKER', vh:35.5, pds:53, corde:null, recap:10, jock:'A.MADAMET', ent:'M.RULEC (S)',
      mus:'3p7p7p4p(25)6p4p0p1p8p', car:12,
      runs:[ ['ParisLongchamp',2400,'D','Bon souple','Hand. GP',35.5,3],
             ['ParisLongchamp',2400,'D','Souple','Hand.',36.5,7],
             ['Saint-Cloud',2400,'G','Bon souple','Cl. 3',36.5,7],
             ['Compiègne',2400,'G','Très souple','Hand.',36.5,4],
             ['Saint-Cloud',2000,'G','Très souple','Hand.',37,6] ] },
};

const PTS={0:0,1:10,2:7,3:5,4:3,5:2,6:1,7:1,8:1,9:1,10:1};
const W=i=>1/(1+i*0.55);
const pts=r=>r>9?0:(PTS[r]??0);
const sForm=rg=>{let n=0,d=0;rg.forEach((r,i)=>{n+=W(i)*pts(r[6]);d+=W(i);});return n/d;};
const sDist=rg=>{let n=0,d=0;rg.forEach((r,i)=>{const D=Math.abs(r[1]-RACE.dist);
  const p=D<=100?10:D<=200?8:D<=400?5:D<=600?3:0;n+=W(i)*p;d+=W(i);});return n/d;};
const sPiste=rg=>{let n=0,d=0;rg.forEach((r,i)=>{
  const m=Math.round((r[0]===RACE.hippo?10:['Deauville','Chantilly','Saint-Cloud',"Le Lion-d'Angers",'Strasbourg'].includes(r[0])?7:5)*0.6+(r[2]==='D'?10:6)*0.4);
  n+=W(i)*m;d+=W(i);});return n/d;};
const sTerr=rg=>{let n=0,d=0;rg.forEach((r,i)=>{n+=W(i)*(/PSF|Lourd|Collant/i.test(r[3])?5:8);d+=W(i);});return n/d;};

const F={
  distance:b=>{const n=b.runs.filter(r=>r[1]>=RACE.minDist).length;
    return{ok:n>=RACE.nbMin,txt:n+'/'+b.runs.length+' courses >= '+RACE.minDist+'m  ['+b.runs.map(r=>r[1]).join(' ')+']'};},
  forme:b=>{const s=sForm(b.runs);
    return{ok:s>=RACE.formMini,txt:'score '+s.toFixed(2)+' (min '+RACE.formMini+')  ['+b.runs.map(r=>r[6]>9?0:r[6]).join(' ')+']'};},
  niveau:b=>{const l2=b.runs.filter(r=>r[5]!=null).slice(0,2);
    const m=l2.reduce((a,c)=>a+c[5],0)/l2.length,e=b.vh-m;
    return{ok:e<=RACE.monteeMax,txt:'aujourd hui '+b.vh+' vs '+m.toFixed(1)+' = '+(e>0?'+':'')+e.toFixed(1)+
      (e<=RACE.monteeMax?'  (meme niveau ou plus bas)':'  (MONTE de '+Math.round(e)+')')};},
};

console.log('='.repeat(104));
console.log('  LOT 3 (partiel)   '+RACE.hippo+' '+RACE.dist+'m '+RACE.surf+' '+RACE.sens+' · '+RACE.type+' · '+RACE.partants+' partants');
console.log('='.repeat(104));

const res=[];
for(const [n,b] of Object.entries(B)){
  const f=[F.distance(b),F.forme(b),F.niveau(b)];
  const ok=f.filter(x=>x.ok).length;
  const G=b.runs.filter(r=>r[2]==='G').length;
  const cote=b.runs.map(r=>r[7]).filter(Boolean);
  res.push({n:+n,b,f,ok,G,
    dist:+sDist(b.runs).toFixed(2),piste:+sPiste(b.runs).toFixed(2),
    score:+(sForm(b.runs)*.22+sDist(b.runs)*.22+sPiste(b.runs)*.18+6*.13+sTerr(b.runs)*.13+(b.corde?b.corde<=6?10:b.corde<=11?8:b.corde<=15?5:3:6)*.12).toFixed(2)});
}
res.sort((a,b)=>b.ok-a.ok||b.score-a.score);

const NOMS=['distance','forme','niveau'];
for(const r of res){
  console.log('\n  '+(r.ok===3?'[A]':r.ok===2?'[B]':'[C]')+'   n'+r.n+'  '+r.b.nom+'   '+r.b.pds+'kg  '+r.b.mus+'  ('+r.b.car+' courses)');
  r.f.forEach((x,i)=>console.log('      '+(x.ok?'OK  ':'NON ')+NOMS[i].padEnd(9)+x.txt));
  console.log('      distance '+r.dist+' · piste '+r.piste+' · score global '+r.score);
  if(r.G>=3) console.log('      ATTENTION  '+r.G+'/5 a gauche, le jour est a droite');
  console.log('      corde '+(r.b.corde??'?')+'/'+RACE.partants+' · '+r.b.jock+' / '+r.b.ent);
}

const A=res.filter(r=>r.ok===3),Bs=res.filter(r=>r.ok===2),Cs=res.filter(r=>r.ok<=1);
console.log('\n'+'='.repeat(104));
console.log('  A (3/3) : '+(A.map(r=>'n'+r.n).join('  /  ')||'-'));
console.log('  B (2/3) : '+(Bs.map(r=>'n'+r.n).join('  /  ')||'-'));
console.log('  C (1/3) : '+(Cs.map(r=>'n'+r.n).join('  /  ')||'-'));
console.log('\n  >>  sur 2 chevaux complets : PRENDS '+(A.length>=2?2:A.length)+'  ->  '+A.map(r=>'n'+r.n).join(' - '));
console.log('  >>  en attente du 3e et du 4e du lot');