/* =============================================================================
 * backend/DNA/morocco.js — LA RÉUNION DU MAROC (SOREC, e-sorec.ma)
 *
 * ⛔ CE FICHIER TOURNE DANS LE NAVIGATEUR. Aucun import `node:*`.
 *   Il est aussi importé par `tools/maroc.mjs` (Node 18+) : c'est la MÊME
 *   lecture, avec `reglerSource('https://e-sorec.ma/api')`.
 *
 * POURQUOI IL EXISTE
 *   Le programme PMU ne contient QUE les réunions françaises : le 23/10/2026
 *   Casablanca (Anfa) n'y figure pas, alors qu'elle court. La page `/dna`
 *   affichait donc « 5 réunions » et le Maroc avait disparu — alors que la
 *   copie autonome (`dna-course\`) l'affichait, elle, depuis la SOREC.
 *
 *   Ce module rend la réunion marocaine dans la MÊME forme qu'une réunion PMU
 *   (`fetchMeetings` de `donnees.js` la concatène, `Programme.jsx` l'affiche
 *   sans rien savoir de son origine). L'écran n'est pas modifié.
 *
 * LA SOURCE — e-sorec.ma, le site officiel de la SOREC
 *   `GET /api/meetings?date=YYYY-MM-DD`
 *        → `content.events[]` : `track`, `country`, `code` (« R9 »), `races[]`
 *          avec `id`, `code` (« C1 »), `name`, `type` (T plat · H trot ·
 *          S steeple · A haies · M monté), `distance`, `starters`, `timestamp`
 *          (ms), `status` (« OFFICIAL »), `bets[].code`, `weather_temp`.
 *   `GET /api/races/{id}`
 *        → `content.runners[]` : `startnr`, `horse.name`, `odd` (la cote en
 *          centièmes : 1920 = 19,20), `startodd` (l'ouverture), `weight`,
 *          `startbox` (la corde), `shortperformance` (la musique), `rider.name`,
 *          `horse.trainer`, `finishorder`.
 *
 * ⚠ TROIS CHEMINS, DANS CET ORDRE
 *
 *   ① EN DIRECT par `/api/ma` (le relais : middleware Vite en local, fonction
 *      edge `api/ma.js` en ligne). e-sorec n'envoie AUCUN en-tête CORS
 *      (mesuré le 23/10/2026) : sans relais, le navigateur ne peut pas lire.
 *
 *   ② LE FICHIER `/data/maroc.json` — écrit par `tools/maroc.mjs` (le job
 *      quotidien, qui tourne sur le poste, au Maroc). C'est le repli DÉCISIF :
 *      e-sorec est INJOIGNABLE depuis Vercel (504 mesuré le 23/10/2026 en
 *      runtime edge, 502 en Node, alors que `/api/gz` répondait 200 dans le
 *      même run). Sans ce fichier, la réunion marocaine n'existerait pas en
 *      ligne. Le fichier est « frais » 3 h : au-delà, on retente le direct.
 *
 *   ③ RIEN — une panne n'est jamais une page cassée : le programme PMU
 *      s'affiche seul, exactement comme avant.
 *
 * ⚠ LA NUMÉROTATION
 *   Le PMU numérote ses réunions R1 → Rn. La SOREC numérote les siennes à part
 *   (`code: "R9"` pour Anfa). Pour qu'il n'y ait jamais de collision — R9 peut
 *   être un PMU un autre jour — le meeting du Maroc porte `100 + index`
 *   (`OFFSET`). L'écran affiche « MA » dans la pastille (voir `Programme.jsx`).
 * ========================================================================== */

/* Le relais (navigateur) — remplacé par l'origine nue dans `tools/maroc.mjs`. */
let BASE = '/api/ma'
let FICHIER = '/data/maroc.json'

/** La source à interroger. `tools/maroc.mjs` passe `https://e-sorec.ma`
 *  (l'origine NUE : les chemins commencent par `/api/…`) ; un test peut
 *  passer aussi le fichier de secours. */
export function reglerSource(base, fichier) {
  BASE = String(base || '/api/ma').replace(/\/+$/, '')
  if (fichier) FICHIER = String(fichier)
}

