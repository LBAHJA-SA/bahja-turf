/* =============================================================================
 * tools/huit.mjs — G5 EST-IL NÉCESSAIRE ? ET À 8 CHEVAUX ? (28/10/2026)
 *
 * Demande de l'utilisateur :
 *   « اريد البصمة حسب الاحصائيات والتي تثبت ان G5 ضرورة
 *     كما اني اريد تمانية خيول فقط »
 *
 * DEUX QUESTIONS, UNE SEULE MESURE — et la seconde juge la première :
 *
 *   ① G5 EST-IL NÉCESSAIRE ? Trois chiffres suffisent :
 *        · un cheval de G5 (P13+) finit dans les 5 : 38,5 %  → un ticket SANS
 *          G5 ne peut pas dépasser 61,5 % de quinté, quelle que soit sa
 *          composition. C'est la nécessité au sens du PLAFOND ;
 *        · le siège qu'on y met (le meilleur du marché) arrive : 13,5 % ;
 *        · quand un G5 arrive, le siège le trouve : 35,1 %.
 *      → la nécessité est réelle, mais c'est une nécessité de COUVERTURE, pas
 *        une nécessité de valeur : le siège trouve le bon cheval une fois sur 3.
 *
 *   ② À 8 CHEVAUX, QUELLE RÉPARTITION ? Les 121 compositions sont énumérées,
 *      séparées en « avec siège G5 » / « sans siège G5 », et notées sur les
 *      métriques denses (§11.25) : podium entier, quinté entier, ≥4.
 *      Le total est VÉRIFIÉ course par course (t.length !== 8 → marqué).
 *
 *   node tools\huit.mjs   →   data/huit.json + public/data/huit.json
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, remplirGrille, formeMarche, GROUPES } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : 0)
const N = (s) => String(s || '').toUpperCase().replace(/[_\\s]+/g, ' ').trim()
const cle = (q) => q.join('-')

/* ───────────────────────────── ① le corpus presse ──────────────────────── */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const PRESSE = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number).filter((n) => cotes[n] > 1)
  if (nums.length < 10) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  let g
  try { g = buildGrid(syn, nums) } catch { continue }
  const cotesObj = Object.fromEntries(nums.map((n) => [n, { cote: cotes[n] }]))
  const ordreMarche = nums.slice().sort((a, b) => cotes[a] - cotes[b] || a - b)
  const parCase = {}
  for (const gr of g.groupes) for (const c of gr.cases) parCase[c.num] = { case: c.slot, groupe: gr.id }
  PRESSE.push({
    date: q.date, discipline: q.discipline, g, nums, cotes: cotesObj, cotesBrut: cotes,
    arrivee: q.arrivee.slice(0, 5), parCase, ordreMarche, forme: formeMarche(cotesObj),
  })
}
const NP = PRESSE.length
const dansG5 = (c, n) => (c.parCase[n]?.case ?? 0) >= 13

/* ───────────────────────────── ② le corpus archives ────────────────────── */
const ARCH = JSON.parse(fs.readFileSync('data/corpus/archives-quinte.json', 'utf8'))
const cles = new Set(TOUT.filter((x) => x.date).map((x) => x.date + '|' + N(x.track)))
/* ⚠ une répartition de 8 dont 1 siège G5 exige au moins 13 partants cotés :
 *   sans ce filtre, les courses à 12 partants font un ticket de 7 et faussent
 *   la comparaison « avec G5 » (mesuré : 7,99 chevaux en moyenne). */
const ARCHIVES = ARCH.filter((c) => !cles.has(c.date + '|' + N(c.track)) && c.arrivee?.length >= 5
  && Object.keys(c.cotes || {}).length >= 13)

/* ─────────────────────────── toutes les compositions ───────────────────── */
const COMBOS = []
for (let q1 = 0; q1 <= 4; q1++)
  for (let q2 = 0; q2 <= 4; q2++)
    for (let q3 = 1; q3 <= 2; q3++)          // G3 obligatoire (§11.12)
      for (let q4 = 0; q4 <= 2; q4++) {
        const q5 = 8 - q1 - q2 - q3 - q4
        if (q5 < 0 || q5 > 8) continue
        COMBOS.push([q1, q2, q3, q4, q5])
      }
