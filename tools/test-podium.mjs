/* =============================================================================
 * tools/test-podium.mjs — LE PODIUM ENSEMBLE, LE QUINTÉ ENSEMBLE (20/10/2026)
 *
 * Demande de l'utilisateur :
 *   « fais un test sur le 1er, 2e et 3e ensemble, et un test sur le quinté
 *     complet. Le test ne vaut pas cheval par cheval. »
 *
 * Pourquoi c'est la bonne façon de mesurer :
 *   · « cheval par cheval » = une question à 1/16, dominée par le bruit ;
 *   · le PODIUM ENSEMBLE (les 3 sont-ils dans la sélection ?) est un événement
 *     DENSE : au hasard, 8 chevaux sur 16 le contiennent 10 % du temps ;
 *   · le QUINTÉ COMPLET (les 5) est l'événement rare : 1,3 % au hasard.
 *   On regarde les deux, et on ne juge jamais un cheval isolé.
 *
 * Corpus : data/corpus/archives-quinte.json — les Quintés FRANÇAIS des archives,
 * 2024-09-12 → 2026-10-05, avec arrivée et cotes. On en RETIRE les courses qui
 * ont servi aux statistiques (data/quintes.json), comme demandé.
 *
 * On n'a ici ni la presse ni la carrière : la seule hiérarchie disponible est
 * le MARCHÉ (cote PMU). Le test porte donc sur la construction du ticket :
 * combien de chevaux, et où les prendre.
 *
 *   node tools\test-podium.mjs
 * ============================================================================= */
import fs from 'node:fs'

const ARCH = JSON.parse(fs.readFileSync('data/corpus/archives-quinte.json', 'utf8'))
const STATS = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))

const pct = (x) => (100 * x).toFixed(1).replace('.', ',') + ' %'
const pad = (s, n) => String(s).padEnd(n)
const rp = (s, n) => String(s).padStart(n)
const N = (s) => String(s || '').toUpperCase().replace(/[_\s]+/g, ' ').trim()

/* ───────── 0. retirer les courses qui ont servi aux statistiques ────────── */
const statsCles = new Set()
for (const q of STATS) {
  if (!q.date) continue
  statsCles.add(q.date + '|' + N(q.track || ''))
}
const avant = ARCH.length
const courses = ARCH.filter((c) => !statsCles.has(c.date + '|' + N(c.track)))
const retires = avant - courses.length

/* ───────────────────────────── l'échantillon ───────────────────────────── */
console.log('\n  QUINTÉS FRANÇAIS — archives locales')
console.log('     courses exploitables        ' + avant)
console.log('     retirées (déjà dans stats)  ' + retires)
console.log('     corpus du test              ' + courses.length +
  (courses.length ? '   (' + courses[0].date + ' → ' + courses[courses.length - 1].date + ')' : ''))

/* l'ordre du marché : la cote croissante */
for (const c of courses) {
  c.ordre = Object.keys(c.cotes).map(Number).sort((a, b) => c.cotes[a] - c.cotes[b] || a - b)
  c.rang = Object.fromEntries(c.ordre.map((n, i) => [n, i + 1]))
}

const n = courses.length
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1)

/* ───────────────── 1. où sont le podium et le quinté dans le marché ? ──── */
const posPodium = [0, 0, 0], posQuinte = []
const rangPodium = [], rangQuinte = []
for (const c of courses) {
  const p = c.arrivee.slice(0, 3).map((x) => c.rang[x] ?? 99)
  const q = c.arrivee.slice(0, 5).map((x) => c.rang[x] ?? 99)
  rangPodium.push(...p); rangQuinte.push(...q)
  p.forEach((r, i) => { if (r <= 8) posPodium[i]++ })
  posQuinte.push(q.filter((r) => r <= 8).length)
}

console.log('\n  OÙ SONT LES ARRIVANTS DANS LE MARCHÉ (rang de cote)')
console.log('     ' + pad('', 10) + pad('rang ≤4', 10) + pad('5-8', 8) + pad('9-12', 8) + pad('13+', 8) + 'rang moyen')
const tranche = (arr) => [arr.filter((r) => r <= 4).length, arr.filter((r) => r >= 5 && r <= 8).length,
  arr.filter((r) => r >= 9 && r <= 12).length, arr.filter((r) => r >= 13).length]
{
  const t = tranche(rangPodium), tq = tranche(rangQuinte)
  const f = (x) => pct(x / rangPodium.length)
  console.log('     ' + pad('podium', 10) + pad(f(t[0]), 10) + pad(f(t[1]), 8) + pad(f(t[2]), 8) + pad(f(t[3]), 8) + mean(rangPodium).toFixed(2))
  const g = (x) => pct(x / rangQuinte.length)
  console.log('     ' + pad('quinté', 10) + pad(g(tq[0]), 10) + pad(g(tq[1]), 8) + pad(g(tq[2]), 8) + pad(g(tq[3]), 8) + mean(rangQuinte).toFixed(2))
}