const OFFSET = 100
const TTL = 120000      /* 2 min : le programme d'une réunion ne bouge pas vite */
const FRAIS = 3 * 3600e3 /* 3 h : au-delà, le fichier n'est plus « le jour même » */
const DELAI_DIRECT = 5000 /* e-sorec injoignable = 5 s perdues, pas 30 */
const DELAI_RETENTE = 4000 /* la 2ᵉ tentative, plus courte : on a déjà attendu */

/* Les hippodromes marocains. `country` de e-sorec vaut « MAR » pour Anfa, mais
 * certaines réunions arrivent avec un pays vide : on reconnaît alors la piste. */
const PISTES_MA = new Set([
  'anfa', 'casablanca', 'settat', 'marrakech', 'khemisset', 'el jadida',
  'meknes', 'rabat', 'sale', 'fes', 'tanger', 'agadir', 'oujda',
  'beni mellal', 'mohammedia', 'safi', 'essaouira', 'tetouan', 'nador',
  'berrechid', 'dakhla', 'laayoune', 'sidi kacem', 'sidi slimane',
])

/* Le nom que le parieur lit. Anfa EST l'hippodrome de Casablanca : on affiche
 * « Casablanca », le mot que le parieur marocain emploie. */
const NOMS_PISTES = { anfa: 'Casablanca' }

/* `bets[].code` de e-sorec → la clé du catalogue de CE site (`src/Paris.jsx`).
 * Les paris sans pastille (Klic 1..5, Multi, 2sur4) sont ignorés : le
 * catalogue du site n'en a pas, et la méthode n'en parle pas. */
const PASTILLES = {
  'simple gagnant': 'simple-gagnant',
  'simple place': 'simple-place',
  'jumele gagnant': 'jumele-gagnant',
  'jumele place': 'jumele-place',
  'tierce': 'tierce',
  'quarte': 'quarte',
  'quarte+': 'quarte',
  'quinte': 'quinte',
  'quinte+': 'quinte',
}

/* L'ordre d'affichage — le même que `ORDRE_PARIS` de `src/Paris.jsx`. */
const ORDRE = ['simple-gagnant', 'simple-place', 'jumele-gagnant', 'jumele-place',
  'tierce', 'quarte', 'quinte']

/* `type` de e-sorec → la famille que le moteur range dans son archive
 * (`store.disc_set` de RACE_DNA_ENGINE). */
const DISCIPLINES = {
  T: 'PLAT', P: 'PLAT', H: 'ATTELE', M: 'MONTE',
  S: 'STEEPLE', A: 'HAIE', C: 'CROSS',
}
const SPECIALITES = {
  T: 'GALOP', P: 'GALOP', H: 'TROT', M: 'TROT',
  S: 'OBSTACLE', A: 'OBSTACLE', C: 'OBSTACLE',
}

const METEO = {
  '01': 'Dégagé', '02': 'Peu nuageux', '03': 'Nuageux', '04': 'Très nuageux',
  '09': 'Averses', '10': 'Pluie', '11': 'Orage', '13': 'Neige', '50': 'Brouillard',
}

/* ------------------------------------------------------------------ outils -- */

const cache = new Map()

function garde(cle) {
  const v = cache.get(cle)
  if (v && Date.now() - v.ts < TTL) return v.data
  return null
}

function pose(cle, data) {
  cache.set(cle, { ts: Date.now(), data })
  return data
}

/** Un GET JSON sur la SOREC (ou sur le relais). Jamais plus de `DELAI_DIRECT`. */
async function lire(chemin, delai = DELAI_DIRECT) {
  const r = await fetch(BASE + chemin, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(delai),
  })
  if (!r.ok) throw new Error(`SOREC ${r.status}`)
  return r.json()
}

/** Une pause courte — e-sorec limite le débit quand on enchaîne les appels. */
const pause = (ms) => new Promise((r) => setTimeout(r, ms))

/** « C7 » → 7 · « R9 » → 9 */
function numero(code) {
  const m = /\d+/.exec(String(code || ''))
  return m ? Number(m[0]) : 0
}

/** Le `timestamp` de e-sorec est en millisecondes ; on accepte les secondes. */
function millis(v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return n < 10000000000 ? n * 1000 : n
}

/** e-sorec publie la cote en centièmes : 1920 = 19,20 · 150 = 1,50. */
function cote(v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return n >= 100 ? Math.round(n) / 100 : Math.round(n * 100) / 100
}

