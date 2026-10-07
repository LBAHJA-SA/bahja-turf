/* ---------------------------------------------------------------
 * tools\mesure-blocs.mjs  —  ⭐ شحال من حصان فأي بلوك؟
 *
 *   node tools\mesure-blocs.mjs
 *   node tools\mesure-blocs.mjs --loo
 *
 * Corpus : `data\quintes.json` — 101 Quintés avec la Synthèse de la presse,
 * les cotes du jour ET l'arrivée complète. C'est le seul endroit où la
 * GRILLE (§11) existe. (Les 94 de `archives\` n'ont pas de presse : pas de
 * blocs, pas de quotas.)
 *
 * Question : avec un budget de N chevaux, comment les répartir sur
 * G1..G5 pour maximiser le 5/5 ? Et « plus_coeffident » veut dire quoi,
 * exactement ?
 *
 * ⚠ Répartition par bloc = la méthode fermée (§11.16 : 3-2-1-1-1). Ici on
 * la MESURE au lieu de la décréter, sur 101 vraies courses. Le coût d'un
 * ticket est C(nbre,5) — donc plus de chevaux = plus de combinaisons,
 * c'est le prix à payer, pas un détail.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

/* La grille de la méthode (§11.14) : les P sont des NUMÉROS DE CASE. */
const BLOCS = [
  { id: 'G1', min: 1, max: 4 },
  { id: 'G2', min: 5, max: 8 },
  { id: 'G3', min: 9, max: 10 },
  { id: 'G4', min: 11, max: 12 },
  { id: 'G5', min: 13, max: 99 },
]

/* La grille du CARNET (§11.6) : G1/G2 en 2×2, G3/G4 en 1 colonne, G5 large.
 * Pour 16 partants elle donne 4-4-2-2-4 au lieu de 4-4-2-2-4... on la garde
 * telle quelle pour comparer les deux découpages. */
const BLOCS_CARNET = [
  { id: 'G1', min: 1, max: 4 },
  { id: 'G2', min: 5, max: 8 },
  { id: 'G3', min: 9, max: 10 },
  { id: 'G4', min: 11, max: 12 },
  { id: 'G5', min: 13, max: 99 },
]

const charger = () => {
  const Q = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'quintes.json'), 'utf8'))
  const out = []
  for (const q of Q) {
    if (!Array.isArray(q.presse) || q.presse.length < 4) continue
    if (!Array.isArray(q.arrivee) || q.arrivee.length < 5) continue
    const cotes = q.cotes || {}
    const avecCotes = Object.keys(cotes).filter((k) => cotes[k] > 0).length
    if (avecCotes < Math.max(4, q.nb - 2)) continue        // marché trop incomplet
    // §12.2 : la presse ne cite pas toujours tout le monde ; les partants
    // non cités sont ajoutés à la suite. L'arrivée complète les donne.
    const presse = q.presse.filter((n) => q.arrivee.includes(n))
    const nums = presse.concat(q.arrivee.filter((n) => !presse.includes(n)))
    const cases = new Map()
    nums.forEach((n, i) => cases.set(n, i + 1))             // P1 = le 1er cité
    const top5 = q.arrivee.slice(0, 5)
    const parBloc = BLOCS.map((b) => nums.filter((n) => {
      const p = cases.get(n)
      return p >= b.min && p <= b.max
    }))
    if (parBloc.some((b) => !b.length)) continue            // bloc vide : on saute
    out.push({ ...q, nums, cases, top5, parBloc, nb: nums.length })
  }
  return out
}

/** Les n meilleurs d'un bloc, par la cote. */
const parCote = (bloc, cotes) => bloc.slice().sort((a, b) => (cotes[a] || 999) - (cotes[b] || 999))
/** Les n meilleurs d'un bloc, par le RANG de presse (le 1er cité d'abord). */
const parPresse = (bloc) => bloc

const choisir = (k, quotas, remplir) => {
  const ticket = []
  k.parBloc.forEach((bloc, i) => {
    const ordre = remplir === 'cote' ? parCote(bloc, k.cotes || {}) : parPresse(bloc)
    ticket.push(...ordre.slice(0, quotas[i]))
  })
  return ticket
}

