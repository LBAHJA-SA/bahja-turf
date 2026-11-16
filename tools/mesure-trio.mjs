/* tools/mesure-trio.mjs — LA MESURE DU TRIO, sans marché de dupes.
 *
 * Question posée : « le moteur donne les 3 premiers du marché — est-ce que
 * ce trio arrive vraiment ? »  Réponse mesurée, sur l'archive :
 *
 *   top-3 marché   -> ~3 %   (347 courses : 11/347)
 *   top-3 presse   -> ~5-6 % (99 courses)
 *   top-3 carrière -> ~1 %   (96 courses)  ← pire que le marché
 *
 * Le levier n'est pas l'ordre, c'est le NOMBRE de numéros.
 *
 *   node tools/mesure-trio.mjs
 */
import fs from 'node:fs'

const load = (f) => {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'))
  return Array.isArray(j) ? j : (j.courses || Object.values(j))
}
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + '%' : '—')

const fusion = load('data/corpus/fusion.json')
let forms = {}
try { forms = JSON.parse(fs.readFileSync('data/forms.json', 'utf8')) } catch { /* optionnel */ }

function parseOrd(c) {
  const cotes = c.cotes || {}
  const nums = Object.keys(cotes).map(Number).filter((n) => cotes[n] > 0)
  const coteOrd = [...nums].sort((a, b) => cotes[a] - cotes[b])
  let presseOrd = []
  if (Array.isArray(c.presse) && c.presse.length) {
    const e = c.presse
      .map((x, i) => (typeof x === 'number'
        ? { num: x, pos: i + 1 }
        : { num: Number(x?.num ?? x?.n ?? x?.cheval), pos: Number(x?.pos ?? x?.rang ?? x?.position ?? i + 1) }))
      .filter((x) => Number.isFinite(x.num))
    e.sort((a, b) => a.pos - b.pos)
    presseOrd = e.map((y) => y.num).filter((n) => nums.includes(n))
  }
  return { coteOrd, presseOrd, arrivee: (c.arrivee || []).map(Number) }
}

const races = fusion
  .map((c) => ({ date: c.date, ...parseOrd(c) }))
  .filter((c) => c.coteOrd.length >= 6 && c.arrivee.length >= 3)

const inTop = (order, arrivee, N) => {
  if ((order || []).length < N) return false
  const s = new Set(order.slice(0, N))
  return arrivee.slice(0, 3).every((x) => s.has(x))
}
const share = (set, key, N) => (set.length ? (100 * set.filter((c) => inTop(c[key], c.arrivee, N)).length) / set.length : 0)

console.log('\n=== 1. CE QUE LE MOTEUR AFFICHE (l\'ordre du marché) ===')
console.log('   ' + races.length + ' courses · cotes finales · arrivée complète\n')
const g = races.filter((c) => c.coteOrd[0] === c.arrivee[0]).length
const cp = races.filter((c) => c.arrivee.slice(0, 2).every((x) => c.coteOrd.slice(0, 2).includes(x))).length
const tr = races.filter((c) => inTop(c.coteOrd, c.arrivee, 3)).length
console.log('   GAGNANT  (1er du marché)       ' + pct(g, races.length).padStart(6) + '   ' + g + '/' + races.length)
console.log('   COUPLÉ   (1er + 2e)            ' + pct(cp, races.length).padStart(6) + '   ' + cp + '/' + races.length)
console.log('   TRIO     (1er + 2e + 3e)       ' + pct(tr, races.length).padStart(6) + '   ' + tr + '/' + races.length)

const dist = [0, 0, 0, 0]
for (const c of races) {
  const t3 = new Set(c.coteOrd.slice(0, 3))
  dist[c.arrivee.slice(0, 3).filter((x) => t3.has(x)).length]++
}
console.log('\n   combien d\'arrivants du trio viennent du top-3 marché :')
for (let i = 0; i < 4; i++) console.log('     ' + i + ' cheval(s) -> ' + pct(dist[i], races.length))

console.log('\n=== 2. LE TRIO EST-IL SEULEMENT DANS LE TOP-N ? (marché) ===')
for (const N of [3, 4, 5, 6, 7, 8]) {
  const s = races.filter((c) => c.coteOrd.length >= N)
  console.log('   top-' + String(N).padStart(2) + ' -> ' + pct(share(s, 'coteOrd', N).toFixed(1), 100).padStart(6) + '   (' + s.filter((c) => inTop(c.coteOrd, c.arrivee, N)).length + '/' + s.length + ')')
}

