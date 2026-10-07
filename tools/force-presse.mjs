/* ---------------------------------------------------------------
 * tools\force-presse.mjs  —  ⭐ OÙ EST LA FORCE DE LA PRESSE ?
 *
 *   node tools\force-presse.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Mesure seule. Quotas 3-2-1-1-1 intacts.
 *
 * LA QUESTION
 *   94 courses avec presse  →  porte 3/3 à 34 %
 *   347 courses avec cote   →  porte 3/3 à 27,4 %
 *
 *   ⚠ MAIS CES DEUX CHIFFRES NE COMPARENT PAS LA MÊME CHOSE : le premier
 *     est sur 94 courses, le second sur 347. Avant de chercher une cause,
 *     il faut séparer l'effet d'ÉCHANTILLON de l'effet de SOURCE.
 *
 * LE DÉCOUPAGE HONNÊTE
 *   347 / cote                    27,4 %   ← tout le corpus, la cote
 *   99  / cote                    29,3 %   ← le même sous-ensemble
 *   99  / presse                  34,3 %   ← le même sous-ensemble
 *
 *       27,4 ──► 29,3   = +1,9   l effet ÉCHANTILLON (les 99 sont plus faciles)
 *       29,3 ──► 34,3   = +5,0   l effet PRESSE      (ce qu on cherche)
 *
 *   ⇒ c est la seconde flèche qui inté-resse. 5 points à trouver.
 *
 * OÙ EST-ELLE ?
 *   ① on remplace UN SEUL bloc à la fois par la cote, les quatre autres
 *     restent à la presse. Le bloc qui fait tomber la porte porte la force.
 *   ② on regarde, pour chaque bloc, ce que la presse ACCROCHE et que la
 *     cote rate : les chevaux du podium qui entrent grâce à la presse.
 *   ③ on regarde la position de presse : P1..P20, le taux de podium.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'archive-94.json')
const FF = path.join(RACINE, 'data', 'corpus', 'fusion.json')

const BLOCS = [
  { id: 'G1', min: 1, max: 4, quota: 3 }, { id: 'G2', min: 5, max: 8, quota: 2 },
  { id: 'G3', min: 9, max: 10, quota: 1 }, { id: 'G4', min: 11, max: 12, quota: 1 },
  { id: 'G5', min: 13, max: 99, quota: 1 },
]

/* ══════════════ le corpus 94, avec presse ET avec cote ═══════════ */
const corpus = JSON.parse(fs.readFileSync(F, 'utf8')).courses
  .map((k) => {
    const pDe = new Map(k.presse.map((x, i) => [x, i + 1]))
    const cDe = new Map(Object.keys(k.cotes).map(Number).sort((a, b) => k.cotes[a] - k.cotes[b])
      .map((x, i) => [x, i + 1]))
    return { ...k, pDe, cDe, arrivee: (k.arrivee || k.top5 || []).slice() }
  })
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = corpus.length

/* ══════════════ le corpus 347, avec cote ═════════════════════════ */
const fusion = JSON.parse(fs.readFileSync(FF, 'utf8')).courses
  .map((k) => {
    const o = (k.ordreCote || []).slice()
    return { ...k, o, arrivee: (k.arrivee || []).slice() }
  })
  .filter((k) => k.o.length >= 10 && k.arrivee.length >= 5)
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

/* ══════════════════════════════════════════════════════════════════
 * ① LE DÉCOUPAGE HONNÊTE
 * ════════════════════════════════════════════════════════════════ */
console.log('')
console.log('  ⭐⭐ OÙ EST LA FORCE DE LA PRESSE ?')
console.log('     ' + n + ' courses avec presse · ' + fusion.length + ' avec cote')
console.log('')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ① SÉPARER L EFFET ÉCHANTILLON DE L EFFET SOURCE')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')

/** la porte, sur un jeu de courses, avec un ordre de référence donné */
function porte(idx, ref) {
  let n3 = 0
  const portes = []
  for (const k of idx) {
    const tk = new Set(ticket(k, ref))
    const h3 = k.arrivee.slice(0, 3).filter((x) => tk.has(x)).length
    if (h3 === 3) {
      n3++
      portes.push({
        h4: k.arrivee.slice(0, 4).filter((x) => tk.has(x)).length,
        h5: k.arrivee.slice(0, 5).filter((x) => tk.has(x)).length,
      })
    }
  }
  const np = portes.length
  return {
    porte: n3 / idx.length * 100, nb3: n3, np,
    c44: np ? portes.filter((r) => r.h4 === 4).length / np * 100 : null,
    c55: np ? portes.filter((r) => r.h5 === 5).length / np * 100 : null,
    cMoy: np ? portes.reduce((a, r) => a + r.h5, 0) / np : 0,
  }
}

