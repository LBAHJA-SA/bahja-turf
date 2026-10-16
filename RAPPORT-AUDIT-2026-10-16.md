# RAPPORT — COMMENT ÉLEVER LES RÉSULTATS — 16/10/2026

> Réponse au cahier des charges. **Tout est reproductible** (§7).
> Tous les chiffres de décision viennent de la mesure de référence : la métrique
> **PAYANTE** de §11.18 (le 1-2-3 complet dans la grille), sur des vrais Quintés
> Global PMU France, en **LOO** (la course testée n'entre jamais dans ses propres
> statistiques).

---

## 0. ⚠ La correction préalable : la MÉTRIQUE

`AGENTS.md` §11.18 (05/10, 280 Quintés) tranche :

> §11.16 et §11.17 ont été mesurés sur **4 courses**, et avec la métrique `x/5`.
> **Les deux sont fausses.** `x/5` ne dit rien : **3/5 est une perte sèche**.

Une première version de ce travail a donc été mesurée en `x/5` sur 14 courses —
**c'est du bruit**, et elle a conduit à une conclusion fausse (§4.1). Tout ce qui
suit est mesuré en **PAYANTE**, sur 280 courses, avec les règles **déjà retenues**
par la méthode. Le rapport est organisé ainsi :

| § | Ce qui est mesuré | Sur quoi |
|---|---|---|
| 1 | la donnée et le code (défauts trouvés) | 14 coursés archivées + 96 à presse réelle |
| 2 | **le code suit-il la méthode ?** | 96 Quintés, LOO, PAYANTE |
| 3 | **où ça s'améliore, où ça régresse** | idem + la table top-k de §11.18 |
| 4 | ce que la grille ne peut pas faire | table structurelle §11.18 |
| 5 | annexes : intégrité, empreinte, dissection | 14 courses |

---

## 1. Ce que l'audit a trouvé

### 1.1 Le marché manquait sur 7 courses / 14 — corrigé

`data/cotes.json` ne couvrait que **7 dates sur 14**. Deux causes :

| Cause | Exemple | Effet |
|---|---|---|
| Clé Equidia non dérivable (`courseId` **numérique** = id casacourses) | `08/10` = `145899`, `15/10` = `146279` | aucun appel Equidia n'avait jamais été fait |
| Clé pointant la **mauvaise course** | `10/10` : le cache avait `R1_C4` (18 partants), le Quinté est `R1_C3` (14) | un marché étranger au Quinté |

→ `tools/backfill-cotes.mjs` **redérive** la clé par le chemin de la page
(`chargerCourseCC` → `cleEquidia`), **refuse** une clé dont le nombre de partants
ne colle pas à l'archive (±2), puis lit equidia.fr. → **15/15 dates** ont leur marché.

### 1.2 Des non-partants FANTÔMES dans la grille — corrigé

**37 des 96 courses à presse réelle (39 %)** voient la Synthèse citer un cheval
**qui n'est pas partant** (46 citations au total). Le harnais de référence de la
méthode les **filtre** (`mesure-quintes.mjs` : `presse.filter(n => cotes[n] > 1)`),
mais `buildGrid()` — le code de production — les **gardait** :

| Course | Fantôme | Ce que ça donnait |
|---|---|---|
| 09/10 | **n° 0** | `synthese = […,11,0]` → une case du carnet pour un cheval inexistant |
| 10/10 | **n° 18** | cité par la presse, absent des 14 partants |

