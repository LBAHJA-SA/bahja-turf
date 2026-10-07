/**
 * AUTOSPSIE DES ZONES — où se perd le 5/5 ?
 *
 * Deux grilles à ne JAMAIS confondre :
 *   · le rang de PRESSE  = position dans la Synthèse (1er cité, 2e cité…)
 *   · la CASE (slot)      = colonne du carnet (P1, P2… lecture en travers)
 * Le moteur raisonne en CASES ; la presse classe en RANGS. Ce ne sont pas les
 * mêmes chevaux → c'est exactement là que l'analyse se trompe.
 *
 *   node tools\zones.mjs
 */
import fs from 'node:fs'
import { buildGrid, groupeDeSlot } from '../src/lib/quinte.js'

const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const c = (v, n) => String(v ?? '—').padStart(n)
const ligne = (s = '') => console.log(s)
const BORNES = [[1, 5, 'P1-P5'], [6, 13, 'P6-P13'], [14, 20, 'P14-P20']]
const QUOTA = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }

const courses = []
for (const d of Object.keys(db).sort()) {
  const r = db[d]
  if (!r.arrivee?.length) continue
  const g = buildGrid(r.synthese, r.runners)
  const sc = Object.fromEntries((r.scores || []).map((x) => [x.num, x]))
  const tick = new Set(r.ticket || [])
  const presse = {}
  r.synthese.forEach((num, i) => { presse[num] = i + 1 })
  ;(r.runners || []).filter((n) => !r.synthese.includes(n)).sort((a, b) => a - b)
    .forEach((num, k) => { presse[num] = r.synthese.length + 1 + k })

  courses.push({
    d, r, g, sc, tick, presse,
    bilan: r.arrivee.filter((n) => tick.has(n)).length,
    arrivants: r.arrivee.slice(0, 5).map((num, k) => ({
      place: k + 1, num, d,
      presse: presse[num],
      slot: g.slotParNum[num] ?? null,
      bloc: g.slotParNum[num] ? groupeDeSlot(g.slotParNum[num]) : '—',
      pris: tick.has(num),
      ...(sc[num] || {}),
    })),
  })
}

/* ══════════════════ 1. chaque arrivant : presse ET case ══════════════════ */
ligne('\n' + '='.repeat(104))
for (const c0 of courses) {
  const r = c0.r
  ligne(`  ${c0.d}  ${(r.hippodrome || '?').toUpperCase()} ${r.discipline || ''} ${r.distance || '?'}m  →  ${c0.bilan}/5`)
  ligne(`  ticket : ${(r.ticket || []).join('  ')}`)
  ligne('  place   n°  presse  case  bloc  ticket | global forme  dist  piste niv terr cor |  F1  F2  F3')
  ligne('  ' + '-'.repeat(100))
  for (const a of c0.arrivants) {
    const f = a.filtres || []
    ligne(
      `  ${['1er', '2e ', '3e ', '4e ', '5e '][a.place - 1]}  ${c(a.num, 3)}   P${c(a.presse, 2)}   P${c(a.slot, 2)}   ${a.bloc.padEnd(4)} ${a.pris ? '✔    ' : '✘    '}`
      + `| ${c(a.global, 5)} ${c(a.forme, 5)} ${c(a.dist, 5)} ${c(a.piste, 5)} ${c(a.niveau, 3)} ${c(a.terrain, 3)} ${c(a.corde, 3)}`
      + ` |  ${f.map((z) => (z === undefined ? '·' : z ? 'ok' : 'KO')).join('  ')}`)
  }
}