/* ⭐ LA VARIANTE « COURAGEUSE ».
 *
 * La mesure dit que G4 et G5 sont SOUS le hasard (29 et 26 arrivants sur 75
 * courses, contre 51 et 72 attendus). Autrement dit : prendre dans ces deux
 * blocs le cheval que le marché préfère, c'est choisir au PIRE. Donc on
 * inverse : dans G4 et G5 on prend le cheval que le marché DÉTESTE — celui qui
 * a la pire cote. C'est la « surprise » de §11.17, appliquée à fond et
 * limitée aux deux blocs morts.
 *
 * `brave` : G1/G2/G3 par la cote (là, le marché est utile : 159 + 112 + 49),
 *           G4/G5 par la PIRE cote.
 * `toutBrave` : les cinq blocs par la pire cote (la ticket la plus
 *           agressive possible — sert de borne, pas de proposition). */
const choisirBrave = (k, quotas, mode) => {
  const ticket = []
  const parCoteInverse = (bloc) => bloc.slice().sort((a, b) => ((k.cotes || {})[b] || 0) - ((k.cotes || {})[a] || 0))
  k.parBloc.forEach((bloc, i) => {
    const mort = i >= 3                       // G4 et G5
    const ordre = (mort && mode !== 'cote') || mode === 'toutBrave' ? parCoteInverse(bloc) : parCote(bloc, k.cotes || {})
    ticket.push(...ordre.slice(0, quotas[i]))
  })
  return ticket
}

const touches = (k, ticket) => k.top5.filter((n) => ticket.includes(n)).length

/* ------------------------------------------------------------ combinaisons --- */
const C = (n, r) => { let x = 1; for (let i = 0; i < r; i++) x = x * (n - i) / (i + 1); return Math.round(x) }

/* ------------------------------------------------------- les gains réels --- */
/* Le seul critère qui tranche vraiment « est-ce qu'on mise gros » :
 * l'argent. `dividends` donne le gain réel de chaque Quinté.
 *   QUINTE_ORDRE + "Ordre"  = le gain quand on tient les 5 dans l'ordre.
 * On mise 1 € sur chacune des C(nbre,5) combinaisons en ORDRE. Donc :
 *   - la ticket contient les 5 gagnants  ->  on gagne ce gain-là
 *   - sinon (4/5, 3/5…)                  ->  0 €  (un Quinté ne paie rien)
 * Le DÉCOMPTE exact des combinaisons est ce qu'on paie, donc le quotient
 * est un € par € misé. */
const gainOrdre = (k) => {
  const d = k.dividends || []
  if (!Array.isArray(d)) return null
  const l = d.find((x) => x.bet_type === 'QUINTE_ORDRE' && /ordre/i.test(x.sub_type) && !/désordre/i.test(x.sub_type))
  if (!l) return null
  const v = parseFloat(String(l.payout).replace(',', '.'))
  return Number.isFinite(v) ? v : null
}

/** 1 € sur chacune des C(n,5) combinaisons en ORDRE.
 *  On garde le détail : les gros gains sont rares, et une moyenne tirée par
 *  un seul 100 000 € ne veut rien dire. */
const euros = (tickets) => {
  let total = 0
  let mise = 0
  const wins = []
  for (const { k, ticket } of tickets) {
    const g = gainOrdre(k)
    const combi = C(ticket.length, 5)
    if (g == null || !combi) continue
    mise += combi
    const gain = k.top5.every((x) => ticket.includes(x)) ? g : 0
    if (gain) { total += gain; wins.push({ date: k.date, gain }) }
  }
  const tri = [...wins].sort((a, b) => b.gain - a.gain)
  const sansLePlusGros = total - (tri[0] ? tri[0].gain : 0)
  return {
    total, mise,
    euro: mise ? total / mise : 0,
    nGagnantes: wins.length,
    plusGros: tri[0] || null,
    sansLePlusGros: mise ? sansLePlusGros / mise : 0,
  }
}

/* ------------------------------------------------------------------ run --- */
const base = charger()

console.log('')
console.log(`  ⭐ COMBIEN DE CHEVAUX, ET DANS QUELS BLOCS ?  —  ${base.length} Quintés avec la presse`)
console.log('')

/* ① où sont vraiment les arrivants ? */
const dansBloc = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0 }
const placeDansBloc = new Array(5).fill(0).map(() => new Array(5).fill(0))
for (const k of base) {
  k.top5.forEach((n, rang) => {
    k.parBloc.forEach((bloc, i) => {
      if (bloc.includes(n)) { dansBloc[BLOCS[i].id]++; placeDansBloc[i][rang]++ }
    })
  })
}
console.log('  --- ① les 5 arrivants, par BLOC (presse) ---')
console.log('  bloc    1er    2e    3e    4e    5e   |  total   partants moyen')
BLOCS.forEach((b, i) => {
  const t = dansBloc[b.id]
  const moy = (base.reduce((s, k) => s + k.parBloc[i].length, 0) / base.length).toFixed(1)
  const attendu = (base.length * 5 * (base.reduce((s, k) => s + k.parBloc[i].length, 0) / base.reduce((s, k) => s + k.nb, 0))).toFixed(0)
  console.log('  ' + b.id.padEnd(6) + placeDansBloc[i].map((v) => String(v).padStart(5)).join(' ') + '  | ' + String(t).padStart(6) + '   ' + moy + '   (attendu si hasard : ' + attendu + ')')
})
console.log('')
console.log('  ⭐ donc ' + BLOCS.map((b, i) => `${b.id} ${dansBloc[b.id]}`).join('  ·  '))
console.log('')

