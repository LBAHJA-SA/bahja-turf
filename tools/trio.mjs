/* =============================================================================
 * tools/trio.mjs — LA MESURE DU TRIO, DU COUPLÉ ET DU QUINTÉ (19/10/2026)
 *
 *   node tools\trio.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Cette mesure n'entre PAS dans le ticket du
 *   Quinté : les quotas 3-2-1-1-1 sont une règle fermée. Elle sert au Trio
 *   et au Couplé, qui ne se jouent pas sur 8 chevaux.
 *
 * LA QUESTION
 *   Le 2e et le 3e viennent-ils vraiment « d'en bas », hors du top 8 ?
 *   Et si oui : combien de chevaux faut-il jouer, dans quel ORDRE ?
 *
 * LE CORPUS
 *   data/corpus/fusion.json — les Quintés de l'archive, avec
 *     · l'ordre du MARCHÉ  (ordreCote / cotes)         → 347 courses
 *     · l'ordre de la PRESSE (ordrePresse / presse)    → 103 courses
 *     · l'ARRIVÉE réelle                               → 347 courses
 *
 * CE QU'IL ÉCRIT
 *   data/trio.json + public/data/trio.json
 *
 * LES ZONES (le rang de MARCHÉ, jamais le rang de presse)
 *   Z1 = rangs 1-3   Z2 = rangs 4-8   Z3 = rangs 9+ (« d'en bas »)
 * ============================================================================= */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { combinaisons, fusionner, ordreDesCases } from '../src/lib/trio.js'
import { buildGrid, rangsMarche } from '../src/lib/quinte.js'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'fusion.json')

const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : 0)
const arr = (x) => (Array.isArray(x) ? x : [])

/* ──────────────── l'ORDRE DE PRESSE RÉEL (data/quintes.json) ─────────────
 * fusion.json porte un `ordrePresse` reconstitué qui ne reproduit PAS les
 * cases du vrai buildGrid (47 courses sur 96 diffèrent). Pour tout ce qui
 * touche la presse (rang, cases, blocs), la seule source est l'archive du
 * site : data/quintes.json. fusion.json ne sert plus qu'au MARCHÉ (347). */
const PRESSE_REELLE = new Map()
try {
  const qs = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'quintes.json'), 'utf8'))
  for (const q of arr(qs)) {
    const presse = arr(q.presse).filter((n) => Number.isFinite(n))
    if (presse.length < 8 || !arr(q.arrivee).length) continue
    const d = arr(q.dividends).find((x) => /TIERCE/i.test(x.bet_type) && /Désordre/i.test(x.sub_type || ''))
    const paie = Number(String(d?.payout ?? '').replace(',', '.'))
    PRESSE_REELLE.set(q.date + '|' + q.code, {
      presse, paie: Number.isFinite(paie) && paie > 0 ? paie : null,
    })
  }
} catch { /* pas d'archive → repli sur fusion */ }

/* ─────────────────────────────── le corpus ─────────────────────────────── */

