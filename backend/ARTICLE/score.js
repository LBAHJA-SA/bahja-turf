/* =============================================================================
 * backend/ARTICLE/score.js
 *
 * ⛔ COPIE PRIVÉE de src/lib/score.js — même raison que turfFrance.js :
 * cette page est cloisonnée, elle ne doit rien partager avec les autres.
 *
 * Rôles : classer les partants et calculer les % de podium / 2e / 3e à partir
 * de la musique. Sans donnée, on ne renvoie pas de chiffre faux : 0 et « — ».
 * ========================================================================== */

const BONUS = { A: 4, B: 2, C: 1 }

/** « 5p3p2p1p0p8p » → [{place, classe}, …] les 5 dernières d'abord. */
export function lireMusique(musique) {
  if (!musique) return []
  return String(musique)
    .replace(/[^0-9a-zA-Z]/g, '')
    .slice(0, 40)
    .split('')
    .map((c) => {
      const place = Number(c)
      if (Number.isFinite(place) && place > 0) return { place, classe: '' }
      const classe = c.toUpperCase()
      return BONUS[classe] ? { place: 0, classe } : null
    })
    .filter(Boolean)
    .slice(0, 10)
}

const dansTop = (runs, n) => runs.filter((x) => x.place > 0 && x.place <= n).length
const aGagne = (runs) => runs.filter((x) => x.place === 1).length
const aPlace = (runs) => runs.filter((x) => x.place > 0 && x.place <= 3).length

/** % podium (1er+2e+3e) sur les coursesjin terminées. */
export function pctPodium(p) {
  const runs = lireMusique(p.musique)
  const terminees = runs.filter((x) => x.place > 0)
  if (!terminees.length) return null
  return Math.round((dansTop(terminees, 3) / terminees.length) * 100)
}

/** % 1re. */
export function pctVictoire(p) {
  const runs = lireMusique(p.musique)
  const terminees = runs.filter((x) => x.place > 0)
  if (!terminees.length) return null
  return Math.round((aGagne(terminees) / terminees.length) * 100)
}

/** Nombre de 2e / de 3e sur 5 courses. */
export function nb2e(p) {
  const runs = lireMusique(p.musique).filter((x) => x.place > 0)
  return runs.slice(0, 5).filter((x) => x.place === 2).length
}
export function nb3e(p) {
  const runs = lireMusique(p.musique).filter((x) => x.place > 0)
  return runs.slice(0, 5).filter((x) => x.place === 3).length
}

/** Nombre de courses terminées. */
export function nbCourses(p) {
  return lireMusique(p.musique).filter((x) => x.place > 0).length
}

/** La forme sur 5 courses : « 32145 » (3 = 3e, …). 0 = non partant. */
export function formeCourte(p) {
  return lireMusique(p.musique)
    .slice(0, 5)
    .map((x) => (x.place > 0 ? x.place : 0))
    .join('')
}

/**
 * Classe les partants : d'abord la cote (elle existe avant la course),
 * puis le podium, puis les victoires.
 * ⚠ sans cote ET sans musique, on garde l'ordre du n° de départ — on ne
 *   invente pas de classement.
 */
export function classerPartants(parts) {
  const avecNote = parts.filter((p) => p.cote != null || p.musique)
  if (!avecNote.length) return parts.map((p, i) => ({ p, rang: i + 1, vide: true }))

  return [...parts]
    .map((p, i) => {
      const cote = p.cote != null ? Number(String(p.cote).replace(',', '.')) : 999
      return {
        p,
        rang: i,
        cote: Number.isFinite(cote) ? cote : 999,
        podium: pctPodium(p) ?? -1,
        victoires: pctVictoire(p) ?? -1,
      }
    })
    .sort((a, b) => a.cote - b.cote || b.podium - a.podium || b.victoires - a.victoires || a.rang - b.rang)
    .map((x, i) => ({ ...x, rang: i + 1 }))
}