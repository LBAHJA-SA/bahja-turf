/* =============================================================================
 * tools/coply-trio-euros.mjs — LE TRIO EN EUROS, PAS EN POURCENTAGES (21/10/2026)
 *
 * L'utilisateur : « البصمة ديال الكوبلي مجتمع عمرها ماكاتعطي نتيجة ايجابية »,
 * puis : « لو كان الطوب 3 ديال السوق كايربح لو تم اعلاق شركات الرهان ».
 *
 * Il a raison sur un point que les pourcentages cachent : prendre les 3
 * favoris, ça gagne souvent et ça paie MISÉRABLEMENT. Ce qui compte n'est pas
 * le taux de réussite, c'est le RETOUR.
 *
 * Ici : 1 € par course, 1 seul trio par course (les 3 numéros de la règle),
 * encaissé au VRAI rapport TIERCE « Désordre » de data/quintes.json — c'est
 * exactement le trio (les 3 premiers, dans n'importe quel ordre).
 *
 * Pour chaque règle :
 *   n · touchés · mise · retour · ROI · le plus gros gain · ROI SANS ce gain
 * (la dernière colonne est la seule honnête : un ROI porté par une seule
 *  course n'est pas une règle, c'est un accident.)
 *
 *   node tools\coply-trio-euros.mjs
 * ============================================================================= */

import fs from 'node:fs'

const Q = JSON.parse(fs.readFileSync(new URL('../data/quintes.json', import.meta.url), 'utf8'))

/* ── le vrai rapport du trio : TIERCE_ORDRE / Désordre ───────────────────── */
const rapportTrio = (q) => {
  const d = q.dividends
  if (!d) return 0
  const list = Array.isArray(d) ? d : Object.values(d)
  for (const e of list) {
    if (!e) continue
    if (e.bet_type === 'TIERCE_ORDRE' && /désordre/i.test(String(e.sub_type))) {
      const v = Number(e.payout)
      if (v > 0) return v
    }
  }
  return 0
}

const courses = []
for (const q of Q) {
  const arr = (q.arrivee || []).slice(0, 3)
  if (new Set(arr).size < 3) continue
  const r = rapportTrio(q)
  if (!r) continue
  const cotes = q.cotes || {}
  const mar = Object.entries(cotes).filter(([, v]) => Number(v) > 0).sort((a, b) => a[1] - b[1]).map(([n]) => Number(n))
  const car = (q.presse || []).map(Number).filter((x) => x > 0 && cotes[x] != null)
  courses.push({ q, arr, rapport: r, mar, car, nbMar: mar.length, nbCar: car.length })
}

const jouables = courses.filter((c) => c.nbMar >= 8 && c.nbCar >= 8)
console.log('\n  LE TRIO EN EUROS — 1 € par course, 1 seul trio')
console.log('  ' + jouables.length + ' Quintés avec rapport trio + presse + cotes (sur ' + Q.length + ')\n')

/* ── les règles (3 numéros, aucune ne joue plus de 3) ─────────────────────── */
const REGLES = {
  'marché top-3 (les 3 favoris)': (c) => c.mar.slice(0, 3),
  'carnet P1·P2·P3': (c) => c.car.slice(0, 3),
  'favori + carnet 2-3': (c) => { const f = c.mar[0]; return [f, ...c.car.filter((x) => x !== f).slice(0, 2)] },
  'marché 4·5·6 (sans le favori)': (c) => c.mar.slice(3, 6),
  'carnet P4·P5·P6': (c) => c.car.slice(3, 6),
  'carnet P1·P2 + marché 1er hors carnet': (c) => { const k = c.car.slice(0, 2); const m = c.mar.find((x) => !k.includes(x)); return m ? [...k, m] : k },
  'marché 3·4·5': (c) => c.mar.slice(2, 5),
  'carnet P2·P3·P4': (c) => c.car.slice(1, 4),
}

const bilan = (f, list) => {
  let n = 0, touche = 0, mise = 0, retour = 0
  let max = 0, sansMax = 0
  const gains = []
  for (const c of list) {
    const p = f(c)
    if (p.length !== 3) continue
    n++
    mise += 1
    const gagne = c.arr.every((x) => p.includes(x))
    if (gagne) { touche++; retour += c.rapport; gains.push(c.rapport); max = Math.max(max, c.rapport) }
  }
  gains.sort((a, b) => b - a)
  sansMax = retour - (gains[0] || 0)
  return { n, touche, mise, retour, max, sansMax }
}
const pc = (x) => (100 * x).toFixed(1).replace('.', ',') + ' %'
const sg = (x) => (x >= 0 ? '+' : '') + x.toFixed(1).replace('.', ',') + ' %'

console.log('  ' + 'règle'.padEnd(40) + 'touchés'.padStart(8) + 'retour'.padStart(9) + 'ROI'.padStart(9) + 'gros gain'.padStart(11) + 'ROI sans'.padStart(10))
const res = {}
for (const [nom, f] of Object.entries(REGLES)) {
  const b = bilan(f, jouables)
  res[nom] = b
  console.log('  ' + nom.padEnd(40)
    + (pc(b.touche / b.n)).padStart(8)
    + (b.retour.toFixed(0) + ' €').padStart(9)
    + sg(100 * (b.retour / b.mise - 1)).padStart(9)
    + (b.max.toFixed(0) + ' €').padStart(11)
    + sg(100 * (b.sansMax / b.mise - 1)).padStart(10))
}

/* ── la stabilité : le corpus coupé en deux ──────────────────────────────── */
const moit = [jouables.slice(0, Math.floor(jouables.length / 2)), jouables.slice(Math.floor(jouables.length / 2))]
console.log('\n  ── stabilité (deux moitiés) ──')
console.log('  ' + 'règle'.padEnd(40) + '1re moitié'.padStart(12) + '2e moitié'.padStart(12))
for (const [nom, f] of Object.entries(REGLES)) {
  const a = bilan(f, moit[0]), b = bilan(f, moit[1])
  console.log('  ' + nom.padEnd(40)
    + (sg(100 * (a.retour / a.mise - 1))).padStart(12)
    + (sg(100 * (b.retour / b.mise - 1))).padStart(12))
}

/* ── ce que paient les trios, par rang de marché ─────────────────────────── */
console.log('\n  ── ce que PAIE le trio selon la place des 3 dans le marché ──')
const bandes = { '3 favoris (rangs 1-3)': [1, 3], 'rangs 4-8': [4, 8], 'rangs 9-14': [9, 14] }
for (const [nom, [a, b]] of Object.entries(bandes)) {
  const dedans = jouables.filter((c) => {
    const r = c.arr.map((x) => c.mar.indexOf(x) + 1)
    return r.every((v) => v >= a && v <= b)
  })
  if (!dedans.length) { console.log('  ' + nom.padEnd(26) + 'aucune course'); continue }
  const moy = dedans.reduce((s, c) => s + c.rapport, 0) / dedans.length
  console.log('  ' + nom.padEnd(26) + dedans.length + ' courses · rapport moyen ' + moy.toFixed(0) + ' € · médian '
    + dedans.map((c) => c.rapport).sort((x, y) => x - y)[Math.floor(dedans.length / 2)].toFixed(0) + ' €')
}
console.log('')
