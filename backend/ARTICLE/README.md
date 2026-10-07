# `/r/:slug` — page Étude d'une course

## ⛔ Cloisonnement

Cette page est **isolée**. Elle ne parle à personne d'autre dans le projet.

```
frontend/ARTICLE/Article.jsx     la page (front)
        │
        ├── backend/ARTICLE/backend.js      l'API (back)
        ├── backend/ARTICLE/turfFrance.js   tqqjour.php   (back)
        └── backend/ARTICLE/score.js        les calculs   (back)
```

### Elle n'importe QUE ces 3 fichiers

| Interdit | Pourquoi |
|---|---|
| `src/lib/quinte.js` | le moteur Quinté (`/quinte`) |
| `src/lib/turfFrance.js` | lu par `Admin.jsx` — **copié**, pas importé |
| `src/lib/score.js` | lu par d'autres — **copié**, pas importé |
| `src/lib/demoData.js` | le démo a été supprimé |
| `axios` | `fetch` natif suffit |
| `pro.casacourses.com` | retiré le 04/10/2026 |
| `Programme.jsx` / `Admin.jsx` / `QuinteGrille.jsx` | aucun lien |

> **Pourquoi des copies ?** Si un jour cette page a besoin de changer sa
> source, elle ne doit pas casser `/quinte` ni `Admin`. Les copies sont
> volontaires — **ne pas les factoriser**.

**Vérification :**

```powershell
Select-String -Path src\QUINTE\ARTICLE\Article.jsx -Pattern "casacourses|demoData|lib/quinte|axios"
# → uniquement des commentaires
```

---

## 📡 Les deux sources

### ① `backend.js` → l'API bahja

```
https://bahja-turf-api-production.up.railway.app
```

| Appel | Rôle | Bloquant ? |
|---|---|---|
| `GET /api/race/{date}_R{n}_C{m}` | la course + les partants | **oui** |
| `GET /api/turf/{id}` | les pronostics | non |
| `GET /api/programme/{date}` | la météo | non |

> ⚠ **Cette API est morte depuis le 04/10/2026** (`404 Application not found`).
> Tant qu'elle ne revient pas, **la page affiche « Cette course n'est pas
> disponible »**. C'est voulu : elle ne montre aucune course de remplacement.

### ② `turfFrance.js` → `tqqjour.php`

```
/tf/php/tqqjour.php?date=0     (proxy Vite)
https://www.turf-france.com/php/tqqjour.php?date=0   (direct)
```

`dateOffset` : `0` aujourd'hui · `-1` hier · `1` demain.

**turf-france n'envoie aucun en-tête CORS** (pas même un OPTIONS) → le proxy
`/tf` est **indispensable**. Il est défini dans `vite.config.js`.

⚠ **En production** il faut un reverse-proxy équivalent :

```nginx
location /tf/ { proxy_pass https://www.turf-france.com/; }
```

`reu.php` n'est **plus** utilisé : sans session il renvoie une page vide.
Seule `tqqjour.php` porte les 18 tableaux.

---

## 📋 Le format de l'URL

```
/r/r{reunion}-c{course}-{nom}-{date}-{hippodrome}

ex. /r/r1-c5-qatar-prix-de-l-arc-de-triomphe-2026-10-04-parislongchamp
        │  │ │                      │         │
        │  │ │                      │         └─ ignoré par le parseur
        │  │ └──────────────────────┴───────── la date fait foi
        │  └──────────────────────────────────────── le numéro de course
        └─────────────────────────────────────────── la réunion
```

`lireCible()` reconstruit `2026-10-04_R1_C5`. **Le nom et l'hippodrome du
slug sont décoratifs** — c'est la date qui compte.

---

## 📊 Les 18 lignes de « Top10 des Cotes de Références »

`LIGNES_TOPS` dans `Article.jsx` fixe l'ordre et l'intitulé.

**Une ligne vide reste affichée (`—`).** C'est la vérité : le site ne publie
pas ce tableau ce jour-là.

⚠ **Piège du 04/10/2026** — « Top Cotes Direct » et « Pour une place » étaient
vides. Un ancienrattrapage prenait la valeur de la ligne suivante et affichait
`Top Cotes Direct = 1 - 16 - 10 - 14`, qui est en réalité **Top Chevaux**.
`parseTqqJour()` ne le fait plus : cellule vide ⇒ tableau vide.

Trois synonymes sont normalisés :

| turf-france écrit | la clé est |
|---|---|
| `Top Drivers` | `topJockeys` |
| `Top Position` | `topCordes` |
| `Outsiders` | `outiders` |

---

## 🔢 `score.js`

| Fonction | R��tourne si on n'a rien |
|---|---|
| `pctPodium(p)` | `null` (affiché `—`, **jamais 0 %**) |
| `pctVictoire(p)` | `null` |
| `nb2e(p)` / `nb3e(p)` | `0` seulement s'il y a des courses |
| `nbCourses(p)` | `0` |
| `formeCourte(p)` | chaîne vide |
| `classerPartants(parts)` | l'ordre des n° de départ |

Un `null` s'affiche `—`. Un `0` veut dire « 0 %, on le sait ». La nuance est
délibérée : **ne jamais faire croire qu'un chiffre est mesuré quand il ne
l'est pas**.

---

## 🧪 Tester vite

```powershell
node -e "import('./backend/ARTICLE/turfFrance.js').then(async m=>{
  const t = await m.chargerTopsTurfFrance(0)
  console.log(Object.keys(t).length + ' tableaux')
  for (const [k,v] of Object.entries(t)) console.log(k.padEnd(20), v.join(' - ') || '(vide)')
})"
```

Puis, dans le navigateur :

```
http://localhost:3003/r/r1-c5-qatar-prix-de-l-arc-de-triomphe-2026-10-04-parislongchamp
```

Sans l'API, on doit voir **« Cette course n'est pas disponible »** — et rien
d'autre. Si on voit des chevaux, c'est qu'une fuite a été réintroduite.

---

## 📌 Le route

`src/App.jsx` :

```jsx
import Article from './QUINTE/ARTICLE/Article.jsx'
<Route path="/r/:slug"   element={<Layout><Article /></Layout>} />
<Route path="/race/:id" element={<Layout><Article /></Layout>} />
```

L'ancien `src/pages/Article.jsx` a été **supprimé**.