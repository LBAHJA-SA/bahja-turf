/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/tests/comparator.mjs — تقرير مقارنة V1 × V2
 *
 *  الإطار:
 *  • Walk-Forward حقيقي — لا تدخل عنصر السباق الجاري في التدريب.
 *  • كل تخصص يُسجَّل بجداوله الخاصة.
 *  • v1 تُستدعي ربيبة بربيبة لأنها الـ référence.
 *  • v2 تُستدعي مع كل ملف تعريف scoring لوحدة إضافية.
 *  • لا استنساخ لخماسي مكرر بين الصفوف عند نفس الـ idéogramme.
 * ════════════════════════════════════════════════════════════════════════ */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { normDiscipline } from '../synthese.js'
import { attributionSlots } from '../moteur.js'
import { genererMoteur as V1 } from '../moteur.js'
import { genererMoteur as V2, choisirPredictions } from '../moteur-v2.js'
import { WEIGHTS_BY_PROFILE } from '../generation/classement.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.resolve(HERE, '..', '..', '..', 'data', 'synthese.json')

const db = JSON.parse(fs.readFileSync(DATA, 'utf8'))
const races = Object.keys(db).sort().filter((d) => Array.isArray(db[d]?.arrivee) && db[d].arrivee.length >= 5)

/* ── فترة 95٪ (Wilson) ────────────────────────────────────────────── */
function wilson(k, n, z = 1.96) {
  if (n === 0) return { lo: 0, hi: 1 }
  const p = k / n
  const denom = 1 + z * z / n
  const center = (p + z * z / (2 * n)) / denom
  const half = (z * Math.sqrt((p * (1 - p)) / n + z * z / (4 * n * n))) / denom
  return { lo: Math.max(0, center - half), hi: Math.min(1, center + half) }
}

const pctCI = (k, n) => {
  const c = wilson(k, n)
  return `${((k / (n || 1)) * 100).toFixed(1)} [${(c.lo * 100).toFixed(1)}, ${(c.hi * 100).toFixed(1)}]`
}

/* ── بناء EVAL ──────────────────────────────────────────────────────── */
function ordrer(e) {
  const slots = attributionSlots(e.synthese, e.runners)
  return [
    ...(e.synthese || []).map((n) => ({ num: n, presse: true, slot: slots[n] })),
    ...((e.runners || []).filter((n) => !(e.synthese || []).includes(n)).sort((a, b) => a - b)).map((n) => ({ num: n, presse: false, slot: slots[n] })),
  ].filter((c) => c.slot != null)
}

function evaluerTicket(ticket, arrivee) {
  if (!ticket || ticket.length !== 5) return null
  const set = new Set(ticket)
  const count = arrivee.filter((n) => set.has(n)).length
  const top3Matched = arrivee.slice(0, 3).filter((n) => set.has(n)).length
  return {
    p1: set.has(arrivee[0]) ? 1 : 0,
    p2: set.has(arrivee[1]) ? 1 : 0,
    p3: set.has(arrivee[2]) ? 1 : 0,
    p4: set.has(arrivee[3]) ? 1 : 0,
    p5: set.has(arrivee[4]) ? 1 : 0,
    top3Count: top3Matched,
    unorderedTop3: top3Matched === 3 ? 1 : 0,
    quatre: count >= 4 ? 1 : 0,
    cinq: count === 5 ? 1 : 0,
    count,
  }
}




const PROFILES_V2 = Object.entries(WEIGHTS_BY_PROFILE)

