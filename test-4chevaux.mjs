// ════════════════════════════════════════════════════════════════════
//  TIERCÉ À 4 CHEVAUX : peut-on dépasser 60 % ?
//  Recherche exhaustive de TOUTES les combinaisons de 4 rangs (1..14),
//  avec et sans filtre de mouvement de cotes.
//  Validation A/B : le meilleur trouvé sur la moitié A est retesté sur B.
//  Sans cela, 1000 combinaisons sur 112 courses = du bruit garanti.
// ════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs'
const data = JSON.parse(readFileSync('geny-quintes.json', 'utf8'))
const pc = (v, n) => (n ? Math.round((100 * v) / n) + '%' : '—')
const N = data.length
const ratio = (x) => (!x.mv || !x.mv.ref || !x.mv.der) ? null : x.mv.der / x.mv.ref

// rangs des 3 premiers dans chaque course
const rangs3 = data.map((r) => {
  const rg = Object.fromEntries(r.s.map((x, i) => [x.num, i + 1]))
  return r.A.slice(0, 3).map((n) => rg[n])
})
const tiers = data.map((r) => new Set(r.A.slice(0, 3)))

// toutes les combinaisons de 4 rangs parmi 1..14
const combos = []
const gen = (st, i) => { if (st.length === 4) { combos.push(st.slice()); return } for (let j = i; j <= 14; j++) { st.push(j); gen(st, j + 1); st.pop() } }
gen([], 1)
console.log(`GENY Quinté : ${N} courses`)
console.log(`Combinaisons de 4 rangs testées : ${combos.length}\n`)

const score = (combo, indices) => { let t = 0; for (const i of indices) { const g = rangs3[i]; if (g.every((x) => combo.includes(x))) t++ } return t }
const idxA = [], idxB = []
for (let i = 0; i < N; i++) (i % 2 === 0 ? idxA : idxB).push(i)
const TOUS = [...Array(N).keys()]

const evalCombo = (c) => ({ A: score(c, idxA), B: score(c, idxB), G: score(c, TOUS) })

// ── 1. toutes les combinaisons, triées sur l'ensemble
const res = combos.map((c) => { const e = evalCombo(c); return { c, ...e } })
res.sort((a, b) => b.G - a.G)
console.log('═══ TOP 15 sur l\'ENSEMBLE (attention : surfitting) ═══')
res.slice(0, 15).forEach((r) => console.log(`   rangs ${r.c.join('-').padEnd(12)} GLOBAL ${String(r.G).padStart(3)} ${pc(r.G, N).padStart(5)}   (A ${r.A}/${idxA.length}  B ${r.B}/${idxB.length})`))
const ref = res.find((r) => r.c.join() === '1,2,3,4')
console.log(`   rangs 1-2-3-4  (réf)      GLOBAL ${String(ref.G).padStart(3)} ${pc(ref.G, N).padStart(5)}   (A ${ref.A}/${idxA.length}  B ${ref.B}/${idxB.length})`)

// ── 2. validation honnête : choisir sur A, mesurer sur B
const parA = [...res].sort((a, b) => b.A - a.A)
console.log('\n═══ VALIDATION : meilleur choisi sur A, testé sur B ═══')
parA.slice(0, 12).forEach((r) => {
  const gagne = r.B > ref.B
  console.log(`   rangs ${r.c.join('-').padEnd(12)} A ${String(r.A).padStart(2)} → B ${String(r.B).padStart(2)}/${idxB.length} ${pc(r.B, idxB.length).padStart(5)}   ${gagne ? '✅ bat la référence' : '❌'}   (réf B = ${ref.B})`)
})
const winner = parA[0]
console.log(`\n   Meilleur sur A : rangs ${winner.c.join('-')} → B = ${pc(winner.B, idxB.length)} contre ${pc(ref.B, idxB.length)} pour 1-2-3-4`)

// ── 3. avec filtre "on saute les chevaux dont la cote s'allonge"
console.log('\n═══ AVEC FILTRE MOUVEMENT (on saute si la cote s\'allonge) ═══')
for (const seuil of [1.1, 1.3, 1.6, 2.0]) {
  const f = (r) => {
    const out = []
    for (const x of r.s) { const m = ratio(x); if (m != null && m > seuil) continue; out.push(x.num); if (out.length >= 4) break }
    return out.length >= 4 ? out : r.s.slice(0, 4).map((x) => x.num)
  }
  let t = 0, nb = 0
  data.forEach((r) => { const s = f(r); nb += s.length; if (r.A.slice(0, 3).every((x) => s.includes(x))) t++ })
  console.log(`   top 4 · saute si > ${seuil}×        ${String(t).padStart(3)}/${N}  ${pc(t, N).padStart(5)}   (moy ${(nb / N).toFixed(1)} chevaux)`)
}

// ── 4. la borne théorique : combien de chevaux faut-il VRAIMENT pour 60 % ?
console.log('\n═══ COMBIEN DE CHEVAUX POUR ATTEINDRE 60 % ? ═══')
for (const k of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
  let t = 0
  data.forEach((r) => { const s = r.s.slice(0, k).map((x) => x.num); if (r.A.slice(0, 3).every((x) => s.includes(x))) t++ })
  console.log(`   ${String(k).padStart(2)} chevaux → ${String(t).padStart(3)}/${N}  ${pc(t, N).padStart(5)} ${t / N >= 0.6 ? '  ✅ 60% atteint' : ''}`)
}

