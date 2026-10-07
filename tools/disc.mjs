import fs from 'node:fs';

const MS = ['2025-12','2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08'];
const P = (c, t) => t ? (c / t * 100).toFixed(1) + '%' : '—';

let RACES = [];
for (const m of MS) {
  const f = `C:/bahja-TURF/tools/quinte-${m}.json`;
  if (!fs.existsSync(f)) continue;
  RACES.push(...JSON.parse(fs.readFileSync(f, 'utf8')).map(x => ({ ...x, m })));
}
console.log('  المجموع:', RACES.length);
const dd = RACES.reduce((a, r) => ((a[r.disc] = (a[r.disc] || 0) + 1), a), {});
console.log('  الأنواع:', JSON.stringify(dd));

// PLAT فيه HAIE داخلو؟ نفصل
const GROUPS = {
  'ATTELE (تروت — جالوب ج-ground)': RACES.filter(r => r.disc === 'ATTELE'),
  'PLAT (بلا — ج-ground)': RACES.filter(r => r.disc === 'PLAT'),
  'MONTE (مونتي)': RACES.filter(r => r.disc === 'MONTE'),
  'HAIE (les haies — فوق الحواجز)': RACES.filter(r => r.disc === 'HAIE'),
};

for (const [label, S] of Object.entries(GROUPS)) {
  if (S.length < 3) { console.log(`\n  ${label}: ${S.length} سباق — غير كافي`); continue; }
  console.log('\n' + '='.repeat(92));
  console.log(`  ${label} — ${S.length} سباق`);
  console.log('='.repeat(92));
  console.log('\n  البلوك            P1&P2&P3      P1&P2        P1');
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15]) {
    const a3 = S.filter(r => r.top.slice(0, 3).every(x => x.rk <= n)).length;
    const a2 = S.filter(r => r.top.slice(0, 2).every(x => x.rk <= n)).length;
    const a1 = S.filter(r => r.top[0].rk <= n).length;
    console.log(`  Top-${String(n).padEnd(3)}            ${String(a3).padStart(3)}/${S.length} ${P(a3, S.length).padStart(7)}   ${String(a2).padStart(3)} ${P(a2, S.length).padStart(7)}  ${String(a1).padStart(3)} ${P(a1, S.length).padStart(7)}`);
  }
  // P3 ranks
  const W = Math.max(...S.flatMap(r => r.top.map(x => x.rk)));
  const C = new Array(W + 1).fill(0);
  for (const r of S) C[r.top[2].rk]++;
  const n3 = C.reduce((a, b) => a + b, 0);
  const nz = [];
  for (let k = 1; k <= W; k++) if (C[k] > 0) nz.push([k, C[k]]);
  nz.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  console.log(`\n  P3: رتبة الكوط → ترتيب (حظ=${P(1, W)}):`);
  console.log('  ' + nz.slice(0, 6).map(([k, c]) => `${k}:${P(c, n3)}`).join('  ') + (nz.length > 6 ? '  …' : ''));
}

// مقارنة مباشرة: تروت بلا مونتي هاي
console.log('\n' + '='.repeat(92));
console.log('  مقارنة P1&P2&P3 عبر الأنواع');
console.log('='.repeat(92));
console.log('\n  البلوك    ' + Object.keys(GROUPS).map(g => g.split(' ')[0].padStart(10)).join(''));
for (const n of [3, 4, 5, 6, 7, 8, 9, 10]) {
  const cells = Object.values(GROUPS).map(S => {
    if (!S.length) return '—'.padStart(10);
    const a3 = S.filter(r => r.top.slice(0, 3).every(x => x.rk <= n)).length;
    return P(a3, S.length).padStart(10);
  }).join('');
  console.log(`  Top-${String(n).padEnd(3)}  ${cells}`);
}
