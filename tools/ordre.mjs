/* =============================================================================
 * tools/ordre.mjs — L'ORDRE DU TICKET (20/10/2026)
 *
 * Demande de l'utilisateur : « le ticket de 8 doit être ordonné selon les
 * statistiques du podium ».
 *
 * Le SET de 8 chevaux ne change pas — on ne mesure QUE l'ordre. Deux règles :
 *
 *   ① l'ancienne (07/10 → 19/10) : chaque cheval revendique SA place de
 *      prédilection (l'argmax de [1er, 2e, 3e, 4e, 5e]) et une place
 *      n'accueille que le plus fort de ceux qui la revendiquent ;
 *   ② la nouvelle (20/10/2026) : le ticket est trié par la PROBABILITÉ DE
 *      PODIUM de la case P (podiums / n_top5), décroissante.
 *
 * Métriques d'ORDRE, jamais le cheval isolé :
 *   · le gagnant en 1re case                 (ce que paie le Quinté)
 *   · le podium EXACT dans l'ordre           (1er, 2e, 3e = les trois cases)
 *   · ≥2 places exactes dans les 3 premières
 *   · le top-3 du ticket EST le podium (ensemble, ordre libre)
 *   · le top-4 du ticket contient le podium  (ensemble)
 *
 *   node tools\ordre.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, computeStats, remplirGrille } from '../src/lib/quinte.js'

const pct = (x) => (100 * x).toFixed(1).replace('.', ',') + ' %'
const pad = (s, n) => String(s).padEnd(n)

/* ───────────────────────────── l'échantillon ───────────────────────────── */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const CASES = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  CASES.push({ q, nums, syn, cotes: Object.fromEntries(nums.map((n) => [n, { cote: cotes[n] }])) })
}

/* ───────────────────────────── les deux ordres ─────────────────────────── */
const pDeNum = (grille, num) => (grille?.slotParNum || {})[num] ?? 999

/** ① l'ancien ordre — la place de prédilection de chaque cheval */
function ordreAncien(ticket, grille, stats) {
  const parPlace = stats?.parPlace || []
  const signature = (num) => {
    const st = parPlace[pDeNum(grille, num) - 1]
    if (!st || !st.n || st.n < 2 || !Array.isArray(st.p)) return null
    let best = 0
    for (let k = 1; k < 5; k++) if ((st.p[k] ?? 0) > (st.p[best] ?? 0)) best = k
    return (st.p[best] ?? 0) > 0 ? { place: best, force: st.p[best] } : null
  }
  const s = ticket.map((n) => ({ n, sig: signature(n), rang: pDeNum(grille, n) }))
  const places = new Array(5).fill(null)
  const pris = new Set()
  s.filter((x) => x.sig)
    .sort((a, b) => (b.sig.force - a.sig.force) || (a.rang - b.rang))
    .forEach((x) => { if (places[x.sig.place] == null) { places[x.sig.place] = x.n; pris.add(x.n) } })
  const sansPlace = s.filter((x) => !pris.has(x.n)).sort((a, b) => a.rang - b.rang).map((x) => x.n)
  return [...places.filter((n) => n != null), ...sansPlace]
}

/** ② le nouvel ordre — la probabilité de podium de la case */
function ordrePodium(ticket, grille, stats) {
  const parPlace = stats?.parPlace || []
  const force = (num) => {
    const st = parPlace[pDeNum(grille, num) - 1]
    if (!st || !st.n || st.n < 2) return null
    const pod = st.podiums != null ? st.podiums : (st.p?.[0] ?? 0) + (st.p?.[1] ?? 0) + (st.p?.[2] ?? 0)
    return pod / st.n
  }
  return ticket.slice()
    .map((n) => ({ n, f: force(n), rang: pDeNum(grille, n) }))
    .sort((a, b) => {
      if (a.f == null && b.f == null) return a.rang - b.rang
      if (a.f == null) return 1
      if (b.f == null) return -1
      if (b.f !== a.f) return b.f - a.f
      return a.rang - b.rang
    })
    .map((x) => x.n)
}

