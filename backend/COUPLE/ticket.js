// backend/COUPLE/ticket.js — TICKET-GROUPE (12/10/2026), côté page.
// Importé par frontend/COUPLE/Couple.jsx UNIQUEMENT. Ne pas partager.
// AUCUN poids, AUCUNE moyenne : par test (trio,P12,P13,P23), les top-K
// configs de l'artefact (rangs de marché) sont mappées aux chevaux du jour.
// Le ticket = 4 ensembles + leur intersection. K=10 par défaut (mesuré :
// tools/groupe-ticket.mjs — K10 domine K5 sur les 4 tests).

/* Même règle de cote que moteur.js (08/10/2026) : coteRef d'abord —
 * seule du même type que cote_pmu ; la « Cotes » du jour est inutilisable. */
function coteDe(p) {
  const v = p.coteRef ?? p.cote_pmu ?? null
  const n = Number(v)
  if (Number.isFinite(n) && n > 0) return n
  const c = Number(p.cote)
  return Number.isFinite(c) && c > 0 ? c : Infinity
}
const coteValide = (x) => Number.isFinite(x) && x !== Infinity && x > 0

function rangsMarche(partants) {
  const ordre = (partants || [])
    .map((p) => ({ num: p.num, c: coteDe(p) }))
    .filter((x) => coteValide(x.c))
    .sort((a, b) => a.c - b.c || a.num - b.num)
  return {
    parNum: new Map(ordre.map((x, i) => [x.num, i + 1])),
    parRang: new Map(ordre.map((x, i) => [i + 1, x.num])),
  }
}

const POS = { trio: [0, 1, 2], p12: [0, 1], p13: [0, 2], p23: [1, 2] }

/**
 * ticketGroupe(partants, artefact, K=10) → par test : { configs: [{cfg,n,taux}],
 * chevaux: [nums...] } + intersection des 4 ensembles.
 * Une config non mappable (rang > nb cotes) est ignorée, jamais inventée.
 */
export function ticketGroupe(partants, artefact, K = 10) {
  if (!artefact || !artefact.tests) return null
  const { parRang } = rangsMarche(partants)
  if (parRang.size < 3) return null
  const jeux = {}
  for (const t of Object.keys(POS)) {
    const table = artefact.tests[t]
    if (!table) continue
    const prises = []
    for (const e of table.configs.slice(0, K)) {
      const w = String(e.cfg).split(',').map(Number)
      if (w.some((r) => !parRang.has(r))) continue
      prises.push({ cfg: e.cfg, n: e.n, taux: e.taux, chevaux: w.map((r) => parRang.get(r)) })
    }
    const chv = [...new Set(prises.flatMap((p) => p.chevaux))]
    jeux[t] = { configs: prises, chevaux: chv }
  }
  if (!Object.keys(jeux).length) return null
  const listes = Object.values(jeux).map((j) => new Set(j.chevaux))
  const intersection = listes[0] ? [...listes[0]].filter((n) => listes.every((s) => s.has(n))) : []
  return { K, jeux, intersection }
}
