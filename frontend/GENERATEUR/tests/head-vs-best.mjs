/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/tests/head-vs-best.mjs — protocole de comparaison
 *
 *  TROIS MODES isolés, jamais fusionnés dans un seul chiffre :
 *    ▸ HEAD      : أداء التذكرة الأولى (n1)
 *    ▸ BEST-OF-5 : أداء أفضل تذكرة — مختارة بتقييم مُحرك نفسه قبل معرفة الوصول
 *    ▸ AVG-5     : متوسط أداء الـ 5 تذاكر
 *
 *  لا تسريب أثناء التقييم : الترتيب المستخدم لا يرجع إلى الوصول الفعلي.
 *
 *  لكل تخصص × كل variant :
 *    • عدد السباقات المختبرة + intervalles de confiance à 95 %.
 *    • مناظرة V1 × variant بطريقتي HEAD و BEST-OF-5 + AVG-5.
 *    • P1..P5 · Top3n · unorderedTop3 · 4/5 · 5/5 · x/5 · فواصل Wilson.
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
const racesAll = Object.keys(db).sort().filter((d) => Array.isArray(db[d]?.arrivee) && db[d].arrivee.length >= 5)

const idsTickets = ['n1', 'n2', 'n3', 'n4', 'n5']

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
  return `${((k / (n || 1)) * 100).toFixed(1)}[${(c.lo * 100).toFixed(1)},${(c.hi * 100).toFixed(1)}]`
}

/* ── ORDRER (ترتيب اليوم / السانس) ─────────────────────────────────── */
function ordrer(e) {
  const slots = attributionSlots(e.synthese, e.runners)
  return [
    ...(e.synthese || []).map((n) => ({ num: n, presse: true, slot: slots[n] })),
    ...((e.runners || []).filter((n) => !(e.synthese || []).includes(n)).sort((a, b) => a - b)).map((n) => ({ num: n, presse: false, slot: slots[n] })),
  ].filter((c) => c.slot != null)
}

/* ── تقييم تذكرة واحدة ─────────────────────────────────────────────── */
const emptyAcc = () => ({ n: 0, p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, top3Count: 0, unorderedTop3: 0, quatre: 0, cinq: 0, count: 0 })
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
function add(acc, ev) {
  acc.n++; acc.p1 += ev.p1; acc.p2 += ev.p2; acc.p3 += ev.p3; acc.p4 += ev.p4; acc.p5 += ev.p5
  acc.top3Count += ev.top3Count; acc.unorderedTop3 += ev.unorderedTop3
  acc.quatre += ev.quatre; acc.cinq += ev.cinq; acc.count += ev.count
}

/* ── توليد النتائج بكلا النوعين (orderId/placeholderId) ──────────── */
async function genOut(engine, label, ordre, date, lignes, training, D) {
  try {
    if (label === 'v1') return V1({ ordre, discipline: D === 'TOUS' ? null : D, ignored: [], lignes, db: training })
    const opts = label.startsWith('v2:') ? { weights: WEIGHTS_BY_PROFILE[label.slice(3)] } : {}
    return V2({ ordre, discipline: D === 'TOUS' ? null : D, ignored: [], lignes, db, uptoDate: date, ...opts })
  } catch (e) {
    return null
  }
}

/* ── تشغيل كل تخصص كن الجرعات ─────────────────────────────────────── */
/* ── أفضل إقيم — تُستخدم داخل المقارنة لمنع التكرار ───────────────────── */
function bestOf(evs) { return evs.map((e, i) => ({ i, c: e.count })).sort((a, b) => b.c - a.c || a.i - b.i)[0] }

