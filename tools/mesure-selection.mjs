/* ---------------------------------------------------------------
 * tools\mesure-selection.mjs  —  ⭐ شنو الاختيار اللي كيخدم؟
 *
 *   node tools\mesure-selection.mjs
 *   node tools\mesure-selection.mjs --loo     → + leave-one-out
 *
 * المعطيات: `archives\*.json` = 95 Quinté Global PMU (94 لعباو).
 * La mesure de `mesure-physique.mjs` a montré :
 *     SCORE (forme+corde)  23.0 %   <- SOUS le hasard (32.3 %)
 *     COTE                 55.3 %   <- le seul signal
 *
 * donc on ne se pose plus la question « quel cheval » mais « QUELS
 * chevaux, et en combien ». On teste des règles de sélection, on les
 * mesure sur les 94 vraies courses, et on compare au hasard.
 *
 * ⚠ 94 courses, c'est PETIT. Tester 30 règles et prendre la meilleure, ça
 * donne un gagnant par hasard. C'est pourquoi la sortie principale est le
 * **LOO** : on choisit la règle sur 3/4 des courses, on la teste sur le
 * quart caché, on additionne. Une règle qui ne tient pas au LOO, elle
 * n'existe pas.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scorePhysique, scoreForme } from '../src/lib/quinte.js'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.join(RACINE, 'archives')

/* ------------------------------------------------------------ les règles --- */
/* Chaque règle renvoie un nombre : plus haut = meilleur.                */

const statsPmu = (p) => (p.nombreVictoires || 0) * 3 + (p.nombrePlacesSecond || 0) * 2
  + (p.nombrePlacesTroisieme || 0) * 1.5 + (p.nombrePlaces || 0)

