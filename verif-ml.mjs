// Le modèle donne 0/0 sur 3 156 courses : est-ce qu'il reproduit la cote ?
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
const { w, SPECS, GOINGS, SIE, NF } = JSON.parse(readFileSync('modele-final.json', 'utf8'))
function walk(d, out = []) { for (const e of readdirSync(d, { withFileTypes: true })) { const f = join(d, e.name); if (e.isDirectory()) walk(f, out); else if (e.name.endsWith('.json')) out.push(f) } return out }
const C = (p) => (typeof p.cote_pmu === 'number' && p.cote_pmu > 0 ? p.cote_pmu : null)
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
function formP(p) { const m = String(p.musique || '').replace(/[^0-9a-zA-Z]/g, '').slice(0, 6); if (!m) return 0; let s = 0, ww = 0; m.split('').forEach((c, i) => { const q = 1 / (i + 1); if (c >= '1' && c <= '9') s += q; else if (c === 'a' || c === 'A') s += 0.45 * q; ww += q }); return ww ? s / ww : 0 }
const sec = (v) => { if (typeof v !== 'string' || !v) return 0; const p = v.split("'"); if (p.length < 2) return 0; const a = parseInt(p[0], 10), b = parseInt(p[1], 10); return Number.isFinite(a) && Number.isFinite(b) && a > 0 ? b / a : 0 }
function feat(p, i, nPart, r) {
  const nc = num(p.nombreCourses), c = C(p)
  return [Math.log(c), Math.log(c) * Math.log(c), i / nPart, nPart, num(p.age), num(p.poids), Math.log1p(num(p.gain)) / 12, num(p.decharge) / 10, Math.log1p(nc), nc >= 5 ? num(p.nombrePlaces) / nc : 0.3, nc >= 5 ? (num(p.nombrePlacesSecond) + num(p.nombrePlacesTroisieme)) / nc : 0.15, nc >= 5 ? num(p.nombreVictoires) / nc : 0.15, formP(p), sec(p.record), num(p.ecart) / 10, r.dist / 3000, r.nPart, ...SPECS.map((s) => (r.spec === s ? 1 : 0)), ...GOINGS.map((g) => (r.going === g ? 1 : 0)), ...SIE.map((s) => (p.sexe === s ? 1 : 0))]
}
const sc = (x) => { let z = 0; for (let j = 0; j < w.length; j++) z += w[j] * x[j]; return z }
const raw = []
for (const f of walk('archives')) { let j; try { j = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { continue } const c = j.course || {}; const P = (j.participants || []).filter((p) => !p.nonPartant && p.rang >= 1 && p.rang <= 5); const tous = (j.participants || []).filter((p) => !p.nonPartant); if (P.length !== 5 || tous.length < 8) continue; const s = tous.filter((p) => C(p) != null).sort((a, b) => C(a) - C(b)); if (s.length < 8 || !P.every((p) => C(p) != null)) continue; raw.push({ date: (j.reunion && j.reunion.date) || '', quinte: !!c.quinte, spec: c.specialty || '', going: c.going || '', dist: num(c.distance), nPart: tous.length, A: P.sort((a, b) => a.rang - b.rang).map((p) => p.num), s }) }
raw.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
// on teste sur le dernier tiers (données que le modèle final a vues au mieux)
const test = raw.slice(Math.floor(raw.length * 0.66))
let idem = 0, diff = 0, rho = 0, gains = 0, pertes = 0
for (const r of test) {
  const items = r.s.map((p, i) => ({ num: p.num, s: sc(feat(p, i + 1, r.nPart, r)), c: C(p) }))
  const m8 = items.slice().sort((a, b) => b.s - a.s).slice(0, 8).map((z) => z.num).join('-')
  const c8 = r.s.slice(0, 8).map((p) => p.num).join('-')
  if (m8 === c8) idem++; else diff++
  // corrélation de rang
  const a = items.slice().sort((x, y) => y.s - x.s).map((z) => z.num)
  const b = items.slice().sort((x, y) => x.c - y.c).map((z) => z.num)
  let d2 = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d2++
  rho += 1 - d2 / a.length
  const h = (arr) => r.A.filter((x) => arr.includes(x)).length
  if (h(a.slice(0, 8)) >= 5 && h(c8.split('-')) < 5) gains++
  if (h(c8.split('-')) >= 5 && h(a.slice(0, 8)) < 5) pertes++
}
console.log(`Test sur ${test.length} courses (dernier tiers)`)
console.log(`  top-8 IDENTIQUE à la cote : ${idem} (${Math.round(100 * idem / test.length)}%)   différent : ${diff}`)
console.log(`  corrélation de classement moyenne : ${(rho / test.length).toFixed(4)}  (1.000 = classement identique)`)
console.log(`  modèle gagne : ${gains}   modèle perd : ${pertes}`)
console.log(`\nPoids les plus forts :`)
const noms = ['log(cote)', 'log²(cote)', 'rang/n', 'nPartants', 'âge', 'poids', 'log(gains)', 'décharge', 'log(courses)', 'podium%', '2e+3e%', 'victoires%', 'forme', 'record', 'ecart', 'distance', 'nPart(bis)']
w.slice(0, 17).map((v, i) => [noms[i], v]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 10).forEach(([n, v]) => console.log(`   ${n.padEnd(12)} ${v.toFixed(3)}`))
