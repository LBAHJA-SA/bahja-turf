/* ══════════════════════════════════════════════════════════════════════════
 *  tools/test-remplissage.mjs — LE REMPLISSAGE SUIT-IL LES STATS ? (09/10/2026)
 *
 *  ⚠ LABORATOIRE UNIQUEMENT. Lecture seule : aucun fichier écrit, aucun
 *  moteur modifié, aucun quota touché (§11.16 intouchable).
 *
 *  Question (décision utilisateur du 09/10) : le CHOIX dans chaque groupe
 *  doit tenir compte des STATISTIQUES + du découpage — quotas 3-2-1-1-1
 *  intacts, seul l'ordre de remplissage change.
 *
 *  Méthode anti-fuite : stats calculées sur le TRAIN SEUL (66 premiers),
 *  mesurées sur le TEST (28 derniers, jamais vus). Si une variante gagne
 *  sur le train mais perd sur le test, elle est rejetée.
 *
 *  Variantes (quotas fixes) :
 *    V0 marché  : cote croissante (règle actuelle §11.17, sans surprise)
 *    V1 présence: P(top5) puis P(top3) puis P(1er) puis cote — attraper du monde
 *    V2 podium  : P(top3) puis P(top5) puis P(1er) puis cote — attraper le podium
 *    V3 veto    : marche sauf ecart flagrant stats (30pts top5, n>=5)
 *    V3 veto    : marché d'abord, MAIS si le meilleur-stats bat le meilleur-
 *      marché de ≥30pts top5 (avec n≥5 courses), le stats prend sa place.
 *      Hypothèse utilisateur du 09/10 : le moteur est « aveuglé par le
 *      favori » — le veto ne corrige que les cas flagrants.
 *
 *    node tools\test-remplissage.mjs
 * ══════════════════════════════════════════════════════════════════════════ */

import { buildGrid, computeStats } from '../src/lib/quinte.js'
import fs from 'node:fs'

const TOUT = JSON.parse(fs.readFileSync('data/corpus/archive-94.json', 'utf8'))
const courses = (TOUT.courses || TOUT)
  .filter((c) => (c.presse || []).length >= 10 && (c.arrivee || []).length >= 5)
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  .map((c) => ({
    date: c.date,
    synthese: c.presse,
    runners: (c.partants || []).map((p) => p.num ?? p).filter(Number.isFinite),
    cotes: c.cotes || {},
    arrivee: c.arrivee.slice(0, 5),
  }))

const QUOTAS = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }

/* Stats calculées sur le TRAIN SEUL — jamais sur le test. */
function statsDe(liste) {
  return computeStats(liste.map((c) => ({
    synthese: c.synthese, runners: c.runners, arrivee: c.arrivee,
  })))
}

function statCase(stats, slot) {
  const r = stats?.parPlace?.[slot - 1]
  if (!r || !r.n) return null
  return r
}

function jouer(course, stats, variante) {
  const g = buildGrid(course.synthese, course.runners)
  const pris = []
  for (const gr of g.groupes) {
    const q = QUOTAS[gr.id] ?? 0
    const parCote = (x, y) => (course.cotes[x.num] ?? 999) - (course.cotes[y.num] ?? 999)
    const tri = gr.cases.slice().sort((a, b) => {
      if (variante === 'V0') return parCote(a, b)
      const sa = statCase(stats, a.slot), sb = statCase(stats, b.slot)
      if (variante === 'V3') {
        const ta = sa && sa.n >= 5 ? sa.top5 : -1, tb = sb && sb.n >= 5 ? sb.top5 : -1
        const ca = course.cotes[a.num] ?? 999, cb = course.cotes[b.num] ?? 999
        if (ca < cb && tb - ta >= 30) return 1
        if (cb < ca && ta - tb >= 30) return -1
        return parCote(a, b)
      }
      const cle = (s) => (s ? [-(variante === 'V1' ? s.top5 : s.top3), -(variante === 'V1' ? s.top3 : s.top5), -s.p[0]] : [0, 0, 0])
      const ka = cle(sa), kb = cle(sb)
      for (let i = 0; i < 3; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i]
      // sans stats (n=0) ou égalité : le marché départage, comme aujourd'hui
      return (course.cotes[a.num] ?? 999) - (course.cotes[b.num] ?? 999)
    })
    for (const c of tri) {
      if (pris.length >= 8) break
      if (!pris.includes(c.num) && pris.filter((n) => gr.cases.some((x) => x.num === n)).length < q) pris.push(c.num)
    }
  }
  return pris.slice(0, 8)
}

function mesurer(liste, stats, variante) {
  let t3 = 0, c5 = 0, q4 = 0, sans1 = 0
  for (const c of liste) {
    const t = jouer(c, stats, variante)
    const s = new Set(t)
    if (c.arrivee.slice(0, 3).every((n) => s.has(n))) t3++
    if (c.arrivee.every((n) => s.has(n))) c5++
    if (c.arrivee.filter((n) => s.has(n)).length >= 4) q4++
    if (!s.has(c.arrivee[0])) sans1++
  }
  return { n: liste.length, t3, c5, q4, sans1 }
}

const train = courses.slice(0, 66)
const test = courses.slice(66)
const stats = statsDe(train)

console.log('')
console.log('  ══ REMPLISSAGE : marché (V0) vs stats-présence (V1) vs stats-podium (V2) ══')
console.log('  Stats lues sur TRAIN seul (' + train.length + ') — quotas 3-2-1-1-1 intacts')
for (const [titre, liste] of [['TRAIN (66)', train], ['TEST  (28)', test]]) {
  console.log('')
  console.log('  ' + titre)
  console.log('  ' + '─'.repeat(66))
  console.log('  variante      3/3      5/5      ≥4/5     1er manqué')
  for (const v of ['V0', 'V1', 'V2', 'V3']) {
    const r = mesurer(liste, stats, v)
    const f = (x) => String(x).padStart(3) + '  (' + String(Math.round(x / r.n * 100)).padStart(2) + '%)'
    console.log('  ' + v + '             ' + f(r.t3) + '  ' + f(r.c5) + '  ' + f(r.q4) + '   ' + f(r.sans1))
  }
}
console.log('')
