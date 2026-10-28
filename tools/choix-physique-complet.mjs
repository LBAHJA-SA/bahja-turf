/* =============================================================================
 * tools/choix-physique-complet.mjs — LE CHOIX PAR LE PHYSIQUE, 4 CRITÈRES SUR 6
 *                                     (28/10/2026)
 *
 * §11.24 avait conclu « le score physique ne choisit pas mieux que le carnet ».
 * Mais la carrière qu'on lui donnait ne portait que `distance + place` : deux
 * critères sur six. Ce fichier refait la mesure avec la carrière COMPLÈTE
 * (`tools/carriere-v2.mjs`) :
 *
 *   FORME UTILE 22 %   courses à ±400 m, points de place, poids 1/(1+0,55·i)
 *   DISTANCE    22 %   distance pratiquée la plus proche
 *   PISTE       18 %   hippodrome déjà couru (60 %) + ce qu'il y a fait (40 %)
 *   NIVEAU      13 %   allocation du jour / allocation de ses 2 dernières
 *                      (> 1,5 = il monte de niveau → 0, c'est le filtre ③)
 *
 *   TERRAIN 13 % et CORDE 12 % restent DEHORS : l'API ne donne pas le terrain
 *   des courses passées, et `number` est un numéro de selle, pas une corde.
 *   Le score est donc normalisé sur les 75 % réellement disponibles.
 *
 * Règles mesurées, bloc par bloc (une seule change à la fois) :
 *   physique        les k meilleurs scores
 *   illogique       les k pires (l'anti-règle, pour en mesurer le prix)
 *   mixte           (k−1) meilleurs + le pire       ← « du logique et de l'illogique »
 *   carnet · marche les deux productions, pour comparer
 *
 * Puis les scénarios GLOBAUX (la règle sur les cinq blocs, sans presse ni cote).
 *
 * Filtre de décision (§11.24) : 2/2 moitiés + bootstrap ≥ 80 % + 3/4 quarts.
 *
 *   node tools\choix-physique-complet.mjs  →  data/choix-physique-complet.json
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : 0)
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const CAR = JSON.parse(fs.readFileSync('data/corpus/carriere-v2.json', 'utf8'))
const QUOTA = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }
const BLOCS = ['G1', 'G2', 'G3', 'G4', 'G5']
const PROD_CLE = { G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'marche', G5: 'marche' }
const PTS = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 }
/* les poids de la méthode, ramenés aux 75 % disponibles */
const POIDS = { forme: 22, dist: 22, piste: 18, niveau: 13 }
const TOT = POIDS.forme + POIDS.dist + POIDS.piste + POIDS.niveau

const norm = (x) => String(x || '')
  .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '')
const memePiste = (a, b) => {
  const x = norm(a), y = norm(b)
  return x.length >= 5 && y.length >= 5 && (x.includes(y) || y.includes(x))
}

