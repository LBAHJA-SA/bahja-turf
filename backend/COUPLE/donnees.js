// backend/COUPLE/donnees.js — les données de la page Couplé (/couple).
// Importé par frontend/COUPLE/Couple.jsx UNIQUEMENT. Ne pas partager.
//
// ⚠ Ce fichier tourne DANS LE NAVIGATEUR : aucun `node:fs`, aucun chemin
//   disque. Tout passe par `/api/couple` (la fonction Serverless lit le
//   disque et reu.php, puis ne renvoie que le nécessaire). C'est la règle
//   qui a cassé le build le 07/10 : un `import ... from 'node:fs'` dans un
//   fichier importé par une page fait échouer Vite.

/** Le programme d'un jour : les réunions et leurs courses. */
export async function chargerProgramme(date) {
  const r = await fetch(`/api/couple?date=${date}`, { headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error('couple HTTP ' + r.status)
  const j = await r.json()
  if (j.erreur && !(j.courses || []).length) throw new Error(j.erreur)
  return j
}

/** Le détail d'une course : tous ses partants. */
export async function chargerCourse(cle) {
  const dep = String(cle).split('_')
  const date = dep[0]
  const r = await fetch(`/api/couple?date=${date}&course=${encodeURIComponent(cle)}`, {
    headers: { Accept: 'application/json' },
  })
  if (!r.ok) throw new Error('couple HTTP ' + r.status)
  const j = await r.json()
  if (j.erreur && !(j.course?.partants || []).length) throw new Error(j.erreur)
  return j
}

/** Regroupe les courses par réunion (R1, R2, R9…) pour l'affichage. */
export function grouperParReunion(courses) {
  const groupes = new Map()
  for (const c of courses || []) {
    const k = `${c.reunion} ${c.hippodrome || ''}`.trim()
    if (!groupes.has(k)) {
      groupes.set(k, {
        reunion: c.reunion,
        hippodrome: c.hippodrome || '',
        pays: c.pays || '',
        courses: [],
      })
    }
    groupes.get(k).courses.push(c)
  }
  return [...groupes.values()].sort((a, b) =>
    String(a.reunion).localeCompare(String(b.reunion), 'fr', { numeric: true }))
}
