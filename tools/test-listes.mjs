// Compare les listes « Top » du site aux positions de presse (P1..P18)
const SYNTHESE = [4, 13, 9, 8, 11, 6, 3, 18, 5, 16, 1, 2, 17, 7, 14, 12, 15, 10] // n°10 non cité → P18
const P = {}
SYNTHESE.forEach((n, i) => { P[n] = i + 1 })

const LISTES = {
  'Cotes de référence': [7, 12, 5, 18, 10, 16, 15, 9, 6, 8],
  'Entraineurs': [13, 11, 1, 3, 17, 7, 8, 14, 2, 4],
  'Cotes Direct': [11, 4, 10, 13, 14, 18, 16, 5],
  'Chevaux': [5, 7, 10, 3, 4, 8, 11, 15],
  'Palmarès': [4, 5, 7, 9, 10, 14, 3, 13],
  'Forme': [4, 5, 11, 7, 9, 13, 18, 3],
  'Classe': [7, 18, 6, 17, 4, 2, 8, 1, 13],
  'Chronos': [11, 10, 6, 3, 12, 18, 8, 13, 15],
  'Écarts': [1, 8, 2, 17, 13, 12],
  'Incontournables': [11, 9, 4, 5, 7, 14, 17, 13],
  'Outsiders': [10, 16],
  ' leur Synthèse': [4, 8, 13, 5, 7, 9, 18],
}

console.log('liste                 n   P moyen   P min   P max   dans P1-P8')
console.log('─'.repeat(70))
const tous = []
for (const [nom, l] of Object.entries(LISTES)) {
  const ps = l.map((n) => P[n]).filter(Boolean)
  if (!ps.length) continue
  const moy = ps.reduce((a, b) => a + b, 0) / ps.length
  const h8 = ps.filter((p) => p <= 8).length
  console.log(
    nom.padEnd(20), String(l.length).padStart(3),
    String(moy.toFixed(1)).padStart(8),
    String(Math.min(...ps)).padStart(7),
    String(Math.max(...ps)).padStart(7),
    `   ${h8}/${ps.length}`,
  )
  ps.forEach((p) => tous.push({ nom, p }))
}

const moy = tous.reduce((a, b) => a + b.p, 0) / tous.length
const h8 = tous.filter((x) => x.p <= 8).length
console.log('─'.repeat(70))
console.log('TOUT CONFONDU'.padEnd(20), String(tous.length).padStart(3),
  String(moy.toFixed(1)).padStart(8), '', '', `   ${h8}/${tous.length}`)

console.log('')
console.log('=== LE TICKET MANUEL  4 · 13 · 9 · 3 · 18 · 5 · 1 · 14 ===')
const TICKET = [4, 13, 9, 3, 18, 5, 1, 14]
console.log('n°  P    dans combien de listes ?   lesquelles')
for (const n of TICKET) {
  const noms = Object.entries(LISTES).filter(([, l]) => l.includes(n)).map(([k]) => k)
  console.log(String(n).padStart(2), String(P[n]).padStart(4),
    String(noms.length).padStart(12), '  ', noms.join(', ') || '— aucune')
}

console.log('')
console.log('=== HORS TICKET ===')
for (const n of SYNTHESE) {
  if (TICKET.includes(n)) continue
  const noms = Object.entries(LISTES).filter(([, l]) => l.includes(n)).map(([k]) => k)
  console.log(String(n).padStart(2), String(P[n]).padStart(4),
    String(noms.length).padStart(12), '  ', noms.join(', ') || '— aucune')
}