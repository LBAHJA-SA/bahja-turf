/* =============================================================================
 * src/temps.js — L'HEURE SUR LE SITE : TOUT EN GMT (18/10/2026)
 *
 * ⭐ DEMANDE DE L'UTILISATEUR : « اجعل كل التوقيتات تعرض بتوقيت GMT » — toutes les
 *    heures affichées le sont en GMT, et elles le DISENT (« 13:15 GMT »).
 *    Même règle que le job quotidien, qui l'applique depuis le 09/10/2026.
 *
 * ⚠ TROIS NATURES D'HEURE — les confondre, c'est se tromper d'une ou deux heures :
 *
 *   ① UN INSTANT (une date ISO 8601 qui PORTE son décalage) :
 *      « 2026-10-16T13:58:00+02:00 », « 2026-10-03T03:02:51.835Z », un timestamp.
 *      Il n'y a rien à deviner : on lit en UTC.
 *      ⛔ Le piège qui était en place : `slice(11, 16)` sur « …T13:58:00+02:00 »
 *         rend « 13:58 » — c'est l'heure de PARIS qu'on étiquetait GMT, fausse
 *         de 2 h en été. Tout passe désormais par ce fichier.
 *
 *   ② UNE HEURE MURALE FRANÇAISE (« 15:15 »), sans fuseau : le programme
 *      d'Equidia, de turf-france, de reu.php, de PMU. C'est l'heure de PARIS :
 *      on la convertit AVEC le calendrier (`parisVersGMT`, heure d'été comprise).
 *
 *   ③ UNE HEURE MURALE MAROCAINE (« 14:15 ») : casacourses est un site
 *      marocain. Il annonce 14:15 la course que Paris annonce à 15:15.
 *      Le Maroc est à UTC+1 FIXE : on retire une heure, on ne passe PAS par
 *      Paris (en hiver les deux valent UTC+1, le décalage serait alors nul).
 *      Mesuré le 18/10/2026 sur le Quinté de ParisLongchamp :
 *        casacourses 14:15 · Equidia 15:15 (`real_heure_course`
 *        = `2026-10-18T15:15:00+02:00`) → 13:15 GMT, les deux.
 *
 * Aucune donnée ne circule ici : ce fichier ne fait que lire une date.
 * ========================================================================== */

