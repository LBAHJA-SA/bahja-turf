/* 1. Le « Synthèse des % » est-il vraiment sur la page ? (les % sont peut-être encodés)
 * 2. Comment on demande une journée PASSÉE ?
 *   node tools/diag-tf2.mjs
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const w = (ms) => new Promise((r) => setTimeout(r, ms))

const get = async (u) => {
  const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9' } })
  const h = await r.text()
  return { r, h }
}

const h1 = await get('https://turf-france.com/php/tqqjour.php?date=0')
console.log('')
console.log(`  page du jour : ${h1.h.length} o`)
const i = h1.h.toLowerCase().indexOf('synth')
console.log(`  occurrences de "synth" : ${(h1.h.match(/synth/gi) || []).length}   1re a l offset ${i}`)
if (i >= 0) console.log('     ...' + h1.h.slice(Math.max(0, i - 120), i + 220).replace(/\s+/g, ' ') + '...')

/* les contrôles de navigation dans le temps */
console.log('')
console.log('  --- controles de date trouves dans la page ---')
for (const re of [/<input[^>]*name=["']?(\w+)["']?[^>]*value=["']([^"']*)["']/gi, /<option[^>]*value=["']([^"']*)["'][^>]*>([^<]{0,40})/gi]) {
  const v = [...h1.h.matchAll(re)].map((x) => x[2] + ' = ' + x[3]).slice(0, 12)
  v.forEach((x) => console.log('     ' + x))
}

/* la page est-elle identique pour une date passee ? on compare les empreintes */
console.log('')
console.log('  --- meme page pour une date passee ? ---')
const empreintes = {}
for (const u of [
  'https://turf-france.com/php/tqqjour.php?date=0',
  'https://turf-france.com/php/tqqjour.php?date=16092025',
  'https://turf-france.com/php/tqqjour.php?wwdate=16092025&r=R1&c=C1',
  'https://www.turf-france.com/php/tqqjour.php?date=16092025',
]) {
  const { r, h } = await get(u)
  let hash = 5381
  for (let i = 0; i < h.length; i++) hash = ((hash << 5) + hash + h.charCodeAt(i)) >>> 0
  empreintes[u] = hash.toString(16)
  const d = h.match(/\b\d{2}\/\d{2}\/20\d{2}\b/g)
  console.log(`  ${u.replace('https://', '').replace('www.', '').padEnd(58)} ${String(h.length).padStart(6)} o  hash ${empreintes[u]}  dates ${d ? [...new Set(d)].slice(0, 3).join(' ') : '-'}`)
  await w(1200)
}
const hs = [...new Set(Object.values(empreintes))]
console.log('')
console.log(hs.length === 1 ? '  => la page est TOUJOURS la meme : le parametre de date ne sert a rien' : '  => des pages DIFFERENTES : un parametre marche')
console.log('')