/* ══════════════════ 2. le périmètre, en presse puis en case ══════════════════ */
function perimetre(key, titre) {
  ligne('\n' + '='.repeat(104))
  ligne('  ' + titre)
  ligne('  ' + '-'.repeat(100))
  for (let p = 1; p <= 20; p++) {
    const z = courses.flatMap((x) => x.arrivants.filter((a) => a[key] === p))
    if (!z.length) continue
    const gard = z.filter((a) => a.pris).length
    const zone = p <= 5 ? 'CONFIANCE' : p <= 13 ? 'DANGER' : 'TAILLE'
    ligne(`  ${zone.padEnd(10)} P${String(p).padStart(2)}  ${z.length}/4 arrivants · ticket ${gard}/${z.length}  `
      + '█'.repeat(gard) + '░'.repeat(z.length - gard)
      + '   ' + z.map((a) => a.d.slice(8) + ':' + a.place + (a.pris ? '✔' : '✘')).join(' '))
  }
}
perimetre('presse', 'A. RANG DE PRESSE (position dans la Synthèse) — la grille que la presse publie')
perimetre('slot', 'B. CASE DU CARNET (P1, P2… en colonnes) — la grille que le moteur remplit')

/* ══════════════════ 3. l\'audit des quotas : où le ticket n\'a pas rempli ══════════════════ */
ligne('\n' + '='.repeat(104))
ligne('  C. AUDIT DES QUOTAS — le bloc a-t-il été rempli ? et qu\'a-t-on laissé ?')
ligne('  ' + '-'.repeat(100))
for (const c0 of courses) {
  const pris = new Set(c0.r.ticket || [])
  ligne(`  ${c0.d}`)
  for (const gr of c0.g.groupes) {
    const prisDuBloc = gr.cases.filter((x) => pris.has(x.num))
    if (!prisDuBloc.length && !gr.cases.length) continue
    const ok = prisDuBloc.length >= (QUOTA[gr.id] ?? 1)
    const laisses = gr.cases.filter((x) => !pris.has(x.num))
    const arrivees = laisses.filter((x) => c0.r.arrivee.includes(x.num))
    ligne(`    ${gr.id} ${String(prisDuBloc.length)}/${QUOTA[gr.id] ?? 1} ${ok ? '✔' : '⚠'}  pris: ${prisDuBloc.map((x) => 'n°' + x.num).join(' ') || '—'}`)
    if (laisses.length) {
      ligne(`            laissés : ${laisses.map((x) => 'n°' + x.num + '(case P' + x.slot + ')').join(' ')}`
        + (arrivees.length ? `   ← dont arrivé : ${arrivees.map((x) => 'n°' + x.num).join(' ')}` : ''))
    }
  }
}

/* ══════════════════ 4. profil : ce qui distingue un retenu d'un perdu ══════════════════ */
const tous = courses.flatMap((c0) => c0.arrivants)
const perdus = tous.filter((a) => !a.pris)
const gardes = tous.filter((a) => a.pris)
ligne('\n' + '='.repeat(104))
ligne(`  D. PROFIL — ${gardes.length} retenus vs ${perdus.length} perdus (moyennes)`)
ligne('  ' + '-'.repeat(100))
const moy = (arr, k) => (arr.length ? (arr.reduce((s, x) => s + (x[k] ?? 0), 0) / arr.length).toFixed(2) : '—')
ligne('  critère      perdus   retenus     écart    lecture')
for (const k of ['global', 'forme', 'dist', 'piste', 'niveau', 'terrain', 'corde']) {
  const a = moy(perdus, k), b = mxy2(gardes, k)
  const ec = +(a - b).toFixed(2)
  ligne(`  ${k.padEnd(9)}  ${a.padStart(7)}  ${b.padStart(8)}  ${(ec > 0 ? '+' : '') + ec}`.padEnd(46)
    + (Math.abs(ec) < 0.5 ? '→ ne sépare pas' : ec < 0 ? '→ le perdu est moins bien noté' : ''))
}
function mxy2(arr, k) { return (arr.length ? (arr.reduce((s, x) => s + (x[k] ?? 0), 0) / arr.length).toFixed(2) : '—') }
const rr = (arr, i) => (arr.length ? Math.round(arr.filter((x) => x.filtres?.[i]).length / arr.length * 100) + '%' : '—')
ligne('  filtre      ' + ['① distance', '② forme', '③ niveau'].map((x) => x.padEnd(12)).join(''))
ligne('  perdus      ' + [0, 1, 2].map((i) => rr(perdus, i).padEnd(12)).join(''))
ligne('  retenus     ' + [0, 1, 2].map((i) => rr(gardes, i).padEnd(12)).join(''))
ligne()