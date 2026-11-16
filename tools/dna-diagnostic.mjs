/* tools/dna-diagnostic.mjs — le modèle est-il cassé, ou le signal est-il vraiment absent ?
 * AUC = probabilité qu'un cheval du top-3 ait un score plus haut qu'un non-arrivant.
 * 0,50 = aucun pouvoir. 1,00 = parfait. */
import fs from 'node:fs'

const idx = JSON.parse(fs.readFileSync('data/dna-archive-index.json', 'utf8'))
const LETTER_TO_DISC = { a: 'ATTELE', m: 'MONTE', p: 'PLAT', h: 'HAIE', s: 'STEEPLE', c: 'CROSS' }

function parseMusique(m) {
  const re = /([0-9]{1,2}|D|A|T|R)([ampshc])/gi
  const out = []
  let x
  while ((x = re.exec(String(m || '')))) {
    out.push({ place: /^[0-9]+$/.test(x[1]) ? Number(x[1]) : 0, lettre: x[2].toLowerCase() })
  }
  return out
}
function discOf(c) {
  const d = (c.disc || '').toUpperCase()
  if (/ATTELE|TROT/.test(d)) return 'ATTELE'
  if (/MONTE/.test(d)) return 'MONTE'
  if (/PLAT|GALOP/.test(d)) return 'PLAT'
  if (/STEEPLE/.test(d)) return 'STEEPLE'
  if (/HAIE/.test(d)) return 'HAIE'
  if (/CROSS/.test(d)) return 'CROSS'
  return 'AUTRE'
}
const PTS = (p) => (p === 1 ? 10 : p === 2 ? 8 : p === 3 ? 6 : p <= 5 ? 4 : p <= 9 ? 1.5 : 0)

function forme(mus) {
  const r = mus.slice(0, 5)
  let s = 0, w = 0
  r.forEach((x, i) => { const wi = 1 / (1 + i * 0.55); s += PTS(x.place) * wi; w += wi })
  return w ? s / w : null
}

function auc(pairs) {
  // pairs = [{s, y}]  y=1 arrivant top3
  // AUC par rang (O(n log n)) au lieu du produit croisé
  const n = pairs.length
  const pos = pairs.filter((p) => p.y === 1).length
  const neg = n - pos
  if (!pos || !neg) return { auc: NaN, n }
  const idx = pairs.map((p, i) => ({ s: p.s, y: p.y, i }))
  idx.sort((a, b) => a.s - b.s)
  let i = 0
  let rankSumPos = 0
  while (i < n) {
    let j = i
    while (j + 1 < n && idx[j + 1].s === idx[i].s) j++
    const avgRank = (i + j) / 2 + 1 // rangs 1-based, moyenne des ex-aequo
    for (let k = i; k <= j; k++) if (idx[k].y === 1) rankSumPos += avgRank
    i = j + 1
  }
  const a = (rankSumPos - (pos * (pos + 1)) / 2) / (pos * neg)
  return { auc: a, n }
}

const rows = {}
const add = (k, s, y) => { if (s != null && Number.isFinite(s)) (rows[k] = rows[k] || []).push({ s, y }) }

let races = 0, big = 0
for (const c of idx) {
  const ps = c.ps.filter((p) => p.rang != null && /[0-9]/.test(p.musique || '') && p.cote != null && p.cote > 0)
  if (ps.length < 6) continue
  races++
  const bigField = ps.length >= 14
  if (bigField) big++
  const disc = discOf(c)
  const lettre = Object.entries(LETTER_TO_DISC).find(([, v]) => v === disc)?.[0]
  for (const p of ps) {
    const mus = parseMusique(p.musique)
    const y = p.rang <= 3 ? 1 : 0
    const f = forme(mus)
    const same = mus.filter((r) => r.lettre === lettre).slice(0, 5)
    const fd = forme(same)
    const last8 = mus.slice(0, 8)
    const pr = last8.length ? last8.filter((r) => r.place >= 1 && r.place <= 3).length / last8.length : null
    const b3 = mus.slice(0, 3).filter((r) => r.place > 0)
    const best = b3.length ? 1 / Math.min(...b3.map((r) => r.place)) : null
    const tag = bigField ? 'BIG' : 'SML'
    add('cote/' + tag, -p.cote, y)
    add('forme/' + tag, f, y)
    add('formeDisc/' + tag, fd, y)
    add('placeRate/' + tag, pr, y)
    add('best/' + tag, best, y)
    add('age/' + tag, -(p.age || 6), y)
  }
}
console.log('courses :', races, '| dont 14+ partants :', big, '\n')
console.log('AUC — pouvoir de chaque variable, cheval par cheval')
console.log('variable            tout le peloton   14+ partants')
for (const base of ['cote', 'forme', 'formeDisc', 'placeRate', 'best', 'age']) {
  const a = auc(rows[base + '/SML'].concat(rows[base + '/BIG']))
  const b = auc(rows[base + '/BIG'])
  console.log('  ' + base.padEnd(18) + a.auc.toFixed(3) + '               ' + b.auc.toFixed(3))
}
