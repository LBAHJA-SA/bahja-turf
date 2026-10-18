/* =============================================================================
 * backend/ANALYSE/paris.js — LES PARIS QUE CHAQUE COURSE PROPOSE (18/10/2026)
 *
 * ⛔ CE FICHIER TOURNE DANS LE NAVIGATEUR. Aucun import `node:*`.
 *
 * POURQUOI IL EXISTE
 *   Le programme PMU (reu.php) dit la course, l'heure, la distance, le terrain —
 *   il ne dit JAMAIS quels paris sont ouverts. Or le parieur lit ces pastilles
 *   avant tout le reste : « c'est un Tiercé, un Quarté, ou le Quinté+ ? »
 *
 * LA SOURCE
 *   Le programme de pro.casacourses.com : il publie, course par course, la liste
 *   `available_bet_types` (Simple, Jumelé, Tiercé, Quarté, Quinté+…). Il répond
 *   en CORS `*` — donc directement depuis la page — et il numérote EXACTEMENT
 *   comme le PMU. VÉRIFIÉ LE 18/10/2026 :
 *
 *        casacourses              page (reu.php, PMU)
 *        R1  ParisLongchamp       R1  ParisLongchamp
 *        R2  ZURICH               R2  ZURICH
 *        R3  Caen                 R3  Caen
 *        …                        …
 *        R11 Maure-de-Bretagne    R11 Maure-de-Bretagne
 *
 *   Chaque course porte même `pmu_reunion` et `pmu_course` : la clé est sûre.
 *
 * ⚠ ON N'INVENTE RIEN
 *   Une course ne propose que CERTAINES pastilles, et ça change d'une course à
 *   l'autre le même jour :
 *        R1C1 (18/10)  Simple Gagnant/Placé + Jumelé Gagnant/Placé
 *        R1C3 (le Quinté) les mêmes + Tiercé + Quarté + Quinté
 *   On n'affiche donc que ce que la source annonce. Les paris SANS pastille
 *   (2sur4, Multi, Trio) sont ignorés : la méthode n'en parle pas.
 *
 * ⚠ UNE PANNE N'EST JAMAIS UNE PAGE CASSÉE
 *   Programme injoignable → `{}`. Les courses s'affichent, sans pastilles.
 * ============================================================================= */

const CC_PROGRAMME = 'https://pro.casacourses.com/api/programme?date='

/** Le nom de la source → la clé de la pastille (src/Paris.jsx). */
const PASTILLE = {
  'sorec_simple:gagnant': 'simple-gagnant',
  'sorec_simple:place': 'simple-place',
  'sorec_jumele:gagnant': 'jumele-gagnant',
  'sorec_jumele:place': 'jumele-place',
  'sorec_tierce': 'tierce',
  'sorec_quarte': 'quarte',
  'sorec_quinte': 'quinte',
}

/** L'ordre d'affichage — du plus simple au plus fort. */
const ORDRE = ['simple-gagnant', 'simple-place', 'jumele-gagnant', 'jumele-place', 'tierce', 'quarte', 'quinte']

/** date → { « R1C3 » : ['tierce','quarte','quinte'], … } — une fois par jour. */
const cache = new Map()

/**
 * Les paris du jour, course par course.
 * → { « R{n}C{m} » : [clé de pastille, …] }  (les courses sans pari sont absentes)
 */
export async function parisDuJour(date) {
  if (cache.has(date)) return cache.get(date)
  const out = {}
  try {
    const r = await fetch(CC_PROGRAMME + date, { headers: { Accept: 'application/json' } })
    if (r.ok) {
      const j = await r.json()
      for (const m of j.meetings || []) {
        for (const c of m.races || []) {
          /* la réunion et le n° de course du PMU : `pmu_reunion`/`pmu_course`
             quand la source les donne, sinon le code de la réunion et `C3`. */
          const rr = c.pmu_reunion || Number(String(m.reunion_code || '').replace(/\D/g, ''))
          const cc = c.pmu_course || Number(String(c.code || '').replace(/\D/g, ''))
          if (!rr || !cc) continue
          const trouvees = (c.available_bet_types || []).map((x) => PASTILLE[x]).filter(Boolean)
          if (!trouvees.length) continue
          out['R' + rr + 'C' + cc] = ORDRE.filter((k) => trouvees.includes(k))
        }
      }
    }
  } catch (e) { /* pas de pastilles : la page reste entière */ }
  cache.set(date, out)
  return out
}

/** La clé d'une course de la page → ses pastilles (jamais null : au pire []). */
export function parisDe(paris, course) {
  if (!paris || !course || !course.reunion || !course.num) return []
  return paris['R' + course.reunion + 'C' + course.num] || []
}
