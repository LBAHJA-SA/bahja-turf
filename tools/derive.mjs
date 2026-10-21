/* =============================================================================
 * tools/derive.mjs — LA DÉRIVE DE LA COTE (20/10/2026)
 *
 * « Le moteur reste aveugle » : vrai. 4-2-1-1-0 ne fait qu'éviter le choix le
 * plus cher, il ne fait pas VOIR qui arrive. Pour voir, il faut un signal que
 * la presse n'a pas.
 *
 * Le seul jamais mesuré est là, dans `data/quintes.json`, pour 279 courses :
 *
 *      ouverture  →  cote finale
 *
 *   un cheval qui RACCOURCIT est joué (l'argent arrive sur lui)
 *   un cheval qui S'ALLONGE est lâché
 *
 * Ce n'est pas le niveau de la cote (déjà mesuré, « marche »), c'est sa
 * DIRECTION — l'information que le rang de presse ne contient pas.
 *
 * Signaux testés, sur la vraie grille et les 96 Quintés à presse réelle :
 *   derive     = cote / ouverture          (petit = raccourcit = joué)
 *   deriveRel  = idem, centré sur le bloc  (le mouvement RELATIF aux autres)
 *   ouverture  = la cote d'ouverture       (petit = attendu)
 *
 *   node tools\derive.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)

const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))

const C = []
for (const q of TOUT) {
  const cotes = q.cotes, ouv = q.ouverture
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  /* il faut l'ouverture pour TOUS les partants du bloc, sinon pas de tri partiel */
  if (!ouv || nums.some((n) => !(ouv[n] > 1))) continue
  const grille = buildGrid(syn, nums)
  const parN = {}
  for (const n of nums) {
    parN[n] = { carnet: syn.indexOf(n), marche: cotes[n], derive: cotes[n] / ouv[n], ouverture: ouv[n] }
  }
  /* mouvement relatif au bloc : le ratio moins la moyenne du bloc */
  for (const g of grille.groupes) {
    const bloc = g.cases.map((x) => x.num)
    if (!bloc.length) continue
    const moy = bloc.reduce((s, n) => s + parN[n].derive, 0) / bloc.length
    bloc.forEach((n) => { parN[n].deriveRel = parN[n].derive - moy })
  }
  C.push({ q, grille, parN, bloc: grille.groupes.map((g) => g.cases.map((x) => x.num)) })
}

const SIG = ['carnet', 'marche', 'ouverture', 'derive', 'deriveRel']
/* +1 = le plus PETIT est le meilleur · −1 = le plus GRAND */
const MEILLEUR = { carnet: 1, marche: 1, ouverture: 1, derive: 1, deriveRel: 1 }

console.log('')
console.log('  LA DÉRIVE DE LA COTE — ' + C.length + ' Quintés (ouverture + arrivée + presse)')
console.log('  BASE = chaque cheval du bloc arrive dans les 5 · SORTI = le jeté arrive')
console.log('')

const QUOTAS_AVANT = [3, 3, 1, 1, 0]
for (let b = 0; b < 4; b++) {
  const noms = ['G1', 'G2', 'G3', 'G4']
  let nBase = 0, tot = 0, nOracle = 0
  const stats = {}
  for (const k of C) {
    const bloc = k.bloc[b]
    if (bloc.length < 2) continue
    const a = k.q.arrivee.slice(0, 5)
    const q = Math.min(QUOTAS_AVANT[b], bloc.length)
    tot += bloc.length
    nBase += bloc.filter((x) => a.includes(x)).length
    if (bloc.filter((x) => a.includes(x)).length === bloc.length) nOracle++
    for (const sig of SIG) {
      if (bloc.some((x) => k.parN[x]?.[sig] == null)) continue
      const tri = bloc.slice().sort((x, y) => MEILLEUR[sig] * (k.parN[x][sig] - k.parN[y][sig]))
      const dehors = tri.slice(q)
      if (!dehors.length) continue
      const s = stats[sig] || (stats[sig] = { n: 0, perdu: 0 })
      s.n++
      if (dehors.some((x) => a.includes(x))) s.perdu++
    }
  }
  const base = nBase / tot
  console.log('  ── ' + noms[b] + '   BASE ' + pct(nBase, tot) + '   (marge ' +
    ((base - nOracle / C.length) * 100).toFixed(1).replace('.', ',') + ' pts)')
  for (const [sig, s] of Object.entries(stats).sort((x, y) => x[1].perdu / x[1].n - y[1].perdu / y[1].n)) {
    console.log('     ' + pad(sig, 12) + pad(pct(s.perdu, s.n), 10) + 'n = ' + s.n)
  }
  console.log('')
}