const vide = () => ({ n: 0, pod: 0, qui: 0, q4: 0, ch: 0, ecart: 0 })
const R = Object.fromEntries(COMBOS.map((q) => [cle(q), vide()]))
const RA = Object.fromEntries(COMBOS.map((q) => [cle(q), vide()]))
const parCourse = []

const remplir = (c, quotas) => {
  const cl = c.g.groupes.flatMap((gr) => gr.cases).slice().sort((a, b) => a.slot - b.slot)
    .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
  const g2 = { groupes: c.g.groupes.map((gr, k) => ({ ...gr, quota: Math.min(quotas[k], gr.cases.length) })) }
  return remplirGrille(g2, cl, c.discipline, c.cotes, null).ticket
}

PRESSE.forEach((c) => {
  const tickets = {}
  for (const q of COMBOS) {
    const t = remplir(c, q)
    tickets[cle(q)] = t
    const s = new Set(t)
    const r = R[cle(q)]
    r.n++; r.ch += t.length
    if (t.length !== 8) r.ecart++
    if (c.arrivee.slice(0, 3).every((x) => s.has(x))) r.pod++
    if (c.arrivee.slice(0, 5).every((x) => s.has(x))) r.qui++
    if (c.arrivee.slice(0, 5).filter((x) => s.has(x)).length >= 4) r.q4++
  }
  parCourse.push({ c, tickets })
})

ARCHIVES.forEach((c) => {
  const ordre = Object.keys(c.cotes).map(Number).sort((a, b) => c.cotes[a] - c.cotes[b] || a - b)
  if (ordre.length < 13) return
  const bl = [ordre.slice(0, 4), ordre.slice(4, 8), ordre.slice(8, 10), ordre.slice(10, 12), ordre.slice(12)]
  for (const q of COMBOS) {
    const s = new Set()
    q.forEach((k, i) => bl[i].slice(0, k).forEach((x) => s.add(x)))
    const r = RA[cle(q)]
    r.n++; r.ch += s.size
    if (s.size !== 8) r.ecart++
    if (c.arrivee.slice(0, 3).every((x) => s.has(x))) r.pod++
    if (c.arrivee.slice(0, 5).every((x) => s.has(x))) r.qui++
    if (c.arrivee.slice(0, 5).filter((x) => s.has(x)).length >= 4) r.q4++
  }
})

/* ═══════════════ ① G5 — LA NÉCESSITÉ, MESURÉE ═══════════════════════════ */
const siege = PRESSE.map((c) => {
  const g5 = c.ordreMarche.filter((n) => dansG5(c, n))
  const h = g5[0] ?? null
  return {
    date: c.date, h, cote: h != null ? c.cotesBrut[h] : null,
    forme: c.forme?.cle ?? null,
    t5: h != null && c.arrivee.includes(h),
    t3: h != null && c.arrivee.slice(0, 3).includes(h),
    unArrive: c.arrivee.some((n) => dansG5(c, n)),
    trouve: h != null && c.arrivee.includes(h),
  }
})
const avecSiege = siege.filter((x) => x.h != null)
const top5G5 = PRESSE.filter((c) => c.arrivee.some((n) => dansG5(c, n)))
const top3G5 = PRESSE.filter((c) => c.arrivee.slice(0, 3).some((n) => dansG5(c, n)))
const sansG5 = PRESSE.filter((c) => !c.arrivee.some((n) => dansG5(c, n)))
const parmiArrive = avecSiege.filter((x) => x.unArrive && x.trouve)

