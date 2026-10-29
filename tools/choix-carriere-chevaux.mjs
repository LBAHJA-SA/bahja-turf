/* =============================================================================
 * tools/choix-carriere-chevaux.mjs — LE CHOIX DANS LE BLOC PAR LE CHEVAL,
 * PAS PAR LA CASE (29/10/2026)
 *
 * D'où ça vient : §11.43 a montré que la bassmat ne peut pas choisir — c'est une
 * statistique de CASE, elle ne sépare pas deux chevaux du même bloc (4 points
 * d'écart au plus). Le seul signal capable de le faire est **par cheval**.
 *
 * §11.42 a testé un SCORE de carrière pondéré (forme 22 %, distance 22 %,
 * piste 18 %…) : il gagne en G1 et perd partout ailleurs. Ce fichier teste
 * autre chose — les signaux **bruts**, un par un, sur le corpus neuf
 * `data/corpus/carriere-v2.json` qui porte enfin `poids`, `alloc` (le niveau des
 * courses courues), les dates et le terrain du jour :
 *
 *   poids      le poids du jour                  (haut / bas du lot)
 *   alloc3     le niveau moyen des 3 dernières   (il a couru plus riche)
 *   desc       prix du jour / alloc3             (il DESCEND de classe)
 *   jours      jours depuis la dernière course   (fraîcheur)
 *   typeMem    même discipline que la dernière   (haies / steeple / plat)
 *   distEcart  écart de distance avec la dernière
 *   place3     meilleure place des 3 dernières
 *   age        âge
 *
 * Et l'illogisme demandé par l'utilisateur : garder (quota − 1) meilleurs +
 * **le pire** du bloc — le cheval que la logique rejette.
 *
 * Protocole identique aux autres mesures : une seule chose change à la fois,
 * moitiés chronologiques, quartiles, bootstrap apparié sur les événements qui
 * paient (5/5, ≥4, podium).
 *
 *   node tools\choix-carriere-chevaux.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)
const padL = (s, n) => String(s).padStart(n)
const r1 = (x) => Math.round(10 * x) / 10
const jour = (s) => {
  const d = new Date(String(s) + 'T00:00:00Z')
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}
const moyenne = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : null)

/* ─────────────────────────────── le corpus ─────────────────────────────── */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const CAR = JSON.parse(fs.readFileSync('data/corpus/carriere-v2.json', 'utf8'))
const IDS = ['G1', 'G2', 'G3', 'G4', 'G5']
const QUOTAS = [3, 2, 1, 1, 1]

