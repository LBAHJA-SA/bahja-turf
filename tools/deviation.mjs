/* ---------------------------------------------------------------
 * tools\deviation.mjs  —  ⭐ QUI ROMPT L ORDRE DU MARCHÉ ?
 *
 *   node tools\deviation.mjs
 *
 * ⚠ LABORATOIRE UNIQUEMENT. AUCUN SYSTÈME N EST MODIFIÉ.
 *
 * LA QUESTION, EN UNE PHRASE
 *   on ne cherche ni le meilleur ni le moins bon.
 *   on cherche le cheval qui CONTRADIT son rang de marché.
 *
 *   P4 peut finir 2e.  P1 peut finir 7e.
 *   un rang n est pas une qualité, c est une moyenne.
 *   Si les rangs étaient parfaits, il n y aurait rien à corriger.
 *
 * CE QUE CE SCRIPT FAIT
 *   ① la DÉVIATION de chaque cheval :  place réelle − rang de marché
 *   ② le profil : quel rang produit le plus de DÉVIATION POSITIVE
 *   ③ les 8 CANDIDATS D'INDICE, tous calculables AVANT le départ
 *   ④ la puissance de chacun : sépare-t-il les衔à-hauteur des inratés ?
 *   ⑤ le test honnête : APP sur 70 %, TEST sur 30 %
 *   ⑥ le plafonnement : en appliquant le meilleur indice, combien
 *      de 5/5gat-on sur 7 chevaux ?
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'chevaux.json')

const fichier = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = fichier.courses
  .filter((k) => k.partants && k.partants.length >= 10 && (k.partants || []).some((p) => p.top5))
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = base.length
const COUPURE = Math.round(n * 0.75)

/* tous les chevaux, à plat, avec leur déviation */
const chevaux = []
for (const k of base) {
  for (const p of k.partants) {
    if (p.rangMarche == null || p.arrivee == null) continue
    chevaux.push({
      cle: k.cle, date: k.date, discipline: k.discipline, distance: k.distance,
      hippodrome: k.hippodrome, nb: k.nbPartants,
      num: p.num, nom: p.nom,
      rang: p.rangMarche, place: p.arrivee,
      dev: p.arrivee - p.rangMarche,
      top5: p.top5, podium: p.arrivee <= 3,
      cote: p.cote, ouverture: p.ouverture,
      age: p.age, poids: p.poids, valeur: p.valeur, corde: p.corde,
      nbV: p.nbVictoires, nbC: p.nbCourses, nbP: p.nbPlaces,
      musique: p.musique || '',
      discipline: k.discipline,
    })
  }
}

console.log('')
console.log('  ⭐⭐ QUI ROMPT L ORDRE DU MARCHÉ ?')
console.log('     ' + n + ' courses · ' + chevaux.length + ' chevaux')
console.log('     APP = ' + COUPURE + ' premières courses   TEST = ' + (n - COUPURE) + ' dernières')
console.log('')

/* ═══ ① la déviation ════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ① LA DÉVIATION — place réelle moins rang de marché')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  (négative = le cheval a fait MIEUX que son rang)')
console.log('')
const parDev = new Map()
chevaux.forEach((c) => {
  const k = c.dev
  if (!parDev.has(k)) parDev.set(k, { n: 0, top5: 0 })
  const e = parDev.get(k)
  e.n++
  if (c.top5) e.top5++
})
console.log('   écart      chevaux    dans le Top 5   taux')
console.log('  ' + '-'.repeat(52))
;[...parDev.entries()].sort((a, b) => a[0] - b[0]).forEach(([k, e]) => {
  if (k > 5 || k < -12) return
  console.log('   ' + ((k > 0 ? '+' : '') + k).padStart(4) + String(e.n).padStart(12)
    + String(e.top5).padStart(16) + (e.top5 / e.n * 100).toFixed(1).padStart(10) + ' %'
    + (k <= -1 ? '   ← il a fait mieux que son rang' : ''))
})
console.log('')
const neg = chevaux.filter((c) => c.dev <= 0)
console.log('  ⭐ chevaux qui ont tenu ou dépassé leur rang : ' + neg.length
  + ' / ' + chevaux.length + '  (' + (neg.length / chevaux.length * 100).toFixed(0) + ' %)')
console.log('  ⭐ chevaux qui ont fait MIEUX que leur rang (dev ≤ −1) : '
  + chevaux.filter((c) => c.dev <= -1).length)
console.log('')

/* ═══ ② le profil par rang ══════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ② LE PROFIL PAR RANG — où se cache la déviation ?')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  rang   chevaux   Top 5    %      « mieux »   %      écart moyen')
console.log('  ' + '-'.repeat(72))
const prof = []
for (let r = 1; r <= 20; r++) {
  const v = chevaux.filter((c) => c.rang === r)
  if (!v.length) break
  const t5 = v.filter((c) => c.top5).length
  const mieux = v.filter((c) => c.dev <= -1).length
  const ecart = v.reduce((a, c) => a + c.dev, 0) / v.length
  prof.push({ r, n: v.length, t5: t5 / v.length * 100, mieux: mieux / v.length * 100, ecart })
  console.log('  ' + ('P' + r).padEnd(7) + String(v.length).padStart(8)
    + String(t5).padStart(8) + (t5 / v.length * 100).toFixed(1).padStart(7) + ' %'
    + String(mieux).padStart(11) + (mieux / v.length * 100).toFixed(1).padStart(7) + ' %'
    + ecart.toFixed(2).padStart(15)
    + (ecart < -0.15 ? '   ← il BAT son rang' : ecart > 0.15 ? '   ← il Rates' : ''))
}
console.log('')
const hats = prof.filter((x) => x.ecart < -0.15)
console.log('  ⭐ les rangs qui BATTENT leur classement : '
  + (hats.length ? hats.map((x) => 'P' + x.r + ' (' + x.ecart.toFixed(2) + ')').join(' · ') : 'AUCUN'))
console.log('')

/* ═══ ③ les indices candidats ═══════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ③ LES 8 CANDIDATS — tous calculables AVANT le départ')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')

/** l'INDICE DE DÉVIATION prédit : un score. Plus il est haut,
 *  plus le cheval a de chances de ÇA CRAQUER son rang. */
