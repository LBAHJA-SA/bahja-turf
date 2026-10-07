/**
 * LA MESURE DE RÉFÉRENCE (§11.18) — uniquement des vrais Quintés Global PMU France.
 *
 * ⚠ MÉTRIQUE. Ce qui compte, c'est « la course est PAYANTE » :
 *     le 1er, le 2e et le 3e sont TOUS dans la grille.
 * `x/5` ne dit rien — 3/5 est une perte sèche. C'est pour ça que la mesure
 * à 4 courses de tools/surprise.mjs était fausse.
 *
 *   node tools\mesure-quintes.mjs            cotes finales
 *   node tools\mesure-quintes.mjs ouverture  cotes d'ouverture (le matin, comme Equidia)
 *
 * Lit data/quintes.json (à produire avec tools\collecte-quintes.mjs).
 * N'écrit rien.
 */
import fs from 'node:fs'

const FICHIER = 'data/quintes.json'
if (!fs.existsSync(FICHIER)) {
  console.log('  ' + FICHIER + ' est absent — lance d\'abord :  node tools\\collecte-quintes.mjs')
  process.exit(0)
}
const TOUT = JSON.parse(fs.readFileSync(FICHIER, 'utf8'))
const CHAMP = process.argv[2] === 'ouverture' ? 'ouverture' : 'cotes'

/* la grille de la méthode : G1=P1-P4(3)  G2=P5-P8(2)  G3=P9-P10(1)  G4=P11-P12(1)  G5=P13+(1) */
const QUOTA = [[1, 4, 3], [5, 8, 2], [9, 10, 1], [11, 12, 1], [13, 999, 1]]
const pad = (x) => String(x).padStart(3)
const trait = (s) => console.log('-'.repeat(s.length))

/** combien de premiers sont dans le ticket, d'affilée */
const kpi = (t, arrivee) => {
  let k = 0
  for (const x of arrivee) { if (!t.includes(x)) break; k++ }
  return k
}

/** une course prête : cotes, ordre de presse, arrivée */
function prep(q) {
  const cotes = q[CHAMP]
  if (!cotes || Object.keys(cotes).length < 12) return null
  if (Object.values(cotes).some((v) => !(v > 1))) return null        // jamais de tri partiel
  const parCote = Object.keys(cotes).map(Number).sort((a, b) => cotes[a] - cotes[b])
  const presse = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  // la Synthèse ne cite pas toujours tout le monde : on complète avec l'ordre cote
  const ordre = [...presse, ...parCote.filter((n) => !presse.includes(n))]
  const rang = {}
  ordre.forEach((n, i) => { rang[n] = i + 1 })
  return { cotes, parCote, ordre, rang: (n) => rang[n] ?? 999, reelle: presse.length > 0, arrivee: q.arrivee.slice(0, 5) }
}

const blocs = (ordre) => QUOTA
  .map(([x, y, q]) => ({ quota: q, c: ordre.slice(x - 1, Math.min(y, ordre.length)) }))
  .filter((b) => b.c.length)

const parCoteBloc = (b, P) => b.c.slice().sort((a, c) => P.cotes[a] - P.cotes[c])

/* les règles de remplissage comparées */
const REGLES = {
  'les quota meilleures cotes  (RETENU)': (b, P) => parCoteBloc(b, P).slice(0, b.quota),
  '(quota-1) cotes + le moins cite  ★': (b, P) => {
    const t = parCoteBloc(b, P)
    if (b.quota <= 1 || t.length <= 1) return t.slice(0, 1)
    const ecartes = t.slice(b.quota - 1)
    return [t[0], ecartes.slice().sort((a, c) => P.rang[a] - P.rang[c])[0]]
  },
}

