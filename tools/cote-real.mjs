import fs from 'node:fs';

const RACES = JSON.parse(fs.readFileSync('C:/bahja-TURF/tools/quinte-2020-01.json', 'utf8'));
const pct = (c, t) => t ? (c / t * 100).toFixed(1) + '%' : '  -  ';

// ===== 1. الأثر ديال الشواذ (outliers) =====
console.log('===== 1. كم سطر كوط غريب كاين؟ =====');
const allCotes = RACES.flatMap(r => r.top.map(h => h.cote)).sort((a, b) => a - b);
console.log('  إجمالي الكوطات:', allCotes.length);
console.log('  >30 :', allCotes.filter(c => c > 30).length, `(${pct(allCotes.filter(c => c > 30).length, allCotes.length)})`);
console.log('  >50 :', allCotes.filter(c => c > 50).length, `(${pct(allCotes.filter(c => c > 50).length, allCotes.length)})`);
console.log('  >100:', allCotes.filter(c => c > 100).length, `(${pct(allCotes.filter(c => c > 100).length, allCotes.length)})`);
console.log('\n  أكبر 10 كوطات:', allCotes.slice(-10).join(', '));

// ===== 2. كم سباق فيه كوط > 30 فالمتصدرين؟ =====
console.log('\n===== 2. واش كاين سباق كامل متأثر؟ =====');
const dirty = RACES.filter(r => r.top.some(h => h.cote > 30));
console.log(`  سباقات فيها على الأقل كوط >30: ${dirty.length} من ${RACES.length} (${pct(dirty.length, RACES.length)})`);

// ===== 3. التوزيع بدل المتوسط — لكل مركز =====
console.log('\n\n===== 3. التوزيع الحقيقي ديال الكوط لكل مركز (بلا متوسط) =====');
console.log('\nالISON →'.padEnd(10) + '<=3'.padStart(9) + '4-6'.padStart(9) + '7-10'.padStart(9) + '11-15'.padStart(10) + '16-25'.padStart(10) + '>25'.padStart(9) + '  |  الوسيط');
const bins = [[1, 3], [4, 6], [7, 10], [11, 15], [16, 25], [26, 9999]];
for (let pos = 1; pos <= 5; pos++) {
  const cs = RACES.map(r => r.top[pos - 1].cote).sort((a, b) => a - b);
  const n = cs.length;
  const med = cs[Math.floor(n / 2)];
  const cells = bins.map(([a, b]) => pct(cs.filter(c => c >= a && c <= b).length, n).padStart(a === 1 ? 9 : b === 9999 ? 9 : 10)).join('');
  console.log(`P${pos} (n=${n})`.padEnd(10) + cells + String(med).padStart(9));
}

// ===== 4. متوسط بدون شواذ — المقارنة =====
console.log('\n\n===== 4. المتوسط ضد الوسيط ضد الوسيط العلوي =====');
console.log('المركز   n     المتوسط   الوسيط   الوسيط العلوي   P75   P90');
for (let pos = 1; pos <= 5; pos++) {
  const cs = RACES.map(r => r.top[pos - 1].cote).sort((a, b) => a - b);
  const n = cs.length;
  const mean = cs.reduce((a, b) => a + b, 0) / n;
  const q = p => cs[Math.floor(n * p)];
  console.log(`P${pos}`.padEnd(9) + String(n).padStart(5) + mean.toFixed(2).padStart(11)
    + String(q(0.5)).padStart(9) + String(q(0.75)).padStart(15) + String(q(0.75)).padStart(7) + String(q(0.9)).padStart(7));
}

// ===== 5. نسبة النجاح الحقيقية: chanceCalculator =====
console.log('\n\n===== 5. ما هو "الكوط" ديال P1 اللي يخدم — الحقيقية =====');
console.log('\nرتبة الكوط   عدد     نسبة成功后');
for (let rk = 1; rk <= 9; rk++) {
  const hits = RACES.filter(rc => rc.top[0].rk === rk).length;
  const total = RACES.length;
  console.log(`  ${String(rk).padStart(2)}        ${String(hits).padStart(4)}    ${pct(hits, total).padStart(7)}`);
}

console.log('\n\n===== 6. 것과 odds-rank 数 = 时应该有多少 =====');
const avgRated = RACES.reduce((a, r) => a + r.nRated, 0) / RACES.length;
console.log(`  متوسط عدد الخيل الم-rate فسباق: ${avgRated.toFixed(1)}`);
console.log(`  إذن المت随机 rank لـ P1 كان ~${(avgRated / RACES.length * RACES.length).toFixed(0)}`);
for (const rk of [1, 2, 3, 4, 5]) {
  const hits = RACES.filter(rc => rc.top[0].rk === rk).length;
  const chance = 1 / avgRated * 100;
  console.log(`  Top-${rk}: ${pct(hits, RACES.length)}  (Hasard = ${chance.toFixed(1)}%)  →  ×${(hits / RACES.length * 100 / chance).toFixed(2)}`);
}

// ===== 7. الفارق الحقيقي: ruate vs random =====
console.log('\n\n===== 7. P1: شكون فـ Top-N ديال الكوط — النسبة الحقيقية =====');
for (let n = 1; n <= 9; n++) {
  const c = RACES.filter(rc => rc.top[0].rk <= n).length;
  console.log(`  Top-${String(n).padEnd(2)} → ${pct(c, RACES.length).padStart(7)}`);
}
