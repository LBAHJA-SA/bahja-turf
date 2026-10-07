/**
 * LEÇON — un seul Quinté, expliqué Cheval par cheval.
 * Rien que du visuel : la grille, les cases, les 7 chevaux choisis, l'arrivée.
 *
 *   node tools\lecon.mjs
 */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const mes = JSON.parse(fs.readFileSync('data/mesure.json', 'utf8'))

const CFGS = [
  { q: [3, 2, 1, 1, 1], nom: '3-2-1-1-1  (8 chevaux)', regle: 'cote + 1 surprise' },
  { q: [3, 2, 1, 0, 1], nom: '3-2-1-0-1  (7 chevaux)', regle: 'cote + 1 surprise' },
]
const nbKo = (x) => (x?.filtres || []).filter((v) => !v).length

for (const d of Object.keys(db).sort()) {
  const r = db[d]
  if (!r.arrivee?.length || !mes[d]?.cotes) continue
  const g = buildGrid(r.synthese, r.runners)
  const sc = Object.fromEntries((r.scores || []).map((x) => [x.num, x]))
  const co = Object.fromEntries(mes[d].cotes.map((x) => [x.num, x]))

  console.log('\n' + '#'.repeat(96))
  console.log(`  ${d}   ${mes[d].hippodrome}   ${r.distance} m   arrivée = 15 3 14 1 9`.replace('arrivée = 15 3 14 1 9', `arrivée (du 1er au 5e) = ${r.arrivee.slice(0, 5).join('  ')}`))
  console.log('#'.repeat(96))
  console.log('\n  LA GRILLE — la presse (Synthèse) a classé les chevaux. Chaque case = 1 cheval.\n')
  for (const b of g.groupes) {
    const ligne = b.cases.map((c) => {
      const cote = co[c.num]?.cote ?? '?'
      return `P${c.slot + 1} n°${String(c.num).padStart(2)} (${String(cote).padStart(5)})`
    }).join('   ')
    console.log(`  ${b.id}  ${ligne}`)
  }

  for (const cfg of CFGS) {
    console.log('\n  ' + '─'.repeat(88))
    console.log(`  ${cfg.nom}   —   ${cfg.regle}`)
    console.log('  ' + '─'.repeat(88))
    const ticket = []
    const lignes = []
    for (let i = 0; i < g.groupes.length; i++) {
      const b = g.groupes[i]
      const q = Math.min(cfg.q[i], b.cases.length)
      const t = b.cases
        .map((c) => ({ num: c.num, slot: c.slot, cote: co[c.num]?.cote ?? 999, ko: nbKo(sc[c.num]) }))
        .sort((a, z) => (cfg.regle.startsWith('3/3') ? (a.ko - z.ko) || (a.cote - z.cote) : a.cote - z.cote))
      const pris = t.slice(0, q)
      // ⚠ EXACTEMENT la règle de tools/surprise.mjs :
      //   on garde (q-1) des meilleurs par cote, et dans la case surprise
      //   on met celui des ÉCARTÉS que la PRESSE classe le plus bas.
      if (cfg.regle.includes('surprise') && q >= 2 && t.length > q) {
        pris.pop()
        pris.push(t.slice(q).reduce((a, z) => (z.slot > a.slot ? z : a)))
      }
      ticket.push(...pris.map((x) => x.num))
      const txt = pris.map((x) => `n°${String(x.num).padStart(2)}`).join(' ')
      const etoile = pris.some((x) => t.slice(0, q - 1).every((y) => y.num !== x.num))
      lignes.push(`    ${b.id} : on prend ${q}  →  ${txt || '(rien)'}${etoile ? '     ★ = la case surprise' : ''}`)
    }
    lignes.forEach((l) => console.log(l))
    const uniq = [...new Set(ticket)]
    console.log(`\n    LE TICKET (${uniq.length} chevaux) :  ${uniq.join('  ')}`)
    console.log(`    L'ARRIVÉE                   :  ${r.arrivee.slice(0, 5).join('  ')}`)
    const dedans = r.arrivee.slice(0, 5).filter((n) => uniq.includes(n))
    const dehors = r.arrivee.slice(0, 5).filter((n) => !uniq.includes(n))
    console.log(`    → sur 5 engagés, on en a ${dedans.length}`
      + (dedans.length === 5 ? '   ★★★★★  5/5' : '   et on a laissé dehors : ' + dehors.join(' ')))
    console.log('')
  }
}
