/* ══════════════════════════════════════════════════════════════════════════
 *  tools/empreinte-pools.mjs — LES BASSINS (pools) DU PODIUM.
 *
 *  ⚠ LABORATOIRE UNIQUEMENT (§18.4). Lecture seule.
 *
 *  ─────────────────────────────────────────────────────────────────────────
 *  POURQUOI LES POOLS (07/10/2026)
 *
 *  875 formes FULL distinctes sur 3 986 trios : aucune ne revient assez pour
 *  être forte. En regroupant les chevaux en 3 BASSINS par famille de cote —
 *    CORE     = FAV*  (les favoris)
 *    OUTSIDER = OUT*  (le second rideau)
 *    TOCARD   = TOC*  (les grosses cotes)
 *  — il n'y a plus que 3^3 = 27 motifs ordonnés possibles (S+S+S, T+O+S…).
 *  Chacun revient des centaines de fois : les statistiques deviennent
 *  solides, et « fort » veut enfin dire quelque chose.
 *
 *  On mesure, pour chaque motif : n, et ce qui s'est passé (1er/2e/3e du
 *  motif = le vrai 1er/2e/3e ? les 3 dans le Top3 ?).
 *
 *  USAGE
 *    node tools/empreinte-pools.mjs
 * ══════════════════════════════════════════════════════════════════════════ */

import { charger } from './empreinte-couple.mjs'
import { famille, coarse } from './empreinte-v3.mjs'

/* FAV* → S(CORE) · OUT* → O(OUTSIDER) · TOC* → T(TOCARD) */
function bassin(fam) {
  const c = coarse(fam)
  return c === 'FAV' ? 'S' : c === 'OUT' ? 'O' : 'T'
}

function principale() {
  const tout = charger()
  const motifs = new Map()
  let sansCote = 0
  for (const c of tout) {
    const parNum = new Map(c.partants.map((p) => [p.num, p]))
    const tri = c.arrivee.slice(0, 3)
    const fams = tri.map((n) => {
      const p = parNum.get(n)
      const co = Number(p?.cote_pmu ?? null)
      return co != null && co > 0 ? famille(co) : null
    })
    if (fams.some((x) => !x)) { sansCote++; continue }
    const motif = fams.map(bassin).join('+')
    if (!motifs.has(motif)) motifs.set(motif, { n: 0 })
    motifs.get(motif).n++
  }
  const total = [...motifs.values()].reduce((a, e) => a + e.n, 0)
  console.log('')
  console.log('  LES 27 MOTIFS (S=CORE · O=OUTSIDER · T=TOCARD) — ' + total + ' podiums')
  console.log('  (' + sansCote + ' sans cote ignorés)')
  console.log('')
  const tri = [...motifs.entries()].sort((a, b) => b[1].n - a[1].n)
  for (const [motif, e] of tri) {
    const barre = '█'.repeat(Math.round(e.n / total * 60))
    console.log('   ' + motif.padEnd(8) + String(e.n).padStart(5) + '  (' + (e.n / total * 100).toFixed(1) + '%)  ' + barre)
  }
  console.log('')

  /* ── LA FORCE : quand on PROPOSE un trio de motif M (top-3 cote),
   *    quelle part fait 3/3 exact ? La fréquence d'un motif parmi les
   *    gagnants ne dit pas qu'il faut le jouer (S+S+S gagne souvent parce
   *    que les favoris gagnent souvent — pas parce que le motif sépare). */
  const prop = new Map()
  for (const c of tout) {
    const cand = [...c.partants]
      .map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) }))
      .filter((x) => Number.isFinite(x.c))
      .sort((a, b) => a.c - b.c)
      .slice(0, 3)
    if (cand.length < 3) continue
    const parNum = new Map(c.partants.map((p) => [p.num, p]))
    const fams = cand.map((x) => {
      const co = Number(parNum.get(x.num)?.cote_pmu ?? null)
      return co != null && co > 0 ? famille(co) : null
    })
    if (fams.some((x) => !x)) continue
    const motif = fams.map(bassin).join('+')
    if (!prop.has(motif)) prop.set(motif, { n: 0, hit: 0 })
    const e = prop.get(motif)
    e.n++
    const a = c.arrivee
    if (a[0] === cand[0].num && a[1] === cand[1].num && a[2] === cand[2].num) e.hit++
  }
  /* ── LA VRAIE FORCE : TOUS les trios ordonnés possibles, pas un seul.
   *   Pour chaque course, chaque trio ordonné (a,b,c) a un motif. Le trio
   *   gagnant fait +1 hit à son motif ; les autres font +1 miss. On ne
   *   les énumère pas un par un : pour un motif (m1,m2,m3), le nombre de
   *   trios vaut n(m1)·n(m2)·n(m3) en décrémentant quand un bassin revient
   *   (ex. S+S+S = s·(s−1)·(s−2)). Le taux d'un motif = la part des trios
   *   de ce motif qui ont gagné EXACTEMENT, sur tout le corpus. */
  const comb = new Map()
  for (const c of tout) {
    const parNum = new Map(c.partants.map((p) => [p.num, p]))
    const pools = c.partants
      .map((p) => {
        const co = Number(p.cote_pmu ?? null)
        return co != null && co > 0 ? { num: p.num, b: bassin(famille(co)) } : null
      })
      .filter(Boolean)
    if (pools.length < 3) continue
    const compte = { S: 0, O: 0, T: 0 }
    for (const x of pools) compte[x.b]++
    const nb = (m1, m2, m3) => {
      const pris = {}
      let r = 1
      for (const m of [m1, m2, m3]) {
        pris[m] = (pris[m] || 0) + 1
        r *= Math.max(0, compte[m] - (pris[m] - 1))
      }
      return r
    }
    for (const m1 of ['S', 'O', 'T']) for (const m2 of ['S', 'O', 'T']) for (const m3 of ['S', 'O', 'T']) {
      const motif = m1 + '+' + m2 + '+' + m3
      const k = nb(m1, m2, m3)
      if (!k) continue
      if (!comb.has(motif)) comb.set(motif, { trios: 0, hit: 0 })
      comb.get(motif).trios += k
    }
    const a = c.arrivee.slice(0, 3)
    const fams = a.map((n) => {
      const co = Number(parNum.get(n)?.cote_pmu ?? null)
      return co != null && co > 0 ? famille(co) : null
    })
    if (fams.some((x) => !x)) continue
    comb.get(fams.map(bassin).join('+')).hit++
  }
  let tn = 0, th = 0
  for (const e of comb.values()) { tn += e.trios; th += e.hit }
  console.log('  ══ FORCE VRAIE : un trio de motif M pris au hasard → 3/3 exact ══')
  console.log('  baseline : ' + th + '/' + tn + ' = ' + (th / tn * 100).toFixed(4) + '%')
  console.log('  (lire : 1 trio S+S+S pris au hasard gagne 1 fois sur ' + Math.round(1 / (comb.get('S+S+S').hit / comb.get('S+S+S').trios)) + ')')
  console.log('')
  const tri2 = [...comb.entries()].sort((a, b) => (b[1].hit / b[1].trios) - (a[1].hit / a[1].trios))
  for (const [motif, e] of tri2) {
    const taux = e.hit / e.trios * 100
    const mark = taux >= (th / tn * 100) * 2 ? '  ★ FORT' : ''
    console.log('   ' + motif.padEnd(8) + ' trios=' + String(e.trios).padStart(9)
      + '  hits=' + String(e.hit).padStart(4) + '  (' + taux.toFixed(4) + '%)' + mark)
  }
  console.log('')
}

principale()
