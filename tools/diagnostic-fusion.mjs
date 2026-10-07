import fs from 'node:fs'
const f = JSON.parse(fs.readFileSync('data/corpus/fusion.json', 'utf8'))
const C = f.courses
console.log('n', C.length)
const parN = {}
C.forEach((c) => { const n = (c.ordreCote || []).length; parN[n] = (parN[n] || 0) + 1 })
console.log('taille de ordreCote :', JSON.stringify(parN))
console.log('')
console.log('nbPartants :', JSON.stringify(C.reduce((a, c) => { a[c.nbPartants] = (a[c.nbPartants] || 0) + 1; return a }, {})))
console.log('')
const c = C[0]
console.log('exemple', c.cle, 'nbPartants', c.nbPartants, 'ordreCote', (c.ordreCote || []).length)
console.log('  arrivee', JSON.stringify(c.arrivee))
console.log('  cotes', JSON.stringify(c.cotes))
console.log('')
const c2 = C.find((x) => x.source === 'C')
console.log('exemple source C', c2.cle, 'nbPartants', c2.nbPartants, 'ordreCote', (c2.ordreCote || []).length)
console.log('  arrivee', JSON.stringify(c2.arrivee))
console.log('  cotes', JSON.stringify(c2.cotes))
console.log('')
const c3 = C.find((x) => x.source === 'B')
console.log('exemple source B', c3.cle, 'nbPartants', c3.nbPartants, 'ordreCote', (c3.ordreCote || []).length)