/** quel ordre sert à DÉFINIR le bloc, et lequel sert à le REMPLIR */
function numsBloc(k, bi, ref, remplissage) {
  const o = ref === 'presse' ? k.presse.slice() : [...k.presse].sort((a, b) => (k.cotes[a] || 999) - (k.cotes[b] || 999))
  const b = BLOCS[bi]
  return o.filter((x) => {
    const r = ref === 'presse' ? k.pDe.get(x) : o.indexOf(x) + 1
    return r >= b.min && r <= b.max
  })
}
function ticket(k, refBloc, remplissage = 'cote') {
  return BLOCS.flatMap((b, bi) => {
    const ref = Array.isArray(refBloc) ? refBloc[bi] : refBloc
    const nums = numsBloc(k, bi, ref)
    const ordre = remplissage === 'cote'
      ? nums.slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))
      : nums
    return ordre.slice(0, b.quota)
  })
}
function ticketFusion(k) {
  return BLOCS.flatMap((b, bi) => {
    const o = k.o
    return o.filter((x, r) => r + 1 >= b.min && r + 1 <= b.max)
      .slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))
      .slice(0, b.quota)
  })
}

const p347 = (() => {
  let n3 = 0
  const portes = []
  for (const k of fusion) {
    const tk = new Set(ticketFusion(k))
    const h3 = k.arrivee.slice(0, 3).filter((x) => tk.has(x)).length
    if (h3 === 3) {
      n3++
      portes.push(k.arrivee.slice(0, 5).filter((x) => tk.has(x)).length)
    }
  }
  return { porte: n3 / fusion.length * 100, nb3: n3, c55: portes.filter((v) => v === 5).length / portes.length * 100 }
})()
const p99c = porte(corpus, 'cote')
const p99p = porte(corpus, 'presse')

const f = (v) => (v == null ? '  —  ' : v.toFixed(1).padStart(5))
console.log('   347 courses / la cote        : porte ' + f(p347.porte) + ' %   = ' + p347.nb3 + ' courses   5/5|3/3 ' + f(p347.c55) + ' %')
console.log('    99 courses / la cote        : porte ' + f(p99c.porte) + ' %   = ' + p99c.nb3 + ' courses   5/5|3/3 ' + f(p99c.c55) + ' %')
console.log('    99 courses / la PRESSE      : porte ' + f(p99p.porte) + ' %   = ' + p99p.nb3 + ' courses   5/5|3/3 ' + f(p99p.c55) + ' %')
console.log('  ' + '-'.repeat(74))
console.log('    ① effet ÉCHANTILLON  ' + p347.porte.toFixed(1) + ' → ' + p99c.porte.toFixed(1)
  + '  : ' + (p99c.porte - p347.porte).toFixed(1) + ' point(s)  (' + (p99c.nb3 - p347.nb3) + ' courses)')
console.log('    ② effet PRESSE       ' + p99c.porte.toFixed(1) + ' → ' + p99p.porte.toFixed(1)
  + '  : ' + (p99p.porte - p99c.porte).toFixed(1) + ' point(s)  (' + (p99p.nb3 - p99c.nb3) + ' courses)   ⭐')
console.log('')
const part = Math.abs(p99c.porte - p347.porte) / Math.abs(p99p.porte - p347.porte) * 100
console.log('    ⇒ ' + part.toFixed(0) + ' % de l écart 34 vs 27,4 vient de l ÉCHANTILLON,')
console.log('      ' + (100 - part).toFixed(0) + ' % seulement de la PRESSE.')
console.log('')
console.log('    ⚠ mais au niveau des COURSES, la presse en gagne ' + (p99p.nb3 - p99c.nb3)
  + ' sur ' + n + ' — et la qualité y gagne aussi :')
console.log('      5/5|3/3 : ' + p99c.c55.toFixed(1) + ' % → ' + p99p.c55.toFixed(1) + ' %')
console.log('')

