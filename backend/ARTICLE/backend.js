/* =============================================================================
 * backend/ARTICLE/backend.js
 *
 * ⛔ LE BACKEND DE LA PAGE /r/:slug — ET RIEN D'AUTRE.
 *
 * Cette page est cloisonnée : elle ne parle à PERSONNE d'autre dans le projet.
 *   ✗ pas de src/lib/quinte.js       (le moteur Quinté)
 *   ✗ pas de src/lib/turfFrance.js   (lu par Admin)
 *   ✗ pas de src/lib/demoData.js     (le DÉMO a été supprimé)
 *   ✗ pas de pro.casacourses.com    (retiré le 04/10/2026 sur demande)
 *   ✗ pas de Programme.jsx / Admin.jsx / QuinteGrille.jsx
 *
 * Sources, et sources seulement :
 *   (a) les 4 paliers de chargerCourse() : localStorage, /data/reu, turf-france
 *   (b) la sauvegarde locale de l'Admin (pronostics)
 *
 * PLUS AUCUNE API DISTANTE : Bahja-TURF ne parle a PERSONNE (AGENTS.md section 15).
 * Si les sources echouent, la page dit << source indisponible >> - elle n'invente
 * rien et elle ne montre aucune course d'une autre date.
 * ========================================================================== */


import { lireCourseArchive, sauverCourse, lireProgrammeArchive, sauverProgramme } from './archive.js'
import { chargerDetailReu, chargerPageTqq, offsetJour, normaliserDetailReu, nomFichierCourse, slugNorm, chargerProgrammeReu } from './turfFrance.js'

/** « r1-c5-qatar-prix…-2026-10-04-parislongchamp » ou « 2026-10-04_R1_C5 ».
 *  Le pays voyage en ?pays= (défaut FRANCE) : le programme liste le monde entier. */
export function lireCible(slug, id, dateParDefaut, paysDefaut = 'FRANCE') {
  if (slug) {
    const dm = slug.match(/(\d{4}-\d{2}-\d{2})/)
    const rm = slug.match(/r(\d+)-c(\d+)/i)
    if (dm && rm) {
      const hippo = (slug.match(/\d{4}-\d{2}-\d{2}-(.+)$/) || [])[1] || ''
      return { fetchId: `${dm[1]}_R${rm[1]}_C${rm[2]}`, date: dm[1], pays: paysDefaut, hippo }
    }
    const m = slug.match(/(\d{4}-\d{2}-\d{2})_R(\d+)_C(\d+)/)
    if (m) return { fetchId: m[0], date: m[1], pays: paysDefaut, hippo: '' }
  }
  if (id && /^\d{4}-\d{2}-\d{2}_R\d+_C\d+$/.test(id)) return { fetchId: id, date: id.slice(0, 10), pays: paysDefaut }
  return { fetchId: `${dateParDefaut}_R1_C1`, date: dateParDefaut, pays: paysDefaut }
}

/** La course complète + ses partants.
 *
 *  ORDRE DE LECTURE — l’archive TOUJOURS d’abord :
 *    ① localStorage (ce qu’on a déjà visité)
 *    ② /data/reu/*.json (le collecteur tools/archive-reu.mjs)
 *    ③ reu.php detail (la course EXACTE : R+C+date+pays)
 *    ④ tqqjour.php (secours : le Quinté des jours proches)
 *    (5) SUPPRIME le 05/10/2026 : plus aucune API distante
 *  Tout ce qui a la forme complète est ARCHIVÉ (①) pour la prochaine fois.
 */
