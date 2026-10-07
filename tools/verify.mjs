// ===== داتا المستخدم: كل سباق = لائحة النتائج كما لصقها، بالترتيب ديال الكوط =====
// كل سطر: [النتيجة كما كتبها المستخدم في عمود "Class"]
const RAW = [
  ['CALAS',            ['1','3','5','13','6','7','9','4','2']],
  ['RUGER',            ['1','NC','2','4','5']],
  ['SHANOUR',          ['4','5','16','1','2','7','8','9','15','10','14','12','13','3']],
  ['LE CAPORAL',       ['DQ','2','5','1','8','DQ','6','DQ','10','4','3']],
  ['JIPET DE CREPIN',  ['2','1','DQ','5','9','4','3']],
  ['PRINCESSE D AMOUR',['10','13','9','2','6','5','7','4','11','8','12','16','1','3']],
  ['JUST DE L OISON',  ['1','DQ','6','4','2','DQ','5','3']],
  ['HAMANDIO',         ['7','10','5','1','8','3','6','AR','2','13','4']],
  ['KIKA JOSSELYN',    ['DQ','3','4','1','10','2','5']],
  ['ELIMAN',           ['2','9','1','3','4','6','15','8','7','11','14','10','13','12','5']],
  ['JACKPOT MEARAS',   ['1','3','2','7','5','6','13','4']],
  ['LANCIER',          ['DQ','9','3','5','14','2','6','1','4']],
  ['AMINACO',          ['1','2','3','5','AR','6','4']],
  ['JAPPELOUP TURGOT', ['5','2','6','1','4','3']],
  ['MISTER GATZ',      ['1','3','4','14','2','8','16','12','5']],
  ['JAGERBOMB',        ['2','5','3','1','13','8','9','DQ','6','7','10','4']],
  ['FAWAZ MIL',        ['DQ','1','DQ','2','DQ','9','3','DQ','5','DQ','6','10','4']],
  ['MIDDLE EARTH',     ['2','3','DQ','9','4','7','8','12','6','11','1','DQ','5']],
  ['INTERACTIV',       ['9','6','3','7','10','5','1','12','8','4','14','16','2']],
  ['JANE CASH',        ['9','1','2','3','12','5','11','4']],
  ['INDIEN DE FONTAINE',['3','1','DQ','DQ','7','6','4','NC','2','NC','9','5']],
  ['BOTERVIA',         ['6','3','4','12','5','1','14','2']],
  ['JUST DE L OISON 2',['1','NC','4','DQ','6','DQ','NC','7','2','10','3','8','9','5']],
  ['VICTORY PACE',     ['2','3','4','6','5','15','1']],
  ['HALFAN SPEED',     ['DQ','1','9','3','8','7','5','2','DQ','DQ','4']],
  ['KEL STORY',        ['1','5','4','AR','2','8','AR','10','9','3']],
  ['HOMARD LAND',      ['2','1','3','8','DQ','7','6','5','4']],
  ['JOS MAZA 2',       ['2','1','3','DQ','7','8','6','10','DQ','4','5']],
  ['ANSSIO',           ['4','1','9','2','12','5','13','6','7','14','8','11','10','3']],
  ['JILORD VIVA',      ['3','1','8','6','2','4','5']],
];

console.log('='.repeat(78));
console.log('  TEST 1 — واش اللائحة ديال كل سباق كاملة؟');
console.log('='.repeat(78));

let complete = [], truncated = [];
console.log('\nالسباق                | أسطر | أكبر مركز | مراكز غايبين | الحكم');
console.log('-'.repeat(78));

for (const [name, rows] of RAW) {
  const nums = rows.filter(r => /^\d+$/.test(r)).map(Number);
  const maxPos = Math.max(...nums);
  const present = new Set(nums);
  const missing = [];
  for (let i = 1; i <= maxPos; i++) if (!present.has(i)) missing.push(i);
  const ok = missing.length === 0;
  (ok ? complete : truncated).push(name);
  console.log(`${name.padEnd(21)} | ${String(rows.length).padStart(4)} | ${String(maxPos).padStart(10)} | `
    + `${(missing.join(',') || '—').padEnd(15)} | ${ok ? 'كامل' : 'ناقص'}`);
}

const N = RAW.length;
console.log('\n' + '='.repeat(78));
console.log(`  النتيجة: ${complete.length} سباق كامل / ${N}  |  ${truncated.length} سباق ناقص`);
console.log('='.repeat(78));
console.log('\nالسباقات الناقصة (' + truncated.length + '):');
truncated.forEach(n => console.log('  - ' + n));