/* ══════════════════════════════════════════════════════════════════
 * ② UN BLOC À LA FOIS
 * ════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ② OÙ EST LA FORCE ? — un seul bloc mis à la cote')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  on garde la presse partout SAUF dans un bloc, mis à la cote.')
console.log('  le bloc qui fait le plus tomber la porte est celui qui porte la force.')
console.log('')
console.log('  bloc remplacé par la cote   porte     Δ       5/5|3/3     Δ      3/3 perdues')
console.log('  ' + '-'.repeat(78))
const parBloc = BLOCS.map((b) => {
  const ref = BLOCS.map(() => 'presse')
  ref[BLOCS.indexOf(b)] = 'cote'
  const e = porte(corpus, ref)
  return { b: b.id, e, d: e.porte - p99p.porte }
})
parBloc.forEach((x) => {
  console.log('  ' + ('tout presse sauf ' + x.b).padEnd(26)
    + f(x.e.porte) + ' %' + ((x.d > 0 ? '+' : '') + x.d.toFixed(1)).padStart(8)
    + f(x.e.c55) + ' %' + ((x.e.c55 - p99p.c55 > 0 ? '+' : '') + (x.e.c55 - p99p.c55).toFixed(1)).padStart(8)
    + String(x.e.nb3 - p99p.nb3).padStart(13))
})
console.log('  ' + '-'.repeat(78))
console.log('  ' + 'TOUT À LA COTE'.padEnd(26) + f(p99c.porte) + ' %' + (p99c.porte - p99p.porte).toFixed(1).padStart(8)
  + f(p99c.c55) + ' %' + (p99c.c55 - p99p.c55).toFixed(1).padStart(8) + String(p99c.nb3 - p99p.nb3).padStart(13))
console.log('')
const tri = [...parBloc].sort((a, b) => a.d - b.d)
console.log('  ⭐ LE BLOC QUI PORTE LA FORCE : ' + tri[0].b + '   (' + tri[0].d.toFixed(1) + ' points, '
  + (p99p.nb3 - tri[0].e.nb3) + ' courses 3/3)')
console.log('    puis ' + tri[1].b + ' (' + tri[1].d.toFixed(1) + ') et ' + tri[2].b + ' (' + tri[2].d.toFixed(1) + ')')
console.log('')
const somme = tri.slice(0, 3).reduce((a, x) => a + x.d, 0)
const sommeTous = parBloc.reduce((a, x) => a + x.d, 0)
console.log('    les 3 premiers ensemble : ' + somme.toFixed(1) + ' points')
console.log('    les 5 ensemble          : ' + sommeTous.toFixed(1) + ' points'
  + '   (total = ' + (p99c.porte - p99p.porte).toFixed(1) + ', donc ils se recouvrent)')
console.log('')

/* ══════════════════════════════════════════════════════════════════
 * ③ CE QUE LA PRESSE ACCROCHE ET QUE LA COTE RATE
 * ════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ③ LE TRAVAIL DE LA PRESSE — les chevaux du podium')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  Pour chaque place du podium (1er, 2e, 3e) :')
console.log('    · combien de fois la PRESSE le fait entrer dans le ticket')
console.log('    · combien de fois la COTE le fait entrer')
console.log('    · combien de fois RIEN ne le fait entrer')
console.log('')
console.log('  place    par la presse    par la cote    RIEN     |  la presse gagne de')
console.log('  ' + '-'.repeat(78))
const tPresse = corpus.map((k) => new Set(ticket(k, 'presse')))
const tCote = corpus.map((k) => new Set(ticket(k, 'cote')))
const parPlace = [0, 1, 2].map((pi) => {
  let p = 0; let c = 0; let aucun = 0; let lesDeux = 0
  corpus.forEach((k, ki) => {
    const num = k.arrivee[pi]
    if (num == null) return
    const a = tPresse[ki].has(num)
    const b = tCote[ki].has(num)
    if (a && b) lesDeux++
    else if (a) { p++; aucun += 0 }
    else if (b) { c++ }
    else aucun++
  })
  return { p, c, aucun, lesDeux, place: pi + 1 }
})
parPlace.forEach((x) => {
  const diff = x.p - x.c
  console.log('  ' + (x.place + (x.place === 1 ? 'er' : 'e')).padEnd(9)
    + String(x.p).padStart(11) + String(x.c).padStart(13) + String(x.aucun).padStart(9)
    + '   |  ' + (diff > 0 ? '+' : '') + diff + ' fois')
})
const totP = parPlace.reduce((a, x) => a + x.p, 0)
const totC = parPlace.reduce((a, x) => a + x.c, 0)
console.log('  ' + '-'.repeat(78))
console.log('  ' + 'total'.padEnd(9) + String(totP).padStart(11) + String(totC).padStart(13)
  + String(parPlace.reduce((a, x) => a + x.aucun, 0)).padStart(9)
  + '   |  ' + (totP - totC > 0 ? '+' : '') + (totP - totC) + ' fois')
console.log('')
console.log('  ⭐ la presse attrape ' + totP + ' chevaux du podium que la cote rate,')
console.log('    mais la cote en attrape ' + totC + ' que la presse rate.')
console.log('    Solde net : ' + (totP - totC > 0 ? '+' : '') + (totP - totC) + ' chevaux sur ' + n + ' courses.')
console.log('')

/* ══════════════════════════════════════════════════════════════════
 * ④ LA POSITION DE PRESSE
 * ════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ④ LA POSITION DE PRESSE — P1 à P20')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  position   dans le   podium   %      quart   %     5e place   %    Tiercé par la presse')
console.log('              ticket                                                      mais pas par la cote')
console.log('  ' + '-'.repeat(100))
for (let r = 1; r <= 20; r++) {
  let auP = 0; let p3 = 0; let p4 = 0; let p5 = 0
  let enPlus = 0
  corpus.forEach((k, ki) => {
    const num = k.presse[r - 1]
    if (num == null) return
    auP++
    /* la VRAIE place d'arrivée de ce cheval */
    const place = k.arrivee.indexOf(num) + 1
    if (place >= 1 && place <= 3) p3++
    if (place >= 1 && place <= 4) p4++
    if (place >= 1 && place <= 5) p5++
    const dansP = tPresse[ki].has(num)
    const dansC = tCote[ki].has(num)
    if (dansP && !dansC) enPlus++
  })
  if (!auP) continue
  const bloc = BLOCS.find((b) => r >= b.min && r <= b.max)
  const dansBloc = bloc && r <= bloc.min + bloc.quota - 1
  console.log('  ' + ('P' + r).padEnd(11) + String(auP).padStart(9) + String(p3).padStart(9)
    + (p3 / auP * 100).toFixed(1).padStart(6) + String(p4).padStart(9)
    + (p4 / auP * 100).toFixed(1).padStart(6) + String(p5).padStart(9)
    + (p5 / auP * 100).toFixed(1).padStart(6)
    + String(enPlus).padStart(22) + (dansBloc ? '' : '   ← hors quota'))
}
console.log('')

