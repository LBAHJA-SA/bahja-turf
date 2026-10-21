/* tools/couple-euros.mjs — LE COUPLÉ EN EUROS, pas en pourcentages.
 *
 * Question de l'utilisateur (20/10/2026) :
 *   « واش دابا قاديتي شي خوارزمية تعطينا الكوبلي بنسبة مزيانة ولا غير الهضرة »
 *
 * On ne mesure pas « combien de fois », on mesure « combien ça rapporte » :
 * on joue les paires des k premiers (1 € par paire) et on encaisse les VRAIS
 * rapports JUMELE_PLACE / JUMELE_GAGNANT de `data/quintes.json`.
 *
 *   node tools/couple-euros.mjs
 *
 * ⚠ Le carnet (presse) n'existe QUE pour les Quintés — c'est la seule course
 *   dont la presse publie l'ordre. Ailleurs il n'y a que le marché.
 */
import fs from 'node:fs'

const Q = JSON.parse(fs.readFileSync(new URL('../data/quintes.json', import.meta.url), 'utf8'))
const arr = (x) => (Array.isArray(x) ? x : [])
const paire = (a, b) => (a < b ? a + '-' + b : b + '-' + a)
const pc = (x) => String((100 * x).toFixed(1)).replace('.', ',') + ' %'
const signe = (x) => (x >= 0 ? '+' : '') + String(x.toFixed(1)).replace('.', ',') + ' %'

const courses = []
for (const q of Q) {
  const div = arr(q.dividends)
  const place = div.filter((d) => d.bet_type === 'JUMELE_PLACE' && d.combination && Number(d.payout) > 0)
  if (place.length < 2) continue
  const gagn = div.find((d) => d.bet_type === 'JUMELE_GAGNANT' && d.combination && Number(d.payout) > 0)
  const presse = arr(q.presse).filter(Number.isFinite)
  const cotes = q.cotes || {}
  const nums = Object.keys(cotes).map(Number).filter((n) => Number.isFinite(n) && cotes[n] > 1)
  const marche = nums.slice().sort((a, b) => cotes[a] - cotes[b] || a - b)
  courses.push({
    date: q.date,
    place: new Map(place.map((d) => [
      d.combination.split(' - ').map(Number).sort((a, b) => a - b).join('-'),
      Number(d.payout),
    ])),
    gagn: gagn ? { p: paire(...gagn.combination.split(' - ').map(Number)), v: Number(gagn.payout) } : null,
    presse,
    marche,
  })
}

/** Les paires d'une sélection de k numéros. */
function pairesDe(sel) {
  const out = []
  for (let i = 0; i < sel.length; i++) for (let j = i + 1; j < sel.length; j++) out.push(paire(sel[i], sel[j]))
  return out
}

function bilan(nom, choisir, k, min = 0) {
  let n = 0, mise = 0, gain = 0, touche = 0, miseG = 0, gainG = 0, toucheG = 0
  const parCourse = []
  for (const c of courses) {
    if (c.presse.length < min) continue
    const sel = choisir(c)
    if (!sel || sel.length < k) continue
    n++
    const P = pairesDe(sel)
    mise += P.length
    miseG += P.length
    let g = 0
    for (const p of P) { const v = c.place.get(p); if (v) g += v }
    gain += g
    if (g > 0) touche++
    parCourse.push(g - P.length)
    if (c.gagn && P.includes(c.gagn.p)) { gainG += c.gagn.v; toucheG++ }
  }
  parCourse.sort((a, b) => a - b)
  return {
    nom, k, n,
    touche: touche / n,
    roi: (gain - mise) / mise,
    toucheG: toucheG / n,
    roiG: (gainG - miseG) / miseG,
    mise, gain,
    mediane: parCourse[Math.floor(parCourse.length / 2)],
  }
}

const scenarios = []
for (const k of [2, 3, 4, 5]) {
  scenarios.push(bilan('carnet top-' + k, (c) => c.presse.slice(0, k), k, 10))
  scenarios.push(bilan('marché top-' + k, (c) => c.marche.slice(0, k), k))
}

console.log('\n  LE COUPLÉ EN EUROS — 1 € par paire, vrais rapports Jumelé (PMU Maroc)')
console.log('  ' + courses.length + ' Quintés avec dividendes\n')
console.log('  ' + 'règle'.padEnd(16) + 'n'.padStart(5) + '   placé touché   ROI placé   gagnant touché   ROI gagnant')
for (const s of scenarios) {
  console.log('  ' + s.nom.padEnd(16) + String(s.n).padStart(5) +
    '   ' + pc(s.touche).padStart(11) +
    '   ' + signe(s.roi * 100).padStart(10) +
    '   ' + pc(s.toucheG).padStart(12) +
    '   ' + signe(s.roiG * 100).padStart(12))
}

const ref = scenarios.find((s) => s.nom === 'carnet top-3')
if (ref) {
  const med = (ref.mediane >= 0 ? '+' : '') + ref.mediane.toFixed(1).replace('.', ',') + ' €'
  const cx = scenarios.find((s) => s.nom === 'marché top-3')
  console.log('\n  carnet top-3 : mise ' + ref.mise + ' € → retour ' + ref.gain.toFixed(0) + ' €' +
    ' · par course médiane ' + med + ' (3 € engagés)')
  if (cx) console.log('  marché top-3 : mise ' + cx.mise + ' € → retour ' + cx.gain.toFixed(0) + ' €' +
    ' · ' + pc(cx.touche) + ' touché')
  console.log('  ⚠ le carnet n\'existe QUE pour les Quintés — c\'est la seule course dont la presse donne l\'ordre.')
  console.log('  → sur les autres courses il ne reste que le marché.\n')
}
