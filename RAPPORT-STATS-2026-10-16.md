# Rapport — Correction des statistiques & conservation de l'empreinte

**Page concernée : `/quinte` uniquement** (le couplé `/coply` n'est pas touché).
**Date : 16/10/2026.** Cahier des charges : « Correction des statistiques et amélioration du moteur de pronostic Bahja TURF ».

---

## 1. Fichiers modifiés

| Fichier | Nature |
|---|---|
| `src/lib/quinte.js` | moteur + statistiques (source de la page) |
| `backend/QUINTE/quinte.js` | **miroir** — même bloc `TESTS_EMPREINTE → computeStats` (identique à l'octet sur ce bloc) |
| `frontend/QUINTE/QuinteGrille.jsx` | onglet **Statistiques** — présentation |
| `tools/test-nonregression.mjs` | **nouveau** — harnais de non-régression (§4) |
| `tools/lab-variantes.mjs` | **nouveau** — labo des variantes de remplissage (LOO) |
| `data/nr-avant.json`, `data/nr-apres.json` | instantanés avant / après |

> Le moteur de sélection (`remplirGrille`, quotas 3-2-1-1-1) **n'a pas été touché** — §20.2 d'AGENTS.md : aucun feedback vers le moteur sous 30 courses clôturées.

---

## 2. Fonctions / objets modifiés

### 2.1 `computeStats(records)` — `src/lib/quinte.js` (+ miroir)

Ajout des champs explicites à **chaque `parPlace[r]`** (sans toucher aux champs historiques lus par le moteur) :

| Champ | Dénominateur | Règle |
|---|---|---|
| `courses_valides` | — | N = nombre de courses retenues |
| `n_top5` | — | = ancien `n` |
| `victoires` | — | 1res places du P |
| `podiums` | — | 1er+2e+3e du P |
| `p_victoire_conditionnel` | `n_top5` | **—** si `n_top5 = 0` |
| `p_victoire_global` | `courses_valides` | **—** si N = 0 |
| `p_podium_conditionnel` | `n_top5` | **—** si `n_top5 = 0` |
| `p_top5_global` | `courses_valides` | **—** si N = 0 |

**Champs historiques inchangés** (le moteur les lit) : `n`, `p[]` (distribution conditionnelle, base `n_top5`), `top3` (conditionnel), `top5` (global).

### 2.2 `parPlace` → dénominateurs clarifiés

`top3` et `p[]` = CONDITIONNELS (base `n_top5`) ; `top5` = GLOBAL (base N). L'interface l'affiche désormais explicitement.

### 2.3 `parGroupe` (`GROUPES`) — nouveaux indicateurs §2.4

| Champ | Dénominateur |
|---|---|
| `presence_course` | courses valides (≥1 cheval du groupe dans le top 5) |
| `part_victoires` | 1 victoire / course → `courses_valides` |
| `part_podiums` | 3 podiums / course → `3 × courses_valides` |
| `part_places_4_5` | 2 places 4-5 / course → `2 × courses_valides` |

Champs historiques `part1` / `part23` / `part45` / `present` conservés (compat). **—** si dénominateur nul.
`presence_course` compte des **courses**, les trois autres des **places** : l'interface le signale (interdit de les comparer).

### 2.4 Cohérence des données §2.3 — `computeStats().diagnostic`

```
coursesExaminees · coursesRetenues · coursesEcartees
doublons (+ doublonsDetail[{date, nums}])         ← arrivées en doublon
chevauxAbsents (+ absentsDetail[{date, nums}])    ← arrivants absents de la grille
```
Seules les courses où **les 5 arrivants se relient à une position** entrent dans les dénominateurs (les autres sont comptées « écartées », jamais mélangées). N = **14** sur 14 examinées aujourd'hui (0 doublon, 0 absent).

### 2.5 Empreinte §3 — les **4 tests indépendants** (nouveau `TESTS_EMPREINTE` + `computeStats().empreinte`)

```
trio : (P1,P2,P3)   ·   p12 : (P1,P2)   ·   p13 : (P1,P3)   ·   p23 : (P2,P3)
```
Chaque test est conservé **séparément** (aucune moyenne, aucune fusion) et enregistre : `configurations`, `n`, `nonEvaluables`, `top3` (tous), `top5` (tous), `un` (≥1), `brut`, `debut`/`fin` (période).
Les fonctions historiques `joint()` / `combosJoint()` sont **conservées telles quelles**.

### 2.6 `frontend/QUINTE/QuinteGrille.jsx` — onglet Statistiques

- En-tête : N **valide(s)** + examinées/écartées + alerte doublons/absents.
- Tableau par position : ajout `n_top5`, `victoires`, `podiums` ; libellés `P(podium | top5)` / `P(top5 | N)`.
- **Nouveau tableau « Indicateurs explicites »** : les 8 champs §2.2 avec **« — »** si dénominateur nul.
- Tableau par groupe : `présence_course` / `part_victoires` / `part_podiums` / `part_places_4_5` + ligne de dénominateurs.
- **Nouveau bloc « Empreinte — 4 tests indépendants »** (n, non éval., tous top3, tous top5, ≥1 top3, période).

### 2.7 `remplirGrille(grille, classement, discipline, cotes, stats)` — `src/lib/quinte.js` (+ miroir)

Le score de remplissage passe de `0.9 × taux_podium(P) + 0.1 × marché` à **`0.9 × FORCE(P) + 0.1 × marché`**, avec :

```js
FORCE(P) = max(parPlace[P-1].p[0..4]) / 100,  0 si n_top5 < 2
```

Tout le reste de `remplirGrille` (repli sans stats, quotas, `ordonnerParStats`) est **inchangé**. Détail avant/après en §3bis.

---

## 3. Rapport comparatif AVANT / APRÈS (§4) — mêmes 14 courses

```
courses valides            : 14 → 14          (=)
moteur 5/5 4/5 3/5 2/5     : {5:0,4:5,3:6,2:3,1:0,0:0} → idem   (=)
gagnant pris               : 11 → 11          (=)
trio exact                 : 6 → 6            (=)
moyenne /5                 : 3.143 → 3.143    (=)
tickets identiques         : OUI              (=)
parPlace (n,p,top3,top5)   : IDENTIQUE        (=)  → ordre du ticket inchangé
parGroupe (anciens champs) : IDENTIQUE        (=)
```

**Aucune dégradation** sur les statistiques : les seules différences sont des **champs ajoutés** (nouveaux indicateurs et empreinte). Aucun seuil, aucun quota n'a bougé. Le changement de **sélection** est mesuré séparément en §3bis.

---

## 3bis. Amélioration du moteur — R8 **FORCE(P)** (§1 du cahier des charges)

### Le problème
Le moteur remplissait chaque bloc par `0.9 × taux_podium(P) + 0.1 × marché` — une table « podium » que **l'utilisateur n'avait jamais demandée**. Sa règle (§11.17) est :

```
FORCE(P) = la plus forte des P(1er…5e) de la CASE (table parPlace)
score R8 = 0.9 × FORCE(P) + 0.1 × marché
```

### Le protocole (anti-fuite)
Chaque course est jugée avec les statistiques **sans elle** (leave-one-out) : en production, la course à jouer n'est jamais dans son propre apprentissage.
Les quotas `3-2-1-1-1` sont **inchangés** ; seul le score de remplissage change.

### Avant / Après — vrai moteur `remplirGrille`, 14 courses (LOO)

| | 5/5 | 4/5 | 3/5 | 2/5 | x/5 | moyenne | 1er pris | trio exact |
|---|---|---|---|---|---|---|---|---|
| **AVANT** (podium) | 0 | 4 | 7 | 3 | **43/70** | 3.07 | 11/14 | 4/14 |
| **APRÈS** (force) | **2** | 7 | 5 | 0 | **53/70** | 3.79 | 12/14 | 6/14 |

**+10 arrivants**, **+2 Quintés 5/5** (les deux premiers du corpus), **+1 gagnant**, **+2 trios**. Le déplacement va vers le haut (4/5 et 5/5 montent, 2/5 tombe à zéro), jamais vers le milieu.

> ⚠ En **non-LOO** (stats incluant la course testée) l'écart s'inverse — c'est le **leakage** : la course gonfle la force de sa propre case. C'est pourquoi toute la décision est prise en LOO. En production, la cote/arrivée du jour n'est pas encore connue : le régime réel est celui du LOO.

### Autres variantes testées (LOO, `tools/lab-variantes.mjs`)

| variante | x/5 | 5/5 | 1er | trio |
|---|---|---|---|---|
| podium (avant) | 43/70 | 0 | 11/14 | 4/14 |
| **force (retenu)** | **53/70** | **2** | **12/14** | **6/14** |
| force seul (sans marché) | 54/70 | 2 | 12/14 | 7/14 |
| podium seul | 41/70 | 0 | 11/14 | 4/14 |
| cote seule | 43/70 | 0 | 9/14 | 5/14 |
| 0.5 podium + 0.5 marché | 47/70 | 0 | 12/14 | 6/14 |

`force seul` est à +1 (à la limite du bruit) : on garde **la règle de l'utilisateur** (0.9 force + 0.1 marché), pas une variante choisie sur 14 courses.

---

## 4. Jeu de tests reproductible

```bat
cd C:\bahja-TURF

:: 1) état AVANT (déjà archivé) — ou sur une vieille révision
node tools\test-nonregression.mjs --out=data\nr-avant.json

:: 2) rapport complet (positions, groupes, empreinte, diagnostics, moteur)
node tools\test-nonregression.mjs

:: 3) état APRÈS
node tools\test-nonregression.mjs --out=data\nr-apres.json

:: 4) comparaison avant/après (non-régression)
node tools\test-nonregression.mjs --diff=data\nr-avant.json,data\nr-apres.json
```

Résultat de référence du harnais (16/10/2026, 14 courses) :

```
POSITION  courses_valides  n_top5  victoires  podiums  P(vic|top5)  P(vic|glob)  P(pod|top5)  P(top5|glob)
P1              14          11        4        9         36.4        28.6         81.8         78.6
P2              14           5        2        5           40        14.3          100         35.7
...
P16..P20        14           0        0        0            —           0            —            0     ← « — » quand le dénominateur est nul

GROUPE            présence_course  part_victoires  part_podiums  part_places_4_5
G1 · P1-P4              93              64            52               32
G2 · P5-P8              93               7            21               43
G3 · P9-P10             50              21            14                4
G4 · P11-P12            43               0             7               14
G5 · P13-P20            29               7             5                7

EMPREINTE (%), période 2026-10-01 → 2026-10-15
trio P1-P2-P3 : tous top3 0   · tous top5 14  · ≥1 top3 79   · non éval. 0
P1-P2         : tous top3 36  · tous top5 36  · ≥1 top3 64   · non éval. 0
P1-P3         : tous top3 7   · tous top5 43  · ≥1 top3 79   · non éval. 0
P2-P3         : tous top3 0   · tous top5 14  · ≥1 top3 57   · non éval. 0
```

> ⚠ Les valeurs de l'empreinte sont des **pourcentages** (2/14 = 14 %).

---

## 5. Ce qui n'a PAS été fait (et pourquoi)

- **Les quotas `3-2-1-1-1` n'ont pas bougé** (§11.16) : seul le score de remplissage a changé.
- **Le couplé (`/coply`) n'est pas touché** — moteurs/archives séparés, pas de mélange.
- **Aucun autre poids/seuil n'a été choisi sur les 14 courses** : le seul changement appliqué est la règle **imposée par l'utilisateur** (§11.17), et il est mesuré en LOO. Les variantes mieux notées de +1 (à la limite du bruit) sont écartées exprès.
- **Le seuil « 30 courses » est aboli (16/10/2026, AGENTS.md §20.2)** : on itère sur le moteur dès maintenant, à condition que chaque mesure soit faite **hors apprentissage (LOO)**. Le ticket reste celui affiché au moment de parier.
