/* =============================================================================
 * tools/coply-empreinte.mjs — L'EMPREINTE DU TRIO PEUT-ELLE CHOISIR ? (21/10/2026)
 *
 * L'utilisateur : « يعني البصمة لاتستعمل والمحرك اعمى ».
 *
 * Il a raison sur le constat : la page affiche « l'empreinte du Trio »
 * (G1·G2·G3·G4·G5) et le moteur ne s'en sert PAS. Ce fichier teste si elle
 * peut servir — en euros, pas en pourcentages.
 *
 * Ce que dit l'empreinte (data/empreinte-trio.json, 96 Quintés) :
 *    2·1·0·0·0   26,0 %   ← 2 de G1 + 1 de G2, le motif le plus fréquent
 *    1·1·1·0·0   12,5 %
 *    1·1·0·1·0    9,4 %
 *    2·0·0·0·1    7,3 %
 *    3·0·0·0·0    7,3 %   ← les 3 favoris du carnet
 *    moyenne par course : G1 1,50 · G2 0,78 · G3 0,25 · G4 0,27 · G5 0,20
 *
 * Les blocs sont ceux de la grille : G1 = P1-P4 · G2 = P5-P8 · G3 = P9-P10 ·
 * G4 = P11-P12 · G5 = P13+.
 *
 *   node tools\coply-empreinte.mjs
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
const rapportPlace = (q, a, b) => {
  const [x, y] = a < b ? [a, b] : [b, a]
  for (const e of vals(q)) {
    if (!e || e.bet_type !== 'JUMELE_PLACE') continue
    const n = String(e.combination || '').match(/\d+/g)
    if (!n || n.length !== 2) continue
    const [p, r] = Number(n[0]) < Number(n[1]) ? [Number(n[0]), Number(n[1])] : [Number(n[1]), Number(n[0])]
    if (p === x && r === y) return Number(e.payout) || 0
  }
  return 0
}

const courses = []
for (const q of Q) {
  const arr = (q.arrivee || []).slice(0, 5)
  if (new Set(arr.slice(0, 3)).size < 3) continue
  const cotes = q.cotes || {}
  const mar = Object.entries(cotes).filter(([, v]) => Number(v) > 0).sort((a, b) => a[1] - b[1]).map(([n]) => Number(n))
  const car = (q.presse || []).map(Number).filter((x) => x > 0 && cotes[x] != null)
  if (mar.length < 8 || car.length < 8) continue
  courses.push({ q, arr, mar, car, rapport: rapportTrio(q) })
}

const bloc = (car) => ({ G1: car.slice(0, 4), G2: car.slice(4, 8), G3: car.slice(8, 10), G4: car.slice(10, 12), G5: car.slice(12) })
const parCote = (list, mar) => list.slice().sort((a, b) => mar.indexOf(a) - mar.indexOf(b) || a - b)

/* ── les règles ─────────────────────────────────────────────────────────── */
const REGLES = {
  'production : P1·P2 + marché hors carnet 2': (c) => { const k = c.car.slice(0, 2); const m = c.mar.find((x) => !k.includes(x)); return m ? [...k, m] : null },
  'E1 · P1·P2·P5 (2 G1 + 1 G2, carnet pur)': (c) => { const b = bloc(c.car); return b.G2.length ? [...b.G1.slice(0, 2), b.G2[0]] : null },
  'E2 · P1·P2 + meilleure cote de G2': (c) => { const b = bloc(c.car); if (!b.G2.length) return null; const m = parCote(b.G2, c.mar)[0]; return [...b.G1.slice(0, 2), m] },
  'E3 · 2 meilleures cotes de G1 + 1 de G2': (c) => { const b = bloc(c.car); if (b.G2.length < 1) return null; const g1 = parCote(b.G1, c.mar).slice(0, 2); return [...g1, parCote(b.G2, c.mar)[0]] },
  'E4 · P1·P5·P9 (1 de G1, G2, G3)': (c) => { const b = bloc(c.car); return [b.G1[0], b.G2[0], b.G3[0]].filter(Boolean).length === 3 ? [b.G1[0], b.G2[0], b.G3[0]] : null },
  'E5 · 3 meilleures cotes de G1 (3·0·0·0·0)': (c) => parCote(bloc(c.car).G1, c.mar).slice(0, 3),
  'E6 · P1·P2·P5 avec la cote la plus haute du G2': (c) => { const b = bloc(c.car); if (!b.G2.length) return null; return [...b.G1.slice(0, 2), parCote(b.G2, c.mar).slice(-1)[0]] },
  'E7 · P1 + 2 meilleures cotes de G2': (c) => { const b = bloc(c.car); if (b.G2.length < 2) return null; return [b.G1[0], ...parCote(b.G2, c.mar).slice(0, 2)] },
}

