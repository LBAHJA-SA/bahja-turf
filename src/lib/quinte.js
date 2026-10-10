// ⚠ PLUS AUCUNE API bahja-pmu ICI — c'est une AUTRE application.
//   Tout ce dont le Quinté a besoin vient de pro.casacourses.com (section
//   CASACOURSES plus bas) : programme, partants, distance, piste, arrivée,
//   formes, cotes Equidia. Les 3 routes `/api/synthese`, `/api/race` et
//   `/api/programme` ont été retirées le 05/10/2026, avec leur appelante
//   `chercherArrivee` que personne n'utilisait. Bahja-TURF ne parle plus
//   à bahja-pmu : les deux applications sont séparées.

/* ------------------------------ CARRIÈRE AUTOMATIQUE (pro.casacourses) --- */

// casacourses donne, pour chaque cheval, ses 5 dernières courses avec
// la DISTANCE et la PLACE. C'est exactement ce qui manque pour les filtres ① et ②.
// Le terrain, le type et le VH ne sont pas publiés : on les laisse `__`
// (inconnu = neutre, jamais pénalisé).
export const CC_BASE = 'https://pro.casacourses.com'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'

/** GET JSON avec un User-Agent de navigateur (certains sites refusent le node). */
export async function getJSON(u) {
  const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*' } })
  const j = await r.json().catch(() => null)
  if (!r.ok) throw new Error((j && j.message) || `HTTP ${r.status}`)
  return j
}

const norm = (s) => String(s || '').toUpperCase().normalize('NFD').replace(/[^A-Z0-9]+/g, '')

/** Le code HIPPOS (PL, CH, …) à partir du nom d'hippodrome du backend. */
export function codeHippo(nom) {
  const n = String(nom || '').toLowerCase().trim()
  if (!n) return null
  for (const [k, v] of Object.entries(HIPPOS)) {
    if (v.nom.toLowerCase() === n) return k
  }
  for (const [k, v] of Object.entries(HIPPOS)) {
    const a = v.nom.toLowerCase().replace(/[^a-z]/g, '')
    if (a && (n.includes(a) || a.includes(n.replace(/[^a-z]/g, '')))) return k
  }
  return null
}

const _ccCache = {}
async function ccJSON(url) {
  if (_ccCache[url]) return _ccCache[url]
  const p = getJSON(url, 25000).catch((e) => ({ __err: e.message }))
  _ccCache[url] = p
  return p
}

/**
 * Carrière automatique d'une course.
 * @param courseId  « 2026-10-03_R1_C4 »
 * @param onProgress (msg, pct)
 * @returns { texte, forms: {num: [..]}, couverture: {chevaux, forms, hippoConnus} }
 */
export async function autoCarriere(courseId, onProgress = () => {}) {
  const [date = '', R = 'R1', C = 'C1'] = String(courseId).split('_')
  const prog = await ccJSON(`${CC_BASE}/api/programme?date=${date}`)
  if (!prog || prog.__err || !prog.meetings) {
    throw new Error(`programme indisponible (${(prog && prog.__err) || 'vide'})`)
  }

  // la bonne course : même R/C, sinon même nom, sinon même distance
  const toutes = prog.meetings.flatMap((m) => m.races.map((r) => ({ ...r, reunion: m.reunion_code })))
  let cible = toutes.find((r) => r.code === C && String(r.reunion || '').toUpperCase() === R)
  if (!cible) cible = toutes.find((r) => r.code === C && /quinte|global/i.test(JSON.stringify(r)))
  if (!cible) cible = toutes.find((r) => r.code === C)
  if (!cible) throw new Error(`course ${courseId} introuvable dans le programme`)

  onProgress(`course #${cible.id} — ${cible.name}`, 15)
  const detail = await ccJSON(`${CC_BASE}/api/race/${cible.id}?date=${cible.date || date}`)
  if (!detail || detail.__err || !detail.runners) {
    throw new Error(`détail indisponible (${(detail && detail.__err) || 'vide'})`)
  }

  // les 5 dernières courses de chaque cheval
  const forms = {}
  for (const r of detail.runners) {
    const n = parseInt(r.number, 10)
    if (!Number.isFinite(n)) continue
    forms[n] = { horse: r.horse_name, runs: (r.forms || []).slice(0, 5).map((f) => ({
      date: f.date, nom: f.track, dist: f.distance || null,
      place: f.place == null ? null : (parseInt(f.place, 10) || 0),
      racetype: f.racetype, weight: f.weight,
    })) }
  }

  // une requête de programme par date, pour retrouver l'hippodrome.
  // On prend le programme de casacourses LUI-MÊME : les noms y sont
  // identiques à ceux des `forms`, donc la correspondance est exacte.
  const dates = [...new Set(Object.values(forms).flatMap((f) => f.runs.map((r) => r.date).filter(Boolean)))]
    .sort().reverse()
  onProgress(`${dates.length} dates à résoudre…`, 30)

  const table = {}
  let fait = 0
  const parallel = 6
  for (let i = 0; i < dates.length; i += parallel) {
    await Promise.all(dates.slice(i, i + parallel).map(async (dt) => {
      try {
        const pr = await ccJSON(`${CC_BASE}/api/programme?date=${dt}`)
        for (const m of (pr.meetings || [])) {
          const code = codeHippo(m.track) || codeHippo((m.label || '').replace(/^\S+\s+/, ''))
          if (!code) continue
          for (const c of (m.races || [])) table[norm(c.name)] = code
        }
      } catch (e) { /* date sans programme : on garde les distances seules */ }
    }))
    fait = Math.min(dates.length, i + parallel)
    onProgress(`hippodromes ${fait}/${dates.length}`, 30 + (fait / dates.length) * 65)
  }

  // on construit les lignes
  const blocs = []
  let hippoConnus = 0, nbForms = 0
  for (const [n, f] of Object.entries(forms).sort((a, b) => +a[0] - +b[0])) {
    const runs = f.runs.map((r) => {
      nbForms++
      const code = table[norm(r.nom)]
      if (code) hippoConnus++
      const sens = code ? (HIPPOS[code].sens || 'D') : 'D'
      //   distance · code · sens · terrain · type · VH · place
      return `${r.dist || '____'} ${code || '__'} ${sens} __ __ __ ${r.place ?? 0}`
    })
    blocs.push(`${n} ${f.horse} | ${runs.join(' | ')}`)
  }
  onProgress('lignes prêtes', 100)

  return {
    texte: blocs.join('\n'),
    forms,
    couverture: { chevaux: blocs.length, forms: nbForms, hippoConnus, datesTestees: dates.length },
  }
}

/* ------------------------------------------- SOURCE DIRECTE (le site) --- */

// Le site n'envoie aucun en-tête CORS : en dev on passe par le proxy Vite
// (/pt -> https://www.pronostics-turf.info). En prod il faut un reverse-proxy.
// /api/pt : la presse. MÊME chemin en local et en ligne (voir vite.config.js)
  const PT_BASE = '/api/pt'

/**
 * Extrait la Récapitulative du HTML : { synthese[], fois[], arrivee, datePage, ordrePosition }.
 *
 * ⚠ ATTENTION À L'ORDRE (bug du 04/10/2026).
 *   Le tableau du site est en 2 colonnes visuelles et l'ordre des <tr> du HTML
 *   n'est PAS forcément l'ordre des positions P1, P2, P3… : sur l'Arc du 04/10
 *   on lisait  1 14 9 11 16 8 10 12 15 7 5 2 4 6 3  au lieu de
 *              1 14 9 16 11 8 15 10 7 12 5 2 3 4 13 6.
 *   La position vraie est dans le <img alt="Pronostic N"> de la 1re cellule.
 *   On la lit et on REMET les lignes dans l'ordre — sinon les blocs G1-G5
 *   sont découpés sur un faux classement, et la méthode ne veut plus rien dire.
 */
export function parseRecapHtml(html) {
  const i = String(html).toUpperCase().indexOf('RECAPITULATIVE')
  if (i < 0) return null
  const seg = String(html).slice(i, i + 9000)

  const brutes = []
  for (const m of seg.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cellules = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((x) => x[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace(/\s+/g, ' ').trim())
    if (cellules.length < 3) continue
    // la 1re cellule porte l'image « Pronostic N » : elle dit la POSITION
    const alt = (m[1].match(/<img[^>]*alt=["']?([^"'>]+)["']?/i) || [])[1] || ''
    const position = parseInt((alt.match(/(\d+)/) || [])[1], 10)
    const num = Number(cellules[1])
    const fois = Number(cellules[2])
    if (!Number.isFinite(num)) continue
    brutes.push({ position: Number.isFinite(position) ? position : null, num, fois: Number.isFinite(fois) ? fois : null })
    if (brutes.length >= 20) break
  }
  if (!brutes.length) return null

  // ⚠ le bon ordre est celui des POSITIONS de la presse, pas celui du HTML
  const avecPos = brutes.filter((x) => x.position != null)
  const trie = avecPos.length >= 2 && avecPos.length >= brutes.length - 1
  const rows = (trie ? avecPos.sort((a, b) => a.position - b.position) : brutes)
    .map((x) => ({ num: x.num, fois: x.fois }))

  const am = String(html).match(/R[ée]sultat\s+QUINTE[^:]*:\s*([\d\s\-–]{5,40})/i)
  return {
    synthese: rows.map((r) => r.num),
    fois: rows.map((r) => r.fois),
    arrivee: am ? am[1].trim() : null,
    datePage: dateDansPage(String(html)),
    ordrePosition: trie,
  }
}

const MOIS_FR = ['janvier', 'février', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'aout', 'septembre', 'octobre', 'novembre', 'décembre', 'decembre']

/**
 * ⚠ La date que le site affiche, lue dans son propre HTML.
 * pronostics-turf.info ne montre QUE la course en cours — et il bascule
 * souvent dès l'aube pour le lendemain. Sans cette vérification, on affiche
 * la Synthèse du 04/10 sous la date du 03/10.
 */
export function dateDansPage(html) {
  const sansAccent = (x) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const CANON = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
    'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const num = {}
  CANON.forEach((m, i) => { num[sansAccent(m)] = i + 1 })
  const variantes = [...new Set(MOIS_FR.map(sansAccent))]
  const pat = new RegExp('\\b(\\d{1,2})\\s+(' + variantes.join('|') + ')\\b', 'gi')
  const h = String(html)
  const annee = (h.match(/\b(20\d{2})\b/) || [])[1] || String(new Date().getFullYear())
  const jjmm = (j, m) => String(j).padStart(2, '0') + '-' + String(m).padStart(2, '0')
  for (const m of h.matchAll(pat)) {
    const j = parseInt(m[1], 10)
    const mois = num[sansAccent(m[2])]
    if (j >= 1 && j <= 31 && mois) return jjmm(j, mois) + '-' + annee
  }
  const iso = h.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (iso) return iso[3] + '-' + iso[2] + '-' + iso[1]
  const fr = h.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/)
  if (fr) return String(fr[1]).padStart(2, '0') + '-' + String(fr[2]).padStart(2, '0') + '-' + fr[3]
  return null
}

