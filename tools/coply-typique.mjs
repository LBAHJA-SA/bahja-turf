/* =============================================================================
 * tools/coply-typique.mjs — LE CAS « NORMAL », PAS LE CAS « LOGIQUE » (21/10/2026)
 *
 * L'utilisateur : « سباق اليوم ليس معيار لانه اتى باربع ارقام الاوائل وهذا
 * يحدث نادرا ».
 *
 * Il a raison : le Quinté du 21/10 (13·12·10·4·2) a fait arriver 4 des
 * 5 premiers du marché. Un tel Quinté ne dit rien de la règle : c'est le
 * cas « logique », celui où le marché a raison. Et il est rare.
 *
 * Ce fichier mesure donc DEUX choses :
 *   ① à quelle fréquence le marché a raison (le cas logique) — sur 280 ;
 *   ② ce que rapportent les 3 numéros quand le marché N'A PAS raison,
 *      c'est-à-dire dans le cas normal.
 *
 * ⚠ Le ② est conditionné par l'ARRIVÉE : il décrit, il ne choisit pas.
 *    Pour choisir avant la course, seul ③ (la cote du favori, connue avant)
 *    est utilisable.
 *
 *   node tools\coply-typique.mjs
 * ============================================================================= */

import fs from 'node:fs'

const Q = JSON.parse(fs.readFileSync(new URL('../data/quintes.json', import.meta.url), 'utf8'))

const vals = (q) => { const d = q.dividends; return d ? (Array.isArray(d) ? d : Object.values(d)) : [] }
const rapportTrio = (q) => {
  for (const e of vals(q)) {
    if (e && e.bet_type === 'TIERCE_ORDRE' && /désordre/i.test(String(e.sub_type))) {
      const v = Number(e.payout)
      if (v > 0) return v
    }
  }
  return 0
}

const courses = []
for (const q of Q) {
  const arr = (q.arrivee || []).slice(0, 5)
  if (new Set(arr.slice(0, 3)).size < 3) continue
  const cotes = q.cotes || {}
  const mar = Object.entries(cotes).filter(([, v]) => Number(v) > 0).sort((a, b) => a[1] - b[1]).map(([n]) => Number(n))
  if (mar.length < 8) continue
  const car = (q.presse || []).map(Number).filter((x) => x > 0 && cotes[x] != null)
  courses.push({ q, arr, mar, car, rapport: rapportTrio(q), coteFav: Number(cotes[mar[0]]) })
}

const pc = (x) => (100 * x).toFixed(1).replace('.', ',') + ' %'
const sg = (x) => (x >= 0 ? '+' : '') + x.toFixed(1).replace('.', ',') + ' %'

/* ── ① le cas logique, et sa fréquence ──────────────────────────────────── */
console.log('\n  ══ À QUELLE FRÉQUENCE LE MARCHÉ A RAISON ? ══')
console.log('  ' + courses.length + ' Quintés avec cotes + arrivée\n')

const dist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
for (const c of courses) {
  const n = c.arr.filter((x) => c.mar.slice(0, 5).includes(x)).length
  dist[n]++
}
console.log('  combien des 5 arrivés étaient dans les 5 du marché :')
for (let k = 5; k >= 0; k--) {
  const barre = '█'.repeat(Math.round(60 * dist[k] / courses.length))
  console.log('    ' + k + '/5  ' + String(dist[k]).padStart(4) + '  ' + pc(dist[k] / courses.length).padStart(7) + '  ' + barre)
}
const logique = (c) => c.arr.slice(0, 5).filter((x) => c.mar.slice(0, 5).includes(x)).length >= 4
const nbLog = courses.filter(logique).length
console.log('\n  → « 4 des 5 du marché arrivent » (le cas du 21/10) : ' + nbLog + '/' + courses.length + ' = ' + pc(nbLog / courses.length))

const trioLog = courses.filter((c) => c.arr.slice(0, 3).filter((x) => c.mar.slice(0, 3).includes(x)).length >= 2).length
console.log('  → « 2 des 3 du marché arrivent » : ' + trioLog + '/' + courses.length + ' = ' + pc(trioLog / courses.length))