const fichier = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = arr(fichier.courses)
  .map((c) => {
    const ordreC = arr(c.ordreCote).filter((n) => Number.isFinite(n))
    const cotes = c.cotes && Object.keys(c.cotes).length ? c.cotes : null
    // le rang de marché : la fonction de la PAGE, pour que la mesure et la
    // page regardent exactement le même ordre.
    const rangs = cotes ? rangsMarche(cotes)
      : Object.fromEntries(ordreC.map((n, i) => [n, i + 1]))
    const ordreM = Object.keys(rangs).map(Number)
      .sort((a, b) => rangs[a] - rangs[b] || a - b)
    const code = String(c.cle || '').split('_').pop()
    const reelle = PRESSE_REELLE.get(c.date + '|' + code) || null
    const ordreP = (reelle ? reelle.presse : arr(c.presseDispo ? (arr(c.ordrePresse).length ? c.ordrePresse : c.presse) : []))
      .filter((n) => Number.isFinite(n))
      .filter((n) => !reelle || rangs[n] != null)
    return {
      cle: c.cle, date: c.date, nb: Number(c.nbPartants) || ordreM.length,
      arrivee: arr(c.arrivee), ordreM, rangs, ordreP,
      // ⚠ DEUX ordres de presse, et c'est le CARNET qui commande :
      //    ordreP = le rang de presse (la Synthèse) — la référence ;
      //    ordreC = les CASES P1, P2, … (le carnet, §11.13) = ce que la page
      //             affiche, et sur quoi sont définis G1..G5 et le « 1
      //             obligatoire » de G3. La mesure porte sur les CASES.
      ordreC: ordreP.length >= 8 ? ordreDesCases(ordreP) : null,
      ordreF: ordreP.length >= 8 ? fusionner(ordreP, rangs) : null,
      presseReelle: !!reelle,
      paie: reelle?.paie ?? null,
    }
  })
  .filter((c) => c.arrivee.length >= 5 && c.ordreM.length >= 8)
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

const TOUTES = base
/* la presse : UNIQUEMENT les courses dont on a le vrai ordre de presse */
const PRESSE = base.filter((c) => c.presseReelle && c.ordreP.length >= 8 && c.ordreC && c.ordreF)

/* ───────────────────────── les courbes de couverture ──────────────────── */

const inSet = (nums, ordre, n) => {
  const s = new Set(ordre.slice(0, n))
  return nums.every((x) => s.has(x))
}
const inOrder = (nums, ordre, n) => {
  const pos = new Map(ordre.slice(0, n).map((x, i) => [x, i]))
  return nums.every((x) => pos.has(x)) && pos.get(nums[0]) < pos.get(nums[1])
}

function courbe(courses, cleOrdre, N, k, ordreStrict = false) {
  const out = []
  for (const n of N) {
    let ok = 0
    for (const c of courses) {
      const o = c[cleOrdre]
      if (!o) continue
      const tete = c.arrivee.slice(0, k)
      if (ordreStrict ? inOrder(tete, o, n) : inSet(tete, o, n)) ok++
    }
    out.push({ n, pct: pct(ok, courses.length), combinaisons: combinaisons(n, k) })
  }
  return out
}

/* trio / quinté / couplé — et pour chacun : marché (347), presse (103),
   fusion (103), + le marché sur les 103 pour comparer à armes égales. */
const TRIO_N = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
const QUINTE_N = [8, 9, 10, 11, 12, 13, 14, 15, 16]
const COUPLE_N = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

function blocCourbe(N, k, strict = false) {
  const surToutes = courbe(TOUTES, 'ordreM', N, k, strict)
  const mar99 = courbe(PRESSE, 'ordreM', N, k, strict)
  const car99 = courbe(PRESSE, 'ordreC', N, k, strict)
  const p103 = courbe(PRESSE, 'ordreP', N, k, strict)
  const f103 = courbe(PRESSE, 'ordreF', N, k, strict)
  return N.map((n, i) => ({
    n,
    combinaisons: combinaisons(n, k),
    marche: surToutes[i].pct,
    carnet: car99[i].pct,
    presse: p103[i].pct,
    fusion: f103[i].pct,
    marchePresse: mar99[i].pct,
  }))
}

const courbes = {
  trio: blocCourbe(TRIO_N, 3),
  quinte: blocCourbe(QUINTE_N, 5),
  couple: blocCourbe(COUPLE_N, 2),
  coupleOrdre: blocCourbe(COUPLE_N, 2, true),
}

/* ─────────────────── où arrivent le 1er, le 2e, le 3e ─────────────────── */

const ZONES = ['r1-3', 'r4-8', 'r9-12', 'r13+']
const zoneLarge = (r) => (r <= 3 ? 'r1-3' : r <= 8 ? 'r4-8' : r <= 12 ? 'r9-12' : 'r13+')

