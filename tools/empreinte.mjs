/* tools/empreinte.mjs — LA BIBLE DU PODIUM ET DU QUINTÉ.
 *
 *  Question de l'utilisateur (19/10/2026) :
 *    « عندنا احصائيات ديال P1..P16 و البوديوم. أريد أن تضيف البصمة للبوديوم
 *      والبصمة للخماسي لنعتمد عليه في الاختيارات. »
 *
 *  LA BASSMAT ne dit rien de la presse : elle compte les chevaux par ZONE DE
 *  MARCHÉ. Ici on compte par CASE DU CARNET (P1..P20), exactement comme la
 *  grille — c'est ce que l'utilisateur lit.
 *
 *  Ce que le fichier écrit :
 *
 *    podium  les 3 premières places → leurs cases P (triées), la fréquence de
 *            chaque empreinte (« 1-2-4 »), et le motif par groupe
 *            (« 2·1·0·0·0 » = 3 chevaux de G1).
 *    quinte  les 5 premières places → idem (« 1-2-3-5-9 », « 3·2·1·1·1 »).
 *    courbe  pour k = 3..14 : % de podiums / de quintés ENTIÈREMENT dans
 *            P1..Pk. C'est la seule ligne qui décide du nombre de chevaux.
 *
 *  Source UNIQUE : data/quintes.json (la presse réelle). Jamais fusion.json
 *  pour la presse (§11.23).
 *
 *  Usage : node tools/empreinte.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { buildGrid, computeStats } from '../src/lib/quinte.js'

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const lire = (p) => JSON.parse(fs.readFileSync(path.join(RACINE, p), 'utf8'))
const arr = (x) => (Array.isArray(x) ? x : [])
const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : 0)

/* ── le corpus : les Quintés dont on a la VRAIE presse ──────────────────── */
const TOUT = lire('data/quintes.json')
const records = []
for (const q of TOUT) {
  const presse = arr(q.presse).filter(Number.isFinite)
  const arrivee = arr(q.arrivee).filter(Number.isFinite)
  const cotes = q.cotes || {}
  const nums = Object.keys(cotes).map(Number).filter(Number.isFinite)
  if (presse.length < 10 || arrivee.length < 5 || nums.length < 10) continue
  if (nums.some((n) => !(cotes[n] > 1))) continue
  records.push({ date: q.date, synthese: presse, runners: nums, arrivee })
}
records.sort((a, b) => String(a.date).localeCompare(String(b.date)))

/* ── les compteurs de la page (P1..P20) sur CE corpus ───────────────────── */
const stats = computeStats(records)

/* ── la case P de chaque cheval, course par course (vrai buildGrid) ─────── */
const GROUPES = [
  { id: 'G1', min: 1, max: 4 },
  { id: 'G2', min: 5, max: 8 },
  { id: 'G3', min: 9, max: 10 },
  { id: 'G4', min: 11, max: 12 },
  { id: 'G5', min: 13, max: 20 },
]
const groupeDe = (p) => GROUPES.find((g) => p >= g.min && p <= g.max).id

const lignes = []
for (const rec of records) {
  let g
  try { g = buildGrid(rec.synthese, rec.runners) } catch { continue }
  const cases = rec.arrivee.slice(0, 5).map((n) => g.slotParNum[n]).filter((x) => Number.isFinite(x))
  if (cases.length < 5) continue
  lignes.push({ date: rec.date, cases })
}
const N = lignes.length

/* la fréquence d'une empreinte (tuple de cases trié) */
const compter = (listes) => {
  const m = new Map()
  for (const t of listes) {
    const k = t.join('-')
    m.set(k, (m.get(k) || 0) + 1)
  }
  return [...m.entries()]
    .map(([k, n]) => ({ empreinte: k, n, pct: pct(n, listes.length) }))
    .sort((a, b) => b.n - a.n || a.empreinte.localeCompare(b.empreinte))
}

/* la composition par GROUPE (bassmat du carnet) */
const motifs = (listes) => {
  const m = new Map()
  for (const t of listes) {
    const c = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0 }
    for (const p of t) c[groupeDe(p)]++
    const k = [c.G1, c.G2, c.G3, c.G4, c.G5].join('·')
    m.set(k, (m.get(k) || 0) + 1)
  }
  return [...m.entries()]
    .map(([k, n]) => ({ motif: k, n, pct: pct(n, listes.length) }))
    .sort((a, b) => b.n - a.n || a.motif.localeCompare(b.motif))
}

