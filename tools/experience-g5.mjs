/* =============================================================================
 * tools/experience-g5.mjs — L'EXPÉRIENCE DU SIÈGE DE G5 (16/10/2026)
 *
 * §11.16 : les quotas appartiennent à la méthode, pas au moteur. Mais la méthode
 * elle-même déclare une LATITUDE, §11.2 / §11.6 / §11.9 :
 *
 *     B1 ······ 2 ou 3      B3 ······ 1 OBLIGATOIRE     B5 ······ 1 ou 0
 *     B2 ······ 2 ou 3      B4 ······ 1
 *
 * Et §11.6 dit du dernier bloc : « B5 : 1 ou 0 — le 1 seulement si un cheval de
 * B5 a une configuration physique irréprochable ».
 *
 * ⭐ 28/10/2026 — §11.40 : la production est REVENUE à 3-2-1-1-1 (le ticket de 8
 * de la méthode, G5 compris). Cette expérience mesure ce que valent les
 * répartitions d'avant, et ce que coûte le 9ᵉ cheval de la période 21/10 → 28/10.
 *
 *   96 Quintés à presse RÉELLE (data/quintes.json), cotes finales ET ouverture.
 *
 *   node tools\experience-g5.mjs              cotes finales
 *   node tools\experience-g5.mjs ouverture    cotes du matin (proxy d'un run à 07 h)
 *
 * ⚠ Ce fichier est aussi le MODULE de l'expérience : tools/fiabilite.mjs importe
 *   `chargerEchantillon`, `VARIANTES` et `jouer` d'ici, pour que le panneau de
 *   mesure de la page et ce rapport ne puissent jamais diverger.
 * ============================================================================= */
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { buildGrid, computeStats, remplirGrille } from '../src/lib/quinte.js'

