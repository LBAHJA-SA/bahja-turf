/* tools/fix-cotes-ref.mjs — يعيد قراءة coteRef من reu.php للسباقات المنتهية
 * ويحدث ملفات الأرشيف (data/reu/ + public/data/reu/).
 * Usage: node tools/fix-cotes-ref.mjs 2026-10-12
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const REU = path.join(RACINE, 'public', 'data', 'reu')
const TF = 'https://www.turf-france.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const CURL_BIN = process.platform === 'win32' ? 'curl.exe' : 'curl'

function texte(x) {
  return String(x || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&#0?39;/g, "'").replace(/&apos;/gi, "'")
    .replace(/"/gi, '"').replace(/&/gi, '&').replace(/</gi, '<').replace(/>/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&eacute;/gi, 'e').replace(/&egrave;/gi, 'e').replace(/&agrave;/gi, 'a')
    .replace(/&ccedil;/gi, 'c').replace(/&ugrave;/gi, 'u').replace(/&ocirc;/gi, 'o')
    .replace(/&icirc;/gi, 'i').replace(/&ecirc;/gi, 'e').replace(/&acirc;/gi, 'a')
    .replace(/\s+/g, ' ').trim()
}
function nombre(x) {
  if (x == null) return null
  const m = String(x).replace(/\s+/g, '').replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : null
}
function curlTexte(url, delai = 55000) {
  return new Promise((resolve) => {
    execFile(CURL_BIN, ['-sS', '-m', String(Math.ceil(delai / 1000)), '-A', UA, '--compressed', url],
      { timeout: delai, maxBuffer: 12 * 1024 * 1024 }, (err, stdout) => {
        if (err) resolve(null)
        else resolve(String(stdout || ''))
      })
  })
}
async function fetchTF(url) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9' },
      signal: AbortSignal.timeout(25000),
    })
    return await r.text()
  } catch { return curlTexte(url) }
}

async function lireDetailDirect(date, rNum, cNum, pays) {
  const html = await fetchTF(`${TF}/php/reu.php?view=detail&date=${date}&reunion=R${rNum}&course=C${cNum}&pays=${pays}`)
  if (!html) throw new Error('détail indisponible')
  let carte = null
  const iT = html.search(/<table[^>]*id=['"]lstpartant['"]/i)
  if (iT >= 0) {
    const finHead = html.indexOf('</thead>', iT)
    const noms = [...html.slice(iT, finHead > 0 ? finHead : iT + 3000).matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)]
      .map((x) => texte(x[1]).toLowerCase().replace(/\./g, ''))
    if (noms.length >= 10) {
      carte = {}; let refs = 0
      noms.forEach((t, i) => {
        if (/^n°$|numero/.test(t)) carte.num = i
        else if (/cheval/.test(t)) carte.cheval = i
        else if (/cotes ref/.test(t)) { refs++; carte[refs === 1 ? 'coteRef' : 'coteRef2'] = i }
        else if (/^age$/.test(t)) carte.age = i
        else if (/sexe/.test(t)) carte.sexe = i
        else if (/musique/.test(t)) carte.musique = i
        else if (/gains/.test(t)) carte.gains = i
        else if (/corde/.test(t)) carte.corde = i
        else if (/poids/.test(t)) carte.poids = i
        else if (/valeur/.test(t)) carte.valeur = i
        else if (/^cotes?\s*$/.test(t)) carte.cote = i
        else if (/jockey|driver/.test(t)) carte.driver = i
        else if (/entrain/.test(t)) carte.entraineur = i
        else if (/propri/.test(t)) carte.proprietaire = i
        else if (/^def/.test(t)) carte.def = i
      })
      if (carte.num == null) carte = null
    }
  }
  if (!carte) throw new Error('tableau des partants introuvable')
  const besoin = Math.max(...Object.values(carte).filter((x) => Number.isFinite(x)))
  const lit = (c, k) => (carte[k] != null ? (c[carte[k]] ?? '') : '')
  const sortie = []
  for (const m of html.matchAll(/<tr[^>]*data-num=['"](\d+)['"][^>]*>([\s\S]*?)<\/tr>/gi)) {
    const c = [...m[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((x) => texte(x[1]))
    if (c.length <= besoin) continue
    const n = Number(c[carte.num])
    if (!Number.isFinite(n) || n < 1) continue
    const cRef = carte.coteRef != null ? nombre(c[carte.coteRef]) : null
    const cote = cRef != null && cRef > 1 ? cRef : null
    sortie.push({
      num: n,
      cheval: lit(c, 'cheval'),
      driver: lit(c, 'driver'),
      entraineur: lit(c, 'entraineur'),
      poids: carte.poids != null ? nombre(c[carte.poids]) : null,
      coteRef: cote,
      gains: carte.gains != null ? nombre(c[carte.gains]) : null,
      musique: lit(c, 'musique'),
      corde: carte.corde != null ? nombre(c[carte.corde]) : null,
      valeur: carte.valeur != null ? nombre(c[carte.valeur]) : null,
      proprietaire: lit(c, 'proprietaire'),
      sexe: lit(c, 'sexe'),
      age: carte.age != null ? nombre(c[carte.age]) : null,
      def: lit(c, 'def') || null,
    })
  }
  if (!sortie.length) throw new Error('aucun partant lu')
  sortie.sort((a, b) => a.num - b.num)
  return { partants: sortie }
}

function ecrire(relatif, obj) {
  for (const base of ['data', path.join('public', 'data')]) {
    const f = path.join(RACINE, base, relatif)
    fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.writeFileSync(f, JSON.stringify(obj, null, 1), 'utf8')
  }
}

async function main() {
  const dates = process.argv.slice(2).filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a))
  if (!dates.length) { console.error('usage: node tools/fix-cotes-ref.mjs AAAA-MM-JJ [AAA-MM-JJ...]'); process.exit(1) }
  for (const date of dates) {
    console.log('══ ' + date + ' ══')
    const progFile = path.join(REU, `prog-${date}.json`)
    if (!fs.existsSync(progFile)) { console.log('  pas de programme'); continue }
    const prog = JSON.parse(fs.readFileSync(progFile, 'utf8'))
    for (const r of prog.reunions || []) {
      for (const c of r.courses || []) {
        const cle = `${date}_${c.reunion}_${c.code}_${String(c.pays || r.pays || 'FRANCE').replace(/\s+/g, '')}`
        const f = path.join(REU, cle + '.json')
        if (!fs.existsSync(f)) continue
        let arch
        try { arch = JSON.parse(fs.readFileSync(f, 'utf8')) } catch { continue }
        const parts = arch.participants || []
        const missing = parts.filter((p) => !p.coteRef || p.coteRef <= 0).length
        if (!missing) continue
        const rNum = Number(String(c.reunion).replace(/\D/g, ''))
        const cNum = Number(String(c.code).replace(/\D/g, ''))
        const pays = c.pays || r.pays || 'FRANCE'
        console.log(`  ${cle} : ${missing}/${parts.length} manquantes → lecture reu.php...`)
        try {
          const det = await lireDetailDirect(date, rNum, cNum, pays)
          if (!det.partants.length) { console.log('    vide'); continue }
          let maj = 0
          const byNum = new Map(parts.map((p) => [p.num, p]))
          for (const dp of det.partants) {
            const ap = byNum.get(dp.num)
            if (ap && dp.coteRef && (!ap.coteRef || ap.coteRef <= 0)) {
              ap.coteRef = dp.coteRef
              ap.cote = dp.coteRef
              maj++
            }
          }
          if (maj) {
            arch.participants = parts
            arch.collecteLe = new Date().toISOString()
            ecrire('reu/' + cle + '.json', arch)
            console.log(`    ✓ ${maj} coteRef mises à jour`)
          } else console.log(`    aucune coteRef nouvelle`)
        } catch (e) { console.log(`    échec: ${e.message}`) }
        await new Promise(r => setTimeout(r, 1200))
      }
    }
    console.log('  programme réécrit (distances/partants)…')
    try {
      const avecDistances = (prog.reunions || []).map((r) => ({
        ...r,
        courses: (r.courses || []).map((c) => {
          const cle = `${date}_${c.reunion}_${c.code}_${String(c.pays || r.pays || 'FRANCE').replace(/\s+/g, '')}`
          const archF = path.join(REU, cle + '.json')
          if (!fs.existsSync(archF)) return c
          try {
            const j = JSON.parse(fs.readFileSync(archF, 'utf8'))
            return { ...c, dist: j?.race?.distance ?? null, partants: j?.race?.nbPartants ?? (j?.participants?.length || null), type: j?.race?.type || null, hippodrome: j?.meeting?.hippodrome || r.hippodrome, source: j?.source || null, arrivee: (j?.arrivee || []).join('-') || null }
          } catch { return c }
        }),
      }))
      ecrire(`reu/prog-${date}.json`, { date, reunions: avecDistances, collecteLe: new Date().toISOString() })
      console.log('    ok')
    } catch (e) { console.log('    échec réécriture prog:', e.message) }
  }
  console.log('TERMINE')
}
main()