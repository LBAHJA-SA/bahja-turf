/* ---------------------------------------------------------------
 * tools\drops.mjs  —  ⭐⭐ À QUI JETTE-T-ON DES CHEVAUX QUI GAGNENT
 *
 *   node tools\drops.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Quotas 3-2-1-1-1 intacts (§11.16).
 *   Moteur A : chaque bloc rempli par la cote.
 *
 * LA QUESTION, suite logique de l'empreinte d'échec :
 *
 *   dans G1 on garde 3 sur 4 → on JETTE UN CHEVAL.
 *   dans G2 on garde 2 sur 4 → on en JETTE DEUX.
 *
 *   Ce cheval jeté, il est arrivé 4e ? 5e ? jamais ?
 *
 * On mesure le COÛT DE L'EXCLUSION : combien de chevaux écartés se
 * retrouve dans le Top 3 / Top 4 / Top 5 alors que la ticket ne les avait
 * pas. C'est la perte sèche, mesurée cheval par cheval.
 *
 * Et comme le choix est fermé (4 options en G1, 6 en G2), on peut demander
 * l'ORACLE DU JET : si l'on jetait toujours le même, combien de gagnants
 * jetterait-on ? Le minimum de ce chiffre est le plafond de ce levier.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'archive-94.json')

const BLOCS = [
  { id: 'G1', min: 1, max: 4, quota: 3 }, { id: 'G2', min: 5, max: 8, quota: 2 },
  { id: 'G3', min: 9, max: 10, quota: 1 }, { id: 'G4', min: 11, max: 12, quota: 1 },
  { id: 'G5', min: 13, max: 99, quota: 1 },
]

const fichier = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = fichier.courses
  .map((k) => {
    const pDe = new Map(k.presse.map((x, i) => [x, i + 1]))
    const avecC = Object.keys(k.cotes).map(Number).filter((x) => k.cotes[x] > 0)
    return { ...k, pDe, cDe: new Map(avecC.sort((a, b) => k.cotes[a] - k.cotes[b]).map((x, i) => [x, i + 1])) }
  })
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = base.length
const blocDe = (k, num) => BLOCS.findIndex((b) => { const p = k.pDe.get(num); return p >= b.min && p <= b.max })
const numsDuBloc = (k, i) => k.presse.filter((x) => blocDe(k, x) === i)
const parCote = (k, i) => numsDuBloc(k, i).slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))
const rangsDuBloc = (k, i) => numsDuBloc(k, i).slice().sort((a, b) => k.pDe.get(a) - k.pDe.get(b))
const ticketA = (k) => BLOCS.flatMap((b, i) => parCote(k, i).slice(0, b.quota))

console.log('')
console.log('  ⭐⭐ À QUI JETTE-T-ON DES CHEVAUX QUI GAGNENT — moteur A, quotas 3-2-1-1-1')
console.log(`     ${n} Quintés`)
console.log('')

/* ═════════════ ① le coût de l'exclusion, bloc par bloc ══════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ① COMBIEN DE CHEVAUX ÉCARTÉS ÉTAIENT DANS LE TOP 3 / 4 / 5 ?')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  bloc   écartés   dont dans le top 3   top 4   top 5   |  coût : % des écartés qui étaient dans le top 5')
console.log('  ' + '-'.repeat(104))
const stat = BLOCS.map(() => ({ ecartes: 0, t3: 0, t4: 0, t5: 0 }))
const parRang = BLOCS.map(() => ({ ecartes: 0, t3: 0, t4: 0, t5: 0 }))
const parPresse = BLOCS.map(() => new Map())

for (const k of base) {
  const tk = new Set(ticketA(k))
  BLOCS.forEach((b, bi) => {
    const nums = numsDuBloc(k, bi)
    const gardes = new Set(parCote(k, bi).slice(0, b.quota))
    const ecartes = nums.filter((x) => !gardes.has(x))
    ecartes.forEach((num) => {
      const dans3 = k.podium.includes(num)
      const dans4 = k.arrivee.slice(0, 4).includes(num)
      const dans5 = k.top5.includes(num)
      stat[bi].ecartes++
      if (dans3) stat[bi].t3++
      if (dans4) stat[bi].t4++
      if (dans5) stat[bi].t5++
      const r = nums.slice().sort((a, b2) => k.pDe.get(a) - k.pDe.get(b2)).indexOf(num) + 1
      const e = parRang[bi][r - 1] || (parRang[bi][r - 1] = { ecartes: 0, t3: 0, t4: 0, t5: 0 })
      e.ecartes++
      if (dans3) e.t3++
      if (dans4) e.t4++
      if (dans5) e.t5++
      const cle = 'P' + k.pDe.get(num)
      const c = parPresse[bi].get(cle) || { ecartes: 0, t5: 0 }
      c.ecartes++
      if (dans5) c.t5++
      parPresse[bi].set(cle, c)
    })
  })
}
let TE = 0
let T5 = 0
BLOCS.forEach((b, i) => {
  const s = stat[i]
  TE += s.ecartes
  T5 += s.t5
  const cout = s.ecartes ? (s.t5 / s.ecartes * 100).toFixed(0) + ' %' : '—'
  console.log('  ' + b.id.padEnd(6) + String(s.ecartes).padStart(8) + String(s.t3).padStart(20) + String(s.t4).padStart(7)
    + String(s.t5).padStart(7) + '   |  ' + cout)
})
console.log('  ' + '-'.repeat(104))
console.log('  ' + 'TOTAL'.padEnd(6) + String(TE).padStart(8) + ''.padStart(20) + String(stat.reduce((s, e) => s + e.t4, 0)).padStart(7)
  + String(T5).padStart(7) + '   |  ' + (T5 / TE * 100).toFixed(0) + ' %')
console.log('')
console.log(`  ⭐ ${T5} chevaux écartés étaient dans le Top 5. C'est la perte sèche du moteur A.`)
console.log('')

/* ═══════ ② quel rang DANS le bloc est-ce qu on jette ? ═════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ② QUEL RANG DANS LE BLOC EST-CE QU ON JETTE — et est-ce le bon ?')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
BLOCS.forEach((b, bi) => {
  const places = numsDuBloc(base[0], bi).length
  if (!places) return
  console.log(`  ${b.id} — on jette ${places - b.quota} sur ${places}`)
  console.log('    rang dans le bloc   écartés   dont top 4   dont top 5')
  console.log('    ' + '-'.repeat(58))
  for (let r = 0; r < places; r++) {
    const e = parRang[bi][r]
    if (!e) continue
    const lib = r + 1
    const estLeDernier = r >= b.quota
    console.log('    ' + ('P' + (b.min + r)).padEnd(19) + String(e.ecartes).padStart(10) + String(e.t4).padStart(12)
      + String(e.t5).padStart(13) + (estLeDernier ? '   ← normalement celui-ci est jeté' : ''))
  }
  console.log('')
})

/* ══════ ③ l'oracle du jet : si on jetait toujours le même ? ═══════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ③ ORACLE DU JET — quel rang jetter TOUJOURS pour perdre le moins ?')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  bloc   option                      gagnants jetés   (le minimum est le plafond du levier)')
console.log('  ' + '-'.repeat(72))
for (let bi = 0; bi < BLOCS.length; bi++) {
  const b = BLOCS[bi]
  const places = numsDuBloc(base[0], bi).length
  if (places < 2) continue
  const options = []
  for (let j = b.quota; j < places; j++) {
    /* on jette le rang (j+1) du bloc, on garde les b.quota premiers par cote */
    let perdus = 0
    let ecartees = 0
    for (const k of base) {
      const nums = numsDuBloc(k, bi)
      if (nums.length <= j) continue
      const parRangP = nums.slice().sort((a, c) => k.pDe.get(a) - k.pDe.get(c))
      const aJeter = parRangP[j]
      const gardes = new Set(parCote(k, bi).slice(0, b.quota))
      for (const num of nums) {
        if (gardes.has(num) || num === aJeter) continue
        ecartees++
        if (k.top5.includes(num)) perdus++
      }
    }
    options.push({ jeter: 'P' + (b.min + j), perdus, ecartees })
  }
  if (!options.length) continue
  const min = Math.min(...options.map((o) => o.perdus))
  for (const o of options) {
    const pct = o.ecartes ? (o.perdus / o.ecartes * 100).toFixed(1) + ' %' : '—'
    console.log('  ' + b.id.padEnd(6) + ('jeter ' + o.jeter).padEnd(28) + String(o.perdus).padStart(9) + '   ' + pct.padStart(6)
      + (o.perdus === min ? '   ← le meilleur' : ''))
  }
  console.log('')
}

