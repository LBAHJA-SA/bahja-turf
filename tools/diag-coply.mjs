/* =============================================================================
 * tools/diag-coply.mjs — DIAGNOSTIC DU COUPLÉ (16/10/2026).
 *
 * Ce qu'on veut savoir avant de toucher au moteur :
 *   ① P(un cheval est dans le top3) par rang de marché — la pente du marché.
 *   ② P(DEUX chevaux donnés sont ensemble dans le top3) — la table des paires
 *      (c'est exactement la « paire » du couplé : 1-2, 1-3, 2-3).
 *   ③ cette même table CHANGE-T-ELLE avec la forme, la valeur, l'âge ?
 *      Si oui, il y a un moteur à écrire ; si non, le marché est tout.
 *   ④ le meilleur trio par la somme des 3 paires — est-ce toujours (1,2,3) ?
 *
 * Lecture seule. Usage : node tools/diag-coply.mjs [N=1200]
 * ============================================================================= */

import { charger } from './empreinte-couple.mjs'

const N = Math.max(1, Number(process.argv[2]) || 1200)

const formeScore = (mus) => {
  const s = String(mus || '')
  if (!s) return 0
  const pts = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 }
  let sc = 0
  for (const [i, r] of (s.match(/\d+[a-z]/g) || []).slice(0, 6).entries()) {
    const pl = Number(String(r).replace(/\D/g, ''))
    sc += (pts[pl] ?? 1) / (1 + i * 0.55)
  }
  return sc
}
const mediane = (ns) => { const s = ns.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }

function rangs(course) {
  const c = course.partants.map((p) => Number(p.cote_pmu)).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b)
  const m = c.length >> 1
  const med = c.length ? (c.length % 2 ? c[m] : (c[m - 1] + c[m]) / 2) : 1
  const cote = new Map(course.partants.map((p) => {
    const n = Number(p.cote_pmu)
    return [p.num, Number.isFinite(n) && n > 0 ? n : med]
  }))
  const ordre = course.partants.slice().sort((a, b) => cote.get(a.num) - cote.get(b.num) || a.num - b.num).map((p) => p.num)
  return { cote, ordre, parRang: new Map(ordre.map((n, i) => [i + 1, n])), parNum: new Map(ordre.map((n, i) => [n, i + 1])) }
}

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-Math.min(N, tout.length))
console.log('corpus ' + tout.length + ' · analysé ' + tests.length + ' (' + tests[0].date + ' → ' + tests[tests.length - 1].date + ')')

const RMAX = 12
const marg = Array.from({ length: RMAX + 1 }, () => ({ s: 0, w: 0 }))
const pair = new Map()
const trioSomme = new Map()
const parTaille = new Map()

/* conditions : forme (tercile DANS la course), valeur, âge */
const conds = {
  forme: () => ['haut', 'mid', 'bas'],
  valeur: () => ['haut', 'mid', 'bas'],
  age: () => ['≤4', '5-7', '≥8'],
}
const condStats = {}
for (const k of Object.keys(conds)) condStats[k] = new Map()   // "rang|tercile" -> {s,w}

