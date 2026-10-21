/* =============================================================================
 * tools/g1-podium.mjs — LE GAGE : « si le vainqueur vient de P1-P4, alors le 2e
 *                       ou le 3e vient de G2, G3 ou G4 » (20/10/2026)
 *
 * On ne discute pas : on prend les 114 courses, on garde celles dont le
 * vainqueur est dans G1, et on regarde d'où viennent le 2e et le 3e.
 *
 *   node tools\g1-podium.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'
import { chargerEchantillon } from './experience-g5.mjs'

const P96 = chargerEchantillon('cotes').map((c) => ({
  date: c.date, synthese: c.synthese.map(Number), runners: c.runners.map(Number),
  arrivee: c.arrivee.slice(0, 5).map(Number),
}))

function corpus18() {
  const BRUT = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
  const TOUT = Array.isArray(BRUT) ? BRUT : Object.values(BRUT)
  const out = []
  for (const a of TOUT) {
    if (!a || !a.date || (a.arrivee || []).length < 5) continue
    const runners = (a.runners || []).map(Number).filter(Number.isFinite)
    const syn = (a.synthese || []).map(Number).filter(Number.isFinite)
    if (runners.length < 8 || syn.length < 10) continue
    out.push({ date: a.date, synthese: syn, runners, arrivee: (a.arrivee || []).map(Number).slice(0, 5) })
  }
  return out.sort((x, y) => x.date.localeCompare(y.date))
}

const G = (p) => (p <= 4 ? 'G1' : p <= 8 ? 'G2' : p <= 10 ? 'G3' : p <= 12 ? 'G4' : 'G5')

function test(nom, C, mode) {
  let n = 0, ok = 0
  const rates = []
  const parCas = {}
  for (const c of C) {
    const g = buildGrid(c.synthese, c.runners)
    const p = mode === 'slot' ? g.slotParNum : g.parNum
    const trois = c.arrivee.slice(0, 3)
    if (trois.length < 3) continue
    const ps = trois.map((x) => p[x])
    if (ps.some((x) => x == null)) continue
    if (ps[0] > 4) continue // le vainqueur doit venir de P1-P4
    n++
    const gros = [1, 2].map((i) => G(ps[i]))
    const bon = gros.some((x) => x === 'G2' || x === 'G3' || x === 'G4')
    if (bon) ok++
    else rates.push(c.date + ' → ' + trois.join('-') + ' (' + G(ps[0]) + ' ' + gros.join(' ') + ')')
    const cle = G(ps[0]) + ' / ' + gros.join('-')
    parCas[cle] = (parCas[cle] || 0) + 1
  }
  console.log('')
  console.log('  ════ ' + nom + ' (' + (mode === 'slot' ? 'cases P de la grille' : 'rangs de presse') + ') ════')
  console.log('  vainqueur dans P1-P4 : ' + n + ' courses')
  console.log('  gage TENU (2e ou 3e dans G2/G3/G4) : ' + ok + '/' + n + '  =  ' +
    (n ? (100 * ok / n).toFixed(1).replace('.', ',') : '—') + ' %')
  console.log('  gage FAUX : ' + rates.length + '/' + n + '  =  ' +
    (n ? (100 * rates.length / n).toFixed(1).replace('.', ',') : '—') + ' %')
  for (const r of rates) console.log('     ✘ ' + r)
  const tri = Object.entries(parCas).sort((x, y) => y[1] - x[1])
  console.log('  où vont le 2e et le 3e : ' + tri.map(([k, v]) => k + ' ×' + v).join(' · '))
  return { n, ok, rates }
}

console.log('')
console.log('  ╔══════════════════════════════════════════════════════════════════╗')
console.log('  ║  « SI LE VAINQUEUR VIENT DE P1-P4, LE 2e OU LE 3e VIENT DE      ║')
console.log('  ║   G2, G3 OU G4 » — vérifié sur les 114 courses                   ║')
console.log('  ╚══════════════════════════════════════════════════════════════════╝')
const a = test('P96 · 96 Quintés', P96, 'slot')
const b = test('R18 · 18 courses', corpus18(), 'slot')
console.log('')
console.log('  TOTAL 114 : ' + (a.ok + b.ok) + '/' + (a.n + b.n) + ' = ' +
  (100 * (a.ok + b.ok) / (a.n + b.n)).toFixed(1).replace('.', ',') + ' %')
console.log('')