/* ───────── 2. combien de chevaux pour tenir le podium / le quinté ? ─────── */
console.log('\n  TOP-N PAR LA COTE — combien de chevaux, et qu’est-ce qu’on tient')
console.log('  ' + pad('N', 5) + pad('podium entier', 16) + pad('≥2 du podium', 15) + pad('quinté entier', 16) + pad('≥4 du quinté', 14) + 'au hasard (podium / quinté)')

const C = (a, b) => { let r = 1; for (let i = 0; i < b; i++) r = r * (a - i) / (i + 1); return r }

for (let k = 5; k <= 13; k++) {
  let pod = 0, pod2 = 0, qui = 0, qui4 = 0
  for (const c of courses) {
    const t = new Set(c.ordre.slice(0, k))
    const R = c.runners
    if (c.arrivee.slice(0, 3).every((x) => t.has(x))) pod++
    if (c.arrivee.slice(0, 3).filter((x) => t.has(x)).length >= 2) pod2++
    if (c.arrivee.slice(0, 5).every((x) => t.has(x))) qui++
    if (c.arrivee.slice(0, 5).filter((x) => t.has(x)).length >= 4) qui4++
  }
  const hp = mean(courses.map((c) => C(c.runners, 3) > 0 ? C(k, 3) / C(c.runners, 3) : 0))
  const hq = mean(courses.map((c) => C(c.runners, 5) > 0 ? C(k, 5) / C(c.runners, 5) : 0))
  console.log('  ' + pad(k, 5) + pad(pct(pod / n), 16) + pad(pct(pod2 / n), 15) + pad(pct(qui / n), 16) +
    pad(pct(qui4 / n), 14) + pct(hp) + ' / ' + pct(hq))
}

/* ───────── 3. la structure des quotas, appliquée au marché ──────────────── */
console.log('\n  LA STRUCTURE DU TICKET (quotas 3-2-1-1-1), appliquée au marché')
console.log('     G1 = rangs 1-4 · G2 = 5-8 · G3 = 9-10 · G4 = 11-12 · G5 = 13+')

const constructions = [
  { cle: 'top8', nom: 'top-8 brut par la cote', f: (o) => o.slice(0, 8) },
  { cle: 'quota', nom: '3-2-1-1-1 (les meilleures cotes, 8 chevaux)', f: (o) => [...o.slice(0, 3), ...o.slice(4, 6), ...o.slice(8, 9), ...o.slice(10, 11), ...o.slice(12, 13)] },
  { cle: 'quota7', nom: '3-2-1-1-0 (G5 rendu, 7 chevaux)', f: (o) => [...o.slice(0, 3), ...o.slice(4, 6), ...o.slice(8, 9), ...o.slice(10, 11)] },
  { cle: 'quota_g2', nom: '3-2-1-1-0 + le siège va à G2 (8)', f: (o) => [...o.slice(0, 3), ...o.slice(4, 7), ...o.slice(8, 9), ...o.slice(10, 11)] },
  { cle: 'top12', nom: 'top-12 brut par la cote', f: (o) => o.slice(0, 12) },
]
console.log('  ' + pad('construction', 44) + pad('chevaux', 9) + pad('podium entier', 15) + pad('quinté entier', 15) + '≥4 quinté')
for (const k of constructions) {
  let pod = 0, qui = 0, qui4 = 0, nb = 0
  for (const c of courses) {
    const t = new Set(k.f(c.ordre))
    nb = t.size
    if (c.arrivee.slice(0, 3).every((x) => t.has(x))) pod++
    if (c.arrivee.slice(0, 5).every((x) => t.has(x))) qui++
    if (c.arrivee.slice(0, 5).filter((x) => t.has(x)).length >= 4) qui4++
  }
  console.log('  ' + pad(k.nom, 44) + pad(nb, 9) + pad(pct(pod / n), 15) + pad(pct(qui / n), 15) + pct(qui4 / n))
}

/* ───────── 4. le siège de G5 : est-ce qu'il paie ? ──────────────────────── */
console.log('\n  LE SIÈGE DE G5 (un cheval de rang 13 ou plus)')
{
  let utile = 0, inutile = 0, absent = 0
  for (const c of courses) {
    const q = c.arrivee.slice(0, 5)
    const bas = q.filter((x) => c.rang[x] >= 13)
    if (bas.length) utile++; else if (q.every((x) => c.rang[x] <= 12)) inutile++
    else absent++
  }
  console.log('     courses où un cheval de rang 13+ finit dans les 5 : ' + pct(utile / n) + '  (' + utile + '/' + n + ')')
  console.log('     courses où les 5 sont tous dans le top 12      : ' + pct(inutile / n) + '  (' + inutile + '/' + n + ')')
}

