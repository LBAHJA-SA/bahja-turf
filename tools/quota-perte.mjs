/* =============================================================================
 * tools/quota-perte.mjs — LA COUPE DU QUOTA EST-ELLE LA CAUSE ? (29/10/2026)
 *
 * Demande de l'utilisateur : « شحال من مرة الكوطة ديال 3 2 1 1 1 كانت سبب
 * فالخسارة فهاد الشهر » — combien de fois la répartition 3-2-1-1-1 a-t-elle
 * été la CAUSE de la perte, sur le mois d'octobre.
 *
 * ── LA QUESTION, POSÉE PROPREMENT ──────────────────────────────────────────
 *
 * Un arrivant manquant peut l'être pour deux raisons, et une seule est la
 * faute du quota :
 *
 *   ① COUPURE  — il est DANS la grille, dans un bloc, mais le quota du bloc
 *                est atteint : c'est le quota qui l'a laissé dehors.
 *                → c'est réparable à 8 chevaux en déplaçant un siège.
 *   ② HORS GRILLE — il n'est même pas une case (la presse ne le cite pas, ou
 *                si bas qu'il sort des 5 blocs). Le quota n'y est pour rien.
 *
 * On mesure donc, course par course :
 *
 *   · combien d'arrivants sont PRIS / COUPÉS (par bloc) / HORS GRILLE ;
 *   · combien de courses perdent un arrivant PAR COUPURE (le quota coupable) ;
 *   · combien de ces courses une AUTRE répartition à 8 chevaux aurait sauvées,
 *     et laquelle — avec 3-3-1-1-0 (la production) mise en avant.
 *
 * ⚠ Ce n'est PAS un plaidoyer : on ne bouge aucun quota ici. On lit le mois.
 *
 *   node tools\quota-perte.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, remplirGrille, formeMarche } from '../src/lib/quinte.js'

const pad = (s, n) => String(s).padEnd(n)
const padl = (s, n) => String(s).padStart(n)
const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const r2 = (x) => Math.round(100 * x) / 100
const nr = (x) => String(r2(x)).replace('.', ',')

/* ─── le corpus : octobre, arrivée + cotes complètes (le même que §11.47) ── */
const ARCH = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const COTES = (() => { try { return JSON.parse(fs.readFileSync('data/cotes.json', 'utf8')) } catch { return {} } })()

const COURSES = []
for (const d of Object.keys(ARCH).sort().filter((x) => x >= '2026-10-01' && x <= '2026-10-31')) {
  const e = ARCH[d]
  const syn = (e.synthese || []).filter((n) => Number.isFinite(n) && n > 0)
  const arr = (e.arrivee || []).filter((n) => Number.isFinite(n) && n > 0)
  if (syn.length < 8 || arr.length < 5) continue
  const nums = (e.runners && e.runners.length ? e.runners : syn).map(Number)
  const c = COTES[e.courseId]
  let cotes = null
  if (c && Array.isArray(c.cotes)) {
    const o = {}
    for (const x of c.cotes) if (x && x.cote > 1) o[x.num] = { cote: x.cote }
    if (Object.keys(o).length >= 10) cotes = o
  }
  COURSES.push({ date: d, discipline: e.discipline, syn, nums, arrivee: arr.slice(0, 5), cotes })
}
COURSES.sort((a, b) => String(a.date).localeCompare(String(b.date)))

/* ─── une répartition à 8 chevaux ───────────────────────────────────────── */
function compositions() {
  const out = []
  for (let q1 = 2; q1 <= 4; q1++)
    for (let q2 = 2; q2 <= 4; q2++)
      for (let q3 = 1; q3 <= 2; q3++)
        for (let q4 = 0; q4 <= 2; q4++)
          for (let q5 = 0; q5 <= 1; q5++)
            if (q1 + q2 + q3 + q4 + q5 === 8) out.push([q1, q2, q3, q4, q5])
  return out
}
const COMPOS = compositions()

/* ⚠ la grille ne change jamais pour une course : on la construit une fois.
 * (le `remplirGrille` est appelé des centaines de fois pour §⑥.) */
const GRILLES = new Map()
const grilleDe = (c) => {
  if (!GRILLES.has(c.date)) GRILLES.set(c.date, buildGrid(c.syn, c.nums))
  return GRILLES.get(c.date)
}