/* ───────────────────── ① le score physique d'un partant ─────────────────── */
function physiques(chevaux, course) {
  const distance = Number(course.distance) || 0
  const prixJour = Number(course.prix) || 0
  const out = {}
  for (const [num, ch] of Object.entries(chevaux || {})) {
    const runs = (ch.runs || []).filter((r) => r.date)
    /* FORME UTILE — ±400 m, points de place pondérés vers le passé */
    const utiles = runs.filter((r) => r.dist && Math.abs(r.dist - distance) <= 400)
    const base = utiles.length >= 2 ? utiles : runs
    let s = 0, w = 0
    base.forEach((r, i) => {
      const wi = 1 / (1 + i * 0.55)
      s += (PTS[r.place] ?? 0) * wi
      w += wi
    })
    const forme = w ? s / w : 5                       /* 0..10 */
    /* DISTANCE */
    const ecart = runs.length
      ? Math.min(...runs.map((r) => (r.dist ? Math.abs(r.dist - distance) : 9999)))
      : 9999
    const dist = ecart <= 100 ? 10 : ecart <= 200 ? 8 : ecart <= 400 ? 5 : ecart <= 600 ? 3 : 0
    /* PISTE */
    const ici = runs.filter((r) => memePiste(r.track, course.track))
    const presence = ici.length >= 3 ? 10 : ici.length === 2 ? 7 : ici.length === 1 ? 4 : 0
    const meilleur = ici.length ? Math.min(...ici.map((r) => r.place ?? 99)) : 99
    const qualite = meilleur <= 2 ? 10 : meilleur <= 4 ? 7 : meilleur <= 8 ? 4 : 1
    const piste = ici.length ? 0.6 * presence + 0.4 * qualite : 0
    /* NIVEAU — allocation du jour vs ses 2 dernières (filtre ③ généralisé) */
    const allocs = runs.slice(0, 2).map((r) => r.alloc).filter((x) => x > 0)
    const allocMoy = allocs.length ? allocs.reduce((a, b) => a + b, 0) / allocs.length : 0
    let niveau = 5                                     /* inconnu : neutre */
    let ratio = null
    if (prixJour > 0 && allocMoy > 0) {
      ratio = prixJour / allocMoy
      niveau = ratio <= 0.9 ? 10 : ratio <= 1.1 ? 8 : ratio <= 1.3 ? 5 : ratio <= 1.5 ? 3 : 0
    }
    /* le total, normalisé sur les 75 % disponibles */
    const total = (POIDS.forme * forme + POIDS.dist * dist + POIDS.piste * piste + POIDS.niveau * niveau) / TOT
    out[Number(num)] = {
      forme: +forme.toFixed(2), dist, piste: +piste.toFixed(2), niveau,
      ratio: ratio == null ? null : +ratio.toFixed(2),
      note: +total.toFixed(2),
      utiles: utiles.length, ici: ici.length,
    }
  }
  return out
}

/* ─────────────────────────── ② le corpus ───────────────────────────────── */
const courses = []
let ecartees = 0, sansCarriere = 0
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12 || !q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number).filter((n) => cotes[n] > 1)
  if (nums.length < 10) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  const car = CAR[q.date + '|' + q.id]
  if (!car || car.erreur) { sansCarriere++; continue }
  let g
  try { g = buildGrid(syn, nums) } catch { continue }
  const ph = physiques(car.chevaux, { ...car, distance: car.distance || q.distance, prix: car.prix || q.prix })
  const bloc = {}
  for (const gr of g.groupes) {
    bloc[gr.id] = gr.cases.map((c) => ({
      slot: c.slot, num: c.num, place: c.place, cote: cotes[c.num],
      note: ph[c.num]?.note ?? 5,
      forme: ph[c.num]?.forme ?? null, dist: ph[c.num]?.dist ?? null,
      piste: ph[c.num]?.piste ?? null, niveau: ph[c.num]?.niveau ?? null,
      ratio: ph[c.num]?.ratio ?? null,
    })).sort((a, b) => a.slot - b.slot)
  }
  if (bloc.G1?.length < 4 || bloc.G2?.length < 4 || bloc.G3?.length < 2
    || bloc.G4?.length < 2 || bloc.G5?.length < 1) { ecartees++; continue }
  courses.push({ date: q.date, arrivee: q.arrivee.slice(0, 5), bloc })
}
const N = courses.length

/* combien de partants ont vraiment un ratio de niveau ? (contrôle honnêteté) */
let cases = 0, avecRatio = 0, avecPiste = 0
for (const c of courses) for (const b of BLOCS) for (const x of c.bloc[b]) {
  cases++
  if (x.ratio != null) avecRatio++
  if (x.piste > 0) avecPiste++
}

/* ─────────────────────────── ③ les règles ──────────────────────────────── */
const parNote = (inv) => (a, b) => (inv ? a.note - b.note : b.note - a.note) || a.place - b.place
const TRIS = {
  carnet: (a, b) => a.place - b.place || a.slot - b.slot,
  marche: (a, b) => a.cote - b.cote || a.place - b.place,
  physique: parNote(false), illogique: parNote(true),
}
const REGLES = {
  carnet: 'rang de presse (production G1-G3)',
  marche: 'cote la plus courte (production G4-G5)',
  physique: 'PHYSIQUE 4 critères (forme·distance·piste·niveau)',
  mixte: 'MIXTE — (k−1) physiques + le plus faible',
  illogique: 'ILLOGIQUE — les k plus faibles',
}
function choisir(cle, c, b) {
  const cs = c.bloc[b]
  const k = QUOTA[b]
  if (cle === 'mixte') {
    const sur = cs.slice().sort(parNote(false))
    const garde = sur.slice(0, Math.max(1, k - 1))
    if (k < 2) return garde.slice(0, k).map((x) => x.num)
    const reste = cs.filter((x) => !garde.includes(x)).sort(parNote(true))
    return garde.concat(reste.slice(0, 1)).slice(0, k).map((x) => x.num)
  }
  return cs.slice().sort(TRIS[cle]).slice(0, k).map((x) => x.num)
}
const choixProd = (c) => {
  const o = {}
  for (const b of BLOCS) o[b] = choisir(PROD_CLE[b], c, b)
  return o
}
const ticket = (o) => BLOCS.flatMap((b) => o[b])