/* ② les répartitions */
const REPARTITIONS = [
  ['5-5-5-5-5', [1, 1, 1, 1, 1], 5],
  ['3-2-1-1-1  (méthode)', [3, 2, 1, 1, 1], 8],
  ['2-2-1-1-1', [2, 2, 1, 1, 1], 7],
  ['2-2-2-2-2', [2, 2, 2, 2, 2], 10],
  ['3-3-2-2-2', [3, 3, 2, 2, 2], 12],
  ['3-3-1-1-1', [3, 3, 1, 1, 1], 9],
  ['4-4-2-2-2', [4, 4, 2, 2, 2], 14],
  ['3-3-3-3-3', [3, 3, 3, 3, 3], 15],
]

console.log('  --- ② une répartition, deux façons de remplir les blocs ---')
console.log('  répartition          n  remplir   moyen   ≥3/5   ≥4/5    5/5   combinaisons      € par €')
console.log('  ' + '-'.repeat(84))
const resultats = []
for (const [nom, quotas, n] of REPARTITIONS) {
  for (const remplir of ['cote', 'presse']) {
    const t = base.map((k) => touches(k, choisir(k, quotas, remplir)))
    const moy = t.reduce((a, b) => a + b, 0) / t.length
    const p = (x) => (t.filter((v) => v >= x).length / t.length * 100).toFixed(0) + ' %'
    const combi = Math.round(base.reduce((s, k) => s + C(n, 5), 0) / base.length)
    const ev = euros(base.map((k) => ({ k, ticket: choisir(k, quotas, remplir) })))
    resultats.push({ nom, quotas, n, remplir, t, moy, p5: t.filter((v) => v >= 5).length / t.length, ev })
    const fEuro = (x) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2))
    console.log('  ' + nom.padEnd(20) + String(n).padStart(2) + '  ' + remplir.padEnd(9) + moy.toFixed(2).padStart(6) + '  ' + p(3).padStart(6) + ' ' + p(4).padStart(6) + ' ' + p(5).padStart(7)
      + '   ' + (combi >= 1000 ? (combi / 1000).toFixed(0) + 'k' : String(combi).padStart(3))
      + '   ' + fEuro(ev.euro).padStart(8) + '  ' + String(ev.nGagnantes).padStart(2) + '  ' + fEuro(ev.sansLePlusGros).padStart(7))
  }
}

/* ② bis — les variantes COURAGEUSES */
console.log('')
console.log('  --- ② bis ⭐ COURAGE : cote pour G1-G3, la PIRE cote pour G4-G5 ---')
console.log('  répartition          n   remplissage      moyen   ≥3/5   ≥4/5    5/5   combinaisons   € par €  gagne  sans le gros')
console.log('  ' + '-'.repeat(100))
const BRAVES = [
  ['3-2-1-1-1', [3, 2, 1, 1, 1]],
  ['3-3-1-1-1', [3, 3, 1, 1, 1]],
  ['3-3-2-2-2', [3, 3, 2, 2, 2]],
]
const braves = []
for (const [nom, quotas] of BRAVES) {
  for (const mode of ['brave', 'toutBrave']) {
    const tk = base.map((k) => choisirBrave(k, quotas, mode))
    const t = base.map((k, i) => k.top5.filter((x) => tk[i].includes(x)).length)
    const moy = t.reduce((a, b) => a + b, 0) / t.length
    const p = (x) => (t.filter((v) => v >= x).length / t.length * 100).toFixed(0) + ' %'
    const combi = Math.round(base.reduce((s, k) => s + C(quotas.reduce((a, b) => a + b, 0), 5), 0) / base.length)
    const ev = euros(base.map((k, i) => ({ k, ticket: tk[i] })))
    const fEuro = (x) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2))
    const lbl = mode === 'brave' ? 'cote sauf G4-G5' : 'pire cote partout'
    braves.push({ nom: nom + ' ' + lbl, t, ev })
    console.log('  ' + nom.padEnd(20) + String(quotas.reduce((a, b) => a + b, 0)).padStart(2) + '  ' + lbl.padEnd(17)
      + moy.toFixed(2).padStart(5) + '  ' + p(3).padStart(6) + ' ' + p(4).padStart(6) + ' ' + p(5).padStart(7)
      + '   ' + (combi >= 1000 ? (combi / 1000).toFixed(0) + 'k' : String(combi).padStart(3))
      + '   ' + fEuro(ev.euro).padStart(8) + '  ' + String(ev.nGagnantes).padStart(4) + '  ' + fEuro(ev.sansLePlusGros).padStart(9))
  }
}