function nombre(v) {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(',', '.').trim())
  return Number.isFinite(n) ? n : null
}

function estMaroc(e) {
  const pays = String(e?.country || '').trim().toUpperCase()
  if (pays.startsWith('MA')) return true
  return PISTES_MA.has(String(e?.track || '').split(/\s+/).join(' ').toLowerCase())
}

function nomPiste(brut) {
  const nom = String(brut || '').split(/\s+/).join(' ')
  const connu = NOMS_PISTES[nom.toLowerCase()]
  if (connu) return connu
  return /[A-ZÀ-Ý]{2}/.test(nom) && nom === nom.toUpperCase()
    ? nom.toLowerCase().replace(/(^|[\s-])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase())
    : nom
}

function pastilles(race) {
  const trouvees = []
  for (const b of race?.bets || []) {
    const brut = String(b?.code || b?.title || '').trim().toLowerCase()
    const cle = PASTILLES[brut]
    if (cle && !trouvees.includes(cle)) trouvees.push(cle)
  }
  return ORDRE.filter((k) => trouvees.includes(k))
}

function meteo(race) {
  if (!race || race.weather_temp == null) return null
  let temp = Number(race.weather_temp)
  temp = Number.isFinite(temp) ? Math.round(temp) : null
  const code = String(race.weather_icon || '').slice(0, 2)
  return { temp, label: METEO[code] || null, code: code || null }
}

function statut(race) {
  const s = String(race?.status || '').toUpperCase()
  if (/OFFICIAL|DEFINITIF/.test(s)) return { statut: 'DEFINITIF', definitif: true }
  if (/FINISH|ARRIV/.test(s)) return { statut: 'ARRIVEE' }
  if (/RUNNING|LIVE|EN_COURS/.test(s)) return { statut: 'EN_COURS' }
  /* ⭐ 25/10/2026 — « CLOSED » veut dire « les ENGAGEMENTS sont clos », pas
   * « la course court ». La carte de DEMAIN (Anfa, 8 courses) arrive en
   * `CLOSED` : l'écran affichait « En cours » sur une course du lendemain.
   * Ce n'est « en cours » que si l'heure de départ est passée. */
  if (/CLOSED|CLOSING/.test(s)) {
    const t = millis(race?.timestamp)
    return { statut: t != null && Date.now() >= t ? 'EN_COURS' : 'PROGRAMMEE' }
  }
  return { statut: s || 'PROGRAMMEE' }
}

/* --------------------------------------------------------------- programme -- */

/** Une course de e-sorec → une course de la page (mêmes champs qu'au PMU). */
function versCourse(race, reunion, date) {
  const num = numero(race?.code)
  const pp = pastilles(race)
  const st = statut(race)
  return {
    id: null,                    /* pas d'identifiant ParisTurf : voir `sorecId` */
    sorecId: race?.id ?? null,   /* l'identifiant SOREC de la course */
    num,
    nom: race?.name || '',
    libelle: race?.name || '',
    discipline: DISCIPLINES[String(race?.type || '').toUpperCase()] || '',
    specialite: SPECIALITES[String(race?.type || '').toUpperCase()] || '',
    distance: race?.distance ?? null,
    surface: '',
    terrain: race?.trackcondition || '',
    runners: race?.starters ?? null,
    /* ⭐ 25/10/2026 — L'HEURE ÉCRITE PAR LA SOREC, telle quelle.
     *
     *  `race.time` = « 2026-10-26 12:03:00 », l'heure LOCALE du Maroc. On la
     *  garde : c'est la seule qui ne dépende pas de la base de fuseaux du
     *  navigateur. Mesuré le 25/10/2026 : `Africa/Casablanca` dans Chrome
     *  rendait 11:03 pour une course que la SOREC annonce à 12:03 (le Maroc
     *  est à UTC+1 depuis 2018). L'écran affichait donc une heure fausse.
     *  → `Programme.jsx` préfère ce champ à tout calcul (`heureLocale`). */
    heure: String(race?.time || '').slice(11, 16),
    time: millis(race?.timestamp),
    date,
    reunion,
    types_pari: pp,
    quinte: pp.includes('quinte'),
    statut: st.statut,
    definitif: st.definitif || false,
    prix: race?.purse ?? null,
  }
}