/* les records au format attendu par computeStats : `synthese` + `runners` */
const REC = CASES.map((c) => ({
  date: c.q.date, discipline: c.q.discipline,
  synthese: c.syn, runners: c.nums, arrivee: c.q.arrivee.slice(0, 5),
}))

/* ─────────────────────────────── la mesure ─────────────────────────────── */
function noter(ordre) {
  let gagnant = 0, podiumOrdre = 0, deux = 0, top3Set = 0, top4Set = 0, top3Partiel = 0
  const n = CASES.length
  CASES.forEach((c, i) => {
    const grille = buildGrid(c.syn, c.nums)
    const cl = grille.groupes.flatMap((g) => g.cases).slice().sort((a, b) => a.slot - b.slot)
      .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
    const stats = computeStats(REC.filter((_, k) => k !== i))
    const ticket = remplirGrille(grille, cl, c.q.discipline, c.cotes, stats).ticket
    const t = ordre(ticket, grille, stats)
    const arr = c.q.arrivee

    if (t[0] === arr[0]) gagnant++
    let exact = 0
    for (let i2 = 0; i2 < 3; i2++) if (t[i2] === arr[i2]) exact++
    if (exact === 3) podiumOrdre++
    if (exact >= 2) deux++
    const setPodium = new Set(arr.slice(0, 3))
    if (t.slice(0, 3).every((x) => setPodium.has(x)) && setPodium.size === 3) top3Set++
    if ([...setPodium].every((x) => t.slice(0, 4).includes(x))) top4Set++
    // combien des 3 premières cases du ticket sont dans le podium
    top3Partiel += t.slice(0, 3).filter((x) => setPodium.has(x)).length
  })
  return { n, gagnant: gagnant / n, podiumOrdre: podiumOrdre / n, deux: deux / n, top3Set: top3Set / n, top4Set: top4Set / n, partiel: top3Partiel / n }
}

console.log('\n  L’ORDRE DU TICKET — ' + CASES.length + ' Quintés à presse réelle')
console.log('  même SET de 8 chevaux (3-3-1-1-0) · seule la place change\n')
console.log('  ' + pad('ordre', 40) + pad('gagnant en 1re', 16) + pad('podium exact', 14) + pad('≥2 exactes', 13) + pad('top-3 = podium', 16) + 'top-4 ⊇ podium')
const A = noter(ordreAncien)
const B = noter(ordrePodium)
const ligne = (nom, r) => console.log('  ' + pad(nom, 40) + pad(pct(r.gagnant), 16) + pad(pct(r.podiumOrdre), 14) +
  pad(pct(r.deux), 13) + pad(pct(r.top3Set), 16) + pct(r.top4Set))
ligne('① l’ancien — place de prédilection', A)
ligne('② le nouveau — probabilité de podium', B)

console.log('\n  détail — places exactes sur les 3 premières cases')
console.log('  ' + pad('ordre', 40) + pad('places exactes / course', 24) + 'dont le podium est dans les 3')
console.log('  ' + pad('① ancien', 40) + pad(A.partiel.toFixed(2) + ' / 3', 24) + pct(A.top3Set))
console.log('  ' + pad('② nouveau', 40) + pad(B.partiel.toFixed(2) + ' / 3', 24) + pct(B.top3Set))

/* ───────────────────── stabilité : les deux moitiés ────────────────────── */
{
  const m = Math.floor(CASES.length / 2)
  const moitie = (arr) => {
    const sauve = CASES.splice(0, CASES.length, ...arr)
    const a = noter(ordreAncien), b = noter(ordrePodium)
    CASES.splice(0, CASES.length, ...sauve)
    return { a, b }
  }
  const H1 = moitie(CASES.slice(0, m))
  const H2 = moitie(CASES.slice(m))
  console.log('\n  STABILITÉ — moitié par moitié (gagnant en 1re case)')
  console.log('     ① ancien  : ' + pct(H1.a.gagnant) + '  |  ' + pct(H2.a.gagnant))
  console.log('     ② nouveau : ' + pct(H1.b.gagnant) + '  |  ' + pct(H2.b.gagnant))
}
console.log('')