/* ── ② ce que ça rapporte, cas logique contre cas normal ─────────────────── */
const REGLES = {
  'marché top-3': (c) => c.mar.slice(0, 3),
  'carnet P1·P2·P3': (c) => (c.car.length >= 3 ? c.car.slice(0, 3) : null),
  'P1·P2 + 1er marché hors carnet': (c) => {
    if (c.car.length < 2) return null
    const k = c.car.slice(0, 2)
    const m = c.mar.find((x) => !k.includes(x))
    return m ? [...k, m] : null
  },
}

const bilan = (f, list) => {
  let n = 0, touche = 0, retour = 0
  const gains = []
  for (const c of list) {
    if (!c.rapport) continue
    const p = f(c)
    if (!p || p.length !== 3) continue
    n++
    if (c.arr.slice(0, 3).every((x) => p.includes(x))) { touche++; retour += c.rapport; gains.push(c.rapport) }
  }
  gains.sort((a, b) => b - a)
  return { n, touche, retour, max: gains[0] || 0, sansMax: gains.slice(1).reduce((s, x) => s + x, 0) }
}

for (const [titre, filtre] of [['CAS LOGIQUE (≥4 des 5 du marché)', logique], ['CAS NORMAL (le reste)', (c) => !logique(c)]]) {
  const list = courses.filter(filtre)
  console.log('\n  ══ ' + titre + ' — ' + list.length + ' courses ══')
  console.log('  ' + 'règle'.padEnd(34) + 'n'.padStart(5) + 'touchés'.padStart(9) + 'retour'.padStart(9) + 'ROI'.padStart(9) + 'ROI sans le + gros'.padStart(19))
  for (const [nom, f] of Object.entries(REGLES)) {
    const b = bilan(f, list)
    if (!b.n) continue
    console.log('  ' + nom.padEnd(34) + String(b.n).padStart(5) + pc(b.touche / b.n).padStart(9)
      + (b.retour.toFixed(0) + ' €').padStart(9) + sg(100 * (b.retour / b.n - 1)).padStart(9)
      + sg(100 * (b.sansMax / b.n - 1)).padStart(19))
  }
}

/* ── ③ le seul tri possible AVANT la course : la cote du favori ─────────── */
console.log('\n  ══ AVANT LA COURSE — la cote du favori (connue avant) ══')
console.log('  ' + 'favori'.padEnd(12) + 'courses'.padStart(9) + '  ' + 'marché top-3'.padStart(14) + '  ' + 'carnet P1P2P3'.padStart(15))
for (const [nom, test] of [['< 2,5', (v) => v < 2.5], ['2,5 – 3,5', (v) => v >= 2.5 && v < 3.5], ['3,5 – 5', (v) => v >= 3.5 && v < 5], ['≥ 5', (v) => v >= 5]]) {
  const list = courses.filter((c) => test(c.coteFav) && c.rapport)
  if (!list.length) continue
  const a = bilan(REGLES['marché top-3'], list)
  const b = bilan(REGLES['carnet P1·P2·P3'], list)
  console.log('  ' + nom.padEnd(12) + String(list.length).padStart(9) + '  '
    + (sg(100 * (a.retour / a.n - 1)) + ' (' + a.touche + ')').padStart(14) + '  '
    + (b.n ? sg(100 * (b.retour / b.n - 1)) + ' (' + b.touche + ')' : '—').padStart(15))
}

/* ── ④ ce que paie le trio quand le marché se trompe ────────────────────── */
console.log('\n  ══ LE TRIO DANS LE CAS NORMAL ══')
const normal = courses.filter((c) => !logique(c) && c.rapport)
const payes = normal.map((c) => c.rapport).sort((a, b) => a - b)
const med = payes[Math.floor(payes.length / 2)]
console.log('  ' + normal.length + ' courses · rapport médian ' + med.toFixed(0) + ' € · moyen ' + (payes.reduce((s, x) => s + x, 0) / payes.length).toFixed(0) + ' €')
console.log('  dont ≥ 100 € : ' + payes.filter((x) => x >= 100).length + ' · ≥ 500 € : ' + payes.filter((x) => x >= 500).length)
console.log('')
