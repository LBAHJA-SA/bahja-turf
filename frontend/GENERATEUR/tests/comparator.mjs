/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/tests/comparator.mjs — مقارنة V1 و V2 (مُحكمة)
 * ════════════════════════════════════════════════════════════════════════ */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { normDiscipline } from '../synthese.js'
import { attributionSlots } from '../moteur.js'
import { genererMoteur as V1 } from '../moteur.js'
import { genererMoteur as V2 } from '../moteur-v2.js'
import { WEIGHTS_BY_PROFILE } from '../generation/classement.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.resolve(HERE, '..', '..', '..', 'data', 'synthese.json')

const db = JSON.parse(fs.readFileSync(DATA, 'utf8'))
const allDates = Object.keys(db).sort().filter((d) => Array.isArray(db[d]?.arrivee) && db[d].arrivee.length >= 5)

function getDatesForDisc(D) {
  return allDates.filter((d) => D === 'TOUS' || normDiscipline(db[d]?.discipline) === D)
}

/* ── فترة 95% (Wilson) ─────────────────────────────────────────────── */
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

/* ── EVAL ─────────────────────────────────────────────────────────────── */
function ordrer(e, ignoreBottom) {
  const slots = attributionSlots(e.synthese, e.runners)
  const ordreRaw = [
    ...(e.synthese || []).map((n) => ({ num: n, presse: true, slot: slots[n] })),
    ...((e.runners || []).filter((n) => !(e.synthese || []).includes(n)).sort((a, b) => a - b)).map((n) => ({ num: n, presse: false, slot: slots[n] })),
  ].filter((c) => c.slot != null)
  return { slots, ordreRaw }
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

function ignoredFor(ordreRaw, ignoreBottom) {
  if (!ignoreBottom || ignoreBottom <= 0) return []
  return ordreRaw.slice(-ignoreBottom).map((c) => c.num)
}

/* ── تنفيذ الحلين ─────────────────────────────────────────────────────── */
async function runVariant(label, D, datesFiltered, ignoreBottom, holdoutStart) {
  const outcomes = []
  /* فقط السباقات المطلوبة هي اختبارات (تخطَّ الأولى للتعلّق) */
  const testSet = holdoutStart ? datesFiltered.filter((d) => d >= holdoutStart) : datesFiltered.slice(2)
  for (const date of testSet) {
    const test = db[date]
    if (!test) continue
    const { ordreRaw } = ordrer(test, ignoreBottom)
    const ordre = ordreRaw
    const ignored = ignoredFor(ordreRaw, ignoreBottom)
    const training = {}
    for (const d of datesFiltered) {
      if (d >= date) break
      training[d] = db[d]
    }
    const lignes = { n1: { typed: [], cible: 5 }, n2: { typed: [], cible: 5 }, n3: { typed: [], cible: 5 }, n4: { typed: [], cible: 5 }, n5: { typed: [], cible: 5 } }
    try {
      let out
      if (label === 'v1') out = await V1({ ordre, discipline: D === 'TOUS' ? null : D, ignored, lignes, db: training })
      else {
        const opts = label.startsWith('v2:') ? { weights: WEIGHTS_BY_PROFILE[label.slice(3)] } : {}
        out = await V2({ ordre, discipline: D === 'TOUS' ? null : D, ignored, lignes, db, uptoDate: date, ...opts })
      }
      for (const id of ['n1', 'n2', 'n3', 'n4', 'n5']) {
        const t = out[id]
        if (!t || t.length !== 5) continue
        const ev = evaluerTicket(t, test.arrivee)
        outcomes.push({ ...ev, id })
      }
    } catch (e) { /* skip */ }
  }
  const n = outcomes.length
  const sum = (k) => outcomes.reduce((a, b) => a + (b[k] || 0), 0)
  return {
    n,
    p1: sum('p1'), p2: sum('p2'), p3: sum('p3'), p4: sum('p4'), p5: sum('p5'),
    unorderedTop3: sum('unorderedTop3'), top3Count: sum('top3Count'),
    quatre: sum('quatre'), cinq: sum('cinq'), count: sum('count'),
  }
}

/* ── المناظِر head vs head (وأ académico best-of-5) ─────────────────── */
async function pairedComparison(D, ordersFiltered, ignoreBottom, holdoutStart, label, mode) {
  const testSet = holdoutStart ? ordersFiltered.filter((d) => d >= holdoutStart) : ordersFiltered.slice(2)
  let v1Wins = 0, v2Wins = 0, ties = 0, usedRaces = 0
  const idx = ['n1', 'n2', 'n3', 'n4', 'n5']
  for (const date of testSet) {
    const test = db[date]
    if (!test) continue
    const { ordreRaw } = ordrer(test, ignoreBottom)
    const ordre = ordreRaw
    const ignored = ignoredFor(ordreRaw, ignoreBottom)
    const training = {}
    for (const d of ordersFiltered) {
      if (d >= date) break
      training[d] = db[d]
    }
    const lignes = { n1: { typed: [], cible: 5 }, n2: { typed: [], cible: 5 }, n3: { typed: [], cible: 5 }, n4: { typed: [], cible: 5 }, n5: { typed: [], cible: 5 } }
    try {
      const opts = label.startsWith('v2:') ? { weights: WEIGHTS_BY_PROFILE[label.slice(3)] } : {}
      const r1 = await V1({ ordre, discipline: D === 'TOUS' ? null : D, ignored, lignes, db: training })
      const r2 = await V2({ ordre, discipline: D === 'TOUS' ? null : D, ignored, lignes, db, uptoDate: date, ...opts })
      const arr = test.arrivee
      let score1, score2
      if (mode === 'head') {
        const t1 = r1['n1']; const t2 = r2['n1']
        if (!t1 || !t2 || t1.length !== 5 || t2.length !== 5) continue
        const s1 = new Set(t1), s2 = new Set(t2)
        score1 = arr.filter((n) => s1.has(n)).length
        score2 = arr.filter((n) => s2.has(n)).length
      } else {
        const c1 = Math.max(...idx.map((id) => r1[id] && r1[id].length === 5 ? arr.filter((n) => new Set(r1[id]).has(n)).length : -1))
        const c2 = Math.max(...idx.map((id) => r2[id] && r2[id].length === 5 ? arr.filter((n) => new Set(r2[id]).has(n)).length : -1))
        if (c1 < 0 || c2 < 0) continue
        score1 = c1; score2 = c2
      }
      usedRaces++
      if (score1 > score2) v1Wins++
      else if (score2 > score1) v2Wins++
      else ties++
    } catch (e) { /* skip */ }
  }
  return { v1Wins, v2Wins, ties, usedRaces }
}

/* ── التقرير ──────────────────────────────────────────────────────────── */
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

function parseArgs(argv) {
  const a = { discs: null, ignoreBottom: 2, holdoutStart: null, nStart: 2, mode: 'head' }
  for (const arg of argv) {
    if (arg.startsWith('disc=')) a.discs = arg.slice(5).split(',')
    else if (arg.startsWith('ignoreBottom=')) a.ignoreBottom = parseInt(arg.slice(13), 10) || 0
    else if (arg.startsWith('holdoutStart=')) a.holdoutStart = arg.slice(13)
    else if (arg.startsWith('mode=')) a.mode = arg.slice(5)
  }
  return a
}

async function main() {
  const { discs, ignoreBottom, holdoutStart, mode } = parseArgs(process.argv.slice(2))
  const disciplines = discs || ['TOUS', 'ATTELÉ', 'PLAT', 'HAIE']

  console.log('ignoreBottom:', ignoreBottom, '| holdoutStart:', holdoutStart || '(كل السباقات، المعروض من i>=2)', '| mode:', mode)

  const variants = ['v1', 'v2:full', 'v2:onlyP12', 'v2:onlyP13', 'v2:onlyP23', 'v2:onlyPaires', 'v2:onlyTrioSet', 'v2:onlyTrioOrder', 'v2:onlyQuinte', 'v2:onlyIndividuel', 'v2:noRelations', 'v2:noIndividuel']
  const variantsPaired = ['v2:full', 'v2:onlyP12', 'v2:onlyPaires', 'v2:onlyTrioSet', 'v2:onlyTrioOrder']

  for (const D of disciplines) {
    const orders = getDatesForDisc(D)
    const visibleCount = holdoutStart ? orders.filter((d) => d >= holdoutStart).length : orders.length
    console.log('\n' + '═'.repeat(70))
    console.log('التخصص:', D, '| السباقات للتقييم:', visibleCount)

    const variantResults = {}
    for (const v of variants) {
      const r = await runVariant(v, D, orders, ignoreBottom, holdoutStart)
      variantResults[v] = r
    }

    const rows = variants.map((v) => [v, variantResults[v]])
    printTable('جدول المقارنة — بعد تطبيق ignored=' + ignoreBottom, rows)

    /* مناظرات */
    for (const v of variantsPaired) {
      const p = await pairedComparison(D, orders, ignoreBottom, holdoutStart, v, mode)
      console.log('  مناظرة — V1 × ' + v + ': V1 فوز=', p.v1Wins, '| V2 فوز=', p.v2Wins, '| تعادل=', p.ties, '| مستخدمة=', p.usedRaces)
    }
  }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
