/* =============================================================================
 * tools/ecarts.mjs — LES ÉCARTS DES PLACES P1..P20 (16/10/2026)
 *
 * Question : la case P7 de la Synthèse, elle « donne » ou pas ? Depuis quand
 * elle n'a rien donné ?
 *
 * Une case P donne quand LE CHEVAL QUI L'OCCUPE finit dans les cinq premiers.
 * On mesure sur TOUTE la presse réelle disponible :
 *
 *   · data/quintes.json     — 96 Quintés à presse réelle (02 → 07/2026)
 *   · data/synthese.json    — le registre du site (Synthèse + arrivée)
 *
 * ⚠ « P » = le RANG DE PRESSE (P1 = le 1er cité), pas la colonne du carnet
 *   papier. Mesuré le 16/10 : c'est le rang de presse qui suit l'arrivée
 *   (§11.16, tools/choix-grille.mjs), c'est donc LUI qu'on écarte.
 *
 *   data/ecarts.json + public/data/ecarts.json
 *
 *   node tools\ecarts.mjs
 * ============================================================================= */
import fs from 'node:fs'

const pc = (a, b) => (b ? +(100 * a / b).toFixed(1) : 0)

/* ── le registre reconstitué : { date, presse, arrivee } ──────────────────── */
const parDate = new Map()

for (const q of JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))) {
  const cotes = q.cotes || {}
  const presse = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (presse.length < 10 || !(q.arrivee || []).length) continue
  parDate.set(q.date, { date: q.date, presse, arrivee: q.arrivee.map(Number), source: 'quintes' })
}

const SYN = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
for (const d of Object.keys(SYN).sort()) {
  const r = SYN[d]
  if (!(r.synthese || []).length) continue
  if (!(r.arrivee || []).length) continue
  parDate.set(r.date, {
    date: r.date,
    presse: r.synthese.map(Number),
    arrivee: r.arrivee.map(Number),
    source: 'synthese',
    hippodrome: r.hippodrome || null,
  })
}

const COURSES = [...parDate.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const DERNIERE = COURSES[COURSES.length - 1]?.date || null

/* ── les places ───────────────────────────────────────────────────────────── */
const PLACES = 20
const places = []
for (let p = 1; p <= PLACES; p++) {
  const vus = COURSES.filter((c) => c.presse.length >= p)
  const hist = vus.map((c) => {
    const num = c.presse[p - 1]
    const k = c.arrivee.indexOf(num)
    return { date: c.date, num, place: k >= 0 ? k + 1 : null, top5: k >= 0 && k < 5, top3: k >= 0 && k < 3 }
  })
  const t5 = hist.filter((h) => h.top5)
  const t3 = hist.filter((h) => h.top3)
  const victoires = hist.filter((h) => h.place === 1).length
  const dernier = t5.length ? t5[t5.length - 1] : null
  const depuis = dernier ? vus.filter((c) => c.date > dernier.date).length : null
  places.push({
    p,
    n: vus.length,
    top5: t5.length,
    top3: t3.length,
    victoires,
    pctTop5: pc(t5.length, vus.length),
    pctTop3: pc(t3.length, vus.length),
    dernierHit: dernier ? dernier.date : null,
    coursesDepuis: depuis,
    joursDepuis: dernier && DERNIERE ? Math.round((new Date(DERNIERE) - new Date(dernier.date)) / 86400000) : null,
    /* les 6 derniers résultats de la case, du plus ancien au plus récent */
    serie: hist.slice(-6).map((h) => (h.top5 ? 1 : 0)),
  })
}

const out = {
  mesure: {
    outil: 'tools/ecarts.mjs',
    le: new Date().toISOString().slice(0, 10),
    sources: ['data/quintes.json (96 Quintés à presse réelle)', 'data/synthese.json (registre du site)'],
    courses: COURSES.length,
    du: COURSES[0]?.date || null,
    au: DERNIERE,
    definition: 'une case P donne quand LE CHEVAL QUI L\'OCCUPE finit dans les cinq premiers. P = rang de presse.',
    note: '« joursDepuis » compte depuis la dernière course du registre, pas depuis aujourd\'hui.',
  },
  places,
}

fs.writeFileSync('data/ecarts.json', JSON.stringify(out, null, 1))
fs.writeFileSync('public/data/ecarts.json', JSON.stringify(out, null, 1))

const pad = (s, n) => String(s).padStart(n)
console.log('\n  LES ÉCARTS DES PLACES — ' + COURSES.length + ' courses à presse réelle (' +
  out.mesure.du + ' → ' + out.mesure.au + ')')
console.log('  écrit dans data/ecarts.json et public/data/ecarts.json\n')
console.log('  case    n   top5    %    top3    %   gagne   dernier hit   courses depuis')
console.log('  ' + '-'.repeat(78))
for (const x of places) {
  if (!x.n) continue
  console.log('  P' + String(x.p).padEnd(4) + pad(x.n, 4) + pad(x.top5, 6) + pad(x.pctTop5 + ' %', 7) +
    pad(x.top3, 6) + pad(x.pctTop3 + ' %', 7) + pad(x.victoires, 7) + pad(x.dernierHit || '—', 14) +
    pad(x.coursesDepuis == null ? '—' : x.coursesDepuis, 9))
}
console.log('\n  « courses depuis » = depuis combien de courses de ce registre la case n\'a plus rien donné.\n')