Un fantôme occupe une **case du carnet** : il désaligne les rangs de presse (donc
les statistiques et l'empreinte) et peut se retrouver **dans le ticket**.
`buildGrid()` ne retient plus que les partants réels (`runners`) et ignore toute
valeur ≤ 0 — **le code fait maintenant ce que fait déjà le harnais de la méthode**.

### 1.3 Le harnais de non-régression lisait la mauvaise clé — corrigé

`tools/test-nonregression.mjs` chargeait le marché par `eq[r.courseId]` alors que
la page l'identifie par **`cle`** → 2 courses comptaient sans cote. Corrigé.

### 1.4 ⭐ Le CODE ne suit pas la MÉTHODE (mais ça ne coûte rien)

§11.19 est explicite :

> **`stats` ne change PAS la sélection — seulement l'ordre d'affichage.**

Or `remplirGrille()` a une branche `aStats` (**R8 = 0,9 × FORCE(P) + 0,1 × marché**)
qui fait exactement le contraire : dès qu'une archive existe (c'est-à-dire
**toujours** sur la page), ce sont les statistiques qui **choisissent** les
chevaux, plus le marché. La §11.17 « les q meilleures cotes du bloc » ne
s'applique donc **jamais** en pratique sur la page.

Mesure §2 : ce détour ne coûte **rien** (R8 ≈ la règle documentée, à ±3 points).
Ce n'est pas un problème de performance — mais **le code n'est pas la méthode
écrite**, et c'est à corriger pour que la mesure et la production parlent du même
moteur.

---

## 2. Le code suit-il la méthode ? — 96 Quintés, LOO, PAYANTE

Mêmes courses pour toutes les lignes (96 Quintés à Synthèse de presse réelle),
même métrique, ticket de 8 chevaux sauf mention.

### Cotes FINALES

| méthode | **PAYANTE** | couvre +4 | Quinté 5/5 | ch. |
|---|---|---|---|---|
| marché seul — top 9 des cotes *(hors grille)* | **51 %** | 31 % | 18 % | 9 |
| **quotas 4-2-1-1-1** (G1 plein) | **46 %** | 26 % | 13 % | 9 |
| **RETENUE + 1 cheval** (le 4ᵉ de G1) | **44 %** | 24 % | 13 % | 9 |
| marché seul — top 8 des cotes *(plafond de 8)* | 40 % | 19 % | 9 % | 8 |
| **CODE ACTUEL** (R8, avec archive) | **31 %** | 14 % | 6 % | 8 |
| R8 sans marché (force seule) | 30 % | 13 % | 4 % | 8 |
| **RÈGLE RETENUE** (q meilleures cotes, §11.17) | **28 %** | 15 % | 6 % | 8 |

### Cotes d'OUVERTURE (le matin — le plus proche d'un vrai pari)

| méthode | **PAYANTE** | couvre +4 | Quinté 5/5 | ch. |
|---|---|---|---|---|
| marché seul — top 9 | **50 %** | 31 % | 19 % | 9 |
| **quotas 4-2-1-1-1** | **47 %** | 30 % | 16 % | 9 |
| **RETENUE + 1 cheval** | **47 %** | 31 % | 14 % | 9 |
| marché seul — top 8 | 41 % | 24 % | 13 % | 8 |
| **CODE ACTUEL** (R8) | **34 %** | 16 % | 7 % | 8 |
| RÈGLE RETENUE | 31 % | 18 % | 8 % | 8 |
| R8 sans marché | 30 % | 13 % | 4 % | 8 |

Reproduction avec `node tools\mesure-moteur.mjs` (et `ouverture`).

**Ce que ça dit :**

1. **Le code (R8) est au niveau de la règle documentée** — 31 % contre 28 % en
   finales, 34 % contre 31 % en ouverture (+3 points, dans le bruit). Le
   §1.4 est donc une **divergence de forme, pas de performance**.
2. **Les deux sont sous le marché seul** (40-41 % pour 8 chevaux) : la structure
   de quotas coûte ~10 points, même en remplissant chaque bloc au mieux.
3. **Le marché sait choisir** : `R8 sans marché` (la force seule, 30 %) **égale**
   la règle retenue (28 %). Le marché, dans R8, n'apporte quasi rien — c'est la
   grille qui décide de tout.

---

## 3. ⭐ OÙ ÇA S'AMÉLIORE, OÙ ÇA RÉGRESSE (le livrable)

### 3.1 Ce qui RÉGRESSE : la surprise

| variante | PAYANTE (280 Quintés, §11.18) |
|---|---|
| les q meilleures cotes du bloc ← **retenu** | **30 %** |
| (q−1) cotes + ★ la surprise | **12 %** |

