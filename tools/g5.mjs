// ==== G5 (P13-P17) : 17 · 7 · 14 · 12  (n°15 non fourni) — quota = 1 ====
const RACE={dist:2500,sens:'Droite',surf:'Gazon',type:'Hand. Cl.1',alloc:'72 000',partants:18,
  minDist:2200,nbMin:2,formMini:3.5,monteeMax:1.5};

const B={
  14:{ nom:'I GOT RHYTHM',  P:15, vh:36.5, pds:'54', corde:10, car:12, jours:13,
       mus:'2p2p0p2p(25)0h7h9p1p2p', jock:'T.TRULLIER', ent:'S.PECORARO',
       runs:[ ['Fontainebleau',2200,'G','Bon souple','Cl. 3 21 000',36.5,2],
              ['Vichy',        2400,'D','Souple','15 400',      36.5,2],
              ['Dieppe',       2400,'D','Bon souple','Hand. 50 900',37.5,11],
              ['ParisLongchamp',2400,'D','Bon','Cl. 3 16 500',    39,  2],
              ['Fontainebleau',3550,'G','Très souple','Cl. 4 (HAIES)',null,12] ] },

  17:{ nom:'KING TREZY',   P:13, vh:35.5, pds:'53', corde:null, car:18, jours:46,
       mus:'8p8p8p3p(25)Ap7p2p3p2p', jock:'R.THOMAS', ent:'C&Y.LERNER (S)',
       runs:[ ['Deauville',   2500,'D','Bon souple','Hand. 50 900',36.5,8],
              ['Dieppe',      2400,'D','Bon souple','Hand. 50 900',37,  8],
              ['Angers',      2300,'D','Bon souple','Hand. 50 900',37,  8],
              ['Saint-Cloud', 2100,'G','Bon souple','Cl. 3 16 500',38,  3],
              ['ParisLongchamp',2500,'D','Très souple','Hand. 72 000',38,'ARR'] ] },

  7:{ nom:'MON RICIN',     P:14, vh:39, pds:'56.5', corde:null, car:41, jours:39, age:7,
      mus:'0p1p0p3p(25)3p3p6p1p1p', jock:'A.LEMAITRE', ent:'T.DONWORTH (S)',
      runs:[ ['Deauville',  3200,'D','Bon souple','Hand. 50 900',39.5,10],
             ['Saint-Cloud',3100,'G','Bon','Cl. 3 16 500',     39.5,1],
             ['ParisLongchamp',2400,'D','Très souple','Hand. 50 900',39.5,12],
             ['Saint-Cloud',2400,'G','Lourd','Hand. 50 900',   39.5,3],
             ['Chantilly',  3200,'D','PSF','Hand. 50 900',     39.5,3] ] },

  12:{ nom:'PAOLINO',      P:16, vh:37, pds:'54.5', corde:null, car:13, jours:27,
       mus:'0p0p1p5p0p7p(25)0p8p5p', jock:'R.MANGIONE', ent:"D&P.PROD'HOMME",
       runs:[ ['ParisLongchamp',2400,'D','Bon souple','Hand. 50 900',37.5,12],
              ['Deauville',  2000,'D','Très souple','Hand. 72 000',38, 10],
              ['ParisLongchamp',2000,'D','Très souple','Hand. 33 600',35.5,1],
              ['Saint-Cloud',2000,'G','Souple','Hand. 50 900',     35.5,5],
              ['Cagnes-sur-Mer',2400,'G','Très souple','Hand. 50 900',36.5,12] ] },
};

const PTS={0:0,1:10,2:7,3:5,4:3,5:2,6:1,7:1,8:1,9:1,10:1};
const W=i=>1/(1+i*0.55);
const pts=r=>(!r||r>9)?0:(PTS[r]??0);
const sDist=rg=>{let n=0,d=0;rg.forEach((r,i)=>{const D=Math.abs(r[1]-RACE.dist);
  const p=D<=100?10:D<=200?8:D<=400?5:D<=600?3:0;n+=W(i)*p;d+=W(i);});return n/d;};
