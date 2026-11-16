/* tools/dna-forme2.mjs — des variables de musique qui n'existent pas dans le modèle.
 * Tendance (progressons-nous ?), régularité, pire place, victoires.
 * Choix sur 2020-2024, note sur 2025-2026.
 */
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
  return b ? LETTER_DISC[b[0]] || 'AUTRE' : 'AUTRE'
}
const bucketD = (d) => (!d ? '?' : d <= 1400 ? 'SPRINT' : d <= 1900 ? 'MILE' : d <= 2450 ? 'MOYEN' : 'LONG')
const PTS = (p) => (p === 1 ? 10 : p === 2 ? 8 : p === 3 ? 6 : p <= 5 ? 4 : p <= 9 ? 1.5 : 0)

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

const MOY = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null)
const val = (r) => (r.place === 0 ? 12 : r.place)

const races = []
for (const c of idx) {
  const ps = (c.ps || []).filter((p) => p.rang != null && p.rang > 0 && /[0-9]/.test(p.musique || ''))
  if (ps.length < 6) continue
  const disc = discOf(c)
  const lettre = Object.entries(LETTER_DISC).find(([, v]) => v === disc)?.[0]
  const F = ps.map((p) => {
    const mus = parseM(p.musique)
    const lettre2 = mus.filter((r) => r.lettre === lettre)
    const moy = (arr) => {
      let s = 0, w = 0
      arr.forEach((r, i) => { const wi = 1 / (1 + i * 0.55); s += PTS(r.place) * wi; w += wi })
      return w ? s / w : null
    }
    const l8 = mus.slice(0, 8)
    const b3 = mus.slice(0, 3).filter((r) => r.place > 0)
    const p5 = mus.slice(0, 5).map(val)
    const fen = mus.slice(0, 2).map(val), prec = mus.slice(2, 4).map(val)
    const m = MOY(p5)
    const ecart = m == null || p5.length < 2 ? null : Math.sqrt(MOY(p5.map((x) => (x - m) ** 2)))
    return {
      /* production */
      forme: moy(mus.slice(0, 5)),
      formeDisc: moy(lettre2.slice(0, 5)),
      placeRate: l8.length ? l8.filter((r) => r.place >= 1 && r.place <= 3).length / l8.length : null,
      disq: l8.length ? l8.filter((r) => r.place === 0).length / l8.length : null,
      best: b3.length ? 1 / Math.min(...b3.map((r) => r.place)) : null,
      age: p.age == null ? null : Number(p.age),
      jeune: p.age == null ? null : -Math.abs(Number(p.age) - 6),
      deferre: p.deferre && /[DPdp]/.test(String(p.deferre)) ? 1 : 0,
      /* nouvelles */
      tendance: fen.length && prec.length ? MOY(prec) - MOY(fen) : null,   // + = s'améliore
      regulier: ecart == null ? null : -ecart,                             // + = régulier
      pire: Math.max(...mus.slice(0, 3).map(val)),                         // à inverser
      victoires: l8.filter((r) => r.place === 1).length,
      podium: l8.filter((r) => r.place >= 1 && r.place <= 3).length,
      sansFaute: mus.slice(0, 4).every((r) => r.place > 0) ? 1 : 0,
    }
  })
  const empT = emp.tables[disc + '|' + bucketD(c.distance) + '|' + (ps.length < 10 ? 'PETIT' : 'GRAND')] ||
    emp.tables[disc + '|' + (ps.length < 10 ? 'PETIT' : 'GRAND')] || emp.universal
  const P = {}
  for (const k of emp.KEYS) P[k] = pcts(F.map((f) => f[k]))
  const base = ps.map((p, i) => { let v = 0; for (const k of emp.KEYS) v += (empT[k] || 0) * P[k][i]; return v })
  races.push({
    date: c.date, ps, base,
    arr: ps.filter((p) => p.rang <= 3).sort((a, b) => a.rang - b.rang).map((p) => p.num),
    n: {
      tendance: pcts(F.map((f) => f.tendance)),
      regulier: pcts(F.map((f) => f.regulier)),
      pire: pcts(F.map((f) => (f.pire == null ? null : -f.pire))),
      victoires: pcts(F.map((f) => f.victoires)),
      podium: pcts(F.map((f) => f.podium)),
      sansFaute: pcts(F.map((f) => f.sansFaute)),
    },
  })
}

const order = (r, add) => r.ps.map((p, i) => {
  let v = r.base[i]
  for (const [k, w] of add) v += w * r.n[k][i]
  return { n: p.num, v }
}).sort((a, b) => b.v - a.v).map((x) => x.n)

const trioIn = (o, arr, k) => (o.length >= k ? arr.every((x) => new Set(o.slice(0, k)).has(x)) : false)
const hit = (o, arr, k) => (o.length >= k ? arr.slice(0, k).every((x) => new Set(o.slice(0, k)).has(x)) : false)
const evalSet = (list, add) => {
  let g = 0, co = 0, tr = 0, s6 = 0
  for (const r of list) {
    const o = order(r, add)
    if (hit(o, r.arr, 1)) g++
    if (hit(o, r.arr, 2)) co++
    if (trioIn(o, r.arr, 3)) tr++
    if (trioIn(o, r.arr, 6)) s6++
  }
  const n = list.length
  return { g: g / n, co: co / n, tr: tr / n, s6: s6 / n, n }
}

const TRAIN = races.filter((r) => r.date < '2025-01-01')
const TEST = races.filter((r) => r.date >= '2025-01-01')
console.log('courses', races.length, '· train', TRAIN.length, '· test', TEST.length, '\n')
const f3 = (x) => (100 * x).toFixed(1) + '%'
console.log('AJOUT                          TRAIN  gagnant couplé trio | TEST  gagnant couplé trio trio≤6')
const GRID = [['(rien — production)', []]]
for (const k of Object.keys(races[0].n)) {
  for (const w of [0.10, 0.20, 0.35]) GRID.push([`+ ${k} ${w.toFixed(2)}`, [[k, w]]])
}
const out = []
for (const [nom, add] of GRID) {
  const a = evalSet(TRAIN, add), b = evalSet(TEST, add)
  out.push({ nom, a, b })
  console.log('  ' + nom.padEnd(30) + f3(a.g).padStart(7) + f3(a.co).padStart(8) + f3(a.tr).padStart(6) +
    ' |' + f3(b.g).padStart(9) + f3(b.co).padStart(8) + f3(b.tr).padStart(6) + f3(b.s6).padStart(9))
}
const prod = out[0]
const gagne = out.slice(1).filter((x) => x.a.tr > prod.a.tr && x.b.tr > prod.b.tr && x.a.g > prod.a.g && x.b.g > prod.b.g)
console.log('\nproduction → test ' + f3(prod.b.g) + ' / ' + f3(prod.b.tr) + ' / 6 num ' + f3(prod.b.s6))
console.log('règles qui gagnent sur TRIO et GAGNANT dans les deux moitiés : ' + (gagne.length ? gagne.map((x) => x.nom).join(' · ') : 'AUCUNE'))
