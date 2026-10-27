/* =============================================================================
 *  backend/RESULTATS/maroc.js — LES RÉSULTATS DU MAROC (SOREC), 24/10/2026
 *
 *  Demande de l'utilisateur : « هادو الأثمنة ديال فرنسا وأنا قلت ليك الأثمنة ديال
 *  SOREC » — les rapports affichés étaient ceux du PMU (France). Le Maroc a les
 *  siens, et ils ne viennent PAS du PMU : ils viennent de la SOREC.
 *
 *  ⭐ LA SEULE SOURCE QUI DONNE LES RAPPORTS MAROCAINS : e-sorec.ma
 *
 *     GET /api/meetings-v2/{AAAA-MM-JJ}   les réunions DU JOUR DEMANDÉ (les
 *                                         courses portent `status`, `result`
 *                                         (« 2 - 3 - 5 - 7 - 4 ») et `bets`)
 *     GET /api/races/{id}                 les partants (startnr, horse.name,
 *                                         rider, finishorder, odd) ET les
 *                                         `dividends` (pool, combination, odd)
 *
 *  ⚠ TROIS PIÈGES MESURÉS LE 24/10/2026 :
 *
 *   ① `/api/meetings` (sans `-v2`) IGNORE le paramètre `date` : il rend toujours
 *     le programme du jour. La version historique est `/api/meetings-v2/{date}`.
 *   ② `/api/races-v2/{id}` répond 403 « Not authorized » — c'est la version
 *     authentifiée. La bonne est `/api/races/{id}` (publique).
 *   ③ casacourses ne sait PAS faire le Maroc : sa réunion « Casablanca » reste
 *     `OPEN` / `has_results: false` pour toujours, et ses `dividends` sont
 *     vides. On ne l'utilise donc pas du tout ici.
 *
 *  ⚠ LA SOREC N'EST JOIGNABLE QUE DEPUIS LE MAROC. Depuis Vercel : 504 edge /
 *    502 Node (mesuré). La page lit donc d'abord l'ARCHIVE déployée
 *    (`public/data/maroc-resultats.json`, écrite par `tools/maroc-resultats.mjs`
 *    et publiée par le job quotidien), et ne tente le direct qu'en local ou si
 *    la date manque à l'archive.
 * ========================================================================== */

export let SOREC = '/api/ma'
export const ARCHIVE = '/data/maroc-resultats.json'

/** La source à interroger. `tools/maroc-resultats.mjs` passe l'origine NUE
 *  (`https://e-sorec.ma`) : un outil Node n'a pas de relais devant lui. */
export function reglerSource(base) {
  SOREC = String(base || '').replace(/\/+$/, '') || '/api/ma'
}

/** 6 s : au-delà, la SOREC n'est pas joignable (Vercel met 27 s à rendre 504). */
const DELAI_DIRECT = 6000
const DELAI_COURSE = 15000

/** `type` de e-sorec → la discipline (mêmes codes que backend/DNA/morocco.js). */
const DISCIPLINES = {
  T: 'PLAT', P: 'PLAT', H: 'ATTELE', M: 'MONTE',
  S: 'STEEPLE', A: 'HAIE', C: 'CROSS',
}

/** `pool` de la SOREC → le code de pari de la page. */
const POOLS = {
  'Simple Gagnant': 'SIMPLE_GAGNANT',
  'Simple Place': 'SIMPLE_PLACE',
  'Jumele Gagnant': 'COUPLE_GAGNANT',
  'Jumele Place': 'COUPLE_PLACE',
  'Trio': 'TRIO',
  'Trio Ordre': 'TRIO_ORDRE',
  Tierce: 'TIERCE',
  Quarte: 'QUARTE',
  'Quarte+': 'QUARTE_PLUS',
  'Quinte+': 'QUINTE_PLUS',
  'Super 4': 'SUPER_QUATRE',
}

/* ------------------------------------------------------------------ outils -- */

