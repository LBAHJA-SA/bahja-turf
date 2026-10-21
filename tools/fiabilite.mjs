/* =============================================================================
 * tools/fiabilite.mjs — LA FIABILITÉ MESURÉE, écrite dans un fichier (16/10/2026)
 *
 * La page /quinte affiche ce fichier tel quel : elle n'invente aucun chiffre
 * (§7) et n'en calcule aucun. Ce que le panneau montre est exactement ce que
 * ce script a mesuré.
 *
 *   data/fiabilite.json + public/data/fiabilite.json
 *
 * Ce qu'il contient :
 *   1. `code`       — la fiabilité du moteur en production (§11.22), métrique
 *                     §11.18 (PAYANTE = le 1-2-3 complet dans la grille).
 *   2. `baselines`  — le marché seul : les 8 et 9 meilleures cotes.
 *   3. `badge`      — ce que vaut le badge ★ : parmi les chevaux CITÉS PAR LA
 *                     PRESSE, ceux que le marché place dans ses T premières
 *                     cotes arrivent-ils plus souvent ? (par tranche de rang)
 *   4. `experience` — les variantes du siège de G5 (tools/experience-g5.mjs).
 *                     `experienceAppliquee` dit laquelle est en production
 *                     (4-2-1-1-0 depuis le §11.27 du 20/10/2026).
 *
 *   node tools\fiabilite.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, computeStats, remplirGrille } from '../src/lib/quinte.js'
import { chargerEchantillon, rangMarche, mesurer, VARIANTES, kpi } from './experience-g5.mjs'

const pc = (a, b) => (b ? +(100 * a / b).toFixed(1) : 0)
const classementDe = (grille) => grille.groupes
  .flatMap((g) => g.cases).slice().sort((a, b) => a.slot - b.slot)
  .map((x) => ({ p: { num: x.num }, s: null, ok: true }))

/* ── 1 + 2 : le code et les baselines, cotes finales et ouverture ─────────── */
function mesurerCode(champ) {
  const CASES = chargerEchantillon(champ)
  const C = { n: 0, p3: 0, p4: 0, p5: 0, ch: 0 }
  const B = { n: 0, p3: 0, p4: 0, p5: 0, ch: 0 }
  const B9 = { n: 0, p3: 0, p4: 0, p5: 0, ch: 0 }
  for (const c of CASES) {
    const grille = buildGrid(c.synthese, c.runners)
    const stats = computeStats(CASES.filter((x) => x !== c))
    const t = remplirGrille(grille, classementDe(grille), c.discipline, c.cotes, stats).ticket
    const k = kpi(t, c.arrivee)
    C.n++; if (k >= 3) C.p3++; if (k >= 4) C.p4++; if (k >= 5) C.p5++; C.ch += t.length

    const parCote = Object.keys(c.cotes).map(Number).sort((a, b) => c.cotes[a].cote - c.cotes[b].cote)
    const k8 = kpi(parCote.slice(0, 8), c.arrivee)
    B.n++; if (k8 >= 3) B.p3++; if (k8 >= 4) B.p4++; if (k8 >= 5) B.p5++; B.ch += Math.min(8, parCote.length)
    const k9 = kpi(parCote.slice(0, 9), c.arrivee)
    B9.n++; if (k9 >= 3) B9.p3++; if (k9 >= 4) B9.p4++; if (k9 >= 5) B9.p5++; B9.ch += Math.min(9, parCote.length)
  }
  return { n: CASES.length, cas: [CASES[0]?.date, CASES[CASES.length - 1]?.date], code: C, marche8: B, marche9: B9 }
}

/* ── 3 : le badge ★ — le marché backe-t-il ce que la presse cite ? ────────── */
function mesurerBadge() {
  const CASES = chargerEchantillon('cotes')
  const TR = [
    { cle: '1-3',   lib: 'top 3 du marché',   min: 1, max: 3 },
    { cle: '4-5',   lib: '4e-5e du marché',   min: 4, max: 5 },
    { cle: '6-8',   lib: '6e-8e du marché',   min: 6, max: 8 },
    { cle: '9-12',  lib: '9e-12e du marché',  min: 9, max: 12 },
    { cle: '13+',   lib: '13e et au-delà',    min: 13, max: 99 },
  ]
  const T = Object.fromEntries(TR.map((x) => [x.cle, { ...x, n: 0, t5: 0, t3: 0 }]))
  const TOUT = { cle: 'tous', lib: 'tous les partants cités', n: 0, t5: 0, t3: 0 }
  for (const c of CASES) {
    const rang = rangMarche(c)
    const t5 = new Set(c.arrivee.slice(0, 5))
    const t3 = new Set(c.arrivee.slice(0, 3))
    for (const num of c.synthese) {
      const r = rang[num]
      if (!r) continue                        // pas de cote : hors mesure
      const tr = TR.find((x) => r >= x.min && r <= x.max)
      TOUT.n++; if (t5.has(num)) TOUT.t5++; if (t3.has(num)) TOUT.t3++
      T[tr.cle].n++; if (t5.has(num)) T[tr.cle].t5++; if (t3.has(num)) T[tr.cle].t3++
    }
  }
  const fin = (x) => ({ cle: x.cle, lib: x.lib, n: x.n, top5: pc(x.t5, x.n), top3: pc(x.t3, x.n), courses: CASES.length })
  return [...TR.map((x) => fin(T[x.cle])), fin(TOUT)]
}