/** La date demandee est-elle bien celle que le site affiche ? */
export function siteCorrespondALaDate(datePage, dateDemandee) {
  if (!datePage || !dateDemandee) return true
  return enJJMM(datePage) === enJJMM(dateDemandee)
}

/** Normalise « 2026-10-04 » ou « 04-10-2026 » ou « 04/10 » en « 04-10 ». */
export function enJJMM(x) {
  const t = String(x).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(8, 10) + '-' + t.slice(5, 7)
  const m = t.match(/^(\d{1,2})[-/](\d{1,2})/)
  return m ? m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0') : t.slice(0, 5)
}
/** Archive locale sur disque (data/synthese.json), ecrite par le collecteur. */
export async function fetchArchiveDisque() {
  const r = await fetch('/data/synthese.json', { headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error('archive HTTP ' + r.status)
  return r.json()
}

/* ============================================================== EQUIDIA ===
 * LE MARCHÉ, en direct.
 *
 * equidia.fr rend sa page Angular complète : tout l'état du marché est collé
 * dans <script id="serverApp-state">. La clé `courses/…/pari_simple` donne, pour
 * chaque partant, `rapp_evol` (la cote), `rapp_ref` (celle d'ouverture) et
 * `tendance_signe` (+ / − / =).
 *
 *   https://www.equidia.fr/courses/2026-10-05/R1/C1
 *
 * pro.casacourses.com ne donne `odd` que sur les courses TERMINÉES. Equidia
 * donne la cote du jour : c'est la seule source libre trouvée qui a le marché
 * AVANT le départ. Le site n'envoyant aucun en-tête CORS, on passe par le
 * proxy Vite `/eq` (voir vite.config.js).
 * ========================================================================= */
export const EQ_BASE = '/api/eq'

/** Extrait le JSON du marché d'une page Equidia. Renvoie { num: {...} }. */
export function parseCotesEquidia(html, date, r, c) {
  const m = String(html).match(/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) return {}
  const txt = m[1]
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  let etat
  try { etat = JSON.parse(txt) } catch (e) { return {} }
  const brut = etat[`courses/${date}/R${r}/C${c}/pari_simple`] || []
  const out = {}
  for (const x of brut) {
    if (!x.rapp_evol || x.rapp_evol <= 0) continue
    out[x.num_partant] = {
      num: x.num_partant,
      nom: x.cheval?.nom_cheval || '',
      cote: x.rapp_evol,
      ouverture: x.rapp_ref ?? null,
      tendance: x.tendance_signe || '=',
      favori: !!x.favori,
      heure: x.heure_rap_evol || null,
    }
  }
  return out
}

/** Les cotes d'une course (`2026-10-05_R1_C1`). {} si le proxy est indisponible. */
export async function fetchCotes(courseId) {
  const m = String(courseId || '').match(/^(\d{4}-\d{2}-\d{2})_R(\d+)_C(\d+)$/)
  if (!m) return {}
  const [, d, r, c] = m
  try {
    const rep = await fetch(`${EQ_BASE}/courses/${d}/R${r}/C${c}`, { headers: { Accept: 'text/html' } })
    if (!rep.ok) return {}
    return parseCotesEquidia(await rep.text(), d, r, c)
  } catch (e) { return {} }
}

/* =========================================================== CASACOURSES ===
 * ⚠ SEULE SOURCE de données de Bahja-TURF. pro.casacourses.com répond en
 *   CORS '*' et donne TOUT : partants, distance, piste, arrivée, formes,
 *   cotes. L'ancienne API bahja-pmu n'est plus appelée (voir la tête du
 *   fichier) — les deux applications sont séparées.
 *
 *   programme  : /api/programme?date=JJ-MM-AAAA  -> meetings[].races[]
 *   course      : /api/race/{id}?date=JJ-MM-AAAA  -> runners[], results[]
 * ========================================================================= */
const CC_API = CC_BASE + '/api'

/** devise réelle par course (le détail annonce « DH » partout — c'est faux) */
const currencies = {}

export async function fetchProgrammeCC(date) {
  const j = await getJSON(`${CC_API}/programme?date=${date}`)
  return j.meetings || []
}

/** La course Quinté d'une date (available_bet_types contient sorec_quinte). */
/** La course Quinté FRANÇAISE d'une date (available_bet_types contient sorec_quinte).
 *  ⚠ le Maroc sort aussi avec sorec_quinte : on le jette sur meeting.country. */
export async function chercherQuinteCC(date) {
  const ms = await fetchProgrammeCC(date)
  const synthe = new Set(SYNTHESE_A_ATTENDRE)

  // le Maroc sort aussi avec sorec_quinte : on le jette sur meeting.country
  // ⚠ la page Quinté ne joue QUE la France (AGENTS.md §10) : exit l'Italie,
  //   l'Espagne et les USA que casacourses mélange dans le programme.
  const fr = ms.filter((m) => (m.country || '').toUpperCase() === 'FR')

  // ── 1. le cas nominal : la course annonce sorec_quinte
  const francs = []
  for (const m of fr) {
    for (const r of m.races || []) {
      if ((r.available_bet_types || []).includes('sorec_quinte')) francs.push({ m, r })
    }
  }
  if (francs.length) {
    if (synthe.size) {
      let best = null
      for (const c of francs) {
        const nums = new Set((c.r.runners || []).map((x) => Number(x.number)))
        let cover = 0
        for (const x of synthe) if (nums.has(x)) cover++
        const ratio = cover / synthe.size
        if (!best || ratio > best.ratio) best = { ...c, ratio }
      }
      if (best.ratio > 0) return best
    }
    const p1 = francs.find((c) => (c.m.reunion_code || 'R9') <= 'R2') || francs[0]
    return { ...p1, ratio: 0 }
  }

  // ── 2. ⚠ available_bet_types VIDE : les paris du jour ne sont pas encore
  //      publiés (cas du 04/10, jour de l'Arc). On identifie le Quinté par la
  //      Synthèse de la presse : elle ne cite QUE le Quinté.
  //      ⚠ le Quinté PMU est en R1 (01/10 Auteuil, 02/10 Vincennes, 03/10 et
  //      04/10 Longchamp) : on ne regarde donc QUE R1 puis R2, sinon l’Arc
      //      (R1 C5) passait après la coupe des 12 appels.
  const pool = fr
    .filter((m) => (m.id || '').startsWith('pmu-'))
    .sort((a, b) => (a.reunion_code || 'R99').localeCompare(b.reunion_code || 'R99', 'en', { numeric: true }))
  if (!pool.length) return null

  const court = []
  for (const m of pool) {
    if (!/^R[12]$/.test(m.reunion_code || '')) break   // R1 puis R2, dans l'ordre
    for (const r of m.races || []) {
      if ((r.starters || 0) >= 10) court.push({ m, r })
    }
  }
  if (!court.length) return null

  let best = null
  for (const c of court) {
    let det = null
    try { det = await getJSON(`${CC_API}/race/${c.r.id}?date=${date}`) } catch (e) { continue }
    const nums = new Set((det.runners || []).map((x) => Number(x.number)))
    let cover = 0
    for (const x of synthe) if (nums.has(x)) cover++
    const ratio = synthe.size ? cover / synthe.size : 0
    const dotations = Number(String(det.prize || '').replace(/[^0-9]/g, '')) || 0
    // couverture d’abord, puis la plus grosse dotation
    const score = ratio * 1e12 + dotations
    if (!best || score > best.score) {
      best = { m: c.m, r: { ...c.r, runners: det.runners }, det, ratio, score }
      // couverture parfaite ET gros prix : on peut s’arrêter
      if (ratio === 1 && dotations > 1e6) break
    }
  }
  return best
}

/** Détail d'une course casacourses, au format attendu par le reste du moteur. */
export async function fetchRaceCC(id, date) {
  const j = await getJSON(`${CC_API}/race/${id}?date=${date}`)
  if (!currencies[id]) {
    // le détail annonce « DH » même pour une course française :
    // on récupère la vraie devise dans le programme.
    try {
      for (const m of await fetchProgrammeCC(date)) {
        const r = (m.races || []).find((x) => x.id === id)
        if (r?.pursecurrency) currencies[id] = r.pursecurrency
      }
    } catch (e) { /* on garde la devise du détail */ }
  }
  const participants = (j.runners || [])
    .filter((r) => r.status !== false || r.number)
    .map((r) => ({
      num: Number(r.number),
      nom: r.horse_name || '',
      sexe: r.horse_gender || '',
      age: r.horse_age ?? null,
      jockey: r.jockey_name || '',
      entraineur: r.horse_trainer || '',
      poids: r.weight ?? null,
      cote: r.odd_numeric ?? null,
      musique: r.performance || '',
      forme: 0,
      depart: Number(r.number),
    }))
  const arrivee = (j.results || []).slice(0, 5).map((x) => Number(x.number)).filter(Boolean)
  return {
    courseId: j.id,
    arrivee: arrivee.length >= 5 ? arrivee : null,
    participants,
    discipline: j.type || '',
    distance: j.distance || null,
    nbPartants: j.runner_count || participants.length,
    hippodrome: j.track_name || '',
    terrain: j.track_condition || null,
    piste: j.track_type || '',
    prix: j.prize || j.name || '',
    pays: j.country || '',
    devisee: (currencies[id] || j.currency_symbol || ''),
    forme: (j.runners || []).map((r) => r.performance || ''),
    raw: j,
  }
}

/** La clé Equidia « 2026-10-05_R1_C1 ».
 *  ⚠ casacourses ne donne NI la réunion NI le numéro de course sur la course :
 *    la réunion est `meeting.reunion_code`, et le numéro de course = la place
 *    de la course dans `meeting.races` (l'ordre y est 1, 2, 3…). */
export function cleEquidia(date, m, r) {
  if (!m || !r) return null
  /* ⚠ 07/10/2026 : `meeting.reunion_code` est VIDE chez casacourses (le
   *    programme affiche « RR2 », « RR1 »…). Avec une réunion vide on
   *    construisait `…_R_C3` — une clé fausse, et l'erreur « course
   *    indisponible ». On tente donc trois sources, dans cet ordre :
   *      ① la course elle-même (`r.pmu_course`) — la plus fiable ;
   *      ② la réunion (`m.reunion_code`), si elle est renseignée ;
   *      ③ la position dans `m.races` (1-indexée). */
  const cnum = String(r.pmu_course || '').replace(/\D/g, '')
  const reunion = String(m.reunion_code || '').replace(/\D/g, '')
  if (cnum) return `${date}_R${reunion || 1}_C${cnum}`
  const idx = (m.races || []).findIndex((x) => x && x.id === r.id)
  if (idx < 0) return null
  return `${date}_R${reunion || 1}_C${idx + 1}`
}

/** Programme + course Quinté en un seul appel : c'est le chemin de la page. */
export async function chargerCourseCC(date, synthese = []) {
  SYNTHESE_A_ATTENDRE = Array.isArray(synthese) ? synthese.filter(Number.isFinite) : []
  try {
    const q = await chercherQuinteCC(date)
    if (!q) return null
    const det = await fetchRaceCC(q.r.id, date)
    return { ...det, cover: q.ratio, cle: cleEquidia(date, q.m, q.r) }
  } catch (e) {
    return null
  }
}

let SYNTHESE_A_ATTENDRE = []

/* ------------------------------------------------------------- SITE --- */

/** Récapitulative du jour, lue directement sur le site (via le proxy /pt). */
export async function fetchRecapSite() {
  const r = await fetch(`${PT_BASE}/`, { headers: { Accept: 'text/html' } })
  if (!r.ok) throw new Error(`site HTTP ${r.status}`)
  const html = await r.text()
  const p = parseRecapHtml(html)
  if (!p) throw new Error('Récapitulative introuvable dans la page')
  return p
}

/**
 * Le classement qui remplit les quotas.
 *  ⚠ 05/10/2026 : la FORME n’élimine PLUS (ni 4, ni 2, ni 1 point).
 *  La musique est le plus souvent hors-contexte (ni même distance, ni même
 *  piste, ni même sens) : c’est du bruit, pas une preuve. 4 faux négatifs
 *  en 4 courses (11e 2e, 7e 5e, 17e 4e, 8e 3e). AGENTS.md §6 : on écarte sur
 *  le PHYSIQUE, jamais sur la forme.
 *  Restent éliminatoires : ① distance (+4000), ③ niveau (+1000).
 *  Le flag forme reste calculé et archivé (dataset) — il ne classe plus.
 */
export function clePhysique(x) {
  const ech = [x.f?.[0]?.ok ? 0 : 4, 0, x.f?.[2]?.ok ? 0 : 1]
  return (ech[0] + ech[1] + ech[2]) * 1000 - (x.s?.global ?? 0)
}

export function classerPhysique(liste) {
  return [...liste].sort((a, b) => clePhysique(a) - clePhysique(b))
}

/* -------------------------------------------------------------- GRILLE --- */

/** Le groupe d’une CASE (slot) : 1-4 → G1, 5-8 → G2, 9-10 → G3, 11-12 → G4, 13+ → G5.
 *  « P » = NUMÉRO DE CASE (colonnes : P1,P2 | P3,P4 | …), PAS le rang presse.
 *  Mêmes chiffres que les rangs presse — mais quand la parité dérive,
 *  c’est le slot qui commande (ex. 04/10 : le 16 est case P4 → G1).
 */
export function groupeDeSlot(slot) {
  if (slot <= 4) return 'G1'
  if (slot <= 8) return 'G2'
  if (slot <= 10) return 'G3'
  if (slot <= 12) return 'G4'
  return 'G5'
}

/* ⚠ QUOTAS = RÈGLE FERMÉE. §11.2 : 2 ou 3 / 2 ou 3 / 1 / 1 / 0 ou 1.
 * Ils viennent de dix ans de méthode et d'expertise — ils ne se modifient JAMAIS.
 * Le seul travail permis est le CHOIS du cheval À L'INTÉRIEUR d'un bloc. */
export const GROUPES = [
  { id: 'G1', label: 'G1 · P1-P4', min: 1, max: 4, quota: 3, alt: 2 },
  { id: 'G2', label: 'G2 · P5-P8', min: 5, max: 8, quota: 2, alt: 3 },
  { id: 'G3', label: 'G3 · P9-P10', min: 9, max: 10, quota: 1, alt: 2, obligatoire: true },
  { id: 'G4', label: 'G4 · P11-P12', min: 11, max: 12, quota: 1, alt: 2 },
  { id: 'G5', label: 'G5 · P13-P20', min: 13, max: 20, quota: 1, alt: 1 },
]

/** Le « ticket fixé » : le moteur remplit les quotas, on ne modifie pas à la main. */
export function quotasEffectifs() {
  return GROUPES.map((g) => ({ id: g.id, n: g.quota }))
}

/**
 * Construit la grille : une case par position de presse P1..P(max),
 * répartie dans les groupes G1..G5. `cases` = numéros de chevaux.
 * Retourne aussi `parNum` : place de presse → numéro.
 */
/**
 * Construit la grille.
 *  - `synthese` : numéros dans l'ordre de la Récapitulative de la presse (P1..Pn)
 *  - `runners`   : tous les partants réels — ceux que la presse n'a pas cités
 *                  sont ajoutés à la suite (P(n+1)..), triés par numéro.
 *                  C'est le cas de n°10 aujourd'hui : jamais cité, mais partant.
 */
export function buildGrid(synthese, runners = []) {
  const synthe = (synthese || []).filter((n) => Number.isFinite(n))

  const numAtPlace = {}
  const placeOfNum = {}
  const citePresse = new Set()

  synthe.forEach((num, i) => {
    numAtPlace[i + 1] = num
    placeOfNum[num] = i + 1
    citePresse.add(num)
  })

  // partants absents de la Récapitulative : P(n+1), P(n+2)…
  const manquants = (runners || [])
    .filter((n) => Number.isFinite(n) && placeOfNum[n] == null)
    .sort((a, b) => a - b)
  manquants.forEach((num, k) => {
    const p = synthe.length + 1 + k
    numAtPlace[p] = num
    placeOfNum[num] = p
  })

  // ordre presse complet : rang 1, 2, 3… (manquants inclus)
  const ordrePresse = []
  for (let p = 1; numAtPlace[p] != null; p++) ordrePresse.push({ place: p, num: numAtPlace[p] })
  // ligne du haut = parité du n° de P1, dans l’ordre presse ; bas = l’autre
  const par = (x) => ((x % 2) + 2) % 2
  const pariteHaut = par(numAtPlace[1])
  const haut = ordrePresse.filter((c) => par(c.num) === pariteHaut)
  const bas = ordrePresse.filter((c) => par(c.num) !== pariteHaut)
  // slots : colonne k = slots P(2k-1) en haut, P(2k) en bas
  const slotParNum = {}
  haut.forEach((c, i) => { slotParNum[c.num] = 2 * i + 1 })
  bas.forEach((c, i) => { slotParNum[c.num] = 2 * i + 2 })
  const groupes = GROUPES.map((g) => {
    const cases = []
    for (let p = g.min; p <= g.max; p++) {
      const num = Object.keys(slotParNum).find((k) => slotParNum[k] === p)
      if (num != null) cases.push({ place: placeOfNum[num], num: Number(num), presse: citePresse.has(Number(num)), slot: p })
    }
    return { ...g, cases, quota: Math.min(g.quota, cases.length) }
  })

  const total = groupes.reduce((s, g) => s + g.quota, 0)
  return {
    groupes, parNum: placeOfNum, numAtPlace, slotParNum, synthe, total,
    max: synthe.length + manquants.length,
    manquants,
  }
}

/* ------------------------------------------------- MOTEUR DE SÉLECTION --- */

// points d'une place dans la musique : plus la place est bonne, plus ça vaut
const PTS = { 0: 0, 1: 10, 2: 7, 3: 5, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 }
const poids = (i) => 1 / (1 + i * 0.55)

/** Découpe la musique `2p4p1p(25)2p1p` → [{pos, disc, year}] (récent → ancien) */
export function decodeMusique(mus) {
  const runs = []
  let year = 26
  const s = String(mus || '')
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (ch >= '0' && ch <= '9') {
      let num = ''
      while (i < s.length && s[i] >= '0' && s[i] <= '9') { num += s[i]; i++ }
      if (s[i] === '(') { year = parseInt(num, 10); i++; continue }
      const disc = (s[i] || '').toLowerCase()
      i++
      if (/[a-z]/.test(disc)) runs.push({ pos: parseInt(num, 10), disc, year: 2000 + year })
      continue
    }
    i++
  }
  return runs
}

/** Lettres de discipline reconnues dans une musique pour UNE course donnée.
 *  ⚠ 05/10/2026 : l'attelé s'écrit `a` (pas `t`) — sans ça, TOUTE la forme
 *  d'un Quinté+ de trot valait 0. `m` = monté. Tolérances incluses.
 */
export function lettresDiscipline(discipline) {
  const d = String(discipline || '').toUpperCase()
  if (/ATTEL/.test(d)) return ['a', 't']
  if (/MONT/.test(d)) return ['m']
  if (/HAIE|HURDLE/.test(d)) return ['h']
  if (/STEEPLE|CHASE/.test(d)) return ['s']
  if (/TROT/.test(d)) return ['a', 't', 'm']
  return ['p']
}

/** Score de forme 0..10, pondéré vers le récent, en ne gardant que la discipline du jour. */
export function scoreForme(musique, discipline = 'PLAT') {
  const cibles = lettresDiscipline(discipline)
  const runs = decodeMusique(musique)
  const keep = runs.filter((r) => cibles.includes(r.disc))
  if (!keep.length) return { score: 0, n: 0, serie: [], purite: 0 }
  let num = 0, den = 0
  keep.slice(0, 6).forEach((r, i) => {
    num += poids(i) * (r.pos > 9 ? 0 : (PTS[r.pos] ?? 0))
    den += poids(i)
  })
  return {
    score: +(num / den).toFixed(2),
    n: keep.length,
    serie: keep.map((r) => (r.pos > 9 ? 'X' : r.pos)),
    purite: Math.round((keep.length / Math.max(runs.length, 1)) * 100),
  }
}

/**
 * Score global d'un cheval — SANS la carrière détaillée.
 * Le backend donne : musique, jockey, entraîneur, poids, valeur, âge, stats.
 * Il ne donne PAS : distances, terrains, types des courses passées.
 * Donc ce moteur est un PROVISOIRE : il remplit les quotas, il ne décide pas seul.
 */
export function scoreCheval(p, discipline) {
  const f = scoreForme(p.musique, discipline)
  const car = p.nombreCourses || 0
  const taux = car ? (p.nombreVictoires || 0) / car : 0
  const podiums = car ? ((p.nombrePlacesSecond || 0) + (p.nombrePlacesTroisieme || 0)) / car : 0

  // poids : un cheval qui porte est plus penalise
  const poidsNorm = Math.max(0, Math.min(1, ((p.poids || 55) - 50) / 12))
  // valeur : plus haute = mieux, on recentre sur 35..44
  const valNorm = Math.max(0, Math.min(1, ((p.valeur || 38) - 34) / 10))

  const global = +(f.score * 0.5 + taux * 100 * 0.18 + podiums * 100 * 0.14
    + valNorm * 100 * 0.10 + (100 - poidsNorm * 100) * 0.08).toFixed(2)

  return { ...f, taux: +taux.toFixed(3), podiums: +podiums.toFixed(3), global, poidsNorm, valNorm }
}

/** Range tous les partants par score décroissant. */
export function classerPartants(participants, discipline) {
  return participants
    .map((p) => ({ p, s: scoreCheval(p, discipline) }))
    .sort((a, b) => b.s.global - a.s.global)
}

/** La cote d'un numéro. Accepte { num: {cote} } comme { num: 4.2 }. */
function coteDe(cotes, num) {
  if (!cotes) return null
  const v = typeof cotes.get === 'function' ? cotes.get(num) : cotes[num]
  if (v == null) return null
  const n = typeof v === 'object' ? (v.cote ?? v.odds ?? null) : v
  const x = Number(n)
  return Number.isFinite(x) && x > 0 ? x : null
}

/**
 * Remplit la grille : on prend les meilleurs de chaque groupe jusqu'au quota.
 * G3 est obligatoire : si son score est faible, on le prend quand même.
 * Renvoie la liste des numéros retenus + le détail.
 *
 * ── QUAND ON A LE MARCHÉ (`cotes`), QUI ENTRE ? ────────────────────────────
 * Le score physique n'a aucun pouvoir de tri à l'intérieur d'un bloc (§11.16).
 *
 *   bloc de quota ≥ 2  →  les q meilleures cotes du bloc. Rien d'autre.
 *   bloc de quota 1    →  ⭐ R2 (10/10/2026) : le plus fort aux STATISTIQUES
 *      (signature : argmax du P, n≥2 ; égalité ou sans historique → la cote
 *      départage). Labo tools/lab-g3.mjs, 6 Quintés rejoués en leave-one-out
 *      avec le même marché des deux côtés : R2 = 23/30 · 1er 6/6 contre
 *      R1 (petite cote) = 21/30 · 1er 5/6 — approuvé par l'utilisateur.
 *      Le 10/10 a tranché en vrai : G3 8@13 pris, 9@14 écarté, et le 9 gagne.
 *
 * Mesure historique sur 280 vrais Quintés Global PMU France (2026-01-01 → 2026-10-05),
 * Archives + casacourses, avec la vraie Synthèse de la presse :
 *
 *   règle                       % où le 1-2-3 est complet dans la grille
 *   les q meilleures cotes         30 %       ← celle-ci
 *   (q-1) cotes + ★ surprise       13 %       ← retirée le 05/10/2026
 *   marché seul, top 8 des cotes   43 %       ← le plafond sans grille
 *
 * La ★ surprise coûtait la moitié : elle remplaçait des cotes à 8 et 14 par
 * une à 50. On ne la remet pas (§11.17 était mesuré sur 4 courses avec la
 * mauvaise métrique).
 *
 * ⚠ LE MARCHÉ BOUGE. Les cotes sont relues en continu (toutes les 60 s) :
 * la grille ci-dessus est un instantané. Le ticket à jouer est celui affiché
 * sur la page au moment du départ.
 *
 * ── LE 5e ARGUMENT : `stats` = computeStats(archive) ──────────────────────
 * Il ne change pas QUELS chevaux entrent — seulement l'ORDRE dans lequel le
 * ticket les affiche. Un Quinté se joue dans l'ordre : la 1re case est celle
 * qui doit gagner. `ordonnerParStats` la donne au cheval que l'archive montre
 * le plus souvent 1er, la 2e à celui qu'elle montre le plus souvent 2e, etc.
 */
export function remplirGrille(grille, classement, discipline, cotes = null, stats = null) {
  const parNum = new Map(classement.map((x) => [x.p.num, x]))
  // le classement arrive DÉJÀ trié : physique (filtres éliminatoires, §5) si
  // une carrière est disponible, sinon ordre du carnet. On respecte cet ordre.
  const rang = new Map(classement.map((x, i) => [x.p.num, i]))
  const ticket = []
  const detail = []

  /* Force aux STATISTIQUES d'un numéro (même mapping que ordonnerParStats) :
   * le P est celui de l'onglet Statistiques — pairs en haut (P1, P3…),
   * impairs en bas — PAS le rang de presse. null = sans historique (n<2). */
  const synthe = (grille?.synthe || []).filter((n) => Number.isFinite(n))
  const rangStats = {}
  synthe.filter((n) => n % 2 === 0).forEach((n, i) => { rangStats[n] = 2 * i + 1 })
  synthe.filter((n) => n % 2 !== 0).forEach((n, i) => { rangStats[n] = 2 * i + 2 })
  const parNumRang = grille?.parNum || {}
  const pDeNum = (num) => rangStats[num] ?? parNumRang[num] ?? 999
  const parPlaceStats = stats?.parPlace || []
  const forceDe = (num) => {
    const st = parPlaceStats[pDeNum(num) - 1]
    if (!st || !st.n || st.n < 2 || !Array.isArray(st.p)) return null
    let best = 0
    for (let k = 1; k < 5; k++) if ((st.p[k] ?? 0) > (st.p[best] ?? 0)) best = k
    return (st.p[best] ?? 0) > 0 ? { place: best, force: st.p[best] } : null
  }

  for (const g of grille.groupes) {
    const cases = g.cases.map((c) => ({ ...c, s: parNum.get(c.num)?.s || null, ok: parNum.get(c.num)?.ok ?? null }))

    // repli si le classement n'a pas de position exploitable :
    // 3/3 avant 2/3 avant 1/3, puis le score global.
    const tries = cases.slice().sort((a, b) => {
      const ra = rang.get(a.num), rb = rang.get(b.num)
      if (ra != null && rb != null && ra !== rb) return ra - rb
      const oa = a.ok, ob = b.ok
      if (oa != null && ob != null && oa !== ob) return ob - oa
      if (oa != null && ob == null) return -1
      if (oa == null && ob != null) return 1
      const sa = a.s?.global, sb = b.s?.global
      if (sa != null && sb != null) return sb - sa
      if (sa != null) return -1
      if (sb != null) return 1
      return a.place - b.place
    })

    const quota = g.obligatoire ? Math.max(1, g.quota) : g.quota

    // le marché prime : s'il a la cote de TOUS les partants du bloc
    const surLeMarche = cases.every((c) => coteDe(cotes, c.num) != null)
    const retenus = new Set()
    /* ⭐ R2 (10/10/2026, labo tools/lab-g3.mjs : 23/30 contre 21/30, 1er
     * 6/6 contre 5/6 — approuvé par l'utilisateur) : sur un bloc à UNE
     * place avec le marché complet, on ne prend plus la plus petite cote.
     * Prendre la cote la plus basse, le 10/10 ça a coûté le gagnant
     * (G3 : 8@13 pris, 9@14 écarté — et c'est le 9 qui gagne). On prend
     * le plus fort aux STATISTIQUES ; égalité ou sans historique → la
     * cote départage (elle reste le repli, plus le choix). */
    const parStats = surLeMarche && quota === 1 && parPlaceStats.length > 0
    if (parStats) {
      const gagnant = cases.slice().sort((a, b) =>
        ((forceDe(b.num)?.force ?? -1) - (forceDe(a.num)?.force ?? -1)) ||
        (coteDe(cotes, a.num) - coteDe(cotes, b.num))
      )[0]
      retenus.add(gagnant.place)
    } else if (surLeMarche) {
      const parCote = cases.slice().sort((a, b) => coteDe(cotes, a.num) - coteDe(cotes, b.num))
      parCote.slice(0, quota).forEach((c) => retenus.add(c.place))
    } else {
      tries.slice(0, quota).forEach((c) => retenus.add(c.place))
    }

    detail.push({
      ...g,
      surprise: null,
      surLeMarche,
      parStats,
      cases: cases.map((c) => ({
        ...c,
        cote: coteDe(cotes, c.num),
        pris: retenus.has(c.place),
        surprise: false,
      })),
    })
    cases.forEach((c) => { if (retenus.has(c.place)) ticket.push(c.num) })
  }

  // ── L'ORDRE DE LA TICKET — celui des STATISTIQUES, rien d'autre ──────────
  // Ni l'ordre des cases du carnet, ni celui des cotes, ni celui de la presse.
  // Un Quinté se joue DANS L'ORDRE : la 1re case est celle qui doit gagner.
  // On la donne donc au cheval que l'archive montre le plus souvent 1er, la
  // 2e à celui qu'elle montre le plus souvent 2e, etc. → `ordonnerParStats`.
  const uniques = [...new Set(ticket)]
  return { ticket: ordonnerParStats(uniques, grille, stats, cotes), detail }
}

/**
 * ⭐ L'ORDRE DE LA TICKET — par probabilités de place.
 *
 *   stats    = computeStats(archive) → parPlace[r].p = [P(1er), P(2e), P(3e), P(4e), P(5e)]
 *              où `r` est le RANG DE PRESSE du cheval (P1, P2, P3…).
 *   cotes    = { n° : {cote} } — le départage quand l'archive ne dit rien.
 *
 * Attribution gloutonne : le meilleur pour la 1re place, puis le meilleur pour
 * la 2e parmi ceux qui restent, puis la 3e, la 4e, la 5e. Les chevaux en
 * trop suivent, sans place.
 *
 * ⚠ Avec moins de 10 Quintés dans l'archive (`stats.nb`), ces pourcentages sont
 * du bruit : le ordre est presque arbitraire. C'est demandé quand même — l'ordre
 * s'affine tout seul à mesure que l'archive grossit.
 */
export function ordonnerParStats(ticket, grille, stats, cotes = null) {
  const nums = [...new Set(ticket || [])]
  if (nums.length < 2) return nums

  const rang = grille?.parNum || {}
  const parPlace = stats?.parPlace || []
  /* ⚠ 10/10/2026 — LE P EST CELUI DE L'ONGLET STATISTIQUES, PAS LE RANG
   * DE PRESSE. computeStats construit son tableau « Place P1…P20 » avec
   * les PAIRS en haut (P1, P3, P5…) et les IMPAIRS en bas (P2, P4, P6…),
   * dans l'ordre de la Récapitulative (§11.13). grille.parNum, lui, est
   * le RANG de presse (1er cité = P1). Les mêler lisait la mauvaise
   * statistique pour presque chaque cheval — l'ordre ne suivait pas le
   * tableau Statistiques. On reconstruit ici le mapping exact de
   * computeStats ; grille.parNum ne sert plus qu'au repli des absents. */
  const synthe = (grille?.synthe || []).filter((n) => Number.isFinite(n))
  const rangStats = {}
  synthe.filter((n) => n % 2 === 0).forEach((n, i) => { rangStats[n] = 2 * i + 1 })
  synthe.filter((n) => n % 2 !== 0).forEach((n, i) => { rangStats[n] = 2 * i + 2 })
  const pDeNum = (num) => rangStats[num] ?? rang[num] ?? 999

  /* ── L'ORDRE : LA PLACE EST CELLE OÙ LE P EST LE PLUS FORT ──
   * Règle de l'utilisateur (07/10/2026) : chaque cheval du ticket se
   * place à la position où son P(n) est le plus fort d'après le tableau
   * Statistiques. P1 à 100 % au 1er → première case. P4 à 50 % au 5e →
   * cinquième case. Puis les autres, sans place.
   *
   * ⚠ CORRIGÉ le 10/10 : l'ancien code prenait pour CHAQUE case le
   * cheval restant le plus FORT (max global, départage par le carnet).
   * Un cheval fort en 3e (P2 à 60 %) pouvait s'asseoir en 2e case et
   * faire descendre le vrai 2e (P10 à 60 % au 2e) — vu par
   * l'utilisateur le 10/10 : « le 2e doit être P10 ». Désormais chaque
   * cheval déclare SA place (son argmax) et une place n'accueille QUE
   * le plus fort de ceux qui la revendiquent. Les perdants et les
   * chevaux sans force suivent « sans place », au rang du carnet.
   *
   * ⚠ Un P avec n=1 (une seule course) affiche des pourcentages de
   *   100 % qui ne veulent rien dire. On les traite comme nuls : sans
   *   historique, pas de force — c'est le même principe que « physique
   *   > forme » : le fait bat la supposition. */
  const signature = (num) => {
    const st = parPlace[pDeNum(num) - 1]
    if (!st || !st.n || st.n < 2 || !Array.isArray(st.p)) return null
    let best = 0
    for (let k = 1; k < 5; k++) if ((st.p[k] ?? 0) > (st.p[best] ?? 0)) best = k
    return (st.p[best] ?? 0) > 0 ? { place: best, force: st.p[best] } : null
  }

  /* ⚠ LE DÉPARTAGE EST LE RANG DU CARNET (le P de la grille), PAS LA COTE.
   * Avec la cote, le même ticket donnait un ordre différent en local
   * (pas de marché) et en production (marché lu) : la page et
   * l'archive ne se ressemblaient plus. Or l'ordre doit être le même
   * partout — c'est l'archive qui fait foi. On départage donc par le
   * P le plus proche du début du carnet, ce qui est stable. */
  const rangDe = (num) => pDeNum(num)

  const s = nums.map((n) => ({ n, sig: signature(n), rang: rangDe(n) }))
  /* chaque place : le plus fort de ses candidats (force, puis carnet) */
  const places = new Array(5).fill(null)
  const pris = new Set()
  const candidats = s.filter((x) => x.sig)
    .sort((a, b) => (b.sig.force - a.sig.force) || (a.rang - b.rang))
  for (const x of candidats) {
    if (places[x.sig.place] == null) { places[x.sig.place] = x.n; pris.add(x.n) }
  }
  /* les autres, sans place, dans l'ordre du carnet */
  const sansPlace = s.filter((x) => !pris.has(x.n))
    .sort((a, b) => a.rang - b.rang)
    .map((x) => x.n)
  return [...places.filter((n) => n != null), ...sansPlace]
}

/* ------------------------------------------------------- CARRIÈRE (B) --- */

// Hippodromes : code → { nom, sens (D/G), surface }
export const HIPPOS = {
  PL: { nom: 'ParisLongchamp', sens: 'D', surf: 'Gazon' },
  CH: { nom: 'Chantilly', sens: 'D', surf: 'Gazon' },
  DV: { nom: 'Deauville', sens: 'D', surf: 'Gazon' },
  SC: { nom: 'Saint-Cloud', sens: 'G', surf: 'Gazon' },
  CO: { nom: 'Compiègne', sens: 'G', surf: 'Gazon' },
  FB: { nom: 'Fontainebleau', sens: 'G', surf: 'Gazon' },
  LM: { nom: 'Le Mans', sens: 'G', surf: 'Gazon' },
  CF: { nom: 'Clairefontaine', sens: 'D', surf: 'Gazon' },
  VI: { nom: 'Vichy', sens: 'D', surf: 'Gazon' },
  DI: { nom: 'Dieppe', sens: 'D', surf: 'Gazon' },
  AN: { nom: 'Angers', sens: 'D', surf: 'Gazon' },
  BL: { nom: 'Bordeaux-Le Bouscat', sens: 'D', surf: 'Gazon' },
  LL: { nom: "Le Lion-d'Angers", sens: 'G', surf: 'Gazon' },
  CA: { nom: 'Cagnes-sur-Mer', surf: 'PSF' },
  SB: { nom: 'Strasbourg', sens: 'D', surf: 'Gazon' },
  LG: { nom: 'La Gacilly', sens: 'D', surf: 'Gazon' },
  GB: { nom: 'Goodwood', sens: 'D', surf: 'Gazon' },
  AS: { nom: 'Ascot', sens: 'D', surf: 'Gazon' },
  BN: { nom: 'Bordeaux (LNH)', sens: 'G', surf: 'Gazon' },
  SA: { nom: 'Saint-Lô', sens: 'D', surf: 'Gazon' },
  AR: { nom: 'Argentan', sens: 'G', surf: 'Gazon' },
  SE: { nom: 'Sées', sens: 'D', surf: 'Gazon' },
  LV: { nom: 'Le Lion (alt)', sens: 'G', surf: 'Gazon' },
}

// terrains : mot-clé → { ok: bool, poids }
const TERRAINS = {
  bon: 1, 'bon souple': 1, 'très souple': 1, souple: 1, 'bon leger': 1, 'bon léger': 1,
  collant: 0.5, mouille: 0.5, lourd: 0.5, 'tres lourd': 0.4, psf: 0.6, 'fibres synthetique': 0.6,
}

const TYPES = ['hand', 'handicap', 'cl.1', 'cl1', 'cl.2', 'cl2', 'classe 2', 'cl.3', 'cl3',
  'classe 3', 'maid', 'maiden', 'listed', 'list', 'mp', 'group', 'grp', 'cond',
  'conditions', 'am', 'pjc', 'inéd', 'ined']

/**
 * Parse une ligne de carrière compacte :
 *   "2400 PL D Bon Hand 39.5 2"
 *   "3200 GB D Bon léger Hand 10.7 0"
 * Retourne { dist, hippo, sens, terrain, type, vh, rang } ou null.
 */
export function parseRun(txt) {
  const s = String(txt || '').trim()
  if (!s) return null
  const low = s.toLowerCase()

  const mDist = s.match(/(\d{3,5})\s*(m)?/)
  if (!mDist) return null
  const dist = parseInt(mDist[1], 10)

  let reste = s.slice(mDist.index + mDist[0].length).trim()
  const tok = reste.split(/\s+/)

  // sens : D ou G isolé
  let sens = null, i = 0
  for (; i < tok.length; i++) {
    const t = tok[i].toUpperCase()
    if (t === 'D' || t === 'G') { sens = t; i++; break }
  }
  reste = tok.slice(i).join(' ')

  // type : premier mot-clé de type rencontré
  let type = null, idx = -1
  const lt = reste.toLowerCase()
  for (const key of TYPES) {
    const p = lt.indexOf(key)
    if (p >= 0 && (idx < 0 || p < idx)) { idx = p; type = key }
  }
  const terrain = type && idx >= 0 ? reste.slice(0, idx).trim() : reste.trim()

  // derniers nombres = VH puis rang
  const nums = (reste.match(/\d+(?:[.,]\d+)?/g) || []).map((x) => parseFloat(x.replace(',', '.')))
  const rang = nums.length ? nums[nums.length - 1] : null
  const vh = nums.length >= 2 ? nums[nums.length - 2] : null

  // code hippodrome
  let hippo = null
  for (const tk of reste.split(/\s+/)) {
    const k = tk.toUpperCase().replace(/[^A-Z]/g, '')
    if (k && HIPPOS[k]) { hippo = k; break }
  }
  if (!hippo) {
    for (const [k, v] of Object.entries(HIPPOS)) {
      if (reste.toLowerCase().includes(v.nom.toLowerCase().slice(0, 5))) { hippo = k; break }
    }
  }

  return {
    dist,
    hippo,
    sens: sens || (hippo ? HIPPOS[hippo].sens : null),
    terrain: terrain || null,
    type,
    vh,
    rang,
  }
}

/** Parse le bloc complet : une ligne par cheval. */
export function parseCarriere(texte) {
  const out = {}
  for (const ligne of String(texte || '').split(/\r?\n/)) {
    const l = ligne.trim()
    if (!l || l.startsWith('#')) continue
    const [tete, ...runs] = l.split('|').map((x) => x.trim())
    const num = parseInt(String(tete).match(/(\d{1,2})/)?.[1] ?? '', 10)
    if (!Number.isFinite(num)) continue
    out[num] = runs.filter(Boolean).map(parseRun).filter(Boolean)
  }
  return out
}

/* --------------------------------------- SCORE PHYSIQUE (les 6 critères) --- */

const WT = { FORME: 0.22, DIST: 0.22, NIVEAU: 0.13, PISTE: 0.18, TERRAIN: 0.13, CORDE: 0.12 }

export function scorePhysique(p, carriere, course) {
  const distJour = course.dist || 2500
  const surfJour = (course.surf || 'Gazon').toLowerCase()
  const sensJour = course.sens || 'D'

  // ① FORME UTILE — 05/10/2026 : seulement les courses à ±400 m du jour.
  //  Une musique hors-contexte (sprint pour un stayer, PSF pour du gazon)
  //  est du bruit : elle ne mesure pas la condition POUR CETTE course.
  //  Repli : toute la musique si moins de 2 courses utiles.
  const utiles = (carriere || []).filter((r) => r.dist && Math.abs(r.dist - distJour) <= 400)
  const baseForme = utiles.length >= 2 ? utiles : (carriere || [])
  const utile = utiles.length >= 2
  let forme, serie
  const rs = baseForme.map((r) => r.rang).filter((x) => x != null)
  if (rs.length) {
    let n = 0, d = 0
    rs.slice(0, 6).forEach((r, k) => { n += poids(k) * (r > 9 ? 0 : (PTS[r] ?? 0)); d += poids(k) })
    forme = n / d
    serie = rs.map((r) => (r > 9 ? 'X' : r))
  } else {
    const f = scoreForme(p.musique, course.discipline || 'PLAT')
    forme = f.score; serie = f.serie
  }

  const formeUtile = utile ? `${utiles.length}/${(carriere || []).length} utiles` : (rs.length ? `repli global` : `musique`)

  // ② DISTANCE — écart avec la distance du jour
  const ds = (carriere || []).map((r) => r.dist).filter(Boolean)
  let dist = forme * 0 + (ds.length ? (() => {
    let n = 0, d = 0
    ;(carriere || []).forEach((r, k) => {
      const D = Math.abs(r.dist - distJour)
      n += poids(k) * (D <= 100 ? 10 : D <= 200 ? 8 : D <= 400 ? 5 : D <= 600 ? 3 : 0)
      d += poids(k)
    })
    return n / d
  })() : 0)

  // ③ PISTE — hippodrome + sens
  const piste = (carriere || []).length ? (() => {
    let n = 0, d = 0
    ;(carriere || []).forEach((r, k) => {
      const h = r.hippo ? HIPPOS[r.hippo] : null
      const lieu = h ? (h.nom === course.hippo ? 10 : ['Deauville', 'Chantilly', 'Saint-Cloud', 'Fontainebleau', "Le Lion-d'Angers", 'Bordeaux-Le Bouscat', 'Vichy', 'Dieppe', 'Angers'].some((x) => h.nom.includes(x)) ? 7 : 5) : 5
      const sens = r.sens ? (r.sens === sensJour ? 10 : 6) : (h ? (h.sens === sensJour ? 10 : 6) : 5)
      n += poids(k) * Math.round(lieu * 0.6 + sens * 0.4); d += poids(k)
    })
    return n / d
  })() : 5

  // ④ NIVEAU — VH du jour vs VH des 2 dernières courses saisies
  const vhs = (carriere || []).map((r) => r.vh).filter((x) => x != null)
  const niveau = vhs.length >= 2 ? (() => {
    const moy = (vhs[0] + vhs[1]) / 2
    const ecart = (p.valeur || moy) - moy
    return ecart <= -1 ? 10 : ecart <= 0.5 ? 8 : ecart <= 2 ? 5 : ecart <= 4 ? 3 : 1
  })() : (vhs.length ? 6 : 5)

  // ⑤ TERRAIN — l'état du jour contre ceux des courses passées
  const terrain = (carriere || []).length ? (() => {
    let n = 0, d = 0
    ;(carriere || []).forEach((r, k) => {
      const t = (r.terrain || '').toLowerCase()
      let q = 8
      if (/psf|synth/.test(t)) q = (surfJour === 'psf') ? 10 : 4
      else if (/collant|lourd|mouill|très lourd/.test(t)) q = 5
      n += poids(k) * q; d += poids(k)
    })
    return n / d
  })() : (surfJour === 'psf' ? 5 : 8)

  // ⑥ CORDE — n° de départ. §4 : ≤6 → 10 · ≤11 → 8 · ≤15 → 5 · ≥16 → 3.
  //
  // ⚠ CORRIGÉ le 05/10/2026. On lisait `p.corde`, mais casacourses renvoie le
  // numéro de départ sous le nom `depart` (ligne ~420). `p.corde` était donc
  // TOUJOURS undefined et le critère valait 6/10 pour les 14 partants : les 12 %
  // de la note ne séparaient personne. Les deux noms sont acceptés.
  const c = p.corde ?? p.depart ?? null
  const corde = c == null ? 6 : (c <= 6 ? 10 : c <= 11 ? 8 : c <= 15 ? 5 : 3)

  const global = +(forme * WT.FORME + dist * WT.DIST + niveau * WT.NIVEAU
    + piste * WT.PISTE + terrain * WT.TERRAIN + corde * WT.CORDE).toFixed(2)

  return {
    forme: +forme.toFixed(2), formeUtile, dist: +dist.toFixed(2), niveau,
    piste: +piste.toFixed(2), terrain: +terrain.toFixed(2), corde,
    global, serie,
  }
}

/** Les 3 filtres (voir AGENTS.md §5) — recalibrés sur la course du jour. */
export function filtres(p, carriere, course) {
  const distJour = course.dist || 2500
  const seuil = Math.max(2000, distJour - 300)
  const n = (carriere || []).filter((r) => r.dist >= seuil).length
  const f1 = { ok: n >= 2, txt: `${n}/5 courses ≥ ${seuil}m` }

  const s = scorePhysique(p, carriere, course)
  const f2 = { ok: s.forme >= 3.5, txt: `score ${s.forme} (${s.formeUtile || '/'}) [${s.serie.join(' ')}]` }

  const vhs = (carriere || []).map((r) => r.vh).filter((x) => x != null)
  const ecart = vhs.length >= 2 ? (p.valeur || 0) - (vhs[0] + vhs[1]) / 2 : 0
  const f3 = { ok: ecart <= 1.5, txt: `aujourd'hui ${p.valeur} vs ${((vhs[0] + vhs[1]) / 2 || 0).toFixed(1)} = ${ecart > 0 ? '+' : ''}${ecart.toFixed(1)}` }

  return [f1, f2, f3]
}

/**
 * Synchronise l'archive du disque (data/synthese.json — écrite par le collecteur
 * ou par tools/seed-archive.mjs) vers le localStorage.
 * Le disque apporte la Synthèse et les partants ; le local garde l'arrivée et le
 * ticket quand le disque ne les a pas encore.
 */
export async function syncDepuisDisque() {
  let db
  try {
    const r = await fetch('/data/synthese.json', { headers: { Accept: 'application/json' } })
    if (!r.ok) return 0
    db = await r.json()
  } catch (e) { return 0 }
  if (!db || typeof db !== 'object') return 0

  const all = lireTout()
  let n = 0
  for (const [date, rec] of Object.entries(db)) {
    if (!rec || !date) continue
    const local = all[date] || {}
    /* ⚠ PURGE : ce navigateur a peut-être gardé une `ticketPoseLe` d'une
     *   session antérieure (écrite par un test, ou Stunden avant que le
     *   disque ne soit corrigé). Le disque fait foi : s'il ne dit rien,
     *   l'heure est inconnue et on l'efface — sinon les deux serveurs
     *   afficheraient deux heures différentes pour la même course. */
    if (local.ticketPoseLe && !rec.ticketPoseLe) delete local.ticketPoseLe

    // ⚠ Si la Synthèse a changé, le ticket calculé dessus n'est plus valable.
    const synthAvant = (local.synthese || []).join(',')
    const synthApres = (rec.synthese || []).join(',')
    const synthChange = synthAvant && synthApres && synthAvant !== synthApres

    all[date] = {
      ...local,
      ...rec,
      arrivee: rec.arrivee || local.arrivee || null,
      // ⚠ LE TICKET VIENT DU DISQUE quand il y en a un. Le local peut être
      //   plus ancien (un ordre de ticket calculé avec une petite archive,
      //   avant que le moteur ou les stats n'aient changé). La règle du
      //   premier figé porte sur la SÉLECTION, pas sur l'ordre : si le
      //   disque a un ticket, c'est lui. Sinon on garde le local.
      ticket: rec.ticket || local.ticket || null,
      // ⚠ LE DISQUE EST FAIT SOURCE DE VÉRITÉ pour l'heure du gel.
      //   On ne retombe JAMAIS sur la valeur locale : une heure écrite
      //   autrefois dans ce navigateur (ou une heure inventée par un test)
      //   survivrait sinon pour toujours, et les deux serveurs afficheraient
      //   deux POSÉ LE différents pour la même course. Si le disque ne dit
      //   rien, l'heure est INCONNUE — on affiche « — », on ne comble pas.
      ticketSource: rec.ticketSource || local.ticketSource || null,
      ticketPoseLe: rec.ticketPoseLe || null,
      ticketMode: rec.ticketMode || local.ticketMode || null,
      savedAt: local.savedAt || rec.collecte || null,
      syntheseChangee: synthChange ? true : (local.syntheseChangee || false),
    }
    n++
  }
  ecrireTout(all)
  return n
}

/** La carrière saisie par l'utilisateur, conservée par date. */
const LS_CARRIERE = 'bahja-quinte-carriere-'
export async function saveCarriere(date, data) {
  try { localStorage.setItem(LS_CARRIERE + date, JSON.stringify(data || {})) } catch (e) { /* quota */ }
  return data
}
export async function loadCarriere(date) {
  try { return JSON.parse(localStorage.getItem(LS_CARRIERE + date) || '{}') } catch (e) { return {} }
}

/** Toutes les carrières du navigateur, groupées par date.
 *  Sert à produire `data/carriere.json`, lu par tools/daily.mjs. */
export function toutesCarrieres() {
  const out = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(LS_CARRIERE)) continue
      out[k.slice(LS_CARRIERE.length)] = JSON.parse(localStorage.getItem(k) || '{}')
    }
  } catch (e) { /* rien */ }
  return out
}

