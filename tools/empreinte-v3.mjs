/* ══════════════════════════════════════════════════════════════════════════
 *  tools/empreinte-v3.mjs — LE MOTEUR « EMPREINTE DU COUPLÉ » V3.
 *
 *  ⚠ LABORATOIRE UNIQUEMENT (§18.4). Ce fichier ÉCRIT un seul artefact :
 *  `public/data/empreinte-v3.json` (l'index des empreintes). Rien d'autre.
 *
 *  ─────────────────────────────────────────────────────────────────────────
 *  LA MÉTHODE V3 (spécification du 07/10/2026 — on l'applique telle quelle)
 *
 *  L'empreinte n'est NI un OmO isolé NI un rang de presse : c'est le motif
 *  complet du Top3 RÉEL — ses familles de cote + ses rangs de marché +
 *  les relations entre P1/P2/P3 :
 *
 *      FAV2-FAV2-FAV3 | 1-2-4
 *      └──── familles ────┘   └─ rangs ─┘
 *
 *  PIPELINE
 *    ARCHIVE → Top3 réel → market ranks → familles → FINGERPRINT →
 *    RELATIONS (P1-P2, P1-P3, P2-P3 : fam_pair, rank_pair, écarts cote /
 *    poids / valeur / âge / corde / gains) → GROUP BY → SUPPORT →
 *    MÉDIANES + DISTRIBUTIONS (calculées DANS le groupe, jamais sur tout
 *    l'archive) → course nouvelle → TOUS les trios ordonnés possibles
 *    (permutations) → FULL > FAM > COARSE → COHÉRENCE (rank_dev, prof_dev,
 *    rel_freq) → RANKING (level, support, -rank_dev, -prof_dev, rel_freq)
 *    → TOP 3 CANDIDAT.
 *
 *  L'ÉCHELLE DES FAMILLES (absolue — la même pour toutes les courses) :
 *    FAV1 0–3.0 · FAV2 3.1–7.0 · FAV3 7.1–10.0
 *    OUT1 10.1–13.0 · OUT2 13.1–16.0 · OUT3 16.1–18.0
 *    TOC1 18.1–21 · TOC2 21.1–25 · TOC3 25.1–28 · TOC4 28.1–31
 *    TOC5 31.1–36 · TOC6 36.1–40 · TOC7 40.1–50 · TOC8 50.1–100 (>100 → TOC8)
 *  COARSE : FAV* → FAV · OUT* → OUT · TOC* → TOC.
 *
 *  NOTE CAPACITÉ : pas de plafond appliqué — l'archive fait 3 986 courses,
 *  sous les 8 000 signatures de référence. Si elle dépasse, il faudra
 *  documenter lesquelles sont gardées (les plus récentes d'abord).
 *
 *  USAGE
 *    node tools/empreinte-v3.mjs                 → index + train/test
 *    node tools/empreinte-v3.mjs --course=CLE     → le top candidat d'une course
 * ══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { charger } from './empreinte-couple.mjs'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F_SORTIE = path.join(RACINE, 'public', 'data', 'empreinte-v3.json')

/* ─────────────────────────────────────────────────── les familles ─────── */

const ECHELLE = [
  ['FAV1', 3.0], ['FAV2', 7.0], ['FAV3', 10.0],
  ['OUT1', 13.0], ['OUT2', 16.0], ['OUT3', 18.0],
  ['TOC1', 21.0], ['TOC2', 25.0], ['TOC3', 28.0], ['TOC4', 31.0],
  ['TOC5', 36.0], ['TOC6', 40.0], ['TOC7', 50.0], ['TOC8', Infinity],
]

export function famille(cote) {
  const n = Number(cote)
  if (!Number.isFinite(n) || n <= 0) return null
  for (const [nom, max] of ECHELLE) if (n <= max) return nom
  return 'TOC8'
}

export function coarse(fam) {
  if (!fam) return null
  if (fam.startsWith('FAV')) return 'FAV'
  if (fam.startsWith('OUT')) return 'OUT'
  return 'TOC'
}