/* ── 4 : l'expérience du siège de G5 (importée, jamais dupliquée) ─────────── */
function mesurerExperience() {
  const CASES = chargerEchantillon('cotes')
  const R = mesurer(CASES)
  const m = Math.floor(CASES.length / 2)
  const H1 = mesurer(CASES.slice(0, m))
  const H2 = mesurer(CASES.slice(m))
  const OU = mesurer(chargerEchantillon('ouverture'))
  return VARIANTES.map((v) => {
    const r = R[v.cle], o = OU[v.cle]
    return {
      cle: v.cle,
      nom: v.nom,
      condition: v.cond ? `rang de marché ≤ ${v.cond}` : null,
      payante: pc(r.p3, r.n),
      couvre4: pc(r.p4, r.n),
      q5: pc(r.p5, r.n),
      chevaux: +(r.ch / r.n).toFixed(1),
      garde: v.cond ? pc(r.garde, r.n) : null,
      payanteOuverture: pc(o.p3, o.n),
      payante1re: pc(H1[v.cle].p3, H1[v.cle].n),
      payante2e: pc(H2[v.cle].p3, H2[v.cle].n),
      appliquee: v.cle === 'courante',
    }
  }).sort((a, b) => b.payante - a.payante)
}

const FIN = mesurerCode('cotes')
const OUV = mesurerCode('ouverture')
const out = {
  mesure: {
    outil: 'tools/fiabilite.mjs',
    le: new Date().toISOString().slice(0, 10),
    source: 'data/quintes.json — Quinté Global PMU France',
    echantillon: { n: FIN.n, du: FIN.cas[0], au: FIN.cas[1] },
    metrique: '§11.18 PAYANTE = le 1-2-3 (gagnant, 2e, 3e) complet dans la grille',
    note: "aucun chiffre de ce fichier n'est saisi à la main : relancer le script pour le rafraîchir.",
  },
  code: {
    finales: { ...FIN.code, payante: pc(FIN.code.p3, FIN.code.n), couvre4: pc(FIN.code.p4, FIN.code.n), q5: pc(FIN.code.p5, FIN.code.n), chevaux: +(FIN.code.ch / FIN.code.n).toFixed(1) },
    ouverture: { ...OUV.code, payante: pc(OUV.code.p3, OUV.code.n), couvre4: pc(OUV.code.p4, OUV.code.n), q5: pc(OUV.code.p5, OUV.code.n), chevaux: +(OUV.code.ch / OUV.code.n).toFixed(1) },
  },
  baselines: {
    marche8: { ...FIN.marche8, payante: pc(FIN.marche8.p3, FIN.marche8.n), couvre4: pc(FIN.marche8.p4, FIN.marche8.n), q5: pc(FIN.marche8.p5, FIN.marche8.n), chevaux: +(FIN.marche8.ch / FIN.marche8.n).toFixed(1) },
    marche9: { ...FIN.marche9, payante: pc(FIN.marche9.p3, FIN.marche9.n), couvre4: pc(FIN.marche9.p4, FIN.marche9.n), q5: pc(FIN.marche9.p5, FIN.marche9.n), chevaux: +(FIN.marche9.ch / FIN.marche9.n).toFixed(1) },
  },
  badge: mesurerBadge(),
  experience: mesurerExperience(),
  experienceAppliquee: 'courante',
}

fs.writeFileSync('data/fiabilite.json', JSON.stringify(out, null, 1))
fs.writeFileSync('public/data/fiabilite.json', JSON.stringify(out, null, 1))

/* ─────────────────────────────── ce qu'on affiche ────────────────────────── */
const f = (x) => String(x).padStart(6)
console.log('\n  FIABILITÉ MESURÉE — ' + out.mesure.echantillon.n + ' Quintés à presse réelle (' +
  out.mesure.echantillon.du + ' → ' + out.mesure.echantillon.au + ')')
console.log('  écrit dans data/fiabilite.json et public/data/fiabilite.json\n')
console.log('  méthode                       PAYANTE  couvre +4    5/5   ch.')
console.log('  ' + '-'.repeat(66))
console.log('  le CODE (§11.22), cotes finales' + f(out.code.finales.payante + ' %') + f(out.code.finales.couvre4 + ' %') + f(out.code.finales.q5 + ' %') + f(out.code.finales.chevaux))
console.log('  le CODE, cotes d\'ouverture     ' + f(out.code.ouverture.payante + ' %') + f(out.code.ouverture.couvre4 + ' %') + f(out.code.ouverture.q5 + ' %') + f(out.code.ouverture.chevaux))
console.log('  marché seul — 8 meilleures cotes' + f(out.baselines.marche8.payante + ' %') + f(out.baselines.marche8.couvre4 + ' %') + f(out.baselines.marche8.q5 + ' %') + f(out.baselines.marche8.chevaux))
console.log('  marché seul — 9 meilleures cotes' + f(out.baselines.marche9.payante + ' %') + f(out.baselines.marche9.couvre4 + ' %') + f(out.baselines.marche9.q5 + ' %') + f(out.baselines.marche9.chevaux))
console.log('\n  LE BADGE ★ — les chevaux CITÉS PAR LA PRESSE, par rang de marché')
console.log('  ' + '-'.repeat(66))
for (const b of out.badge) {
  console.log('  ' + b.lib.padEnd(30) + f(b.n) + f(b.top5 + ' %') + f(b.top3 + ' %'))
}
console.log('\n  L\'EXPÉRIENCE DU SIÈGE — ' + (out.experienceAppliquee === 'courante' ? 'la ligne 4-2-1-1-0 est en production (§11.27) ; les autres ne sont PAS appliquées' : ''))
console.log('  ' + '-'.repeat(66))
for (const v of out.experience) {
  console.log('  ' + (v.appliquee ? '▶ ' : '  ') + v.nom.padEnd(48) + f(v.payante + ' %') + f(v.payanteOuverture + ' %'))
}
console.log('\n  la 2e colonne de chiffres = les mêmes variantes sur les cotes d\'ouverture.\n')
