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

### 13.3 ⚠ Les 5 règles de sécurité (learned the hard way)

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