/* ── تنفيذ V1 + V2 (بملفات التعريف) ─────────────────────────────────────── */
async function runVariant(label, generator, disc, dbRaces, dbAll) {
  const filtered = dbRaces.filter((d) => disc === 'TOUS' || normDiscipline(dbAll[d]?.discipline) === disc)
  if (filtered.length < 4) return { n: 0 }
  let n = 0, p1 = 0, p2 = 0, p3 = 0, p4 = 0, p5 = 0, unorderedTop3 = 0, top3Count = 0, quatre = 0, cinq = 0, count = 0
  for (let i = 2; i < filtered.length; i++) {
    const date = filtered[i]
    const test = dbAll[date]
    const ordre = ordrer(test)
    const training = {}
    for (let j = 0; j < i; j++) training[filtered[j]] = dbAll[filtered[j]]
    const lignes = { n1: { typed: [], cible: 5 }, n2: { typed: [], cible: 5 }, n3: { typed: [], cible: 5 }, n4: { typed: [], cible: 5 }, n5: { typed: [], cible: 5 } }
    const ignored = []
    try {
      let out
      if (label === 'v1') out = await V1({ ordre, discipline: disc === 'TOUS' ? null : disc, ignored, lignes, db: training })
      else {
        const opts = label.startsWith('v2:') ? { weights: WEIGHTS_BY_PROFILE[label.slice(3)] } : {}
        out = await V2({ ordre, discipline: disc === 'TOUS' ? null : disc, ignored, lignes, db, uptoDate: date, ...opts })
      }
      for (const id of ['n1', 'n2', 'n3', 'n4', 'n5']) {
        const t = out[id]
        if (!t || t.length !== 5) continue
        const ev = evaluerTicket(t, test.arrivee)
        if (!ev) continue
        n++
        p1 += ev.p1; p2 += ev.p2; p3 += ev.p3; p4 += ev.p4; p5 += ev.p5
        unorderedTop3 += ev.unorderedTop3; top3Count += ev.top3Count
        quatre += ev.quatre; cinq += ev.cinq; count += ev.count
      }
    } catch (e) { /* skip */ }
  }
  return { n, p1, p2, p3, p4, p5, unorderedTop3, top3Count, quatre, cinq, count }
}

/* نفس السباق × نفس التذاكر — كل سباق يقيس بـ best-of-5 */
async function pairedComparison(dbAll, D, label = 'v2:full') {
  const racesAsc = [...new Set(Object.keys(dbAll))].sort()
  const filtered = racesAsc.filter((d) => D === 'TOUS' || normDiscipline(dbAll[d]?.discipline) === D)
  if (filtered.length < 4) return { v1Wins: 0, v2Wins: 0, ties: 0, usedRaces: 0 }
  let v1Wins = 0, v2Wins = 0, ties = 0, usedRaces = 0
  const ticketIds = ['n1', 'n2', 'n3', 'n4', 'n5']
  for (let i = 2; i < filtered.length; i++) {
    const date = filtered[i]
    const test = dbAll[date]
    const ordre = ordrer(test)
    const training = {}
    for (let j = 0; j < i; j++) training[filtered[j]] = dbAll[filtered[j]]
    const lignes = { n1: { typed: [], cible: 5 }, n2: { typed: [], cible: 5 }, n3: { typed: [], cible: 5 }, n4: { typed: [], cible: 5 }, n5: { typed: [], cible: 5 } }
    const ignored = []
    try {
      const opts = label.startsWith('v2:') ? { weights: WEIGHTS_BY_PROFILE[label.slice(3)] } : {}
      const r1 = await V1({ ordre, discipline: D === 'TOUS' ? null : D, ignored, lignes, db: training })
      const r2 = await V2({ ordre, discipline: D === 'TOUS' ? null : D, ignored, lignes, db: dbAll, uptoDate: date, ...opts })
      /* أفضل تذكرة في كل سباق */
      let best1 = 0, best2 = 0
      let usedT1 = 0, usedT2 = 0
      for (const id of ticketIds) {
        const t1 = r1[id], t2 = r2[id]
        if (!t1 || !t2 || t1.length !== 5 || t2.length !== 5) continue
        const arr = test.arrivee
        const c1 = arr.filter((n) => new Set(t1).has(n)).length
        const c2 = arr.filter((n) => new Set(t2).has(n)).length
        best1 = Math.max(best1, c1)
        best2 = Math.max(best2, c2)
        usedT1++
        usedT2++
      }
      if (usedT1 < 5 || usedT2 < 5) continue
      usedRaces++
      if (best1 > best2) v1Wins++
      else if (best2 > best1) v2Wins++
      else ties++
    } catch (e) { /* skip */ }
  }
  return { v1Wins, v2Wins, ties, usedRaces }
}