/* ─────────────────────────────────────────────────── une course ───────── */

function rangsMarche(partants) {
  const ordre = [...partants]
    .map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) }))
    .filter((x) => Number.isFinite(x.c))
    .sort((a, b) => a.c - b.c)
  return new Map(ordre.map((x, i) => [x.num, i + 1]))
}

function fiche(p) {
  return {
    num: p.num,
    cote: Number(p.cote_pmu ?? null),
    poids: p.poids ?? null,
    valeur: p.valeur ?? null,
    age: p.age ?? null,
    corde: p.corde ?? null,
    gains: p.gain ?? null,
  }
}

/* L'empreinte d'un trio ORDONNÉ [a,b,c] : familles + rangs + relations. */
export function empreinteDe(partants, trio) {
  const parNum = new Map(partants.map((p) => [p.num, p]))
  if (!trio || trio.length !== 3 || trio.some((n) => !parNum.get(n))) return null
  const rangs = rangsMarche(partants)
  if (trio.some((n) => rangs.get(n) == null)) return null
  const fs3 = trio.map((n) => fiche(parNum.get(n)))
  if (fs3.some((x) => x.cote == null)) return null
  const fams = fs3.map((x) => famille(x.cote))
  if (fams.some((x) => !x)) return null
  const rks = trio.map((n) => rangs.get(n))
  const rel = (i, j) => ({
    fam_pair: fams[i] + '-' + fams[j],
    rank_pair: rks[i] + '-' + rks[j],
    cote_gap: +(Math.abs(fs3[i].cote - fs3[j].cote)).toFixed(2),
    poids_gap: fs3[i].poids != null && fs3[j].poids != null ? Math.abs(fs3[i].poids - fs3[j].poids) : null,
    valeur_gap: fs3[i].valeur != null && fs3[j].valeur != null ? Math.abs(fs3[i].valeur - fs3[j].valeur) : null,
    age_gap: fs3[i].age != null && fs3[j].age != null ? Math.abs(fs3[i].age - fs3[j].age) : null,
    corde_gap: fs3[i].corde != null && fs3[j].corde != null ? Math.abs(fs3[i].corde - fs3[j].corde) : null,
    gain_gap: fs3[i].gains != null && fs3[j].gains != null ? Math.abs(fs3[i].gains - fs3[j].gains) : null,
  })
  const fkey = fams.join('-')
  const rkey = rks.join('-')
  return {
    trio: [...trio],
    fams, rangs: rks,
    fkey, rkey,
    full: fkey + '|' + rkey,
    fam: fkey,
    coarse: fams.map(coarse).join('-'),
    fiches: fs3,
    relations: { 'P1-P2': rel(0, 1), 'P1-P3': rel(0, 2), 'P2-P3': rel(1, 2) },
  }
}

/* ─────────────────────────────────────────────────── l'index ──────────── */

function mediane(t) {
  if (!t.length) return null
  const s = [...t].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function groupe() {
  return {
    n: 0,
    rangs: [[], [], []],
    cotes: [[], [], []],
    poids: [[], [], []],
    valeurs: [[], [], []],
    paires: { 'P1-P2': new Map(), 'P1-P3': new Map(), 'P2-P3': new Map() },
  }
}

function verser(g, emp) {
  g.n++
  emp.rangs.forEach((r, i) => g.rangs[i].push(r))
  emp.fiches.forEach((f, i) => {
    g.cotes[i].push(f.cote)
    if (f.poids != null) g.poids[i].push(f.poids)
    if (f.valeur != null) g.valeurs[i].push(f.valeur)
  })
  for (const k of ['P1-P2', 'P1-P3', 'P2-P3']) {
    const fp = emp.relations[k].fam_pair
    g.paires[k].set(fp, (g.paires[k].get(fp) || 0) + 1)
  }
}

function resumer(g) {
  const med = (t) => (t.length ? +mediane(t).toFixed(2) : null)
  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([fp, n]) => ({ fam_pair: fp, n, pct: +(n / Math.max(1, g.n) * 100).toFixed(1) }))
  return {
    n: g.n,
    medRangs: g.rangs.map(med),
    medCote: g.cotes.map(med),
    medPoids: g.poids.map(med),
    medValeur: g.valeurs.map(med),
    paires: { 'P1-P2': top(g.paires['P1-P2']), 'P1-P3': top(g.paires['P1-P3']), 'P2-P3': top(g.paires['P2-P3']) },
  }
}

