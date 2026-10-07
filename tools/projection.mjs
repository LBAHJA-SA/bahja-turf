import fs from 'node:fs';

const P = (c,t) => t ? (c/t*100).toFixed(1)+'%' : '—';

// الكانتي العالمي — شهر واحد: كم سباق؟ (نحسب من أرشيف غشت = 24 كانتي / شهر)
const FR_MONTH = 24;      // كانتي PMU عالمي/شهر
const MA_PER_WEEK = 3;    // المغرب: 3 سباقات/أسبوع تقريباً
const MA_MONTH = 13;

console.log('='.repeat(70));
console.log('  PROJECTION — 17 إلى 22pcs/شهر');
console.log('='.repeat(70));
console.log(`\n  Quinté France/PMU global : ${FR_MONTH} /شهر`);
console.log(`  Quinté Maroc (Sorec)     : ~${MA_MONTH} /شهر`);
console.log(`  Total                    : ~${FR_MONTH + MA_MONTH} سباق/شهر`);
console.log(`  + USA/Argentine (أحياناً) : +2-4`);

const total = FR_MONTH + MA_MONTH + 3;
console.log(`  → ~${total} سباق/شهر\n`);

console.log('  Pour avoir 17-22pcs 5/5 :');
console.log('  ' + '-'.repeat(60));
console.log('\n  N Chevaliers    P(5/5)      Pcs/mois (sur ' + total + ')');
console.log('  ' + '-'.repeat(60));

for (let N = 5; N <= 16; N++) {
  // interpoler depuis nos données (Top-7=25%, Top-9=50%, Top-12=80%, Top-13=90%)
  const data = { 5:11, 6:5, 7:25, 8:40, 9:50, 10:55, 11:65, 12:80, 13:90, 14:95, 15:100, 16:100 };
  const pct = data[N] ?? 100;
  const perMonth = Math.round(total * pct / 100);
  const mark = (perMonth >= 17 && perMonth <= 22) ? ' ← هدفك' : '';
  console.log(`  Top-${String(N).padEnd(3)}      ${String(pct).padStart(3)}%        ${String(perMonth).padStart(2)}${mark}`);
}

console.log('\n' + '='.repeat(70));
console.log('  النتيجة');
console.log('='.repeat(70));
console.log('\n  لـ 17-22 pcs/شهر، خاصك:');
console.log('\n  Top-13 إلى Top-16');
console.log('\n  يعني: 13-16 خيل فـ كل سباق');
console.log('\n  ولكن PMU Quinté+ = 7 max');
console.log('\n  الحل:');
console.log('  → تخلّص 7 base + 6-9 combiné (نظام المix)');
console.log('  → كلفة السبقة الواحدة: ~15-20 تذكرة');
console.log('  → كلفة الشهر (~40 سباق): 600-800€');