/* ─────────────────────────── ④ les notes ───────────────────────────────── */
const note = (f, l = courses) => {
  let pod = 0, qui = 0, q4 = 0, ch = 0
  for (const c of l) {
    const s = new Set(f(c))
    ch += s.size
    if (c.arrivee.slice(0, 3).every((x) => s.has(x))) pod++
    if (c.arrivee.slice(0, 5).every((x) => s.has(x))) qui++
    if (c.arrivee.filter((x) => s.has(x)).length >= 4) q4++
  }
  return { pod: pct(pod, l.length), qui: pct(qui, l.length), q4: pct(q4, l.length), ch: +(ch / l.length).toFixed(2) }
}
const H1 = courses.slice(0, Math.floor(N / 2))
const H2 = courses.slice(Math.floor(N / 2))

function bootstrap(fa, fb, essais = 10000, graine = 86420) {
  let s = graine
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
  let mieux = 0, pire = 0, egal = 0, mieuxPod = 0
  for (let e = 0; e < essais; e++) {
    let qa = 0, qb = 0, pa = 0, pb = 0
    for (let j = 0; j < N; j++) {
      const c = courses[Math.floor(rnd() * N)]
      const sa = new Set(fa(c)), sb = new Set(fb(c))
      if (c.arrivee.slice(0, 5).every((x) => sa.has(x))) qa++
      if (c.arrivee.slice(0, 5).every((x) => sb.has(x))) qb++
      if (c.arrivee.slice(0, 3).every((x) => sa.has(x))) pa++
      if (c.arrivee.slice(0, 3).every((x) => sb.has(x))) pb++
    }
    if (qa > qb) mieux++; else if (qa < qb) pire++; else egal++
    if (pa > pb) mieuxPod++
  }
  return { mieux: +(100 * mieux / essais).toFixed(1), pire: +(100 * pire / essais).toFixed(1), egal: +(100 * egal / essais).toFixed(1), mieuxPod: +(100 * mieuxPod / essais).toFixed(1) }
}
const quarts = (f) => {
  const out = []
  for (let k = 0; k < 4; k++) {
    const a = Math.floor(k * N / 4), z = Math.floor((k + 1) * N / 4)
    const l = courses.slice(a, z)
    out.push({ quart: k + 1, n: l.length, prod: note(fProd, l).qui, regle: note(f, l).qui })
  }
  return { quarts: out, mieux: out.filter((q) => q.regle > q.prod).length, pire: out.filter((q) => q.regle < q.prod).length }
}

const fProd = (c) => ticket(choixProd(c))
const ref = note(fProd)
const refH1 = note(fProd, H1), refH2 = note(fProd, H2)

/* ─────────────────── ⑤ bloc par bloc + scénarios globaux ───────────────── */
const parBloc = {}
for (const b of BLOCS) {
  const lignes = Object.keys(REGLES).map((cle) => {
    const f = (c) => { const o = choixProd(c); o[b] = choisir(cle, c, b); return ticket(o) }
    const m = note(f)
    const h1 = note(f, H1), h2 = note(f, H2)
    const gagne2 = cle !== PROD_CLE[b] && h1.qui >= refH1.qui && h2.qui >= refH2.qui
      && (h1.qui > refH1.qui || h2.qui > refH2.qui)
    const q = cle === PROD_CLE[b] ? null : quarts(f)
    return {
      cle, lib: REGLES[cle], ...m,
      dPod: +(m.pod - ref.pod).toFixed(1), dQui: +(m.qui - ref.qui).toFixed(1),
      h1, h2, gagne2,
      boot: cle === PROD_CLE[b] ? null : bootstrap(f, fProd),
      quarts: q?.quarts ?? null, gagneQuarts: q?.mieux ?? null, perdQuarts: q?.pire ?? null,
    }
  }).sort((x, y) => y.qui - x.qui || y.pod - x.pod)
  parBloc[b] = lignes
}