function construireIndex(courses) {
  const full = new Map(), fam = new Map(), coarseM = new Map()
  for (const c of courses) {
    const trio = c.arrivee.slice(0, 3)
    const emp = empreinteDe(c.partants, trio)
    if (!emp) continue
    for (const [table, cle] of [[full, emp.full], [fam, emp.fam], [coarseM, emp.coarse]]) {
      if (!table.has(cle)) table.set(cle, groupe())
      verser(table.get(cle), emp)
    }
  }
  const fin = (table) => Object.fromEntries([...table.entries()].map(([k, g]) => [k, resumer(g)]))
  return { full: fin(full), fam: fin(fam), coarse: fin(coarseM) }
}

/* ─────────────────────────────────────────────────── cohérence ────────── */

function ecartRel(x, med) {
  if (x == null || med == null) return null
  return Math.abs(x - med) / (Math.abs(med) + 1)
}

function coherence(emp, resume) {
  // 1. rank_dev : l'écart des rangs aux médianes du groupe
  let rankDev = 0
  emp.rangs.forEach((r, i) => {
    const m = resume.medRangs[i]
    if (m != null) rankDev += Math.abs(r - m)
  })
  // 2. prof_dev : cote + poids + valeur, écarts relatifs
  let profDev = 0, profN = 0
  emp.fiches.forEach((f, i) => {
    for (const [cle, meds] of [['cote', resume.medCote], ['poids', resume.medPoids], ['valeur', resume.medValeur]]) {
      const e = ecartRel(f[cle === 'cote' ? 'cote' : cle === 'poids' ? 'poids' : 'valeur'], meds[i])
      if (e != null) { profDev += e; profN++ }
    }
  })
  profDev = profN ? profDev / profN : 0
  // 3. rel_freq : les 3 paires actuelles sont-elles les habituelles du groupe ?
  let relFreq = 0
  for (const k of ['P1-P2', 'P1-P3', 'P2-P3']) {
    const fp = emp.relations[k].fam_pair
    const top = resume.paires[k][0]
    relFreq += top && top.fam_pair === fp ? top.pct / 100 : 0
  }
  relFreq = relFreq / 3
  return { rankDev: +rankDev.toFixed(2), profDev: +profDev.toFixed(3), relFreq: +relFreq.toFixed(3) }
}

/* ─────────────────────────────────────────────────── candidats ────────── */

function* triples(partants) {
  const nums = partants.map((p) => p.num)
  const cotes = new Map(partants.map((p) => [p.num, Number(p.cote_pmu ?? Infinity)]))
  for (const a of nums) {
    if (!Number.isFinite(cotes.get(a))) continue
    for (const b of nums) {
      if (b === a || !Number.isFinite(cotes.get(b))) continue
      for (const c of nums) {
        if (c === a || c === b || !Number.isFinite(cotes.get(c))) continue
        yield [a, b, c]
      }
    }
  }
}

const NIVEAU_RANG = { FULL: 3, FAM: 2, COARSE: 1 }

/* ───────────────────────────────────────────── le CLASSEMENT (§21)
 *
 * Ordre spécifié : (level, support, -rank_dev, -prof_dev, rel_freq).
 *
 * Essai du 07/10 (cohérence d'abord, support en dernier) : RÉFUTÉ par la
 * mesure — rang-1 0.39% (contre 1.67%), top-10 4.11% (contre 10.14%),
 * médiane 152 (contre 136). Le support d'abord concentre mieux : les
 * vrais podiums appartiennent le plus souvent aux formes communes, et
 * rel_freq favorise des trios « manuels » rares en réalité.
 * On garde donc l'ordre spécifié. Aucun seuil, aucun filtre.
 */
