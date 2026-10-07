/* ---------------------------------------------------------------
 * tools\mesure-paires.mjs  —  ⭐ QUELS CHEVAUX DE G1 / G2 ?
 *
 *   node tools\mesure-paires.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Quotas 3-2-1-1-1 intacts (§11.16).
 *
 * LA MÉTHODE, deux volets :
 *
 *   A. LA CORRECTION MÉTHODOLOGIQUE
 *      « G1 et G2 ne sont pas « faibles » parce qu'ils perdent le plus :
 *      ils ont plus de sièges, donc ils apparaissent plus souvent dans les
 *      podiums. » → on ne compte plus les pertes brutes, on compte le
 *      **taux de échec par siège exposé** :
 *          échec du bloc = (chevaux du podium perdus) / (chevaux du podium du bloc)
 *
 *   B. LES PAIRES — la vraie question
 *      Quand le podium demande 2 chevaux de G1 (P1..P4), **lesquels ?**
 *      On compte les 6 paires possibles, leur fréquence observée, leur
 *      fréquence attendue si le hasard reignedait dans le bloc, et l'écart.
 *      Une paire qui revient nettement plus que le hasard = un signal.
 *      Et surtout : **notre règle attrape-t-elle la bonne paire ?**
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'archive-94.json')

const BLOCS = [
  { id: 'G1', min: 1, max: 4, quota: 3 }, { id: 'G2', min: 5, max: 8, quota: 2 },
  { id: 'G3', min: 9, max: 10, quota: 1 }, { id: 'G4', min: 11, max: 12, quota: 1 },
  { id: 'G5', min: 13, max: 99, quota: 1 },
]
const QUOTA = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }

const fichier = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = []
for (const k of fichier.courses) {
  const pDe = new Map(k.presse.map((x, i) => [x, i + 1]))
  const cDe = new Map(Object.keys(k.cotes).map(Number).filter((x) => k.cotes[x] > 0)
    .sort((a, b) => k.cotes[a] - k.cotes[b]).map((x, i) => [x, i + 1]))
  base.push({ ...k, pDe, cDe, podium: k.podium })
}
const n = base.length
const blocDe = (k, num) => BLOCS.findIndex((b) => { const p = k.pDe.get(num); return p >= b.min && p <= b.max })
const numsDuBloc = (k, i) => k.presse.filter((x) => blocDe(k, x) === i)

/* ═══════════════════ A. LE TAUX D'ÉCHEC PAR SIÈGE EXPOSÉ ═════════════════ */
console.log('')
console.log(`  ⭐ A. LE VRAI MESURE : l'échec PAR SIÈGE, pas la perte brute`)
console.log(`     ${n} Quintés, quotas 3-2-1-1-1`)
console.log('')
console.log('  ⭐ G1 et G2 perdent le plus de chevaux BRUTS — mais ils exposent')
console.log('     aussi le plus de sièges. Voici le taux réel.')
console.log('')

const parBloc = BLOCS.map((b, i) => {
  let expose = 0
  let perdu = 0
  let attrape = 0
  for (const k of base) {
    const numsBloc = new Set(numsDuBloc(k, i))
    const podBloc = k.podium.filter((x) => numsBloc.has(x))
    if (!podBloc.length) continue
    // ce que la ticket prend dans ce bloc
    const tk = k.presse.filter((x) => numsBloc.has(x))
      .slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999)).slice(0, QUOTA[b.id])
    const tkSet = new Set(tk)
    expose += podBloc.length
    perdu += podBloc.filter((x) => !tkSet.has(x)).length
    attrape += podBloc.filter((x) => tkSet.has(x)).length
  }
  return { ...b, i, expose, perdu, attrape }
})
console.log('  bloc   sièges   podiums exposés   attrapés      perdus    taux de perte par siège')
console.log('  ' + '-'.repeat(76))
for (const b of parBloc) {
  console.log('  ' + b.id.padEnd(6) + String(b.quota).padStart(7) + String(b.expose).padStart(19)
    + String(b.attrape).padStart(11) + String(b.perdu).padStart(11)
    + '   ' + (b.expose ? (b.perdu / b.expose * 100).toFixed(0) + ' %' : '—').padStart(5))
}
const totE = parBloc.reduce((s, b) => s + b.expose, 0)
const totP = parBloc.reduce((s, b) => s + b.perdu, 0)
console.log('  ' + '-'.repeat(76))
console.log('  ' + 'TOTAL'.padEnd(6) + ''.padStart(7) + String(totE).padStart(19)
  + String(totE - totP).padStart(11) + String(totP).padStart(11) + '   ' + (totP / totE * 100).toFixed(0).padStart(5) + ' %')
