import fs from 'node:fs';

const RACES = JSON.parse(fs.readFileSync('C:/bahja-TURF/tools/quinte-2020-01.json', 'utf8'));
console.log('الشهر: 2020-01  |  سباقات الكانتي:', RACES.length);

// ===== التوزيع الحقيقي، بلا أي سقف =====
const maxRk = Math.max(...RACES.flatMap(r => r.top.map(h => h.rk)));
const W = maxRk;                       // كل الرتب موجودة فالداتا
const T = Array.from({ length: 5 }, () => new Array(W).fill(0));
for (const rc of RACES) for (const h of rc.top) T[h.pos - 1][h.rk - 1]++;

const pct = (c, t) => t ? (c / t * 100).toFixed(1) + '%' : '  -  ';
const lbl = i => String(i + 1);

console.log('\n===== التوزيع الحقيقي — رتبة الكوط 1 → ' + W + ' (بلا سقف) =====\n');
console.log('رتبة الكوط →' + Array.from({ length: W }, (_, i) => lbl(i).padStart(7)).join(''));

const totals = [];
for (let pos = 0; pos < 5; pos++) {
  const tot = T[pos].reduce((a, b) => a + b, 0);
  totals.push(tot);
  console.log(`\nP${pos + 1}  (n=${tot})`);
  console.log('   عدد ' + String(' ').padStart(8) + T[pos].map(c => String(c).padStart(7)).join(''));
  console.log('     % ' + String(' ').padStart(8) + T[pos].map(c => pct(c, tot).padStart(7)).join(''));
  const peak = T[pos].indexOf(Math.max(...T[pos]));
  console.log(`   الذروة → رتبة الكوط ${peak + 1}  (${pct(T[pos][peak], tot)})`);
}

// ===== التحقق: واش المجموع صحيح؟ =====
console.log('\n\n===== تحقق: مجموع كل سطر = عدد الخيل فذلك المركز =====');
for (let pos = 0; pos < 5; pos++) {
  const s = T[pos].reduce((a, b) => a + b, 0);
  console.log(`  P${pos + 1}: مجموع = ${s}  |  محسوب من الداتا = ${totals[pos]}  ${s === totals[pos] ? '✓' : '✗'}`);
}

// ===== شحال كان رتبة الكوط > 9 ? =====
console.log('\n\n===== شحال من المتصدرين الخمسة كان رتبة الكوط ديالو فوق 9 =====');
console.log('المركز   >9 عدد     >9 نسبة    >12 عدد    >12 نسبة');
for (let pos = 0; pos < 5; pos++) {
  const g9 = T[pos].slice(9).reduce((a, b) => a + b, 0);
  const g12 = T[pos].slice(12).reduce((a, b) => a + b, 0);
  console.log(`P${pos + 1}`.padEnd(9) + String(g9).padStart(8) + pct(g9, totals[pos]).padStart(11)
    + String(g12).padStart(11) + pct(g12, totals[pos]).padStart(11));
}

// ===== التراكمي الصحيح =====
console.log('\n\n===== Top-N الصحيح: من أول N بالكوتب، شحال كيدخل فالمركز N =====\n');
console.log('N        P1       P2       P3       P4       P5');
for (let n = 1; n <= Math.min(12, W); n++) {
  const row = [];
  for (let pos = 0; pos < 5; pos++) {
    const c = T[pos].slice(0, n).reduce((a, b) => a + b, 0);
    row.push(pct(c, totals[pos]));
  }
  console.log(`Top-${String(n).padEnd(4)} ` + row.map(s => s.padStart(9)).join(''));
}

// ===== الحقول الناقصة =====
console.log('\n\n===== توسيع الحقول: كل شي فوق N =====');
for (const n of [9, 12, 16]) {
  const row = [];
  for (let pos = 0; pos < 5; pos++) {
    const c = T[pos].slice(0, n).reduce((a, b) => a + b, 0);
    row.push(pct(c, totals[pos]));
  }
  console.log(`Top-${String(n).padEnd(4)} ` + row.map(s => s.padStart(9)).join(''));
}

// ===== الملخص =====
console.log('\n\n===== الملخص لكل مركز =====');
console.log('المركز   عدد   متوسط رتبة الكوط   الوسيط   % الكوط1   % أول3   % أول5   % أول9');
for (let pos = 1; pos <= 5; pos++) {
  const rks = RACES.map(r => r.top[pos - 1].rk).sort((a, b) => a - b);
  const n = rks.length;
  const mean = rks.reduce((a, b) => a + b, 0) / n;
  const med = rks[Math.floor(n / 2)];
  const f = k => pct(rks.filter(r => r <= k).length, n);
  console.log(`P${pos}`.padEnd(9) + String(n).padStart(5) + mean.toFixed(2).padStart(18)
    + String(med).padStart(9) + pct(rks.filter(r => r === 1).length, n).padStart(11)
    + f(3).padStart(10) + f(5).padStart(10) + f(9).padStart(10));
}