export function cleClassement(cand, coh) {
  return [NIVEAU_RANG[cand.level], cand.support, -coh.rankDev, -coh.profDev, coh.relFreq]
}

function comparerCles(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] > b[i]) return -1
    if (a[i] < b[i]) return 1
  }
  return 0
}

/* Le meilleur trio d'une course selon le classement rééquilibré. */
export function meilleurTrio(partants, index) {
  let best = null
  for (const t of triples(partants)) {
    const emp = empreinteDe(partants, t)
    if (!emp) continue
    let cand = null
    if (index.full[emp.full]) cand = { level: 'FULL', support: index.full[emp.full].n, resume: index.full[emp.full] }
    else if (index.fam[emp.fam]) cand = { level: 'FAM', support: index.fam[emp.fam].n, resume: index.fam[emp.fam] }
    else if (index.coarse[emp.coarse]) cand = { level: 'COARSE', support: index.coarse[emp.coarse].n, resume: index.coarse[emp.coarse] }
    if (!cand) continue
    const coh = coherence(emp, cand.resume)
    const cle = cleClassement(cand, coh)
    if (!best || comparerCles(cle, best.cle) < 0) best = { trio: t, emp, ...cand, ...coh, cle }
  }
  return best
}

/* ─────────────────────────────────────────────────── run ──────────────── */