/* ── بناء التقرير ────────────────────────────────────────────────────────── */
function fmt(s) {
  const n = s.n || 0
  return {
    n,
    p1: pctCI(s.p1 || 0, n),
    p2: pctCI(s.p2 || 0, n),
    p3: pctCI(s.p3 || 0, n),
    p4: pctCI(s.p4 || 0, n),
    p5: pctCI(s.p5 || 0, n),
    unorderedTop3: pctCI(s.unorderedTop3 || 0, n),
    top3Count: n ? (s.top3Count / n).toFixed(2) : '0.00',
    quatre: pctCI(s.quatre || 0, n),
    cinq: pctCI(s.cinq || 0, n),
    x: n ? (s.count / n).toFixed(2) : '0.00',
  }
}

function printTable(title, rows) {
  console.log('\n══', title, '══')
  const head = '               ' + ['n', 'P1', 'P2', 'P3', 'P4', 'P5', 'Top3-×', 'Top3n', '4/5', '5/5', 'x/5'].map((k) => String(k).padEnd(10)).join('')
  console.log(head)
  for (const [name, s] of rows) {
    const f = fmt(s)
    console.log(String(name).padEnd(15)
      + String(f.n).padEnd(10)
      + f.p1.padEnd(10) + f.p2.padEnd(10) + f.p3.padEnd(10) + f.p4.padEnd(10) + f.p5.padEnd(10)
      + f.unorderedTop3.padEnd(10) + f.top3Count.padEnd(10)
      + f.quatre.padEnd(10) + f.cinq.padEnd(10) + String(f.x).padEnd(10))
  }
}

async function main() {
  /* سنختار التخصصات المختبرة بقيم محددة */
  const disciplines = process.argv.slice(2)
  const DI = (disciplines.length ? disciplines : ['TOUS', 'ATTELÉ', 'PLAT', 'HAIE', 'STEEPLE'])
  for (const D of DI) {
    const filtered = races.filter((d) => D === 'TOUS' || normDiscipline(db[d]?.discipline) === D)
    console.log('\n' + '═'.repeat(70))
    console.log('التخصص:', D, '| السباقات التقييم:', filtered.length)
    /* V1 */
    const s1 = await runVariant('v1', V1, D, races, db)
    /* V2 full + variants */
    const v2Full = await runVariant('v2:full', V2, D, races, db)
    const v2OnlyP12 = await runVariant('v2:onlyP12', V2, D, races, db)
    const v2OnlyP13 = await runVariant('v2:onlyP13', V2, D, races, db)
    const v2OnlyP23 = await runVariant('v2:onlyP23', V2, D, races, db)
    const v2OnlyPaires = await runVariant('v2:onlyPaires', V2, D, races, db)
    const v2OnlyTrioSet = await runVariant('v2:onlyTrioSet', V2, D, races, db)
    const v2OnlyTrioOrder = await runVariant('v2:onlyTrioOrder', V2, D, races, db)
    const v2OnlyQuinte = await runVariant('v2:onlyQuinte', V2, D, races, db)
    const v2OnlyIndividuel = await runVariant('v2:onlyIndividuel', V2, D, races, db)
    const v2NoRelations = await runVariant('v2:noRelations', V2, D, races, db)
    const v2NoIndividuel = await runVariant('v2:noIndividuel', V2, D, races, db)
    /* عرض النتائج */
    const rows = [
      ['V1', s1],
      ['V2-full', v2Full],
      ['V2-onlyP12', v2OnlyP12],
      ['V2-onlyP13', v2OnlyP13],
      ['V2-onlyP23', v2OnlyP23],
      ['V2-onlyPaires', v2OnlyPaires],
      ['V2-onlyTrioSet', v2OnlyTrioSet],
      ['V2-onlyTrioOrd', v2OnlyTrioOrder],
      ['V2-onlyQuinte', v2OnlyQuinte],
      ['V2-onlyIndiv', v2OnlyIndividuel],
      ['V2-noRel', v2NoRelations],
      ['V2-noIndv', v2NoIndividuel],
    ]
    printTable('مقارنة التذاكر', rows)
    /* مناظرة لكل تذاكر n1..n5 مرتبًا */
    const pairedFull = await pairedComparison(db, D, 'v2:full')
    console.log('\nمناظرة V1 × V2-full (كل التذاكر): V1 فوز=', pairedFull.v1Wins, '| V2 فوز=', pairedFull.v2Wins, '| تعادل=', pairedFull.ties)
  }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
