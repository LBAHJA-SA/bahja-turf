/* =============================================================================
 * tools/rapports.mjs — les GAINS Quinté+ définitifs (15/10, demande utilisateur :
 * une 5/5 de favoris ne paie rien — la mesure doit être le RAPPORT).
 * equidia.fr garde les rapports des courses fermées : on lit Quinté+ Désordre
 * (+ Ordre), VÉRIFIÉ contre l'arrivée archivée (combinaison_rap_def).
 * Sortie : data/rapports.json {date: {desordre, ordre, mise, combo}}.
 * Usage : node tools/rapports.mjs
 * ============================================================================= */
import fs from 'node:fs'

const num = (s) => {
  if (s == null) return null
  const m = String(s).replace(/\s/g, '').replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : null
}
const unesc = (s) => s.split('&quot;').join('"').split('&lt;').join('<').split('&gt;').join('>').split('&nbsp;').join(' ').split('&#39;').join("'").split('&amp;').join('&')

const db = JSON.parse(fs.readFileSync('./data/synthese.json', 'utf8'))
const closed = Object.values(db).filter((r) => r && (r.arrivee || []).length)
const out = {}
for (const rec of closed) {
  const id = rec.courseId || rec.cle || ''
  const m = String(id).match(/^(\d{4}-\d{2}-\d{2})_R(\d+)_C(\d+)$/)
  if (!m) { console.log(rec.date, 'clé illisible :', id); continue }
  const [, d, r, c] = m
  let st = null
  try {
    const rep = await fetch(`https://www.equidia.fr/courses/${d}/R${r}/C${c}`, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' } })
    if (!rep.ok) { console.log(rec.date, 'equidia HTTP', rep.status); continue }
    const html = await rep.text()
    const mm = html.match(/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/)
    if (!mm) { console.log(rec.date, 'pas de state'); continue }
    st = JSON.parse(unesc(mm[1]))
  } catch (e) { console.log(rec.date, 'KO :', e.message); continue }
  const rapports = st[`courses/${d}/R${r}/C${c}/rapports`] || []
  const arr = rec.arrivee.slice(0, 5).join('-')
  let pris = null
  for (const rap of rapports) {
    const t = (rap.pari_type && rap.pari_type.titre) || ''
    if (!/^quinté\+$/i.test(t.trim())) continue
    for (const comb of ((rap.rapport_definitif || {}).combinaisons || [])) {
      const combo = String(comb.combinaison_rap_def || '').replace(/\s/g, '')
      if (combo !== arr) continue
      const type = String(comb.type_reserve_rap_def || '')
      const g = num(comb.gagnant)
      if (/désordre/i.test(type) && g != null) pris = { ...(pris || {}), desordre: g }
      if (/[^é]ordre/i.test(type) && !/désordre/i.test(type) && g != null) pris = { ...(pris || {}), ordre: g }
    }
  }
  if (!pris) {
    // repli e-Quinté+ (même combinaison exigée)
    for (const rap of rapports) {
      const t = (rap.pari_type && rap.pari_type.titre) || ''
      if (!/^e-quinté\+$/i.test(t.trim())) continue
      for (const comb of ((rap.rapport_definitif || {}).combinaisons || [])) {
        const combo = String(comb.combinaison_rap_def || '').replace(/\s/g, '')
        if (combo !== arr) continue
        const type = String(comb.type_reserve_rap_def || '')
        const g = num(comb.gagnant)
        if (/désordre/i.test(type) && g != null) pris = { ...(pris || {}), desordre: g, e: true }
        if (/[^é]ordre/i.test(type) && !/désordre/i.test(type) && g != null) pris = { ...(pris || {}), ordre: g, e: true }
      }
    }
  }
  if (pris && pris.desordre != null) {
    out[rec.date] = { ...pris, combo: arr }
    console.log(rec.date, 'désordre', pris.desordre + (pris.e ? ' (e)' : ''), '| ordre', pris.ordre ?? '?', '| ' + arr)
  } else console.log(rec.date, 'PAS DE RAPPORT Quinté+ pour ' + arr)
  await new Promise((rr) => setTimeout(rr, 1200))
}
fs.writeFileSync('./data/rapports.json', JSON.stringify(out, null, 1))
console.log('rapports : ' + Object.keys(out).length + '/' + closed.length + ' → data/rapports.json')
