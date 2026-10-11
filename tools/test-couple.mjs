/* =============================================================================
 * tools/test-couple.mjs — LE BACKTEST CAUSAL DU MOTEUR COUPLÉ (page).
 *
 * 10/10/2026 : « le moteur est très faible, il faut des tests » (utilisateur).
 * Ce que ça teste : le VRAI verdict() de backend/COUPLE/moteur.js (celui que
 * la page /couple appelle), PAS une copie.
 *
 * Protocole anti-fuite : corpus trié par date ; pour chaque course testée
 * (les N dernières), l'index est reconstruit avec les courses STRICTEMENT
 * antérieures (date < test.date). Même jour exclu (un résultat du matin ne
 * doit pas prédire l'après-midi).
 *
 * Mesures : exact 3/3, ≥2/3, 1er, 2e — moteur vs baseline top-3 cote
 * (trioCandidat, le « favori bête ») vs hasard théorique 1/P(n,3).
 * Usage : node tools/test-couple.mjs [N=150]
 * ============================================================================= */

import { charger } from './empreinte-couple.mjs'
import { construireIndex } from './empreinte-v3.mjs'
import { verdict, trioCandidat } from '../backend/COUPLE/moteur.js'

const N = Math.max(1, Number(process.argv[2]) || 150)

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
console.log('corpus fermé : ' + tout.length + ' courses')
const tests = tout.slice(-N)
console.log('test : les ' + tests.length + ' dernières (' + tests[0].date + ' → ' + tests[tests.length - 1].date + ')')

const perm = (n) => n * (n - 1) * (n - 2)
let jouees = 0, exact = 0, deux = 0, c1 = 0, c2 = 0
let bJouees = 0, bExact = 0, bDeux = 0, bC1 = 0, bC2 = 0
let hasardExp = 0, nHasard = 0
const parNiveau = {}
const t0 = Date.now()
tests.forEach((course, i) => {
  const passe = tout.filter((c) => c.date < course.date)
  const index = construireIndex(passe)
  const v = verdict(course.partants, index)
  const a = course.arrivee.slice(0, 3)
  nHasard++
  hasardExp += 1 / perm(course.partants.length)
  const tri = trioCandidat(course.partants)
  if (tri) {
    bJouees++
    if (tri[0] === a[0] && tri[1] === a[1] && tri[2] === a[2]) bExact++
    const s = new Set(tri)
    if (a.filter((x) => s.has(x)).length >= 2) bDeux++
    if (tri[0] === a[0]) bC1++
    if (tri[1] === a[1]) bC2++
  }
  if (!v || !v.trio) return
  jouees++
  parNiveau[v.niveau] = (parNiveau[v.niveau] || 0) + 1
  const t = v.trio
  if (t[0] === a[0] && t[1] === a[1] && t[2] === a[2]) exact++
  const s = new Set(t)
  if (a.filter((x) => s.has(x)).length >= 2) deux++
  if (t[0] === a[0]) c1++
  if (t[1] === a[1]) c2++
  if ((i + 1) % 50 === 0) console.log('  … ' + (i + 1) + '/' + tests.length)
})

const pct = (x, n) => (x / Math.max(1, n) * 100).toFixed(2) + '%'
console.log('')
console.log('══ BACKTEST CAUSAL (' + tests.length + ' courses, ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s) ══')
console.log('  moteur  (jouées ' + jouees + '/' + tests.length + ') : exact=' + exact + ' ' + pct(exact, jouees)
  + ' · ≥2/3=' + deux + ' ' + pct(deux, jouees) + ' · 1er=' + c1 + ' ' + pct(c1, jouees) + ' · 2e=' + c2 + ' ' + pct(c2, jouees))
console.log('  top3cote (jouées ' + bJouees + '/' + tests.length + ') : exact=' + bExact + ' ' + pct(bExact, bJouees)
  + ' · ≥2/3=' + bDeux + ' ' + pct(bDeux, bJouees) + ' · 1er=' + bC1 + ' ' + pct(bC1, bJouees) + ' · 2e=' + bC2 + ' ' + pct(bC2, bJouees))
console.log('  hasard théorique exact : ' + pct(hasardExp, nHasard))
console.log('  niveaux du moteur : ' + JSON.stringify(parNiveau))
console.log('')
