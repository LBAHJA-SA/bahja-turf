/* tools/dna-classe.mjs — les colonnes de CLASSE ajoutent-elles du signal ?
 * gain / victoires / places en carrière / valeur / poids / corde,
 * ajoutés à l'empreinte de production, poids choisi sur 2020-2024 et noté sur 2025-2026.
 * Chaque variable est comparée à l'empreinte SEULE sur le MÊME sous-corpus.
 */
import fs from 'node:fs'

const idx = JSON.parse(fs.readFileSync('data/dna-index2.json', 'utf8'))
const emp = JSON.parse(fs.readFileSync('data/dna-empreinte-taille.json', 'utf8'))
const f3 = (x) => (100 * x).toFixed(1) + '%'

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
  for (const p of c.ps) for (const r of parseM(p.m)) v[r.lettre] = (v[r.lettre] || 0) + 1
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

const races = []
for (const c of idx) {
  const ps = c.ps.filter((p) => p.r != null && p.r > 0 && /[0-9]/.test(p.m || ''))
  if (ps.length < 6) continue
  const disc = discOf(c)
  const lettre = Object.entries(LETTER_DISC).find(([, v]) => v === disc)?.[0]
  const F = ps.map((p) => {
    const mus = parseM(p.m)
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
      age: p.a == null ? null : Number(p.a),
      jeune: p.a == null ? null : -Math.abs(Number(p.a) - 6),
      deferre: p.d && /[DPdp]/.test(String(p.d)) ? 1 : 0,
    }
  })
  const empT = emp.tables[disc + '|' + bucketD(c.distance) + '|' + (ps.length < 10 ? 'PETIT' : 'GRAND')] ||
    emp.tables[disc + '|' + (ps.length < 10 ? 'PETIT' : 'GRAND')] || emp.universal
  const P = {}
  for (const k of emp.KEYS) P[k] = pcts(F.map((f) => f[k]))
  const base = ps.map((p, i) => { let v = 0; for (const k of emp.KEYS) v += (empT[k] || 0) * P[k][i]; return v })

  const perRun = (p) => (p.nc > 0 ? p.g / p.nc : null)
  const winRate = (p) => (p.nc > 0 ? p.nv / p.nc : null)
  const plRate = (p) => (p.nc > 0 ? p.np / p.nc : null)
  races.push({
    date: c.date, ps, base,
    arr: ps.filter((p) => p.r <= 3).sort((a, b) => a.r - b.r).map((p) => p.n),
    n: {
      gain: pcts(ps.map((p) => { const x = perRun(p); return x && x > 0 ? Math.log10(x) : null })),
      gainT: pcts(ps.map((p) => (p.g > 0 ? Math.log10(p.g) : null))),
      victoires: pcts(ps.map(winRate)),
      places: pcts(ps.map(plRate)),
      valeur: pcts(ps.map((p) => p.v)),
      poids: pcts(ps.map((p) => p.p)),
      corde: pcts(ps.map((p) => p.cd)),
      valeurInv: pcts(ps.map((p) => (p.v == null ? null : -p.v))),
      poidsInv: pcts(ps.map((p) => (p.p == null ? null : -p.p))),
    },
    dispo: {
      gain: ps.filter((p) => p.g > 0 && p.nc > 0).length / ps.length,
      gainT: ps.filter((p) => p.g > 0).length / ps.length,
      victoires: ps.filter((p) => p.nc > 0).length / ps.length,
      places: ps.filter((p) => p.nc > 0).length / ps.length,
      valeur: ps.filter((p) => p.v != null).length / ps.length,
      poids: ps.filter((p) => p.p != null).length / ps.length,
      corde: ps.filter((p) => p.cd != null).length / ps.length,
    },
  })
}

const SPLIT = process.argv[2] || '2025'
const TEST_DEPUIS = SPLIT.length === 10 ? SPLIT : SPLIT + '-01-01'
console.log('découpage : train < ' + SPLIT + ' · test ≥ ' + SPLIT + '\n')

const order = (r, add) => r.ps.map((p, i) => {
  let v = r.base[i]
  for (const [k, w] of add) v += w * r.n[k][i]
  return { n: p.n, v }
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

console.log('courses', races.length)
const dispo = {}
for (const r of races) for (const [k, v] of Object.entries(r.dispo)) { dispo[k] = dispo[k] || [0, 0]; dispo[k][0] += v >= 0.8 ? 1 : 0; dispo[k][1]++ }
for (const [k, [a, b]] of Object.entries(dispo)) console.log('  dispo ' + k.padEnd(11) + f3(a / b).padStart(7) + '  (' + a + '/' + b + ')')
console.log('')

const FEATS = ['gainT', 'gain', 'victoires', 'places', 'valeur', 'valeurInv', 'poids', 'poidsInv', 'corde']
for (const k of FEATS) {
  const cle = k.replace('Inv', '')
  const list = races.filter((r) => r.dispo[cle] >= 0.8)
  const TR = list.filter((r) => r.date < TEST_DEPUIS)
  const TE = list.filter((r) => r.date >= TEST_DEPUIS)
  const an = {}
  for (const r of list) { const y = r.date.slice(0, 4); an[y] = (an[y] || 0) + 1 }
  const a0 = evalSet(TR, []), b0 = evalSet(TE, [])
  console.log('  ── ' + k + '  n=' + list.length + '  (train ' + TR.length + ' · test ' + TE.length + ')  années ' +
    Object.entries(an).map(([y, v]) => y + ':' + v).join(' '))
  console.log('     ' + 'empreinte seule'.padEnd(22) + '  TRAIN ' + f3(a0.g).padStart(6) + f3(a0.co).padStart(7) + f3(a0.tr).padStart(6) +
    ' | TEST ' + f3(b0.g).padStart(6) + f3(b0.co).padStart(7) + f3(b0.tr).padStart(6) + f3(b0.s6).padStart(7))
  for (const w of [0.10, 0.20, 0.35]) {
    const add = [[k, w]]
    const a = evalSet(TR, add), b = evalSet(TE, add)
    console.log('     ' + ('+ ' + k + ' ' + w.toFixed(2)).padEnd(22) + '  TRAIN ' + f3(a.g).padStart(6) + f3(a.co).padStart(7) + f3(a.tr).padStart(6) +
      ' | TEST ' + f3(b.g).padStart(6) + f3(b.co).padStart(7) + f3(b.tr).padStart(6) + f3(b.s6).padStart(7))
  }
}
/* (ancienne boucle de comparaison supprimée : le socle est désormais recalculé
   sur le MÊME sous-corpus que l'ajout — sinon la comparaison est fausse) */

