/* Cherche comment turf-france sert les courses PASSÉES, et ce que vaut
 * vraiment son « Synthèse des % ».
 *   node tools/diag-tf.mjs
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const liensDe = (h) => {
  const out = []
  const re = /(?:href|window\.open\(|location\.href\s*=)\s*['"]?([^'"<> )]+)/gi
  let m
  while ((m = re.exec(h))) out.push(m[1])
  return [...new Set(out.filter((l) => /\.php|\.html|histor|arrive|pass|prog|result/i.test(l)))]
}

const syntheseDe = (h) => {
  const m = h.match(/Synth[^<]{0,12}des\s*%[^0-9<]{0,60}([0-9][0-9 \-]{8,140})/i)
  return m ? m[1].trim().replace(/\s+/g, ' ') : null
}

const cibles = process.argv.slice(2)
const url = cibles[0] || 'https://turf-france.com/php/tqqjour.php?date=0'

const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9' } })
const h = await r.text()

console.log('')
console.log(`  ${url}`)
console.log(`  HTTP ${r.status}  ·  ${h.length} octets`)
console.log('')
console.log('  SYNTHESE DES % : ' + (syntheseDe(h) || 'ABSENTE'))
console.log('')
const l = liensDe(h)
console.log(`  LIENS (${l.length}) :`)
l.forEach((x) => console.log('     ' + x.slice(0, 130)))
console.log('')
