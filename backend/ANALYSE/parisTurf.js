/* =============================================================================
 * backend/ANALYSE/parisTurf.js — « TOUT SUR LE CHEVAL », pour TOUTES les courses.
 *
 * ⛔ CE FICHIER TOURNE DANS LE NAVIGATEUR. Aucun import node:*.
 *
 * ⭐ LA SOURCE
 *   L'API publique qui alimente paris-turf.com (l'app « ParisTurf Live » lit
 *   exactement la même) :
 *
 *       https://horse-racing-api.paris-turf.com/api/
 *
 *   Elle répond en JSON, en CORS OUVERT, à condition d'envoyer l'en-tête
 *   `X-API-KEY`. Cette clé n'est PAS un secret : elle est livrée dans le
 *   bundle public du site, sous le nom NEXT_PUBLIC_HORSERACINGV2_CSR_API_KEY.
 *   Mesuré le 17/10/2026 : `x-api-key` et `X-API-KEY` passent (200) ; la clé
 *   en query string (`?apiKey=`) renvoie 401.
 *
 *   ⚠ POURQUOI PAS UN PROXY — mesuré le 17/10/2026 :
 *     curl et Node reçoivent un **défi Cloudflare** (`Cf-Mitigated: challenge`,
 *     HTTP 403). Seul un navigateur qui exécute le JS passe. Un proxy serveur
 *     ne peut donc pas relayer cette API : l'appel se fait CÔTÉ CLIENT, comme
 *     casacourses. C'est aussi ce qui rend la page utilisable en production.
 *
 * ⭐ LES 4 APPELS
 *   programmeDuJour(date)  1 appel  → réunions + TOUTES leurs courses
 *   partantsDeCourse(id)   1 appel  → les partants d'une course
 *   carriereCheval(id)     1 appel  → TOUTES les courses passées d'un cheval
 *   identiteCheval(id)     1 appel  → père, mère, éleveur, propriétaire, robe…
 *   statsCheval(id)        1 appel  → musique + courses/victoires/places/gains
 *
 * ⭐ LA CORRESPONDANCE DES CHAMPS (vérifiée sur les tables du site, 17/10/2026)
 *
 *   | Affiché | Champ de l'API      | Preuve                                        |
 *   |---|---|---|
 *   | VH      | `handicapKg`        | Goliath d'Aunou : VH 66,5  = handicapKg 66.5  |
 *   | Poids   | `handicapTotalKg`   | idem : 72,5 kg = handicapTotalKg 72.5         |
 *   | Corde   | `draw`              | 0 = pas de corde (obstacle)                   |
 *   | Œillères| `hood`              | oui / non                                     |
 *   | Place   | `ranking`           | null tant que la course n'est pas courue      |
 *   | Cote    | `oddsSimpleGagnant` | PMU, PMU_FR, BET365, GENYBET, ZETURF…         |
 * ============================================================================= */

const BASE = 'https://horse-racing-api.paris-turf.com/api/'

/** Clé publique du site (NEXT_PUBLIC_… : publiée dans son bundle, pas un secret). */
export const CLE_PT = 'cd347f33-9dc3-4294-865e-f5d6ee7558ac'

/* ---------------------------------------------------------------- l'appel --- */

/** Un GET JSON, 3 essais. Un raté réseau isolé ne doit pas condamner la page. */
async function appel(chemin, essais = 3) {
  let dernier = 'inconnu'
  for (let i = 0; i < essais; i++) {
    try {
      const r = await fetch(BASE + chemin, {
        headers: { 'X-API-KEY': CLE_PT, Accept: 'application/json' },
        signal: AbortSignal.timeout(20000),
      })
      if (r.ok) return await r.json()
      dernier = 'HTTP ' + r.status
      /* 4xx = la requête est fautive : réessayer ne changera rien. */
      if (r.status >= 400 && r.status < 500) break
    } catch (e) {
      dernier = e && e.message ? e.message : String(e)
    }
    if (i < essais - 1) await new Promise((res) => setTimeout(res, 400 * (i + 1)))
  }
  throw new Error('paris-turf : ' + dernier)
}

/* ------------------------------------------------------------- le calendrier - */

/**
 * La plage UTC qui couvre UNE journée PARISIENNE.
 * « 2026-10-17 » → [« 2026-10-16T22:00:00.000Z », « 2026-10-17T21:59:59.999Z »]
 * (l'API filtre sur `datetime`, stocké en UTC).
 */
