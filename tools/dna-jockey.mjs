/* tools/dna-jockey.mjs — le jockey et l'entraîneur ajoutent-ils du signal ?
 * Ratings calculés EN MARCHE AVANT (une journée n'entre dans les stats qu'APRÈS
 * avoir été notée) : aucune fuite du futur.
 * Choix du poids sur 2020-2024, note sur 2025-2026.
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

const byDate = new Map()
for (const c of idx) {
  const ps = (c.ps || []).filter((p) => p.rang != null && p.rang > 0 && /[0-9]/.test(p.musique || ''))
  if (ps.length < 6) continue
  const d = c.date
  if (!byDate.has(d)) byDate.set(d, [])
  byDate.get(d).push({ ...c, ps })
}

const stats = new Map() // cle -> {r, w, t3}
const get = (k) => stats.get(k) || { r: 0, w: 0, t3: 0 }
const K = 8
const BASE_W = 0.09
const BASE_T3 = 0.24

function featsOf(p, disc) {
  const mus = parseM(p.musique)
  const lettre = Object.entries(LETTER_DISC).find(([, v]) => v === disc)?.[0]
  const moy = (arr) => {
    let s = 0, w = 0
    arr.forEach((r, i) => { const wi = 1 / (1 + i * 0.55); s += PTS(r.place) * wi; w += wi })
    return w ? s / w : null
  }
  const l8 = mus.slice(0, 8)
  const b3 = mus.slice(0, 3).filter((r) => r.place > 0)
  return {
    forme: moy(mus.slice(0, 5)),
    formeDisc: moy(mus.filter((r) => r.lettre === lettre).slice(0, 5)),
    placeRate: l8.length ? l8.filter((r) => r.place >= 1 && r.place <= 3).length / l8.length : null,
    disq: l8.length ? l8.filter((r) => r.place === 0).length / l8.length : null,
    best: b3.length ? 1 / Math.min(...b3.map((r) => r.place)) : null,
    age: p.age == null ? null : Number(p.age),
    jeune: p.age == null ? null : -Math.abs(Number(p.age) - 6),
    deferre: p.deferre && /[DPdp]/.test(String(p.deferre)) ? 1 : 0,
  }
}

const races = []
const dates = [...byDate.keys()].sort()
for (const d of dates) {
  const jour = byDate.get(d)
  for (const c of jour) {
    const disc = discOf(c)
    const ps = c.ps
    const F = ps.map((p) => featsOf(p, disc))
    /* ratings du jour : uniquement les courses PASSÉES */
    const TR = ps.map((p) => {
      const s = get('T|' + p.trainer)
      return {
        trW: (s.w + K * BASE_W) / (s.r + K),
        trT3: (s.t3 + K * BASE_T3) / (s.r + K),
        trN: s.r,
      }
    })
    const JK = ps.map((p) => {
      const s = get('J|' + p.jockey)
      return {
        jkW: (s.w + K * BASE_W) / (s.r + K),
        jkT3: (s.t3 + K * BASE_T3) / (s.r + K),
        jkN: s.r,
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
      f: {
        trW: pcts(TR.map((x) => x.trW)), trT3: pcts(TR.map((x) => x.trT3)),
        jkW: pcts(JK.map((x) => x.jkW)), jkT3: pcts(JK.map((x) => x.jkT)),
        comboT3: pcts(TR.map((x, i) => (x.trT3 + JK[i].jkT3) / 2)),
      },
    })
  }
  /* la journée est notée : on l'ajoute aux stats */
  for (const c of jour) {
    for (const p of c.ps) {
      for (const cle of ['T|' + p.trainer, 'J|' + p.jockey]) {
        if (!cle.slice(2).trim()) continue
        const s = get(cle)
        s.r++
        if (p.rang === 1) s.w++
        if (p.rang <= 3) s.t3++
        stats.set(cle, s)
      }
    }
  }
}

const order = (r, add) => r.ps.map((p, i) => {
  let v = r.base[i]
  for (const [k, w] of add) v += w * r.f[k][i]
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
const GRID = [
  ['(rien — production)', []],
  ['+ entraîneur gagnant  0,10', [['trW', 0.10]]],
  ['+ entraîneur gagnant  0,20', [['trW', 0.20]]],
  ['+ entraîneur top-3    0,10', [['trT3', 0.10]]],
  ['+ entraîneur top-3    0,20', [['trT3', 0.20]]],
  ['+ jockey gagnant      0,10', [['jkW', 0.10]]],
  ['+ jockey gagnant      0,20', [['jkW', 0.20]]],
  ['+ jockey top-3        0,10', [['jkT3', 0.10]]],
  ['+ jockey top-3        0,20', [['jkT3', 0.20]]],
  ['+ couple entraîneur+jockey top-3 0,10', [['comboT3', 0.10]]],
  ['+ couple entraîneur+jockey top-3 0,20', [['comboT3', 0.20]]],
  ['+ couple entraîneur+jockey top-3 0,30', [['comboT3', 0.30]]],
  ['+ trT3 0,10 + jkT3 0,10', [['trT3', 0.10], ['jkT3', 0.10]]],
  ['+ trT3 0,20 + jkW 0,10', [['trT3', 0.20], ['jkW', 0.10]]],
]
const out = []
for (const [nom, add] of GRID) {
  const a = evalSet(TRAIN, add), b = evalSet(TEST, add)
  out.push({ nom, a, b })
  console.log('  ' + nom.padEnd(30) + f3(a.g).padStart(7) + f3(a.co).padStart(8) + f3(a.tr).padStart(6) +
    ' |' + f3(b.g).padStart(9) + f3(b.co).padStart(8) + f3(b.tr).padStart(6) + f3(b.s6).padStart(9))
}
const best = [...out].sort((x, y) => (y.a.g + y.a.co + y.a.tr + y.a.s6) - (x.a.g + x.a.co + x.a.tr + x.a.s6))[0]
console.log('\nmeilleur sur TRAIN : ' + best.nom + '  → test ' + f3(best.b.g) + ' / ' + f3(best.b.tr) + ' / 6 num ' + f3(best.b.s6))
const prod = out[0]
console.log('production          → test ' + f3(prod.b.g) + ' / ' + f3(prod.b.tr) + ' / 6 num ' + f3(prod.b.s6))
