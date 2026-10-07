/* Equidia sert-il l'historique d'un cheval (distance, piste, place) ?
 * C'est LA question qui bloque le développement du volet physique :
 * les 94 Quintés de `archives\` n'ont qu'une musique compressée, pas de
 * carrières. Si equidia donne les courses passées d'un cheval, les 4
 * critères qu'on n'a jamais pu mesurer (distance, piste, terrain, niveau)
 * deviennent mesurables.
 *   node tools/diag-equidia-cheval.mjs
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const w = (ms) => new Promise((r) => setTimeout(r, ms))

const etat = (h) => {
  const m = h.match(/<script id="serverApp-state"[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return null
  try { return JSON.parse(m[1]) } catch { return null }
}

const chemins = (o, prefix = '', profondeur = 0, out = []) => {
  if (!o || profondeur > 4 || typeof o !== 'object') return out
  for (const [k, v] of Object.entries(o)) {
    const p = prefix ? prefix + '/' + k : k
    out.push(p)
    if (v && typeof v === 'object' && !Array.isArray(v)) chemins(v, p, profondeur + 1, out)
  }
  return out
}

const urls = process.argv.slice(2)
if (!urls.length) urls.push('https://www.equidia.fr/courses/2026-10-05/R1/C1')

for (const u of urls) {
  console.log('')
  console.log(`  ${u}`)
  let r, h
  try {
    r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9' } })
    h = await r.text()
  } catch (e) { console.log(`  ERREUR ${e.message}`); continue }
  console.log(`  HTTP ${r.status} · ${h.length} octets`)

  const e = etat(h)
  if (!e) { console.log('  pas de serverApp-state exploitable'); continue }
  const ks = chemins(e)
  console.log(`  ${ks.length} chemin(s) dans le state`)
  const cheval = [...new Set(ks.filter((p) => /chev|perf|musiqu|carri|histor|result|pass/i.test(p)))]
  console.log('  chemins cheval/performance : ' + (cheval.length ? cheval.slice(0, 45).join('\n                              ') : 'AUCUN'))
  await w(1500)
}
console.log('')
