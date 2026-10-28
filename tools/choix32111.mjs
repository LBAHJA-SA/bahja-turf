/* =============================================================================
 * tools/choix32111.mjs — LE CHOIX DANS CHAQUE BLOC, À 3-2-1-1-1 (28/10/2026)
 *
 * Décision de l'utilisateur :
 *   « 3-2-1-1-1 هذه هي الاقوى، المشكل في الاختيارات فقط »
 *
 * Donc les QUOTAS sont figés : 3 de G1 · 2 de G2 · 1 de G3 · 1 de G4 · 1 de G5
 * = 8 chevaux, siège G5 compris. La seule question ouverte est **QUI** entre
 * dans chaque bloc, et ce fichier la mesure bloc par bloc.
 *
 * Ce que fait le moteur aujourd'hui (`CHOIX_DU_BLOC`, §11.23) : il trie les
 * cases du bloc par **place de presse** (a.place) et prend les `quota`
 * premières — c'est la règle « carnet ». Les concurrentes mesurées ici :
 *
 *   carnet  · trier par place de presse          (la production)
 *   marché  · trier par cote croissante
 *   fusion  · trier par (rang presse + rang cote)
 *   fixe    · CHAQUE sous-ensemble de cases du bloc (énumération exhaustive :
 *             c'est la borne haute, celle qui dit si un choix fixe existe)
 *
 * ⚠ `gr.cases[].slot` = la case du carnet, `gr.cases[].place` = le rang de
 *   presse. Les deux diffèrent (§11.14) : la grille range les cases par
 *   colonne (parité), pas par rang de presse.
 *
 * Métriques denses (§11.25) : podium entier, quinté entier, ≥4.
 * Un choix n'est retenu que s'il bat le carnet sur le quinté **dans les deux
 * moitiés** ET au bootstrap apparié — sinon c'est du bruit (§11.24).
 *
 *   node tools\choix32111.mjs   →   data/choix32111.json + public/data/choix32111.json
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : 0)
const d = (a, b) => (a - b >= 0 ? '+' : '') + (Math.round(10 * (a - b)) / 10)
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))

/* ─────────────────────────── ① le corpus ────────────────────────────────── */
const courses = []
let ecartees = 0
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12 || !q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number).filter((n) => cotes[n] > 1)
  if (nums.length < 10) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  let g
  try { g = buildGrid(syn, nums) } catch { continue }
  const bloc = {}
  for (const gr of g.groupes) {
    bloc[gr.id] = gr.cases.map((c) => ({ slot: c.slot, num: c.num, place: c.place, cote: cotes[c.num] }))
      .sort((a, b) => a.slot - b.slot)
  }
  /* 3-2-1-1-1 tient 8 chevaux seulement si chaque bloc a de quoi remplir :
   * G1 ≥ 3 · G2 ≥ 2 · G3 ≥ 1 · G4 ≥ 1 · G5 ≥ 1. Pour l'énumération
   * exhaustive on exige les blocs PLEINS (4 · 4 · 2 · 2 · ≥1), sinon un
   * sous-ensemble de 3 cases n'existe pas et le ticket perd un siège. */
  if (bloc.G1?.length < 4 || bloc.G2?.length < 4 || bloc.G3?.length < 2
    || bloc.G4?.length < 2 || bloc.G5?.length < 1) { ecartees++; continue }
  const rangCote = {}
  for (const b of ['G1', 'G2', 'G3', 'G4', 'G5']) {
    bloc[b].slice().sort((a, b2) => a.cote - b2.cote || a.place - b2.place)
      .forEach((c, i) => { rangCote[c.num] = i + 1 })
  }
  courses.push({ date: q.date, arrivee: q.arrivee.slice(0, 5), bloc, rangCote })
}
const N = courses.length
const QUOTA = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }
const BLOCS = ['G1', 'G2', 'G3', 'G4', 'G5']
/* ce que la production applique aujourd'hui, bloc par bloc (CHOIX_DU_BLOC) */
const PROD_CLE = { G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'marche', G5: 'marche' }

