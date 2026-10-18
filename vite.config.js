import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execFile } from "node:child_process";
import http2 from "node:http2";

/* ──────────────────────────────────────────────────────────────────────────
 * LES 3 PROXIES — local ET production, le MEME code.
 *
 *   /api/pt  →  pronostics-turf.info   la Synthèse de la presse
 *   /api/tf  →  turf-france.com         reu.php, tqqjour.php
 *   /api/eq  →  equidia.fr              le marché (rapp_evol = la cote)
 *   /api/ptf →  horse-racing-api.paris-turf.com   la carrière des chevaux
 *
 * ⚠ POURQUOI /api ET PAS /pt, /tf, /eq
 *   Ces trois-là ne sont pas de vrais fichiers du projet : en production,
 *   `vercel.json` leur répondait « index.html » (385 o, HTTP 200) — donc
 *   échec SILENCIEUX. Le 05/10 on l'a vu en vrai : la presse, le marché et
 *   turf-france étaient injoignables depuis bahja-turf.vercel.app.
 *
 *   `/api/*` est le standard Vercel : le fichier existe réellement, donc
 *   (a) en production la fonction Serverless répond ;
 *   (b) en dev ce middleware répond exactement la même chose.
 *   → ce qui marche en local marche en ligne. Même code, même chemin.
 *
 *   (Pronostics-turf et turf-france n'envoient AUCUN en-tête CORS : sans
 *   proxy, le navigateur refuse. D'où le proxy, des deux côtés.)
 * ────────────────────────────────────────────────────────────────────────── */
const ORIGINES = {
  pt: "https://www.pronostics-turf.info",
  tf: "https://www.turf-france.com",
  eq: "https://www.equidia.fr",
  /* LE VEINARD — « quotidien hippique, un tuyau et une dernière minute pour
   * chaque quinté ». Son site ne donne AUCUN en-tête CORS : la page ne peut
   * pas le lire en direct (mesuré le 18/10/2026). On relaie. */
  lv: "https://www.leveinard.com",
  /* YOUTUBE — le canal qui FEUILLETTE les journaux chaque matin (la revue de
   * presse en vidéo : « 05 cinq journaux », « La Gazette des Courses »,
   * « Le Veinard avec Courses par Courses »). Ses pages n'ont pas de CORS :
   * on relaie, et la page lit l'état `ytInitialData` de la chaîne. */
  yt: "https://www.youtube.com",
  ptf: "https://horse-racing-api.paris-turf.com",
  /* LA GAZETTE DES COURSES — c'est un WordPress, et son REST est OUVERT :
   * `/wp-json/wp/v2/posts?categories=…` rend le papier du jour EN TEXTE (le
   * coup de cœur, l'outsider, la dernière heure… et le commentaire du cheval).
   * ⚠ Le site n'envoie AUCUN en-tête CORS (mesuré le 18/10/2026) : on relaie. */
  gz: "https://www.lagazettedescourses.fr",
};
/** La clé de l'API ParisTurf (publique : livrée dans son bundle). Elle vit ici,
 *  côté serveur, pour la même raison qu'en production : l'API tient une liste
 *  blanche d'origines PAR CLÉ et refuse le domaine Vercel (« Origin … is not
 *  allowed for this API key », mesuré le 17/10/2026 — le préflight passe, c'est
 *  le GET qui tombe). Le relais déclare l'origine que la clé autorise.
 *
 *  ⚠ En production ce n'est PAS ce middleware qui sert `/api/ptf` : c'est
 *  `api/ptf.js`, en runtime edge (Cloudflare défie tout client Node depuis
 *  Vercel — détail en tête de ce fichier-là, et au §21.7 de AGENTS.md). */
const CLE_PTF = "cd347f33-9dc3-4294-865e-f5d6ee7558ac";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/** curl système en repli (12/10/2026) : turf-france black-hole la pile TLS
 * de Node depuis ce PC (curl passe, Node stall). Ne sert que si fetch
 * échoue ; sinon comportement inchangé. */
