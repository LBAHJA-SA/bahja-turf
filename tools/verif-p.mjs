/* Vérifie que Écarts, LA GRILLE et Statistiques utilisent le MÊME P. */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const SYN = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const date = process.argv[2] || Object.keys(SYN).sort().pop()
const r = SYN[date]
if (!r) { console.log('pas de course pour ' + date); process.exit(1) }

const presse = r.synthese.map(Number)
const runners = (r.runners || []).map(Number).filter(Number.isFinite)
const g = buildGrid(presse, runners)

const numAtSlot = {}
for (const [num, slot] of Object.entries(g.slotParNum || {})) numAtSlot[slot] = Number(num)

console.log('date       :', date, '·', r.hippodrome, '·', r.discipline)
console.log('synthèse   :', presse.join(' · '))
console.log('partants   :', runners.length)
console.log('arrivée    :', (r.arrivee || []).length ? r.arrivee.join(' - ') : '(non clôturée)')
console.log('')
console.log('P    numéro   rang presse')
console.log('─'.repeat(34))
for (let p = 1; p <= 20; p++) {
  const num = numAtSlot[p]
  const rang = num ? presse.indexOf(num) + 1 : '—'
  console.log('P' + String(p).padEnd(3), String(num ?? '—').padEnd(8), rang)
}

/* contrôle : le nombre de cases = le nombre de partants */
const slots = Object.keys(numAtSlot).length
console.log('')
console.log('cases remplies :', slots, '/', runners.length, slots === runners.length ? '✅' : '⚠️')
