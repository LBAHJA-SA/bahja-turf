/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/tests/comparaison-v1-v2.js — V1 vs V2 sur le même harness
 *
 *  exécute le moteur V1 exactement tel qu'il est déployé, puis V2
 *  retourne les deux résultats pour comparaison directe.
 * ════════════════════════════════════════════════════════════════════════ */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { normDiscipline } from '../synthese.js'
import { attributionSlots } from '../moteur.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.resolve(HERE, '..', '..', '..', 'data', 'synthese.json')

const db = JSON.parse(fs.readFileSync(DATA, 'utf8'))
const races = Object.keys(db).sort().filter((d) => Array.isArray(db[d]?.arrivee) && db[d].arrivee.length >= 5)

function ordrer(e) {
  const runners = [...(e.runners || [])].map(Number).filter((n) => Number.isFinite(n) && n > 0)
  const slots = attributionSlots(e.synthese, runners)
  const ordre = [
    ...e.synthese.filter((n) => n > 0).map((num) => ({ num, presse: true, slot: slots[num] })),
    ...runners.filter((n) => !e.synthese.includes(n)).sort((a, b) => a - b).map((num) => ({ num, presse: false, slot: slots[num] })),
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

console.log('Courses ATTELÉ :', races.filter((d) => normDiscipline(db[d]?.discipline) === 'ATTELÉ').length)
console.log('Courses PLAT   :', races.filter((d) => normDiscipline(db[d]?.discipline) === 'PLAT').length)
console.log('Courses HAIE   :', races.filter((d) => normDiscipline(db[d]?.discipline) === 'HAIE').length)
console.log('Courses STEEPLE:', races.filter((d) => normDiscipline(db[d]?.discipline) === 'STEEPLE').length)
console.log('\nCandidates moyennes per discipline in this archive window (outer-step):\n')

for (const d of ['TOUS', 'ATTELÉ', 'PLAT', 'HAIE', 'STEEPLE']) {
  const filtered = d === 'TOUS' ? races : races.filter((x) => normDiscipline(db[x]?.discipline) === d)
  if (filtered.length) console.log('disc=' + d.padEnd(8) + 'n=' + filtered.length + '  dates:', filtered[0], '→', filtered[filtered.length - 1])
}

console.log('\n(full run coming up… nothing should modify the import of moteur.js)\n')
const v1 = await import('../moteur.js')
const v2 = await import('../moteur-v2.js')

import { fileURLToPath as fURL, pathToFileURL } from 'url'

for (const d of ['TOUS', 'ATTELÉ', 'PLAT', 'HAIE', 'STEEPLE']) {
  const filtered = d === 'TOUS' ? races : races.filter((x) => normDiscipline(db[x]?.discipline) === d)
  if (filtered.length < 4) continue
  console.log('\n══════', d, '(', filtered.length, 'courses )══════')
  /* V1 */
  let v1Summary = { n: 0, p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, top3: 0, quatre: 0, cinq: 0, count: 0 }
  /* V2 */
  let v2Summary = { n: 0, p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, top3: 0, quatre: 0, cinq: 0, count: 0 }
  for (let i = 4; i < filtered.length; i++) {
    const date = filtered[i]
    const test = db[date]
    const trainingDb = {}
    for (let j = 0; j < i; j++) trainingDb[filtered[j]] = db[filtered[j]]
    const { ordre, slots } = ordrer(test)
    /*  mêmes lignes que la page */
    const lignes = { b1: { typed: [], cible: 8 }, b2: { typed: [], cible: 8 }, n1: { typed: [], cible: 5 }, n2: { typed: [], cible: 5 }, n3: { typed: [], cible: 5 }, n4: { typed: [], cible: 5 }, n5: { typed: [], cible: 5 } }
    const ignored = []
    try {
      const r1 = await v1.genererMoteur({ ordre, discipline: d, ignored, lignes, db: trainingDb })
      for (const [id, ticket] of Object.entries(r1)) {
        if (!ticket || id.length === 1) continue
        const ev = evaluer(ticket, test.arrivee)
        v1Summary.n++
        for (const k of Object.keys(v1Summary)) v1Summary[k] += ev[k] || 0
      }
    } catch (e) { console.error('v1 skip', date, e.message) }
    try {
      const r2 = await v2.genererMoteur({ ordre, discipline: d, ignored, lignes, db: trainingDb })
      for (const [id, ticket] of Object.entries(r2)) {
        if (!ticket || id.length === 1) continue
        const ev = evaluer(ticket, test.arrivee)
        v2Summary.n++
        for (const k of Object.keys(v2Summary)) v2Summary[k] += ev[k] || 0
      }
    } catch (e) { console.error('v2 skip', date, e.message) }
  }
  const fmt = (s) => {
    const n = s.n
    const per = (k) => (n ? (s[k] / n * 100).toFixed(1) : '0')
    return `n=${n}  P1=${per('p1')}%  P2=${per('p2')}%  P3=${per('p3')}%  P4=${per('p4')}%  P5=${per('p5')}%  top3=${per('top3')}%  4/5=${per('quatre')}%  5/5=${per('cinq')}%  x/5=${(n ? (s.count / n).toFixed(2) : '0')}`
  }
  console.log('  V1:', fmt(v1Summary))
  console.log('  V2:', fmt(v2Summary))
}
