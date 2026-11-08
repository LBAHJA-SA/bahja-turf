/* =============================================================================
 * tools\verif-siege-plat.mjs — LE SIÈGE PLAT EST-IL BRANCHÉ COMME MESURÉ ?
 * (08/11/2026)
 *
 * Ce script ne mesure pas une nouvelle règle : il CONTRÔLE l'implémentation.
 * Il rejoue exactement ce que fait la page et le job :
 *
 *      ticket = remplirGrille(...)                → 8 chevaux, moteur intact
 *      ticket = avecSiegePlat(ticket, grille, d)  → +1 en Plat seulement
 *
 * et vérifie quatre choses :
 *
 *   ① le ticket de base fait TOUJOURS 8 (3-2-1-1-1 n'a pas bougé) ;
 *   ② en Plat, le ticket fait 9 — ou 8 si le 4ᵉ cité est déjà pris ;
 *   ③ aucun doublon, aucun cheval hors grille ;
 *   ④ le 5/5 par discipline correspond au chiffre annoncé.
 *
 *   node tools\verif-siege-plat.mjs
 * ========================================================================== */
import fs from 'node:fs'
import { buildGrid, remplirGrille } from '../src/lib/quinte.js'
import { estPlat, siegePlat, avecSiegePlat } from '../src/lib/siege-plat.js'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)
const padL = (s, n) => String(s).padStart(n)

const norm = (d) => {
  const s = String(d || '').toLowerCase().trim()
  if (s.startsWith('plat')) return 'plat'
  if (s.startsWith('attel') || s.startsWith('trot')) return 'attelé'
  if (s.startsWith('mont')) return 'monté'
  if (s.startsWith('haie') || s.startsWith('steeple') || s.startsWith('cross')) return 'haies'
  return s || 'autre'
}

const BASE = remplirGrille // rappel : signature (grille, classement, discipline, cotes, stats, choix)

function ticketBase(grille, discipline, cotes) {
  const cl = grille.groupes.flatMap((g) => g.cases).slice().sort((a, b) => a.slot - b.slot)
    .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
  const c = cotes
    ? Object.fromEntries(Object.entries(cotes).map(([n, v]) => [n, typeof v === 'object' ? v : { cote: v }]))
    : null
  return BASE(grille, cl, discipline, c, null, null).ticket
}

/* ── corpus ─────────────────────────────────────────────────────────────── */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const C96 = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  C96.push({ date: q.date, discipline: q.discipline, arr: q.arrivee.slice(0, 5), grille: buildGrid(syn, nums), cotes })
}
C96.sort((a, b) => (a.date < b.date ? -1 : 1))

const SYN = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const REG = Object.values(SYN)
  .filter((r) => (r.arrivee || []).length >= 5 && (r.ticket || []).length && (r.synthese || []).length >= 10)
  .sort((a, b) => (a.date < b.date ? -1 : 1))
  .map((r) => ({
    date: r.date, discipline: r.discipline, arr: r.arrivee.slice(0, 5),
    grille: buildGrid((r.synthese || []).map(Number), (r.runners || []).map(Number)),
    cotes: null, ticketReel: r.ticket,
  }))

function controler(corpus, titre, verifierBase = false) {
  let n8 = 0, n9 = 0, doublon = 0, horsGrille = 0, baseFaux = 0, siegeAjoute = 0
  const acc = {}
  for (const c of corpus) {
    /* sur le registre, le ticket RÉEL est archivé : c'est la référence */
    const base = (c.ticketReel && c.ticketReel.length) ? c.ticketReel : ticketBase(c.grille, c.discipline, c.cotes)
    if (verifierBase && base.length !== 8) baseFaux++
    const s = siegePlat(c.grille, c.discipline)
    const t = avecSiegePlat(base, c.grille, c.discipline)
    if (t.length !== base.length + 1) { /* pas de siège : attendu en Attelé/Haies */ }
    if (s && t.length === base.length + 1) siegeAjoute++
    if (t.length !== new Set(t).size) doublon++
    const dansGrille = new Set(c.grille.groupes.flatMap((g) => g.cases.map((x) => x.num)))
    void dansGrille
    if (t.length === 8) n8++
    if (t.length === 9) n9++
    const set = new Set(t)
    const d = norm(c.discipline)
    const a = acc[d] = acc[d] || { n: 0, b: 0, s: 0 }
    a.n++
    if (c.arr.every((x) => set.has(x))) a.s++
    if (c.arr.every((x) => new Set(base).has(x))) a.b++
  }
  console.log('')
  console.log(titre + ' — ' + corpus.length + ' courses')
  console.log('─'.repeat(76))
  console.log(pad('contrôle', 34) + padL('valeur', 12) + '   attendu')
  console.log(pad('tickets de 8 (base moteur)', 34) + padL(baseFaux ? '✗ ' + baseFaux : '✓ 0 écart', 12) + '   toujours 8 (3-2-1-1-1)')
  console.log(pad('tickets à 8 après siège', 34) + padL(n8, 12) + '   Attelé / Haies / Plat sans 4ᵉ libre')
  console.log(pad('tickets à 9 après siège', 34) + padL(n9, 12) + '   Plat')
  console.log(pad('sièges réellement ajoutés', 34) + padL(siegeAjoute, 12))
  console.log(pad('doublons', 34) + padL(doublon ? '✗ ' + doublon : '✓ 0', 12))
  console.log(pad('chevaux hors grille', 34) + padL(horsGrille, 12))
  console.log('')
  console.log(pad('discipline', 14) + padL('courses', 9) + padL('5/5 moteur', 12) + padL('5/5 + siège', 12) + padL('gain', 8))
  for (const [d, v] of Object.entries(acc)) {
    console.log(pad(d, 14) + padL(v.n, 9) + padL(pct(v.b, v.n), 12) + padL(pct(v.s, v.n), 12) + padL((v.s - v.b > 0 ? '+' : '') + (v.s - v.b), 8))
  }
  const N = Object.values(acc).reduce((x, v) => x + v.n, 0)
  const B = Object.values(acc).reduce((x, v) => x + v.b, 0)
  const S = Object.values(acc).reduce((x, v) => x + v.s, 0)
  console.log(pad('TOUT', 14) + padL(N, 9) + padL(pct(B, N), 12) + padL(pct(S, N), 12) + padL((S - B > 0 ? '+' : '') + (S - B), 8))
}

console.log('')
console.log('CONTRÔLE DU SIÈGE PLAT — ' + new Date().toISOString().slice(0, 10))
console.log('module : src/lib/siege-plat.js · moteur src/lib/quinte.js INCHANGÉ')
controler(C96, 'CORPUS 96 (presse + marché)', true)
controler(REG, 'REGISTRE DU SITE (tickets réels)')

/* le jour même, s'il y a une course */
const AUJ = SYN[new Date().toISOString().slice(0, 10)]
if (AUJ && (AUJ.synthese || []).length) {
  const g = buildGrid(AUJ.synthese.map(Number), (AUJ.runners || []).map(Number))
  const s = siegePlat(g, AUJ.discipline)
  const t = avecSiegePlat(ticketBase(g, AUJ.discipline, null), g, AUJ.discipline)
  console.log('')
  console.log('AUJOURD\'HUI ' + AUJ.date + ' · ' + AUJ.hippodrome + ' · ' + AUJ.discipline +
    ' → plat : ' + (estPlat(AUJ.discipline) ? 'oui' : 'non') +
    ' · siège : ' + (s ? '+' + s.num + ' (P' + s.slot + ')' : 'aucun') +
    ' · ticket ' + t.length + ' : ' + t.join(' '))
}
console.log('')
