import fs from 'node:fs'
const a = JSON.parse(fs.readFileSync('data/corpus/archive-94.json', 'utf8'))
const f = JSON.parse(fs.readFileSync('data/corpus/fusion.json', 'utf8'))
console.log('=== archive-94 : champs d une course ===')
console.log(Object.keys(a.courses[0]).join(', '))
console.log('')
console.log('=== archive-94 : partants[0] ===')
const p = a.courses[0].partants
console.log('type', Array.isArray(p) ? 'array[' + p.length + ']' : typeof p)
if (Array.isArray(p) && p[0]) console.log(JSON.stringify(p[0], null, 1).slice(0, 700))
console.log('')
console.log('=== archive-94 : gains[0] ===')
const g = a.courses[0].gains
console.log('type', Array.isArray(g) ? 'array[' + g.length + ']' : typeof g)
if (Array.isArray(g) && g[0]) console.log(JSON.stringify(g[0], null, 1).slice(0, 500))
if (g && !Array.isArray(g)) console.log(Object.keys(g).slice(0, 12).join(', '))
console.log('')
console.log('=== fusion : champs ===')
console.log(Object.keys(f.courses[0]).join(', '))
console.log('')
console.log('=== donnees disponibles avant la course, par source ===')
const c = f.courses.find((x) => x.source === 'B') || f.courses[0]
console.log('source', c.source, c.cle)
console.log('  discipline :', c.discipline)
console.log('  distance   :', c.distance)
console.log('  hippodrome :', c.hippodrome)
console.log('  nbPartants :', c.nbPartants)
console.log('  ouverture  :', JSON.stringify((c.ouverture || {}).slice ? Object.entries(c.ouverture).slice(0, 4) : c.ouverture))
console.log('  partants   :', Array.isArray(c.partants) ? c.partants.length + ' entrées' : typeof c.partants)
console.log('')
const avecPartants = f.courses.filter((x) => x.partants && x.partants.length).length
const avecGains = f.courses.filter((x) => x.gains && x.gains.length).length
const avecOuverture = f.courses.filter((x) => x.ouverture && Object.keys(x.ouverture).length >= 5).length
const avecDiscip = f.courses.filter((x) => x.discipline).length
const avecDist = f.courses.filter((x) => x.distance).length
const avecHippo = f.courses.filter((x) => x.hippodrome).length
console.log('sur ' + f.courses.length + ' courses de fusion.json :')
console.log('  partants  : ' + avecPartants)
console.log('  gains     : ' + avecGains)
console.log('  ouverture : ' + avecOuverture)
console.log('  discipline: ' + avecDiscip)
console.log('  distance  : ' + avecDist)
console.log('  hippodrome: ' + avecHippo)