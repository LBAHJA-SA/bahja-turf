/* =============================================================================
 * tools/qui-sort.mjs — QUEL CHEVAL SORTIR DE CHAQUE BLOC ? (20/10/2026)
 *
 * La question de l'utilisateur, posée au bon niveau :
 *   « الاختيار الصحيح هو علاش كانقلب »  —  le choix, c'est QUI ON SORT.
 *
 * Métrique DENSE (pas le 5/5 qui n'a que 14 événements) :
 *   quand on sort un cheval d'un bloc, ARRIVE-T-IL QUAND MÊME ?
 *   Si le signal est bon, le sorti arrive moins souvent que celui sorti par la cote.
 *
 * Un bloc = une tranche de marché (G1 = rangs 1-4, G2 = 5-8, G3 = 9-10, G4 = 11-12).
 * Signaux testés, tous lus dans les archives locales :
 *
 *   cote           la référence — on sort le plus cher
 *   poids          le poids (plat)                     ↑ = on sort le plus lourd
 *   valeur         la valeur handicap (plat)
 *   corde          le numéro de départ (plat)
 *   age            l'âge
 *   tauxVictoire   victoires / courses
 *   tauxPlace      places / courses
 *   gainParCourse  gain / courses
 *   ferrage        déferré (trot) — DEFERRE_ANTERIEURS_POSTERIEURS = 2
 *   oeilleres      oeillères (0/1)
 *
 * Une course n'est comptée pour un signal que si TOUS les chevaux du bloc ont
 * la donnée — jamais de tri partiel.
 *
 *   node tools\qui-sort.mjs
 * ============================================================================= */
import fs from 'node:fs'
import path from 'node:path'

const N = (s) => String(s || '').toUpperCase().replace(/[_\s]+/g, ' ').trim()
const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)

/* ─────────── ① corpus : 123 Quintés français, hors statistiques ──────────── */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const statCles = new Set(TOUT.filter((x) => x.date).map((x) => x.date + '|' + N(x.track)))
const CORPUS = JSON.parse(fs.readFileSync('data/corpus/archives-quinte.json', 'utf8'))
  .filter((c) => !statCles.has(c.date + '|' + N(c.track)))

const FICHIERS = new Map()
function indexer(dir, hippo) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { indexer(p, N(e.name)); continue }
    const m = e.name.match(/^race_R\d+_C(\d+)_(\d{4}-\d{2}-\d{2})\.json$/)
    if (!m) continue
    const k = m[2] + '|' + (hippo || '?') + '|' + Number(m[1])
    if (!FICHIERS.has(k)) FICHIERS.set(k, p)
  }
}
indexer('archives', null)

/* ─────────── ② les signaux d'un partant ─────────────────────────────────── */
const ferrageDe = (d) => {
  const s = String(d || '')
  if (s.includes('DEFERRE_ANTERIEURS_POSTERIEURS')) return 2
  if (s.includes('DEFERRE_ANTERIEURS') || s.includes('DEFERRE_POSTERIEURS')) return 1
  if (s === '') return null
  return 0
}
function signaux(p) {
  const nc = Number(p.nombreCourses) || 0
  return {
    cote: Number(p.cote_pmu) || null,
    poids: Number(p.poids) || null,
    valeur: Number(p.valeur) || null,
    corde: Number(p.corde) || null,
    age: Number(p.age) || null,
    tauxVictoire: nc >= 5 ? (Number(p.nombreVictoires) || 0) / nc : null,
    tauxPlace: nc >= 5 ? (Number(p.nombrePlaces) || 0) / nc : null,
    gainParCourse: nc >= 5 ? (Number(p.gain) || 0) / nc : null,
    ferrage: ferrageDe(p.deferre),
    oeilleres: p.oeilleres ? (String(p.oeilleres).includes('SANS') ? 0 : 1) : null,
  }
}

const COURSES = []
let manquants = 0
for (const c of CORPUS) {
  const f = FICHIERS.get(c.date + '|' + N(c.track) + '|' + c.num) || FICHIERS.get(c.date + '|?|' + c.num)
  if (!f) { manquants++; continue }
  let j
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')) } catch { manquants++; continue }
  const parNum = Object.fromEntries((j.participants || []).map((x) => [Number(x.num), signaux(x)]))
  const nums = Object.keys(c.cotes).map(Number).filter((n) => c.cotes[n] > 0)
    .sort((a, b) => c.cotes[a] - c.cotes[b] || a - b)
  if (nums.length < 10 || c.arrivee.length < 5) continue
  COURSES.push({
    c,
    blocs: [nums.slice(0, 4), nums.slice(4, 8), nums.slice(8, 10), nums.slice(10, 12)],
    sig: parNum,
  })
}

const BLOCS = ['G1', 'G2', 'G3', 'G4']
const QUOTA = [3, 3, 1, 1]
const SIGNAUX = ['poids', 'valeur', 'corde', 'age', 'tauxVictoire', 'tauxPlace', 'gainParCourse', 'ferrage', 'oeilleres']

