// ════════════════════════════════════════════════════════════════════
//  RECHERCHE 3 : MODÈLE APPRIS SUR 3 156 COURSES (798 QUINTÉ)
//  ~40 000 chevaux. Validation chronologique : 5 plis, on n'apprend
//  JAMAIS sur le futur. Signaux ajoutés par rapport à l'API :
//  going (état du terrain), surface, distance, record, ecart, corde.
// ════════════════════════════════════════════════════════════════════
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'

function walk(d, out = []) { for (const e of readdirSync(d, { withFileTypes: true })) { const f = join(d, e.name); if (e.isDirectory()) walk(f, out); else if (e.name.endsWith('.json')) out.push(f) } return out }
const C = (p) => (typeof p.cote_pmu === 'number' && p.cote_pmu > 0 ? p.cote_pmu : null)
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

function formP(p) {
  const m = String(p.musique || '').replace(/[^0-9a-zA-Z]/g, '').slice(0, 6); if (!m) return 0
  let s = 0, w = 0
  m.split('').forEach((c, i) => { const ww = 1 / (i + 1); if (c >= '1' && c <= '9') s += ww; else if (c === 'a' || c === 'A') s += 0.45 * ww; w += ww })
  return w ? s / w : 0
}
const sec = (v) => { if (typeof v !== 'string' || !v) return 0; const p = v.split("'"); if (p.length < 2) return 0; const a = parseInt(p[0], 10), b = parseInt(p[1], 10); return Number.isFinite(a) && Number.isFinite(b) && a > 0 ? b / a : 0 }

