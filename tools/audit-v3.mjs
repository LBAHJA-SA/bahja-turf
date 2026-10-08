/* ══════════════════════════════════════════════════════════════════════════
 *  tools/audit-v3.mjs — QUE CONTIENT VRAIMENT L'INDEX ?
 *
 *  ⚠ LABORATOIRE UNIQUEMENT (§18.4). Lecture seule : aucun fichier écrit.
 *
 *  ─────────────────────────────────────────────────────────────────────────
 *  POURQUOI CET AUDIT (08/10/2026)
 *
 *  Le moteur V3 classe par (level, support, …) avec FULL > FAM > COARSE
 *  comme règle sacrée. Objection : un FULL à support=1 bat un FAM à
 *  support=120 — c'est du classement, pas de la prédiction. Et le rang
 *  (1-2-4) décrit OÙ ils étaient, pas POURQUOI ils sont entrés.
 *
 *  Avant de toucher au moteur, on regarde l'extraction elle-même :
 *    ① combien de FULL distincts ? combien reviennent ≥2 / ≥10 / ≥50 fois ?
 *    ② pour chaque motif PROPOSÉ (tous les trios ordonnés de chaque course),
 *       combien gagnent EXACTEMENT ? (pas le trio imposé top-3 cote : tous)
 *    ③ par motif : n_proposés, hits, P1, P2, P3 — la carte statistique.
 *
 *  Si les motifs ne reviennent pas, ou si aucun ne convertit au-dessus de
 *  la baseline, le problème est dans L'EXTRACTION (la signature), pas dans
 *  le ranking — et aucun patch de moteur.js ne le réparera.
 * ══════════════════════════════════════════════════════════════════════════ */

import { charger } from './empreinte-couple.mjs'
import { famille } from './empreinte-v3.mjs'

function rangsMarche(partants) {
  const ordre = partants
    .map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) }))
    .filter((x) => Number.isFinite(x.c) && x.c !== Infinity && x.c > 0)
    .sort((a, b) => a.c - b.c)
  return new Map(ordre.map((x, i) => [x.num, i + 1]))
}

function* triples(partants) {
  const nums = partants.map((p) => p.num)
  const cotes = new Map(partants.map((p) => [p.num, Number(p.cote_pmu ?? null)]))
  const ok = (n) => { const c = cotes.get(n); return Number.isFinite(c) && c > 0 }
  for (const a of nums) {
    if (!ok(a)) continue
    for (const b of nums) {
      if (b === a || !ok(b)) continue
      for (const c of nums) {
        if (c === a || c === b || !ok(c)) continue
        yield [a, b, c]
      }
    }
  }
}

function motifDe(partants, rangs, trio) {
  const parNum = new Map(partants.map((p) => [p.num, p]))
  const f = trio.map((n) => {
    const co = Number(parNum.get(n)?.cote_pmu ?? null)
    return co > 0 ? famille(co) : null
  })
  const r = trio.map((n) => rangs.get(n))
  if (f.some((x) => !x) || r.some((x) => x == null)) return null
  return { full: f.join('-') + '|' + r.join('-'), fam: f.join('-') }
}

function principale() {
  const t0 = Date.now()
  const tout = charger()
  console.log('')
  console.log('  AUDIT V3 — ' + tout.length + ' courses (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)')

  const full = new Map(), fam = new Map()
  const bump = (table, cle) => {
    if (!table.has(cle)) table.set(cle, { n: 0, hit: 0, c1: 0, c2: 0, c3: 0 })
    return table.get(cle)
  }

  let trios = 0
  for (const c of tout) {
    const rangs = rangsMarche(c.partants)
    if (rangs.size < 3) continue
    const a = c.arrivee
    for (const t of triples(c.partants)) {
      const m = motifDe(c.partants, rangs, t)
      if (!m) continue
      trios++
      const exact = a[0] === t[0] && a[1] === t[1] && a[2] === t[2]
      for (const [table, cle] of [[full, m.full], [fam, m.fam]]) {
        const e = bump(table, cle)
        e.n++
        if (exact) e.hit++
        if (a[0] === t[0]) e.c1++
        if (a[1] === t[1]) e.c2++
        if (a[2] === t[2]) e.c3++
      }
    }
  }

  const totalHits = [...full.values()].reduce((s, e) => s + e.hit, 0)
  console.log('  trios proposés (tous ordonnés) : ' + trios.toLocaleString('fr-FR'))
  console.log('  hits exacts : ' + totalHits + '  → baseline : ' + (totalHits / trios * 100).toFixed(4) + '%')
  console.log('')

  for (const [nom, table] of [['FULL', full], ['FAM', fam]]) {
    const tailles = [...table.values()].map((e) => e.n).sort((a, b) => b - a)
    const q = (seuil) => tailles.filter((n) => n >= seuil).length
    console.log('  ══ ' + nom + ' : ' + table.size + ' motifs distincts ══')
    console.log('   n≥2:' + q(2) + '  n≥10:' + q(10) + '  n≥50:' + q(50) + '  n≥200:' + q(200)
      + '  max n=' + (tailles[0] || 0))
    console.log('')
    console.log('   Top motifs par CONVERSION (n≥200) :')
    const base = totalHits / trios * 100
    const conv = [...table.entries()]
      .filter(([, e]) => e.n >= 200)
      .map(([cle, e]) => ({ cle, ...e, taux: e.hit / e.n * 100 }))
      .sort((a, b) => b.taux - a.taux)
      .slice(0, 12)
    for (const e of conv) {
      const mark = e.taux >= base * 2 ? '  ★' : ''
      console.log('   ' + e.cle.padEnd(28)
        + ' n=' + String(e.n).padStart(7)
        + '  3/3=' + e.taux.toFixed(3) + '%' + mark
        + '   P1=' + (e.c1 / e.n * 100).toFixed(1) + '%'
        + ' P2=' + (e.c2 / e.n * 100).toFixed(1) + '%'
        + ' P3=' + (e.c3 / e.n * 100).toFixed(1) + '%')
    }
    console.log('')
  }
}

principale()