const C = []
let sansCarriere = 0
for (const q of TOUT) {
  if (!q.cotes || Object.keys(q.cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  if (!(q.presse && q.presse.length >= 10)) continue
  const nums = Object.keys(q.cotes).map(Number)
  if (nums.some((n) => !(q.cotes[n] > 1))) continue
  const syn = q.presse.filter((n) => q.cotes[n] > 1)
  if (syn.length < 10) continue
  const course = CAR[q.date + '|' + q.id]
  if (!course) { sansCarriere++; continue }
  const grille = buildGrid(syn, nums)

  /* les signaux, cheval par cheval */
  const prix = Number(course.prix) || null
  const S = {}
  for (const n of nums) {
    const h = course.chevaux?.[n]
    const runs = (h?.runs || []).filter((r) => r && r.date)
    const l3 = runs.slice(0, 3)
    const allocs = l3.map((r) => Number(r.alloc)).filter((x) => Number.isFinite(x) && x > 0)
    const alloc3 = moyenne(allocs)
    const poids = Number(h?.poids)
    const dernier = runs[0] || null
    const j0 = jour(q.date)
    const jl = dernier ? jour(dernier.date) : null
    const ecart = j0 && jl ? Math.round((j0 - jl) / 86400000) : null
    const types = (a, b) => {
      const m = (x) => String(x || '').toLowerCase().split(/[\s-]/)[0]
      return m(a) && m(b) && m(a) === m(b) ? 1 : 0
    }
    const places = l3.map((r) => Number(r.place)).filter((x) => Number.isFinite(x) && x > 0)
    S[n] = {
      poids: Number.isFinite(poids) ? poids : null,
      alloc3,
      desc: alloc3 && prix ? prix / alloc3 : null,
      jours: ecart,
      typeMem: dernier ? types(course.type, dernier.type) : null,
      distEcart: dernier && Number.isFinite(Number(dernier.dist))
        ? Math.abs(Number(course.distance) - Number(dernier.dist)) : null,
      place3: places.length ? Math.min(...places) : null,
      age: Number.isFinite(Number(h?.age)) ? Number(h.age) : null,
    }
  }
  /* le poids RELATIF au lot (le haut du handicap) */
  const poidsLot = nums.map((n) => S[n].poids).filter((x) => x != null).sort((a, b) => a - b)
  const medianPoids = poidsLot.length ? poidsLot[Math.floor(poidsLot.length / 2)] : null
  for (const n of nums) S[n].poidsRel = S[n].poids != null && medianPoids != null ? S[n].poids - medianPoids : null

  /* le rang de marché (1 = la cote la plus basse) : sert à la PRODUCTION,
   * qui prend G4 et G5 au marché (§11.23) — le point de comparaison honnête. */
  const rm = Object.fromEntries(
    nums.slice().sort((a, b) => q.cotes[a] - q.cotes[b] || a - b).map((n, k) => [n, k + 1]),
  )
  C.push({ date: q.date, grille, arrivee: q.arrivee.slice(0, 5), S, nums, rm })
}
console.log('\n  corpus : ' + C.length + ' Quintés avec carrière complète' +
  (sansCarriere ? ' · ' + sansCarriere + ' sans carrière' : ''))

/* ⚠ POINT DE COMPARAISON — la PRODUCTION, pas « carnet partout » :
 * G1-G3 au carnet, G4-G5 au marché (§11.23). Un signal ne remplace donc qu'UN
 * bloc, les quatre autres restant sur la règle de production. Sans ça, un
 * « signal en G4 » mesurerait simplement le passage de carnet à marché. */
const BASE = { G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'marche', G5: 'marche' }

/** trie les cases d'un bloc selon `mode` : 'carnet' · 'marche' · {cle, sens} */
function trier(c, cases, mode) {
  const arr = cases.slice()
  if (mode === 'marche') {
    return arr.sort((a, b) => {
      const ra = c.rm[a.num], rb = c.rm[b.num]
      if (ra == null && rb == null) return a.place - b.place
      if (ra == null) return 1
      if (rb == null) return -1
      return ra - rb || a.place - b.place
    })
  }
  if (mode === 'carnet' || mode == null) return arr.sort((a, b) => a.place - b.place)
  const val = (x) => {
    const v = c.S[x.num]?.[mode.cle]
    return v == null ? null : (mode.sens || 1) * v
  }
  return arr.sort((a, b) => {
    const va = val(a), vb = val(b)
    if (va == null && vb == null) return a.place - b.place
    if (va == null) return 1
    if (vb == null) return -1
    return vb - va || a.place - b.place
  })
}

/** le ticket : la production, avec `remplacements[bloc] = mode` si fourni.
 *  `illogique` = garder (quota − 1) meilleurs + LE PIRE du bloc remplacé. */
function jouer(c, remplacements = {}, illogique = false) {
  const out = []
  c.grille.groupes.forEach((g, k) => {
    const q = Math.min(QUOTAS[k], g.cases.length)
    const rempl = remplacements[g.id]
    const tri = trier(c, g.cases, rempl || BASE[g.id])
    if (illogique && rempl && q >= 2) {
      tri.slice(0, q - 1).forEach((x) => out.push(x.num))
      out.push(tri[tri.length - 1].num)
    } else {
      tri.slice(0, q).forEach((x) => out.push(x.num))
    }
  })
  return out
}

const prodJouer = (c) => jouer(c)
const jouerSignal = (c, signaux) => jouer(c, signaux)
const jouerIllogique = (c, signaux) => jouer(c, signaux, true)

function noter(faire, liste = C.map((_, i) => i)) {
  let pod = 0, qui = 0, q4 = 0, tot = 0
  for (const i of liste) {
    const c = C[i]
    const t = new Set(faire(c))
    const arr = c.arrivee
    const k = arr.filter((n) => t.has(n)).length
    tot += t.size
    if (arr.slice(0, 3).every((n) => t.has(n))) pod++
    if (k === 5) qui++
    if (k >= 4) q4++
  }
  return { n: liste.length, pod, qui, q4, chevaux: tot / liste.length }
}

/* ────────────────────────────── les signaux testés ─────────────────────── */
const SIGNAUX = [
  { cle: 'poids', sens: 1, lib: 'poids du jour (le plus lourd)' },
  { cle: 'poids', sens: -1, lib: 'poids du jour (le plus léger)' },
  { cle: 'alloc3', sens: 1, lib: 'niveau des 3 dernières (a couru plus riche)' },
  { cle: 'desc', sens: 1, lib: 'DESCEND de classe (prix / alloc3)' },
  { cle: 'jours', sens: -1, lib: 'fraîcheur (le moins de jours)' },
  { cle: 'jours', sens: 1, lib: 'fraîcheur (le plus de jours)' },
  { cle: 'typeMem', sens: 1, lib: 'même discipline que la dernière' },
  { cle: 'distEcart', sens: -1, lib: 'distance la plus proche de la dernière' },
  { cle: 'place3', sens: -1, lib: 'meilleure place des 3 dernières' },
  { cle: 'age', sens: -1, lib: 'le plus jeune' },
  { cle: 'age', sens: 1, lib: 'le plus vieux' },
]
const PROD = noter(prodJouer)
console.log('  PRODUCTION (G1-G3 carnet · G4-G5 marché, quotas 3-2-1-1-1) : ' + pct(PROD.pod, PROD.n) + ' podium · ' +
  pct(PROD.qui, PROD.n) + ' quinté · ' + pct(PROD.q4, PROD.n) + ' ≥4\n')

const m = Math.floor(C.length / 2)
const T = (liste) => liste.map((_, i) => i)
const Q = Math.floor(C.length / 4)
const quartiers = (faire) => [0, 1, 2, 3].map((k) => {
  const d = T(C).slice(k * Q, k === 3 ? C.length : (k + 1) * Q)
  return noter(faire, d).qui
})

/* les blocs testés : partout, puis G1 seul, puis G4-G5 seuls */
const CADRES = [
  { lib: 'partout', blocs: IDS },
  { lib: 'G1 seul', blocs: ['G1'] },
  { lib: 'G2 seul', blocs: ['G2'] },
  { lib: 'G3 seul', blocs: ['G3'] },
  { lib: 'G4 seul', blocs: ['G4'] },
  { lib: 'G5 seul', blocs: ['G5'] },
]
const cadre = (sp, blocs) => Object.fromEntries(blocs.map((id) => [id, sp]))

const LIGNES = []
for (const sp of SIGNAUX) {
  for (const cd of CADRES) {
    const signaux = cadre(sp, cd.blocs)
    const r = noter((c) => jouerSignal(c, signaux))
    const a = noter((c) => jouerSignal(c, signaux), T(C).slice(0, m))
    const b = noter((c) => jouerSignal(c, signaux), T(C).slice(m))
    const qq = quartiers((c) => jouerSignal(c, signaux))
    LIGNES.push({ type: 'signal', sp, cd, r, a, b, qq })
  }
  /* l'illogisme : le pire du bloc */
  const r = noter((c) => jouerIllogique(c, cadre(sp, IDS)))
  const a = noter((c) => jouerIllogique(c, cadre(sp, IDS)), T(C).slice(0, m))
  const b = noter((c) => jouerIllogique(c, cadre(sp, IDS)), T(C).slice(m))
  LIGNES.push({ type: 'illogique', sp, cd: { lib: 'partout + le pire', blocs: IDS }, r, a, b, qq: quartiers((c) => jouerIllogique(c, cadre(sp, IDS))) })
}

LIGNES.sort((x, y) => (y.r.qui - x.r.qui) || (y.r.pod - x.r.pod))

console.log('  ' + pad('signal', 44) + pad('cadre', 18) + pad('podium', 9) + pad('quinté', 9) +
  pad('≥4', 8) + pad('1ʳᵉ', 7) + pad('2ᵈᵉ', 7) + 'quartiles')
for (const L of LIGNES.slice(0, 22)) {
  const nom = (L.type === 'illogique' ? '⚠ ' : '') + L.sp.lib
  console.log('  ' + pad(nom, 44) + pad(L.cd.lib, 18) + pad(pct(L.r.pod, L.r.n), 9) +
    pad(pct(L.r.qui, L.r.n), 9) + pad(pct(L.r.q4, L.r.n), 8) +
    pad(L.a.qui, 7) + pad(L.b.qui, 7) + L.qq.join(' · '))
}
console.log('\n  (production : ' + PROD.pod + ' / ' + PROD.qui + ' / ' + PROD.q4 + ' sur ' + PROD.n +
  '  →  ' + pct(PROD.pod, PROD.n) + ' · ' + pct(PROD.qui, PROD.n) + ' · ' + pct(PROD.q4, PROD.n) + ')')

/* ─────────────── le filtre d'adoption : les 4 conditions ───────────────── */
const evts = (faire) => C.map((c) => {
  const t = new Set(faire(c))
  const k = c.arrivee.filter((n) => t.has(n)).length
  return { c5: k === 5 ? 1 : 0, c4: k >= 4 ? 1 : 0, c3: c.arrivee.slice(0, 3).every((n) => t.has(n)) ? 1 : 0 }
})
const boot = (d) => {
  let mieux = 0
  for (let t = 0; t < 10000; t++) {
    let s = 0
    for (let k = 0; k < d.length; k++) s += d[Math.floor(Math.random() * d.length)]
    if (s > 0) mieux++
  }
  return mieux / 100
}
const A0 = evts(prodJouer)
/* quartiles et moitiés de la production — les mêmes découpages, pour comparer
 * des nombres comparables (jamais 12 contre 96). */
const PROD_Q = quartiers(prodJouer)
const PROD_A = noter(prodJouer, T(C).slice(0, m))
const PROD_B = noter(prodJouer, T(C).slice(m))
const D = T(C)
const QUARTS = [0, 1, 2, 3].map((k) => D.slice(k * Q, k === 3 ? C.length : (k + 1) * Q))
console.log('\n  PRODUCTION par quart : ' + PROD_Q.join(' · ') +
  ' (sur ' + QUARTS.map((q) => q.length).join('/') + ') · moitiés ' + PROD_A.qui + '/' + PROD_B.qui)
/* Un candidat doit d'abord SURVIVRE au tri dense : plus de quinté ET pas moins
 * de podium. C'est la condition de §11.25 (le podium est la métrique lisible). */
const finalistes = LIGNES.filter((L) => L.r.qui > PROD.qui && L.r.pod >= PROD.pod)
console.log('  FILTRE (dense + moitiés + quartiles + bootstrap ≥ 80 %) — ' + finalistes.length +
  ' candidat(s) au-dessus de ' + pct(PROD.qui, PROD.n) + ' de quinté')
const retenus = []
for (const L of [...finalistes, ...LIGNES.filter((L) => L.r.qui === PROD.qui && L.type === 'signal').slice(0, 6)]) {
  const faire = (c) => (L.type === 'illogique' ? jouerIllogique(c, cadre(L.sp, L.cd.blocs)) : jouerSignal(c, cadre(L.sp, L.cd.blocs)))
  const B0 = evts(faire)
  const b5 = boot(A0.map((x, i) => B0[i].c5 - x.c5))
  const b4 = boot(A0.map((x, i) => B0[i].c4 - x.c4))
  const b3 = boot(A0.map((x, i) => B0[i].c3 - x.c3))
  const qg = L.qq.filter((x, i) => x > PROD_Q[i]).length
  const qp = L.qq.filter((x, i) => x < PROD_Q[i]).length
  const ok = L.r.qui > PROD.qui && L.a.qui > PROD_A.qui && L.b.qui > PROD_B.qui &&
    b5 >= 80 && qg >= 3 && qp === 0
  console.log('  ' + pad((L.type === 'illogique' ? '⚠ ' : '') + L.sp.lib, 44) + pad(L.cd.lib, 16) +
    pad('5/5 ' + L.r.qui, 10) + pad('moitiés ' + L.a.qui + '/' + L.b.qui + ' (prod ' + PROD_A.qui + '/' + PROD_B.qui + ')', 26) +
    pad('boot ' + b5.toFixed(1) + ' %', 14) + pad('quarts +' + qg + '/−' + qp, 12) +
    pad('≥4 boot ' + b4.toFixed(1) + ' %', 16) + (ok ? '✓ RETENU' : ''))
  if (ok) retenus.push(L)
}
console.log('\n  ' + (retenus.length
  ? retenus.length + ' règle(s) passent le filtre : ' + retenus.map((L) => L.sp.lib + ' · ' + L.cd.lib).join(' | ')
  : 'AUCUNE règle ne passe le filtre — la production reste G1-G3 carnet · G4-G5 marché'))
console.log('')

/* ─────────────────────────────── l'artefact ────────────────────────────── */
const sortie = {
  quand: new Date().toISOString(),
  corpus: C.length,
  production: { podium: r1(100 * PROD.pod / PROD.n), quinte: r1(100 * PROD.qui / PROD.n), q4: r1(100 * PROD.q4 / PROD.n) },
  lignes: LIGNES.map((L) => ({
    type: L.type, signal: L.sp.lib, cle: L.sp.cle, sens: L.sp.sens, cadre: L.cd.lib,
    podium: r1(100 * L.r.pod / L.r.n), quinte: r1(100 * L.r.qui / L.r.n), q4: r1(100 * L.r.q4 / L.r.n),
    moitie1: L.a.qui, moitie2: L.b.qui, quartiles: L.qq,
  })),
  reglesRetenues: retenus.map((L) => ({ signal: L.sp.lib, cadre: L.cd.lib })),
}
fs.writeFileSync('data/choix-carriere-chevaux.json', JSON.stringify(sortie, null, 1))
try { fs.mkdirSync('public/data', { recursive: true }); fs.writeFileSync('public/data/choix-carriere-chevaux.json', JSON.stringify(sortie, null, 1)) } catch { /* pas de page */ }
console.log('  artefact : data/choix-carriere-chevaux.json')