const globaux = {}
for (const cle of ['physique', 'mixte', 'illogique']) {
  const f = (c) => BLOCS.flatMap((b) => choisir(cle, c, b))
  const m = note(f)
  const h1 = note(f, H1), h2 = note(f, H2)
  const q = quarts(f)
  globaux[cle] = {
    ...m, h1, h2, boot: bootstrap(f, fProd),
    dPod: +(m.pod - ref.pod).toFixed(1), dQui: +(m.qui - ref.qui).toFixed(1),
    quarts: q.quarts, gagneQuarts: q.mieux, perdQuarts: q.pire,
  }
}

/* la borne haute */
let oPod = 0, oQui = 0
for (const c of courses) {
  const s = new Set()
  for (const b of BLOCS) {
    c.bloc[b].slice().sort((x, y) => {
      const ax = c.arrivee.indexOf(x.num), ay = c.arrivee.indexOf(y.num)
      return (ax < 0 ? 99 : ax) - (ay < 0 ? 99 : ay)
    }).slice(0, QUOTA[b]).forEach((x) => s.add(x.num))
  }
  if (c.arrivee.slice(0, 3).every((x) => s.has(x))) oPod++
  if (c.arrivee.slice(0, 5).every((x) => s.has(x))) oQui++
}

/* ─────────────────────────── ⑥ le rapport ──────────────────────────────── */
const p = (x) => String(x).replace('.', ',')
const sgn = (x) => (x >= 0 ? '+' : '') + p(+x.toFixed(1))
console.log(`\nLE CHOIX PAR LE PHYSIQUE — 4 CRITÈRES SUR 6 · ${N} Quintés (${ecartees} écartée(s), ${sansCarriere} sans carrière)`)
console.log(`  partants couverts : niveau ${p(pct(avecRatio, cases))} % · piste ${p(pct(avecPiste, cases))} % (sur ${cases} cases)`)
console.log(`  référence (production 3-2-1-1-1) : podium ${p(ref.pod)} % · quinté ${p(ref.qui)} % · ≥4 ${p(ref.q4)} % · moitiés ${p(refH1.qui)} / ${p(refH2.qui)}\n`)

for (const b of BLOCS) {
  console.log(`  ${b} — ${QUOTA[b]} case(s) sur ${b === 'G5' ? '2 à 8' : '4'}`)
  for (const l of parBloc[b]) {
    console.log(`    ${l.lib.padEnd(46)} quinté ${String(p(l.qui)).padStart(5)} % (${sgn(l.dQui).padStart(5)}) · podium ${String(p(l.pod)).padStart(5)} % (${sgn(l.dPod).padStart(5)}) · ≥4 ${String(p(l.q4)).padStart(5)} % · moitiés ${p(l.h1.qui)} / ${p(l.h2.qui)}${l.gagne2 ? '  ← 2/2' : ''}${l.boot ? `  (boot ${p(l.boot.mieux)} %, quarts ${l.gagneQuarts}/4 −${l.perdQuarts})` : ''}`)
  }
  console.log('')
}

console.log('  LES SCÉNARIOS GLOBAUX — la règle sur les cinq blocs, sans presse ni cote')
for (const cle of ['physique', 'mixte', 'illogique']) {
  const g = globaux[cle]
  console.log(`    ${REGLES[cle].padEnd(46)} quinté ${String(p(g.qui)).padStart(5)} % (${sgn(g.dQui).padStart(5)}) · podium ${String(p(g.pod)).padStart(5)} % (${sgn(g.dPod).padStart(5)}) · ≥4 ${String(p(g.q4)).padStart(5)} % · moitiés ${p(g.h1.qui)} / ${p(g.h2.qui)} · boot ${p(g.boot.mieux)} % · quarts ${g.gagneQuarts}/4 −${g.perdQuarts}`)
}

