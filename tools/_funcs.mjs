import fs from 'node:fs'
const file = process.argv[2]
const s = fs.readFileSync(file, 'utf8')
const L = s.split('\n')
let out = []
for (let i = 0; i < L.length; i++) {
  if (/^(def |class )/.test(L[i])) {
    let doc = ''
    for (let j = i + 1; j < Math.min(i + 8, L.length); j++) {
      const t = L[j].trim()
      if (t.startsWith('"""')) { doc = t.replace(/"/g, ''); break }
      if (t && !t.startsWith('#') && !t.startsWith('@')) break
    }
    out.push(`${i + 1}: ${L[i].slice(0, 100)}   ${doc.slice(0, 110)}`)
  }
}
console.log(out.join('\n'))
