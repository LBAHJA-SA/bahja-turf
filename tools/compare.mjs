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

// ============ ملف المستخدم: كل سطر = [الاسم كما لصقه, رقم, الكوط, النتيجة] ============
// مستخرجة مباشرة من نص المستخدم (المركز، الاسم، الكوط)
const USER = {
  'JACKPOT MEARAS':   { num: 5, cote: 3.5, res: '1er' },
  'MISTER GATZ':      { num: 7, cote: 4.2, res: '1er' },
  'JAGERBOMB':        { num: 7, cote: 3.3, res: '2e'  },
  'FAWAZ MIL':        { num: 7, cote: 4.4, res: '1er' },
  'MIDDLE EARTH':     { num: 1, cote: 5.0, res: '2e'  },
  'INTERACTIV':       { num: 5, cote: 16,  res: '1er' },
  'JANE CASH':        { num: 8, cote: 4.5, res: '1er' },
  'INDIEN DE FONTAINE': { num: 13, cote: 4.3, res: '1er' },
  'JILORD VIVA':      { num: 5, cote: 4.5, res: '1er' },
};

// ابحث فالأرشيف
const found = {};
for (const f of walk(ROOT)) {
  let j;
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  for (const p of j.participants || []) {
    const n = String(p.horse || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    for (const k of Object.keys(USER)) {
      if (n === k.replace(/[^A-Z0-9]/g, '')) {
        (found[k] ??= []).push({ j, p });
      }
    }
  }
}

const L = (s, n) => String(s).padEnd(n);
const R = (s, n) => String(s).padStart(n);

console.log('='.repeat(104));
console.log('  مقارنة: ملفك  vs  الأرشيف (bahja-turf/archives)');
console.log('='.repeat(104));

console.log('\n' + L('الخيل', 20) + R('رقم', 5) + R('كوطك', 7) + '  |  ' + R('رقم', 5) + R('كوط', 7) + R('نتيجتك', 7) + '  |  ' + R('رقم', 5) + R('كوط', 7) + R('نتيجة', 7) + '  الحكم');
console.log('-'.repeat(104));

let ok = 0, bad = 0;
for (const [k, u] of Object.entries(USER)) {
  const h = found[k]?.[0];
  if (!h) { console.log(L(k, 20) + R(u.num, 5) + R(u.cote, 7) + '  |  ' + L('—', 25) + '  |  ' + L('غير موجود', 19)); continue; }
  const { j, p } = h;
  const date = j.reunion?.date, hip = j.reunion?.hippodrome, c = j.course?.num;
  const same = p.num === u.num && Math.abs(p.cote_pmu - u.cote) < 0.05;
  console.log(L(k, 20) + R(u.num, 5) + R(u.cote, 7) + '  |  '
    + R(p.num, 5) + R(p.cote_pmu, 7) + R(u.res, 7) + '  |  '
    + R(p.num, 5) + R(p.cote_pmu, 7) + R(p.rang, 7) + '  ' + (same ? '✓ مطابق' : '✗ مختلف'));
  same ? ok++ : bad++;
  console.log(L('', 20) + L(`↳ ${date} ${hip} C${c}${j.course?.quinte ? ' (كانتي)' : ''} — ${j.course?.runners} خيل`, 80));
}

console.log('\n' + '='.repeat(104));
console.log(`  مطابق: ${ok}   مختلف: ${bad}`);
console.log('='.repeat(104));
