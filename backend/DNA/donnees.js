/* =============================================================================
 * backend/DNA/donnees.js — LES DONNÉES DE LA PAGE « DNA COURSE » (23/10/2026)
 *
 * ⛔ CE FICHIER TOURNE DANS LE NAVIGATEUR. Aucun import `node:*`.
 *
 * POURQUOI IL EXISTE
 *   La page DNA COURSE (frontend/DNA/DnaCourse.jsx) est l'écran du moteur
 *   RACE_DNA_ENGINE, repris tel quel. Dans l'application autonome il lisait
 *   deux routes d'un serveur Flask (`/api/programme`, `/api/race`). Ici, il
 *   n'y a plus de serveur à côté : la page est une page du site, comme
 *   Analyse course ou Quinté — elle prend donc SES données là où le site les
 *   prend déjà.
 *
 * LES TROIS LECTURES
 *
 *   fetchMeetings(date)               → le programme du jour
 *       `backend/ANALYSE/programme.js` (le programme PMU, le même que la page
 *       « Analyse course ») + `backend/ANALYSE/paris.js` (les pastilles des
 *       paris). On ne réinvente ni la liste, ni les numéros de réunion : R1,
 *       R2… sont ceux du PMU.
 *       ⚠ 23/10/2026 — ET LA RÉUNION DU MAROC, EN DERNIER : le programme PMU
 *       ne contient AUCUNE course marocaine, si bien que Casablanca avait
 *       disparu de la page. `backend/DNA/morocco.js` lit la SOREC
 *       (`e-sorec.ma`) et rend la réunion dans la même forme, avec
 *       `num = 100 + index` et `country: 'MA'` — l'écran affiche « MA ».
 *
 *   fetchRace(date, rnum, cnum)       → les partants + la cote
 *       PMU : `backend/ANALYSE/parisTurf.js` (`partantsDeCourse`), la même
 *       source que la fiche d'un cheval dans « Analyse course ».
 *       Maroc (rnum ≥ 100) : `courseSorec` de `morocco.js` — la SOREC donne
 *       cote, ouverture, corde, musique et arrivée.
 *
 *   extractDnaCourse(participants, …) → LE MOTEUR
 *       `POST /api/dna` : la route du site (middleware Vite en local, fonction
 *       Vercel en ligne) qui relaie au moteur RACE_DNA_ENGINE.
 *
 * ⚠ CE QUE LE MOTEUR LIT VRAIMENT DANS UN PARTANT
 *   `num`, `horse` (le nom, pour retrouver le cheval dans l'archive), `cote`.
 *   Le reste (âge, poids, corde) est passé quand on l'a — jamais inventé.
 * ========================================================================== */

import { programmePmu } from '../ANALYSE/programme.js'
import { partantsDeCourse } from '../ANALYSE/parisTurf.js'
import { parisDuJour, parisDe, partantsCasacourses } from '../ANALYSE/paris.js'
import { programmeSorec, courseSorec, MAROC_OFFSET } from './morocco.js'

/* La course telle qu'on l'a lue, pour que `fetchRace` retrouve son identifiant
 * chez la source de chevaux. Clé : « 2026-10-23|R1|C3 ». */
const COURSES = new Map()

/* ------------------------------------------------------------- discipline -- */

/* Le moteur range l'archive en quatre familles (store.disc_set) : ATTELE,
 * MONTE, PLAT, HAIE, STEEPLE, CROSS. Le programme, lui, écrit « Attelé »,
 * « Plat », « Haies »… On traduit, sans jamais deviner. */
function disciplineCode(brut) {
  const d = String(brut || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
  if (/ATTEL|TROT/.test(d)) return 'ATTELE'
  if (/MONTE/.test(d)) return 'MONTE'
  if (/PLAT|GALOP/.test(d)) return 'PLAT'
  if (/STEEP/.test(d)) return 'STEEPLE'
  if (/HAIE/.test(d)) return 'HAIE'
  if (/CROSS/.test(d)) return 'CROSS'
  return d
}

/* ---------------------------------------------------------------- l'heure -- */

/** Le décalage (ms) d'un fuseau à un instant donné — DST compris. */
function decalage(tz, instantMs) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const p = Object.fromEntries(dtf.formatToParts(new Date(instantMs)).map((x) => [x.type, x.value]))
  const commeUtc = Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second)
  return commeUtc - instantMs
}

