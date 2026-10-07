/* ============================================================================
 * backend/ARTICLE/archive.js — NOTRE base de données locale.
 *
 * Chaque course lue est ENREGISTRÉE ici (localStorage, auto). Quand on
 * redemande la même course, on la trouve CHEZ NOUS : on ne retourne sur
 * le site que pour les courses absentes. Si le site bloque, l’archive
 * répond quand même.
 *
 * 2 tiroirs : le navigateur (localStorage) + les fichiers /data/reu/*.json
 * écrits par tools/archive-reu.mjs (durables, survivent au vidage du cache).
 * ========================================================================== */

const PREFIXE = 'bahja-reu:'
const PLAFOND = 400   // au-delà, on jette les plus anciennes

const memoire = () => (typeof localStorage === 'undefined' ? null : localStorage)

/** Clé d’une course : date + R + C + pays (2 réunions peuvent partager R1-C1). */
export function cleCourse(date, r, c, pays) {
  return `${PREFIXE}c:${date}_R${r}_C${c}_${String(pays || 'FRANCE').replace(/\s+/g, '')}`
}

export function lireCourseArchive(date, r, c, pays) {
  const ls = memoire()
  if (!ls) return null
  try {
    const j = JSON.parse(ls.getItem(cleCourse(date, r, c, pays)) || 'null')
    // pv périmé (parser corrigé depuis) = on refait la lecture, pas d'archive pourrie
    if (!j || j.pv !== 4 || !Array.isArray(j.participants) || !j.participants.length) return null
    return j
  } catch (e) { return null }
}

export function sauverCourse(date, r, c, pays, obj) {
  const ls = memoire()
  if (!ls || !obj || !Array.isArray(obj.participants) || !obj.participants.length) return
  try {
  ls.setItem(cleCourse(date, r, c, pays), JSON.stringify({ ...obj, _archiveLe: new Date().toISOString() }))
    elaguer(ls)
  } catch (e) { /* quota plein : on écrase les vieilles */ try { elaguer(ls, 100); ls.setItem(cleCourse(date, r, c, pays), JSON.stringify({ ...obj, _archiveLe: new Date().toISOString() })) } catch (e2) {} }
}

/** On garde les plus récentes (par _archiveLe). */
function elaguer(ls, surplus = 0) {
  try {
    const cles = []
    for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.startsWith(PREFIXE)) cles.push(k) }
    const limite = PLAFOND - surplus
    if (cles.length <= limite) return
    const rangs = cles.map((k) => { try { return [k, JSON.parse(ls.getItem(k))._archiveLe || ''] } catch (e) { return [k, ''] } })
    rangs.sort((a, b) => (a[1] < b[1] ? -1 : 1))
    for (const [k] of rangs.slice(0, cles.length - limite)) ls.removeItem(k)
  } catch (e) {}
}

export function lireProgrammeArchive(date) {
  const ls = memoire()
  if (!ls) return null
  try {
    const j = JSON.parse(ls.getItem(PREFIXE + 'p:' + date) || 'null')
    // v3 : le nom venait des Conditions (bug corrigé) — on ignore l'ancien format
    if (!j || j.v !== 3 || !Array.isArray(j.reunions) || !j.reunions.length) return null
    return j
  } catch (e) { return null }
}

export function sauverProgramme(date, reunions) {
  const ls = memoire()
  if (!ls || !Array.isArray(reunions) || !reunions.length) return
  try {
    ls.setItem(PREFIXE + 'p:' + date, JSON.stringify({ date, reunions, v: 3, _archiveLe: new Date().toISOString() }))
    elaguer(ls)
  } catch (e) {}
}

/** Export complet { courses, programmes } pour sauvegarde / transfert. */
export function exporterArchive() {
  const ls = memoire()
  const out = { courses: {}, programmes: {}, exporteLe: new Date().toISOString() }
  if (!ls) return out
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i)
    if (!k || !k.startsWith(PREFIXE)) continue
    try {
      const v = JSON.parse(ls.getItem(k))
      if (k.startsWith(PREFIXE + 'p:')) out.programmes[k.slice((PREFIXE + 'p:').length)] = v
      else out.courses[k.slice(PREFIXE.length)] = v
    } catch (e) {}
  }
  return out
}

/** Import (fusion : on n’écrase jamais une course déjà là). */
export function importerArchive(dump) {
  const ls = memoire()
  if (!ls || !dump) return 0
  let ajout = 0
  const pose = (k, v) => {
    if (!v || ls.getItem(PREFIXE + k)) return
    try { ls.setItem(PREFIXE + k, JSON.stringify(v)); ajout++ } catch (e) {}
  }
  for (const [k, v] of Object.entries(dump.courses || {})) pose('c:' + k, v)
  for (const [k, v] of Object.entries(dump.programmes || {})) pose('p:' + k, v)
  try { elaguer(ls) } catch (e) {}
  return ajout
}

/** Combien de courses + programmes chez nous ? */
export function tailleArchive() {
  const ls = memoire()
  if (!ls) return { courses: 0, programmes: 0 }
  let courses = 0, programmes = 0
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i)
    if (k && k.startsWith(PREFIXE + 'p:')) programmes++
    else if (k && k.startsWith(PREFIXE)) courses++
  }
  return { courses, programmes }
}