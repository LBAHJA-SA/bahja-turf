/* =============================================================================
 * tools/sorec-relais.mjs — LE DIRECT DE LA SOREC, DÉCALÉ, DEPUIS CE POSTE.
 *
 *   node tools/sorec-relais.mjs                 → http://localhost:5058/live.m3u8
 *   node tools/sorec-relais.mjs --decalage 90   → 90 s de retard
 *   node tools/sorec-relais.mjs --flux myStream_2 --port 5059
 *
 * ⚠ POURQUOI CE FICHIER EXISTE (24/10/2026)
 *
 *   Le direct de la SOREC n'est joignable QUE depuis le Maroc : mesuré le
 *   23/10, DNS ok mais TCP 80 en délai d'attente depuis Vercel, comme depuis
 *   deux relais publics. Notre site est hébergé à l'étranger → il ne peut pas
 *   le lire. Ce poste, lui, le lit.
 *
 *   Ce programme fait donc le seul travail qui manque : il TIRE le direct,
 *   garde les segments en mémoire, et les RESERT **en retard**. Le lecteur de
 *   la page ne voit qu'une playlist ordinaire — il ne sait pas qu'elle est
 *   décalée.
 *
 *   ⚠ POURQUOI UN DÉCALAGE, ET PAS LE DIRECT : le DVR de la SOREC ne garde
 *   que 30 s (3 segments de ~10 s, mesuré). Un « retour en arrière » de 60 s
 *   n'existe pas chez eux : il faut notre propre tampon. C'est ce tampon.
 *
 *   Ce n'est PAS un enregistrement : rien n'est écrit sur le disque. Les
 *   segments vivent en mémoire et sont jetés dès qu'ils sortent de la fenêtre
 *   (`--decalage` + 120 s).
 *
 *   Pour le voir depuis un autre appareil (téléphone), il faut exposer ce
 *   port : `cloudflared tunnel --url http://localhost:5058` (sans compte), ou
 *   `ngrok http 5058`. L'adresse obtenue se colle dans `/lives` (champ
 *   « Relais décalé »), elle est gardée dans le navigateur.
 *
 * ⚠ DEUX PIÈGES RENCONTRÉS LE 24/10, ET COMMENT ILS SONT TRAITÉS
 *
 *   1) LE SERVEUR REDÉMARRE LE FLUX SOUVENT. La variante change de nom
 *      (`chunklist_w296904028` → `chunklist_w1472708678`) et les numéros de
 *      segment REPARTENT : deux fichiers différents portaient `_2132`. Une
 *      playlist qui mélange les deux ne se lit pas. → on identifie un segment
 *      par son URL absolue, on lui donne un numéro interne, et un changement
 *      de variante VIDE le tampon (le décalage repart proprement).
 *   2) LE SERVEUR COUPE PAR MOMENTS (une requête sur dix expire). → une
 *      erreur de passage ne jette rien : on réessaie 2 s plus tard, le tampon
 *      reste en mémoire et la playlist continue d'être servie.
 * ========================================================================== */

import http from 'node:http'

/* ─────────────────────────────────────────────────────────── les réglages ── */

const arg = (nom, defaut) => {
  const i = process.argv.indexOf('--' + nom)
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : defaut
}

const DECALAGE = Math.max(0, Number(arg('decalage', '60')))   // secondes de retard
const PORT = Number(arg('port', '5058'))
const FLUX = arg('flux', 'OutStream1')                        // ou myStream_2
const BASE = 'http://sorec-streaming.archostechnology.net'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

/** Ce qu'on garde en mémoire : le décalage demandé + une marge de lecture. */
const RETENTION = DECALAGE + 120
/** Combien de segments dans la playlist servie (≈ 30 s de lecture). */
const FENETRE = 3
/** Toutes les combien de secondes on redemande la playlist de la SOREC. */
const PERIODE = 2000

/* ───────────────────────────────────────────────────────────── l'état ───── */

/** { id, url, duree, buf, fin, flux } — `fin` en secondes epoch (horloge locale). */
let segments = []
let numero = 0          // numéro interne, jamais réutilisé
let fluxCourant = 0     // incrémenté à chaque redémarrage du direct
let variante = ''
let passes = 0
let derniereErreur = ''
let dernierPassage = 0

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

/* ─────────────────────────────────────────────────────── la collecte ────── */

async function texte(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*', referer: BASE + '/' } })
  if (!r.ok) throw new Error('HTTP ' + r.status + ' sur ' + url)
  return r.text()
}

/** La variante (chunklist) du flux : la playlist maîtresse n'en donne qu'une. */
async function trouverVariante() {
  const maître = `${BASE}/live/${FLUX}/playlist.m3u8`
  const t = await texte(maître)
  const ligne = t.split('\n').map((x) => x.trim()).find((x) => x && !x.startsWith('#'))
  if (!ligne) throw new Error('playlist maîtresse vide')
  return new URL(ligne, maître).href
}

