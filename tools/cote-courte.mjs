/* =============================================================================
 * tools/cote-courte.mjs — « LA COTE COURTE COUPÉE » (28/10/2026)
 *
 * Question de l'utilisateur, devant la grille du 28/10 :
 *   « نفس الاختيارات … اختيارات عشوائية »
 * Le ticket 3-2-1-1-1 a coupé le n°9 (cote 1,81, favori du marché) parce qu'il
 * n'est que P5 dans la presse et que G1 n'a que 3 sièges. La règle est
 * mécanique, pas aléatoire — mais couper une cote courte est le seul cas où
 * elle ressemble à un caprice. Ce fichier mesure si on peut le corriger.
 *
 * LA RÈGLE TESTÉE (« cote protégée ») :
 *   on part du ticket de production. Si une case NON retenue du bloc a une
 *   cote ≤ SEUIL, elle prend la place de la case retenue la moins bien classée
 *   à la presse de CE MÊME bloc (le quota ne bouge pas : on échange DANS le
 *   bloc, jamais entre deux blocs).
 *
 * Deux choses sont mesurées :
 *   ① le COÛT de la coupure — quand la production coupe une cote ≤ SEUIL,
 *      ce cheval arrive-t-il dans les 5 ? dans les 3 ?
 *   ② le GAIN de l'échange — podium / quinté / ≥4, moitiés, bootstrap.
 *      Une règle ne remplace la production que si elle gagne dans les DEUX
 *      moitiés ET si le bootstrap apparié la préfère dans ≥ 80 % des tirages
 *      (le filtre de §11.24 : sans lui, on mesure du bruit).
 *
 *   node tools\cote-courte.mjs   →   data/cote-courte.json + public/data/…
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : 0)
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))

/* ─────────────────────────── le corpus ──────────────────────────────────── */
/* mêmes filtres que tools/choix32111.mjs : blocs pleins, presse ≥ 10, cotes. */
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
    bloc[gr.id] = gr.cases
      .map((c) => ({ slot: c.slot, num: c.num, place: c.place, cote: cotes[c.num] }))
      .sort((a, b) => a.slot - b.slot)
  }
  if (bloc.G1?.length < 4 || bloc.G2?.length < 4 || bloc.G3?.length < 2
    || bloc.G4?.length < 2 || bloc.G5?.length < 1) { ecartees++; continue }
  courses.push({ date: q.date, arrivee: q.arrivee.slice(0, 5), bloc })
}
const N = courses.length
const QUOTA = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }
const BLOCS = ['G1', 'G2', 'G3', 'G4', 'G5']
/* la production du 28/10 : G1-G3 au carnet, G4-G5 au marché (§11.40) */
const PROD_CLE = { G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'marche', G5: 'marche' }

/* ─────────────────────── ① le ticket de production ─────────────────────── */
function prod(c) {
  const o = {}
  for (const b of BLOCS) {
    const cases = c.bloc[b]
    o[b] = (PROD_CLE[b] === 'marche'
      ? cases.slice().sort((x, y) => x.cote - y.cote || x.place - y.place)
      : cases.slice().sort((x, y) => x.place - y.place || x.slot - y.slot))
      .slice(0, QUOTA[b]).map((x) => x.num)
  }
  return o
}
const ticket = (o) => BLOCS.flatMap((b) => o[b])

/* ────────────── ② la règle « cote courte protégée » (dans le bloc) ─────── */
function protege(c, seuil) {
  const o = prod(c)
  for (const b of BLOCS) {
    const cases = c.bloc[b]
    for (;;) {
      const pris = new Set(o[b])
      /* la cote la plus courte qui reste dehors */
      const dehors = cases.filter((x) => !pris.has(x.num) && x.cote <= seuil)
        .sort((x, y) => x.cote - y.cote || x.place - y.place)[0]
      if (!dehors) break
      /* la case retenue la moins bien classée à la presse */
      const pire = o[b].map((n) => cases.find((x) => x.num === n))
        .sort((x, y) => y.place - x.place)[0]
      /* si la case dehors est DÉJÀ la moins bien classée, l'échange est nul */
      if (!pire || dehors.place <= pire.place) break
      o[b] = o[b].filter((n) => n !== pire.num).concat(dehors.num)
    }
  }
  return o
}