/** Les réunions d'un `events[]` de e-sorec → la forme des réunions PMU.
 *
 *  ⚠ 23/10/2026 — e-sorec IGNORE `?date=` : il rend toujours la journée qu'il
 *  considère comme courante (mesuré : `date=2026-10-22` … `2026-10-25`
 *  renvoient tous la carte du 24/10). On filtre donc sur `event.date` :
 *  sans ça, la page afficherait les courses de DEMAIN sous la date d'hier. */
function versMeetings(events, date) {
  const meetings = []
  let idx = 0
  for (const e of events || []) {
    if (!estMaroc(e)) continue
    if (e?.date && String(e.date).slice(0, 10) !== String(date).slice(0, 10)) continue
    const num = OFFSET + idx
    idx += 1
    const courses = (e?.races || [])
      .map((r) => versCourse(r, num, date))
      .filter((c) => c.num > 0)
      .sort((a, b) => a.num - b.num)
    if (!courses.length) continue
    const premier = courses.map((c) => c.time).filter(Boolean).sort((a, b) => a - b)[0]
    meetings.push({
      num,
      hippodrome: nomPiste(e?.track),
      country: 'MA',
      /* « R9 » quand la SOREC le donne, « SOREC » sinon (Settat arrive avec
       * `code: "R"`, sans numéro : on n'affiche pas « réunion R »). */
      sorec: /\d/.test(String(e?.code || '')) ? String(e.code) : 'SOREC',
      meteo: meteo((e?.races || [])[0]),
      courses,
      start_time: premier || null,
    })
  }
  return meetings
}

/* ------------------------------------------------- le fichier de secours -- */

/** `/data/maroc.json` — lu une fois par chargement de page. */
let fichierMemo
async function fichier() {
  if (fichierMemo !== undefined) return fichierMemo
  fichierMemo = null
  try {
    const r = await fetch(FICHIER, { headers: { Accept: 'application/json' }, cache: 'no-store' })
    if (r.ok) {
      const j = await r.json()
      if (j && Array.isArray(j.meetings)) fichierMemo = j
    }
  } catch (e) { /* pas de fichier : on reste sur le direct */ }
  return fichierMemo
}

/** ⭐ `/data/maroc-jours.json` — L'ARCHIVE PAR DATE (25/10/2026).
 *
 *  `maroc.json` ne porte que la journée du run. Sur `/dna`, dès qu'on changeait
 *  de date, la réunion marocaine DISPARAISSAIT — c'était le seul symptôme, et
 *  il était invisible : la page n'affichait simplement plus le Maroc.
 *  `tools/maroc.mjs` garde maintenant les 40 derniers jours ici. */
let joursMemo
async function jours() {
  if (joursMemo !== undefined) return joursMemo
  joursMemo = null
  try {
    const r = await fetch('/data/maroc-jours.json', { headers: { Accept: 'application/json' }, cache: 'no-store' })
    if (r.ok) {
      const j = await r.json()
      if (j && j.jours && typeof j.jours === 'object') joursMemo = j.jours
    }
  } catch (e) { /* pas d'archive : le fichier du jour reste la seule source */ }
  return joursMemo
}

/** Le direct est-il tombé ? (une fois par chargement de page)
 *
 *  ⚠ Mesuré le 23/10/2026 : e-sorec répond au poste et refuse Vercel. Sans ce
 *  drapeau, la page en ligne paierait 5 s de délai à CHAQUE course cliquée.
 *  Le premier échec le lève pour de bon ; le fichier prend le relais. */
let directKO = false

/** ⭐ 27/10/2026 — OUBLIER CE QUI A ÉTÉ LU.
 *
 *  `/dna` se rafraîchit maintenant à l'heure pile tant que la réunion
 *  marocaine n'est pas là. Or les deux fichiers (`maroc.json`,
 *  `maroc-jours.json`) et le programme sont gardés EN MÉMOIRE pour la durée de
 *  la page : sans cet oubli, le rafraîchissement redemandait les mêmes données
 *  et le Maroc ne pouvait apparaître qu'en rechargeant l'onglet.
 *
 *  `directKO` n'est PAS remis à zéro : le direct est mort depuis Vercel, on ne
 *  repaye pas 10 s d'attente à chaque heure. */
export function oublier() {
  fichierMemo = undefined
  joursMemo = undefined
  cache.clear()
}

