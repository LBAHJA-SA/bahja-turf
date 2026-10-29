/* =============================================================================
 * tools/mois-moteur.mjs — CHANGER LE MOTEUR À PARTIR DE LA BASSMAT DU MOIS
 * (29/10/2026)
 *
 * Demande de l'utilisateur : « هر شهر داز خاصنا نغيرو المحرك بناءا على هاد
 * البصمة ديال النتائج السابقة » — chaque mois qui passe, le moteur doit être
 * revu à partir de la bassmat des résultats précédents.
 *
 * La bassmat du mois (tools/bassmat-mois.mjs) dit où le ticket a perdu :
 *
 *     24 sièges morts sur 47 coupés · G5 : 8 morts / 19 posés / 0 sauvé
 *     G4 : 6 morts · G3 : 4 morts / 4 coupés · G1 : 1 mort / 83
 *
 * Elle ne dit pas quoi changer. Ce fichier le mesure. Deux corpus :
 *
 *   ① LE MOIS   — 26 Quintés d'octobre, l'archive réelle, tickets réels.
 *                 ⚠ C'est un HORS-ÉCHANTILLON : les règles de production ont
 *                 été choisies sur les 96 courses, jamais sur ce mois.
 *   ② LE CONTRÔLE — les 96 Quintés à presse réelle (data/quintes.json), le
 *                 corpus qui a servi à choisir la règle actuelle.
 *
 * Une variante n'est retenue que si elle ne PERD sur aucun des deux corpus,
 * et si elle gagne sur la métrique dense (podium entier) là où le 5/5 est
 * trop rare pour trancher (§11.25).
 *
 * ⚠ Aucune variante ne sort de la latitude écrite par la méthode (§11.9 /
 * §11.2) : G1 2 ou 3 · G2 2 ou 3 · G3 1 obligatoire · G4 1 · G5 1 ou 0.
 * Les cinq BOÎTES (P1-P4 / P5-P8 / P9-P10 / P11-P12 / P13+) ne bougent pas.
 *
 *   node tools\mois-moteur.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, remplirGrille } from '../src/lib/quinte.js'

const IDS = ['G1', 'G2', 'G3', 'G4', 'G5']
const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)
const r1 = (x) => Math.round(10 * x) / 10

/* ─────────────────────────────── ① LE MOIS ─────────────────────────────── */
const ARCH = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const COTES = (() => { try { return JSON.parse(fs.readFileSync('data/cotes.json', 'utf8')) } catch { return {} } })()

const MOIS = []
for (const d of Object.keys(ARCH).sort().filter((x) => x >= '2026-10-01' && x <= '2026-10-31')) {
  const e = ARCH[d]
  const syn = (e.synthese || []).filter((n) => Number.isFinite(n) && n > 0)
  const arr = (e.arrivee || []).filter((n) => Number.isFinite(n) && n > 0)
  if (syn.length < 8 || arr.length < 5) continue
  const nums = (e.runners && e.runners.length ? e.runners : syn).map(Number)
  const grille = buildGrid(syn, nums)
  const c = COTES[e.courseId]
  let cotes = null
  if (c && Array.isArray(c.cotes)) {
    const o = {}
    for (const x of c.cotes) if (x && x.cote > 1) o[x.num] = { cote: x.cote }
    if (Object.keys(o).length >= 10) cotes = o
  }
  const cl = grille.groupes.flatMap((g) => g.cases).slice().sort((a, b) => a.slot - b.slot)
    .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
  MOIS.push({ date: d, grille, cl, cotes, discipline: e.discipline, arr })
}

/* ───────────────────────── ② LE CONTRÔLE (96) ──────────────────────────── */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const CTRL = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  const grille = buildGrid(syn, nums)
  const cl = grille.groupes.flatMap((g) => g.cases).slice().sort((a, b) => a.slot - b.slot)
    .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
  CTRL.push({
    date: q.date, grille, cl, discipline: q.discipline, arr: q.arrivee,
    cotes: Object.fromEntries(nums.map((n) => [n, { cote: cotes[n] }])),
  })
}

/* ─────────────────────────────── le moteur ─────────────────────────────── */
function jouer(c, quotas, choix) {
  const g = { groupes: c.grille.groupes.map((x, k) => ({ ...x, quota: Math.min(quotas[k], x.cases.length) })) }
  const r = remplirGrille(g, c.cl, c.discipline, c.cotes, null, choix)
  return r.ticket
}

/* choix par bloc, écrit en toutes lettres — jamais une lettre à traduire.
 * ⚠ 29/10/2026 : la première version passait 'C' au moteur, qui ne connaît que
 * « carnet » et « marche » ; 'C' tombait dans la branche du CLASSEMENT et la
 * production mesurait 25 % de podium au lieu de 37,5 %. Le témoin qui l'a
 * attrapé : la production doit retrouver 37,5 % / 11,5 % sur les 96 courses. */