/* ══════════ ④ le coût réel, course par course ═════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ④ LE PRIX PAYÉ — course par course')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const parNiveau = {}
for (const k of base) {
  const tk = new Set(ticketA(k))
  const h = k.top5.filter((x) => tk.has(x)).length
  if (!parNiveau[h]) parNiveau[h] = { nb: 0, ecartes: 0, t5: 0 }
  parNiveau[h].nb++
  BLOCS.forEach((b, bi) => {
    const gardes = new Set(parCote(k, bi).slice(0, b.quota))
    numsDuBloc(k, bi).filter((x) => !gardes.has(x)).forEach((num) => {
      parNiveau[h].ecartes++
      if (k.top5.includes(num)) parNiveau[h].t5++
    })
  })
}
console.log('  résultat   courses   chevaux écartés   dont dans le top 5   prix moyen')
console.log('  ' + '-'.repeat(76))
for (const h of [5, 4, 3, 2, 1, 0].sort((a, b) => b - a)) {
  const d = parNiveau[h]
  if (!d) continue
  const prix = d.nb ? d.t5 / d.nb : 0
  console.log('  ' + (h + '/5').padEnd(10) + String(d.nb).padStart(7) + String(d.ecartes).padStart(19)
    + String(d.t5).padStart(20) + prix.toFixed(2).padStart(12))
}
console.log('')
console.log('  ⭐ une course 5/5 ne coûte aucun prix.')
console.log('    une course 4/5 coûte en moyenne un cheval perdu.')
console.log('')
