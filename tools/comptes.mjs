/* =============================================================================
 * tools/comptes.mjs — LA LISTE DES COMPTES, EN CLAIR ET SANS DOUBLON (29/10/2026)
 *
 * Pourquoi ce fichier existe :
 *   · la console écrit `ADMIN_COMPTES`, mais le login lit d'abord
 *     `ADMIN_COMPTES_RECOURS` (la clé de secours du 28/10) — tant qu'elle est
 *     là, modifier ou SUPPRIMER « sam » depuis la console ne change rien ;
 *   · `ADMIN_COMPTES` a existé en plusieurs exemplaires : `find()` n'en
 *     écrivait qu'un seul, les copies gardaient l'ancienne liste.
 *
 * Ce que fait `--consolider` :
 *   ① se connecte avec le mot de passe de `.recours.json` ;
 *   ② lit la liste RÉELLE (sel / iter / hash) par `?action=comptes` ;
 *   ③ réécrit `ADMIN_COMPTES` — UNE valeur, sur les trois cibles, doublons
 *      supprimés — en gardant le hash connu pour « sam » : le mot de passe
 *      actuel continue donc de fonctionner ;
 *   ④ supprime `ADMIN_COMPTES_RECOURS` (elle n'a plus de raison d'être) ;
 *   ⑤ relance un déploiement et vérifie le login de bout en bout.
 *
 *   node tools\comptes.mjs                       → montre la liste (sans hash)
 *   node tools\comptes.mjs --consolider          → répare + redéploie + vérifie
 *   node tools\comptes.mjs --verifier            → login de bout en bout
 * ============================================================================= */
import fs from 'node:fs'

const PROJET = 'prj_FZFNbBzmLKfzQeAfNa6SNjXt3q2q'
const SITE = 'https://bahja-turf.vercel.app'
const LOCAL = '.recours.json'
const CONSOLIDER = process.argv.includes('--consolider')
const SEULEMENT_VERIFIER = process.argv.includes('--verifier')

const token = (() => {
  try {
    const m = fs.readFileSync('.deploy-env', 'utf8').match(/VERCEL_TOKEN\s*=\s*(\S+)/)
    return m ? m[1] : ''
  } catch { return '' }
})()

