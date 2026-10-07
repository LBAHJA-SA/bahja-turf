/** Carafe la réponse de casacourses pour une course : quels champs, quelles valeurs. */
const CC = 'https://pro.casacourses.com/api'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'
const id = process.argv[2] || '2026-10-05_R1_C1'
const date = process.argv[3] || id.slice(0, 10)

const r = await fetch(`${CC}/race/${id}?date=${date}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
const j = await r.json()

console.log('  HTTP', r.status, '·', Object.keys(j).length, 'champs')
for (const k of Object.keys(j)) {
  const v = j[k]
  if (Array.isArray(v)) {
    console.log(`  ${k.padEnd(22)} tableau(${v.length})  ${v.length ? JSON.stringify(v[0]).slice(0, 150) : ''}`)
  } else if (v && typeof v === 'object') {
    console.log(`  ${k.padEnd(22)} objet      ${JSON.stringify(v).slice(0, 150)}`)
  } else {
    console.log(`  ${k.padEnd(22)} ${JSON.stringify(v).slice(0, 90)}`)
  }
}
for (const k of ['results', 'resultats', 'arrivée', 'arrivee', 'finishers', 'classement']) {
  if (j[k]) console.log(`\n  >>> ${k} = ${JSON.stringify(j[k]).slice(0, 700)}`)
}