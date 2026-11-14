/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/tests/walk-forward.js — بوابة V2 الحقيقية
 *
 *  Walk-Forward فوق الأرشيف الكامل بترتيب الحفظ، لا تُسرب أي نتيجة من
 *  السباق المختبَر أو آخره:
 *   • تُدرّس V2 على السباقات السابقة للسباق الموقوف فقط.
 *   • تُقاس التذاكر على الوصول الحقيقي بعد السباق.
 *   • تُفصَّل النتائج حسب التخصص.
 * ════════════════════════════════════════════════════════════════════════ */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { normDiscipline } from '../synthese.js'
import { attributionSlots } from '../moteur.js'
import { genererMoteur } from '../moteur-v2.js'
import { genererMoteur as genererV1 } from '../moteur.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.resolve(HERE, '..', '..', '..', 'data', 'synthese.json')

const db = JSON.parse(fs.readFileSync(DATA, 'utf8'))
const races = Object.keys(db).sort().filter((d) => Array.isArray(db[d]?.arrivee) && db[d].arrivee.length >= 5)

function ordrer(e) {
  const slots = attributionSlots(e.synthese, e.runners)
  const ordre = [
    ...e.synthese.map((num) => ({ num, presse: true, slot: slots[num] })),
    ...e.runners.filter((n) => !e.synthese.includes(n)).sort((a, b) => a - b).map((num) => ({ num, presse: false, slot: slots[num] })),
  ].filter((c) => c.slot != null)
  return { slots, ordre }
}

function evaluer(ticket, arrivee) {
  const set = new Set(ticket)
  const count = arrivee.filter((n) => set.has(n)).length
  return {
    p1: set.has(arrivee[0]) ? 1 : 0,
    p2: set.has(arrivee[1]) ? 1 : 0,
    p3: set.has(arrivee[2]) ? 1 : 0,
    p4: set.has(arrivee[3]) ? 1 : 0,
    p5: set.has(arrivee[4]) ? 1 : 0,
    top3: [arrivee[0], arrivee[1], arrivee[2]].every((n) => set.has(n)) ? 1 : 0,
    quatre: count >= 4 ? 1 : 0,
    cinq: count === 5 ? 1 : 0,
    count,
  }
}

function printResult(engine, disc, r, counts) {
  const c = counts[disc]
  if (!c) return
  const n = c.n
  const per = (k) => (n ? (c[k] / n * 100).toFixed(1) : '-')
  console.log(`  ${engine.padEnd(4)} n=${n}  P1=${per('p1')}%  P2=${per('p2')}%  P3=${per('p3')}%  P4=${per('p4')}%  P5=${per('p5')}%  top3=${per('top3')}%  4/5=${per('quatre')}%  5/5=${per('cinq')}%  x/5=${n ? (c.count/n).toFixed(2) : '0'}`)
}

/**
 * Walk-forward كاملة — كل تخصص على حدة، ثم TOUS.
 * القاعدة : تُدرّس V1/V2 على كل السباقات السابقة لتاريخ السباق المختبر فقط.
 */
export async function walkForward(db, disciplines, opts = {}) {
  const racesAsc = Object.keys(db).sort()
  const results = {}
  for (const discipline of disciplines) {
    const disc = discipline
    const filtered = racesAsc.filter((d) => !Array.isArray(db[d]?.arrivee) || db[d].arrivee.length < 5 ? false : (disc === 'TOUS' || normDiscipline(db[d]?.discipline) === disc))
    if (filtered.length < 4) continue
    const v1 = { n: 0, p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, top3: 0, quatre: 0, cinq: 0, count: 0 }
    const v2 = { n: 0, p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, top3: 0, quatre: 0, cinq: 0, count: 0 }
    for (let i = 2; i < filtered.length; i++) {
      const date = filtered[i]
      const test = db[date]
      const { ordre, slots } = ordrer(test)
      const lignes = { b1: { typed: [], cible: 8 }, b2: { typed: [], cible: 8 }, n1: { typed: [], cible: 5 }, n2: { typed: [], cible: 5 }, n3: { typed: [], cible: 5 }, n4: { typed: [], cible: 5 }, n5: { typed: [], cible: 5 } }
      /* Sweep 1 : V1 — تمرير كامل للأرشيف (نموذج V1 يحتاج الخانات بأكملها) */
      const training = {}
      for (let j = 0; j < i; j++) training[filtered[j]] = db[filtered[j]]
      const ignored = []
      try {
        const r1 = await genererV1({ ordre, discipline: disc === 'TOUS' ? null : disc, ignored, lignes, db: training })
        for (const id of ['b1', 'b2', 'n1', 'n2', 'n3', 'n4', 'n5']) {
          const ticket = r1[id]
          if (!ticket || !ticket.length) continue
          const ev = evaluer(ticket, test.arrivee)
          v1.n++
          v1.p1 += ev.p1; v1.p2 += ev.p2; v1.p3 += ev.p3; v1.p4 += ev.p4; v1.p5 += ev.p5
          v1.top3 += ev.top3; v1.quatre += ev.quatre; v1.cinq += ev.cinq; v1.count += ev.count
        }
      } catch (e) { console.error('v1 fail', date, e.message) }
      /* Sweep 2 : V2 — مع uptoDate لمنع التسرب */
      try {
        const r2 = await genererMoteur({ ordre, discipline: disc === 'TOUS' ? null : disc, ignored, lignes, db, uptoDate: date })
        for (const id of ['b1', 'b2', 'n1', 'n2', 'n3', 'n4', 'n5']) {
          const ticket = r2[id]
          if (!ticket || !ticket.length) continue
          const ev = evaluer(ticket, test.arrivee)
          v2.n++
          v2.p1 += ev.p1; v2.p2 += ev.p2; v2.p3 += ev.p3; v2.p4 += ev.p4; v2.p5 += ev.p5
          v2.top3 += ev.top3; v2.quatre += ev.quatre; v2.cinq += ev.cinq; v2.count += ev.count
        }
      } catch (e) { console.error('v2 fail', date, e.message) }
    }
    results[disc] = { v1, v2 }
  }
  return results
}

async function main() {
  const disciplines = process.argv.slice(2).filter(Boolean)
  if (!disciplines.length) disciplines.push('TOUS', 'ATTELÉ', 'PLAT', 'HAIE', 'STEEPLE')
  const results = await walkForward(db, disciplines)
  for (const disc of Object.keys(results)) {
    const { v1, v2 } = results[disc]
    console.log('\n══', disc, '══')
    const print = (name, s) => {
      const n = s.n
      const per = (k) => (n ? (s[k] / n * 100).toFixed(1) : '0')
      const x = n ? (s.count / n).toFixed(2) : '0'
      console.log(`  ${name.padEnd(4)} n=${n}  P1=${per('p1')}%  P2=${per('p2')}%  P3=${per('p3')}%  P4=${per('p4')}%  P5=${per('p5')}%  top3=${per('top3')}%  4/5=${per('quatre')}%  5/5=${per('cinq')}%  x/5=${x}`)
    }
    print('V1', v1)
    print('V2', v2)
  }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