```
surprise : −18 points   ← elle remplace une cote à 8 et une à 14 par une à 50 (§11.18)
```

Une version antérieure de ce travail avait **ré-implémenté la surprise** dans le
moteur : **c'était une régression**, elle a été **retirée**. La mesure de §11.18
est confirmée indépendamment sur les 96 courses à presse réelle : **14 % contre 31 %**.

### 3.2 Ce qui S'AMÉLIORE : le 9ᵉ cheval

C'est **le seul levier qui reste** si les quotas `3-2-1-1-1` ne bougent pas.

| | 8 chevaux | 9 chevaux | écart |
|---|---|---|---|
| marché seul (§11.18, 280 courses) | **43 %** | **56 %** | **+13 pts** |
| règle retenue + 1 cheval (96, finales) | 28 % | **44 %** | **+16 pts** |
| règle retenue + 1 cheval (96, ouverture) | 31 % | **47 %** | **+16 pts** |
| quotas 4-2-1-1-1 (96, finales) | 28 % | **46 %** | **+18 pts** |
| quotas 4-2-1-1-1 (96, ouverture) | 31 % | **47 %** | **+16 pts** |

Méthode §11.3 : le ticket va de **6 à 9 chevaux**. À 9, `3-2-1-1-1` devient
`4-2-1-1-1` — le 4ᵉ de G1 entre. Et c'est exactement ce que dit la table top-k de
§11.18 :

| k | 7 | **8** | **9** | 10 | 12 |
|---|---|---|---|---|---|
| % payante | 33 % | **43 %** | **56 %** | 67 % | 84 % |

> ⚠ **La décision appartient à l'utilisateur** : passer à 9 chevaux touche la
> répartition `3-2-1-1-1`, que §11.16 protège. La mesure dit ce que coûte le
> refus — **13 à 18 points** — pas ce qu'il faut décider.

### 3.3 Ce qui ne change RIEN (donc à ne pas toucher)

| variante testée | PAYANTE | verdict |
|---|---|---|
| R8 (force 0,9 + marché 0,1) | 31-34 % | ≈ la règle retenue (±3) → **neutre** |
| surprise par **force** | 13 % | = la surprise par presse → **inutile** |
| surprise par **podium** | 13 % | idem → **inutile** |