/* ───────────────────────────── l'échantillon ───────────────────────────── */
/** les Quintés à presse RÉELLE — même filtre que tools/mesure-moteur.mjs */
export function chargerEchantillon(champ = 'cotes') {
  const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
  return TOUT
    .map((q) => {
      const cotes = q[champ]
      if (!cotes || Object.keys(cotes).length < 12) return null
      if (!q.arrivee || q.arrivee.length < 5) return null
      const nums = Object.keys(cotes).map(Number)
      if (nums.some((n) => !(cotes[n] > 1))) return null
      const presse = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
      if (presse.length < 10) return null
      return {
        date: q.date,
        discipline: q.discipline,
        cotes: Object.fromEntries(nums.map((n) => [n, { cote: cotes[n] }])),
        synthese: presse,
        runners: nums,
        arrivee: q.arrivee.slice(0, 5),
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** le rang de marché de chaque partant : 1 = la cote la plus basse */
export function rangMarche(c) {
  const ordre = Object.keys(c.cotes).map(Number).sort((a, b) => c.cotes[a].cote - c.cotes[b].cote || a - b)
  return Object.fromEntries(ordre.map((n, i) => [n, i + 1]))
}

/* ⭐ 29/10/2026 (§11.46) — LA PRODUCTION EST 3-3-1-1-0. Le siège de G5 est
 * passé à G2 sur la bassmat du mois : G5 n'a sauvé AUCUN arrivant sur 19
 * sièges posés en octobre, alors que le 4e de G2 arrive 26 % du temps.
 * Mesuré : le mois 30,8 % / 7,7 % (contre 26,9 % / 3,8 %) · les 96 courses
 * 40,6 % / 12,5 % (contre 37,5 % / 11,5 %) — `tools/mois-moteur.mjs`. */
export const Q_BASE = { G1: 3, G2: 3, G3: 1, G4: 1, G5: 0 }
/** 3-2-1-1-1 — la production du 28/10 au 29/10 (§11.40), 8 chevaux, G5 compris */
export const Q_3_2_1_1_1 = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }
/** 4-3-1-1-0 — la production du 21/10 au 28/10 (§11.34), 9 chevaux */
export const Q_4_3_1_1_0 = { G1: 4, G2: 3, G3: 1, G4: 1, G5: 0 }
/** 4-2-1-1-0 — la production du 20/10 au soir (§11.27), 8 chevaux */
export const Q_4_2_1_1_0 = { G1: 4, G2: 2, G3: 1, G4: 1, G5: 0 }
/** 3-3-1-1-0 — la production du 20/10 au matin (§11.26) */
export const Q_3_3_1_1_0 = { G1: 3, G2: 3, G3: 1, G4: 1, G5: 0 }
/** le siège de G2 part vers `secours` (8 chevaux, base 4-2-1-1-0) */
export const Q_SANS_G5 = (secours = 'G3') => ({ G1: 4, G2: 1, G3: 1, G4: 1, G5: 0, [secours]: 2 })
/** le siège de G5 est RETIRÉ sans être rendu (7 chevaux, base 3-2-1-1-1) */
export const Q_SANS_SIEGE = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 0 }

const classementDe = (grille) => grille.groupes
  .flatMap((g) => g.cases).slice().sort((a, b) => a.slot - b.slot)
  .map((x) => ({ p: { num: x.num }, s: null, ok: true }))

/** rejoue la course avec un vecteur de quotas ; renvoie { ticket, g5 } */
export function jouer(c, quotas) {
  const grille = buildGrid(c.synthese, c.runners)
  const g2 = { groupes: grille.groupes.map((g) => ({ ...g, quota: quotas[g.id] ?? g.quota })) }
  const { ticket, detail } = remplirGrille(g2, classementDe(grille), c.discipline, c.cotes, c.stats)
  const g5 = detail?.find((d) => d.id === 'G5')
  return { ticket, g5: g5?.cases?.find((x) => x.pris)?.num ?? null }
}

/** ⭐ les variantes — toutes restent dans la latitude déclarée par la méthode */
export const VARIANTES = [
  { cle: 'courante', nom: '3-3-1-1-0 — EN PRODUCTION depuis le 29/10 (§11.46), 8 ch.' },
  { cle: '43110', nom: '4-3-1-1-0 — la production du 21/10 au 28/10 (§11.34), 9 ch.' },
  { cle: '42110', nom: '4-2-1-1-0 — la production du 20/10 au soir (§11.27), 8 ch.' },
  { cle: '32111', nom: '3-2-1-1-1 — la production du 28/10 au 29/10 (§11.40), 8 ch.' },
  { cle: 'sans', nom: '3-2-1-1-0 — le siège de G5 retiré, 7 ch.' },
  { cle: 'B3', nom: '4-1-2-1-0 — le siège de G2 va à G3, 8 ch.' },
  { cle: 'B4', nom: '4-1-1-2-0 — le siège de G2 va à G4, 8 ch.' },
]

export const kpi = (t, arr) => { let k = 0; for (const x of arr) { if (!t.includes(x)) break; k++ } return k }
export const pct = (a, b) => (b ? Math.round((100 * a) / b) + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)

/** joue une variante sur une course ; renvoie { ticket, garde } */
function tirer(c, v, base) {
  if (v.cle === 'courante') return { ticket: base.ticket, garde: false }
  if (v.cle === '43110') return { ticket: jouer(c, Q_4_3_1_1_0).ticket, garde: false }
  if (v.cle === '42110') return { ticket: jouer(c, Q_4_2_1_1_0).ticket, garde: false }
  if (v.cle === '32111') return { ticket: jouer(c, Q_3_2_1_1_1).ticket, garde: false }
  if (v.cle === 'sans') return { ticket: jouer(c, Q_SANS_SIEGE).ticket, garde: false }
  if (v.cle === 'B3') return { ticket: jouer(c, Q_SANS_G5('G3')).ticket, garde: false }
  if (v.cle === 'B4') return { ticket: jouer(c, Q_SANS_G5('G4')).ticket, garde: false }
  return { ticket: base.ticket, garde: false }
}

/** mesure toutes les variantes sur une liste de courses → { cle: {n,p3,p4,p5,ch,garde} } */
export function mesurer(courses) {
  const out = {}
  for (const c of courses) {
    c.stats = computeStats(courses.filter((x) => x !== c))
    const base = jouer(c, Q_BASE)
    for (const v of VARIANTES) {
      const r = (out[v.cle] = out[v.cle] || { n: 0, p3: 0, p4: 0, p5: 0, ch: 0, garde: 0 })
      const { ticket, garde } = v.cle === 'courante' ? { ticket: base.ticket, garde: false } : tirer(c, v, base)
      const k = kpi(ticket, c.arrivee)
      r.n++
      if (k >= 3) r.p3++
      if (k >= 4) r.p4++
      if (k >= 5) r.p5++
      r.ch += ticket.length
      if (garde) r.garde++
    }
  }
  return out
}

/* ─────────────────────────────── le rapport ─────────────────────────────── */
function rapport(champ) {
  const CASES = chargerEchantillon(champ)
  const N = CASES.length
  const R = mesurer(CASES)
  const milieu = Math.floor(N / 2)
  const H1 = mesurer(CASES.slice(0, milieu))
  const H2 = mesurer(CASES.slice(milieu))

  console.log('\n  LE SIÈGE DE G5 — cotes ' + (champ === 'cotes' ? 'finales' : "d'ouverture"))
  console.log('  ' + N + ' Quintés à presse réelle · blocs buildGrid · choix §11.22 · métrique §11.18 (PAYANTE)')
  console.log('  quotas 3-2-1-1-1 (en production, §11.40) — le siège de G5 est mesuré ici, §11.2 : B5 = 1 ou 0\n')
  console.log('  ' + pad('variante', 50) + pad('PAYANTE', 10) + pad('couvre +4', 12) + pad('5/5', 10) + pad('ch.', 6) + 'siège gardé')
  console.log('  ' + '-'.repeat(96))
  const ordre = Object.entries(R).sort((a, b) => (b[1].p3 / b[1].n) - (a[1].p3 / a[1].n))
  for (const [cle, r] of ordre) {
    const nom = VARIANTES.find((v) => v.cle === cle)?.nom || cle
    console.log('  ' + pad(nom, 50) + pad(pct(r.p3, r.n), 10) + pad(pct(r.p4, r.n), 12) + pad(pct(r.p5, r.n), 10) +
      pad((r.ch / r.n).toFixed(1), 6) + (r.garde ? pct(r.garde, r.n) : '—'))
  }
  console.log('\n  stabilité — PAYANTE sur chaque moitié chronologique de ' + milieu + ' courses')
  console.log('  ' + pad('variante', 50) + pad('1re moitié', 12) + '2e moitié')
  console.log('  ' + '-'.repeat(96))
  for (const [cle] of ordre) {
    console.log('  ' + pad(VARIANTES.find((v) => v.cle === cle)?.nom || cle, 50) +
      pad(pct(H1[cle].p3, H1[cle].n), 12) + pct(H2[cle].p3, H2[cle].n))
  }
  console.log('\n  La variante « courante » est le code en production (§11.46) : 3-3-1-1-0.')
  console.log('  Les autres lignes sont mesurées sur les mêmes courses, jamais appliquées.\n')
  return { N, R, H1, H2, ordre }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  rapport(process.argv[2] === 'ouverture' ? 'ouverture' : 'cotes')
}