function curlTexte(url, delai = 55000) {
  return new Promise((resolve) => {
    execFile(process.platform === "win32" ? "curl.exe" : "curl",
      ["-sS", "-m", String(Math.ceil(delai / 1000)), "-A", UA, "--compressed", url],
      { timeout: delai, maxBuffer: 12 * 1024 * 1024 }, (err, stdout) => {
        if (err) resolve(null);
        else resolve(String(stdout || ""));
      });
  });
}

/** Un GET en HTTP/2 — la seule façon de traverser Cloudflare depuis un serveur
 *  Node (mesuré le 17/10/2026 : HTTP/1.1 → 403 « Just a moment… », HTTP/2
 *  depuis un poste de travail → 200). Le relais de production, lui, n'est pas
 *  Node : c'est `api/ptf.js`, en runtime edge — c'est ce que Cloudflare laisse
 *  passer depuis Vercel. Ici on reste en Node, sur la machine de l'utilisateur. */
function getHttp2(url, entetes, delai = 20000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = http2.connect(u.origin);
    let fini = false;
    const terminer = (f) => {
      if (fini) return;
      fini = true;
      clearTimeout(minuteur);
      try { client.close(); } catch (e) { /* déjà fermé */ }
      f();
    };
    const minuteur = setTimeout(() => terminer(() => reject(new Error("délai dépassé"))), delai);
    client.on("error", (e) => terminer(() => reject(e)));
    const req = client.request({
      ":method": "GET",
      ":path": u.pathname + u.search,
      ":authority": u.host,
      ":scheme": "https",
      ...entetes,
    });
    let statut = 0;
    let type = "";
    let corps = "";
    let emplacement = "";
    req.on("response", (h) => {
      statut = h[":status"] || 0;
      type = h["content-type"] || "";
      emplacement = h["location"] || "";
    });
    req.setEncoding("utf8");
    req.on("data", (d) => { corps += d; });
    req.on("end", () => terminer(() => resolve({ statut, type, corps, emplacement })));
    req.on("error", (e) => terminer(() => reject(e)));
    req.end();
  });
}

/* ─────────────────────────────────────────────────────────── LE REPLAY ──────
 * Mêmes règles qu'`api/ptf.js` (§ la vidéo) : /api/replays/{id}/video répond
 * 302 vers un m3u8 chez vide.io, que le CDN sert SANS en-tête CORS. On réécrit
 * donc les playlists pour que le lecteur ne parle qu'à nous.
 * ────────────────────────────────────────────────────────────────────────── */
const HOTES_MEDIA = [".vide.io", "horse-racing-api.paris-turf.com"];
const estPlayliste = (type, url) => /mpegurl|m3u8/i.test(type || "") || /\.m3u8(\?|$)/i.test(url || "");

function hoteAutorise(url) {
  try {
    const h = new URL(url).host;
    return HOTES_MEDIA.some((x) => h === x || h.endsWith(x));
  } catch { return false; }
}

