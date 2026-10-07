/* ══════════════════════════════════════════════════════════════════════════
 *  tools/empreinte-couple.mjs — LA MESURE DU COPLY, sur tout l'archive.
 *
 *  ⚠ LABORATOIRE UNIQUEMENT (§18.4). Lecture seule : aucun fichier écrit.
 *
 *  ─────────────────────────────────────────────────────────────────────────
 *  POURQUOI CE FICHIER EXISTE
 *
 *  `archives/` = 4 626 fichiers (187 hippodromes), mais seulement 1 016 ont
 *  `course.arrivee` rempli. Les 3 000 autres ont été crus « sans résultat ».
 *  En réalité chaque partant porte son `rang` (n1 rang=5 = arrivé 5ᵉ) : on
 *  reconstruit l'arrivée avec, et le corpus passe de 97 à 4 010 courses.
 *
 *  ─────────────────────────────────────────────────────────────────────────
 *  CE QUE ÇA MESURE (la vision du 07/10/2026)
 *
 *  Pour chaque course : le trio gagnant (1er+2e+3e) et, pour chacun des
 *  trois, ses données D'AVANT-COURSE :
 *     cote_pmu, rang de marché (dérivé du tri des cotes), forme (musique),
 *     valeur, corde, poids, age, victoires, places, gains.
 *
 *  Puis la FORME du trio : FORT / moyen / OUTSIDER sur trois couches :
 *     ① marché  (les tiers de cote DANS LA COURSE, pas absolus)
 *     ② forme   (les tiers du score de musique)
 *     ③ palmarès (les tiers victoires+places)
 *
 *  Et on compte : chaque forme est apparue N fois. C'est la matière du
 *  moteur « Empreinte du Couplé » : un trio proposé dont la forme est
 *  celle des trios qui gagnent se joue ; les autres, non.
 *
 *  USAGE
 *    node tools/empreinte-couple.mjs              → les formes du trio gagnant
 *    node tools/empreinte-couple.mjs --criteres    → quel critère donne le podium
 * ══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.join(RACINE, 'archives')

/* ───────────────────────────────────────────────────────── le corpus ──── */

function marcher(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) marcher(p, out)
    else if (/^race_R\d+_C\d+_\d{4}-\d{2}-\d{2}\.json$/.test(e.name)) out.push(p)
  }
  return out
}

let _cache = null
export function charger() {
  if (_cache) return _cache
  const out = []
  for (const f of marcher(DOSSIER)) {
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'))
      const partants = (j.participants || []).filter((p) => p.num && !p.nonPartant)
      if (partants.length < 8) continue
      // l'arrivée : le champ, sinon les rangs des partants
      let arrivee = (j.course?.arrivee || []).map((x) => Number(Array.isArray(x) ? x[0] : x)).filter(Number.isFinite)
      if (arrivee.length < 5) {
        const parRang = partants.filter((p) => p.rang != null).sort((a, b) => a.rang - b.rang)
        if (parRang.length >= 5) arrivee = parRang.map((p) => p.num)
      }
      if (arrivee.length < 5) continue
      const m = path.basename(f).match(/^race_R(\d+)_C(\d+)_(\d{4}-\d{2}-\d{2})/)
      out.push({
        cle: path.basename(f).replace(/^race_/, '').replace(/\.json$/, ''),
        date: m ? m[3] : '',
        hippodrome: j.reunion?.hippodrome || '',
        discipline: j.course?.discipline || '',
        distance: j.course?.distance ?? null,
        partants, arrivee,
      })
    } catch { /* un fichier corrompu n'arrête pas la mesure */ }
  }
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  _cache = out
  return out
}

/* ───────────────────────────────────────────────────────── la forme ───── */

function formeScore(mus) {
  const s = String(mus || '')
  if (!s) return 0
  const pts = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 }
  let sc = 0
  const runs = s.match(/\d+[a-z]/g) || []
  runs.slice(0, 6).forEach((r, i) => {
    const pl = Number(String(r).replace(/\D/g, ''))
    sc += (pts[pl] ?? 1) / (1 + i * 0.55)
  })
  return sc
}

