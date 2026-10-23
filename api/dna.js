/* /api/dna → LE MOTEUR DNA COURSE (RACE_DNA_ENGINE).
 *
 * La page `/dna` ne calcule rien elle-même : elle envoie les partants au
 * moteur, qui les confronte à son archive (86 886 courses) et rend les zones
 * A/B/C/D, les paires, les trios et la lecture de marché.
 *
 * ⚠ LE MOTEUR N'EST PAS DANS CE DÉPÔT
 *   C'est un service Python (Flask) qui ouvre une base SQLite de 84 Mo. Il ne
 *   peut pas vivre dans une fonction Vercel (taille) ni être embarqué dans le
 *   bundle. Cette route est donc un RELAIS — exactement comme `/api/tf` relaie
 *   turf-france et `/api/eq` relaie equidia.
 *
 *   En local, `vite.config.js` fait la même chose : il parle d'abord au moteur
 *   du poste (127.0.0.1:5057), puis à cette adresse-ci si le poste ne répond pas.
 *
 * ⚠ L'ADRESSE VIENT DE L'ENVIRONNEMENT — ET DE NULLE PART AILLEURS
 *   Variable `DNA_ENGINE_URL` (Vercel → Settings → Environment Variables).
 *   Tant qu'elle est vide, cette route répond 503 avec un message clair : la
 *   page affiche alors le programme et les partants, et dit que le moteur n'est
 *   pas hébergé en ligne. On ne pointe PAS vers un service tiers par défaut.
 *
 *   EN LIGNE, l'adresse posée est celle de l'app Modal `dna-course-engine`
 *   (recette : `dna-course/modal_app.py`, `python -m modal deploy modal_app.py`).
 *   En local on ne passe même pas par ici : `vite.config.js` parle d'abord au
 *   moteur du poste (127.0.0.1:5057).
 */
const MOTEUR = String(process.env.DNA_ENGINE_URL || '').replace(/\/+$/, '')

/* le moteur ouvre l'archive au premier appel : on lui laisse le temps */
export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'POST')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'POST attendu' }))
    return
  }

  if (!MOTEUR) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({
      error: 'moteur DNA non hébergé en ligne',
      detail: "Le moteur RACE_DNA_ENGINE tourne sur le poste (python backend/server.py, port 5057). " +
        'En ligne, il faut son adresse : variable DNA_ENGINE_URL.',
    }))
    return
  }

  /* Vercel parse le JSON quand le Content-Type le dit ; sinon on lit le flux. */
  let corps = req.body
  if (corps == null || typeof corps === 'string') {
    try {
      const morceaux = []
      for await (const m of req) morceaux.push(m)
      corps = Buffer.concat(morceaux).toString('utf8')
    } catch (e) {
      corps = ''
    }
  }
  if (typeof corps === 'string') {
    try { corps = JSON.parse(corps) } catch (e) { corps = null }
  }
  if (!corps || typeof corps !== 'object' || !Array.isArray(corps.participants) || !corps.participants.length) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'participants manquants' }))
    return
  }

  try {
    const r = await fetch(MOTEUR + '/api/dna/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(corps),
      signal: AbortSignal.timeout(55000),
    })
    const texte = await r.text()
    res.statusCode = r.status
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json; charset=utf-8')
    res.setHeader('X-Bahja-Proxy', 'dna')
    res.end(texte)
  } catch (e) {
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('X-Bahja-Proxy', 'dna-ERREUR')
    res.end(JSON.stringify({
      error: 'moteur DNA injoignable',
      detail: String((e && e.message) || e),
    }))
  }
}
