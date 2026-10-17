/* =============================================================================
 * backend/ANALYSE/programme.js — LE PROGRAMME PMU DU JOUR (la liste des sites).
 *
 * ⛔ CE FICHIER TOURNE DANS LE NAVIGATEUR. Aucun import node:*.
 *
 * ⚠ POURQUOI CE FICHIER EXISTE (18/10/2026)
 *
 *   La page lisait le programme de SA source de chevaux : 19 à 20 réunions par
 *   jour, dont 7 à 11 ÉTRANGÈRES AU PROGRAMME PMU — Solvalla, Hagmyren,
 *   Momarken, Baden-Baden, Gelsenkirchen, Waregem, Leipzig, Gavle, Bornholm,
 *   Visby, Jägersro… — et, pour la plupart, SANS numéro de réunion (`pmuNumber`
 *   vaut 0 ; seules 4 réunions sur 20 en portent un).
 *
 *   Or ce que le parieur voit sur son écran, c'est le PROGRAMME PMU — celui de
 *   equidia.fr/courses-hippique et de turf-france.com : R1, R2, R3… jusqu'à
 *   R11 / R12, chaque réunion numérotée, dans l'ordre du PMU. Mesuré :
 *
 *       17/10/2026   page 19 réunions (148 c.)  ·  programme PMU 12 (93 c.)
 *       18/10/2026   page 20 réunions (169 c.)  ·  programme PMU 11 (87 c.)
 *
 * ⭐ LA RÈGLE
 *   ① la liste affichée est CELLE DU PROGRAMME PMU : les réunions R1 → Rn,
 *      dans cet ordre, chacune avec son numéro, son hippodrome, son pays et
 *      TOUTES ses courses ;
 *   ② chaque course déjà connue de la source de chevaux est enrichie (partants,
 *      conditions, arrivée, Quinté+, distance, terrain…) : c'est elle qui
 *      remplit le tableau des partants et l'écran carrière ;
 *   ③ les réunions PMU que la source de chevaux ignore (Amiens et Maronas, le
 *      18/10) restent affichées — leurs courses viennent du programme PMU et
 *      leur bloc d'études fonctionne : seuls les partants manquent, et la page
 *      le dit.
 *
 * ⚠ REPLI : si le programme PMU est injoignable, on rend la liste de la source
 *   de chevaux telle quelle (l'ancien comportement) — jamais une page vide.
 * ============================================================================= */

import { programmeDuJour } from './parisTurf.js'
import { indexTf, reunionSource } from './turfFrance.js'

/** Le pays, écrit comme un lecteur français l'écrit. ⚠ PAS de drapeau emoji :
 *  Windows ne dessine pas les drapeaux (🇨🇭 s'affiche « CH »). */
const PAYS_FR = {
  '' : '',
  ROYAUMEUNI: 'Royaume-Uni', GB: 'Royaume-Uni',
  PAYSBAS: 'Pays-Bas', PB: 'Pays-Bas', NL: 'Pays-Bas',
  ETATSUNIS: 'États-Unis', US: 'États-Unis',
  ESPAGNE: 'Espagne', ARGENTINE: 'Argentine', URUGUAY: 'Uruguay', CHILI: 'Chili',
  SUISSE: 'Suisse', ALLEMAGNE: 'Allemagne', BELGIQUE: 'Belgique',
  SUEDE: 'Suède', SU: 'Suède', ITALIE: 'Italie', MAROC: 'Maroc',
  DANEMARK: 'Danemark', NORVEGE: 'Norvège', IRLANDE: 'Irlande', PORTUGAL: 'Portugal',
  BRESIL: 'Brésil', MAURICE: 'Maurice', AFRIQUEDUSUD: 'Afrique du Sud',
  AUSTRALIE: 'Australie', CANADA: 'Canada', JAPON: 'Japon', HONGKONG: 'Hong Kong',
  QATAR: 'Qatar', EMIRATS: 'Émirats', TURQUIE: 'Turquie', GRECE: 'Grèce',
  AUTRICHE: 'Autriche', POLOGNE: 'Pologne', TCHEQUIE: 'Tchéquie', HONGRIE: 'Hongrie',
  PEROU: 'Pérou', RUSSIE: 'Russie',
}
export function paysLisible(pays) {
  const brut = String(pays || '').trim().toUpperCase()
  if (!brut) return ''
  if (brut === 'FRANCE' || brut === 'FR') return ''
  const cle = brut.replace(/[\s-]/g, '')
  return PAYS_FR[cle] || joliNom(brut)
}

/** « PLAT » → « Plat », « ATTELE » → « Attelé », « HAIES » → « Haies ». */
const DISCIPLINE = { PLAT: 'Plat', ATTELE: 'Attelé', MONTE: 'Monté', HAIES: 'Haies', STEEPLE: 'Steeple', CROSS: 'Cross', TROT: 'Trot' }
const jolieDiscipline = (d) => DISCIPLINE[String(d || '').toUpperCase()] || String(d || '')