function palmares(p) {
  return Number(p.nombreVictoires ?? 0) * 10
    + Number(p.nombrePlacesSecond ?? 0) * 3
    + Number(p.nombrePlacesTroisieme ?? 0) * 2
    + Number(p.nombrePlaces ?? 0)
}

/* Les TIERS se calculent DANS LA COURSE (un 4.5 est FORT dans un lot à 40,
 * moyen dans un lot à 3). Jamais de seuils absolus : chaque course a son
 * échelle, et la forme compare des positions, pas des valeurs. */
function tiers(valeurs, sens = 'bas') {
  const tris = [...valeurs].sort((a, b) => a - b)
  const q1 = tris[Math.floor(tris.length / 3)] ?? 0
  const q2 = tris[Math.floor((tris.length * 2) / 3)] ?? 0
  // ⚠ le sens compte : une COTE basse est forte, mais une FORME ou un
  //   PALMARÈS haut est fort. Sans ça, « FFF » en palmarès voulait dire
  //   le tiers le plus FAIBLE (le bug vu le 07/10 : FFF partout).
  if (sens === 'haut') return (v) => (v >= q2 ? 'FORT' : v >= q1 ? 'moyen' : 'OUT')
  return (v) => (v <= q1 ? 'FORT' : v <= q2 ? 'moyen' : 'OUT')
}

function formeTrio(course) {
  const ps = course.partants
  const cotes = ps.map((p) => Number(p.cote_pmu ?? Infinity)).filter(Number.isFinite)
  const formes = ps.map((p) => formeScore(p.musique))
  const palms = ps.map((p) => palmares(p))
  const tCote = tiers(cotes, 'bas')
  const tForme = tiers(formes, 'haut')
  const tPalm = tiers(palms, 'haut')
  const parNum = new Map(ps.map((p) => [p.num, p]))
  // le rang de marché : la position dans le tri des cotes (1 = favori)
  const ordreCote = [...ps].sort((a, b) => Number(a.cote_pmu ?? Infinity) - Number(b.cote_pmu ?? Infinity))
  const rangMarche = new Map(ordreCote.map((p, i) => [p.num, i + 1]))

  return course.arrivee.slice(0, 3).map((num) => {
    const p = parNum.get(num)
    if (!p) return null
    return {
      num,
      c: Number(p.cote_pmu ?? null),
      rangMarche: rangMarche.get(num) ?? null,
      v: Number(p.nombreVictoires ?? 0),
      pl: palmares(p),
      f: +formeScore(p.musique).toFixed(1),
      corde: p.corde ?? null,
      poids: p.poids ?? null,
      age: p.age ?? null,
      coucheMarche: tCote(Number(p.cote_pmu ?? Infinity)),
      coucheForme: tForme(formeScore(p.musique)),
      couchePalm: tPalm(palmares(p)),
    }
  })
}

/* ───────────────────────────────────────────────────────── la mesure ──── */

