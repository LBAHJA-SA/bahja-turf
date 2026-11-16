/* tools/dna-baselines.mjs — l'empreinte composite vaut-elle mieux que la règle la plus bête ?
 * Si une baseline simple la bat, les poids sont le problème. Sinon, le signal manque.
 * Test : 2025-2026, 14 partants et plus. */
import fs from 'node:fs'

const idx = JSON.parse(fs.readFileSync('data/dna-archive-index.json', 'utf8'))
const emp = JSON.parse(fs.readFileSync('data/dna-empreinte-taille.json', 'utf8'))
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + '%' : '—')

const LETTER_DISC = { a: 'ATTELE', m: 'MONTE', p: 'PLAT', h: 'HAIE', s: 'STEEPLE', c: 'CROSS' }
const parseM = (m) => {
  const re = /([0-9]{1,2}|D|A|T|R)([amphsc])/gi
  const o = []
  let x
  while ((x = re.exec(String(m || '')))) o.push({ place: /^[0-9]+$/.test(x[1]) ? Number(x[1]) : 0, lettre: x[2].toLowerCase() })
  return o
}
const discOf = (c) => {
  const d = (c.disc || '').toUpperCase()
  if (/ATTELE|TROT/.test(d)) return 'ATTELE'
  if (/MONTE/.test(d)) return 'MONTE'
  if (/PLAT|GALOP/.test(d)) return 'PLAT'
  if (/STEEPLE/.test(d)) return 'STEEPLE'
  if (/HAIE/.test(d)) return 'HAIE'
  if (/CROSS/.test(d)) return 'CROSS'
  const v = {}
  for (const p of c.ps) for (const r of parseM(p.musique)) v[r.lettre] = (v[r.lettre] || 0) + 1
  const b = Object.entries(v).sort((a, x) => x[1] - a[1])[0]
  return b ? (LETTER_DISC[b[0]] || 'AUTRE') : 'AUTRE'
}
const bucketD = (d) => (!d ? '?' : d <= 1400 ? 'SPRINT' : d <= 1900 ? 'MILE' : d <= 2450 ? 'MOYEN' : 'LONG')
const PTS = (p) => (p === 1 ? 10 : p === 2 ? 8 : p === 3 ? 6 : p <= 5 ? 4 : p <= 9 ? 1.5 : 0)
const KEYS = emp.KEYS

function pcts(vals) {
  const ix = vals.map((v, i) => ({ v, i })).filter((x) => x.v != null && Number.isFinite(x.v))
  ix.sort((a, b) => a.v - b.v)
  const out = new Array(vals.length).fill(0.5)
  const n = ix.length
  if (!n) return out
  let i = 0
  while (i < n) {
    let j = i
    while (j + 1 < n && ix[j + 1].v === ix[i].v) j++
    const p = n === 1 ? 0.5 : (i + j) / 2 / (n - 1)
    for (let k = i; k <= j; k++) out[ix[k].i] = p
    i = j + 1
  }
  return out
}