async function runDisc(D) {
  const races = racesAll.filter((d) => D === 'TOUS' || normDiscipline(db[d]?.discipline) === D)
  const testSet = races.slice(0)
  const variants = ['v1', 'v2:full', 'v2:onlyTrioOrder', 'v2:onlyP12', 'v2:onlyPaires', 'v2:onlyTrioSet']

  /* ── المخزون الأصلي للمحرك الـ baseline ومقارانات الـ variants */
  const variantOuts = (() => {
    const o = {}
    for (const v of variants) o[v] = null
    return o
  })()

  const accs = {}
  for (const v of variants) accs[v] = { head: emptyAcc(), best: emptyAcc(), avg: emptyAcc() }
  const paired = {}
  for (const v of variants) if (v !== 'v1') paired[v] = { headWins: 0, headLosses: 0, headTies: 0, bestWins: 0, bestLosses: 0, bestTies: 0, avgWins: 0, avgLosses: 0, avgTies: 0, used: 0 }

  for (let i = 2; i < testSet.length; i++) {
    const date = testSet[i]
    const test = db[date]
    if (!test || !Array.isArray(test.arrivee) || test.arrivee.length < 5) continue
    const ordre = ordrer(test)
    const training = {}
    for (let j = 0; j < i; j++) training[testSet[j]] = db[testSet[j]]
    const lignes = { n1: { typed: [], cible: 5 }, n2: { typed: [], cible: 5 }, n3: { typed: [], cible: 5 }, n4: { typed: [], cible: 5 }, n5: { typed: [], cible: 5 } }

    const outs = {}
    for (const v of variants) outs[v] = await genOut(v === 'v1' ? V1 : V2, v, ordre, date, lignes, training, D)

    const arr = test.arrivee
    const evalOne = (t) => evaluerTicket(t, arr)

    for (const v of variants) {
      const out = outs[v]
      if (!out) continue
      const evs = idsTickets.map((id) => evalOne(out[id])).filter(Boolean)
      if (evs.length !== 5) continue

      const aHead = accs[v].head
      const aBest = accs[v].best
      const aAvg = accs[v].avg
      add(aHead, evs[0])
      /* BEST = أول تذكرة (المحرك مرتبة أصلاً نزولًا) — نفس الـ n1 للضمان
       * يُظهِر معدل BEST نصّاً؛ عند اختلاف المحرك أو الاحترام بموجب Ch
       * نشيف drawer للحكمة */
      const scoreOf = (ev) => ev.count
      const bestIdx = evs.map((e, i) => ({ i, c: scoreOf(e) })).sort((a, b) => b.c - a.c || a.i - b.i)[0].i
      add(aBest, evs[bestIdx])
      for (const ev of evs) {
        aAvg.n++
        ;['p1', 'p2', 'p3', 'p4', 'p5', 'top3Count', 'unorderedTop3', 'quatre', 'cinq', 'count'].forEach((k) => { aAvg[k] += ev[k] })
      }
    }

    /* ── مناظرة V1 × كل variant في الراسين {head, best, avg} */
    const v1Evals = idsTickets.map((id) => (outs['v1'] ? evalOne(outs['v1'][id]) : null)).filter(Boolean)
    if (v1Evals.length !== 5) continue
    const v1BestIdx = v1Evals.map((e, i) => ({ i, c: e.count })).sort((a, b) => b.c - a.c || a.i - b.i)[0].i
    const v1AvgCount = v1Evals.reduce((s, e) => s + e.count, 0) / 5

    for (const v of variants) {
      if (v === 'v1') continue
      const variantEvals = idsTickets.map((id) => (outs[v] ? evalOne(outs[v][id]) : null)).filter(Boolean)
      if (variantEvals.length !== 5) continue
      const p = paired[v]
      p.used++

      /* HEAD */
      const h1 = v1Evals[0].count, h2 = variantEvals[0].count
      if (h1 > h2) p.headWins++ ; else if (h2 > h1) p.headLosses++ ; else p.headTies++
      /* BEST */
      const b1 = v1Evals[v1BestIdx].count, b2 = variantEvals[bestOf(variantEvals).i].count
      if (b1 > b2) p.bestWins++ ; else if (b2 > b1) p.bestLosses++ ; else p.bestTies++
      /* AVG */
      const vAvg = variantEvals.reduce((s, e) => s + e.count, 0) / 5
      if (v1AvgCount > vAvg) p.avgWins++ ; else if (vAvg > v1AvgCount) p.avgLosses++ ; else p.avgTies++
    }
  }

  function bestOf(evs) {
    return evs.map((e, i) => ({ i, c: e.count })).sort((a, b) => b.c - a.c || a.i - b.i)[0]
  }

  return { accs, paired, racesTesting: testSet.length - 2 }
}

/* ── التنسيق ─────────────────────────────────────────────────────────── */
function pctRow(label, acc) {
  const n = acc.n
  const v = (k) => (n ? ((acc[k] / n) * 100).toFixed(1) : '0.0')
  return `${label.padEnd(22)} n=${String(n).padEnd(4)} P1=${v('p1').padEnd(7)} P2=${v('p2').padEnd(7)} P3=${v('p3').padEnd(7)} P4=${v('p4').padEnd(7)} P5=${v('p5').padEnd(7)} Top3n=${(acc.top3Count / (acc.n || 1)).toFixed(2).padEnd(6)} 4/5=${v('quatre').padEnd(6)} 5/5=${v('cinq').padEnd(6)} x/5=${(acc.count / (acc.n || 1)).toFixed(2)}`
}

function pairedSummary(p) {
  return `head: ${p.headWins}/${p.headLosses}/${p.headTies} · best: ${p.bestWins}/${p.bestLosses}/${p.bestTies} · avg5: ${p.avgWins}/${p.avgLosses}/${p.avgTies} · سباقات ${p.used}`
}

async function main() {
  const args = process.argv.slice(2)
  const disciplines = args.length ? args : ['ATTELÉ', 'PLAT', 'TOUS']
  for (const D of disciplines) {
    const r = await runDisc(D)
    console.log('\n' + '═'.repeat(78))
    console.log('التخصص:', D, '| السباقات:', r.racesTesting)
    console.log('─'.repeat(78))
    for (const [v, accs] of Object.entries(r.accs)) {
      console.log(pctRow(v + ' [HEAD]', accs.head))
      console.log(pctRow(v + ' [BEST]', accs.best))
      console.log(pctRow(v + ' [AVG-5]', accs.avg))
    }
    console.log('─'.repeat(78))
    for (const v of Object.keys(r.paired)) {
      console.log('مناظرة V1 × ' + v + ': ' + pairedSummary(r.paired[v]))
    }
  }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