/** Déclenche le téléchargement de data/carriere.json (un clic, pas de copier/coller). */
export function telechargerCarriere() {
  const data = toutesCarrieres()
  const nDates = Object.keys(data).length
  const nChev = Object.values(data).reduce((a, d) => a + Object.keys(d || {}).length, 0)
  if (!nDates) return { ok: false, msg: 'Aucune carrière enregistrée.' }
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'carriere.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  return { ok: true, msg: `carriere.json téléchargé — ${nDates} date(s), ${nChev} chevaux. Pose-le dans C:\\bahja-TURF\\data\\` }
}

/** Déclenche le téléchargement de l'archive locale (un clic).
 *  10/10/2026 — REMÈDE AU « DEUX ARCHIVES » : le navigateur collecte des
 *  courses que le disque rate (08/10 jamais collecté, 09/10 fermé à la
 *  main via turf-france). Sans retour, les deux divergent pour toujours
 *  et aucun test local ne reproduit la page — d'où des tickets qui ne
 *  « correspondent à rien ». Le fichier téléchargé se pose dans
 *  C:\bahja-TURF\data\archive-import.json et le job le fusionne tout
 *  seul au cycle suivant (tools/merge-archive.mjs). */
export function telechargerArchive() {
  const data = lireTout()
  const dates = Object.keys(data)
  if (!dates.length) return { ok: false, msg: 'Archive vide — rien à envoyer.' }
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'archive-import.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  const fermees = dates.filter((d) => (data[d].arrivee || []).length).length
  return { ok: true, msg: `archive-import.json téléchargé — ${dates.length} course(s) dont ${fermees} avec résultat. Pose-le dans C:\\bahja-TURF\\data\\` }
}