const races = []
for (const c of idx) {
  const ps = c.ps.filter((p) => p.rang != null && /[0-9]/.test(p.musique || '') && p.cote != null && p.cote > 0)
  if (ps.length < 14) continue
  if (c.date < '2025-01-01') continue
  const disc = discOf(c)
  const lettre = Object.entries(LETTER_DISC).find(([, v]) => v === disc)?.[0]
  const F = ps.map((p) => {
    const mus = parseM(p.musique)
    const moy = (arr) => { let s = 0, w = 0; arr.forEach((r, i) => { const wi = 1 / (1 + i * 0.55); s += PTS(r.place) * wi; w += wi }); return w ? s / w : null }
    const l8 = mus.slice(0, 8)
    const b3 = mus.slice(0, 3).filter((r) => r.place > 0)
    return {
      forme: moy(mus.slice(0, 5)),
      formeDisc: moy(mus.filter((r) => r.lettre === lettre).slice(0, 5)),
      placeRate: l8.length ? l8.filter((r) => r.place >= 1 && r.place <= 3).length / l8.length : null,
      disq: l8.length ? l8.filter((r) => r.place === 0).length / l8.length : null,
      best: b3.length ? 1 / Math.min(...b3.map((r) => r.place)) : null,
      age: p.age,
      jeune: p.age == null ? null : -Math.abs(p.age - 6),
      deferre: p.def && /[DP]/.test(String(p.def)) ? 1 : 0,
      // baselines brutes
      moy3: (() => { const a = mus.slice(0, 3).filter((r) => r.place > 0); return a.length ? a.reduce((s, r) => s + r.place, 0) / a.length : null })(),
      moy5: (() => { const a = mus.slice(0, 5).filter((r) => r.place > 0); return a.length ? a.reduce((s, r) => s + r.place, 0) / a.length : null })(),
      // déferré nu et âge nu
    }
  })
  const P = {}
  for (const k of KEYS) P[k] = pcts(F.map((f) => f[k]))
  const table = emp.tables[disc + '|' + bucketD(c.distance) + '|' + (ps.length < 10 ? 'PETIT' : 'GRAND')] || emp.tables[disc + '|GRAND'] || emp.universal
  const score = ps.map((p, i) => { let v = 0; for (const k of KEYS) v += (table[k] || 0) * P[k][i]; return { num: p.num, v } })
  races.push({
    ps, F, arrivee3: ps.filter((p) => p.rang <= 3).sort((a, b) => a.rang - b.rang).map((p) => p.num),
    emp: [...score].sort((a, b) => b.v - a.v).map((x) => x.num),
  })
}

console.log('courses :', races.length, '\n')
const hit = (order, arr, k) => {
  if (order.length < k) return false
  const s = new Set(order.slice(0, k))
  return arr.slice(0, k).every((x) => s.has(x))
}
const cover = (order, arr, k) => {
  if (order.length < k) return false
  const s = new Set(order.slice(0, k))
  return arr.every((x) => s.has(x))
}

const rules = {
  'EMPREINTE (composite poids)': (r) => r.emp,
  'moyenne des 3 dernières places': (r) => r.ps.map((p, i) => ({ n: p.num, v: -(r.F[i].moy3 ?? 99) })).sort((a, b) => b.v - a.v).map((x) => x.n),
  'moyenne des 5 dernières places': (r) => r.ps.map((p, i) => ({ n: p.num, v: -(r.F[i].moy5 ?? 99) })).sort((a, b) => b.v - a.v).map((x) => x.n),
  'meilleure place des 3 dernières': (r) => r.ps.map((p, i) => ({ n: p.num, v: r.F[i].best ?? 0 })).sort((a, b) => b.v - a.v).map((x) => x.n),
  'taux de top-3 (8 dernières)': (r) => r.ps.map((p, i) => ({ n: p.num, v: r.F[i].placeRate ?? 0 })).sort((a, b) => b.v - a.v).map((x) => x.n),
  'MARCHÉ (cote)': (r) => [...r.ps].sort((a, b) => a.cote - b.cote).map((p) => p.num),
}

console.log('règle                              gagnant   couplé    trio   trio dans top-6')
for (const [nom, fn] of Object.entries(rules)) {
  let g = 0, c = 0, tt = 0, s6 = 0
  for (const r of races) {
    const o = fn(r)
    if (hit(o, r.arrivee3, 1)) g++
    if (hit(o, r.arrivee3, 2)) c++
    if (hit(o, r.arrivee3, 3)) tt++
    if (cover(o, r.arrivee3, 6)) s6++
  }
  const n = races.length
  console.log('  ' + nom.padEnd(32) + pct(g, n).padStart(7) + pct(c, n).padStart(9) + pct(tt, n).padStart(8) + pct(s6, n).padStart(12))
}