La force statistique, dans le remplissage, **n'apporte rien de mesurable** :
30 % seule, 31 % avec R8, 28 % sans elle. C'est la confirmation de §11.16
(« le score physique n'a aucun pouvoir de tri ») — et c'est pourquoi §11.19
peut dire sans risque que `stats` ne sert qu'à **l'ordre**.

---

## 4. Ce que la grille ne peut pas faire — le fait structurel

§11.18 le mesure : le 1-2-3 se répartit par rang de cote.

| bloc | cotes | part du 1-2-3 |
|---|---|---|
| G1 | 1 – 4 | **51 %** |
| G2 | 5 – 8 | 27 % |
| G3 | 9 – 10 | 10 % |
| G4 | 11 – 12 | 7 % |
| G5 | 13 et + | 6 % |

La grille **spend 3 de ses 8 places** sur des cotes que le marché ne donne qu'à
**6-10 %**. C'est le plafond : 8 chevaux bien choisis ne peuvent pas dépasser le
top-8 du marché (43 %). Le seul progrès possible est **d'acheter des places**
(9 chevaux : 56 %), pas de mieux remplir les 8 — **c'est mesuré, pas supposé**.

---

## 5. Annexes — l'archive (14 courses)

### 5.1 Intégrité

| contrôle | résultat |
|---|---|
| arrivants absents de la grille | **0 / 14** |
| numéros dupliqués dans l'arrivée | **0 / 14** |
| marché complet par bloc | **14 / 14** (après backfill) |
| non-partants cités (fantômes) | **1 / 14** (09/10) → supprimés |

### 5.2 Les 4 tests d'empreinte (§2 du cahier des charges), séparés

Base = le carnet. Jamais fusionnés en une moyenne. ⚠ sur 14 courses = ordre de grandeur.

| test | n | non éval. | tous top3 | tous top5 | ≥1 top3 |
|---|---|---|---|---|---|
| Trio ordonné P1-P2-P3 | 14 | 0 | 0 % | 21 % | 79 % |
| Paire ordonnée P1-P2 | 14 | 0 | **36 %** | 43 % | 64 % |
| Paire ordonnée P1-P3 | 14 | 0 | 7 % | 50 % | 79 % |
| Paire ordonnée P2-P3 | 14 | 0 | 0 % | 21 % | 57 % |

Le seul test porteur est **P1-P2** (36 %).

### 5.3 Dissection — les échecs du gagnant (walk-forward, `x/5`)

⚠ métrique `x/5`, donc **à titre indicatif** : sur 13 courses, le gagnant manque
3 fois (10/10, 10/13, 10/14) — **toujours dans le quota de son bloc par la cote**,
donc jamais une erreur de découpage : une erreur de **choix**. C'est la
confirmation de §11.16.

---

## 6. ⛔ Ce que je n'ai PAS fait

- ❌ **Modifier les quotas** `3-2-1-1-1` (§11.16) : la variante `4-2-1-1-1` est
  **mesurée**, pas appliquée.
- ❌ **Rétablir la surprise** : mesurée deux fois comme une régression (−16 pts).
- ❌ **Décider sur `x/5`** : le piège qui a produit la première version de ce rapport.
- ❌ **Juger le code au-delà du bruit** : +3 points entre R8 et la règle retenue =
  bruit ; on ne réécrit pas un moteur pour +3 points sur 96 courses.

---

## 7. Reproductibilité

```powershell
# la mesure de référence (280 Quintés, métrique PAYANTE) — l'outil de la méthode
node tools\mesure-quintes.mjs                # cotes finales
node tools\mesure-quintes.mjs ouverture      # cotes du matin

# le code vs la méthode, 96 Quintés à presse RÉELLE, en LOO
node tools\mesure-moteur.mjs                 # cotes finales
node tools\mesure-moteur.mjs ouverture

# la donnée : marché manquant (15/15) — idempotent, vérifie les partants
node tools\backfill-cotes.mjs

# l'archive : intégrité + empreinte + marchés (x/5 = archivé, plus décisionnel)
node tools\audit-engine.mjs

npm run build
```

**Fichiers touchés**

| fichier | rôle |
|---|---|
| `src/lib/quinte.js` · `backend/QUINTE/quinte.js` | `buildGrid` : plus de non-partants dans la grille (37/96 courses concernées) |
| `tools/backfill-cotes.mjs` | **nouveau** — répare le marché (15/15), vérifie les partants |
| `tools/mesure-moteur.mjs` | **nouveau** — le code vs la méthode, métrique §11.18, LOO |
| `tools/audit-engine.mjs` | **nouveau** — intégrité, 4 tests d'empreinte, dissection |
| `data/cotes.json` · `public/data/cotes.json` | marché complété (15 dates) |
| `data/cles-equidia.json` | **nouveau** — clé retenue par date |
| `tools/test-nonregression.mjs` | clé de marché corrigée (`cle`, pas `courseId`) |

---

## 8. Conclusion — trois lignes

1. **La donnée** : 7 marchés manquants (corrigés) et des non-partants fantômes
   dans la grille sur 39 % des courses (corrigés) — le code fait maintenant ce que
   le harnais de la méthode faisait déjà.
2. **La surprise est une perte** (−16 points) : elle est retirée, et le code ne
   doit pas la réintroduire.
3. **Le seul progrès mesurable est d'acheter une 9ᵉ place** : **+13 à +18 points**
   de « course payante » selon la référence. Le reste — mieux remplir les 8 mêmes
   places — est **épuisé** : la force statistique n'apporte rien, et les quotas
   `3-2-1-1-1` dépensent 3 de leurs 8 places sur des cotes que le marché ne donne
   qu'à 6-10 %.