const g5 = {
  n: NP,
  unArrive: pct(top5G5.length, NP),
  podium: pct(top3G5.length, NP),
  plafondSansG5: pct(sansG5.length, NP),
  siegeTop5: pct(avecSiege.filter((x) => x.t5).length, avecSiege.length),
  siegeTop3: pct(avecSiege.filter((x) => x.t3).length, avecSiege.length),
  trouveQuandArrive: pct(parmiArrive.length, avecSiege.filter((x) => x.unArrive).length),
  parForme: ['ferme', 'normal', 'ouvert'].map((f) => {
    const l = PRESSE.filter((c) => c.forme?.cle === f)
    const s = avecSiege.filter((x) => x.forme === f)
    return {
      cle: f, n: l.length,
      unArrive: pct(l.filter((c) => c.arrivee.some((n) => dansG5(c, n))).length, l.length),
      siegeTop5: pct(s.filter((x) => x.t5).length, s.length),
    }
  }),
  parCote: [[0, 10], [10, 15], [15, 25], [25, 999]].map(([a, b]) => {
    const l = avecSiege.filter((x) => x.cote >= a && x.cote < b)
    return {
      lib: a + '–' + (b === 999 ? '∞' : b), n: l.length,
      top5: pct(l.filter((x) => x.t5).length, l.length),
      top3: pct(l.filter((x) => x.t3).length, l.length),
    }
  }),
}

/* ═══════════════ ② LE CLASSEMENT À 8 CHEVAUX ═════════════════════════════ */
const tri = (Rr, filtre) => Object.entries(Rr).filter(([k]) => filtre(k.split('-').map(Number)))
  .sort((x, y) => (y[1].qui / y[1].n) - (x[1].qui / x[1].n) || (y[1].pod / y[1].n) - (x[1].pod / x[1].n))
const ligne = ([k, r]) => ({
  k, pod: pct(r.pod, r.n), qui: pct(r.qui, r.n), q4: pct(r.q4, r.n),
  ch: +(r.ch / r.n).toFixed(2), ecart: r.ecart,
})
const avec = tri(R, (q) => q[4] >= 1).map(ligne)
const sans = tri(R, (q) => q[4] === 0).map(ligne)
const avecArch = tri(RA, (q) => q[4] >= 1).map(ligne)
const sansArch = tri(RA, (q) => q[4] === 0).map(ligne)

/* la production actuelle — ses quotas viennent de `GROUPES`, jamais d'un
 * littéral : le fichier suit le moteur (3-2-1-1-1 depuis le 28/10/2026, §11.40) */
const Q_PROD = GROUPES.map((g) => g.quota)
const K_PROD = Q_PROD.join('-')
const NB_PROD = Q_PROD.reduce((s, n) => s + n, 0)
const prod = (() => {
  const r = vide()
  for (const { c } of parCourse) {
    const t = remplir(c, Q_PROD)
    const s = new Set(t)
    r.n++; r.ch += t.length
    if (c.arrivee.slice(0, 3).every((x) => s.has(x))) r.pod++
    if (c.arrivee.slice(0, 5).every((x) => s.has(x))) r.qui++
    if (c.arrivee.slice(0, 5).filter((x) => s.has(x)).length >= 4) r.q4++
  }
  return { ...ligne(['prod', r]), k: K_PROD, lib: `la production actuelle — ${NB_PROD} chevaux, G5 compris`, chevaux: NB_PROD }
})()

const meilleureAvec = avec[0].k
const meilleureSans = sans[0].k

/* ⚠ le « meilleur » par le quinté change selon le corpus (presse 4-2-2-0-0,
 * archives 4-3-1-0-0) : sur 96 courses, un écart de 1,3 point c'est UN quinté.
 * On garde donc aussi la lecture ROBUSTE — le plus mauvais des deux corpus —
 * et c'est elle qui décide. */
const robuste = (liste, archives) => {
  const parCle = Object.fromEntries(archives.map((x) => [x.k, x]))
  const l = liste.filter((x) => parCle[x.k]).map((x) => ({ ...x, arch: parCle[x.k], min: Math.min(x.qui, parCle[x.k].qui) }))
  return l.sort((a, b) => b.min - a.min || b.pod - a.pod)
}
const robSans = robuste(sans, sansArch)
const robAvec = robuste(avec, avecArch)