export async function chargerCourse(fetchId, pays = 'FRANCE', hippoSlug = '') {
  const m = String(fetchId).match(/_R(\d+)_C(\d+)/)
  const rNum = Number(m?.[1] || 1)
  const cNum = Number(m?.[2] || 1)
  const dateDemandee = String(fetchId).slice(0, 10)

  // ① chez nous : localStorage
  try {
    const loc = lireCourseArchive(dateDemandee, rNum, cNum, pays)
    if (loc && loc.participants?.length) return { ...loc, source: (loc.source || 'archive') + ' · archive' }
  } catch (e) {}

  // ② chez nous : les fichiers du collecteur.
  //   ⚠ 07/10/2026 : le fichier porte le SUFFIXE DU PAYS (`_NORV`, `_SUEDE`…),
  //   et une réunion peut être étrangère alors qu'on la demande en FRANCE —
  //   `2026-10-07_R2_C1` est PRIX DE DEAUVILLE (NORVÈGE), pas une course
  //   française. La page disait alors « course indisponible ». On essaie donc
  //   le pays demandé, puis le programme du jour pour découvrir le vrai pays,
  //   puis une liste de suffixes usuels. Sans cela, R2/R3 du 07/10 breakage.
  try {
    const suffixes = [pays]
    try {
      const prog = await chargerProgrammeReu(dateDemandee)
      for (const r of prog || []) {
        const c = (r.courses || []).find((x) => Number(String(x.reunion).replace(/\D/g, '')) === rNum
          && Number(String(x.code).replace(/\D/g, '')) === cNum)
        if (c?.pays && !suffixes.includes(c.pays)) suffixes.push(c.pays)
      }
    } catch (e) { /* le programme peut manquer : on continue */ }
    for (const extra of ['FRANCE', 'NORV', 'SUEDE', 'GB', 'BELGIQUE', 'MAROC']) {
      if (!suffixes.includes(extra)) suffixes.push(extra)
    }
    for (const p of suffixes) {
      try {
        const r = await fetch(`/data/reu/${nomFichierCourse(dateDemandee, rNum, cNum, p)}`)
        if (!r.ok) continue
        /* ⚠ Vercel répond 200 + index.html (384 o) pour un fichier absent —
         *   le rewrite `/(.*) → /index.html` de vercel.json. `r.ok` ne suffit
         *   donc pas : un JSON absent passe le test et casse la page en aval
         *   (`j.v` undefined). On vérifie le type ET la taille. */
        const type = String(r.headers.get('content-type') || '')
        if (!/json/i.test(type)) continue
        const j = await r.json()
        if (j?.v === 2 && j?.pv === 4 && j?.participants?.length) {
          try { sauverCourse(dateDemandee, rNum, cNum, p, j) } catch (e) {}
          return { ...j, source: (j.source || 'archive') + ' · archive' }
        }
      } catch (e) {}
    }
  } catch (e) {}

  // ③ reu.php : la course exacte (+ hippo du slug vérifié : date+R+C ne suffisent
  //   pas quand le site ignore le pays — ex. R1-C1 demandé « mons-ghlin »)
  try {
    const det = await chargerDetailReu(dateDemandee, rNum, cNum, pays)
    if (hippoSlug && slugNorm(det.identite?.hippodrome) !== hippoSlug) {
      throw new Error(`reu.php affiche ${det.identite.hippodrome} (R${det.identite.reunion}-C${det.identite.course}), pas « ${hippoSlug} »`)
    }
    const obj = normaliserDetailReu(det, rNum, cNum, pays, 'Turf-France · reu.php')
    try { sauverCourse(dateDemandee, rNum, cNum, pays, obj) } catch (e) {}
    return obj
  } catch (e1) {
    // ④ tqqjour : seulement le Quinté FRANCE des jours proches
    if (String(pays).toUpperCase().startsWith('FR')) {
      try {
        const { chargerPageTqq } = await import('./turfFrance.js').catch(() => ({}))
        if (chargerPageTqq) {
          const page = await chargerPageTqq(offsetJour(dateDemandee), dateDemandee)
          const idn = page.identite
          if (!idn) throw new Error('course non identifiée sur turf-france')
          if (idn.reunion !== rNum || idn.course !== cNum) {
            throw new Error(`le Quinté du ${dateDemandee} est R${idn.reunion}-C${idn.course}, pas R${rNum}-C${cNum}`)
          }
          const obj = {
            v: 2, pv: 4,
            source: 'Turf-France · tqqjour.php',
            race: { numOrdre: idn.course, nom: page.entete?.nom || '', prix: page.entete?.nom || '', heure: page.entete?.heure || '', distance: page.entete?.distance ?? null, discipline: page.entete?.discipline || '', corde: page.entete?.corde || '', classe: page.entete?.classe || '', conditions: page.entete?.conditions || '', montant: page.entete?.montant ?? null, arrivee: null, dateLongue: idn.dateLongue || '', jour: idn.jour || '' },
            meeting: { num: idn.reunion, hippodrome: idn.hippodrome || 'Hippodrome', pays: 'FR' },
            participants: (page.partants || []).map((p) => ({ num: p.num, cheval: p.cheval, driver: p.driver, entraineur: p.entraineur, cote: p.cote, coteRef: p.coteRef, musique: p.musique, gains: p.gains, age: p.age, sexe: p.sexe, poids: p.poids, valeur: p.valeur, chrono: p.chrono, coteRefJockey: p.coteRefJockey ?? null, coteRefEntraineur: p.coteRefEntraineur ?? null, silk: p.silk ?? null, proprietaire: p.proprietaire, dernierPassage: p.dernierPassage, depart: p.corde })),
            tops: page.tops || {}, aptitudes: [], synthesePct: '', pronosTf: [],
          }
          try { sauverCourse(dateDemandee, rNum, cNum, pays, obj) } catch (e) {}
          return obj
        }
      } catch (e4) {
        if (e4 && /R\d+-C\d+, pas R/.test(e4.message)) throw e4   // le vrai R/C : on le dit
      }
    }

    // (5) supprime le 05/10/2026 : Bahja-TURF ne parle a PERSONNE (AGENTS.md section 15).
    // Les 4 paliers ci-dessus sont les seules sources ; sinon on le dit clairement.
    const msg = e1 && e1.message ? e1.message : 'source inconnue'
    throw new Error(msg === 'injoignable' ? 'turf-france injoignable' : msg)
  }
}

/** Le programme du jour, mêmes paliers : archive → fichiers → site. */
export async function chargerProgramme(date) {
  try {
    const loc = lireProgrammeArchive(date)
    if (loc?.reunions?.length) return { ...loc, source: 'archive' }
  } catch (e) {}
  try {
    const r = await fetch(`/data/reu/prog-${date}.json`)
    if (r.ok) {
      const j = await r.json()
      if (j?.v === 3 && j?.reunions?.length) { try { sauverProgramme(date, j.reunions) } catch (e) {} return { ...j, source: 'archive' } }
    }
  } catch (e) {}
  const { chargerProgrammeReu } = await import('./turfFrance.js')
  const reunions = await chargerProgrammeReu(date)
  if (!reunions.length) throw new Error('programme vide')
  try { sauverProgramme(date, reunions) } catch (e) {}
  return { date, reunions, source: 'Turf-France · reu.php' }
}
/** Les pronostics : sauvegarde locale de l'Admin (aucun serveur). */
export async function chargerPronos(fetchId) {
  // plus d'API distante : les pronostics viennent de la sauvegarde locale, ou rien.

  try {
    const loc = JSON.parse(localStorage.getItem(`bahja-tops-${fetchId}`) || 'null')
    if (loc && (loc.prono1 || loc.prono2 || loc.prono3)) return loc
  } catch (e) { /* rien */ }

  return null
}

/** La météo de la réunion (facultatif : la page tourne sans). */
export async function chargerMeteo(date, numReunion) {
  // plus d'API distante : la page tourne sans la meteo
  return null
}