/** Combien de fois on a retenté le direct pour une course SANS cote (plafond :
 *  2 par session — voir `courseSorec`). */
let essaisSansCote = 0
const MAX_ESSAIS_SANS_COTE = 2

/** Le direct, une seule fois, avec un délai court.
 *
 *  ⚠ `-v2` EST OBLIGATOIRE (mesuré le 25/10/2026) : `/api/meetings?date=…`
 *  IGNORE le paramètre et rend toujours la journée qu'il croit courante —
 *  d'où une réunion marocaine qui n'existait que pour AUJOURD'HUI et
 *  disparaissait dès qu'on changeait de date sur `/dna`.
 *
 *      2026-10-23 → meetings       : 10 événements datés du 25/10   ✗
 *      2026-10-23 → meetings-v2/…  : 10 événements datés du 23/10   ✓
 */
async function direct(date) {
  /* ⚠ DEUX TENTATIVES. Mesuré le 25/10/2026 : e-sorec rend parfois
   * ECONNRESET sur une connexion sur deux. Avec une seule tentative, ce
   * hasard faisait DISPARAÎTRE la réunion marocaine de la page pour toute la
   * session (`directKO`) — exactement le symptôme « le Maroc a disparu ».
   * La 2ᵉ tentative est plus courte : on a déjà attendu 5 s. */
  for (let i = 0; i < 2; i++) {
    try {
      const data = await lire('/api/meetings-v2/' + encodeURIComponent(date), i === 0 ? DELAI_DIRECT : DELAI_RETENTE)
      return versMeetings(data?.content?.events, date)
    } catch (e) { /* on retente une fois, puis on renonce */ }
  }
  directKO = true
  return []
}

/**
 * Les réunions marocaines du jour, dans la forme des réunions PMU.
 * → [{ num (100+i), hippodrome, country: 'MA', sorec, meteo, courses: [...] }]
 */
export async function programmeSorec(date) {
  if (!date) return []
  const cle = 'sorec:' + date
  const deja = garde(cle)
  if (deja) return deja

  const f = await fichier()
  const arch = await jours()

  /* ② le fichier du jour — ② bis l'archive par date (nouveau, 25/10/2026) */
  let meme = null
  if (f && String(f.date) === String(date) && (f.meetings || []).length) {
    meme = f
  } else if (arch && Array.isArray(arch[date]) && arch[date].length) {
    meme = { date, meetings: arch[date], collecteLe: null }
  }
  const frais = meme && meme.collecteLe && Date.now() - Date.parse(meme.collecteLe) < FRAIS
  /* fichier du jour encore frais → on s'en sert (instantané, et c'est le SEUL
   * chemin qui marche depuis Vercel) ; sinon on retente le direct. */
  if (frais) return pose(cle, meme.meetings)
  if (directKO) return pose(cle, meme ? meme.meetings : [])

  const live = await direct(date)
  if (live.length) return pose(cle, live)
  return pose(cle, meme ? meme.meetings : [])
}

/* ----------------------------------------------------------------- partants -- */

