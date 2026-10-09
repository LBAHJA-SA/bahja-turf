/**
 * LES COTES DU MARCHÉ — Equidia (le flux qu'on n'avait pas)
 *
 * equidia.fr rend la page Angular **complete** : le JSON du marche est colle
 * dans <script id="serverApp-state">. On y trouve, pour chaque partant :
 *
 *   rapp_evol      la cote du marche, en direct puis figee apres la course
 *   rapp_ref       la cote d'ouverture
 *   tendance_signe + / - / =     le mouvement
 *   favori         vrai pour le favori
 *   history[]      tout le chemin parcouru + montant_enjeu_total
 *
 * URL : https://www.equidia.fr/courses/{AAAA-MM-JJ}/R{n}/C{m}
 *
 * Pourquoi c'est utile : pro.casacourses.com ne donne `odd` que sur les
 * courses TERMINÉES. Equidia donne le marche EN DIRECT — c'est la seule
 * source trouvee qui a la cote du jour avant le depart.
 *
 *   node tools\cotes.mjs                      → les 4 Quintés de l'archive
 *   node tools\cotes.mjs 2026-10-05_R1_C1    → une course precise
 */
import fs from 'node:fs'

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36', Accept: 'text/html' }
const FILE = 'data/cotes.json'

/** { num, nom, cote, ouverture, tendance, favori, enjeu } depuis le JSON Equidia */
export function lireCourse(state, date, r, c) {
  const brut = state[`courses/${date}/R${r}/C${c}/pari_simple`] || []
  return brut
    .filter((x) => x.rapp_evol > 0)
    .map((x) => ({
      num: x.num_partant,
      nom: x.cheval?.nom_cheval || '',
      cote: x.rapp_evol,
      ouverture: x.rapp_ref ?? null,
      tendance: x.tendance_signe || '=',
      favori: !!x.favori,
      enjeu: Number((x.history || [])[0]?.montant_enjeu_total || 0),
      heure: x.heure_rap_evol || null,
    }))
    .sort((a, b) => a.cote - b.cote)
}

export async function chargerEquidia(date, r, c) {
  const u = `https://www.equidia.fr/courses/${date}/R${r}/C${c}`
  const rep = await fetch(u, { headers: UA })
  if (!rep.ok) return null
  const html = await rep.text()
  const m = html.match(/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) return null
  const txt = m[1]
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  return JSON.parse(txt)
}

/** les cotes déjà en cache : { date : { num : {...} } } */
export function cacheCotes() {
  return fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {}
}

/** vrai si le cache contient une course plausible */
export function aDesCotes(courseId) {
  const cc = cacheCotes()[courseId]
  return !!(cc && cc.cotes && cc.cotes.length > 4)
}

/**
 * Les cotes d'une course, en `{ num : {...} }` — la forme qu'attend
 * remplirGrille. Va sur equidia.fr si le cache ne l'a pas encore.
 * Renvoie {} si le réseau échoue : le moteur retombe alors sur le score.
 */
export async function chargerCotes(courseId) {
  const m = String(courseId || '').match(/^(\d{4}-\d{2}-\d{2})_R(\d+)_C(\d+)$/)
  if (!m) return {}
  const [, d, r, c] = m
  let cc = cacheCotes()[courseId]
  if (!aDesCotes(courseId)) {
    try {
      const etat = await chargerEquidia(d, r, c)
      if (etat) {
        const cotes = lireCourse(etat, d, r, c)
        if (cotes.length > 4) {
          const cache = cacheCotes()
          /* ⚠ 09/10/2026 : ne jamais écraser les snapshots (ouverture /
           *   h_moins_3 / h_moins_2) : la racine `cotes` suit le dernier
           *   marché lu, mais l'historique reste. Sans ça, chaque lecture
           *   du moteur effaçait les 3 instants à comparer. */
          const prec = cache[courseId] || {}
          cache[courseId] = { ...prec, source: 'equidia.fr', favori: cotes.find((x) => x.favori)?.num ?? prec.favori ?? null, cotes }
          fs.writeFileSync(FILE, JSON.stringify(cache, null, 1))
          cc = cache[courseId]
        }
      }
    } catch (e) { return {} }
  }
  if (!cc || !cc.cotes?.length) return {}
  return Object.fromEntries(cc.cotes.map((x) => [x.num, x]))
}

/* ── CLI ─────────────────────────────────────────────────────────────────── */
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
  const cibles = process.argv[2]
    ? [process.argv[2]]
    : Object.keys(db).sort().map((d) => db[d].courseId).filter(Boolean)

  const cache = cacheCotes()
  const force = process.argv.includes('--force')
  for (const id of cibles) {
    const [, d, r, c] = id.match(/^(\d{4}-\d{2}-\d{2})_R(\d+)_C(\d+)$/) || []
    if (!d) { console.log('  ' + id + ' : identifiant illisible'); continue }
    if (cache[id]?.cotes?.length && !force) { console.log('  ' + id + '  déjà en cache (' + cache[id].cotes.length + ' cotes)'); continue }
    process.stdout.write('  ' + id + ' … ')
    let etat = null
    try { etat = await chargerEquidia(d, r, c) } catch (e) { console.log('échec : ' + e.message); continue }
    if (!etat) { console.log('page introuvable'); continue }
    const cotes = lireCourse(etat, d, r, c)
    const course = etat[`v2/courses/${d}/R${r}/C${c}`] || {}
    const st = cotes.find((x) => x.favori)
    cache[id] = {
      source: 'equidia.fr',
      hippodrome: course.reunion?.libelle || null,
      distance: course.lib_distance_course || course.dist_partant || null,
      discipline: course.libelle_discipline || null,
      favori: st ? st.num : cotes[0]?.num ?? null,
      cotes,
    }
    console.log(cotes.length + ' cotes · favori n°' + (st?.num ?? '?') + ' @' + (st?.cote ?? '?')
      + ' · ' + (cache[id].discipline || '?') + ' ' + (cache[id].distance || '?') + ' m')
    fs.writeFileSync(FILE, JSON.stringify(cache, null, 1))
    await new Promise((r2) => setTimeout(r2, 1200))   // politesse : 1 page / 1,2 s
  }
  console.log('\n  → ' + FILE + ' : ' + Object.keys(cache).length + ' courses\n')
}