/* ─────────────────────────── ② les règles de choix ──────────────────────── */
const combi = (k, n) => {
  const out = []
  const rec = (i, cur) => {
    if (cur.length === k) return out.push(cur.slice())
    for (let j = i; j < n; j++) { cur.push(j); rec(j + 1, cur); cur.pop() }
  }
  rec(0, [])
  return out
}
/* chaque règle renvoie les NUMÉROS retenus dans le bloc, pour une course */
const regles = (b) => {
  const k = QUOTA[b]
  const r = [
    { cle: 'carnet', lib: 'carnet (place de presse)', f: (c) => c.bloc[b].slice().sort((x, y) => x.place - y.place || x.slot - y.slot).slice(0, k).map((x) => x.num) },
    { cle: 'marche', lib: 'marché (cote la plus courte)', f: (c) => c.bloc[b].slice().sort((x, y) => x.cote - y.cote || x.place - y.place).slice(0, k).map((x) => x.num) },
    { cle: 'fusion', lib: 'fusion (presse + cote)', f: (c) => c.bloc[b].slice().sort((x, y) => (x.place + c.rangCote[x.num]) - (y.place + c.rangCote[y.num]) || x.place - y.place).slice(0, k).map((x) => x.num) },
  ]
  /* l'énumération exhaustive : chaque sous-ensemble de k cases parmi n.
   * G5 a une longueur variable (2..8) : un sous-ensemble « fixe » n'y a pas
   * de sens, on lui donne la cote la plus longue — l'outsider du bloc. */
  if (b === 'G5') {
    r.push({ cle: 'cher', lib: 'la cote la plus longue', f: (c) => [c.bloc[b].slice().sort((x, y) => y.cote - x.cote || y.place - x.place)[0].num] })
    r.push({ cle: '2e-marche', lib: '2e cote du bloc', f: (c) => [c.bloc[b].slice().sort((x, y) => x.cote - y.cote || x.place - y.place)[k]?.num ?? c.bloc[b].slice().sort((x, y) => x.cote - y.cote)[0].num] })
  } else {
    for (const sub of combi(k, c0(b))) {
      r.push({
        cle: 'fixe:' + sub.map((i) => i + 1).join('·'),
        lib: 'cases ' + sub.map((i) => '#' + (i + 1)).join('·') + ' du bloc',
        f: (c) => sub.map((i) => c.bloc[b][i].num),
      })
    }
  }
  return r
}
/* la longueur d'un bloc G1..G4 est la même pour toutes les courses (filtré) */
const c0 = (b) => ({ G1: 4, G2: 4, G3: 2, G4: 2 }[b])

const choixProd = (c) => {
  const o = {}
  for (const b of BLOCS) {
    const cases = c.bloc[b]
    const k = QUOTA[b]
    /* la PRODUCTION telle que le moteur l'applique (CHOIX_DU_BLOC) :
     * G1-G3 au carnet, G4-G5 au marché. */
    o[b] = (PROD_CLE[b] === 'marche'
      ? cases.slice().sort((x, y) => x.cote - y.cote || x.place - y.place)
      : cases.slice().sort((x, y) => x.place - y.place || x.slot - y.slot))
      .slice(0, k).map((x) => x.num)
  }
  return o
}
const choixCarnet = (c) => {
  const o = {}
  for (const b of BLOCS) o[b] = c.bloc[b].slice().sort((x, y) => x.place - y.place || x.slot - y.slot).slice(0, QUOTA[b]).map((x) => x.num)
  return o
}
const ticket = (c, o) => BLOCS.flatMap((b) => o[b])

const note = (f) => {
  let pod = 0, qui = 0, q4 = 0, ch = 0
  for (const c of courses) {
    const t = f(c)
    const s = new Set(t)
    ch += t.length
    if (c.arrivee.slice(0, 3).every((x) => s.has(x))) pod++
    if (c.arrivee.slice(0, 5).every((x) => s.has(x))) qui++
    if (c.arrivee.filter((x) => s.has(x)).length >= 4) q4++
  }
  return { pod: pct(pod, N), qui: pct(qui, N), q4: pct(q4, N), ch: +(ch / N).toFixed(2) }
}
const moitie = (f, l) => {
  let pod = 0, qui = 0
  for (const c of l) {
    const s = new Set(f(c))
    if (c.arrivee.slice(0, 3).every((x) => s.has(x))) pod++
    if (c.arrivee.slice(0, 5).every((x) => s.has(x))) qui++
  }
  return { pod: pct(pod, l.length), qui: pct(qui, l.length) }
}

const H1 = courses.slice(0, Math.floor(N / 2))
const H2 = courses.slice(Math.floor(N / 2))

/* ─────────────────────────── ③ la référence ─────────────────────────────── */
const ref = note((c) => ticket(c, choixProd(c)))
const refH1 = moitie((c) => ticket(c, choixProd(c)), H1)
const refH2 = moitie((c) => ticket(c, choixProd(c)), H2)