const positions = [1, 2, 3].map((place) => {
  const compte = {}
  for (const z of ZONES) compte[z] = 0
  for (const c of TOUTES) compte[zoneLarge(c.rangs[c.arrivee[place - 1]] ?? 99)]++
  const zones = {}
  for (const z of ZONES) zones[z] = { n: compte[z], pct: pct(compte[z], TOUTES.length) }
  return { place, n: TOUTES.length, zones, ...compte }
})

const hors8 = (c, p) => (c.rangs[c.arrivee[p - 1]] ?? 99) > 8
const derniers = {
  n: TOUTES.length,
  secondHors8: pct(TOUTES.filter((c) => hors8(c, 2)).length, TOUTES.length),
  troisiemeHors8: pct(TOUTES.filter((c) => hors8(c, 3)).length, TOUTES.length),
  unDesDeux: pct(TOUTES.filter((c) => hors8(c, 2) || hors8(c, 3)).length, TOUTES.length),
  unDesTrois: pct(TOUTES.filter((c) => c.arrivee.slice(0, 3).some((x) => (c.rangs[x] ?? 99) >= 9)).length, TOUTES.length),
  troisDans8: pct(TOUTES.filter((c) => c.arrivee.slice(0, 3).every((x) => (c.rangs[x] ?? 99) <= 8)).length, TOUTES.length),
}

/* ───────────────────── la bassmat (le motif d'entrée) ─────────────────── */

const compo = (nums, rangs, k) => {
  let a = 0, b = 0, d = 0
  for (const n of nums.slice(0, k)) {
    const z = zoneDeRang(rangs[n])
    if (z === 'Z1') a++
    else if (z === 'Z2') b++
    else d++
  }
  return a + '·' + b + '·' + d
}
function zoneDeRang(r) {
  if (r == null) return 'Z3'
  if (r <= 3) return 'Z1'
  if (r <= 8) return 'Z2'
  return 'Z3'
}

function bassmat(k, tailleZ3 = 8) {
  const m = new Map()
  for (const c of TOUTES) {
    const key = compo(c.arrivee, c.rangs, k)
    m.set(key, (m.get(key) || 0) + 1)
  }
  return [...m.entries()]
    .sort((x, y) => y[1] - x[1])
    .map(([x, n]) => {
      const [a, b, d] = x.split('·').map(Number)
      return {
        compo: x, n, pct: pct(n, TOUTES.length),
        chevaux: a + b + d,
        combinaisons: combinaisons(3, a) * combinaisons(5, b) * combinaisons(tailleZ3, d),
      }
    })
}

const bassmatTrio = bassmat(3, 8)
const bassmatQuinte = bassmat(5, 8)

const basParQuinte = [0, 1, 2, 3].map((i) => ({
  nb: i,
  n: TOUTES.filter((c) => c.arrivee.slice(0, 5).filter((x) => (c.rangs[x] ?? 99) >= 9).length === i).length,
  pct: pct(TOUTES.filter((c) => c.arrivee.slice(0, 5).filter((x) => (c.rangs[x] ?? 99) >= 9).length === i).length, TOUTES.length),
}))

/* ─────────────────────────── l'ancre G3 (rangs 9-10) ──────────────────── */

