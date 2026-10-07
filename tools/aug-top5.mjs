import fs from 'node:fs';
const R = JSON.parse(fs.readFileSync('C:/bahja-TURF/tools/aug-quinte.json', 'utf8'));
const P = (c, t) => t ? (c / t * 100).toFixed(1) + '%' : '—';

console.log('='.repeat(96));
console.log(`  غشت 2026 — كانتي ديال R1، ${R.length} سباق`);
console.log('='.repeat(96));

// فحص: واش الوصول 1-5 كامل فكل سباق؟
console.log('\n  فحص الجودة:');
let ok = 0, noCote = 0;
const usable = [];
for (const r of R) {
  const byNum = new Map(r.horses.map(h => [h.num, h]));
  const top5 = r.arrivee.slice(0, 5);
  if (top5.length < 5) { console.log(`    ✗ ${r.date} C${r.num}: الوصول أقل من 5`); continue; }
  const missing = top5.filter(n => !byNum.has(n) || byNum.get(n).cote == null);
  if (missing.length) { console.log(`    ✗ ${r.date} C${r.num} ${r.disc}: بلا كوط للوصول ${missing.join(',')}`); noCote++; continue; }
  usable.push(r); ok++;
}
console.log(`    صالحين: ${ok} / ${R.length}   (مرفوضين: ${R.length - ok})`);

const groups = {
  'الكل (كل الأنواع)': usable,
  'ATTELE (تروت)': usable.filter(r => r.disc === 'ATTELE'),
  'PLAT (بلا)': usable.filter(r => r.disc === 'PLAT'),
  'MONTE': usable.filter(r => r.disc === 'MONTE'),
};

for (const [name, list] of Object.entries(groups)) {
  if (!list.length) continue;
  const W = Math.max(...list.flatMap(r => r.horses.map(h => h.rang)));
  const T = Array.from({ length: 5 }, () => new Array(W + 1).fill(0));
  for (const r of list) {
    const byNum = new Map(r.horses.map(h => [h.num, h]));
    r.arrivee.slice(0, 5).forEach((n, i) => {
      const h = byNum.get(n);
      if (h?.rang) T[i][h.rang]++;
    });
  }
  const tot = T.map(a => a.reduce((x, y) => x + y, 0));

  console.log('\n' + '='.repeat(96));
  console.log(`  ${name} — ${list.length} سباق · أكبر رتبة ${W}`);
  console.log('='.repeat(96));

  // كل رتبة بلا قص
  console.log('\n  كل رتبة (بلا قصّ، بلا cap):');
  for (let p = 0; p < 5; p++) {
    const nz = [];
    for (let r = 1; r <= W; r++) if (T[p][r] > 0) nz.push([r, T[p][r]]);
    nz.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    console.log(`\n  P${p + 1} (n=${tot[p]}) — الرتب النافعة:`);
    nz.forEach(([r, c]) => console.log(`      رتبة ${String(r).padStart(2)}: ${String(c).padStart(2)}  ${P(c, tot[p]).padStart(7)}`));
    // Top-5 بلا tie-break arbitrari
    const t5 = nz.slice(0, 5);
    console.log(`    Top-5 = رتب ${t5.map(x => x[0]).join(', ')}  →  ${P(t5.reduce((a, x) => a + x[1], 0), tot[p])}`);
    // tie عند الحد
    if (nz.length > 5 && nz[4][1] === nz[5][1]) {
      const tied = nz.filter(([r, c]) => c === nz[4][1]).map(x => x[0]);
      console.log(`    ⚠ tie عند ${nz[4][1]}: رتب ${tied.join(', ')} — الحد Arbitraire`);
    }
  }
}
