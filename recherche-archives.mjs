// ════════════════════════════════════════════════════════════════════
//  GRAND DATASET : 3 565 courses archivées avec résultat (rang 1-5),
//  2020-2026, dont 866 courses Quinté.
//  Objectif : trouver un vrai signal pour les RANGS 8-11.
//  Validation : découpage chronologique strict (on n'apprend que sur le passé,
//  on ne teste que sur le futur). 5 plis.
// ════════════════════════════════════════════════════════════════════
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

function walk(d, out = []) { for (const e of readdirSync(d, { withFileTypes: true })) { const f = join(d, e.name); if (e.isDirectory()) walk(f, out); else if (e.name.endsWith('.json')) out.push(f) } return out }
const C = (p) => (typeof p.cote_pmu === 'number' && p.cote_pmu > 0 ? p.cote_pmu : null)
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

const raw = []
for (const f of walk('archives')) {
  let j; try { j = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { continue }
  const c = j.course || {}; const P = (j.participants || []).filter((p) => !p.nonPartant && p.rang >= 1 && p.rang <= 5)
  const tous = (j.participants || []).filter((p) => !p.nonPartant)
  if (P.length !== 5) continue
  if (tous.length < 8) continue
  const s = tous.filter((p) => C(p) != null).sort((a, b) => C(a) - C(b))
  if (s.length < 8) continue
  if (!P.every((p) => C(p) != null)) continue      // il faut la cote des 5 gagnants
  const A = P.sort((a, b) => a.rang - b.rang).map((p) => p.num)
  raw.push({
    date: (j.reunion && j.reunion.date) || '', quinte: !!c.quinte, spec: c.specialty || '',
    dist: num(c.distance), going: c.going || '', surface: c.surface || '', corde: num(c.corde) || 0,
    nPart: tous.length, A, s, id: f,
  })
}
raw.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
const pc = (v, n) => (n ? Math.round((100 * v) / n) + '%' : '—')
console.log(`COURSES UTILISABLES : ${raw.length}`)
console.log(`  dont Quinté : ${raw.filter((r) => r.quinte).length}`)
console.log(`  période : ${raw[0].date} → ${raw[raw.length - 1].date}`)
const nb = raw.map((r) => r.nPart)
console.log(`  partants moyen : ${(nb.reduce((a, b) => a + b, 0) / nb.length).toFixed(1)}   min ${Math.min(...nb)}  max ${Math.max(...nb)}`)

// ── baseline : top-k par cote, avec IC 95 %
const base = (set, k) => { let t = 0; for (const r of set) { const top = r.s.slice(0, k).map((p) => p.num); if (r.A.every((x) => top.includes(x))) t++ } return t }
console.log(`\n╔═══ RÉFÉRENCE : top-k PAR COTE, sur ${raw.length} courses ═══`)
console.log('║   k │ Quinté seul       │ toutes courses')
for (const k of [4, 5, 6, 7, 8, 9, 10, 11, 12]) {
  const q = raw.filter((r) => r.quinte)
  console.log(`║  ${String(k).padStart(2)} │ ${String(base(q, k)).padStart(4)}/${q.length} ${pc(base(q, k), q.length).padStart(5)}   │ ${String(base(raw, k)).padStart(4)}/${raw.length} ${pc(base(raw, k), raw.length).padStart(5)}`)
}
console.log('╚' + '─'.repeat(56))

// ── le réservoir 8+ : existe-t-il un signal ?
console.log(`\n╔═══ LE RÉSERVOIR (rangs 8+) : quel critère attrape le top 5 ? ═══`)
const ENS = raw.filter((r) => r.s.length >= 12)
const CRIT = {
  'rang 8 tout court (cote)   ': (p) => -C(p),
  'podium %                   ': (p) => (num(p.nombreCourses) >= 5 ? num(p.nombrePlaces) / num(p.nombreCourses) : -1),
  'victoires %                ': (p) => (num(p.nombreCourses) >= 5 ? num(p.nombreVictoires) / num(p.nombreCourses) : -1),
  '2e+3e %                    ': (p) => (num(p.nombreCourses) >= 5 ? (num(p.nombrePlacesSecond) + num(p.nombrePlacesTroisieme)) / num(p.nombreCourses) : -1),
  'nb courses (expérience)    ': (p) => num(p.nombreCourses),
  'gains                      ': (p) => num(p.gain),
  'âge                        ': (p) => -num(p.age),
  'poids                      ': (p) => -num(p.poids),
  'distanceald               ': null,
}
for (const [lab, set] of [['toutes', ENS], ['Quinté', ENS.filter((r) => r.quinte)]]) {
  if (!set.length) continue
  console.log(`\n  ${lab} (${set.length} courses)`)
  const res = []
  for (const k of Object.keys(CRIT)) {
    const f = CRIT[k]; if (!f) continue
    let t = 0
    for (const r of set) { const pick = r.s.slice(7).sort((a, b) => f(b) - f(a))[0]; if (pick && r.A.includes(pick.num)) t++ }
    res.push({ k, t })
  }
  res.sort((a, b) => b.t - a.t)
  res.forEach((r) => console.log(`     ${r.k.padEnd(28)} ${String(r.t).padStart(4)}/${set.length}  ${pc(r.t, set.length).padStart(5)}`))
}

// ── 7 + 1 choisi dans le réservoir
console.log(`\n╔═══ 7 (par cote) + 1 DANS LE RÉSERVOIR ═══`)
for (const [lab, set] of [['toutes', raw], ['Quinté', raw.filter((r) => r.quinte)]]) {
  if (!set.length) continue
  console.log(`\n  ${lab} (${set.length})`)
  const res = []
  const R7 = () => { let t = 0; for (const r of set) { if (r.A.every((x) => r.s.slice(0, 7).map((p) => p.num).includes(x))) t++ } return t }
  res.push({ k: '(réf) 7 par cote', t: R7() })
  res.push({ k: '(réf) 8 par cote', t: base(set, 8) })
  for (const k of Object.keys(CRIT)) {
    const f = CRIT[k]; if (!f) continue
    let t = 0
    for (const r of set) {
      const pick = r.s.slice(7).sort((a, b) => f(b) - f(a))[0]
      const s8 = pick ? [...r.s.slice(0, 7).map((p) => p.num), pick.num] : r.s.slice(0, 7).map((p) => p.num)
      if (r.A.every((x) => s8.includes(x))) t++
    }
    res.push({ k: '7 + ' + k.trim(), t })
  }
  res.sort((a, b) => b.t - a.t)
  res.forEach((r) => console.log(`     ${r.k.padEnd(32)} ${String(r.t).padStart(4)}/${set.length}  ${pc(r.t, set.length).padStart(5)}`))
}
