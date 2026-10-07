// Discussion du fichier ض.txt — AUCUN changement de moteur.
// 1) Où sont lesusailles ?  2) Le cheval manqué était-il dans une AUTRE liste ?
import { readFileSync } from 'fs'

const txt = readFileSync('C:/Users/sam/Desktop/ض.txt', 'utf8')
const lines = txt.split(/\r?\n/)

// on découpe par blocs séparés par des lignes de "====="
const blocs = []
let cur = []
for (const l of lines) {
  if (/^={10,}/.test(l.trim())) { if (cur.length) blocs.push(cur); cur = [] }
  else if (l.trim()) cur.push(l)
}
if (cur.length) blocs.push(cur)

// un bloc = une course (on saute les blocs de titre)
const courses = []
for (const b of blocs) {
  const j = b.join('\n')
  const am = j.match(/Arrivée\s*:\s*([0-9\s\-]+)/); if (!am) continue
  const dm = j.match(/(\d{4}-\d{2}-\d{2})/)
  const hp = j.match(/R(\d+)-C(\d+)/)
  const sm = j.match(/Synth.se\s*([0-9][0-9\s\-]*)/)
  if (!dm || !sm) continue
  const arrivee = am[1].trim().split('-').map((s) => parseInt(s, 10)).filter(Number.isFinite).slice(0, 5)
  const synth = sm[1].trim().split('-').map((s) => parseInt(s, 10)).filter(Number.isFinite)
  if (arrivee.length < 5 || synth.length < 5) continue
  // le HIPPODROME
  const country = /🇲🇦/.test(j) ? 'MAROC' : 'FRANCE'
  // les AUTRES listes citées dans le bloc
  const autres = {}
  for (const m of j.matchAll(/(Top Forme|Top Chronos|Outsiders|Ecarts|incontournables|Top Entraineurs|Top Classe|Top Cotes|Délaisser)[^\n]*?\n([0-9\s\-]+)/gi)) {
    autres[m[1]] = m[2].trim().split('-').map((s) => parseInt(s, 10)).filter(Number.isFinite)
  }
  // le motif écrit par l'utilisateur
  const note = (j.match(/([\u0600-\u06FF][^\n]*)/) || [])[1] || ''
  const pos = (j.match(/([\u0600-\u06FF]+)\s*مفقود/) || [])[1] || null
  courses.push({ date: dm[1], R: hp ? hp[1] : '?', C: hp ? hp[2] : '?', country, arrivee, synth, autres, pos, note })
}

console.log(`COURSES DANS LE FICHIER : ${courses.length}`)
const rep = (c) => `${c.date} ${c.country.padEnd(6)} R${c.R}C${c.C}`
const h = (c) => c.arrivee.filter((x) => c.synth.includes(x)).length

// ── 1. Les 10 désordre
const win = courses.filter((c) => h(c) === 5)
const bonus = courses.filter((c) => h(c) === 4)
const perte = courses.filter((c) => h(c) < 4)
console.log(`\n═══ RÉPARTITION ═══`)
console.log(`  DÉSORDRE (5/5) : ${win.length}   ·   BONUS (4/5) : ${bonus.length}   ·   < 4/5 : ${perte.length}`)
for (const c of win) console.log(`     ✅ ${rep(c)}  arrivée ${c.arrivee.join('-')}  ·  ton ${c.synth.join('-')}`)
for (const c of bonus) console.log(`     🟡 ${rep(c)}  arrivée ${c.arrivee.join('-')}  ·  manque ${c.arrivee.filter((x) => !c.synth.includes(x)).join(',')}`)

// ── 2. Quelle position manque ?
console.log(`\n═══ 2. QUELLE PLACE MANQUE (chaque fois qu'un vainqueur manque) ═══`)
for (const [lab, set] of [['FRANCE', courses.filter((c) => c.country === 'FRANCE')], ['MAROC', courses.filter((c) => c.country === 'MAROC')], ['TOTAL', courses]]) {
  const p = [0, 0, 0, 0, 0]
  set.forEach((c) => c.arrivee.forEach((x, i) => { if (!c.synth.includes(x)) p[i]++ }))
  const tot = p.reduce((a, b) => a + b, 0)
  if (!tot) { console.log(`  ${lab.padEnd(7)} aucun manque`); continue }
  console.log(`  ${lab.padEnd(7)} (${set.length} courses, ${tot} vainqueurs manquants)`)
  p.forEach((v, i) => console.log(`     ${i + 1}re place : ${String(v).padStart(2)} fois  ${'█'.repeat(Math.round((v / tot) * 30))}  ${Math.round((100 * v) / tot)}%`))
}

// ── 3. Le cheval manqué était-il dans une AUTRE liste ?
console.log(`\n═══ 3. LE CHEVAL MANQUÉ ÉTAIT-IL DANS UNE AUTRE LISTE ? ═══`)
const LI = ['Top Forme', 'Top Chronos', 'Outsiders', 'Ecarts', 'incontournables', 'Top Entraineurs', 'Top Classe', 'Top Cotes', 'Délaisser']
const touches = {}
let manques = 0
for (const c of courses) {
  c.arrivee.forEach((x) => {
    if (c.synth.includes(x)) return
    manques++
    for (const k of LI) {
      const v = c.autres[k] || c.autres[Object.keys(c.autres).find((o) => o.toLowerCase() === k.toLowerCase())]
      if (v && v.includes(x)) { (touches[k] = touches[k] || []).push(`${c.date} n°${x} (${c.country})`); break }
    }
  })
}
console.log(`  Total de vainqueurs manquants : ${manques}`)
Object.keys(touches).sort((a, b) => touches[b].length - touches[a].length).forEach((k) => {
  console.log(`  ✅ ${k.padEnd(16)} : ${touches[k].length} fois  →  ${touches[k].join(', ')}`)
})
const absents = LI.filter((k) => !touches[k])
console.log(`  ❌ jamais dans une autre liste : ${absents.join(', ')}`)
