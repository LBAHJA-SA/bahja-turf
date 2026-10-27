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

/** date → le programme casacourses BRUT (pour les partants de secours). */
const cacheBrut = new Map()

/**
 * LE PROGRAMME BRUT DE CASACOURSES — une lecture par date, partagée.
 *
 * Panne → `[]` : l'appelant décide de son repli, on ne lève jamais ici.
 */
async function programmeCc(date) {
  if (cacheBrut.has(date)) return cacheBrut.get(date)
  let meetings = []
  try {
    const r = await fetch(CC_PROGRAMME + date, { headers: { Accept: 'application/json' } })
    if (r.ok) {
      const j = await r.json()
      meetings = j.meetings || []
    }
  } catch (e) { /* pas de programme : [] */ }
  cacheBrut.set(date, meetings)
  return meetings
}

/**
 * Les paris du jour, course par course.
 * → { « R{n}C{m} » : [clé de pastille, …] }  (les courses sans pari sont absentes)
 */
export async function parisDuJour(date) {
  if (cache.has(date)) return cache.get(date)
  const out = {}
  try {
    for (const m of await programmeCc(date)) {
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
  } catch (e) { /* pas de pastilles : la page reste entière */ }
  cache.set(date, out)
  return out
}

/** La clé d'une course de la page → ses pastilles (jamais null : au pire []). */
export function parisDe(paris, course) {
  if (!paris || !course || !course.reunion || !course.num) return []
  return paris['R' + course.reunion + 'C' + course.num] || []
}

/* ------------------------------------------------- les partants de secours -- */

/**
 * LES PARTANTS QUAND LA SOURCE DE CHEVAUX NE LES PUBLIE PAS (25/10/2026).
 *
 * Constat : sur `/dna`, une course dont paris-turf n'a pas la fiche affichait
 *   « Les partants de cette course ne sont pas publiés par la source de
 *    chevaux (réunion étrangère ou course sans fiche) »
 * et rien d'autre — le 25/10 : Agen la Garenne R9 (7 courses), Saint Galmier
 * R11 (9), Chatelaillon R14 (7), Vire R7 le 26/10 (8). Des réunions françaises
 * entières, donc pas des « réunions étrangères ».
 *
 * Or casacourses — déjà lu par cette page pour les pastilles — les a :
 *   `GET /api/race/pmu-R9C1?date=2026-10-25` → 8 partants nommés, avec
 *   `odd_numeric` (la cote réelle), `odd_opening_numeric`, `performance`
 *   (la musique), `jockey_name`, `horse_trainer`.
 *
 * On ne devine RIEN : l'identifiant est celui que casacourses fabrique
 * lui-même à partir du numéro PMU (`pmu_reunion` + `pmu_course`, ou à défaut
 * `reunion_code` + `code`), donc on retrouve la course par sa clé, pas par
 * son nom.
 *
 * → [{ num, horse, cote, ouverture, age, sexe, poids, corde, jockey,
 *      entraineur, musique, nonPartant }]  ·  `[]` si la source n'a rien.
 */
export async function partantsCasacourses(date, rnum, cnum) {
  const R = Number(rnum)
  const C = Number(cnum)
  if (!R || !C) return []

  let id = null
  for (const m of await programmeCc(date)) {
    /* ⚠ ON SAUTE LE MAROC. casacourses numérote la réunion SOREC « R1 » le
     *   25/10, alors que le PMU appelle R1 Saint-Cloud : sans ce filtre,
     *   R1C1 rendait 17 partants de CASABLANCA (ALMOUAFAQ ROCH…) au lieu de
     *   Saint-Cloud. Le Maroc a sa propre lecture (`rnum >= 100`, SOREC) et
     *   n'a rien à faire ici. */
    if (String(m.country || '').toUpperCase() === 'MA') continue
    for (const c of m.races || []) {
      const rr = Number(c.pmu_reunion || String(m.reunion_code || '').replace(/\D/g, ''))
      const cc = Number(c.pmu_course || String(c.code || '').replace(/\D/g, ''))
      if (rr === R && cc === C) { id = c.id; break }
    }
    if (id) break
  }
  if (!id) return []

  let race = null
  try {
    const r = await fetch(`https://pro.casacourses.com/api/race/${encodeURIComponent(id)}?date=${date}`, {
      headers: { Accept: 'application/json' },
    })
    if (r.ok) race = await r.json()
  } catch (e) { return [] }

  const cote = (v) => (v != null && Number(v) > 0 ? Number(v) : null)
  return (race?.runners || [])
    .filter((x) => x && x.number != null && x.status !== false)
    .map((x) => ({
      num: Number(x.number),
      horse: x.horse_name || '',
      cote: cote(x.odd_numeric),
      cote_pmu: cote(x.odd_numeric),
      ouverture: cote(x.odd_opening_numeric),
      age: x.horse_age != null ? x.horse_age : null,
      sexe: x.horse_gender || '',
      poids: null,                  /* casacourses ne le donne pas : jamais inventé */
      corde: x.corde != null ? x.corde : null,
      jockey: x.jockey_name || '',
      entraineur: x.horse_trainer || '',
      musique: x.performance || '',
      nonPartant: false,
    }))
    .sort((a, b) => a.num - b.num)
}
