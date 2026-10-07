# Les pages — 3 pages, chacune son lien et ses dossiers

> Règle : **les pages ne partagent ni moteur d’analyse, ni source d’affichage.**
> La navigation (menu, bouton Analyse) est autorisée : elle ne transporte
> aucune donnée — chaque page recharge tout depuis SA source. `src/App.jsx`
> ne fait que associer chaque URL à sa page.
> associer chaque URL à sa page.

| Page | Lien | Affichage | Données | Sources |
|---|---|---|---|---|
| Programme | `/` (`/articles` = alias, même page) | `frontend/PROGRAMME/` | `backend/PROGRAMME/` | API bahja → casacourses. **Toutes les courses** (Quinté en premier, ⭐ si publié — jamais deviné). **Sans démo.** |
| Article | `/r/:slug` (`/race/:id` = alias, même page) | `frontend/ARTICLE/` | `backend/ARTICLE/` | reu.php detail (course EXACTE + 19 colonnes + aptitude + tops + arrivée) → tqqjour → API bahja |
| Quinté | `/quinte` | `frontend/QUINTE/` | `backend/QUINTE/` | presse + archive locale |

## Pourquoi des copies ?

`backend/QUINTE/quinte.js` est une **copie volontaire** de `src/lib/quinte.js`.
Si la page doit changer sa source, elle ne casse rien d’autre.
**Ne pas la factoriser.**

## L'archive — nos courses, chez nous

`backend/ARTICLE/archive.js` (localStorage) + `data/reu/*.json`
(collecteur `node tools/archive-reu.mjs AAAA-MM-JJ`).
Ordre de lecture : archive locale → fichiers → site.
Le site n'est visité que pour les courses absentes.

## `src/lib/quinte.js` — pour les outils uniquement

`tools/daily.mjs`, `tools/test-auto.mjs`, `tools/test-carriere.mjs`
importent `../src/lib/quinte.js`. **Aucune page** ne l'importe :
les pages ont leurs copies dans `backend/<PAGE>/`.
