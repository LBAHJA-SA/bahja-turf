/* =============================================================================
 *  backend/RESULTATS/donnees.js — LES RÉSULTATS ET LES RAPPORTS (24/10/2026)
 *
 *  Demande de l'utilisateur : « la page des résultats de casacourses, mais
 *  seulement les résultats avec le rapport — combien ça paie — et un autre
 *  style, avec un bouton de rafraîchissement ».
 *
 *  ⭐ DEUX SOURCES, ET CHACUNE POUR CE QU'ELLE SAIT FAIRE :
 *
 *     pro.casacourses.com/api/programme?date=…   les réunions et les courses
 *     pro.casacourses.com/api/race/{id}?date=…   l'ARRIVÉE (numéros, noms,
 *                                                jockeys, cotes, disqualifiés)
 *     PMU /programme/{JJMMAAAA}/R{n}/C{m}/rapports-definitifs
 *                                                les DIVIDENDES officiels
 *
 *  ⚠ casacourses a un champ `dividends` dans la course : il est **toujours
 *    vide** (vérifié sur 30 courses terminées du 23/10, France et Belgique).
 *    Le rapport n'est donc PAS là — il est chez le PMU, en centimes pour 1 €.
 *
 *  ⚠ Le PMU ne connaît que ses propres courses : les réunions du Maroc (SOREC)
 *    et de Belgique n'ont pas de rapports. On ne les demande donc que pour la
 *    France — et un 404 est avalé sans bruit.
 * ========================================================================== */

export const CC_API = 'https://pro.casacourses.com/api'
export const PMU_API = '/api/pmu/rest/client/61/programme'

/* le Maroc ne parle pas au PMU : ses résultats et ses prix viennent de la SOREC */
import { chargerResultatsMaroc } from './maroc.js'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/** Les pays dont les courses sont au PMU (donc avec des rapports). */
const PAYS_PMU = ['FR', 'GP', 'MQ', 'RE', 'GF', 'YT', 'PM', 'BL', 'MF']

async function getJSON(u, delai = 20000) {
  const r = await fetch(u, {
    headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*' },
    signal: AbortSignal.timeout(delai),
  })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}
/** `2026-10-23` → `23102026` (le format que le PMU attend dans l'URL). */
export function datePMU(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? m[3] + m[2] + m[1] : ''
}

/** Une arrivée : les 5 premiers, dans l'ordre, avec nom / jockey / cote. */
export function lireArrivee(detail) {
  const j = detail || {}
  const arrivee = (j.results || [])
    .filter((r) => r && r.position != null && Number(r.position) >= 1 && Number(r.position) <= 5)
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map((r) => ({
      pos: Number(r.position),
      num: Number(r.number),
      nom: r.horse_name || '',
      jockey: r.jockey_name || '',
      cote: r.odd || '',
      disq: !!r.is_disqualified,
    }))
  return {
    arrivee,
    nonPartants: (j.nonStarters || []).map(Number).filter(Boolean),
    incidents: (j.incidents || []).map((x) => ({ type: x.type || '', nums: x.numeroParticipants || [] })),
  }
}

/** Les rapports du PMU, normalisés : [{ type, famille, lignes[] }]. */
export function lireRapports(brut) {
  if (!Array.isArray(brut)) return []
  return brut
    .map((x) => ({
      type: x.typePari || '',
      famille: x.famillePari || '',
      lignes: (x.rapports || [])
        .map((r) => ({
          libelle: r.libelle || x.typePari || '',
          combinaison: r.combinaison || '',
          /* ⚠ le PMU compte en CENTIMES pour 1 € : 280 = 2,80 € */
          centimes: r.dividendePourUnEuro != null ? r.dividendePourUnEuro
            : (r.dividende != null ? r.dividende : null),
          gagnants: r.nombreGagnants != null ? r.nombreGagnants : null,
        }))
        .filter((l) => l.centimes != null),
    }))
    .filter((x) => x.lignes.length)
}

/** Les rapports d'une course. [] si le PMU ne la connaît pas (MA, BE, GB…). */
export async function chargerRapports(date, r, c) {
  const d = datePMU(date)
  if (!d || !r || !c) return []
  try {
    return lireRapports(await getJSON(`${PMU_API}/${d}/R${r}/C${c}/rapports-definitifs`, 15000))
  } catch (e) {
    return []
  }
}

