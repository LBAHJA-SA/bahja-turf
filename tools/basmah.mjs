/* =============================================================================
 * tools/basmah.mjs — LA BASCULE PAR COURSE (méthode utilisateur + ODDS_LAYER_BOUNDS).
 *
 * Pour UNE course : son contexte (même discipline, distance ±200m, champ ±2,
 * strictement avant — jamais elle, jamais après), puis, SUR CE CONTEXTE :
 *   ① fiabilité : verdict-v3 causal vs marché-seul (gagnant, couplé exact /
 *      placé, trio exact / placé) + 2 surfaces filtrées OUT (OUT1-3) et TOC
 *      (TOC1-8) au score de forme seul, zéro terme marché + récupérations.
 *   ② Market DNA : top3/top5 COARSE, composition du champ, formes FAM top,
 *      tilt des vainqueurs. Décrit, ne prédit pas.
 *   ③ Structures compatibles : formes FAM fréquentes du contexte (support≥2)
 *      + chevaux du field qui correspondent, poste par poste. SANS score
 *      inventé (la formule 80.3 de l'exemple est inconnue : support affiché).
 * Bandes de contexte pré-enregistrées ici (visibles, ajustables).
 * Usage : node tools/basmah.mjs AAAA-MM-JJ HIPPODROME R C
 * ============================================================================= */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { charger } from './empreinte-couple.mjs'
import { construireIndex, famille } from './empreinte-v3.mjs'
import { verdict, trioCandidat } from '../backend/COUPLE/moteur.js'
import { formeScore } from './moteur-couple.mjs'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SORTIE = path.join(RACINE, 'data', 'basmah')
const MAX_CONTEXTE = 200
const SEUIL_CTX = 20
/* Familles de disciplines (11/10) : les libellés d'archive sont incohérents
 * (HAIE≠HAIES, STEEPLE≠STEEPLECHASE, PLAT≠GALOP, ATTELE≠TROT) et 36% sont
 * vides. On regroupe en 3 familles ; '?' ne matche rien (données absentes,
 * §7 — pas de devinette). */
const famDiscipline = (d) => {
  const s = String(d || '').toUpperCase()
  if (['ATTELE', 'TROT', 'MONTE'].includes(s)) return 'TROT'
  if (['PLAT', 'GALOP'].includes(s)) return 'GALOP'
  if (['HAIE', 'HAIES', 'STEEPLE', 'STEEPLECHASE', 'CROSS'].includes(s)) return 'OBSTACLE'
  return null
}

const [DATE, HIPPO, R, C] = process.argv.slice(2)
if (!DATE || !HIPPO || !R || !C) { console.log('usage : node tools/basmah.mjs AAAA-MM-JJ HIPPODROME R C'); process.exit(1) }

const tout = charger()
const f = path.join(RACINE, 'archivecouple', HIPPO.toUpperCase(), `race_R${R}_C${C}_${DATE}.json`)
if (!fs.existsSync(f)) { console.log('course introuvable : ' + f); process.exit(1) }
const course = tout.find((x) => x.date === DATE && (x.hippodrome || '').toUpperCase() === HIPPO.toUpperCase() && x.cle.includes(`R${R}_C${C}`))
if (!course) { console.log('course hors corpus fermé'); process.exit(1) }

const nChamp = course.partants.length
const fam = famDiscipline(course.discipline)
/* Contexte en 3 niveaux (11/10) : on prend le PREMIER niveau avec ≥20
 * courses (sinon on avance quand même, drapeau insuffisant). Chaque niveau
 * est affiché : rien de caché dans le choix du périmètre. */
const NIVEAUX = [
  { nom: 'strict', dd: 200, dc: 2, fam: true },
  { nom: 'large', dd: 500, dc: 4, fam: true },
  { nom: 'famille', dd: 1e9, dc: 99, fam: true },
]
let contexte = [], niveauCtx = 'insuffisant'
for (const nv of NIVEAUX) {
  const cand = tout.filter((x) => x.date < DATE
    && (!nv.fam || (fam && famDiscipline(x.discipline) === fam))
    && Math.abs((x.distance || 0) - (course.distance || 0)) <= nv.dd
    && Math.abs(x.partants.length - nChamp) <= nv.dc)
  if (cand.length >= SEUIL_CTX) { contexte = cand; niveauCtx = nv.nom; break }
  contexte = cand
}
contexte = contexte.slice(-MAX_CONTEXTE)
console.log('')
console.log('COURSE : ' + DATE + ' ' + HIPPO.toUpperCase() + ' R' + R + ' C' + C
  + ' · ' + (course.discipline || '?') + (fam ? '→' + fam : '') + ' ' + (course.distance || '?') + 'm · ' + nChamp + 'p')