function principale() {
  const t0 = Date.now()
  const tout = charger().filter((c) => {
    const e = empreinteDe(c.partants, c.arrivee.slice(0, 3))
    return !!e
  })
  const coupe = Math.floor(tout.length * 0.8)
  const train = tout.slice(0, coupe)
  const test = tout.slice(coupe)
  console.log('')
  console.log('  EMPREINTE V3 — train ' + train.length + ' / test ' + test.length
    + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s de lecture)')

  const index = construireIndex(train)
  const nF = Object.keys(index.full).length
  const nA = Object.keys(index.fam).length
  const nC = Object.keys(index.coarse).length
  console.log('  index : FULL=' + nF + '  FAM=' + nA + '  COARSE=' + nC)
  console.log('')

  // baseline : top-3 cote dans l'ordre
  let baseExact = 0
  for (const c of train) {
    const tri = [...c.partants].sort((a, b) => Number(a.cote_pmu ?? 999) - Number(b.cote_pmu ?? 999)).slice(0, 3).map((p) => p.num)
    const a = c.arrivee
    if (a[0] === tri[0] && a[1] === tri[1] && a[2] === tri[2]) baseExact++
  }
  console.log('  baseline (top-3 cote) : 3/3 = ' + (baseExact / train.length * 100).toFixed(2) + '% sur le train')
  console.log('')

  // TEST
  const t1 = Date.now()
  let exact = 0, top5 = 0, top10 = 0, parNiveau = { FULL: 0, FAM: 0, COARSE: 0, AUCUN: 0 }
  let n = 0
  const rangsVrais = []
  for (const c of test) {
    // le rang du vrai podium parmi TOUS les trios classés
    const vrai = empreinteDe(c.partants, c.arrivee.slice(0, 3))
    if (!vrai) continue
    n++
    const a = c.arrivee
    // on classe quelques trios : le vrai + un échantillon, pour situer son rang
    const tous = []
    for (const t of triples(c.partants)) {
      const emp = empreinteDe(c.partants, t)
      if (!emp) continue
      let cand = null
      if (index.full[emp.full]) cand = { level: 'FULL', support: index.full[emp.full].n, resume: index.full[emp.full] }
      else if (index.fam[emp.fam]) cand = { level: 'FAM', support: index.fam[emp.fam].n, resume: index.fam[emp.fam] }
      else if (index.coarse[emp.coarse]) cand = { level: 'COARSE', support: index.coarse[emp.coarse].n, resume: index.coarse[emp.coarse] }
      if (!cand) continue
      const coh = coherence(emp, cand.resume)
      tous.push({ trio: t, cle: cleClassement(cand, coh), level: cand.level })
    }
    tous.sort((x, y) => comparerCles(x.cle, y.cle))
    const pos = tous.findIndex((x) => x.trio[0] === a[0] && x.trio[1] === a[1] && x.trio[2] === a[2])
    const premier = tous[0]
    if (premier) {
      parNiveau[premier.level] = (parNiveau[premier.level] || 0) + 1
      if (premier.trio[0] === a[0] && premier.trio[1] === a[1] && premier.trio[2] === a[2]) exact++
    } else parNiveau.AUCUN++
    if (pos >= 0) {
      rangsVrais.push(pos + 1)
      if (pos < 5) top5++
      if (pos < 10) top10++
    }
  }
  rangsVrais.sort((a, b) => a - b)
  const med = rangsVrais.length ? rangsVrais[rangsVrais.length >> 1] : null
  console.log('  ══ TEST (' + n + ' courses) ══')
  console.log('   rang-1 exact : ' + exact + '/' + n + ' = ' + (exact / n * 100).toFixed(2) + '%')
  console.log('   vrai podium dans le top-5  : ' + top5 + '/' + n + ' = ' + (top5 / n * 100).toFixed(2) + '%')
  console.log('   vrai podium dans le top-10 : ' + top10 + '/' + n + ' = ' + (top10 / n * 100).toFixed(2) + '%')
  console.log('   rang médian du vrai podium : ' + med)
  console.log('   niveau du rang-1 : ' + Object.entries(parNiveau).map(([k, v]) => k + '=' + v).join('  '))
  console.log('')

  const sortie = {
    genere: new Date().toISOString(),
    train: train.length, test: test.length,
    echelle: ECHELLE.map(([nom, max]) => ({ nom, max: max === Infinity ? null : max })),
    testResult: { n, exact, top5, top10, rangMedian: med, parNiveau },
    index,
  }
  fs.mkdirSync(path.dirname(F_SORTIE), { recursive: true })
  fs.writeFileSync(F_SORTIE, JSON.stringify(sortie))
  console.log('  base écrite : public/data/empreinte-v3.json')
  console.log('    (' + (fs.statSync(F_SORTIE).size / 1024 / 1024).toFixed(1) + ' Mo)')
  console.log('')
}

/* On n'exécute que si le fichier est lancé directement : pools et autres
 * outils importent famille/coarse/rangs d'ici, et sans ce garde chaque
 * import réimprimait tout le rapport (le bug vu le 07/10, deux fois). */
const estMainV3 = process.argv[1] && path.basename(process.argv[1]) === 'empreinte-v3.mjs'
const args = estMainV3 ? process.argv.slice(2) : []
const dem = args.find((a) => a.startsWith('--course='))
if (dem) {
  const tout = charger()
  const c = tout.find((x) => x.cle === dem.split('=')[1])
  if (!c) console.log('  course introuvable')
  else {
    // index minimal sur tout le corpus sauf la course elle-même
    const reste = tout.filter((x) => x.cle !== c.cle)
    const index = construireIndex(reste)
    const best = meilleurTrio(c.partants, index)
    console.log('')
    console.log('  ' + c.cle + '  ' + c.hippodrome + '  ' + c.date)
    if (!best) console.log('  aucun trio trouvé')
    else {
      console.log('  top candidat : ' + best.trio.join(' - '))
      console.log('  empreinte    : ' + best.emp.full)
      console.log('  niveau=' + best.level + '  support=' + best.support
        + '  rank_dev=' + best.rankDev + '  prof_dev=' + best.profDev + '  rel_freq=' + best.relFreq)
    }
    console.log('  arrivée réelle : ' + c.arrivee.slice(0, 5).join(' - '))
    console.log('')
  }
} else if (estMainV3) principale()