function jouer(course, quotas) {
  const g = grilleDe(course)
  const grille = {
    ...g,
    groupes: g.groupes.map((x, k) => ({ ...x, quota: Math.min(quotas[k], x.cases.length) })),
  }
  const cl = g.groupes.flatMap((x) => x.cases).slice().sort((a, b) => a.slot - b.slot)
    .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
  const r = remplirGrille(grille, cl, course.discipline || 'PLAT', course.cotes, null)
  return { ticket: r.ticket, detail: r.detail, grille: g }
}

const PROD_AVANT = [3, 2, 1, 1, 1]
const PROD = [3, 3, 1, 1, 0]

/* ─── ① où meurent les arrivants ────────────────────────────────────────── */
const fates = {}                     // 'pris' | 'coupe:G1' … | 'hors'
const parBloc = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0 }
const lignes = []
let totalArrivants = 0

for (const c of COURSES) {
  const avant = jouer(c, PROD_AVANT)
  const apres = jouer(c, PROD)
  const place = new Map()
  const bloc = new Map()
  for (const g of avant.detail) for (const k of g.cases) { place.set(k.num, k.place); bloc.set(k.num, g.id) }
  const pris = new Set(avant.ticket)

  const destins = []
  for (const n of c.arrivee) {
    totalArrivants++
    if (pris.has(n)) { destins.push({ n, f: 'pris' }); fates.pris = (fates.pris || 0) + 1; continue }
    const b = bloc.get(n)
    if (!b) { destins.push({ n, f: 'hors' }); fates.hors = (fates.hors || 0) + 1; continue }
    destins.push({ n, f: 'coupe', b, p: place.get(n) })
    fates['coupe:' + b] = (fates['coupe:' + b] || 0) + 1
    parBloc[b]++
  }

  const x5 = c.arrivee.filter((n) => pris.has(n)).length
  const x5ap = c.arrivee.filter((n) => apres.ticket.includes(n)).length
  const pod = c.arrivee.slice(0, 3).every((n) => pris.has(n))
  const podAp = c.arrivee.slice(0, 3).every((n) => apres.ticket.includes(n))

  /* ③ quelle répartition à 8 chevaux aurait sauvé le 5/5 ? */
  const sauvetages = []
  for (const q of COMPOS) {
    const t = jouer(c, q)
    const x = c.arrivee.filter((n) => t.ticket.includes(n)).length
    const p = c.arrivee.slice(0, 3).every((n) => t.ticket.includes(n))
    if (x === 5 || p) sauvetages.push({ q: q.join('-'), x5: x, pod: p })
  }
  const meilleur5 = sauvetages.filter((s) => s.x5 === 5).map((s) => s.q)

  lignes.push({
    date: c.date, arrivee: c.arrivee, ticket: avant.ticket, destins,
    x5, pod, x5ap, podAp,
    coupe: destins.some((d) => d.f === 'coupe'),
    coupes: destins.filter((d) => d.f === 'coupe'),
    hors: destins.filter((d) => d.f === 'hors'),
    sauvetages: meilleur5,
    marche: !!c.cotes,
  })
}

/* ─── ② les courses dont la perte est une coupure ───────────────────────── */
const perdues = lignes.filter((l) => l.x5 < 5)
const perduesCoupe = perdues.filter((l) => l.coupe)
const perduesHors = perdues.filter((l) => !l.coupe)
const podPerdues = lignes.filter((l) => !l.pod)
const podCoupe = podPerdues.filter((l) => l.coupe)

console.log('\n  ══ LA COUPE DU QUOTA EST-ELLE LA CAUSE DE LA PERTE ? ══')
console.log('  corpus : ' + COURSES.length + ' Quintés d’octobre (' + COURSES[0].date + ' → ' + COURSES[COURSES.length - 1].date + ')')
console.log('  ' + totalArrivants + ' arrivants (5 par course) · ' +
  COURSES.filter((c) => c.cotes).length + ' courses avec cotes complètes')

