/* =============================================================================
 * tools/coply-verif.mjs — LE MOTEUR DU COUPLÉ, MESURÉ COMME IL TOURNE (21/10/2026)
 *
 * Question de l'utilisateur : « coply المحرك ديالو فاشل جدا ».
 * On ne discute pas — on compte. Ce fichier applique LE VRAI moteur
 * (`backend/COUPLE/moteur-coply.js`, celui que la page importe) sur l'archive,
 * avec le modèle RÉELLEMENT publié (`public/data/coply-modele.json`).
 *
 * Aucune réécriture : le module du navigateur est importé tel quel, et on lui
 * fournit le fichier local en remplaçant `fetch`.
 *
 * Mesures, sur les N dernières courses de l'archive :
 *   ① le moteur   : les 3 numéros prédits  → ≥2/3 (le couplé) et 3/3 (le trio)
 *   ② le marché   : les 3 plus petites cotes
 *   ③ le hasard   : analytique 3( n-3 )+1 / C(n,3), et le hasard tiré
 *   ④ l'ACCORD    : combien de fois le moteur donne exactement le top-3 du marché
 *   ⑤ les features réellement présentes (valeur, corde, gains, musique…)
 *
 *   node tools\coply-verif.mjs [N=400]
 * ============================================================================= */

import fs from 'node:fs'
import { charger } from './empreinte-couple.mjs'

const N = Math.max(50, Number(process.argv[2]) || 400)

const MODELE = 'public/data/coply-modele.json'

/* ── le vrai moteur lit son modèle par `fetch` : on le sert en local ─────── */
globalThis.fetch = async () => ({
  ok: true, status: 200,
  json: async () => JSON.parse(fs.readFileSync(MODELE, 'utf8')),
})
const { selectionCoply } = await import('../backend/COUPLE/moteur-coply.js')

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-N)

/* ── ⑤ l'audit des features : ce qui existe vraiment dans l'archive ──────── */
const CH = { cote_pmu: 0, cote: 0, musique: 0, valeur: 0, age: 0, corde: 0, gain: 0, gains: 0, sexe: 0 }
let NP = 0
for (const c of tests) for (const p of c.partants) {
  if (!p.num || p.nonPartant) continue
  NP++
  for (const k of Object.keys(CH)) {
    const v = p[k]
    if (v == null || v === '' || v === 0) continue
    CH[k]++
  }
}
console.log('\n  ══ LE MOTEUR DU COUPLÉ, MESURÉ ══')
console.log('  archive : ' + tout.length + ' courses (' + tout[0].date + ' → ' + tout[tout.length - 1].date + ')')
console.log('  testé   : les ' + tests.length + ' dernières (' + tests[0].date + ' → ' + tests[tests.length - 1].date + ') · ' + NP + ' partants')
console.log('  modèle  : ' + MODELE + ' · fenêtre ' + JSON.parse(fs.readFileSync(MODELE, 'utf8')).fenetre
  + ' · validation annoncée ' + (100 * JSON.parse(fs.readFileSync(MODELE, 'utf8')).validation.taux).toFixed(1) + ' %')
console.log('\n  ⑤ ce que l\u2019archive donne VRAIMENT à `caract()` (partants non nuls) :')
for (const [k, v] of Object.entries(CH)) {
  console.log('     ' + k.padEnd(10) + (100 * v / NP).toFixed(1).padStart(6) + ' %   ' + v + '/' + NP)
}

/* ── les mesures ─────────────────────────────────────────────────────────── */
const acc = { moteur: { m2: 0, m3: 0 }, marche: { m2: 0, m3: 0 }, hasardTire: { m2: 0, m3: 0 } }
let accord = 0, n = 0, tailles = 0
const attendu = { m2: 0, m3: 0 }

