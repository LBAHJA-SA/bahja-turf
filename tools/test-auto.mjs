import { autoCarriere, parseCarriere, scorePhysique, filtres } from '../src/lib/quinte.js'

const courseId = process.argv[2] || '2026-10-03_R1_C4'
const r = await autoCarriere(courseId, (m, p) => console.log(`  ${p}%  ${m}`))
console.log('')
console.log('couverture :', JSON.stringify(r.couverture))
console.log('')
console.log(r.texte)
console.log('')

const car = parseCarriere(r.texte)
const courseJour = { dist: 2500, surf: 'Gazon', sens: 'D', discipline: 'PLAT', hippo: '' }
console.log('num  forme  dist  piste  niveau  terrain  corde  GLOBAL   [1] [2] [3]')
for (const [n, c] of Object.entries(car)) {
  const p = { num: +n, corde: null, valeur: null }
  const s = scorePhysique(p, c, courseJour)
  const f = filtres(p, c, courseJour)
  console.log(
    String(n).padStart(2), String(s.forme).padStart(6), String(s.dist).padStart(6),
    String(s.piste).padStart(6), String(s.niveau).padStart(6), String(s.terrain).padStart(6),
    String(s.corde).padStart(6), String(s.global).padStart(7),
    '  ', f.map((x) => (x.ok ? 'OK' : '--')).join(' '), ' ', f[0].txt, '|', f[1].txt,
  )
}