// Stockage local (localStorage) : quelques centaines d'octets par course,
// largement sous la limite de 5 Mo. Pas d'IndexedDB : moins de pièges.

const LS_KEY = 'bahja-quinte-archive-v1'
const LS_MAX = 400   // on garde les 400 dernières courses

function lireTout() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const o = JSON.parse(raw)
    return o && typeof o === 'object' ? o : {}
  } catch (e) { return {} }
}

function ecrireTout(obj) {
  try {
    const cles = Object.keys(obj).sort().reverse()
    const trimmed = {}
    for (const k of cles.slice(0, LS_MAX)) trimmed[k] = obj[k]
    localStorage.setItem(LS_KEY, JSON.stringify(trimmed))
    return true
  } catch (e) {
    return false  // quota dépassée : on ne bloque pas l'affichage
  }
}

/** Enregistre (ou met à jour) la Synthèse d'une date. Ne écrase jamais l'arrivée. */
export async function saveArchive(date, payload) {
  const all = lireTout()
  const ex = all[date] || {}
  all[date] = {
    ...ex,
    date,
    found: payload.found,
    race: payload.race || ex.race || null,
    source: payload.source || ex.source || null,
    synthese: payload.synthese || ex.synthese || [],
    savedAt: new Date().toISOString(),
    arrivee: ex.arrivee || null,
    ticket: ex.ticket || null,
  }
  ecrireTout(all)
  return all[date]
}