/* ③ le même budget, rempli à plat par la cote */
console.log('')
console.log('  --- ③ MÊME BUDGET, SANS BLOCS : les N meilleures cotes ---')
console.log('  n                   moyen   ≥3/5   ≥4/5    5/5   combinaisons   € par €  gagne  sans le gros')
console.log('  ' + '-'.repeat(92))
const plats = []
for (const n of [5, 7, 8, 9, 10, 12, 14, 15]) {
  const parN = (k) => k.nums.slice().sort((a, b) => ((k.cotes || {})[a] || 999) - ((k.cotes || {})[b] || 999)).slice(0, Math.min(n, k.nb))
  const t = base.map((k) => k.top5.filter((x) => parN(k).includes(x)).length)
  const moy = t.reduce((a, b) => a + b, 0) / t.length
  const p = (x) => (t.filter((v) => v >= x).length / t.length * 100).toFixed(0) + ' %'
  const combi = Math.round(base.reduce((s, k) => s + C(Math.min(n, k.nb), 5), 0) / base.length)
  const ev = euros(base.map((k) => ({ k, ticket: parN(k) })))
  const fEuro = (x) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2))
  plats.push({ n, moy, ev })
  console.log('  top-' + String(n).padEnd(17) + moy.toFixed(2).padStart(5) + '  ' + p(3).padStart(6) + ' ' + p(4).padStart(6) + ' ' + p(5).padStart(7)
    + '   ' + (combi >= 1000 ? (combi / 1000).toFixed(0) + 'k' : String(combi).padStart(3))
    + '   ' + fEuro(ev.euro).padStart(8) + '  ' + String(ev.nGagnantes).padStart(4) + '  ' + fEuro(ev.sansLePlusGros).padStart(9))
}

/* ④ leHasard de référence */
const hasardN = (n) => base.reduce((s, k) => s + Math.min(5, n) * k.top5.length / k.nb, 0) / base.length
console.log('')
console.log('  --- ④ le hasard, pour le même budget ---')
for (const n of [5, 7, 8, 9, 10, 12, 14, 15]) console.log('  ' + n + ' chevaux      ' + hasardN(n).toFixed(2))
console.log('')

/* --------------------------------------------------------------- LOO --- */
console.log('  ⭐ LEAVE-ONE-OUT sur la meilleure répartition')
const K = 4
const tous = [...resultats.map((r) => ({ nom: r.nom + ' / ' + r.remplir, t: r.t })), ...plats.map((p) => ({ nom: 'plat top-' + p.n, t: base.map((k) => {
  const ordre = k.nums.slice().sort((a, b) => ((k.cotes || {})[a] || 999) - ((k.cotes || {})[b] || 999))
  return k.top5.filter((x) => ordre.slice(0, p.n).includes(x)).length
}) }))]
let total = 0
let totalH = 0
for (let f = 0; f < K; f++) {
  const idx = base.map((_, i) => i)
  const train = idx.filter((i) => i % K !== f)
  const test = idx.filter((i) => i % K === f)
  let best = null
  for (const c of tous) {
    const moy = train.reduce((s, i) => s + c.t[i], 0) / train.length
    if (!best || moy > best.v) best = { nom: c.nom, v: moy, t: c.t }
  }
  const ob = test.reduce((s, i) => s + best.t[i], 0)
  const ha = test.reduce((s, i) => s + hasardN(9) , 0)
  total += ob
  totalH += ha
  console.log(`  pli ${f + 1} : gagnante = ${best.nom.padEnd(28)} (${best.v.toFixed(2)})  ->  test : ${(ob / test.length).toFixed(2)}`)
}
console.log('  ' + '-'.repeat(76))
console.log(`  LOO : ${total} arrivants sur ${base.length} courses  =  ${(total / base.length).toFixed(2)} par course`)
console.log(`  (le hasard pour 9 chevaux serait ${(base.reduce((s, k) => s + hasardN(9), 0) / base.length).toFixed(2)})`)
console.log('')
