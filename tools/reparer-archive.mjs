/* ═══════════════════════════════════════════════════════════════════════════
 * tools/reparer-archive.mjs — RÉPARER les dates dont la course enregistrée
 * n'était pas le Quinté.
 *
 * ⭐ POURQUOI (11/11/2026) : casacourses ne garde les paris que LE JOUR MÊME.
 * Le soir — et pour toute course passée — `available_bet_types` est VIDE, et
 * l'ancien repli (deviner la course par la COUVERTURE de la Synthèse) a
 * choisi la MAUVAISE course sur 3 dates des 37 archivées :
 *
 *     10/10  Caen R1 C4 2450 m (18 p)  au lieu de  R1 C3 2200 m (14 p)
 *     11/05  Vincennes R1 C1 2100 m   au lieu de  R1 C3 2175 m (16 p)
 *     11/10  Fontainebleau R1 C4 1200 m au lieu de Vincennes R2 C3 2850 m
 *
 * La Synthèse cite 16 numéros et TOUTE course de 16 partants porte les
 * numéros 1..16 : la couverture vaut 1 pour la mauvaise course comme pour la
 * bonne. Le départage par la dotation ne restaure rien.
 *
 * Le PMU, lui, garde le programme : la course qui porte le pari QUINTE_PLUS
 * EST le Quinté. C'est l'autorité — on ne devine plus.
 *
 * Ce que fait cet outil, pour chaque date FAUSSE :
 *     ① la course du Quinté d'après le PMU (R/C) ;
 *     ② les partants et l'arrivée (casacourses ; sinon le PMU) ;
 *     ③ le ticket REFAIT par le moteur (l'ancien était celui d'une autre
 *        course — il ne compte plus) ;
 *     ④ la ligne d'archive réécrite, avec la trace de la correction.
 *
 * ⚠ une course DÉJÀ COURUE : le ticket archivé est un CONSTAT (§7). On ne
 *   le modifie que si la COURSE était fausse — donc si le constat ne portait
 *   sur rien.
 *
 * Usage :  node tools\reparer-archive.mjs [YYYY-MM-DD ...]
 *          node tools\reparer-archive.mjs --check     (audit seul, n'écrit rien)
 * ══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs'
import path from 'node:path'

import { trouverCourse, construireTicket } from './daily.mjs'
import { quintePMU } from '../src/lib/quinte.js'

const F_SYN = path.join('data', 'synthese.json')
const PUB = path.join('public', 'data')
const PMU = 'https://online.turfinfo.api.pmu.fr'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'

const lire = (f, def) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return def } }
const ecrire = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 2)) }
const log = (...a) => console.log(...a)

const jjmm = (d) => `${d.slice(8, 10)}${d.slice(5, 7)}${d.slice(0, 4)}`

/** Le programme PMU du jour — la course du Quinté ET son arrivée. */
async function programmePMU(date) {
  try {
    const r = await fetch(`${PMU}/rest/client/61/programme/${jjmm(date)}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (!r.ok) return null
    const j = await r.json()
    const reus = (j && j.programme && j.programme.reunions) || []
    for (const re of reus) {
      const pays = (re.pays && (re.pays.code || re.pays.libelle)) || ''
      if (!/^FR/i.test(String(pays))) continue
      for (const c of re.courses || []) {
        const paris = (c.paris || []).map((p) => p.codePari || p.typePari || '')
        if (!paris.includes('QUINTE_PLUS') && !paris.includes('QUINTE')) continue
        /* ⚠ `ordreArrivee` a deux formes : `[[9],[6],…]` (PMU brut) ou
         *   `{value:[9],Count:1}` (certaines réponses). On lit les deux. */
        const ordre = (c.ordreArrivee || [])
          .map((o) => (Array.isArray(o) ? o[0] : (Array.isArray(o.value) ? o.value[0] : o.value)))
          .map(Number).filter(Number.isFinite)
        return {
          r: Number(re.numOfficiel), c: Number(c.numOrdre),
          hippo: (re.hippodrome && (re.hippodrome.libelleCourt || re.hippodrome.libelle)) || '',
          nom: c.libelle || '', distance: Number(c.distance) || null,
          discipline: c.discipline || '', partants: Number(c.nombreDeclaresPartants) || 0,
          arrivee: ordre,
        }
      }
    }
  } catch (e) { /* PMU muet */ }
  return null
}

/** Les partants du PMU — quand casacourses n'a plus rien pour cette date. */
async function participantsPMU(date, r, c) {
  try {
    const resp = await fetch(`${PMU}/rest/client/61/programme/${jjmm(date)}/R${r}/C${c}/participants`, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (!resp.ok) return []
    const j = await resp.json()
    return (j.participants || []).map((p) => ({
      num: Number(p.numPmu),
      nom: p.nom || '',
      sexe: /FEM/i.test(String(p.sexe)) ? 'F' : 'M',
      age: p.age ?? null,
      jockey: p.driver || '',
      entraineur: p.entraineur || '',
      poids: null,
      cote: null,
      musique: p.musique || '',
      forme: 0,
      depart: Number(p.numPmu),
    })).filter((p) => Number.isFinite(p.num) && p.num > 0)
  } catch (e) { return [] }
}

/* ------------------------------------------------------------------ run --- */
const checkOnly = process.argv.includes('--check')
const forces = process.argv.filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a))

const db = lire(F_SYN, {})
const dates = forces.length ? forces : Object.keys(db).sort()
let corriges = 0
let suspects = 0

for (const date of dates) {
  const avant = db[date]
  if (!avant || !Array.isArray(avant.synthese) || !avant.synthese.length) continue

  const pmu = await programmePMU(date)
  if (!pmu) { log(`${date}  PMU muet — on ne touche à rien`); continue }

  /* la course enregistrée est-elle bien celle du PMU ? */
  const cleAttendue = `${date}_R${pmu.r}_C${pmu.c}`
  const cleEnregistree = String(avant.courseId || '')
  const memeHippodrome = String(avant.hippodrome || '').toUpperCase().replace(/[^A-Z]/g, '')
    .includes(String(pmu.hippo).toUpperCase().replace(/[^A-Z]/g, ''))
  const memeCourse = cleEnregistree === cleAttendue
    || (memeHippodrome && Number(avant.distance) === Number(pmu.distance)
      && String(avant.discipline || '').toUpperCase().startsWith(String(pmu.discipline || '').toUpperCase().slice(0, 3)))

  if (memeCourse) {
    /* même course : on vérifie quand même que l'arrivée est la bonne */
    const arAttendue = (pmu.arrivee || []).slice(0, 5).join('-')
    const arEnregistree = (avant.arrivee || []).slice(0, 5).join('-')
    if (arAttendue && arEnregistree && arAttendue !== arEnregistree) {
      suspects++
      log(`⚠ ${date}  même course, arrivée différente : archive ${arEnregistree} · PMU ${arAttendue}`)
      if (!checkOnly) {
        db[date] = { ...avant, arrivee: pmu.arrivee.slice(0, 5), corrigeLe: new Date().toISOString() }
        log(`   → arrivée corrigée : ${arAttendue}`)
      }
    } else {
      log(`✓ ${date}  R${pmu.r} C${pmu.c} ${pmu.hippo} ${pmu.nom} ${pmu.distance}m ${pmu.partants}p — conforme`)
    }
    continue
  }

  /* ⚠ LA COURSE ENREGISTRÉE N'ÉTAIT PAS LE QUINTÉ */
  suspects++
  log(`✗ ${date}  course FAUSSE : archive ${cleEnregistree} ${avant.hippodrome} ${avant.distance}m ${avant.discipline} ${avant.nbPartants}p`
    + `\n   PMU : R${pmu.r} C${pmu.c} ${pmu.hippo} ${pmu.nom} ${pmu.distance}m ${pmu.discipline} ${pmu.partants}p`)
  if (checkOnly) continue

  /* ① la course, avec ses partants */
  let course = null
  try { course = await trouverCourse(date, avant.synthese, null) } catch (e) { log(`   course KO : ${e.message}`) }
  /* ⚠ `trouverCourse` peut tomber sur le repli Equidia, qui — pour une date
   *   passée — pointe encore la redirection du jour courant : ce n'est PAS la
   *   bonne course. On ne garde que celle qui porte la clé du PMU. */
  let participants = []
  let arrivee = []
  if (course && String(course.courseId || '') === cleAttendue) {
    participants = course.participants || []
    arrivee = course.arrivee || []
  } else {
    if (course) log(`   ignoré : ${course.courseId} ${course.hippodrome} — ce n'est pas R${pmu.r} C${pmu.c}`)
    participants = await participantsPMU(date, pmu.r, pmu.c)
    log(`   partants PMU : ${participants.length}`)
  }
  if (!participants.length) { log(`   ⚠ pas de partants — on ne touche à rien`); continue }

  /* ② l'arrivée */
  if ((!arrivee || arrivee.length < 5) && (pmu.arrivee || []).length >= 5) arrivee = pmu.arrivee.slice(0, 5)
  if (!arrivee || arrivee.length < 5) { log(`   ⚠ pas d'arrivée — on ne touche à rien`); continue }

  const courseRep = {
    courseId: cleAttendue,
    participants,
    discipline: (course && String(course.courseId || '') === cleAttendue && course.discipline) || pmu.discipline || 'PLAT',
    distance: (course && String(course.courseId || '') === cleAttendue && course.distance) || pmu.distance || 0,
    nbPartants: participants.length,
    hippodrome: (course && String(course.courseId || '') === cleAttendue && course.hippodrome) || pmu.hippo || '',
    heure: (course && course.heure) || null,
    heureZone: (course && course.heureZone) || 'paris',
    arrivee,
  }

  /* ③ le ticket, refait par le moteur */
  let t = null
  try {
    /* ⚠ le marché est demandé comme en production : G4 et G5 sont remplis
     *   par la cote (§11.23). Si la cote de cette course passé est introuvable,
     *   `chargerCotes` rend un objet vide et le moteur retombe sur le carnet —
     *   c'est le repli normal, pas une invention. */
    t = await construireTicket(avant.synthese, courseRep, null, cleAttendue)
  } catch (e) { log(`   ticket KO : ${e.message}`) }
  if (!t || !t.ticket || !t.ticket.length) { log(`   ⚠ pas de ticket — on ne touche à rien`); continue }

  const rec = {
    ...avant,
    runners: participants.map((p) => p.num).sort((a, b) => a - b),
    nbPartants: participants.length,
    discipline: courseRep.discipline,
    distance: courseRep.distance,
    hippodrome: courseRep.hippodrome,
    courseId: cleAttendue,
    arrivee,
    ticket: t.ticket,
    ticketMode: t.mode,
    ticketSource: 'auto',
    ticketPoseLe: avant.ticketPoseLe || new Date().toISOString(),
    groupes: t.groupes,
    surprises: t.surprises || [],
    scores: t.scores,
    corrigeLe: new Date().toISOString(),
    courseCorrigee: true,
  }
  delete rec.ticketMatin
  db[date] = rec
  corriges++
  const pris = new Set(t.ticket)
  log(`   → ticket refait : ${t.ticket.join(' ')}  (${t.mode})`)
  log(`   → arrivée ${arrivee.join('-')} → ${arrivee.filter((n) => pris.has(n)).length}/5`)
}

log('')
if (checkOnly) {
  log(`AUDIT : ${suspects} date(s) en défaut sur ${dates.length} — rien n'a été écrit (--check)`)
} else {
  const tri = {}
  for (const k of Object.keys(db).sort().reverse()) tri[k] = db[k]
  ecrire(F_SYN, tri)
  ecrire(path.join(PUB, 'synthese.json'), tri)
  log(`${corriges} date(s) corrigée(s) — ${suspects} en défaut · archive écrite (data + public)`)
}
