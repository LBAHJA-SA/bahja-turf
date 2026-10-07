// backend/PROGRAMME/donnees.js — les données de la page Programme (/).
// Importé par frontend/PROGRAMME/Programme.jsx UNIQUEMENT. Ne pas partager.

/** Normalise un nom pour l'URL (le slug ne transporte AUCUNE donnée). */
export function slugify(t){ return (t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') }

/* ══════════════════════════════════════════════════════════════════════════
 * ⚠ PLAN B — le backend bahja-turf-api est MORT (« Application not found »
 *   depuis le 04/10/2026). Sans ce plan B la page affiche « Mode démo » et
 *   ne montre qu'une course sur la vraie.
 *
 *   pro.casacourses.com répond en CORS '*' et donne TOUT : reunion, pays,
 *   courses, distance, partants, heure — et available_bet_types, où
 *   « sorec_quinte » est le marqueur fiable du Quinté.
 * ══════════════════════════════════════════════════════════════════════════ */
const CC_API = 'https://pro.casacourses.com/api'
const HIPPO_MA_RE = /MEKNESS|KHEMISSET|MARRAKECH|CASABLANCA|RABAT|TANGER|LARACHE|OUZZANE|BERKANE|ANFA|SIDI ?MOUSA|SOUAKA|ALGER/i
// casacourses liste aussi Hong Kong, l'Uruguay, les USA dans le même programme.
// On ne garde que ce qui est vraiment français.
const HIPPO_ETRANGERE_RE = /SHA TIN|HONG KONG|MARONAS|BELMONT|LAUREL|SANTA ANITA|AQUEDUCT|SINGAPUR|KRANJI|BANGKOK|TOKYO|NEWPORT|TURFFRONT|DELAWARE/i

/** Paris (Europe/Paris, été comme hiver) → GMT. Les sources donnent l'heure française. */
export function parisVersGMT(dateAAAA_MM_JJ, h, mi) {
  const part = String(dateAAAA_MM_JJ).split('-').map(Number)
  const mur = Date.UTC(part[0], part[1] - 1, part[2], Number(h), Number(mi))
  let devine = mur
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(fmt.formatToParts(new Date(devine)).map((x) => [x.type, x.value]))
    const commeUTC = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute))
    devine += mur - commeUTC
  }
  const r = new Date(devine)
  return String(r.getUTCHours()).padStart(2, '0') + ':' + String(r.getUTCMinutes()).padStart(2, '0')
}

/** "15:05" (heure FR) ou timestamp → "13:05 GMT". Irrécupérable : tel quel. */
export function heureGMT(dateAAAA_MM_JJ, time) {
  const brut = String(time ?? '')
  if (/^\d{10,}$/.test(brut)) {
    const ms = brut.length > 10 ? Number(brut) : Number(brut) * 1000
    if (!Number.isFinite(ms)) return brut.slice(0, 5)
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }).format(new Date(ms)) + ' GMT'
  }
  const m = brut.match(/(\d{1,2}):(\d{2})/)
  if (!m) return brut.slice(0, 5)
  return parisVersGMT(dateAAAA_MM_JJ, m[1], m[2]) + ' GMT'
}

/** Transforme le programme casacourses en meetings pour cette page. */
/** Une course casacourses → une course de cette page. */
const toCourse = (rc, estQuinte = false) => ({
  numOrdre: Number(String(rc.code || '').replace(/^C/i, '')) || 0,
  name: rc.name || '',
  libelle: rc.name || '',
  time: rc.time_hm || rc.ts,
  distance: rc.distance || null,
  runners: rc.starters ?? null,
  quinte: !!estQuinte,
  paris: rc.available_bet_types || [],
  types_pari: estQuinte ? ['QUINTE_PLUS'] : [],
  ccId: rc.id,
  finished: !!rc.finished,
  status: rc.status || '',
})

export async function meetingsDepuisCasacourses(date) {
  const r = await fetch(CC_API + '/programme?date=' + date, { headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error('casacourses HTTP ' + r.status)
  const j = await r.json()
  const out = []
  for (const m of j.meetings || []) {
    const hippo = String(m.track || m.label || '')
    const pays = String(m.country || 'FR').toUpperCase()
    // ⚠ France seulement : ni le Maroc, ni l'étranger que casacourses mélange.
    if (pays !== 'FR' || HIPPO_MA_RE.test(hippo) || HIPPO_ETRANGERE_RE.test(hippo)) continue
    // TOUTES les courses de la réunion : le Quinté est MARQUÉ, pas filtré.
    // ⚠ quand available_bet_types est vide (paris pas encore publiés), aucun
    //   Quinté n’est marqué : on ne devine JAMAIS (le 04/10, le Quinté n’est
    //   pas forcément la course la plus riche). La page le dit clairement.
    const courses = (m.races || [])
      .map((rc) => toCourse(rc, (rc.available_bet_types || []).includes('sorec_quinte')))
    if (!courses.length) continue
    const num = parseInt(String(m.reunion_code || m.label || '1').replace(/\D+/g, ''), 10)
    out.push({
      num: Number.isFinite(num) ? num : 1,
      hippodrome: hippo,
      country: pays === 'FR' ? 'FR' : pays,
      courses,
    })
  }
  return out
}