/* le nombre MOYEN de chevaux par groupe dans un podium / un quinté */
const moyenne = (listes) => {
  const s = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0 }
  for (const t of listes) for (const p of t) s[groupeDe(p)]++
  for (const k of Object.keys(s)) s[k] = +(s[k] / listes.length).toFixed(2)
  return s
}

const podiumT = lignes.map((l) => [...l.cases.slice(0, 3)].sort((a, b) => a - b))
const quinteT = lignes.map((l) => [...l.cases.slice(0, 5)].sort((a, b) => a - b))

/* la courbe : k cases suffisent-elles ? */
const courbe = []
for (let k = 3; k <= 14; k++) {
  const dedans = (t, kk) => t.every((p) => p <= kk)
  courbe.push({
    k,
    podium: pct(podiumT.filter((t) => dedans(t, k)).length, N),
    quinte: pct(quinteT.filter((t) => dedans(t, k)).length, N),
  })
}

const podium = {
  n: N,
  empreintes: compter(podiumT),
  motifs: motifs(podiumT),
  moyenne: moyenne(podiumT),
  distinctes: new Set(podiumT.map((t) => t.join('-'))).size,
}
const quinte = {
  n: N,
  empreintes: compter(quinteT),
  motifs: motifs(quinteT),
  moyenne: moyenne(quinteT),
  distinctes: new Set(quinteT.map((t) => t.join('-'))).size,
}

const out = {
  ecrit: new Date().toISOString(),
  source: 'data/quintes.json — la presse réelle (jamais fusion.json pour la presse)',
  periode: { debut: lignes[0]?.date || null, fin: lignes[lignes.length - 1]?.date || null },
  n: N,
  parPlace: stats.parPlace.map((r) => ({
    place: r.place,
    victoires: r.victoires,
    podiums: r.podiums,
    n_top5: r.n_top5,
    p_victoire: r.p_victoire_global,
    p_podium: r.p_podium_global ?? pct(r.podiums, r.courses_valides),
    p_top5: r.p_top5_global,
  })),
  podium,
  quinte,
  courbe,
}

fs.writeFileSync(path.join(RACINE, 'data', 'empreinte.json'), JSON.stringify(out))
fs.writeFileSync(path.join(RACINE, 'public', 'data', 'empreinte.json'), JSON.stringify(out))

/* ── le rapport ─────────────────────────────────────────────────────────── */
const pad = (s, n) => String(s).padEnd(n)
const rp = (s, n) => String(s).padStart(n)

console.log('\n  EMPREINTE — ' + N + ' Quintés à presse réelle (' + out.periode.debut + ' → ' + out.periode.fin + ')')
console.log('  source : ' + out.source + '\n')

console.log('  BASSMAT DU PODIUM — la forme des 3 premières places, par groupe du carnet')
for (const m of podium.motifs.slice(0, 8)) console.log('     ' + pad(m.motif, 12) + rp(m.n, 4) + rp(m.pct + ' %', 8))
console.log('     … ' + podium.distinctes + ' empreintes distinctes, ' + podium.motifs.length + ' motifs')
console.log('     moyenne par course : ' + JSON.stringify(podium.moyenne))

console.log('\n  BASSMAT DU QUINTÉ — la forme des 5 premières places, par groupe')
for (const m of quinte.motifs.slice(0, 10)) console.log('     ' + pad(m.motif, 12) + rp(m.n, 4) + rp(m.pct + ' %', 8))
console.log('     … ' + quinte.distinctes + ' empreintes distinctes, ' + quinte.motifs.length + ' motifs')
console.log('     moyenne par course : ' + JSON.stringify(quinte.moyenne))

console.log('\n  LES EMPREINTES LES PLUS FRÉQUENTES')
console.log('     podium')
for (const e of podium.empreintes.slice(0, 8)) console.log('        ' + pad(e.empreinte, 12) + rp(e.n, 4) + rp(e.pct + ' %', 8))
console.log('     quinté')
for (const e of quinte.empreintes.slice(0, 8)) console.log('        ' + pad(e.empreinte, 16) + rp(e.n, 4) + rp(e.pct + ' %', 8))

console.log('\n  COMBIEN DE CASES POUR TOUT TENIR')
console.log('     k     podium    quinté')
for (const c of courbe) console.log('     ' + pad(c.k, 5) + rp(c.podium + ' %', 9) + rp(c.quinte + ' %', 10))

console.log('\n  → data/empreinte.json + public/data/empreinte.json\n')