const O = (k) => fates[k] || 0
console.log('\n  ① OÙ SONT LES ' + totalArrivants + ' ARRIVANTS — répartition 3-2-1-1-1')
console.log('  ' + '-'.repeat(72))
console.log('  ' + pad('pris dans le ticket', 34) + padl(O('pris'), 5) + '   ' + pct(O('pris'), totalArrivants))
for (const b of ['G1', 'G2', 'G3', 'G4', 'G5']) {
  if (!O('coupe:' + b)) continue
  console.log('  ' + pad('COUPÉ ' + b + ' (quota atteint)', 34) + padl(O('coupe:' + b), 5) + '   ' + pct(O('coupe:' + b), totalArrivants))
}
console.log('  ' + pad('hors grille (presse muette)', 34) + padl(O('hors'), 5) + '   ' + pct(O('hors'), totalArrivants))
const coupes = totalArrivants - O('pris') - O('hors')
console.log('  ' + pad('TOTAL coupés par un quota', 34) + padl(coupes, 5) + '   ' + pct(coupes, totalArrivants))

/* ① bis — QUEL BLOC COUPE, ET DANS COMBIEN DE COURSES */
console.log('\n  ① bis QUEL BLOC COUPE (3-2-1-1-1)')
console.log('  ' + '-'.repeat(72))
console.log('  ' + pad('bloc', 10) + padl('arrivants', 11) + padl('% des coupés', 14) + padl('courses', 10) + padl('% des 26', 11))
const quotaTxt = { G1: '3/4', G2: '2/4', G3: '1/2', G4: '1/2', G5: '1/…' }
for (const b of ['G1', 'G2', 'G3', 'G4', 'G5']) {
  const n = O('coupe:' + b)
  if (!n) continue
  const nc = lignes.filter((l) => l.coupes.some((d) => d.b === b)).length
  console.log('  ' + pad(b + ' (' + quotaTxt[b] + ')', 10) + padl(n, 11) + padl(pct(n, coupes), 14) + padl(nc, 10) + padl(pct(nc, lignes.length), 11))
}

console.log('\n  ② LE VERDICT PAR COURSE — 3-2-1-1-1')
console.log('  ' + '-'.repeat(72))
console.log('  ' + pad('courses', 34) + padl(lignes.length, 5))
console.log('  ' + pad('5/5 réalisés', 34) + padl(lignes.filter((l) => l.x5 === 5).length, 5) + '   ' + pct(lignes.filter((l) => l.x5 === 5).length, lignes.length))
console.log('  ' + pad('courses qui perdent le 5/5', 34) + padl(perdues.length, 5))
console.log('  ' + pad('dont la perte est une COUPURE', 34) + padl(perduesCoupe.length, 5) + '   ' + pct(perduesCoupe.length, perdues.length) + ' des pertes')
console.log('  ' + pad('dont la perte est HORS GRILLE', 34) + padl(perduesHors.length, 5) + '   ' + pct(perduesHors.length, perdues.length) + ' des pertes')
console.log('  ' + pad('podium entier', 34) + padl(lignes.filter((l) => l.pod).length, 5) + '   ' + pct(lignes.filter((l) => l.pod).length, lignes.length))
console.log('  ' + pad('podium perdu par une coupure', 34) + padl(podCoupe.length, 5) + '   ' + pct(podCoupe.length, podPerdues.length) + ' des podiums perdus')

console.log('\n  ③ À 8 CHEVAUX, UNE AUTRE RÉPARTITION AURAIT-ELLE SAUVÉ LE 5/5 ?')
console.log('  ' + '-'.repeat(72))
const sauvables = perdues.filter((l) => l.sauvetages.length)
console.log('  ' + pad('courses sauvables à 8 chevaux', 34) + padl(sauvables.length, 5) + '   ' + pct(sauvables.length, perdues.length) + ' des pertes')
console.log('  ' + pad('… dont sauvées par 3-3-1-1-0', 34) +
  padl(perdues.filter((l) => l.x5ap === 5).length, 5))
const dist = {}
for (const l of sauvables) for (const q of l.sauvetages) dist[q] = (dist[q] || 0) + 1
console.log('\n  les répartitions qui auraient sauvé le 5/5 :')
for (const [q, k] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
  console.log('  ' + pad('  ' + q, 34) + padl(k, 5) + ' course' + (k > 1 ? 's' : '') + (q === '3-3-1-1-0' ? '   ← la production actuelle' : ''))
}

