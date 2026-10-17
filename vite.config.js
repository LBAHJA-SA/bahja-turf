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
  ptf: "https://horse-racing-api.paris-turf.com",
};
/** La clé de l'API ParisTurf (publique : livrée dans son bundle). Elle vit ici,
 *  côté serveur, pour la même raison qu'en production : l'API refuse le
 *  domaine Vercel par son en-tête `Origin` (403 au preflight, mesuré le
 *  17/10/2026). Le relais serveur n'envoie pas cet en-tête. */
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
 *  (mesuré le 17/10/2026 : HTTP/1.1 → 403 « Just a moment… », HTTP/2 → 200).
 *  Même rôle que `getHttp2` dans api/_proxy.js : le développement et la
 *  production doivent se comporter pareil. */
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
    req.on("response", (h) => { statut = h[":status"] || 0; type = h["content-type"] || ""; });
    req.setEncoding("utf8");
    req.on("data", (d) => { corps += d; });
    req.on("end", () => terminer(() => resolve({ statut, type, corps })));
    req.on("error", (e) => terminer(() => reject(e)));
    req.end();
  });
}

/** Le même corps que api/_proxy.js : /api/<nom>/<suite> -> <origine>/<suite> */
async function relayer(label, cheminComplet, res) {
  try {
    // le sous-chemin peut venir du chemin (/api/tf/tqqjour.php) ou de la
    // requete (?p=tqqjour.php) : c'est la forme que produit le rewrite Vercel.
    const u = new URL(cheminComplet, "http://localhost");
    const depuisRequete = u.searchParams.get("p") || "";
    const chemin = depuisRequete
      ? "/" + depuisRequete.replace(/^\/+/, "")
      : u.pathname.replace(new RegExp("^/api/" + label), "") || "/";
    if (!chemin.startsWith("/") || chemin.startsWith("//")) throw new Error("chemin refuse");
    /* ⚠ 07/10/2026 : la query string fait partie de la cible. reu.php
     *   ?view=program&date=… sans la query retombait sur la page d'accueil
     *   (3 935 o) au lieu du programme (132 165 o). `api/_proxy.js` le fait
     *   déjà pour la production ; on aligne le middleware de dev dessus. */
    const query = u.search && u.search !== "?" ? u.search : "";
    const cible = ORIGINES[label] + chemin + query;
    const entetes = {
      "user-agent": UA,
      "accept-language": "fr-FR,fr;q=0.9",
      accept:
        label === "ptf"
          ? "application/json"
          : "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      ...(label === "ptf" ? { "x-api-key": CLE_PTF } : {}),
    };
    let body = null;
    let statut = 502;
    let typeContenu = "text/html; charset=utf-8";
    try {
      /* `ptf` : HTTP/2 + une origine que la clé autorise (Cloudflare défie
         HTTP/1.1 et les requêtes sans origine — voir api/_proxy.js). */
      if (label === "ptf") {
        const entetesPtf = { ...entetes, origin: "http://localhost", referer: "http://localhost/" };
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
        body = await r.text();
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
    res.setHeader("Content-Type", typeContenu);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Bahja-Proxy", label);
    res.statusCode = statut;
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
        const u = new URL(req.url || "/", "http://localhost");
        const m = /^\/api\/(ptf|pt|tf|eq)$/.exec(u.pathname);
        if (!m) return next();
        relayer(m[1], "/api/" + m[1] + "/" + (u.searchParams.get("p") || ""), res);
      });
      server.middlewares.use((req, res, next) => {
        const m = /^\/api\/(ptf|pt|tf|eq)(\/.*)?$/.exec(req.url || "");
        if (!m) return next();
        relayer(m[1], req.url, res);
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