const jetons = (mus) => String(mus || '').match(/\d+\(|\(\d+\)|\d+[A-Za-z]|[A-Za-z]/g) || []

/** PMU écrit la musique du plus ancien au plus récent (à confirmer). */
const formeRecent = (p, disc, n) => {
  const r = scoreForme(jetons(p.musique).slice(-n).join(''), disc)
  return r.score
}

const REGLES = {
  'cote': (p, c) => -(p.cote_pmu > 0 ? p.cote_pmu : 999),                    // cote basse = favorite
  'cote inverse': (p) => (p.cote_pmu > 0 ? p.cote_pmu : 0),                  // sanity-check : doit être < hasard
  'forme': (p, c) => scoreForme(p.musique, c.disc).score,
  'forme 3 derniers': (p, c) => formeRecent(p, c.disc, 3),
  'score (forme+corde)': (p, c) => scorePhysique(p, [], c.cj).global,
  'stats PMU': (p) => statsPmu(p),
  'taux de victoires': (p) => (p.nombreCourses ? (p.nombreVictoires || 0) / p.nombreCourses : 0),
  'age': (p) => -(p.age || 5),
  'poids': (p) => -(p.poids || 55),
  'gain': (p) => -(p.gain || 0),
  'cote x stats': (p, c) => -(p.cote_pmu > 0 ? p.cote_pmu : 999) * 0.01 + statsPmu(p) * 0.1,
  'cote x forme': (p, c) => -(p.cote_pmu > 0 ? p.cote_pmu : 999) * 0.01 + scoreForme(p.musique, c.disc).score * 0.5,
  'cote x age': (p, c) => -(p.cote_pmu > 0 ? p.cote_pmu : 999) * 0.01 - (p.age || 5) * 0.05,
  'cote,已经被剔除': (p, c) => ((p.nombreCourses || 0) < 4 ? -1000 : 0) - (p.cote_pmu > 0 ? p.cote_pmu : 999),
}

/* ------------------------------------------------------------ préparation --- */

const courseJour = (r, c) => ({
  dist: c.distance || 2500,
  surf: /psf|synth/i.test(c.surface || '') ? 'PSF' : 'Gazon',
  sens: /gauche/i.test(c.corde || '') ? 'G' : 'D',
  discipline: c.specialty || c.discipline || 'PLAT',
  hippo: r.hippodrome || '',
})

const courses = []
for (const f of fs.readdirSync(DOSSIER).filter((x) => x.endsWith('.json'))) {
  const chemin = path.join(DOSSIER, f)
  if (!fs.statSync(chemin).size) continue
  const j = JSON.parse(fs.readFileSync(chemin, 'utf8'))
  const c = j.course || {}
  if (!(c.types_pari || []).includes('QUINTE_PLUS')) continue
  const ordre = (c.arrivee || []).flat().filter(Boolean)
  if (ordre.length < 5) continue
  const partants = (j.participants || []).filter((p) => String(p.statut || 'PARTANT').includes('PARTANT') && p.nonPartant !== true)
  if (partants.length < 8) continue
  courses.push({
    cle: j.reunion.date + ' R' + j.reunion.num + 'C' + c.num,
    date: j.reunion.date,
    partants,
    top5: ordre.slice(0, 5),
    cj: courseJour(j.reunion, c),
    disc: c.specialty || c.discipline || 'PLAT',
    nb: partants.length,
  })
}

/** Les N meilleurs selon la règle. */
const choisir = (k, regle, N) => {
  const f = REGLES[regle]
  return k.partants.slice().sort((a, b) => (f(b, k) - f(a, k)) || (a.num - b.num)).slice(0, N)
}

/** How many of the top5 are in our picks. */
const touches = (k, regle, N) => {
  const pris = new Set(choisir(k, regle, N).map((p) => p.num))
  return k.top5.filter((n) => pris.has(n)).length
}

const N = [5, 6, 7, 8, 10, 12]
const noms = Object.keys(REGLES)

/* ---------------------------------------------------------------- tableau --- */
console.log('')
console.log(`  ⭐ QUELLES RÈGLES CHOISISSENT LE MIEUX ?  —  ${courses.length} Quintés, 5 à trouver`)
console.log('')
console.log('  règle                      ' + N.map((n) => `top${n}`.padStart(8)).join(''))
console.log('  ' + '-'.repeat(24 + N.length * 8))

const brut = {}
for (const nom of noms) {
  brut[nom] = {}
  for (const n of N) {
    const tot = courses.reduce((s, k) => s + touches(k, nom, n), 0)
    brut[nom][n] = tot / courses.length          // moyenne de Dalton sur 5
  }
}
for (const nom of noms) {
  console.log('  ' + nom.padEnd(25) + N.map((n) => (brut[nom][n].toFixed(2)).padStart(8)).join(''))
}
const hasards = {}
for (const n of N) hasards[n] = courses.reduce((s, k) => s + n * k.top5.length / k.nb, 0) / courses.length
console.log('  ' + '-'.repeat(24 + N.length * 8))
console.log('  ' + 'HASARD'.padEnd(25) + N.map((n) => hasards[n].toFixed(2).padStart(8)).join(''))

/* ------------------------------------------------- le taux de 3/5 et 5/5 --- */
console.log('')
console.log('  --- avec 8 chevaux choisis : répartition du nombre d arrivants trouvés ---')
console.log('  règle                      moyen    ≥3/5    ≥4/5     5/5')
console.log('  ' + '-'.repeat(50))
const detail = {}
for (const nom of noms) {
  const t = courses.map((k) => touches(k, nom, 8))
  detail[nom] = t
  const moy = t.reduce((a, b) => a + b, 0) / t.length
  const p = (x) => (t.filter((v) => v >= x).length / t.length * 100).toFixed(0) + ' %'
  console.log('  ' + nom.padEnd(25) + moy.toFixed(2).padStart(5) + '    ' + p(3).padStart(6) + '  ' + p(4).padStart(6) + '  ' + p(5).padStart(7))
}
const th = courses.map((k) => Math.round(8 * k.top5.length / k.nb))
console.log('  ' + '-'.repeat(50))
console.log('  ' + 'HASARD'.padEnd(25) + (th.reduce((a, b) => a + b, 0) / th.length).toFixed(2).padStart(5) + '    '
  + ((th.filter((v) => v >= 3).length / th.length * 100).toFixed(0) + ' %').padStart(6) + '  '
  + ((th.filter((v) => v >= 4).length / th.length * 100).toFixed(0) + ' %').padStart(6) + '  '
  + ((th.filter((v) => v >= 5).length / th.length * 100).toFixed(0) + ' %').padStart(7))

/* ------------------------------------------------------------------- LOO --- */
console.log('')
console.log('  ⭐ LEAVE-ONE-OUT — la seule mesure honnête sur 94 courses')
console.log('     (on choisit la règle sur 3/4, on la teste sur le quart caché)')
console.log('')

const K = 4
const plis = []
for (let i = 0; i < courses.length; i++) plis.push(i % K)
const mailles = []
for (let f = 0; f < K; f++) {
  const train = courses.filter((_, i) => plis[i] !== f)
  const test = courses.filter((_, i) => plis[i] === f)
  // le gagnant est choisi UNIQUEMENT sur l'entrainement
  let meilleur = null
  for (const nom of noms) {
    const moy = train.reduce((s, k) => s + touches(k, nom, 8), 0) / train.length
    if (!meilleur || moy > meilleur.valeur) meilleur = { nom, valeur: moy }
  }
  const obtenu = test.reduce((s, k) => s + touches(k, meilleur.nom, 8), 0)
  const hasard = test.reduce((s, k) => s + 8 * k.top5.length / k.nb, 0)
  mailles.push({ pli: f + 1, regle: meilleur.nom, obtenu, hasard, n: test.length })
  console.log(`  pli ${f + 1} .rule gagnante sur l'entrainement : ${meilleur.nom.padEnd(22)} (${meilleur.valeur.toFixed(2)})  ->  sur le test : ${(obtenu / test.length).toFixed(2)}   hasard ${(hasard / test.length).toFixed(2)}`)
}
const totO = mailles.reduce((s, m) => s + m.obtenu, 0)
const totH = mailles.reduce((s, m) => s + m.hasard, 0)
console.log('  ' + '-'.repeat(70))
console.log(`  LOO : ${totO} arrivants trouvés  vs  hasard ${totH.toFixed(0)}   (${courses.length} courses)`)
console.log(`  soit ${(totO / courses.length).toFixed(2)} par course  contre  ${(totH / courses.length).toFixed(2)} au hasard`)
console.log('')

/* les règles qui tiennent sur TOUT l'archive (diagnostic, pas sélection) */
console.log('  --- les règles qui battent le hasard sur les 94 (diagnostic) ---')
const seuil = hasards[8]
for (const nom of noms) {
  if (brut[nom][8] > seuil) console.log(`     ${nom.padEnd(25)} ${brut[nom][8].toFixed(2)}  >  hasard ${seuil.toFixed(2)}`)
}
console.log('')