/* le ticket de 8 CONDITIONNEL — G5 seulement quand la condition tient */
const conditionnel = [
  ['cote du siège ≤ 10', (x) => x.cote != null && x.cote <= 10],
  ['cote du siège ≤ 12', (x) => x.cote != null && x.cote <= 12],
  ['cote du siège ≤ 15', (x) => x.cote != null && x.cote <= 15],
  ['cote du siège ≤ 20', (x) => x.cote != null && x.cote <= 20],
  ['marché ouvert', (x) => x.forme === 'ouvert'],
  ['marché fermé', (x) => x.forme === 'ferme'],
].map(([lib, f]) => {
  let pod = 0, qui = 0, q4 = 0, n = 0
  for (const { c, tickets } of parCourse) {
    const s0 = siege.find((x) => x.date === c.date)
    const t = s0 && f(s0) ? tickets[meilleureAvec] : tickets[meilleureSans]
    const s = new Set(t)
    if (s0 && f(s0)) n++
    if (c.arrivee.slice(0, 3).every((x) => s.has(x))) pod++
    if (c.arrivee.slice(0, 5).every((x) => s.has(x))) qui++
    if (c.arrivee.slice(0, 5).filter((x) => s.has(x)).length >= 4) q4++
  }
  const base = sans.find((x) => x.k === meilleureSans)
  return {
    lib, n, pod: pct(pod, NP), qui: pct(qui, NP), q4: pct(q4, NP),
    dPod: +(pct(pod, NP) - base.pod).toFixed(1),
    dQui: +(pct(qui, NP) - base.qui).toFixed(1),
    dQ4: +(pct(q4, NP) - base.q4).toFixed(1),
  }
})

/* ── le bootstrap apparié : la meilleure avec G5 contre la meilleure sans ── */
function bootstrap(a, b, essais = 10000, graine = 12345) {
  let s = graine
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
  const n = parCourse.length
  let mieux = 0, pire = 0, egal = 0, mieuxPod = 0
  for (let i = 0; i < essais; i++) {
    let qa = 0, qb = 0, pa = 0, pb = 0
    for (let j = 0; j < n; j++) {
      const c = parCourse[Math.floor(rnd() * n)]
      const ta = new Set(c.tickets[a]), tb = new Set(c.tickets[b])
      if (c.c.arrivee.slice(0, 5).every((x) => ta.has(x))) qa++
      if (c.c.arrivee.slice(0, 5).every((x) => tb.has(x))) qb++
      if (c.c.arrivee.slice(0, 3).every((x) => ta.has(x))) pa++
      if (c.c.arrivee.slice(0, 3).every((x) => tb.has(x))) pb++
    }
    if (qa > qb) mieux++; else if (qa < qb) pire++; else egal++
    if (pa > pb) mieuxPod++
  }
  return {
    a, b,
    mieux: +(100 * mieux / essais).toFixed(1), pire: +(100 * pire / essais).toFixed(1),
    egal: +(100 * egal / essais).toFixed(1), mieuxPod: +(100 * mieuxPod / essais).toFixed(1),
  }
}
const boot = bootstrap(meilleureAvec, meilleureSans)

/* ── les deux moitiés ── */
const moitie = Math.floor(parCourse.length / 2)
const halves = (k) => {
  const f = (liste) => {
    let qui = 0, pod = 0
    for (const { c, tickets } of liste) {
      const s = new Set(tickets[k])
      if (c.arrivee.slice(0, 5).every((x) => s.has(x))) qui++
      if (c.arrivee.slice(0, 3).every((x) => s.has(x))) pod++
    }
    return { qui: pct(qui, liste.length), pod: pct(pod, liste.length) }
  }
  return { h1: f(parCourse.slice(0, moitie)), h2: f(parCourse.slice(moitie)) }
}