function mesure(cases, nom) {
  const n = cases.length
  if (!n) return
  console.log('')
  console.log('  ' + nom + '   n = ' + n)

  // le marché seul : le top 8 des cotes, sans aucune grille
  let t3 = 0
  for (const P of cases) if (kpi(P.parCote.slice(0, 8), P.arrivee) >= 3) t3++
  console.log('    ' + 'marché seul — top 8 des cotes'.padEnd(42) + 'paye ' + pad(Math.round((t3 / n) * 100)) + ' %')

  for (const [nomRegle, regle] of Object.entries(REGLES)) {
    let p3 = 0, p4 = 0, p5 = 0, taille = 0
    for (const P of cases) {
      const t = []
      for (const b of blocs(P.ordre)) for (const x of regle(b, P)) if (!t.includes(x)) t.push(x)
      const k = kpi(t, P.arrivee)
      if (k >= 3) p3++
      if (k >= 4) p4++
      if (k >= 5) p5++
      taille += t.length
    }
    console.log('    ' + nomRegle.padEnd(42) + 'paye ' + pad(Math.round((p3 / n) * 100)) + ' %   couvre '
      + pad(Math.round((p4 / n) * 100)) + ' %   Quinté ' + pad(Math.round((p5 / n) * 100)) + ' %   '
      + (taille / n).toFixed(1) + ' ch.')
  }
}

console.log('')
trait('='.repeat(90))
console.log('  LA MESURE DU MARCHÉ  —  ' + TOUT.length + ' Quintés Global PMU France')
console.log('  cotes : ' + (CHAMP === 'cotes' ? 'FINALES (après la course)' : "D'OUVERTURE (le matin, comme sur equidia.fr)"))
trait('='.repeat(90))

const cases = TOUT.map(prep).filter(Boolean)
mesure(cases.filter((P) => P.reelle), 'A. avec la VRAIE Synthèse de la presse')
mesure(cases, "B. ordre COTE en repli (le mieux possible pour la grille)")

console.log('')
trait('='.repeat(90))
console.log('  LE MARCHÉ SEUL  —  top-k par cote')
trait('='.repeat(90))
console.log('    k      % payable (1-2-3 complet)   % couvre (+4)   % Quinté (5/5)')
for (const k of [5, 6, 7, 8, 9, 10, 11, 12]) {
  let p3 = 0, p4 = 0, p5 = 0
  for (const P of cases) {
    const s = kpi(P.parCote.slice(0, k), P.arrivee)
    if (s >= 3) p3++
    if (s >= 4) p4++
    if (s >= 5) p5++
  }
  const n = cases.length
  console.log('   ' + String(k).padStart(2) + '                  ' + pad(Math.round((p3 / n) * 100)) + ' %            '
    + pad(Math.round((p4 / n) * 100)) + ' %          ' + pad(Math.round((p5 / n) * 100)) + ' %')
}

console.log('')
trait('='.repeat(90))
console.log('  OÙ SONT LE 1-2-3 ?  (rang dans l\'ordre cote)  →  la limite structurelle de la grille')
trait('='.repeat(90))
const zone = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0, G6: 0 }
let tot3 = 0
for (const P of cases) {
  for (const n of P.arrivee.slice(0, 3)) {      // le 1-2-3, pas le classement complet
    tot3++
    const r = P.parCote.indexOf(n) + 1
    let z = 'G6'
    for (let i = 0; i < QUOTA.length; i++) if (r >= QUOTA[i][0] && r <= QUOTA[i][1]) { z = 'G' + (i + 1); break }
    zone[z]++
  }
}
for (const k of Object.keys(zone)) {
  if (!zone[k]) continue
  const plage = k === 'G6' ? 'hors grille' : 'cotes ' + QUOTA[+k.slice(1) - 1][0] + '–' + (QUOTA[+k.slice(1) - 1][1] > 900 ? '+' : QUOTA[+k.slice(1) - 1][1])
  console.log('    ' + k + '  (' + plage.padEnd(12) + ')  ' + String(zone[k]).padStart(4) + ' / ' + tot3 + '   = '
    + pad(Math.round((zone[k] / tot3) * 100)) + ' %')
}
console.log('')
console.log('    → la grille spends 3 de ses 8 places sur des cotes que le marché ne donne qu\'à 6-10 %.')
console.log('      le plafond à 8 chevaux, c\'est le marché seul : ' + pad(Math.round((cases.filter((P) => kpi(P.parCote.slice(0, 8), P.arrivee) >= 3).length / cases.length) * 100)) + ' %.')
console.log('')
trait('='.repeat(90))
console.log('')
console.log('  Rappel : les quotas 3-2-1-1-1 sont la règle de l\'utilisateur, ils ne bougent pas (§11.16).')
console.log('  Cette mesure sert à choisir QUELS chevaux remplir chaque quota — pas à le changer.')
console.log('')