// ===== TEST 2: علاش الرتبة ديال الكوط غلط =====
console.log('\n' + '='.repeat(78));
console.log('  TEST 2 — مثال: كيفاش الرتبة كتتبدل فالسباقات الناقصة');
console.log('='.repeat(78));
const ex = RAW[0]; // CALAS
console.log('\nسباق CALAS —User لصق 9 أسطر فقط:');
ex[1].forEach((r, i) => console.log(`   ترتيب الكوط ${String(i + 1).padStart(2)} → المركز ${r}`));
const pos = ex[1].map(Number).filter(n => n <= 13);
console.log(`\n   لكن المركز 8 و10 و11 و12 ماكاينوش فاللائحة.`);
console.log(`   يعني الحقل كان 13 خيل على الأقل، User لصق غير 9.`);
console.log(`\n   => "CALAS = رتبة الكوط 1" غلط:`);
console.log(`      الخيل اللي مكانوش فاللائحة عندهم كوط مجهول.`);
console.log(`      إلا كان واحد فيهم كوط 3.5 (أقل من 4.6)`);
console.log(`      => الرتبة الحقيقية ديال CALAS = 2، ماشي 1.`);

// ===== TEST 3: شحال من رتبة كوطDibona =====
console.log('\n' + '='.repeat(78));
console.log('  TEST 3 — الأرقام اللي طلعتها قبل، شادّة على أساس خايس');
console.log('='.repeat(78));

// كم سطر فالمجموع
const totalRows = RAW.reduce((a, r) => a + r[1].length, 0);
const nonFin = RAW.reduce((a, r) => a + r[1].filter(x => !/^\d+$/.test(x)).length, 0);
console.log(`\n  مجموع الأسطرprocessors = ${totalRows}`);
console.log(`  其中 غير ماشي DHARR FIHAR (DQ/NC/AR) = ${nonFin}`);
console.log(`  يعني finishers = ${totalRows - nonFin}`);
console.log(`\n  قلتي قبل: "153 من 302 (50.7%) غايبين"`);
console.log(`  الحقيقة: ${nonFin} غير ماشي finished من ${totalRows} = ${(nonFin/totalRows*100).toFixed(1)}%`);
console.log(`  الرقم 153/302 كان خطأ ديالي — ماكاين حتى 153.`);

// ===== TEST 4: الأرقام الصحيحة على السباقات الكاملة فقط =====
console.log('\n' + '='.repeat(78));
console.log('  TEST 4 — الإحصائيات على السباقات الكاملة فقط');
console.log('='.repeat(78));

const good = RAW.filter(([n]) => complete.includes(n));
console.log(`  عدد: ${good.length} سباق\n`);

const T = Array.from({ length: 5 }, () => new Array(20).fill(0));
for (const [, rows] of good) rows.forEach((r, i) => {
  const p = parseInt(r, 10);
  if (p >= 1 && p <= 5) T[p - 1][i]++;
});

const tot = [];
for (let p = 0; p < 5; p++) tot.push(T[p].reduce((a, b) => a + b, 0));

console.log('المركز  ' + Array.from({ length: 9 }, (_, i) => String(i + 1).padStart(7)).join('') + '  |   المجموع');
console.log('-'.repeat(78));
for (let p = 0; p < 5; p++) {
  console.log(`P${p + 1}     ` + T[p].slice(0, 9).map((c, i) => {
    const pc = tot[p] ? (c / tot[p] * 100).toFixed(1) : '0.0';
    return (c + ' (' + pc + '%)').padStart(9);
  }).join('') + `  |   ${tot[p]}`);
}

// Top-N
console.log('\nTop-N   P1      P2      P3      P4      P5');
for (let n = 1; n <= 9; n++) {
  const row = [];
  for (let p = 0; p < 5; p++) {
    const c = T[p].slice(0, n).reduce((a, b) => a + b, 0);
    row.push((tot[p] ? (c / tot[p] * 100).toFixed(1) : '0.0') + '%');
  }
  console.log(`Top-${String(n).padEnd(3)} ` + row.map(s => s.padStart(8)).join(''));
}

// الحظ
const avgRunners = totalRows / N;
console.log(`\nمتوسط عدد الخيل فسباق = ${avgRunners.toFixed(1)}  =>  الحظ = ${(100/avgRunners).toFixed(1)}%`);
