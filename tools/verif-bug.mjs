import fs from 'node:fs'
const f = JSON.parse(fs.readFileSync('data/corpus/fusion.json', 'utf8'))
const c = JSON.parse(fs.readFileSync('data/corpus/chevaux.json', 'utf8'))

console.log('=== 1. y a-t-il des cotes a 0 ou nulles ? ===')
let zero = 0
let nul = 0
let total = 0
let avecZero = 0
for (const k of f.courses) {
  let z = 0
  for (const v of Object.values(k.cotes || {})) {
    total++
    if (v === 0) { zero++; z++ }
    if (v == null || Number.isNaN(v)) nul++
  }
  if (z) avecZero++
}
console.log('  cotes totales :', total, '| a 0 :', zero, '| nulles :', nul, '| courses touchees :', avecZero, '/', f.courses.length)
console.log('')

console.log('=== 2. ordreCote contient-il des chevaux a cote <= 0 ? ===')
let dansOrdre = 0
const exemples = []
for (const k of f.courses) {
  for (const num of k.ordreCote || []) {
    const v = k.cotes[num]
    if (!v || v <= 0) {
      dansOrdre++
      if (exemples.length < 8) exemples.push(k.cle + '  n' + num + '  cote=' + v + '  RANG=' + (k.ordreCote.indexOf(num) + 1))
    }
  }
}
console.log('  chevaux a cote <= 0 qui sont DANS ordreCote :', dansOrdre)
exemples.forEach((e) => console.log('    ' + e))
console.log('')

console.log('=== 3. cote du PREMIER cheval de ordreCote ===')
const st = {}
for (const k of f.courses) {
  const num = (k.ordreCote || [])[0]
  if (num == null) continue
  const v = k.cotes[num]
  const cle = v <= 0 ? 'cote <= 0' : v < 5 ? 'cote < 5' : v < 15 ? 'cote 5-15' : 'cote > 15'
  st[cle] = (st[cle] || 0) + 1
}
console.log(' ', JSON.stringify(st))
console.log('')

console.log('=== 4. taux de Top5 par rang, sur le corpus chevaux ===')
for (let r = 1; r <= 14; r++) {
  const v = []
  for (const k of c.courses) {
    const p = k.partants.find((x) => x.rangMarche === r)
    if (p) v.push(p)
  }
  if (!v.length) break
  const t5 = v.filter((x) => x.top5).length
  const cotes = v.map((x) => x.cote).filter((x) => x > 0)
  const moyCote = cotes.length ? cotes.reduce((a, b) => a + b, 0) / cotes.length : 0
  console.log('  P' + String(r).padEnd(3) + ' n=' + String(v.length).padStart(4)
    + '  Top5=' + String(t5).padStart(4) + '  ' + (t5 / v.length * 100).toFixed(1).padStart(5) + ' %'
    + '   cote moyenne ' + moyCote.toFixed(1))
}
console.log('')

console.log('=== 5. combien de chevaux classes par course ? ===')
const par = {}
c.courses.forEach((k) => { const n = k.partants.filter((p) => p.rangMarche).length; par[n] = (par[n] || 0) + 1 })
console.log(' ', JSON.stringify(par))
const petits = c.courses.filter((k) => k.partants.filter((p) => p.rangMarche).length <= 13).length
console.log('  courses avec <= 13 chevaux classes :', petits, '/', c.courses.length, '=', (petits / c.courses.length * 100).toFixed(1), '%')
console.log('')

console.log('=== 6. verification du 5/5 des "8 premiers", 12 cas ===')
for (const k of c.courses.slice(0, 12)) {
  const m = new Map()
  k.partants.filter((p) => p.rangMarche).forEach((p) => m.set(p.rangMarche, p.num))
  const huit = [1, 2, 3, 4, 5, 6, 7, 8].map((r) => m.get(r)).filter(Boolean)
  const top5 = k.arrivee.slice(0, 5)
  const pris = top5.filter((x) => huit.includes(x)).length
  const rangs = top5.map((x) => {
    const p = k.partants.find((y) => y.num === x)
    return p ? p.rangMarche : '?'
  })
  console.log('  ' + k.cle.padEnd(18) + 'nb=' + String(m.size).padStart(2)
    + '  top5=[' + top5.join(' ') + ']'
    + '  pris=' + pris + '/5   rangs=' + rangs.join(','))
}
console.log('')

console.log('=== 7. le tier des cotes de la source B (quintes.json) ===')
const q = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const L = Object.values(q)
let z = 0
let t = 0
for (const k of L) { for (const v of Object.values(k.cotes || {})) { t++; if (v <= 0) z++ } }
console.log('  cotes a 0 :', z, '/', t)
const ex = L.find((k) => Object.values(k.cotes).some((v) => v <= 0))
if (ex) console.log('  exemple', ex.date, ex.code, JSON.stringify(ex.cotes).slice(0, 160))
console.log('')

console.log('=== 8. le tier des cotes de la source C (Desktop) ===')
const zc = c.courses.filter((k) => k.source === 'C')
let zc2 = 0
for (const k of zc) for (const p of k.partants) if (!(p.cote > 0)) zc2++
console.log('  chevaux sans cote en source C :', zc2, '/', zc.length, 'courses')
console.log('')

console.log('=== 9. par source : combien de chevaux avec cote <= 0 ? ===')
const parSrc = {}
for (const k of c.courses) {
  const s = k.source
  if (!parSrc[s]) parSrc[s] = { courses: 0, sansCote: 0, che: 0 }
  parSrc[s].courses++
  for (const p of k.partants) { parSrc[s].che++; if (!(p.cote > 0)) parSrc[s].sansCote++ }
}
for (const [s, v] of Object.entries(parSrc)) {
  console.log('  source ' + s + ' : ' + v.courses + ' courses, ' + v.che + ' chevaux, sans cote ' + v.sansCote)
}