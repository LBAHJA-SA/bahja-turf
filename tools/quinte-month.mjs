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

const RACES = [];
for (const f of walk(ROOT)) {
  let j;
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  if (!j.course?.quinte) continue;                 // كانتي فقط

  const parts = j.participants || [];
  const rated = parts.filter(p => typeof p.cote_pmu === 'number' && p.cote_pmu > 0);
  if (rated.length < 5) continue;

  const res = parts.filter(p => typeof p.rang === 'number' && p.rang >= 1 && p.rang <= 5);
  if (res.length < 5) continue;                     // نتيجة كاملة 1→5
  if (res.some(p => !(typeof p.cote_pmu === 'number' && p.cote_pmu > 0))) continue;

  // ترتيب الكوط = 1 = أقصر كوط
  const order = rated.slice().sort((a, b) => a.cote_pmu - b.cote_pmu || a.num - b.num);
  const rank = new Map();
  order.forEach((p, i) => { if (!rank.has(p)) rank.set(p, i + 1); });

  RACES.push({
    month: (j.reunion?.date || '').slice(0, 7),
    date: j.reunion?.date,
    hip: j.reunion?.hippodrome,
    nRated: rated.length,
    top: res.sort((a, b) => a.rang - b.rang).map(p => ({
      pos: p.rang, num: p.num, cote: p.cote_pmu, rk: rank.get(p),
    })),
  });
}

// ==== شهور ====
const byMonth = new Map();
for (const r of RACES) {
  if (!byMonth.has(r.month)) byMonth.set(r.month, []);
  byMonth.get(r.month).push(r);
}
console.log('===== سباقات الكانتي بنتيجة كاملة 1-5 + كوط حقيقي، حسب الشهر =====');
for (const [m, list] of [...byMonth.entries()].sort()) {
  const days = new Set(list.map(r => r.date)).size;
  console.log(`  ${m}  →  ${String(list.length).padStart(4)} سباق   (${days} يومDiagnostics)`);
}

const best = [...byMonth.entries()].sort((a, b) => b[1].length - a[1].length)[0];
const [MONTH, races] = best;
console.log(`\n\n${'#'.repeat(78)}\n#  الشهر المختار: ${MONTH}  —  ${races.length} سباق كانتي\n${'#'.repeat(78)}\n`);

const R = 9; // رتب الكوط 1 → 9
const pct = (c, t) => t ? (c / t * 100).toFixed(1) + '%' : '  -  ';

// ===== الجدول 1: لكل مركز، توزيع رتبة الكوط 1→9 =====
const T = Array.from({ length: 5 }, () => new Array(R).fill(0));
for (const rc of races) for (const h of rc.top) T[h.pos - 1][Math.min(h.rk, R) - 1]++;

console.log('===== الجدول 1 — لكل مركز فالنتيجة، شحال كان رتبة الكوط ديال الخيل =====');
console.log('\nرتبة الكوط →   ' + Array.from({ length: R }, (_, i) => String(i + 1).padStart(7)).join(''));
for (let pos = 0; pos < 5; pos++) {
  const tot = T[pos].reduce((a, b) => a + b, 0);
  console.log(`\nP${pos + 1} (n=${tot})`);
  console.log('  عدد:       ' + T[pos].map(c => String(c).padStart(7)).join(''));
  console.log('  النسبة:    ' + T[pos].map(c => pct(c, tot).padStart(7)).join(''));
  const peak = T[pos].indexOf(Math.max(...T[pos]));
  console.log(`  ← الذروة فـ رتبة الكوط ${peak + 1}  (${pct(Math.max(...T[pos]), tot)})`);
}

// ===== الجدول 2: التراكمي (Top-N) — الأهم للميثمور =====
console.log('\n\n===== الجدول 2 — إذا أخذت أول N بالكوتب، شحال كيدخل فالمركز N =====');
console.log('\nN      ' + Array.from({ length: 5 }, (_, i) => ('P' + (i + 1)).padStart(9)).join(''));
for (let n = 1; n <= R; n++) {
  const row = [];
  for (let pos = 0; pos < 5; pos++) {
    const tot = T[pos].reduce((a, b) => a + b, 0);
    const c = T[pos].slice(0, n).reduce((a, b) => a + b, 0);
    row.push(pct(c, tot));
  }
  console.log(`Top-${String(n).padEnd(3)} ` + row.map(s => s.padStart(9)).join(''));
}

// ===== الجدول 3: متوسط رتبة الكوط لكل مركز =====
console.log('\n\n===== الجدول 3 — ملخص لكل مركز =====');
console.log('المركز   عدد    متوسط رتبة الكوط   الوسيط   % ديال رتبة 1   % ديال أول 3   % ديال أول 5');
for (let pos = 1; pos <= 5; pos++) {
  const hs = races.map(r => r.top[pos - 1]);
  const rks = hs.map(h => h.rk).sort((a, b) => a - b);
  const cotes = hs.map(h => h.cote).sort((a, b) => a - b);
  const mean = rks.reduce((a, b) => a + b, 0) / rks.length;
  const med = rks[Math.floor(rks.length / 2)];
  const n = rks.length;
  const p1 = rks.filter(r => r === 1).length;
  const t3 = rks.filter(r => r <= 3).length;
  const t5 = rks.filter(r => r <= 5).length;
  console.log(`P${pos}`.padEnd(9) + String(n).padStart(5) + mean.toFixed(2).padStart(18)
    + String(med).padStart(9) + pct(p1, n).padStart(17) + pct(t3, n).padStart(16) + pct(t5, n).padStart(16));
}

// ===== الجدول 4: متوسط الكوط الحقيقي =====
console.log('\n\n===== الجدول 4 — الكوط الحقيقي ديال كل مركز =====');
console.log('المركز   متوسط الكوط   الوسيط   أصغر كوط');
for (let pos = 1; pos <= 5; pos++) {
  const cs = races.map(r => r.top[pos - 1].cote).sort((a, b) => a - b);
  console.log(`P${pos}`.padEnd(9) + (cs.reduce((a, b) => a + b, 0) / cs.length).toFixed(2).padStart(13)
    + cs[Math.floor(cs.length / 2)].toFixed(1).padStart(9) + String(cs[0]).padStart(12));
}

fs.writeFileSync('C:/bahja-TURF/tools/quinte-' + MONTH + '.json', JSON.stringify(races));
console.log('\n\nحفظ: tools\\quinte-' + MONTH + '.json');