export async function getArchive(date) {
  return lireTout()[date] || null
}

export async function listArchive() {
  return Object.values(lireTout()).sort((a, b) => (a.date < b.date ? 1 : -1))
}

export async function deleteArchive(date) {
  const all = lireTout()
  delete all[date]
  return ecrireTout(all)
}

/** Attache l'arrivée + la discipline + le ticket à un enregistrement. */
export async function attachResult(date, extra) {
  const all = lireTout()
  if (!all[date]) return null
  all[date] = { ...all[date], ...extra }
  ecrireTout(all)
  return all[date]
}

export async function clearArchive() {
  try { localStorage.removeItem(LS_KEY) } catch (e) { /* ignore */ }
  return true
}

/** Sauvegarde le ticket d'une date (pour le suivi ultérieur).
 *  🔒 GEL DU PREMIER TICKET : si un ticket existe déjà, on ne l'écrase JAMAIS.
 *  Le premier ticket figé reste — même si le marché bouge après.
 *
 *  ⚠ `ticketPoseLe` = L'HEURE DU PREMIER AFFICHAGE, pas l'heure du serveur.
 *    `new Date()` ici est l'horloge du navigateur de l'utilisateur : c'est
 *    exactement ce qu'on veut (le moment où il a vu le ticket pour la
 *    première fois). Une fois écrit, cette heure ne bouge plus. */