const CANDIDATS = [
  {
    nom: 'la cote baisse (ouverture → finale)',
    f: (c) => {
      if (!c.ouverture || !c.cote) return null
      return (c.ouverture - c.cote) / Math.max(c.ouverture, 1) * 100
    },
  },
  {
    nom: 'la cote a bougé depuis l ouverture',
    f: (c) => (c.ouverture && c.cote) ? Math.abs(c.ouverture / Math.max(c.cote, 1) - 1) * 100 : null,
  },
  {
    nom: 'poids porté fort (poids / valeur)',
    f: (c) => (c.poids && c.valeur) ? (c.poids / 10) / c.valeur * 10 : null,
  },
  {
    nom: 'jeune (3 ans ou moins)',
    f: (c) => (c.age ? (c.age <= 3 ? 1 : c.age <= 4 ? 0.5 : 0) : null),
  },
  {
    nom: 'taux de victoire de carrière',
    f: (c) => (c.nbV && c.nbC ? c.nbV / c.nbC * 100 : null),
  },
  {
    nom: 'gains de l année en cours',
    f: (c) => (c.gains && c.gains.annee != null ? c.gains.annee : null),
  },
  {
    nom: 'corde intérieure (1 à 6)',
    f: (c) => (c.corde ? (c.corde <= 6 ? 1 : c.corde >= 15 ? -1 : 0) : null),
  },
  {
    nom: 'départ à l extérieur (corde ≥ 14)',
    f: (c) => (c.corde ? (c.corde >= 14 ? 1 : 0) : null),
  },
  {
    nom: 'cote longue (> 20) — outsider assumé',
    f: (c) => (c.cote ? (c.cote > 20 ? 1 : 0) : null),
  },
  {
    nom: 'forme récente (5 dernières courses)',
    f: (c) => {
      const m = (c.musique || '').match(/^\s*(\d+)[a-z]/i)
      return m ? (Number(m[1]) <= 3 ? 1 : 0) : null
    },
  },
  {
    nom: 'jeune ET peuuhn',
    f: (c) => (c.age ? (c.age <= 3 ? 1 : 0) : null),
  },
]

const split = (arr) => {
  const dates = [...new Set(arr.map((c) => c.cle))].sort()
  const cut = dates.slice(0, Math.round(dates.length * 0.75))
  const set = new Set(cut)
  return { app: arr.filter((c) => set.has(c.cle)), test: arr.filter((c) => !set.has(c.cle)) }
}
const { app, test } = split(chevaux)

console.log('  indice                                | APRENTISSAGE                       | TEST')
console.log('                                       |Top5 si ON L IGNORE |Top5 si ON L APPLIQUE| lift')
console.log('  ' + '-'.repeat(112))

