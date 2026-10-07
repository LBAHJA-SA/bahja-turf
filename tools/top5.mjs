import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const XLSX = require('C:/bahja-TURF/node_modules/xlsx');

const wb = XLSX.readFile('C:/Users/sam/Desktop/statistiques_rang_cote_positions_1_a_5.xlsx');
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Données_extraites'], { defval: null });
const D = rows.filter(r => r.cote != null && r.position != null && r.rang_cote != null)
  .map(r => ({ c: +r.course, cote: +r.cote, rang: +r.rang_cote, pos: parseInt(String(r.position), 10) }))
  .filter(r => Number.isFinite(r.cote) && Number.isFinite(r.rang) && Number.isFinite(r.pos) && r.rang >= 1);

const W = Math.max(...D.map(d => d.rang));
const NC = new Set(D.map(d => d.c)).size;
const T = Array.from({ length: 5 }, () => new Array(W + 1).fill(0));
for (const d of D) if (d.pos >= 1 && d.pos <= 5) T[d.pos - 1][d.rang]++;
const tot = T.map(r => r.reduce((a, b) => a + b, 0));
const P = (c, t) => t ? (c / t * 100).toFixed(1) + '%' : '—';

console.log('='.repeat(104));
console.log(`  Top-5 الرتب النافعة لكل مركز  ·  ${D.length} سطر · ${NC} سباق · ranks 1→${W}`);
console.log('='.repeat(104));

// ===== لكل P: ترتيب الرتب تنازلياً حسب عدد/نسبة =====
console.log('\nلكل مركز: الرتب الخمس الأكثر (بالحصيلة) — بلا حشو\n');

const PICK = [];
for (let p = 0; p < 5; p++) {
  const arr = [];
  for (let r = 1; r <= W; r++) if (T[p][r] > 0) arr.push([r, T[p][r]]);
  arr.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const top5 = arr.slice(0, 5);
  PICK.push(top5);
  const cover = top5.reduce((a, x) => a + x[1], 0);

  console.log('─'.repeat(104));
  console.log(`P${p + 1}   (n=${tot[p]} سباق)`);
  console.log('─'.repeat(104));
  console.log('  #  رتبة الكوط   عدد    % ديال المركز   التراكم');
  top5.forEach(([r, c], i) => {
    const cum = top5.slice(0, i + 1).reduce((a, x) => a + x[1], 0);
    console.log(`  ${i + 1}     ${String(r).padStart(2)}      ${String(c).padStart(3)}      ${P(c, tot[p]).padStart(8)}        ${P(cum, tot[p])}`);
  });
  console.log(`\n  Top-5 مرتّبة = رتب ${top5.map(x => x[0]).join(', ')}   →  تغطي ${P(cover, tot[p])}`);
  console.log(`  الترتيب ديال الـordre: ${top5.map(x => x[0]).join(' → ')}`);
}

// ===== جدول مقارن: نفس الترتيب لكل P =====
console.log('\n' + '='.repeat(104));
console.log('  جدول مقارن — الترتيب ديال كل P');
console.log('='.repeat(104));
console.log('\nالمركز   ترتيب الـordre (Top-5 مرتّبة)              التغطية');
PICK.forEach((t5, p) => {
  console.log(`P${p + 1}`.padEnd(9) + t5.map(x => String(x[0]).padStart(4)).join(' → ').padEnd(40)
    + P(t5.reduce((a, x) => a + x[1], 0), tot[p]));
});

// ===== جدول 5 ranks لكل P بالأرقام =====
console.log('\n' + '='.repeat(104));
console.log('  نفس الـTop-5 لكل P — الأرقام والخانات');
console.log('='.repeat(104));
for (let p = 0; p < 5; p++) {
  const rs = PICK[p].map(x => x[0]);
  console.log(`\nP${p + 1}   رتب: ${rs.join(', ')}`);
  console.log('  عدد ' + rs.map(r => String(T[p][r]).padStart(7)).join(''));
  console.log('   %  ' + rs.map(r => P(T[p][r], tot[p]).padStart(7)).join(''));
  console.log('  cum ' + (() => {
    let s = 0; return rs.map(r => { s += T[p][r]; return P(s, tot[p]).padStart(7); }).join('');
  })());
}

// ===== شنو اللي بقا خارج Top-5 =====
console.log('\n' + '='.repeat(104));
console.log('  خارج Top-5 — شحال ضاع');
console.log('='.repeat(104));
console.log('\nالمركز   التغطية   الضائع');
PICK.forEach((t5, p) => {
  const cov = t5.reduce((a, x) => a + x[1], 0);
  console.log(`P${p + 1}`.padEnd(9) + P(cov, tot[p]).padStart(9) + P(tot[p] - cov, tot[p]).padStart(10));
});
