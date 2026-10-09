/* ══════════════════════════════════════════════════════════════════════════
 *  tools/test-top3.mjs — LE TEST DES QUOTAS PROPOSÉS (09/10/2026).
 *
 *  ⚠ LABORATOIRE UNIQUEMENT. Lecture seule : aucun fichier écrit, aucun
 *  moteur modifié, aucun quota touché en production (§11.16 intouchable).
 *
 *  Question : la règle proposée (P1-P4:3, P5-P8:2, P9-P10:2, P11+:1 = 8)
 *  bat-elle la règle actuelle (G1:3, G2:2, G3:1, G4:1, G5:1 = 8) ?
 *
 *  Méthode : 94 Quintés avec presse (data/corpus/archive-94.json), remplis
 *  PAR LA COTE CROISSANTE dans chaque groupe (le marché, §11.17 — sans la
 *  surprise, pour comparer les QUOTAS seuls, pas les règles de remplissage).
 *  Indicateurs : 3/3, 5/5, ≥4/5, 1er manqué, 2e/3e manqué.
 *  Split chronologique : train (66 premiers) / test (28 derniers).
 *
 *    node tools\test-top3.mjs
 * ══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs'

const TOUT = JSON.parse(fs.readFileSync('data/corpus/archive-94.json', 'utf8'))
const courses = (TOUT.courses || TOUT)
  .filter((c) => (c.presse || []).length >= 10 && (c.arrivee || []).length >= 5)
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

/* Les groupes sont des PLAGES DE PRESSE (P1 = 1er cité). Remplissage par
 * cote croissante — le marché décide l'ordre dans le groupe. */
function jouer(course, groupes) {
  const pris = []
  const parCote = [...(course.presse || [])].sort((a, b) =>
    (course.cotes?.[a] ?? 999) - (course.cotes?.[b] ?? 999))
  for (const [debut, fin, quota] of groupes) {
    const dansGroupe = parCote.filter((n) => {
      const r = course.presse.indexOf(n) + 1
      return r >= debut && r <= fin && !pris.includes(n)
    })
    pris.push(...dansGroupe.slice(0, quota))
  }
  return pris
}

const SCENARIOS = {
  // G1=P1-P4, G2=P5-P8, G3=P9-P10, G4=P11-P12, G5=P13+
  'actuel   3-2-1-1-1': [[1, 4, 3], [5, 8, 2], [9, 10, 1], [11, 12, 1], [13, 30, 1]],
  // proposé le 09/10 : P1-P4:3, P5-P8:2, P9-P10:2, P11+:1
  'proposé  3-2-2-1  ': [[1, 4, 3], [5, 8, 2], [9, 10, 2], [11, 30, 1]],
}

function mesurer(liste) {
  const out = {}
  for (const [lbl, groupes] of Object.entries(SCENARIOS)) {
    let t3 = 0, c5 = 0, q4 = 0, sans1 = 0, sans23 = 0
    for (const c of liste) {
      const t = jouer(c, groupes)
      const s = new Set(t)
      const arr = c.arrivee.slice(0, 5)
      if (arr.slice(0, 3).every((n) => s.has(n))) t3++
      if (arr.every((n) => s.has(n))) c5++
      if (arr.filter((n) => s.has(n)).length >= 4) q4++
      if (!s.has(arr[0])) sans1++
      if (!s.has(arr[1]) || !s.has(arr[2])) sans23++
    }
    out[lbl] = { n: liste.length, t3, c5, q4, sans1, sans23 }
  }
  return out
}

function afficher(titre, liste) {
  const m = mesurer(liste)
  console.log('')
  console.log('  ' + titre + ' (' + liste.length + ' courses)')
  console.log('  ' + '─'.repeat(78))
  console.log('  scénario              3/3      5/5      ≥4/5     1er manqué   2e/3e manqué')
  for (const [lbl, r] of Object.entries(m)) {
    const f = (x) => String(x).padStart(3) + '  (' + String(Math.round(x / r.n * 100)).padStart(2) + '%)'
    console.log('  ' + lbl + '  ' + f(r.t3) + '  ' + f(r.c5) + '  ' + f(r.q4)
      + '   ' + f(r.sans1) + '      ' + f(r.sans23))
  }
}

console.log('')
console.log('  ══ TEST DES QUOTAS : actuel (3-2-1-1-1) vs proposé (3-2-2-1) ══')
console.log('  Remplissage par cote croissante — 94 Quintés avec presse')
afficher('TRAIN (66 premiers)', courses.slice(0, 66))
afficher('TEST  (28 derniers)', courses.slice(66))
afficher('TOUT  (94)', courses)
console.log('')