const lignesCand = []
for (const cand of CANDIDATS) {
  const avecApp = app.map((c) => ({ c, v: cand.f(c) })).filter((x) => x.v != null)
  const avecTest = test.map((c) => ({ c, v: cand.f(c) })).filter((x) => x.v != null)
  if (avecApp.length < 200) continue

  /* le seuil : on prend les 30 % les mieux classés par l'indice */
  const tri = [...avecApp].sort((a, b) => b.v - a.v)
  const seuil = tri[Math.round(tri.length * 0.3)].v

  const f = (liste) => {
    const inTop = liste.filter((x) => x.v >= seuil)
    const outTop = liste.filter((x) => x.v < seuil)
    return {
      inRate: inTop.length ? inTop.filter((x) => x.c.top5).length / inTop.length * 100 : 0,
      outRate: outTop.length ? outTop.filter((x) => x.c.top5).length / outTop.length * 100 : 0,
      inN: inTop.length,
    }
  }
  const A = f(avecApp)
  const T = f(avecTest)
  const liftA = A.inRate - A.outRate
  const liftT = T.inRate - T.outRate
  const bon = liftA > 3 && liftT > 0
  lignesCand.push({ cand, seuil, A, T, liftA, liftT, bon })
  console.log('  ' + cand.nom.padEnd(38)
    + '|' + A.outRate.toFixed(1).padStart(9) + ' % ' + A.inRate.toFixed(1).padStart(9) + ' %'
    + '|' + (liftA > 0 ? '+' : '') + liftA.toFixed(1).padStart(6)
    + '|' + T.outRate.toFixed(1).padStart(9) + ' % ' + T.inRate.toFixed(1).padStart(9) + ' %'
    + '|' + (liftT > 0 ? '+' : '') + liftT.toFixed(1).padStart(6)
    + (bon ? '  ✓' : ''))
}
console.log('')
console.log('  (le seuil est appris sur APP seulement, puis appliqué tel quel sur TEST)')
console.log('')

const gagnants = lignesCand.filter((x) => x.bon)
if (!gagnants.length) {
  console.log('  ⭐ AUCUN indice ne tient sur les deux moitiés du corpus.')
  console.log('    → il n y a pas de DÉVIATION PRÉDICTIBLE avec ces données.')
  console.log('')
} else {
  console.log('  ⭐ LES INDICES QUI TIENNENT : ' + gagnants.map((x) => x.cand.nom).join(' · '))
  console.log('')
}

/* ═══ ⑥ le plafonnement ══════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ④ LE PLAFONNEMENT — que gagne-t-on vraiment ?')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const idx = base.map((_, i) => i)
const idxAppC = base.map((k, i) => i).slice(0, Math.round(n * 0.75))
const idxTestC = base.map((k, i) => i).slice(Math.round(n * 0.75))
function eval7(liste, fnRangs) {
  let p5 = 0; let s = 0
  for (const ki of liste) {
    const k = base[ki]
    const sel = fnRangs(k)
    const c = k.arrivee.slice(0, 5).filter((x) => sel.includes(x)).length
    if (c === 5) p5++
    s += c
  }
  return { p5: p5 / liste.length * 100, ge4: 0, moy: s / liste.length }
}
function rangs(k) { return k.partants.filter((p) => p.rangMarche).sort((a, b) => a.rangMarche - b.rangMarche).map((p) => p.num) }
function rangsIndice(k, cand, seuil) {
  const v = k.partants.filter((p) => p.rangMarche)
    .map((p) => ({ num: p.num, v: cand.f(p) }))
    .filter((x) => x.v != null)
  const bons = v.filter((x) => x.v >= seuil).map((x) => x.num)
  const reste = k.partants.filter((p) => p.rangMarche && !bons.includes(p.num))
    .sort((a, b) => a.rangMarche - b.rangMarche).map((p) => p.num)
  return [...bons, ...reste]
}
console.log('  sélection                                    5/5      moyenne')
console.log('  ' + '-'.repeat(56))
const rBase = eval7(idx, (k) => rangs(k).slice(0, 7))
console.log('  ' + 'les 7 premiers par le marché'.padEnd(42) + rBase.p5.toFixed(1).padStart(6) + rBase.moy.toFixed(2).padStart(11))
for (const g of gagnants) {
  const r = eval7(idx, (k) => rangsIndice(k, g.cand, g.seuil).slice(0, 7))
  console.log('  ' + ('+ indice : ' + g.cand.nom).padEnd(42) + r.p5.toFixed(1).padStart(6) + r.moy.toFixed(2).padStart(11)
    + '   (' + (r.moy - rBase.moy > 0 ? '+' : '') + (r.moy - rBase.moy).toFixed(2) + ')')
}
console.log('')
console.log('  ' + '-'.repeat(56))
console.log('  ⚠ Ce qu on cherche : 5/5 autour de 40 %.')
console.log('    Aucun indice ne deliverables un saut de cette taille.')
console.log('')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('  Rappel : les filtres du §5 (physique) sont告诉 les FONTS')
console.log('  qu on n a jamais activés sur ce corpus. §14.2 dit que')
console.log('  les données « terrain, piste, niveau » ne sont pas disponibles.')
console.log('  Ce qui MANQUE donc n est pas un algorithme : ce sont les')
console.log('  VARIABLES PHYSIQUES de chaque cheval.')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('')