const BLOCS = [
  { id: 'G1', lo: 1, hi: 4 }, { id: 'G2', lo: 5, hi: 8 }, { id: 'G3', lo: 9, hi: 10 },
  { id: 'G4', lo: 11, hi: 12 }, { id: 'G5', lo: 13, hi: 999 },
]
const dansBloc = (c, b, place) => {
  const n = c.arrivee[place - 1]
  const r = c.rangs[n] ?? 99
  return r >= b.lo && r <= b.hi
}
const ancre = {
  n: TOUTES.length,
  g3Top5: pct(TOUTES.filter((c) => [1, 2, 3, 4, 5].some((p) => dansBloc(c, BLOCS[2], p))).length, TOUTES.length),
  g3Top3: pct(TOUTES.filter((c) => [1, 2, 3].some((p) => dansBloc(c, BLOCS[2], p))).length, TOUTES.length),
  blocs: BLOCS.map((b) => ({
    id: b.id,
    label: b.lo + '-' + (b.hi > 99 ? '+' : b.hi),
    top5: pct(TOUTES.filter((c) => [1, 2, 3, 4, 5].some((p) => dansBloc(c, b, p))).length, TOUTES.length),
    parCourse: +((TOUTES.reduce((a, c) => a + [1, 2, 3, 4, 5].filter((p) => dansBloc(c, b, p)).length, 0)) / TOUTES.length).toFixed(2),
  })),
}

/* ──────────── le cheval « d'en bas » : peut-on dire LEQUEL ? ──────────── */
/* Corpus secondaire : data/corpus/presse-carriere.json (données par cheval). */

let chevauxBas = null
try {
  const pc = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'corpus', 'presse-carriere.json'), 'utf8'))
  const courses = Object.values(pc).filter((r) => arr(r.arrivee).length >= 5 && Object.keys(r.cotes || {}).length >= 8)
  const formeScore = (mus) => {
    const s = String(mus || '')
    if (!s) return 0
    const pts = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 }
    let sc = 0
    ;(s.match(/\d+[a-z]/g) || []).slice(0, 6).forEach((r, i) => {
      sc += (pts[Number(String(r).replace(/\D/g, ''))] ?? 1) / (1 + i * 0.55)
    })
    return sc
  }
  const REGLES = {
    'cote la plus basse': (r, p) => coteDuCheval(r, p) ?? 999,
    'forme (musique)': (r, p) => -formeScore(p.musique),
    'poids le plus léger': (r, p) => Number(p.poids ?? 999),
    'corde la plus petite': (r, p) => Number(p.corde ?? 999),
    'gains les plus hauts': (r, p) => -Number(p.gains?.gainsCarriere ?? 0),
    'âge le plus jeune': (r, p) => Number(p.age ?? 99),
  }
  /* la cote d'un cheval : au niveau du cheval, sinon au niveau de la course
     (presse-carriere.json range le marché dans `r.cotes`, clé = le numéro). */
  const coteDuCheval = (r, p) => {
    const v = p.cote_pmu ?? (r.cotes ? (r.cotes[String(p.num)] ?? r.cotes[p.num]) : null)
    const x = Number(v)
    return Number.isFinite(x) && x > 0 ? x : null
  }
  let totZ3 = 0, totIn = 0
  const res = {}
  for (const lab of Object.keys(REGLES)) res[lab] = { hit: 0, n: 0 }
  for (const r of courses) {
    const present = arr(r.partants).filter((p) => coteDuCheval(r, p) != null)
    const ordre = present.slice()
      .sort((a, b) => coteDuCheval(r, a) - coteDuCheval(r, b) || a.num - b.num).map((p) => p.num)
    const rang = Object.fromEntries(ordre.map((n, i) => [n, i + 1]))
    const z3 = present.filter((p) => (rang[p.num] ?? 99) >= 9)
    totZ3 += z3.length
    totIn += z3.filter((p) => arr(r.arrivee).slice(0, 3).includes(p.num)).length
    if (z3.length < 2) continue
    for (const [lab, fn] of Object.entries(REGLES)) {
      const pick = z3.slice().sort((a, b) => fn(r, a) - fn(r, b) || a.num - b.num)[0]
      res[lab].n++
      if (arr(r.arrivee).slice(0, 3).includes(pick.num)) res[lab].hit++
    }
  }
  chevauxBas = {
    courses: courses.length,
    hasard: pct(totIn, totZ3),
    z3ParCourse: +(totZ3 / courses.length).toFixed(2),
    regles: Object.entries(res).map(([nom, v]) => ({ nom, pct: pct(v.hit, v.n), n: v.n })),
  }
} catch (e) { chevauxBas = null }