/* ═══════════════════════════════ le verdict ══════════════════════════════ */
const mSans = sans.find((x) => x.k === meilleureSans)
const mAvec = avec.find((x) => x.k === meilleureAvec)
const verdict = [
  `Un cheval de G5 finit dans les cinq ${g5.unArrive} % du temps : sans siège G5, un ticket de 8 ne peut donc pas dépasser ${g5.plafondSansG5} % de quinté, quelle que soit sa composition. C'est la nécessité de G5 — elle est réelle.`,
  `Mais le siège n'est pas la porte : le meilleur cheval du marché dans G5 n'arrive que ${g5.siegeTop5} % du temps, et quand un G5 arrive il n'est trouvé que ${g5.trouveQuandArrive} % du temps.`,
  `À 8 chevaux, le meilleur avec G5 est ${meilleureAvec} (${mAvec.qui} % de quinté, ${mAvec.pod} % de podium) ; le meilleur sans G5 par le quinté est ${meilleureSans} (${mSans.qui} %), mais le seul qui tienne sur les deux corpus est ${robSans[0]?.k} (${robSans[0]?.qui} % presse · ${robSans[0]?.arch?.qui} % archives).`,
  `Le bootstrap donne ${meilleureAvec} meilleur que ${meilleureSans} dans ${boot.mieux} % des tirages seulement.`,
  `La production (${prod.k}, ${NB_PROD} chevaux) tient ${prod.qui} % du quinté contre ${robSans[0]?.min} % pour la meilleure répartition de 8 : l'écart est le prix de la RÉPARTITION, pas du nombre de cases — le ticket fait 8 chevaux dans les deux cas.`,
].join(' ')

/* ═════════════════════════════════ écrire ═══════════════════════════════ */
const sortie = {
  outil: 'tools/huit.mjs',
  le: new Date().toISOString().slice(0, 10),
  source: 'data/quintes.json — 96 Quintés à presse réelle + data/corpus/archives-quinte.json',
  n: NP, periode: { debut: PRESSE[0].date, fin: PRESSE[NP - 1].date },
  definition: 'At 8 chevaux : le ticket contient 8 chevaux (vérifié course par course). « avec G5 » = au moins un cheval de P13+. Podium entier = les 3 premiers dans le ticket ; quinté entier = les 5.',
  g5,
  huit: {
    combos: COMBOS.length, nbAvec: avec.length, nbSans: sans.length,
    prod, meilleureAvec, meilleureSans,
    robusteSans: robSans.slice(0, 6).map((x) => ({ k: x.k, press: x.qui, archives: x.arch.qui, min: x.min, pod: x.pod, q4: x.q4 })),
    robusteAvec: robAvec.slice(0, 6).map((x) => ({ k: x.k, press: x.qui, archives: x.arch.qui, min: x.min, pod: x.pod, q4: x.q4 })),
    avec: avec.slice(0, 12), sans: sans.slice(0, 12),
    avecArchives: avecArch.slice(0, 6), sansArchives: sansArch.slice(0, 6),
    conditionnel, bootstrap: boot,
    halves: { avec: halves(meilleureAvec), sans: halves(meilleureSans) },
  },
  verdict,
}
fs.writeFileSync('data/huit.json', JSON.stringify(sortie, null, 1))
fs.writeFileSync('public/data/huit.json', JSON.stringify(sortie, null, 1))