/**
 * « 2026-10-23 » + « 18:23 » (heure locale de la réunion) → l'instant en ms.
 * Le Maroc vit à Africa/Casablanca, la France à Europe/Paris : on ne mélange
 * pas les deux (c'est l'erreur qui décalait les réunions marocaines d'une heure).
 */
function instant(date, heure, pays) {
  const m = /(\d{1,2})\s*[:hH]\s*(\d{2})/.exec(String(heure || ''))
  if (!m || !date) return null
  const [a, mo, j] = String(date).split('-').map(Number)
  if (!a || !mo || !j) return null
  const tz = String(pays || '').toUpperCase() === 'MA' ? 'Africa/Casablanca' : 'Europe/Paris'
  const naif = Date.UTC(a, mo - 1, j, +m[1], +m[2])
  /* deux passes : le décalage peut changer à la seconde près (passage DST) */
  let ms = naif - decalage(tz, naif)
  ms = naif - decalage(tz, ms)
  return Number.isFinite(ms) ? ms : null
}

/* ------------------------------------------------------------- programme -- */

/**
 * Le programme du jour, dans la forme que lit l'écran DNA.
 * → { meetings: [{ num, hippodrome, country, sorec, courses: [course] }] }
 *
 * `num` est le numéro de RÉUNION DU PMU (1, 2, 3…). Aucun regroupement
 * inventé : une réunion du programme = une boîte à l'écran.
 */
export async function fetchMeetings(date) {
  if (!date) return { meetings: [] }

  const [prog, paris, maroc] = await Promise.all([
    programmePmu(date),
    parisDuJour(date).catch(() => ({})),
    programmeSorec(date).catch(() => []),
  ])

  const meetings = (prog?.reunions || []).map((m) => {
    const pays = String(m.pays || '').toUpperCase()
    const num = Number(m.reunion ?? m.pmu ?? 0) || 0
    const courses = (m.courses || []).map((c) => {
      const heure = c.heureTf || c.tf?.heure || c.heure || ''
      const pastilles = parisDe(paris, { reunion: num, num: c.num })
      const course = {
        id: c.id || null,
        num: c.num,
        nom: c.nom || '',
        libelle: c.libelle || c.nom || '',
        discipline: disciplineCode(c.discipline || c.specialite),
        specialite: c.specialite || '',
        distance: c.distance || null,
        surface: c.surface || '',
        terrain: c.terrain || '',
        runners: c.nbPartants || null,
        heure,
        time: instant(date, heure, pays),
        types_pari: pastilles,
        quinte: pastilles.includes('quinte'),
      }
      COURSES.set(`${date}|${num}|${c.num}`, { ...course, reunion: num, pays, hippodrome: m.hippodrome || '' })
      return course
    })
    return {
      num,
      hippodrome: m.hippodrome || m.nom || '',
      country: pays,
      sorec: pays === 'MA' ? 'SOREC' : undefined,
      courses,
    }
  })

  /* LE MAROC — en dernier, comme dans la copie autonome. `num` vaut déjà
   * 100 + index (aucune collision avec R1..Rn du PMU) et `country` vaut 'MA'.
   * On enregistre ses courses pour que `fetchRace` retrouve le `sorecId`. */
  for (const m of maroc) {
    for (const c of m.courses || []) {
      COURSES.set(`${date}|${m.num}|${c.num}`, {
        ...c, reunion: m.num, pays: 'MA', hippodrome: m.hippodrome || '',
      })
    }
  }

  return {
    meetings: [...meetings.filter((m) => m.num > 0 && m.courses.length), ...maroc],
  }
}

/* ---------------------------------------------------------------- partants -- */