/** `content` d'une course e-sorec → les partants de la page. */
function partants(contenu) {
  return (contenu?.runners || [])
    .filter((x) => x && x.status !== false && x.startnr != null)
    .map((x) => {
      const horse = x.horse || {}
      /* `odd` = la cote du moment (pari-mutuel réel, relevé à l'instant) ;
       * `startodd` = la grille d'ouverture.
       *
       * ⭐ 27/10/2026 — `startodd` SERT DE COTE QUAND `odd` MANQUE.
       *
       *  Ce qui était écrit ici (« on ne s'en sert jamais comme cote ») a été
       *  démenti par l'utilisateur : sur e-sorec.ma, la colonne « Cotes » de la
       *  course R9C9 de Khemisset affichait déjà 24 · 6,7 · 12 · 11 … à 06 h,
       *  alors que notre page annonçait « la SOREC ne publie pas de cote avant
       *  le départ ». C'était faux : `odd` (le pari-mutuel) n'est rempli qu'à
       *  l'ouverture des paris, mais `startodd` est publié dès le matin.
       *
       *  On s'en sert donc en repli, et on le DIT (`coteOuverture`) pour que
       *  l'écran ne fasse pas passer une grille d'ouverture pour un marché.
       *  Sans ce repli, le moteur — ancré sur le marché — rendait quatre zones
       *  vides sur une course qui a bel et bien des cotes. Dès que `odd` arrive,
       *  c'est lui qui reprend la main : le direct, puis le fichier du job. */
      /* ⚠ LE PLANCHER 1,1 N'EST PAS UNE COTE. Mesuré sur les 9 journées de
       * `maroc-jours.json` : 74 partants sur 808 ont `startodd` = 110 (soit
       * 1,10) et leur cote finale vaut 14,3 en moyenne — ce sont des Outsiders,
       * pas des favoris. 110 est la valeur par défaut de la grille SOREC, pas
       * un rapport. On la traite comme absente, sinon elle fabriquerait un
       * faux favori dans chaque course marocaine. */
      const cot = cote(x.odd)
      const brutOuv = Number(x.startodd)
      const ouv = Number.isFinite(brutOuv) && brutOuv > 110 ? cote(brutOuv) : null
      const cotRetenue = cot != null ? cot : ouv
      return {
        num: Number(x.startnr),
        horse: horse.name || '',
        cote: cotRetenue,
        cote_pmu: cotRetenue,
        ouverture: ouv,
        coteOuverture: cot == null && ouv != null,
        age: horse.age ?? null,
        sexe: horse.gender || '',
        poids: nombre(x.weight),
        corde: x.startbox ?? null,
        jockey: (x.rider || {}).name || '',
        entraineur: horse.trainer || '',
        musique: x.shortperformance || '',
        ordreArrivee: x.finishorder ?? null,
        nonPartant: false,
      }
    })
    .sort((a, b) => a.num - b.num)
}

/**
 * Une course marocaine AVEC ses partants : musique, cote, corde, arrivée.
 * → { course, participants } | null
 *
 * ⚠ C'est ici que le Maroc est PLUS riche que la source de chevaux française :
 *   `odd` donne la cote du marché, `startodd` l'ouverture, `startbox` la corde
 *   et `shortperformance` la musique — les quatre champs que le moteur lit.
 */
/** ⭐ 27/10/2026 — LE REPLI « GRILLE D'OUVERTURE », APPLIQUÉ AUSSI À LA LECTURE.
 *
 *  `partants()` le fait déjà pour la SOREC en direct. Mais les fichiers écrits
 *  avant ce changement (`maroc.json`, et surtout l'archive `maroc-jours.json`
 *  qui garde 10 jours de courses) n'ont pas le drapeau — et leurs `cote` valent
 *  `null` alors que leur `ouverture` est remplie. Sans ce passage, une course
 *  d'hier resterait à quatre zones vides.
 *
 *  Le pari-mutuel réel (`cote` venue de `odd`) n'est JAMAIS écrasé. */
function avecOuverture(runners) {
  if (!Array.isArray(runners)) return runners
  return runners.map((p) => (
    p && p.cote == null && p.ouverture != null && p.ouverture > 1.1
      ? { ...p, cote: p.ouverture, cote_pmu: p.ouverture, coteOuverture: true }
      : p
  ))
}

export async function courseSorec(date, rnum, cnum) {
  const meetings = await programmeSorec(date)
  const meeting = meetings.find((m) => m.num === Number(rnum))
  if (!meeting) return null
  const c = meeting.courses.find((x) => x.num === Number(cnum))
  if (!c) return null

  const entete = {
    ...c,
    date,
    reunion: Number(rnum),
    course: Number(cnum),
    hippodrome: meeting.hippodrome,
  }

  /* ① LE DIRECT D'ABORD — c'est lui qui donne les COTES DU MOMENT.
   *
   *    ⚠ Le fichier du job a les cotes de son run (08 h 45 / 20 h 30). Sur une
   *    course du jour, c'est périmé — et le moteur est ANCRÉ sur le marché : de
   *    vieilles cotes, ce sont de mauvaises bandes. Quand le direct répond, il
   *    gagne donc sur le fichier, même quand le fichier est frais.
   *
   *    En ligne (Vercel), e-sorec ne répond pas : `directKO` se lève au premier
   *    échec et le fichier prend le relais — sans repayer le délai à chaque
   *    course.
   *
   *    ⭐ 25/10/2026 — SAUF SI LE FICHIER N'A AUCUNE COTE. Une course sans cote,
   *    ce sont quatre zones vides : 5 s perdues valent mieux que ça. On retente
   *    alors le direct, mais deux fois par session au maximum (`essaisSansCote`),
   *    sinon une page en ligne paierait 5 s à chaque course cliquée. */
  const duFichier = Array.isArray(c.runners) && c.runners.length ? c.runners : null
  const sansCote = !duFichier || !duFichier.some((p) => p.cote != null)
  const retenter = !directKO || (sansCote && essaisSansCote < MAX_ESSAIS_SANS_COTE)
  if (c.sorecId && retenter) {
    if (directKO) essaisSansCote += 1
    const live = await partantsDirects(c.sorecId)
    if (live && live.length) {
      return { course: { ...entete, runners: live.length }, participants: live }
    }
  }

  /* ② LES PARTANTS DU FICHIER (repli hors-ligne, ou SOREC muette) */
  if (Array.isArray(c.runners) && c.runners.length) {
    return { course: { ...entete, runners: c.runners.length }, participants: avecOuverture(c.runners) }
  }

  return null
}

