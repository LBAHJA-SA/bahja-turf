/* ══════════════════════════════════════════════════════════════════════════
 *  backend/LABORATOIRE/laboCoply.mjs
 *
 *  LE MOTEUR « COPLY » — 1er + 2e + 3e (le podium).
 *
 *  ⚠ LABORATOIRE UNIQUEMENT (§18.4). Lecture seule.
 *
 *  ─────────────────────────────────────────────────────────────────────────
 *  POURQUOI archives/ ET PAS public/data/reu/
 *
 *  `public/data/reu/` a les « tops » de reu.php (les 22 touches), mais
 *  seulement du 03 au 07 octobre : 266 fichiers, tous de la semaine
 *  passée. Impossible de mesurer quoi que ce soit dessus.
 *
 *  `archives/` a 100 courses de septembre 2024 à octobre 2026, avec
 *  l'arrivée complète, les cotes PMU, la musique, les palmarès, le
 *  jockey, l'entraîneur, les stats de déferré — c'est-à-dire LA MÊME
 *  information que les tops de reu.php, sous d'autres noms :
 *
 *      reu.php                archives/ (PMU)
 *      ─────────────────      ──────────────────────────────
 *      topCotesDirect    →    cote_pmu        (le classement se fait dessus)
 *      topPalmares       →    nombreVictoires / nombrePlaces / nombrePlacesSecond…
 *      topForme          →    musique
 *      topChronos        →    deferre_stats
 *      topDrivers        →    jockey
 *      topEntraineurs    →    trainer
 *      topClasse         →    valeur
 *
 *  Donc on RECONSTITUE les touches depuis archives/ : on classe les
 *  chevaux par chaque critère, on prend les 3 premiers, et on mesure
 *  si le podium sort. C'est la même mesure, sur 100 courses au lieu de 4 jours.
 * ══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const DOSSIER = path.join(RACINE, 'archives')

/* ─────────────────────────────────────────────────────── le corpus ─────── */

let _cache = null

export function chargerArchives() {
  if (_cache) return _cache
  let noms = []
  try { noms = fs.readdirSync(DOSSIER).filter((f) => /^race_R\d+_C\d+_\d{4}-\d{2}-\d{2}\.json$/.test(f)) } catch (e) { _cache = []; return _cache }

  const out = []
  for (const nom of noms) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(DOSSIER, nom), 'utf8'))
      const partants = (j.participants || []).filter((p) => p.num && !p.nonPartant)
      const arrivee = (j.course?.arrivee || []).map((x) => Number(Array.isArray(x) ? x[0] : x)).filter(Number.isFinite)
      if (partants.length < 8 || arrivee.length < 5) continue
      const m = nom.match(/^race_R(\d+)_C(\d+)_(\d{4}-\d{2}-\d{2})/)
      out.push({
        cle: nom.replace(/^race_/, '').replace(/\.json$/, ''),
        fichier: nom,
        date: m ? m[3] : '',
        reunion: j.reunion || {},
        course: j.course || {},
        partants,
        arrivee,
        hippodrome: j.reunion?.hippodrome || '',
        discipline: j.course?.discipline || '',
        distance: j.course?.distance ?? null,
      })
    } catch (e) { /* un fichier corrompu n'arrête pas la mesure */ }
  }
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  _cache = out
  return out
}

/* ─────────────────────────────────────────────── les TOUCHES (reconstituées) */

/**
 * Une « touche » = un critère de classement. On renvoie les numéros de
 * chevaux triés du meilleur au moins bon, puis on gardera les 3 premiers.
 * Chaque critère a une fonction de tri explicite — jamais de « trie par
 * intuition », pour que le chiffre soit discutable.
 */
export const TOUCHES = [
  // la cote : le plus petit cote = le favori
  ['Cote',        (p) => Number(p.cote_pmu ?? Infinity),        (a, b) => a - b],
  // les palmarès : victoires d'abord, puis les places
  ['Palmarès',    (p) => -(Number(p.nombreVictoires ?? 0) * 10 + Number(p.nombrePlacesSecond ?? 0) * 3 + Number(p.nombrePlacesTroisieme ?? 0) * 2 + Number(p.nombrePlaces ?? 0)), (a, b) => a - b],
  // la forme : la musique est une chaîne, on compte les places良好
  ['Forme',       (p) => formeScore(p.musique),                  (a, b) => a - b],
  // la classe (valeur) : le plus fort
  ['Classe',      (p) => -(Number(p.valeur ?? 0)),              (a, b) => a - b],
  // les gains
  ['Gains',       (p) => -(Number(p.gain ?? 0)),                (a, b) => a - b],
  // le poids : le plus léger court mieux en général
  ['Poids',       (p) => Number(p.poids ?? Infinity),            (a, b) => a - b],
  // le jockey et l'entraîneur : on ne peut pas les classer, mais on peut
  // mesurer leur podium dans l'archive
  ['Âge',         (p) => Number(p.age ?? 99),                    (a, b) => a - b],
]

