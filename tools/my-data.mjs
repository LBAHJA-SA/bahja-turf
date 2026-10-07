// ===== داتا المستخدم: 30 سباق، كل واحد [رتبة الكوط, النتيجة] =====
// النتيجة: 1-5 = المركز، DQ = disqualifié، AR/NC = non partant / disqualifié
const RACES = [
  [[1,'1'],[2,'3'],[3,'5'],[4,'13'],[5,'6'],[6,'7'],[7,'9'],[8,'4'],[9,'2']],                      // CALAS
  [[1,'1'],[2,'NC'],[3,'2'],[4,'4'],[5,'5']],                                                       // RUGER (5 صفوف متبينين)
  [[1,'4'],[2,'5'],[3,'16'],[4,'1'],[5,'2'],[6,'7'],[7,'8'],[8,'9'],[9,'15'],[10,'10'],[11,'14'],[12,'12'],[13,'13'],[14,'3']], // SHANOUR
  [[1,'DQ'],[2,'2'],[3,'5'],[4,'1'],[5,'8'],[6,'DQ'],[7,'6'],[8,'DQ'],[9,'10'],[10,'4'],[11,'3']],   // LE CAPORAL
  [[1,'2'],[2,'1'],[3,'DQ'],[4,'5'],[5,'9'],[6,'4'],[7,'3']],                                       // JIPET DE CREPIN
  [[1,'10'],[2,'13'],[3,'9'],[4,'2'],[5,'6'],[6,'5'],[7,'7'],[8,'4'],[9,'11'],[10,'8'],[11,'12'],[12,'16'],[13,'1'],[14,'3']], // PRINCESSE D'AMOUR
  [[1,'1'],[2,'DQ'],[3,'6'],[4,'4'],[5,'2'],[6,'DQ'],[7,'5'],[8,'3']],                             // JUST DE L'OISON
  [[1,'7'],[2,'10'],[3,'5'],[4,'1'],[5,'8'],[6,'3'],[7,'6'],[8,'AR'],[9,'2'],[10,'13'],[11,'4']],   // HAMANDIO
  [[1,'DQ'],[2,'3'],[3,'4'],[4,'1'],[5,'10'],[6,'2'],[7,'5']],                                     // KIKA JOSSELYN
  [[1,'2'],[2,'9'],[3,'1'],[4,'3'],[5,'4'],[6,'6'],[7,'15'],[8,'8'],[9,'7'],[10,'11'],[11,'14'],[12,'10'],[13,'13'],[14,'12'],[15,'5']], // ELIMAN
  [[1,'1'],[2,'3'],[3,'2'],[4,'7'],[5,'5'],[6,'6'],[7,'13'],[8,'4']],                               // JACKPOT MEARAS
  [[1,'DQ'],[2,'9'],[3,'3'],[4,'5'],[5,'14'],[6,'2'],[7,'6'],[8,'1'],[9,'4']],                     // LANCIER DU GOUTIER
  [[1,'1'],[2,'2'],[3,'3'],[4,'5'],[5,'AR'],[6,'6'],[7,'4']],                                       // AMINACO
  [[1,'5'],[2,'2'],[3,'6'],[4,'1'],[5,'4'],[6,'3']],                                               // JAPPELOUP TURGOT
  [[1,'1'],[2,'3'],[3,'4'],[4,'14'],[5,'2'],[6,'8'],[7,'16'],[8,'12'],[9,'5']],                    // MISTER GATZ
  [[1,'2'],[2,'5'],[3,'3'],[4,'1'],[5,'13'],[6,'8'],[7,'9'],[8,'DQ'],[9,'6'],[10,'7'],[11,'10'],[12,'4']], // JAGERBOMB
  [[1,'DQ'],[2,'1'],[3,'DQ'],[4,'2'],[5,'DQ'],[6,'9'],[7,'3'],[8,'DQ'],[9,'5'],[10,'DQ'],[11,'6'],[12,'10'],[13,'4']], // FAWAZ MIL
  [[1,'2'],[2,'3'],[3,'DQ'],[4,'9'],[5,'4'],[6,'7'],[7,'8'],[8,'12'],[9,'6'],[10,'11'],[11,'1'],[12,'DQ'],[13,'5']], // MIDDLE EARTH
  [[1,'9'],[2,'6'],[3,'3'],[4,'7'],[5,'10'],[6,'5'],[7,'1'],[8,'12'],[9,'8'],[10,'4'],[11,'14'],[12,'16'],[13,'2']], // INTERACTIV
  [[1,'9'],[2,'1'],[3,'2'],[4,'3'],[5,'12'],[6,'5'],[7,'11'],[8,'4']],                             // JANE CASH
  [[1,'3'],[2,'1'],[3,'DQ'],[4,'DQ'],[5,'7'],[6,'6'],[7,'4'],[8,'NC'],[9,'2'],[10,'NC'],[11,'9'],[12,'5']], // INDIEN DE FONTAINE
  [[1,'6'],[2,'3'],[3,'4'],[4,'12'],[5,'5'],[6,'1'],[7,'14'],[8,'2']],                             // BOTERVIA DU KALON
  [[1,'1'],[2,'NC'],[3,'4'],[4,'DQ'],[5,'6'],[6,'DQ'],[7,'NC'],[8,'7'],[9,'2'],[10,'10'],[11,'3'],[12,'8'],[13,'9'],[14,'5']], // JUST DE L'OISON 2
  [[1,'2'],[2,'3'],[3,'4'],[4,'6'],[5,'5'],[6,'15'],[7,'1']],                                     // VICTORY PACE
  [[1,'DQ'],[2,'1'],[3,'9'],[4,'3'],[5,'8'],[6,'7'],[7,'5'],[8,'2'],[9,'DQ'],[10,'DQ'],[11,'4']],   // HALFAN SPEED
  [[1,'1'],[2,'5'],[3,'4'],[4,'AR'],[5,'2'],[6,'8'],[7,'AR'],[8,'10'],[9,'9'],[10,'3']],           // KEL STORY
  [[1,'2'],[2,'1'],[3,'3'],[4,'8'],[5,'DQ'],[6,'7'],[7,'6'],[8,'5'],[9,'4']],                      // HOMARD LAND
  [[1,'2'],[2,'1'],[3,'3'],[4,'DQ'],[5,'7'],[6,'8'],[7,'6'],[8,'10'],[9,'DQ'],[10,'4'],[11,'5']],   // JOS MAZA
  [[1,'4'],[2,'1'],[3,'9'],[4,'2'],[5,'12'],[6,'5'],[7,'13'],[8,'6'],[9,'7'],[10,'14'],[11,'8'],[12,'11'],[13,'10'],[14,'3']], // ANSSIO
  [[1,'3'],[2,'1'],[3,'8'],[4,'6'],[5,'2'],[6,'4'],[7,'5']],                                       // JILORD VIVA
];