async function getJSON(url, delai = DELAI_COURSE) {
  const ctrl = new AbortController()
  const minuteur = setTimeout(() => ctrl.abort(), delai)
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const j = await r.json()
    if (j && j.status === 'ERROR') throw new Error(j.error || 'erreur SOREC')
    return j && j.content !== undefined ? j.content : j
  } finally {
    clearTimeout(minuteur)
  }
}

const heures = (t) => String(t || '').slice(11, 16)

/** 1920 → « 19,20 » (la SOREC compte en centimes de dirham). */
function cote(v) {
  const n = Number(v)
  if (!v || !isFinite(n) || n <= 0) return ''
  return (n / 100).toFixed(2).replace('.', ',')
}

/** Les libellés de la SOREC, écrits comme un joueur les lit. Elle envoie
 *  « ORDRE », « DESORDRE », « BONUS 3 », « NP1 », « B3NP1 », « B4NP1 » : sans
 *  traduction, la tuile affichait « b3np1 ». */
const LIBELLES = {
  ordre: 'Ordre',
  desordre: 'Désordre',
  'bonus 3': 'Bonus 3',
  'bonus 4': 'Bonus 4',
  np1: 'Bonus (NP1)',
  b3np1: 'Bonus 3 (NP1)',
  b4np1: 'Bonus 4 (NP1)',
}

/** « Rapport gagnant » ne dit rien : la tuile porte déjà le nom du pari. On ne
 *  garde donc QUE ce qui distingue les lignes (ordre / désordre / bonus / np1). */
function libelle(pool, type) {
  const t = String(type || '').trim().toLowerCase()
  if (!t || /rapport gagnant/.test(t)) return ''
  return LIBELLES[t] || (t.charAt(0).toUpperCase() + t.slice(1))
}

/* ------------------------------------------------------------- la lecture -- */

/** L'arrivée des 5 premiers. `result` du programme fait foi ; les partants
 *  donnent le nom, le jockey et la cote. */
export function lireArriveeSorec(detail, course) {
  const runners = (detail && detail.runners) || []
  const parNum = new Map()
  for (const x of runners) parNum.set(Number(x.startnr), x)

  const ordre = String((course && course.result) || '')
    .split('-')
    .map((x) => Number(String(x).trim()))
    .filter((n) => Number.isFinite(n) && n > 0)

  const suite = ordre.length
    ? ordre
    : runners
      .filter((x) => Number(x.finishorder) > 0)
      .sort((a, b) => Number(a.finishorder) - Number(b.finishorder))
      .map((x) => Number(x.startnr))

  return suite.slice(0, 5).map((num, i) => {
    const x = parNum.get(num) || {}
    const jockey = x.rider && typeof x.rider === 'object' ? (x.rider.name || '') : (x.rider || '')
    return {
      pos: i + 1,
      num,
      nom: (x.horse && x.horse.name) || '',
      jockey,
      cote: cote(x.odd),
      disq: false,
    }
  })
}

/** Les non-partants de la SOREC. `status === true` = partant ; toute autre
 *  valeur = non-partant (mesuré sur Anfa du 23/10 : C2 → 3, C3 → 8, C5 → 6,
 *  C6 → 5, C7 → 16, exactement les cases rouges de casacourses). */
export function lireNonPartantsSorec(detail) {
  return ((detail && detail.runners) || [])
    .filter((x) => x && x.status !== true && Number(x.startnr) > 0)
    .map((x) => Number(x.startnr))
    .sort((a, b) => a - b)
}

/** Les rapports de la SOREC → la même forme que ceux du PMU. */
export function lireDividendesSorec(liste) {
  const parType = new Map()
  for (const d of (liste || [])) {
    const type = POOLS[d.pool]
    if (!type) continue
    if (!parType.has(type)) parType.set(type, { type, famille: d.pool, lignes: [] })
    parType.get(type).lignes.push({
      libelle: libelle(d.pool, d.type),
      combinaison: d.combination || '',
      /* ⚠ la SOREC compte en CENTIMES de dirham : 120 = 1,20 DH */
      centimes: Number(d.odd),
      gagnants: null,
    })
  }
  return [...parType.values()].filter((x) => x.lignes.length)
}

