# Les pages — 4 pages dans le menu, plus la page d'une course et la console

> Règle : **les pages ne partagent ni moteur d'analyse, ni source d'affichage.**
> La navigation (menu, boutons) est autorisée : elle ne transporte
> aucune donnée — chaque page recharge tout depuis SA source. `src/App.jsx`
> ne fait qu'associer chaque URL à sa page.
> Seul autre morceau partagé : **`src/temps.js`** — l'affichage de l'heure, tout
> en GMT (18/10/2026). Il ne transporte aucune donnée, il ne lit qu'une date.

| Page | Lien | Affichage | Données | Sources |
|---|---|---|---|---|
| **Analyse course** | `/` (`/analyse` = alias) | `frontend/ANALYSE/` | `backend/ANALYSE/` | reu.php (programme des réunions) → turf-france / tqqjour → api bahja → casacourses. Programme, partants, études ; `/chevaux` = les fiches cheval. |
| **Quinté** | `/quinte` | `frontend/QUINTE/` | `backend/QUINTE/` | la presse (`pronostics-turf.info`) + le marché (Equidia) + l'archive locale (`data/`) |
| **Presse** | `/presse` | `frontend/PRESSE/` | `backend/PRESSE/` | ① déclarations et ② analyse du jour (`api.equidia.fr`) · ③ revue de presse (`pronostics-turf.info`, 18 journaux × 8 chevaux) · ④ **le papier du jour, en texte** (le journal qui le publie) puis **les articles des journaux** (Paris-Turf, Le Veinard) · ⑤ **les journaux en vidéo** : la chaîne qui les feuillette chaque matin |
| **Article** (une course) | `/r/:slug` (`/race/:id` = alias) | `frontend/ARTICLE/` | `backend/ARTICLE/` | reu.php detail (course EXACTE + 19 colonnes + aptitude + tops + arrivée) → tqqjour → API bahja. **Pas dans le menu** : on y arrive en cliquant une course. |

## La console d'administration — hors menu, invisible

| Page | Lien | Affichage | Données |
|---|---|---|---|
| **Administration** | `/admin` (avec `?cle=…`) | `frontend/ADMIN/` | `backend/ADMIN/` |

- **Jamais dans le bandeau** : `src/Entete.jsx` ne la connaît pas.
- **Sans clé, elle renvoie à l'accueil** — un visiteur qui tape `/admin` voit la
  page d'une adresse inconnue, sans un mot d'explication.
- La clé se pose une fois par l'URL : `/admin?cle=<ta clé>` (6 caractères),
  puis elle est mémorisée dans le navigateur et retirée de l'URL.
- Elle prépare le **futur login** : les comptes et les pages de chacun. Rien
  n'est encore filtré à l'entrée du site.

Détail complet : AGENTS.md §25.

## Pourquoi des copies ?

`backend/QUINTE/quinte.js` est une **copie volontaire** de `src/lib/quinte.js`.
Si la page doit changer sa source, elle ne casse rien d'autre.
**Ne pas la factoriser.**

Même règle pour `backend/PRESSE/donnees.js` et `backend/ANALYSE/parisTurf.js` :
chacun porte SA lecture des sources, avec ses propres commentaires de mesure.

## L'archive — nos courses, chez nous

`backend/ARTICLE/archive.js` (localStorage) + `data/reu/*.json`
(collecteur `node tools/archive-reu.mjs AAAA-MM-JJ`).
Ordre de lecture : archive locale → fichiers → site.
Le site n'est visité que pour les courses absentes.

## Les relais (`/api/…`) — qui va où

Aucune de ces sources n'envoie d'en-tête CORS, et certaines refusent les clients
non-navigateur : **la page ne parle qu'à sa propre origine**. Le relais est le
même en développement (`vite.config.js`) et en ligne (`api/*.js`, edge).

| Relais | Origine | Pour qui |
|---|---|---|
| `/api/pt` | `www.pronostics-turf.info` | la revue de presse (Quinté **et** Presse) |
| `/api/tf` | `www.turf-france.com` | le programme et les fichiers de course (Analyse, Article) |
| `/api/ptf` | `horse-racing-api.paris-turf.com` | les carrières (Analyse) **et les articles de Paris-Turf** (Presse) |
| `/api/eq` | `www.equidia.fr` | le marché en direct (Quinté) |
| `/api/lv` | `www.leveinard.com` | **les actualités du Veinard** (Presse) |
| `/api/yt` | `www.youtube.com` | **la revue de presse en vidéo** — la chaîne qui feuillette les journaux (Presse) |
| `/api/gz` | `www.lagazettedescourses.fr` | **le papier du jour, en texte** — son WordPress expose un REST ouvert (Presse) |

⚠ Le relais **décode et re-sert en UTF-8** (`decoderTexte`) : sans cela,
pronostics-turf.info (windows-1252) affichait « Assiduit� », « L'Ind�pendant »,
« La D�p�che ».

## `src/lib/quinte.js` — pour les outils uniquement

`tools/daily.mjs`, `tools/test-auto.mjs`, `tools/test-carriere.mjs`
importent `../src/lib/quinte.js`. **Aucune page** ne l'importe :
les pages ont leurs copies dans `backend/<PAGE>/`.