console.log('contexte : ' + contexte.length + ' courses (niveau ' + niveauCtx
  + ', avant le ' + DATE + ', max ' + MAX_CONTEXTE + ' récentes)'
  + (contexte.length < SEUIL_CTX ? ' ⚠ INSUFFISANT (<' + SEUIL_CTX + ')' : ''))
console.log('arrivée : ' + course.arrivee.slice(0, 3).join('-'))

const estOut = (f) => f && f.startsWith('OUT')
const estToc = (f) => f && f.startsWith('TOC')
const famDe = (ps) => {
  const m = new Map()
  for (const p of ps) { const f = famille(Number(p.cote_pmu ?? NaN)); if (f) m.set(p.num, f) }
  return m
}
/* surface filtrée : bande OUT (resp. TOC) au score de forme seul. */
const surface = (partants, pred) => partants
  .filter((p) => pred(famDe(partants).get(p.num)))
  .map((p) => ({ num: p.num, s: formeScore(p.musique || '') }))
  .sort((a, b) => b.s - a.s || a.num - b.num)
  .slice(0, 3).map((x) => x.num)

const M = { mot: { n: 0, g: 0, ce: 0, cp: 0, te: 0, tp: 0 }, mar: { n: 0, g: 0, ce: 0, cp: 0, te: 0, tp: 0 } }
const S = { out: { n: 0, rec: 0, abst: 0 }, toc: { n: 0, rec: 0, abst: 0 }, mOut: { n: 0, rec: 0 }, mToc: { n: 0, rec: 0 } }
const t0 = Date.now()
contexte.forEach((c, i) => {
  const a = c.arrivee.slice(0, 3)
  const top5 = c.arrivee.slice(0, 5)
  const passe = tout.filter((x) => x.date < c.date)
  const v = verdict(c.partants, construireIndex(passe))
  const tri = trioCandidat(c.partants)
  const mesure = (T, t) => {
    if (!t) return
    T.n++
    if (t[0] === a[0]) T.g++
    if (t[0] === a[0] && t[1] === a[1]) T.ce++
    if (t.slice(0, 2).every((x) => top5.includes(x))) T.cp++
    if (t[0] === a[0] && t[1] === a[1] && t[2] === a[2]) T.te++
    if (t.every((x) => top5.includes(x))) T.tp++
  }
  mesure(M.mot, v && v.trio)
  mesure(M.mar, tri)
  const fams = famDe(c.partants)
  const sO = surface(c.partants, estOut), sT = surface(c.partants, estToc)
  const cote = (ps) => [...ps].sort((p, q) => Number(p.cote_pmu ?? 999) - Number(q.cote_pmu ?? 999) || p.num - q.num)
  const mO = cote(c.partants.filter((p) => estOut(fams.get(p.num)))).slice(0, 3).map((p) => p.num)
  const mT = cote(c.partants.filter((p) => estToc(fams.get(p.num)))).slice(0, 3).map((p) => p.num)
  const rec = (sel, Srow) => {
    if (!sel.length) { Srow.abst = (Srow.abst || 0) + 1; return }
    Srow.n++
    if (sel.some((x) => top5.includes(x))) Srow.rec++
  }
  rec(sO, S.out); rec(sT, S.toc)
  if (mO.length) { S.mOut.n++; if (mO.some((x) => top5.includes(x))) S.mOut.rec++ }
  if (mT.length) { S.mToc.n++; if (mT.some((x) => top5.includes(x))) S.mToc.rec++ }
  if ((i + 1) % 25 === 0) console.log('  … ' + (i + 1) + '/' + contexte.length)
})

