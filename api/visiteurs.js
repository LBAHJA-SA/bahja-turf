/* =============================================================================
 * api/visiteurs.js — LES DEUX JOURNAUX (lecture), réservé au propriétaire.
 *
 *   GET /api/visiteurs                    →  { configure, total, visites: [...] }
 *   GET /api/visiteurs?journal=connexions →  { configure, total, connexions: [...] }
 *   …&jeton=XXX                          →  idem (pour `curl`, sans cookie)
 *
 * ⭐ POURQUOI DEUX JOURNAUX DANS UN SEUL FICHIER (26/10/2026)
 *   Le plan Hobby de Vercel plafonne à **12 fonctions serverless**. Le projet
 *   en a exactement 12 (deux autres — `ma`, `ptf` — sont en Edge et ne comptent
 *   pas). Ajouter `api/connexions.js` faisait échouer le déploiement :
 *
 *       « No more than 12 Serverless Functions can be added to a Deployment »
 *
 *   Les deux journaux se lisent donc par la MÊME route, séparés par un
 *   paramètre. Une fonction de moins, aucune variable de plus.
 *
 *     `visites`     qui vient sur le site, d'où, sur quelle page
 *     `connexions`  qui ENTRE, avec quel appareil, et si ça a marché
 *
 * ⚠ CE FICHIER REND DES ADRESSES IP : il est FERMÉ PAR DÉFAUT.
 *
 *   ⭐ DEUX CLÉS, PAS UNE. Avant, il fallait absolument `ADMIN_JETON` : une
 *   variable de plus à poser sur Vercel pour lire une information que le
 *   propriétaire a déjà le droit de voir. Désormais :
 *     ① la SESSION de la console (`bahja_admin`) dont le compte porte `admin`
 *        dans `pages[]` — c'est le chemin normal ;
 *     ② ou `ADMIN_JETON` en query, pour un `curl` sans navigateur.
 *   Si `ADMIN_JETON` n'est pas posé, le ① suffit : une variable oubliée ne
 *   doit pas rendre le journal illisible à son propriétaire.
 *
 * ⚠ SANS BASE, la route répond `{ configure: false }` — la console explique
 *   alors comment la brancher, sans jamais afficher d'erreur rouge.
 *
 * Renvoie au plus 300 lignes (les plus récentes d'abord) + des compteurs.
 * ========================================================================== */

import { lire, ecrire, contexte, journalConfigure } from './_journal.js'
import { journalOuvert, sessionAdmin } from './_session.js'

const PLAFOND_VISITES = 2000

/** Les compteurs d'un journal, calculés en une passe. */
function compter(lignes, champNom) {
  const jour = new Date().toISOString().slice(0, 10)
  const ips = new Set(), pays = new Set(), noms = new Set()
  let auj = 0, refus = 0
  for (const l of lignes) {
    if (l.ip) ips.add(l.ip)
    if (l.pays) pays.add(l.pays)
    if (l[champNom]) noms.add(l[champNom])
    if (!l.ok) refus++
    if (String(l.t || '').slice(0, 10) === jour) auj++
  }
  return {
    total: lignes.length,
    aujourdhui: auj,
    refus,
    ipDistinctes: ips.size,
    paysDistincts: pays.size,
    comptesDistincts: noms.size,
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  /* Le ping de visite partage cette route pour rester dans la limite Vercel. */
  if (req.method === 'POST') {
    if (!journalConfigure()) { res.status(204).end(); return }
    const ctx = contexte(req)
    const session = sessionAdmin(req)
    const entree = {
      t: new Date().toISOString(),
      ip: ctx.ip,
      qui: session ? session.nom : '',
      p: String((req.query && req.query.p) || '/').slice(0, 120),
      pays: ctx.pays,
      ville: ctx.ville,
      ua: ctx.ua,
      ref: String(req.headers['referer'] || '').slice(0, 180),
      test: String((req.query && req.query.test) || '') === '1' || undefined,
    }
    try {
      await ecrire('visites', entree, PLAFOND_VISITES)
      res.status(204).end()
    } catch (e) {
      res.status(200).json({ enregistre: false, erreur: String(e.message || e).slice(0, 120) })
    }
    return
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST')
    res.status(405).json({ erreur: 'GET ou POST attendu' })
    return
  }

  if (!journalOuvert(req)) {
    res.status(403).json({ erreur: 'journal fermé : connecte-toi à la console (ou pose ADMIN_JETON)' })
    return
  }

  if (!journalConfigure()) { res.status(200).json({ configure: false }); return }

  const demande = String((req.query && req.query.journal) || 'visites')
  const journal = ['connexions', 'actifs'].includes(demande) ? demande : 'visites'

  try {
    const lignes = (await lire(journal)) || []
    const c = compter(lignes, journal === 'connexions' ? 'nom' : 'qui')
    res.status(200).json({
      configure: true,
      journal,
      ...c,
      [journal]: lignes.slice(0, 300),
    })
  } catch (e) {
    res.status(200).json({
      configure: true,
      journal,
      erreur: String(e.message || e).slice(0, 140),
      [journal]: [],
    })
  }
}