export function plageJourParis(date) {
  const [y, m, d] = String(date).split('-').map(Number)
  /* décalage de Paris à l'instant t (ms) : +2 h l'été, +1 h l'hiver */
  const offset = (ms) => {
    const f = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Paris', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
    const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms
  }
  /* minuit à Paris = minuit UTC − le décalage ; on itère une fois (l'heure d'été
   * peut changer dans l'intervalle, ce qui décale d'une heure). */
  let debut = Date.UTC(y, m - 1, d, 0, 0, 0)
  debut -= offset(debut)
  debut = Date.UTC(y, m - 1, d, 0, 0, 0) - offset(debut)
  const fin = debut + 86400000 - 1
  return [new Date(debut).toISOString(), new Date(fin).toISOString()]
}

/* -------------------------------------------------------------- les libellés - */

export const SPECIALITE_FR = {
  FLAT: 'Plat', HURDLE: 'Haies', STEEPLE: 'Steeple', CROSS: 'Cross',
  HARNESS: 'Attelé', MOUNTED: 'Monté',
  TROT: 'Trot', GALLOP: 'Galop',
}
export const SENS_FR = { LEFT: 'Gauche', RIGHT: 'Droite', STRAIGHT: 'Ligne droite' }
export const SEXE_FR = { H: 'Hongre', M: 'Mâle', F: 'Femelle', J: 'Jument', E: 'Entier' }

/** « GALLOP » + « HURDLE » → « Haies » (le plus précis des deux gagne). */
export function disciplineLisible(c) {
  const s = String(c && c.specialty || '').toUpperCase()
  if (SPECIALITE_FR[s]) return SPECIALITE_FR[s]
  const d = String(c && c.discipline || '').toUpperCase()
  return SPECIALITE_FR[d] || (c && c.discipline) || ''
}

const nomPersonne = (p) => {
  if (!p) return ''
  const n = [p.firstname, p.lastname].filter(Boolean).join(' ').trim()
  return n || ''
}

/** L'âge du cheval AU MOMENT de la course (pas aujourd'hui). */
export function ageAu(birth, quand) {
  if (!birth) return null
  const b = new Date(birth)
  const q = new Date(quand || Date.now())
  if (isNaN(b) || isNaN(q)) return null
  let a = q.getUTCFullYear() - b.getUTCFullYear()
  const dm = q.getUTCMonth() - b.getUTCMonth()
  if (dm < 0 || (dm === 0 && q.getUTCDate() < b.getUTCDate())) a--
  return a >= 0 && a < 40 ? a : null
}

/* ------------------------------------------------------------------ la cote -- */

/** La cote Simple Gagnant : PMU d'abord, sinon le premier opérateur qui en donne une. */
export function coteDe(runner) {
  const os = (runner && runner.oddsSimpleGagnant) || []
  const val = (o) => (o.value != null ? o.value : (o.referenceValue ? o.referenceValue.value : null))
  const recent = (lst) => lst.slice().sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
  const pmu = os.filter((o) => o.operator === 'PMU' || o.operator === 'PMU_FR')
  for (const o of recent(pmu.length ? pmu : os)) {
    const v = val(o)
    if (v != null && v > 1) return Math.round(v * 100) / 100
  }
  return null
}

/** La cote d'OUVERTURE (la première publiée) — pour voir le sens du marché. */
export function ouvertureDe(runner) {
  const os = (runner && runner.oddsSimpleGagnant) || []
  const vals = []
  for (const o of os) {
    const v = o.openingValue && o.openingValue.value != null ? o.openingValue.value : null
    const t = o.openingValue && o.openingValue.timestamp ? o.openingValue.timestamp : o.createdAt
    if (v != null && v > 1) vals.push({ v, t: String(t || '') })
  }
  if (!vals.length) return null
  vals.sort((a, b) => a.t.localeCompare(b.t))
  return Math.round(vals[0].v * 100) / 100
}

/* ---------------------------------------------------------------- programme -- */