function reecrirePlaylist(texte, base, origine) {
  const absolue = (x) => origine + "/api/ptf?hls=" + encodeURIComponent(new URL(x, base).href);
  return String(texte).split("\n").map((ligne) => {
    const t = ligne.trim();
    if (!t) return ligne;
    if (t.startsWith("#")) {
      return /URI="/.test(t) ? t.replace(/URI="([^"]+)"/g, (_, x) => 'URI="' + absolue(x) + '"') : ligne;
    }
    return absolue(t);
  }).join("\n");
}

const ENTETES_MEDIA = {
  "user-agent": UA,
  "accept-language": "fr-FR,fr;q=0.9",
  accept: "*/*",
  "x-api-key": CLE_PTF,
  origin: "http://localhost",
  referer: "http://localhost/",
  "sec-ch-ua": '"Chromium";v="141", "Not?A_Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "video",
  "sec-fetch-mode": "no-cors",
  "sec-fetch-site": "cross-site",
};

async function relayerVideo(u, res, origine) {
  const entetes = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=600",
    "Accept-Ranges": "bytes",
  };
  try {
    const id = u.searchParams.get("v");
    if (id) {
      /* la playlist maîtresse : l'API renvoie un 302, http2 ne le suit pas */
      const r = await getHttp2(
        ORIGINES.ptf + "/api/replays/" + encodeURIComponent(id) + "/video",
        ENTETES_MEDIA
      );
      if (r.statut !== 302 || !r.emplacement) {
        res.statusCode = r.statut || 502;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(r.statut === 404 ? "replay introuvable" : "replay indisponible (" + r.statut + ")");
        return;
      }
      const p = await fetch(r.emplacement, { headers: { "user-agent": UA, accept: "*/*" } });
      const texte = await p.text();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      for (const [k, v] of Object.entries(entetes)) res.setHeader(k, v);
      res.end(reecrirePlaylist(texte, r.emplacement, origine));
      return;
    }

    const cible = u.searchParams.get("hls");
    if (!hoteAutorise(cible)) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("hôte refusé");
      return;
    }
    const m = await fetch(cible, { headers: { "user-agent": UA, accept: "*/*" } });
    const type = m.headers.get("content-type") || "application/octet-stream";
    /* ⚠ ne JAMAIS réécrire une page d'erreur comme si c'était une playlist :
       un 403 du CDN arrivait déguisé en playlist (le corps était du HTML). */
    if (!m.ok) {
      res.statusCode = m.status;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("média indisponible (" + m.status + ")");
      return;
    }
    const playlist = estPlayliste(type, cible);
    const buf = Buffer.from(await m.arrayBuffer());
    res.statusCode = m.status;
    res.setHeader("Content-Type", playlist ? "application/vnd.apple.mpegurl" : type);
    for (const [k, v] of Object.entries(entetes)) res.setHeader(k, v);
    res.end(playlist ? reecrirePlaylist(buf.toString("utf8"), cible, origine) : buf);
  } catch (e) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("replay : " + (e && e.message ? e.message : e));
  }
}

/**
 * `base=1` — sert la page d'origine SOUS notre origine.
 * Les chemins relatifs de la page (« /php/… », « //hôte/images/… ») doivent
 * se résoudre chez l'ORIGINE, pas chez nous. Un <base> le fait pour le
 * document ET pour tout ce qu'il charge.
 */
function injecterBase(html, origine) {
  const s = String(html);
  if (!/<head[^>]*>/i.test(s)) return s;
  return s.replace(/<head([^>]*)>/i, `<head$1><base href="${origine}/">`);
}

/**
 * LE NOM DE LA SOURCE NE DOIT JAMAIS APPARAÎTRE (règle de l'utilisateur,
 * 17/10/2026) : il s'affiche « LBAHJA-TURF ».
 *
 * On réécrit le TEXTE AFFICHÉ, jamais les URL :
 *   · le contenu des <script> / <style> est laissé INTACT (il porte les URL) ;
 *   · dans une balise, seuls title / alt / value / placeholder / content sont
 *     touchés, et seulement s'ils ne contiennent aucun « / » (donc pas une
 *     adresse) ;
 *   · un mot précédé de « / . : » est une URL → intact ; précédé d'une LETTRE
 *     (« RépartiTurf-France »), on met une espace : « Réparti LBAHJA-TURF ».
 *
 * ⚠ Réservé à `base=1` (§22) : les parseurs cherchent des marqueurs LITTÉRAUX
 *   (« Pronostic, une analyse Turf-France et IA ») — relire la page en mode
 *   habillé les casserait. Même code que `api/_proxy.js`.
 */