/* ------------------------------------------------------------ le direct -- */

/** Les réunions marocaines d'une date, lues en direct sur e-sorec.ma. */
export async function chargerSorec(date) {
  const c = await getJSON(`${SOREC}/api/meetings-v2/${date}`, DELAI_DIRECT)
  const events = (c && c.events) || []
  const maroc = events.filter((e) => /^MAR/i.test(String(e.country || '').trim()))

  const out = []
  for (const e of maroc) {
    const courses = []
    for (const r of (e.races || [])) {
      if (!/OFFICIAL/i.test(String(r.status || ''))) continue
      const detail = await getJSON(`${SOREC}/api/races/${r.id}`).catch(() => null)
      const arrivee = lireArriveeSorec(detail, r)
      if (!arrivee.length) continue
      courses.push({
        nonPartants: lireNonPartantsSorec(detail),
        code: r.code || '',
        num: Number(String(r.code || '').replace(/\D/g, '')) || 0,
        nom: r.name || '',
        heure: heures(r.time),
        distance: r.distance || null,
        discipline: DISCIPLINES[String(r.type || '').toUpperCase()] || '',
        partants: r.starters || null,
        statut: r.status || '',
        finie: true,
        arrivee,
        incidents: [],
        rapports: lireDividendesSorec(detail && detail.dividends),
      })
    }
    if (courses.length) {
      out.push({
        id: 'ma-' + (e.id || e.code),
        reunion: e.code || '',
        track: e.track || '',
        pays: 'MA',
        devise: 'DH',
        premium: e.premium || [],
        races: courses.sort((a, b) => a.num - b.num),
      })
    }
  }
  return out.sort((a, b) => (Number(String(a.reunion).replace(/\D/g, '')) || 99)
    - (Number(String(b.reunion).replace(/\D/g, '')) || 99))
}

/* ------------------------------------------------------------ l'archive -- */

let cacheArchive = null

/** L'archive déployée : { maj, jours: { 'AAAA-MM-JJ': [réunions] } }. */
export async function lireArchive() {
  if (cacheArchive) return cacheArchive
  try {
    const r = await fetch(ARCHIVE, { cache: 'no-store' })
    if (!r.ok) return null
    const j = await r.json()
    cacheArchive = j && j.jours ? j : null
    return cacheArchive
  } catch (e) {
    return null
  }
}

/** En local on lit la SOREC en direct ; ailleurs on préfère l'archive. */
function enLocal() {
  if (typeof location === 'undefined') return false
  return /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(location.hostname)
}

/**
 * Les résultats du Maroc pour une date.
 * → { reunions, source: 'direct' | 'archive' | 'aucune', maj, erreur }
 *
 * ⭐ ON NE TENTE LE DIRECT QUE LÀ OÙ IL PEUT ABOUTIR :
 *   · en local (le poste est au Maroc) ;
 *   · ou quand l'utilisateur clique « Actualiser » (il demande explicitement).
 *   En ligne, e-sorec met 27 s à rendre 504 : attendre ça à chaque chargement
 *   serait payer 6 s de plus pour un résultat qu'on connaît d'avance.
 */
export async function chargerResultatsMaroc(date, { force = false } = {}) {
  if (force) cacheArchive = null

  const direct = async () => {
    try {
      return { reunions: await chargerSorec(date), source: 'direct', maj: new Date().toISOString() }
    } catch (e) {
      return { reunions: [], source: 'aucune', erreur: e && e.message ? e.message : String(e) }
    }
  }

  const depuisArchive = async () => {
    const arch = await lireArchive()
    const jours = (arch && arch.jours) || {}
    return jours[date] && jours[date].length
      ? { reunions: jours[date], source: 'archive', maj: arch.maj }
      : null
  }

  if (enLocal() || force) {
    const d = await direct()
    if (d.reunions.length) return d
    return (await depuisArchive()) || d
  }

  return (await depuisArchive()) || { reunions: [], source: 'aucune', maj: null }
}