/* ─────────────────────────── ③ les notes ───────────────────────────────── */
const note = (f) => {
  let pod = 0, qui = 0, q4 = 0
  for (const c of courses) {
    const s = new Set(f(c))
    if (c.arrivee.slice(0, 3).every((x) => s.has(x))) pod++
    if (c.arrivee.slice(0, 5).every((x) => s.has(x))) qui++
    if (c.arrivee.filter((x) => s.has(x)).length >= 4) q4++
  }
  return { pod: pct(pod, N), qui: pct(qui, N), q4: pct(q4, N) }
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

function bootstrap(fa, fb, essais = 10000, graine = 13579) {
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

/* ───────── ④ ① le coût de la coupure — que devient la cote coupée ? ─────── */
const SEUILS = [3, 4, 5, 6, 8, 10]
const coupe = {}
for (const t of SEUILS) coupe[t] = { n: 0, top5: 0, top3: 0, gagne: 0, courses: 0 }
for (const c of courses) {
  const o = prod(c)
  const pris = new Set(ticket(o))
  for (const b of BLOCS) {
    for (const x of c.bloc[b]) {
      if (pris.has(x.num)) continue
      const rang = c.arrivee.indexOf(x.num)
      for (const t of SEUILS) {
        if (x.cote > t) continue
        coupe[t].n++
        if (rang === 0) coupe[t].gagne++
        if (rang >= 0 && rang < 3) coupe[t].top3++
        if (rang >= 0 && rang < 5) coupe[t].top5++
      }
    }
  }
  for (const t of SEUILS) {
    if (c.bloc) {
      const coupeIci = BLOCS.some((b) => c.bloc[b].some((x) => !pris.has(x.num) && x.cote <= t))
      if (coupeIci) coupe[t].courses++
    }
  }
}

/* ───────── ⑤ ② le gain de l'échange, seuil par seuil ────────────────────── */
const ref = note((c) => ticket(prod(c)))
const refH1 = moitie((c) => ticket(prod(c)), H1)
const refH2 = moitie((c) => ticket(prod(c)), H2)

const lignes = SEUILS.map((seuil) => {
  const f = (c) => ticket(protege(c, seuil))
  const m = note(f)
  const h1 = moitie(f, H1), h2 = moitie(f, H2)
  const gagne2 = h1.qui >= refH1.qui && h2.qui >= refH2.qui && (h1.qui > refH1.qui || h2.qui > refH2.qui)
  const boot = bootstrap(f, (c) => ticket(prod(c)))
  return {
    seuil, lib: 'cote ≤ ' + seuil, ...m,
    dPod: +(m.pod - ref.pod).toFixed(1), dQui: +(m.qui - ref.qui).toFixed(1),
    h1, h2, gagne2, boot,
  }
})

/* la borne haute : le meilleur sous-ensemble possible dans chaque bloc (oracle) */
const oracle = (() => {
  let pod = 0, qui = 0
  for (const c of courses) {
    const s = new Set()
    for (const b of BLOCS) {
      /* le choix qui fait entrer le plus d'arrivants du bloc, à quota constant */
      const cand = c.bloc[b].slice().sort((x, y) => {
        const ax = c.arrivee.indexOf(x.num), ay = c.arrivee.indexOf(y.num)
        return (ax < 0 ? 99 : ax) - (ay < 0 ? 99 : ay)
      }).slice(0, QUOTA[b])
      cand.forEach((x) => s.add(x.num))
    }
    if (c.arrivee.slice(0, 3).every((x) => s.has(x))) pod++
    if (c.arrivee.slice(0, 5).every((x) => s.has(x))) qui++
  }
  return { pod: pct(pod, N), qui: pct(qui, N) }
})()

/* ─────────────────────────── ⑥ le rapport ──────────────────────────────── */
const p = (x) => String(x).replace('.', ',')
console.log(`\nLA COTE COURTE COUPÉE — ${N} Quintés à presse réelle · ${ecartees} écartée(s)`)
console.log(`  production 3-2-1-1-1 (G1-G3 carnet · G4-G5 marché) : podium ${p(ref.pod)} % · quinté ${p(ref.qui)} % · ≥4 ${p(ref.q4)} %`)
console.log(`  moitiés ${p(refH1.qui)} / ${p(refH2.qui)}\n`)

console.log('  ① LE COÛT — les cases coupées par la production, par tranche de cote')
console.log('     seuil   coupées   courses   gagne   top3    top5')
for (const t of SEUILS) {
  const x = coupe[t]
  console.log(`     ≤${String(t).padEnd(4)} ${String(x.n).padStart(7)} ${String(x.courses).padStart(9)} `
    + `${String(p(pct(x.gagne, x.n))).padStart(7)} % ${String(p(pct(x.top3, x.n))).padStart(6)} % ${String(p(pct(x.top5, x.n))).padStart(6)} %`)
}

console.log('\n  ② LE GAIN — échanger la case la moins bien classée du bloc contre la cote courte coupée')
console.log('     seuil     podium          quinté            ≥4      moitiés      bootstrap')
for (const l of lignes) {
  console.log(`     ${l.lib.padEnd(9)} ${String(p(l.pod)).padStart(5)} % (${String(l.dPod).padStart(5)}) `
    + `${String(p(l.qui)).padStart(5)} % (${String(l.dQui).padStart(5)}) `
    + `${String(p(l.q4)).padStart(5)} %  ${p(l.h1.qui)}/${p(l.h2.qui)}  `
    + `mieux ${p(l.boot.mieux)} %${l.gagne2 ? '  ← 2/2' : ''}`)
}
console.log(`\n  borne haute (le meilleur choix possible dans chaque bloc) : podium ${p(oracle.pod)} % · quinté ${p(oracle.qui)} %`)

const meilleure = lignes.slice().sort((a, b) => b.qui - a.qui || b.pod - a.pod)[0]
const retenue = lignes.filter((l) => l.gagne2 && l.boot.mieux >= 80)
  .sort((a, b) => b.boot.mieux - a.boot.mieux)[0]

const verdict = retenue
  ? `La cote protégée ≤ ${retenue.seuil} bat la production dans les deux moitiés ET au bootstrap (mieux ${retenue.boot.mieux} %) : quinté ${retenue.qui} % contre ${ref.qui} %.`
  : `Aucun seuil ne bat la production dans les deux moitiés ET au bootstrap. Le meilleur (≤ ${meilleure.seuil} : quinté ${meilleure.qui} % contre ${ref.qui} %, bootstrap mieux ${meilleure.boot.mieux} %) retombe dans le bruit : la production reste.`

const sortie = {
  outil: 'tools/cote-courte.mjs',
  le: new Date().toISOString().slice(0, 10),
  source: 'data/quintes.json — Quintés à presse réelle, blocs pleins (4·4·2·2·≥1)',
  n: N, ecartees,
  quotas: QUOTA, prod: PROD_CLE,
  definition: 'La règle « cote protégée » part du ticket de production et échange, DANS le bloc, la case retenue la moins bien classée à la presse contre la cote ≤ seuil restée dehors. Le quota ne bouge jamais. Retenue seulement si elle gagne le quinté dans les deux moitiés ET si le bootstrap apparié (10 000 tirages) la préfère dans ≥ 80 % des tirages.',
  reference: { ...ref, h1: refH1, h2: refH2 },
  cout: Object.fromEntries(SEUILS.map((t) => [t, {
    coupees: coupe[t].n, courses: coupe[t].courses,
    gagne: pct(coupe[t].gagne, coupe[t].n), top3: pct(coupe[t].top3, coupe[t].n), top5: pct(coupe[t].top5, coupe[t].n),
  }])),
  lignes: lignes.map((l) => ({
    seuil: l.seuil, lib: l.lib, pod: l.pod, qui: l.qui, q4: l.q4,
    dPod: l.dPod, dQui: l.dQui, h1: l.h1.qui, h2: l.h2.qui, gagne2: l.gagne2, boot: l.boot,
  })),
  oracle, verdict,
}
fs.writeFileSync('data/cote-courte.json', JSON.stringify(sortie, null, 1))
fs.writeFileSync('public/data/cote-courte.json', JSON.stringify(sortie, null, 1))
console.log('\nVERDICT\n  ' + verdict + '\n')
