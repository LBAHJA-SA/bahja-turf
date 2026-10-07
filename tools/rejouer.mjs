/* ---------------------------------------------------------------
 * tools\rejouer.mjs  —  ⭐ LA PREUVE QUE LES RÉSULTATS SONT FIXES
 *
 *   node tools\rejouer.mjs            → rejoue TOUTES les dates
 *   node tools\rejouer.mjs 2026-10-05 → rejoue une date
 *
 * Le principe (demandé le 05/10/2026) :
 *   « باش نطورو التحليل خاص تكون النتائج تابتة باش نعارفو الخلل فين كاين »
 *
 * Au moment où la ticket est posée, le moteur range une PHOTO de tout ce
 * qu'il a vu dans  data\replay\<date>.json  : la Synthèse, les partants, le
 * classement, les cotes du marché, les statistiques de l'archive, la carrière.
 *
 * `rejouer` relit cette photo, appelle le MÊME moteur, et compare avec la
 * ticket de l'archive. Deux issues seulement :
 *
 *   identique   → le moteur se comporte comme le 05/10 : on peut le modifier,
 *                 et chaque course deja jouee nous dira s'il a casse quelque
 *                 chose, et sur QUELLE course.
 *   different   → le defaut est LOCALISE : on voit le bloc, le cheval sorti
 *                 et le cheval entré.
 *
 * Sans les entrees figees, c'est impossible : le marché bouge, la carrière
 * arrive en retard, les stats changent — et le meme moteur rend un autre
 * resultat, sans qu'on sache pourquoi.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildGrid, remplirGrille } from '../src/lib/quinte.js'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.join(ICI, '..')
const REPLAY = path.join(RACINE, 'data', 'replay')
const F_SYN = path.join(RACINE, 'data', 'synthese.json')

const lire = (p, def = null) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return def } }

/** Rejoue une date a partir de sa photo d'entrees. */
export function rejouerUne(date, db = lire(F_SYN, {})) {
  const photo = lire(path.join(REPLAY, `${date}.json`))
  const rec = db[date]
  if (!rec) return { date, etat: 'PAS DE LIGNE', detail: 'absente de data/synthese.json' }
  if (!rec.ticket?.length) return { date, etat: 'SANS TICKET', detail: 'rien a comparer' }
  if (!photo) {
    return { date, etat: 'PAS DE PHOTO', detail: `pas de data/replay/${date}.json — ticket ${rec.ticket.join(' ')} (posee avant le gel des entrees)` }
  }

  const i = photo.inputs
  const grille = buildGrid(i.synthese, i.nums)
  const classement = (i.classement || []).map((c) => ({ p: { num: c.num }, s: c.s, ok: c.ok }))
  const r = remplirGrille(grille, classement, i.discipline, i.cotes, i.stats)
  const obtenu = r.ticket

  const attendu = photo.ticket || []
  const meme = JSON.stringify(obtenu) === JSON.stringify(attendu)
  const manque = attendu.filter((n) => !obtenu.includes(n))
  const enTrop = obtenu.filter((n) => !attendu.includes(n))

  const out = { date, etat: meme ? 'IDENTIQUE' : 'DIFFERENT', obtenu, attendu, manque, enTrop, rec: rec.ticket, blocs: [] }
  for (const g of grille.groupes) {
    const pris = obtenu.filter((n) => grille.groupes.find((x) => x.id === g.id).cases.some((c) => c.num === n))
    out.blocs.push({ id: g.id, quota: g.quota, pris, cote: i.cotes && Object.keys(i.cotes).length >= 4 })
  }
  return out
}

/* ------------------------------------------------------------------ CLI --- */
if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ICI, 'rejouer.mjs')) {
  const db = lire(F_SYN, {})
  const cible = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  const dates = cible.length ? cible : Object.keys(db).sort().reverse()

  console.log('')
  console.log('  ⭐ REJEU DU MOTEUR — data\\replay\\<date>.json vs data\\synthese.json')
  console.log('')
  let ko = 0
  let sansPhoto = 0
  for (const date of dates) {
    const r = rejouerUne(date, db)
    if (r.etat === 'IDENTIQUE') {
      console.log(`  OK       ${date}  ${r.obtenu.join(' ')}`)
    } else if (r.etat === 'DIFFERENT') {
      ko++
      console.log(`  DIFFERENT ${date}`)
      console.log(`             archive : ${r.rec.join(' ')}`)
      console.log(`             rejoue  : ${r.obtenu.join(' ')}`)
      if (r.manque.length) console.log(`             SORTIS  : ${r.manque.join(' ')}`)
      if (r.enTrop.length) console.log(`             ENTRES  : ${r.enTrop.join(' ')}`)
      for (const b of r.blocs) console.log(`             ${b.id} quota ${b.quota} -> ${b.pris.length} : ${b.pris.join(' ')}${b.cote ? '   (par le marche)' : '   (par le classement)'}`)
    } else {
      sansPhoto++
      console.log(`  ${r.etat.padEnd(8)} ${date}  ${r.detail}`)
    }
  }
  const faits = dates.length - ko - sansPhoto
  console.log('')
  console.log(`  ${faits} rejouee(s) a l identique · ${ko} differente(s) · ${sansPhoto} sans photo`)
  console.log(`  archive : ${dates.length} course(s)\n`)
  process.exit(ko ? 1 : 0)
}