const prof = []
for (let r = 1; r <= 16; r++) {
  let auP = 0; let p3 = 0; let p5 = 0; let enPlus = 0
  corpus.forEach((k, ki) => {
    const num = k.presse[r - 1]
    if (num == null) return
    auP++
    const place = k.arrivee.indexOf(num) + 1
    if (place >= 1 && place <= 3) p3++
    if (place >= 1 && place <= 5) p5++
    if (tPresse[ki].has(num) && !tCote[ki].has(num)) enPlus++
  })
  if (auP) prof.push({ r, auP, p3: p3 / auP * 100, p5: p5 / auP * 100, enPlus })
}
console.log('  ⭐ LE PROFIL — le taux de podium selon la position de presse')
console.log('')
for (const x of prof.slice(0, 12)) {
  console.log('     P' + String(x.r).padStart(2) + '  podium ' + x.p3.toFixed(1).padStart(5) + ' %'
    + '  ▕' + '█'.repeat(Math.round(x.p3)) + ' attrapé en plus par la presse : ' + x.enPlus)
}
console.log('')
const zeros = prof.filter((x) => x.enPlus > 0)
console.log('  positions que la presse attrape ET que la cote rate : '
  + (zeros.length ? zeros.map((x) => 'P' + x.r).join(' · ') : 'aucune'))
console.log('')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ⚠ RAPPEL : 94 courses. Une différence d une course vaut 1,1 point')
console.log('    sur la porte. Ne pas lire plus fin que ça.')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')