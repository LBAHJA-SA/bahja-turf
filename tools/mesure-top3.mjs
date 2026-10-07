/* ---------------------------------------------------------------
 * tools\mesure-top3.mjs  —  المراكز التلاتة الأولى معاً : الطوب 8
 *
 *   node tools\mesure-top3.mjs
 *
 * La question, telle quelle : sur les 3 premiers ensemble,
 * quel pourcentage vient du « bas du classement » (le TOP 8 en dessous),
 * et quel pourcentage échoue ?
 *
 * Le corpus : `data\corpus\presse-carriere.json` — 94 Quintés qui ont à la
 * fois la Synthèse de la presse ET les partants.
 *
 * Deux façons de dire « le bas », parce qu'elles ne donnent pas la même chose :
 *   · par la COTE    → « hors du top 8 des cotes » = rang de cote > 8
 *   · par la PRESSE  → « hors de P1-P8 »          = rang de presse > 8
 *
 * Et on sépare bien la 1re, la 2e, la 3e — puis les trois ensemble.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'presse-carriere.json')

const brut = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = []
for (const k of Object.values(brut)) {
  if (!k.partants?.length || k.partants.length < 10) continue
  if (!k.arrivee?.length || k.arrivee.length < 5) continue
  const presse = (k.presse || []).filter((x) => k.arrivee.includes(x))
  const nums = presse.concat(k.arrivee.filter((x) => !presse.includes(x)))
  if (nums.length < 10) continue
  const pDe = new Map(nums.map((x, i) => [x, i + 1]))
  const avecC = Object.keys(k.cotes || {}).map(Number).filter((x) => k.cotes[x] > 0)
  if (avecC.length < 8) continue
  const cDe = new Map(avecC.sort((a, b) => k.cotes[a] - k.cotes[b]).map((x, i) => [x, i + 1]))
  base.push({ ...k, nums, pDe, cDe, nb: nums.length })
}
const n = base.length
const POS = ['1er', '2e ', '3e ']

const nbPartants = base.map((k) => k.nb)
const moyenne = (a) => a.reduce((x, y) => x + y, 0) / a.length
const p = (v, t) => (t ? (v / t * 100).toFixed(1) + ' %' : '—')

console.log('')
console.log(`  ⭐ المراكز التلاتة الأولى — معاً و واحد بوحدهم — ${n} Quintés`)
console.log(`     nombre moyen de partants : ${moyenne(nbPartants).toFixed(1)}`)
console.log('')

/* ---------------------------------------------- 1. par la COTE ------------- */
console.log('  ┌─────────────────────────────────────────────────────────────────────┐')
console.log('  │  par la COTE — « hors du top 8 des cotes » = rang de cote > 8       │')
console.log('  └─────────────────────────────────────────────────────────────────────┘')
console.log('')
console.log('  position     dans le TOP 8        HORS du top 8       verdict')
console.log('  ' + '-'.repeat(72))
const parCote = []
for (let i = 0; i < 3; i++) {
  let ded = 0
  let tot = 0
  for (const k of base) {
    const c = k.cDe.get(k.arrivee[i])
    if (c == null) continue
    tot++
    if (c <= 8) ded++
  }
  parCote.push({ ded, tot, hors: tot - ded })
  console.log('  ' + POS[i] + String(ded).padStart(12) + ' (' + p(ded, tot) + ')' + String(tot - ded).padStart(18) + ' (' + p(tot - ded, tot) + ')')
}
let ded3 = 0
let tot3 = 0
for (const k of base) for (let i = 0; i < 3; i++) { const c = k.cDe.get(k.arrivee[i]); if (c == null) continue; tot3++; if (c <= 8) ded3++ }
console.log('  ' + '-'.repeat(72))
console.log('  ⭐ ' + 'les 3 ensemble'.padEnd(9) + String(ded3).padStart(12) + ' (' + p(ded3, tot3) + ')' + String(tot3 - ded3).padStart(18) + ' (' + p(tot3 - ded3, tot3) + ')')
console.log('')
console.log('  ⭐ RÉPONSE : le bas du classement gagne ' + p(tot3 - ded3, tot3) + ' des places de podium')
console.log('               le top 8 gagne             ' + p(ded3, tot3))
console.log('')

