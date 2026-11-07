/* ═══════════════════════════════════════════════════════════════════════════
 *  i18n-extract.mjs — extrait TOUS les textes visibles de l'application.
 *
 *  But : construire une liste de phrases françaises réellement affichées à
 *  l'écran (texte JSX, placeholders, titres, tableaux de libellés), pour les
 *  traduire une fois pour toutes en arabe dans `src/lib/trad-ar.json`.
 *
 *  Sortie : `data/i18n-source.json`  →  [ "texte 1", "texte 2", ... ]
 * ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@babel/parser'

const RACINE = path.resolve('.')

/* ── les dossiers à fouiller ─────────────────────────────────────────────── */
const DOSSIERS = ['src', 'frontend', 'backend/QUINTE', 'backend/DNA', 'backend/PRESSE', 'api']
const EXT = new Set(['.js', '.jsx', '.mjs'])

function lister(dir, out = []) {
  let ents = []
  try { ents = fs.readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const e of ents) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) lister(p, out)
    else if (EXT.has(path.extname(e.name))) out.push(p)
  }
  return out
}

/* ── ce qui n'est PAS un texte à traduire ────────────────────────────────── */
const ATTRS_TEXTE = new Set([
  'title', 'placeholder', 'alt', 'aria-label', 'label', 'libelle', 'texte',
  'message', 'aide', 'sous', 'titre', 'vide', 'msg', 'erreur', 'hint',
])

const MOTIF_CODE = [
  /^https?:/i, /^[./]/, /^\//, /^#/, /^[a-z0-9-]+$/i, /^[A-Z0-9_]+$/,
  /\.(js|jsx|json|css|png|jpg|svg|m3u8|php|html?)$/i,
  /rgba?\(/, /gradient/, /var\(--/, /\bpx\b/, /\brem\b/, /\bvh\b/, /\bvw\b/,
  /^[a-z-]+:[a-z]/, /^M[\d., ]/, /^[a-f0-9]{6,}$/i, /^data:/,
  /^\d+(\.\d+)?$/, /^[%€$+\-*/=<>()[\]{}|]+$/,
]

function estTexte(s) {
  if (typeof s !== 'string') return false
  const v = s.replace(/\s+/g, ' ').trim()
  if (v.length < 2 || v.length > 400) return false
  if (!/[A-Za-zÀ-ÿ]/.test(v)) return false          // au moins une lettre
  if (!/[a-zà-ÿ]/.test(v)) return false             // pas du tout-majuscule (clé/fmt)
  if (MOTIF_CODE.some((r) => r.test(v))) return false
  if (/^\{\{/.test(v)) return false
  if (/[{}]/.test(v)) return false                    // CSS / objet JS
  if (/;.*:/.test(v) || /:.*;/.test(v)) return false  // déclarations CSS
  if (/^[);}\]]/.test(v)) return false                // fragment de code
  if (/[<>]\s*\//.test(v)) return false               // balise
  // une seule « phrase » de code : camelCase sans espace ni accent
  if (!/[ '’·:!?,.«»()–—]/.test(v) && /^[a-z]+([A-Z][a-z]+)+$/.test(v)) return false
  return true
}

/* ── position dans une chaîne d'import / require / className ──────────────── */
function dansImport(node, parents) {
  return parents.some((p) =>
    p.type === 'ImportDeclaration' ||
    p.type === 'ExportNamedDeclaration' ||
    (p.type === 'CallExpression' && p.callee?.name === 'require') ||
    (p.type === 'JSXAttribute' && p.name?.name === 'className') ||
    (p.type === 'JSXAttribute' && p.name?.name === 'style')
  )
}

const trouves = new Map()   // texte → nb d'occurrences

function ajouter(s, fichier) {
  if (typeof s !== 'string') return
  const v = s.replace(/\s+/g, ' ').trim()
  if (!estTexte(v)) return
  trouves.set(v, (trouves.get(v) || 0) + 1)
}

function visiter(node, parents, fichier) {
  if (!node || typeof node.type !== 'string') return

  /* ① le texte entre les balises JSX : <b>Le cheval</b> */
  if (node.type === 'JSXText') {
    ajouter(node.value, fichier)
  }

  /* ② les attributs qui portent du texte */
  if (node.type === 'JSXAttribute' && node.value) {
    const nom = node.name?.name
    if (ATTRS_TEXTE.has(nom)) {
      if (node.value.type === 'StringLiteral') ajouter(node.value.value, fichier)
      if (node.value.type === 'JSXExpressionContainer') {
        const e = node.value.expression
        if (e?.type === 'StringLiteral') ajouter(e.value, fichier)
        if (e?.type === 'TemplateLiteral') e.quasis.forEach((q) => ajouter(q.value.cooked, fichier))
        /* les ternaires : title={cond ? 'A' : 'B'} */
        if (e?.type === 'ConditionalExpression') {
          if (e.consequent?.type === 'StringLiteral') ajouter(e.consequent.value, fichier)
          if (e.alternate?.type === 'StringLiteral') ajouter(e.alternate.value, fichier)
        }
      }
    }
  }

  /* ③ les littéraux dans les tableaux/objets de libellés (PARIS, LIENS, …) :
   *    on ne prend que les chaînes « en français » (espaces ou accents). */
  if (node.type === 'StringLiteral' && !dansImport(node, parents)) {
    const v = node.value.replace(/\s+/g, ' ').trim()
    if (/[àâäéèêëîïôöùûüçœ’]/i.test(v) || (v.includes(' ') && !MOTIF_CODE.some((r) => r.test(v)))) {
      if (estTexte(v)) ajouter(v, fichier)
    }
  }

  /* ④ les gabarits `...` */
  if (node.type === 'TemplateLiteral') {
    node.quasis.forEach((q) => {
      const v = (q.value.cooked || '').replace(/\s+/g, ' ').trim()
      if (v && estTexte(v) && (/[àâäéèêëîïôöùûüçœ’]/i.test(v) || v.split(' ').length > 2)) ajouter(v, fichier)
    })
  }

  const enfants = []
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'start' || k === 'end' || k === 'leadingComments' || k === 'trailingComments') continue
    const val = node[k]
    if (Array.isArray(val)) {
      for (const c of val) if (c && typeof c.type === 'string') enfants.push(c)
    } else if (val && typeof val === 'object' && typeof val.type === 'string') {
      enfants.push(val)
    }
  }
  const suite = [...parents, node]
  for (const c of enfants) visiter(c, suite, fichier)
}

const fichiers = []
for (const d of DOSSIERS) lister(path.join(RACINE, d), fichiers)

let lus = 0, erreurs = 0
for (const f of fichiers) {
  let code = ''
  try { code = fs.readFileSync(f, 'utf8') } catch { continue }
  let ast
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator', 'decorators-legacy'],
      errorRecovery: true,
    })
  } catch { erreurs++; continue }
  lus++
  try { visiter(ast.program, [], f) } catch { erreurs++ }
}

const liste = [...trouves.keys()].sort((a, b) => b.length - a.length)
fs.mkdirSync('data', { recursive: true })
fs.writeFileSync('data/i18n-source.json', JSON.stringify(liste, null, 1), 'utf8')

console.log(`fichiers lus      : ${lus} (${erreurs} ignorés)`)
console.log(`textes distincts  : ${liste.length}`)
console.log(`caractères totaux : ${liste.reduce((n, s) => n + s.length, 0)}`)
console.log('--- échantillon ---')
liste.slice(0, 12).forEach((s) => console.log('  ' + s.slice(0, 90)))