console.log('\n  ④ LE DÉTAIL — course par course')
console.log('  ' + '-'.repeat(96))
console.log('  ' + pad('date', 12) + pad('arrivée', 18) + pad('x/5', 5) + pad('3-3-1-1-0', 11) + 'destin des arrivants manquants')
for (const l of lignes) {
  const manque = l.destins.filter((d) => d.f !== 'pris')
  const txt = manque.length
    ? manque.map((d) => d.n + (d.f === 'coupe' ? ' coupé ' + d.b + ' (P' + d.p + ')' : ' hors grille')).join(' · ')
    : '—'
  console.log('  ' + pad(l.date, 12) + pad(l.arrivee.join('-'), 18) + pad(l.x5 + (l.pod ? ' ★' : ''), 5) +
    pad(l.x5ap + (l.podAp ? ' ★' : ''), 11) + txt)
}

/* ─── ⑤ ce que coûte la coupure, en arrivants ───────────────────────────── */
const totAvant = lignes.reduce((s, l) => s + l.x5, 0)
const totApres = lignes.reduce((s, l) => s + l.x5ap, 0)
const totCoupe = lignes.reduce((s, l) => s + l.coupes.length, 0)
const totHors = lignes.reduce((s, l) => s + l.hors.length, 0)

console.log('\n  ⑤ BILAN DU MOIS')
console.log('  ' + '-'.repeat(72))
console.log('  ' + pad('arrivants trouvés — 3-2-1-1-1', 36) + padl(totAvant, 5) + '   sur ' + totalArrivants + '   x/5 ' + nr(totAvant / lignes.length))
console.log('  ' + pad('arrivants trouvés — 3-3-1-1-0', 36) + padl(totApres, 5) + '   sur ' + totalArrivants + '   x/5 ' + nr(totApres / lignes.length))
console.log('  ' + pad('arrivants perdus PAR LA COUPURE', 36) + padl(totCoupe, 5) + '   ' + pct(totCoupe, totalArrivants))
console.log('  ' + pad('arrivants perdus hors grille', 36) + padl(totHors, 5) + '   ' + pct(totHors, totalArrivants))

/* ─── ⑥ DE COMBIEN DE SIÈGES LE QUOTA A-T-IL BESOIN ? ───────────────────── */
/* Pour chaque course perdue, on cherche la PLUS PETITE taille de ticket (toute
 * répartition, G3 obligatoire) qui attrape les 5 arrivants. C'est le prix réel
 * du quota : le nombre de sièges qu'il aurait fallu. */
function compositionsDe(N) {
  const out = []
  for (let q1 = 2; q1 <= 4; q1++)
    for (let q2 = 2; q2 <= 4; q2++)
      for (let q3 = 1; q3 <= 2; q3++)
        for (let q4 = 0; q4 <= 2; q4++) {
          const q5 = N - q1 - q2 - q3 - q4
          /* ⚠ G1 et G2 restent dans leur latitude (§11.9 : 2 ou 3 · 3 ou 4 si
           * on élargit), G5 garde son siège unique (0 ou 1) : on mesure
           * l'élargissement du HAUT du carnet, pas du fond du peloton. À N=8,
           * cet espace est EXACTEMENT les 22 compositions de §11.47 — les deux
           * mesures tombent donc sur le même chiffre. */
          if (q5 < 0 || q5 > 1) continue
          out.push([q1, q2, q3, q4, q5])
        }
  return out
}

/* le maximum que la grille peut offrir : toutes les cases des 4 blocs du haut
 * plus l'unique siège de G5 = 4 + 4 + 2 + 2 + 1 = 13 chevaux. */
const MAX_N = 13

const besoin5 = []
const besoin3 = []
for (const l of perdues) {
  const c = COURSES.find((x) => x.date === l.date)
  let m5 = null
  for (let N = 8; N <= MAX_N && !m5; N++) {
    for (const q of compositionsDe(N)) {
      const t = jouer(c, q)
      if (c.arrivee.every((n) => t.ticket.includes(n))) { m5 = { N, q: q.join('-') }; break }
    }
  }
  besoin5.push({ date: l.date, x5: l.x5, min: m5 })

  if (!l.pod) {
    let m3 = null
    for (let N = 8; N <= MAX_N && !m3; N++) {
      for (const q of compositionsDe(N)) {
        const t = jouer(c, q)
        if (c.arrivee.slice(0, 3).every((n) => t.ticket.includes(n))) { m3 = { N, q: q.join('-') }; break }
      }
    }
    besoin3.push({ date: l.date, min: m3 })
  }
}