function normaliserCourse(c, m) {
  return {
    id: c.id,
    num: c.number,
    nom: c.name || '',
    heure: c.datetime,
    discipline: c.discipline || '',
    specialite: c.specialty || '',
    libelle: disciplineLisible(c),
    distance: c.distance || null,
    sens: SENS_FR[c.direction] || '',
    direction: c.direction || '',
    surface: c.surface || '',
    terrain: c.going || '',
    categorie: c.caraList1 || '',
    details: c.caraList2 || '',
    conditions: c.textConditions || '',
    prix: c.totalPrize || null,
    nbPartants: c.numberOfInitialRunners || null,
    isTQQ: !!c.isTQQ,
    statut: c.status || '',
    arrivee: c.arrival || null,
    reunion: m ? m.pmuNumber : null,
    hippodrome: m ? m.name : '',
    meetingId: c.meetingId,
  }
}

/**
 * LE PROGRAMME D'UN JOUR — toutes les réunions, toutes leurs courses.
 * → [{ id, nom, pmu, heure, courses: [course…] }]
 */
export async function programmeDuJour(date) {
  const [debut, fin] = plageJourParis(date)
  const q = 'meetings?dateRange=' + encodeURIComponent(debut + '/' + fin) +
    '&include=races&include=races.arrival&order=asc&orderBy=datetime&skip=0'
  const j = await appel(q)
  const meetings = j.data || j || []
  return meetings
    .map((m) => ({
      id: m.id,
      nom: m.name || 'Hippodrome',
      pmu: m.pmuNumber != null ? m.pmuNumber : null,
      heure: m.datetime,
      courses: (m.races || []).map((c) => normaliserCourse(c, m)).sort((a, b) => (a.num || 0) - (b.num || 0)),
    }))
    .filter((m) => m.courses.length)
    /* l'ordre familier : R1, R2, R3… ; les réunions étrangères (sans n° PMU) à la fin. */
    .sort((a, b) => (a.pmu == null ? 99 : a.pmu) - (b.pmu == null ? 99 : b.pmu) || String(a.nom).localeCompare(String(b.nom)))
}

/* ----------------------------------------------------------------- partants -- */

const INC_PARTANT = 'include=horse&include=jockey&include=trainer&include=owner&include=breeder' +
  '&include=oddsSimpleGagnant&include=race&include=race.meeting'

/** Un partant → l'objet que la page affiche. */
export function normaliserPartant(r, course) {
  const d = r.horse || {}
  const c = r.race || course || {}
  return {
    id: r.id,
    horseId: r.horseId,
    raceId: r.raceId,
    num: r.saddle,                          // le numéro porté (N° Cas.)
    nom: d.name || '',
    sexe: d.sex || '',
    sexeLisible: SEXE_FR[d.sex] || d.sex || '',
    age: ageAu(d.birthDatetime, c.datetime),
    robe: d.coat || '',
    pays: String(d.country || '').trim(),
    poids: r.handicapTotalKg,               // ← « Poids »
    vh: r.handicapKg,                       // ← « VH »
    corde: r.draw ? r.draw : null,
    oeilleres: !!r.hood,                    // ← « Œil »
    blinkers: r.blinkers || '',
    blinkersLisible: BLINKERS_FR[String(r.blinkers || '').toUpperCase()] || r.blinkers || '',
    langue: !!r.tongueTie,
    shoeing: r.shoeing || '',
    fer: marquesFer(r.shoeing),
    ferTexte: texteFer(r.shoeing),
    replay: (r.race && r.race.replay && r.race.replay._videoLink) ? { video: r.race.replay._videoLink, image: r.race.replay._thumbnailLink || null } : null,
    jockey: nomPersonne(r.jockey),
    entraineur: nomPersonne(r.trainer),
    proprietaire: nomPersonne(r.owner),
    eleveur: nomPersonne(r.breeder),
    cote: coteDe(r),
    ouverture: ouvertureDe(r),
    rang: r.ranking,
    chrono: r.chrono,
    redkm: r.redkm,
    gains: r.earnings,
    marge: r.margin,
    commentaire: r.comment || '',
    nonPartant: r.isRunning === false,
    supplemente: !!r.isSupplemented,
    jockeyChange: !!r.jockeyChanged,
    casaque: r.coloursPng ? 'https://horse-racing-api.paris-turf.com' + r.coloursPng : null,
  }
}

/** Les partants d'une course, triés par NUMÉRO porté. */
export async function partantsDeCourse(raceId, course = null) {
  const j = await appel(`runners?raceId=${raceId}&${INC_PARTANT}&order=asc&orderBy=id&skip=0`)
  const rows = j.data || j || []
  return rows
    .map((r) => normaliserPartant(r, course))
    .sort((a, b) => (a.num || 99) - (b.num || 99))
}

/* ---------------------------------------------------------------- carrière -- */