/** Une course terminée : le programme + son arrivée + ses rapports. */
async function chargerCourse(date, m, r) {
  const pays = String(m.country || '').toUpperCase()
  const rn = Number(r.pmu_reunion || String(m.reunion_code || '').replace(/\D/g, '') || 0)
  const cn = Number(r.pmu_course || String(r.code || '').replace(/\D/g, '') || 0)

  const [detail, rapports] = await Promise.all([
    getJSON(`${CC_API}/race/${r.id}?date=${date}`).catch(() => null),
    PAYS_PMU.includes(pays) ? chargerRapports(date, rn, cn) : Promise.resolve([]),
  ])
  const { arrivee, nonPartants, incidents } = lireArrivee(detail)

  return {
    code: r.code || '',
    num: cn,
    nom: r.name || '',
    heure: r.time_hm || '',
    distance: r.distance || null,
    discipline: r.type || '',
    partants: r.starters || (detail && detail.runner_count) || null,
    statut: r.status || '',
    finie: !!r.finished,
    arrivee,
    nonPartants,
    incidents,
    rapports,
  }
}

/** Exécute `fn` sur `items` avec au plus `n` en vol. */
async function enParallele(items, n, fn) {
  let i = 0
  const ouvriers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const k = i++
      await fn(items[k])
    }
  })
  await Promise.all(ouvriers)
}

/** Le cache : une date lue une fois ne se relit pas (sauf `force`). */
const cache = new Map()

/**
 * TOUT ce qu'il faut pour la page : les réunions qui ont au moins une course
 * terminée, avec l'arrivée et les rapports de chacune.
 *
 * `onProgress(faits, total)` permet d'afficher l'avancement.
 */
export async function chargerResultats(date, { force = false, onProgress = null } = {}) {
  if (!force && cache.has(date)) return cache.get(date)

  const j = await getJSON(`${CC_API}/programme?date=${date}`)
  const meetings = (j && j.meetings) || []

  /* le travail : une entrée par course TERMINÉE (les autres n'ont pas de résultat) */
  const plan = []
  for (const m of meetings) {
    for (const r of (m.races || [])) if (r.finished) plan.push({ m, r })
  }

  const parReunion = new Map()
  for (const m of meetings) {
    parReunion.set(m.id, {
      id: m.id,
      reunion: m.reunion_code || '',
      track: m.track || '',
      pays: m.country || '',
      devise: '€',
      premium: m.premium || [],
      races: [],
    })
  }

  let faits = 0
  await enParallele(plan, 8, async ({ m, r }) => {
    try {
      const c = await chargerCourse(date, m, r)
      if (c.arrivee.length) parReunion.get(m.id).races.push(c)
    } catch (e) { /* une course qui tombe ne fait pas tomber la page */ }
    faits++
    if (onProgress) onProgress(faits, plan.length)
  })

  const out = [...parReunion.values()]
    .filter((m) => m.races.length)
    .map((m) => ({ ...m, races: m.races.sort((a, b) => (a.num || 0) - (b.num || 0)) }))
    /* R1, R2, R3… : casacourses rend les réunions dans l'ordre du fournisseur,
     * pas dans l'ordre du programme. */
    .sort((a, b) => (Number(String(a.reunion).replace(/\D/g, '')) || 99)
      - (Number(String(b.reunion).replace(/\D/g, '')) || 99))

  cache.set(date, out)
  return out
}

/** Vide le cache d'une date (le bouton « Actualiser »). */
export function oublier(date) {
  cache.delete(date)
}

/* =============================================================================
 *  ⭐ LE MAROC — SES RAPPORTS NE VIENNENT PAS DU PMU (24/10/2026)
 *
 *  casacourses rend une réunion marocaine « Casablanca » qui reste `OPEN` à
 *  jamais, sans arrivée ni dividende. Le Maroc se lit donc chez la SOREC
 *  (backend/RESULTATS/maroc.js) et ses prix sont en DIRHAMS, pas en euros.
 *
 *  `chargerTout` met le Maroc EN TÊTE — c'est la course de l'utilisateur — et
 *  jette la réunion marocaine de casacourses (elle n'a rien à montrer).
 * ========================================================================== */

/** Tout ce qu'il faut à la page : le Maroc d'abord, puis les autres pays. */
export async function chargerTout(date, { force = false, onProgress = null } = {}) {
  const [cc, ma] = await Promise.all([
    chargerResultats(date, { force, onProgress }).catch(() => []),
    chargerResultatsMaroc(date, { force }).catch(() => ({ reunions: [], source: 'aucune' })),
  ])
  const autres = cc.filter((m) => !/^MA$/i.test(String(m.pays || '').trim()))
  return {
    reunions: [...(ma.reunions || []), ...autres],
    maroc: { source: ma.source, maj: ma.maj || null, erreur: ma.erreur || null },
  }
}

