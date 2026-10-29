import fs from 'node:fs'
import { buildGrid, remplirGrille, ticketBassmat } from '../src/lib/quinte.js'
import { buildGrid as bg2 } from '../src/lib/quinte.js'

const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const B = JSON.parse(fs.readFileSync('data/bassmat.json', 'utf8'))
let essaye = 0, change = 0
const ex = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse || []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  const cotesObj = Object.fromEntries(nums.map((n) => [n, { cote: cotes[n] }]))
  const grille = buildGrid(syn, nums)
  const classement = nums.map((n) => ({ p: { num: n }, place: syn.indexOf(n) + 1 }))
  const { detail } = remplirGrille(grille, classement, null, cotesObj)
  const v = ticketBassmat(detail, B, 'normal')
  if (!v) { console.log('null'); continue }
  essaye++
  if (v.echanges.length) change++
  if (ex.length < 4 && v.echanges.length) ex.push({ date: q.date, prod: detail.flatMap((g) => g.cases.filter((c) => c.pris).map((c) => c.num)), bass: v.ticket, ech: v.echanges.map((x) => x.bloc + ': ' + x.sort.map((c) => c.num) + ' -> ' + x.entre.map((c) => c.num)) })
}
console.log('courses', essaye, '| variante differente', change)
for (const e of ex) console.log(e.date, '| prod', e.prod.join(','), '| bass', e.bass.join(','), '|', e.ech.join(' ; '))