/* Niveaux de gel : page < auto < final < manuel. Un niveau n'écrase que les
 * niveaux strictement inférieurs — jamais l'inverse (09/10/2026 : le re-gel
 * FINAL du job passe devant le gel de la page, mais rien ne passe devant
 * le FINAL ; le manuel reste intouchable, §13.3). */
const RANG_SOURCE = { page: 0, auto: 1, final: 2, manuel: 3 }
export async function attachTicket(date, ticket, source = 'page') {
  const all = lireTout()
  if (!all[date]) return null
  const precedent = all[date].ticketSource || null
  const dejaPose = !!(all[date].ticket && all[date].ticket.length)
  if (dejaPose && (RANG_SOURCE[precedent] ?? 0) >= (RANG_SOURCE[source] ?? 0)) return all[date]
  if (!ticket || !ticket.length) return all[date]
  all[date] = {
    ...all[date],
    ticket: [...ticket],
    ticketSource: source,
    ticketPoseLe: new Date().toISOString(),
  }
  ecrireTout(all)
  return all[date]
}

/** Export JSON complet (sauvegarde manuelle). */
export async function exportArchive() {
  const all = Object.values(lireTout())
  return JSON.stringify({ genere: new Date().toISOString(), nb: all.length, records: all }, null, 2)
}