/* ─────────────────────────────── le résumé ─────────────────────────────── */
const p = (x) => String(x).replace('.', ',')
console.log(`\nG5 — NÉCESSAIRE OU PAS ?  ${NP} Quintés à presse réelle\n`)
console.log(`  un cheval de G5 (P13+) finit dans les 5 : ${p(g5.unArrive)} %`)
console.log(`  un cheval de G5 finit dans les 3        : ${p(g5.podium)} %`)
console.log(`  AUCUN cheval de G5 dans les 5           : ${p(g5.plafondSansG5)} %  ← le plafond d'un ticket sans G5`)
console.log(`  le siège de G5 (meilleur du marché) arrive top-5 : ${p(g5.siegeTop5)} %`)
console.log(`  le siège arrive top-3                            : ${p(g5.siegeTop3)} %`)
console.log(`  quand un G5 arrive, le siège le trouve           : ${p(g5.trouveQuandArrive)} %\n`)
console.log('  par forme du marché')
for (const f of g5.parForme) console.log(`    ${f.cle.padEnd(7)} ${String(f.n).padStart(3)} c. · un G5 dans les 5 : ${String(p(f.unArrive)).padStart(5)} % · siège top-5 : ${String(p(f.siegeTop5)).padStart(5)} %`)
console.log('\n  le siège par tranche de cote')
for (const x of g5.parCote) console.log(`    ${x.lib.padEnd(8)} n=${String(x.n).padStart(2)} · top-5 ${String(p(x.top5)).padStart(5)} % · top-3 ${String(p(x.top3)).padStart(5)} %`)

const tbl = (titre, l, n = 8) => {
  console.log('\n  ' + titre)
  console.log('  ' + 'répartition'.padEnd(12) + 'podium'.padStart(9) + 'quinté'.padStart(9) + '≥4'.padStart(8) + 'chev.'.padStart(8))
  for (const x of l.slice(0, n)) console.log('  ' + x.k.padEnd(12) + (p(x.pod) + ' %').padStart(9) + (p(x.qui) + ' %').padStart(9) + (p(x.q4) + ' %').padStart(8) + String(x.ch).padStart(8))
}
console.log(`\n  À 8 CHEVAUX — ${COMBOS.length} répartitions (${avec.length} avec siège G5 · ${sans.length} sans)`)
tbl('AVEC SIÈGE G5 — presse (96)', avec)
tbl('SANS SIÈGE G5 — presse (96)', sans)
tbl('AVEC SIÈGE G5 — archives', avecArch, 4)
tbl('SANS SIÈGE G5 — archives', sansArch, 4)
console.log('\n  la production, pour situer')
console.log(('  ' + K_PROD + ' (' + NB_PROD + ')').padEnd(14) + (p(prod.pod) + ' %').padStart(9) + (p(prod.qui) + ' %').padStart(9) + (p(prod.q4) + ' %').padStart(8) + String(prod.ch).padStart(8))
console.log('\n  le ticket de 8 conditionnel (G5 seulement si la condition tient)')
for (const x of conditionnel) {
  console.log(`    ${x.lib.padEnd(22)} n=${String(x.n).padStart(2)} · quinté ${String(p(x.qui)).padStart(5)} % (${x.dQui >= 0 ? '+' : ''}${p(x.dQui)}) · podium ${String(p(x.pod)).padStart(5)} % (${x.dPod >= 0 ? '+' : ''}${p(x.dPod)}) · ≥4 ${String(p(x.q4)).padStart(5)} % (${x.dQ4 >= 0 ? '+' : ''}${p(x.dQ4)})`)
}
console.log('\n  bootstrap apparié, 10 000 tirages')
console.log(`    ${boot.a} mieux que ${boot.b} : quinté ${p(boot.mieux)} % · pire ${p(boot.pire)} % · égal ${p(boot.egal)} % · podium mieux ${p(boot.mieuxPod)} %`)
console.log('\n  moitiés (quinté / podium)')
console.log(`    ${boot.a.padEnd(12)} 1re ${p(sortie.huit.halves.avec.h1.qui)} / ${p(sortie.huit.halves.avec.h1.pod)}  ·  2e ${p(sortie.huit.halves.avec.h2.qui)} / ${p(sortie.huit.halves.avec.h2.pod)}`)
console.log(`    ${boot.b.padEnd(12)} 1re ${p(sortie.huit.halves.sans.h1.qui)} / ${p(sortie.huit.halves.sans.h1.pod)}  ·  2e ${p(sortie.huit.halves.sans.h2.qui)} / ${p(sortie.huit.halves.sans.h2.pod)}`)
console.log('\nVERDICT\n  ' + verdict + '\n')
