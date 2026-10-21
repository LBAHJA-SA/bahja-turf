/* ══════════════════════════════════════════════════════════════════════════
 *  backend/LIVES/lives.js — LES LIVES DES HIPPODROMES RÉGIONAUX (20/10/2026)
 *
 *  SOURCE : https://regions-api.equidia.fr  (Equidia Régions)
 *  Même famille que le marché (§8.1 d'AGENTS.md), mais une autre API : ici on
 *  ne cherche pas la cote, on cherche les RÉUNIONS EN DIRECT et leur flux.
 *
 *  Mesuré le 20/10/2026 (aucun proxy nécessaire) :
 *
 *    GET /meetings?fromDate=…&toDate=…&offset=0&limit=50   → les réunions
 *    GET /live/{fluxUrl}?type=hls                           → { url: …m3u8 }
 *    GET /live/{fluxUrl}?type=player                        → { url: …player.php }
 *
 *  · `access-control-allow-origin: *` sur l'API **et** sur toute la chaîne HLS
 *    (playlist, sous-playlist, segment .ts) → le navigateur lit le flux seul.
 *  · ⚠ `type=player` (la page `player.php` de hexaglobe) répond
 *    « geoblocking error country: MA » hors de France → on ne l'utilise PAS.
 *    Le HLS, lui, passe : c'est la seule porte utile.
 *  · Les liens de flux portent un jeton : ils EXPIREnt. On les redemande à
 *    chaque lecture (et à chaque échec), jamais on ne les garde.
 *
 *  Aucune donnée n'est écrite ici : ce fichier ne fait que lire l'API.
 * ══════════════════════════════════════════════════════════════════════════ */

const BASE = 'https://regions-api.equidia.fr'

/** L'API répond-elle ? (appel léger, pour l'indicateur de source) */
export async function pingLives() {
  const r = await fetch(BASE + '/meetings?fromDate=' + jourISO() + '&toDate=' + jourISO() + '&offset=0&limit=1')
  if (!r.ok) throw new Error('régions ' + r.status)
  return true
}

/** « AAAA-MM-JJ » d'aujourd'hui (heure de Paris = le jour des courses). */
export function jourISO(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  })
  return f.format(d)
}

/** Le nom de l'hippodrome, sans le mot « Hippodrome » (il est déjà dans l'UI). */
function nomCourt(nom) {
  return String(nom || '')
    .replace(/^Hippodrome\s+(de\s+|du\s+|d')?/i, '')
    .replace(/^Paris-/, '')
    .trim()
}

/** Les disciplines d'une réunion, en clair. */
function disciplinesDe(m) {
  const d = m.disciplines || {}
  const out = []
  if (d.flat) out.push('Plat')
  if (d.harnessTrot) out.push('Trot attelé')
  if (d.mountedTrot) out.push('Trot monté')
  if (d.barrierStChase) out.push('Obstacle')
  return out
}

/**
 * Une réunion de l'API → la forme que la page comprend.
 * `etat` est calculé ICI (une seule vérité, jamais recalculée dans le JSX).
 */
export function normaliser(m, maintenant = Date.now()) {
  const debut = m.startAt ? Date.parse(m.startAt) : null
  const fin = m.finishAt ? Date.parse(m.finishAt) : null
  let etat = 'avenir'
  if (debut != null && maintenant >= debut) etat = fin != null && maintenant > fin ? 'fin' : 'direct'
  if (!m.fluxUrl) etat = 'sans-flux'
  return {
    cle: `${m.date}_R${m.num}`,
    num: m.num,
    reunion: 'R' + m.num,
    date: m.date,
    debut: m.startAt || null,
    fin: m.finishAt || null,
    msDebut: debut,
    msFin: fin,
    etat,
    enDirect: etat === 'direct',
    flux: m.fluxUrl || null,
    fluxType: m.fluxType || 'RACING',
    fluxActif: m.fluxActive !== false,
    quinte: !!m.isQuinte,
    quarte: !!m.isQuarte,
    pmh: !!m.isPmh,
    csi: !!m.isCsi || !!m.isCsiPmu,
    premium: !!m.isPremium,
    code: m.raceCourse?.code || '',
    hippodrome: nomCourt(m.raceCourse?.name) || m.raceCourse?.place || '—',
    complet: m.raceCourse?.name || '',
    place: m.raceCourse?.place || '',
    slug: m.raceCourse?.slug || '',
    federation: m.federation?.name || m.raceCourse?.federation?.name || '',
    federationCode: m.federation?.code || m.raceCourse?.federation?.code || '',
    image: m.raceCourse?.defaultImage?.['768'] || m.raceCourse?.defaultImage?.['480'] || null,
    geo: m.raceCourse?.geoCoords || null,
    disciplines: disciplinesDe(m),
  }
}

/**
 * Les réunions d'une journée, triées : en direct d'abord, puis à venir (par
 * heure), puis terminées.
 */
export async function chargerLives(date = jourISO(), { limite = 50 } = {}) {
  const url = `${BASE}/meetings?fromDate=${date}&toDate=${date}&offset=0&limit=${limite}`
  const r = await fetch(url)
  if (!r.ok) throw new Error('régions : HTTP ' + r.status)
  const j = await r.json()
  const maintenant = Date.now()
  const liste = (j.meetings || []).map((m) => normaliser(m, maintenant))
  const rang = { direct: 0, avenir: 1, fin: 2, 'sans-flux': 3 }
  liste.sort((a, b) => (rang[a.etat] - rang[b.etat]) || ((a.msDebut || 0) - (b.msDebut || 0)))
  return {
    date,
    total: j.total ?? liste.length,
    meetings: liste,
    enDirect: liste.filter((m) => m.etat === 'direct').length,
    lu: new Date().toISOString(),
  }
}

/**
 * L'adresse du flux HLS d'une réunion — redemandée à chaque lecture.
 * ⚠ jamais `type=player` : géobloqué hors de France.
 */
export async function fluxHLS(flux) {
  if (!flux) throw new Error('cette réunion n’a pas de flux')
  const r = await fetch(`${BASE}/live/${encodeURIComponent(flux)}?type=hls`)
  if (r.status === 400) {
    const j = await r.json().catch(() => null)
    throw new Error(j?.error?.msg || 'flux refusé')
  }
  if (!r.ok) throw new Error('flux : HTTP ' + r.status)
  const j = await r.json()
  if (!j.url) throw new Error('flux sans adresse')
  return j.url
}

/** Le lien de la réunion sur Equidia Régions (pour « ouvrir dans un onglet »). */
export function lienEquidia(m) {
  return m?.slug
    ? `https://regions.equidia.fr/federation/${m.federationCode}/hippodrome/${m.slug}`
    : 'https://regions.equidia.fr/'
}