for (const c of tests) {
  const r = rangs(c)
  const top3 = new Set(c.arrivee.slice(0, 3))
  const n = r.ordre.length
  parTaille.set(n, (parTaille.get(n) || 0) + 1)

  for (let k = 1; k <= Math.min(RMAX, n); k++) {
    marg[k].s++
    if (top3.has(r.parRang.get(k))) marg[k].w++
  }
  for (let a = 1; a <= Math.min(8, n); a++) for (let b = a + 1; b <= Math.min(8, n); b++) {
    const key = a + '-' + b
    const e = pair.get(key) || { s: 0, w: 0 }
    e.s++
    if (top3.has(r.parRang.get(a)) && top3.has(r.parRang.get(b))) e.w++
    pair.set(key, e)
  }
  /* le meilleur trio par somme des paires (sur la table GLOBALE, pour voir) */
  {
    let best = null
    const cap = Math.min(8, n)
    for (let i = 1; i <= cap; i++) for (let j = i + 1; j <= cap; j++) for (let k = j + 1; k <= cap; k++) {
      const s = (pair.get(i + '-' + j)?.w || 0) + (pair.get(i + '-' + k)?.w || 0) + (pair.get(j + '-' + k)?.w || 0)
      const cle = i + ',' + j + ',' + k
      if (!best || s > best.s) best = { s, cle }
    }
    if (best) trioSomme.set(best.cle, (trioSomme.get(best.cle) || 0) + 1)
  }
  /* conditions */
  for (const [nom, terciles] of Object.entries(conds)) {
    const vals = c.partants.map((p) => {
      if (nom === 'forme') return formeScore(p.musique)
      if (nom === 'valeur') return Number(p.valeur)
      return Number(p.age)
    })
    const ok = vals.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b)
    if (ok.length < 6) continue
    const q1 = ok[Math.floor(ok.length / 3)], q2 = ok[Math.floor((ok.length * 2) / 3)]
    const carts = terciles()
    const tercileDe = (v) => {
      if (!Number.isFinite(v) || v <= 0) return null
      if (nom === 'forme' || nom === 'valeur') return v >= q2 ? 'haut' : v >= q1 ? 'mid' : 'bas'
      return v <= q1 ? '≤4' : v <= q2 ? '5-7' : '≥8'
    }
    for (const p of c.partants) {
      const rg = r.parNum.get(p.num)
      if (!rg || rg > 8) continue
      const t = tercileDe(nom === 'forme' ? formeScore(p.musique) : nom === 'valeur' ? Number(p.valeur) : Number(p.age))
      if (!t) continue
      const key = rg + '|' + t
      const e = condStats[nom].get(key) || { s: 0, w: 0 }
      e.s++
      if (top3.has(p.num)) e.w++
      condStats[nom].set(key, e)
    }
  }
}

const pc = (w, s) => s ? (w / s * 100).toFixed(1) + '%' : '—'
console.log('')
console.log('① P(dans le top3) par rang de marché')
console.log('   ' + Array.from({ length: RMAX }, (_, i) => String(i + 1).padStart(6)).join(''))
console.log('   ' + marg.slice(1).map((m) => pc(m.w, m.s).padStart(6)).join(''))
console.log('   n=' + (marg[1].s || 0))

console.log('')
console.log('② P(LES DEUX dans le top3) — la table des paires')
console.log('        ' + Array.from({ length: 8 }, (_, i) => ('r' + (i + 1)).padStart(7)).join(''))
for (let a = 1; a <= 8; a++) {
  let ligne = ('r' + a).padEnd(7)
  for (let b = 1; b <= 8; b++) {
    if (b <= a) { ligne += ''.padStart(7); continue }
    const e = pair.get(a + '-' + b)
    ligne += pc(e?.w, e?.s).padStart(7)
  }
  console.log('   ' + ligne)
}
console.log('')
console.log('④ le meilleur trio par somme des paires : ' + [...trioSomme.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, v]) => k + ' ×' + v).join('  '))

for (const [nom, map] of Object.entries(condStats)) {
  console.log('')
  console.log('③ ' + nom + ' — P(dans le top3) par rang × tercile')
  const trs = [...new Set([...map.keys()].map((k) => k.split('|')[1]))]
  console.log('   rang  ' + trs.map((t) => t.padStart(9)).join('') + '     (échantillon)')
  for (let r = 1; r <= 6; r++) {
    let l = ('   ' + r).padEnd(7)
    for (const t of trs) { const e = map.get(r + '|' + t); l += pc(e?.w, e?.s).padStart(9) }
    l += '      ' + trs.map((t) => String(map.get(r + '|' + t)?.s ?? 0).padStart(8)).join('')
    console.log(l)
  }
}
console.log('')
console.log('tailles de peloton : ' + [...parTaille.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + 'p×' + v).join('  '))
