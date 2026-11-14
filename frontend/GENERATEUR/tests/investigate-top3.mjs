/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/tests/investigate-top3.mjs — لماذا يخسر V2 في top3؟
 *
 *  Walk-Forward يقارن top3 بين V1 و V2 ميدانية للتحقق ترتيبهما، لتحديد ما يحدث.
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
  return [
    ...e.synthese.map((num) => ({ num, presse: true, slot: slots[num] })),
    ...e.runners.filter((n) => !e.synthese.includes(n)).sort((a, b) => a - b).map((num) => ({ num, presse: false, slot: slots[num] })),
  ].filter((c) => c.slot != null)
}

function evaluerTop3(ticket, arrivee) {
  const set = new Set(ticket)
  const tres = [arrivee[0], arrivee[1], arrivee[2]]
  const hit = tres.filter((n) => set.has(n)).length
  return hit
}

async function main() {
  for (const disc of ['ATTELÉ', 'PLAT', 'TOUS']) {
    const filtered = races.filter((d) => disc === 'TOUS' || normDiscipline(db[d]?.discipline) === disc)
    if (filtered.length < 3) continue
    console.log('\n═══════════════════', disc, '═══════════════════')
    let v1TrioTotal = 0, v2TrioTotal = 0, v1Count = 0, v2Count = 0
    for (let i = 2; i < filtered.length; i++) {
      const date = filtered[i]
      const test = db[date]
      const ordre = ordrer(test)
      const training = {}
      for (let j = 0; j < i; j++) training[filtered[j]] = db[filtered[j]]
      const lignes = { n1: { typed: [], cible: 5 }, n2: { typed: [], cible: 5 }, n3: { typed: [], cible: 5 }, n4: { typed: [], cible: 5 }, n5: { typed: [], cible: 5 } }
      const ignored = []
      try {
        const r1 = await genererV1({ ordre, discipline: disc === 'TOUS' ? null : disc, ignored, lignes, db: training })
        for (const id of ['n1', 'n2', 'n3', 'n4', 'n5']) { const t = r1[id]; if (t && t.length === 5) { v1TrioTotal += evaluerTop3(t, test.arrivee); v1Count++ } }
      } catch (e) {}
      try {
        const r2 = await genererMoteur({ ordre, discipline: disc === 'TOUS' ? null : disc, ignored, lignes, db, uptoDate: date })
        const sum2 = (t) => (t ? evaluerTop3(t, test.arrivee) : -1)
        for (const id of ['n1', 'n2', 'n3', 'n4', 'n5']) {
          const t = r2[id]
          if (t && t.length === 5) { v2TrioTotal += evaluerTop3(t, test.arrivee); v2Count++ }
        }
      } catch (e) { console.error('v2 error:', e.message) }
    }
    console.log('  v1 x/3 pour 5 tickets:', v1TrioTotal, '(' + (v1TrioTotal / (v1Count || 1)).toFixed(2) + ' / 3)')
    console.log('  v2 x/3 pour 5 tickets:', v2TrioTotal, '(' + (v2TrioTotal / (v2Count || 1)).toFixed(2) + ' / 3)')
  }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) { main() }