/* ─────────── OÙ EST LE TRIO — les blocs du carnet (vrai buildGrid) ──────── */
/* La question posée le 19/10 : « le trio contient forcément un cheval de G3,
 * G4 ou G5 ». On mesure, avec les cases du VRAI buildGrid, et on compare au
 * hasard (même nombre de chevaux tirés au hasard dans le peloton). */

const blocsTrio = (() => {
  const courses = []
  for (const c of PRESSE) {
    let g
    try { g = buildGrid(c.ordreP, c.ordreM) } catch { continue }
    if (!g || !arr(g.groupes).length) continue
    const bloc = {}
    for (const gr of g.groupes) bloc[gr.id] = gr.cases.map((x) => x.num)
    courses.push({ ...c, bloc, tot: c.ordreM.length })
  }
  const ids = ['G1', 'G2', 'G3', 'G4', 'G5']
  const parBloc = ids.map((id) => {
    let ok = 0, hasard = 0, n = 0, taille = 0
    for (const c of courses) {
      const B = c.bloc[id] || []
      if (!B.length || B.length > c.tot - 3) continue
      n++; taille += B.length
      const tete = new Set(c.arrivee.slice(0, 3))
      if (B.some((x) => tete.has(x))) ok++
      let p = 1
      for (let i = 0; i < 3; i++) p *= (c.tot - B.length - i) / (c.tot - i)
      hasard += 1 - p
    }
    const m = pct(ok, n), h = pct(hasard, n)
    return { id, n, taille: +(taille / Math.max(1, n)).toFixed(1), pct: m, hasard: h, ecart: +(m - h).toFixed(1) }
  })
  const unionDe = (noms) => {
    let ok = 0
    for (const c of courses) {
      const tete = new Set(c.arrivee.slice(0, 3))
      if (noms.some((id) => (c.bloc[id] || []).some((x) => tete.has(x)))) ok++
    }
    return { pct: pct(ok, courses.length), n: ok, total: courses.length }
  }
  const unions = [
    ['G1', ['G1']], ['G1∪G2', ['G1', 'G2']], ['G3∪G4', ['G3', 'G4']],
    ['G4∪G5', ['G4', 'G5']], ['G3∪G4∪G5', ['G3', 'G4', 'G5']],
  ].map(([nom, noms]) => ({ nom, ...unionDe(noms) }))
  const combien = [0, 1, 2, 3].map((k) => {
    const n = courses.filter((c) => {
      const tete = new Set(c.arrivee.slice(0, 3))
      const dedans = [].concat(...['G3', 'G4', 'G5'].map((id) => c.bloc[id] || []))
      return [...tete].filter((x) => dedans.includes(x)).length === k
    }).length
    return { k, n, pct: pct(n, courses.length) }
  })
  return { n: courses.length, du: courses[0]?.date || null, au: courses[courses.length - 1]?.date || null, parBloc, unions, combien }
})()

/* ─────────────── LE TRIO EN EUROS : la mise, le gain, le bilan ──────────── */
/* 1 € par combinaison, rapport TIERCÉ désordre réel de l'archive. */

