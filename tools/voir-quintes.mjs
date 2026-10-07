import fs from 'node:fs'
const j = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const L = Object.keys(j)
const e = j[L[3]]
console.log('exemple cle', L[3], ':')
const v = {}
for (const k in e) v[k] = Array.isArray(e[k]) ? '[array ' + e[k].length + '] ' + JSON.stringify(e[k]).slice(0, 90) : e[k]
console.log(JSON.stringify(v, null, 1).slice(0, 1800))
console.log('')
console.log('nb avec presse non vide :', L.filter((k) => Array.isArray(j[k].presse) && j[k].presse.length >= 5).length)
console.log('nb avec nbAvis > 0     :', L.filter((k) => j[k].nbAvis > 0).length)
console.log('nb avec ouverture      :', L.filter((k) => j[k].ouverture && Object.keys(j[k].ouverture).length >= 5).length)
console.log('nb avec arrivee >= 5   :', L.filter((k) => Array.isArray(j[k].arrivee) && j[k].arrivee.length >= 5).length)
const par = {}
L.forEach((k) => { const m = j[k].discipline; par[m] = (par[m] || 0) + 1 })
console.log('disciplines:', JSON.stringify(par))