function habiller(html) {
  const MOT = /(^|[^/.:])turf[\s-]?france(\.com)?/gi;
  const HABIT = (t) => String(t).replace(MOT, (m, avant) => (/[\w]/.test(avant) ? avant + " " : avant) + "LBAHJA-TURF");
  return String(html)
    .split(/(<script[\s\S]*?<\/script\s*>|<style[\s\S]*?<\/style\s*>)/gi)
    .map((bloc) => {
      if (/^<(script|style)/i.test(bloc)) return bloc;            // intact
      return bloc.split(/(<[^>]*>)/).map((part) => {
        if (!part) return part;
        if (part[0] === "<") {
          return part.replace(/\b(title|alt|value|placeholder|content)=(["'])([\s\S]*?)\2/gi,
            (m, attr, q, val) => (val.includes("/") ? m : `${attr}=${q}${HABIT(val)}${q}`));
        }
        return HABIT(part);
      }).join("");
    })
    .join("");
}

/**
 * Décode un corps HTML/JSON selon le VRAI jeu de caractères annoncé.
 *
 * ⚠ POURQUOI (18/10/2026) : `Response.text()` décode TOUJOURS en UTF-8. La page
 *   de la revue de presse est en windows-1252 : « Assiduité » devenait
 *   « Assiduit� » (l'octet 0xE9 remplacé par U+FFFD — l'information est perdue
 *   et rien en aval ne peut la retrouver).
 *
 *   Ordre de décision :
 *     1. le charset est DÉCLARÉ dans l'en-tête → on le respecte ;
 *     2. sinon on essaie l'UTF-8 en mode strict — s'il passe, c'est de l'UTF-8 ;
 *     3. sinon windows-1252 (le latin-1 des journaux hippiques).
 */
function decoderTexte(octets, type = "") {
  const declare = /charset\s*=\s*["']?([\w-]+)/i.exec(type || "");
  if (declare) {
    try { return new TextDecoder(declare[1]).decode(octets); } catch (e) { /* charset inconnu */ }
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(octets);
  } catch (e) {
    return new TextDecoder("windows-1252").decode(octets);
  }
}

/** Le même corps que api/_proxy.js : /api/<nom>/<suite> -> <origine>/<suite> */async function relayer(label, cheminComplet, res, origine = "") {
  try {
    // le sous-chemin peut venir du chemin (/api/tf/tqqjour.php) ou de la
    // requete (?p=tqqjour.php) : c'est la forme que produit le rewrite Vercel.
    const u = new URL(cheminComplet, "http://localhost");
    /* la vidéo d'un replay : sa propre forme d'URL (?v= / ?hls=) */
    if (label === "ptf" && (u.searchParams.get("v") || u.searchParams.get("hls"))) {
      await relayerVideo(u, res, origine || u.origin);
      return;
    }
    const depuisRequete = u.searchParams.get("p") || "";
    const chemin = depuisRequete
      ? "/" + depuisRequete.replace(/^\/+/, "")
      : u.pathname.replace(new RegExp("^/api/" + label), "") || "/";
    if (!chemin.startsWith("/") || chemin.startsWith("//")) throw new Error("chemin refuse");
    /* ⚠ 07/10/2026 : la query string fait partie de la cible. reu.php
     *   ?view=program&date=… sans la query retombait sur la page d'accueil
     *   (3 935 o) au lieu du programme (132 165 o). `api/_proxy.js` le fait
     *   déjà pour la production ; on aligne le middleware de dev dessus.
     * ⚠ 17/10/2026 : quand `?p=` porte DÉJÀ la query (la forme Vercel), le
     *   `u.search` de la requête n'est que l'enveloppe « ?p=… » : l'ajouter
     *   collait « ?p=… » à la FIN de la query de la cible (donc `mode=standard
     *   ?p=…`). `api/_proxy.js` ne le faisait pas — les deux transports
     *   divergeaient. Même règle des deux côtés. */
    const query = depuisRequete ? "" : (u.search && u.search !== "?" ? u.search : "");
    const cible = ORIGINES[label] + chemin + query;
    const entetes = {
      "user-agent": UA,
      "accept-language": "fr-FR,fr;q=0.9",
      accept:
        label === "ptf"
          ? "application/json, text/plain, */*"
          : "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      ...(label === "ptf" ? { "x-api-key": CLE_PTF } : {}),
    };
    let body = null;
    let statut = 502;
    let typeContenu = "text/html; charset=utf-8";
    try {
      /* `ptf` : HTTP/2 + l'origine que la clé autorise + les en-têtes d'un vrai
         navigateur — le même profil d'appel que `api/ptf.js`, qui sert en
         ligne (voir §21.7 de AGENTS.md : Cloudflare défie tout client Node
         depuis Vercel, et une partie des requêtes depuis un poste). */
      if (label === "ptf") {
        const entetesPtf = {
          ...entetes,
          origin: "http://localhost",
          referer: "http://localhost/",
          "sec-ch-ua": '"Chromium";v="141", "Not?A_Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
        };
        let r = await getHttp2(cible, entetesPtf);
        if (/Just a moment|_cf_chl_opt|__cf_chl/i.test(r.corps.slice(0, 4000))) {
          try {
            const r2 = await fetch(cible, {
              headers: { ...entetesPtf, Origin: "http://localhost", Referer: "http://localhost/" },
              redirect: "follow",
              signal: AbortSignal.timeout(25000),
            });
            const c2 = await r2.text();
            if (!/Just a moment|_cf_chl_opt|__cf_chl/i.test(c2.slice(0, 4000))) {
              r = { statut: r2.status, type: r2.headers.get("content-type"), corps: c2 };
            }
          } catch (e) { /* on garde le premier résultat */ }
        }
        body = r.corps;
        statut = r.statut;
        typeContenu = r.type || "application/json; charset=utf-8";
      } else {
        const r = await fetch(cible, {
          headers: entetes,
          redirect: "follow",
          signal: AbortSignal.timeout(25000),
        });
        body = decoderTexte(await r.arrayBuffer(), r.headers.get("content-type"));
        statut = r.status;
        typeContenu = r.headers.get("content-type") || typeContenu;
      }
    } catch (e) {
      /* curl est un repli utile pour turf-france ; il ne sait pas HTTP/2 ici,
         donc il ne peut rien pour `ptf` (Cloudflare le défierait). */
      body = label === "ptf" ? null : await curlTexte(cible);
      if (body == null) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-Bahja-Proxy", label + "-ERREUR");
        res.statusCode = 502;
        res.end(`proxy ${label} : ${e && e.message ? e.message : e}`);
        return;
      }
      statut = 200;
    }
    /* ⚠ le corps est maintenant une CHAÎNE (décodée du bon charset) et
     * `res.end` l'écrit en UTF-8 : l'en-tête doit donc dire utf-8, quel que
     * soit le charset de l'origine — sinon le navigateur relit des octets
     * UTF-8 comme du latin-1 (« AssiduitÃ© »). */
    if (/^(text\/|application\/json)/i.test(typeContenu)) {
      typeContenu = typeContenu.replace(/;\s*charset=[^;]*/i, "") + "; charset=utf-8";
    }
    res.setHeader("Content-Type", typeContenu);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Bahja-Proxy", label);
    res.statusCode = statut;
    /* `base=1` : la page d'origine est servie SOUS notre origine (un aperçu
     * dans la page, §22). Sans <base>, ses chemins relatifs (« /php/… »,
     * « //hôte/images/… ») se résoudraient chez NOUS et la page sortirait nue. */
    if (u.searchParams.get("base") === "1" && /text\/html/i.test(typeContenu)) {
      body = injecterBase(habiller(body), ORIGINES[label]);
    }
    res.end(body);
  } catch (e) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Bahja-Proxy", label + "-ERREUR");
    res.statusCode = 502;
    res.end(`proxy ${label} : ${e && e.message ? e.message : e}`);
  }
}

function proxiesApi() {
  return {
    name: "proxies-api",
    configureServer(server) {
      // 1) Fichiers statiques /data/* — handler explicite pour éviter le SPA fallback
      server.middlewares.use(async (req, res, next) => {
        const u = new URL(req.url || "/", "http://localhost");
        if (u.pathname.startsWith("/data/")) {
          const fs = await import("node:fs");
          const path = await import("node:path");
          const filePath = path.join("public", u.pathname);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath);
            const ext = path.extname(filePath).toLowerCase();
            const mime = ext === ".json" ? "application/json" : 
                         ext === ".js" ? "application/javascript" :
                         ext === ".css" ? "text/css" : "text/plain";
            res.setHeader("Content-Type", mime + "; charset=utf-8");
            res.setHeader("Cache-Control", "no-store");
            res.statusCode = 200;
            res.end(content);
            return;
          }
        }
        next();
      });

      // Vercel ne route que le chemin EXACT (/api/eq) : son rewrite transforme
      // /api/eq/<suite> en /api/eq?p=<suite>. On accepte donc les DEUX formes
      // en local comme en ligne — meme code, meme comportement.
      server.middlewares.use((req, res, next) => {
        const base = "http://" + (req.headers.host || "localhost:3003");
        const u = new URL(req.url || "/", base);
        const m = /^\/api\/(ptf|pt|tf|lv|yt|gz|eq)$/.exec(u.pathname);
        if (!m) return next();
        /* La requête ENTIÈRE : `relayer` reconnaît les trois formes —
         *   /api/tf?p=…            (Vercel) · /api/ptf?v=… ou ?hls=… (la vidéo).
         * On ne pré-construit plus « /api/tf/<p> » : ça mélangeait la query
         * de la cible et celle de l'enveloppe (voir la note dans `relayer`). */
        relayer(m[1], req.url, res, base);
      });
      server.middlewares.use((req, res, next) => {
        const m = /^\/api\/(ptf|pt|tf|lv|yt|gz|eq)(\/.*)?$/.exec(req.url || "");
        if (!m) return next();
        relayer(m[1], req.url, res, "http://" + (req.headers.host || "localhost:3003"));
      });
      /* /api/couple : les courses du jour pour la page Couplé. C'est une
       * FONCTION (elle lit reu.php + prog-{date}.json sur le disque), pas
       * un proxy. En production Vercel la trouve dans `api/couple.js` ;
       * ici on l'appelle directement, sinon la page aurait des données
       * différentes en local et en ligne — exactement le piège du §18.2. */
      server.middlewares.use(async (req, res, next) => {
        const u = new URL(req.url || "/", "http://localhost");
        if (u.pathname !== "/api/couple") return next();
        try {
          const mod = await server.ssrLoadModule("/api/couple.js");
          await mod.default(req, res);
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ erreur: String(e && e.message ? e.message : e) }));
        }
      });
      /* /api/archive-push : le navigateur RENVOIE son archive au disque,
       * SANS CLIC (10/10/2026 — fin des « deux archives » qui divergent).
       * POST JSON {date: record} → fusionné dans data/synthese.json avec
       * les mêmes règles sûres que tools/merge-archive.mjs (disque gagne
       * pour l'arrivée et le ticket, sauf MANUEL explicite). Répond le
       * rapport de fusion. DEV UNIQUEMENT : en production Vercel cette
       * route n'existe pas (404, ignoré en silence par la page). */
      server.middlewares.use((req, res, next) => {
        const u = new URL(req.url || "/", "http://localhost");
        if (u.pathname !== "/api/archive-push" || req.method !== "POST") return next();
        let taille = 0;
        const morceaux = [];
        req.on("data", (c) => {
          taille += c.length;
          if (taille > 2 * 1024 * 1024) { res.statusCode = 413; res.end("trop gros"); req.destroy(); return; }
          morceaux.push(c);
        });
        req.on("end", async () => {
          try {
            const obj = JSON.parse(Buffer.concat(morceaux).toString("utf8"));
            if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("forme invalide");
            const { writeFileSync, mkdirSync } = await import("node:fs");
            const { default: path } = await import("node:path");
            mkdirSync("data", { recursive: true });
            const tmp = "data/archive-push.json";
            writeFileSync(tmp, JSON.stringify(obj));
            const mod = await import("./tools/merge-archive.mjs");
            const r = mod.fusionnerImport(tmp);
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ ok: r.ok, rapport: r.rapport }));
          } catch (e) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ ok: false, erreur: String((e && e.message) || e) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), proxiesApi()],
  server: {
    port: 3003,
    host: true,
    strictPort: true,
    watch: { ignored: ["**/archives/**", "**/data-cache.json", "**/*.json"] },
  },
  publicDir: "public",
});