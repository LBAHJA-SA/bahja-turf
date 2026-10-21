/* tools/synthese-blocks.mjs — طريقة الكتل (ميثود ديسوردر) على السينتيز.
 * نقسم السينتيز (ترتيب الصحافة) إلى كتل G1-G5، ونختار الحصص للكوبلي/التريو.
 * سببي على 200 أخيرة.
 * Usage: node tools/synthese-blocks.mjs
 */
import fs from 'node:fs'
import { charger } from './empreinte-couple.mjs'

const N = 200
const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-N)

/* تحميل السينتيز */
const syntheseData = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))

function getSynthese(date, reunion, course) {
  const key = `${date}_${reunion}_${course}`
  const d = syntheseData[date]
  if (!d || !d.synthese) return null
  const s = d.synthese
  // السينتيز: key "0"=الضغط 1، "1"=الضغط 2، إلخ
  const runners = d.runners || []
  const mapping = {}
  for (const [pos, num] of Object.entries(s)) {
    const p = parseInt(pos, 10)
    if (Number.isFinite(p)) mapping[p + 1] = num // ضغط 1-based
  }
  return mapping
}

/* كتل ديسوردر */
const blocks = {
  G1: [1, 2, 3, 4],      // ضغط 1-4
  G2: [5, 6, 7, 8],      // ضغط 5-8
  G3: [9, 10],           // ضغط 9-10
  G4: [11, 12],          // ضغط 11-12
  G5: [13, 14, 15, 16]   // ضغط 13+
}

/* قواعد اختيار للكوبلي/التريو */
const rules = {
  // 3 خيول: 1 من G1 + 1 من G2 + 1 من G3 (للتريو)
  'G1+G2+G3': (synthese) => {
    const picks = []
    for (const g of ['G1', 'G2', 'G3']) {
      for (const pos of blocks[g]) if (synthese[pos]) { picks.push(synthese[pos]); break }
    }
    return picks.length === 3 ? picks : null
  },
  // 3 خيول: 2 من G1 + 1 من G2
  '2G1+1G2': (synthese) => {
    const picks = []
    let count = 0
    for (const pos of blocks.G1) if (synthese[pos]) { picks.push(synthese[pos]); if (++count === 2) break }
    for (const pos of blocks.G2) if (synthese[pos]) { picks.push(synthese[pos]); break }
    return picks.length === 3 ? picks : null
  },
  // 3 خيول: 1 من G1 + 2 من G2
  '1G1+2G2': (synthese) => {
    const picks = []
    for (const pos of blocks.G1) if (synthese[pos]) { picks.push(synthese[pos]); break }
    let count = 0
    for (const pos of blocks.G2) if (synthese[pos]) { picks.push(synthese[pos]); if (++count === 2) break }
    return picks.length === 3 ? picks : null
  },
  // 3 خيول: أفضل 3 في G1 (إذا G1 لديه 3+)
  'top3-G1': (synthese) => {
    const picks = []
    for (const pos of blocks.G1) if (synthese[pos]) picks.push(synthese[pos])
    return picks.length >= 3 ? picks.slice(0, 3) : null
  },
  // تصويت: كل كتلة تصوت لأول خيل فيها، نأخذ الأعلى 3 أصوات
  'vote-blocks': (synthese) => {
    const votes = new Map()
    for (const [g, positions] of Object.entries(blocks)) {
      for (const pos of positions) if (synthese[pos]) { votes.set(synthese[pos], (votes.get(synthese[pos]) || 0) + 1); break }
    }
    if (votes.size < 3) return null
    return [...votes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0])
  },
}

const results = {}
for (const name of Object.keys(rules)) {
  results[name] = { couple: { hit: 0, n: 0 }, tierce: { hit: 0, n: 0 } }
}

const t0 = Date.now()
tests.forEach((course, i) => {
  const cle = course.cle
  // استخراج date, reunion, course من cle
  const parts = cle.split('_')
  if (parts.length < 3) return
  const date = parts[0]
  const reunion = parts[1]
  const courseNum = parts[2]
  const synthese = getSynthese(date, reunion, courseNum)
  if (!synthese) return

  for (const [name, rule] of Object.entries(rules)) {
    const picks = rule(synthese)
    if (!picks || picks.length < 3) continue

    results[name].couple.n++
    results[name].tierce.n++
    const a = course.arrivee[0], b = course.arrivee[1], c = course.arrivee[2]
    if (picks.includes(a) && picks.includes(b)) results[name].couple.hit++
    if (picks.includes(a) && picks.includes(b) && picks.includes(c)) results[name].tierce.hit++
  }
  if ((i + 1) % 50 === 0) console.log('  ... ' + (i + 1) + '/' + tests.length)
})

console.log('')
console.log('== كتل السينتيز (ميثود ديسوردر) على ' + N + ' سباق ==')
for (const [name, { couple, tierce }] of Object.entries(results)) {
  if (!couple.n) continue
  console.log('  ' + name.padEnd(14) + ': كوبلي=' + couple.hit + '/' + couple.n + ' ' + (couple.hit/couple.n*100).toFixed(2) + '% · تريو=' + tierce.hit + '/' + tierce.n + ' ' + (tierce.hit/tierce.n*100).toFixed(2) + '%')
}