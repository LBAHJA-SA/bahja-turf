/* ---------------------------------------------------------------
 * tools\mesure-hors-top8.mjs  —  كم مرة كان الفائز خارج « الطوب 8 »؟
 *
 *   node tools\mesure-hors-top8.mjs
 *
 * السؤال : sur les TROIS PREMIERS, combien de fois y a-t-il eu un cheval
 * que le marché aimait le MOINS — c'est-à-dire classé plus loin que la
 * 8e cote ?
 *
 * C'est LA question qui décide si « le courage » a une base ou pas. Si les
 * 3 premiers sont presque toujours dans le top 8 des cotes, alors prendre
 * le bas du classement revient à jeter des Bets à terre.
 *
 * Deux corpus, aucun mélange :
 *   · archives\        → 94 Quintés, cote FINALE + arrivée complète
 *   · data\quintes.json→ 100 Quintés, cote du jour + presse + arrivée
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

/* ---- le corpus des archives ---- */
const archives = () => {
  const D = path.join(RACINE, 'archives')
  const out = []
  for (const f of fs.readdirSync(D).filter((x) => x.endsWith('.json'))) {
    const chemin = path.join(D, f)
    if (!fs.statSync(chemin).size) continue
    const j = JSON.parse(fs.readFileSync(chemin, 'utf8'))
    const c = j.course || {}
    if (!(c.types_pari || []).includes('QUINTE_PLUS')) continue
    const ordre = (c.arrivee || []).flat().filter(Boolean)
    if (ordre.length < 5) continue
    const parts = (j.participants || []).filter((p) => String(p.statut || 'PARTANT').includes('PARTANT') && p.nonPartant !== true)
    const cotes = parts.map((p) => ({ num: p.num, cote: p.cote_pmu > 0 ? p.cote_pmu : null })).filter((x) => x.cote)
    if (cotes.length < parts.length - 2) continue
    cotes.sort((a, b) => a.cote - b.cote)
    out.push({
      cle: j.reunion.date + ' R' + j.reunion.num + 'C' + c.num,
      rang: new Map(cotes.map((x, i) => [x.num, i + 1])),
      top3: ordre.slice(0, 3),
      top5: ordre.slice(0, 5),
      nb: cotes.length,
    })
  }
  return out
}

/* ---- le corpus quintes.json ---- */
const quintes = () => {
  const Q = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'quintes.json'), 'utf8'))
  const out = []
  for (const q of Q) {
    if (!Array.isArray(q.presse) || q.presse.length < 4) continue
    if (!Array.isArray(q.arrivee) || q.arrivee.length < 5) continue
    const cotes = Object.keys(q.cotes || {}).map(Number)
      .filter((n) => q.cotes[n] > 0)
      .sort((a, b) => q.cotes[a] - q.cotes[b])
    if (cotes.length < q.nb - 2) continue
    out.push({
      cle: q.date + ' ' + q.code,
      rang: new Map(cotes.map((n, i) => [n, i + 1])),
      top3: q.arrivee.slice(0, 3),
      top5: q.arrivee.slice(0, 5),
      nb: cotes.length,
    })
  }
  return out
}