const vercel = async (methode, chemin, corps) => {
  const r = await fetch('https://api.vercel.com' + chemin, {
    method: methode,
    headers: { Authorization: 'Bearer ' + token, ...(corps ? { 'Content-Type': 'application/json' } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  })
  let j = null
  try { j = await r.json() } catch { /* vide */ }
  if (!r.ok) throw new Error('Vercel HTTP ' + r.status + ' ' + String(j?.error?.message || '').slice(0, 160))
  return j || {}
}

const identifiants = () => JSON.parse(fs.readFileSync(LOCAL, 'utf8'))
const attendre = (ms) => new Promise((r) => setTimeout(r, ms))

/* ── le login de la console : renvoie le cookie et la liste complète ──────── */
const session = async () => {
  const { nom, motDePasse } = identifiants()
  const r = await fetch(SITE + '/api/admin?action=login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom, motDePasse }),
  })
  const j = await r.json().catch(() => null)
  if (r.status !== 200 || !j?.ok) throw new Error('login refusé (HTTP ' + r.status + ') : ' + (j?.erreur || ''))
  const jar = (r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie')])
    .filter(Boolean).map((c) => c.split(';')[0]).join('; ')
  return { jar, nom: j.nom, pages: j.pages || [] }
}

const listeDesComptes = async (jar) => {
  const r = await fetch(SITE + '/api/admin?action=comptes', { headers: { Cookie: jar } })
  const j = await r.json().catch(() => null)
  if (r.status !== 200) throw new Error('?action=comptes → HTTP ' + r.status + ' ' + (j?.erreur || ''))
  return j.comptes || []
}

/* ── afficher ─────────────────────────────────────────────────────────────── */
if (!CONSOLIDER) {
  if (SEULEMENT_VERIFIER) {
    const { nom, motDePasse } = identifiants()
    const r = await fetch(SITE + '/api/admin?action=login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, motDePasse }),
    })
    const j = await r.json().catch(() => null)
    console.log('login « ' + nom + ' » → HTTP ' + r.status + ' · ' + JSON.stringify(j?.erreur || { ok: j?.ok, nom: j?.nom }))
    process.exit(r.status === 200 ? 0 : 1)
  }
  const { jar } = await session()
  const comptes = await listeDesComptes(jar)
  const envs = (await vercel('GET', '/v9/projects/' + PROJET + '/env')).envs || []
  const vars = envs.filter((e) => /^ADMIN_COMPTES/.test(e.key))
  console.log('comptes lus par le serveur : ' + comptes.length)
  for (const c of comptes) {
    console.log('  · ' + String(c.nom).padEnd(10) +
      ' admin=' + ((c.pages || []).includes('admin') ? 'oui' : 'non') +
      ' actif=' + (c.actif !== false ? 'oui' : 'non') +
      ' abonnement=' + (c.abonnement?.etat || '?') +
      ' bloqué=' + (c.appareilBloque ? 'OUI' : 'non') +
      ' hash=' + String(c.hash || '').slice(0, 8) + '…')
  }
  console.log('')
  console.log('variables sur Vercel :')
  for (const v of vars) {
    console.log('  · ' + v.key.padEnd(24) + ' type=' + String(v.type).padEnd(10) +
      ' cibles=' + JSON.stringify(v.target || []) + ' id=' + v.id)
  }
  process.exit(0)
}

/* ── consolider ───────────────────────────────────────────────────────────── */
const { jar, nom: moi } = await session()
const comptes = await listeDesComptes(jar)
if (!comptes.some((c) => (c.pages || []).includes('admin') && c.actif !== false)) {
  throw new Error('aucun administrateur actif dans la liste : rien n’est écrit')
}

/* la forme exacte que `comptesValides()` accepte — rien de plus */
const propre = (c) => ({
  nom: c.nom,
  sel: c.sel,
  iter: Number(c.iter) || 210000,
  hash: c.hash,
  pages: Array.isArray(c.pages) ? c.pages : [],
  actif: c.actif !== false,
  etudesFrance: c.etudesFrance !== false,
  debut: c.debut || '',
  fin: c.fin || '',
})
const valeur = JSON.stringify(comptes.map(propre))
console.log('① liste reconstruite : ' + comptes.map((c) => c.nom).join(' · ') + '  (' + valeur.length + ' octets)')

/* ② ADMIN_COMPTES : une valeur, trois cibles, doublons supprimés */
const envs = (await vercel('GET', '/v9/projects/' + PROJET + '/env')).envs || []
const toutes = envs.filter((e) => e.key === 'ADMIN_COMPTES' && e.id)
const cibles = ['production', 'preview', 'development']
const groupes = cibles.map((cible) => ({
  cible,
  ids: toutes.filter((e) => (e.target || []).includes(cible)).map((e) => e.id),
}))
for (const g of groupes) {
  if (!g.ids.length) throw new Error('aucune variable ADMIN_COMPTES pour la cible ' + g.cible)
}
const gardes = new Set(groupes.map((g) => g.ids[0]))
for (const g of groupes) {
  await vercel('PATCH', '/v9/projects/' + PROJET + '/env/' + g.ids[0], { value: valeur })
  console.log('② ADMIN_COMPTES → ' + g.cible + ' (id ' + g.ids[0] + ') écrit')
}
for (const id of [...new Set(groupes.flatMap((g) => g.ids))].filter((id) => !gardes.has(id))) {
  await vercel('DELETE', '/v9/projects/' + PROJET + '/env/' + id)
  console.log('② doublon supprimé : id ' + id)
}

/* ③ la clé de secours n'a plus de raison d'être */
const secours = envs.filter((e) => e.key === 'ADMIN_COMPTES_RECOURS')
for (const e of secours) {
  await vercel('DELETE', '/v9/projects/' + PROJET + '/env/' + e.id)
  console.log('③ ADMIN_COMPTES_RECOURS supprimée (id ' + e.id + ')')
}
if (!secours.length) console.log('③ ADMIN_COMPTES_RECOURS : déjà absente')

/* ④ redéployer */
const deploiements = await vercel('GET', '/v6/deployments?projectId=' + PROJET + '&target=production&limit=5')
const dernier = (deploiements.deployments || [])[0]
if (!dernier) throw new Error('aucun déploiement de production à relancer')
const nouveau = await vercel('POST', '/v13/deployments?forceNew=1', {
  name: 'bahja-turf',
  deploymentId: dernier.uid || dernier.id,
  /* ⚠ 29/10/2026 — `target: 'production'` est OBLIGATOIRE. Sans lui, Vercel
   * accepte la requête et crée un déploiement SANS cible : il n'est jamais
   * aliasé sur bahja-turf.vercel.app, la production continue de servir
   * l'ancien build — donc l'ANCIENNE valeur des variables. C'est exactement
   * ce qui a fait échouer la réparation du login le 29/10 : `--consolider`
   * annonçait « déploiement relancé » et le site répondait encore 401. */
  target: 'production',
})
console.log('④ déploiement relancé : ' + (nouveau.url || nouveau.id))

let etat = ''
for (let i = 0; i < 60; i++) {
  await attendre(10000)
  const d = await vercel('GET', '/v6/deployments/' + encodeURIComponent(nouveau.id || nouveau.uid) + '?projectId=' + PROJET)
  etat = d.readyState || d.state || '?'
  if (etat === 'READY' || etat === 'ERROR' || etat === 'CANCELED') break
}
console.log('④ état : ' + etat)

/* ⑤ vérifier */
const { nom, motDePasse } = identifiants()
const r = await fetch(SITE + '/api/admin?action=login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nom, motDePasse }),
})
const j = await r.json().catch(() => null)
console.log('⑤ login « ' + nom + ' » → HTTP ' + r.status + ' · ' + JSON.stringify(j?.erreur || { ok: j?.ok, nom: j?.nom }))
if (r.status !== 200) {
  console.log('')
  console.log('⚠ la clé de secours est supprimée : si ce login échoue, relance')
  console.log('  node tools\\recours.mjs   puis un déploiement.')
  process.exit(1)
}
const etat2 = await fetch(SITE + '/api/admin?action=etat').then((x) => x.json())
console.log('⑤ etat → ' + JSON.stringify(etat2))
console.log('')
console.log('La console est de nouveau maîtresse de la liste : modifier ou supprimer un compte agit vraiment.')
