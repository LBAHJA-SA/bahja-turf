import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/bahja-TURF/archives';
function walk(d, o = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, o) : e.name.endsWith('.json') && o.push(p);
  }
  return o;
}

const idx = new Map();
for (const f of walk(ROOT)) {
  let j;
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  for (const p of j.participants || []) {
    const n = String(p.horse || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!n) continue;
    (idx.get(n) ?? idx.set(n, []).get(n)).push({
      date: j.reunion?.date, hip: j.reunion?.hippodrome, c: j.course?.num,
      q: !!j.course?.quinte, num: p.num, cote: p.cote_pmu, rang: p.rang,
      run: j.course?.runners, f: path.relative(ROOT, f),
    });
  }
}

// كل الخيل اللي المستخدم لصقهم: [الاسم, رقم, الكوط, النتيجة]
const USER = [
  ['CALAS',1,4.6,'1er'],['RUGER',9,2.3,'1er'],['SHANOUR',3,2.4,'4e'],
  ['LE CAPORAL',15,3.5,'DQ'],['JIPET DE CREPIN',3,2.8,'2e'],['PRINCESSE D AMOUR',8,3.5,'10e'],
  ['JUST DE L OISON',13,3.6,'1er'],['HAMANDIO',1,5.4,'7e'],['KIKA JOSSELYN',9,2.5,'DQ'],
  ['ELIMAN',9,2.7,'2e'],['JACKPOT MEARAS',5,3.5,'1er'],['LANCIER DU GOUTIER',12,4.1,'DQ'],
  ['AMINACO',12,4.1,'1er'],['JAPPELOUP TURGOT',14,4,'5e'],['MISTER GATZ',7,4.2,'1er'],
  ['JAGERBOMB',7,3.3,'2e'],['FAWAZ MIL',7,4.4,'1er'],['MIDDLE EARTH',1,5,'2e'],
  ['INTERACTIV',5,16,'1er'],['JANE CASH',8,4.5,'1er'],['INDIEN DE FONTAINE',13,4.3,'1er'],
  ['BOTERVIA DU KALON',1,13,'1er'],['VICTORY PACE',8,5.4,'2e'],['HALFAN SPEED',13,4.7,'1er'],
  ['KEL STORY',6,4,'1er'],['HOMARD LAND',8,7,'1er'],['JOS MAZA',4,3.7,'2e'],
  ['ANSSIO',1,6.1,'1er'],['JILORD VIVA',5,4.5,'1er'],
];

const L=(s,n)=>String(s).padEnd(n), R=(s,n)=>String(s).padStart(n);
const hit=[], miss=[], diff=[];

for (const [name,num,cote,res] of USER) {
  const k = name.toUpperCase().replace(/[^A-Z0-9]/g,'');
  const h = idx.get(k) || [];
  if (!h.length) { miss.push(name); continue; }
  const x = h[0];
  const dNum = x.num !== num, dCote = Math.abs(x.cote - cote) >= 0.05;
  if (dNum || dCote) diff.push({name,num,cote,res,x});
  else hit.push({name,x,res});
}

console.log('='.repeat(96));
console.log('  النتيجة النهائية — 29 سباق من ملفك');
console.log('='.repeat(96));
console.log(`\n  مطابق تماماً (رقم + كوط)   : ${hit.length}`);
console.log(`  موجود ولكن مختلف           : ${diff.length}`);
console.log(`  ماكاينش إطلاقاً فالأرشيف   : ${miss.length}`);

console.log('\n' + '-'.repeat(96));
console.log('  الموجود ولكن مختلف — مقارنة سطر بسطر');
console.log('-'.repeat(96));
console.log(L('الخيل',20) + L('ملفك', 20) + L('الأرشيف', 26) + 'الفرق');
for (const d of diff) {
  const mine = `n°${d.num} c=${d.cote} ${d.res}`;
  const arch = `${d.x.date} ${d.x.hip} C${d.x.c} n°${d.x.num} c=${d.x.cote} r=${d.x.rang}/${d.x.run}`;
  const f = [];
  if (d.x.num !== d.num) f.push(`رقم ${d.num}→${d.x.num}`);
  if (Math.abs(d.x.cote - d.cote) >= 0.05) f.push(`كوط ${d.cote}→${d.x.cote}`);
  console.log(L(d.name,20) + L(mine, 20) + L(arch, 26) + f.join(' + '));
}

console.log('\n' + '-'.repeat(96));
console.log('  غير موجود فالأرشيف — 21 اسم');
console.log('-'.repeat(96));
for (let i=0;i<miss.length;i+=3) console.log('  ' + miss.slice(i,i+3).map(s=>L(s,26)).join(''));

// النتيجة النهائية بالأرقام
console.log('\n' + '='.repeat(96));
console.log(`  الخلاصة: ${hit.length} من 29 فقط هم اللي تقد توثيقهم  (${(hit.length/29*100).toFixed(0)}%)`);
console.log('='.repeat(96));
