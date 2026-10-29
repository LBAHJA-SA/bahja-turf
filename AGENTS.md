# AGENTS.md — Méthode Quinté (méthode de l'utilisateur)

> Cette méthode est celle de l'utilisateur. Elle a été arrêtée avec lui.
> **Ne jamais la modifier sans lui demander.** Toujours l'appliquer telle quelle.

---

## 1. Le flux de travail

L'utilisateur travaille **par lots de 4 chevaux**.

```
Il donne 4 chevaux (avec la carrière Geny complète)
  → j'analyse les 4
  → je rends 3 retenus + 1 écarté
  → je dis lequel des 3 est le MAILLON FAIBLE (celui qui n'arrivera pas)
  → on passe au lot suivant de 4
```

**Il faut toujours répondre à ces 4 questions, dans cet ordre :**

1. **Les 3 retenus** — qui, et **pourquoi** (faits concrets)
2. **L'écarté** — qui, et **pourquoi** (faits concrets)
3. **3 ou 2 ?** — décision nette, pas de « ça dépend »
4. **Le maillon faible parmi les 3** — celui qui ne peut pas finir dans les 5 premiers

---

## 2. Les 2 jeux (à la fin de chaque lot)

```
Jeu 1  =  les 3 qui passent l'analyse
Jeu 2  =  les 2 forts + le cheval écarté
```

Exemple réel (03/10 ParisLongchamp, lot = 4 · 8 · 9 · 13) :

```
Analyse  →  retenus 13 - 4 - 9      écarté 8
Maillon faible → 9
Jeu 1  =  13 - 9 - 4     (les 3 retenus)
Jeu 2  =  13 - 4 - 8     (les 2 forts + l'écarté)
```

**Logique :**
- Jeu 1 = « l'analyse a raison »
- Jeu 2 = « je me suis trompé en écartant le 8 »

**Le maillon faible ne sort JAMAIS du Jeu 1** — il y reste comme outsider couvert.

---

## 3. Ce que la musique donne / ne donne pas

La musique (`2p4p1p2p3p5p4p(25)2p1p`) donne **2 choses seulement** :

| Le chiffre | La position (0 = non partant / plus de 9e) |
|---|---|
| **La lettre** | `p` plat · `t` trot · `h` haies · `s` steeple |

**Lecture : de gauche à droite = du plus récent au plus ancien.**
`(25)` = changement d'année.

Elle **ne donne PAS** : distance · terrain · type de course · niveau · corde.
→ **Il faut les demander à l'utilisateur** (copie Geny de la fiche cheval).

---

## 4. Les 6 critères d'analyse

| # | Critère | Poids | Comment |
|---|---|---|---|
| 1 | **FORME UTILE** | 22 % | mêmes points, mais **seulement les courses à ±400 m du jour** (05/10/2026). Une musique hors-distance est du bruit : repli global si < 2 courses utiles. Poids `1/(1+i·0.55)` vers le passé. |
| 2 | **DISTANCE** | 22 % | écart avec la distance du jour : ≤100 m → 10 · ≤200 → 8 · ≤400 → 5 · ≤600 → 3 · sinon 0 |
| 3 | **PISTE** | 18 % | hippodrome + **sens** (droite / gauche). 60 % lieu + 40 % sens |
| 4 | **NIVEAU** | 13 % | VH du jour vs VH de ses 2 dernières courses (pas vs le leader !) |
| 5 | **TERRAIN** | 13 % | gazon bon/souple compatible · PSF / lourd / collant pénalisé |
| 6 | **CORDE** | 12 % | n° de départ : ≤6 → 10 · ≤11 → 8 · ≤15 → 5 · ≥16 → 3 |

**Le score GLOBAL ne sert qu'à trier. La décision vient des filtres ci-dessous.**

---

## 5. Les 3 filtres (éliminations)

Pour un **Handicap Classe 1 sur 2500 m** :

```
① ≥ 2 courses ≥ 2200 m dans les 5 dernières      → ÉLIMINATOIRE
② score de FORME ≥ 3.5                            → INFORMATIF depuis le 05/10/2026 (plus d’élimination)
③ il ne monte pas de niveau (+1.5 max vs le VH de ses 2 dernières courses) → ÉLIMINATOIRE
```

> 05/10/2026 : ② n’élimine plus. La musique est le plus souvent hors-contexte
> (ni même distance, ni même piste, ni même sens) : 4 faux négatifs en 4 courses
> (11e 2e, 7e 5e, 17e 4e, 8e 3e). Le flag reste calculé et archivé — il ne classe plus.
> §6 : on écarte sur le PHYSIQUE, jamais sur la forme.

**Ces filtres sont à recalibrer selon la course du jour**
(ex. : un maiden à 1600 m n'a pas les mêmes seuils qu'une Classe 1 à 2500 m).

---

## 6. ⭐ LA RÈGLE CENTRALE — physique > forme

> **« La forme est du bruit. Le physique est un fait. »**

**On écarte sur le PHYSIQUE, jamais sur la forme.**

Un Quinté à 18 partants se gagne sur :
**cordes + distance + piste**, pas sur la musique.

**Conséquences :**

- ❌ Un cheval avec `1p1p1p2p` mais qui n'a jamais couru la distance du jour → **sort**
- ❌ Un cheval avec forme `4p4p3p2p6p` mais qui a couru 3200 m aujourd'hui à 2500 m → **reste**
- ❌ `1p4p1p` de **octobre 2025** sur un cheval qui depuis fait `5 · 13 · 9 · 7` → **la musique est périmée**

**Pénalités du maillon faible :**

| Problème | Points |
|---|---|
| CORDE ≥ 16 / 18 | 3 |
| DISTANCE jamais pratiquée | 3 |
| PISTE 3+ courses à gauche (ou l'inverse) | 2 |
| AGE / niveau d'expérience | 2 |

---

## 7. Ce qu'il ne faut JAMAIS faire

- ❌ Ne pas couper un cheval **seulement** parce que sa forme est mauvaise
- ❌ Ne pas garder un cheval qui a une **bonne musique sur la mauvaise distance / terrain**
- ❌ Ne pas comparer le VH d'un cheval au **premier du départ** (ça élimine tout le monde)
- ❌ Ne pas inventer de données absentes
- ❌ Ne pas proposer de sélection alternative à la place de **3 ou 2**
- ❌ Ne pas décider **3** s'il n'y a pas **3 chevaux qui passent 3/3**

---

## 8. Le marché (cotes)

Les cotes arrivent **~3 heures avant le START**. Avant, `cote_pmu = null` pour tous.

Tant qu'elles ne sont pas là :
- utiliser la **Récapitulative de la presse** (`pronostics-turf.info`) comme proxy
- l'afficher à part, **sans la mélanger au score**
- **re-lancer l'analyse dès que les cotes tombent** (le marché peut changer le maillon faible)

### 8.1 ⭐ EQUIDIA — la seule source de marché AVANT le départ (05/10/2026)

`equidia.fr` rend sa page **Angular complète** : tout l'état du marché est collé
dans `<script id="serverApp-state" type="application/json">`.

```
https://www.equidia.fr/courses/{YYYY-MM-DD}/R{n}/C{m}
```

| Clé dans le JSON | Ce qu'elle donne |
|---|---|
| `courses/{date}/R{n}/C{m}/pari_simple` | **par partant** : `num_partant`, `rapp_evol` (**la cote**), `rapp_ref` (**l'ouverture**), `tendance_signe` (+ − =), `favori`, `history[]`, `heure_rap_evol` |
| `…/rapports` | les rapports officiels, `rapport_definitif.combinaisons` |
| `v2/courses/{date}/R{n}/C{m}` | les partants |
| `quinte.redirection` | l'ancre Quinté |

**Pourquoi celle-là** :

| Source | Marché avant le départ ? |
|---|---|
| `online.turfinfo.api.pmu.fr/rest/client/61/programme/{DDMMYYYY}` | ❌ seulement une « cote probable » synthétique |
| `pro.casacourses.com/api/race/{id}` | ❌ `odd_numeric` **uniquement sur les courses terminées** |
| **`equidia.fr`** | ✅ **la vraie cote du marché, en direct** |

- pas de login, pas de CORS en direct → **proxy Vite `/eq`** (`vite.config.js`).
- `history[]` n'a **aucun horodatage** (30 entrées glissantes fixes) → impossible
  de rejouer un état à 07 h. Le test le plus proche d'un run « jour même » est
  donc `rapp_ref` (l'ouverture).
- **validation croisée** : 63 partants appariés sur les 4 Quintés de l'archive,
  `Pearson(log cote_casa, log cote_equidia) = 0.888`. Même marché, horodatage
  différent. Le drapeau `favori` est cohérent sur les 5 courses.

---

## 9. Sources de données — ce qui marche et ce qui ne marche pas

| Source | État |
|---|---|
| `bahja-turf-api` `/api/race/{date}_R{n}_C{m}` | ✅ **musique, jockey, entraîneur, poids, valeur, age, stats carrière** |
| idem `/api/programme/{date}` | ✅ meetings + courses |
| `pro.casacourses.com/api/programme` | ✅ **Quinté réel** via `available_bet_types.includes('sorec_quinte')` |
| `pro.casacourses.com/api/programme` | ✅ `meeting.reunion_code` + l'index de la course dans `meeting.races` → la clé `{date}_R{n}_C{m}` (`cleEquidia`) |
| `equidia.fr` (§8.1) | ✅ **LE MARCHÉ EN DIRECT** avant le départ — `rapp_evol` = la cote |
| `online.turfinfo.api.pmu.fr` `programme/{JJMMAAAA}` | ✅ **le terrain** (`penetrometre.intitule`), **le sens** (`corde`), la distance, la discipline, le `categorieParticularite` — **tout l'historique** (§14.6) |
| idem `…/R{n}/C{m}/participants` | ✅ **le VH** (`handicapValeur`), la corde de départ (`placeCorde`), la place (`ordreArrivee`), le nom, la musique — **par cheval et par course** (§14.6) |
| idem `…/participants/{n}/performances-detaillees` | ❌ **HTTP 420** (l'historique détaillé d'un cheval est fermé) |
| `pronostics-turf.info` | ✅ Récapitulative presse (parser : ignorer la 1re cellule, elle contient un `<img alt="Pronostic N">`) |
| `horse-racing-api.paris-turf.com/api/` (§21) | ✅ **TOUT SUR LE CHEVAL** : programme du jour, partants, **CARRIÈRE COMPLÈTE** (date · hippodrome · discipline · distance · sens · terrain · catégorie · jockey · poids/VH · fer D/F/P · œillères · place · chrono · cote · commentaire · replay). En-tête `X-API-KEY` — clé **publique** mais **RESTREINTE PAR ORIGINE** (`paris-turf.com` et `http://localhost` seulement) |
| idem, depuis la page en ligne | ❌ 403 « Origin … is not allowed for this API key » (le *préflight* passe, le GET non) → **relais obligatoire** |
| idem, depuis un serveur | ❌ 403 Cloudflare pour **tout client Node**, y compris une fonction Vercel (Node **et** HTTP/2) ; ✅ **le runtime EDGE de Vercel passe**, ~30-56 % du temps → `/api/ptf` réessaie 4× (§21.7) |
| `www.paris-turf.com` (HTML) | ❌ 403 Cloudflare (h1 comme h2) ; l'app « ParisTurf Live » lit exactement la même API |
| `turfomania.fr` | ❌ **403 Cloudflare** sur fetch, tableaux vides dans le navigateur |
| `geny.com` | ❌ 404 (redesign) |
| endpoint cheval du backend | ❌ n'existe pas |

→ **L'utilisateur n'est plus la seule source** : le terrain, le sens et le VH de
chaque course passée se **collectent** (§14.6). La carrière détaillée à la main
(§12.3) ne sert plus que de secours.

---

## 10. Fichiers utiles

- `C:\bahja-TURF\tools\verdict.mjs` - les 3 filtres + verdict
- `C:\bahja-TURF\tools\maillon.mjs` - le maillon faible
- `C:\bahja-TURF\tools\analyse.mjs` - le score global 6 critères
- ~~`C:\bahja-TURF\tools\table.mjs`~~ - **SUPPRIMÉ le 05/10/2026** : lisait l'API
  `bahja-turf-api-production.up.railway.app` (HTTP 404). Le tableau des partants
  vient désormais de `pro.casacourses.com` : `tools/table.mjs` n'a plus d'objet.
- ~~`C:\bahja-TURF\tools\form.mjs`~~ - **SUPPRIMÉ le 05/10/2026** : même API morte.
  Le score de forme est dans `src/lib/quinte.js` (`scoreForme`, `scoreCheval`).

Toutes les courses : **Quinté Global PMU France uniquement** (pas le Maroc pour ce travail).

---

## 11. ⭐ LA MÉTHODE DE DÉSORDRE — le découpage de la Synthèse

> Méthode écrite de la main de l'utilisateur. **C'est la méthode de référence du désordre.**

### 11.1 La Synthèse (liste verticale, ~15 chevaux)

Exemple réel donné par l'utilisateur :

```
6 · 10 · 16 · 8 · 7 · 4 · 3 · 13 · 14 · 5 · 12 · 9 · 2 · 1 · 15
```

C'est l'ordre de la **Synthèse** (les cotes), pas la Récapitulative de la presse.

### 11.2 Le découpage en blocs

La Synthèse est coupée en **5 blocs**. Chaque bloc a sa propre règle :

```
     B1          B2          B3        B4          B5
  ┌────┬────┐  ┌────┬────┐  ┌────┐   ┌────┐   ┌────┬────┬────┬────┐
  │ 6  │ 10 │  │ 16 │ 8  │  │ 4  │   │ 14 │   │ 12 │ 9  │    │    │
  ├────┼────┤  ├────┼────┤  ├────┤   ├────┤   ├────┼────┼────┼────┤
  │ 7  │ 3  │  │ 13 │ 5  │  │ 8  │   │ 1  │   │ 15 │ 11 │    │    │
  └────┴────┘  └────┴────┘  └────┘   └────┘   └────┴────┴────┴────┘
   2 ou 3       2 ou 3      1 oblig.   1          1 ou 0
```

| Bloc | Forme | Nb chevaux | Règle |
|---|---|---|---|
| **B1** | 2 × 2 | 4 | **prendre 2 ou 3** |
| **B2** | 2 × 2 | 4 | **prendre 2 ou 3** |
| **B3** | 1 colonne | 2 | **1 obligatoire** — pas le choix, il y en a toujours un |
| **B4** | 1 colonne | 2 | **prendre 1** |
| **B5** | large | 4 | **1 ou 0** |

### 11.3 Combien de chevaux au total

```
minimum  = 2 + 2 + 1 + 1 + 0  =  6
maximum  = 3 + 3 + 1 + 1 + 1  =  9
```

→ **Jeu entre 6 et 9 chevaux.**

### 11.4 Cas pratique de l'utilisateur

```
Date     : 24/09/2026   R1C1
Arrivée  : 13 - 8 - 10 - 4 - 16
```

Répartition des 5 arrivants :

| Arrivé | Bloc |
|---|---|
| 10 | B1 |
| 13 · 8 · 16 | B2 |
| 4 | B3 (obligatoire) |
| — | B4 |
| — | B5 |

**Sélection qui couvre le 5/5 désordre :** 2 de B1 + **3** de B2 + **1** de B3 = **6 chevaux**.

→ Les blocs **B4 et B5 sont l'assurance** : ils ne servent que quand B1/B2/B3 ne couvrent pas.

### 11.5 Règles d'application

1. **Toujours passer par B3 en premier** — il est obligatoire, c'est l'ancre du jeu.
2. **B1 et B2 : 2 par défaut, 3 quand le marché est mou / la course ouverte.**
3. **B4 : 1 systématique.**
4. **B5 : 1 ou 0** — le 1 seulement si un cheval de B5 a une configuration physique irréprochable.
5. **On ne prend JAMAIS les 4 d'un bloc 2×2.**
6. L'ordre à l'intérieur d'un bloc est celui de la Synthèse (les cotes).

### 11.6 La grille couleur — structure confirmée

L'utilisateur travaille avec une **grille à couleurs**. Les blocs sont lus **colonne par colonne**.

Exemple réel : **03/10/2026 ParisLongchamp R1C4** (les 18 partants)

```
  ┌────┬────┬────┬────┬────┬────┬────┬────┬────┐
  │  4 │  8 │  6 │ 18 │ 16 │  2 │ 14 │ 12 │ 10 │
  │ 🟢 │ 🟢 │ 🔵 │ 🔵 │ 🟡 │ 🟣 │ 🔴 │ 🔴 │ 🔴 │
  ├────┼────┼────┼────┼────┼────┼────┼────┼────┤
  │ 13 │  9 │ 11 │  3 │  5 │  1 │ 17 │  7 │ 15 │
  │ 🟢 │ 🟢 │ 🔵 │ 🔵 │ 🟡 │ 🟣 │ 🔴 │ 🔴 │ 🔴 │
  ├────┼────┼────┼────┼────┼────┼────┼────┼────┤
  │  3 │    │  2 │    │  1 │  1 │    0 ou 1    │   ← combien on prend
  └────┴────┴────┴────┴────┴────┴────┴────┴────┘
```

| Zone | Couleur | Colonnes | Chevaux | **On prend** |
|---|---|---|---|---|
| **B1** | 🟢 vert | 1 – 2 | 4, 13, 8, 9 | **3** |
| **B2** | 🔵 bleu | 3 – 4 | 6, 11, 18, 3 | **2** |
| **B3** | 🟡 jaune | 5 | 16, 5 | **1** |
| **B4** | 🟣 violet | 6 | 2, 1 | **1** |
| **B5** | 🔴 rouge | 7 – 9 | 14, 17, 12, 7, 10, 15 | **0 ou 1** |

```
total = 3 + 2 + 1 + 1 + (0 ou 1)  =  7 ou 8 chevaux
```

**La structure est identique à celle du 24/09** (2 blocs de 2 colonnes, puis 2 colonnes
simples, puis la queue). Seul le décompte varie : le 24/09 c'était « 2 ou 3 » partout.

**Lecture** : la Synthèse (ordre des cotes) se lit **en colonnes**, chaque colonne = 2 chevaux.
On **fusionne** les colonnes 2 par 2 pour former les blocs 2×2.

### 11.7 Règle d'or du découpage

> **Ne jamais dépasser le nombre écrit dans la ligne du bas.**
> Le « 3 » sous le vert oblige à prendre **exactement 3** des 4 chevaux verts,
> même si l'analyse en valide 4.

C'est la contrainte qui fait la force de la méthode : elle interdit de sur-selecter
dans un bon bloc et force à aller chercher dans le bloc suivant.

### 11.8 Le « 1 obligatoire » du bloc B3

> Citation de l'utilisateur :
> **« 1 obligatoire, parce que dans la plupart des courses un cheval de ce bloc
> arrive, et le plus souvent il arrive dans les trois premiers. »**

Donc **B3 n'est pas une zone à choisir — c'est une zone à vérifier.**

| | |
|---|---|
| Le bloc | **B3** (🟡 jaune) |
| Contenu | rangs 9 – 10 de la Synthèse |
| Règle | **1 cheval, obligatoire** |
| Raison | c'est celui qui arrive le plus souvent dans le **top 3** |

**Conséquence pratique :** le cheval de B3 entre dans le jeu **sans discussion**.
On ne le retire jamais pour le remplacer par un cheval de B4 ou B5 — même si
l'analyse physique le condamne. C'est le pilier du désordre.

---

### 11.9 ⚠️ CORRECTION — les groupes se font sur les positions PRESSE (P), pas sur les cotes

> Les sections 11.1 à 11.8 décrivent la **grille colorée** de l'utilisateur, classée par **cotes**.
> **La méthode officiellement affichée par l'application** classe sur
> **la Synthèse de la presse** = positions **P1 … P18**.
> **Ce n'est pas le même ordre. Ne jamais mélanger les deux.**

Texte officiel affiché dans l'application :

```
MA MÉTHODE — cinq groupes, un quota chacun.
Le moteur remplit les quotas : le ticket est fixé, il ne se modifie pas à la main.

  G1 · P1-P4    3/2 ou 3
  G2 · P5-P8    2/2 ou 3
  G3 · P9-P10   1/1 ou 2
  G4 · P11-P12  1/1 ou 2
  G5 · P13-P20  1/1
```

> « Les boîtes se lisent **en travers** : ligne du haut puis ligne du bas, comme sur le carnet.
> G1 deux ou trois, G2 deux ou trois, G3 un, G4 un, G5 selon le carnet.
> **Le moteur remplit les minimums puis place les deux derniers dans la case la plus
> forte qui reste** — G2, G3, G4 ou G5, selon le carnet. Tout est étiqueté. »

| Groupe | Positions presse | Nb cases | **Quota** |
|---|---|---|---|
| **G1** | P1 – P4 | 4 | **3** (ou 2) |
| **G2** | P5 – P8 | 4 | **2** (ou 3) |
| **G3** | P9 – P10 | 2 | **1 obligatoire** (ou 2) |
| **G4** | P11 – P12 | 2 | **1** (ou 2) |
| **G5** | P13 – P20 | 4 – 8 | **1** |

```
minimum = 3 + 2 + 1 + 1 + 1  =  8
maximum = 3 + 3 + 2 + 2 + 1  = 11
```

---

### 11.10 Lecture de la grille officielle

```
  ┌───────────────┬───────────────┬─────────┬─────────┬───────────────┐
  │ G1 · P1-P4    │ G2 · P5-P8    │   G3    │   G4    │ G5 · P13-P20  │
  ├────┬────┬────┬┼────┬────┬────┬┼────┬────┼────┬────┼────┬────┬────┬──┤
  │  P1│  P2│  P3││  P5│  P6│  P7││ P9 │ P10│ P11│ P12│ P13│ P14│ P15│ …
  ├────┼────┼────┼┼────┼────┼────┼┼────┼────┼────┼────┼────┼────┼────┼──┤
  │  P4│ …  │ …  ││  P8│ …  │ …  ││ …  │ …  │ …  │ …  │    │ …  │    │   │
  └────┴────┴────┴┴────┴────┴────┴┴────┴────┴────┴────┴────┴────┴────┴───┘
```

- **Lecture en travers** : ligne du haut (P1, P2, P3, P5, P6, P7, P9, P11, P13…) puis ligne du bas (P4, P8…).
- **Case verte = sélectionnée**, case grise = non retenue.
- **Le quota est compté automatiquement.** Il ne se modifie pas à la main.

---

### 11.11 Les 4 exemples de l'utilisateur (vérifiés)

| Date | Hippodrome | Discipline | Arrivée | G1 | G2 | G3 | G4 | G5 | Bilan |
|---|---|---|---|---|---|---|---|---|---|
| 01/10 | Auteuil | Steeple | 7 · 1 · 10 · 5 · 9 | 3 | 3 | 1 | 1 | 1 | **5/5** ✅ |
| 30/09 | Laval | Attelé | 5 · 9 · 7 · 14 · 15 | 3 | 2 | 1 | 1 | 1 | **5/5** ✅ |
| 29/09 | Chantilly | Plat | 1 · 9 · 15 · 2 · 4 | 3 | 2 | 1 | 1 | 1 | **5/5** ✅ |
| 28/09 | Enghien | Attelé | 15 · 4 · 14 · 5 · 7 | 3 | 2 | 1 | 1 | 1 | **3/5** ❌ |

**Sur Enghien, les 2 perdus (5 et 7) étaient dans des cases GRISES** (non sélectionnées).
→ **L'erreur est toujours « mauvais cheval dans le groupe », jamais « mauvais groupe ».**
Le découpage G1–G5 est bon, c'est le remplissage qui se joue.

---

### 11.12 Le « 1 obligatoire » de G3 (P9 – P10)

> « *1 obligatoire, parce que dans la plupart des courses un cheval de ce bloc arrive,
> et le plus souvent il arrive dans les trois premiers.* »

Le cheval de G3 entre **sans discussion**. On ne le remplace jamais par un cheval
de G4 ou G5, même si l'analyse physique le condamne.

**Pourquoi G3 est obligatoire :** la grille impose un quota par groupe. Sauter G3,
c'est laisser un trou dans la couverture des positions presse — et le désordre se joue
justement sur ces positions.

---

### 11.13 ⭐ LA DISPOSITION DU CARNET — confirmé le 04/10/2026 (2 courses)

> **La ligne du haut porte la parité du n° P1, dans l'ordre de la presse.
> La ligne du bas porte l'autre parité, dans l'ordre de la presse.**

- Les groupes G1..G5 (positions presse) et leurs quotas **ne changent pas**.
  Seule la disposition suit le carnet papier. Chaque case affiche `P·G`
  (ex. `P1·G1`) : la couleur = le groupe, la place = la presse.
- 04/10 (P1 = 1, impair) → haut : `1 9 11 15 7 5 3 13` · bas : `14 16 8 10 12 2 4 6`.
- 03/10 (P1 = 4, pair) → haut : `4 8 6 18 16 2 14 12 10` · bas : `13 9 11 3 5 1 17 7 15`.

### 11.14 ⭐ PRÉCISION 04/10 — « P » = numéro de CASE (instruction utilisateur)

> « 16, P4, G1 » + « G1 = P1 P2 P3 P4 » : les P de la grille sont les
> NUMÉROS DE CASES (colonnes : P1,P2 | P3,P4 | …), pas les rangs presse.

- **G1 = cases P1-P4** = {1, 14, 9, 16} le 04/10 · **G2 = cases P5-P8** = {11, 8, 15, 10} ·
  G3 = cases P9-P10 · G4 = cases P11-P12 · G5 = cases P13+.
- Quotas inchangés (3/2/1/1/1) : le moteur prend les meilleurs scores **dans chaque bloc**.
- Le badge affiche `P<case>·<groupe>` (ex. le 16 → `P4·G1`).
- Rangs presse : ils ordonnent les chevaux dans les lignes + portent les STATS.
  Quand la parité alterne (03/10), blocs et rangs presse coïncident.
- Stats (Statistiques + `computeStats`) : restent en rangs PRESSE — jamais de mélange.

---

### 11.15 📊 Mesure de référence — 30 Quintés de septembre 2026, classement par COTE

*(ordre de grandeur seulement — ce n'est PAS l'ordre de la méthode)*

| Plage de cotes | ≥1 dans le TOP5 | ≥1 dans le TOP3 | arrivants / course |
|---|---|---|---|
| 1–4 | **100 %** | **97 %** | **2.40** |
| 5–8 | **93 %** | 67 % | **1.60** |
| 9–10 | **40 %** | 23 % | 0.43 |
| 11–12 | 30 % | 17 % | 0.37 |
| 13–18 | 20 % | 7 % | 0.20 |

Plafond « prendre les N premiers par les cotes » :

```
Top-6  →  7 %      Top-10 → 57 %
Top-7  → 27 %      Top-11 → 70 %
Top-8  → 37 %      Top-12 → 80 %
Top-9  → 47 %      Top-15 → 100 %
```

**⚠️ Le piège :** si on prend simplement les *meilleurs* de chaque groupe
(les 3 premiers de G1, les 2 premiers de G2…) on plafonne à **10 %** de 5/5,
contre **37 %** pour un Top-8 brut. Perdre le 4ᵉ de G1 coûte très cher,
parce que G1 fournit 2.40 arrivants par course.

> **C'est exactement pour ça que l'analyse physique sert : choisir QUELS 3 des 4 de G1.**
> Le groupe crée la contrainte, l'analyse remplit le groupe.

**Plafond réaliste :** 8 chevaux bien choisis → **45–57 %** de 5/5 · 12 chevaux → **80 %**.

### 11.16 🚫 ESSAI REFUSÉ — les quotas ne se modifient PAS (05/10/2026)

> **Règle fermée.** Les quotas `3-2-1-1-1` viennent de dix ans de méthode et
> d'expertise. **On n'y touche JAMAIS**, quel que soit le score affiché.
> Le seul travail permis est **le choix du cheval à l'intérieur d'un bloc**.

Un essai a été fait le 05/10 : `4-1-2-0-0` (7 chevaux, G1 et G3 pleins) puis
`4-2-2-1-0` (9 chevaux), sur la mesure de `tools/quota-sim.mjs`.

```
quotas                   01  02  03  04   TOTAL
actuel  3-2-1-1-1         3   3   2   3     11/20
4-2-2-1-0  (9 chevaux)   4   3   4   4     15/20   ← écart de +4, mais aucune 5/5
4-1-2-0-0  (7 chevaux)   4   2   4   4     14/20   ← écart de +3, aucune 5/5
```

**Pourquoi l'essai a été refusé, en deux lignes :**

1. **Aucun scénario n'atteint 5/5.** Déplacer les quotas change le score global
   mais pas la nature du problème : l'écart se fait sur `n°11` (G2), `n°7` (G4),
   `n°17` (G5), `n°10` (G2) — des blocs entiers qu'aucun quota ne rattrape.
2. **On a modifié une règle qui n'appartient pas au moteur.** La séparation
   P1-P4 / P5-P8 / P9-P10 / P11-P12 / P13+ est la donnée d'entrée de la méthode.
   La changer casse la méthode pour gagner deux points sur quatre courses.

**Ce que l'essai a révélé d'utile — c'est le vrai sujet :**

`tools/g1.mjs` montre qu'à l'intérieur de G1, **le score physique n'a aucun
pouvoir de tri** :

```
rang dans G1 (trié au score)   présents   arrivés
   R1 (meilleur score)              4       3/4
   R2                               4       2/4
   R3                               4       2/4
   R4 (pire score)                  4       3/4
top-2 par score 5/8 = 62,5 %   taux de base 10/16 = 62,5 %   → zéro pouvoir
```

Et les **3/3 filtres** y sont **négatifs** : 60 % chez les arrivés, **67 % chez
les non-arrivés**. La seule variable qui suit l'arrivée est le **rang de presse** :

```
case P1 → 4/4 ████   ← le vainqueur sort de là, 4 fois sur 4
case P3 → 3/4 ███
case P4 → 2/4 ██
case P2 → 1/4 █
```

> **Conclusion : le problème n'est pas le découpage, c'est le choix.**
> Les quotas restent `3-2-1-1-1`. Le travail porte désormais sur **la règle de
> sélection à l'intérieur de chaque bloc** — c'est fait, voir §11.17.

---

### 11.17 ⭐ LA RÈGLE DU MARCHÉ — appliquée dans le moteur le 05/10/2026

> ⚠ **SUPERSEDED le 16/10/2026 par §11.22.** La cote ne remplit plus qu'un seul
> bloc (G2) ; G1, G3, G4 et G5 sont remplis par le **rang de presse**. Mesure :
> la cote partout = 28 % de PAYANTE, le rang de presse = 38,5 % (96 courses).
> Cette section reste comme **trace de la mesure du 05/10** (4 courses, métrique
> `x/5`) — elle n'est plus la règle.

> Les quotas **ne bougent pas**. Ce qui change, c'est **comment on remplit chaque
> bloc**. Le score physique n'a aucun pouvoir de tri (§11.16) ; la cote, elle, en a un.

#### La règle

```
Pour chaque bloc, si on a la cote de TOUS ses partants :

  quota q   ->  les q MEILLEURES COTES du bloc. Rien d'autre.
```

- ~~**★ LA SURPRISE**~~ **RETIRÉE le 05/10/2026.** Elle avait été choisie sur
  4 courses avec la mauvaise métrique (`x/5`). Remesurée sur 280 vrais Quintés
  Global PMU France, elle **divise par deux** la probabilité de gagner (§11.18).
- **sans cote complète sur un bloc** → repli sur le classement (physique → carnet).
  Jamais de tri partiel : une cote manquante déformerait l'ordre.

#### La mesure — `tools/surprise.mjs`  ⚠ **MÉTRIQUE ET OBSOLÈTE**

> Ces chiffres comptent des **x/5**, pas « la course est payante ». La course
> **1-2-3 complet dans la grille** est le seul payout qui compte au-delà du
> seuil. Sous cette métrique, la surprise paraissait gagnante. Elle ne l'est pas.
> Voir §11.18 — **c'est là qu'il faut se fier**.

Quotas `3-2-1-1-1`, **4 Quintés de l'archive = 20 arrivants**, hasard 12.0/20.
« LOO » = les 3 autres courses ; 11/15 est **sous** le hasard (11.25).

```
scénario                                4 courses   sans 01   sans 02   sans 03   sans 04   pire
Equidia FINAL + 1 presse                  17/20        13/15        13/15        12/15        13/15       12/15
casa FINAL + 1 presse                     17/20        12/15        12/15        13/15        14/15       12/15
Equidia OUVERTURE + 1 presse              16/20        12/15        12/15        12/15        12/15       12/15
Equidia ↑ SANS surprise                   14/20        10/15        10/15        10/15        12/15       10/15
casa FINAL + le 1er écarté                16/20        11/15        11/15        13/15        13/15       11/15
presse ↑  (le carnet, référence)          12/20         8/15         9/15        10/15         9/15        8/15
global ↓  (l'ancien moteur)               11/20         8/15         8/15         9/15         8/15        8/15
```

- **17/20 avec un pire LOO à 12/15** : c'est le scénario retenu.
- ~~**La surprise est ce qui fait gagner** : sans elle, on retombe à 14/20.~~
  **FAUX sous la vraie métrique** — voir §11.18.
- `Equidia OUVERTURE + 1 presse` = 16/20 : c'est le proxy le plus proche d'un
  run à 07 h le jour même (l'ouverture est la seule chose rejouable sans horodatage).

#### Vérification dans le VRAI moteur — `tools/verif-marche.mjs`

On rejoue les 4 Quintés en appelant `remplirGrille()` pour de vrai :

```
TOTAL   sans cote 11/20   ·   AVEC cote 17/20   ·   hasard 12.0/20
```

#### ⏰ Le marché BOUGGE — le ticket n'est pas figé

Le 05/10 entre deux passages : n°11 est passé de **14 à 7,9**, n°9 de **2,8 à 3,1**.
Le ticket a changé. Donc :

- **la page `/quinte` relit le marché toutes les 60 s** et horodate chaque relevé ;
- **on parie sur le ticket affiché juste avant le départ**, pas sur celui du matin ;
- l'archive (`tools/daily.mjs`) enregistre le snapshot de son run (08 h 45 / 20 h 30)
  et **jamais** le ticket recalculé après coup.


---

### 11.18 ⭐ LA MESURE SUR LES VRAIS QUINTÉS — 280 courses (05/10/2026)

> §11.16 et §11.17 ont été mesurés sur **4 courses**, et avec la métrique `x/5`.
> Les deux sont fausses. Voici la seule mesure à laquelle se fier.

#### Le jeu de données

| | |
|---|---|
| **Quoi** | **280 Quintés Global PMU France** — `country=FR` **ET** `available_bet_types ⊃ sorec_quinte` |
| **Période** | `2026-01-01 → 2026-10-05` |
| **Fichier** | `data/quintes.json` — produit par `tools/collecte-quintes.mjs` |
| **Source** | `pro.casacourses.com` (`/api/programme?date=` puis `/api/race/{id}?date=`) |
| **On a** | cote **finale** `odd_numeric`, cote **d'ouverture** `odd_opening_numeric`, résultat complet, **dividendes officiels**, et pour **96** d'entre eux la **Synthèse de la presse** (`pronosticsDetailles.syntheses` = FAVORIS · OUTSIDERS · DELAISSES) |

On relance la mesure avec `node tools\mesure-quintes.mjs` (cotes finales) ou
`node tools\mesure-quintes.mjs ouverture` (cotes du matin, le plus proche d'un
vrai pari).

⚠ `archives/` **ne peut pas servir** : 866 courses `quinte:true`, mais **861 sans
`arrivee`**, et les 280 qui ont une arrivée n'en comptent que **5 Quintés**. Les
données casacourses s'arrêtent à l'année en cours → **2020 n'est plus récupérable**.

#### La métrique

```
« la course est PAYANTE » = le 1er, le 2e et le 3e sont TOUS dans la grille.
  « ça couvre le prix »     = + le 4e.
  « Quinté »                = + le 5e.
```

`x/5` ne dit **rien** : 3/5 est une perte sèche.

#### Le résultat — quotas `3-2-1-1-1`, 8 chevaux dans tous les cas

| règle de remplissage | **PAYANTE** | couvre le prix | Quinté |
|---|---|---|---|
| **marché seul — top 8 des cotes** | **43 %** | 27 % | 15 % |
| **les q meilleures cotes du bloc** ← **retenu** | **30 %** | 13 % | 6 % |
| (q−1) cotes + ★ surprise ← **retiré** | 13 % | 5 % | 2 % |

Le verdict ne bouge pas : cotes **finales** ou **d'ouverture** (43 / 27 / 14 %),
avec la **vraie presse** (n=96 : 41 / 29 / 15 %) ou avec l'ordre cote en repli.
La surprise coûtait **la moitié** : elle remplaçait une cote à 8 et une à 14
par une à **50**.

#### Pourquoi la grille plafonne à 30 % — le fait structurel

Le 1-2-3 se répartit dans les blocs **par rang de cote** :

| bloc | cotes | part du 1-2-3 |
|---|---|---|
| G1 | 1 – 4 | **51 %** |
| G2 | 5 – 8 | 27 % |
| G3 | 9 – 10 | 10 % |
| G4 | 11 – 12 | 7 % |
| G5 | 13 et + | 6 % |

La grille spend **3 de ses 8 places sur des cotes que le marché ne donne qu'à
6-10 %**. Le plafond géométrique : le 1-2-3 complet dans le **top 8 des cotes**
arrive **43 %** des fois, et c'est le maximum que 8 chevaux peuvent atteindre.

> Les quotas `3-2-1-1-1` **ne sont pas touchés** (§11.16) — c'est la règle de
> l'utilisateur. Mais il faut savoir que **3-2-1-1-1 coûte ~13 points** face au
> marché nu. C'est sa décision, pas celle du moteur.

#### La couverture du marché seule

| k chevaux | % payable | % +4 | % Quinté |
|---|---|---|---|
| 7 | 33 % | 18 % | 8 % |
| **8** | **43 %** | 27 % | 15 % |
| 9 | 56 % | 40 % | 25 % |
| 10 | 67 % | 54 % | 41 % |
| 12 | 84 % | 75 % | 66 % |

---

### 11.19 ⭐ L'ORDRE DE LA TICKET — les probabilités de place (05/10/2026)

> **QUELS** chevaux entrent dans la grille, c'est §11.17 + §11.18.
> **Dans QUEL ORDRE** on les écrit sur la feuille, c'est ici. Et ce n'est
> **ni l'ordre des cotes, ni celui de la presse, ni celui des cases du carnet.**

#### La règle

Un Quinté se joue **dans l'ordre** : la 1ʳᵉ case du ticket est celle qui doit
gagner. On lit le tableau `Place / P1…P20` de l'onglet **Statistiques** — la
ligne `1er` donne P(1er) de chaque rang de presse, la ligne `2e` donne P(2e),
et ainsi de suite.

```
ATTRIBUTION GLUTONNE :

  place 1  ←  parmi les chevaux du ticket, celui qui a le P(1er) le plus haut
  place 2  ←  parmi ceux qui restent, le plus haut P(2e)
  place 3  ←  …
  place 4  ←  …
  place 5  ←  …
  puis les chevaux en trop, sans place
```

- À égalité de probabilité → **la meilleure cote** gagne (le marché, lui, sait).
- Le cheval garde son **rang de presse** pour la lecture : `pDe(num)` =
  `stats.parPlace[grille.parNum[num] - 1].p` → `[P(1er), P(2e), P(3e), P(4e), P(5e)]`.
- **Sans `stats`** (pas d'archive, ou rang de presse absent) → repli : meilleure
  cote d'abord. Déterministe, jamais aléatoire.

#### Où c'est codé

`ordonnerParStats(ticket, grille, stats, cotes)` — appelé par `remplirGrille`,
qui prend donc un **5ᵉ argument** :

```js
remplirGrille(grille, classement, discipline, cotes, stats)
```

`stats` ne change **pas** la sélection — seulement l'ordre d'affichage.

| Qui | Comment il l'obtient |
|---|---|
| Page `/quinte` | `computeStats(archive)` — calculé **avant** `rempli` |
| `tools/daily.mjs` | `computeStats(archive clôturée)` — seulement les courses **avec arrivée** |
| `tools/moteur.mjs` | idem |
| `tools/aujourdhui.mjs` | idem, et il affiche le P de chaque place |

⚠ **Un ticket ARCHIVÉ garde son ordre d'origine.** L'archive est intouchable
(§13.3) : la page montre `ticketManuel` tel quel, elle ne le réordonne pas.

#### ⚠ La limite — 4 courses

L'archive ne compte que **4 Quintés clôturés** (sur 10 visés). À ce niveau les
pourcentages sont du bruit : beaucoup de 0 %, de 50 % et de 100 %.

```
[1e] n°9  P1  → P(1er) = 75 %     ← 3 gagne sur 4
[2e] n°12 P5  → P(2e)  = 50 %
[3e] n°13 P4  → P(3e)  = 100 %    ← 4 gagne sur 4
[4e] n°3  P7  → P(4e)  = 50 %
[5e] n°7  P8  → P(5e)  = 100 %
```

C'est demandé quand même — l'ordre **s'affine tout seul** à mesure que le job
quotidien archive les Quintés. Rien à faire côté code : c'est le même calcul.

---

### 11.20 🔒 AUCUNE MODIFICATION À LA MAIN DES CASES

Demandé le 05/10/2026 : **le numéro de chaque case est celui du moteur.**

- Le clic sur une boule **ne change plus rien** : `basculer`, `override`,
  `setOverride` et `verrou` ont été retirés de `QuinteGrille.jsx`.
- `Boite` n'a plus de `onClick`.
- Seul le ticket **archivé** passe devant le choix automatique, et il est
  affiché tel quel — jamais recalculé, jamais réordonné (§13.3).
- ⚠ **et seulement si la course est CLÔTURÉE** (`rec.arrivee` non vide).
  Tant qu'elle n'a pas couru, la page affiche le ticket **LIVE** : l'archive
  est un instantané de 08 h 45 / 20 h 30, le marché a bougé depuis (§13.3
  règle 5). Corrigé le 05/10 : la page affichait le ticket archivé de la
  course du jour, déjà périmé.


---

### 11.21 ⭐ AUDIT DU 16/10/2026 — la 9ᵉ place, et deux défauts de donnée

> Mesuré avec la métrique §11.18 (PAYANTE), en LOO. Détail complet et
> commandes : `RAPPORT-AUDIT-2026-10-16.md`. Outil : `tools/mesure-moteur.mjs`.

#### ① Le seul levier qui reste : la 9ᵉ place

96 Quintés à **presse réelle**, cotes **d'ouverture**, LOO :

| méthode | PAYANTE | +4 | Quinté | ch. |
|---|---|---|---|---|
| marché seul — top 9 | **50 %** | 31 % | 19 % | 9 |
| quotas **4-2-1-1-1** | **47 %** | 30 % | 16 % | 9 |
| retenue + 1 cheval (le 4ᵉ de G1) | **47 %** | 31 % | 14 % | 9 |
| marché seul — top 8 | 41 % | 24 % | 13 % | 8 |
| code actuel (R8) | 34 % | 16 % | 7 % | 8 |
| **règle retenue** (q meilleures cotes) | **31 %** | 18 % | 8 % | 8 |

**Ajouter un 9ᵉ cheval = +13 à +18 points de « course payante ».** C'est la
réponse mesurée à « comment élever les résultats ? ». La méthode autorise 6 à 9
chevaux (§11.3) ; à 9, `3-2-1-1-1` devient `4-2-1-1-1`.
⚠ **Les quotas ne se modifient pas seuls (§11.16) : c'est une décision de
l'utilisateur.** La mesure dit ce que coûte le refus, pas ce qu'il faut décider.

#### ② LA SURPRISE, re-mesurée : à ne jamais réintroduire

Sur les mêmes 96 courses : `q meilleures cotes` = **31 %**, `(q−1) + ★ surprise`
= **14 %**. Elle **coûte 17 points**. Confirmation indépendante de §11.18
(ticket de 8 chevaux : 30 % contre 12 %).

#### ③ Deux défauts de DONNÉE corrigés

| défaut | portée | correctif |
|---|---|---|
| **Non-partants cités par la presse** gardés dans la grille (chevaux **fantômes** : un `0` au 09/10, un **18** au 10/10) | **37 / 96 courses** (46 citations). Le harnais `mesure-quintes.mjs` les filtrait déjà, `buildGrid()` non | `buildGrid()` ne garde que les `runners` réels, et ignore toute valeur ≤ 0 |
| **Marché manquant** : `courseId` numérique (id casacourses) ou clé pointant la mauvaise course (`10/10` : `R1_C4` au lieu de `R1_C3`) | **7 dates / 14** | `tools/backfill-cotes.mjs` redérive la clé (`cleEquidia`) et **vérifie le nombre de partants** avant d'écrire → **15/15** |

#### ④ Le code suit-il la méthode ? — non, mais sans coût

§11.19 dit : **`stats` ne change PAS la sélection**. Or `remplirGrille()` a une
branche `aStats` (R8 = 0,9 force + 0,1 marché) qui **sélectionne** avec les
statistiques dès qu'une archive existe — donc **toujours** sur la page.
Mesure : R8 = 31-34 %, la règle documentée = 28-31 %. **Écart de +3 points = bruit.**
La divergence est **de forme**, pas de performance : à corriger pour que la page
et la mesure parlent du même moteur, mais **rien à gagner** (§6 : on ne réécrit
pas un moteur pour +3 points sur 96 courses).

#### ⑤ Rappel de méthode

`x/5` **ne sert plus à décider** (§11.18). L'outil `tools/audit-engine.mjs`
continue de le calculer pour l'archive, mais sa sortie est étiquetée
« SUPERSEDED ». La seule mesure de décision est **PAYANTE**.

---

### 11.22 ⭐ LE CHOIX DANS LE BLOC — appliqué au moteur le 16/10/2026

> **Les quotas 3-2-1-1-1 ne bougent pas (§11.16). Ce qui change, c'est QUI on
> prend à l'intérieur d'un bloc.** Et la réponse est : **le rang de presse**,
> pas la cote.

#### La règle (dans `remplirGrille()`, `src/lib/quinte.js`)

```js
const CHOIX_DU_BLOC = { G1: 'carnet', G2: 'marche', G3: 'carnet', G4: 'carnet', G5: 'carnet' }
```

| Bloc | Qui choisit | Ce que ça veut dire |
|---|---|---|
| **G1 · P1-P4** | **le carnet** | les 3 meilleures **places de presse** du bloc |
| **G2 · P5-P8** | **le marché** | les 2 **meilleures cotes** du bloc |
| **G3 · P9-P10** | **le carnet** | la meilleure place de presse |
| **G4 · P11-P12** | **le carnet** | la meilleure place de presse |
| **G5 · P13-P20** | **le carnet** | la meilleure place de presse |

- **`carnet` = `place`, la place de presse P1..P20 de la case** — ⚠ **pas**
  `slot`, qui est le numéro de colonne du carnet papier (§11.14). Les deux
  donnent des résultats très différents : `place` = 38,5 %, `slot` = 25,0 %.
- **Le marché ne choisit plus qu'en G2.** Il garde ses deux autres rôles :
  **l'ordre du ticket** (§11.19, `ordonnerParStats`) et l'affichage.
- **Sans cotes**, rien ne change : c'est `tries` qui décide (carrière → forme),
  exactement comme avant. Si **une seule** cote manque dans G2, G2 retombe sur
  le classement — le détail affiche alors `choix: 'classement'`.

#### La règle R8 est RETIRÉE de la sélection

Le code avait une branche `aStats` (R8 = 0,9 × force(P) + 0,1 × marché) qui
**sélectionnait** dès qu'une archive existait — donc **toujours** sur la page.
§11.19 l'interdisait déjà (« `stats` ne change PAS quels chevaux entrent ») ;
§11.21 avait vu la divergence mais l'avait classée « bruit, rien à gagner ».

**Mesure du 16/10 sur 96 courses (LOO) : ce n'est pas du bruit.**

| qui remplit le bloc (96 Quintés) | PAYANTE | couvre +4 | 5/5 |
|---|---|---|---|
| ⭐ **la règle §11.22** | **39 %** | 18 % | **7 %** |
| le carnet partout | 39 % | 20 % | 8 % |
| **R8 partout** (l'ancien code) | 31 % | 14 % | 6 % |
| le marché partout (§11.17) | 28 % | 15 % | 6 % |

`aStats` reste calculé (information), mais **n'entre plus dans le choix**.

#### La mesure — `tools/choix-grille.mjs` (LA mesure décisive)

96 Quintés à presse RÉELLE, blocs du **vrai `buildGrid()`**, mêmes 8 places,
on ne redistribue que le **choix**. Métrique §11.18 = **PAYANTE** (le 1-2-3
complet dans la grille) :

| Qui choisit dans le bloc | cotes finales | cotes d'ouverture |
|---|---|---|
| **G1 carnet · G2 marché · G3-G5 carnet** ⭐ | **38,5 %** | **38,5 %** |
| le carnet partout | 38,5 % | 38,5 % |
| G1 carnet · G2-G5 marché | 33,3 % | 32,3 % |
| G1 marché · G2 marché · G3-G5 carnet | 33,3 % | 33,3 % |
| **la cote partout** (l'ancienne §11.17) | **28,1 %** | 31,3 % |
| l'ordre des colonnes (`slot`) | 25,0 % | 25,0 % |

- **+10,4 points de PAYANTE** sur les cotes finales (28,1 % → 38,5 %), et
  **+7,2** sur les cotes du matin. La règle est **stable dans les deux
  régimes** — c'est ce qui la rend crédible.
- **Les 8 combinaisons de tête sur 32 commencent toutes par `c…`** (G1 au
  carnet) : c'est **G1 qui décide**, tout le reste est un plateau.
- LOO honnête (combinaison choisie sur les 95 autres) : 31-34 %. La règle
  retenue est **fixe**, elle n'est pas ajustée aux 96.

#### L'effet dans le VRAI moteur — `tools/mesure-moteur.mjs`

```
                            96 Quintés, LOO        cotes finales   ouverture
  ⭐ la règle §11.22                             39 %            38 %
     le carnet partout                          39 %            39 %
     R8 partout (0,9 force + 0,1 marché)        31 %            34 %
     le marché partout (§11.17)                 28 %            31 %
```

#### ⚠ Ce qui n'est PAS démontré — et comment on le dit

Sur les **14 courses réelles du 1er→15/10** (carrière + presse pronostics-turf
+ marché Equidia, `tools/test-nonregression.mjs`, LOO) :

| | PAYANTE | couvre +4 | Quinté 5/5 | gagnant |
|---|---|---|---|---|
| avant (R8) | **5/14 = 36 %** | 4/14 | **4/14** | 11/14 |
| après (§11.22) | **5/14 = 36 %** | 1/14 | 1/14 | 11/14 |

→ **sur les 14 : le 1-2-3 ne bouge pas, mais le 5/5 recule (4 → 1)**.
Les deux échantillons ne disent pas la même chose :

```
                              1-2-3                     5/5
  96 courses (02→07)   carnet 39 % > R8 31 %     carnet 8 % ≈ R8 6 %
  14 courses (10/2026) carnet 36 % = R8 36 %     carnet 1/14 < R8 4/14
  ------------------------------------------------------------------
  les 110 réunies      carnet 38 % > R8 32 %     carnet 9 ≈ R8 10
```

**La métrique de décision est PAYANTE (§11.18) : elle tranche pour la règle
§11.22**, sur les deux échantillons pris ensemble. Mais **le 5/5 sur les 14
reste un avertissement** : 14 courses = 7 points par course, ça ne prouve rien
seul. À re-mesurer quand l'archive aura grossi. **Le retour arrière est une
ligne** (`CHOIX_DU_BLOC`, §11.22).

---

### 11.23 ⭐ LE BADGE MARCHÉ, LE PANNEAU DE MESURE, L'ONGLET ÉCARTS (16/10/2026)

Trois livraisons du 16/10 sur la page `/quinte`. **Aucune ne change la
sélection** : la grille reste remplie par §11.22 (le rang de presse). Elles
servent à **voir** et à **décider**.

#### ① Le badge des boules — le rang de cote

Chaque boule porte, **en haut à droite**, le **rang de marché** du cheval
(1 = la cote la plus basse), sur le fond de sa bande :

| Bande | Seuils | Badge | top-5 mesuré | top-3 mesuré |
|---|---|---|---|---|
| **fort** | rang ≤ 3 | `M≤3` vert | **52,1 %** | 38,2 % |
| **bon** | rang 4 – 5 | `M≤5` bleu | **42,7 %** | 30,2 % |
| **moyen** | rang 6 – 12 | `M6-12` ambre | 34,0 % / 28,7 % | 17,4 % / 14,2 % |
| **faible** | rang ≥ 13 | `M13+` rouge | **13,1 %** | 5,2 % |
| — | tous les cités | — | 32,9 % | 19,8 % |

*(96 Quintés à presse réelle, `tools/fiabilite.mjs`. La mesure porte sur les
chevaux **cités par la presse** — les 8 bandes sont des bandes de rang de cote,
pas des groupes de la méthode.)*

- code : `rangsMarche(cotes)` + `bandeMarche(rang)` + `BANDE_MARCHE`
  (`src/lib/quinte.js` **et** `backend/QUINTE/quinte.js`, §12) ;
- le badge est **informatif** : il n'entre ni dans le score, ni dans le
  remplissage. §11.22 reste seul maître du choix.

#### ② Le panneau « Fiabilité mesurée » (onglet **La grille**, sous le ticket)

Il affiche **`public/data/fiabilite.json`**, écrit par `tools/fiabilite.mjs` :
la fiabilité du code, la baseline du marché, la table du badge, et
l'expérience G5 ci-dessous. **La page ne calcule aucun chiffre** (§7).

```
96 Quintés à presse réelle (2026-02-09 → 2026-07-07) · §11.18 PAYANTE
──────────────────────────────────────────────────────────────
le moteur — cotes finales            38,5 %   17,7 %   7,3 %   8 ch.
le moteur — cotes d'ouverture        37,5 %   17,7 %  10,4 %   8 ch.
le marché seul — 8 meilleures cotes  39,6 %   18,8 %   9,4 %   8 ch.
le marché seul — 9 meilleures cotes  51,0 %   31,3 %  17,7 %   9 ch.
```

⚠ **Le moteur à 8 chevaux ≈ le marché à 8 chevaux** (38,5 vs 39,6). Le gain
du moteur n'est pas dans son score : il est dans le **choix dans les blocs**
(§11.22) et dans le **découpage** (G1 prend 2,0 arrivants par course). Le
top-9 du marché (51 %) est un **repère**, pas une alternative : il ne tient pas
aucun quota.

#### ③ ⚠ L'EXPÉRIENCE DU SIÈGE DE G5 — mesurée, **NON APPLIQUÉE**

§11.6 dit du dernier bloc : « **B5 : 1 ou 0** — le 1 seulement si un cheval de
B5 a une configuration physique irréprochable ». Le code, lui, prend ce siège
**sans condition**. On a donc mesuré ce que vaut ce siège, **sur les mêmes
8 chevaux** (`tools/experience-g5.mjs`, 96 courses, LOO) :

| variante | PAYANTE | ouverture | 1re moitié | 2e moitié | siège gardé |
|---|---|---|---|---|---|
| G5 garde son siège si top-3 marché, sinon G2 | **42,7 %** | **42,7 %** | 43,8 % | 41,7 % | 3 % |
| G5 garde son siège si top-5 marché, sinon G2 | **42,7 %** | 41,7 % | 43,8 % | 41,7 % | 8 % |
| G5 garde son siège si top-8 marché, sinon G2 | **42,7 %** | **42,7 %** | 43,8 % | 41,7 % | 20 % |
| G5 garde son siège si top-10 marché, sinon G2 | **42,7 %** | **42,7 %** | 43,8 % | 41,7 % | 37 % |
| **3-3-1-1-0 — le siège va à G2, toujours** | **42,7 %** | **42,7 %** | 41,7 % | 43,8 % | — |
| 3-2-2-1-0 — le siège va à G3 | 40,6 % | 38,5 % | 39,6 % | 41,7 % | — |
| 3-2-1-2-0 — le siège va à G4 | 39,6 % | 38,5 % | 37,5 % | 41,7 % | — |
| ▶ **3-2-1-1-1 — G5 inconditionnel (le code)** | **38,5 %** | 37,5 % | 37,5 % | 39,6 % | — |
| G5 garde son siège si top-16 marché (≈ toujours) | 38,5 % | 37,5 % | 37,5 % | 39,6 % | 99 % |

**Ce que ça dit, en trois lignes :**

1. **Le siège de G5 est le mauvais siège** : le laisser à G5 coûte ~4 points de
   PAYANTE ; le donner à **G2** les rend (G3 moins, G4 encore moins).
2. **La condition ne sert à rien — mais elle ne coûte rien** : garder le siège
   pour un cheval « backé » (top-3 / top-5 / top-8 / top-10) donne **exactement
   le même 42,7 %** qu'un déplacement systématique.
3. Donc **deux lectures équivalentes**, au choix de l'utilisateur :
   **(a)** `3-3-1-1-0` — G5 = 0, le plus simple ; **(b)** G5 garde son siège
   **seulement si son cheval est dans les 10 premières cotes** — même résultat,
   et ça respecte la lettre de §11.6 (« B5 : 1 ou 0 »).

⚠ **Rien n'est appliqué.** §11.16 : **les quotas n'appartiennent pas au moteur.**
3-3-1-1-0 ne sort d'aucune borne déclarée (G1 3 ≤ 3, G2 3 ≤ 3, G3 1, G4 1,
B5 0 ✔) mais **c'est le choix de l'utilisateur**, pas du code. Le panneau affiche
`appliquée` / `non appliquée` et se réécrit seul (`node tools\fiabilite.mjs`).
Rappel du caveat : n = 96, l'écart 42,7 vs 38,5 ≈ **0,6 σ** ; la force de
l'argument est la **monotonie sur deux mesures indépendantes** (cotes finales
**et** ouverture) et la stabilité sur les deux moitiés.

#### ④ L'onglet **Écarts** — les cases P1..P20

5ᵉ onglet, **peau cyan** (§12.1 : une identité visuelle par onglet), alimenté par
`public/data/ecarts.json` (`tools/ecarts.mjs`).

> ⚠ « **P** » = le **RANG DE PRESSE** (P1 = le 1er cité), **pas** la colonne du
> carnet papier. Mesuré le 16/10 (§11.16, `tools/choix-grille.mjs`) : c'est le
> rang de presse qui suit l'arrivée.

Une case **donne** quand **le cheval qui l'occupe finit dans les cinq premiers**.
109 courses à presse réelle (96 + le registre du site, doublons retirés) :

```
case   n    P donne    % top-5   % top-3   gagne   dernier hit   courses depuis
P1    109    74/109     67,9 %    55,0 %     30     2026-10-14        1   chaude
P3    109    53/109     48,6 %    35,8 %     13     2026-10-11        3   chaude
P7    109    36/109     33,0 %    15,6 %      5     2026-10-07        7   FROIDE
P12   108    22/108     20,4 %     6,5 %      2     2026-10-08        6   FROIDE
P14    96     9/96       9,4 %     5,2 %      1     2026-06-19       16   FROIDE
```

- colonnes : la course du jour (`n° · M<rang>`), `P donne`, `% top-5`,
  `% top-3`, `gagne`, **dernier hit**, **courses depuis**, **état**
  (chaude ≥ 40 % ou hit à la dernière course · froide = rien depuis ≥ 5 courses),
  et **les 6 dernières** (pastilles).
- « courses depuis » est en **courses**, pas en jours : le registre n'est pas
  régulier. « jours depuis » se compterait depuis la **dernière course du
  registre**, pas depuis aujourd'hui.
- c'est un **repère de lecture**, ❌ **jamais** une raison d'écarter un cheval
  (§6 : on écarte sur le **physique**).

#### Les fichiers

| Fichier | Rôle |
|---|---|
| `tools/experience-g5.mjs` | **l'expérience du siège de G5** — rapport console + **module** (exporte `chargerEchantillon`, `VARIANTES`, `jouer`, `mesurer`) |
| `tools/fiabilite.mjs` | écrit `data/fiabilite.json` + `public/data/fiabilite.json` (code · baselines · badge · expérience). **Seule source** du panneau |
| `tools/ecarts.mjs` | écrit `data/ecarts.json` + `public/data/ecarts.json` (les places P1..P20) |
| `src/lib/quinte.js` | + `rangsMarche()` · `bandeMarche()` · `BANDE_MARCHE` · `fetchFiabilite()` · `fetchEcarts()` |
| `frontend/QUINTE/QuinteGrille.jsx` | + le badge sur la boule · `<PanneauMesure/>` · `<TabEcarts/>` + la 5ᵉ peau `THEME.ecarts` |

> `tools/fiabilite.mjs` **importe** les variantes de `tools/experience-g5.mjs` :
> le panneau et le rapport console **ne peuvent pas diverger**. Les deux fichiers
> JSON se régénèrent par une seule commande, et l'onglet Écarts par une autre.

---

### 11.24 ⭐ LE CHOIX DANS G1 ET G2 — MESURÉ, RIEN À PRENDRE (16/10/2026)

> **Décision de l'utilisateur, 16/10/2026** : « الكوطة لا اريد تغييرها … المشكل
> في الاختيارات داخل G1 G2 ». Les quotas sont **fermés** (§11.16) et l'expérience
> du siège de G5 (§11.23) reste **refusée**. Reste donc à mesurer **le choix
> à l'intérieur de G1 (3 gardés sur 4) et de G2 (2 gardés sur 4)** — G3-G5
> inchangés, au carnet.

#### ① Où sont les 1-2-3 — le diagnostic

Les **288 chevaux** qui ont formé les 1-2-3 des 96 Quintés à presse réelle, et
ce que le ticket (§11.22) en fait :

| bloc | arrivés là | gardés | **écartés** | taux de garde |
|---|---|---|---|---|
| G1 · P1-P4 | 144 | 123 | **21** | 85,4 % |
| G2 · P5-P8 | 75 | 47 | **28** | 62,7 % |
| G3 · P9-P10 | 24 | 16 | 8 | 66,7 % |
| G4 · P11-P12 | 26 | 19 | 7 | 73,1 % |
| G5 · P13+ | 19 | 6 | 13 | 31,6 % |

**63,6 %** des **77** chevaux du top-3 écartés le sont dans **G1 ou G2**.
→ **L'utilisateur a raison : le trou est dans G1 et G2, pas dans la queue.**
Dans G1, la presse trie parfaitement P1, P2, P3 (elles ne sont **jamais**
perdues : 51/51, 39/39, 28/28) ; c'est **P4** qui paie (4 gardés sur 15).

#### ② Le levier — le choix contre la quota

| | PAYANTE | écart |
|---|---|---|
| le code actuel (G1 presse · G2 marché) | 38,5 % | — |
| **le choix PARFAIT dans G1 et G2** (oracle) | **71,9 %** | **+33,4** |
| le choix parfait dans G1 seul | 52,1 % | +13,6 |
| le choix parfait dans G2 seul | 54,2 % | +15,7 |
| le hasard pur (moyenne des 24 combinaisons) | 22,8 % | −15,7 |
| déplacer le siège de G5 vers G2 (§11.23) | 42,7 % | +4,2 |

**Le choix vaut +33,4 pts, la quota +4,2 pts.** L'intuition de l'utilisateur est
quantitativement juste : c'est bien dans G1/G2 que se trouve le levier.

#### ③ Les 29 règles de choix, mesurées une à une

`tools/choix-g1g2.mjs` essaie **chaque** variable, seule, dans G1 puis dans G2 :
presse, cote, **mouvement du marché** (ouverture ÷ cote), **corde**, **âge**,
musique, **discipline** (a-t-elle déjà couru ce type ?), **distance déjà courue**,
**hippodrome déjà couru**, **jours d'absence**, **podiums récents**, un
**physique** combiné, des **échanges** (le dernier gardé cède au 1er écarté) et
des **filtres** (§6 : un cheval fautif passe derrière).

```
code actuel (G1 presse · G2 marché)                    38,5 %
presse, mais jamais cet hippodrome passe derrière      40,6 %   ← la meilleure
presse + âge                                           39,6 %
marché — la cote (dans G1)                             33,3 %
mouvement — la cote qui baisse (dans G1)               30,2 %
PHYSIQUE — distance + piste + jours + podium           26,0 %
musique — la forme (§11.16)                            24,0 %
```

- **Toutes** ces règles sont dans une bande de **±2 points**. La meilleure
  (`filPiste`, +2,1 pt) est de l'ordre du **bruit**.
- **Le LOO le prouve** : la meilleure case choisie sur les 95 autres courses vaut
  **18,8 %** — **sous** le code. Choisir la meilleure ligne du tableau est
  choisir du bruit.
- À l'intérieur d'une boîte, **tous les feux physiques sont plats** : dans G1,
  chaque indicateur (distance courue, hippodrome, absence, podium) donne
  **48 à 56 %** de top-5 pour **51,0 %** de moyenne. Seul repère réel : en G2,
  « a déjà couru cet hippodrome » = **40,3 %** contre **34,9 %**.

#### ④ Le verdict — et ce qui reste à faire

**Le choix a une marge réelle (+33 pts) mais aucune variable mesurable ne la
prend : à l'intérieur d'une même boîte, les 4 chevaux sont interchangeables.**
Trois champs de la méthode (§4 : terrain 13 %, type, niveau/VH 13 %) **ne sont
pas dans l'archive** — `pro.casacours.com` ne rend que date, hippodrome,
distance et place (§14.2). Ils n'existent que dans la **carrière saisie à la
main** : c'est la piste qui reste ouverte. **Rien n'est appliqué** — la règle en
production reste §11.22 (G1 presse · G2 marché · G3-G5 carnet).

#### ⑤ Les fichiers

| Fichier | Rôle |
|---|---|
| `tools/collect-forms.mjs` | la carrière des **96 Quintés archivés** : 1 appel casacourses par course → `data/forms.json` (1509 chevaux, 97 % avec ≥ 1 course passée). **Filtre anti-fuite** : courses strictement antérieures à la date du jour |
| `tools/choix-g1g2.mjs` | **LA mesure du choix** : diagnostic · levier · les 29 règles · la grille G1×G2 · oracle · hasard · LOO · stabilité. Écrit `data/choix.json` + `public/data/choix.json` |
| `data/forms.json` | la carrière (cache) — relançable par `node tools\collect-forms.mjs` (`--force` pour tout refaire) |
| `data/choix.json` · `public/data/choix.json` | lus par l'**onglet Choix** |
| `src/lib/quinte.js` | + `fetchChoix()` (miroir dans `backend/QUINTE/quinte.js`) |
| `frontend/QUINTE/QuinteGrille.jsx` | + l'onglet **Choix** (6ᵉ peau `THEME.choix`, rouge carmin) |

#### ⑥ ⚠ Le piège à éviter

Le tableau des 29 règles **invite** à prendre la meilleure (40,6 %). **Ne pas le
faire** : c'est +2,1 pts sur 96 courses, et le LOO la fait tomber à 18,8 %.
La règle `filPiste` retenue sur l'archive **ne se reproduira pas** en course.
Toute règle nouvelle devra passer **le LOO avant** d'être appliquée.

---

### 11.25 ⭐ LES 6 CRITÈRES §4 AU COMPLET — TERRAIN, SENS, VH : TOUJOURS RIEN (16/10/2026)

> Suite de §11.24. §11.24 laissait **une** porte ouverte : « terrain, type et VH
> ne sont pas dans l'archive ». Le 16/10 on est allé les chercher **dans PMU**
> (§14.6) — **plus aucune saisie manuelle**. Réponse : **la porte était fermée.**

#### ① La carrière est maintenant COMPLÈTE

`tools/collect-terrain.mjs` (terrain + sens) et `tools/collect-vh.mjs` (VH, corde,
place) remplissent les trois trous du §4. Couverture sur les 1 509 chevaux des 96
Quintés :

| critère §4 | poids | couverture |
|---|---|---|
| terrain | 13 % | **58 %** |
| sens de la piste | 18 % (dont 40 % le sens) | **84 %** |
| VH (niveau) | 13 % | **52 %** (le trot n'a pas de VH) — **58 %** pour le VH du jour |

#### ② Le résultat — les 6 critères ne trient PAS le bloc

| règle (seule, dans G1 et G2) | PAYANTE | vs le code |
|---|---|---|
| **le code** (G1 presse · G2 marché) | **38,5 %** | — |
| `filPiste` — jamais cet hippodrome → derrière | **40,6 %** | +2,1 |
| `presse + âge` | 39,6 % | +1,1 |
| **TERRAIN §4** — le terrain du jour a-t-il été couru | **35,4 %** | −3,1 |
| **NIVEAU §4** — le VH du jour vs ses 2 dernières | **34,4 %** | −4,1 |
| `filNiveau` — qui monte de niveau (+1,5) → derrière | 34,4 % | −4,1 |
| **piste §4** — 60 % le lieu + 40 % le sens | **27,1 %** | −11,4 |
| **piste — le SENS** seul | **26,0 %** | −12,5 |
| **★ LE SCORE §4 COMPLET** (forme+dist+piste+niveau+terrain+corde) | **21,9 %** | **−16,6** |
| hasard | 22,8 % | −15,7 |

**Le score §4 complet est SOUS le hasard.** Ce n'est pas « neutre » : classifier
un bloc par le physique **détruit** l'information qu'il contient.

#### ③ Pourquoi — et ce que ça veut dire

1. **Le bloc est déjà un filtre.** G1 = P1-P4 : la presse a **déjà** appliqué le
   physique. Re-trier les 4 par le physique revient à ignorer son travail — et
   le physique est plus bruité que le rang de presse.
2. **Le LOO le confirme** : la meilleure case du tableau (`pAge`/`filPiste`,
   40,6 %) choisie sur les 95 autres courses retombe à **22,9 %**, sous le code.
3. **La stabilité est nulle** : `TERRAIN` 39,6 % → 31,3 % entre les deux moitiés,
   `NIVEAU` 27,1 % → 41,7 %, `★ §4` 20,8 % → 22,9 %.
4. **Le seul tri qui tient est la presse** : 35,4 % / 41,7 % sur les deux moitiés.

#### ④ Le verdict

**Rien n'est appliqué.** La règle en production reste **§11.22** (G1 presse ·
G2 marché · G3-G5 carnet), les quotas **3-2-1-1-1** ne bougent pas (§11.16).
Le physique §4 sert à **lire une course** (écarter un cheval qui n'a jamais la
distance, §6) — **pas** à classer les 4 chevaux d'une même boîte. La porte que
§11.24 laissait ouverte est **fermée par la mesure** : ce n'est pas un manque de
données, c'est la structure du découpage.

#### ⑤ Les fichiers

| Fichier | Rôle |
|---|---|
| `tools/collect-terrain.mjs` | terrain + sens des courses passées (PMU) → `data/terrain.json` (`runs` + `jour`) |
| `tools/collect-vh.mjs` | VH + corde + place par cheval et par course (PMU) → `data/vh.json` |
| `data/terrain.json` · `data/vh.json` | les deux caches PMU — **committés** (PMU peut purger) |
| `tools/choix-g1g2.mjs` | + terrain · sens · piste2 · niveau · VH · le **score §4 complet** — 40 règles, `verdict` généré depuis les chiffres, `choisir` **mémoïsé** |

#### ⑥ ⚠ Le piège, renforcé

§11.24 disait : « la meilleure règle (40,6 %) est du bruit, LOO 18,8 % ». Cette
fois le tableau contient **tout §4** — et **la meilleure règle est encore
`filPiste`** (40,6 %), pendant que le score complet tombe à **21,9 %**. Autrement
dit : **plus on met de physique, plus on perd.** Toute règle nouvelle devra passer
**le LOO avant** d'être appliquée.

---

### 11.26 ⭐ QUI SORT DU BLOC — LE POUVOIR RÉEL DU CHOIX (20/10/2026)

> Demande de l'utilisateur : **« الاختيار الصحيح هو علاش كانقلب »** — le vrai
> sujet n'est pas l'ordre global, c'est **qui on enlève de chaque bloc**.

§11.24 et §11.25 mesuraient le choix avec le **5/5** — **12 événements** sur 96
courses. Trop peu pour lire quoi que ce soit. Ici la métrique est **dense** :

```
BASE   chaque cheval du bloc arrive-t-il dans les 5 ?          (le hasard)
SORTI  le cheval qu'on jette arrive-t-il ?                     (ce que coûte la règle)
ORACLE le plancher : le jeté n'arrive jamais — possible seulement si
       TOUS les chevaux du bloc arrivent (alors on perd forcément)

POUVOIR = (BASE − SORTI) / (BASE − ORACLE)
          0 % = la règle jette au hasard · 100 % = elle jette toujours un non-arrivant
```

Outil : `tools\pouvoir.mjs` — **la vraie grille** (`buildGrid`), 96 Quintés à
presse réelle, la carrière réelle (`data\corpus\carriere96.json`), les poids
(`data\corpus\poids-presse.json`) et `data\vh.json` (corde, VH).

#### ① La marge existe — et elle est énorme

| bloc | BASE (hasard) | ORACLE (choix parfait) | **marge à prendre** |
|---|---|---|---|
| **G1** | **51,0 %** | **2,1 %** | **49,0 pts** |
| **G2** | 36,7 % | 0,0 % | 36,7 pts |
| **G3** | 29,2 % | 7,3 % | 21,9 pts |
| **G4** | 24,7 % | 3,1 % | 21,6 pts |

Dans G1, chaque cheval arrive **une fois sur deux**. Le choix parfait ramènerait
le jeté à **2,1 %**. L'intuition de l'utilisateur est juste : **il y a 49 points
à prendre.**

#### ② Ce que chaque variable en prend — G1

| ce qui décide dans G1 | le jeté arrive | pouvoir |
|---|---|---|
| **le carnet — le rang de presse (production)** | **36,5 %** | **+30 %** |
| la forme (places récentes, pondérées) | 37,6 % | +27 % |
| le taux de podium en carrière | 38,7 % | +25 % |
| **presse − marché (le désaccord des deux ordres)** | 43,8 % | +15 % |
| les jours d'absence | 44,1 % | +14 % |
| la cote | 44,8 % | +13 % |
| l'aptitude à la distance | 45,2 % | +12 % |
| la piste (hippodrome déjà couru) | 45,2 % | +12 % |
| le poids (44 courses de plat) | 63,6 % | −26 % |

#### ③ Les autres blocs

| bloc | meilleur | pouvoir | la production |
|---|---|---|---|
| **G2** | carnet **=** cote (ex æquo exact, 26,0 %) | +29 % | carnet — identique |
| **G3** | carnet 26,0 % (+14 %) · poids 22,7 % mais n = 44 | +14 % | carnet |
| **G4** | carnet 15,8 % (+41 %) · **cote 18,9 % (+27 %)** | — | **cote** |

**G4 tranché par l'événement, pas par la densité** : passer G4 au carnet donne
**0 quinté gagné / 3 perdu** (bootstrap 0,0 %), même si le cheval jeté arrive
moins souvent. C'est le seul bloc où les deux métriques divergent — et c'est le
5/5 qui paie. **La cote reste en G4.**

#### ④ Le verdict

> **La meilleure règle de choix disponible prend 30 % de la marge. Les 70 %
> restants ne sont dans aucune variable mesurable.**

Onze variables ont été passées dans le même crible — presse, cote, forme,
distance, piste, podium, jours, poids, VH, corde, et **le désaccord presse/marché**
(le seul signal qui utilise les deux ordres sans les additionner) : **aucune ne
bat le rang de presse**. La structure du bloc est un tirage presque uniforme une
fois la presse passée.

**Conséquence pratique, et c'est la seule :** dans G1·G2·G3 on garde **par le
rang de presse** — pas à l'œil, pas par la carrière. Le physique §4 sert à
**écarter un cheval de la course**, jamais à classer les 4 d'une même boîte.

**Rien n'est appliqué** : la règle reste §11.22/§11.23 (carnet G1-G3 · marché G4),
quotas **3-3-1-1-0**.

#### ⑤ ⚠ Le piège — le bloc doit être LE bloc de la méthode

Un premier essai (`tools\qui-sort.mjs`, `qui-sort-paire.mjs`, `regle-poids.mjs`)
portait sur les **123 Quintés français des archives**, sans presse : les blocs y
étaient reconstruits en **tranches de marché** (G1 = les 4 cotes les plus basses).
Le **poids** y sortait vainqueur — le plus lourd arrive **39,0 %** contre **50,8 %**
pour le choix de la cote, `+2,4` points de 5/5, les deux moitiés d'accord.

**Repassé sur les vrais blocs presse (`tools\poids-presse.mjs`) :**

```
quinté entier   gagnées 0   · perdues 3   · bootstrap : 0,0 %
podium entier   gagnées 3   · perdues 5   · bootstrap : 19,1 %
```

> **Leçon :** une tranche de marché n'est pas un bloc P1-P4 / P5-P8. Un signal
> validé sur un découpage qui n'est pas celui de la méthode **ne se transpose
> jamais**. Toute mesure de choix passe par `buildGrid`.

#### ⑥ Les fichiers

| fichier | rôle |
|---|---|
| `tools\pouvoir.mjs` | **LA mesure du choix** : base · oracle · pouvoir des 11 variables, vraie grille |
| `tools\qui-sort-presse.mjs` | qui sort, combinaisons de deux signaux, moitiés |
| `tools\poids-presse.mjs` | le poids sur les vrais blocs — le contrôle négatif |
| `tools\qui-sort.mjs` · `qui-sort-paire.mjs` · `regle-poids.mjs` | mesures sur tranches de marché — **ne pas réutiliser pour décider** |
| `data\corpus\poids-presse.json` | les poids casacourses des 45 courses de plat à presse |

---

### 11.31 ⭐ 4-2-1-1-0 — ON SUPPRIME LE CHOIX LE PLUS CHER (20/10/2026, appliqué)

> Question de l'utilisateur, après l'autopsie des pertes : « le problème c'est
> le CHOIX dans le bloc ». La réponse n'est pas un meilleur chooser — il n'y en
> a pas (§11.30) — c'est de **ne plus avoir à choisir là où le choix coûte le plus**.

#### ① Le prix du siège, mesuré bloc par bloc

`tools/sans-choix.mjs`, 96 Quintés à presse réelle, vrai `buildGrid` :

| bloc | le cheval écarté arrive top-5 |
|---|---|
| **G1** (3 gardés sur 4) | **36,5 %** ← le plus cher |
| G2 | 26,0 % |
| G4 (1 gardé sur 2, au marché) | 18,9 % |

G1 est le seul bloc où le jeté arrive **une fois sur trois**. Prendre les 4 de G1
ne coûte donc rien : **ça supprime le choix le plus cher**. Le siège est repris
en G2 (3 → 2), là où le jeté n'arrive qu'une fois sur quatre.

```
3-3-1-1-0  →  4-2-1-1-0        toujours 8 chevaux
```

#### ② Le résultat

| répartition | podium | quinté | ≥4 | chevaux |
|---|---|---|---|---|
| 3-3-1-1-0 (avant) | 40,6 % | 12,5 % | 47,9 % | 8,00 |
| **4-2-1-1-0 (production)** | **46,9 %** | **16,7 %** | **50,0 %** | **8,00** |
| 4-3-1-0-0 (9ᵉ interdit) | 46,9 % | 10,4 % | 60,4 % | 8,00 |

**+6,3 points de podium · +4,2 points de quinté complet**, à nombre de chevaux
constant. Vérifié dans le vrai moteur (`tools/verif-production.mjs`) :
8 chevaux sur **96 / 96** courses.

#### ③ Stabilité et significativité

| | 3-3-1-1-0 | 4-2-1-1-0 |
|---|---|---|
| 1ʳᵉ moitié | 37,5 % · 12,5 % | **47,9 % · 18,8 %** |
| 2ᵈᵉ moitié | 43,8 % · 12,5 % | **45,8 % · 14,6 %** |
| archives (123, blocs = tranches de marché) | 32,5 % · 11,4 % | **44,7 % · 12,2 %** |

Bootstrap apparié, 10 000 tirages, contre 3-3-1-1-0 :
**podium 11 gagnées / 5 perdues (92,0 %)** · **quinté 7 / 3 (86,7 %)**.

Les deux corpus et les deux moitiés vont dans le même sens, et le mécanisme est
structurel (on déplace le siège du bloc le plus cher vers le bloc le moins cher),
pas un ajustement sur l'échantillon.

#### ④ Ce qui a été appliqué

`GROUPES` dans `src/lib/quinte.js` **et** `backend/QUINTE/quinte.js` (copie à
l'octet près — hachée identique) :

```
G1 quota 4 · G2 quota 2 · G3 quota 1 · G4 quota 1 · G5 quota 0
```

`remplirGrille` ne change pas : **G1-G2-G3 au carnet · G4 au marché** (§11.23).
G1 n'a plus de choix à faire (4 cases, quota 4), G5 n'a plus de siège.

⚠ **C'est une décision de l'utilisateur**, pas du moteur : 4 dépasse la latitude
écrite de §11.9 (G1 = 2 ou 3). Elle est prise sur la mesure, et elle reste à
8 chevaux.

#### ⑤ Une piste fermée le même jour

`tools/arbitrage.mjs` — garder la presse **sauf si** le cheval écarté est
nettement plus court au marché (seuils ×1,2 / ×1,5 / ×2 / ×3), puis échanger :

```
seuil ×1,2 : quinté 2 gagnées · 5 perdues   (bootstrap 8,2 %)
seuil ×2   : 1 gagnée  · 0 perdue           (bootstrap 63 %, une seule course)
```

→ **le veto du marché sur la presse perd.** Refermé.

#### ⑥ La dérive de la cote — mesurée, elle aussi perd (20/10/2026)

> L'utilisateur, après §11.31 ①②③ : « c'est la même chose, tu n'as fait
> qu'ajouter une case — le moteur reste aveugle ». Vrai. 4-2-1-1-0 supprime le
> choix le plus cher, il ne fait pas **voir**. Pour voir, il faut un signal que
> la presse n'a pas. Le seul jamais mesuré était là, dans les données :

```
ouverture  →  cote finale      (279 courses sur 280 ont l'ouverture)
```

Un cheval qui **raccourcit** est joué ; un cheval qui **s'allonge** est lâché.
C'est la *direction* de la cote — pas son niveau (« marche », déjà mort).

`tools/derive.mjs`, vraie grille, 96 Quintés à presse réelle — `SORTI` = le
jeté arrive (bas = bon) :

| bloc | carnet | ouverture | marche | **derive** | BASE |
|---|---|---|---|---|---|
| G1 | **36,5 %** | 40,6 % | 44,8 % | 46,9 % | 51,0 % |
| G2 | **26,0 %** | 28,1 % | 26,0 % | 38,5 % | 36,7 % |
| G3 | **26,0 %** | 25,0 % | 30,2 % | 31,3 % | 29,2 % |
| G4 | **15,8 %** | 17,9 % | 18,9 % | 25,3 % | 24,7 % |

Et sur le ticket 4-2-1-1-0, le choix de G2 par la dérive : **quinté 16,7 → 11,5 %**
(bootstrap contre la production : 5 gagnées / 10 perdues, 7,6 %).

→ **la dérive est pire que la presse dans les quatre blocs.** L'argent non plus
ne sait pas. **Refermé.**

#### ⑦ JOCKEY · ENTRAÎNEUR · ÂGE — les trois derniers, mesurés (20/10/2026)

Derniers signaux jamais testés, et les seuls absents des 15 variables déjà
fermées. `tools\collect-jockeys.mjs` va chercher `jockey_name`, `horse_trainer`
et `horse_age` des 96 Quintés à presse réelle (**96/96 collectés**) ;
`tools\jockey.mjs` mesure avec le protocole de §11.30 : taux lissé, la course
mesurée exclue du calcul (LOO), vraie grille.

| bloc | carnet | entraîneur | jockey | âge (le plus jeune) | BASE |
|---|---|---|---|---|---|
| G1 | **36,5 %** | 45,8 % | 51,0 % | 52,1 % | 51,0 % |
| G2 | **26,0 %** | **21,9 %** | 39,6 % | 40,6 % | 36,7 % |
| G3 | **26,0 %** | 26,0 % | 29,2 % | 24,0 % | 29,2 % |
| G4 | **15,8 %** | 25,3 % | 25,3 % | 20,0 % | 24,7 % |

Un seul chiffre bat le carnet : **l'entraîneur en G2 — 21,9 % contre 26,0 %**.
Sur le ticket il ne tient pas : quinté **16,7 → 12,5 %** (bootstrap 6 gagnées /
10 perdues, 12,6 %). Le jockey : **11,5 %**. L'âge : **6,3 %** (le plus jeune),
15,6 % (le plus vieux), contre 16,7 %.

→ **les trois sont refermés.** **18 signaux** mesurés depuis le début : aucun
ne bat le rang de presse dans un bloc.

#### ⑧ Les fichiers

| fichier | rôle |
|---|---|
| `tools\sans-choix.mjs` | le prix du siège + la comparaison 3-3-1-1-0 / 4-2-1-1-0 |
| `tools\verif-production.mjs` | **le ticket réel du moteur** (lit `quotasEffectifs()`), longueur + métriques |
| `tools\derive.mjs` | **la dérive de la cote** (ouverture → finale) — mesurée, rejetée |
| `tools\collect-jockeys.mjs` · `tools\jockey.mjs` | jockey · entraîneur · âge des 96 — mesurés, rejetés |
| `tools\arbitrage.mjs` | le veto du marché — mesuré, rejeté |
| `data\corpus\jockeys96.json` | jockey / entraîneur / âge / poids / ouverture des 96 courses |

---

### 11.32 ⭐ LE TRIO ET L'ORDRE — DEUX CHANGEMENTS MESURÉS (20/10/2026, appliqués)

> Question de l'utilisateur : « ① les 3 premiers ENSEMBLE 46,9 % · ② le bon
> ordre 1-2-3 0 % — il faut un développement. » Réponse mesurée, puis appliquée.

#### ① Le trio : G4 repasse au carnet — `4-2-1-1-0`, G1-G4 carnet

`tools/ameliorer.mjs` énumère **62 répartitions de 8 × 6 règles de choix = 372
combinaisons**. Le trio (les 3 premiers ensemble, n'importe quel ordre) :

| règle | P96 | moitiés | R18 | 5/5 P96 |
|---|---|---|---|---|
| **4-2-1-1-0 · G1-G4 carnet** ← retenu | **47,9 %** | **47,9 / 47,9** | **50,0 %** | 12,5 % |
| 4-2-1-1-0 · G4 marché (avant) | 46,9 % | 47,9 / 45,8 | 44,4 % | **16,7 %** |
| 4-3-1-0-0 | 46,9 % | 50,0 / 43,8 | 44,4 % | 10,4 % |

**Rien ne dépasse 47,9 % sur les 372 combinaisons.** Le prix est nommé : le
quinté complet passe de 16,7 % à 12,5 % (le carnet couvre mieux le trio, le
marché signait mieux les quintés — §11.30 reste vrai pour le 5/5).

#### ② L'ordre du ticket : UNE case prédit, les sept autres non

`tools/ordre2.mjs`, même jeu de 8 chevaux, seule la place change :

| ordre | 1-2-3 exact | **les 3 en tête** | le 1er en case 1 |
|---|---|---|---|
| presse (P croissant) | 2,1 % | 5,2 % | 27,1 % |
| marché (cote croissante) | 0,0 % | 3,1 % | **28,1 %** |
| statistiques de podium (§11.27) | 0,0 % | **0,0 %** | 27,1 % |

⚠ **REFUSÉ PAR L'UTILISATEUR le 20/10** : « cet ordre est trompeur ». Il a raison
— `tools/discrimination.mjs` montre que seul le **1er** du ticket a un pouvoir
mesuré :

```
rang prédit   gagne    dans les 3   dans les 5
1er           27,1 %      53,1 %       65,6 %    ← le seul écart net
2e            10,4 %      40,6 %       53,1 %
3e            11,5 %      37,5 %       50,0 %    ← plat
4e            10,4 %      26,0 %       38,5 %    ← plat
8e             4,2 %      19,8 %       32,3 %
```

AUC de l'ordre complet : **0,61** (hasard 0,50). Réel mais faible.

**Décision (§11.33)** : `ordonnerTicket(ticket, grille)` →
**1re case = le P1 de la presse** (dans le ticket par construction, 4-2-1-1-0
prend les 4 cases de G1), **les 7 autres = un bloc trié par numéro**. La page
l'écrit noir sur blanc sous le ticket. On n'annonce plus de 2e, 3e, 4e, 5e.

Le gain « 3 en tête » (5,2 %) est abandonné : il reposait sur un ordre complet
que les données ne soutiennent pas.

#### ③ Ce que ça change dans le code

| fichier | changement |
|---|---|
| `src/lib/quinte.js` | `CHOIX_DU_BLOC` → `G4: 'carnet'` · `ordonnerTicket(ticket, grille)` (1 case prédit, 7 en bloc) · `remplirGrille` l'appelle |
| `backend/QUINTE/quinte.js` | copie à l'octet près (vérifiée) |
| `frontend/QUINTE/QuinteGrille.jsx` | ticket + colonne Archive triés par `ordonnerTicket` · mention sous le ticket |
| `ordonnerParStats` | **conservé et exporté**, plus appelé par le moteur |

#### ④ Les chiffres du moteur après application

```
P96 · 96 Quintés : podium entier 47,9 %  ·  quinté 12,5 %  ·  ≥4  56,3 %
                   1re moitié 47,9 / 14,6  ·  2e moitié 47,9 / 10,4
R18 · 18 courses : podium entier 50,0 %  ·  ticket 8,00 × 96 et × 18
ordre            : 3 en tête 5,2 % (96) · 1-2-3 exact 2,1 %
```

⚠ **Ce qui n'a PAS changé** : les cinq boîtes P1-P4 / P5-P8 / P9-P10 /
P11-P12 / P13+ (§11.16), la répartition `4-2-1-1-0` (§11.31), et l'interdiction
d'ajouter un cheval. Le trio est le plafond mesuré à 8 chevaux : **47,9 %**.

| outil | question |
|---|---|
| `tools\ameliorer.mjs` | les 372 combinaisons, triées par le trio |
| `tools\ordre2.mjs` | 9 façons d'ordonner le même ticket |
| `tools\verif-trio.mjs` | la preuve course par course : les 3 **ensemble** |
| `tools\top3.mjs` | A contre top-8 presse / marché / fusion, à 8 chevaux |

---

---
---

## 12. 🖥️ L'OUTIL — page `/quinte` (C:\bahja-TURF)

Fichiers :

| Fichier | Rôle |
|---|---|
| `frontend/QUINTE/QuinteGrille.jsx` | la page — **6 onglets** (§12.1) : grille · ticket · archive · statistiques · écarts · **choix** ; + le **badge marché** et le **panneau de mesure** (§11.23) |
| `src/lib/quinte.js` | toute la logique : API, grille, **moteur + marché**, archive, stats |
| ~~`backend/QUINTE/quinte.js`~~ | **SUPPRIMÉ le 05/10/2026.** C'était une copie à l'octet près de `src/lib/quinte.js`, faite pour l'API bahja-pmu. La page importe désormais `src/lib/quinte` directement : plus de copie, plus de désynchronisation. |
| `tools/collect-synthese.mjs` | le collecteur quotidien pronostics-turf.info |
| `tools/cotes.mjs` | **le marché Equidia** → `data/cotes.json`. `chargerCotes(courseId)`, `--force` pour rafraîchir |
| `tools/aujourdhui.mjs` | la grille d'un jour : cotes par bloc, quota rempli, ticket — **appelle le vrai `remplirGrille()`** (§11.22) |
| `tools/collecte-quintes.mjs` | **le jeu de données de §11.18** → `data/quintes.json` (vrais Quintés France) |
| `tools/mesure-quintes.mjs` | **la mesure de référence** : payable / couvre / Quinté, sur 280 Quintés |
| `tools/mesure-moteur.mjs` | **le code contre les règles de choix** (§11.22) : le code, le carnet, le marché, R8, les baselines — 96 courses, LOO |
| `tools/choix-grille.mjs` | ⭐ **LA mesure décisive du choix** (§11.22) : qui remplit chaque bloc (carnet / marché / colonne), blocs du **vrai `buildGrid`** |
| `tools/choix-blocs.mjs` | le même choix, blocs définis par les **rangs de presse** (garde-fou : un autre découpage) |
| `tools/choix-combos.mjs` | les **32 combinaisons** carnet/marché par bloc + LOO honnête |
| `tools/fiabilite.mjs` | ⭐ **le panneau de mesure** (§11.23) → `data/fiabilite.json` + `public/data/fiabilite.json` : la fiabilité du code, les baselines du marché, la table du badge, l'expérience G5 |
| `tools/experience-g5.mjs` | ⭐ **l'expérience du siège de G5** (§11.23) — rapport console **et module** (importé par `fiabilite.mjs` : une seule définition des variantes) |
| `tools/ecarts.mjs` | ⭐ **les écarts des places P1..P20** (§11.23) → `data/ecarts.json` + `public/data/ecarts.json` |
| `tools/collect-forms.mjs` | ⭐ **la carrière des 96 Quintés archivés** (§11.24) — 1 appel casacourses par course → `data/forms.json` (anti-fuite : courses strictement antérieures) |
| `tools/choix-g1g2.mjs` | ⭐ **LA mesure du choix dans G1/G2** (§11.24, §14.6) : diagnostic · levier · les règles · grille G1×G2 · oracle · LOO · stabilité → `data/choix.json` + `public/data/choix.json` |
| `tools/collect-terrain.mjs` | ⭐ **le terrain + le sens des courses passées** (§14.6) — PMU `programme/{JJMMAAAA}` (`penetrometre.intitule`, `corde`) → `data/terrain.json` (`runs` + `jour`) |
| `tools/collect-vh.mjs` | ⭐ **le VH, la corde, la place par cheval et par course** (§14.6) — PMU `…/R{n}/C{m}/participants` (`handicapValeur`, `placeCorde`, `ordreArrivee`) → `data/vh.json` |
| `data/terrain.json` · `data/vh.json` | les deux caches PMU du §14.6 — **committés** (comme `data/forms.json`) car PMU peut purger |
| `tools/test-nonregression.mjs` | le harnais avant/après sur l'archive réelle (`--out`, `--diff`) — **sert de témoin au 5/5 de §11.22** |
| `tools/verif-parite.mjs` | **`src/lib/quinte.js` == `backend/QUINTE/quinte.js` ?** — compare les deux, commentaires ignorés, fonction par fonction (§12) |
| `tools/surprise.mjs` | ⚠ **obsolète** (4 courses, métrique x/5) — la mesure de référence est **§11.18** |
| `tools/verif-marche.mjs` | rejoue l'archive avec le **vrai** `remplirGrille`, avant / après cote |
| `tools/zones.mjs` | **autopsie des zones** : presse ET case de chaque arrivant, périmètre P→P, audit des quotas |
| `tools/g1.mjs` | **autopsie G1** : G1 de chaque course classé par score physique, face à la place réelle |
| `tools/quota-sim.mjs` | **simulation des quotas** : rejoue les courses clôturées avec plusieurs répartitions G1–G5 |
| `tools/moteur.mjs` | **le moteur sur tout l'archive** : quotas tenus par bloc, ticket, x/5 — la vérification quotidienne |
| `tools/deploy.mjs` | build + `vercel deploy --prod` + vérification en ligne → `data/deploy.json`. `--check`, `--force`, `--no-build` |
| `tools/archive-reu.mjs` | archive le programme + le détail de chaque course du jour dans `public/data/reu/` (la page `/r/:slug`) |
| `tools/test-proxy.mjs` | appelle le **vrai** handler des 3 proxies (faux `req`/`res`) — les 2 formes d'appel |
| `tools/test-empreinte.mjs` | l'empreinte des sources ignore-t-elle les horodatages (`collecteLe`) ? |
| `api/_proxy.js` `api/pt.js` `api/tf.js` `api/eq.js` | **les 3 proxies en production** (fonctions Vercel). Voir §12.6 |
| `vite.config.js` | **le MÊME proxy en local** : `/api/pt` → pronostics-turf.info · `/api/tf` → turf-france.com · **`/api/eq` → equidia.fr (le marché)**. Voir §12.6 |

### 12.6 ⭐ /api/pt · /api/tf · /api/eq — local ET production (05/10/2026)

> **Règle : ce qui marche en local doit marcher en ligne. Sinon ce n'est pas fait.**

Les proxies s'appelaient `/pt`, `/tf`, `/eq` et étaient des middlewares **Vite**
(`configureServer`). Ça n'existe QUE sur le serveur de développement.
En production, `vercel.json` leur répondait `index.html` (385 o, HTTP 200) —
donc **échec SILENCIEUX**, aucun message d'erreur.

Mesuré le 05/10, en vrai, sur `bahja-turf.vercel.app` :

| Chemin | avant | après |
|---|---|---|
| `/api/pt/` | 385 o = `index.html` | **19 428 o** — la presse |
| `/api/tf` | 385 o = `index.html` | **23 838 o** — turf-france |
| `/api/eq/courses/2026-10-05/R1/C1` | 385 o = `index.html` | **783 693 o** — `serverApp-state`, 14 partants |

**Le chemin est `/api/<nom>`, pas `/<nom>`.** `/api` est le standard Vercel :
le fichier existe réellement, donc

- en production, la fonction `api/<nom>.js` répond ;
- en local, le middleware de `vite.config.js` répond **exactement la même chose**.

⚠ **Vercel ne route que le chemin EXACT** (`/api/eq`). Son rewrite
`{"source":"/api/eq/:surcharge(.*)","destination":"/api/eq?p=:surcharge"}`
transforme `/api/eq/<suite>` en `/api/eq?p=<suite>`. **Le handler accepte donc
les deux formes** (sous-chemin dans le chemin *ou* dans `?p=`) :
- sans elles, `/api/eq/courses/…` retombait sur le catch-all `/(.*)` → `index.html`.

Ordre obligatoire dans `vercel.json` : les 3 rewrites `/api/*` **pavant**
`{"source":"/(.*)","destination":"/index.html"}`.

Le handler refuse `chemin.startsWith('//')` : `/api/tf?p=https://evil.tld`
relayerait vers une origine étrangère.

Vérification : `node tools\test-proxy.mjs` (10 appels réels, 2 formes × 3 proxies).

#### ✅ Deux corrections du 17/10/2026 (mesurées, pas supposées)

**① `?p=` ne double plus la query.** Quand `p` porte **déjà** la query (la forme
Vercel), `u.search` n'est que l'enveloppe « `?p=…` ». Le middleware de dev
l'ajoutait **quand même** à la fin de la cible :
`…&mode=standard` + `?p=php%2Foscar…` → `mode=standard?p=…`. Sur `reu.php` le
dégât était invisible (le junk tombait sur `pays`, que la page ignore) ; sur un
**outil** (`oscarv2.php`), `mode` devenait `standard?p=…`.
`api/_proxy.js` ne le faisait pas → **les deux transports divergeaient**.
Corrigé : `const query = depuisRequete ? "" : u.search`. Le middleware de dev
passe désormais `req.url` tel quel à `relayer()` (plus de « `/api/tf/<p>` »
pré-construit).

**② `&base=1` — servir une page de l'origine SOUS notre origine.** Pour montrer
un outil **dans** la page (une visionneuse `<iframe>`, §22), la page est relue
par le proxy. Sans `<base>`, ses chemins relatifs (`/php/…`,
`//hôte/pictures/…`) se résolvent **chez nous** et la page sort nue. `base=1`
injecte `<base href="<origine>/">` juste après `<head>` — uniquement quand la
réponse est du `text/html`. Réservé à ce cas : aucun autre appel ne l'utilise.

### 12.1 Les 6 onglets — une identité visuelle PAR onglet (05/10/2026 · 6ᵉ le 16/10/2026)

Les onglets ne doivent jamais se confondre : fond, en-tête, cadre,
police et en-têtes de tableau changent d'un onglet à l'autre.

| Onglet | Couleur | Fond | Caractère |
|---|---|---|---|
| **La grille** | 🟢 vert émeraude `#047857` | dégradé `#ecfdf5 → #fff` | cartes claires, ombre douce — la grille en 3D |
| **Le ticket** | 🔵 bleu nuit `#1d4ed8` | dégradé `#eef2ff → #fff` | tableur plat, coins carrés, chiffres monospace, **zéro ombre** |
| **Archive** | 🟠 ambre parchemin `#b45309` | dégradé `#fef6e7 → #fffcf5` | registre : police **serif**, bordure pleine 2 px, lignes crème |
| **Statistiques** | 🟣 violet prune `#7c3aed` | dégradé `#f5f3ff → #fff` | tableau de bord, cartes 16 px, ombre violette |
| **Écarts** | 🩵 cyan froid `#0e7490` | dégradé `#ecfeff → #fff` | relevé de températures : chiffres monospace, en-têtes capitales (§11.23) |
| **Choix** | 🩸 rouge carmin `#be123c` | dégradé `#fff1f2 → #fff` | rapport d'expérience : coins nets, encadrés de résultat, chiffres monospace (§11.24) |

**Le mécanisme** : un objet `THEME` (6 peaux) + `TABS`. Dans le composant,
`const SK = THEME[onglet]` puis `const s = { box: SK.box, hdr: SK.hdrStyle, th: SK.th, td: SK.td }`
→ **toutes** les tables, tous les cadres et tous les en-têtes suivent l'onglet actif.
Un seul bouton d'onglet = la couleur de sa peau quand il est actif.

> Règle : les couleurs **sémantiques** (vert = bon, rouge = mauvais, ambre = doute)
> ne changent JAMAIS d'un onglet à l'autre. Seul le *chrome* est isolé par onglet.
> ⚠ **Les 4 couleurs sémantiques du badge marché** (§11.23 — `M≤3` vert,
> `M≤5` bleu, `M6-12` ambre, `M13+` rouge) sont **dans** cette règle : elles ne
> dépendent pas de l'onglet.

### 12.2 D'où vient la Synthèse — 3 sources, dans cet ordre

```
① pronostics-turf.info  (direct, via le proxy Vite /pt)   ← LA BONNE
② data/synthese.json    (archive locale du collecteur)
③ bahja-turf-api /api/synthese                           ← Plan B, 16 numéros au lieu de 17
```

⚠️ Le backend `/api/synthese` annonce `source: presse-turfinfo` — **ce n'est pas
pronostics-turf.info**, et il perd le n°15. Il ne sert qu'en dernier recours.

**Les partants que la presse ne cite pas** sont ajoutés à la suite (P(n+1)…)
et marqués d'un `+`. Le 03/10 : n°10 n'est pas cité mais il part → P18.

### 12.3 Format de saisie d'une course

```
2400 PL D Bon Hand 39.5 2
│    │  │ │  │   │      │
│    │  │ │  │   │      └─ place (0 ou >9 = hors du quinté)
│    │  │ │  │   └──────── VH
│    │  │ │  └──────────── type   (Hand · Cl.1 · Cl.2 · Cl.3 · Maid · Listed · Group · MP)
│    │  │ └─────────────── terrain (Bon · Bon souple · Très souple · Lourd · Collant · PSF)
│    │  └────────────────── sens (D droite / G gauche)
│    └───────────────────── code hippodrome
└────────────────────────── distance
```

Une ligne par cheval, courses séparées par `|`, le n° en tête.
Codes : `PL` `CH` `DV` `SC` `CO` `FB` `LM` `CF` `VI` `DI` `AN` `BL` `LL` `CA` `SB` `GB` `AS` …

### 12.4 Le moteur — les 6 critères, calculés tout seul

```
forme 22 %  distance 22 %  piste 18 %  niveau 13 %  terrain 13 %  corde 12 %
```

- **corde** vient du backend (`participants[].corde` = n° de départ) — pas de saisie.
- **les 3 filtres priment sur le score** : un 3/3 passe toujours avant un 2/3.
- **sans carrière saisie**, le moteur retombe sur la forme seule (provisoire) et le signale.

### 12.4 bis ⭐ LE MARCHÉ, dans le moteur (05/10/2026)

> ⚠ **Depuis le 16/10/2026 (§11.22), la cote ne remplit plus qu'un seul bloc :
> G2.** Les autres blocs sont remplis par le **rang de presse** (`place`).
> Ce qui suit décrit le mécanisme de bout en bout (clé, proxy, repli) — il n'a
> pas changé ; seule la règle de choix l'a.

`remplirGrille(grille, classement, discipline, cotes, stats)` a un **4ᵉ argument**.

```
cotes = { n° : { cote, ouverture, tendance, favori, heure } }
```

⭐ **6ᵉ argument `choixDuBloc`** (mesure seule, `null` = production) : permet de
tester une autre règle de choix sans toucher à la page.

- **Si un bloc a la cote de TOUS ses partants ET que c'est un bloc « marché »**
  (aujourd'hui : G2) → c'est la cote qui le remplit (les **quota** meilleures
  cotes, rien d'autre). Le classement n'est pas consulté.
- **Sinon** → le carnet (G1, G3, G4, G5) ou le classement (physique → forme),
  comme avant.
- La page appelle `fetchCotes(cle)` avec la clé `{date}_R{n}_C{m}` (§8.1) via le
  proxy `/eq`, **rafraîchit toutes les 60 s**, et affiche la cote sur chaque
  boule + l'heure du relevé.
- La clé vient de `cleEquidia(date, meeting, race)` : casacourses ne donne ni la
  réunion ni le numéro de course → `meeting.reunion_code` + **l'index de la course
  dans `meeting.races`**.
- `data/cotes.json` (le cache du job) est copié dans `public/data/cotes.json`
  comme **repli hors-ligne** si le proxy `/eq` est coupé.

### 12.5 Validation — 03/10/2026 ParisLongchamp

Avec la carrière saisie à la main, le moteur a retrouvé **exactement** le ticket
obtenu avec l'analyse manuelle :

```
G1 : 4 · 13 · 9        (8 exclu — 0/5 course ≥ 2200 m)
G2 : 3 · 18            (11 exclu — 0/4 ≥ 2200 m · 6 exclu — VH +3)
G3 : 5                 (16 exclu — forme 2.69)
G4 : 1                 (2 exclu — 64 j d'absence, 4100 m en Angleterre)
G5 : 14

TICKET  4 · 13 · 9 · 3 · 18 · 5 · 1 · 14   (8 chevaux)
```

**Et surtout : n°11 SHARPSHOOT, forme 8.22 (n°1 du lot), tombe à 5.35 et 1/3
→ il sort du ticket.** C'est exactement le piège que la règle « physique > forme »
doit attraper, et le moteur l'attrape seul.

---

## 13. 🗓️ LE JOB QUOTIDIEN — l'archive se remplit toute seule

Le site **pronostics-turf.info n'a pas d'archive** : demain la Synthèse d'aujourd'hui
a disparu. Sans sauvegarde automatique, on perd la donnée la plus valuable.

### 13.1 Le fichier

| Fichier | Rôle |
|---|---|
| `tools/daily.mjs` | le job : clôturer hier + collecter aujourd'hui + **lire le marché** + bilan |
| `tools/quinte-daily.bat` | wrapper Windows (évite les guillemets de schtasks) |
| `data/synthese.json` | **l'archive** : Synthèse + ticket + arrivée + hippodrome + discipline + distance, par date |
| `public/data/synthese.json` | copie pour la page web |
| `data/cotes.json` | **le marché Equidia**, par `courseId` (`cotes[].{num,cote,ouverture,tendance,favori}`) |
| `public/data/cotes.json` | copie pour la page (repli si le proxy `/eq` est coupé) |
| `data/carriere.json` | les carrières saisies (clé = date) — optionnel |
| `data/daily.log` | journal, une ligne par action |

### 13.2 Ce que fait le cycle

```
clôture HIER   → on récupère l'ARRIVÉE, on calcule le  x/5
collecte JOUR  → on lit la Synthèse du jour, on construit le ticket, on enregistre
marché         → chargerCotes(courseId) sur equidia.fr → data/cotes.json
                 (si la cote est complète : mode `+marche`, le ticket change)
archive-reu    → node tools\archive-reu.mjs <date>  (enfant, jamais bloquant)
                 → public/data/reu/<date>_R.._C.._<PAYS>.json
publier données→ node tools\publier-archive.mjs --auto  (enfant, jamais bloquant)
                 commit limité aux chemins de données + push → Vercel redéploie
                 BAHJA_SANS_PUBLICATION=1 → saute ce pas (voir §13.7)
publier        → node tools\deploy.mjs  (enfant, dernier pas)
                 build + vercel deploy --prod + vérification en ligne
                 BAHJA_SANS_DEPLOY=1 → saute la publication (tests)
bilan          → N courses, N avec résultat, N en 5/5
```

> **`archive-reu` est le 5ᵉ pas du cycle** (ajouté le 05/10/2026). Sans lui, la
> page `/r/:slug` affiche « Cette course n'est pas disponible » en production :
> le fichier doit exister **avant** le deploy. Il tourne en processus enfant,
> avec `stdio` ignoré : un échec ne fait jamais tomber le job.

> **`publier` est le 6ᵉ pas** (ajouté le 05/10/2026, sur accord de l'utilisateur).
> C'est lui qui tient la promesse « ce qui marche en local marche en ligne » :
> le job collecte, **et** le site suit, tout seul, à 08 h 45 et à 20 h 30.
>
> `deploy.mjs` compare l'empreinte des sources avec `data/deploy.json` :
> **rien n'a changé → rien n'est publié** (il fait quand même le build, ~13 s).
> Les horodatages (`collecteLe`) sont **neutralisés** dans le calcul de
> l'empreinte : sans ça, chaque run publierait un site identique.
> Test : `node tools\test-empreinte.mjs`.

### 13.3 ⚠ Les 7 règles de sécurité (learned the hard way)

1. **Jamais de Synthèse pour une date passée.** Le site n'affiche QUE la course du
   jour. Collecter `hier()` écrase l'archive avec la Synthèse d'aujourd'hui.
   → `cloturer()` ne touche jamais à `synthese`, seulement à `arrivee`.
2. **Priorité stricte : site > archive > backend.**
   L'archive vient du site. Le backend perd le n°15 et vient de presse-turfinfo :
   c'est un plan B, jamais un remplacement.
3. **Une page vide n'écrit rien.** 31 octets = le site bloque (Crawl-delay: 10).
4. **Un ticket `ticketSource: 'manuel'` est intouchable.** Le job ne le recalcule
   que s'il dispose d'une carrière **et** obtient soit un score `physique`,
   soit un **marché complet** (`mode` contient `+marche`).
5. **Le marché est un instantané.** Equidia donne la cote de l'instant ; le ticket
   archive est celui du run (08 h 45 / 20 h 30), **pas** celui d'avant le départ.
   Le ticket à jouer est celui affiché sur la page au moment de parier (§11.17).
6. **DEUX gels, pas un, pas trois (09/10/2026).** Le gel du matin fige un
   marché de nuit sans valeur (01:55, 02:33, 03:02 — prouvé sur 7 tickets).
   Entre départ-90 et départ-10, `quinte-daily.bat --final` re-gèle UNE fois
   avec le marché du moment (`ticketSource: 'final'`, le matin gardé dans
   `ticketMatin`). Après : verrouillé. Niveaux : page < auto < final <
   manuel — un niveau n'écrase que les niveaux inférieurs, jamais l'inverse.
   La page ne fige que sur marché ouvert (≥04:30 GMT — le PMU ouvre à
   04:00 GMT ; avant il n'y a ni cotes ni argent). Hors de [04:30, 22:00[
   GMT, elle affiche SANS figer.
   ⭐ GMT PARTOUT (09/10/2026) : toutes les heures affichées et loggées sont
   en GMT (ISO `Z`, colonne `Posé le (GMT)`, logs du job). La fenêtre
   [départ-90, départ-10] se calcule en heure de Paris (fuseau de la course)
   mais se LIT en GMT.
   ⭐ ORDRE VIVANT (09/10/2026, décision utilisateur) : le gel fige la
   SÉLECTION (les 8 chevaux), jamais l'ordre. L'ordre se recalcule à chaque
   affichage depuis les Statistiques — il suit l'archive qui grossit.
   ⭐ STATUT VISIBLE (09/10/2026) : chaque ticket porte son statut —
   PROVISOIRE (matin/page, ambre), DÉFINITIF (re-gel avant-course, vert),
   MANUEL (bleu), LIVE (rien de gelé, gris). Colonne `Statut` dans
   l'Archive + badge dans l'onglet Ticket. Course courue (arrivée connue) :
   CLÔTURÉ — le ticket est jugé, la question provisoire/définitif ne se pose plus.
   ⚠ **révisé le 16/10/2026 : le badge dit l'état du ticket AFFICHÉ, pas
   l'état du gel — voir règle 8.**
7. **AUCUN NON-PARTANT DANS UN TICKET (16/10/2026).** Le ticket est figé sur la
   liste des **DÉCLARÉS** ; si un cheval est retiré ensuite, le figé garde un
   numéro FANTÔME — **16 au 16/10** (course à 15 partants), **18 au 10/10**,
   **17 au 08/10**. Trois verrous, dans `src/lib/quinte.js` (et son miroir
   `backend/QUINTE/quinte.js`) :
   - `ticketValide(rec)` — un ticket d'archive ne cite que `rec.runners`. On ne
     **complète pas** : l'archive dit ce qui a été joué, pas ce qu'on aurait dû
     jouer (§7 : on n'invente rien). On ne juge que si la liste est cohérente
     avec l'arrivée (arrivée ⊆ partants).
   - `ticketAffiche(ticket, rempli)` — le ticket **affiché** retire les fantômes
     et reprend la case que le moteur a retenue **dans le même groupe**, quota
     tenu (§11.19). Le ticket jouable garde ses 8 chevaux.
   - `syncDepuisDisque()` — la correction se fait à la **synchro** : course pas
     encore courue → le gel est **effacé** (il se refera juste) ; course courue
     → seuls les partants réels restent.
   ⚠ `buildGrid(synthese, runners)` filtrait DÉJÀ la liste de presse (§11.21) :
   le trou venait du **ticket gelé**, pas de la grille.
8. **L'AFFICHAGE SUIT LE MARCHÉ, LE GEL RESTE DANS L'ARCHIVE (16/10/2026).**
   Tant que la course n'est pas courue, l'onglet Ticket montre le ticket
   **LIVE** (relu toutes les minutes) — seule exception : `ticketSource:
   'manuel'`. Le gel du matin / de la page / final est une **trace d'archive** :
   il vit dans l'onglet Archive, avec sa source et son heure. « Le ticket ne
   change jamais » venait de là : la page rechargeait le gel dans l'affichage
   (ligne `setTicketManuel(res.ticket)` du gel auto) et se figeait sur le
   premier ticket de la journée. C'est exactement ce que §11.17 interdit — on
   parie sur le ticket du moment, pas sur celui du matin.
   ⚠ **le gel doit donc être BORNÉ** : `attachTicket` ne fige que le premier
   ticket, mais `listArchive()` rend un tableau **neuf** à chaque appel —
   `setArchive` relançait `stats` (`computeStats` sur toute l'archive) →
   `rempli` → `ticketAuto` → l'effet → `setArchive`… et l'onglet bouclait,
   CPU à 100 % (« l'appli est quasi gelée », 16/10/2026). Cette boucle était
   coupée par `setTicketManuel(res.ticket)` ; celui-ci étant supprimé, il
   faut un garde explicite : `gelFait = useRef(null)` → **un seul gel par
   date et par session**.

### 13.4 L'automatisation Windows

```
schtasks /Create /TN "Quinte AM" /TR "C:\bahja-TURF\tools\quinte-daily.bat" /SC DAILY /ST 08:45
schtasks /Create /TN "Quinte PM" /TR "C:\bahja-TURF\tools\quinte-daily.bat" /SC DAILY /ST 20:30
schtasks /Create /TN "Quinte Final" /TR "C:\bahja-TURF\tools\quinte-daily.bat --final" /SC DAILY /ST 08:00 /RI 30 /DU 13:00
schtasks /Create /TN "Quinte Cotes" /TR "C:\bahja-TURF\tools\quinte-daily.bat --cotes" /SC DAILY /ST 04:35
```

⭐ LES 3 INSTANTS DU MARCHÉ (09/10/2026) : pour savoir QUEL timing donne
les meilleurs tickets, le marché est photographié 3 fois par course dans
`data/cotes.json[courseId].snapshots` : `ouverture` (04:35, juste après
l'ouverture PMU 04:00 GMT), `h_moins_3` ([H-3h15, H-2h45], runs --final),
`h_moins_2` ([H-2h15, H-1h45]). Un seul snapshot par label (le premier).
La racine `cotes` suit toujours le DERNIER marché lu (compat : moteur +
repli page inchangés) — `chargerCotes()` ne les écrase plus (testé).

⭐ MARCHÉ FRAIS AU FINAL (10/10/2026) : le re-gel d'avant-course FORCE la
relecture d'equidia (`chargerCotes(courseId, {force:true})`). Avant, le
cache du matin était réutilisé tel quel → FINAL == ticket du matin, le
marché n'avait AUCUN effet (« le marché ne change rien », constaté par
l'utilisateur le 10/10). Depuis, le FINAL voit le marché de l'instant ;
repli sur le cache seulement si le réseau échoue.

⭐ PLAN B CASA-COURSES (10/10/2026) : casacourses peut manquer la réunion
du Quinté (le 10/10, CAEN était absent — seul Pontchâteau R12 sortait —
et le matin le ticket est resté `null`). `trouverCourse()` bascule alors
sur Equidia : la redirection `quinte` du JSON de la page programme donne
`R{n}/C{m}`, puis la fiche `v2/courses/…` fournit partants, distance,
heure (fuseau Paris). Jamais de données inventées : si ni casacourses ni
equidia ne répondent, le moteur dit « pas de ticket » plutôt que de
fabriquer un ordre.
(final : toutes les 30 min 11:00→20:00 ; le job ne gèle que dans
[départ-90, départ-10], une fois — test : `node tools\test-gel.mjs`, 19 OK)

Déjà installés. Pour les effacer :

```
schtasks /Delete /TN "Quinte AM" /F
schtasks /Delete /TN "Quinte PM" /F
```

### 13.5 Les carrières hors navigateur

La page les garde dans localStorage. Pour que le job autonome puisse recalculer un
ticket physique : bouton **⬇ carriere.json** (onglet Carrière) → poser le fichier
téléchargé dans `C:\bahja-TURF\data\`. Ensuite `daily.mjs` lit `data/carriere.json`
et bascule en mode `physique`.

### 13.6 ⭐ LES 3 OBSERVATIONS DU 16/10/2026 — ce qui a été corrigé

L'utilisateur a donné trois défauts, tous vérifiés dans le code puis dans le
navigateur. Aucun ne touche la méthode (quotas `3-2-1-1-1` intacts).

| # | Le défaut vu | La cause | Le correctif |
|---|---|---|---|
| ① | « le ticket ne change jamais » | la page rechargeait le gel auto dans l'affichage (`setTicketManuel(res.ticket)`) : le 1er ticket de la journée restait affiché toute la journée | §13.3 règle 8 : l'affichage suit le marché ; le gel reste dans l'Archive |
| ② | le ticket porte un **16** et la course n'a que **15** partants | le ticket a été figé la veille sur la liste des **déclarés** (16) ; le 16 a été retiré ensuite, le figé ne l'a pas vu | §13.3 règle 7 (`ticketValide`, `ticketAffiche`, synchro) + archive réparée |
| ③ | la page de course (Programme → Analyse) n'affiche pas le **Top10 des Cotes de Références** | `frontend/ARTICLE/Article.jsx` lisait `tops.chevaux` / `drivers` / `entraineurs` alors que le parseur range sous `top10chevaux` / `top10drivers` / `top10entraineurs` ; et `TF_ALIAS` n'avait pas `aptitude1er` (ligne « Aptitude 1er » vide) | clés alignées dans `Article.jsx` + alias `aptitude1er` / `aptitudegagnant` → `aptitudeGagnant` dans `backend/ARTICLE/turfFrance.js` |
| ③b | …et même corrigé, la page restait vide : **l'archive du navigateur** gardait les anciens tableaux (parsés avant le correctif) | les tableaux étaient servis par le cache localStorage, jamais relus | `Article.jsx` **relit les tableaux à la source à chaque affichage** (`chargerTopsTurfFrance(off, date)`), l'archive devient le repli ; `chargerTopsTurfFrance` refuse une page dont la **date** n'est pas celle demandée (le site accepte les offsets -1/-6/-30, vérifié) |

⚠ **Les lignes qui restent à « — » sont vides À LA SOURCE**, ce n'est pas un
défaut d'affichage. Vérifié dans le HTML du 16/10 :

```html
<td>Aptitude 1er</td><td>4 - 5</td>   ← la valeur existe (affichée depuis le correctif)
<td>Aptitude placé</td><td></td>       ← vide chez turf-france
<td>Pour une place</td><td></td>       ← vide chez turf-france
                                       ← « Top Cordes » : la ligne n'existe pas du tout ce jour-là
```

Les 19 lignes sont **toujours affichées**, même vides : on voit ce que
turf-france publie réellement, et ce qu'il ne publie pas (choix assumé dans
`Article.jsx`).

**Preuve ③** (16/10, Vincennes R1C4, `tqqjour.php`) — les 3 lignes vides :

```
Chevaux     : 6 - 3 - 7 - 11 - 2 - 8 - 15 - 14 - 12 - 10     (était « — »)
Drivers     : 13 - 15 - 8 - 12 - 6 - 11 - 1 - 4 - 3 - 5      (était « — »)
Entraineurs : 13 - 1 - 12 - 11 - 6 - 15 - 9 - 2 - 5 - 7      (était « — »)
Aptitude 1er: 4 - 5                                          (était « — »)
```

⚠ La page **Programme** (`/`, liste des réunions via `reu.php`) n'a **pas** de
Top10 : cette donnée n'existe que sur la page de course (`/r/:slug`,
`tqqjour.php`). Le Top10 est donc affiché là où la source le donne.

---

### 13.7 ⭐ LA PUBLICATION DES DONNÉES EST AUTOMATIQUE (18/10/2026)

**Le problème mesuré le 18/10.** Le site servait une archive périmée. La cause
n'était pas la collecte : `data/deploy.json` datait du **07/10 21:17** — le pas
`publier` (Vercel CLI) était **mort depuis 11 jours, sans le dire**. Le site
n'était plus tenu à jour que par les envois de code à la main, qui poussent la
version du **dépôt** : donc une archive ancienne, à chaque fois plus ancienne.

**La règle maintenant.** Les données voyagent par **git**, pas par la CLI.
`tools\publier-archive.mjs` est la seule porte de sortie ; le cycle du job
l'appelle après la collecte (`publierDonnees()`, juste avant `publier()`) :

```
collecte  →  public/data/* écrit
          →  publier-archive.mjs --auto
               git add -f -A -- <chemins de données>
               git commit -m "donnees : …" -- <chemins de données>
               git push origin main        →  Vercel redéploie tout seul
```

**Ce qui est publié** — et rien d'autre :

| Chemin | Ce que la page en fait |
|---|---|
| `public/data/synthese.json` | l'archive : tickets, arrivées, x/5 |
| `public/data/cotes.json` | le marché (repli hors-ligne) |
| `public/data/fiabilite.json` · `ecarts.json` · `choix.json` | l'onglet Statistiques |
| `public/data/reu/` | les fiches de courses + `prog-{date}.json` |
| `public/data/coply-modele.json` · `contextual-selection.json` · `empreinte*.json` · `ticket-groupe.json` | la page Coply |

Le pas existe aussi **hors du cycle** : `--final` (re-gel avant-course) et
`--cotes` (photo d'ouverture) réécrivent `public/data/*`, donc ils publient
aussi — sans quoi le site garderait le ticket du matin jusqu'au run de 20 h 30.

⚠ Le **Coply** (`coply-modele`, `contextual-selection`, `empreinte*`,
`ticket-groupe`) est entré dans le lot le 18/10/2026, à la demande de
l'utilisateur : ses pages lisent ces fichiers en direct, ils voyagent donc comme
les autres. La liste complète est en tête de `tools\publier-archive.mjs`.

**Les 3 garde-fous :**

1. **Le commit est limité à ces chemins** (`git commit -m … -- <chemins>`).
   Le travail en cours sur le disque — autre fichier modifié, index déjà garni,
   1000 fichiers non suivis — **ne part jamais**. Vérifié le 18/10 : après
   publication, `api/couple.js`, `data/nr-*.json` et `archivecouple/` étaient
   toujours locaux.
2. **Un échec ne casse rien** : processus enfant, `stdio` capturé, journalisé
   en une ligne (`donnees : 1 fichier(s) publie(s)` ou `donnees : ECHEC …`).
   La collecte est déjà écrite. `BAHJA_SANS_PUBLICATION=1` saute le pas.
3. **`--dry-run` montre sans publier** (liste des fichiers, sortie 1).

**Mesure du 18/10** : **290 fichiers** publiés d'un coup (essentiellement les
fiches de courses du 08/10 au 13/10, jamais envoyées), puis **1 seul** fichier
au run suivant (le ticket du jour gelé). En ligne après ~40 s :
`/data/synthese.json` = **17 dates** · `/data/reu/prog-2026-10-13.json` = 200.

⚠ **La collecte, elle, tournait très bien — et c'est le piège.** La tâche de
08 h 45 a bien tourné le 17/10 (dernière exécution **10:16:14**, résultat 0) et
le dernier cycle complet est celui du **17/10 à 21:59**. Ce n'était donc pas le
planificateur qu'il fallait réparer : c'était le **canal d'envoi**, mort en
silence depuis le 07/10. Leçon : **un pas qui échoue sans le dire laisse croire
que tout va bien** — d'où la ligne de journal à chaque publication, désormais.

### 13.8 🚨 LE DÉPLOIEMENT GIT ÉCRASE LE TRAVAIL NON COMMITÉ (28/10/2026)

> **Symptôme** : le site perd du travail déjà « déployé ». Le 28/10 au matin le
> compte `sam` s'est retrouvé bloqué (« connexion depuis un autre appareil ») et
> le ticket 3-2-1-1-1 avait disparu, alors que `tools/deploy.mjs` avait répondu
> `a jour : OUI` quelques heures plus tôt.

**La cause n'était pas le code.** Le projet Vercel `bahja-turf` a une
**intégration Git** (`github LBAHJA-SA/bahja-turf`, branche `main`) en plus du
déploiement CLI. Le job de données de **04 h 35** a commité l'archive et poussé
sur `main` → Vercel a construit **le dépôt**, pas le disque. Comme `api/`,
`src/` et `frontend/` n'étaient pas commités depuis le 27/10 01 h 16, la
production est revenue au code de la veille. Le déploiement Git (04:35:15) est
plus récent que le CLI (04:33:00) : il gagne l'alias.

| ce qu'on croyait | ce qui se passait |
|---|---|
| `deploy.mjs` publie le disque | il publie le disque **une fois**, puis le prochain push du job de données republie **le dépôt** |
| le commit de données ne touche qu'aux données | le **déploiement**, lui, emporte tout le dépôt |
| `deploy.mjs --check` = le site est à jour | il compare le disque au déploiement **courant**, pas à ce que le prochain push va produire |

**Les deux protections ajoutées :**

1. **`api/admin.js?action=etat` renvoie `version: 'verrou-admin-2'`.** Le bundle
   HTML ne prouve rien sur `api/` : c'est ce champ qui dit si la fonction en
   ligne est la bonne. (`pronostics` → `401 session requise` au lieu de
   `400 action inconnue` = la fonction du 27/10 est bien en place.)
2. **`tools/publier-archive.mjs` crie AVANT de pousser** s'il reste du code non
   commité (`codeEnAttente()`, dans les deux modes — `--auto` écrit au journal) :

```
⚠ 2 fichier(s) de CODE non commité(s) : ce push va redéployer le dépôt
  → avant de publier :  git add -A -- . ":!data"   puis   git commit
```

**La règle qui en sort :** avant de pousser quoi que ce soit — données
comprises — **le disque doit être propre pour le code**. Un `git push` n'est pas
un envoi de données, c'est un envoi de dépôt.

⚠ `.gitignore` ignore désormais `dna-course/`, `archivecouple/`, `.agents/` et
`skills-lock.json` : des copies locales de pages (6 901 + 4 526 fichiers, aucun
import), qui n'ont rien à faire dans un commit ni dans un déploiement.

---

### 13.9 🔑 « nom ou mot de passe incorrect » — la clé de secours (29/10/2026)

> Incident réel : le propriétaire ne pouvait plus entrer sur `/admin`, avec pour
> seul message `nom ou mot de passe incorrect`, et **aucun moyen de vérifier
> quoi que ce soit depuis l'extérieur**.

#### ① Ce que le diagnostic a trouvé

`GET /api/admin?action=etat` répondait `configure: true · comptes: 3` : le
serveur lisait donc bien une liste de trois comptes. Le 401 ne venait pas d'une
variable absente — il venait d'un **hash qui ne correspondait plus** au mot de
passe tapé.

Et surtout, `GET /v9/projects/{id}/env` a montré **trois exemplaires de la même
variable** :

| id | type | cible | valeur relisible ? |
|---|---|---|---|
| `ibbhp…` | `sensitive` | **production** | ❌ jamais rendue |
| `zssp…` | `encrypted` | development | ❌ chiffrée (`{"v":"v2","c":"…"}`) |
| `7e6RL…` | `sensitive` | preview | ❌ jamais rendue |

**Vercel ne rend JAMAIS la valeur d'une variable `sensitive`.** Conséquences :

- impossible de relire un hash perdu ;
- impossible de reconstruire la liste sans **effacer les deux autres comptes** ;
- le 401 est donc **indiagnosticable de l'extérieur** — c'est ça, le vrai défaut.

#### ② La correction : une clé de secours, en FUSION

`api/_session.js → comptes()` lit désormais **`ADMIN_COMPTES_RECOURS` en
premier** et la **fusionne** avec `ADMIN_COMPTES` (dédoublonnage par nom, la
clé de secours gagne) :

```js
const secours = lire('ADMIN_COMPTES_RECOURS')
const normaux = lire('ADMIN_COMPTES')
if (!secours.length) return normaux
const pris = new Set(secours.map((c) => String(c.nom).toLowerCase()))
return [...secours, ...normaux.filter((c) => !pris.has(...))]
```

**Rien n'est remplacé, rien n'est détruit** : les autres comptes gardent leur
hash et continuent de fonctionner. Le compte de secours passe en tête pour que
`find(nom)` le trouve avant un homonyme resté dans l'ancienne liste.

`tools/recours.mjs` :

| commande | ce qu'elle fait |
|---|---|
| `node tools\recours.mjs` | mot de passe lisible (14 car., sans `0O1lI5S`) + `sel`/`iter`/`hash` avec **le calcul exact du serveur** (PBKDF2-SHA256, 210 000, 32 octets) → pose la variable sur production + preview + development → affiche le mot de passe **une fois** (copie locale `.recours.json`, ignorée par git) |
| `--verifier` | login de bout en bout contre `bahja-turf.vercel.app` |
| `--retirer` | efface la clé de secours (à faire quand l'accès est revenu) |

⚠ **Une variable d'environnement ne prend effet qu'au déploiement suivant** :
poser la clé ne suffit pas, il faut pousser. Vérifié le 29/10 :

```
deploiement … · BUILDING → READY
etat   = {configure:true, comptes:3, version:"verrou-admin-2"}
login  → HTTP 200  {ok:true, nom:"sam", pages:[…, "admin"]}
session → {connecte:true, abonnement:{etat:"illimite"}}
pronostics (admin) → 200
```

#### ③ La règle qui reste

- **Un hash perdu ne se relit pas.** La seule sortie est de **poser** une valeur
  neuve — d'où la clé de secours, qui évite d'écraser les autres comptes.
- **Ne jamais compter sur `?action=etat`** pour dire *qui* existe : il ne donne
  qu'un **nombre** (`comptes().length`). Le nom vient de `connexions` (Redis).
- **`sensitive` ≠ `encrypted`** : la première est masquée à jamais, la seconde
  est chiffrée en `{v,c,k}` — **aucune des deux n'est relisible**. Ne pas perdre
  le `.recours.json` avant d'avoir retapé un mot de passe dans la console.
- Une fois dedans : **changer le mot de passe depuis la console**, puis
  `node tools\recours.mjs --retirer` + push. Sinon la clé de secours garde son
  propre hash (l'ancien mot de passe resterait valable, et l'abonnement du
  compte de secours est `illimité`).
- ⚠ **Fait le 29/10** — la clé a été retirée ; la liste vit désormais dans
  `ADMIN_COMPTES` seule. Voir §13.10 (et `tools/comptes.mjs`).

---

### 13.10 🧨 « حذف المستخدم لا يعمل » — TROIS CAUSES QUI SE CUMULAIENT (29/10/2026)

> Symptômes rapportés, dans cet ordre : « Compte bloqué : nouvel appareil
> détecté » alors que l'appareil n'a pas changé, puis **« même supprimer un
> utilisateur ne marche pas »**. Aucun des deux n'était un problème de droits :
> c'étaient **trois défauts de plomberie**, chacun capable à lui seul de rendre
> la console menteuse.

#### ① Le redéploiement ne partait JAMAIS (`name` manquant)

`api/admin.js` relançait le déploiement ainsi :

```js
POST /v13/deployments?forceNew=1   { "deploymentId": "dpl_…" }
```

Vercel répond **`400 Invalid request: missing required property name`**. La
valeur était donc **enregistrée** (les trois `PATCH` passaient), le
redéploiement **échouait**, et la fonction continuait de lire l'ancienne liste.
La console affichait « Données enregistrées, mais le redéploiement a échoué »
— ce qui, côté utilisateur, s'appelle « la suppression ne marche pas ».

```js
// maintenant
{ name: 'bahja-turf', target: 'production', deploymentId: dpl }
```

#### ② Les doublons d'`ADMIN_COMPTES` n'étaient jamais nettoyés

`envs.find(key === 'ADMIN_COMPTES' && target.includes(cible))` prenait la
**première** variable de chaque cible et ignorait les autres : une copie
résiduelle gardait l'ancienne liste et **remettait le compte supprimé**.

Désormais : on écrit sur la première variable de chaque cible, puis on
**supprime les autres** (`DELETE /v9/projects/{id}/env/{envId}`). Après un
enregistrement il n'existe plus qu'une `ADMIN_COMPTES` par cible.

#### ③ La clé de secours contredisait la console — et l'Edge refusait sa session

- `comptes()` (dans `_session.js`) lit `ADMIN_COMPTES_RECOURS` **en premier** et
  dédoublonne par nom : **la clé de secours gagne**. Modifier ou supprimer
  « sam » depuis la console était donc **sans effet visible** — et son hash dans
  `ADMIN_COMPTES` restait périmé.
- `api/_acces.js` (la version Edge) lisait `ADMIN_COMPTES` **seul**. Le cookie
  du compte de secours était signé par `admin.js` puis **refusé** ici ; la
  vérification retombait sur l'ancien « sam » (sans `admin`), donc **soumise au
  verrou d'appareil** → « Compte bloqué : nouvel appareil détecté ».

Corrigé : `_acces.js` a la **même fusion** que `_session.js` (une seule liste
pour tout le monde).

#### La sortie : consolider, puis supprimer la clé de secours

`tools/comptes.mjs` :

| commande | ce qu'elle fait |
|---|---|
| `node tools\comptes.mjs` | montre la liste **réelle** (nom, admin, actif, abonnement, bloqué, début de hash) et les variables Vercel |
| `--consolider` | lit la liste avec le mot de passe de `.recours.json` (via `?action=comptes`, qui rend `sel`/`iter`/`hash`), la réécrit **une seule fois par cible**, supprime `ADMIN_COMPTES_RECOURS`, redéploie et vérifie le login |
| `--verifier` | login de bout en bout |

Fait le 29/10 : **`ADMIN_COMPTES` = `sam` (admin) · `HAJBANE` · `hajban`**,
clé de secours **supprimée**, les trois hashes conservés (le mot de passe
existant continue de fonctionner).

#### La preuve — ajouter puis supprimer un compte, pour de vrai

```
départ      : sam · HAJBANE · hajban
+ compte    : déploiement dpl_BJPq…    → après ajout  : sam · HAJBANE · hajban · essai-suppression
− compte    : déploiement dpl_HsEn…    → après suppr. : sam · HAJBANE · hajban
✓ ajouter puis supprimer un compte AGIT vraiment
```

#### Les règles qui restent

1. **Une écriture de la console ne vaut que si un déploiement part.** Le retour
   de `?action=comptes` (POST) contient `deploiement.id` : sans lui, rien n'a
   changé côté fonction.
2. **Une seule `ADMIN_COMPTES` par cible.** Un doublon est un compte zombie.
3. **Une clé de secours n'est pas une solution permanente** : tant qu'elle
   existe, elle gagne sur la console. On la retire dès que l'accès est revenu.
4. **`_session.js` et `_acces.js` doivent lire la même liste.** Tout ce qui
   signe un cookie doit pouvoir le relire ailleurs — sinon le cookie est refusé
   par la moitié du site.

---

## 14. ⚡ LA CARRIÈRE AUTOMATIQUE — fini de saisir à la main

### 14.1 Pourquoi

Saisir 18 chevaux × 5 courses × 7 champs = **90 champs par course**. Ingérable.
Et le besoin réel est plus étroit : les 3 filtres (§5) n'utilisent que
**la distance** et **la place**.

### 14.2 La source

| Source | Ce qu'elle donne | CORS |
|---|---|---|
| `pro.casacourses.com/api/race/{id}` | `runners[].forms[]` → **date, distance, place** | `*` ✅ |
| `pro.casacourses.com/api/programme?date=` | course → **hippodrome** (meeting.track) | `*` ✅ |

Les `forms` ne donnent **ni terrain, ni type, ni VH** : ces trois champs restent
`__` (inconnu = neutre, jamais pénalisé). Conséquence : **le filtre ③ (niveau)
ne tourne pas en auto**. Les filtres ① distance et ② forme, eux, sont complets.

### 14.3 Ce que ça donne

`autoCarriere(courseId, onProgress)` → 18 lignes, 89 courses, 69/89 hippodromes
reconnus (le reste est à l'étranger : GB, IT, MA, etc.).

Validation sur le 03/10 — **résultats identiques à l'analyse manuelle** :

| Filtre | Manuel | Auto |
|---|---|---|
| n°8 COLGAN SENORA | 0/5 course ≥ 2200 m | **0/5** ✅ |
| n°11 SHARPSHOOT | 0/4 ≥ 2200 m, VH +3 | **0/5** ✅ (forme 8.22, le plus haut — et écarté) |
| n°16 ZELKER | forme 2.69 | **2.69** ✅ |

Groupes obtenus : G1 `4 · 13 · 9` · G3 `5` · G5 `14` — identiques au manuel.
Écarts sur G2 et G4 : ce sont exactement les cas où il fallait le **VH**
(n°6 refusé pour VH +3, n°2 pour 64 jours d'absence). Le regard de l'utilisateur
règle ces deux-là.

### 14.4 Les 3 corrections qui ont été nécessaires

1. **`cand.courseId` était `undefined`** dans `infos()` — les candidats sont
   `{id, m, c}`, pas `{courseId}`. Sans cela le bouton ne trouvait pas la course.
2. **Les filtres sont éliminatoires** (§5), pas un simple compte de points.
   → `clePhysique()` : échec ① = 4, ② = 2, ③ = 1. Un cheval qui rate un filtre
   passe **derrière** tous ceux qui les passent tous.
3. **`remplirGrille()` retriait par `ok` puis `global`**, ignorant l'ordre du
   classement reçu. Elle respecte maintenant le rang d'arrivée (le classement
   arrive déjà trié : physique si carrière dispo, sinon ordre du carnet).

### 14.5 Où c'est accessible

| Où | Comment |
|---|---|
| Page | onglet **Carrière** → bouton **⚡ Remplir automatiquement** |
| Job | `tools/daily.mjs` l'appelle tout seul s'il n'y a pas de `data/carriere.json` |
| Test | `node tools/test-auto.mjs 2026-10-03_R1_C4` |

Durée : ~45 s (1 appel course + ~56 appels programmes, 6 en parallèle).

---

### 14.6 ⭐ LA CARRIÈRE COMPLÈTE PAR PMU — terrain, sens, VH (16/10/2026)

> Question de l'utilisateur : « كيفاش الكاريير باش نقدر نساعدك » — comment fournir
> la carrière. **Réponse : il n'y a rien à fournir.** PMU porte tout, sur tout
> l'historique, et deux collecteurs le récupèrent seuls.

`data/forms.json` (casacourses) ne donne que **date, hippodrome, distance, place,
racetype, poids**. Il manquait les trois critères du §4 qui ne se devinent pas :

| Manquait | §4 | Où c'est — dans PMU |
|---|---|---|
| **le terrain** | TERRAIN 13 % | `programme/{JJMMAAAA}` → `reunions[].courses[].penetrometre.intitule` (« PSF STANDARD », « Très souple », « Lourd », « Collant »…) |
| **le sens de la piste** | PISTE 18 % (40 %) | idem → `courses[].corde` = `CORDE_DROITE` / `CORDE_GAUCHE` |
| **le VH** | NIVEAU 13 % + filtre ③ | `…/R{n}/C{m}/participants` → `handicapValeur` **par cheval et par course** |
| *(bonus)* corde de départ, place, type | CORDE 12 % | idem → `placeCorde`, `ordreArrivee` · `courses[].categorieParticularite` |

⚠️ **casacourses ne va que ~10 mois en arrière** (avant : `meetings` vide) ; il
donnait 1 121/2 813 courses passées. **PMU a tout** et rend, en un appel par
journée, toutes les réunions du jour.

| Outil | Ce qu'il écrit | Durée |
|---|---|---|
| `tools/collect-terrain.mjs [--force]` | `data/terrain.json` : `{ runs, jour }` — `date\|hippo\|n°` → `{terrain, sens, type, dist}` | ~2 min |
| `tools/collect-vh.mjs [--force]` | `data/vh.json` : `date\|hippo\|n°` → `{ nomNorm: {vh, place, corde, num} }` | ~4 min |

**Le joint** (`tools/choix-g1g2.mjs`) :

```
forms (casacourses)  donne, par cheval : date · hippodrome · n° de course · distance · place
        ↓  clé date|hippo|n°            ↓  + le nom du cheval (infos[n].nom)
terrain.json         terrain · sens      vh.json   vh · corde · place
```

- La clé est `date|hippodrome|n°`, l'hippodrome **normalisé sans séparateurs**.
- L'appariement des hippodromes se fait par **tokens** (`Cagnes-Sur-Mer` {cagnes,mer}
  = `HIPPODROME DE CAGNES/MER` ; `Bordeaux` {bordeaux} ⊂ `HIPPODROME BORDEAUX LE BOUSCAT`).
- Le cheval est identifié **par son nom** dans les partants PMU (normalisé). Mesure :
  **6 639 / 6 642** courses retrouvées jointes (100 %), 3 289 avec un VH (49 % — le
  trot n'a pas de VH).

**Couverture sur les 96 Quintés** : 2 528 / 2 768 courses passées retrouvées ·
1 479 avec terrain · 2 086 avec sens · 26 623 partants · 13 769 VH.
Le **terrain du jour** : 95/96 courses, dont 56 avec terrain et 83 avec sens (les
courses de trot n'ont ni pénéfromètre ni corde).

**Anti-fuite** : les `forms` sont filtrés à la collecte (`date < date du jour`,
`place != null`) ; les clés PMU ne portent que ces mêmes courses passées ; le VH
« du jour » est une déclaration d'avant-course. Rien de l'arrivée n'entre dans les
profils.


---

## 15. SEPARATION DEFINITIVE - bahja-TURF != bahja-pmu

> Demande le 05/10/2026 : « bahja-TURF doit n'avoir AUCUNE relation avec bahja-pmu,
> c'est une autre application ». Fait.

### Ce qu'etait le couplage

`bahja-pmu` est une application **Python/Flask** deployee sur Railway. Son code est dans

```
C:\turf\bahja-pmu\backend\     <- AUTRE projet, sur un AUTRE disque
```

et Bahja-TURF l'appelait sur 3 routes :

```
https://bahja-turf-api-production.up.railway.app/api/synthese?date=
https://bahja-turf-api-production.up.railway.app/api/race/{id}
https://bahja-turf-api-production.up.railway.app/api/programme/{date}
```

**L'API est morte depuis le 04/10/2026** (Railway : `404 Application not found`, meme sur
`/`). Bahja-TURF avait deja contourne, mais le code mort restait - c'est ce qui a
ete retire.

### Ce qui a ete supprime (05/10/2026)

| Fichier | Ce qui a disparu |
|---|---|
| `src/lib/quinte.js` | `API_BASE`, `fetchSynthese`, `fetchRace`, `fetchProgramme`, `chercherArrivee`, `infos` |
| `backend/QUINTE/quinte.js` | **le fichier entier** - c'etait une copie de `src/lib/quinte.js` faite pour l'API bahja-pmu. La page importe `src/lib/quinte` directement : plus de copie a resynchroniser. |
| `frontend/QUINTE/QuinteGrille.jsx` | l'import de la copie, la 3e source de Synthese, l'appel `fetchRace` |
| `frontend/PROGRAMME/Programme.jsx` | `const API` + l'appel axios ; le programme vient **directement** de `meetingsDepuisCasacourses()` |
| `tools/daily.mjs` | `const API`, `syntheseDuBackend`, `info()`, le fallback `courseIdForce` |

### La regle

> **Bahja-TURF ne parle a PERSONNE en dehors de :**
> `pro.casacourses.com` (donnees) - `equidia.fr` via le proxy `/eq` (marche) -
> `pronostics-turf.info` via le proxy `/pt` (presse) - `turf-france.com` via `/tf`.
>
> Une nouvelle source externe passe par un **proxy Vite** (`vite.config.js`) ou par
> une URL en CORS `*`. Jamais par l'API d'un autre projet.

### Controle

```powershell
cd C:\bahja-TURF
Get-ChildItem src,frontend,tools -Recurse -File |
  Select-String -Pattern "railway\.app|bahja-pmu|API_BASE"
```

Attendu : **plus aucune ligne de code** - seulement les commentaires qui expliquent
la suppression.

### Ce qui reste (decisions en attente, pas des oublis)

| Endroit | Reference | Etat |
|---|---|---|
| `backend/ARTICLE/backend.js` | 3 appels (`/api/race`, `/api/turf`, `/api/programme`) | **pas encore** rebranche sur casacourses - page Article seulement |
| `tools/*.mjs`, racine `*.mjs` | ~60 vieux scripts de recherche | **intacts**, ils pointent tous vers l'API morte - ils ne peuvent plus rien faire |

---

## 16. LA MESURE SUR 94 QUINTÉS — 06/10/2026

> La phrase qui reste au-dessus du projet :
> **« On ne cherche pas une règle qui a l'air meilleure sur le passé ; on cherche
> une règle qui ajoute de la valeur quand on sort du passé vers une course qu'on
> n'a jamais vue. »**

### 16.1 Le corpus qui manquait

Avant le 06/10/2026, on avait deux moitiés et **aucune course qui ait les deux** :

| Source | Presse | Chevaux | Cotes | Arrivée |
|---|---|---|---|---|
| `data\quintes.json` (101 Quintés, 2026-02 → 2026-07) | ✅ | ❌ | ✅ | ✅ |
| `archives\*.json` (95 Quintés, 2024-09 → 2026-10) | ❌ | ✅ | ✅ | ✅ |

Les Archives Quinté Global PMU sont filtrées par **`types_pari` contient `QUINTE_PLUS`**
— ⚠ **pas `course.quinte`**, qui vaut `false` dans les 98 fichiers.

PMU sert les partants d'une date **historique** :

```
online.turfinfo.api.pmu.fr/rest/client/61/programme/{JJMMAAAA}
online.turfinfo.api.pmu.fr/rest/client/61/programme/{JJMMAAAA}/R{n}/C{i}/participants
```

⇒ `tools\collecter-corpus.mjs` recolle les deux moitiés dans
**`data\corpus\presse-carriere.json`** — **101/101 Quintés**, presse + cotes + les
16 partants (musique, valeur, poids, âge, corde, stats, ordre d'arrivée).
Le harnais en garde **94** (les 7 autres ont moins de 10 partants).

**Ce qu'il y a dedans, et ce qu'il n'y a pas :**

| Disponible | **Manquant** |
|---|---|
| presse (P1..Pn) · cotes · arrivée complète · gains réels | **les 4 derniers critères de §4** : distance, piste, terrain, niveau |
| musique · stats PMU · valeur · poids · âge · corde | **pas de carrières détaillées** : pas de `place[]` par course passée |

### 16.2 Ce que la mesure donne — et ce qu'elle ne prouve PAS

`tools\ab-moteur.mjs` et `tools\remplir-3211.mjs`, 94 Quintés, 8 chevaux,
quotas **3-2-1-1-1** :

| Remplissage du bloc | moyen | ≥4/5 | 5/5 |
|---|---|---|---|
| rang de presse | 3.31 | 43 % | 4 % |
| **cote** (la règle retenue) | 3.26 | 39 % | 9 % |
| forme (musique) | 3.11 | 34 % | 3 % |
| stats PMU | 2.99 | 27 % | 6 % |
| cote × stats | 3.32 | 39 % | 9 % |
| cote × (rang presse) | 3.35 | 47 % | 4 % |
| *marché plat — hors méthode* | *3.40* | *48 %* | *10 %* |

**Hors échantillon (5 plis, le choix sur 4, la mesure sur le 5e) : 3.22**
pour un hasard à **2.91**.

**Trois choses qu'on sait, et trois qu'on ne sait pas.**

| ✅ On sait | ❌ On ne sait pas |
|---|---|
| **3-2-1-1-1 ne coûte presque rien** : 3.35 en méthode contre 3.40 en marché plat | que `cote` soit **meilleure** que `cote × stats` : l'écart 3.26 / 3.35 est du bruit |
| **Remplir par la forme dégrade** : 3.11 contre 3.31 pour le seul rang de presse | si les critères distance / piste / terrain servent à quelque chose — **jamais mesurés** |
| **la zone de valeur est P5-P8** : 31 des 37 chevaux manquants venaient de là, 65 % à cote 1-8 | si `ordonnerParStats()` est meilleur que l'ordre du carnet — **jamais testé hors échantillon** |

### 16.3 ⭐ LA RÈGLE RETENUE — et comment elle doit être écrite

> **Les quotas ne bougent pas : `3-2-1-1-1`, 8 chevaux. Point fermé.**
>
> À l'intérieur des quotas, **le remplissage se fait par la cote**. Si un bloc
> n'a pas la cote de tous ses partants, on retombe sur le classement physique
> (§12.4 bis) — c'est un repli de sécurité, pas une règle.
>
> ⚠ **Ne jamais écrire « la cote est la meilleure règle ».** Les données ne le
> prouvent pas. La formulation exacte est :
>
> > « Dans le test actuel, la cote est la règle de remplissage retenue, parce
> > qu'elle a réalisé le meilleur compromis entre performance et lisibilité à
> > l'intérieur de la méthode, **sans preuve hors échantillon suffisante** de
> > sa supériorité sur `cote × stats` ou `cote × rang presse`. »
>
> **La carrière est une piste de recherche et de validation, pas une règle de
> remplissage.** Si elle n'apporte rien au-dessus de la cote, on la retire de
> la décision de remplissage sans hésiter.

### 16.4 La question forte — l'analyse du manque

`tools\ab-moteur.mjs` répond à la seule question qui compte vraiment :
**quand on fait 3/5 ou 4/5, quel cheval manquait ?**

```
rang de PRESSE :  P1-P4   P5-P8   P9-P10   P11-P12   P13+
                     0     31      0      0      6   (37)
                    0%    84%     0%     0%    16%
rang de COTE   :  top 8    r9-12      r13+
                     2     24     11        (37)
                    5%    65%    30%
```

**Deux choses en découlent, et une seule est une règle :**

| | |
|---|---|
| **0 manquant en P1-P4** | ⇒ les **3** de G1 par cote suffisent, le 4ᵉ par cote n'a jamais manqué. **G1 = 3, c'est bon.** |
| **84 % des manqués en P5-P8** | ⇒ **G2 est la zone de valeur.** Mais augmenter le quota G2 est une autre discussion (§11.16 : les quotas ne bougent pas). |
| 16 % en P13+ | cohérent avec §11.15 (P13-18 : 20 % seulement) |

### 16.5 La piste de recherche : une carrière historique ajoute-t-elle quelque chose ?

⚠ **Piste indépendante. Elle n'est pas un préalable au fonctionnement du moteur.**

Si un jour on trouve une source de carrières historiques (distance + piste +
terrain + place, course par course), **le test à faire n'est pas**
`carrière → score → ticket`. C'est :

```
   cote                       (la référence)
   cote + carrière
   cote + carrière + stats
```

et on regarde en particulier :

| Métrique | Pourquoi |
|---|---|
| **3/5 · 4/5 · 5/5** | la distribution complète, pas le seul 5/5 |
| **P9–P12 qui entrent dans le Top 5** | la zone outsider |
| **P13–P16 qui entrent dans le Top 5** | la zone longue |
| **les outsiders qui battent le marché** | la question de fond |

> **Si la carrière n'ajoute rien au-dessus de la cote, on la retire de la
> décision de remplissage sans regret.**

### 16.6 Les outils

| Fichier | Rôle |
|---|---|
| `tools\collecter-corpus.mjs` | recolle presse + partants → `data\corpus\presse-carriere.json` (101/101, repris automatiquement) |
| `tools\ab-moteur.mjs` | A / B / C / D, la distribution 0-5, l'**out-of-sample** en 5 plis, et l'**analyse du manque** |
| `tools\remplir-3211.mjs` | le seul levier qui reste : à quoi remplir 3-2-1-1-1, avec €/€ réel |
| `tools\mesure-hors-top8.mjs` | où sortent les gagnants hors du top 8 des cotes |
| `tools\mesure-confusion.mjs` | « au moins un des 3 premiers » contre « deux des 3 » |
| `tools\mesure-courage.mjs` | les tickets contrarian, bande 9-12 contre les pires cotes |
| `tools\mesure-selection.mjs` | 94 Quintés archives : quelle règle de sélection marche (+ LOO) |
| `tools\mesure-blocs.mjs` | les arrivants par bloc, les répartitions, les €/€ |
| `tools\mesure-positions.mjs` | position par position, P1-P2 absents, le N nécessaire pour 60 % de 5/5 |

### 16.7 Ce qui reste NON mesurable aujourd'hui

| Critère de §4 | Poids | Pourquoi c'est bloqué |
|---|---|---|
| DISTANCE | 22 % | pas de distances par course passée |
| PISTE | 18 % | pas de `place[]` par piste |
| TERRAIN | 13 % | pas d'état de terrain par course passée |
| NIVEAU | 13 % | pas de VH par course passée |

**Les sources déjà essayées et leurs réponses :**

| Source | Réponse |
|---|---|
| `pro.casacourses.com/api/race/{date}` | **404** sur l'historique |
| `api.pmu.fr` | endpoint fermé / non documenté |
| `equidia.fr` (§8.1) | pas d'historique de cheval dans le state |
| `web.archive.org` | **217 snapshots** de la Récapitulative dans `wb-snapshots\` (2018 → 2026-06) — mais **4 seulement** tombent le jour même d'un Quinté des archives |
| `turf-france.com` | « Synthèse des % » par course, mais **la page ne sert que le jour même** (`?date=` renvoie 49 octets) |

**Tant qu'une de ces sources n'est pas ouverte, 66 % de la note physique restent
non mesurés. On ne les simule pas.**

---

## 17. ⭐ LE P DU CARNET — et l'ordre du ticket (07/10/2026)

> **المصادق:** ماكاينش تعريف آخر. P(n) = n-ième case فالـCarnet (§11.14).

### 17.1 P(n) = CASE، ماشي «اللي pressé»
الـSynthèse كتعطي **شكون cite شكون** — ماشي ترتيب الـCarnet.

الـCarnet كيدوز بـla **parité**:

```
الشطر li فوق  = P1  P3  P5  P7  P9  P11 P13 P15 P17   ← tous les PAIRS
الشطر li تحت  = P2  P4  P6  P8  P10 P12 P14 P16 P18   ← tous les IMPAIRS
```

مثال 07/10 (`Synthèse 12 15 17 16 13 11 14 18 4 2 5 10 7 8 3 6`):
```
p1=12 p3=16 p5=14 p7=18 p9=4 p11=2 p13=10 p15=8 p17=6
p2=15 p4=17 p6=13 p8=11 p10=5 p12=7  p14=3 p16=1 p18=9
```

**⛔ الخطأ لي فات (04/10 → 07/10):** `computeStats` كان كيدير `placeOfNum[n] = i+1`
(الترتيب فالـSynthèse). النتيجة: **P3 فالجدول = 17** و **P3 فالـStats = 17** ماشي 16.
كل موضع من P3 فصاعد كان **كيتبدل**. دابا `computeStats` كيدير نفس الـparité ديال
`buildGrid` → **الجدول والـgrille 18/18 متطابقين**.

### 17.2 ⭐ الترتيب ديال التيكيت — القاعدة المعتمدة

> **كل P(n) كيتحط فـالمركز لي فيه أعلى نسبة ديالو فالـStats.**

```
P1  عندو 100% فالـ1er  →  المركز 1
P3  عندو  75% فالـ3e   →  المركز 3
P4  عندو  50% فالـ5e   →  المركز 5 (il n'y a pas mieux)
P(n) بلا données (n<2) →  0%   (pas de force = pas de place)
```

**ماشي P1 P2 P3 بالتتابع.** علاش؟ حيت كل P عندو **place لي最强 فيه** — P2 مثلاً
عندو 0% فالـ1er، إذن ماشي فـالمركز 1.

**Verification (7 courses d'archive, 07/10):**

| # | Ticket | Centre 1 |
|---|---|---|
| 01/10 | `1 13 4 3 7 9 15 5` | n1 (**P1**, 100%) |
| 05/10 | `9 3 5 11 8 13 7 4` | n9 (**P1**, 100%) |
| 06/10 | `9 15 3 2 12 6 8 7` | n9 (**P1**, 100%) |
| 07/10 | `12 17 2 10 15 4 13 11` | n12 (**P1**, 100%) |

**P1 فـالمركز 1 فـ7/7.** ماشي صدفة: P1 هو لي عندو أعلى P(1er).

**Code :** `ordonnerParStats()` — `src/lib/quinte.js` ligne ~815.
`force(num)` = `max(p[0..4])` ديال P(n)، **0 إذا n<2** (bruit), départage par la cote.
---

## 18. ⭐ LA RÈGLE DE VÉRIFICATION D'UNE NOUVELLE SOURCE (07/10/2026)

> **Écrit de 5 bugs en une seule journée.** Chacun était visible **au premier run**.

### 18.1 Les 5 pièges (tous rencontrés le 07/10)

| # | Piège | Symptôme | Correctif |
|---|---|---|---|
| **1** | Le proxy **mange la query string** — `vercel.json` réécrit `/api/tf/<x>` → `/api/tf?p=<x>` | `reu.php?view=program&date=…` arrivait **sans paramètres** → page d'accueil (3 935 o) au lieu du programme (132 165 o) | Encoder le chemin dans `?p=` (`api/_proxy.js` le fait déjà) |
| **2** | Vercel répond **200 + index.html** pour un fichier absent | `r.ok === true` sur un 404 déguisé → `j.v` undefined → page cassée plus loin | Vérifier `content-type: application/json` **ET** `j.v === 2 && j.participants.length` |
| **3** | Le **nom du champ** diffère entre sources | `reu.php` dit `cheval`, `e-sorec` dit `horse` ; la page lit `p.cheval` et `p.driver` → colonnes vides | Écrire **les deux noms** (`cheval` + `nom`, `driver` + `jockey`) |
| **4** | Un `fetch` **par course** | 65 requêtes ≈ 13 s → la page montrait **32 courses sur 65** | **Une** requête : réécrire `prog-{date}.json` avec les distances après la collecte |
| **5** | Le numéro de réunion est **local à chaque site** | `R14` = Horseshoe (US) sur un site, réunion 14 inexistante chez nous | Le **pays voyage dans l'URL** (`?pays=NORV`) et le fichier porte son suffixe (`_NORV`) |

### 18.2 Les 3 vérifications — AVANT de croire que ça marche

```
① LE CONTENU
   La réponse est-elle la bonne page ?
   reu.php ?view=program  →  ≥ 20 000 o ET contient « view=detail »
   (la page d'accueil fait 3 935 o et passe pour un HTTP 200)

② LE TYPE
   Content-Type: application/json ?
   Un 200 + text/html est un FICHIER ABSENT déguisé par le rewrite SPA.

③ LES 3 PREMIERS ENREGISTREMENTS
   Les noms s'affichent-ils ? le premier, le deuxième, le troisième ?
   Un seul enregistrement vérifié laisse passer un bug de schéma
   (le bug ③ : 8 courses archivées, 0 nom affiché).
```

### 18.3 Ce qui est FIXE (ne plus y toucher)

```
Le Quinté
  quotas 3-2-1-1-1            §11.16 — jamais modifiés
  P(n) = case du carnet       §17.1  — pairs en haut, impairs en bas
  ordre du ticket             §17.2  — la place où le P est le plus fort
  le premier ticket est gelé  §13.3  — la SÉLECTION, pas l'ordre
  archive                      data/synthese.json, publiée par
                               tools/publier-archive.mjs — jamais par le job

Les sources
  programme   turf-france reu.php   (+ e-sorec pour le Maghreb)
  marché      equidia.fr / rapp_evol
  presse      pronostics-turf.info
  carrière   casacourses (auto)
```

### 18.4 Ce qui est EN COURS DE DÉVELOPPEMENT

```
Programme / Article  → encore instable le 07/10 (5 bugs)
```

**Tant que cette section n'est pas passée en « fixe », chaque nouveau run
doit passer par les 3 vérifications ci-dessus.**

---

## 19. ⭐ LE PROGRAMME ET LES FICHERS DE COURSE (07/10/2026)

### 19.1 Qui fournit quoi

| Source | Donne | Pour |
|---|---|---|
| `reu.php?view=program&date=` | la liste des réunions + R/C + pays | le Programme |
| `reu.php?view=detail&date=&reunion=R&course=C&pays=` | partants, poids, musique, résultat | la fiche /r/ |
| `e-sorec.ma/api/meetings?date=` | les réunions que reu.php ne publie pas (Maroc) | R9 Khemisset |
| `e-sorec.ma/api/races/{id}` | noms, jockeys, entraîneurs, poids | le Maghreb, en détail |
| `casacourses/api/programme?date=` | le repli : le numéro de réunion du jour | le Maghreb |
| `casacourses/api/race/{id}` | peu : les noms y sont vides | dépannage |

**reu.php ne donne NI la distance NI le nombre de partants.** Ils viennent
de `prog-{date}.json`, réécrit par le collecteur après la collecte.

### 19.2 Le collecteur

```
node tools\archive-reu.mjs 2026-10-07
  ① reu.php        la référence (France, Norvège, Suède, GB, HK…)
  ② e-sorec       le Maghreb — avec les noms
  ③ casacourses    le dépannage — sans les noms, on ne comble rien (§7)

→ data/reu/ ET public/data/reu/
→ réécrit prog-{date}.json avec distance, partants, arrivée
```

**Publier ensuite** (le dossier `public/data/reu/` est ignoré par git) :

```
git add -f public/data/reu && git commit && git push
```

### 19.3 Ce que la page lit, et sous quel nom

```
p.cheval      p.driver      p.entraineur    p.poids
p.num        p.cote        p.coteRef       p.depart
p.musique    p.gains       p.valeur        p.proprietaire
p.chrono     p.def         p.silk          p.dernierPassage
```

**Les deux noms sont écrits** (`cheval` ET `nom`, `driver` ET `jockey`) parce
que les sources ne s'accordent pas sur le vocabulaire — et une page qui lit un
champ absent affiche `—` sans dire pourquoi.

---

## 20. ⭐ L'ARCHIVE COMME MATIÈRE PREMIÈRE DU MOTEUR (09/10/2026)

> Décision de l'utilisateur : les indicateurs Top3 / 1er-manqué restent de
> la MATIÈRE PREMIÈRE. L'archive grossit, le moteur se renforce avec elle —
> mais pas avant d'avoir de quoi conclure.
> ⚠ 16/10/2026 : le seuil « 30 courses clôturées » est **ABOLI** (§20.2).

### 20.1 Ce qui est affiché (depuis le 09/10)

| Colonne / zone | Contenu | Rôle |
|---|---|---|
| Archive → `Top3` | `3/3` vert · `x/3` ambre · `⚠1er` rouge si le gagnant manque | constat |
| Stats → `Top3 : n/N · 1er manqué : m/N` | agrégats sur les courses clôturées | constat |

Un 4/5 qui rate le 1er est une feuille perdante : le x/5 seul mentirait.

### 20.2 Ce qui est INTERDIT — ⚠ révisé le 16/10/2026

- Les indicateurs **ne choisissent rien** : `remplirGrille()` + quotas
  intacts. Ce sont des compteurs, pas une force de sélection.
- ~~Aucun feedback vers le moteur sous **30 courses clôturées**.~~
  **16/10/2026 — ABOLI** (demande de l'utilisateur) : plus de seuil
  d'archive. On itère sur le moteur quel que soit le nombre de courses
  clôturées, **dès lors que la mesure est hors de l'apprentissage**
  (`tools/test-nonregression.mjs`, `tools/lab-variantes.mjs` — LOO).
- Le processus : labo d'abord, mesure LOO ensuite, production en dernier,
  approbation de l'utilisateur avant tout changement de règle. §11.16
  (quotas 3-2-1-1-1) ne se discute pas sans levée explicite — testé le
  09/10 sur 94 courses : la règle proposée 3-2-2-1 ne gagne pas clairement
  (écart ±1-3 = bruit).

---

## 21. ⭐ LA PAGE « CHEVAUX » — tout sur le cheval, toutes les courses (17/10/2026)

> Demande de l'utilisateur : **« toutes les courses »**, et pour chaque cheval
> **« les informations des courses passées »** — la fiche de l'app
> « ParisTurf Live » (captures du 17/10/2026 : écran *Carrière* de
> **Kel Story** et de **Rock And Roll**).
>
> **Aucun nom de source ne doit apparaître à l'écran.**

### 21.1 Les fichiers

| Fichier | Rôle |
|---|---|
| `backend/ANALYSE/parisTurf.js` | **tout le client de la source** : programme, partants, carrière, identité, stats + les normalisateurs |
| `frontend/ANALYSE/Analyse.jsx` | la page : programme → partants → **écran carrière** |
| `src/App.jsx` | routes `/analyse` et `/chevaux` |
| la nav des 5 pages | un lien **Chevaux** (Programme, Coply, Quinté, Articles, Chevaux) |

### 21.2 La source, et pourquoi un RELAIS SERVEUR en runtime EDGE

```
https://horse-racing-api.paris-turf.com/api/
en-tête   X-API-KEY: <clé publique du site>
relais    /api/ptf  →  api/ptf.js, `export const config = { runtime: 'edge' }`
```

La clé est **publique** (bundle du site, `NEXT_HORSERACINGV2_CSR_API_KEY`), mais
elle est **restreinte par origine** — et Cloudflare défie les clients serveur.
Trois verrous, tous **mesurés le 17/10/2026**, détaillés au **§21.7** :

| Chemin | Résultat |
|---|---|
| Appel direct depuis la page (vercel.app) | ❌ 403 « Origin … is not allowed **for this API key** » |
| Appel direct depuis `localhost` | ✅ 200 (le développement marchait donc) |
| Relais Node hors navigateur (curl, Node h1/h2) | ❌ 403 Cloudflare « Just a moment… » |
| **Relais `/api/ptf` en runtime EDGE** | ✅ **200** |

⇒ La page ne parle **qu'à sa propre origine** (`/api/ptf…`) : aucun CORS nulle
part, et le défi Cloudflare n'existe plus. En **développement**, c'est le
middleware de `vite.config.js` qui relaie (Node + HTTP/2, qui passe depuis un
poste de travail). **Même contrat, deux transports.**

- ⚠ Un `?apiKey=` en query ne marche pas (401) : la clé doit être un en-tête.
- Le fichier vidéo du replay, lui, refuse toujours le fetch cross-origin →
  le bouton ▶ ouvre un onglet.

### 21.3 Les 5 appels (tous paresseux)

| Fonction | Appel | Ce qu'elle rend |
|---|---|---|
| `programmeDuJour(date)` | `meetings?dateRange=<jour Parisien>&include=races&include=races.arrival` | **19 réunions · 148 courses** (17/10/2026), triées R1, R2… |
| `partantsDeCourse(id)` | `runners?raceId=…&include=horse,jockey,trainer,owner,breeder,oddsSimpleGagnant,race,race.meeting` | les partants, triés par **numéro porté** |
| `carriereCheval(id)` | `runners?horseId=…&include=race,race.meeting,race.replay,jockey,trainer,oddsSimpleGagnant&orderBy=race.datetime` | **toutes les courses passées** |
| `identiteCheval(id)` | `horses?id=…&include=sire,dam,breeders,currentTrainer,currentOwner` | père, mère, éleveur, propriétaire |
| `statsCheval(id)` | `stats/entity-stats?entityId=…&entityType=horse` | **musique** + courses/victoires/places/gains |

- `orderBy` n'accepte que `id` et `race.datetime` (`orderBy=number` → 422).
- Le **jour parisien** se calcule en UTC (`plageJourParis`) : l'API filtre sur `datetime`.
- Les champs nuls sont **omis** par l'API (d'où un `shoeing` qui n'apparaît que sur le trot).

### 21.4 La correspondance des champs — ⭐ vérifiée sur les tableaux du site

| Affiché | Champ | Preuve du 17/10/2026 |
|---|---|---|
| **VH** | `handicapKg` | Goliath d'Aunou : VH 66,5 = `handicapKg` 66.5 ; Rock And Roll : **VH 60** (l'app affiche 60) |
| **Poids** | `handicapTotalKg` | Rock And Roll : **67 kg** (l'app affiche 67) |
| Corde | `draw` | 0 = pas de corde (obstacle) |
| Place | `ranking` | `null` tant que la course n'est pas courue |
| Cote | `oddsSimpleGagnant` | PMU · PMU_FR · BET365 · GENCLIC · GENYBET · ZETURF |
| Commentaire | `comment` | l'analyse de la course, par cheval |
| Chrono | `chrono` / `redkm` | en secondes (`260.07` → `4'20''07`) |
| Replay | `race.replay._videoLink` | + `_thumbnailLink` |

### 21.5 Le fer (`shoeing`) et les artifices

`shoeing` = **deux lettres** `[antérieurs][postérieurs]`. La légende vient du site
lui-même (chunk `matchem-component`) :

```
D = Déferré      F = Ferré      P = Plaqué
```

- **Trot** : `shoeing` est publié (`"DD"`, `"DF"`…). **Obstacle : souvent absent.**
- La carte n'affiche **que** ce qui n'est pas ferré (comme l'app) + les outils :
  `hood` → 👓 (œillères), `tongueTie` → 👅 (attache-langue), `blinkers` = `BLINKERS`/`VISOR`.

### 21.6 L'écran « Carrière » — la copie de l'app

```
en-tête    n° · nom · artifices · « par <père> et <mère> » · Entraîneur · Jockey
           SA · POIDS · VH · CORDE   puis   « N j · <musique> »
filtres    ≈distance · hippodrome · discipline · terrain · type · Œil
           + bouton « 🎯 mêmes conditions que ce jour »
totaux     n courses · n victoires · n places   (sur la liste filtrée)
bascule    « Afficher les commentaires »
cartes     date (jour/mois/année) · hippodrome · place « 3e/14 »
           « Haies · 3900m · Très souple · List · Hand »
           « B. Le Clerc · 68kg · VH61 · D »   + ▶ replay + commentaire
```

**Les contrôles de fidélité (17/10/2026, Quinté d'Auteuil) :**

| Cheval | L'app | La page |
|---|---|---|
| Kel Story | SA H6 · Poids 68 · VH 61 · **21 j** · `1h2h7h5h10hAh6hA…` | identique |
| Kel Story | **37 courses · 6 victoires · 6 places** | **37c · 6v · 6p** ✅ |
| Rock And Roll | SA H8 · Poids 67 · VH 60 | identique · 56c 8v 11p |

- ⚠ Le « N j » compte depuis la **dernière course jouée** — celle du jour ne compte pas.
- ⚠ **Aucun filtre par défaut** : on montre d'abord TOUTE la carrière (c'est la demande),
  la présélection « mêmes conditions » est un **bouton**.
- La liste des partants porte **la musique + `Nc Nv Np` de chaque cheval** (6 requêtes
  à la fois, en tâche de fond) : « chaque cheval » se lit sans cliquer.

### 21.7 ⭐ POURQUOI LA PAGE NE MARCHAIT PAS EN LIGNE — l'enquête du 17/10/2026

> Symptôme : la page marche sur `localhost:3003` et **pas** sur
> `bahja-turf.vercel.app`. Trois verrous s'empilaient, tous mesurés.

#### ① LA CLÉ EST RESTREINTE PAR ORIGINE

Le **préflight passe toujours** (204, `Access-Control-Allow-Origin` réfléchi) —
c'est le **GET** qui est refusé, selon l'origine envoyée :

| `Origin` | Préflight | GET |
|---|---|---|
| `https://bahja-turf.vercel.app` | 204 ✅ | **403** « Origin … is not allowed **for this API key** » |
| `http://localhost` (n'importe quel port) | 204 ✅ | **200** ✅ |
| `https://www.paris-turf.com` | 204 ✅ | **200** ✅ |
| `https://bahja-turf.com` | 204 ✅ | 403 |
| `null` (iframe `sandbox`) | — | 403 |

⇒ Aucun réglage côté page ne peut lever ça (une page ne ment pas sur son
origine). Un **relais serveur**, si : il déclare `http://localhost`.
⇒ Le `?apiKey=` en query string n'existe pas (brute-force de 14 noms → 401).

#### ② CLOUDFLARE DÉFIE LES CLIENTS SERVEUR — sauf le runtime EDGE

Mêmes en-têtes, mêmes données, seul le transport change :

| Client | Résultat |
|---|---|
| `curl` HTTP/1.1 | ❌ 403 `Cf-Mitigated: challenge` |
| Node `fetch` (HTTP/1.1) | ❌ 403 |
| Node `node:http2` **depuis un poste de travail** | ✅ 200 |
| Node `node:http2` **depuis Vercel** | ❌ 403 (5 essais sur 5) — **une fonction Vercel Node ne peut pas** |
| **Runtime EDGE de Vercel** (`api/ptf.js`) | ✅ 200 … **mais seulement ~30-56 % du temps** |
| Navigateur headless d'un service tiers (datacenter) | ✅ 200 |

⇒ Le défi tombe sur l'**empreinte du client**, pas sur l'IP : un datacenter
passe s'il présente une pile TLS de navigateur. Le runtime edge n'a pas celle de
Node — d'où son succès. Il est **distribué** : certains POP sont notés, d'autres
non, d'où le hasard. Mesuré : `meetings` 1/4 · `runners` 2/4 · `horses` 3/4 ·
`stats` 3/4 → **9/16 = 56 %**.

⇒ **La parade : réessayer.** Le relais fait `ESSAIS = 4` tentatives et s'arrête
sur la première réponse sans défi, et le client réessaie 3 fois de plus sur 403
(donc jusqu'à 12 tentatives amont pour un même appel).

```
                           appels aboutis    tentatives amont par appel
avant (4 essais)               7/10           1 2 4 1 4 1 4 4 2 2
avec les en-têtes navigateur  11/12           2 4 3 3 3 3 3 1 1 4 1 2
```

Les en-têtes `sec-ch-ua*` et `sec-fetch-*` (ceux d'un vrai navigateur, voir
`ENTETES` dans `api/ptf.js`) doublent presque le taux : sans eux, l'empreinte
TLS de navigateur du runtime edge et des en-têtes qui ne le sont pas se
contredisent.

#### ③ LE SOUS-CHEMIN RELAYÉ DOIT PORTER `/api`

Le relais ne connaît que l'**origine** : sans le préfixe, l'API répond
`{"error":"Not Found","message":"Error: NOT_FOUND"}`.

#### La règle qui en sort — *une page, trois transports*

| Où | Qui relaie | Comment |
|---|---|---|
| **En ligne** | `api/ptf.js` | `export const config = { runtime: 'edge' }` — **pas** `api/_proxy.js` |
| **En développement** | `vite.config.js` | middleware, `node:http2` (passe depuis un poste) |
| **La page** | — | ne parle qu'à `/api/ptf` : même origine, zéro CORS, et **la clé ne part plus dans le bundle** |

⚠ **Ne pas remettre `ptf` dans `api/_proxy.js`** : c'est le runtime Node, et
Cloudflare le défie systématiquement (5/5). Le label y a été retiré.

#### Les en-têtes de diagnostic (sans effet sur l'affichage)

| En-tête | Ce qu'il dit |
|---|---|
| `X-Bahja-Runtime` | `edge` (attendu) ou `inconnu` |
| `X-Bahja-Cf` | `challenge` si Cloudflare a défié la dernière tentative |
| `X-Bahja-Essais` | combien de tentatives ont été nécessaires |

```powershell
# vérifier l'aperçu avant de pousser (jamais la production) :
npx --yes vercel@latest deploy --yes      # -> une URL d'aperçu
npx --yes vercel@latest curl -i "https://<apercu>.vercel.app/api/ptf?p=api%2Fmeetings%3F..."
```

> ⚠ `vercel curl` est nécessaire : les aperçus sont protégés par
> l'authentification Vercel. Le CLI est **authentifié sur ce poste**
> (`%APPDATA%\com.vercel.cli\Data\auth.json`), donc un aperçu est déployable
> sans toucher à la production.

### 21.8 ⭐ LA COURSE PASSÉE — la carte s'ouvre, la vidéo se lit (17/10/2026)

> Demande : « quand on clique sur les courses passées, ça ne répond pas ».
> Deux choses ne répondaient pas, pour deux raisons différentes.

#### ① La carte n'était pas cliquable

`CarteCarriere` était un `<div>` inerte ; seul le ▶ était un lien. Maintenant
**toute la carte ouvre la course** (`title="Voir la course"`, `cursor:pointer`)
et le ▶ fait la même chose — plus d'onglet qui s'ouvre dans le vide.

L'écran `CoursePassee` **remplace** la liste des cartes (bouton
« ← carrière de <cheval> » pour revenir) et montre :

```
en-tête      hippodrome · R?C? · date · Q+ · nom de la course
             discipline · distance · sens · terrain · catégorie · partants · allocation
             Arrivée : 1 · 6 · 4 · 11 · 2 · 5'10''66      ← les 5 premiers + le chrono du gagnant
le replay    ▶ Revoir la course (durée) — lu DANS la page
l'arrivée    Place · N° · Cheval · Jockey · Poids · VH · Corde · Artifices · Cote · Chrono · Écart
             les 20 partants, ta ligne surlignée + badge « ici », les NP en gris à la fin
```

Données : `partantsDeCourse(l.courseId)` — chaque partant d'une course passée
porte son `ranking`, donc **le tri par `ranking` EST l'arrivée**. `race.replay`
a été ajouté à `INC_PARTANT`.

#### ② Le replay ne pouvait pas se lire — deux verrous de plus

`race.replay._videoLink` = `/api/replays/{id}/video` → **302** vers un m3u8
chez `vide.io` (et non un mp4, malgré `format: "mp4"` dans les métadonnées).

| Le verrou | Mesuré |
|---|---|
| l'URL vidéo exige la **clé** ET l'origine `http://localhost` | un `<a href>` n'envoie ni l'une ni l'autre → 403 |
| le CDN `vide.io` ne renvoie **aucun** `access-control-allow-origin` | hls.js ne peut pas le lire, et Chrome ne lit pas le HLS seul |
| le corps de la vidéo est un **HLS multi-débits** | `playlist.m3u8` → 240p…720p |

⇒ Le relais sert aussi la vidéo, avec deux paramètres :

```
/api/ptf?v={id}     → la playlist maîtresse, RÉÉCRITE : chaque URL (sous-playlist,
                      segment, #EXT-X-MAP) repasse par /api/ptf?hls=<url absolue>
/api/ptf?hls={url}  → un média traversé tel quel (CORS: *, Range transmis)
```

- **liste blanche d'hôtes** (`.vide.io`, l'API) : sans elle, ce serait un proxy
  ouvert.
- ⚠ **ne jamais réécrire une page d'erreur comme une playlist** : un 403 du CDN
  arrive avec un corps HTML — la première version le réécrivait ligne par ligne.
  D'où le `if (!r.ok)` explicite.
- côté page, `hls.js` est chargé **à la demande** (`import('hls.js')`) : le
  chunk (`hls-*.js`, 186 ko gzip) ne coûte rien tant qu'aucune course à vidéo
  n'est ouverte. Safari lit le HLS nativement, sans hls.js.

**Vérifié dans un vrai navigateur** (`localhost:3003`) : clic sur la carte
« 17 oct 2026 Auteuil » de Kirikou des Mers → l'arrivée des 20 partants
s'affiche, `videoSrc = /api/ptf?v=20261017_R01C03`, `readyState` 0 → **4** en 4 s,
`duration = 378 s` = `00:06:18` (la durée annoncée), zéro erreur vidéo.

---

## 22. ⭐ LE BLOC « ÉTUDES, ANALYSES, SYNTHÈSE ET PRONOSTICS » (17/10/2026)

Sous **chaque course** de la page Chevaux : le bloc d'études de la course, et
ses **boutons colorés qui marchent**. L'ancien onglet « Article » portait déjà ce
bloc pour le **Quinté** ; ici il est sous **toutes** les courses.

### 22.1 Les fichiers

| Fichier | Rôle |
|---|---|
| `backend/ANALYSE/turfFrance.js` | **le parseur de la page Chevaux** — copie privée de celui de l'ARTICLE, étendue : `parseTopsTf`, `parseAptitudesTf`, `parseSynthesePctTf`, `parsePronosTf`, `parseOutilsTf`, `parseProgrammeTf`, `chargerProgrammeTf`, `indexTf`, `reunionSource`, `chargerEtudesTf` |
| `frontend/ANALYSE/Analyse.jsx` | `BlocEtudes` (les tableaux, les 10 pastilles, les 4 outils en vedette, 9 « autres études », le pronostic, le basculeur « Aptitude des N partants ») et `Visionneuse` (la fenêtre `<iframe>`) |
| `api/_proxy.js` · `vite.config.js` | les relais — `&base=1` et l'habillage (§22.3) |

⚠ **copie privée** : `backend/ARTICLE/turfFrance.js` n'est pas modifié dans sa
logique de lecture (elle cherche des chaînes littérales de la source, dont le
marqueur `Pronostic, une analyse Turf-France et IA`). Les deux parseurs vivent
leur vie.

### 22.2 Comment on trouve la course

Deux clés seulement, et **le pays n'est pas devinable** (FRANCE, ROYAUME-UNI,
PAYS-BAS, ETATS-UNIS, ESPAGNE, ARGENTINE, URUGUAY, SUISSE…) : `reu.php` le refuse
s'il est faux. C'est `reu.php?view=program&date=…` qui le donne.

```
/php/reu.php?view=program&date=AAAA-MM-JJ     → la carte « R1-C1 » → pays
/php/reu.php?view=detail&date=…&reunion=Rn&course=Cm&pays=XX
```

### 22.3 ⭐ AUCUN NOM DE SOURCE À L'ÉCRAN — « LBAHJA-TURF »

> Règle de l'utilisateur : sur la page, **jamais** le nom de la source.

Deux endroits, deux méthodes :

| Endroit | Comment |
|---|---|
| nos propres libellés | renommés dans le code (aucune chaîne de la source dans l'interface) |
| le **texte affiché** des pages relues | `habiller()` réécrit `Turf-France` → `LBAHJA-TURF`, **jamais** dans les URL, les `<script>` ni les `<style>` |

Le `habiller()` de `api/_proxy.js` (et celui, identique, du middleware de dev) :

- découpe d'abord sur `<script>|<style>` : **blocs intacts** ;
- puis sur les balises : seuls `title|alt|value|placeholder|content` sont
  touchés, et seulement si la valeur **ne contient pas de `/`** (une URL n'est
  jamais réécrite) ;
- dans le texte : `/(^|[^/.:])turf[\s-]?france(\.com)?/gi`, avec une espace
  insérée quand un mot précède (`RépartiTurf-France` → `Réparti LBAHJA-TURF`),
  et `.com` absorbé.

L'habillage n'est appliqué **que** sur `&base=1` : les parseurs, eux, lisent la
page **brute** (le marqueur ci-dessus doit rester lisible).

### 22.4 Les outils s'ouvrent DANS la page

Un bouton d'outil ouvre une **visionneuse** (`<iframe>` relayée par
`/api/tf?p=…&base=1`) : **jamais un nouvel onglet**. Sans `&base=1`, les chemins
relatifs de la page (`/php/…`, `//hôte/pictures/…`) se résolvaient **chez nous**
et la page sortait nue — d'où l'injection de `<base href="<origine>/">` juste
après `<head>`, uniquement quand la réponse est du `text/html`.
(Voir §12.6 pour la correction du `?p=` qui doublait la query.)

### 22.5 La vérification

| Test | Ce qu'il mesure |
|---|---|
| `hab-test.mjs` (contre le **vrai** `api/_proxy.js`) | 4 pages réelles (detail, oscar, zonetri, sdin) : **0 « turf-france » visible**, 0 URL cassée |
| `e2e.mjs` (données, par le relais de dev) | 18/10 Quinté, 17/10 Auteuil, 04/10 Arc, **ASCOT** (ROYAUME-UNI), date ancienne → tops, aptitudes, %, 2 pronos, 10 pastilles, 13 boutons, 4 vedettes en 0,6–1,7 s |

---

## 23. ⭐ LE PROGRAMME PMU — la liste des réunions (18/10/2026)

> Demande : « **les réunions ne sont pas comme celles des sites**
> (`turf-france.com`, `equidia.fr/courses-hippique`), et leur présentation n'est
> pas attrayante ».

### 23.1 Le problème, mesuré

La page lisait le programme de sa **source de chevaux** : elle couvre le monde
entier, pas le programme des paris.

| Date | la page (source de chevaux) | le programme PMU (les sites) |
|---|---|---|
| 17/10/2026 | **19** réunions · 148 courses | **12** réunions · 93 cours |
| 18/10/2026 | **20** réunions · 169 courses | **11** réunions · 87 cours |

Et le n° de réunion manque : `pmuNumber` vaut **0** pour 16 des 20 réunions du
18/10 (Dielsdorf, Angers, Hyères, Maure-de-Bretagne…). Seules 4 réunions sur 20
portaient un numéro — d'où l'impression que « ça ne marche que pour le Quinté ».

Réunions **hors programme PMU** (donc non jouables) : Solvalla, Hagmyren,
Momarken, Visby, Gavle, Bornholm, Jägersro, Leipzig, Baden-Baden, Gelsenkirchen,
Waregem, Chepstow, Fairyhouse, Hexham, York, Naas, Machecroy…

### 23.2 La règle — `backend/ANALYSE/programme.js`

```
programmePmu(date) → { date, reference, reunions: [ { id, nom, hippodrome,
                        reunion, pays, heure, depart, chevaux, courses } ] }
```

1. **la liste affichée est CELLE DU PROGRAMME PMU** : R1 → Rn, dans l'ordre,
   chaque réunion avec son numéro, son hippodrome et son pays ;
2. **appariement** : le n° de réunion d'abord (`pmuNumber` > 0 — il est
   identique à celui des sites, vérifié R1 ParisLongchamp, R2 Dielsdorf, R3 Caen,
   R6 Tarbes), **l'hippodrome ensuite** (`reunionSource()` : l'un contient
   l'autre — « Bordeaux - Le Bouscat » = « LE BOUSCAT ») ;
3. chaque course déjà connue de la source de chevaux est **enrichie** (partants,
   conditions, arrivée, Quinté+) : c'est elle qui remplit le tableau ;
4. les **courses** de la réunion sont **celles du programme** : une course que la
   source connaît mais que le PMU ne programme pas n'est **pas** ajoutée.
   Mesuré le 10/10 : 13 courses à Solvalla côté source, **2** au programme
   (C10, C12) — les sites en montrent 2, on en montre 2 ;
5. une réunion du programme que la source ignore (Amiens et Maronas, le 18/10)
   **reste affichée** : ses courses viennent du programme et **son bloc d'études
   fonctionne** ; seuls les partants manquent, et la page l'écrit.
6. **repli** : programme PMU injoignable → l'ancienne liste, telle quelle.
   Jamais une page vide.

### 23.3 La présentation

La colonne de gauche a été refaite : une **carte par réunion** — drapeau du pays,
badge `R1`, hippodrome, `N courses · <terrain> · 1ʳᵉ à HH:MM`, pastille du pays,
badge `Q+` quand la réunion porte le Quinté — et, dépliée, **une ligne par
course** : `C1 · 13:58 · Plat · 1800 m` puis **ses pastilles de paris**
(`src/Paris.jsx`), la course sélectionnée en bleu. ⚠ c'était une grille de
3 colonnes jusqu'au 18/10 : une case de ~105 px ne peut pas porter sept
pastilles — la ligne, si. Le nom de la course reste dans l'infobulle. La course
ouverte affiche son en-tête complet à droite, avec la **rangée complète des
pastilles**.

Le **terrain par réunion** (`Bon`, `Très souple 4.0`, `Collant 4.2`…) vient de la
barre de `reu.php` elle-même : `parseReunionsTf` lit son en-tête collant
(`<a href="#ZURICH">ZURICH</a>` + `<div class="tooltip-content">` → *Terrain /
Courses / Disciplines / Types*). La source ne le donne que quand elle le
connaît — ParisLongchamp et Tarbes l'ont vide, on n'affiche alors rien.

⚠ **le drapeau est une VRAIE image, jamais un emoji** : Windows ne dessine pas
les drapeaux emoji (🇨🇭 sort « CH »). On affiche donc `public/drapeaux/<iso2>.svg`
(les SVG de `flag-icons`, copiés une fois — le paquet livre 271 drapeaux, on n'en
garde que les pays qui jouent au PMU). Le composant est `src/Drapeau.jsx` :
`<Drapeau pays={m.pays} />` accepte le nom français (« ETATS-UNIS ») **et** le code
ISO2 (« FR », « CH ») ; pays inconnu → rien. Le pays reste écrit en toutes lettres
à côté (`Suisse`, `Uruguay`, `Royaume-Uni`) : la réunion française porte le
drapeau français, seule, sans le mot « France » (qui ne dit rien).

⚠ **les pastilles de paris** — Simple Gagnant, Simple Placé, Jumelé Gagnant,
Jumelé Placé, Tiercé, Quarté, Quinté+ — viennent de `src/Paris.jsx` (le ruban
penché, la couleur du carnet) et de `backend/ANALYSE/paris.js` (quels paris la
course propose). ⚠ **on n'invente jamais une pastille** : le 18/10, R1C1 n'ouvre
que Simple et Jumelé, R1C3 (le Quinté) ouvre aussi Tiercé, Quarté et Quinté+. La
liste est lue course par course, et une source injoignable ne casse rien (les
courses s'affichent sans pastilles).

### 23.3 bis ⭐ LE NOM DES RÉUNIONS — celui de la référence

> « كاين مشكل بعض اسماء الاجتماعات متل عندنا Dielsdorf … وفالمواقع ZURICH »
> (« problème sur certains noms de réunions : chez nous Dielsdorf, sur les sites
> ZURICH »).

Le nom affiché est celui de **`reu.php`**. Le 18/10 la page écrivait « Dielsdorf »
(orthographe de la source de chevaux) là où le PMU, equidia et turf-france
écrivent **ZURICH** — c'est le même hippodrome, mais c'est un autre nom.

```
nom affiché = nom de la référence
              ⚠ SAUF si la source de chevaux écrit LE MÊME nom, en plus complet
                (« BORELY » ⊂ « Marseille-Borély ») : on garde alors le sien,
                mieux orthographié.
```

Conséquence mesurée : **Zurich** (et non Dielsdorf), **Mülheim**, **Pontchâteau**,
**Hyères**, **Maure-de-Bretagne**, **Marseille-Borély**, **Bordeaux - Le Bouscat**
— et à l'inverse « Amiens » ou « Maronas », que la source de chevaux ne connaît
pas, viennent de la référence.

Le nom **de la référence** part dans `course.hippodrome` (ce qui s'affiche) ;
celui de la **source de chevaux** reste dans `course.hippodromePt` — c'est lui qui
retrouve les courses passées (les carrières portent son orthographe), donc le
raccourci « mêmes conditions que la course du jour » de l'écran carrière l'utilise
(`conditionsDuJour`).

### 23.4 Un bug corrigé au passage — le pays tronqué

`parseProgrammeTf` lisait `pays=([A-Z- ]+)` : sur un pays **accentué et donc
encodé**, `pays=SU%C3%88DE` ne donnait que **`SU`** (les fichiers d'archive
s'appelaient `…_R8_C12_SU.json`). Corrigé : capture jusqu'au séparateur puis
`decodeURIComponent`. La source accepte les deux formes, donc rien n'était cassé
— mais `SU` s'affichait tel quel.

> ⚠ reste à faire côté ARTICLE : `backend/ARTICLE/turfFrance.js` a la même
> capture (`pays=([A-Z ]+)`) → les archives continuent de nommer `_SU_`.

### 23.5 Vérifié

`node` + le relais de dev, et le navigateur (`localhost:3003/analyse`) :

```
18/10 : 11 réunions · 87 courses   ← exactement les sites (Amiens et Maronas
                                     sont là, avec « partants indisponibles »)
17/10 : 12 réunions · 94 courses   ← les sites en ont 12
Amiens R4C1 → « partants indisponibles » + le bloc d'études ✅
Tarbes R6C1 → le tableau des partants ✅ + le bloc d'études ✅
Quinté    → R1C3 ouvert, Top Chevaux, « Aptitude des 16 partants » ✅
```

---

## 24. ⭐ LA PAGE « PRESSE » — ce que dit la presse, ce que disent les hommes, ce que publient les journaux (18/10/2026)

Demande de l'utilisateur, mot pour mot :

> « une page de la presse : les nouvelles du jour sur ce que dit la presse,
>   leurs pronostics, les déclarations des entraîneurs et des drivers,
>   les articles et les nouvelles des chevaux. »

Puis, le même jour, une **précision qui a changé le ④** :

> « لا اريد الاخبار من ايكيديا اريد اخبار الجرائد اليومية و الاسبوعية ك
>   LA GAZETTE DES COURSES . LE VEINARD AVEC COURSES PAR COURSES .
>   JOURNAUX WEEKEND PARIS TURF PARISIEN TIERCÉ MAGAZINE »

→ **je ne veux pas les nouvelles d'Equidia, je veux celles des journaux.**
Ce n'est donc plus un fil d'actualité de chaîne : ce sont les journaux eux-mêmes,
qu'on va chercher un par un (§24.6).

### 24.1 L'adresse, les fichiers, la couleur

| | |
|---|---|
| Adresse | `/presse` |
| La page | `frontend/PRESSE/Presse.jsx` |
| Les données | `backend/PRESSE/donnees.js` |
| La couleur | ambre papier journal `--n-ambre` `#fbbf24`, classe `.p-presse` |
| L'onglet de nav | `<i class="bi bi-newspaper"> Presse` (`src/Entete.jsx`) |
| La route | `src/App.jsx` → `<Route path="/presse" element={<Presse />} />` |

C'est la **4ᵉ teinte** de la maison (cyan = Analyse, magenta = Quinté,
orange = Coply, ambre = Presse) : la pastille active, les en-têtes de tableau et
les badges suivent la couleur de la page où l'on est.

### 24.2 Les 4 onglets et leurs sources

| # | Onglet | Source | Relais |
|---|---|---|---|
| ① | **Déclarations** | `api.equidia.fr/…/courses/{date}/R{n}/C{m}/interview` | **aucun** (CORS ouvert) |
| ② | **L'analyse** | `api.equidia.fr/…/courses/{date}/R{n}/C{m}/pronostic` | **aucun** (CORS ouvert) |
| ③ | **La revue de presse** | `www.pronostics-turf.info/presse.php` | `/api/pt` |
| ④ | **Les journaux** | Paris-Turf (son API) + Le Veinard | `/api/ptf` + `/api/lv` |
| ⑤ | **Les journaux en vidéo** | la chaîne qui les **feuillette** chaque matin | `/api/yt` |

**La course du jour** (les 4 onglets en dépendent) est trouvée par
`quinteDuJour()` : `pro.casacourses.com/api/programme?date=` filtré sur
`available_bet_types.includes('sorec_quinte')`, **France d'abord**. Puis
`api.equidia.fr/…/v2/courses/{date}/R{r}/C{c}` donne `heure_depart_course`,
`distance`, `discipline` et le nombre de partants.

> ⚠ `time_hm` de casacourses est en **heure du Maroc** : le Quinté du 18/10 y
>   était à **14 h 15** au lieu de **15 h 15**. L'heure affichée est celle
>   d'Equidia, jamais l'autre.

### 24.3 ① Les déclarations — la plus belle matière de la page

C'est exactement « les déclarations des entraîneurs et des drivers » : par
cheval, la personne, **son métier**, sa **note sur 10** et son **texte entier**.

```
{
  num: 2, cheval: "DON'T SHUT ME DOWN", personne: "Joakim Brandt",
  role: "ENTRAÎNEUR", note: 8, auteur: "…", texte: "Don't Shut Me Down (2) est très courageux…"
}
```

Le rôle est lu tel quel (`ENTRAÎNEUR` / `DRIVER` / `JOCKEY`) et se colore :
violet pour l'entraîneur, bleu pour le pilote. La page affiche la **note
moyenne** de la course sous le titre du bloc.

#### ⚠️ « تتمة القراءة لا تعمل » — le faux chevron (18/10/2026)

Signalé par l'utilisateur, capture à l'appui : il cliquait sur le **guillemet
fermant `»`** en fin de déclaration, cerclé sur sa capture… et rien ne se
passait.

**Ce n'était pas un bouton** : `«` et `»` étaient écrits en **amber, gras**
(`SK.accent`), en fin de citation — ils ressemblaient trait pour trait à un
chevron. Et il n'y avait rien à ouvrir : les 16 déclarations **tiennent toutes
en 4 lignes** (mesuré : `scrollHeight == clientHeight`, aucune n'était coupée).

Ce qui a été changé :

| Avant | Après |
|---|---|
| `«` `»` en **amber gras** → l'air d'un bouton | `«` `»` en **gris acier fin** (`#8798ad`) → une ponctuation |
| rien à ouvrir (texte entier) | **`TextePliable`** : plié à 5 lignes, avec un **vrai bouton** « Lire la suite » / « Replier » — et il **n'apparaît que si le texte dépasse réellement** (comparaison `scrollHeight` / `clientHeight`, mesurée au montage et au redimensionnement) |

> **La leçon :** sur cette page, un glyphe décoratif ne doit jamais pouvoir
> passer pour un bouton. L'amber est réservé aux commandes.

### 24.4 ② L'analyse du jour

`/pronostic` rend, dans l'ordre : le **chapeau**, la **présentation**, les
**bases**, les **belles chances**, les **outsiders**, les **délaissés**, puis
l'analyse **cheval par cheval** avec la note du journaliste, sa cote et son rang.
Les quatre étages s'affichent en boules colorées, le reste en tableau.

### 24.5 ③ La revue de presse — chaque journal et ses 8 chevaux

Le tableau de la source est en `<th>` **non fermés** (HTML tolérant) : le
lecteur travaille donc **ligne par ligne**, jamais avec un parseur DOM.

```
pour chaque <tr> :
  le nom du journal  = son lien (detail-rentabilite-…) sinon la cellule class="cr"
  les chiffres       = tous les nombres de la ligne
  garde-fous         ① 8 à 12 nombres (le nom peut en contenir un : « Canal 2 »,
                        « Europe 1 ») — au-delà, ce n'est pas une sélection
                     ② aucun n° > 30 — les lignes de rentabilité
                        (« 204 COUPLE : 230 ») tombent d'elles-mêmes
                     ③ doublon de nom → ignoré
  picks = les 8 DERNIERS nombres
```

Puis le **consensus** : combien de journaux citent chaque numéro, en barres.
18 journaux × 8 chevaux quand la source répond.

> ⚠ **La source est actuellement vide (18/10/2026).** `presse.php` ne rend que
>   `yes118 October 2026 [ 05:10:05]` — **31 octets**, et elle rend la même chose
>   dans un vrai navigateur. Ce n'est donc pas le relais, ce n'est pas le frein
>   (`Crawl-delay: 10`) : **la page est vide côté source**. L'onglet le dit
>   (« le site … n'a rien livré ») et propose **Réessayer**. À vérifier quand la
>   source revient.

### 24.6 ⭐ ④ Les journaux — le tour complet des titres, un par un

Tous les titres que l'utilisateur a cités ont été essayés le 18/10/2026.

| Titre | Verdict mesuré |
|---|---|
| **Paris-Turf** | ✅ **son API de contenu rend ses articles, texte entier** — voir ci-dessous |
| **Le Veinard** | ✅ `leveinard.com/les-actualites` publie ses articles en clair |
| La Gazette des Courses | ❌ journal **payant** (Cafeyn, journaux.fr, kiosque) : rien en clair |
| Courses par Courses | ❌ domaines **inexistants** (DNS : courses-par-courses.com, coursesparcourses.com) |
| Tiercé Magazine | ❌ domaines **inexistants** (DNS : tiercemagazine.fr, tierce-magazine.fr) |
| Week-End (les « Journaux ») | ❌ domaines **inexistants** (DNS : journalweekend.fr, weekend.fr) |
| Parisien | ❌ `course-parisien.fr` ne résout pas |
| Geny | ❌ `geny.com` → 404 ; `geny-courses.com` → un **blog d'articles SEO** (« Best Wireless Earbuds », gaming, fashion), aucune actualité hippique |
| Turfoo | ❌ 403 Cloudflare |
| Jour de Galop | ❌ joignable (WordPress, REST en CORS ouvert) mais ses articles sont des **biographies** (Bernard Cyprès, Right Royal, 2025) : rien de quotidien, le journal est payant |
| Zone-Turf | ❌ RSS joignable, mais c'est un **site**, pas un journal — non retenu |
| Equidia | ❌ **écarté sur demande** |

> ⚠ Ces titres ne sont **pas** « en panne » : ils n'existent pas ou sont payants.
>   La page ne les liste donc pas — elle ne promet pas ce qu'elle n'a pas.
>   Si l'un s'ouvre un jour, il s'ajoute en trois lignes (§24.10).

#### Paris-Turf — l'API de contenu

```
GET /api/ptf/api/articles?orderBy=publishedAt&order=desc&limit=N
    → { data: [ { id, title, teaser, content, slug, publishedAt, authorName,
                  category, subCategory, media[] } ], pagination }
```

- `content` est le **texte entier en HTML** (1 à 3 Ko) — on n'a donc **pas**
  besoin d'ouvrir le site (dont la page est derrière Cloudflare, 403 depuis Node).
- Les paramètres, **mesurés** (tous ne marchent pas) :

```
✅ ?limit=24                        la taille du lot
✅ ?skip=20                         la pagination
✅ ?orderBy=publishedAt&order=desc  LES ARTICLES RÉCENTS  ← celui qu'on utilise
❌ ?orderBy=publishedAt             ordre bâtard (2022, 2009, « 0026-08-11 »)
❌ ?orderBy=publishedAt:desc        422
❌ ?category=FRANCE / ?subCategory=  ignorés (mêmes résultats)
❌ api/news · api/actualites · api/posts · api/categories · api/tags · api/magazine
    → 404
✅ api/articles/{id}                un article seul
```

- Les rubriques rencontrées : `FRANCE`/`GALLOP`, `FRANCE`/`TROT`,
  `FRANCE`/`FLAT`, `FRANCE`/`HURDLE`, `INTERNATIONAL`/`…`, `OPERATORS_GAMES`/`NEWS`,
  `MAJOR_ISSUES`/`GALLOP` → traduites (`France · Plat`, `Jeu & opérateurs · Actualité`).
- **La source préprogramme ses séries** : le 18/10 au matin, l'API rendait déjà
  « La stat de 15 h 64 » des **19, 20, 21 et 22 octobre**. Un journal du jour ne
  publie pas après-demain → les articles **datés à venir sont écartés**
  (`AVANCE_TOLEREE = 12 h`, pour ne pas perdre un article du soir à cause d'un
  fuseau). Mesuré : 24 → **19 articles** de Paris-Turf.

#### Le Veinard — la page d'actualités

```
https://www.leveinard.com/les-actualites        (via /api/lv)
  <b style="font-size: 16px;">LE TITRE</b><br>
  Publié le SAMEDI 17 OCTOBRE 2026<br>
  <img src="./actualites/images/2026-10-17-1.jpg">
  <div style="text-align: justify;">LE TEXTE ENTIER</div>
  … et le lien de la semaine précédente : ./actualites-2026-semaine-41
```

- **On lit la semaine en cours ET la précédente** → 7 articles le 18/10
  (17/10, 14/10, 13/10, 11/10, 10/10, 07/10, 06/10).
- La date est **écrite en toutes lettres** : elle est convertie en ISO par une
  table de mois (accents retirés via `NFD`). Une date illisible → l'article
  **descend** au lieu de se croire récent.
- ⚠ `leveinard.fr` est un **autre site** (web/astuces) : le quotidien hippique
  est `leveinard.com`.

#### Les images se chargent en direct — mesuré

```
✅ https://horse-racing-api.paris-turf.com/api/articles/{id}/images/{n}   900×600
✅ https://www.leveinard.com/actualites/images/2026-10-17-1.jpg           617×582
❌ /api/ptf/api/articles/…/images/{n}     le relais rend un 302 → image cassée
```

→ une balise `<img>` **n'a pas besoin de CORS** : on garde l'adresse d'origine,
on ne relaie pas les images. (Et si elle tombe, `onError` la retire au lieu de
laisser un carré vide.)

#### Le nettoyage du HTML — `htmlSur()`

Le texte d'un journal est affiché **dans la page** (`dangerouslySetInnerHTML`),
jamais dans un onglet, jamais dans une iframe. Avant, il passe par `htmlSur()` :

```
① <script> et <style>            retirés
② on…="…" (onclick, onerror…)    retirés
③ <a href> → <span>              un lien cliqué emmènerait la page ailleurs
④ javascript: dans href/src      retirés
```

Les images, elles, **restent** (voir au-dessus). Vérifié en direct : dans le
lecteur, `0` script, `0` lien, les images chargées.

### 24.7 La règle des pannes — et le bouton « Réessayer »

Chaque bloc est **indépendant** : un bloc qui tombe n'emporte pas les autres.
L'état est porté par `etats` (`attente` / `ok` / `vide` / `erreur`) et la panne
par `pannes`, deux objets séparés. L'écran affiche alors **une ligne** :

```
⏳ Chargement…
⚠ <ce qui manque, et pourquoi>
ℹ <ou : « aucun article publié pour l'instant » — ce n'est pas une panne>
                                            [↻ Réessayer]
```

Le bouton **Réessayer** incrémente un compteur `relance` : les trois `useEffect`
se relancent (la course + ses deux appels, la revue de presse, les journaux).
Il n'y a **pas** de bouton par bloc : un seul suffit, et il relance tout.

### 24.8 Le cache et les pannes partielles

- Les journaux sont cachés **10 minutes** dans `localStorage`
  (`presse.journaux.v1`) : on ne redemande pas 26 articles à chaque
  rechargement. Un cache vide n'écrit **jamais** (sinon on figerait un écran nul).
- Les deux journaux sont appelés en **`Promise.allSettled`** : si l'un tombe,
  l'autre s'affiche quand même, et la ligne d'état **le nomme**.
  Un écran vide se mérite.

### 24.9 Le bug corrigé au passage — le jeu de caractères

Le relais relayait les octets tels quels : `pronostics-turf.info` est en
**windows-1252**, et « Assiduité », « L'Indépendant », « La Dépêche »
arrivaient en « Assiduité », « L'Indépendant », « La Dépêche ».

Corrigé **dans les deux relais** :

```
vite.config.js   decoderTexte()   décode (en-tête → UTF-8 strict → windows-1252)
api/_proxy.js    idem             puis re-sert avec `charset=utf-8` FORCÉ
```

Le relais dit maintenant ce qu'il sert, au lieu de laisser le navigateur
deviner. C'est `htmlTexte()` côté page qui lit l'en-tête et décode en
conséquence.

### 24.10 Ce qu'il faut savoir avant de toucher à cette page

1. **Ne pas réessayer `api.equidia.fr/api/public/articles`** : cet endpoint rend
   **403 à tout le poste** après une rafale — y compris côté serveur, y compris
   depuis un autre range. C'est un blocage par adresse, pas une pagination.
   On ne l'appelle plus du tout (les articles viennent des journaux).
2. **Ne jamais nommer nos sources à l'écran** (pronostics-turf.info, api.equidia.fr,
   casacourses) : la règle de la maison tient. **Les journaux, eux, sont le
   contenu** — c'est leur nom qu'on veut lire sous un article.
3. Une signature d'article qui porte le nom de notre source (equidia) est
   réécrite en « La rédaction » (`nomAuteur`). Le chapô d'un tiers, lui, n'est
   pas retouché : c'est le texte de quelqu'un d'autre.
4. **Ajouter un journal = trois lignes** : une fonction qui rend
   `{ journal, titre, texte, date, image, … }`, un `push` dans `articles()`, et
   la teinte du titre dans `TEINTE_JOURNAL` (`Presse.jsx`). Si le site n'a pas
   de CORS, un relais de plus (`ORIGINES` dans `vite.config.js` **et**
   `api/_proxy.js`, `api/<nom>.js`, le rewrite dans `vercel.json`).
5. **Un seul bouton pour recharger**, `relance`. Ne pas en ajouter un par bloc :
   la page a trois appels, ils repartent ensemble.

### 24.11 Vérifié le 18/10/2026 (navigateur, `localhost:3003/presse`)

```
Course du jour   R1C3 ParisLongchamp · PRIX RIEUSSEC · 15:15 · 3100 m · 16 partants · Plat
① Déclarations   16 cartes · note moyenne 7.1/10
② L'analyse      16 lignes · chapeau + 4 étages + tableau
③ Revue de presse  ⚠ source vide le matin (31 octets, mesuré aussi sans relais)
                 ✅ REVENUE dans l'après-midi : 18 journaux × 8 chevaux, 8/8 partout
④ Les journaux   ⭐ le papier du jour : 3 chevaux du Quinté (BLACK SAXON n°3 notre
                 coup de cœur · STEP MORNING n°7 dernière heure · PRINCESSE D'AMOUR
                 n°4 outsider), commentaire entier, lecteur crème dans la page
                 + 26 articles : Paris-Turf 19 · Le Veinard 7
⑤ En vidéo       30 vidéos · 4 du jour (Pyramide des chances, Le Veinard avec Courses
                 par Courses, 05 cinq journaux, La Gazette des Courses) + 26 précédentes
                 lecteur : youtube-nocookie dans la page, videoplayback confirmé
Badges          16 déclarations · 18 journaux · 26 articles · 3 chevaux du papier · 30 vidéos
Débordement horizontal : 0 px
npm run build   ✅
```

---

### 24.12 ⭐ ⑤ LES JOURNAUX EN VIDÉO — ce qu'il cherchait vraiment

Deux liens de l'utilisateur, et rien d'autre :

```
https://www.youtube.com/watch?v=RhhTRuVCwTM
  « PRIX RIEUSSEC 05 CINQ JOURNAUX WEEKEND PARIS TURF GENY
    COURSE PARISIEN TIERCÉ MAGAZINE 18/1/26 »
https://www.youtube.com/watch?v=Ahsn-YJs1lg
  « DIMANCHE 18 OCTOBRE 26 LE VEINARD AVEC COURSES PAR COURSES
    PRIX RIEUSSEC PARIS LONGCHAMP »
```

> « هذه هي الاخبار التي ابحث عنها من الجرائد » —
> **les nouvelles des journaux, c'est ÇA.**

Les deux liens viennent de la **même chaîne** (`RETRO-QUINTES`,
`@TUBE_CHEVAL1966`, `UCinyN5Q6efFgWevTqklFi3w`), qui **filme et feuillette les
journaux chaque matin**, et dont les titres portent **exactement** la liste
qu'il avait donnée :

| Ce que le canal publie | Ce que l'utilisateur demandait |
|---|---|
| « 05 CINQ JOURNAUX WEEKEND PARIS TURF GENY COURSE PARISIEN TIERCÉ MAGAZINE » | JOURNAUX WEEK-END · PARIS TURF · COURSE PARISIEN · TIERCÉ MAGAZINE |
| « LA GAZETTE DES COURSES QUINTÉ DE … » | LA GAZETTE DES COURSES |
| « LE VEINARD AVEC COURSES PAR COURSES … » | LE VEINARD AVEC COURSES PAR COURSES |
| « PYRAMIDE DES CHANCES TURFOMANIA … » | (en bonus) · « COUP SÛR ET VEINARD … » pour les autres jours |

**Le raisonnement, en une ligne :** les journaux eux-mêmes sont payants ou
introuvables (§24.6) — mais leur **revue existe en clair, en vidéo, tous les
jours**. On ne remplace pas la presse : on prend celle qu'il regarde déjà.

#### Comment on lit la chaîne — DEUX sources, corrigé le 23/10/2026

```
① GET /api/yt/feeds/videos.xml?channel_id=UCinyN5Q6efFgWevTqklFi3w
   → 32 Ko, 15 entrées, `published` À LA SECONDE, les vues
   → C'EST LA SOURCE DE LA FRAÎCHEUR : relue toutes les 60 s
   ⚠ YouTube la cache 15 min (`cache-control: max-age=900`) : une vidéo
     publiée peut mettre jusqu'à un quart d'heure à y entrer.

② GET /api/yt/channel/UCinyN5Q6efFgWevTqklFi3w/videos
   → 1,3 Mo de HTML ; TOUT l'état est dans `ytInitialData`
   → on l'extrait par COMPTAGE D'ACCOLADES, jamais par regex sur 1,3 Mo
   → on lit DEUX formes, YouTube sert l'une ou l'autre :
        · videoRenderer     (la forme historique)
        · lockupViewModel   (la forme récente — titre dans metadata, durée en badge)
   → elle donne 30 vidéos, la DURÉE et les vues, mais pas d'horodatage
     absolu (« il y a 6 h »). Relue toutes les 10 min seulement.
```

Les deux sont **fusionnées par `id`**, jamais l'une à la place de l'autre : le
flux donne l'ordre et l'instant exact, la page donne la durée et les vidéos plus
anciennes que les 15 du flux. Si l'une tombe, l'autre suffit.

```
❌ /api/… public de la chaîne       → il n'y en a pas sans clé d'API
✅ le flux RSS                      → 200, 32 Ko (il avait été noté « mort, 404 »
                                      le 18/10 : la note était fausse)
✅ la page /videos + ytInitialData  → 30 vidéos, avec titre, vues, durée
```

#### Quelles vidéos sont « du jour » — et celles de DEMAIN

Trois signaux, **et rien d'autre** — on ne devine jamais :

```
① LE NOM DE LA COURSE  « PRIX RIEUSSEC » → le mot distinctif (RIEUSSEC ;
   « PRIX », « GRAND », « HANDICAP »… sont des mots vides). C'est le signal
   le plus sûr : le canal met le nom du Quinté dans ses titres.
② LA DATE DU JOUR, toutes ses écritures : 18/10/2026 · 18/10/26 · 18-10-26 ·
   18.10.26 · 18 OCTOBRE 26 · 18 OCTOBRE 2026
③ LA DATE DE LA RÉUNION ÉCRITE DANS LE TITRE (`jourVideo`) — c'est elle qui
   range une vidéo dans « DÉJÀ EN LIGNE — LA COURSE À VENIR ».
```

> ⚠ **Le canal publie la revue de presse de la course du LENDEMAIN le soir
> même.** Mesuré le 23/10/2026 : la vidéo du Quinté du 24 (PRIX DE BEAUNE,
> Compiègne) était en ligne à **22 h 03**, avec « SAMEDI 24 OCTOBRE 26 » dans
> le titre. Avant le 23/10, elle tombait dans « Les jours précédents » — donc
> nulle part, sous 25 vignettes. Elle a maintenant son bloc, juste sous celui
> du jour.

Le partage se fait **dans la page** (`partagerVideos`), parce que c'est le seul
endroit qui connaît **la course** *et* **les vidéos**. Sans nom ni date, tout
part dans « Les jours précédents » : mieux vaut ne rien mettre en avant que de
mettre en avant la course d'hier.

#### ⏱️ La veille automatique — « لتضهر عندنا فور نزولها »

Demande de l'utilisateur, 23/10/2026 :

> « الفيديوهات الخاصة بيوم الغد توجد على اليوتوب لكن لا تظهر عندنا في الصفحة
>   هل من طريقة للتحديث التلقائي لهذه الفيديوهات لتظهر عندنا فور نزولها »

Une page ouverte ne voyait **jamais** une vidéo arriver : elle n'était lue
qu'une fois, au montage. Maintenant :

| quand | ce qui se passe |
|---|---|
| toutes les **60 s** | `videosJournaux()` est relu — **si l'onglet est visible** |
| retour sur l'onglet (`visibilitychange`) | relecture immédiate |
| retour sur la fenêtre (`focus`) | relecture immédiate |
| onglet en arrière-plan | **rien** : pas de réseau pour rien |

- la liste n'est remplacée que si les `id` ont changé (pas de clignotement) ;
- une veille qui tombe **ne casse jamais l'écran** : la liste reste, aucune
  erreur n'est posée ;
- la ligne « veille automatique — flux relu à 23:34 GMT, puis toutes les
  minutes » dit à l'utilisateur que ça se fait tout seul, et depuis quand.
- coût : **32 Ko par minute** (le flux). La page de 1,3 Mo n'est relue que
  toutes les 10 min.

#### Le lecteur

La vidéo se joue **dans la page**, comme l'article — **jamais dans un onglet**,
jamais un lien qui sort.

```
https://www.youtube.com/embed/{id}
  ?playsinline=1        ← OBLIGATOIRE : sans lui, iOS et Android confient la
                          lecture au lecteur natif et ouvrent l'application
                          YouTube — on quitte la page
  &rel=0&modestbranding=1&iv_load_policy=3&color=white
  &origin=<notre origine>   (YouTube l'exige pour la lecture en cadre tiers)
```

> ⚠ `autoplay=1` a été **retiré** le 23/10/2026 : il est refusé sans geste
> utilisateur, et c'est lui qui pousse vers l'application. C'est le clic dans
> le cadre qui démarre la lecture.
> ⚠ `youtube-nocookie.com` a été abandonné : plusieurs bloqueurs le coupent par
> motif (écran noir). `www.youtube.com` est plus largement accepté.
> Une seule définition : `lienVideo(id)` dans `Presse.jsx`.

Vérifié au réseau : `videoplayback` part bien, la vidéo joue vraiment.

> ⚠ Exception assumée, la même que pour l'article relayé : **la vidéo garde sa
>   marque** (celle du journal et celle de la chaîne). C'est le contenu, pas
>   notre habillage. Nos sources à nous ne s'écrivent toujours nulle part à
>   l'écran.

> ⚠ **2 vidéos sur 30 ne peuvent pas jouer** : `Ga6hptSkwp8` et `OdXSzlo3qGs`
>   sont réservées aux membres de la chaîne (`UNPLAYABLE`, « Rejoignez cette
>   chaîne »). Ce n'est pas notre lecteur : elles ne jouent nulle part sans
>   abonnement.

#### Pour ajouter une autre chaîne

Une ligne dans `donnees.js` (`CHAINE_VIDEO`), ou une liste. Rien d'autre ne
change : le partage du jour et le lecteur sont déjà génériques.

---

### 24.13 ⭐ LE PAPIER DU JOUR, EN TEXTE — « ما تعرضه تلك الفيديوهات من موقعها الرسمي »

La demande, mot pour mot :

> « الا يمكنك ان تجلب اخبار الصحف المعروضة بالفيديو وعرضها فقط بدون عرض
>   الفيديوهات … انا افضل ان ناخد ما تعرضه تلك الفيديوهات من موقعها الرسمي
>   وتحدث تلقائيا كل يوم »

→ **le CONTENU des journaux, en texte, pris à la source, sans les vidéos, et
qui se met à jour tout seul.** Ce qui suit a été mesuré le 18/10/2026.

#### ⭐ La Gazette des Courses publie son papier du jour — en clair

`lagazettedescourses.fr` est un **WordPress dont le REST est OUVERT** :

```
GET /api/gz/wp-json/wp/v2/posts?per_page=60&orderby=date&order=desc
    &after={J-3}T00:00:00&_fields=id,date,title,categories,content
```

- **chaque papier est UN CHEVAL** : le titre EST le nom du cheval,
  `content.rendered` EST le commentaire du journal ;
- **chaque papier est rangé dans une rubrique** (les catégories) :

| Catégorie | Rubrique du journal |
|---|---|
| 125 | **Notre coup de cœur** |
| 127 | **Dernière heure** |
| 124 | **Outsider** |
| 123 | **Repéré sur les pistes** |
| 122 | **Stop info** |

**La preuve que c'est bien le papier de la course du jour** (18/10, PRIX
RIEUSSEC, R1C3) : les papiers publiés le 17/10 à 15:30 portent **Step Morning
(n°7)**, **Princesse d'Amour (n°4)** et **Black Saxon (n°3)** — les trois
courent bien le Quinté du jour. Le lot du 16/10 (Kirikou des Mers, Loquas,
Gardons Le Sourire) courait le Quinté du **17/10**.

→ **Rattachement par le NOM du cheval**, jamais par la date : un papier de la
veille pour une autre course ne peut pas entrer.

⚠ **Le piège corrigé au passage** : WordPress abîme les apostrophes en
`&rsquo;` — « Princesse d&rsquo;Amour » ne reconnaissait pas « PRINCESSE
D'AMOUR » et le n°4 **disparaissait du papier** (2 chevaux sur 3, vu à
l'écran). `cleNom()` décode donc les entités (`dec()`) AVANT de comparer.

#### Ce qui n'existe PAS en texte (et pourquoi les vidéos restent)

| Journal | Verdict mesuré le 18/10/2026 |
|---|---|
| **La Gazette des Courses** | ✅ **publie son papier du jour**, texte entier, rubrique par rubrique |
| **La Gazette · sélection** | ✅ ses 8 chevaux sont AUSSI dans la revue de presse (③) |
| Week-End Turf | ❌ même plateforme, mais **mort** : dernier papier **avril 2025** |
| Tiercé Magazine | ❌ idem : dernier papier **avril 2025** |
| Bilto | ❌ site de foot ; 7 papiers turf au total |
| Le Veinard | ❌ pas de page Quinté (`/pronostics` → 404) ; ses « unes »
(`images/quotidien/enorme/VE{AAAAMMJJ}.jpg`) ont **deux jours de retard**
(le 18/10 : VE20261016.jpg ✅, VE20261018.jpg → 404) |
| Paris-Turf | ❌ Cloudflare 403 sur le site (seule son API répond → onglet ④) |
| Course Parisien / Geny | ❌ kiosque payant (Cafeyn / journaux.fr) |

> **Conclusion :** on ne prétend pas servir « les 5 journaux ». On sert **le
> journal qui publie son papier du jour**, on dit lequel, et l'onglet vidéo
> reste en dessous pour ce que le texte ne donne pas.

#### Où ça s'affiche

Onglet **④ Les journaux**, **avant** les articles : « **Le papier du jour** »,
une carte par cheval — `Boule(n° du Quinté)` + nom + corde + VH + le
commentaire, groupé par rubrique (chacune sa couleur, `teinteRubrique`), et un
bouton **« Lire en entier »** qui ouvre la visionneuse crème DANS la page.

#### ⏱️ Et la mise à jour, alors ?

**Automatique, sans rien toucher** :

```
chaque ouverture de /presse  → les 4 sources sont relues (cache 10 min)
le papier du jour            → /wp-json relu à chaque fois : dès que le journal
                               publie (la veille au soir), il apparaît
les vidéos                   → même chose : la chaîne est relue, les nouvelles
                               vidéos arrivent seules
le job quotidien (§13)       → 08 h 45 et 20 h 30, il archive le marché et la
                               Synthèse
```

⚠ Comme le papier sort **la veille au soir**, à 07 h on lit déjà le papier du
jour ; et si le journal n'a rien publié, le bloc le dit : « le journal n'a rien
publié sur ce Quinté pour l'instant ».

---

## 25. 🛡️ LA CONSOLE D'ADMINISTRATION `/admin` (18/10/2026) — invisible, et son login (25/10/2026)

> **Demande de l'utilisateur** : « أريد أن أضيف صفحة الإدارة لكن لا تظهر عند
> الزوار » (une page d'administration, mais qui ne se montre pas aux visiteurs),
> pour préparer un futur **accès par login** (c'est lui qui donne les
> utilisateurs et les mots de passe), et **savoir qui vient sur le site**.

### 25.1 Les trois règles d'invisibilité

> ⚠ **Mise à jour du 25/10/2026** : la « clé » a été **remplacée par un vrai
> login** (§25.7). Les règles ci-dessous décrivent l'état du 18/10 ; seule la
> première reste vraie telle quelle (aucun lien). Le point ② est devenu : *sans
> session, `/admin` montre le formulaire* — et non plus l'accueil.

| | |
|---|---|
| **Aucun lien** | `src/Entete.jsx` ne connaît pas la console. Aucune page ne pointe vers elle. |
| **Sans clé → accueil** | `/admin` sans clé renvoie à `/` : un visiteur qui tape l'adresse voit **exactement** ce que voit celui qui tape n'importe quelle adresse inconnue. Rien ne trahit son existence. |
| **La clé vit dans le navigateur** | Première ouverture par l'adresse : `/admin?cle=<ta clé>` (6 caractères minimum). Elle est mémorisée, puis **retirée de l'URL** aussitôt (pas d'historique, pas de lien partagé). |

⚠ **Ce n'est pas de la sécurité, c'est de la discrétion** — et c'est dit tel quel
dans la page. Les comptes vivent dans `localStorage` : un visiteur qui forcerait
l'entrée ne verrait que **ses propres comptes vides**. La protection réelle
viendra avec le login.

### 25.2 Les trois onglets

```
Utilisateurs  →  qui entre, quel mot de passe, QUELLES PAGES
Pages         →  le catalogue du site + qui a le droit d'y aller
Visiteurs     →  le journal (IP, pays, page, appareil) + la mesure Vercel
```

**Utilisateurs** — chaque compte : nom, mot de passe (**champ de saisie : tu
écris le tien** ; le bouton 🎲 n'est qu'une option, et le générateur évite
`0/O`/`1/l/I` pour qu'on le relise au téléphone), une pastille par page (clic =
autoriser/refuser), `rien` / `tout`, actif-suspendu, suppression.
`comptes.json` s'exporte — **c'est ce fichier qu'on donnera au serveur le jour du
login** — et s'importe.

> ⚠ **25/10/2026** : cet onglet est le **BROUILLON** du navigateur. Ce que le
> login lit vraiment, c'est `ADMIN_COMPTES` (§25.7). La carte « Les comptes du
> serveur » montre ce que le serveur a lu, et le bouton **Préparer
> ADMIN_COMPTES** transforme le brouillon en hash PBKDF2, le télécharge et le
> copie — aucun mot de passe en clair ne part sur le serveur.

**Pages** — le catalogue est une **constante** (`PAGES`, `backend/ADMIN/donnees.js`)
alignée sur `src/App.jsx` : analyse `/` · quinte `/quinte` · presse `/presse` ·
lives `/lives` · DNA `/dna` · résultats `/resultats` · article `/r/:slug` ·
admin `/admin` (8 entrées, `/coply` supprimée). La colonne « qui y a
accès » se remplit depuis **les comptes du serveur** quand ils existent, sinon
depuis le brouillon : c'est la matrice des droits.

> ⚠ La `cle` d'une page est une **clé de permission** : la renommer effacerait
> les droits déjà saisis. Les pages inconnues d'un compte importé sont
> **signalées**, jamais transformées en droit.

### 25.3 ⭐ Les adresses IP — oui, c'est possible, et voici comment

**Ce que Vercel Analytics donne (déjà en place, gratuit, sans cookie)** :
les vues par page, les visiteurs uniques, les visiteurs « en direct », le pays,
l'appareil, le site référent. **Il ne donne PAS les IP** — c'est une mesure
agrégée, et il faut l'**activer une fois** (projet → Analytics → Enable).

**L'IP, elle, ne peut venir que du serveur** : le navigateur ne connaît pas
l'adresse des autres visiteurs (et c'est heureux). D'où deux routes nouvelles :

```
POST /api/visite?p=/presse   →  le serveur lit x-forwarded-for, le pays
                                (x-vercel-ip-country) et écrit UNE ligne
GET  /api/visiteurs?jeton=…  →  le journal, réservé au propriétaire
```

| Fichier | Rôle |
|---|---|
| `api/visite.js` | écrit une visite. **Sans base : 204, rien n'est écrit** — le site ne casse pas. |
| `api/visiteurs.js` | lit le journal. **Fermé par défaut** : sans `ADMIN_JETON`, 403. Comparaison du jeton à **temps constant**. |
| `backend/ADMIN/visites.js` | le ping côté page : `pointerVisite()`, appelé par `NoterPage` (`src/App.jsx`) **à chaque changement de page**. |
| `backend/ADMIN/donnees.js` | `lireVisites()`, `appareil()`, `paysLisible()`, `ilYA()` — la lecture d'un visiteur. |

**Les trois étapes pour l'activer** (une seule fois) :

1. `vercel.com` → projet **bahja-turf** → **Storage** → créer un **Redis** (offre gratuite) ;
2. le relier au projet → Vercel pose `KV_REST_API_URL` et `KV_REST_API_TOKEN` ;
3. ajouter la variable **`ADMIN_JETON`** (un mot de passe de ton choix) → redéployer.

Puis, dans l'onglet **Visiteurs** : coller ce jeton une fois (il reste dans le
navigateur), et le journal se remplit tout seul — il se relit toutes les minutes,
et le bouton **Test** écrit une ligne marquée « test » pour vérifier la chaîne.

**Ce qui est gardé** : les **2000 dernières** visites (`LTRIM`), rien d'autre :
date, IP, page, pays, ville, appareil, référent. ⚠ **Une IP est une donnée
personnelle (RGPD)** : prévoir une durée de conservation et une mention sur le
site le jour où le journal devient permanent.

### 25.4 Pourquoi le ping est inoffensif

- **jamais bloquant** : `keepalive`, erreurs avalées — un journal en panne ne
  ralentit ni ne casse une page ;
- **le propriétaire n'est pas compté** : si la clé de la console est présente
  dans le navigateur, `pointerVisite()` ne fait rien (ses propres tournées ne
  polluent pas les statistiques) ;
- **rien en développement** : le middleware de `vite.config.js` répond
  `{configure:false}` (et 204 pour la visite) exactement comme Vercel sans base,
  pour que la console se dessine pareil au poste et en ligne ;
- **la page ne voit jamais l'IP** : elle l'envoie pas, elle ne la reçoit pas —
  c'est le serveur qui l'écrit.

### 25.5 Les fichiers

| Fichier | Rôle |
|---|---|
| `frontend/ADMIN/Admin.jsx` | la console : la **porte** (login) + 3 onglets, peau « ardoise » (hors des 4 peaux des onglets publics) |
| `api/admin.js` | **le serveur du login** : `etat` · `session` · `login` · `logout` · `comptes` — PBKDF2 + cookie HMAC |
| `src/lib/adminAuth.js` | les 5 appels de la page vers `/api/admin` (`credentials: 'same-origin'`) |
| `backend/ADMIN/donnees.js` | catalogue des pages, brouillon de comptes (localStorage), `hacher()` / `envComptes()` (Web Crypto), mots de passe, import/export, lecture d'un visiteur |
| `backend/ADMIN/visites.js` | `pointerVisite()` — le ping d'une page vue (le propriétaire connecté n'est pas compté) |
| `vite.config.js` | le middleware **dev** `/api/admin` (il importe `api/admin.js` derrière un adaptateur) + `loadEnv` |
| `src/App.jsx` | la route `/admin` + `<NoterPage />` (le ping à chaque changement d'adresse) |

### 25.6 ⏸️ HISTORIQUE — la consigne du 18/10 et son état

> **Consigne de l'utilisateur, le 18/10/2026** : « سجل عندك إلى أن أطلب منك تفعيل
> صفحة الأدمن لتقوم بالمهمة » — *note-le : tu n'actives la page d'administration
> que quand je te le demanderai.*

**Cette consigne a été honorée puis levée.** Le 25/10/2026 l'utilisateur a
demandé « الان بغيت نزيد صفحة الاذمين » et a choisi **« فعّل الكونسول الحالي
(login حقيقي) »** : le login est donc actif — voir §25.7.

**Ce qui reste vrai :**

| | |
|---|---|
| ✅ **aucune page publique n'est filtrée** | le login ouvre la **console**, pas le site. Les droits `pages[]` sont portés et affichés, mais le routeur n'est pas gardé |
| ⏸️ **la base Redis** | pas créée → aucune adresse IP n'est enregistrée (le site n'en souffre pas) |
| ⏸️ **`ADMIN_JETON`** | pas posé → `/api/visiteurs` répond 403 « journal fermé » |
| ⏸️ **Vercel Analytics** | pas encore activé (projet → Analytics → Enable) |

⚠ **Ne rien brancher « en passant »** : pas de page bloquée sans que
l'utilisateur l'ait demandé, pas de base créée sans le dire.

### 25.7 ✅ LE LOGIN EST ACTIF (25/10/2026)

> **Demande** : « الان بغيت نزيد صفحة الاذمين » → réponse choisie :
> **« فعّل الكونسول الحالي (login حقيقي) »**.

#### Ce qui a remplacé la clé

| | avant (18/10) | **maintenant (25/10)** |
|---|---|---|
| l'entrée | `/admin?cle=…`, clé en `localStorage` | **mot de passe** vérifié par le serveur |
| la vérification | aucune (discrétion) | **PBKDF2-SHA256, 210 000 itérations, 32 octets** |
| la session | un drapeau dans le navigateur | cookie **`bahja_admin`** signé HMAC-SHA256, `HttpOnly; SameSite=Lax; Max-Age=43200`, `Secure` en https |
| les comptes | `localStorage` (brouillon) | variable **`ADMIN_COMPTES`** sur Vercel |
| sans entrée | renvoi à `/` | **le formulaire** de la porte |

#### Les deux variables

| Variable | Contenu |
|---|---|
| `ADMIN_COMPTES` | JSON : `[{ "nom", "sel", "iter", "hash", "pages": [...], "actif" }]` — `hash` = PBKDF2 hex, **jamais** le mot de passe |
| `ADMIN_SECRET` | une longue chaîne aléatoire (base64url) : elle **signe** les cookies |

Sans l'une des deux → `/api/admin?action=etat` répond `{configure:false}` et la
porte affiche le **mode d'emploi** au lieu de s'ouvrir. Rien n'est cassé.

#### ⭐ LE MOT DE PASSE EST MODIFIABLE — il n'est jamais imposé (25/10/2026)

> **Consigne de l'utilisateur, le 25/10/2026** : « الباسوورد يجب ان اتمكن من
> تعديله وليس باسوورد تلقائي » — *le mot de passe doit être modifiable, pas un
> mot de passe automatique.*

Deux endroits, tous les deux dans **l'onglet Utilisateurs** :

| Où | Ce qu'on fait |
|---|---|
| carte **« Changer mon mot de passe »** | deux champs (nouveau + confirmation) → **Calculer la nouvelle valeur** → la valeur de `ADMIN_COMPTES` est calculée, copiée et affichée avec les 3 étapes restantes |
| carte **« Les utilisateurs (brouillon) »** | le mot de passe de **chaque** ligne est un **champ de saisie** (`écris son mot de passe`), plus un texte figé. Le bouton 🎲 reste là *si* on préfère en tirer un au hasard |

- **`Ajouter` crée une ligne avec un mot de passe VIDE** — c'est toi qui l'écris.
- **`MIN_MDP = 6`** (et non 8) : l'utilisateur a choisi un mot de passe de
  7 caractères (`SADKI75`). La console ne bloque que le ridicule ; sous 8
  caractères le champ passe en **ambre** — c'est un avertissement, pas un refus.
- Un brouillon vide alors que le serveur a des comptes → bouton
  **« Reprendre les comptes du serveur »** : il recrée les lignes (nom + pages +
  actif) avec le mot de passe **vide** (le serveur n'en rend jamais) ; tu retapes
  celui que tu veux.
- Si un compte du brouillon n'a pas de mot de passe, le calcul **refuse** et
  nomme les comptes manquants : un hash ne se devine pas.

#### ⭐ LE MOT DE PASSE EFFECTIF EST `SADKI75` (25/10/2026)

> Consigne : « دير ليا SADKI75 ».

| | |
|---|---|
| compte | **`sam`** (nom facultatif : le serveur l'accepte vide quand il n'y a qu'un compte) |
| mot de passe | **`SADKI75`** — 7 caractères, d'où `MIN_MDP = 6` |
| `sel` | `1c5048c31b15d70ddc902b552484fe5b` |
| `hash` | `95664dd6bf6ea37d6cb9c24cfa1b7296dc28eb916d6d75840087df24e05106b1` |
| pages | les 8 (`analyse`, `quinte`, `presse`, `lives`, `dna`, `resultats`, `article`, `admin`) |

- `ADMIN_COMPTES` a été **écrit par `npx vercel env add ADMIN_COMPTES <env> --force`**
  sur les trois environnements, puis **redéployé** : le mot de passe est actif.
- L'ancien mot de passe (`prxa7qukpgj6cj`) **répond 401** — vérifié en ligne.

```
① /admin → se connecter
② carte « Changer mon mot de passe » → taper le nouveau (2 fois)
③ « Calculer la nouvelle valeur » → hash PBKDF2 calculé DANS LE NAVIGATEUR
   (Web Crypto), valeur copiée + ADMIN_COMPTES.json téléchargé
④ Vercel → Environment Variables → ADMIN_COMPTES → Edit → coller → Save
   (les 3 environnements : Production · Preview · Development)
⑤ Redéployer — Vercel ne relit pas les variables à chaud
```

⚠ **Tant que ⑤ n'est pas fait, l'ANCIEN mot de passe reste le bon.** C'est dit
dans la carte. La session en cours, elle, ne casse pas : le cookie ne contient
pas le mot de passe.

⚠ **Web Crypto n'existe qu'en https ou sur localhost.** En clair sur une IP
distante, `cryptoDisponible()` est faux : la console le dit et refuse de
fabriquer un faux hash.

✅ **Vérifié** : un mot de passe tapé dans la carte a produit
`hash = 449d6f7c…` ; recalculé en Node
(`crypto.pbkdf2Sync(mdp, sel, 210000, 32, 'sha256')`) → **identique à l'octet**.
Le hash du navigateur et celui que `api/admin.js` vérifie sont **le même calcul**.

#### Les garde-fous du serveur

- `nom` vide accepté **s'il n'y a qu'un compte** (le cas normal) ;
- **8 échecs en 10 min par IP → 429**, plus 400 ms de délai sur chaque échec ;
- comparaison **à temps constant** (pas de mesure du secret par le temps) ;
- `logout` efface le cookie (`Max-Age=0`) ;
- `/api/admin?action=comptes` **sans session → 401** ; avec session → noms +
  pages + actif, **jamais** `sel` ni `hash`.

#### Vérifié en ligne (25/10/2026)

```
GET  /api/admin?action=etat                    200 {configure:true, secret:true, comptes:1, login:true}
POST /api/admin?action=login   (faux)          401 {"erreur":"nom ou mot de passe incorrect"}
POST /api/admin?action=login   (ancien mdp)    401  ← prxa7qukpgj6cj ne passe plus
POST /api/admin?action=login   (SADKI75)       200 {ok:true, nom:"sam", pages:[…]}
     Set-Cookie  bahja_admin=…; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200; Secure
GET  /api/admin?action=session  (cookie)       200 {connecte:true, nom:"sam", …}
GET  /api/admin?action=comptes  (sans cookie)  401 {"erreur":"session requise"}
POST /api/admin?action=logout                  200  Set-Cookie Max-Age=0
page /admin sans session  → le formulaire
page /admin avec session  → la console (« La session ouverte » + « Changer mon mot de passe »
                             + « Les comptes du serveur » + « Les utilisateurs (brouillon) »)
document.cookie            → "" (le cookie est HttpOnly, la page ne le voit pas)
```

**Compte propriétaire** : `sam`, mot de passe **`SADKI75`** (7 caractères → `MIN_MDP = 6`).
Pour le changer : la carte « Changer mon mot de passe », puis Vercel + redéploiement
(le serveur ne peut pas écrire ses propres variables).

---

### 25.8 📅 L'ABONNEMENT — DÉBUT ET FIN PAR COMPTE (25/10/2026)

> **Demande** : « انا الي غادي نزيدهم بيدي و بغيتك تدير ليا بداية ونهاية اي يوزر
> اشتراك » — *je m'occupe moi-même des ajouts Vercel ; toi, donne-moi le début et
> la fin de l'abonnement de chaque utilisateur.*

#### La donnée : deux champs dans `ADMIN_COMPTES`

```json
[{ "nom": "sam", "sel": "…", "iter": 210000, "hash": "…",
   "pages": ["analyse","quinte"],
   "actif": true,
   "debut": "2026-10-25",
   "fin":   "2026-11-25" }]
```

| Règle | Pourquoi |
|---|---|
| **`AAAA-MM-JJ`** (le format de `<input type="date">`) | rien d'autre n'est stocké, rien à interpréter |
| **vide = pas de limite** | les comptes créés avant aujourd'hui, et le compte unique, continuent d'entrer — ajouter le champ ne casse rien |
| **la FIN est INCLUSE** | `fin = 30/11` → valable jusqu'au 30 à 23:59:59.999 GMT. On ne coupe pas la veille au soir |
| **comparaison en jours GMT** | même règle que tout le site (§26) : l'heure de l'appareil ne décide de rien |
| **jours restants arrondis au supérieur** | « 1 j » = « aujourd'hui est le dernier jour » |

#### Le serveur (`api/admin.js`) — le même calcul que `backend/ADMIN/donnees.js`

| Où | Ce qu'il fait |
|---|---|
| `login` | après un mot de passe **correct**, refuse **403** si `fin` est passée (`abonnement expiré le JJ/MM/AAAA — contacte l’administrateur`) ou si `debut` est future. **Le cookie n'est pas posé** |
| `session` | revérifie l'abonnement **à chaque appel** : un cookie de 12 h ne survit pas à une fin d'abonnement |
| `comptes` | renvoie `debut`, `fin` et `abonnement: { etat, debut, fin, jours }` (jamais `sel`/`hash`) |

⚠ Un refus pour abonnement **ne compte pas comme un échec de mot de passe** : pas de
429 injuste (le mot de passe était bon).

#### La console (`frontend/ADMIN/Admin.jsx`)

- **une 3ᵉ ligne par utilisateur** : `Abonnement  du [date]  au [date]` + une pastille
  + trois boutons rapides **`+30 j`** · **`+1 an`** · **`sans limite`**.
- **quatre couleurs**, une par état — `illimité` (gris) · `en cours` (vert) ·
  `pas encore commencé` (ambre) · `expiré` (rouge).
- la carte **« La session ouverte »** affiche l'abonnement du compte connecté ;
  la carte **« Les comptes du serveur »** affiche `du → au` et la pastille de chacun.
- `envComptes()` (le bouton **« Enregistrer »** de la carte Utilisateurs, et
  « Recalculer la valeur » de la carte serveur)
  écrit `debut` et `fin` dans la valeur produite ; `nouveauCompte()` les crée vides.

#### Vérifié — le vrai handler, sans réseau (25/10/2026)

```
sam      (sans dates)              200  illimité
expire   (fin hier)                403  abonnement expiré le 24/10/2026
futur    (début dans 5 j)          403  abonnement pas encore commencé (début le 30/10/2026)
encours  (fin dans 10 j)           200  en-cours, 11 j
dernier  (fin aujourd’hui)         200  en-cours, 1 j   ← la fin est bien incluse
suspendu (actif:false)             401  nom ou mot de passe incorrect
mauvais mot de passe               401
session (cookie valide)            200  connecte=true
comptes (sans cookie)              401  session requise
```

Et dans la console en ligne : la pastille est passée à **« expiré le 24/10/2026 »**
dès qu'une fin a été posée, et le JSON produit contenait bien
`"debut":"","fin":"2026-10-24"`.

#### ⚠ Changer une date = la même procédure que le mot de passe

Les dates vivent dans `ADMIN_COMPTES`, donc : **console → « Enregistrer » →
coller sur Vercel → redéployer**. Vercel injecte les variables **au déploiement**
et `process.env` est **en lecture seule** : le serveur ne peut pas réécrire ses
propres variables (c'est aussi pourquoi il n'y a pas d'auto-service). Le jour où
les comptes passeront dans un **KV**, cette étape disparaîtra.

#### ⭐ LE BOUTON « ENREGISTRER » (25/10/2026)

> **Retour de l'utilisateur** : « عند اضافة يوزر جديد لايوجد زر الحفض » —
> *quand j'ajoute un utilisateur, il n'y a pas de bouton Enregistrer.*

Il avait raison : le brouillon s'écrivait **tout seul** dans le navigateur (aucun
retour visible), et le seul bouton qui produisait la valeur du serveur s'appelait
« Vers le serveur » et affichait son résultat **plus bas dans la page**.

| Ce qui a changé | Détail |
|---|---|
| le bouton s'appelle **« Enregistrer »** (vert, plein, icône 💾) | c'est `preparerEnv()` : hash des mots de passe → valeur de `ADMIN_COMPTES` → **copiée** (plus de fichier) |
| **un état visible** en haut de la carte | « ✓ Brouillon enregistré ici · 23:21 GMT » — l'heure est celle de la dernière écriture locale, en GMT (§26) |
| **un bloc de confirmation** en haut de la carte | « ✅ Valeur enregistrée et copiée — il reste 2 gestes » + lien Vercel + **Copier la valeur** + **J'ai redéployé — vérifier** |
| **défilement automatique** vers ce bloc | sans lui, le retour apparaissait hors de l'écran et on croyait que rien ne s'était passé |
| message d'erreur nominatif | « Rien n'est enregistré : ce compte n'a pas de mot de passe. testeur » |

⚠ « Enregistrer » **n'écrit pas** sur Vercel : aucun code ne peut le faire
(variable en lecture seule, pas de token). Il fait tout ce qui est possible
côté navigateur et affiche les 2 gestes qui restent.

#### ⭐ 25.9 LA FUSION — AUCUN COMPTE NE SE PERD, AUCUN NE RÉSUSCITE (25/10/2026)

> **Retour de l'utilisateur** : « كايخرج ليا واحد الملف للتحميل ADMIN_COMPTES.json
> انا هادشي ماعندي لاش يخرج ليا هادشي خاصو يكون اوطو » + il avait collé une
> valeur qui ne contenait **que** son nouveau compte.

Deux défauts réels :

| Défaut | Conséquence |
|---|---|
| « Enregistrer » **téléchargeait** `ADMIN_COMPTES.json` | une fenêtre de téléchargement à chaque clic — il n'en veut pas |
| la valeur produite = **le brouillon seul** | un compte du serveur absent du brouillon **disparaissait** (coller `[0677889900]` effaçait `sam` → plus de login) |

**Ce qui est fait maintenant — `produireValeur()` :**

```
brouillon AVEC mot de passe   → haché, il remplace l'ancien
brouillon SANS mot de passe   → on réutilise sel/iter/hash DU SERVEUR (rien à retaper)
compte du serveur ABSENT      → conservé tel quel
compte SUPPRIMÉ à la main     → ne revient pas (liste `bahja.admin.retires`)
```

- **aucun téléchargement** : la valeur est copiée dans le presse-papier, c'est tout
  (les boutons « Télécharger » ont été retirés des blocs de confirmation).
- **un brouillon vide est accepté** tant que la valeur produite n'est pas vide :
  c'est le cas « je supprime un utilisateur » (les comptes du serveur sont repris).
  Une valeur `[]` est refusée — elle fermerait le login.
- ⚠ `api/admin.js?action=comptes` renvoie désormais **`sel` / `iter` / `hash`** :
  sans eux la fusion fabriquait une ligne **sans hash**, donc un compte mort.
  Ce n'est pas une fuite nouvelle (la console affiche déjà la valeur complète à
  coller) ; la session est `HttpOnly`, signée, revérifiée à chaque appel.

#### ⭐ 25.10 SUPPRIMER DEMANDE CONFIRMATION (25/10/2026)

> « تانيا خدف اي يوزر خاص تكون رسالة تاكيج الحدف »

`supprimer(c)` ouvre un `window.confirm` qui **nomme le compte** :

```
Supprimer le compte « testeur » ?

• il disparaît de la liste ci-dessous ;
• le SERVEUR le garde encore : il faut « Enregistrer », coller la valeur
  sur Vercel, puis redéployer pour qu'il ne puisse plus se connecter.

Confirmer la suppression ?
```

Le nom entre dans `bahja.admin.retires` (localStorage) : la fusion ne le
ressuscite pas depuis `ADMIN_COMPTES`. Re-créer le compte avec un mot de passe
le réintroduit normalement.

#### Vérifié en ligne (25/10/2026)

```
brouillon vide + retires ["testeur"]  → Enregistrer → ["sam"]            ✅
ajout « testeur » (mdp + fin)         → Enregistrer → ["testeur","sam"]  ✅
  · sam garde SON hash   sel 1c5048c3… · hash 95664dd6…   (pas de ligne morte)
  · aucun champ « abonnement » dans la valeur produite
corbeille sur « testeur »             → dialogue confirm nommé           ✅
  · accepter → ligne retirée · retires ["testeur"]
aucune fenêtre de téléchargement      ✅
```

#### ⭐ 25.11 LE SITE EST DERRIÈRE UNE PORTE (26/10/2026)

> **Constat de l'utilisateur** : « sam كايدخل لكن راه مايمكنش نذخل 0677889900
> لانه الصفحة مازال مفتوحة للجميع » — le login existait, mais il n'ouvrait que
> `/admin`. Les pages restaient lisibles par n'importe qui : un abonnement qui
> n'ouvre rien ne sert à rien.

Décision (question posée, réponse de l'utilisateur) : **tout est fermé, y compris
la page d'accueil**, et celui qui n'est pas connecté voit **le formulaire de
connexion à la même adresse** (pas de redirection).

| Fichier | Rôle |
|---|---|
| `src/lib/acces.js` | l'état partagé : qui est connecté (`/api/admin?action=session`), `connecter`, `deconnecter`, `aDroit(pages, cle)`, `premierePage` |
| `src/Portail.jsx` | la porte : `①` formulaire · `②` « pas dans ton abonnement » · `③` la page |
| `src/App.jsx` | **chaque** route est enveloppée : `<Portail cle="quinte"><QuinteGrille /></Portail>` — sauf `/admin`, qui a déjà sa porte |
| `src/Entete.jsx` | n'affiche **que** les liens autorisés + le nom connecté + **Déconnexion** |

Règles :

- **`admin` dans `pages[]` = tous les droits** (le propriétaire). Sinon il faut la
  clé exacte de la page (`analyse`, `quinte`, `presse`, `lives`, `dna`,
  `resultats`, `article` — voir `PAGES`, `donnees.js`).
- **une page non autorisée n'est pas une erreur** : elle affiche « cette page
  n'est pas dans ton abonnement », le nom du compte, un bouton vers sa première
  page autorisée, et **Se déconnecter**.
- **le menu suit les droits** : un compte `["presse"]` ne voit que « Presse ».
- ⚠ **si le serveur n'a pas `ADMIN_COMPTES` (`configure:false`), on laisse
  passer** avec un bandeau ambre « login non configuré ». Une variable oubliée
  ne doit pas fermer le site — pas même au propriétaire.

#### Vérifié en ligne (26/10/2026), avec un compte d'essai retiré ensuite

```
déconnexion → /            → « LBAHJA-TURF · ACCÈS ABONNÉ · Entrer »   ✅ (même URL)
login sam / SADKI75        → la page s'ouvre · 6 liens dans le menu     ✅
compte essai pages=["presse"] :
   /                       → « Cette page n'est pas dans ton abonnement » ✅
   « Aller à la page autorisée » → /presse s'ouvre · menu = [Presse]    ✅
compte retiré de ADMIN_COMPTES → son cookie ne vaut plus rien :
   /presse                 → le formulaire de connexion                 ✅
```

⚠ **Ce que cette porte ne fait pas** : les relais `/api/*` (pmu, pt, eq, dna…)
restent joignables directement. Un visiteur techniquement curieux peut donc lire
les données sans passer par la page. Pour fermer ça aussi il faut un
**middleware Vercel** qui vérifie le cookie avant la réécriture SPA — c'est une
autre étape, non faite ici (le propriétaire ne l'a pas demandée).

#### ⭐ 25.12 QUI VIENT, ET AVEC QUEL APPAREIL (26/10/2026)

> **Demande de l'utilisateur** : « واش كاين شي طريقة باش ايبان ليا نوع الجهاز
> ةالايب ديال المشتركين » — voir le type d'appareil et l'IP des abonnés.

Deux journaux, une seule base. Le premier existait déjà (il n'était **pas
branché**) ; le second est nouveau.

| Journal | Ce qu'il dit | Écrit par |
|---|---|---|
| `visites` | qui vient sur le site, d'où, sur quelle page — **une ligne par page vue** | `api/visite.js` |
| `connexions` | qui **entre**, quand, avec quel appareil, et **si ça a marché** — une ligne par tentative | `api/admin.js` |

Champs : `t` (ISO GMT) · `ip` · `pays` · `ville` · `ua` · `qui`/`nom` ·
`p` (page) · `ref` · `ok` + `motif` (connexions).

##### Ce qui a changé dans le code

| Fichier | Rôle |
|---|---|
| `api/_session.js` | **nouveau** — la session sortie de `api/admin.js` : `COOKIE`, `secret`, `comptes`, `fabriquer`, `lireJeton`, `cookies`, `verifier`, `sessionAdmin`, `aDroitAdmin`, `journalOuvert` |
| `api/_journal.js` | **nouveau** — le Redis REST partagé : `ecrire`, `lire`, `contexte(req)` (IP + pays + ville + ua), délai 2 s |
| `api/visite.js` | ajoute **`qui`** = le nom du compte, lu dans le **cookie signé** (jamais envoyé par la page → infalsifiable) |
| `api/admin.js` | écrit une ligne dans `connexions` à **chaque** tentative : `ok:true`, ou `motif: 'mot de passe'` / `'inconnu'` / `'abonnement …'` |
| `api/visiteurs.js` | lit **les deux** journaux : `?journal=connexions` (défaut = `visites`) + `comptesDistincts` |
| `frontend/ADMIN/Admin.jsx` | colonne **Compte** dans les visites + carte **« Les connexions »** (Quand · Compte · Résultat · IP · Appareil · Pays) |
| `backend/ADMIN/donnees.js` | `lireConnexions`, `verdictConnexion` |

##### ⚠ Le plafond de 12 fonctions (le piège du déploiement)

Le plan **Hobby** refuse plus de **12 fonctions serverless** par déploiement :

```
Error: No more than 12 Serverless Functions can be added to a Deployment
       on the Hobby plan.
```

Le projet en a exactement **12** (`admin dna eq gz lv pmu pt sorec tf visite
visiteurs yt`) ; `ma` et `ptf` sont en **Edge** et ne comptent pas. Un
`api/connexions.js` séparé faisait donc échouer le build.

→ **Les deux journaux se lisent par la MÊME route** : `api/visiteurs.js` avec
`?journal=connexions`. Une fonction de moins, aucune variable de plus.
Toute nouvelle route `/api/*` doit d'abord se demander si elle peut être un
paramètre d'une route existante.


##### ⭐ La session suffit — `ADMIN_JETON` n'est plus obligatoire

Avant, lire le journal exigeait `ADMIN_JETON` : une variable de plus à poser sur
Vercel pour une information que le propriétaire a déjà le droit de voir.
Désormais `journalOuvert(req)` accepte **deux clés** :

1. la **session** de la console dont le compte porte `admin` dans `pages[]` — le
   chemin normal, rien à poser ;
2. ou `ADMIN_JETON` en query — pour un `curl` sans navigateur.

Un abonné simple (`pages: ["presse","quinte"]`) reçoit **403** : il ne voit ni
les IP des autres, ni leurs appareils.

##### ⚠ Ce qu'il reste à faire — côté Vercel, une seule fois

**La base n'est pas branchée** : `KV_REST_API_URL` / `KV_REST_API_TOKEN` sont
absents de la production, donc `api/visite` répond 204 sans écrire et
`api/visiteurs` répond `{configure:false}`. La console l'affiche et explique :

```
vercel.com → projet bahja-turf → Storage → créer un Redis (offre gratuite)
           → le relier au projet (Vercel pose KV_REST_API_URL/TOKEN tout seul)
           → redéployer
```

Aucune autre variable n'est nécessaire. Tant que ce n'est pas fait, **rien ne
s'écrit** — et c'est voulu : une variable oubliée ne doit pas casser le site.

##### Vérifié hors ligne (26/10/2026) — 44 tests, aucune ligne réseau

```
test-session.mjs  17/17  cookie signé relu · falsifié refusé · compte retiré/désactivé
                          → session nulle · aDroitAdmin · journalOuvert (session/jeton)
test-admin.mjs     9/9   login sam 200 + cookie HttpOnly · mauvais mdp 401 ·
                          nom inconnu 401 · abonnement expiré 403 · comptes · logout
test-journal.mjs  18/18  (fausse base Redis en local)
                          visite abonné → qui = 0677889900 · visite anonyme → qui vide
                          3 tentatives écrites (ok / « mot de passe » / « inconnu »)
                          aucun mot de passe stocké · les DEUX journaux lus par la session ·
                          abonné simple → 403 (les deux) · jeton accepté aussi
```

⚠ **RGPD** : une IP est une donnée personnelle. Plafond `LTRIM` (2000 visites,
1000 connexions), rien ne part ailleurs, seul le propriétaire lit. Prévoir une
durée de conservation et une mention sur le site.



---

## 26. 🕐 TOUT S'AFFICHE EN GMT (18/10/2026)

> **Demande de l'utilisateur** : « اجعل كل التوقيتات تعرض بتوقيت GMT » — toutes
> les heures affichées le sont en GMT, **et elles le disent** (« 13:15 GMT »).
> Même règle que le job quotidien, qui l'applique depuis le 09/10/2026 (§13.2).

### 26.1 Les TROIS natures d'heure — les confondre coûte 1 ou 2 heures

| Nature | Écrit comme | Nos sources | Comment on l'affiche |
|---|---|---|---|
| **① un instant** | ISO 8601 **avec** son décalage | `2026-10-16T13:58:00+02:00` (Equidia) · `2026-10-03T03:02:51.835Z` (notre gel) · `…T14:04:00.000Z` (CSS) | lu en UTC, point |
| **② une heure murale FRANÇAISE** | `« 15:15 »`, sans fuseau | Equidia · turf-france · reu.php · programme PMU | `parisVersGMT(date, …)`, heure d'été comprise |
| **③ une heure murale MAROCAINE** | `« 14:15 »`, sans fuseau | **casacourses** (site marocain, UTC+1 **fixe**) | une heure en moins, **sans** passer par Paris |

⚠ **③ n'est pas ②** : en **hiver** Paris vaut UTC+1 comme le Maroc — le décalage
est alors **nul**. Appliquer la règle de Paris à une heure marocaine date la
course d'une heure.

### 26.2 La mesure du 18/10/2026 (le Quinté de ParisLongchamp, R1C3)

```
casacourses  (la fiche de la page Quinté)   14:15   ← heure du Maroc
Equidia      (le programme officiel)        15:15   real_heure_course
                                                    = 2026-10-18T15:15:00+02:00
turf-france / PMU / Couple                  15:15   ← heure de Paris
                                     ─────────────────
                        les trois disent   13:15 GMT
```

Contrôle dans les pages : Quinté `13:15 GMT` · Analyse `C3 13:15 GMT` ·
Coply `C3 · 13:15 GMT` · Presse `13:15 GMT`.
**Avant** : `14:15 h` (Quinté, non étiqueté) · `15:15` (Analyse et Couple, non
étiquetées) · et un relevé de marché annoncé `13:58 GMT` alors qu'il était de
`11:58 GMT`.

### 26.3 ⭐ Le bug corrigé : `slice(11, 16)` sur une date à décalage

Le relevé du marché s'écrit `« 2026-10-16T13:58:00+02:00 »`. Un `slice(11, 16)`
rend `« 13:58 »` — c'est l'heure **de Paris** qu'on étiquetait « GMT » : **2 h
d'erreur** en été, 1 h en hiver. (Sur une chaîne en `Z` le raccourci tombait
juste, d'où des affichages corrects à côté d'affichages faux.) Tout passe
désormais par `src/temps.js`.

### 26.4 Le fichier, et qui s'en sert

| Fichier | Rôle |
|---|---|
| **`src/temps.js`** | LE formateur du site : `heureGMT` · `jourHeureGMT` · `jourLongHeureGMT` · `parisVersGMT` · `heureParisGMT` · **`heureMarocGMT`** · `heureCourseGMT` · `hhmmGMT` · `maintenantGMT` |

| Page | Ce qui est passé en GMT |
|---|---|
| **Quinté** `/quinte` | les conditions de la course (`c.time` = **Maroc**) · le relevé du marché · le gel du ticket (« gelé à … », colonne « Posé le (GMT) ») |
| **Analyse** `/` | l'heure de chaque course du programme (murale de Paris) et l'en-tête de la course ouverte |
| **Coply** `/coply` | l'heure de chaque course (Equidia = Paris) |
| **Presse** `/presse` | l'heure du Quinté (Equidia) · la date et l'heure des articles et du papier du jour |
| **Article** `/r/:slug` | déjà en GMT (outil hérité de la page) ; la ligne « mis à jour » l'est aussi |
| **Administration** `/admin` | le « Quand » du journal des visites : l'heure GMT, puis « il y a … » |

⚠ **Les DATES restent des dates.** La journée de course est une notion
**parisienne** (une course de 23 h 30 est encore « celle du 18 ») : les colonnes
de dates (carrières, archive, en-têtes) gardent donc le calendrier de Paris.
Seule la *date+heure d'un instant* (un article, un relevé) suit l'instant → GMT.

### 26.5 Le job : 1 h d'erreur sur le départ — corrigée aussi

`trouverCourse` a deux sources, et elles ne parlaient pas du même fuseau. Le job
prenait l'heure de **casacourses** (Maroc) et lui appliquait la conversion de
**Paris** (heure d'été) :

```
AVANT : « départ 12:15 GMT »  (faux de 1 h)  →  gel 3 h avant la course
APRÈS : « heure casacourses 14:15 (heure du Maroc, UTC+1) -> depart 13:15 GMT »
        →  le gel tombe bien à H−2 (11:15 GMT, heure de Paris 13:15)
```

`tools/daily.mjs` transporte maintenant **la zone avec l'heure** (`heureZone` :
`'maroc'` | `'paris'`, `'paris'` par défaut sur une vieille ligne d'archive) et
`departEnGMT()` convertit **une seule fois**, au bon endroit. Les comparaisons se
font en minutes **GMT** (`depart` et `now` dans le même fuseau) : les fenêtres de
snapshot (`−195`, `−135`) et la fenêtre de gel (`−120` … `−10`) sont donc justes.

### 11.33 ⭐ RETOUR À 3-2-1-1-1 — INSTRUCTION DE L'UTILISATEUR (20/10/2026, appliqué)

> **« رجع 3-2-1-1-1 »** — c'est SA méthode, elle ne se discute pas.
> §11.31 (4-2-1-1-0) est **abandonné**.

`GROUPES` dans `src/lib/quinte.js` et `backend/QUINTE/quinte.js` :

```
G1 quota 4 → 3   ·   G2 2   ·   G3 1   ·   G4 1   ·   G5 0 → 1
```

**Toujours 8 chevaux** (3+2+1+1+1), pas 9.
Le choix dans les blocs ne bouge pas (§11.23/§11.32) : G1-G4 `carnet`,
G5 `marche` — le siège de G5 revient donc au marché.

Mesure au moment du retour (`node tools/verif-production.mjs`, 96 Quintés
à presse réelle) :

| quotas | podium | quinté | ≥4 |
|---|---|---|---|
| 4-2-1-1-0 (abandonné) | 47,9 % | 12,5 % | 56,3 % |
| **3-2-1-1-1 (appliqué)** | **38,5 %** | **8,3 %** | **43,8 %** |

Moitiés : 37,5 % / 8,3 % puis 39,6 % / 8,3 %.

Bascule vérifiée : `backend/QUINTE/quinte.js` identique à l'octet,
`npm run build` OK (15,39 s).

> ⚠ **Remplacé le 21/10/2026 — voir §11.37.** Les 8,3 % de quinté entier ci-dessus
> sont les bons : les 11,5 % qu'annonçait `tools/test-quotas.mjs` venaient d'un
> remplissage RÉIMPLÉMENTÉ (sans `computeStats`), pas du vrai moteur.

### 11.34 ⭐ LE CARNET DU JOUEUR — le protocole de preuve (20/10/2026)

`tools/joueur.mjs` : l'utilisateur affirme dépasser 75 % de 5/5 avec 8
chevaux. On ne discute pas, on compte.

```
node tools\joueur.mjs add <date_Rn_Cm> <8 numéros>   ← AVANT le départ
node tools\joueur.mjs liste
node tools\joueur.mjs bilan
```

- Les 8 sont horodatés dans `data/joueur.json` au moment de la saisie.
- La note est lue dans `data/synthese.json` (arrivée réelle) : 5/5, trio, x/5.
- Référence moteur affichée sous le bilan.
- Déjà enregistrés : 14/10 et 19/10 (post-hoc, 2/2) et 20/10 (07:23, avant
  le départ de 13:55).
- Critère : **15/20 (75 %) = la règle entre dans le moteur le jour même** ;
  moins de 12/20 = le moteur ne bouge pas.

---

## 16. 📺 LES LIVES — les hippodromes régionaux d'Equidia (20/10/2026)

> Demande de l'utilisateur : **« واش ممكن تزيدني صفحة Lives en cours
> https://regions.equidia.fr/ »**

Page **`/lives`** (alias `/live`), lien **Lives** dans `src/Entete.jsx`
(couleur `--n-vert`, classe `.p-lives` dans `src/index.css`).

| Fichier | Rôle |
|---|---|
| `frontend/LIVES/Lives.jsx` | la page : liste des réunions + lecteur |
| `backend/LIVES/lives.js` | les appels : `chargerLives`, `fluxHLS`, `normaliser`, `lienEquidia` |

### 16.1 L'API — mesurée, aucun proxy

```
GET https://regions-api.equidia.fr/meetings?fromDate=…&toDate=…&offset=0&limit=50
GET https://regions-api.equidia.fr/live/{fluxUrl}?type=hls     → { url: …m3u8 }
GET https://regions-api.equidia.fr/live/{fluxUrl}?type=player  → player.php (INUTILE, voir 16.3)
```

- `access-control-allow-origin: *` sur l'API **et sur toute la chaîne HLS**
  (playlist, sous-playlist, segment `.ts`) → **aucun proxy**, ni en local ni en
  production. Même code des deux côtés.
- La réunion porte tout : `num`, `startAt`, `finishAt`, `isQuinte`,
  `isQuarte`, `isPmh`, `isCsi`, `isPremium`, `fluxUrl` (`racing1`,
  `racing3`…), `fluxType`, `fluxActive`, `raceCourse.{code,name,slug,place,
  federation, defaultImage}`, `disciplines`.
- **`type`** n'est ni `RACING` ni `racing` : c'est **`hls`** ou `player`
  (lu dans le bundle Angular : `getFluxUrl(flux, useClappr ? 'hls' : 'player')`).
  `type=RACING` répond `400 invalid-param-type`.
- Les adresses de flux portent un **jeton qui expire** → on les redemande à
  chaque lecture et à chaque échec, jamais on ne les garde.

### 16.2 ⚠ LE PIÈGE DU CDN — le `Referer` (le vrai blocage)

hexaglobe refuse tout ce dont le **`Referer`** n'est pas un domaine equidia.
Mesuré sur `racing3` le 20/10/2026 :

| en-têtes envoyés | playlist | segment |
|---|---|---|
| aucun | 200 | 200 |
| `Origin` seul | 200 | — |
| `Referer: https://regions.equidia.fr/` | 200 | — |
| **`Referer: localhost` / `vercel`** | **406** | **406** |

→ Le navigateur envoyait `Referer` + `Origin` ⇒ **406 partout**, flux mort.
**Correctif appliqué** : la page pose une balise
`<meta name="referrer" content="no-referrer">` **au rendu du parent** (via
`useMemo`, donc avant les effets du lecteur) et la **retire en quittant** la
page. Vérifié : après la balise, playlist 200, segments 200, `readyState 4`,
`videoWidth 1920`.

### 16.3 ⚠ L'iframe `player.php` est GÉOBLOQUÉE

`type=player` renvoie `player.php` sur hexaglobe, qui répond :

```
{"status":"ko","msg":"geoblocking error country: MA ip: …"}
```

Le **HLS**, lui, passe depuis le Maroc. Donc : lecteur **hls.js**, jamais
d'iframe. Et **hls.js d'abord** : Chromium répond « maybe » à
`canPlayType('application/vnd.apple.mpegurl')` sans savoir lire le HLS — il
posait un `range: bytes=0-` que le CDN refuse (406). Le natif ne sert que si
`Hls.isSupported()` est faux (Safari).

### 16.4 Ce que la page fait

- liste du jour (date modifiable), triée **en direct → à venir → terminé** ;
- compteur **« N en direct »**, badge par réunion (En direct / À venir /
  Terminé / Sans flux), badges Quinté+ · Quarté+ · Premium · PMH · CSI ;
- **relecture toutes les 60 s** (une réunion bascule « en direct » pendant
  qu'on regarde, et les jetons expirent) ;
- heures **en GMT** (`heureGMT` de `src/temps.js`, règle du site) ;
- lecteur 16:9, muet par défaut, bouton **↻ Réessayer** + lien
  **Equidia Régions ↗**.

⚠ Aucun chiffre ni horaire écrit à la main : tout vient de l'API.

### 11.35 ⭐ RÉSULTAT RÉEL DU 20/10 — 3-2-1-1-1 tient, et pourquoi

> Arrivée **5 · 13 · 14 · 3 · 15** (Clairefontaine R1C1, 2400 m plat).
> Source : `pro.casacourses.com/api/race/pmu-R1C1?date=2026-10-20`
> (`status: PROVISIONAL`, 5 arrivants complets). Écrite dans
> `data/synthese.json` (champ `arrivee` seulement — §13.3-①).

| ticket | chevaux | note | manque |
|---|---|---|---|
| **moteur 3-2-1-1-1** | 2 · 1 · 3 · 5 · 9 · 11 · 13 · 15 | **4/5** | 14 |
| 4-2-1-1-0 (abandonné le matin) | 2 · 1 · 3 · 9 · 11 · 13 · 14 · 15 | **4/5** | 5 |
| le joueur (protocole §11.34) | 8 · 6 · 2 · 10 · 5 · 3 · 9 · 11 | **2/5** | 13 · 14 · 15 |

**Les deux configurations font 4/5, et elles ne perdent pas le même cheval.**
Le retour à 3-2-1-1-1 n'a donc **rien coûté** sur ce quinté :

- il perd **14** (P3, le 4ᵉ de G1 que 4-2-1-1-0 prenait) ;
- il gagne **5** (P14), le siège de G5 — et le **5 a gagné la course** (cote 29).

C'est exactement l'échange mesuré en §11.26 (le siège de G5 vaut moins que le
4ᵉ de G1) : ici les deux se sont compensés au cheval près.

**Le jeu du joueur** : il a retiré 1 · 13 · 15 et ajouté 8 · 6 · 10. Les trois
retirés sont **exactement** les trois qui manquent (13 est 2ᵉ, 15 est 5ᵉ) ;
aucun des trois ajoutés n'arrive. Bilan du protocole : **0/5 sur 1 course
enregistrée avant le départ** (les 2/2 de 14/10 et 19/10 étaient post-hoc).

Trio : moteur **2/3** (5, 13) · joueur 1/3 (5).

### 11.36 ⭐ LA RÈGLE DE NOTATION — sans le trio, la note est 0/5 (20/10/2026)

> Instruction de l'utilisateur : **« الى ماكاينش صاحب المركز التالت والتاني
> والاول معا في التذكرة فتعتبر التذكرة 0/5 »**.

Un ticket qui ne contient pas **les trois premiers ensemble** vaut **zéro**,
même avec 4 chevaux sur 5. C'est cohérent avec le paiement : sans le trio, le
Quinté n'est pas payable.

```
note = 5/5  si les 5 arrivants sont dans le ticket   (⇒ le trio y est forcément)
note = 0/5  dès qu'un des trois premiers manque
```

**Conséquences appliquées :**

- `tools/joueur.mjs` : `note = trio === 3 ? pris : 0`. Le brut (4/5) reste
  affiché à côté pour la lecture, mais **n'entre dans aucun pourcentage**.
- La métrique **« ≥4 du quinté » est retirée** de la notation : elle valait
  0 de toute façon. Restent **5/5** (le seul qui paie) et **trio entier**
  (la condition d'accès).
- Relecture du 20/10 sous la règle : moteur **0/5** (le trio manquait de 14),
  joueur **0/5**. Les deux 4/5 de §11.35 ne valent plus rien.

**Le chiffre du moteur ne change pas** — 5/5 l'impliquait déjà :
11,4 % sur 114 Quintés (12,5 % sur les 96 à presse réelle). Ce qui change,
c'est ce qu'on regarde : **4-2-1-1-0 et 3-2-1-1-1 ne se départagent plus par
le podium (48,2 % contre 37,7 %) mais par le 5/5 (12,5 % contre 8,3 %)**.

---

### 15.9 ⭐ L'EMPREINTE DU TRIO — la page `/coply` (20/10/2026)

> Demande de l'utilisateur : **« دابا بغيت بصمة حقيقية للتريو في هذه الصفحة
> Coply — الامر يختلف عن سباقات الكانتي لان الاول والتاني يربح والتاني والتالت
> يربح والاول والتالت يربح »**.

Le Trio n'est **pas** un quinté réduit aux trois premières places. Avec
**3 numéros on joue 3 paires** :

| niveau | condition | ce que ça paie |
|---|---|---|
| **couplé gagnant** | (1er, 2e) dans mes 3 | la paire exacte des deux premiers |
| **couplé placé** | **2 des 3** dans le top 3 | n'importe laquelle des 3 paires |
| **trio** | les 3 dans le top 3 | les trois, dans n'importe quel ordre |

L'empreinte doit donc mesurer **les trois niveaux**, pas « qui arrive ». C'est
pourquoi les tableaux ont trois colonnes et non une.

#### Les deux corpus

| corpus | source | n | pourquoi |
|---|---|---|---|
| **marché** | `data/corpus/fusion.json` (`ordreCote`) | **347** | c'est la lecture **applicable sur /coply** : la page a les cotes, pas la presse |
| **carnet** | `data/quintes.json` (vrai `buildGrid`) | **96** | la référence de la méthode (§11.13) — jamais `fusion.json` pour les cases (§11.23) |

- **marché** : Z1 = rangs 1-3 · Z2 = 4-8 · Z3 = 9+
- **carnet** : G1 = P1-P4 · G2 = P5-P8 · G3 = P9-P10 · G4 = P11-P12 · G5 = P13+

#### ① La forme des 3 premiers

| marché | % | carnet | % |
|---|---|---|---|
| **1·1·1** | **24,5 %** | **2·1·0·0·0** | **26,0 %** |
| 1·2·0 | 19,9 % | 1·1·1·0·0 | 12,5 % |
| 2·1·0 | 18,4 % | 1·1·0·1·0 | 9,4 % |
| 2·0·1 | 11,5 % | 2·0·0·0·1 | 7,3 % |
| 0·2·1 | 9,8 % | 3·0·0·0·0 | 7,3 % |
| 1·0·2 | 5,2 % | 1·1·0·0·1 | 6,3 % |

- moyenne **marché** : Z1 **1,19** · Z2 **1,14** · Z3 **0,67**
- moyenne **carnet** : G1 **1,50** · G2 **0,78** · G3 **0,25** · G4 **0,27** · G5 **0,20**

> ⚠ **Les trois favoris (`3·0·0`) ne font que 3,2 %.** Le trio dominant n'est
> pas « le haut du marché » : c'est **un de chaque zone** (`1·1·1`, 24,5 %).

#### ② Les 3 paires — d'où viennent les paires qui paient

| marché | % | carnet | % |
|---|---|---|---|
| **Z1-Z2** | **33,7 %** | **G1-G2** | **30,9 %** |
| Z1-Z3 | 19,3 % | G1-G1 | 22,2 % |
| Z2-Z3 | 17,2 % | G1-G4 | 9,4 % |
| Z1-Z1 | 13,2 % | G1-G3 | 8,0 % |
| Z2-Z2 | 12,5 % | G1-G5 | 7,3 % |
| Z3-Z3 | 4,1 % | G2-G3 | 4,9 % |

Une paire payante **touche presque toujours Z1** (Z1-Z2 + Z1-Z3 + Z1-Z1 =
**66,2 %**) ; **deux chevaux hors du top 3 du marché** (Z2-Z2, Z3-Z3, Z2-Z3) =
33,8 %. Le carnet dit la même chose : **G1-G2 = 30,9 %**, et G1 apparaît dans
4 des 6 premières lignes.

#### ③ Ce que paient vraiment 3 numéros

| règle | trio | couplé ≥2 | gagnant | moitiés (≥2) |
|---|---|---|---|---|
| **marché top-3** | 3,2 % | **33,1 %** | 17,6 % | 34,1 / 32,2 |
| marché 1·2·4 | 1,7 % | 32,6 % | 13,8 % | 35,3 / 29,9 |
| marché 1·3·5 | 1,7 % | 26,2 % | 11,5 % | 29,5 / 23,0 |
| **presse P1·P2·P3** (96) | **5,2 %** | **38,5 %** | 15,6 % | 37,5 / 39,6 |
| presse P1·P2·P4 (96) | 1,0 % | 34,4 % | **17,7 %** | 35,4 / 33,3 |
| presse P1·P5·P9 (96) | 2,1 % | 14,6 % | 7,3 % | 10,4 / 18,8 |
| **le hasard (3 au sort)** | **0,2 %** | **8,4 %** | 0,2 % | — |

- **le carnet bat le marché à 3 numéros** : 38,5 % contre 33,1 % (≥2), et c'est
  stable sur les deux moitiés (37,5 / 39,6). Pour le trio : 5,2 % contre 3,2 %.
- le hasard est à 8,4 % → les trois premiers du carnet valent **4,6×** le hasard
  sur le couplé placé, **26×** sur le trio.
- **le couplé gagnant est ~2× plus rare que le couplé placé** (17,6 % contre
  33,1 %) : c'est le prix des 3 paires.

#### ④ Combien de numéros (top-k du marché)

| k | trio | couplé ≥2 | gagnant | paires à jouer |
|---|---|---|---|---|
| 3 | 3,2 % | 33,1 % | 17,6 % | 3 |
| 4 | 7,8 % | 50,7 % | 28,2 % | 6 |
| 5 | 16,1 % | 67,7 % | 39,2 % | 10 |
| 6 | 27,1 % | 75,8 % | 48,7 % | 15 |
| 8 | 44,1 % | 89,9 % | 65,7 % | 28 |

Le trio entier tombe dans les k premiers du marché : 4 → 7,8 % · 5 → 16,1 % ·
6 → 27,1 % · 8 → 44,1 % · 10 → 66,9 % · 12 → 84,4 %.
(carnet : 4 → 7,3 % · 8 → 39,6 % · 12 → 81,3 %.)

#### Ce qui est affiché sur `/coply`

| où | quoi |
|---|---|
| panneau **Empreinte du Trio** (bas de page) | ① la forme · ② les 3 paires · ③ les 3 numéros · ④ combien de numéros |
| sous la **Sélection** | `profil 3·0·0 · rangs marché 1 · 2 · 3 · cette forme = 3,2 % des trios` |

- Le profil n'est calculé que si **≥ 80 % des partants ont une cote** ; sinon la
  page écrit `profil indisponible — cotes incomplètes (13/16)`. Un rang faux
  serait pire que pas de rang.
- Quand le jeu **est** exactement le top-k du marché, la ligne ajoute sa note
  mesurée (`= top-3 marché : trio 3,2 % · couplé ≥2 33,1 %`). Avec des cotes
  incomplètes, cette mention est supprimée.
- **La sélection du modèle n'est pas modifiée** : on affiche sa forme, on ne la
  change pas (l'utilisateur a demandé la mesure, pas le remplacement).

#### Les fichiers

| fichier | rôle |
|---|---|
| `tools/empreinte-trio.mjs` | la mesure → `data/trio-empreinte.json` + `public/data/trio-empreinte.json` |
| `frontend/COUPLE/Couple.jsx` | `EmpreinteTrio` (le panneau) + le profil sous la Sélection |
| `data/trio-empreinte.json` | l'artefact publié — **aucun chiffre saisi dans la page** |

⚠ Mesure seule : elle **n'entre pas** dans le ticket du Quinté (quotas 3-2-1-1-1
fermés, §11.16).

---

### 15.10 🚫 « هادي راه ماشي بصمة » — le panneau à 4 tableaux est REFUSÉ (20/10/2026)

> Réaction de l'utilisateur au §15.9 livré :
> **« هادي راه ماشي بصمة هادي راه تخربيقة »**.

**Ce qui était faux :** le panneau montrait **quatre tableaux** (forme · paires ·
règles · top-k), deux corpus mêlés (marché 347 + carnet 96), et une ligne de
profil sous la Sélection. Ce n'était pas une empreinte : c'était un dossier de
mesures. Le mot « تخربيقة » est le **même** que celui du §15.3 (« عطي غير
تلاتة الارقام فقط هادشي راه غير تخربيق ») — la leçon est claire :

> **Une empreinte = UN objet. Le même que celui validé au §15.8 pour le podium
> et le quinté : motif + n + % + barre, la moyenne par groupe, les empreintes
> exactes, « N distinctes · la plus fréquente ».**

#### Ce qui est affiché maintenant, et rien d'autre

| bloc | contenu |
|---|---|
| **① Le motif** | G1·G2·G3·G4·G5 des 3 premiers · n · % · **barre** · moyenne par course · nb de motifs |
| **② L'empreinte** | la case exacte triée (`1-2-4`) · n · % · **barre** · *N distinctes · la plus fréquente* · « 1-2-4 = 1-2 · 1-4 · 2-4 » |
| une ligne | les 3 paires par bloc (G1-G2 30,9 % · G1-G1 22,2 % …) |
| une ligne | le trio entier dans P1..Pk (4 → 7,3 % · 8 → 39,6 % · 12 → 81,3 %) |

- **Un seul corpus : le carnet (96 Quintés à presse réelle)** — le même P que la
  grille, la même langue que la méthode. Le marché sort de ce panneau.
- **La ligne de profil sous la Sélection est retirée** : elle mélangeait rang de
  marché et fréquence de carnet, deux choses qui ne se parlent pas.
- `tools/empreinte-trio.mjs` réécrit dans la forme du §15.8 →
  **`data/empreinte-trio.json`** (l'ancien `trio-empreinte.json` est supprimé).
- Le Trio se lit **en 3 paires** : l'empreinte `1-2-4` donne `1-2 · 1-4 · 2-4`,
  c'est-à-dire exactement ce que paie le couplé — la remarque de l'utilisateur
  (« الاول والتاني يربح والتاني والتالت يربح ») est portée par la ligne sous
  le tableau, pas par un tableau de plus.

#### ✅ ② = LES 3 PAIRES, chacune avec son % (20/10/2026)

Instruction : **« 1-2 · 1-4 · 2-4 كل واحد بنسبتو »**. La case exacte (`1-2-4`)
sort de l'affichage ; à sa place, **les paires de cases, une par ligne** :

| paire | n | % des courses |
|---|---|---|
| **1-2** | 14 | **14,6 %** |
| **1-5** | 14 | **14,6 %** |
| 1-3 | 13 | 13,5 % |
| 1-4 | 13 | 13,5 % |
| **2-4** | 12 | **12,5 %** |
| 1-6 | 9 | 9,4 % |
| 1-7 | 8 | 8,3 % |
| 1-8 · 2-3 · 2-5 · 3-9 | 7 | 7,3 % |

- **Définition du %** (écrite sous le tableau) : *si je joue ces deux cases, le
  couplé paie dans X % des courses*. C'est un choix de **paire**, pas un rang.
- **86 paires distinctes** sur 96 courses ; la plus fréquente `1-2` = 14,6 %.
  La distribution est **plate** : 5 paires entre 12,5 et 14,6 %, aucune ne
  domine — le trio se gagne sur **plusieurs paires**, pas sur une.
- `pairesCases` = la liste des paires ; `paires` (par bloc : G1-G2 30,9 %,
  G1-G1 22,2 %) reste affichée en **une ligne** sous le tableau.
- La dernière ligne donne **les deux niveaux** : `P1..Pk — couplé ≥ 2 / trio` :
  P4 52,1 / 7,3 · P6 75 / 26 · P8 90,6 / 39,6 · P10 95,8 / 57,3 · P12 99 / 81,3.
  → le couplé sature à **P1..P8 (90,6 %)**, le trio non (39,6 %).

---

## 16. 🗄️ L'ARCHIVE DES PARTANTS — `public/data/reu` (20/10/2026)

> Question de l'utilisateur : **« لماذا السباقات الماضية تعطي ⚠ Aucune source de
> partants disponible (Equidia + fallbacks) »**.

### 16.1 La cause, exacte

`api/couple.js` ne lit **jamais** Equidia en direct pour une date passée :

```
cDate < aujourd'hui  →  partants = archive SEULEMENT
                        (le direct serait post-course : arrivée + musiques
                         incluant la course → hindsight)
```

Si `public/data/reu/{date}_R{n}_C{m}_{pays}.json` n'existe pas → `partants`
vide → `throw new Error('Aucune source de partants disponible …')`.

Or l'archive s'arrêtait au **13/10/2026** :

| | |
|---|---|
| Dernier fichier de course | **13/10/2026** |
| Cause | `tools/archive-reu.mjs` appelait `chargerProgrammeReu()` — **fonction jamais importée** → `ReferenceError` au premier jour sans `prog-*.json` local |
| Aggravant | **aucune tâche planifiée** ne lançait le collecteur (la seule tâche « archive » pointait sur `C:\turf\bahja-pmu`) |

→ toute course du **14/10 au 20/10** répondait l'erreur. Le Quinté (R1C1)
marchait encore le jour même, parce que `cDate == aujourd'hui` autorise le direct.

### 16.2 Les trois correctifs

1. **Le collecteur réparé** : `chargerProgrammeEquidia(date)` (même parseur que
   la page) + repli `chargerProgrammeCasacourses(date)` — Equidia ne sert
   `/courses/{date}` que le jour même, casacourses liste encore le passé.
2. **Le trou rebouché** : 14 → 20/10 collectés (**442 courses**).
3. **La tâche planifiée** : `Bahja Archives` → `tools\archives-daily.bat`,
   tous les jours à **09:30**, journal dans `data/archives.log`.

### 16.3 Le drapeau d'honnêteté

Tout fichier collecté **après** la course porte `collecteApresCourse: true`
(arrivée déjà connue → cotes et musiques d'après). 1 230 fichiers sur 1 982.
→ une « sélection » recalculée sur ces fichiers **n'est pas une prédiction**.

### 16.4 Utilisation

```
node tools\archive-reu.mjs 2026-10-14              (un jour)
node tools\archive-reu.mjs 2026-10-14 2026-10-15   (plusieurs jours)
tools\archives-daily.bat                           (le jour, comme la tâche)
```


---

## 17. 💶 LE COUPLÉ EN EUROS — la réponse chiffrée (20/10/2026)

> Question de l'utilisateur : **« واش دابا قاديتي شي خوارزمية تعطينا الكوبلي بنسبة
> مزيانة ولا غير الهضرة »**.

Outil : **`node tools/couple-euros.mjs`** — 1 € par paire, **vrais rapports**
`JUMELE_PLACE` / `JUMELE_GAGNANT` de `data/quintes.json` (272 Quintés avec
dividendes). On ne compte pas « combien de fois », on compte **ce qui rentre**.

| règle | n | couplé placé | ROI placé | couplé gagnant | ROI gagnant |
|---|---|---|---|---|---|
| **carnet top-3** (P1·P2·P3) | 93 | **37,6 %** | **+2,4 %** | 15,1 % | −27,0 % |
| marché top-3 | 272 | 34,6 % | −21,0 % | 18,0 % | −8,6 % |
| carnet top-4 | 93 | 54,8 % | −10,0 % | 29,0 % | −9,6 % |
| marché top-4 | 272 | 52,6 % | −25,8 % | 29,0 % | −12,8 % |
| carnet top-5 | 93 | 63,4 % | −24,4 % | 38,7 % | −26,4 % |
| marché top-5 | 272 | 69,1 % | −16,7 % | 39,3 % | −8,3 % |
| le hasard (8,4 %) | — | 8,4 % | — | 0,2 % | — |

**carnet top-3** : mise **279 €** → retour **286 €** sur 93 Quintés
(médiane par course **−3 €**, c'est-à-dire : on perd ses 3 € les 2/3 du temps
et on touche 16 à 26 € quand ça passe).

### 17.1 Ce que ça dit — et ce que ça ne dit pas

1. **Ce n'est pas de la parole** : 37,6 % de couplé placé avec 3 numéros,
   contre **8,4 % au hasard** = **4,5 ×** le hasard, sur rapports réels.
2. **Mais ce n'est pas une machine à argent** : +2,4 % = l'équilibre, dans le
   bruit d'un échantillon de 93 courses. Moitié 1 : −0,6 % · moitié 2 : +5,4 %.
3. **Le marché perd** (−21,0 %) là où le carnet est à l'équilibre : l'écart ne
   vient pas du hasard, il vient de l'ordre de la presse.
4. **Le couplé gagnant perd toujours** (−8 à −31 %) : c'est le placé qui paie,
   parce que 3 numéros = **3 paires** et qu'une seule suffit.
5. ⚠ **Le carnet n'existe que pour le Quinté** — c'est la seule course dont la
   presse publie l'ordre (P1..P20). Sur toutes les autres courses de `/coply`
   (R1C2, R2C1, R3C3…), il ne reste que le marché : **34,6 % et −21 %**.

### 17.2 La seule amélioration mesurée, à appliquer

Sur la course du Quinté, remplacer le choix du marché par **P1·P2·P3** :
**34,6 % → 37,6 %** de couplé placé, ROI **−21 % → +2,4 %**.
Ailleurs (pas de presse), rien à changer — le marché est tout ce qu'on a.


---

## 18. ⭐ LA MARQUE SUR LE LIVE — le logo de la chaîne est dans le flux (20/10/2026)

> Demande de l'utilisateur : **« هل يمكن تعويض او اخفاء شعار القناة بلوغو موقعنا او اسمه »**
> (captures : le banneau « EQUIDIA RACING » plein cadre au démarrage, et le petit
> logo de la chaîne en haut à droite pendant la course).

### 18.1 Le fait : ces deux marques sont PIXELISÉES

Le flux est un **HLS d'éditeur** : le banneau d'ouverture et le logo de la
chaîne sont **dans les images** du flux. Aucun lecteur, aucun CSS, aucune
watermark du site ne peut les **retirer** — on peut seulement les **couvrir**.

### 18.2 Ce qui est fait (`frontend/LIVES/Lives.jsx`, composant `Lecteur`)

| | quoi | comment |
|---|---|---|
| ① **le voile de marque** | ⛔ **SUPPRIMÉ le 21/10/2026** — voir §18.3 | — |
| ② **le bandeau de marque** | un bandeau **opaque** de 250×56 px en haut à droite, dégradé vers la droite, avec le badge « B · Bahja TURF » | masque le logo de la chaîne **quelle que soit sa position exacte** dans l'image (on ne peut pas mesurer le pixel : le flux est variable) |

- Le badge a `pointerEvents: none` → il ne gêne pas les commandes du lecteur.
- Le bandeau est en `position: absolute` **par-dessus** le `<video>`, `zIndex` 12 ;
  l'état d'erreur est passé à 13 pour rester visible.
- ⚠ Rappel : cette marque appartient à l'éditeur du flux. La couvrir est une
  question de présentation, pas de technique — à vérifier avec les conditions
  d'utilisation d'Equidia / Le Trot avant publication.

### 18.3 ⛔ LE VOILE PLEIN ÉCRAN A ÉTÉ RETIRÉ (21/10/2026)

> Instruction de l'utilisateur : **« هاد الصورة حيدها كاتعيقني فالمشاهدة في كل
> مرة تضهر اتناء البت »** — la capture montrait le plein écran vert
> « BAHJA TURF · R2 · LYON · CARRE DE SOIE · EN DIRECT ».

- Cause : le voile se posait sur `playing` **7 secondes**, et **se reposait à
  chaque reprise de lecture** après une pause → il revenait pendant le pari.
- Retiré : l'état `voile`, l'effet ③ de 7 s, et le bloc de rendu. La string
  `radial-gradient(120% 120% at 50% 40%…)` a disparu du bundle.
- **Conservé** : le bandeau 250×56 en haut à droite (choix de l'utilisateur,
  « خليه »).
- L'effet `playing` / `pause` / `ended` reste, mais il ne pilote plus que
  l'état `joue` (le volet « ▶ Lire » disparaît dès que le flux démarre).



---

## 19. ⭐ LE DIRECT DE LETROT — dans la page `/lives` (20/10/2026)

> Demande de l'utilisateur : **« الم تجد طريقة لجعلها تعمل داخل موقعنا »** —
> le live de letrot.com doit jouer DANS la page, pas dans un onglet à côté.

### 19.1 Pourquoi ce n'était pas un iframe

| | |
|---|---|
| `www.letrot.com` | renvoie **`X-Frame-Options: SAMEORIGIN`** → l'intégration refusée |
| `/v1/api/videos/*` | **aucun en-tête CORS** → le navigateur ne peut pas l'appeler |
| `player_v3.php` (hexaglobe) | page HTML, **sans CORS** non plus |

### 19.2 La chaîne mesurée (4 étapes)

```
1. GET https://www.letrot.com/v1/api/videos/meeting
     → [{ meetingNumber, time, videoUrl, hippodrome: { place, label,
         meeting: { totalRaces, status, races: [...] } } }]
2. GET <videoUrl>   (player_v3.php)
     → HTML qui contient  UrlStreamInfo: '…/stream_info.php'
3. GET <stream_info.php>
     → { status:"LIVE", protocol:"HLS",
         stream_url_pri:"https://…-cdn.hexaglobe.net/…/playlist.m3u8",
         stream_url_bkp:"…" }
4. le .m3u8 est lu DIRECTEMENT par hls.js dans la page
     → `access-control-allow-origin` = l'origine du navigateur (mesuré) ;
     → et surtout : PAS de lecteur hexaglobe → PAS de logo « occultation »
       (img/trot.svg) posé par-dessus l'image.
```

### 19.3 Les fichiers

| fichier | rôle |
|---|---|
| `api/lt-live.js` | **la fonction** : lit l'API de letrot, résout le .m3u8, rend du JSON. `?flux=4` = la réunion 4 · `?flux=0` = le multiplex (toutes régions) |
| `vite.config.js` | en dev, `/api/lt-live` appelle la MÊME fonction (`ssrLoadModule`) — local et en ligne, même code |
| `backend/LIVES/letrot.js` | côté navigateur : `chargerLivesLetrot()` · `fluxLetrot(num)` |
| `frontend/LIVES/Lives.jsx` | la section « Le Trot — le direct » + le lecteur (le `Lecteur` accepte maintenant `urlDirecte`) |

- Les adresses de flux portent un jeton qui expire → on les redemande à chaque
  changement de réunion et à chaque relire (60 s).
- Le pied du lecteur affiche « Le Trot ↗ » (le lien externe) au lieu d'
  « Equidia Régions ↗ ».

### 19.4 ⚠ LA PUBLICATION EST BLOQUÉE — le jeton Vercel ne marche plus

`node tools/deploy.mjs` échoue depuis **le 15/10** (`data/daily.log` :
« deploy ECHEC (code 1) » tous les jours) → **le site en ligne est périmé
depuis le 15/10**.

```
Not authorized: Trying to access resource under scope "woorckflow-4697".
You must re-authenticate to this scope or use a token with access to this scope.
   → "saml": true   (le compte est passé en SAML/SSO)
```

- `GET /v2/user` marche encore (le jeton est lu) mais `GET /v9/projects` est
  refusé → **il faut un jeton neuf** :
  Vercel → *Account Settings → Tokens → Create* (scope : l'équipe `woorckflow-4697`)
  puis le mettre dans `.deploy-env` : `VERCEL_TOKEN=vcp_…`
- Ensuite : `node tools\deploy.mjs` (build + deploy + vérification).
- ⚠ Ne pas supprimer `.vercel/` : il porte le lien vers le projet
  (`prj_FZFNbBzmLKfzQeAfNa6SNjXt3q2q`, équipe `team_hNLmwUkmGtwVFYfSED5UMvpr`).


---

## 19.5 ⛔ SUPPRIMÉ le 20/10/2026 — le direct de Le Trot ne tourne pas dans la page

> Le live de Le Trot **ne jouait pas de façon fiable** dans le navigateur
> (autoplay bloqué, segments qui s'arrêtent, voile qui restait). L'utilisateur
> a demandé : « اذا لم تستطع تشغيله داخل تطبيقنا احدفه ».

- **La section in-page est retirée** de `frontend/LIVES/Lives.jsx` (plus de
  `Lecteur` pour Le Trot, plus d'état `trot*`, plus de `urlDirecte`).
- **`api/lt-live.js` et `backend/LIVES/letrot.js` supprimés** — la chaîne
  mesurée (4 étapes) reste documentée dans §19.1-19.2 au cas où on la
  réutilise un jour.
- **Ce qui reste** : la carte « **Autres directs** » avec le lien
  `https://www.letrot.com/videos ↗` (ouvre un nouvel onglet) — c'est le seul
  moyen fiable de voir le live du trot.
- Le badge top-droite reste pour les lives d'Equidia Régions (le voile plein écran a été retiré, voir §18.3).


---

## 21. ⚠️ LE SITE SE PUBLIE PAR GIT — un push de DONNÉES redéploie le CODE (21/10/2026)

> Incident du 21/10/2026 : l'utilisateur signale **« صفحة البت المباشر لم تعد
> موجودة »** — `/lives` avait disparu de https://bahja-turf.vercel.app.

### 21.1 Ce qui s'est passé

Le projet Vercel `prj_FZFNbBzmLKfzQeAfNa6SNjXt3q2q` est **relié au dépôt
GitHub `LBAHJA-SA/bahja-turf`, branche `main`** (`source: "git"` dans l'API
Vercel). Chaque `git push` sur `main` déclenche un **build complet** du dépôt,
qui prend la place de la production.

Or :

| | |
|---|---|
| dernier commit de **code** | **18/10/2026** (« toutes les heures du site passent en GMT ») |
| travail local | 3 jours de code **non commité** (Lives, Coply/Trio, parseur, moteur) |
| `tools/publier-archive.mjs` | commit **les données seules** puis `git push main` |
| résultat | chaque push de données reconstruit le site **avec le code du 18/10** → `/lives` n'existe plus |

`vercel deploy --prod` (CLI) publiait bien le bon build, mais le **push de
données suivant (09:54) l'a écrasé** — d'où l'impression d'un site qui « perd »
des pages.

### 21.2 La règle

> **Le dépôt est la source de vérité du site.** Après tout changement de code
> (`src/`, `frontend/`, `backend/`, `api/`, `tools/`), il faut **commiter et
> pousser**, sinon le prochain push de données republiera l'ancien site.

```
git add -A -- src frontend backend api tools AGENTS.md index.html package.json vite.config.js vercel.json
git commit -m "app : …"
git push origin main          # Vercel reconstruit et remplace la production
```

`node tools/deploy.mjs --check` **ne suffit pas** : il compare l'empreinte des
sources locales au dernier déploiement enregistré dans `data/deploy.json`, pas
au dépôt. Il peut dire « a jour : OUI » alors que la production vient d'être
remplacée par un build git plus ancien.

### 21.3 Comment vérifier que le bon build est en ligne

```
fetch('https://bahja-turf.vercel.app/')     → hash du bundle dans index.html
fetch('…/assets/index-<hash>.js')           → doit contenir '/lives'
```

Le 21/10 : `C44CWptn` (ancien, sans `/lives`) → après le push, `i8fqLx4Y`
(identique au build local) avec `/lives` présent.

### 21.4 ⚠️ Les URLs de déploiement sont protégées

`https://bahja-turf-xxxxxxxx-woorckflow-4697.vercel.app` renvoie la **page de
protection Vercel** (≈ 332 Ko de HTML sans `assets/index-…`). Seul l'alias
`bahja-turf.vercel.app` est public : c'est **lui** qu'on sonde.

---

### 11.37 ⭐ 4-3-1-1-0 — LE SIÈGE VA AU 4ᵉ DE G1 (21/10/2026, décision de l'utilisateur, appliqué)

> L'utilisateur : **« المشكل هو عدم القدرة على الانتقاء الجيد »** — 8 chevaux
> suffisent, ce qui manque c'est l'aptitude à bien choisir.
> Puis : **« 4-3-1-1-0 · 9 خيول »** (son choix, entre trois options chiffrées).

#### ① Ce que la mesure a montré — le siège était au mauvais bloc

96 Quintés à presse réelle, `data/quintes.json`. Fréquence d'arrivée **dans les 5**
de chaque cheval coupé par la grille d'alors (3-2-1-1-1) :

| le cheval qu'un quota de plus aurait fait entrer | arrive top-5 | arrive top-3 |
|---|---|---|
| **4ᵉ de G1** (P4) — **on le jetait** | **36,5 %** | **21,9 %** |
| 4ᵉ de G2 (P8) | 26,0 % | 11,5 % |
| 2ᵉ de G3 (P10) | 26,0 % | 8,3 % |
| 2ᵉ de G4 (P12) | 18,9 % | 12,6 % |
| 1ᵉʳ de G5 (P13) — **il avait un siège** | 12,5 % | 6,3 % |

La grille donnait donc **trois sièges** (G3 · G4 · G5) à des chevaux qui arrivent
**moins souvent** que le seul qu'elle écartait. Ce n'était pas un problème de
choix **dans** le bloc (fermé, §11.24), c'était un problème de **place attribuée**.

#### ② Le test — le VRAI moteur, 8→9 chevaux, rien d'autre ne change

`tools/test-apparie.mjs` : le vrai `buildGrid` + le vrai `remplirGrille` +
`computeStats` en leave-one-out. Même corpus, mêmes cotes, même règle de choix.

| répartition | chevaux | podium entier | quinté entier | ≥4 |
|---|---|---|---|---|
| 3-2-1-1-1 (le moteur d'avant) | 8,00 | 38,5 % (37/96) | 8,3 % (8/96) | 43,8 % |
| 4-2-1-1-0 | 8,00 | 47,9 % (46/96) | 12,5 % (12/96) | 56,3 % |
| 4-2-1-1-1 | 9,00 | 52,1 % (50/96) | 16,7 % (16/96) | 63,5 % |
| **4-3-1-1-0 (retenu)** | **9,00** | **57,3 % (55/96)** | **22,9 % (22/96)** | **72,9 %** |

Bootstrap apparié 10 000 tirages, 4-3-1-1-0 contre 3-2-1-1-1 :

```
podium entier   100,0 % mieux   (pire 0,0 %)   écart par course +0,188  IC90 [0,115 ; 0,271]
quinté entier   100,0 % mieux   (pire 0,0 %)   écart par course +0,146  IC90 [0,083 ; 0,219]
arrivants du top 5 trouvés                     écart par course +0,584  IC90 [0,448 ; 0,719]
```

Les trois intervalles **excluent 0**. Moitiés : 58,3 % / 25,0 % puis 56,3 % / 20,8 %.

#### ③ ⚠ L'erreur d'instrument qui a coûté cinq jours

`tools/test-quotas.mjs` — l'outil sur lequel **§11.26** a été décidé — n'appelle
**pas** le moteur : il **réimplémente** le remplissage (sa propre fonction
`remplir()`), sans `computeStats`. Il annonçait **11,5 %** de quinté entier pour
3-2-1-1-1 quand le vrai `remplirGrille` en donne **8,3 %**. Trois outils qui, eux,
appellent le moteur (`verif-production` · `egaler` · `bloc-pm`) donnent 38,5 / 8,3
— c'est la valeur retenue.

> **La leçon est celle de §11.24, retournée contre nous :** une mesure sur 96
> courses ne vaut que si l'outil rejoue **le** moteur. `tools/test-apparie.mjs`
> et `tools/verif-production.mjs` sont désormais les deux références.

#### ④ Ce qui a été appliqué

`GROUPES` dans `src/lib/quinte.js` **et** `backend/QUINTE/quinte.js` (copie
byte-identique, sha `75BB928EAC71`) :

```
G1 quota 3 → 4   ·   G2 2 → 3   ·   G3 1   ·   G4 1   ·   G5 1 → 0
```

- **G5 n'a plus de siège** → le marché n'y décide plus rien ; toutes les boîtes
  se remplissent au **carnet**, la règle de choix §11.23/§11.32 est inchangée.
- **9 chevaux** — décision assumée : ce n'est pas une dilution, c'est le siège
  qui change de bloc (§11.29 : 4-3-1-1-0 était déjà le meilleur des 9).
- Sortie du moteur (`node tools/verif-production.mjs`) :
  `quotas lus dans GROUPES : 4-3-1-1-0` · `longueur du ticket : 9 chevaux × 96`.
- `data/fiabilite.json` + `public/data/fiabilite.json` réécrits
  (`node tools/fiabilite.mjs`) : **PAYANTE 57,3 % · 5/5 22,9 % · 9 chevaux**.
- `data/bloc-pm.json` + `public/data/bloc-pm.json` réécrits (`node tools/bloc-pm.mjs`) :
  aucune règle de remplissage ne bat plus la production (carnet partout ≡
  production, le marché perd 2,5 points de quinté).
- Textes de la page (`QuinteGrille.jsx`) : les 7 mentions de `4-2-1-1-0` / « 8
  chevaux » passent à `4-3-1-1-0` / « 9 chevaux » ; la courbe d'empreinte
  surligne **k = 9**.

**Ce qui ne bouge pas :** les cinq BOÎTES (P1-P4 · P5-P8 · P9-P10 · P11-P12 ·
P13+) et la règle de choix dans le bloc. Seul le REMPLISSAGE des quotas change,
et seulement parce que G5 n'a plus de siège.

---

### 11.38 ⭐ LE COUPLÉ EN EUROS — LE MARCHÉ NE PAIE PAS (21/10/2026)

> L'utilisateur : « السوق بوحدو ماخدانش بمرة … لو كان الطوب 3 ديال السوق
> كايربح لو تم اعلاق شركات الرهان » · « البصمة ديال الكوبلي مجتمع عمرها
> ماكاتعطي نتيجة ايجابية » · puis « سباق اليوم ليس معيار لانه اتى باربع
> ارقام الاوائل وهذا يحدث نادرا ».

#### ① Le moteur du /coply n'est pas un moteur : c'est la cote

`tools/coply-verif.mjs` applique LE VRAI `selectionCoply` (module importé tel
quel, `fetch` remplacé par la lecture du modèle local) sur les 400 dernières
courses de l'archive :

```
le moteur            50,3 % (≥2/3)   8,3 % (3/3)
le marché            49,5 %          8,0 %
→ mêmes 3 numéros     89,2 % des courses
```

Sur 600 courses **jamais vues** (train = tout le reste, `tools/coply-regles.mjs`) :
**moteur 51,3 % / 8,2 % · marché 51,2 % / 8,4 %**. Les « 51,50 % » annoncés
jusqu'ici étaient **in-sample** (les 200 courses de validation étaient DANS la
fenêtre d'entraînement) — corrigé dans `tools/train-coply.mjs`, qui exporte
désormais ses briques et valide en causal.

Huit autres règles, hors échantillon, toutes ≤ au marché : forme seule 35,1 % ·
marché sans le favori 35,9 % · 1er + 2 formes 49,0 % · deux réentraînements
51,0-51,2 %. La grille `a × rang de cote + b × rang de forme` choisit **b = 0**
sur le train : la forme n'ajoute rien à la cote. Deux champs étaient morts
(`gains` alors que l'archive donne `gain` ; `corde` alors que la page donne
`depart`) — corrigés, effet nul.

#### ② En euros, l'utilisateur a raison

`tools/coply-trio-euros.mjs` — 94 Quintés, **1 € par course**, 1 seul trio,
encaissé au vrai rapport `TIERCE_ORDRE / Désordre` :

| règle (3 numéros) | touchés | retour | ROI | sans le plus gros gain |
|---|---|---|---|---|
| marché top-3 (les 3 favoris) | 3,2 % | 25 € | **−73,7 %** | −87,6 % |
| carnet P1·P2·P3 | 4,3 % | 42 € | −55,9 % | −81,4 % |
| marché rangs 4-5-6 | 2,1 % | 67 € | −28,7 % | −70,5 % |
| **P1·P2 + 1er du marché hors carnet 2** | **4,7 %** | **79 €** | **−14,0 %** | −48,2 % |

**Ce que paie le trio, par place dans le marché :**

```
les 3 favoris (rangs 1-3)   →  rapport moyen    8 €   (médian 8 €)
rangs 4-8                   →  rapport moyen   80 €
rangs 9-14                  →  rapport moyen  497 €
```

→ Gagner avec les 3 favoris rapporte **8 €**. C'est exactement ce que
l'utilisateur a dit : les bookmakers ne risquent rien.

**Le balayage de toutes les fenêtres de 3 rangs** (marché et carnet, rangs 1-3
à 10-12) ne donne **aucune ligne positive** :

```
marché  1-3 −73 %   4-6 −27 %   tout le reste : 0 touche / 92
carnet  1-3 −55 %   2-4 −88 %   tout le reste : 0 touche / 92
```

Sous le rang 4, on ne touche **jamais**. **À 3 numéros, le trio est une
loterie fermée.**

#### ③ Le seul pari proche de l'équilibre : le couplé placé

`tools/couple-euros.mjs` (3 paires par course, 1 € la paire) :

| 3 numéros | placé | ROI placé | gagnant | ROI gagnant |
|---|---|---|---|---|
| **P1·P2 + 1er du marché hors carnet 2** | — | **+4,1 %** | — | — |
| carnet P1·P2·P3 | 37,6 % | +2,4 % | 15,1 % | −27,0 % |
| marché top-3 | 34,6 % | −21,0 % | 18,0 % | −8,6 % |

#### ④ ⚠ LE CAS DU 21/10 N'EST PAS UN CAS NORMAL (13,9 %)

L'utilisateur a raison : LA CEPIERE (13·12·10·4·2) a fait arriver **4 des 5
premiers du marché**. `tools/coply-typique.mjs`, sur 280 Quintés :

```
combien des 5 arrivés étaient dans les 5 du marché
  5/5   5    1,8 %
  4/5  34   12,1 %      ← le cas du 21/10
  3/5 105   37,5 %
  2/5 103   36,8 %
  1/5  32   11,4 %
  0/5   1    0,4 %
```

→ **4 ou 5 des 5 : 39/280 = 13,9 %.** Ce cas n'est donc pas un critère — et
c'est justement celui où le marché gagne.

**Dans le cas normal (86 % des courses) :**

| règle (3 numéros) | touchés | ROI | moitié 1 | moitié 2 |
|---|---|---|---|---|
| marché top-3 | 2,2 % | **−82,6 %** | — | — |
| carnet P1·P2·P3 | 2,3 % | −64,8 % | −91 % | −44 % |
| **P1·P2 + 1er du marché hors carnet 2** | **4,7 %** | **−14,0 %** | **−14 %** | **−13 %** |

Le trio y paie **80 € de médiane** (210 € de moyenne), 80 courses sur 183
au-dessus de 100 €. C'est là que se joue le Quinté — et c'est là que les 3
favoris rendent 83 % de la mise.

#### ⑤ ✅ APPLIQUÉ — les 3 numéros de /coply

`selectionCoply(partants, course, n)` :

```
si course.presse existe (le Quinté) →
    P1 · P2  +  le cheval le mieux coté que la presse NE met PAS dans son top 2
sinon → le modèle (≡ marché)
```

Le 3ᵉ numéro n'est donc pas P3 : c'est **le désaccord** entre les deux ordres —
le cheval que l'argent soutient et que la presse sous-classe. C'est le seul
endroit mesuré qui paie (trio −14 %, couplé placé +4,1 %).

La page lit l'ordre dans `/data/synthese.json` (écrit par `tools/daily.mjs`) et
l'attache à la course quand les clés concordent (`{date}_R{n}_C{m}`). Une ligne
sous les 3 numéros dit laquelle des deux règles a parlé.

**Ce que ça change :** trio −74 % → **−14 %**, couplé placé −22,4 % → **+4,1 %**,
stable sur les deux moitiés. Ce n'est pas un gain : c'est **moins de perte**.
Aucune règle à 3 numéros n'est positive au trio sur l'archive — le Trio n'est
pas un placement, c'est un pari choisi (§15.6).

**Outils :** `tools/coply-verif.mjs` (le vrai moteur, mesuré) ·
`tools/coply-regles.mjs` (8 règles, hors échantillon) ·
`tools/coply-trio-euros.mjs` (le trio en euros, balayage des fenêtres) ·
`tools/coply-typique.mjs` (le cas normal contre le cas logique) ·
`tools/couple-euros.mjs` (le couplé en euros).

---

### 11.39 ⭐ LA BASSMAT NE CHOISIT PAS — ELLE DÉCRIT (21/10/2026)

> Question de l'utilisateur : **« يعني البصمة لاتستعمل والمحرك اعمى »** — la
> bassmat n'est pas utilisée, donc le moteur est aveugle.

#### ① Le constat était juste : la bassmat ne servait à rien

Le panneau « Empreinte du Trio » de `/coply` affichait la **fréquence** des
motifs (2·1·0·0·0 = 26 %…) et **jamais ce qu'ils paient**. Aucun moteur ne la
lisait. C'était bien du decor.

#### ② La mesure — 1 € joué sur TOUS les trios d'un motif

Il faut distinguer deux choses que le panneau mélangeait :

```
le motif dit COMBIEN de chevaux de chaque groupe   (2 de G1 + 1 de G2)
il ne dit pas LESQUELS
```

Or un motif contient beaucoup de trios :

```
2·1·0·0·0  →  C(4,2) × C(4,1)      =    24 trios par course
1·1·1·0·0  →  4 × 4 × 2            =    32
3·0·0·0·0  →  C(4,3)               =     4
1·1·0·0·1  →  4 × 4 × 4            =    64
```

On rejoue donc chaque Quinté en jouant **tous** les trios du motif, et on
divise le total gagné par le total misé. `tools/empreinte-trio.mjs`, bloc
`euros` — **93 Quintés avec rapport réel**, 1 € par trio :

| motif | arrive | paye | trios joués | **par 1 €** |
|---|---|---|---|---|
| **2·0·0·1·0** | 11,8 % | 88 € | 1 140 | **0,85 €** ← le meilleur |
| 0·2·0·1·0 | 2,2 % | 311 € | 1 140 | 0,55 € |
| 2·0·0·0·1 | 4,3 % | 264 € | 2 100 | 0,50 € |
| 0·2·0·0·1 | 2,2 % | 486 € | 2 100 | 0,46 € |
| **2·1·0·0·0** | 24,7 % | 45 € | 2 304 | **0,45 €** ← le plus fréquent |
| 1·1·0·0·1 | 7,5 % | 360 € | 5 600 | 0,45 € |
| **3·0·0·0·0** | 8,6 % | 14 € | 384 | **0,30 €** |
| 1·1·1·0·0 | 9,7 % | 98 € | 3 072 | 0,29 € |
| 2·0·1·0·0 | 5,4 % | 54 € | 1 152 | 0,23 € |
| 1·1·0·1·0 | 4,3 % | 158 € | 3 040 | 0,21 € |
| 1·2·0·0·0 | 7,5 % | 68 € | 2 304 | 0,21 € |

**Aucune forme n'atteint 1,00 € : 0 sur 13.** La meilleure rend **0,85 €**
par euro, et elle ne pèse que 11,8 % des trios.

Contrôle par les bandes du **marché** (211 Quintés, même calcul) : `2001`
0,58 € · `1110` 0,52 € · `2010` 0,48 € · `2100` 0,39 € · **`3000` (les 3
favoris) 0,16 €**. Même conclusion, plus gros échantillon.

#### ③ Le moteur n'est pas aveugle — il est PLUS FIN que la bassmat

```
la meilleure forme            0,85 € par euro
le moteur (production)        0,84 € par euro      (5,4 % touchés, −15,8 %)
la forme qu'il produit       3·0·0·0·0 dans 59,1 % des courses → 0,30 €
```

Le moteur choisit **1 trio** ; la bassmat agrège **384 à 5 600 trios**.
Son choix bat donc le motif qu'il produit (0,84 contre 0,30) et vaut la
meilleure forme de toutes. **Utiliser la bassmat reviendrait à jeter le
signal fin pour un signal grossier.**

C'est aussi la réponse arithmétique à « البصمة ديال الكوبلي عمرها ماكاتعطي
نتيجة ايجابية » : ce n'est pas une question de règle, c'est le nombre de
combinaisons. Une forme = 4 à 64 trios ; à 3 numéros on n'en joue qu'**un**.

#### ④ 15 règles de bassmat testées, toutes ≤ la production

7 règles de motifs (carnet) + 8 règles de bandes (marché) :

```
E4 P1·P5·P9 (1 de G1,G2,G3)   +47,7 %  mais moitiés +121,7 / −27,8  → 1 seule
                                        touche sur 90 : bruit
P1·P2 + mieux coté hors G1    −48,7 %      2 de G1 + 1 hors G1  −71,1 %
P1·P2 + G3 (P9-P10)           −34,2 %      1A+1B+1C (marché)     −16,4 %
production                    −16,7 %      ancre 9-10            −100 %
```

`1A+1B+1C` fait −16,4 % contre −16,7 % : égalité dans le bruit, et instable
(+68 / −100). Rien ne bat la production de façon stable.

#### ⑤ ✅ APPLIQUÉ — le panneau montre le prix, plus la fréquence seule

`tools/empreinte-trio.mjs` écrit désormais un bloc `euros` :

```
euros.base            les Quintés qui ont un rapport réel (93)
euros.formes[]        { motif, cours, pct, paie, trios, parEuro }  trié par parEuro
euros.meilleure       la meilleure forme et son prix
euros.moteur          { touche, roi, parEuro, forme, formePct, regle }
```

Le panneau « Empreinte du Trio » de `/coply` ajoute **une colonne : par 1 €**,
en ambre sous 1,00 € et en vert au-dessus, plus la comparaison :

```
équilibre 1,00 € · aucune forme n'atteint l'équilibre : 0 sur 13
la meilleure forme 2·0·0·1·0 → 0,85 € · le moteur → 0,84 €
le moteur produit 3·0·0·0·0 dans 59,1 % des courses :
la forme ne choisit pas, elle décrit
```

**Le moteur, lui, ne change pas** : `P1 · P2 + le désaccord du marché` (§11.38)
reste la meilleure règle mesurée — 0,84 € par euro.

> ⚠ Ce n'est pas un abandon de la bassmat : c'est sa **place**. Elle décrit
> les formes qui existent et ce qu'elles paient (§15.8 : empreinte du podium,
> du quinté, du trio). Elle ne peut pas choisir, parce qu'un motif est un
> panier de 4 à 64 trios. Le choix se joue **à l'intérieur** du panier, et
> c'est là que les 15 règles testées perdent toutes.

## 22. 🐎 LE DIRECT DE LA SOREC — la chaîne du Maroc dans `/lives` (23/10/2026)

> Demande de l'utilisateur : « ajoute-moi cette chaîne
> `https://sorec-streaming.archostechnology.net/index_2_jwplayer.html`
> ici `http://localhost:3003/lives` »

### 22.1 Ce que la page de la SOREC contient vraiment

Elle ne fait qu'une chose : poser un lecteur **JW Player** sur un flux **HLS**.
On ne l'intègre donc pas (iframe, http, certificat mort) : on prend **le flux**.

| Page | Flux |
|---|---|
| `index_1_jwplayer.html` | `/live/OutStream1/playlist.m3u8` — le direct |
| `index_2_jwplayer.html` | idem (celle que l'utilisateur a donnée) |
| `index_3_jwplayer.html` | `/live/OutStream1/playlist.m3u8?DVR` — retour sur image |
| `index_4_jwplayer.html` | `/live/myStream_2/playlist.m3u8` — côtes et rapports |

La playlist maîtresse donne une variante (`chunklist_w….m3u8`) puis des
segments `media_w…_1952.ts` de ~650 Ko, en 640×360.

### 22.2 Le relais `/api/sorec` — et pourquoi il est en NODE

```
GET /api/sorec?flux=auto|dvr|cotes     la playlist, URLs réécrites
GET /api/sorec?hls=<url absolue>       un média traversé (variante, .ts)
GET /api/sorec?diag=1                  DNS + TCP + fetch — le diagnostic
```

Deux verrous mesurés le 23/10 :

1. **le certificat https a expiré le 22/09/2025** → tout navigateur refuse la
   connexion. Le flux n'existe qu'en **http**, et une page servie en https ne
   peut pas le lire (contenu mixte). D'où le relais.
2. **runtime NODE, pas EDGE** : en edge, `fetch` vers une URL `http://` rend
   `internal error` (502 sur les trois flux). En Node la même requête passe.
   ⚠ C'est l'inverse d'`api/ptf.js`, où Cloudflare impose l'edge.

En développement, le middleware `/api/sorec` de `vite.config.js` fait le même
travail — même contrat, deux environnements.

### 22.3 ⚠ En ligne, le direct est FERMÉ — mesuré, pas supposé

`/api/sorec?diag=1` en production :

```
dns    : 54.36.17.186      (la résolution marche)
tcp80  : timeout           (le port ne répond pas)
fetch  : UND_ERR_CONNECT_TIMEOUT
```

Deux relais publics interrogés depuis l'étranger donnent la même chose
(`allorigins` 502, `codetabs` 522). **Le serveur de la SOREC refuse les
connexions venant de l'étranger.** Depuis le poste (Maroc), tout passe.

Conséquence : le lecteur **marche en local** et **reste noir en ligne**. La page
l'écrit noir sur blanc au lieu de laisser un carré noir — l'avertissement
n'apparaît que si `location.protocol === 'https:'`, avec un lien de repli vers
leur site. Ce qu'il faudrait pour que ça marche en ligne ne dépend pas de nous :
que la SOREC **renouvelle son certificat** et **ouvre son pare-feu**.

### 22.4 L'affichage

`frontend/LIVES/Lives.jsx` → `BlocSorec`, en tête de `/lives` :

- trois pastilles **Direct · Retour sur image · Côtes / Rapports** ;
- le même `Lecteur` que les réunions Equidia, avec
  `urlDirecte={'/api/sorec?flux=' + flux}` ;
- `lien={null}` : **aucun lien qui sorte** — le direct se regarde dans la page ;
- `key={flux}` : changer de flux repart d'un lecteur neuf (pas de reste de
  tampon de l'ancien direct).

### 22.5 ⏱️ LE RELAIS DÉCALÉ — 60 s de retard, depuis ce poste (24/10/2026)

> Demande de l'utilisateur : « مايمكنش نديرو شي طريقة متلا تسجيل وعرض على الانترنت
> بشي فرق ديل 60 تانية »

**La mesure qui commande tout : le DVR de la SOREC ne garde que 30 s** (3 segments
de ~10 s). Un retour en arrière de 60 s n'existe pas chez eux → il faut notre
propre tampon. Et comme seul un poste au Maroc peut lire le flux (§22.3), ce
tampon ne peut tourner que sur la machine de l'utilisateur.

| Fichier | Rôle |
|---|---|
| `tools/sorec-relais.mjs` | tire le direct, garde les segments **en mémoire**, les ressert **60 s en retard** |
| `tools/sorec-relais.bat` | double-clic : lance le relais sur le port 5058 |
| `frontend/LIVES/Lives.jsx` | champ **« Relais décalé »** dans le bloc SOREC (gardé en `localStorage`) |

```
node tools/sorec-relais.mjs --decalage 60 --port 5058
   http://localhost:5058/live.m3u8     la playlist décalée
   http://localhost:5058/etat          segments en mémoire, retard réel, erreur
```

Ce n'est **pas un enregistrement** : rien n'est écrit sur le disque, les segments
sont jetés dès qu'ils sortent de `décalage + 120 s`.

#### Les deux pièges, mesurés le 24/10

1. **Le nom de la variante change à CHAQUE requête** (`chunklist_w335608973`,
   `w1781855422`, `w2135545017` sur trois appels consécutifs). Comparer les noms
   pour détecter un redémarrage vidait le tampon toutes les 15 s → le décalage
   n'était jamais atteint. **L'identité d'un segment est son NUMÉRO**
   (`media_w…_2132.ts` → 2132), pas son URL.
2. **Le serveur coupe par moments** (une requête sur dix expire). Une erreur de
   passage ne jette rien : on réessaie 2 s plus tard, le tampon reste.

Mesure après correction : `segments 12 · secondesEnMemoire 120 · prets 6 ·
retardReel 62 s` — le retard demandé (60 s) est tenu.

#### Pour un autre appareil

Le port 5058 n'écoute que sur le poste. Pour le téléphone :

```
cloudflared tunnel --url http://localhost:5058      (sans compte, URL éphémère)
ngrok http 5058                                     (ngrok 3.3.1 est installé, authtoken à créer)
```

L'adresse obtenue (`https://….trycloudflare.com`) se colle dans le champ
« Relais décalé » de `/lives` ; elle est gardée dans le navigateur. Elle change à
chaque lancement du tunnel.

### 22.6 🃏 TOUT EN CARTES, L'ÉCRAN SUR CLIC (24/10/2026)

> Demande de l'utilisateur : « fais apparaître toutes les chaînes en cartes, sans
> grand écran ; au clic sur la carte l'écran s'ouvre. Pour la chaîne SOREC sur
> internet, mets-lui un bouton pour regarder dehors. »

**Avant** : le lecteur SOREC était posé en haut de `/lives`, ouvert d'office, et
la réunion Equidia du jour aussi → deux grands écrans empilés avant même la
liste.

**Maintenant** : une seule grille de cartes, **aucun lecteur au chargement**
(`choix` démarre à `null`, et `lire()` ne sélectionne plus la première réunion).
Un clic ouvre l'écran, un `✕ Fermer` le referme.

| carte | contenu | clic |
|---|---|---|
| **SOREC · Maroc** | badge `EN DIRECT`, `MA`, « Direct · retour sur image · cotes » | ouvre `PanneauSorec` |
| **R1 · Compiègne** (… les réunions Equidia) | heure GMT, disciplines, Quinté+/Quarté+/Premium/PMH/CSI | ouvre le `Lecteur` |
| **Le Trot** | « lien externe » | `letrot.com/videos` (l'éditeur refuse l'intégration) |

- Le composant `Carte` est **unique** : même hauteur d'image (96 px), même
  dégradé, même pied. Il rend un `div role="button"` et non un `<button>` — la
  carte SOREC porte un lien dedans, et un `<a>` dans un `<button>` n'est pas du
  HTML valide.
- `PanneauSorec` porte : le lecteur, les trois pastilles de flux, le champ
  **Relais décalé** (§22.5), le bouton **▶ Regarder sur le site SOREC ↗**
  (`SOREC_EXTERNE`, en http — il marche depuis n'importe quel appareil au
  Maroc, c'est notre relais qui est bloqué, pas le navigateur), et le `✕`.
- Vérifié : 8 cartes, `video` = 0 au chargement, clic SOREC → panneau + 1
  lecteur, clic R1 → « Écran — R1 · Putois » + `✕ Fermer`, Fermer → 0 lecteur.

### 12.6 🧾 LES CONDITIONS DE LA COURSE — d'où vient chaque ligne (24/10/2026)

> Signalement de l'utilisateur : « ici les données ne viennent pas en entier »
> — la grille affichait `— non publié` sur Piste, Corde, Terrain, Allocations,
> Tirelire et Météo.

**Ce n'était pas un bug de lecture.** Mesuré sur le Quinté du 24/10
(PRIX DE BEAUNE, R1C3 Compiègne) : `pro.casacourses.com/api/race/{id}` ne
contient **ni** `track_type`, **ni** `track_condition`, **ni** `prize`, **ni**
`weather_temp` — les clés sont **absentes**, pas vides.

`fetchConditions(courseId)` (`src/lib/quinte.js`, copie backend à l'octet près)
complète donc la course en **deux appels parallèles**, et ne jette jamais :

| ligne | source | clé |
|---|---|---|
| **Piste** | Equidia | `v2/courses/{date}/R{n}/C{m}` → `lib_piste_course` (« Herbe ») |
| **Allocations** | Equidia | `montant_total_allocation` (« 98.000,00 euros » → **98 000 €**) |
| **Tirelire** | Equidia | `is_tirelire` → Oui / Non |
| **Météo** | Equidia | `reunion.meteo_temperature` + `meteo_nebulosite_libelle_court` |
| **Catégorie** | Equidia | `categ_course` (« HANDICAP ») — remplace `class`, absent |
| **Conditions détaillées** | Equidia | `conditions_txt_course` (142 car.) — remplace `comment` |
| **Terrain** | turf-france | `reu.php?view=program` → « Terrain : … » de la ligne de la course |
| **Corde** | — | **non publiée** : une course d'obstacle n'a pas de corde |

⚠ **Deux pièges corrigés au passage :**

1. l'ancien code affichait `Corde: c.track_type` — c'est-à-dire **la piste
   deux fois**. La corde n'existe pas en obstacle : on écrit « non publié ».
2. `Terrain` affichait `—` (le `FR()` d'un `null`) au lieu de « — non publié ».

⚠ **Le terrain n'est PAS chez Equidia** : cherché dans tout l'état
(`terrain`, `etat_piste`, `penetro`, `going`), seules les `apt_terrain` **par
cheval** existent — ce n'est pas le terrain du jour. Le 24/10, turf-france ne
le publie pas non plus pour Compiègne (`<td><strong>Terrain :</strong></td><td></td>`),
et la 9ᵉ cellule de la ligne vaut « HANDICAP ». **On l'écrit « non publié »**
(AGENTS.md §7) plutôt que de le deviner.

Le branchement est fait **dans `chargerCourseCC()`**, donc les deux chemins de
la page (course du jour et archive) en profitent sans code en plus.

---

## 23. 🏁 RÉSULTATS & RAPPORTS — la page `/resultats` (24/10/2026)

> Demande de l'utilisateur : « la page des résultats de casacourses, mais
> seulement les résultats avec le rapport — combien ça paie — un autre style,
> et un bouton de rafraîchissement ».

**La page ne montre QUE du terminé** : pas de programme, pas de course à venir.
Pour chaque course : l'**arrivée des 5 premiers** et **ce que paie chaque pari**.

### 23.1 Les deux sources, et pourquoi deux

| ce qu'on veut | source | appel |
|---|---|---|
| réunions + courses + **arrivée** | casacourses | `pro.casacourses.com/api/programme?date=` puis `/api/race/{id}?date=` |
| **les rapports** (combien ça paie) | **PMU** | `/api/pmu/rest/client/61/programme/{JJMMAAAA}/R{n}/C{m}/rapports-definitifs` |

⚠ **casacourses a bien un champ `dividends`… il est TOUJOURS VIDE.**
Vérifié sur **30 courses terminées du 23/10** (France et Belgique) : `dividends: []`
partout, y compris sur le Quinté de Vincennes. Le rapport n'est pas là.

⚠ **L'API du PMU n'envoie AUCUN en-tête CORS** (`Failed to fetch` depuis la
page, mesuré le 24/10). D'où le **relais `/api/pmu`**, ajouté le même jour :

```
api/pmu.js                 export default proxy('pmu')
api/_proxy.js              ORIGINES.pmu = 'https://online.turfinfo.api.pmu.fr'
vite.config.js             ORIGINES + les 2 regex /api/(…|pmu)
vercel.json                /api/pmu/:surcharge(.*) -> /api/pmu?p=:surcharge
```

⚠ Le PMU ne connaît que **ses** courses : le Maroc (SOREC), la Belgique, la
Grande-Bretagne n'ont pas de rapports. On ne les demande donc que pour les pays
PMU (`FR, GP, MQ, RE, GF, YT, PM, BL, MF`) et un 404 est avalé sans bruit —
la course garde son arrivée et affiche « Rapports non publiés ».

### 23.2 ⚠ LE PIÈGE DES CENTIMES

Le PMU compte en **centimes pour 1 €** :

```
"dividendePourUnEuro": 280      →  2,80 €
"dividendePourUnEuro": 21061450 →  210 614,50 €   (Quinté+ ordre, Vincennes 23/10)
```

Ne jamais afficher le brut : `euros()` divise par 100 et formate en `fr-FR`.

### 23.3 ⭐ LE TABLEAU — « هاد الطريقة أسهل وأجمل » (24/10/2026)

> L'utilisateur a montré le tableau de casacourses : **une ligne par course**,
> l'arrivée en cases vertes, les non-partants en cases rouges, et le rapport
> derrière un clic. Verdict : « c'est plus simple et plus beau ».
> La page a donc été **refaite en tableau** (les cartes de la veille sont
> supprimées).

```
DATE       │ TERRAIN (hippodrome + type de pari) │ ARRIVÉE          │ NON-PART. │ DÉTAILS
23/10/26   │ 🇲🇦 R9 Anfa · Quinté+ · C7 · 16:35   │ 9 5 13 2 6       │ 16        │ Rapport ▼
23/10/26   │ 🇫🇷 R1 Vincennes · Trio · C1 · 17:23 │ 9 8 5 13 12      │ 4         │ Rapport ▼
```

- **« Rapport ▼ » déplie**, sous la ligne, une tuile par pari (une par couleur)
  avec ses lignes : `Ordre · Désordre · Bonus 4 · Bonus 3` et le montant.
  Plusieurs courses peuvent être ouvertes en même temps.
- **Le type de la course** est déduit des rapports : `QUINTE_PLUS` → Quinté+,
  `QUARTE_PLUS` → Quarté+, `QUARTE` → Quarté, `TIERCE` → Tiercé, `TRIO` → Trio.
- **Les non-partants** viennent de `nonStarters` (casacourses) et de
  `status !== true` (SOREC) — mesuré sur Anfa du 23/10 : C2 → 3, C3 → 8,
  C5 → 6, C6 → 5, C7 → 16, exactement les cases rouges de casacourses.
- Un liseré or plus épais sépare les réunions ; l'ordre est **Maroc d'abord**,
  puis R1, R2, R3…

Nuit profonde + **or** (la couleur du podium), chiffres en monospace.
Les couleurs ne décorent pas : **elles disent qui a gagné**.

| élément | couleur |
|---|---|
| arrivée | cases **vertes** `#15803d` |
| non-partant | cases **rouges** `#b91c1c` |
| Quinté+ | or · Quarté+ orange · Tiercé cyan · Trio vert · 2sur4 rose |

⚠ **Les libellés de la SOREC sont traduits** : elle envoie `ORDRE`, `DESORDRE`,
`BONUS 3`, `NP1`, `B3NP1`, `B4NP1` → `Ordre`, `Désordre`, `Bonus 3`,
`Bonus (NP1)`, `Bonus 3 (NP1)`, `Bonus 4 (NP1)`. Sans ça la tuile affichait
« b3np1 ». Et le nom du pari déjà écrit dans le titre est retiré de la ligne
(`Quinté+ Ordre` → `Ordre`) : sans ça le Quinté+ débordait en « Quinté+… ».
L'ordre de lecture est forcé : **ordre, désordre, bonus 4, bonus 3, puis NP1**
(la SOREC envoie le bonus en premier).

### 23.4 Les deux compactions (sinon la tuile est illisible)

1. **Les lignes qui paient pareil sont regroupées** par *(libellé, montant)* :
   `2sur4` = 6 combinaisons à 21,80 € → **une** ligne « 6 combinaisons » ;
   `Bonus 4sur5` = 5 combinaisons à 14,80 € → **une** ligne. La liste exacte
   des combinaisons reste dans l'`title` (infobulle).
   ⚠ On regroupe par *(libellé, montant)* et non par pari entier, sinon
   « Bonus 3 » disparaîtrait dans les « Bonus 4sur5 ».
2. **Les réunions sont triées R1, R2, R3…** — casacourses les rend dans l'ordre
   de son fournisseur (R2, R3, R5, R1…).

### 23.5 Ce qui a été mesuré en ligne

```
23/10/2026 : 37 courses · 5 réunions
             🇲🇦 R9 Anfa (SOREC, en DH) : 7 courses, Quinté+ C7 = 9-5-13-2-6, NP 16
                Ordre 375,00 DH · Désordre 7,50 DH · Bonus 4 1,50 DH · Bonus 3 1,10 DH
             🇫🇷 R1 Vincennes : Quinté+ C4 = 15-12-6-14-16
                Simple gagnant 4,50 € · Quinté+ désordre 2 982,60 €
                Quinté+ ordre 210 614,50 € · Bonus 4sur5 14,80 €
             R2 Mons (BE) : aucun rapport (le PMU ne connaît pas la Belgique)
24/10/2026 (matin) : « Aucune course terminée à cette date. »  ← normal
```

- Le bouton **↻ Actualiser** vide le cache de la date (`oublier(date)`) et
  relit tout ; l'avancement s'affiche (« rapports 12/40 »).
- Le cache est en mémoire (`Map` par date) : changer de date ne relit pas.
- `chargerResultats` fait au plus **8 requêtes en vol**.

### 23.6 Les fichiers

| fichier | rôle |
|---|---|
| `frontend/RESULTATS/Resultats.jsx` | la page : **tableau**, arrivée, non-partants, rapport déplié, date, bouton |
| `backend/RESULTATS/donnees.js` | casacourses + PMU, normalisation, cache, `enParallele`, `chargerTout` |
| `backend/RESULTATS/maroc.js` | **SOREC** : `chargerSorec`, `lireArriveeSorec`, `lireNonPartantsSorec`, `lireDividendesSorec`, `lireArchive`, `chargerResultatsMaroc` |
| `tools/maroc-resultats.mjs` | écrit `data/maroc-resultats.json` + `public/data/maroc-resultats.json` |
| `api/pmu.js` · `api/_proxy.js` · `api/ma.js` | les relais des rapports et de la SOREC |
| `src/App.jsx` | `/resultats` (et l'alias `/rapports`) |
| `src/Entete.jsx` | le lien « Résultats » (`bi-list-ol`) |
| `src/index.css` | `.p-resultats{ --t: var(--n-ambre) }` |

### 23.7 ⭐ LE MAROC PAIE EN DIRHAMS — PAS DE PMU (24/10/2026)

> « هادو الأثمنة ديال فرنسا وأنا قلت ليك الأثمنة ديال SOREC »

| | Maroc | France et autres |
|---|---|---|
| arrivée | e-sorec `result` (« 2 - 3 - 5 - 7 - 4 ») | casacourses `/api/race/{id}` |
| rapports | e-sorec `dividends[]` | PMU `rapports-definitifs` |
| devise | **DH** (centimes de dirham) | **€** (centimes d'euro) |
| non-partants | `runners[].status !== true` | `nonStarters` |

- **casacourses ne sait pas faire le Maroc** : sa réunion « Casablanca » reste
  `OPEN` / `has_results: false` à jamais, `dividends: []`. Elle est **jetée** de
  la liste (`chargerTout` filtre `pays === 'MA'`).
- ⚠ **e-sorec n'est joignable QUE depuis le Maroc** (Vercel : 504 edge, 502 Node).
  La page lit donc `public/data/maroc-resultats.json` (écrit par
  `tools/maroc-resultats.mjs`, publié par `tools/daily.mjs`), et ne tente le
  direct qu'en local (`localhost`) ou sur **↻ Actualiser**.
- **Conséquence à dire à l'utilisateur** : en ligne, le Maroc du jour n'apparaît
  qu'après le passage du job (08 h 45 / 20 h 30) **et** un déploiement.
- L'archive est **fusionnante** : `--jours=N` relit N jours mais garde les 60
  derniers déjà connus.

---

## 27. ⭐ DEUX DISPARITIONS RÉPARÉES — le Maroc suit la date, le 500 n'est pas une panne (25/10/2026)

> « لماذا تختفي قنوات البت الحي ⚠ régions : HTTP 500 — la source Equidia Régions
> ne répond pas. ولماذا يختفي اجتماع المغرب »

Deux symptômes, **deux causes différentes** — et aucune des deux n'était une panne.

### 24.1 ⭐ « régions : HTTP 500 » = une journée SANS RÉUNION

Equidia Régions ne rend pas une liste vide quand il n'y a rien à publier : il
rend `{"error":{"code":"error-500","msg":"Internal server error !"}}`.

```
2026-10-23 → 200 (5 réunions)     2026-10-25 → 500
2026-10-24 → 200 (8 réunions)     2026-10-26 → 500
2026-10-27 → 200                  2027-01-01 → 200 avec 0 réunion
```

`chargerLives()` transformait ça en **erreur** → la page affichait
`⚠ régions : HTTP 500 — la source ne répond pas` et **plus aucune chaîne**.

| avant | maintenant |
|---|---|
| `!r.ok` → `throw` | **3 essais** (400 ms puis 1 s) → `vide: true` |
| — | `derniereJournee(date, 7)` : la dernière journée qui a couru |

> ⚠ Le 500 est **instable** : le même 26/10 rend 500 depuis Node et 5 réunions
> depuis le navigateur, à deux minutes d'écart. D'où les 3 essais — sans eux un
> incident passager ferait disparaître les chaînes.

`frontend/LIVES/Lives.jsx` : bloc « **Aucune réunion régionale** le … » + deux
boutons — **↻ Réessayer** (`relancer()`, sans attendre les 60 s) et
**↩ Voir la dernière journée qui a couru** (`voirDerniere()`).

Vérifié en ligne le 25/10 : `2027-01-01` → bloc vide + les deux boutons ; le
bouton « dernière journée » bascule sur `2026-12-31` (2 réunions).

### 24.2 ⭐ LE MAROC NE SUIVAIT PAS LA DATE — `/api/meetings` ignore `?date=`

```
GET /api/meetings?date=2026-10-23   → 10 événements datés du 25/10   ✗
GET /api/meetings-v2/2026-10-23     → 10 événements datés du 23/10   ✓
```

`morocco.js` filtre ensuite sur `event.date` : pour toute date **autre que celle
du jour**, la liste était vide et **la réunion marocaine disparaissait de
`/dna`** — sans erreur, sans message.

**Corrigé** : `direct()` et `collecter()` appellent **`/api/meetings-v2/{date}`**.

### 24.3 L'archive par date — `maroc-jours.json`

`data/maroc.json` ne porte **que la journée du run** : même avec la bonne URL,
une date passée n'avait aucun fichier de repli (et en ligne e-sorec est
injoignable depuis Vercel).

- `tools/maroc.mjs` → `archiver()` écrit **`data/maroc-jours.json`** +
  `public/data/maroc-jours.json` : `{ maj, jours: { "2026-10-23": [meetings] } }`,
  **40 jours** gardés.
- `morocco.js` → `jours()` lit ce fichier ; `programmeSorec` s'en sert quand
  `maroc.json` ne correspond pas à la date demandée (`collecteLe: null` → jamais
  « frais », donc le direct est retenté dès qu'il est joignable).
- Amorçage fait le 25/10 : **8 jours** (18 → 25/10), 1 réunion par jour
  (Marrakech, Casablanca, Khemisset ×2, Meknes, Casablanca, Settat, Marrakech).

> ⚠ `/dna` ne recharge **que sur « Charger »** : changer la date ne suffit pas
> (le `useEffect` ne dépend que du montage). C'est voulu — une date ne doit pas
> lancer 17 requêtes à chaque frappe.

Vérifié en ligne le 25/10 : `/dna` → 23/10 → Charger → **6 réunions** dont
`MA · Casablanca · Q+ · 7 courses`, et `MA · R9 C1 — KERMESSE` ouvre ses partants.

---

## 28. ⏱ LA COURSE QUI PART DANS 5 MINUTES — visible dans la carte (25/10/2026)

> « بغيت الكورسة الى باقي ليها خمس دقايق على الانطلاقة تبان فالبطاقة واضحة »

`frontend/DNA/Programme.jsx` + `frontend/DNA/dna.css`.

### 28.1 Pourquoi trois endroits, et pas un

Une réunion peut être **repliée**. Une course imminente dans une carte fermée
ne se verrait pas — c’est le piège de la demande « dans la carte ».

| # | où | quoi |
|---|---|---|
| ① | **bande** sous la date | `⏱ DÉPART DANS 3:12 · R6 Krieau · C5 · 2600 m` + l’heure locale ; un clic ouvre la réunion |
| ② | **carte de la réunion** | bordure rose 2 px qui bat + pastille `⏱ 3:12` dans l’en-tête, **même repliée** ; la carte s’ouvre toute seule |
| ③ | **ligne de la course** | fond rouge, bordure 2 px, `⏱ 3:12` en pastille blanche, et `DÉPART DANS 3:12 — 17:55` |

### 28.2 La fenêtre et le rythme

```
SEUIL = 5 min      la fenêtre demandée
APRES = 12 min     une course reste marquée « partie » 12 min après le départ
```

Le décompte bat à la **seconde** (`useNow(1000)`), pas aux 30 s du reste de la
page : à « D-4 min » près on ne sait pas s’il reste le temps de jouer.

### 28.3 L’ouverture automatique — et comment la refermer

`fermePar` (un `useRef`) : la carte de la course imminente reste ouverte tant
que l’utilisateur ne clique pas sur son en-tête. Cliquer la ferme **pour de
bon** — sinon on se battrait avec lui à chaque seconde du décompte. La bande ①
rouvre la carte sans condition.

### 28.4 Ce qui a été vérifié

Essai avec `SEUIL` porté à 90 min (plusieurs courses dans la fenêtre), puis
remis à 5 min :

- bande : `DÉPART DANS 0:28 · R6 Krieau (vienne) · C5 · 2600 m · 17:35` ;
- cartes R5/R6/R7/R11 en rose avec `⏱ 17:19` … et la ligne C8 de R5 en rouge
  avec `⏱ 14:31 · DÉPART DANS 14:31 — 17:55` ;
- la carte de la course imminente s’ouvre seule (R5, 8 lignes rendues) ;
- en ligne (bundle `index-BDTt3AZh.js`) : `DÉPART DANS`, `dna-imminent`,
  `part dans` et `dna-dot` présents dans le JS **et** le CSS.

### 28.5 ⭐ LA BANDE MONTRE LA PROCHAINE COURSE, EN PERMANENCE (25/10/2026)

> Demande de l’utilisateur : **« هادي بدلها عوض خمس دقايق تبان الكورسة
> القادمة »** — le bandeau restait vide entre deux courses, et ce n’est pas
> une information : à 17 h 30 il n’y avait plus rien en haut du programme.

`plusProche()` (fenêtre de 5 min) est remplacé par **`prochaineCourse()`** :
la course la plus proche du départ, **sans plafond**.

| état | quand | ce qu’on voit |
|---|---|---|
| **calme** (cyan, pas d’animation) | la prochaine est à plus de 5 min | `PROCHAINE COURSE · DANS 12:29:00 · R2 Marseille-Borély · C1 · 1200 m · 11:42 ↗` |
| **pressée** (rose, bordure 2 px, `dna-imminent`) | à moins de 5 min | `DÉPART DANS 2:40 · R2 Marseille-Borély · C1 · 1200 m · 11:42 ↗` |
| **rien** | plus aucune course à partir (journée finie, archive) | — |

- Nouveau formateur **`duree()`** : `m:ss` sous l’heure, `h:mm:ss` au-delà
  (`mmss` aurait écrit « 125:00 »).
- **Ce qui ne change pas** : ② la carte rose et ③ la ligne rouge restent
  réservées aux **5 minutes**, et l’ouverture automatique aussi — sinon la
  carte sauterait à chaque changement de « prochaine course ».

Vérifié au navigateur (horloge avancée à `10:39:20Z` le 26/10) :

```
bande   DÉPART DANS 2:40 · bordure rgb(251,113,133) 2px · animation dna-imminent
carte   R2 · ⏱ 2:40 · « C1 part dans 2:40 »
ligne   C1 · 10:42 GMT · ⏱ 2:40 · DÉPART DANS 2:40 — 11:42
```

#### ⭐ 28.5.1 Le repli « DEMAIN » — quand la journée est finie

> L’utilisateur a écrit **« التغييرات لم تظهر على VERCEL »** à 23 h 40 : le
> bundle déployé **était** le bon (`index-DsPW6KuI.js`, `PROCHAINE COURSE`
> présent, `plusProche` absent), mais **toutes les courses du 25/10 étaient
> parties** → `prochaineCourse` rendait `null` → bande vide → « rien n’a
> changé ». Le déploiement n’était pas en cause, l’écran n’avait rien à dire.

`DnaCourse.jsx` charge désormais **le programme du lendemain** quand — et
seulement quand — la date affichée est celle du jour **et** qu’il n’y reste
plus une seule course à partir. `Programme.jsx` prend alors le relais :

| état | quand | ce qu’on voit |
|---|---|---|
| **demain** (ambre, pas d’animation) | la journée affichée est finie | `DEMAIN · DANS 12:21:49 · R2 Marseille-Borély · C1 · 1200 m · 11:42 ↗` |

- un **clic** sur cette bande charge la journée du lendemain (`allerDate` :
  `setDate` + `loadMeetings` dans le même appel, sélection remise à zéro) ;
- **aucun repli** sur une date passée (archive) : la bande reste vide, c’est
  la bonne réponse ;
- une seule lecture de plus par jour, et seulement si elle sert.

Vérifié au navigateur le 25/10 à 22 h 10 UTC :

```
25/10 (journée finie)  DEMAIN · DANS 12:21:49 R2 Marseille-Borély · C1 · 1200 m 11:42 ↗  (ambre)
clic                   → date = 2026-10-26 · 8 réunions · PROCHAINE COURSE · DANS 12:21:46 (cyan)
26/10 + horloge 10:39Z DÉPART DANS 2:40 · bordure rgb(251,113,133) · dna-imminent
20/10 (archive)        aucune bande  ✅
```

### 28.6 ⚠ L’HEURE DU MAROC — celle de la SOREC, pas celle du navigateur

Le bandeau peut désormais pointer une course marocaine : son heure devait donc
être juste. Mesuré le 25/10/2026 :

```
SOREC  time = "2026-10-26 12:03:00"   (heure locale du Maroc, UTC+1)
       timestamp = 1793012580000      (= 11:03Z — correct)
Chrome : Africa/Casablanca → 11:03    ✗   (sa base de fuseaux ignore UTC+1)
Node   : Africa/Casablanca → 12:03    ✓
```

→ `versCourse()` garde **`heure`** (« 12:03 », la chaîne de la SOREC) et
`heureLocale(ms, pays, heureMa)` la préfère à tout calcul. Sans ce champ (vieux
fichier), repli sur **UTC+1**, jamais sur `Africa/Casablanca`.

Vérifié : la carte `MA · Casablanca` affiche **« 1er à 12:03 »** (elle disait
11:03).

---

## 29. ⭐ LA COURSE SANS FICHE — casacourses prend le relais (25/10/2026)

> Message vu sur `/dna` : **« Les partants de cette course ne sont pas publiés
> par la source de chevaux (réunion étrangère ou course sans fiche). Le
> programme, lui, est complet. »**

### 29.1 Le constat — ce ne sont pas des réunions étrangères

`fetchRace` n’ouvrait une course que si paris-turf lui donnait son `id`. Sinon,
message et **rien d’autre**. Or, mesuré le 25/10/2026 :

| date | réunion | courses sans fiche |
|---|---|---|
| 25/10 | **R9 Agen la Garenne** (FR) | **7 / 7** |
| 25/10 | **R11 Saint Galmier** (FR) | **9 / 9** |
| 25/10 | **R14 Chatelaillon** (FR) | **7 / 7** |
| 26/10 | **R7 Vire** (FR) | **8 / 8** |

Des réunions **françaises entières**. Le message parlait de « réunion
étrangère » : il se trompait de cause.

### 29.2 La source de secours — casacourses, déjà lue par la page

`backend/ANALYSE/paris.js` lit déjà `pro.casacourses.com/api/programme` pour les
pastilles. Il porte **aussi** les partants de ces courses :

```
GET /api/race/pmu-R9C1?date=2026-10-25
  → 8 partants nommés · odd_numeric 11 / 4.2 / 3.9 …  · odd_opening_numeric
    performance (la musique) · jockey_name · horse_trainer · horse_age
```

- l’identifiant est celui que **casacourses fabrique lui-même** à partir du
  numéro PMU (`pmu_reunion` + `pmu_course`) : on retrouve la course par sa
  **clé**, jamais par son nom ;
- le programme est mis en cache **une fois par date** (`programmeCc`) et
  partagé avec les pastilles — aucun appel en plus ;
- **ce qui manque reste vide** : casacourses ne donne ni `poids` ni `corde`
  (`poids: null`, `corde: null`) — jamais inventés.

### 29.3 ⚠ LE PIÈGE — casacourses numérote le Maroc « R1 »

Mesuré le 25/10 : casacourses appelle **R1 Casablanca**, là où le PMU appelle
**R1 Saint-Cloud**. Sans filtre, `R1C1` rendait **17 partants de Casablanca**
(`ALMOUAFAQ ROCH`, `ZHER`…) au lieu de Saint-Cloud.

→ `partantsCasacourses` **saute toute réunion `country === 'MA'`**. Le Maroc a
sa propre lecture (`rnum >= 100`, SOREC) et n’a rien à faire ici. Vérifié après
le filtre : `R1C1` rend 9 partants de Saint-Cloud (`INDALIMOS`, `QUALIXIA`,
`AZANIYA`).

### 29.4 Ce que ça donne

| course | avant | après |
|---|---|---|
| 25/10 R9C1 Agen la Garenne | message, 0 partant | **8 partants · 8 cotes · zones A/B/C remplies** |
| 25/10 R11C4 Saint Galmier | message | **14 partants · 14 cotes** |
| 25/10 R14C3 Chatelaillon | message | **16 partants · 15 cotes** |
| 26/10 R7C1 Vire | message | message (casacourses n’a **pas encore** les partants — honnête) |
| 25/10 R1C3 Saint-Cloud | source de chevaux | **inchangé** (10 partants, `sourcePartants` absent) |

Le moteur sur Agen R9C1 : `ZONE A 3·2·6 (90.9) · 3·2·4 (88.6) · 3·2·5 (86.6)`.

⚠ La page **dit** d’où viennent les partants (`raceData.course.sourcePartants
=== 'casacourses'` → encart bleu) : ce ne sont pas les mêmes cotes que la
source habituelle, et l’écran ne doit pas le laisser croire.

---

### 11.35 ⭐ LA BASSMAT DE LA COURSE — « بصمة السباق » (28/10/2026)

> Demande de l'utilisateur : **« Quinté → Archive · Statistiques · Écarts ·
> Choix : بغيت نخرج منهم بصمة للسباق لان الاختيارات الحالية ضعيفة جدا »**

Les quatre onglets existaient déjà, mais chacun mesurait **un morceau** : les
écarts donnaient la fiabilité d'une case, l'empreinte donnait la forme du
podium, le choix donnait le prix d'une règle. Aucun ne répondait à la question
posée devant une course : **cette course, quelle forme a-t-elle, et le ticket
est-il du bon côté de la statistique ?**

#### L'onglet

`bassmat` — 3ᵉ onglet de `/quinte`, magenta `#f0abfc`, 5 sections :
① la forme du marché · ② l'empreinte attendue · ③ le ticket case par case ·
④ les décisions (gardée contre jetée) · ⑤ la couverture. Plus le verdict, écrit
par l'outil.

**Aucune règle nouvelle n'est appliquée.** Le ticket reste `4-3-1-1-0`. La
bassmat **décrit**, elle ne choisit pas — parce que le choix est fermé (§11.24,
§11.29, §11.30).

#### ① La forme du marché — le seul découpage qui déplace les cases

```
fermé  : favori ≤ 3,2  ET ≤ 5 chevaux sous 10/1
ouvert : favori ≥ 4,4  OU ≥ 9 chevaux sous 10/1
normal : entre les deux
```

| forme | courses (96) | le 4ᵉ de G2 (P8) arrive top-5 |
|---|---|---|
| fermé | 44 (45,8 %) | 22,7 % |
| normal | 37 (38,5 %) | 29,7 % |
| ouvert | 15 (15,6 %) | 26,7 % |

Aucune autre case ne bouge de plus de 4 points d'une forme à l'autre : c'est le
seul découpage retenu. **Pas de découpage par discipline** — mesuré puis écarté :
le quinté moyen prend G1 2,04 · G2 1,47 · G3 0,58 · G4 0,49 · G5 0,42 en plat,
2,17 · 1,39 · 0,61 · 0,51 · 0,32 en trot, 1,90 · 1,60 · 0,60 · 0,40 · 0,50 en
obstacle : la composition est la même.

#### ② Ce que donne chaque case (96 Quintés, presse réelle)

| case | top-5 | top-3 | | case | top-5 | top-3 |
|---|---|---|---|---|---|---|
| P1 | **65,6 %** | 53,1 % | | P7 | 38,5 % | 18,8 % |
| P2 | 49,0 % | 32,3 % | | P8 | **26,0 %** | 12,5 % |
| P3 | 49,0 % | 33,3 % | | P9 | 35,4 % | 14,6 % |
| P4 | 40,6 % | 31,3 % | | P10 | 22,9 % | 10,4 % |
| P5 | 42,7 % | 26,0 % | | P11 | 29,5 % | 16,8 % |
| P6 | 39,6 % | 20,8 % | | P12 | 19,8 % | 10,4 % |

**Le ticket 4-3-1-1-0 = P1·P2·P3·P4 · P5·P6·P7 · P9 · P11.** Ce sont
exactement **les 9 meilleures cases** de la table : le découpage est au plafond.
P8 (26 %) est la seule case « forte du carnet » que le moteur jette, et elle est
la meilleure des cases laissées dehors.

#### ③ L'audit des décisions — gardée contre jetée

| bloc | garde | taux | jette | taux | écart |
|---|---|---|---|---|---|
| **G2** 3/4 | P5·P6·P7 | 40,3 % | P8 | 26,0 % | **+14,3** |
| **G3** 1/2 | P9 | 35,4 % | P10 | 22,9 % | **+12,5** |
| **G4** 1/2 | P11 | 29,5 % | P12 | 19,8 % | **+9,7** |

Le carnet garde les cases fortes **dans les trois blocs où il y a un choix**, et
l'écart est large (10 à 14 points). C'est la réponse chiffrée à « les choix
actuels sont faibles » : ils ne le sont pas **dans le bloc**.

#### ④ La calibration — le modèle des cases ne ment pas

```
9 chevaux · promis 3,8 arrivants · vus 3,9   (écart 0,1)
le ticket tient : podium entier 57,3 % · quinté entier 22,9 % · x/5 3,9
```

Les taux de cases sont donc **additifs** : on peut les lire tels quels.

#### ⑤ La couverture — où est la marge

| k (P1..Pk) | podium | quinté |
|---|---|---|
| 8 | 39,6 % | 7,3 % |
| **9 (le préfixe du ticket)** | **51,0 %** | 16,7 % |
| 10 | 57,3 % | 28,1 % |
| **12** | **81,3 %** | **61,5 %** |

⚠ La courbe est comptée **par préfixe de cases** (P1..Pk), pas par le ticket :
à k = 9 elle donne 16,7 %, alors que le ticket 4-3-1-1-0 tient 22,9 % — il
remplace P8 par P9·P11. Les deux chiffres sont justes, ils ne mesurent pas la
même chose.

#### Conclusion

> **Le choix dans le bloc est au plafond ; la marge est dans la LARGEUR.**
> 9 cases → 22,9 % de quinté · 12 cases → 61,5 %. Passer de 9 à 12 chevaux
> fait plus que doubler le quinté, alors qu'aucune règle de choix ne bat le
> carnet.

#### Fichiers

| Fichier | Rôle |
|---|---|
| `tools/bassmat.mjs` | la mesure → `data/bassmat.json` + `public/data/bassmat.json` |
| `src/lib/quinte.js` | `SEUILS_FORME`, `FORME_MARCHE`, `formeMarche(cotes)`, `fetchBassmat()` |
| `frontend/QUINTE/QuinteGrille.jsx` | `THEME.bassmat` + `TabBassmat` — **aucun chiffre saisi à la main** |

Le fichier reproduit `data/fiabilite.json` **exactement** (podium 57,3 % ·
quinté 22,9 % · 9 chevaux) : c'est la contre-vérification de l'outil.

```
node tools\bassmat.mjs
```

---

### 11.40 ⭐ RETOUR À 3-2-1-1-1 — LE TICKET DE 8, G5 COMPRIS (28/10/2026, appliqué)

> Instruction de l'utilisateur :
> **« 3-2-1-1-1 هذه هي الاقوى ، المشكل في الاختيارات فقط انظر الى الاحصائيات
> و الارشيف وسترى »**

Les quotas **ne sont plus 4-3-1-1-0** (9 chevaux, §11.37). Le moteur applique :

```
G1 3  ·  G2 2  ·  G3 1 (obligatoire)  ·  G4 1  ·  G5 1   =  8 chevaux
```

`GROUPES` dans `src/lib/quinte.js` + copie `backend/QUINTE/quinte.js` (à l'octet
près). `GROUPES[].alt` porte désormais la variante haute (G1 4 · G2 3 · G5 0) —
c'est de la documentation, `remplirGrille` ne lit que `quota`.

#### Ce que ça coûte, mesuré — et pourquoi la décision reste la bonne

`tools/fiabilite.mjs`, 96 Quintés à presse réelle, cotes finales :

| répartition | chev. | PAYANTE (1-2-3) | couvre +4 | **5/5** |
|---|---|---|---|---|
| 4-3-1-1-0 (§11.37, jusqu'au 28/10) | 9 | 55,2 % | 37,5 % | **25,0 %** |
| 4-2-1-1-0 | 8 | 46,9 % | 28,1 % | 16,7 % |
| 3-3-1-1-0 | 8 | 40,6 % | 20,8 % | 12,5 % |
| **3-2-1-1-1 (en production)** | **8** | **37,5 %** | **17,7 %** | **11,5 %** |
| 3-2-1-1-0 (7 chevaux) | 7 | 35,4 % | — | 9,4 % |

Le 9ᵉ cheval valait **+13,5 points de 5/5**. À 8 chevaux, la meilleure
répartition mesurée est `4-2-1-1-0` (16,7 % presse · 12,3 % archives,
`tools/huit.mjs`) — `3-2-1-1-1` est donc retenue **par décision de
l'utilisateur, pas par le chiffre**. Le bootstrap apparié le dit sans détour :
`3-2-1-1-1` n'est meilleure que dans **3,5 %** des tirages. Les deux sont dans la
latitude écrite par la méthode (§11.9 : G1 2 ou 3 · G2 2 ou 3 · G5 0 ou 1).

#### Le ticket fait vraiment 8 — vérifié, pas supposé

`tools/verif-8.mjs` rejoue le **vrai** `buildGrid` + le **vrai** `remplirGrille`
sur les 96 courses :

```
ticket exactement 8 : 96  (100 %)   ·  plus court 0  ·  plus long 0
cheval en double    : 0             ·  bloc hors quota 0
```

C'est la contre-vérification qui manquait au §11.29 (le bug `obligatoire: true`
de G3 y avait mesuré un ticket de 9 en croyant en mesurer un de 8).

#### G4 repasse au MARCHÉ — le seul vrai gain du jour

Le commentaire de `remplirGrille` disait « G4-G5 marché » depuis le 19/10 mais
la table `CHOIX_DU_BLOC` portait `G4: 'carnet'`. Ce désaccord est corrigé **dans
le sens de la mesure** :

| G4 rempli par | quinté | 1ʳᵉ moitié | 2ᵈᵉ moitié | bootstrap |
|---|---|---|---|---|
| **le marché (la cote)** | **11,6 %** | **12,8 %** | **10,4 %** | **95,5 % mieux** |
| le carnet (place de presse) | 8,4 % | 8,5 % | 8,3 % | — |

C'est le **seul** bloc dont l'échange tient dans les deux moitiés **et** au
bootstrap. À 8 chevaux, c'est ce qui rend les 11,5 % de 5/5 du §11.23.

#### Le choix dans les blocs — 243 combinaisons, et c'est fermé

`tools/choix32111.mjs` (95 courses à blocs pleins, mesure bloc par bloc, une
seule règle change à la fois) :

| bloc | production | meilleure alternative | verdict |
|---|---|---|---|
| G1 | carnet · 11,6 % | marché 8,4 % · fusion 11,6 % | rien ne gagne |
| G2 | carnet · 11,6 % | marché 7,4 % · cases #1·#3 9,5 % | rien ne gagne |
| G3 | carnet · 11,6 % | marché 10,5 % · case #2 7,4 % | rien ne gagne |
| G4 | marché · 11,6 % | carnet 8,4 % · case #1 10,5 % | **le marché** |
| G5 | marché · 11,6 % | 2ᵉ cote 12,6 % | +1 pt, bootstrap **56,7 %** = bruit |

> **Verdict de l'outil :** *« Aucun choix de bloc ne bat la production de façon
> significative. Les +1 point du meilleur candidat (G5 2ᵉ cote) tombent à
> 56,7 % au bootstrap — du bruit (§11.24). »*

⚠ Un candidat n'entre **que** s'il gagne dans les deux moitiés **et** si le
bootstrap le préfère dans **≥ 80 %** des 10 000 tirages. Sans ce second filtre,
`G2 #1·#3` et `G5 2ᵉ cote` entraient sur un point de hasard — c'était le défaut
de la première version de l'outil.

#### Et G5 ? — nécessité de PLAFOND, siège qui ne tient pas

`tools/huit.mjs` (§11.35) mesure la question posée par l'utilisateur :

```
un cheval de G5 (P13+) finit dans les cinq : 38,5 % des courses
→ sans siège G5, un ticket de 8 plafonne à 61,5 % de quinté, quoi qu'il contienne

le meilleur cheval du marché dans G5 arrive top-5 : 13,5 %
quand un G5 arrive, le siège le trouve          : 35,1 %
```

**La nécessité est réelle** (le plafond), **mais le siège n'est pas la porte**
(il ne tient le cheval qu'une fois sur trois). G5 reste dans le ticket parce que
la méthode le veut — et parce que sans lui 38,5 % des courses deviennent
mathématiquement impossibles.

#### Fichiers

| Fichier | Rôle |
|---|---|
| `tools/verif-8.mjs` | **le ticket fait-il 8 ?** — vrai `buildGrid` + vrai `remplirGrille`, 96 courses |
| `tools/choix32111.mjs` | le choix bloc par bloc à 3-2-1-1-1 → `data/choix32111.json` |
| `tools/huit.mjs` | la nécessité de G5 + les 121 répartitions de 8 → `data/huit.json` |
| `tools/experience-g5.mjs` | `Q_BASE` = 3-2-1-1-1 · variantes 43110 / 42110 / g5g2 / sans / B3 / B4 |
| `tools/fiabilite.mjs` | la fiabilité de production → `data/fiabilite.json` |

```
node tools\verif-8.mjs
node tools\choix32111.mjs
node tools\fiabilite.mjs
node tools\huit.mjs
```

⚠ **Le front ne tape plus aucun quota à la main** : `QUOTAS_TXT` et `NB_TICKET`
sont dérivés de `GROUPES` dans `QuinteGrille.jsx`. Le passage 4-3-1-1-0 → 9
chevaux avait laissé sept phrases périmées dans la page ; ce n'est plus
possible.

---

### 11.41 🎯 LA COTE COURTE COUPÉE — le seul choix qui ressemble à un caprice, mesuré (28/10/2026)

> Réaction de l'utilisateur devant la grille du 28/10 :
> **« نفس الاختيارات … اختيارات عشوائية »** — le ticket n'a pas bougé et les
> résultats restent 3/5 ou 2/5.

#### ① D'abord : le moteur n'est pas aléatoire, et voici son arithmétique

La grille du 28/10 (15 partants, presse lue à la source) :
`3(P1) 8(P2) 10(P3) 6(P4) 9(P5) 2(P6) 14(P7) 11(P8) 12(P9) 1(P10) 5(P11) 4(P12) 7(P13) 13(P14) 15(P15)`.

⚠ Les **cases** de la grille ne sont pas les rangs de presse (§11.14) : P1 = 3
(impair) → la ligne du haut porte les impairs, le bas les pairs. Les blocs
contiennent donc :

| bloc | cases (par slot) | triées par rang de presse |
|---|---|---|
| G1 | 3 · 8 · 9 · 10 | 3 (P1) > 8 (P2) > **10 (P3)** > 9 (P5) |
| G2 | 11 · 6 · 1 · 2 | 6 (P4) > **2 (P6)** > 11 (P8) > 1 (P10) |
| G3 | 5 · 14 | **14 (P7)** > 5 (P11) |
| G4 | 7 · 12 | **12** (marché : 18,7 contre 33,7) |
| G5 | 13 · 4 · 15 | **4** (marché) |

→ ticket **3 · 8 · 10 · 6 · 2 · 14 · 12 · 4**. Le n°9 (cote **1,81**, favori du
marché) sort parce qu'il n'est que **P5** dans la presse et que G1 n'a que
**3 sièges sur 4**. C'est le quota qui le coupe, pas le hasard.

#### ② Le coût de cette coupure — `tools/cote-courte.mjs`, 95 Quintés

| cases coupées par la production | combien de fois | arrive top-5 | arrive top-3 | gagne |
|---|---|---|---|---|
| cote ≤ 3 | **1** / 95 | 0 % | 0 % | 0 % |
| cote ≤ 4 | 5 / 95 | 20 % | 0 % | 0 % |
| cote ≤ 5 | 9 / 95 | 55,6 % | 22,2 % | 11,1 % |
| cote ≤ 8 | 43 / 95 | 48,8 % | 30,2 % | 14 % |
| cote ≤ 10 | 80 / 95 | 37,5 % | 25 % | 10 % |

**Couper une cote très courte est rare (1 fois sur 95) et ne coûte presque
rien** : les 5 cotes ≤ 4 coupées ne sont jamais entrées dans les 3 et une seule
fois dans les 5. Le « caprice » du 28/10 est donc l'exception, pas la règle.

#### ③ La règle testée — et refusée

« Cote protégée » : si une case non retenue du bloc a une cote ≤ seuil, elle
prend la place de la case retenue la moins bien classée à la presse **du même
bloc** (le quota ne bouge jamais).

| règle | podium | quinté | ≥4 | moitiés (quinté) | bootstrap |
|---|---|---|---|---|---|
| production 3-2-1-1-1 | **37,9 %** | 11,6 % | 41,1 % | 12,8 / 10,4 | — |
| cote ≤ 4 protégée | 36,8 % | 11,6 % | 38,9 % | 12,8 / 10,4 | 0 % |
| cote ≤ 5 protégée | 37,9 % | **12,6 %** | 41,1 % | 12,8 / 12,5 | **64,3 %** |
| cote ≤ 6 protégée | 37,9 % | 12,6 % | 42,1 % | 12,8 / 12,5 | 64,3 % |
| cote ≤ 8 protégée | 35,8 % | 12,6 % | 42,1 % | 10,6 / 14,6 | 61 % |
| cote ≤ 10 protégée | 34,7 % | 7,4 % | 41,1 % | 6,4 / 8,3 | 5,5 % |

La meilleure (`≤ 5`) gagne **un seul quinté** (12,6 contre 11,6) et le bootstrap
la préfère dans **64,3 %** des tirages — sous le seuil de 80 %. **La production
reste.**

#### ④ Ce que ça dit vraiment : le plafond de la structure

La **borne haute** — le meilleur choix possible dans chaque bloc, calculé avec
l'arrivée connue d'avance — donne **podium 94,7 % · quinté 76,8 %**. Autrement
dit : la structure 3-2-1-1-1 *contient* le quinté 3 fois sur 4 ; le moteur n'en
trouve que **11,6 %**. Tout l'écart est dans **QUI** entre — et c'est
précisément ce qu'aucune des règles mesurées (§11.24 : 243 puis 3 125
combinaisons ; §11.40 : 16 combinaisons carnet/marché) ne sait faire.

**Conséquence à dire clairement :** à 8 chevaux, la moyenne est **3,29/5** et le
5/5 tombe **11,6 %** du temps. Un résultat de **3/5 ou 2/5 est le résultat
NORMAL**, pas une panne du moteur. Le seul levier mesuré qui augmente le 5/5
reste le **nombre de cases** (12 chevaux → 69 % du quinté, §11.25) — c'est une
décision de l'utilisateur, pas du moteur.

| Fichier | Rôle |
|---|---|
| `tools/cote-courte.mjs` | le coût de la coupure + la règle « cote protégée » → `data/cote-courte.json` |

```
node tools\cote-courte.mjs
```

---

### 11.42 🧠 « DU LOGIQUE ET DE L'ILLOGIQUE » — la carrière seule, mesurée (28/10/2026)

> Instruction de l'utilisateur, après le refus des règles de marché :
> **« هذه القواعد فاشلة لأنها تعتمد كوط وسوق، كله تضليل، لأن الكوط ليس ثابت.
> يجب العمل بشيء من المنطق وشيء من اللامنطق، وليس هذه القواعد المتحجرة
> ونقول مستحيل. »**

Deux refus à respecter : **la cote** (elle bouge) et **le « c'est impossible »**.
On mesure donc un choix qui ne lit **ni la cote ni la presse** — uniquement la
carrière du cheval — et qui garde une part d'illogisme.

#### ① Le problème de la mesure précédente : on avait coupé 3 critères sur 6

§11.24 avait conclu « la carrière ne choisit pas mieux que le carnet ». Mais
`tools/carriere-archive.mjs` ne gardait que `date · track · dist · place · type`
des 5 dernières courses → le score physique ne pouvait PAS être calculé.

L'API casacourses donne beaucoup plus **dans le même appel** :

| niveau | champs |
|---|---|
| course | `track_condition` (**terrain du jour**) · `class` · `prize` · `distance` · `type` |
| partant | `number` · `weight` (**poids porté**) · `horse_age` · `forms[]` |
| forme | `date` · `track` · `distance` · `place` · `racetype` · `weight` · **`raceprizemoney` (allocation = le niveau couru)** · `winners` |

`tools/carriere-v2.mjs` recollecte les 96 Quintés avec ces champs →
`data/corpus/carriere-v2.json` (96/96 collectés, 0 erreur ; allocation sur
96,1 % des cases, piste sur 57 %).

**Ce qu'on peut calculer pour de vrai :**

| critère | poids | état |
|---|---|---|
| FORME UTILE (±400 m, 1/(1+0,55·i)) | 22 % | ✅ |
| DISTANCE pratiquée | 22 % | ✅ |
| PISTE (hippodrome déjà couru 60 % + résultat 40 %) | 18 % | ✅ |
| NIVEAU (allocation du jour / ses 2 dernières ; > 1,5 = montée) | 13 % | ✅ |
| TERRAIN | 13 % | ❌ pas dans les courses passées |
| CORDE | 12 % | ❌ `number` = numéro de selle |

→ le score est normalisé sur les **75 % réellement disponibles**.

#### ② Trois définitions différentes de la « logique » — et le MÊME résultat

`tools/choix-logique.mjs` (forme+distance, puis +piste) et
`tools/choix-physique-complet.mjs` (les 4 critères) : **95 Quintés**, blocs
pleins, une seule chose change à la fois.

| règle | G1 | G2 | G3 | G4 | G5 | **partout** |
|---|---|---|---|---|---|---|
| LOGIQUE forme+distance | **13,7 %** | 7,4 % | 10,5 % | 10,5 % | 11,6 % | 7,4 % |
| LOGIQUE forme+distance+piste | **13,7 %** | 7,4 % | 8,4 % | 9,5 % | 10,5 % | 4,2 % |
| PHYSIQUE 4 critères (75 %) | **13,7 %** | 7,4 % | 8,4 % | 9,5 % | 10,5 % | 3,2 % |
| ILLOGIQUE (les pires) | 4,2 % | 7,4 % | 10,5 % | 7,4 % | 10,5 % | 5,3 % |
| MIXTE ((k−1) logiques + le pire) | 6,3 % | 10,5 % | 8,4 % | 9,5 % | 10,5 % | 3,2 % |
| **carnet / marché (production)** | **11,6** | **11,6** | **11,6** | **11,6** | **11,6** | **11,6** |

Référence : podium 37,9 % · quinté 11,6 % · ≥4 41,1 % · moitiés 12,8 / 10,4.

**Trois scores indépendants donnent exactement la même chose : `13,7 %` en G1,
et seulement là.** Ce n'est pas de la chance d'échantillon — trois formules
différentes convergent — mais ce n'est pas non plus une règle, parce que :

- le gain en G1 est **+2,1 points de quinté** … contre **−7,4 points de podium**
  (30,5 % au lieu de 37,9 %) ;
- le bootstrap apparié préfère G1=physique dans **69,5 %** (4 critères) et
  **77,8 %** (forme+distance) des 10 000 tirages — **sous le seuil de 80 %** ;
- les quarts : **2/4 gagnés, 0 perdu** (jamais pire, mais pas 3/4).

**Et surtout : le physique est PIRE que le carnet dans les quatre autres blocs.**
Le scénario « physique partout » tombe à **3,2 %** de quinté — c'est-à-dire que
le haut du carnet n'est pas un ordre arbitraire : c'est le seul ordre qui suit
l'arrivée dans G2, G3, G4 et G5.

#### ③ L'illogisme, mesuré pour ce qu'il vaut

« Prendre le cheval que la logique rejette le plus fort » est le prix exact de
l'illogisme :

| règle | quinté | podium | bootstrap |
|---|---|---|---|
| les k pires notes, **partout** | 5,3 % | 16,8 % | 6 % |
| (k−1) meilleures + la pire, partout | 3,2 % | 22,1 % | 0,7 % |
| la production | 11,6 % | 37,9 % | — |

Un cheval sur 8 qui serait choisi **contre** la logique coûte 8,4 points de
quinté. L'illogisme ne s'ajoute donc pas : il se paie. Ce que la mesure ne dit
pas — et c'est le vrai manque — c'est qu'**aucun des deux n'a l'information
décisive** : le terrain et la corde, 25 % de la méthode, absents de l'API.

#### ④ Le verdict, sans « impossible »

- **Rien ne passe le filtre complet** (2/2 moitiés + bootstrap ≥ 80 % + 3/4
  quarts). La règle de production reste `G1-G3 carnet · G4-G5 marché`.
- Le seul signal qui revient dans les trois mesures est **G1 = les 3 meilleurs
  physiques** : +2,1 points de quinté, −7,4 de podium, jamais pire dans un quart.
  **C'est une décision de l'utilisateur, pas du moteur** : la métrique dense
  (podium, §11.25) dit que l'échange est perdant.
- La borne haute reste **76,8 %** de quinté (choix parfait, arrivée connue). Le
  moteur en trouve 11,6 %. L'écart **n'est pas dans les quotas** — il est dans une
  information que ni la cote, ni la presse, ni la carrière automatique ne portent :
  le terrain du jour et la corde de départ.

| Fichier | Rôle |
|---|---|
| `tools/carriere-v2.mjs` | recollecte la carrière complète (terrain du jour, allocation, poids) → `data/corpus/carriere-v2.json` (hors git) |
| `tools/choix-logique.mjs` | LOGIQUE / ILLOGIQUE / MIXTE en forme+distance, puis +piste → `data/choix-logique.json` |
| `tools/choix-physique-complet.mjs` | les 4 critères sur 6 → `data/choix-physique-complet.json` |

```
node tools\carriere-v2.mjs
node tools\choix-logique.mjs
node tools\choix-physique-complet.mjs
```


