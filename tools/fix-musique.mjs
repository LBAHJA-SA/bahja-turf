/* tools/fix-musique.mjs — يصلح musique الفاسدة في الأرشيف من Equidia.
 * لكل سباق في الأرشيف: يجلب البيانات الصحيحة من Equidia، يحدث حقل musique.
 * Usage: node tools/fix-musique.mjs [date] [reunion] [course]
 *        node tools/fix-musique.mjs 2026-10-13 R1 C1
 *        node tools/fix-musique.mjs 2026-10-13     (كل سباقات اليوم)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const REU = path.join(RACINE, 'public', 'data', 'reu')
const EQ = 'https://www.equidia.fr'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const CURL_BIN = process.platform === 'win32' ? 'curl.exe' : 'curl'

function curlTexte(url, delai = 55000) {
  return new Promise((resolve) => {
    execFile(CURL_BIN, ['-sS', '-m', String(Math.ceil(delai / 1000)), '-A', UA, '--compressed', url],
      { timeout: delai, maxBuffer: 12 * 1024 * 1024 }, (err, stdout) => {
        if (err) resolve(null)
        else resolve(String(stdout || ''))
      })
  })
}

async function fetchEquidia(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(20000) })
    if (!r.ok) return null
    return await r.text()
  } catch { return curlTexte(url) }
}

function extraireMusiqueEquidia(html) {
  // Equidia يضع البيانات في <script id="serverApp-state" type="application/json">
  const m = html.match(/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) return null
  let txt = m[1]
    .replace(/"/g, '"').replace(/</g, '<').replace(/>/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/'/g, "'").replace(/&/g, '&')
  try {
    const st = JSON.parse(txt)
    // البحث عن بيانات المتسابقين في state
    // Equidia يخزن تحت مفاتيح مثل courses/{date}/R{n}/C{m}/pari_simple أو v2/courses/{date}/R{n}/C{m}
    for (const key of Object.keys(st)) {
      if (key.includes('/pari_simple') || key.includes('/v2/courses/')) {
        const data = st[key]
        if (Array.isArray(data)) {
          const musiqueMap = {}
          for (const x of data) {
            if (x.num_partant && x.cheval?.nom_cheval) {
              // بناء musique من lastPerformance أو forms
              let musique = ''
              if (x.cheval?.lastPerformance) {
                musique = x.cheval.lastPerformance
              } else if (x.cheval?.forms && Array.isArray(x.cheval.forms)) {
                musique = x.cheval.forms.map(f => `${f.pos || ''}${f.running || ''}`).join('p')
              }
              if (musique) musiqueMap[x.num_partant] = musique
            }
          }
          if (Object.keys(musiqueMap).length > 0) return musiqueMap
        }
      }
    }
    return null
  } catch { return null }
}

async function getEquidiaMusique(date, rNum, cNum) {
  const url = `${EQ}/courses/${date}/R${rNum}/C${cNum}`
  const html = await fetchEquidia(url)
  if (!html) return null
  return extraireMusiqueEquidia(html)
}

function lireFichierCourse(cle) {
  const f = path.join(REU, cle + '.json')
  if (!fs.existsSync(f)) return null
  return JSON.parse(fs.readFileSync(f, 'utf8'))
}

function ecrireFichierCourse(cle, obj) {
  for (const base of ['data', path.join('public', 'data')]) {
    const f = path.join(RACINE, base, 'reu', cle + '.json')
    fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.writeFileSync(f, JSON.stringify(obj, null, 1), 'utf8')
  }
}

async function fixCourse(cle) {
  const parts = cle.split('_')
  if (parts.length < 3) return { ok: false, reason: 'clé غير صالحة' }
  const date = parts[0]
  const rNum = parseInt(parts[1].replace(/\D/g, ''), 10)
  const cNum = parseInt(parts[2].replace(/\D/g, ''), 10)
  if (!date || !rNum || !cNum) return { ok: false, reason: 'clé غير قابلة للتحليل' }

  console.log(`\n=== ${cle} ===`)
  const course = lireFichierCourse(cle)
  if (!course) return { ok: false, reason: 'ملف غير موجود' }

  const participants = course.participants || []
  if (!participants.length) return { ok: false, reason: 'لا جزء' }

  console.log(`  جزء: ${participants.length} | جلب musique من Equidia...`)
  const eqMusique = await getEquidiaMusique(date, rNum, cNum)
  if (!eqMusique) return { ok: false, reason: 'Equidia لم يعطِ musique' }

  console.log(`  Equidia أعطى ${Object.keys(eqMusique).length} حصان`)
  let maj = 0
  for (const p of participants) {
    const n = p.num
    if (eqMusique[n] && eqMusique[n] !== p.musique) {
      console.log(`  ✓ ${n}: "${p.musique || ''}" -> "${eqMusique[n]}"`)
      p.musique = eqMusique[n]
      maj++
    }
  }
  if (maj) {
    course.collecteLe = new Date().toISOString()
    ecrireFichierCourse(cle, course)
    console.log(`  ✓ ${maj} musique محدثة`)
    return { ok: true, maj }
  } else {
    console.log(`  = لا تغيير`)
    return { ok: true, maj: 0 }
  }
}

async function main() {
  const args = process.argv.slice(2).filter(a => a)
  if (!args.length) {
    console.error('Usage: node tools/fix-musique.mjs <date> [reunion] [course]')
    console.error('  مثال: node tools/fix-musique.mjs 2026-10-13 R1 C1')
    console.error('  مثال: node tools/fix-musique.mjs 2026-10-13')
    process.exit(1)
  }
  const date = args[0]
  const rNum = args[1] ? parseInt(args[1].replace(/\D/g, ''), 10) : null
  const cNum = args[2] ? parseInt(args[2].replace(/\D/g, ''), 10) : null

  const progFile = path.join(REU, `prog-${date}.json`)
  if (!fs.existsSync(progFile)) {
    console.error('برنامج اليوم غير موجود:', progFile)
    process.exit(1)
  }
  const prog = JSON.parse(fs.readFileSync(progFile, 'utf8'))

  let courses = []
  if (rNum && cNum) {
    const cle = `${date}_R${rNum}_C${cNum}_FRANCE`
    courses = [cle]
  } else {
    // كل سباقات اليوم
    for (const r of prog.reunions || []) {
      for (const c of r.courses || []) {
        const cle = `${c.date || date}_${c.reunion}_${c.code}_${c.pays || r.pays || 'FRANCE'}`
        courses.push(cle)
      }
    }
  }

  console.log(`\n${date} — ${courses.length} سباق للمعالجة`)
  let totalMaj = 0
  for (const cle of courses) {
    const res = await fixCourse(cle)
    totalMaj += res.maj || 0
    await new Promise(r => setTimeout(r, 1500)) // احترام Equidia
  }
  console.log(`\n=== الإجمالي: ${totalMaj} musique محدثة ===`)
}
main()