/** « CORDE_DROITE HANDICAP DIVISE » → « Corde à droite · Handicap divise ». */
function joliesConditions(txt) {
  return String(txt || '')
    .replace(/CORDE_DROITE/gi, 'Corde à droite')
    .replace(/CORDE_GAUCHE/gi, 'Corde à gauche')
    .replace(/AUTOSTART/gi, 'Autostart')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(.*)$/, (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s))
}

/** « PARISLONGCHAMP » → « ParisLongchamp » — pour les réunions ignorées de l'autre source. */
const PETITS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'sur', 'sous', 'en', 'et', 'au', 'aux'])
export function joliNom(s) {
  const t = String(s || '').trim().toLowerCase()
  if (!t) return ''
  if (t.replace(/[^a-z]/g, '') === 'parislongchamp') return 'ParisLongchamp'
  return t
    .split(/([\s-]+)/)
    .map((m) => (/^[\s-]+$/.test(m) || !m ? m : PETITS.has(m) ? m : m.charAt(0).toUpperCase() + m.slice(1)))
    .join('')
}

/** Une course que seule la liste PMU connaît : tout vient d'elle sauf les partants. */
function courseDuProgramme(r, c, pays, nomReunion) {
  return {
    id: null,
    num: c.course,
    nom: c.nom || '',
    heure: null,
    heureTf: c.heure || '',
    discipline: c.discipline || '',
    specialite: '',
    libelle: jolieDiscipline(c.discipline),
    distance: c.distance || null,
    sens: /CORDE_GAUCHE/i.test(c.conditions || '') ? 'Gauche' : /CORDE_DROITE/i.test(c.conditions || '') ? 'Droite' : '',
    direction: '',
    surface: /DIRT|PSF/i.test(c.conditions || '') ? 'PSF' : '',
    terrain: c.terrain || '',
    categorie: '',
    details: '',
    conditions: joliesConditions(c.conditions),
    prix: null,
    nbPartants: c.partants || null,
    isTQQ: false,
    statut: '',
    arrivee: null,
    reunion: r,
    hippodrome: nomReunion || c.hippodrome || '',
    meetingId: 'pmu-R' + r,
    tf: { reunion: r, course: c.course, pays, heure: c.heure || '' },
  }
}

/**
 * LE PROGRAMME DU JOUR, tel que les sites le publient.
 * → { date, reference, reunions: [{ id, nom, hippodrome, reunion, pays, heure,
 *                                   depart, chevaux, courses: [course…] }] }
 *   `reference` dit si la liste est bien celle du programme PMU (`false` = repli).
 *   `chevaux` dit si la réunion a ses partants (`false` = liste PMU seule).
 */
export async function programmePmu(date) {
  const pt = await programmeDuJour(date)
  const replier = () => ({
    date,
    reference: false,
    reunions: pt.map((m) => ({ ...m, hippodrome: m.nom, reunion: m.pmu || null, pays: '', depart: '', chevaux: true })),
  })

  let idx = null
  try { idx = await indexTf(date) } catch (e) { idx = null }
  if (!idx || !idx.parReunion || !idx.parReunion.size) return replier()

  /* ① la réunion PMU de chaque réunion de la source de chevaux */
  const parR = new Map()
  for (const m of pt) {
    const r = reunionSource(idx, m.pmu, m.nom)
    if (r != null && !parR.has(r)) parR.set(r, m)
  }

  /* ② la liste, dans l'ordre du PMU */
  const reunions = []
  for (const [r, liste] of [...idx.parReunion.entries()].sort((a, b) => a[0] - b[0])) {
    const ref = [...liste].sort((a, b) => a.course - b.course)
    if (!ref.length) continue
    const m = parR.get(r) || null
    const pays = ref[0].pays || ''
    const nom = m ? m.nom : joliNom(ref[0].hippodrome)

    /* ⚠ LA LISTE EST CELLE DU PROGRAMME : une course que la source de chevaux
       connaît mais que le PMU ne programme pas n'est PAS ajoutée. Mesuré le
       10/10 : la source publie 13 courses à Solvalla, le programme PMU 2 (C10,
       C12) — les sites n'en montrent que 2, on en montre 2. */
    const connues = new Map((m ? m.courses : []).map((c) => [c.num, c]))
    const courses = []
    for (const c of ref) {
      const p = connues.get(c.course)
      courses.push(p
        ? { ...p, reunion: r, tf: { reunion: r, course: c.course, pays, heure: c.heure || '' } }
        : courseDuProgramme(r, c, pays, nom))
    }

    reunions.push({
      id: m ? m.id : 'pmu-R' + r,
      nom,
      hippodrome: nom,
      reunion: r,
      pmu: r,
      pays,
      heure: m ? m.heure : null,
      depart: ref[0].heure || '',
      chevaux: !!m,
      courses,
    })
  }

  if (!reunions.length) return replier()
  return { date, reference: true, reunions }
}