console.log('')

/* ═══════════════════ B. LES PAIRES ═══════════════════════════════════ */
const combinaisons = (m) => {
  const out = []
  for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) out.push([a, b])
  return out
}
const triplettes = (m) => {
  const out = []
  for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) for (let c = b + 1; c < m; c++) out.push([a, b, c])
  return out
}

for (const [bi, b] of BLOCS.entries()) {
  if (b.max - b.min + 1 < 2) continue
  const taille = numsDuBloc(base[0], bi).length
  const places = []
  for (let p = b.min; p <= b.max; p++) places.push(p)
  const m = places.length
  if (m < 2) continue

  /* --- les paires : clés construites sur les RANGS DE PRESSE réels (P1..P4) --- */
  const combosP = combinaisons(m).map((c) => [places[c[0]], places[c[1]]])
  const obsP = new Map(combosP.map((c) => [c.join('+'), 0]))
  let pairesVues = 0
  /* --- les triplets --- */
  const combosT = triplettes(m).map((c) => [places[c[0]], places[c[1]], places[c[2]]])
  const obsT = new Map(combosT.map((c) => [c.join('+'), 0]))
  let triplesVues = 0

  for (const k of base) {
    const numsBloc = new Set(numsDuBloc(k, bi))
    const podBloc = k.podium.filter((x) => numsBloc.has(x)).map((x) => k.pDe.get(x)).sort((a, z) => a - z)
    for (let a = 0; a < podBloc.length; a++) {
      for (let b2 = a + 1; b2 < podBloc.length; b2++) {
        const cle = podBloc[a] + '+' + podBloc[b2]
        if (obsP.has(cle)) { obsP.set(cle, obsP.get(cle) + 1); pairesVues++ }
      }
    }
    if (podBloc.length >= 3) {
      for (const t of combosT) {
        if (podBloc.includes(t[0]) && podBloc.includes(t[1]) && podBloc.includes(t[2])) {
          const cle = t.join('+')
          obsT.set(cle, obsT.get(cle) + 1)
        }
      }
      triplesVues++
    }
  }

  const attenduP = pairesVues / (obsP.size || 1)
  const lignesP = [...obsP.entries()].sort((a, z) => z[1] - a[1])
  const nomPair = (cle) => cle.split('+').map((p) => (p === places[0] ? 'P' + places[0] : 'P' + p)).join(' + ')
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log(`  ║  ${b.id} — quand le podium prend 2 chevaux de ce bloc (P${places[0]}-P${places[places.length - 1]})`)
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log('')
  if (pairesVues === 0) {
    console.log('  (jamais 2 chevaux de ce bloc sur un podium dans les 94 Quintés)')
    console.log('')
    continue
  }
  console.log('  paire           fois    attendu    écart')
  console.log('  ' + '-'.repeat(52))
  for (const [cle, v] of lignesP) {
    const ecart = attenduP ? (v - attenduP) / attenduP * 100 : 0
    const barre = v === 0 ? '' : '█'.repeat(Math.round(v / lignesP[0][1] * 24))
    console.log('  ' + cle.split('+').map((x) => 'P' + x).join(' + ').padEnd(14) + String(v).padStart(4) + attenduP.toFixed(1).padStart(11)
      + (ecart > 0 ? ('+' + ecart.toFixed(0) + ' %').padStart(10) : (ecart.toFixed(0) + ' %').padStart(10)) + '  ' + barre)
  }
  console.log('')

  /* --- la qualité de la décision : attrape-t-on la bonne paire ? --- */
  let besoinTotal = 0
  let attrapees = 0
  const parPaire = new Map()
  for (const k of base) {
    const numsBloc = new Set(numsDuBloc(k, bi))
    const podBloc = k.podium.filter((x) => numsBloc.has(x)).map((x) => k.pDe.get(x)).sort((a, z) => a - z)
    if (podBloc.length !== 2) continue
    besoinTotal++
    const tk = [...numsBloc].sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999)).slice(0, QUOTA[b.id])
    const tkRangs = tk.map((x) => k.pDe.get(x)).sort((a, z) => a - z)
    const cle = podBloc.join('+')
    if (!parPaire.has(cle)) parPaire.set(cle, { besoin: 0, attrape: 0 })
    parPaire.get(cle).besoin++
    const ok = tkRangs[0] === podBloc[0] && tkRangs[1] === podBloc[1]
    if (ok) { attrapees++; parPaire.get(cle).attrape++ }
  }
  if (besoinTotal) {
    console.log('  ⭐ notre sélection (les ' + QUOTA[b.id] + ' meilleures cotes du bloc) attrape-t-elle la bonne paire ?')
    console.log('')
    console.log('  paire demandée   fois    attrapée   taux')
    console.log('  ' + '-'.repeat(52))
    for (const [cle, v] of [...parPaire.entries()].sort((a, z) => z[1].besoin - a[1].besoin)) {
      console.log('  ' + cle.split('+').map((x) => 'P' + x).join(' + ').padEnd(14) + String(v.besoin).padStart(4) + String(v.attrape).padStart(11)
        + '   ' + (v.attrape / v.besoin * 100).toFixed(0).padStart(3) + ' %')
    }
    console.log('  ' + '-'.repeat(52))
    console.log('  TOTAL          ' + String(besoinTotal).padStart(4) + String(attrapees).padStart(11) + '   '
      + (attrapees / besoinTotal * 100).toFixed(0).padStart(3) + ' %')
    console.log('')
  }

  /* --- les triplets, quand le bloc en donne 3 --- */
  if (triplesVues > 0 && QUOTA[b.id] >= 3) {
    const attenduT = triplesVues / (obsT.size || 1)
    console.log('  ⭐ et les triplets (le podium prend 3 de ce bloc) :')
    console.log('')
    console.log('  triplet          fois    attendu')
    console.log('  ' + '-'.repeat(52))
    for (const [cle, v] of [...obsT.entries()].sort((a, z) => z[1] - a[1])) {
      console.log('  ' + cle.split('+').map((x) => 'P' + x).join(' + ').padEnd(14) + String(v).padStart(4) + attenduT.toFixed(1).padStart(11))
    }
    console.log('')
  }
}