const euros = (() => {
  const courses = PRESSE.filter((c) => c.paie)
  if (!courses.length) return null
  const paies = courses.map((c) => c.paie).sort((a, b) => a - b)
  const N = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const ligne = (n, cle) => {
    const comb = combinaisons(n, 3)
    let ok = 0, gain = 0
    for (const c of courses) if (inSet(c.arrivee.slice(0, 3), c[cle], n)) { ok++; gain += c.paie }
    const mise = comb * courses.length
    return {
      n, combinaisons: comb, miseParCourse: comb,
      pct: pct(ok, courses.length), hits: ok,
      gainMoyen: ok ? Math.round(gain / ok) : null,
      gain: Math.round(gain), bilan: Math.round(gain - mise),
      roi: pct(gain - mise, mise),
    }
  }
  const quatre = courses
    .filter((c) => inSet(c.arrivee.slice(0, 3), c.ordreP, 4))
    .map((c) => ({ date: c.date, trio: c.arrivee.slice(0, 3), paie: +c.paie.toFixed(1) }))
  return {
    n: courses.length,
    rapport: {
      moyenne: Math.round(paies.reduce((a, b) => a + b, 0) / paies.length),
      mediane: Math.round(paies[Math.floor(paies.length / 2)]),
      min: +paies[0].toFixed(1), max: +paies[paies.length - 1].toFixed(1),
    },
    presse: N.map((n) => ligne(n, 'ordreP')),
    marche: N.map((n) => ligne(n, 'ordreM')),
    detail4: quatre,
  }
})()

/* ─────────────────────────────── la sortie ─────────────────────────────── */

const out = {
  mesure: {
    outil: 'tools/trio.mjs',
    le: new Date().toISOString().slice(0, 10),
    sources: [
      'data/corpus/fusion.json — 347 Quintés (ordre de marché + arrivée)',
      'data/quintes.json — l\'ordre de PRESSE réel (' + PRESSE.length + ' courses) + les rapports',
      'data/corpus/presse-carriere.json — le test « quel cheval d\'en bas »',
    ],
    courses: TOUTES.length,
    coursesPresse: PRESSE.length,
    du: TOUTES[0]?.date || null,
    au: TOUTES[TOUTES.length - 1]?.date || null,
    zone: 'Z1 = rangs de marché 1-3 · Z2 = 4-8 · Z3 = 9+ (« d\'en bas »)',
    legende: {
      marche: 'l\'ordre des cotes (1 = la plus petite)',
      carnet: 'les cases P1, P2, … du carnet — l\'ordre que la page affiche (§11.13)',
      presse: 'le rang de presse (la Synthèse) — la référence',
      fusion: 'la moyenne des deux rangs (mesurée : elle PERD contre le carnet)',
    },
    note: 'Mesure seule. N\'entre PAS dans le ticket du Quinté (quotas 3-2-1-1-1 fermés).',
  },
  derniers,
  positions,
  bassmatTrio,
  bassmatQuinte,
  basParQuinte,
  ancre,
  courbes,
  blocsTrio,
  euros,
  chevauxBas,
}

fs.writeFileSync(path.join(RACINE, 'data', 'trio.json'), JSON.stringify(out, null, 1))
fs.writeFileSync(path.join(RACINE, 'public', 'data', 'trio.json'), JSON.stringify(out, null, 1))

/* ─────────────────────────────── le rapport ────────────────────────────── */

const pad = (s, n) => String(s).padStart(n)
console.log('\n  LE TRIO, LE COUPLÉ ET LE QUINTÉ — ' + TOUTES.length + ' Quintés (' +
  out.mesure.du + ' → ' + out.mesure.au + ')')
console.log('  ' + PRESSE.length + ' avec la presse réelle · écrit dans data/trio.json\n')

console.log('  D\'OÙ VIENNENT LES TROIS PREMIERS (rang de MARCHÉ)');
for (const p of positions) {
  console.log('    ' + p.place + 'e : ' + ZONES.map((z) => z + ' ' + pad(p.zones[z].pct + ' %', 6)).join('  ·  '));
}
console.log('    ⭐ hors du top 8 : 2e ' + derniers.secondHors8 + ' %  ·  3e ' + derniers.troisiemeHors8 +
  ' %  ·  un des deux ' + derniers.unDesDeux + ' %')

console.log('\n  LA BASSMAT DU TRIO (désordre) — la composition, pas l\'ordre');
console.log('    compo  (Z1·Z2·Z3)    n   %       combinaisons');
for (const b of bassmatTrio) {
  console.log('    ' + b.compo.padEnd(10) + pad(b.n, 4) + pad(b.pct + ' %', 8) + pad(b.combinaisons, 12))
}