/* ─────────── ③ l'expérience : on sort un cheval, arrive-t-il ? ──────────── */
/**
 * Pour un bloc et un signal, on sort le cheval le PLUS FAIBLE au signal.
 * `asc = true`  → on garde les plus PETITS (on sort le plus grand)
 * `asc = false` → on garde les plus GRANDS (on sort le plus petit)
 * La cote est la référence : on sort le plus cher (asc = true).
 * Renvoie { n, top5, top3 } sur les courses où tout le bloc a la donnée.
 */
function mesurer(b, sig, asc) {
  const q = QUOTA[b]
  const sortis = q === 1 ? 1 : 1        /* on sort toujours 1 cheval : c'est le choix */
  let n = 0, t5 = 0, t3 = 0, gagne = 0, perd = 0
  for (const k of COURSES) {
    const bloc = k.blocs[b]
    if (bloc.length <= q) continue
    const vals = bloc.map((x) => k.sig[x]?.[sig])
    if (vals.some((v) => v == null)) continue          /* jamais de tri partiel */
    const ordre = bloc.slice().sort((x, y) => {
      const a = k.sig[x][sig], z = k.sig[y][sig]
      return asc ? a - z : z - a
    })
    const sorti = ordre[ordre.length - 1]              /* le plus faible au signal */
    n++
    const a = k.c.arrivee
    if (a.slice(0, 5).includes(sorti)) t5++
    if (a.slice(0, 3).includes(sorti)) t3++
  }
  return { n, t5, t3 }
}

console.log('')
console.log('  QUI SORT DE CHAQUE BLOC — ' + COURSES.length + ' Quintés français (archives, hors statistiques)' +
  (manquants ? '   ⚠ ' + manquants + ' fichiers introuvables' : ''))
console.log('  métrique : le cheval SORTI arrive-t-il quand même ? (plus bas = meilleur choix)')
console.log('')

const RES = {}
for (let b = 0; b < 4; b++) {
  const lignes = []
  const ref = mesurer(b, 'cote', true)
  lignes.push({ nom: 'cote (référence)', ...ref })
  for (const sig of SIGNAUX) for (const asc of [true, false]) {
    const r = mesurer(b, sig, asc)
    if (r.n < 40) continue
    lignes.push({ nom: sig + (asc ? ' ↑' : ' ↓'), ...r })
  }
  /* on trie : le sorti doit arriver le MOINS souvent dans les 5 */
  lignes.sort((x, y) => (x.t5 / x.n) - (y.t5 / y.n) || (x.t3 / x.n) - (y.t3 / y.n))
  RES[b] = lignes
  console.log('  ── ' + BLOCS[b] + '  (on sort ' + (QUOTA[b] === 1 ? '1 cheval sur 2' : '1 cheval sur 4') + ')')
  for (const l of lignes.slice(0, 6)) {
    const flag = l.nom === 'cote (référence)' ? '  ← référence' : ''
    console.log('     ' + pad(l.nom, 20) + 'sorti top-5 ' + pad(pct(l.t5, l.n), 7) +
      '· top-3 ' + pad(pct(l.t3, l.n), 7) + '· n = ' + pad(l.n, 4) + flag)
  }
  const base = lignes.find((l) => l.nom === 'cote (référence)')
  const best = lignes[0]
  console.log('     ' + pad('→ écart', 20) + (best.nom === base.nom
    ? 'rien ne bat la cote'
    : best.nom + ' : ' + pct(base.t5, base.n) + ' → ' + pct(best.t5, best.n) +
      '  (' + ((best.t5 / best.n - base.t5 / base.n) * 100).toFixed(1).replace('.', ',') + ' pts)'))
  console.log('')
}

/* ─────────── ④ le même test, moitié par moitié ──────────────────────────── */
const m = Math.floor(COURSES.length / 2)
const moitie = (deb, fin) => {
  const out = []
  for (let b = 0; b < 4; b++) {
    const base = RES[b].find((l) => l.nom === 'cote (référence)')
    const best = RES[b][0]
    out.push({ bloc: BLOCS[b], ref: base, best })
  }
  return out
}
console.log('  STABILITÉ — le meilleur signal de chaque bloc est-il le même sur les deux moitiés ?')
const sauve = COURSES.slice()
for (const [nom, l] of [['1ʳᵉ moitié', sauve.slice(0, m)], ['2ᵈᵉ moitié', sauve.slice(m)]]) {
  COURSES.length = 0
  COURSES.push(...l)
  const top = []
  for (let b = 0; b < 4; b++) {
    let best = null
    for (const sig of ['cote', ...SIGNAUX]) for (const asc of [true, false]) {
      const r = mesurer(b, sig, asc)
      if (r.n < 25) continue
      const sc = r.t5 / r.n
      if (!best || sc < best.sc) best = { sig, asc, sc, r }
    }
    top.push(BLOCS[b] + ' ' + best.sig + (best.asc ? '↑' : '↓') + ' ' + pct(best.r.t5, best.r.n))
  }
  console.log('  ' + pad(nom, 14) + top.join(' · '))
}
COURSES.length = 0
COURSES.push(...sauve)
console.log('')