/* ═══════════ C. où le système rate, mesuré par siège ═══════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  C. PAR COMBINAISON DU PODIUM : quel bloc rate, en taux ?')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const combosVues = new Map()
for (const k of base) {
  const cle = k.podium.map((x) => BLOCS[blocDe(k, x)].id).sort((a, z) => BLOCS.findIndex((b) => b.id === a) - BLOCS.findIndex((b) => b.id === z)).join('+')
  if (!combosVues.has(cle)) combosVues.set(cle, [])
  combosVues.get(cle).push(k)
}
const lignes = [...combosVues.entries()].map(([cle, ks]) => {
  const ids = [...new Set(cle.split('+'))]
  const parId = ids.map((id) => {
    const i = BLOCS.findIndex((b) => b.id === id)
    let exp = 0
    let perd = 0
    for (const k of ks) {
      const numsBloc = new Set(numsDuBloc(k, i))
      const pod = k.podium.filter((x) => numsBloc.has(x))
      if (!pod.length) continue
      const tk = new Set(numsDuBloc(k, i).sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999)).slice(0, QUOTA[id]))
      exp += pod.length
      perd += pod.filter((x) => !tk.has(x)).length
    }
    return { id, exp, perd, taux: exp ? perd / exp * 100 : 0 }
  })
  return { cle, nb: ks.length, parId }
}).sort((a, b) => b.nb - a.nb)

console.log('  combinaison      nb   ' + BLOCS.map((b) => b.id.padEnd(11)).join(''))
console.log('  ' + '-'.repeat(80))
for (const l of lignes) {
  const cells = l.parId.map((x) => (x.exp ? (x.taux.toFixed(0) + '% (' + x.perd + '/' + x.exp + ')').padEnd(11) : '—'.padEnd(11)))
  console.log('  ' + l.cle.padEnd(16) + String(l.nb).padStart(3) + '  ' + cells.join(''))
}
console.log('')
console.log('  (le taux est la perte DANS ce bloc pour les podiums qui le contiennent)')
console.log('')
