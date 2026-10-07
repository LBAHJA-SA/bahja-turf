// ===== LOT 2 — 03/10/2026 ParisLongchamp R1C4 =====
// Donnees : C:\Users\sam\Desktop\ttt.txt (fiches Geny) + backend bahja-turf
const RACE = { hippo:'ParisLongchamp', dist:2500, sens:'Droite', surf:'Gazon',
  type:'Hand. Classe 1', alloc:'72 000', partants:18, ref:'+14,5 / +17,5',
  // seuils calibres sur la course
  minDist:2200, nbMin:2, formMini:3.5, monteeMax:1.5 };

const B = {
  6:{ nom:'MISTER GATZ', vh:39, pds:56.5, corde:12, recap:6, jock:'S.PASQUIER', ent:'S.NIGGE',
      mus:'1p7p7p6p2p4p0p(25)7p0p', car:21,
      runs:[ ['Compiègne',2800,'G','Souple','Hand.',36,1],
             ['ParisLongchamp',2400,'D','Bon souple','Hand.',36,7],
             ['Deauville',2500,'D','Bon souple','Hand.',36,7],
             ['ParisLongchamp',2400,'D','Très souple','Hand.',36.5,6],
             ['Saint-Cloud',2400,'G','Bon souple','Cl. 3',36.5,2] ] },

  18:{ nom:'DEMPY', vh:35, pds:52.5, corde:null, recap:8, jock:'C.DEMURO', ent:'D.BONILLA',
      mus:'2p7p1p0p7p3p4p5p7p7p', car:28,
      runs:[ ['Compiègne',2800,'G','Souple','Hand.',35,2],
             ['Deauville',3200,'D','Bon souple','Hand.',35,7],
             ['Saint-Cloud',3000,'G','Bon','Cl. 3',34,1],
             ['Compiègne',2800,'G','Bon souple','Hand.',34.5,10],
             ['ParisLongchamp',2400,'D','Très souple','Hand.',34.5,7] ] },

  11:{ nom:'SHARPSHOOT', vh:40, pds:54.5, corde:null, recap:5, jock:'A.POUCHIN', ent:'A.MIEULLE DE',
      mus:'1p1p2p5p', car:4,
      runs:[ ['ParisLongchamp',2000,'D','Bon','Cl. 2',37,1],
             ["Le Lion-d'Angers",2000,'G','Souple','Cl. 3',null,1],
             ['Bordeaux-Le Bouscat',1900,'D','Bon souple','Maid.',null,2],
             ["Le Lion-d'Angers",2000,'G','Très souple','Maid.',null,5] ] },

  3:{ nom:'GOLDEN WEAVER', vh:41, pds:58.5, corde:null, recap:7, jock:'A.HAMELIN', ent:'M.DELZANGLES',
     mus:'2p9p(25)8p1p5p4p(24)1p6p', car:8,
     runs:[ ["Le Lion-d'Angers",2400,'G','Souple','Cl. 2',43.5,2],
            ['Saint-Cloud',2100,'G','Bon souple','Cl. 3',44.5,9],
            ['Deauville',3000,'D','Bon souple','List.',45.5,8],
            ['Saint-Cloud',2400,'G','Bon','Cl. 3',45.5,1],
            ['Chantilly',2400,'D','Bon souple','80 000',45.5,5] ] },
};

const PTS={0:0,1:10,2:7,3:5,4:3,5:2,6:1,7:1,8:1,9:1,10:1};
const W=i=>1/(1+i*0.55);
const pts=r=>r>9?0:(PTS[r]??0);

const sForm=rg=>{let n=0,d=0;rg.forEach((r,i)=>{n+=W(i)*pts(r[6]);d+=W(i);});return n/d;};
const sDist=rg=>{let n=0,d=0;rg.forEach((r,i)=>{const D=Math.abs(r[1]-RACE.dist);
  const p=D<=100?10:D<=200?8:D<=400?5:D<=600?3:0; n+=W(i)*p; d+=W(i);});return n/d;};
const sPiste=rg=>{let n=0,d=0;rg.forEach((r,i)=>{
  const m=Math.round((r[0]===RACE.hippo?10:['Deauville','Chantilly','Saint-Cloud',"Le Lion-d'Angers",'Bordeaux-Le Bouscat'].includes(r[0])?7:5)*0.6+(r[2]==='D'?10:6)*0.4);
  n+=W(i)*m;d+=W(i);});return n/d;};