for (const c of tests) {
  const partants = c.partants.filter((p) => p.num && !p.nonPartant && Number(p.cote_pmu) > 0)
  if (partants.length < 8) continue
  const top3 = new Set(c.arrivee.slice(0, 3))
  if (top3.size < 3) continue
  n++
  const T = partants.length
  tailles += T

  /* ① le vrai moteur */
  const sel = await selectionCoply(partants, { distance: c.distance || 0 }, 3)
  if (sel) {
    const p = sel.chevaux
    const h = c.arrivee.slice(0, 3).filter((x) => p.includes(x)).length
    if (h >= 2) acc.moteur.m2++
    if (h >= 3) acc.moteur.m3++
    /* ④ l'accord avec le marché */
    const mar = partants.slice().sort((a, b) => a.cote_pmu - b.cote_pmu || a.num - b.num).slice(0, 3).map((x) => x.num)
    if ([...mar].sort().join('·') === [...p].sort().join('·')) accord++
    else {
      /* ③ le hasard tiré : 3 partants au hasard */
      const mel = partants.slice()
      for (let i = mel.length - 1; i > 0; i--) { const j = (i * 7919 + 13) % (i + 1); [mel[i], mel[j]] = [mel[j], mel[i]] }
      const r = mel.slice(0, 3).map((x) => x.num)
      const hr = c.arrivee.slice(0, 3).filter((x) => r.includes(x)).length
      if (hr >= 2) acc.hasardTire.m2++
      if (hr >= 3) acc.hasardTire.m3++
    }
  }

  /* ② le marché */
  const mar = partants.slice().sort((a, b) => a.cote_pmu - b.cote_pmu || a.num - b.num).slice(0, 3).map((x) => x.num)
  const hm = c.arrivee.slice(0, 3).filter((x) => mar.includes(x)).length
  if (hm >= 2) acc.marche.m2++
  if (hm >= 3) acc.marche.m3++

  /* ③ le hasard analytique : P(≥2 des 3 arrivants dans 3 tirés) */
  attendu.m2 += (3 * (T - 3) + 1) / (T * (T - 1) * (T - 2) / 6)
  attendu.m3 += 1 / (T * (T - 1) * (T - 2) / 6)
}

const pc = (a) => (100 * a / n).toFixed(1) + ' %'
console.log('\n  ' + n + ' courses · peloton moyen ' + (tailles / n).toFixed(1) + ' partants')
console.log('\n  ' + ''.padEnd(26) + 'couplé (≥2/3)     trio (3/3)')
console.log('  ' + '① LE MOTEUR (coply)'.padEnd(26) + pc(acc.moteur.m2).padStart(9) + '      ' + pc(acc.moteur.m3).padStart(9))
console.log('  ' + '② le marché (3 cotes les + basses)'.padEnd(26) + pc(acc.marche.m2).padStart(9) + '      ' + pc(acc.marche.m3).padStart(9))
console.log('  ' + '③ le hasard (analytique)'.padEnd(26) + pc(attendu.m2).padStart(9) + '      ' + pc(attendu.m3).padStart(9))
console.log('\n  ④ le moteur donne EXACTEMENT le top-3 du marché : ' + accord + '/' + n + ' = ' + pc(accord))

/* ── le même moteur sur la page, SANS les features de l'archive ──────────── */
const dec = await (async () => {
  const c = tests[tests.length - 1]
  const nu = c.partants.filter((p) => p.num && !p.nonPartant && Number(p.cote_pmu) > 0)
  const sansFeatures = nu.map((p) => ({ num: p.num, coteRef: p.cote_pmu }))
  const a = await selectionCoply(nu, { distance: c.distance || 0 }, 3)
  const b = await selectionCoply(sansFeatures, { distance: c.distance || 0 }, 3)
  const mar = nu.slice().sort((x, y) => x.cote_pmu - y.cote_pmu || x.num - y.num).slice(0, 3).map((x) => x.num)
  return { avec: a?.chevaux, sans: b?.chevaux, marche: mar }
})()
console.log('\n  ⑥ la DERNIÈRE course, moteur avec la carrière de l\u2019archive / avec la SEULE cote :')
console.log('     carrière : ' + (dec.avec || []).join(' · '))
console.log('     cote seule : ' + (dec.sans || []).join(' · ') + '      marché : ' + dec.marche.join(' · '))
console.log('')
