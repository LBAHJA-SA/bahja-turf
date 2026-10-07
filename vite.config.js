import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* ──────────────────────────────────────────────────────────────────────────
 * LES 3 PROXIES — local ET production, le MEME code.
 *
 *   /api/pt  →  pronostics-turf.info   la Synthèse de la presse
 *   /api/tf  →  turf-france.com         reu.php, tqqjour.php
 *   /api/eq  →  equidia.fr              le marché (rapp_evol = la cote)
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
};
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

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
    const r = await fetch(cible, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "fr-FR,fr;q=0.9",
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
    });
    const body = await r.text();
    res.setHeader(
      "Content-Type",
      r.headers.get("content-type") || "text/html; charset=utf-8"
    );
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Bahja-Proxy", label);
    res.statusCode = r.status;
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
      // Vercel ne route que le chemin EXACT (/api/eq) : son rewrite transforme
      // /api/eq/<suite> en /api/eq?p=<suite>. On accepte donc les DEUX formes
      // en local comme en ligne — meme code, meme comportement.
      server.middlewares.use((req, res, next) => {
        const u = new URL(req.url || "/", "http://localhost");
        const m = /^\/api\/(pt|tf|eq)$/.exec(u.pathname);
        if (!m) return next();
        relayer(m[1], "/api/" + m[1] + "/" + (u.searchParams.get("p") || ""), res);
      });
      server.middlewares.use((req, res, next) => {
        const m = /^\/api\/(pt|tf|eq)(\/.*)?$/.exec(req.url || "");
        if (!m) return next();
        relayer(m[1], req.url, res);
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
});