const N = RACES.length;
const pct = (c, t) => t ? (c / t * 100).toFixed(1) + '%' : '—';

console.log(`السباقات المحللة: ${N}`);
const allRanks = RACES.flat().map(r => r[0]);
const W = Math.max(...allRanks);
const totalHorses = RACES.reduce((a, r) => a + r.length, 0);
console.log(`عدد الخيل الإجمالي: ${totalHorses}`);
console.log(`متوسط عدد الخيل فسباق: ${(totalHorses / N).toFixed(1)}`);
console.log(`أكبر رتبة كوط: ${W}`);

// ===== التوزيع الحقيقي لكل مركز =====
const T = Array.from({ length: 5 }, () => new Array(W).fill(0));
for (const rc of RACES) for (const [rk, res] of rc) {
  const p = parseInt(res, 10);
  if (p >= 1 && p <= 5) T[p - 1][rk - 1]++;
}

console.log('\n' + '='.repeat(90));
console.log('  الجدول 1 — لكل مركز فالنتيجة، رتبة الكوط ديال الخيل');
console.log('='.repeat(90));
console.log('\nرتبة الكوط →' + Array.from({ length: W }, (_, i) => String(i + 1).padStart(6)).join(''));

for (let pos = 0; pos < 5; pos++) {
  const tot = T[pos].reduce((a, b) => a + b, 0);
  console.log(`\nP${pos + 1}   (عدد=${tot} من ${N} سباق)`);
  console.log('  عدد  ' + String(' ').padStart(7) + T[pos].map(c => String(c).padStart(6)).join(''));
  console.log('   %   ' + String(' ').padStart(7) + T[pos].map(c => pct(c, tot).padStart(6)).join(''));
  const peak = T[pos].indexOf(Math.max(...T[pos]));
  if (tot) console.log(`  الذروة → الكوط ${peak + 1}  (${pct(T[pos][peak], tot)})`);
}