const INC_CARRIERE = 'include=race&include=race.meeting&include=race.replay&include=jockey&include=trainer&include=oddsSimpleGagnant'

/**
 * Une catégorie LISIBLE ET COURTE, tirée des conditions brutes.
 * « Haies - L. (Listed Races) - Listed Race - Handicap divisé - première
 *   épreuve - Réf.: +6 +7 - 5 ans et plus »  →  « List · Hand »
 * (les deux mêmes mots que la fiche de l'app : « Hand · List ».)
 */
export function classeCourte(s) {
  const t = String(s || '')
  if (!t) return ''
  const tags = []
  const g = t.match(/groupe\s*(i{1,3}|iv|v|[1-5])\b/i)
  if (g) tags.push('Gr.' + g[1].toUpperCase())
  if (/\blisted\b|\(listed/i.test(t)) tags.push('List')
  const c = t.match(/classe\s*(\d)/i)
  if (c) tags.push('Cl.' + c[1])
  if (/handicap/i.test(t)) tags.push('Hand')
  else if (/maiden/i.test(t)) tags.push('Maid')
  if (/in[ée]dit/i.test(t)) tags.push('Inédit')
  if (/r[ée]clamer|claiming/i.test(t)) tags.push('Récl.')
  const vu = new Set()
  return tags.filter((x) => (vu.has(x) ? false : (vu.add(x), true))).join(' · ')
}

const TYPE_FR = {
  INEDIT: 'Inédit', HANDICAP: 'Hand', 'LISTED RACE': 'List', 'GROUP 1': 'Gr.1', 'GROUP 2': 'Gr.2', 'GROUP 3': 'Gr.3',
  'CLASSE 1': 'Cl.1', 'CLASSE 2': 'Cl.2', 'CLASSE 3': 'Cl.3', 'PRIX ORDINAIRE': '',
}

/* ------------------------------------------------------ le fer (Δ / D) ------- *
 * `shoeing` = DEUX lettres : [antérieurs][postérieurs]. La légende vient du
 * site lui-même (chunk matchem-component) : D = Déferré, F = Ferré, P = Plaqué.
 * L'app n'affiche QUE ce qui n'est pas « ferré » — c'est ce que fait marquesFer.
 * ------------------------------------------------------------------------- */
const FER_LABEL = { D: 'Déferré', F: 'Ferré', P: 'Plaqué' }

export function etatFer(shoeing) {
  const s = String(shoeing || '').toUpperCase()
  if (s.length < 2) return []
  return [
    { pied: 'antérieurs', code: s[0], label: FER_LABEL[s[0]] || s[0] },
    { pied: 'postérieurs', code: s[1], label: FER_LABEL[s[1]] || s[1] },
  ]
}

/** Les marques à MONTRER (on saute les pieds ferrés, comme l'app). */
export function marquesFer(shoeing) {
  return etatFer(shoeing).filter((x) => x.code !== 'F')
}

/** Le texte complet, pour l'infobulle. */
export function texteFer(shoeing) {
  const e = etatFer(shoeing)
  return e.length ? e.map((x) => `${x.pied} : ${x.label}`).join(' · ') : ''
}

/** Le libellé des œillères (blinkers / cheekpieces). */
export const BLINKERS_FR = { BLINKERS: 'Œillères', VISOR: 'Visor', CHEEKPIECES: 'Œillères australiennes' }

/** Le terrain ramené à une des familles de la méthode. */
export function terrainSimple(g) {
  const t = String(g || '').toLowerCase()
  if (!t) return ''
  if (/tr[eè]s souple/.test(t)) return 'Très souple'
  if (/souple/.test(t)) return 'Souple'
  if (/collant/.test(t)) return 'Collant'
  if (/tr[eè]s lourd/.test(t)) return 'Très lourd'
  if (/lourd/.test(t)) return 'Lourd'
  if (/bon/.test(t)) return 'Bon'
  if (/psf|sable|fibre|aw/.test(t)) return 'PSF'
  return g
}

/** Une ligne de carrière = une course passée, avec TOUT ce que la source en dit. */
export function normaliserLigneCarriere(r) {
  const c = r.race || {}
  const m = c.meeting || {}
  return {
    id: r.id,
    courseId: r.raceId,
    date: c.datetime,
    hippodrome: m.name || '',
    reunion: m.pmuNumber != null ? m.pmuNumber : null,
    discipline: c.discipline || '',
    specialite: c.specialty || '',
    libelle: disciplineLisible(c),
    distance: c.distance || null,
    sens: SENS_FR[c.direction] || '',
    direction: c.direction || '',
    surface: c.surface || '',
    terrain: c.going || '',
    categorie: c.caraList1 || '',
    categorieCourte: classeCourte(c.caraList1) || TYPE_FR[String(c.type || '').toUpperCase()] || '',
    classe: c.type || '',
    course: c.name || '',
    montant: c.totalPrize || null,
    nbPartants: c.numberOfInitialRunners || null,
    isTQQ: !!c.isTQQ,
    venueId: c.venueId || m.venueId || null,
    terrainFamille: terrainSimple(c.going),
    jockey: nomPersonne(r.jockey),
    entraineur: nomPersonne(r.trainer),
    poids: r.handicapTotalKg,
    vh: r.handicapKg,
    corde: r.draw ? r.draw : null,
    oeilleres: !!r.hood,
    blinkers: r.blinkers || '',
    blinkersLisible: BLINKERS_FR[String(r.blinkers || '').toUpperCase()] || r.blinkers || '',
    langue: !!r.tongueTie,
    shoeing: r.shoeing || '',
    fer: marquesFer(r.shoeing),
    ferTexte: texteFer(r.shoeing),
    rang: r.ranking,
    chrono: r.chrono,
    redkm: r.redkm,
    gains: r.earnings,
    marge: r.margin,
    cote: coteDe(r),
    commentaire: r.comment || '',
    nonPartant: r.isRunning === false,
    aVenir: !c.datetime ? false : (r.ranking == null && !c.winnerTime),
    replay: c.replay && c.replay._videoLink ? { video: c.replay._videoLink, image: c.replay._thumbnailLink || null } : null,
  }
}

/** TOUTE la carrière d'un cheval, de la plus récente à la plus ancienne. */
export async function carriereCheval(horseId, limite = 60) {
  const j = await appel(`runners?horseId=${horseId}&${INC_CARRIERE}&order=desc&orderBy=race.datetime&limit=${limite}&skip=0`)
  const rows = j.data || j || []
  return rows.map(normaliserLigneCarriere)
}

/* ---------------------------------------------------------- identité + stats - */

/** Père, mère, éleveur, propriétaire, entraîneur, robe, pays, naissance. */
export async function identiteCheval(horseId) {
  const j = await appel(`horses?id=${horseId}&include=sire&include=dam&include=breeders&include=currentTrainer&include=currentOwner&skip=0`)
  const h = (j.data || j || [])[0]
  if (!h) throw new Error('paris-turf : cheval introuvable')
  return {
    id: h.id,
    nom: h.name || '',
    sexe: h.sex || '',
    sexeLisible: SEXE_FR[h.sex] || h.sex || '',
    robe: h.coat || '',
    pays: String(h.country || '').trim(),
    race: h.breed || '',
    naissance: h.birthDatetime || null,
    discipline: h.discipline || '',
    castre: h.castrationDatetime || null,
    pere: h.sire ? h.sire.name : '',
    mere: h.dam ? h.dam.name : '',
    pereDeMere: h.dam && h.dam.sire ? h.dam.sire.name : '',
    eleveur: h.breeders && h.breeders[0] ? nomPersonne(h.breeders[0]) : '',
    entraineur: nomPersonne(h.currentTrainer),
    proprietaire: nomPersonne(h.currentOwner),
    casaque: h.coloursPng ? 'https://horse-racing-api.paris-turf.com' + h.coloursPng : null,
  }
}

/** Musique + compteurs (courses, victoires, places, gains, record). */
export async function statsCheval(horseId) {
  const j = await appel(`stats/entity-stats?entityId=${horseId}&entityType=horse&includesRecords=true&limit=20`)
  const s = j.stats || {}
  return {
    musique: j.music || '',
    nbCourses: s.nbRaces ?? null,
    nbVictoires: s.nbWins ?? null,
    nbPlaces: s.nbPlaced ?? null,
    pctVictoire: s.winPercentage ?? null,
    pctPlace: s.placedPercentage ?? null,
    meilleurChrono: s.bestChrono ?? null,
    derniereCourse: s.lastRaceDate ?? null,
    derniereVictoire: s.lastWinDate ?? null,
    gains: s.totalEarnings ?? null,
    gainsVictoires: s.winningEarnings ?? null,
  }
}