/** Les partants d'une course SOREC, en direct. `null` si la SOREC ne répond pas
 *  (et alors `directKO` est levé pour tout le reste de la session).
 *
 *  ⚠ Deux tentatives : e-sorec coupe parfois la connexion (ECONNRESET mesuré
 *  le 25/10/2026). Un échec isolé ne doit pas vider la course. */
async function partantsDirects(sorecId) {
  const cle = 'sorec:race:' + sorecId
  let data = garde(cle)
  if (!data) {
    for (let i = 0; i < 2; i++) {
      try {
        data = await lire('/api/races/' + encodeURIComponent(sorecId), i === 0 ? DELAI_DIRECT : DELAI_RETENTE)
        break
      } catch (e) {
        if (i === 1) { directKO = true; return null }
      }
    }
    if (data) pose(cle, data)
  }
  const p = partants(data?.content)
  return p.length ? p : null
}

/* ---------------------------------------------------------- le collecteur -- */

/**
 * LE FICHIER DU JOB — `tools/maroc.mjs` écrit son résultat dans
 * `data/maroc.json` et `public/data/maroc.json`.
 *
 *   node tools\maroc.mjs [--date=YYYY-MM-DD]
 *
 * ⚠ Il tourne sur le POSTE (au Maroc) : c'est le seul endroit d'où e-sorec
 *   répond. Le fichier est ce qui rend la réunion visible en ligne.
 */
export async function collecter(date) {
  let data
  try {
    data = await lire('/api/meetings-v2/' + encodeURIComponent(date), 20000)
  } catch (e) {
    throw new Error('SOREC injoignable — ' + (e && e.message ? e.message : e))
  }
  const meetings = versMeetings(data?.content?.events, date)
  if (!meetings.length) throw new Error('aucune réunion marocaine dans la réponse SOREC')

  /* ⚠ TROIS TENTATIVES PAR COURSE (25/10/2026). Mesuré en collectant la carte
   *   du 26/10 : sur 8 courses, la C1 est revenue VIDE et la C2 avec 4 partants
   *   sur 6 — e-sorec limite le débit quand on enchaîne les appels. Un relevé
   *   partiel est pire qu'un relevé absent : la page croit la course connue et
   *   n'affiche que la moitié du peloton. On retente donc, avec une pause, et
   *   on garde le meilleur résultat obtenu. */
  for (const m of meetings) {
    for (const c of m.courses) {
      if (!c.sorecId) continue
      const attendu = Number(c.runners) || 0   /* `starters` avant écrasement */
      let meilleur = []
      for (let essai = 0; essai < 3; essai++) {
        if (essai) await pause(1200)
        try {
          const d = await lire('/api/races/' + encodeURIComponent(c.sorecId), 15000)
          const p = partants(d?.content)
          if (p.length > meilleur.length) meilleur = p
          if (meilleur.length && (!attendu || meilleur.length >= attendu)) break
        } catch (e) { /* on retente */ }
      }
      c.runners = meilleur
    }
  }
  return {
    date,
    collecteLe: new Date().toISOString(),
    source: 'e-sorec.ma',
    reunions: meetings.length,
    courses: meetings.reduce((n, m) => n + m.courses.length, 0),
    meetings,
  }
}

export { OFFSET as MAROC_OFFSET }