const fort = BLOCS.map((b) => parBloc[b].find((l) => l.gagne2 && l.boot.mieux >= 80 && l.gagneQuarts >= 3 && l.perdQuarts === 0)).filter(Boolean)
const demi = BLOCS.map((b) => parBloc[b].find((l) => l.gagne2 && l.boot.mieux >= 80)).filter(Boolean)
const gGlobal = Object.entries(globaux)
  .filter(([, g]) => g.h1.qui >= refH1.qui && g.h2.qui >= refH2.qui && g.boot.mieux >= 80 && g.gagneQuarts >= 3 && g.perdQuarts === 0)
  .sort((a, b) => b[1].qui - a[1].qui)

console.log('')
console.log('  CE QUI PASSE LE FILTRE COMPLET (2/2 + boot ≥ 80 % + 3/4 quarts)')
console.log('   ' + (fort.length
  ? fort.map((l) => `${l.cle} → quinté ${p(l.qui)} % · podium ${p(l.pod)} % · boot ${p(l.boot.mieux)} % · quarts ${l.gagneQuarts}/4`).join('\n   ')
  : 'rien'))
console.log(`  (filtre réduit 2/2 + boot ≥ 80 %, sans les quarts : ${demi.length ? demi.map((l) => l.cle + ' ' + p(l.qui) + ' %').join(', ') : 'rien'})`)
console.log(`\n  borne haute (choix parfait) : podium ${p(pct(oPod, N))} % · quinté ${p(pct(oQui, N))} % · écart restant ${p(+(pct(oQui, N) - ref.qui).toFixed(1))} points\n`)

const verdict = gGlobal.length
  ? `Scénario global retenu : ${REGLES[gGlobal[0][0]]} — quinté ${gGlobal[0][1].qui} % contre ${ref.qui} %, moitiés ${gGlobal[0][1].h1.qui}/${gGlobal[0][1].h2.qui}, bootstrap ${gGlobal[0][1].boot.mieux} %, quarts ${gGlobal[0][1].gagneQuarts}/4.`
  : fort.length
    ? `Par bloc : ${fort.map((l) => l.cle).join(', ')} passe(nt) le filtre complet — à décider par l'utilisateur (${fort.map((l) => 'quinté ' + l.qui + ' % vs ' + l.pod + ' % de podium').join(' ; ')}).`
    : demi.length
      ? `Rien ne passe le filtre complet. Presque : ${demi.map((l) => l.cle + ' (' + l.cle + ') quinté ' + l.qui + ' %, boot ' + l.boot.mieux + ' %, quarts ' + l.gagneQuarts + '/4').join(' ; ')} — le gain ne tient pas sur les quarts, c'est du bruit de sélection.`
      : `Le physique à 4 critères (75 % de la méthode) ne bat pas le carnet dans les blocs : la presse agrège une information — le terrain, la corde, la forme du moment — que l'archive n'a pas. Le gain de G1 ne se reproduit dans aucun autre bloc, donc ce n'est pas une règle, c'est un accident d'échantillon.`

const sortie = {
  outil: 'tools/choix-physique-complet.mjs',
  le: new Date().toISOString().slice(0, 10),
  source: 'data/quintes.json + data/corpus/carriere-v2.json (API casacourses, 5 dernières courses)',
  n: N, ecartees, sansCarriere, quotas: QUOTA, prod: PROD_CLE,
  couverture: { cases, ratioNiveau: pct(avecRatio, cases), piste: pct(avecPiste, cases) },
  definition: 'PHYSIQUE = forme utile (±400 m, points de place, poids 1/(1+0,55·i)) 22 + distance pratiquée 22 + piste (hippodrome déjà couru, 60 % présence / 40 % résultat) 18 + niveau (allocation du jour / allocation de ses 2 dernières, > 1,5 = montée de niveau) 13, normalisé sur 75. Terrain (13) et corde (12) sont absents de l’API : ils restent dehors. MIXTE = (k−1) meilleurs + le plus faible. Aucune règle ne lit la cote ni la presse, sauf les lignes de comparaison.',
  reference: { ...ref, h1: refH1, h2: refH2 },
  blocs: Object.fromEntries(BLOCS.map((b) => [b, parBloc[b]])),
  globaux,
  oracle: { pod: pct(oPod, N), qui: pct(oQui, N) },
  verdict,
}
fs.writeFileSync('data/choix-physique-complet.json', JSON.stringify(sortie, null, 1))
fs.writeFileSync('public/data/choix-physique-complet.json', JSON.stringify(sortie, null, 1))
console.log('VERDICT\n  ' + verdict + '\n')