/**
 * Une course et ses partants.
 * → { course, participants: [{ num, horse, cote, age, poids, corde }] }
 *
 * ⚠ Les partants ne sont publiés par la source de chevaux que pour les courses
 *   qu'elle connaît (elle donne alors son `id`). Une course du programme PMU
 *   qu'elle ignore n'a pas de partants : on le dit, on n'invente rien.
 */
export async function fetchRace(date, rnum, cnum) {
  const cle = `${date}|${Number(rnum)}|${Number(cnum)}`
  const course = COURSES.get(cle)
  if (!course) throw new Error("Course inconnue — rechargez le programme de cette date.")

  /* LE MAROC (rnum ≥ 100) : la SOREC donne tout elle-même — cote, ouverture,
   * corde, musique, arrivée. Aucun croisement avec la source française. */
  if (Number(rnum) >= MAROC_OFFSET) {
    const data = await courseSorec(date, Number(rnum), Number(cnum))
    if (!data || !(data.participants || []).length) {
      throw new Error(
        "La SOREC ne publie pas encore les partants de cette course marocaine. " +
        'Le programme, lui, est complet.'
      )
    }
    return { course: { ...course, ...data.course }, participants: data.participants }
  }

  /* ⭐ 25/10/2026 — LA SOURCE DE CHEVAUX NE PUBLIE PAS TOUTES LES COURSES.
   *
   *  Elle donne son `id` pour celles qu'elle connaît ; les autres n'avaient
   *  aucun partant et la page s'arrêtait sur un message. Or ce ne sont pas
   *  des « réunions étrangères » : le 25/10, Agen la Garenne R9 (7 courses),
   *  Saint Galmier R11 (9), Chatelaillon R14 (7) et Vire R7 le 26/10 (8) —
   *  des réunions FRANÇAISES entières — tombaient dans ce trou.
   *
   *  casacourses, déjà lu pour les pastilles, les a avec leur cote. On le
   *  tente AVANT de renoncer, et on le DIT (`sourcePartants`) pour que
   *  l'écran ne fasse pas passer cette source pour la source habituelle. */
  if (!course.id) {
    const secours = await partantsCasacourses(date, Number(rnum), Number(cnum))
    if (secours.length) {
      return {
        course: { ...course, runners: secours.length, sourcePartants: 'casacourses' },
        participants: secours,
      }
    }
    throw new Error(
      'Les partants de cette course ne sont publiés par aucune des deux sources ' +
      '(source de chevaux et casacourses). Le programme, lui, est complet.'
    )
  }

  const rows = await partantsDeCourse(course.id, course)
  const participants = (rows || [])
    .filter((p) => p && p.num != null)
    .map((p) => ({
      num: p.num,
      horse: p.nom || '',
      cote: p.cote != null ? p.cote : null,
      age: p.age != null ? p.age : null,
      poids: p.poids != null ? p.poids : null,
      corde: p.corde != null ? p.corde : null,
      jockey: p.jockey || '',
      entraineur: p.entraineur || '',
      nonPartant: false,
    }))
    .sort((a, b) => a.num - b.num)

  return { course, participants }
}

/* ------------------------------------------------------------------ moteur -- */

/**
 * LE MOTEUR DNA COURSE — `POST /api/dna`.
 *
 * Le corps est exactement celui que le moteur attend (il l'était déjà dans
 * l'application autonome) : `{ participants, hippodrome, disc, distance,
 * surface, date, runners, config }`. Le délai est large : le premier appel
 * après un démarrage à froid ouvre l'archive (86 886 courses) et peut prendre
 * une minute.
 */
export async function extractDnaCourse(participants, options = {}, timeout = 150000) {
  const ctrl = new AbortController()
  const minuteur = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch('/api/dna', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participants, ...options }),
      signal: ctrl.signal,
    })
    const corps = await res.json().catch(() => ({}))
    if (!res.ok) {
      const e = new Error(
        corps.error
          ? `${corps.error}${corps.detail ? ` — ${corps.detail}` : ''}`
          : `Moteur DNA : erreur ${res.status}`
      )
      e.status = res.status
      throw e
    }
    return corps
  } finally {
    clearTimeout(minuteur)
  }
}
