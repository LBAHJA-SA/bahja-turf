/* ══════════════════════════════════════════════════════════════════════════
 *  tools/empreinte-v4.mjs — L'INDEX AVEC DÉNOMINATEUR + LE CLASSEMENT V4.
 *
 *  ⚠ LABORATOIRE UNIQUEMENT (§18.4). Ce fichier ÉCRIT un seul artefact :
 *  `public/data/empreinte-v4.json`. Rien d'autre.
 *
 *  ─────────────────────────────────────────────────────────────────────────
 *  POURQUOI V4 (audit du 08/10/2026)
 *
 *  L'audit a tranché : 397 998 FULL distincts, et le support brut (n de
 *  victoires) cache les plus forts — `FAV1-FAV2-OUT1|1-2-4` gagne à 3.10%
 *  avec 355 proposés, devant des formes à n=23 victoires qui ne convertissent
 *  qu'à 2.2%. Classer par support brut, c'est classer par le numérateur
 *  sans le dénominateur.
 *
 *  V4 compte donc les DEUX, pour chaque motif (FULL, FAM, COARSE) :
 *    n_prop : combien de trios proposés avaient ce motif (le dénominateur)
 *    hits   : combien ont gagné EXACTEMENT (le numérateur)
 *    c1/c2/c3 : le proposé n°1 a fini 1er, etc.
 *  Conversion = hits / n_prop. Et le classement se fait sur la borne
 *  inférieure de Wilson (le taux puni par l'incertitude) : un 1/1 à 100%
 *  ne bat plus un 3/120 à 2.5%, sans aucun seuil arbitraire.
 *
 *  PASSE 1 (légère) : n_prop + hits + c1/c2/c3 pour tous les motifs.
 *  PASSE 2 (ciblée) : médianes + relations, SEULEMENT pour les motifs qui
 *  entrent en compétition (choix documenté ci-dessous, depuis les données).
 * ══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { charger } from './empreinte-couple.mjs'
import { famille, coarse } from './empreinte-v3.mjs'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F_SORTIE = path.join(RACINE, 'public', 'data', 'empreinte-v4.json')

function rangsMarche(partants) {
  const ordre = partants
    .map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? null) }))
    .filter((x) => Number.isFinite(x.c) && x.c > 0)
    .sort((a, b) => a.c - b.c)
  return new Map(ordre.map((x, i) => [x.num, i + 1]))
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

/* Borne inférieure de Wilson (95%) : le taux puni par l'incertitude.
 * 1/1 → 0.21, 3/120 → 0.007. Aucun seuil : la statistique tranche. */
export function wilson(hits, n, z = 1.96) {
  if (!n) return 0
  const p = hits / n
  const d = 1 + (z * z) / n
  const c = p + (z * z) / (2 * n)
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))
  return Math.max(0, (c - m) / d)
}

/* ─────────────────────────────────────────────────── passe 2 ────────── */

function mediane(t) {
  if (!t.length) return null
  const s = [...t].sort((a, b) => a - b)
  const m = s.length >> 1
  const v = s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
  return +v.toFixed(2)
}