/** Import d'un export JSON. */
export async function importArchive(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json
  const recs = (data && data.records) || []
  const all = lireTout()
  for (const r of recs) if (r && r.date) all[r.date] = r
  ecrireTout(all)
  return recs.length
}

/* --------------------------------------------------------------- STATS --- */

/**
 * ⭐ LA STATISTIQUE DEMANDÉE : la chance que PLUSIEURS positions de presse
 * entrent EN MÊME TEMPS dans le podium (1er + 2e + 3e) de la même course.
 *
 *   joint(positions, records)
 *     → tous dans le top 3  ?
 *     → tous dans le top 5  ?
 *     → au moins un dans le top 3 ?
 *
 * Exemple : joint([1,4,5]) = « P1, P4 et P5 sont sur le même podium ».
 */
export function joint(positions, records) {
  const p = [...new Set((positions || []).map(Number).filter((x) => x >= 1 && x <= 20))].sort((a, b) => a - b)
  if (!p.length) return null
  let n = 0, t3 = 0, t5 = 0, un = 0
  for (const rec of records || []) {
    if (!rec.arrivee || rec.arrivee.length < 3) continue
    const synthe = (rec.synthese || []).filter(Number.isFinite)
    // placeOf[p] = le numéro du cheval à la position de presse p
    // numOf[n]  = la position de presse du cheval n   (les deux sens)
    const placeOf = {}
    const numOf = {}
    synthe.forEach((num, i) => { placeOf[i + 1] = num; numOf[num] = i + 1 })
    // les partants non cités par la presse occupent les positions suivantes
    const runners = rec.runners || synthe
    const absents = runners.filter((x) => numOf[x] == null).sort((a, b) => a - b)
    absents.forEach((x, i) => { placeOf[synthe.length + 1 + i] = x; numOf[x] = synthe.length + 1 + i })

    const places = p.map((x) => (placeOf[x] != null ? rec.arrivee.indexOf(placeOf[x]) + 1 : 99))
    // une position absente de la grille (99) = non partant : la course ne compte pas.
    // un cheval partant mais arrivé 6e ou au-delà (0 après le +1) = un ÉCHEC,
    // pas une course à écarter : c'est justement ce qu'on veut mesurer.
    if (places.some((x) => x === 99)) continue
    n++
    if (places.every((x) => x <= 3)) t3++
    if (places.every((x) => x <= 5)) t5++
    if (places.some((x) => x <= 3)) un++
  }
  return {
    positions: p, n,
    top3: n ? Math.round(t3 / n * 100) : 0,
    top5: n ? Math.round(t5 / n * 100) : 0,
    un: n ? Math.round(un / n * 100) : 0,
    brut: { t3, t5, un },
  }
}

/** Tous les sous-ensembles de 2 et 3 positions, tries : ce qui marche le mieux. */
export function combosJoint(records, tailleMax = 3) {
  const out = []
  const N = 20
  const combinaisons = (arr, k) =>
    k === 0 ? [[]] : arr.flatMap((v, i) => combinaisons(arr.slice(i + 1), k - 1).map((c) => [v, ...c]))
  const positions = Array.from({ length: N }, (_, i) => i + 1)
  for (let k = 2; k <= tailleMax; k++) {
    for (const c of combinaisons(positions, k)) {
      const r = joint(c, records)
      if (r && r.n) out.push(r)
    }
  }
  return out.sort((a, b) => b.top3 - a.top3 || b.n - a.n)
}

/**
 * P(1er) P(2e) P(3e) P(4e) P(5e) par position de presse P1..P20,
 * calculé sur l'archive locale (chaque record = un Quinté avec son arrivée).
 */