const raw = []
for (const f of walk('archives')) {
  let j; try { j = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { continue }
  const c = j.course || {}; const P = (j.participants || []).filter((p) => !p.nonPartant && p.rang >= 1 && p.rang <= 5)
  const tous = (j.participants || []).filter((p) => !p.nonPartant)
  if (P.length !== 5 || tous.length < 8) continue
  const s = tous.filter((p) => C(p) != null).sort((a, b) => C(a) - C(b))
  if (s.length < 8 || !P.every((p) => C(p) != null)) continue
  raw.push({ date: (j.reunion && j.reunion.date) || '', quinte: !!c.quinte, spec: c.specialty || '', going: c.going || '', surface: c.surface || '', dist: num(c.distance), nPart: tous.length, A: P.sort((a, b) => a.rang - b.rang).map((p) => p.num), s })
}
raw.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
console.log(`COURSES : ${raw.length}  (Quinté ${raw.filter((r) => r.quinte).length})  ${raw[0].date} → ${raw[raw.length - 1].date}`)

const SPECS = [...new Set(raw.map((r) => r.spec))].sort()
const GOINGS = [...new Set(raw.map((r) => r.going))].sort()
const SIE = [...new Set(raw.map((r) => r.s[0].sexe).filter(Boolean))].sort()
console.log(`spécialités : ${SPECS.length} ·Going : ${GOINGS.length} ·Sexes : ${SIE.join(',')}`)

const NF = 18 + SPECS.length + GOINGS.length + SIE.length
function feat(p, i, nPart, r) {
  const nc = num(p.nombreCourses), c = C(p)
  const base = [
    Math.log(c), Math.log(c) * Math.log(c), i / nPart, nPart,
    num(p.age), num(p.poids), Math.log1p(num(p.gain)) / 12, num(p.decharge) / 10,
    Math.log1p(nc), nc >= 5 ? num(p.nombrePlaces) / nc : 0.3,
    nc >= 5 ? (num(p.nombrePlacesSecond) + num(p.nombrePlacesTroisieme)) / nc : 0.15,
    nc >= 5 ? num(p.nombreVictoires) / nc : 0.15,
    formP(p), sec(p.record), num(p.ecart) / 10, r.dist / 3000, r.nPart,
  ]
  return [...base, ...SPECS.map((s) => (r.spec === s ? 1 : 0)), ...GOINGS.map((g) => (r.going === g ? 1 : 0)), ...SIE.map((s) => (p.sexe === s ? 1 : 0))]
}

function logistique(X, y, nF, l2, iters, lr) {
  const w = new Array(nF).fill(0), m = new Array(nF).fill(0), v = new Array(nF).fill(0)
  const n = X.length
  for (let t = 1; t <= iters; t++) {
    const g = new Array(nF).fill(0)
    for (let i = 0; i < n; i++) {
      let z = 0; for (let j = 0; j < nF; j++) z += w[j] * X[i][j]
      const p = 1 / (1 + Math.exp(-z)), e = p - y[i]
      for (let j = 0; j < nF; j++) g[j] += e * X[i][j]
    }
    for (let j = 0; j < nF; j++) {
      const gj = g[j] / n + l2 * w[j]
      m[j] = 0.9 * m[j] + 0.1 * gj; v[j] = 0.999 * v[j] + 0.001 * gj * gj
      w[j] -= lr * (m[j] / (1 - Math.pow(0.9, t))) / (Math.sqrt(v[j] / (1 - Math.pow(0.999, t))) + 1e-8)
    }
  }
  return w
}
const sc = (x, w) => { let z = 0; for (let j = 0; j < w.length; j++) z += w[j] * x[j]; return z }

// ── validation croisée chronologique : 5 plis
const FOLDS = 5
const plis = []; const taille = Math.floor(raw.length / FOLDS)
for (let f = 0; f < FOLDS; f++) plis.push({ test: raw.slice(f * taille, f === FOLDS - 1 ? raw.length : (f + 1) * taille), train: [...raw.slice(0, f * taille), ...raw.slice(f === FOLDS - 1 ? raw.length : (f + 1) * taille)] })
console.log(`\n5 plis chronologiques. Train moyen : ${Math.round(plis[0].train.length)} courses, test : ${taille}`)

const L2 = 3e-3, ITERS = 1200, LR = 0.35
const res = {}
for (let f = 0; f < FOLDS; f++) {
  const X = [], y = []
  for (const r of plis[f].train) r.s.forEach((p, i) => { X.push(feat(p, i + 1, r.nPart, r)); y.push(r.A.includes(p.num) ? 1 : 0) })
  const w = logistique(X, y, NF, L2, ITERS, LR)
  if (f === FOLDS - 1) { res.w = w }
  for (const k of [4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    for (const r of plis[f].test) {
      const items = r.s.map((p, i) => ({ num: p.num, s: sc(feat(p, i + 1, r.nPart, r), w) }))
      const parModele = items.slice().sort((a, b) => b.s - a.s).slice(0, k).map((z) => z.num)
      const parCote = r.s.slice(0, k).map((p) => p.num)
      const key = `${k}|${r.quinte ? 'Q' : 'T'}`
      res[key] = res[key] || { c5: 0, m5: 0, n: 0, c4: 0, m4: 0, win: 0, lose: 0 }
      const h = (arr, j) => r.A.filter((x) => arr.includes(x)).length
      if (h(parCote, 5) >= 5) res[key].c5++
      if (h(parModele, 5) >= 5) res[key].m5++
      if (h(parCote, 5) >= 4) res[key].c4++
      if (h(parModele, 5) >= 4) res[key].m4++
      res[key].n++
      if (h(parModele, 5) >= 5 && h(parCote, 5) < 5) res[key].win++
      if (h(parCote, 5) >= 5 && h(parModele, 5) < 5) res[key].lose++
    }
  }
}
const pc = (v, n) => Math.round((100 * v) / n) + '%'
console.log(`\n╔═══ RÉSULTAT HORS-ÉCHANTILLON (5 plis, ~3 156 courses testées) ═══`)
console.log('║   k │          TOUTES              │        QUINTÉ')
console.log('║     │  cote  modèle  4+/5(c/m)  W/L │ cote  modèle  4+/5  W/L')
for (const k of [4, 5, 6, 7, 8, 9, 10, 11, 12]) {
  const T = res[`${k}|T`], Q = res[`${k}|Q`]
  if (!T || !Q) continue
  console.log(`║  ${String(k).padStart(2)} │ ${pc(T.c5, T.n).padStart(5)} ${pc(T.m5, T.n).padStart(6)} ${pc(T.c4, T.n).padStart(6)}/${pc(T.m4, T.n)} ${String(T.win).padStart(2)}/${String(T.lose).padEnd(2)} │ ${pc(Q.c5, Q.n).padStart(5)} ${pc(Q.m5, Q.n).padStart(6)} ${pc(Q.c4, Q.n).padStart(5)}  ${String(Q.win).padStart(2)}/${String(Q.lose).padEnd(2)}`)
}
console.log('║  W/L = courses où le modèle gagne / perd la 5/5 (test apparié)')
console.log('╚' + '─'.repeat(70))
writeFileSync('modele-final.json', JSON.stringify({ w: res.w, SPECS, GOINGS, SIE, NF, L2 }, null, 1))
console.log(`\nPoids enregistrés (${res.w.length}) dans modele-final.json`)
