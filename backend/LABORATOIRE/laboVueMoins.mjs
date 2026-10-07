/* ══════════════════════════════════════════════════════════════════════════
 *  backend/LABORATOIRE/laboVueMoins.mjs
 *
 *  « VÉRIFICATION À L'ŒIL » — course par course, sans formule.
 *
 *  ⚠ LABORATOIRE UNIQUEMENT (§18.4). Cette page ne change rien à la
 *  production : elle LIT le corpus, elle n'écrit jamais. Aucun fichier,
 *  aucun ticket, aucun deploy déclenché.
 *
 *  Ce que ça montre, pour une course :
 *     l'arrivée réelle (Top 5)
 *     les deux listes à comparer, en rangs de cote entre parenthèses
 *     combien d'arrivants chaque liste contient, et lesquels
 *
 *  Le but est qu'on puisse COMPTER À LA MAIN et vérifier l'ordi.
 * ══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

/* Les deux listes de l'utilisateur, en RANGS DE COTE (§16) :
 *   A = P1 P2 P3 P5 P6 P9  P12 P13
 *   B = P1 P2 P4 P5 P6 P8  P12 P13   (la 4ᵉ au lieu de la 3ᵉ)
 * ⚠ ce sont des rangs de COTE, pas des rangs de presse : le corpus
 *   346 n'a pas la presse. On le dit dans l'interface. */
export const LISTES = {
  A: [1, 2, 3, 5, 6, 9, 12, 13],
  B: [1, 2, 4, 5, 6, 8, 12, 13],
}

/* ─────────────────────────────────────────────────────── le corpus ─────── */

const FICHIER = path.join(RACINE, 'data', 'corpus', 'chevaux.json')

let _cache = null

/**
 * Le corpus, filtré sur ce qui est affichable : au moins 10 partants et une
 * arrivée connue. Sans arrivée il n'y a rien à vérifier.
 */
export function chargerCorpus() {
  if (_cache) return _cache
  let brut
  try {
    brut = JSON.parse(fs.readFileSync(FICHIER, 'utf8'))
  } catch (e) {
    _cache = []
    return _cache
  }
  const courses = (brut.courses || [])
    .filter((k) => k.partants && k.partants.length >= 10 && (k.arrivee || []).length >= 5)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  _cache = courses
  return courses
}

/** Un index rang-de-cote → participant, pour une course. */
function parRang(course) {
  const m = new Map()
  for (const p of course.partants || []) {
    if (p.rangMarche) m.set(p.rangMarche, p)
  }
  return m
}

/* ───────────────────────────────────────────────── une course, en détail ── */

/**
 * Construit la ligne « à l'œil » d'une course pour chaque liste.
 *
 * @returns {{
 *   cle: string, date: string, hippodrome: string, discipline: string,
 *   distance: number|null, nbPartants: number,
 *   top5: number[],
 *   listes: Record<string, { rangs:number[], picks:{num:number,rang:number}[],
 *                          pris:number[], score:number, etoile:boolean }>
 * }}
 */
export function detailCourse(course, nomListes = ['A', 'B']) {
  const top5 = (course.arrivee || []).slice(0, 5)
  const m = parRang(course)
  const listes = {}

  for (const nom of nomListes) {
    const rangs = LISTES[nom] || []
    const picks = rangs
      .map((r) => m.get(r))
      .filter(Boolean)
      .map((p) => ({ num: p.num, rang: p.rangMarche }))
    // l'arrivée est en ORDRE : on ne compte que les 5 premiers (§11.1)
    const pris = top5.filter((n) => picks.some((p) => p.num === n))
    listes[nom] = {
      rangs,
      picks,
      pris,
      score: pris.length,
      etoile: pris.length === 5,
    }
  }

  return {
    cle: course.cle,
    date: course.date,
    hippodrome: course.hippodrome || '',
    discipline: course.discipline || '',
    distance: course.distance ?? null,
    nbPartants: course.nbPartants ?? (course.partants || []).length,
    top5,
    listes,
  }
}

/** Les N premières courses du corpus (pour l'affichage page par page). */
export function page(depart = 0, taille = 20, nomListes = ['A', 'B']) {
  const courses = chargerCorpus()
  const page_ = courses.slice(depart, depart + taille)
  return {
    total: courses.length,
    depart,
    taille,
    lignes: page_.map((c) => detailCourse(c, nomListes)),
  }
}

/* ─────────────────────────────────────────────── la synthèse (en bas) ─── */

/**
 * Le bilan sur TOUT le corpus : combien de 5/5, la répartition 0→5, la
 * couverture moyenne. C'est le nombre qu'on veut voir juste sous le tableau
 * — mais toujours APRÈS le détail, jamais à sa place.
 */
export function bilan(nomListes = ['A', 'B']) {
  const courses = chargerCorpus()
  const out = {}
  for (const nom of nomListes) {
    const detail = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let somme = 0
    let cinq = 0
    for (const c of courses) {
      const d = detailCourse(c, [nom]).listes[nom]
      detail[d.score]++
      somme += d.score
      if (d.score === 5) cinq++
    }
    out[nom] = {
      nb: courses.length,
      cinqSurCinq: cinq,
      pctCinqSurCinq: courses.length ? +((cinq / courses.length) * 100).toFixed(1) : 0,
      couvertureMoyenne: courses.length ? +(somme / courses.length).toFixed(2) : 0,
      repartition: detail,
    }
  }
  return { nb: courses.length, listes: out }
}