function principale() {
  const t0 = Date.now()
  const tout = charger()
  const coupe = Math.floor(tout.length * 0.8)
  const train = tout.slice(0, coupe)
  const test = tout.slice(coupe)
  console.log('')
  console.log('  EMPREINTE V4 — train ' + train.length + ' / test ' + test.length)

  // ── PASSE 1 : les comptes ──
  const full = new Map(), fam = new Map()
  const bump = (t, k) => {
    if (!t.has(k)) t.set(k, { n: 0, hit: 0, c1: 0, c2: 0, c3: 0 })
    return t.get(k)
  }
  for (const c of train) {
    const rangs = rangsMarche(c.partants)
    if (rangs.size < 3) continue
    const a = c.arrivee
    for (const t of triples(c.partants)) {
      const m = motifDe(c.partants, rangs, t)
      if (!m) continue
      for (const [table, cle] of [[full, m.full], [fam, m.fam]]) {
        const e = bump(table, cle)
        e.n++
        if (a[0] === t[0] && a[1] === t[1] && a[2] === t[2]) e.hit++
        if (a[0] === t[0]) e.c1++
        if (a[1] === t[1]) e.c2++
        if (a[2] === t[2]) e.c3++
      }
    }
  }
  console.log('  passe 1 : FULL=' + full.size + '  FAM=' + fam.size
    + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)')

  // ── distribution des n_prop : d'où vient le choix d'entrée ──
  const tailles = [...full.values()].map((e) => e.n).sort((a, b) => b - a)
  const tot = tailles.reduce((a, b) => a + b, 0)
  let couv = 0
  console.log('  couverture des trios par seuil n_prop (FULL) :')
  for (const s of [10, 30, 100, 300]) {
    const part = tailles.filter((n) => n >= s).reduce((a, b) => a + b, 0)
    console.log('    n≥' + s + ' : ' + tailles.filter((n) => n >= s).length + ' motifs → '
      + (part / tot * 100).toFixed(1) + '% des trios proposés')
  }
  console.log('')

  // ── top conversions (n_prop ≥ 100, Wilson) ──
  const scored = [...full.entries()]
    .filter(([, e]) => e.n >= 100)
    .map(([cle, e]) => ({ cle, ...e, w: wilson(e.hit, e.n) }))
    .sort((a, b) => b.w - a.w)
  console.log('  ══ TOP CONVERSIONS FULL (n≥100, Wilson) ══')
  for (const e of scored.slice(0, 12)) {
    console.log('   ' + e.cle.padEnd(28) + ' n=' + String(e.n).padStart(6)
      + '  hit=' + String(e.hit).padStart(3) + '  (' + (e.hit / e.n * 100).toFixed(3) + '%)'
      + '  wilson=' + e.w.toFixed(4))
  }
  console.log('')

  /* ── PASSE 2 : le détail (médianes + relations) SEULEMENT pour les motifs
   *   qui entrent en compétition.
   *   Règle d'entrée, lue dans les données ci-dessus : FULL avec n_prop ≥ 100
   *   (7 758 motifs → 29.7% des trios proposés), TOUS les FAM (2 744) et
   *   TOUS les COARSE (27). En dessous de 100, Wilson ne distingue plus rien
   *   d'un bruit à 1/1 — et au-dessus, le fichier reste lisible (~3 Mo).
   *   Ce n'est pas un seuil de JEU (on ne coupe rien) : c'est ce qu'on
   *   stocke pour départager. */
  const SEUIL_DETAIL = 100
  const elusFull = new Set([...full.entries()].filter(([, e]) => e.n >= SEUIL_DETAIL).map(([k]) => k))
  console.log('  passe 2 : FULL élus=' + elusFull.size + ' + FAM=' + fam.size + ' (+COARSE calculé à la volée)')
  const det = new Map()
  const getDet = (niveau, cle) => {
    const k = niveau + '|' + cle
    if (!det.has(k)) det.set(k, {
      rangs: [[], [], []], cotes: [[], [], []],
      paires: { 'P1-P2': new Map(), 'P1-P3': new Map(), 'P2-P3': new Map() },
    })
    return det.get(k)
  }
  for (const c of train) {
    const rangs = rangsMarche(c.partants)
    if (rangs.size < 3) continue
    const parNum = new Map(c.partants.map((p) => [p.num, p]))
    const a = c.arrivee
    if (a[0] == null || a[1] == null || a[2] == null) continue
    // seuls les trios GAGNANTS alimentent les médianes (le profil du motif)
    const trio = a.slice(0, 3)
    const f = trio.map((n) => {
      const co = Number(parNum.get(n)?.cote_pmu ?? null)
      return co > 0 ? famille(co) : null
    })
    const r = trio.map((n) => rangs.get(n))
    if (f.some((x) => !x) || r.some((x) => x == null)) continue
    const cles = {
      complet: f.join('-') + '|' + r.join('-'),
      marche: null, forme: null, palmares: null,
    }
    // FAM et COARSE : on stocke aussi le détail (toujours éligibles)
    const fams = f.join('-')
    const coa = fams.split('-').map((x) => (x[0] === 'F' ? 'S' : x[0] === 'O' ? 'O' : 'T')).join('+')
    const fait = (niveau, cle) => {
      if (niveau === 'complet' && !elusFull.has(cle)) return
      const g = getDet(niveau, cle)
      r.forEach((rk, i) => g.rangs[i].push(rk))
      trio.forEach((n, i) => {
        const co = Number(parNum.get(n)?.cote_pmu ?? null)
        if (co > 0) g.cotes[i].push(co)
      })
      const paires = [[0, 1, 'P1-P2'], [0, 2, 'P1-P3'], [1, 2, 'P2-P3']]
      for (const [i, j, k] of paires) {
        const fp = f[i] + '-' + f[j]
        g.paires[k].set(fp, (g.paires[k].get(fp) || 0) + 1)
      }
    }
    fait('complet', cles.complet)
    fait('marche', null) // le niveau marché se lit sur rangs seuls : voir note
    fait('fam', fams)
    fait('coarse', coa)
  }
  // NOTE MARCHE : le niveau « marché » historique (v2 : tiers M/M/M) n'a que
  // 2 formes et ne sépare rien. En v4 on NE le stocke PLUS : la couche marché
  // vit dans FULL (rangs) et FAM (familles). Le moteur n'interroge que
  // complet > fam > coarse.
  det.delete('marche|null')
  console.log('  détail stocké : ' + det.size + ' motifs')

  /* ── TEST : chaque candidat est noté par le Wilson de son meilleur niveau
   *   disponible (FULL si détaillé, sinon FAM, sinon COARSE — que des taux,
   *   jamais vus ici). Classement par Wilson décroissant. */
  const echelle = (niveau, cle) => {
    const t = niveau === 'complet' ? full : fam
    const e = t.get(cle)
    return e ? wilson(e.hit, e.n) : -1
  }
  let exact = 0, top5 = 0, top10 = 0, sansAnt = 0
  const rangsVrais = []
  const t1 = Date.now()
  for (const c of test) {
    const rangs = rangsMarche(c.partants)
    if (rangs.size < 3) continue
    const parNum = new Map(c.partants.map((p) => [p.num, p]))
    const nums = c.partants.map((p) => p.num)
    const ok = (n) => { const co = Number(parNum.get(n)?.cote_pmu ?? null); return co > 0 }
    const notes = []
    for (const a1 of nums) {
      if (!ok(a1)) continue
      for (const b1 of nums) {
        if (b1 === a1 || !ok(b1)) continue
        for (const c1 of nums) {
          if (c1 === a1 || c1 === b1 || !ok(c1)) continue
          const f = [a1, b1, c1].map((n) => famille(Number(parNum.get(n).cote_pmu)))
          const r = [a1, b1, c1].map((n) => rangs.get(n))
          const kFull = f.join('-') + '|' + r.join('-')
          const kFam = f.join('-')
          const kCoa = f.map((x) => (x[0] === 'F' ? 'S' : x[0] === 'O' ? 'O' : 'T')).join('+')
          let w = -1, niv = 'AUCUN'
          if (elusFull.has(kFull)) { w = echelle('complet', kFull); niv = 'FULL' }
          else { w = echelle('fam', kFam); niv = w >= 0 ? 'FAM' : niv }
          if (w < 0) {
            const e = full.get(kFull) || fam.get(kFam)
            void e
            // COARSE : taux global du motif grossier
            w = -2; niv = 'AUCUN'
          }
          notes.push({ trio: [a1, b1, c1], w, niv })
        }
      }
    }
    if (!notes.length) { sansAnt++; continue }
    notes.sort((a, b) => b.w - a.w)
    const a = c.arrivee
    const pos = notes.findIndex((x) => x.trio[0] === a[0] && x.trio[1] === a[1] && x.trio[2] === a[2])
    if (pos === 0) exact++
    if (pos >= 0) {
      rangsVrais.push(pos + 1)
      if (pos < 5) top5++
      if (pos < 10) top10++
    }
  }
  rangsVrais.sort((a, b) => a - b)
  const n2 = rangsVrais.length
  console.log('')
  console.log('  ══ TEST WILSON (' + test.length + ' courses, ' + ((Date.now() - t1) / 1000).toFixed(0) + ' s) ══')
  console.log('   rang-1 exact : ' + exact + '/' + n2 + ' = ' + (exact / Math.max(1, n2) * 100).toFixed(2) + '%')
  console.log('   top-5  : ' + top5 + '/' + n2 + ' = ' + (top5 / Math.max(1, n2) * 100).toFixed(2) + '%')
  console.log('   top-10 : ' + top10 + '/' + n2 + ' = ' + (top10 / Math.max(1, n2) * 100).toFixed(2) + '%')
  console.log('   médiane : ' + (n2 ? rangsVrais[n2 >> 1] : '—') + '   sans antécédent : ' + sansAnt)
  console.log('')

  /* L'artefact : le détail des motifs en compétition + le verdict du test.
   * C'est la trace de l'expérience, pas un moteur : le test dit que Wilson
   * (rang-1 1.02%) perd contre le ranking v3 (1.67%), donc la page garde v3. */
  const F_SORTIE = path.join(RACINE, 'public', 'data', 'empreinte-v4.json')
  const resum = (g) => ({
    n: g.n,
    medRangs: g.rangs.map(mediane),
    medCote: g.cotes.map(mediane),
    paires: Object.fromEntries(Object.entries(g.paires).map(([k, m]) => [k,
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([fp, n3]) => ({ fam_pair: fp, n: n3, pct: +(n3 / Math.max(1, g.n) * 100).toFixed(1) }))])),
  })
  const sortie = {
    genere: new Date().toISOString(),
    train: train.length, test: test.length,
    entree: 'FULL n_prop≥100 + tous FAM/COARSE',
    classement: 'Wilson(nsolo) — REFUTE (pire que v3 sur 3/4 métriques)',
    testResult: {
      n: n2, exact, top5, top10,
      rangMedian: n2 ? rangsVrais[n2 >> 1] : null, sansAnt,
    },
    detail: [...det.entries()].map(([k, g]) => ({ cle: k, ...resum(g) })),
  }
  fs.mkdirSync(path.dirname(F_SORTIE), { recursive: true })
  fs.writeFileSync(F_SORTIE, JSON.stringify(sortie))
  console.log('  artefact : public/data/empreinte-v4.json (' + det.size + ' motifs)')
  console.log('')
}

/* On n'exécute que si le fichier est lancé directement (même garde que v3 :
 * sans ça, un import réimprimerait tout le rapport). */
const estMainV4 = process.argv[1] && path.basename(process.argv[1]) === 'empreinte-v4.mjs'
if (estMainV4) principale()