const distN = (l) => {
  const d = {}
  for (const x of l) {
    const k = x.min ? 'N=' + x.min.N : 'impossible (13 max)'
    d[k] = (d[k] || 0) + 1
  }
  return d
}
const med = (l) => {
  const v = l.filter((x) => x.min).map((x) => x.min.N).sort((a, b) => a - b)
  if (!v.length) return null
  return v[Math.floor(v.length / 2)]
}

console.log('\n  ⑥ DE COMBIEN DE SIÈGES LE QUOTA AVAIT BESOIN (courses perdues)')
console.log('  ' + '-'.repeat(72))
console.log('  ' + pad('le quinté complet', 34) + padl(perdues.length, 5) + ' courses perdues')
for (const [k, v] of Object.entries(distN(besoin5)).sort((a, b) => (a[0].startsWith('impossible') ? 1 : b[0].startsWith('impossible') ? -1 : parseInt(a[0].slice(2)) - parseInt(b[0].slice(2))))) {
  console.log('  ' + pad('   ' + k, 34) + padl(v, 5) + '   ' + pct(v, perdues.length))
}
console.log('  ' + pad('sièges médians requis', 34) + padl(med(besoin5) ?? '—', 5) + ' chevaux (le ticket en fait 8)')
console.log('  ' + pad('le podium', 34) + padl(podPerdues.length, 5) + ' courses perdues')
for (const [k, v] of Object.entries(distN(besoin3)).sort((a, b) => (a[0].startsWith('impossible') ? 1 : b[0].startsWith('impossible') ? -1 : parseInt(a[0].slice(2)) - parseInt(b[0].slice(2))))) {
  console.log('  ' + pad('   ' + k, 34) + padl(v, 5) + '   ' + pct(v, podPerdues.length))
}
console.log('  ' + pad('sièges médians requis (podium)', 34) + padl(med(besoin3) ?? '—', 5) + ' chevaux')

const artefact = {
  quand: new Date().toISOString(),
  corpus: { n: COURSES.length, arrivants: totalArrivants, de: COURSES[0].date, a: COURSES[COURSES.length - 1].date },
  repartition: { testee: '3-2-1-1-1', production: '3-3-1-1-0' },
  destins: fates, parBloc,
  courses: {
    n: lignes.length,
    cinqSurCinq: lignes.filter((l) => l.x5 === 5).length,
    perdues: perdues.length,
    perduesParCoupure: perduesCoupe.length,
    perduesHorsGrille: perduesHors.length,
    podium: lignes.filter((l) => l.pod).length,
    podiumPerduParCoupure: podCoupe.length,
    sauvablesA8: sauvables.length,
    sauveesParProduction: perdues.filter((l) => l.x5ap === 5).length,
  },
  compositionsQuiSauvent: dist,
  besoin: {
    quinté: { median: med(besoin5), distribution: distN(besoin5) },
    podium: { median: med(besoin3), distribution: distN(besoin3) },
    lignes: besoin5.map((x) => ({ date: x.date, x5: x.x5, min: x.min })),
  },
  totaux: { avant: totAvant, apres: totApres, coupe: totCoupe, hors: totHors },
  lignes: lignes.map((l) => ({
    date: l.date, arrivee: l.arrivee, x5: l.x5, x5ap: l.x5ap, pod: l.pod, podAp: l.podAp,
    destins: l.destins.map((d) => d.f === 'coupe' ? { n: d.n, f: d.f, bloc: d.b, place: d.p } : { n: d.n, f: d.f }),
    sauvetages: l.sauvetages,
  })),
}
fs.writeFileSync('data/quota-perte.json', JSON.stringify(artefact, null, 1))
try { fs.writeFileSync('public/data/quota-perte.json', JSON.stringify(artefact, null, 1)) } catch { /* pas de page */ }
console.log('\n  artefact : data/quota-perte.json\n')