/** Un tour : on lit la variante, on télécharge ce qui manque, on date. */
async function tour() {
  passes += 1

  if (!variante) variante = await trouverVariante()

  let brut
  try {
    brut = await texte(variante)
  } catch (e) {
    /* la variante a pu expirer : on en redemande une et on réessaie une fois */
    variante = await trouverVariante()
    brut = await texte(variante)
  }

  const lignes = brut.split('\n').map((x) => x.trim())
  const liste = []
  let duree = 0
  for (const l of lignes) {
    if (l.startsWith('#EXTINF:')) duree = parseFloat(l.slice(8)) || 10
    else if (l && !l.startsWith('#')) {
      /* ⚠ l'identité d'un segment, c'est son NUMÉRO (`media_w…_2132.ts` → 2132),
         pas son URL : le nom de la variante change à CHAQUE requête (mesuré le
         24/10 — trois appels, trois `chunklist_w…` différents), donc l'URL ne
         dit rien de la position dans le temps. */
      liste.push({ nom: l, duree, idx: Number((/_(\d+)\.ts$/.exec(l) || [])[1] || 0) })
    }
  }
  if (!liste.length) throw new Error('variante sans segment')

  /* Le direct finit MAINTENANT : le dernier segment de la playlist se termine
     à l'instant du fetch. On remonte la liste pour dater chaque segment. */
  let fin = Date.now() / 1000
  for (let i = liste.length - 1; i >= 0; i--) {
    liste[i].fin = fin
    fin -= liste[i].duree
    liste[i].url = new URL(liste[i].nom, variante).href
  }

  const connus = new Map(segments.map((s) => [s.idx, s]))
  for (const s of liste) {
    if (connus.has(s.idx)) {
      /* on rafraîchit la date : la playlist de la SOREC peut glisser */
      connus.get(s.idx).fin = s.fin
      continue
    }
    const r = await fetch(s.url, { headers: { 'user-agent': UA, accept: '*/*' } })
    if (!r.ok) { log('segment ignoré', s.nom, r.status); continue }
    const buf = Buffer.from(await r.arrayBuffer())
    segments.push({ id: ++numero, idx: s.idx, url: s.url, duree: s.duree, buf, fin: s.fin, flux: fluxCourant })
  }

  segments.sort((a, b) => a.fin - b.fin)

  /* On jette ce qui est plus vieux que la fenêtre de rétention. */
  const limite = Date.now() / 1000 - RETENTION
  segments = segments.filter((s) => s.fin > limite)
}

async function boucle() {
  try {
    await tour()
    derniereErreur = ''
    dernierPassage = Date.now()
  } catch (e) {
    if (e.message !== derniereErreur) log('ERREUR', e.message)
    derniereErreur = e.message
  }
  setTimeout(boucle, PERIODE)
}

/* ─────────────────────────────────────────────────────────── le serveur ── */

/** La playlist servie : les segments qui finissent avant (maintenant − décalage). */
function playlist() {
  const bord = Date.now() / 1000 - DECALAGE
  const dispo = segments.filter((s) => s.fin <= bord)
  if (dispo.length < 2) return null
  const garde = dispo.slice(-FENETRE)
  const cible = Math.max(11, Math.ceil(Math.max(...garde.map((s) => s.duree))))
  const lignes = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-TARGETDURATION:' + cible,
    '#EXT-X-MEDIA-SEQUENCE:' + garde[0].id,
    '#EXT-X-DISCONTINUITY-SEQUENCE:0',
  ]
  let precedent = null
  for (const s of garde) {
    if (precedent !== null && s.flux !== precedent) lignes.push('#EXT-X-DISCONTINUITY')
    lignes.push('#EXTINF:' + s.duree.toFixed(3) + ',', 'seg/' + s.id + '.ts')
    precedent = s.flux
  }
  lignes.push('')
  return lignes.join('\n')
}

const serveur = http.createServer((req, res) => {
  const u = new URL(req.url || '/', 'http://localhost')
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'X-Bahja-Relais': 'sorec',
  }

  if (u.pathname === '/' || u.pathname === '/etat') {
    const bord = Date.now() / 1000 - DECALAGE
    const dispo = segments.filter((s) => s.fin <= bord)
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({
      flux: FLUX,
      decalage: DECALAGE,
      segments: segments.length,
      secondesEnMemoire: Math.round(segments.reduce((a, s) => a + s.duree, 0)),
      prets: dispo.length,
      retardReel: dispo.length ? Math.round(Date.now() / 1000 - dispo[dispo.length - 1].fin) : null,
      pret: dispo.length >= 2,
      dernierPassage: dernierPassage ? new Date(dernierPassage).toISOString() : null,
      erreur: derniereErreur || null,
      playlist: '/live.m3u8',
    }, null, 2))
    return
  }

  if (u.pathname === '/live.m3u8') {
    const p = playlist()
    if (!p) {
      res.writeHead(503, { ...cors, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end('tampon en cours de remplissage — ' + segments.length + ' segments en mémoire, ' +
        'il en faut pour ' + DECALAGE + ' s de retard')
      return
    }
    res.writeHead(200, { ...cors, 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-store' })
    res.end(p)
    return
  }

  if (u.pathname.startsWith('/seg/')) {
    const id = Number((u.pathname.match(/^\/seg\/(\d+)\.ts$/) || [])[1])
    const s = segments.find((x) => x.id === id)
    if (!s) {
      res.writeHead(404, { ...cors, 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('segment sorti du tampon')
      return
    }
    res.writeHead(200, {
      ...cors,
      'Content-Type': 'video/MP2T',
      'Content-Length': s.buf.length,
      'Cache-Control': 'public, max-age=600',
    })
    res.end(s.buf)
    return
  }

  res.writeHead(404, { ...cors, 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('rien ici — voir /live.m3u8')
})

serveur.listen(PORT, () => {
  log(`relais SOREC — flux ${FLUX} · décalage ${DECALAGE} s · http://localhost:${PORT}/live.m3u8`)
  log(`état : http://localhost:${PORT}/etat`)
  log(`pour un autre appareil : cloudflared tunnel --url http://localhost:${PORT}`)
  boucle()
})