export function computeStats(records) {
  const MAX = 20
  const tab = Array.from({ length: MAX + 1 }, () => [0, 0, 0, 0, 0])
  const courses = []
  const detailCourses = []

  for (const rec of records || []) {
    if (!rec.arrivee || !rec.arrivee.length) continue
    // ⚠ BUG CORRIGÉ le 05/10 : on lisait numAtPlace[numéro] (le cheval EN place n)
    //   au lieu du rang presse DU cheval. Résultat : rangs faux, et les courses
    //   dont un arrivant dépassait la Synthèse étaient JETÉES (04/10 : 4 valeurs).
    //   numéro → rang presse (P1, P2…), manquants à la suite par n° croissant.
    const placeOfNum = {}
    // ⚠ LE P EST CELUI DU CARNET, PAS LE RANG DE LA SYNTHÈSE.
    //   La grille place les PAIRS en haut (P1, P3, P5…) et les IMPAIRS en
    //   bas (P2, P4, P6…), dans l'ordre de la Récapitulative — la règle du
    //   carnet (§11.13). Lire « le n-ième cité » ici donnait des P différents
    //   de ceux de la grille : le tableau Statistiques décrivait une autre
    //   grille que celle affichée.
    const synthe = (rec.synthese || []).filter(Number.isFinite)
    const pairs = synthe.filter((n) => n % 2 === 0)
    const impairs = synthe.filter((n) => n % 2 !== 0)
    pairs.forEach((num, i) => { placeOfNum[num] = 2 * i + 1 })     // P1, P3, P5…
    impairs.forEach((num, i) => { placeOfNum[num] = 2 * i + 2 })   // P2, P4, P6…
    // les partants non cités occupent les places suivantes, par n° croissant
    const manquants = (rec.runners || [])
      .filter((n) => Number.isFinite(n) && placeOfNum[n] == null)
      .sort((a, b) => a - b)
    const apres = Math.max(0, ...Object.values(placeOfNum))
    manquants.forEach((num, k) => { placeOfNum[num] = apres + 1 + k })

    const pl = rec.arrivee.slice(0, 5).map((n) => placeOfNum[n]).filter((r) => r != null)
    if (pl.length < 5) continue
    courses.push(pl)
    detailCourses.push({ synthe, pl })
    pl.forEach((r, i) => { if (r <= MAX) tab[r][i]++ })
  }

  const parPlace = []
  for (let r = 1; r <= MAX; r++) {
    const t = tab[r]
    const tot = t.reduce((a, b) => a + b, 0)
    if (!tot) { parPlace.push({ place: r, n: 0, p: [0, 0, 0, 0, 0], top3: 0, top5: 0 }); continue }
    parPlace.push({
      place: r,
      n: tot,
      p: t.map((v) => +(v / tot * 100).toFixed(0)),
      // le podium : 1er + 2e + 3e réunis — la statistique qui compte vraiment,
      // parce qu'une course se gagne sur les trois premiers.
      top3: +((t[0] + t[1] + t[2]) / tot * 100).toFixed(0),
      top5: +(tot / courses.length * 100).toFixed(0),
    })
  }

  // par groupe
  const parGroupe = GROUPES.map((g) => {
    let n = 0, c1 = 0, c23 = 0, c45 = 0
    for (const pl of courses) {
      const h = pl.map((r, i) => ({ r, p: i + 1 })).filter((x) => x.r >= g.min && x.r <= g.max)
      if (!h.length) continue
      n++
      for (const x of h) { if (x.p === 1) c1++; else if (x.p <= 3) c23++; else c45++ }
    }
    const tot = c1 + c23 + c45
    return {
      id: g.id, label: g.label, min: g.min, max: g.max,
      n, total: tot,
      part1: tot ? Math.round(c1 / tot * 100) : 0,
      part23: tot ? Math.round(c23 / tot * 100) : 0,
      part45: tot ? Math.round(c45 / tot * 100) : 0,
      present: courses.length ? Math.round(n / courses.length * 100) : 0,
    }
  })

  // le vainqueur
  const vainqueur = { 'P1-P4': 0, 'P5-P8': 0, 'P9-P10': 0, 'P11+': 0 }
  for (const pl of courses) {
    const w = pl[0]
    if (w <= 4) vainqueur['P1-P4']++
    else if (w <= 8) vainqueur['P5-P8']++
    else if (w <= 10) vainqueur['P9-P10']++
    else vainqueur['P11+']++
  }

  // D'où vient CHAQUE place du quinté : le 1er, puis la 2e, la 3e, la 4e, la 5e.
  const BORNES = [
    { label: 'P1-P4', min: 1, max: 4 },
    { label: 'P5-P8', min: 5, max: 8 },
    { label: 'P9-P10', min: 9, max: 10 },
    { label: 'P11+', min: 11, max: MAX },
  ]
  const parPosition = BORNES.map((b) => {
    const compte = { 'P1-P4': 0, 'P5-P8': 0, 'P9-P10': 0, 'P11+': 0 }
    let total = 0
    for (const pl of courses) {
      for (let i = 0; i < 5; i++) {
        const w = pl[i]
        if (!w) continue
        if (w >= b.min && w <= b.max) { compte[b.label]++; total++ }
      }
    }
    return {
      id: b.label,
      total,
      ...Object.fromEntries(BORNES.map((x) => [x.label,
        total ? Math.round(compte[x.label] / total * 100) : 0])),
    }
  })

  // la même chose, place par place (1er, 2e, 3e, 4e, 5e)
  const parPlaceBloc = [1, 2, 3, 4, 5].map((p) => {
    const compte = {}
    let n = 0
    for (const pl of courses) {
      const w = pl[p - 1]
      if (!w) continue
      n++
      const b = BORNES.find((x) => w >= x.min && w <= x.max) || BORNES[3]
      compte[b.label] = (compte[b.label] || 0) + 1
    }
    return {
      place: p, n,
      compte,
      pct: Object.fromEntries(BORNES.map((x) => [x.label,
        n ? Math.round((compte[x.label] || 0) / n * 100) : 0])),
    }
  })

  // ⭐ le podium : en combien de courses au moins UN des trois premiers
  //    sort de ce bloc. C'est la bonne lecture — « 3/2 = 150 % » ne veut rien dire.
  // ⭐ + détail P dans chaque bloc : P1 a fait combien de podiums ? P2 ? …
  //   (un même podium peut compter pour 2 P : on compte chaque P séparément).
  const podiumBloc = BORNES.map((b) => {
    let n = 0
    for (const pl of courses) {
      let trouve = false
      for (let i = 0; i < 3; i++) {
        const w = pl[i]
        if (w && w >= b.min && w <= b.max) { trouve = true; break }
      }
      if (trouve) n++
    }
    const detail = []
    for (let p = b.min; p <= Math.min(b.max, MAX); p++) {
      let c = 0
      for (const pl of courses) {
        for (let i = 0; i < 3; i++) {
          if (pl[i] === p) { c++; break }
        }
      }
      detail.push({ p, n: c })
    }
    return { id: b.label, n, pct: courses.length ? Math.round(n / courses.length * 100) : 0, detail }
  })

  return { nb: courses.length, parPlace, parGroupe, vainqueur, BORNES, parPosition, parPlaceBloc, podiumBloc, courses, detailCourses }
}

/**
 * ⭐ LA BONNE QUESTION : « si je prends P1, P6 et P9, qu'est-ce que ça vaut ? »
 *
 *   top5      : au moins un de mes chevaux dans les 5 premiers
 *   podium    : au moins un dans les 3 premiers
 *   moyen     : combien de mes chevaux dans le top 5, en moyenne
 *   gagnant   : combien de fois mon 1er choix tombe le premier
 *
 * `detailCourses` = [{ synthe, pl }] où pl = les 5 places de presse d'arrivée.
 */
export function combo(detailCourses, positions) {
  const set = new Set((positions || []).filter((p) => p >= 1 && p <= 20))
  if (!detailCourses?.length || !set.size) {
    return { n: 0, k: set.size, top5: 0, podium: 0, moyen: 0, gagnant: 0, combo: 0 }
  }
  let top5 = 0, podium = 0, total = 0, gagnant = 0
  const C = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return Math.round(r) }
  for (const c of detailCourses) {
    const touches = c.pl.filter((p) => set.has(p))
    if (touches.length) {
      top5++
      if (touches.some((p) => p <= 3)) podium++
      if (c.pl[0] && set.has(c.pl[0])) gagnant++
    }
    total += touches.length
  }
  const n = detailCourses.length
  return {
    n, k: set.size,
    top5: Math.round(top5 / n * 100),
    podium: Math.round(podium / n * 100),
    moyen: +(total / n).toFixed(2),
    gagnant: Math.round(gagnant / n * 100),
    combo: C(set.size, 5),
  }
}

/* ----------------------------------------------------------------- UI --- */

export function aujourdhui() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/* Bloc ajoute a src/lib/quinte.js : retrouver UNE course precise (R + C) sur casacourses. */
export const CCODE = {
  1: 'PLAT', 2: 'HAIE', 3: 'STEEPLECHASE', 4: 'ATT', 5: 'PLAT', 6: 'TROT',
}

/**
 * Retrouve la course (reunion, course) d une date sur pro.casacourses.com.
 * Indispensable : sans ce repli l'Article tombait toujours sur la course
 * de démo (Angers R1-C8). Bahja-TURF ne dépend d'aucun autre backend.
 *
 * fetchId a la forme 2026-10-04_R1_C5
 */
export async function chercherCourseCC(fetchId) {
  const m = String(fetchId).match(/(\d{4}-\d{2}-\d{2})_R(\d+)_C(\d+)/)
  if (!m) return null
  const [, date, rNum, cNum] = m

  const ms = await fetchProgrammeCC(date)
  // R1 = la 1re reunion PMU ; on prend celle qui porte ce numero
  const reunion = ms
    .filter((x) => (x.id || '').startsWith('pmu-'))
    .sort((a, b) => (a.reunion_code || 'R99').localeCompare(b.reunion_code || 'R99', 'en', { numeric: true }))
    .find((x) => String(x.reunion_code || '').replace(/\D/g, '') === String(rNum))
  if (!reunion) return null

  const race = (reunion.races || []).find(
    (x) => String(x.code || '').replace(/\D/g, '') === String(cNum)
  )
  if (!race) return null

  const det = await fetchRaceCC(race.id, date)
  return { ...det, meeting: { num: Number(rNum), hippodrome: reunion.track, country: reunion.country || 'FR' } }
}
