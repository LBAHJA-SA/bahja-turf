// Vérif contre les 2 feuillesTerrain fournies, puis rapport 320 courses.
import { readFileSync, writeFileSync } from 'fs'
import { evalTicket } from './src/lib/ticket.js'

const f = (b) => b.slice(0, 3).join(' - ') + ' - x - x R ' + b.slice(3).join(' - ')
console.log('=== VERIF feuilles terrain ===')
const chk = (box, top5, exp, label) => {
  const r = evalTicket(box, top5, false)
  const got = `D=${r.desordre} b4=${r.b4} b3=${r.b3}`
  console.log(`${got === exp ? 'OK  ' : 'DIFF'} ${label}  => ${got}   (attendu ${exp})`)
}
chk([8, 2, 6, 11, 15, 9, 14, 7], [4, 2, 8, 6, 5], 'D=0 b4=0 b3=0', 'COMPIEGNE 25/05 L1')
chk([15, 8, 2, 11, 5, 9, 14, 6], [4, 2, 8, 6, 5], 'D=0 b4=0 b3=0', 'COMPIEGNE 25/05 L2')
chk([13, 15, 11, 18, 12, 14, 10, 7], [13, 11, 12, 10, 15], 'D=2 b4=0 b3=6', 'VINCENNES 25/09 L1')

console.log('\n=== RAPPORT 320 courses ===')
const rows = JSON.parse(readFileSync('analyse.json', 'utf8'))
const out = rows.map((r) => ({ ...r, e1: evalTicket(r.box1, r.top5, r.ctry === 'MA'), e2: evalTicket(r.box2, r.top5, r.ctry === 'MA') }))
writeFileSync('analyse-final.json', JSON.stringify(out, null, 1))
const pct = (a, b) => (b ? Math.round((100 * a) / b) + '%' : '-')

for (const c of ['global', 'second', 'maroc']) {
  const g = out.filter((r) => r.cat === c); if (!g.length) continue
  const n = g.length
  console.log(`\n[${c}] n=${n}  (${c === 'maroc' ? 'regle Sorec' : 'regle PMU'})`)
  console.log(`  Tiercé  (b3>0) : L1 ${pct(g.filter((r) => r.e1.b3 > 0).length, n)}   L2 ${pct(g.filter((r) => r.e2.b3 > 0).length, n)}`)
  console.log(`  Quarté  (b4>0) : L1 ${pct(g.filter((r) => r.e1.b4 > 0).length, n)}   L2 ${pct(g.filter((r) => r.e2.b4 > 0).length, n)}`)
  console.log(`  Désordre(D >0) : L1 ${pct(g.filter((r) => r.e1.desordre > 0).length, n)}   L2 ${pct(g.filter((r) => r.e2.desordre > 0).length, n)}`)
  const g1 = g.filter((r) => r.e1.b3 + r.e1.b4 + r.e1.desordre > 0).length
  const g2 = g.filter((r) => r.e2.b3 + r.e2.b4 + r.e2.desordre > 0).length
  const any = g.filter((r) => r.e1.b3 + r.e1.b4 + r.e1.desordre + r.e2.b3 + r.e2.b4 + r.e2.desordre > 0).length
  console.log(`  gain: L1 ${pct(g1, n)}  L2 ${pct(g2, n)}  |  >=1 ligne ${pct(any, n)}`)
}