/* ---------------------------------------------- 2. par la PRESSE ----------- */
console.log('  ┌─────────────────────────────────────────────────────────────────────┐')
console.log('  │  par la PRESSE — « hors de P1-P8 » = rang de presse > 8             │')
console.log('  └─────────────────────────────────────────────────────────────────────┘')
console.log('')
console.log('  position     dans P1-P8          HORS de P1-P8       verdict')
console.log('  ' + '-'.repeat(72))
for (let i = 0; i < 3; i++) {
  let ded = 0
  let tot = 0
  for (const k of base) {
    const pR = k.pDe.get(k.arrivee[i])
    if (pR == null) continue
    tot++
    if (pR <= 8) ded++
  }
  console.log('  ' + POS[i] + String(ded).padStart(12) + ' (' + p(ded, tot) + ')' + String(tot - ded).padStart(18) + ' (' + p(tot - ded, tot) + ')')
}
let dedP = 0
let totP = 0
for (const k of base) for (let i = 0; i < 3; i++) { const pR = k.pDe.get(k.arrivee[i]); if (pR == null) continue; totP++; if (pR <= 8) dedP++ }
console.log('  ' + '-'.repeat(72))
console.log('  ⭐ ' + 'les 3 ensemble'.padEnd(9) + String(dedP).padStart(12) + ' (' + p(dedP, totP) + ')' + String(totP - dedP).padStart(18) + ' (' + p(totP - dedP, totP) + ')')
console.log('')

/* ---------------------------------------------- 3. combien par course ------ */
console.log('  ⭐ كم من الـ3 خارجين TOP 8 في نفس الـcourse (par la cote) ?')
console.log('')
const rep = [0, 0, 0, 0]
for (const k of base) {
  let h = 0
  for (let i = 0; i < 3; i++) { const c = k.cDe.get(k.arrivee[i]); if (c != null && c > 8) h++ }
  rep[h]++
}
for (let h = 0; h <= 3; h++) {
  console.log('  ' + h + ' sur 3   ' + String(rep[h]).padStart(4) + ' courses   ' + p(rep[h], n))
}
const auMoins1 = rep[1] + rep[2] + rep[3]
console.log('')
console.log('  ⭐ au moins UN des 3 hors du top 8 : ' + auMoins1 + '/' + n + ' = ' + p(auMoins1, n))
console.log('  ⭐ DEUX ou trois hors du top 8    : ' + (rep[2] + rep[3]) + '/' + n + ' = ' + p(rep[2] + rep[3], n))
console.log('')

/* ---------------------------------------------- 4. la zone précise --------- */
console.log('  ⭐ où sont précisément les gagnants « hors du top 8 » ? (rang de cote)')
console.log('')
const zones = {}
for (const k of base) {
  for (let i = 0; i < 3; i++) {
    const c = k.cDe.get(k.arrivee[i])
    if (c == null || c <= 8) continue
    const cle = c <= 10 ? 'r9-10' : c <= 12 ? 'r11-12' : c <= 14 ? 'r13-14' : 'r15+'
    zones[cle] = (zones[cle] || 0) + 1
  }
}
for (const cle of ['r9-10', 'r11-12', 'r13-14', 'r15+']) {
  const v = zones[cle] || 0
  console.log('  ' + cle.padEnd(8) + String(v).padStart(4) + ' fois   ' + p(v, tot3 - ded3) + ' desuccès du bas')
}
console.log('')
console.log('  le hasard pur donnerait : ' + p(Math.max(0, moyenne(nbPartants) - 8), moyenne(nbPartants) * 3) + ' des places de podium')
console.log('')