const bilanTrio = (f) => {
  let n = 0, t = 0, ret = 0
  const g = []
  for (const c of courses) {
    if (!c.rapport) continue
    const p = f(c)
    if (!p || p.length !== 3) continue
    n++
    if (c.arr.slice(0, 3).every((x) => p.includes(x))) { t++; ret += c.rapport; g.push(c.rapport) }
  }
  g.sort((a, b) => b - a)
  return { n, t, ret, sans: g.slice(1).reduce((s, x) => s + x, 0) }
}
const bilanPlace = (f) => {
  let n = 0, mise = 0, ret = 0
  const g = []
  for (const c of courses) {
    const p = f(c)
    if (!p || p.length !== 3) continue
    n++; mise += 3
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      const a = [p[i], p[j]]
      if (c.arr.filter((x) => a.includes(x)).length !== 2) continue
      const r = rapportPlace(c.q, p[i], p[j])
      if (r > 0) { ret += r; g.push(r) }
    }
  }
  g.sort((a, b) => b - a)
  return { n, mise, ret, sans: g.slice(1).reduce((s, x) => s + x, 0) }
}

const sg = (x) => (x >= 0 ? '+' : '') + x.toFixed(1).replace('.', ',') + ' %'
console.log('\n  L\'EMPREINTE PEUT-ELLE CHOISIR LES 3 NUMÉROS ?')
console.log('  ' + courses.length + ' Quintés à presse réelle · 1 € par course (trio) · 1 € par paire (couplé placé)\n')
console.log('  ' + 'règle'.padEnd(46) + 'trio'.padStart(8) + 'ROI'.padStart(9) + 'couplé'.padStart(10) + 'moitié 1'.padStart(11) + 'moitié 2'.padStart(11))

const moit = (f) => {
  const tot = [courses.slice(0, Math.floor(courses.length / 2)), courses.slice(Math.floor(courses.length / 2))]
  return tot.map((list) => {
    const b = bilanTrio2(f, list)
    return b.n ? 100 * (b.ret / b.n - 1) : 0
  })
}
const bilanTrio2 = (f, list) => {
  let n = 0, t = 0, ret = 0
  for (const c of list) {
    if (!c.rapport) continue
    const p = f(c)
    if (!p || p.length !== 3) continue
    n++
    if (c.arr.slice(0, 3).every((x) => p.includes(x))) { t++; ret += c.rapport }
  }
  return { n, t, ret }
}

const res = []
for (const [nom, f] of Object.entries(REGLES)) {
  const t = bilanTrio(f)
  const p = bilanPlace(f)
  const m = moit(f)
  if (!t.n) continue
  res.push({ nom, t, p, m })
}
res.sort((a, b) => b.t.ret / b.t.n - a.t.ret / a.t.n)
for (const r of res) {
  console.log('  ' + r.nom.padEnd(46)
    + (100 * r.t.t / r.t.n).toFixed(1).replace('.', ',').padStart(7) + ' %'
    + sg(100 * (r.t.ret / r.t.n - 1)).padStart(9)
    + sg(100 * (r.p.ret / r.p.mise - 1)).padStart(10)
    + sg(r.m[0]).padStart(11) + sg(r.m[1]).padStart(11))
}
console.log('')