const withP = races.filter((c) => c.presseOrd.length >= 3)
console.log('\n=== 3. À JEU ÉGAL : marché vs presse (' + withP.length + ' courses) ===')
const m3 = withP.filter((c) => inTop(c.coteOrd, c.arrivee, 3)).length
const p3 = withP.filter((c) => inTop(c.presseOrd, c.arrivee, 3)).length
console.log('   top-3 MARCHÉ -> ' + pct(m3, withP.length) + '  (' + m3 + '/' + withP.length + ')')
console.log('   top-3 PRESSE -> ' + pct(p3, withP.length) + '  (' + p3 + '/' + withP.length + ')')

const sorted = withP.slice().sort((a, b) => (a.date < b.date ? -1 : 1))
const h = Math.floor(sorted.length / 2)
console.log('\n   stabilité (moitié par moitié) :')
for (const [name, set] of [['1re moitié', sorted.slice(0, h)], ['2e moitié', sorted.slice(h)]]) {
  console.log('     ' + name + ' (' + set.length + ') : marché ' + pct(share(set, 'coteOrd', 3).toFixed(1), 100) + '  ·  presse ' + pct(share(set, 'presseOrd', 3).toFixed(1), 100))
}

console.log('\n   couverture par N (même ' + withP.length + ' courses) :')
console.log('     N   marché   presse')
for (const N of [3, 4, 5, 6, 7, 8]) {
  const a = withP.filter((c) => c.coteOrd.length >= N)
  const b = withP.filter((c) => c.presseOrd.length >= N)
  console.log('     ' + String(N).padStart(2) + '  ' + pct(share(a, 'coteOrd', N).toFixed(1), 100).padStart(6) + '  ' + pct(share(b, 'presseOrd', N).toFixed(1), 100).padStart(6))
}

/* ---- 4. la carrière (forms.json) ---- */
const keys = Object.keys(forms)
if (keys.length) {
  const byId = new Map()
  const qj = load('data/quintes.json')
  for (const q of qj) if (q?.id) byId.set(String(q.id), q)

  const sc = (arr, dist, track) => {
    const f = (arr || []).slice(0, 5)
    if (!f.length) return null
    let s = 0, w = 0
    f.forEach((c, i) => {
      const p = Number(c.place)
      if (!Number.isFinite(p) || p <= 0) return
      const wi = 1 / (1 + i * 0.55)
      const pts = p === 1 ? 10 : p === 2 ? 8 : p === 3 ? 6 : p <= 5 ? 4 : p <= 9 ? 1.5 : 0
      s += pts * wi; w += wi
    })
    const forme = w ? s / w : null
    if (forme == null) return null
    const near = (arr || []).slice(0, 8).filter((c) => Number(c.place) > 0 && dist && Math.abs(Number(c.dist) - dist) <= 400)
    const dis = near.length ? (near.filter((c) => Number(c.place) <= 3).length / near.length) * 10 : 0
    const pis = (arr || []).slice(0, 10).filter((c) => Number(c.place) > 0 && track && String(c.track || '').toUpperCase() === track)
    const piste = pis.length ? (pis.filter((c) => Number(c.place) <= 3).length / pis.length) * 10 : 0
    return forme + dis * 0.6 + piste * 0.4
  }

  const cr = []
  for (const k of keys) {
    const f = forms[k]
    const q = byId.get(String(f.id))
    if (!q || !q.cotes || !q.arrivee || q.arrivee.length < 3) continue
    const o = parseOrd(q)
    const dist = Number(q.distance || f.distance) || 0
    const track = String(q.track || f.track || '').toUpperCase()
    const rows = Object.keys(f.chevaux || {}).map((n) => ({ num: Number(n), s: sc(f.chevaux[n], dist, track) }))
      .filter((r) => r.s != null && Number.isFinite(r.s))
      .sort((a, b) => b.s - a.s)
      .map((r) => r.num)
    cr.push({ date: q.date || f.date, arrivee: o.arrivee, coteOrd: o.coteOrd, carriere: rows })
  }

  if (cr.length) {
    console.log('\n=== 4. LA CARRIÈRE DE L\'ARCHIVE (' + cr.length + ' courses) ===')
    console.log('   top-3 carrière -> ' + pct(share(cr, 'carriere', 3).toFixed(1), 100) + '   vs marché ' + pct(share(cr, 'coteOrd', 3).toFixed(1), 100))
    console.log('\n     N   marché   carrière')
    for (const N of [3, 4, 5, 6]) {
      const a = cr.filter((c) => c.coteOrd.length >= N)
      const b = cr.filter((c) => c.carriere.length >= N)
      console.log('     ' + String(N).padStart(2) + '  ' + pct(share(a, 'coteOrd', N).toFixed(1), 100).padStart(6) + '  ' + pct(share(b, 'carriere', N).toFixed(1), 100).padStart(6))
    }
  }
}

console.log('\n→ L\'ordre le plus fiable reste le marché. La carrière fait PIRE.\n')