/* ------------------------------------------------------------------ run --- */
for (const [nom, base] of [['ARCHIVES — 94 Quintés, cote finale', archives()], ['QUINTES.JSON — 100 Quintés, cote du jour', quintes()]]) {
  console.log('')
  console.log(`  ⭐ HORS DU TOP 8 DES COTES — ${nom}`)
  console.log('')

  let uneFois = 0        // au moins 1 des 3 premiers était hors top 8
  let deuxFois = 0
  let places = 0         // combien de « places » (1er/2e/3e) tenue par un hors-top-8
  const parPlace = [0, 0, 0]
  const rangs = []

  for (const k of base) {
    let h = 0
    k.top3.forEach((n, i) => {
      const r = k.rang.get(n)
      if (r == null) return
      rangs.push(r)
      if (r > 8) { h++; places++; parPlace[i]++ }
    })
    if (h >= 1) uneFois++
    if (h >= 2) deuxFois++
  }

  const n = base.length
  const pct = (x) => (x / n * 100).toFixed(0) + ' %'
  console.log(`  ${n} courses`)
  console.log('')
  console.log(`  ⭐ au moins UN des 3 premiers hors du top 8 cotes : ${uneFois}/${n}  =  ${pct(uneFois)}`)
  console.log(`     DEUX des 3 premiers hors top 8               : ${deuxFois}/${n}  =  ${pct(deuxFois)}`)
  console.log('')
  console.log('  --- ou sortent-ils, place par place ---')
  parPlace.forEach((v, i) => console.log(`     ${['1er', '2e ', '3e '][i]} : hors top 8 dans ${String(v).padStart(3)} courses  =  ${pct(v)}`))
  console.log('')
  console.log(`  places de podium tenues par un hors-top-8 : ${places}/${n * 3} = ${(places / (n * 3) * 100).toFixed(1)} %`)
  console.log('')

  // la distribution du rang de cote des 3 premiers
  const tri = [...rangs].sort((a, b) => a - b)
  const q = (p) => tri[Math.min(tri.length - 1, Math.floor(p * tri.length))]
  console.log('  --- le rang de cote des 3 premiers (1 = le favori, 16 = le plus détesté) ---')
  console.log(`     le plus souvent : rang ${q(0.5)}   ·   25 % : rang ${q(0.25)}   ·   75 % : rang ${q(0.75)}`)
  console.log('')

  // la course la plus « contre le marché »
  const pire = base.map((k) => ({ cle: k.cle, hors: k.top3.filter((x) => (k.rang.get(x) || 0) > 8).map((x) => `${x}(rang ${k.rang.get(x)})`) }))
    .filter((x) => x.hors.length)
    .sort((a, b) => b.hors.length - a.hors.length)
  console.log(`  --- les courses où le marché s'est le plus trompé sur le podium ---`)
  pire.slice(0, 6).forEach((x) => console.log(`     ${x.cle.padEnd(20)} ${x.hors.length} des 3 premiers hors top 8 : ${x.hors.join('  ')}`))
  const deuxPlus = pire.filter((x) => x.hors.length === 2).length
  console.log('')
  console.log(`  ⭐ il y a ${deuxPlus} course(s) sur ${n} où DEUX des 3 premiers étaient hors du top 8 des cotes.`)
  console.log('')

  /* ⭐ LA QUESTION QUI COMPTE POUR UN QUINTÉ : parmi les 5 ARRIVANTS, combien
   * sont hors du top 8 des cotes ? C'est ça qu'une ticket doit couvrir. */
  const rep = [0, 0, 0, 0, 0, 0]   // 0..5 arrivants hors top 8
  for (const k of base) {
    let h = 0
    for (const x of k.top5) if ((k.rang.get(x) || 0) > 8) h++
    rep[h]++
  }
  console.log('  ⭐⭐ LA VRAIE QUESTION : parmi les 5 ARRIVANTS, combien hors du top 8 ?')
  console.log('  (c\'est ça qu\'une ticket doit couvrir, pas le podium)')
  console.log('')
  console.log('  arrivants hors top8   courses    part   → il faut au moins N "haut" et (5-N) "bas"')
  for (let h = 0; h <= 5; h++) {
    const pctR = rep[h] / n * 100
    const mini = h <= 3 && 5 - h <= 4 ? `une ticket de 7 (4 bas + 3 haut) ${h <= 3 && 5 - h <= 4 ? 'peut' : 'ne peut pas'} couvrir` : '—'
    console.log('     ' + String(h).padStart(2) + ' hors / ' + (5 - h) + ' dedans   '
      + String(rep[h]).padStart(5) + '   ' + (pctR.toFixed(0) + '%').padStart(5) + '   → ' + mini)
  }
  const cumulant = (h) => rep.slice(0, h + 1).reduce((a, b) => a + b, 0)
  console.log('')
  console.log(`  ⭐ une ticket 4 bas + 3 haut ne peut PAS couvrir une course où il y a`)
  console.log(`     4 arrivants hors top8 (${rep[4] + rep[5]} courses = ${((rep[4] + rep[5]) / n * 100).toFixed(0)} %) ni une où il y en a 5.`)
  console.log(`     Elle ne peut pas non plus couvrir une course avec 4 favoris dans le top5.`)
  console.log('')
}