const sForm=rg=>{let n=0,d=0;rg.forEach((r,i)=>{n+=W(i)*pts(r[6]);d+=W(i);});return n/d;};
const sPiste=rg=>{let n=0,d=0;rg.forEach((r,i)=>{
  const m=Math.round((['ParisLongchamp','Deauville','Chantilly','Dieppe','Vichy','Angers'].includes(r[0])?9:6)*0.6+(r[2]==='D'?10:6)*0.4);
  n+=W(i)*m;d+=W(i);});return n/d;};
const sTerr=rg=>{let n=0,d=0;rg.forEach((r,i)=>{n+=W(i)*(/PSF|Lourd|Collant/i.test(r[3])?5:8);d+=W(i);});return n/d;};

const F={
  distance:b=>{const n=b.runs.filter(r=>r[1]>=RACE.minDist).length;
    return{ok:n>=RACE.nbMin,txt:n+'/'+b.runs.length+' courses >= '+RACE.minDist+'m  ['+b.runs.map(r=>r[1]).join(' ')+']'};},
  forme:b=>{const s=sForm(b.runs);
    return{ok:s>=RACE.formMini,txt:'score '+s.toFixed(2)+' (min '+RACE.formMini+')  ['+b.runs.map(r=>r[6]==='ARR'?'X':(r[6]>9?0:r[6])).join(' ')+']'};},
  niveau:b=>{const l2=b.runs.filter(r=>typeof r[5]==='number').slice(0,2);
    const m=l2.reduce((a,c)=>a+c[5],0)/l2.length,e=b.vh-m;
    return{ok:e<=RACE.monteeMax,txt:'aujourd hui '+b.vh+' vs '+m.toFixed(1)+' = '+(e>0?'+':'')+e.toFixed(1)+
      (e<=RACE.monteeMax?'  (pareil ou plus bas)':'  (MONTE)')};},
};

console.log('='.repeat(104));
console.log('  G5 (P13-P20)  —  quota = 1');
console.log('='.repeat(104));

const res=[];
for(const [n,b] of Object.entries(B)){
  const f=[F.distance(b),F.forme(b),F.niveau(b)];
  const ok=f.filter(x=>x.ok).length;
  const G=b.runs.filter(r=>r[2]==='G').length;
  res.push({n:+n,b,f,ok,G,dist:+sDist(b.runs).toFixed(2),piste:+sPiste(b.runs).toFixed(2),
    terr:+sTerr(b.runs).toFixed(2),
    score:+(sForm(b.runs)*.22+sDist(b.runs)*.22+sPiste(b.runs)*.18+7*.13+sTerr(b.runs)*.13+(b.corde?b.corde<=6?10:b.corde<=11?8:5:6)*.12).toFixed(2)});
}
res.sort((a,b)=>b.ok-a.ok||b.score-a.score);

const NOMS=['distance','forme','niveau'];
for(const r of res){
  console.log('\n  '+(r.ok===3?'[A]':r.ok===2?'[B]':'[C]')+'   n'+r.n+'  '+r.b.nom+'   (P'+r.b.P+')   '+r.b.mus);
  r.f.forEach((x,i)=>console.log('      '+(x.ok?'OK  ':'NON ')+NOMS[i].padEnd(9)+x.txt));
  console.log('      distance '+r.dist+' · piste '+r.piste+' (+'+(r.G)+'/5 gauche) · terrain '+r.terr+' · score '+r.score);
  console.log('      '+r.b.jours+' j sans courir · '+r.b.car+' courses'+(r.b.age?' · '+r.b.age+' ans':'')+' · corde '+(r.b.corde??'?'));
}

const A=res.filter(r=>r.ok===3);
console.log('\n'+'='.repeat(104));
console.log('  >>  G5 = '+(A.length?A.map(r=>'n'+r.n+' '+r.b.nom).join(' , '):'aucun 3/3 -> choisir le meilleur 2/3'));
console.log('  >>  n°15 PINK MONDAY (P17) : NON FOURNI dans le fichier');