/* =============================================================================
 * tools\verif-stats.mjs — contrôle de cohérence de l'onglet STATISTIQUES
 *
 * ⭐ 08/11/2026 — né d'une observation de l'utilisateur sur la page /quinte :
 *   « Statistiques : 13 Quinté(s) valide(s) » mais « Top3 : 8/32 ».
 *   Le 13 était la discipline Plat, le 32 le total toutes disciplines :
 *   la ligne du bandeau lisait `archive` au lieu de `archiveFiltree`.
 *
 * Ce script imprime, pour chaque discipline, EXACTEMENT ce que la page doit
 * afficher — les 3 dénominateurs doivent toujours être le même nombre :
 *
 *     nb (courses valides)  =  examinées − écartées  =  closes (avec ticket)
 *
 *   node tools\verif-stats.mjs          → le tableau par discipline
 *   node tools\verif-stats.mjs --detail → + chaque course (ticket / Top3 / 1er)
 *
 * Lecture seule : ne modifie aucun fichier.
 * ========================================================================== */
import fs from 'node:fs'
import { computeStats } from '../src/lib/quinte.js'

const DETAIL = process.argv.includes('--detail')

const SYN = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const recs = Object.values(SYN).sort((a, b) => (a.date < b.date ? -1 : 1))

/* même normalisation que la page (normDisc de QuinteGrille.jsx) */
const normDisc = (d) => {
  const s = String(d || '').toLowerCase().trim()
  if (s.startsWith('plat')) return 'plat'
  if (s.startsWith('attel') || s.startsWith('trot')) return 'attelé'
  if (s.startsWith('mont')) return 'monté'
  if (s.startsWith('haie') || s.startsWith('steeple')) return 'haies'
  return s || 'autre'
}

const DISCIPLINES = ['all', 'plat', 'attelé', 'monté', 'haies']

function bilan(base) {
  const closes = base.filter((a) => (a.arrivee || []).length > 0 && (a.ticket || []).length > 0)
  const top3 = closes.filter((a) => a.arrivee.slice(0, 3).every((n) => (a.ticket || []).includes(n)))
  const sans1er = closes.filter((a) => !(a.ticket || []).includes(a.arrivee[0]))
  return { closes, top3, sans1er }
}

console.log('')
console.log('record          nb   examinées  écartées  closes   Top3     1er manqué   cohérent')
console.log('─'.repeat(88))

let souci = 0
for (const d of DISCIPLINES) {
  const base = d === 'all' ? recs : recs.filter((r) => normDisc(r.discipline) === d)
  const st = computeStats(base)
  const b = bilan(base)
  const diag = st.diagnostic || { coursesExaminees: 0, coursesEcartees: 0 }
  const ok = st.nb === b.closes.length && st.nb === diag.coursesExaminees - diag.coursesEcartees
  if (!ok) souci++
  console.log(
    d.padEnd(14),
    String(st.nb).padStart(3),
    String(diag.coursesExaminees).padStart(11),
    String(diag.coursesEcartees).padStart(9),
    String(b.closes.length).padStart(7),
    `${b.top3.length}/${b.closes.length}`.padStart(8),
    `${b.sans1er.length}/${b.closes.length}`.padStart(12),
    ok ? '   ✅' : '   ⚠️  DÉSACCORD'
  )
}

console.log('')
if (souci) console.log(`⚠️  ${souci} discipline(s) : les dénominateurs divergent — la page lirait deux populations.`)
else console.log('✅ nb = examinées − écartées = closes, pour chaque discipline.')

if (DETAIL) {
  for (const d of DISCIPLINES) {
    const base = d === 'all' ? recs : recs.filter((r) => normDisc(r.discipline) === d)
    const b = bilan(base)
    if (!b.closes.length) continue
    console.log('')
    console.log(`— ${d} —`)
    for (const a of b.closes) {
      const ok3 = a.arrivee.slice(0, 3).every((n) => (a.ticket || []).includes(n))
      const ok1 = (a.ticket || []).includes(a.arrivee[0])
      console.log(
        a.date,
        normDisc(a.discipline).padEnd(8),
        ('arrivée ' + a.arrivee.join('-')).padEnd(24),
        ('ticket ' + a.ticket.join('-')).padEnd(34),
        ok3 ? 'TOP3 ✅' : 'TOP3 ❌',
        ok1 ? '1er ✅' : '1er ❌'
      )
    }
  }
}
console.log('')