const P2 = (x) => String(x).padStart(2, '0')
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** La chaîne (ISO, timestamp, Date) → une Date, ou null si illisible. */
function enDate(instant) {
  if (instant == null || instant === '') return null
  if (instant instanceof Date) return Number.isNaN(instant.getTime()) ? null : instant
  if (typeof instant === 'number') {
    /* ⚠ un timestamp peut être en SECONDES (10 chiffres) ou en ms (13) */
    const d = new Date(Math.abs(instant) < 1e11 ? instant * 1000 : instant)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const brut = String(instant).trim()
  if (/^\d{10,}$/.test(brut)) {
    const n = Number(brut)
    const d = new Date(brut.length > 10 ? n : n * 1000)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(brut)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Un instant → « 05:12 » (heure GMT). '' si illisible. */
export function hhmmGMT(instant) {
  const d = enDate(instant)
  if (!d) return ''
  return P2(d.getUTCHours()) + ':' + P2(d.getUTCMinutes())
}

/** Un instant → « 05:12 GMT ». */
export function heureGMT(instant) {
  const h = hhmmGMT(instant)
  return h ? h + ' GMT' : ''
}

/** Un instant → « 18/10 · 05:12 GMT » (le jour et l'heure, tous deux en GMT). */
export function jourHeureGMT(instant) {
  const d = enDate(instant)
  if (!d) return ''
  return P2(d.getUTCDate()) + '/' + P2(d.getUTCMonth() + 1) + ' · ' +
    P2(d.getUTCHours()) + ':' + P2(d.getUTCMinutes()) + ' GMT'
}

/** Un instant → « jeudi 18 octobre 2026 · 05:12 GMT ». */
export function jourLongHeureGMT(instant) {
  const d = enDate(instant)
  if (!d) return ''
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  return jours[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MOIS[d.getUTCMonth()] +
    ' ' + d.getUTCFullYear() + ' · ' + P2(d.getUTCHours()) + ':' + P2(d.getUTCMinutes()) + ' GMT'
}

/** « maintenant », en GMT → « 05:12 GMT ». */
export function maintenantGMT() {
  return heureGMT(new Date())
}

/* ---------------------------------------------------------------------------
 * Paris → GMT
 * ------------------------------------------------------------------------- */

/** Le décalage de Paris à cet instant, en minutes (+60 l'hiver, +120 l'été). */
function decalageParis(ms) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - ms) / 60000
}

/**
 * Une heure murale de PARIS → « 13:15 » (GMT).
 * `date` = « AAAA-MM-JJ » : elle porte l'heure d'été (le 18/10 Paris = UTC+2).
 * Sans date, on prend le décalage du moment — on ne peut pas être faux de plus
 * d'une heure, deux jours par an.
 */
export function parisVersGMT(date, hhmm) {
  const m = String(hhmm || '').match(/(\d{1,2})\s*[:hH]\s*(\d{2})/)
  if (!m) return ''
  const part = String(date || '').split('-').map(Number)
  const ok = part.length === 3 && part.every((x) => Number.isFinite(x))
  /* Sans date : on ancre le calcul sur AUJOURD'HUI (et non sur une date
     arbitraire, qui porterait le mauvais décalage été/hiver). */
  const auj = new Date()
  const mur = ok
    ? Date.UTC(part[0], part[1] - 1, part[2], Number(m[1]), Number(m[2]))
    : Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth(), auj.getUTCDate(), Number(m[1]), Number(m[2]))
  /* Paris = murale − décalage ; on itère (l'heure d'été peut changer dans
   * l'intervalle, ce qui décale d'une heure). */
  let ms = ok ? mur : Date.now()
  for (let i = 0; i < 3; i++) ms = mur - decalageParis(ms) * 60000
  const d = new Date(ms)
  return P2(d.getUTCHours()) + ':' + P2(d.getUTCMinutes())
}

/** Une heure murale de Paris → « 13:15 GMT ». */
export function heureParisGMT(date, hhmm) {
  const g = parisVersGMT(date, hhmm)
  return g ? g + ' GMT' : ''
}

/**
 * Une heure murale du MAROC (casacourses) → « 13:15 GMT ».
 * Le Maroc est à UTC+1 fixe : on retire une heure.
 * (Seule exception, connue et assumée : le mois de Ramadan, où le Maroc passe à
 * UTC+0 — aucune course française n'est alors concernée à cette heure-ci.)
 */
export function heureMarocGMT(hhmm) {
  const m = String(hhmm || '').match(/(\d{1,2})\s*[:hH]\s*(\d{2})/)
  if (!m) return ''
  const minutes = (Number(m[1]) * 60 + Number(m[2]) - 60 + 1440) % 1440
  return P2(Math.floor(minutes / 60)) + ':' + P2(minutes % 60) + ' GMT'
}

/**
 * ⭐ Heure GMT d'une course, selon son PAYS (20/10/2026).
 *
 *  Les sites ne parlent pas la même langue :
 *    · Equidia / turf-france : heure MURALE de PARIS (UTC+1 en hiver, +2 l'été)
 *    · casacourses (Maroc)   : heure MURALE du MAROC (UTC+1 fixe)
 *    · le champ `heure` peut aussi être un INSTANT ISO (avec décalage)
 *
 *  Avant : chaque page choisissait sa propre conversion — et la plupart
 *  se trompaient d'une heure (QuinteGrille utilisait heureMarocGMT pour une
 *  heure de Paris, Article n'utilisait même pas c.heure). Cette fonction
 *  centralise le choix selon le pays.
 */
export function heureGMTParPays(pays, date, heure) {
  const brut = String(heure == null ? '' : heure).trim()
  if (!brut) return ''
  const p = String(pays || '').toUpperCase()
  const maroc = (p === 'MA' || p === 'MAROC' || p === 'MOROCCO')
  if (maroc) {
    if (/^\d{1,2}\s*[:hH]\s*\d{2}/.test(brut) && !/[TZ]|[+-]\d{2}:?\d{2}$/.test(brut)) return heureMarocGMT(brut)
    const h = hhmmGMT(brut)
    return h ? h + ' GMT' : ''
  }
  return heureCourseGMT(date, brut)
}

export function heureCourseGMT(date, heure) {
  const brut = String(heure == null ? '' : heure).trim()
  if (!brut) return ''
  const murale = /^\d{1,2}\s*[:hH]\s*\d{2}/.test(brut) && !/[TZ]|[+-]\d{2}:?\d{2}$/.test(brut)
  if (murale) return heureParisGMT(date, brut)
  const h = hhmmGMT(brut)
  return h ? h + ' GMT' : ''
}
