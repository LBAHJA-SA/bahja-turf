// ════════════════════════════════════════════════════════════════════
//  SONDE — est-ce que turf-france.com donne les listes + le résultat
//  pour les courses DÉJOUÉES ? Sans résultat, pas de mesure possible.
//  Lecture seule : on ne modifie rien, on ne touche pas la Synthèse.
// ════════════════════════════════════════════════════════════════════
import { parseTurfFrance } from './src/lib/turfFrance.js'

const TF = 'https://www.turf-france.com/php/reu.php?view=detail'
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152.0.0.0 Safari/537.36' }

const dates = ['2026-09-20', '2026-09-13', '2026-09-06', '2026-08-30', '2026-08-23', '2026-07-12']

for (const d of dates) {
  const u = `${TF}&date=${d}&reunion=R1&course=C1&pays=FRANCE`
  let html = ''
  try {
    const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30000) })
    html = await r.text()
  } catch (e) { console.log(`${d}  ERR ${e.message}`); continue }

  // 1) la liste de presse en base64
  const m = [...html.matchAll(/synthese=([A-Za-z0-9+/=]+)/g)]
  let glob = null
  for (const x of m) {
    try {
      const dec = Buffer.from(x[1], 'base64').toString('utf8')
      const mm = dec.match(/globale=([0-9-]+)/)
      if (mm) { glob = mm[1]; break }
    } catch (e) { }
  }
  // 2) le résultat : le mot "arrivee"/"classement" existe-t-il ?
  const hasArrivee = /arriv[ée]e|classement|arr[iî]v/i.test(html)
  // 3) les 19 listes
  const listes = parseTurfFrance(html)
  const nn = Object.keys(listes).filter((k) => listes[k] && listes[k].length).length
  // 4) un classement chiffré explicite ?
  const cls = [...html.matchAll(/(?:1er|1er)\s*<[^>]*>\s*(\d{1,2})/gi)].map((x) => x[1]).slice(0, 8)
  console.log(`${d}  len=${String(html.length).padStart(6)}  glob=${glob || '—'}  listes=${nn}  arrivee=${hasArrivee}  topCls=[${cls.join(',')}]`)
}
