import { execFile } from 'node:child_process'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
const CURL_BIN = 'curl.exe'

function curlTexte(url, delai = 55000) {
  return new Promise((resolve) => {
    execFile('curl.exe', ['-sS', '-m', String(Math.ceil(delai / 1000)), '-A', UA, '--compressed', url],
      { timeout: delai, maxBuffer: 12 * 1024 * 1024 }, (err, stdout) => {
        if (err) resolve(null)
        else resolve(String(stdout || ''))
      })
  })
}

async function test() {
  const url = 'https://www.equidia.fr/courses/2026-10-13/R1/C1'
  const html = await curlTexte(url)
  console.log('Length:', html?.length)
  if (!html) { console.log('No HTML'); return }
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
  
  const courseKey = 'v2/courses/2026-10-13/R1/C1'
  if (st[courseKey]) {
    console.log('v2/courses keys:', Object.keys(st[courseKey]))
    if (st[courseKey].runners) {
      console.log('Has runners:', st[courseKey].runners.length)
      for (const x of st[courseKey].runners.slice(0, 5)) {
        console.log('Runner keys:', Object.keys(x))
        console.log('  num:', x.num_partant || x.numero || x.num)
        console.log('  cheval:', x.cheval?.nom_cheval)
        console.log('  lastPerformance:', x.lastPerformance || x.cheval?.lastPerformance)
        console.log('  forms:', x.forms || x.cheval?.forms)
      }
    }
    
    const pariKey = 'courses/2026-10-13/R1/C1/pari_simple'
    if (st[pariKey]) {
      console.log('\npari_simple first item keys:', Object.keys(st[pariKey][0] || {}))
      if (st[pariKey][0]) {
        console.log('  Item:', JSON.stringify(st[pariKey][0], null, 2).slice(0, 500))
      }
    }
  }
}
test()