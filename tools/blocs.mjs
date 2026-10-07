import fs from 'node:fs';

const MS = ['2025-12','2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08'];
const P = (c, t) => t ? (c / t * 100).toFixed(1) + '%' : '—';

let RACES = [];
for (const m of MS) {
  const f = `C:/bahja-TURF/tools/quinte-${m}.json`;
  if (!fs.existsSync(f)) continue;
  const r = JSON.parse(fs.readFileSync(f, 'utf8'));
  RACES.push(...r.map(x => ({ ...x, m })));
}
console.log('='.repeat(100));
console.log(`  كانتي R1 — كل الشهور: ${RACES.length} سباق`);
console.log('='.repeat(100));
const dm = RACES.reduce((a, r) => ((a[r.m] = (a[r.m] || 0) + 1), a), {});
console.log('  ', Object.entries(dm).map(([k, v]) => `${k}:${v}`).join('  '));
const dd = RACES.reduce((a, r) => ((a[r.disc] = (a[r.disc] || 0) + 1), a), {});
console.log('  الأنواع:', JSON.stringify(dd));

// ---------- blocos متتالية ----------
// لكل bloc، احتمال أن P1,P2,P3 كاملين داخلو
console.log('\n' + '='.repeat(100));
console.log('  BLOCS متتالية — احتمال أن P1+P2+P3 كاملين داخل البلوك');
console.log('='.repeat(100));
console.log('\n  البلوك            P1&P2&P3      P1&P2        P1');
const RES = {};
for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15]) {
  const all3 = RACES.filter(r => r.top.slice(0, 3).every(x => x.rk <= n)).length;
  const p12 = RACES.filter(r => r.top.slice(0, 2).every(x => x.rk <= n)).length;
  const p1 = RACES.filter(r => r.top[0].rk <= n).length;
  RES[n] = { all3, p12, p1 };
  console.log(`  Top-${String(n).padEnd(3)} (${n} خيل)   ${String(all3).padStart(3)}/${RACES.length} ${P(all3, RACES.length).padStart(7)}   ${String(p12).padStart(3)}/${RACES.length} ${P(p12, RACES.length).padStart(7)}  ${String(p1).padStart(3)} ${P(p1, RACES.length).padStart(7)}`);
}

// ---------- نفس الشي حسب الانواع ----------
for (const disc of ['ATTELE', 'PLAT']) {
  const S = RACES.filter(r => r.disc === disc);
  if (S.length < 5) continue;
  console.log('\n' + '='.repeat(100));
  console.log(`  BLOCS — ${disc} فقط (${S.length} سباق)`);
  console.log('='.repeat(100));
  console.log('\n  البلوك            P1&P2&P3      P1&P2        P1');
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15]) {
    const a3 = S.filter(r => r.top.slice(0, 3).every(x => x.rk <= n)).length;
    const a2 = S.filter(r => r.top.slice(0, 2).every(x => x.rk <= n)).length;
    const a1 = S.filter(r => r.top[0].rk <= n).length;
    console.log(`  Top-${String(n).padEnd(3)}            ${String(a3).padStart(3)}/${S.length} ${P(a3, S.length).padStart(7)}   ${String(a2).padStart(3)} ${P(a2, S.length).padStart(7)}  ${String(a1).padStart(3)} ${P(a1, S.length).padStart(7)}`);
  }
}

// ---------- كل رتبة فين وصلت (P1..P5) ----------
console.log('\n' + '='.repeat(100));
console.log('  كل رتبة كوط → فين وصلت (P1..P5)');
console.log('='.repeat(100));
const W = Math.max(...RACES.flatMap(r => r.top.map(x => x.rk)));
const T = Array.from({ length: 5 }, () => new Array(W + 1).fill(0));
for (const r of RACES) r.top.forEach(x => T[x.pos - 1][x.rk]++);
const tot = T.map(a => a.reduce((x, y) => x + y, 0));
console.log('\nرتبة   P1       P2       P3       P4       P5');
for (let k = 1; k <= W; k++) {
  const cells = T.map((_, p) => `${T[p][k]}/${tot[p]}`.padStart(9) + ' ' + P(T[p][k], tot[p]).padStart(7)).join('');
  console.log(`${String(k).padStart(4)}  ${cells}`);
}

// ---------- P3: فين راهنت ----------
console.log('\n' + '='.repeat(100));
console.log('  P3 تحديداً — رتبة الكوط ديال الثالث (الن-place ديال الخسارة)');
console.log('='.repeat(100));
const nz = [];
for (let k = 1; k <= W; k++) if (T[2][k] > 0) nz.push([k, T[2][k]]);
nz.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
console.log('\n  رتبة   عدد    %      تراكم   ×الحظ');
let s = 0;
for (const [k, c] of nz) { s += c; console.log(`  ${String(k).padStart(4)}  ${String(c).padStart(4)}  ${P(c, tot[2]).padStart(7)}  ${P(s, tot[2]).padStart(8)}  ×${(c / (tot[2] / W)).toFixed(2)}`); }
console.log(`\n  الحظ = ${P(1, W)} لكل رتبة`);
