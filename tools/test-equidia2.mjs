import fetch from 'node:fetch'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

async function test() {
  const url = 'https://www.equidia.fr/courses/2026-10-13/R1/C1'
  const resp = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(20000) })
  console.log('Status:', resp.status)
  const html = await resp.text()
  console.log('Length:', html.length)
  const m = html.match(/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) { console.log('No script found'); return }
  const txt = m[1]
    .replace(/"/g, '"')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/'/g, "'")
    .replace(/&/g, '&')
  const st = JSON.parse(txt)
  console.log('Keys count:', Object.keys(st).length)
  for (const key of Object.keys(st)) {
    if (key.includes('pari_simple') || key.includes('v2/courses')) {
      console.log('Found key:', key)
      const data = st[key]
      if (Array.isArray(data)) {
        for (const x of data.slice(0, 16)) {
          console.log('  num:', x.num_partant, 'cheval:', x.cheval?.nom_cheval, 'lastPerf:', x.cheval?.lastPerformance, 'forms:', x.cheval?.forms)
        }
      }
      break
    }
  }
}
test()