const CHOIX = {
  prod: { G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'marche', G5: 'marche' },
  g5carnet: { G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'marche', G5: 'carnet' },
  g4g5carnet: { G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'carnet', G5: 'carnet' },
  g4carnet: { G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'carnet', G5: 'marche' },
}
const VARIANTES = [
  { nom: 'production 3-2-1-1-1 · G1-G3 carnet · G4-G5 marché', q: [3, 2, 1, 1, 1], c: CHOIX.prod },
  { nom: '3-2-1-1-1 · G5 au carnet (P13 d’abord)', q: [3, 2, 1, 1, 1], c: CHOIX.g5carnet },
  { nom: '3-2-1-1-1 · G4 + G5 au carnet', q: [3, 2, 1, 1, 1], c: CHOIX.g4g5carnet },
  { nom: '3-3-1-1-0 · le siège de G5 passe à G2 (§11.26)', q: [3, 3, 1, 1, 0], c: CHOIX.g5carnet },
  { nom: '3-3-1-1-0 · G4 au carnet', q: [3, 3, 1, 1, 0], c: CHOIX.g4carnet },
  { nom: '3-2-1-1-1 · G4 au carnet, G5 au marché', q: [3, 2, 1, 1, 1], c: CHOIX.g4carnet },
]

const mesure = (corpus, v) => {
  let n = 0, somme = 0, pod = 0, qui = 0, q4 = 0, tailles = 0
  for (const c of corpus) {
    const t = jouer(c, v.q, v.c)
    const a5 = c.arr.slice(0, 5), a3 = c.arr.slice(0, 3)
    const x = a5.filter((k) => t.includes(k)).length
    n++; somme += x; if (t.length) tailles += t.length
    if (a3.every((k) => t.includes(k))) pod++
    if (x === 5) qui++
    if (x >= 4) q4++
  }
  return { n, mn: somme / n, pod: 100 * pod / n, qui: 100 * qui / n, q4: 100 * q4 / n, taille: tailles / n }
}

console.log('\n  ══ CHANGER LE MOTEUR AVEC LA BASSMAT DU MOIS ══')
console.log('  ① le mois : ' + MOIS.length + ' Quintés réels (' + MOIS[0].date + ' → ' + MOIS[MOIS.length - 1].date + ') — HORS-ÉCHANTILLON')
console.log('  ② le contrôle : ' + CTRL.length + ' Quintés à presse réelle (le corpus qui a choisi la règle actuelle)')

for (const [titre, corpus] of [['① LE MOIS (26) — données fraîches', MOIS], ['② LE CONTRÔLE (96) — le corpus de référence', CTRL]]) {
  console.log('\n  ' + titre)
const P = (x) => (Math.round(10 * x) / 10).toString().replace('.', ',') + ' %'
  console.log('  ' + pad('variante', 55) + pad('chev.', 7) + pad('x/5', 8) + pad('podium', 11) + pad('quinté', 11) + '≥4/5')
  const ref = mesure(corpus, VARIANTES[0])
  for (const v of VARIANTES) {
    const m = mesure(corpus, v)
    const marque = (a, b) => (r1(a) > r1(b) ? ' ↑' : r1(a) < r1(b) ? ' ↓' : ' =')
    console.log('  ' + pad(v.nom, 55) + pad(r1(m.taille), 7) + pad(String(r1(m.mn)) + marque(m.mn, ref.mn), 8) +
      pad(P(m.pod) + marque(m.pod, ref.pod), 11) + pad(P(m.qui) + marque(m.qui, ref.qui), 11) +
      pad(P(m.q4), 9))
  }
}

/* ───────────────────── le verdict : les deux corpus ────────────────────── */
const verdicts = []
for (const v of VARIANTES.slice(1)) {
  const a = mesure(MOIS, v), b = mesure(CTRL, v)
  const r0a = mesure(MOIS, VARIANTES[0]), r0b = mesure(CTRL, VARIANTES[0])
  const okDense = a.pod >= r0a.pod - 0.001 && b.pod >= r0b.pod - 0.001
  const okQuinte = a.qui >= r0a.qui - 0.001 && b.qui >= r0b.qui - 0.001
  verdicts.push({ nom: v.nom.trim(), okDense, okQuinte, gainMois: r1(a.qui - r0a.qui), gainCtrl: r1(b.qui - r0b.qui) })
}

console.log('\n  ── VERDICT (une variante ne perd sur AUCUN corpus)')
for (const v of verdicts) {
  console.log('  ' + pad(v.nom.slice(0, 52), 54) +
    pad('quinté mois ' + (v.gainMois >= 0 ? '+' : '') + v.gainMois, 20) +
    pad('contrôle ' + (v.gainCtrl >= 0 ? '+' : '') + v.gainCtrl, 18) +
    (v.okDense && v.okQuinte ? '✓ RETENUE' : '✗ rejetée'))
}

const sortie = {
  quand: new Date().toISOString(),
  mois: { n: MOIS.length, debut: MOIS[0].date, fin: MOIS[MOIS.length - 1].date },
  controle: { n: CTRL.length },
  variantes: VARIANTES.map((v) => {
    const a = mesure(MOIS, v), b = mesure(CTRL, v)
    return {
      nom: v.nom.trim(), quotas: v.q, choix: v.c,
      mois: { chevaux: r1(a.taille), x5: r1(a.mn), podium: r1(a.pod), quinte: r1(a.qui), q4: r1(a.q4) },
      controle: { chevaux: r1(b.taille), x5: r1(b.mn), podium: r1(b.pod), quinte: r1(b.qui), q4: r1(b.q4) },
    }
  }),
}
fs.writeFileSync('data/mois-moteur.json', JSON.stringify(sortie, null, 1))
try { fs.writeFileSync('public/data/mois-moteur.json', JSON.stringify(sortie, null, 1)) } catch { /* pas de page */ }
console.log('\n  artefact : data/mois-moteur.json\n')

void IDS
