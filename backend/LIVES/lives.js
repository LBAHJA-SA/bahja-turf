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
 *
 * ⚠ LE 500 N'EST PAS UNE PANNE (mesuré le 25/10/2026) — Equidia Régions répond
 *   `{"error":{"code":"error-500","msg":"Internal server error !"}}` quand la
 *   journée ne porte AUCUNE réunion, au lieu de rendre une liste vide :
 *
 *     2026-10-23 → 200 (5 réunions)      2026-10-25 → 500
 *     2026-10-24 → 200 (8 réunions)      2026-10-26 → 500   (lundi, relâche)
 *     2026-10-27 → 200                   2026-10-31 → 200
 *
 *   La page affichait donc « ⚠ régions : HTTP 500 — la source ne répond pas »
 *   un dimanche sans réunion régionale. Un 500 ou un 404 devient ici une
 *   JOURNÉE VIDE (`vide: true`) : ce n'est pas une erreur, c'est une réponse.
 */
export async function chargerLives(date = jourISO(), { limite = 50 } = {}) {
  const url = `${BASE}/meetings?fromDate=${date}&toDate=${date}&offset=0&limit=${limite}`

  /* ⚠ Le 500 est INSTABLE (mesuré le 25/10 : le même 26/10 rend 500 depuis
   *   Node et 5 réunions depuis le navigateur, à 2 minutes d'écart). Avant de
   *   conclure « journée vide », on redonne sa chance à la source — sinon un
   *   incident passager de la plateforme ferait disparaître les chaînes. */
  let r = null
  for (let essai = 0; essai < 3; essai++) {
    try {
      const essaiReponse = await fetch(url, { cache: 'no-store' })
      if (essaiReponse.ok) { r = essaiReponse; break }
    } catch (e) { /* on réessaie */ }
    if (essai < 2) await new Promise((ok) => setTimeout(ok, 400 + essai * 600))
  }

  /* 3 essais sans réponse : c'est une journée SANS RÉUNION (le 500 est la façon
   * dont Equidia dit « rien à publier »), pas une panne de la page. */
  if (!r) {
    return { date, total: 0, meetings: [], enDirect: 0, vide: true, incertain: true, lu: new Date().toISOString() }
  }
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
    vide: liste.length === 0,
    lu: new Date().toISOString(),
  }
}

/**
 * La dernière journée qui a des réunions — au plus `jours` jours en arrière.
 * Sert quand la date choisie est vide : plutôt qu'un écran noir, on propose
 * « la dernière journée » en un clic.
 * → { date, meetings, … } ou null
 */
export async function derniereJournee(date = jourISO(), jours = 7) {
  const d = new Date(date + 'T12:00:00Z')
  for (let i = 1; i <= jours; i++) {
    d.setUTCDate(d.getUTCDate() - 1)
    const jour = d.toISOString().slice(0, 10)
    const j = await chargerLives(jour)
    if (j.meetings.length) return j
  }
  return null
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