// ===== تحقق =====
console.log('\n' + '='.repeat(90));
console.log('  تحقق');
console.log('='.repeat(90));
for (let pos = 0; pos < 5; pos++) {
  const s = T[pos].reduce((a, b) => a + b, 0);
  const cnt = RACES.filter(rc => rc.some(([, r]) => parseInt(r, 10) === pos + 1)).length;
  console.log(`  P${pos + 1}: مجموع الجدول = ${s}  |  سباقات فيها هاد المركز = ${cnt}  ${s === cnt ? '✓' : '✗'}`);
}

// ===== Top-N =====
console.log('\n' + '='.repeat(90));
console.log('  الجدول 2 — Top-N: من أول N بالكوتب، شحال كيدخل فالمركز N');
console.log('='.repeat(90));
console.log('\nN       P1      P2      P3      P4      P5      |  الحظ*');
const chance = (totalHorses / N) / W;
for (let n = 1; n <= Math.min(10, W); n++) {
  const row = [];
  for (let pos = 0; pos < 5; pos++) {
    const tot = T[pos].reduce((a, b) => a + b, 0);
    const c = T[pos].slice(0, n).reduce((a, b) => a + b, 0);
    row.push(pct(c, tot));
  }
  console.log(`Top-${String(n).padEnd(3)} ` + row.map(s => s.padStart(8)).join(' ') + '  |  ' + pct(0, 1).slice(0, 0) + (100 / (totalHorses / N)).toFixed(1) + '%');
}

// ===== ملخص =====
console.log('\n' + '='.repeat(90));
console.log('  الجدول 3 — الملخص');
console.log('='.repeat(90));
console.log('\nالمركز   عدد   متوسط رتبة الكوط   الوسيط   % الكوط1   % أول3   % أول5');
for (let pos = 1; pos <= 5; pos++) {
  const rks = RACES.map(rc => rc.find(([, r]) => parseInt(r, 10) === pos)?.[0]).filter(Boolean).sort((a, b) => a - b);
  if (!rks.length) { console.log(`P${pos}    —  ماكاينش`); continue; }
  const n = rks.length;
  const mean = rks.reduce((a, b) => a + b, 0) / n;
  const med = rks[Math.floor(n / 2)];
  const f = k => pct(rks.filter(r => r <= k).length, n);
  console.log(`P${pos}`.padEnd(9) + String(n).padStart(5) + mean.toFixed(2).padStart(18)
    + String(med).padStart(9) + pct(rks.filter(r => r === 1).length, n).padStart(11)
    + f(3).padStart(10) + f(5).padStart(10));
}

// ===== DSQ / non-partants =====
console.log('\n' + '='.repeat(90));
console.log('  غائبين (DQ / NC / AR) — رتبة الكوط ديالهم');
console.log('='.repeat(90));
const dq = RACES.flat().filter(([, r]) => !/^[1-5]$/.test(r));
const dqRanks = dq.map(x => x[0]).sort((a, b) => a - b);
console.log(`  عددهم: ${dq.length} من ${totalHorses}  (${pct(dq.length, totalHorses)})`);
console.log('  رتب الكوط ديالهم:', dqRanks.join(', '));
console.log(`  كم منهم كان Top-5 بالكوط: ${dqRanks.filter(r => r <= 5).length}`);
console.log(`  كم منهم كان الكوط 1: ${dqRanks.filter(r => r === 1).length}`);