/* ── le ticket 4-2-1-1-0, le choix de chaque bloc par un signal ──────────── */
const QUOTAS = [4, 2, 1, 1, 0]
function ticket(k, choix) {
  const t = []
  for (let b = 0; b < 4; b++) {
    const cases = k.grille.groupes[b]?.cases || []
    if (!cases.length) continue
    const q = b === 2 ? Math.max(1, Math.min(QUOTAS[b], cases.length)) : Math.min(QUOTAS[b], cases.length)
    const sig = choix[b]
    let ordre
    if (!sig) ordre = cases.slice().sort((x, y) => x.place - y.place)
    else {
      const bloc = cases.map((x) => x.num)
      if (bloc.some((n) => k.parN[n]?.[sig] == null)) ordre = cases.slice().sort((x, y) => x.place - y.place)
      else ordre = cases.slice().sort((x, y) => MEILLEUR[sig] * (k.parN[x.num][sig] - k.parN[y.num][sig]))
    }
    ordre.slice(0, q).forEach((x) => t.push(x.num))
  }
  return t
}
function noter(l, choix) {
  let p = 0, q = 0, q4 = 0, ch = 0
  for (const k of l) {
    const t = ticket(k, choix)
    const s = new Set(t)
    ch += t.length
    if (k.q.arrivee.slice(0, 3).every((x) => s.has(x))) p++
    if (k.q.arrivee.slice(0, 5).every((x) => s.has(x))) q++
    if (k.q.arrivee.slice(0, 5).filter((x) => s.has(x)).length >= 4) q4++
  }
  return { p, q, q4, n: l.length, moy: ch / l.length }
}

const PRODUCT = [null, 'carnet', 'carnet', 'marche']
const SCEN = [
  ['production (carnet G2-G3 · cote G4)', PRODUCT],
  ['G2 par la DÉRIVE', [null, 'derive', 'carnet', 'marche']],
  ['G2 + G4 par la DÉRIVE', [null, 'derive', 'carnet', 'derive']],
  ['G2 + G3 + G4 par la DÉRIVE', [null, 'derive', 'derive', 'derive']],
  ['G2 par la dérive RELATIVE', [null, 'deriveRel', 'carnet', 'marche']],
  ['G2 par l’OUVERTURE', [null, 'ouverture', 'carnet', 'marche']],
]
console.log('  LE TICKET 4-2-1-1-0 — le choix de chaque bloc')
console.log('  ' + pad('scénario', 42) + pad('podium', 10) + pad('quinté', 10) + pad('≥4', 10) + 'chev.')
for (const [nom, ch] of SCEN) {
  const r = noter(C, ch)
  console.log('  ' + pad(nom, 42) + pad(pct(r.p, r.n), 10) + pad(pct(r.q, r.n), 10) + pad(pct(r.q4, r.n), 10) + r.moy.toFixed(2))
}
const m = Math.floor(C.length / 2)
console.log('')
console.log('  MOITIÉ PAR MOITIÉ (quinté entier)')
for (const [nom, ch] of SCEN) {
  const a = noter(C.slice(0, m), ch), b = noter(C.slice(m), ch)
  console.log('  ' + pad(nom, 42) + pad(pct(a.q, a.n), 10) + pct(b.q, b.n))
}
console.log('')
console.log('  BOOTSTRAP apparié 10 000 tirages, contre la production')
for (const [nom, ch] of SCEN.slice(1)) {
  const d = C.map((k) => {
    const A = new Set(ticket(k, PRODUCT)), B = new Set(ticket(k, ch))
    const a = k.q.arrivee.slice(0, 5)
    return (a.every((x) => B.has(x)) ? 1 : 0) - (a.every((x) => A.has(x)) ? 1 : 0)
  })
  let g = 0, p = 0
  for (const x of d) { if (x > 0) g++; else if (x < 0) p++ }
  let mieux = 0
  for (let t = 0; t < 10000; t++) {
    let s = 0
    for (let i = 0; i < d.length; i++) s += d[Math.floor(Math.random() * d.length)]
    if (s > 0) mieux++
  }
  console.log('  ' + pad(nom, 42) + 'gagnées ' + pad(g, 4) + '· perdues ' + pad(p, 4) + '· mieux ' + (mieux / 100).toFixed(1) + ' %')
}
console.log('')