function principale() {
  const t0 = Date.now()
  const courses = charger()
  console.log('')
  console.log('  CORPUS : ' + courses.length + ' courses (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s de lecture)')
  console.log('')

  // ① les FORMES du trio gagnant : marché + forme + palmarès
  const formes = new Map()
  for (const c of courses) {
    const t = formeTrio(c)
    if (!t || t.some((x) => !x)) continue
    const clef = t.map((x) => x.coucheMarche[0]).join('') + ' | '
      + t.map((x) => x.coucheForme[0]).join('') + ' | '
      + t.map((x) => x.couchePalm[0]).join('')
    if (!formes.has(clef)) formes.set(clef, { n: 0, ex: [] })
    const f = formes.get(clef)
    f.n++
    if (f.ex.length < 3) f.ex.push(c.cle + ' ' + t.map((x) => x.num + '(' + x.c + ')').join('-'))
  }
  const tri = [...formes.entries()].sort((a, b) => b[1].n - a[1].n)
  const total = tri.reduce((a, [, f]) => a + f.n, 0)
  console.log('  ══ LES FORMES DU TRIO GAGNANT (marché | forme | palmarès) ══')
  console.log('  F=FORT  m=moyen  O=OUTSIDER   —   ex: «FmO» = 1er FORT, 2e moyen, 3e OUT')
  console.log('')
  for (const [clef, f] of tri.slice(0, 18)) {
    console.log('   ' + clef.padEnd(16) + String(f.n).padStart(5) + '  (' + (f.n / total * 100).toFixed(1) + '%)   ex: ' + f.ex[0])
  }
  console.log('   … ' + tri.length + ' formes distinctes sur ' + total + ' trios')
  console.log('')

  // ② le RANG DE MARCHÉ du 1er, du 2e, du 3e : d'où vient le podium ?
  const rangs = { 1: {}, 2: {}, 3: {} }
  let nR = 0
  for (const c of courses) {
    const t = formeTrio(c)
    if (!t || t.some((x) => !x || x.rangMarche == null)) continue
    nR++
    t.forEach((x, i) => { const r = x.rangMarche > 8 ? '9+' : String(x.rangMarche); rangs[i + 1][r] = (rangs[i + 1][r] || 0) + 1 })
  }
  console.log('  ══ D’OÙ VIENT LE PODIUM ? (rang de marché, ' + nR + ' courses) ══')
  console.log('')
  for (const place of [1, 2, 3]) {
    const ligne = Object.entries(rangs[place]).sort((a, b) => Number(a[0].replace('+', '99')) - Number(b[0].replace('+', '99')))
    console.log('   ' + (place === 1 ? '1er' : place === 2 ? '2e ' : '3e ') + ' : '
      + ligne.map(([r, n]) => 'R' + r + '=' + (n / nR * 100).toFixed(0) + '%').join('  '))
  }
  console.log('')
}

function criteres() {
  const courses = charger()
  console.log('')
  console.log('  QUEL CRITÈRE DONNE LE PODIUM ? (' + courses.length + ' courses)')
  console.log('  (le 1er du critère sort 1er, le 2e sort 2e, le 3e sort 3e)')
  console.log('')
  const defs = [
    ['Cote', (p) => Number(p.cote_pmu ?? Infinity), (a, b) => a - b],
    ['Palmarès', (p) => -palmares(p), (a, b) => a - b],
    ['Forme', (p) => -formeScore(p.musique), (a, b) => a - b],
    ['Classe', (p) => -(Number(p.valeur ?? -1e9)), (a, b) => a - b],
    ['Gains', (p) => -(Number(p.gain ?? 0)), (a, b) => a - b],
  ]
  for (const [nom, val, cmp] of defs) {
    let n = 0, un = 0, deux = 0, trois = 0, complet = 0
    for (const c of courses) {
      const pts = c.partants.map((p) => ({ num: p.num, v: val(p) })).filter((x) => Number.isFinite(x.v)).sort((a, b) => cmp(a.v, b.v))
      if (pts.length < 3) continue
      n++
      const a = c.arrivee
      if (a[0] === pts[0].num) un++
      if (a[1] === pts[1].num) deux++
      if (a[2] === pts[2].num) trois++
      if (a[0] === pts[0].num && a[1] === pts[1].num && a[2] === pts[2].num) complet++
    }
    if (!n) continue
    console.log('   ' + nom.padEnd(9)
      + ' 1er:' + (un / n * 100).toFixed(1) + '%'
      + '  2e:' + (deux / n * 100).toFixed(1) + '%'
      + '  3e:' + (trois / n * 100).toFixed(1) + '%'
      + '  PODIUM:' + (complet / n * 100).toFixed(1) + '%  (' + complet + '/' + n + ')')
  }
  console.log('')
}

/* On n'exécute que si le fichier est lancé directement : `moteur-couple.mjs`
 * importe `charger()` d'ici, et sans ce garde il réimprimait tout le rapport
 * à chaque run (le bug vu le 07/10 : double rapport). */
const estMain = process.argv[1] && path.basename(process.argv[1]) === 'empreinte-couple.mjs'
if (estMain) {
  const args = process.argv.slice(2)
  if (args.includes('--criteres')) criteres()
  else principale()
}