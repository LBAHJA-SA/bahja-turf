/* =============================================================================
 * tools/ecarts.mjs — LES ÉCARTS DES PLACES P1..P20
 *
 * Question : la case P7 de la grille, elle « donne » ou pas ? Depuis quand
 * elle n'a rien donné ?
 *
 * Une case P donne quand LE CHEVAL QUI L'OCCUPE finit dans les cinq premiers.
 * On mesure sur TOUTE la presse réelle disponible :
 *
 *   · data/quintes.json     — 96 Quintés à presse réelle (02 → 07/2026)
 *   · data/synthese.json    — le registre du site (Synthèse + arrivée)
 *
 * ⭐ 07/11/2026 — « P » = la CASE du carnet (slot), PAS le rang de presse.
 *   Définition alignée à 100% sur LA GRILLE et sur Statistiques :
 *   `buildGrid(...).slotParNum` (le P affiché dans la boule, Boite slot).
 *   L'ancienne version utilisait `presse[p-1]` (rang presse) — faux dès que
 *   la parité dérive (P1 impair vs pair) : Écarts affichait le mauvais cheval
 *   pour P (ex. P3→4 au lieu du cheval de la case P3 de LA GRILLE).
 *   Maintenant : `numAtSlot[p]` via buildGrid, exactement comme computeStats.
 *
 * ⭐ 05/11/2026 — LE FILTRE DISCIPLINE. La page /quinte filtre déjà les
 *   statistiques par discipline (Tout / Plat / Attelé / Haies) ; l'onglet
 *   Écarts doit dire la même chose. Le fichier porte donc DEUX niveaux :
 *
 *     mesure + places                 → tout (comme avant, inchangé)
 *     parDiscipline.{plat,attelé,haies} → même calcul, corpus réduit
 *
 *   Aucun chiffre n'est saisi à la main : les 4 sections sortent du MÊME code.
 *
 *   data/ecarts.json + public/data/ecarts.json
 *
 *   node tools\ecarts.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const pc = (a, b) => (b ? +(100 * a / b).toFixed(1) : 0)

/* la discipline d'une course, ramenée à 4 familles (même découpage que la page) */
const normDisc = (d) => {
  const s = String(d || '').toLowerCase().trim()
  if (s.startsWith('plat')) return 'plat'
  if (s.startsWith('attel') || s.startsWith('trot')) return 'attelé'
  if (s.startsWith('haie') || s.startsWith('steeple')) return 'haies'
  return 'autre'
}

/* numAtSlot via buildGrid — LA MÊME fonction que LA GRILLE et computeStats */
function numAtSlotDe(presse, runners) {
  const grille = buildGrid((presse || []).filter(Number.isFinite), (runners || []).filter(Number.isFinite))
  const numAtSlot = {}
  for (const [num, slot] of Object.entries(grille.slotParNum || {})) {
    numAtSlot[slot] = Number(num)
  }
  return numAtSlot
}

/* ── le registre reconstitué : { date, presse, runners, arrivee, discipline, numAtSlot } ─────── */
const parDate = new Map()

for (const q of JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))) {
  const cotes = q.cotes || {}
  const presse = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (presse.length < 10 || !(q.arrivee || []).length) continue
  let runners = Object.keys(cotes).map(Number).filter(Number.isFinite)
  if (!runners.length && q.nb) runners = Array.from({ length: q.nb }, (_, i) => i + 1)
  parDate.set(q.date, {
    date: q.date,
    presse,
    runners,
    numAtSlot: numAtSlotDe(presse, runners),
    arrivee: q.arrivee.map(Number),
    source: 'quintes',
    discipline: normDisc(q.discipline),
  })
}

const SYN = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
for (const d of Object.keys(SYN).sort()) {
  const r = SYN[d]
  if (!(r.synthese || []).length) continue
  if (!(r.arrivee || []).length) continue
  const presse = r.synthese.map(Number)
  const runners = (r.runners || []).map(Number).filter(Number.isFinite)
  parDate.set(r.date, {
    date: r.date,
    presse,
    runners,
    numAtSlot: numAtSlotDe(presse, runners),
    arrivee: r.arrivee.map(Number),
    source: 'synthese',
    hippodrome: r.hippodrome || null,
    discipline: normDisc(r.discipline),
  })
}

const COURSES = [...parDate.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

/* ── les places d'UN corpus ──────────────────────────────────────────────── */
const PLACES = 20

function calcPlaces(courses) {
  const derniere = courses[courses.length - 1]?.date || null
  const places = []
  for (let p = 1; p <= PLACES; p++) {
    const vus = courses.filter((c) => c.numAtSlot[p] != null)
    const hist = vus.map((c) => {
      const num = c.numAtSlot[p]
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
      joursDepuis: dernier && derniere ? Math.round((new Date(derniere) - new Date(dernier.date)) / 86400000) : null,
      /* les 6 derniers résultats de la case, du plus ancien au plus récent */
      serie: hist.slice(-6).map((h) => (h.top5 ? 1 : 0)),
    })
  }
  return {
    mesure: {
      outil: 'tools/ecarts.mjs',
      le: new Date().toISOString().slice(0, 10),
      sources: ['data/quintes.json (96 Quintés à presse réelle)', 'data/synthese.json (registre du site)'],
      courses: courses.length,
      du: courses[0]?.date || null,
      au: derniere,
      definition: 'une case P donne quand LE CHEVAL QUI L\'OCCUPE finit dans les cinq premiers. P = case du carnet (slot de LA GRILLE).',
      note: '« joursDepuis » compte depuis la dernière course du registre, pas depuis aujourd\'hui.',
    },
    places,
  }
}

const out = calcPlaces(COURSES)

/* ⭐ les mêmes chiffres, discipline par discipline — MÊME code, corpus réduit */
out.parDiscipline = {}
for (const d of ['plat', 'attelé', 'haies']) {
  out.parDiscipline[d] = calcPlaces(COURSES.filter((c) => c.discipline === d))
}

fs.writeFileSync('data/ecarts.json', JSON.stringify(out, null, 1))
fs.writeFileSync('public/data/ecarts.json', JSON.stringify(out, null, 1))

const pad = (s, n) => String(s).padStart(n)
console.log('\n  LES ÉCARTS DES PLACES — ' + COURSES.length + ' courses à presse réelle (' +
  out.mesure.du + ' → ' + out.mesure.au + ')')
console.log('  écrit dans data/ecarts.json et public/data/ecarts.json\n')
console.log('  case    n   top5    %    top3    %   gagne   dernier hit   courses depuis')
console.log('  ' + '-'.repeat(78))
for (const x of out.places) {
  if (!x.n) continue
  console.log('  P' + String(x.p).padEnd(4) + pad(x.n, 4) + pad(x.top5, 6) + pad(x.pctTop5 + ' %', 7) +
    pad(x.top3, 6) + pad(x.pctTop3 + ' %', 7) + pad(x.victoires, 7) + pad(x.dernierHit || '—', 14) +
    pad(x.coursesDepuis == null ? '—' : x.coursesDepuis, 9))
}
console.log('\n  par discipline : ' + ['plat', 'attelé', 'haies']
  .map((d) => d + ' ' + out.parDiscipline[d].mesure.courses + ' c.').join(' · '))
console.log('  « courses depuis » = depuis combien de courses de ce registre la case n\'a plus rien donné.\n')