/* ─────────────────────── ④ bloc par bloc ───────────────────────────────── */
function bootstrap(fa, fb, essais = 10000, graine = 24680) {
  let s = graine
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
  let mieux = 0, pire = 0, egal = 0, mieuxPod = 0
  for (let i = 0; i < essais; i++) {
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
  return {
    mieux: +(100 * mieux / essais).toFixed(1), pire: +(100 * pire / essais).toFixed(1),
    egal: +(100 * egal / essais).toFixed(1), mieuxPod: +(100 * mieuxPod / essais).toFixed(1),
  }
}

const parBloc = {}
for (const b of BLOCS) {
  const lignes = regles(b).map((r) => {
    const f = (c) => { const o = choixProd(c); o[b] = r.f(c); return ticket(c, o) }
    const m = note(f)
    const h1 = moitie(f, H1), h2 = moitie(f, H2)
    /* la règle bat-elle la production DANS LES DEUX MOITIÉS sur le quinté ? */
    const gagne2 = r.cle !== PROD_CLE[b] && h1.qui >= refH1.qui && h2.qui >= refH2.qui
      && (h1.qui > refH1.qui || h2.qui > refH2.qui)
    /* le bootstrap porte sur l'événement qui paie : le quinté complet */
    const boot = r.cle === PROD_CLE[b] ? null : bootstrap(f, (c) => ticket(c, choixProd(c)))
    return {
      cle: r.cle, lib: r.lib, ...m,
      dPod: +(m.pod - ref.pod).toFixed(1), dQui: +(m.qui - ref.qui).toFixed(1),
      h1, h2, gagne2, boot,
    }
  }).sort((x, y) => y.qui - x.qui || y.pod - x.pod)
  parBloc[b] = { lignes, meilleure: lignes[0].cle, boot: lignes[0].boot }
}

/* ─────────────────────── ⑤ l'assemblage des gagnants ───────────────────── */
/* on n'assemble QUE les choix qui gagnent dans les deux moitiés : sinon on
 * empile du bruit et l'assemblage est une illusion (§11.24). Et entre deux
 * gagnants, on garde celui que le bootstrap préfère le plus souvent. */
const retenus = {}
for (const b of BLOCS) {
  const g = parBloc[b].lignes.filter((l) => l.gagne2 && (l.boot?.mieux ?? 0) >= 80)
    .sort((x, y) => (y.boot?.mieux ?? 0) - (x.boot?.mieux ?? 0))
  retenus[b] = g.length ? g[0].cle : PROD_CLE[b]
}
const reglesDe = (b) => regles(b).find((r) => r.cle === (retenus[b] || PROD_CLE[b]))
const assemble = (c) => {
  const o = choixProd(c)
  for (const b of BLOCS) {
    const r = reglesDe(b)
    if (r && r.cle !== PROD_CLE[b]) o[b] = r.f(c)
  }
  return ticket(c, o)
}
const mAss = note(assemble)
const assH1 = moitie(assemble, H1), assH2 = moitie(assemble, H2)
const bootAss = bootstrap(assemble, (c) => ticket(c, choixProd(c)))

/* ─────────────────────── ⑥ le rapport ──────────────────────────────────── */
const p = (x) => String(x).replace('.', ',')
console.log(`\n3-2-1-1-1 — LE CHOIX DANS CHAQUE BLOC (${N} Quintés à presse réelle)`)
console.log(`  8 chevaux par course (moyenne mesurée ${p(ref.ch)}) · ${ecartees} course(s) écartée(s) faute de blocs pleins\n`)
console.log(`  LA RÉFÉRENCE — la production (G1-G4 carnet · G5 marché)`)
console.log(`    podium ${p(ref.pod)} % · quinté ${p(ref.qui)} % · ≥4 ${p(ref.q4)} % · moitiés ${p(refH1.qui)} / ${p(refH2.qui)}`)
const carn = note((c) => ticket(c, choixCarnet(c)))
console.log(`    le carnet partout (G5 compris) : quinté ${p(carn.qui)} % · podium ${p(carn.pod)} %\n`)

for (const b of BLOCS) {
  const { lignes, boot } = parBloc[b]
  console.log(`  ${b} — ${QUOTA[b]} case(s) sur ${b === 'G5' ? '2 à 8' : c0(b)}`)
  for (const l of lignes.slice(0, 5)) {
    console.log(`    ${l.lib.padEnd(28)} podium ${String(p(l.pod)).padStart(5)} % (${d(l.dPod, 0).padStart(5)}) · quinté ${String(p(l.qui)).padStart(5)} % (${d(l.dQui, 0).padStart(5)}) · ≥4 ${String(p(l.q4)).padStart(5)} % · moitiés ${p(l.h1.qui)} / ${p(l.h2.qui)}${l.gagne2 ? '  ← GAGNE 2/2' : ''}${l.boot && l.boot.mieux >= 80 ? `  (bootstrap mieux ${p(l.boot.mieux)} %)` : ''}`)
  }
  console.log('')
}

console.log('  L’ASSEMBLAGE DES SEULS CHOIX QUI GAGNENT DANS LES DEUX MOITIÉS')
console.log('  (une règle ne remplace la production que si le bootstrap la préfère dans ≥ 80 % des tirages)')
console.log('  ' + BLOCS.map((b) => `${b}=${retenus[b]}`).join(' · '))
console.log(`  podium ${p(mAss.pod)} % (${d(mAss.pod, ref.pod)}) · quinté ${p(mAss.qui)} % (${d(mAss.qui, ref.qui)}) · ≥4 ${p(mAss.q4)} % (${d(mAss.q4, ref.q4)})`)
console.log(`  moitiés ${p(assH1.qui)} / ${p(assH2.qui)}  (carnet : ${p(refH1.qui)} / ${p(refH2.qui)})`)
console.log(`  bootstrap : mieux ${p(bootAss.mieux)} % · pire ${p(bootAss.pire)} % · égal ${p(bootAss.egal)} %\n`)

/* ─────────────────────── ⑦ l'artefact ──────────────────────────────────── */
const verdict = retenus.G1 === PROD_CLE.G1 && retenus.G2 === PROD_CLE.G2 && retenus.G3 === PROD_CLE.G3
  && retenus.G4 === PROD_CLE.G4 && retenus.G5 === PROD_CLE.G5
  ? `Aucun choix de bloc ne bat la production de façon significative : la règle actuelle (G1-G3 carnet · G4-G5 marché) reste. Les +1 point du meilleur candidat (G5 2ᵉ cote) tombent à ${parBloc.G5.lignes.find((l) => l.cle === '2e-marche')?.boot?.mieux ?? '?'} % au bootstrap — du bruit (§11.24).`
  : `Les choix ${BLOCS.filter((b) => retenus[b] !== PROD_CLE[b]).map((b) => b + '=' + retenus[b]).join(', ')} battent la production dans les deux moitiés ET au bootstrap (≥ 80 %) ; l'assemblage donne ${mAss.qui} % de quinté contre ${ref.qui} % (bootstrap : mieux ${bootAss.mieux} %).`

const sortie = {
  outil: 'tools/choix32111.mjs',
  le: new Date().toISOString().slice(0, 10),
  source: 'data/quintes.json — Quintés à presse réelle, blocs pleins (4·4·2·2·≥1)',
  n: N, ecartees,
  quotas: QUOTA,
  definition: 'Le choix est mesuré bloc par bloc : une seule règle change, les quatre autres restent à la production (G1-G3 carnet · G4-G5 marché). Un choix n’est retenu que s’il bat la production sur le quinté dans les deux moitiés ET si le bootstrap apparié (10 000 tirages) le préfère dans au moins 80 % des tirages.',
  reference: { ...ref, h1: refH1, h2: refH2 },
  blocs: Object.fromEntries(BLOCS.map((b) => [b, {
    quota: QUOTA[b], sur: b === 'G5' ? null : c0(b),
    lignes: parBloc[b].lignes.slice(0, 8).map((l) => ({
      cle: l.cle, lib: l.lib, pod: l.pod, qui: l.qui, q4: l.q4,
      dPod: l.dPod, dQui: l.dQui, h1: l.h1.qui, h2: l.h2.qui, gagne2: l.gagne2,
      boot: l.boot,
    })),
    boot: parBloc[b].boot,
  }])),
  assemble: { choix: retenus, ...mAss, h1: assH1, h2: assH2, boot: bootAss },
  verdict,
}
fs.writeFileSync('data/choix32111.json', JSON.stringify(sortie, null, 1))
fs.writeFileSync('public/data/choix32111.json', JSON.stringify(sortie, null, 1))
console.log('VERDICT\n  ' + verdict + '\n')