const sTerr=rg=>{let n=0,d=0;rg.forEach((r,i)=>{n+=W(i)*(/PSF|Lourd|Collant/i.test(r[3])?5:8);d+=W(i);});return n/d;};
const sLvl=rg=>{let n=0,d=0;rg.forEach((r,i)=>{const vh=r[5];
  const p=vh==null?6:(RACE.type.includes('Hand')?'':''); n+=W(i)*(vh==null?6:(vh>=RACE.vhRef-4?8:5));d+=W(i);});return n/d;};

const F={
  distance:b=>{const n=b.runs.filter(r=>r[1]>=RACE.minDist).length;
    return{ok:n>=RACE.nbMin,txt:n+'/'+b.runs.length+' courses >= '+RACE.minDist+'m  (max '+Math.max(...b.runs.map(r=>r[1]))+'m / jour '+RACE.dist+'m)'};},
  forme:b=>{const s=sForm(b.runs);
    return{ok:s>=RACE.formMini,txt:'score '+s.toFixed(1)+' (min '+RACE.formMini+')  ['+b.runs.map(r=>r[6]>9?0:r[6]).join(' ')+']'};},
  niveau:b=>{const l2=b.runs.filter(r=>r[5]!=null).slice(0,2);
    const m=l2.reduce((a,c)=>a+c[5],0)/l2.length, e=b.vh-m;
    return{ok:e<=RACE.monteeMax,txt:'aujourd hui '+b.vh+' vs '+m.toFixed(1)+' de ses 2 dernieres = '+(e>0?'+':'')+e.toFixed(1)+
      (e<=RACE.monteeMax?'  (meme niveau ou plus bas)':'  (il MONTE de '+Math.round(e)+' pts) -> AA(pser)')};},
};

console.log('='.repeat(104));
console.log('  LOT 2   '+RACE.hippo+' '+RACE.dist+'m '+RACE.surf+' '+RACE.sens+' · '+RACE.type+' · '+RACE.alloc+' E · '+RACE.partants+' partants · ref '+RACE.ref);
console.log('='.repeat(104));

const res=[];
for(const [n,b] of Object.entries(B)){
  const f=[F.distance(b),F.forme(b),F.niveau(b)];
  const ok=f.filter(x=>x.ok).length;
  const gauches=b.runs.filter(r=>r[2]==='G').length;
  const stades=b.runs.filter(r=>/Maid|Cl\. ?3|Cl\. ?2|List|80 000/.test(r[4])).length;
  const bloq=[];
  if(ok<3) bloq.push(...f.filter(x=>!x.ok).map(x=>x.txt));
  if(gauches>=3) bloq.push(gauches+'/'+b.runs.length+' courses a GAUCHE, le jour est a DROITE');
  res.push({n:+n,b,f,ok,gauches,bloq,
    score:+(sForm(b.runs)*.22+sDist(b.runs)*.22+sPiste(b.runs)*.18+sLvl(b.runs)*.13+sTerr(b.runs)*.13+(b.corde?b.corde<=6?10:b.corde<=11?8:b.corde<=15?5:3:6)*.12).toFixed(2)});
}
res.sort((a,b)=>b.ok-a.ok||b.score-a.score);

const NOMS=['distance','forme','niveau'];
for(const r of res){
  const flag=r.ok===3?'[A]':r.ok===2?'[B]':'[C]';
  console.log('\n  '+flag+'   n'+r.n+'  '+r.b.nom+'   '+r.b.pds+'kg  '+r.b.mus+'   ('+r.b.car+' courses)');
  r.f.forEach((x,i)=>console.log('      '+(x.ok?'OK  ':'NON ')+NOMS[i].padEnd(9)+x.txt));
  if(r.gauches>=3) console.log('      ATTENTION  '+r.gauches+'/5 a gauche, jour a droite');
  console.log('      poids '+r.b.pds+'kg · corde '+(r.b.corde??'?')+'/'+RACE.partants+' · '+r.b.jock+' / '+r.b.ent);
}

const A=res.filter(r=>r.ok===3), Bs=res.filter(r=>r.ok===2);
console.log('\n'+'='.repeat(104));
console.log('  >>  PRENDS '+(A.length>=3?3:A.length===2?2:A.length)+'  ->  '+A.map(r=>'n'+r.n).join(' - '));
console.log('  >>  ECARTE : '+res.filter(r=>r.ok<=1).map(r=>'n'+r.n+' '+r.b.nom).join(' , '));