/* ───────── 5. stabilité : deux moitiés ──────────────────────────────────── */
console.log('\n  STABILITÉ — même chose sur les deux moitiés du corpus')
{
  const mid = Math.floor(n / 2)
  const A = courses.slice(0, mid), B = courses.slice(mid)
  const f = (arr, k) => {
    let pod = 0, qui = 0
    for (const c of arr) {
      const t = new Set(c.ordre.slice(0, k))
      if (c.arrivee.slice(0, 3).every((x) => t.has(x))) pod++
      if (c.arrivee.slice(0, 5).every((x) => t.has(x))) qui++
    }
    return pct(pod / arr.length) + ' · ' + pct(qui / arr.length)
  }
  console.log('     top-8   : 1ʳᵉ moitié ' + f(A, 8) + '   |   2ᵈᵉ moitié ' + f(B, 8))
  console.log('     top-12  : 1ʳᵉ moitié ' + f(A, 12) + '   |   2ᵈᵉ moitié ' + f(B, 12))
}
/* ───────── 6. les 96 courses de référence : trois constructions ─────────── */
/* Mêmes courses, même arrivée : le ticket du moteur (press 3-2-1-1-1), le
   top-8 par la presse, le top-8 par le marché. */
{
  const { buildGrid, remplirGrille } = await import('../src/lib/quinte.js')
  const ref = []
  for (const q of STATS) {
    const cotes = q.cotes
    if (!cotes || Object.keys(cotes).length < 12) continue
    if (!q.arrivee || q.arrivee.length < 5) continue
    const nums = Object.keys(cotes).map(Number)
    if (nums.some((x) => !(cotes[x] > 1))) continue
    const presse = (q.presse?.length >= 10 ? q.presse : []).filter((x) => cotes[x] > 1)
    if (presse.length < 10) continue
    let g
    try { g = buildGrid(presse, nums) } catch { continue }
    ref.push({ q, g, nums, presse, cotes })
  }

  const bilan = (cle) => {
    let pod = 0, qui = 0, qui4 = 0, nb = 0
    for (const r of ref) {
      const t = new Set(cle(r))
      nb = t.size
      if (r.q.arrivee.slice(0, 3).every((x) => t.has(x))) pod++
      if (r.q.arrivee.slice(0, 5).every((x) => t.has(x))) qui++
      if (r.q.arrivee.slice(0, 5).filter((x) => t.has(x)).length >= 4) qui4++
    }
    return { nb, pod: pod / ref.length, qui: qui / ref.length, qui4: qui4 / ref.length }
  }

  const ordreMarche = (cotes) => Object.keys(cotes).map(Number).sort((a, b) => cotes[a] - cotes[b] || a - b)

  const constructions = [
    {
      nom: 'le moteur — presse 3-2-1-1-1 (8)',
      f: (r) => {
        const classement = r.g.groupes.flatMap((x) => x.cases).slice()
          .sort((a, b) => a.place - b.place).map((x) => ({ p: { num: x.num }, s: null, ok: true }))
        const cotes = Object.fromEntries(Object.keys(r.cotes).map((x) => [x, { cote: r.cotes[x] }]))
        return remplirGrille(r.g, classement, r.q.discipline, cotes).ticket
      },
    },
    { nom: 'top-8 par la PRESSE', f: (r) => r.presse.slice(0, 8) },
    { nom: 'top-8 par le MARCHÉ', f: (r) => ordreMarche(r.cotes).slice(0, 8) },
    { nom: 'top-10 par le MARCHÉ', f: (r) => ordreMarche(r.cotes).slice(0, 10) },
    { nom: 'top-12 par le MARCHÉ', f: (r) => ordreMarche(r.cotes).slice(0, 12) },
  ]

  console.log('\n  LES 96 COURSES DE RÉFÉRENCE — mêmes courses, constructions comparées')
  console.log('  ' + pad('construction', 34) + pad('chevaux', 9) + pad('podium entier', 15) + pad('quinté entier', 15) + '≥4 quinté')
  for (const k of constructions) {
    const b = bilan(k.f)
    console.log('  ' + pad(k.nom, 34) + pad(b.nb, 9) + pad(pct(b.pod), 15) + pad(pct(b.qui), 15) + pct(b.qui4))
  }
  console.log('  (' + ref.length + ' courses)')
}

console.log('')