console.log('\n  LA BASSMAT DU QUINTÉ (combien de chevaux « d\'en bas »)');
for (const b of bassmatQuinte.slice(0, 6)) {
  console.log('    ' + b.compo.padEnd(10) + pad(b.n, 4) + pad(b.pct + ' %', 8) + pad(b.combinaisons, 12))
}
console.log('    → ' + basParQuinte.map((x) => x.nb + ' : ' + x.pct + ' %').join('  ·  '))

console.log('\n  L\'ANCRE G3 (rangs de marché 9-10)');
console.log('    un cheval du G3 dans le top5 : ' + ancre.g3Top5 + ' %   ·   dans le top3 : ' + ancre.g3Top3 + ' %')
console.log('    ' + ancre.blocs.map((b) => b.id + ' ' + b.top5 + ' %').join('  ·  '))

const courbeTxt = (nom, c, k) => {
  console.log('\n  ' + nom + ' — le top N contient les ' + k + ' premiers ?');
  console.log('     N   combinaisons    marché   carnet   presse(rang)   fusion   (marché sur les ' + PRESSE.length + ')');
  for (const x of c) {
    console.log('    ' + pad(x.n, 3) + pad(x.combinaisons, 12) + pad(x.marche + ' %', 11) +
      pad(x.carnet + ' %', 9) + pad(x.presse + ' %', 15) + pad(x.fusion + ' %', 9) + '   (' + x.marchePresse + ' %)')
  }
}
courbeTxt('LE TRIO', courbes.trio, 3)
courbeTxt('LE QUINTÉ', courbes.quinte, 5)
courbeTxt('LE COUPLÉ (désordre)', courbes.couple, 2)
courbeTxt('LE COUPLÉ (dans l\'ordre)', courbes.coupleOrdre, 2)

if (blocsTrio) {
  console.log('\n  OÙ EST LE TRIO — les blocs du carnet, ' + blocsTrio.n + ' courses (vrai buildGrid)');
  console.log('     bloc   chevaux   mesuré   hasard   écart');
  for (const b of blocsTrio.parBloc) {
    console.log('     ' + b.id + pad(b.taille, 9) + pad(b.pct + ' %', 10) + pad(b.hasard + ' %', 9) + pad((b.ecart >= 0 ? '+' : '') + b.ecart, 8))
  }
  console.log('     ' + blocsTrio.unions.map((u) => u.nom + ' ' + u.pct + ' %').join('  ·  '))
  console.log('     combien du trio viennent de G3∪G4∪G5 : ' + blocsTrio.combien.map((c) => c.k + ' → ' + c.pct + ' %').join('  ·  '))
}

if (euros) {
  console.log('\n  LE TRIO EN EUROS — 1 € par combinaison, rapport tiercé réel (' + euros.n + ' courses)');
  console.log('     rapport : moyenne ' + euros.rapport.moyenne + ' €  ·  médiane ' + euros.rapport.mediane + ' €');
  console.log('      N   comb.    mise    attrape    bilan      ROI');
  for (const l of euros.presse) {
    console.log('     ' + pad(l.n, 3) + pad(l.combinaisons, 7) + pad(l.miseParCourse + ' €', 8) +
      pad(l.pct + ' %', 10) + pad((l.bilan >= 0 ? '+' : '') + l.bilan + ' €', 10) + pad(l.roi + ' %', 9))
  }
}

if (chevauxBas) {
  console.log('\n  LE CHEVAL « D\'EN BAS » (rang 9+) — on en désigne UN, il entre dans le top3 ?');
  console.log('    hasard = ' + chevauxBas.hasard + ' %  (' + chevauxBas.z3ParCourse + ' chevaux de Z3 par course)');
  for (const r of chevauxBas.regles) console.log('    ' + r.nom.padEnd(22) + pad(r.pct + ' %', 8));
}
console.log('')