/* La forme : la musique `2p4p1p(25)2p1p` → un score. Les 5 derniers runs
 * comptent, avec un poids décroissant (§4 : poids 1/(1+i·0.55)). */
function formeScore(mus) {
  const s = String(mus || '')
  if (!s) return 0
  const pts = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 }
  let sc = 0
  const runs = s.match(/\d+[a-z]/g) || []
  runs.slice(0, 6).forEach((r, i) => {
    const pl = Number(String(r).replace(/\D/g, ''))
    sc += (pts[pl] ?? 1) / (1 + i * 0.55)
  })
  return sc
}

/**
 * Le podium d'un critère pour une course : les 3 premiers chevaux du
 * classement. `null` si la course a trop peu de partants.
 */
export function podiumDe(course, nomTouche) {
  const t = TOUCHES.find((x) => x[0] === nomTouche)
  if (!t) return null
  const [, valeur, cmp] = t
  const pts = course.partants
    .map((p) => ({ num: p.num, v: valeur(p) }))
    .filter((x) => Number.isFinite(x.v))
    .sort((x, y) => cmp(x.v, y.v))
  if (pts.length < 3) return null
  return {
    premier: pts[0].num,
    second: pts[1].num,
    troisieme: pts[2].num,
    classement: pts.slice(0, 10).map((x) => ({ num: x.num, v: x.v })),
  }
}

/**
 * La mesure : pour chaque critère, combien de fois
 *   son 1er sort 1er, son 2e sort 2e, son 3e sort 3e,
 *   et combien de fois le PODIUM COMPLET sort (les 3, dans l'ordre).
 *
 * Le « podium complet » est LA mesure qui compte pour le Coply : c'est
 * l'équivalent d'un Tiercé gagné par la touche.
 */
export function mesurer(nomTouche = null) {
  const courses = chargerArchives()
  const touches = nomTouche ? [nomTouche] : TOUCHES.map((t) => t[0])
  const out = []

  for (const nom of touches) {
    let n = 0, un = 0, deux = 0, trois = 0, complet = 0, les3 = 0
    for (const c of courses) {
      const p = podiumDe(c, nom)
      if (!p) continue
      n++
      const a = c.arrivee
      if (a[0] === p.premier) un++
      if (a[1] === p.second) deux++
      if (a[2] === p.troisieme) trois++
      if (a[0] === p.premier && a[1] === p.second && a[2] === p.troisieme) complet++
      const set = new Set([p.premier, p.second, p.troisieme])
      if (a.slice(0, 3).every((x) => set.has(x))) les3++
    }
    if (!n) continue
    out.push({
      touche: nom,
      n,
      pct1er: +((un / n) * 100).toFixed(1),
      pct2e: +((deux / n) * 100).toFixed(1),
      pct3e: +((trois / n) * 100).toFixed(1),
      pctPodiumComplet: +((complet / n) * 100).toFixed(1),
      pctLes3DansLeTop3: +((les3 / n) * 100).toFixed(1),
      nbPodiumComplet: complet,
      nbLes3: les3,
    })
  }

  out.sort((a, b) => b.pctPodiumComplet - a.pctPodiumComplet)
  return { nb: courses.length, touches: out }
}

/** Le détail course par course, pour un critère — lisible à l'œil. */
export function detail(course, nomTouche) {
  const p = podiumDe(course, nomTouche)
  if (!p) return null
  const a = course.arrivee.slice(0, 5)
  const est = { premier: a[0] === p.premier, second: a[1] === p.second, troisieme: a[2] === p.troisieme }
  const set = new Set([p.premier, p.second, p.troisieme])
  return {
    cle: course.cle,
    date: course.date,
    hippodrome: course.hippodrome,
    arrivee: a,
    podium: p,
    juste: est,
    complet: est.premier && est.second && est.troisieme,
    les3DansLeTop3: a.slice(0, 3).every((x) => set.has(x)),
  }
}

/** Toutes les courses, pour l'affichage page par page. */
export function page(depart = 0, taille = 20, nomTouche = 'Cote') {
  const courses = chargerArchives()
  const p_ = courses.slice(depart, depart + taille)
  return {
    total: courses.length,
    depart,
    taille,
    lignes: p_.map((c) => detail(c, nomTouche)).filter(Boolean),
  }
}