// ② DNA
const coarse = (f) => (f.startsWith('FAV') ? 'FAV' : f.startsWith('OUT') ? 'OUT' : 'TOC')
const d3 = new Map(), d5 = new Map(), comp = { FAV: 0, OUT: 0, TOC: 0 }, tilt = new Map(), formes = new Map()
let nDna = 0
for (const c of contexte) {
  const fams = famDe(c.partants)
  const a = c.arrivee.slice(0, 5)
  if (a.some((x) => !fams.get(x))) continue
  nDna++
  const k3 = a.slice(0, 3).map((x) => coarse(fams.get(x))).join('-')
  const k5 = a.map((x) => coarse(fams.get(x))).join('-')
  d3.set(k3, (d3.get(k3) || 0) + 1)
  d5.set(k5, (d5.get(k5) || 0) + 1)
  for (const p of c.partants) { const f = fams.get(p.num); if (f) comp[coarse(f)] = (comp[coarse(f)] || 0) + 1 }
  tilt.set(fams.get(a[0]), (tilt.get(fams.get(a[0])) || 0) + 1)
  formes.set(a.slice(0, 3).map((x) => fams.get(x)).join('-'), 0)
}
const top = (m, k = 8) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([x, v]) => x + ' ' + v).join('  ')

// ③ compatibles : formes FAM fréquentes (support≥2) + chevaux du field
const fJour = famDe(course.partants)
const parFam = new Map()
for (const p of course.partants) {
  const f = fJour.get(p.num)
  if (!f) continue
  if (!parFam.has(f)) parFam.set(f, [])
  parFam.get(f).push(p.num)
}
const formesF = new Map()
for (const c of contexte) {
  const fams = famDe(c.partants)
  const a = c.arrivee.slice(0, 3)
  if (a.some((x) => !fams.get(x))) continue
  const k = a.map((x) => fams.get(x)).join('-')
  formesF.set(k, (formesF.get(k) || 0) + 1)
}
const compatibles = [...formesF.entries()].filter(([, v]) => v >= 2)
  .sort((a, b) => b[1] - a[1]).slice(0, 10)
  .map(([k, v]) => ({ forme: k, support: v, chevaux: k.split('-').map((f) => (parFam.get(f) || []).join('/') || '—') }))

const pct = (x, n) => (x / Math.max(1, n) * 100).toFixed(1) + '%'
const RL = (T) => [T.g, T.ce, T.cp, T.te, T.tp].map((x) => pct(x, T.n)).join(' · ')
console.log('')
console.log('══ FIABILITÉ (' + contexte.length + ' courses, ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s) ══')
console.log('  métrique : gagnant · couplé exact · couplé placé · trio exact · trio placé')
console.log('  moteur : ' + RL(M.mot) + '  (n=' + M.mot.n + ')')
console.log('  marché : ' + RL(M.mar) + '  (n=' + M.mar.n + ')')
console.log('  OUT surface (forme) : ' + pct(S.out.rec, S.out.n) + ' (n=' + S.out.n + ', abst ' + (S.out.abst || 0) + ')'
  + '  vs marché-OUT : ' + pct(S.mOut.rec, S.mOut.n) + ' (n=' + S.mOut.n + ')')
console.log('  TOC surface (forme) : ' + pct(S.toc.rec, S.toc.n) + ' (n=' + S.toc.n + ', abst ' + (S.toc.abst || 0) + ')'
  + '  vs marché-TOC : ' + pct(S.mToc.rec, S.mToc.n) + ' (n=' + S.mToc.n + ')')
console.log('')
console.log('══ MARKET DNA (' + nDna + ' courses) ══')
console.log('  top3 : ' + top(d3, 6))
console.log('  top5 : ' + top(d5, 4))
console.log('  field : ' + Object.entries(comp).map(([k, v]) => k + ' ' + (v / Math.max(1, nDna)).toFixed(1)).join(' · '))
console.log('  tilt : ' + top(tilt, 6))
console.log('')
console.log('══ STRUCTURES COMPATIBLES (support≥2) ══')
for (const c of compatibles) console.log('  ' + c.forme + '  support ' + c.support + '  →  ' + c.chevaux.join(' · '))
console.log('')
fs.mkdirSync(SORTIE, { recursive: true })
fs.writeFileSync(path.join(SORTIE, `${DATE}_${HIPPO.toUpperCase()}_R${R}_C${C}.json`),
  JSON.stringify({ course: DATE + ' ' + HIPPO + ' R' + R + ' C' + C, contexte: contexte.length, fiabilite: { moteur: M.mot, marche: M.mar, surfaces: S }, dna: { top3: [...d3], top5: [...d5], tilt: [...tilt] }, compatibles }))
console.log('  artefact : data/basmah/' + DATE + '_' + HIPPO.toUpperCase() + '_R' + R + '_C' + C + '.json')
console.log('')
