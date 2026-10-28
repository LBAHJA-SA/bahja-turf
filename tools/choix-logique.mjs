/* =============================================================================
 * tools/choix-logique.mjs — LE CHOIX PAR LA CARRIÈRE : LOGIQUE + ILLOGIQUE
 *                            (28/10/2026)
 *
 * Direction donnée par l'utilisateur :
 *   « هذه القواعد فاشلة لأنها تعتمد كوط وسوق، كله تضليل، لأن الكوط ليس ثابت.
 *     يجب العمل بشيء من المنطق وشيء من اللامنطق، وليس هذه القواعد المتحجرة. »
 *
 * Autrement dit : le rang de presse et la cote sont des ORDRES EXTÉRIEURS, et la
 * cote bouge jusqu'au départ. On teste donc un choix qui ne regarde QUE le
 * cheval — sa carrière — et qui garde volontairement une part d'illogisme.
 *
 * LES BRIQUES (uniquement ce que la carrière automatique donne : distance,
 * hippodrome, place) :
 *
 *   LOGIQUE 1   forme utile (§4, critère 1 : ±400 m, poids 1/(1+0,55·i))
 *               + distance pratiquée (§4, critère 2)              → /10
 *   LOGIQUE 2   la même + la PISTE (§4, critère 3 : a-t-il déjà couru cet
 *               hippodrome, et comment) — les trois critères physiques que
 *               l'archive sait alimenter (22 + 22 + 18 = 62 % de la méthode,
 *               repondérés à 100 %). Terrain, niveau et corde ne sont PAS dans
 *               la carrière automatique : ils restent dehors.
 *   ILLOGIQUE   le cheval que la logique rejette le plus FORT dans le bloc
 *               (la pire note). C'est le « quelque chose d'illogique ».
 *
 * LES RÈGLES MESURÉES, bloc par bloc (une seule change à la fois) :
 *   logique · logique2      les k meilleures notes
 *   illogique · illogique2  les k pires notes (l'anti-règle, pour en mesurer le prix)
 *   mixte                   (k−1) meilleures + la pire          ← logique + illogique
 *   carnet · marche         les deux productions, pour comparer
 *
 * Et les scénarios GLOBAUX — la règle sur les cinq blocs à la fois, sans rien
 * emprunter ni au carnet ni au marché.
 *
 * Filtre de décision (§11.24, inchangé) : 2/2 moitiés + bootstrap ≥ 80 %
 * + 3/4 quarts chronologiques.
 *
 *   node tools\choix-logique.mjs   →   data/choix-logique.json + public/data/…
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : 0)
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const CAR = JSON.parse(fs.readFileSync('data/corpus/carriere96.json', 'utf8'))
const QUOTA = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }
const BLOCS = ['G1', 'G2', 'G3', 'G4', 'G5']
const PROD_CLE = { G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'marche', G5: 'marche' }
const PTS = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 }
/* poids de la méthode : forme 22 · distance 22 · piste 18 → normalisés à 100 */
const W = { forme: 22 / 62, dist: 22 / 62, piste: 18 / 62 }

/* ───────────── la piste : « a-t-il déjà couru cet hippodrome ? » ────────── */
const norm = (x) => String(x || '')
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z]/g, '')
const memePiste = (a, b) => {
  const x = norm(a), y = norm(b)
  if (x.length < 5 || y.length < 5) return false
  return x.includes(y) || y.includes(x)
}

/* ─────────────── ① les notes d'un cheval, par sa carrière ───────────────── */
function notes(chevaux, distance, track) {
  const out = {}
  for (const [num, ch] of Object.entries(chevaux || {})) {
    const runs = (ch && ch.runs) || []
    /* FORME UTILE — seules les courses à ±400 m de la distance du jour */
    const utiles = runs.filter((r) => r.dist && Math.abs(r.dist - distance) <= 400)
    const base = utiles.length >= 2 ? utiles : runs
    let s = 0, w = 0
    base.forEach((r, i) => {
      const p = PTS[r.place] ?? 0
      const wi = 1 / (1 + i * 0.55)
      s += p * wi
      w += wi
    })
    const forme = w ? s / w : 0                       /* 0..10 */
    /* DISTANCE pratiquée — la plus proche de celle du jour */
    const ecart = runs.length ? Math.min(...runs.map((r) => (r.dist ? Math.abs(r.dist - distance) : 9999))) : 9999
    const dist = ecart <= 100 ? 10 : ecart <= 200 ? 8 : ecart <= 400 ? 5 : ecart <= 600 ? 3 : 0
    /* PISTE — présence sur l'hippodrome + qualité de ce qu'il y a fait */
    const ici = track ? runs.filter((r) => memePiste(r.track, track)) : []
    const presence = ici.length >= 3 ? 10 : ici.length === 2 ? 7 : ici.length === 1 ? 4 : 0
    const meilleur = ici.length ? Math.min(...ici.map((r) => (r.place ? r.place : 99))) : 99
    const qualite = meilleur <= 2 ? 10 : meilleur <= 4 ? 7 : meilleur <= 8 ? 4 : 1
    const piste = ici.length ? +(0.5 * presence + 0.5 * qualite).toFixed(2) : 0
    out[Number(num)] = {
      forme: +forme.toFixed(2), dist, piste,
      note: +(0.5 * forme + 0.5 * dist).toFixed(2),
      note2: +(W.forme * forme + W.dist * dist + W.piste * piste).toFixed(2),
      ici: ici.length, utiles: utiles.length,
    }
  }
  return out
}

/* ─────────────────────────── ② le corpus ───────────────────────────────── */
const courses = []
let ecartees = 0, sansCarriere = 0
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12 || !q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number).filter((n) => cotes[n] > 1)
  if (nums.length < 10) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  const car = CAR[q.date + '|' + q.id]
  if (!car) { sansCarriere++; continue }
  let g
  try { g = buildGrid(syn, nums) } catch { continue }
  const n = notes(car.chevaux, Number(q.distance), q.track)
  const bloc = {}
  for (const gr of g.groupes) {
    bloc[gr.id] = gr.cases
      .map((c) => ({
        slot: c.slot, num: c.num, place: c.place, cote: cotes[c.num],
        note: n[c.num]?.note ?? 0, note2: n[c.num]?.note2 ?? 0,
        forme: n[c.num]?.forme ?? 0, piste: n[c.num]?.piste ?? 0, ici: n[c.num]?.ici ?? 0,
      }))
      .sort((a, b) => a.slot - b.slot)
  }
  if (bloc.G1?.length < 4 || bloc.G2?.length < 4 || bloc.G3?.length < 2
    || bloc.G4?.length < 2 || bloc.G5?.length < 1) { ecartees++; continue }
  courses.push({ date: q.date, distance: Number(q.distance), track: q.track, arrivee: q.arrivee.slice(0, 5), bloc })
}
const N = courses.length

/* ─────────────────────────── ③ les règles ──────────────────────────────── */
const cle = (champ, inv) => (a, b) => (inv ? a[champ] - b[champ] : b[champ] - a[champ]) || a.place - b.place
const TRIS = {
  carnet: (a, b) => a.place - b.place || a.slot - b.slot,
  marche: (a, b) => a.cote - b.cote || a.place - b.place,
  logique: cle('note'), logique2: cle('note2'),
  illogique: cle('note', true), illogique2: cle('note2', true),
}
const REGLES = {
  carnet: 'rang de presse (production G1-G3)',
  marche: 'cote la plus courte (production G4-G5)',
  logique: 'LOGIQUE — forme utile + distance',
  logique2: 'LOGIQUE — forme + distance + PISTE',
  illogique: 'ILLOGIQUE — pires notes forme+distance',
  illogique2: 'ILLOGIQUE — pires notes forme+distance+piste',
  mixte: 'MIXTE — (k−1) meilleures + la pire (forme+dist)',
  mixte2: 'MIXTE — (k−1) meilleures + la pire (forme+dist+piste)',
}

function choisir(cle, c, b) {
  const cases = c.bloc[b]
  const k = QUOTA[b]
  if (cle === 'mixte' || cle === 'mixte2') {
    const champ = cle === 'mixte' ? 'note' : 'note2'
    const sur = cases.slice().sort(cle0(champ))
    const garde = sur.slice(0, Math.max(1, k - 1))
    if (k < 2) return garde.slice(0, k).map((x) => x.num)
    const reste = cases.filter((x) => !garde.includes(x)).sort(cle0(champ, true))
    return garde.concat(reste.slice(0, 1)).slice(0, k).map((x) => x.num)
  }
  return cases.slice().sort(TRIS[cle]).slice(0, k).map((x) => x.num)
}
function cle0(champ, inv) { return cle(champ, inv) }

const choixProd = (c) => {
  const o = {}
  for (const b of BLOCS) o[b] = choisir(PROD_CLE[b], c, b)
  return o
}
const ticket = (o) => BLOCS.flatMap((b) => o[b])

/* ─────────────────────────── ④ les notes ───────────────────────────────── */
const note = (f, l = courses) => {
  let pod = 0, qui = 0, q4 = 0, ch = 0
  for (const c of l) {
    const s = new Set(f(c))
    ch += s.size
    if (c.arrivee.slice(0, 3).every((x) => s.has(x))) pod++
    if (c.arrivee.slice(0, 5).every((x) => s.has(x))) qui++
    if (c.arrivee.filter((x) => s.has(x)).length >= 4) q4++
  }
  return { pod: pct(pod, l.length), qui: pct(qui, l.length), q4: pct(q4, l.length), ch: +(ch / l.length).toFixed(2) }
}
const H1 = courses.slice(0, Math.floor(N / 2))
const H2 = courses.slice(Math.floor(N / 2))

function bootstrap(fa, fb, essais = 10000, graine = 24680) {
  let s = graine
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
  let mieux = 0, pire = 0, egal = 0, mieuxPod = 0
  for (let e = 0; e < essais; e++) {
    let qa = 0, qb = 0, pa = 0, pb = 0
    for (let j = 0; j < N; j++) {
      const c = courses[Math.floor(rnd() * N)]
      const sa = new Set(fa(c)), sb = new Set(fb(c))
      if (c.arrivee.slice(0, 5).every((x) => sa.has(x))) qa++
      if (c.arrivee.slice(0, 5).every((x) => sb.has(x))) qb++
      if (c.arrivee.slice(0, 3).every((x) => sa.has(x))) pa++
      if (c.arrivee.slice(0, 3).every((x) => sb.has(x))) pb++
    }
    if (qa > qb) mieux++; else if (qa < qb) pire++; else egal++
    if (pa > pb) mieuxPod++
  }
  return { mieux: +(100 * mieux / essais).toFixed(1), pire: +(100 * pire / essais).toFixed(1), egal: +(100 * egal / essais).toFixed(1), mieuxPod: +(100 * mieuxPod / essais).toFixed(1) }
}

const fProd = (c) => ticket(choixProd(c))
const ref = note(fProd)
const refH1 = note(fProd, H1), refH2 = note(fProd, H2)

const quarts = (f) => {
  const out = []
  for (let k = 0; k < 4; k++) {
    const a = Math.floor(k * N / 4), z = Math.floor((k + 1) * N / 4)
    const l = courses.slice(a, z)
    out.push({ quart: k + 1, n: l.length, prod: note(fProd, l).qui, regle: note(f, l).qui })
  }
  const m = out.filter((q) => q.regle > q.prod).length
  const p = out.filter((q) => q.regle < q.prod).length
  return { quarts: out, mieux: m, pire: p }
}

/* ─────────────────── ⑤ bloc par bloc + scénarios globaux ───────────────── */
const parBloc = {}
for (const b of BLOCS) {
  const lignes = Object.keys(REGLES).map((c2) => {
    const f = (c) => { const o = choixProd(c); o[b] = choisir(c2, c, b); return ticket(o) }
    const m = note(f)
    const h1 = note(f, H1), h2 = note(f, H2)
    const gagne2 = c2 !== PROD_CLE[b] && h1.qui >= refH1.qui && h2.qui >= refH2.qui
      && (h1.qui > refH1.qui || h2.qui > refH2.qui)
    const boot = c2 === PROD_CLE[b] ? null : bootstrap(f, fProd)
    const q = c2 === PROD_CLE[b] ? null : quarts(f)
    return {
      cle: c2, lib: REGLES[c2], ...m,
      dPod: +(m.pod - ref.pod).toFixed(1), dQui: +(m.qui - ref.qui).toFixed(1),
      h1, h2, gagne2, boot,
      quarts: q?.quarts ?? null, gagneQuarts: q?.mieux ?? null, perdQuarts: q?.pire ?? null,
    }
  }).sort((x, y) => y.qui - x.qui || y.pod - x.pod)
  parBloc[b] = lignes
}

const globaux = {}
for (const c2 of ['logique', 'logique2', 'mixte', 'mixte2', 'illogique', 'illogique2']) {
  const f = (c) => BLOCS.flatMap((b) => choisir(c2, c, b))
  const m = note(f)
  const h1 = note(f, H1), h2 = note(f, H2)
  const q = quarts(f)
  globaux[c2] = {
    ...m, h1, h2,
    boot: bootstrap(f, fProd),
    dPod: +(m.pod - ref.pod).toFixed(1), dQui: +(m.qui - ref.qui).toFixed(1),
    quarts: q.quarts, gagneQuarts: q.mieux, perdQuarts: q.pire,
  }
}

/* la borne haute : le choix parfait dans chaque bloc (arrivée connue) */
let oPod = 0, oQui = 0
for (const c of courses) {
  const s = new Set()
  for (const b of BLOCS) {
    c.bloc[b].slice().sort((x, y) => {
      const ax = c.arrivee.indexOf(x.num), ay = c.arrivee.indexOf(y.num)
      return (ax < 0 ? 99 : ax) - (ay < 0 ? 99 : ay)
    }).slice(0, QUOTA[b]).forEach((x) => s.add(x.num))
  }
  if (c.arrivee.slice(0, 3).every((x) => s.has(x))) oPod++
  if (c.arrivee.slice(0, 5).every((x) => s.has(x))) oQui++
}

/* ─────────────────────────── ⑥ le rapport ──────────────────────────────── */
const p = (x) => String(x).replace('.', ',')
const sgn = (x) => (x >= 0 ? '+' : '') + p(+x.toFixed(1))
console.log(`\nLE CHOIX PAR LA CARRIÈRE — LOGIQUE + ILLOGIQUE · ${N} Quintés (${ecartees} écartée(s) faute de blocs, ${sansCarriere} sans carrière)`)
console.log(`  référence (production 3-2-1-1-1) : podium ${p(ref.pod)} % · quinté ${p(ref.qui)} % · ≥4 ${p(ref.q4)} % · moitiés ${p(refH1.qui)} / ${p(refH2.qui)}\n`)

for (const b of BLOCS) {
  console.log(`  ${b} — ${QUOTA[b]} case(s) sur ${b === 'G5' ? '2 à 8' : '4'}`)
  for (const l of parBloc[b]) {
    console.log(`    ${l.lib.padEnd(48)} quinté ${String(p(l.qui)).padStart(5)} % (${sgn(l.dQui).padStart(5)}) · podium ${String(p(l.pod)).padStart(5)} % (${sgn(l.dPod).padStart(5)}) · ≥4 ${String(p(l.q4)).padStart(5)} % · moitiés ${p(l.h1.qui)} / ${p(l.h2.qui)}${l.gagne2 ? '  ← 2/2' : ''}${l.boot ? `  (boot ${p(l.boot.mieux)} %, quarts ${l.gagneQuarts}/4 −${l.perdQuarts})` : ''}`)
  }
  console.log('')
}

console.log('  LES SCÉNARIOS GLOBAUX — la règle sur les cinq blocs, sans presse ni cote')
for (const c2 of ['logique2', 'logique', 'mixte2', 'mixte', 'illogique', 'illogique2']) {
  const g = globaux[c2]
  console.log(`    ${REGLES[c2].padEnd(48)} quinté ${String(p(g.qui)).padStart(5)} % (${sgn(g.dQui).padStart(5)}) · podium ${String(p(g.pod)).padStart(5)} % (${sgn(g.dPod).padStart(5)}) · ≥4 ${String(p(g.q4)).padStart(5)} % · moitiés ${p(g.h1.qui)} / ${p(g.h2.qui)} · boot ${p(g.boot.mieux)} % · quarts ${g.gagneQuarts}/4 −${g.perdQuarts}`)
}
console.log('')

const meilleurBloc = BLOCS.map((b) => parBloc[b].find((l) => l.gagne2 && l.boot.mieux >= 80))
  .filter(Boolean)
console.log('  CE QUI PASSE LE FILTRE 2/2 + BOOTSTRAP ≥ 80 % (par bloc)')
console.log('   ' + (meilleurBloc.length
  ? meilleurBloc.map((l) => `${l.cle} → quinté ${p(l.qui)} % · boot ${p(l.boot.mieux)} % · quarts ${l.gagneQuarts}/4 −${l.perdQuarts}`).join('\n   ')
  : 'rien'))
console.log('')

const fort = meilleurBloc.filter((l) => l.gagneQuarts >= 3 && l.perdQuarts === 0)
console.log(`  borne haute (choix parfait) : podium ${p(pct(oPod, N))} % · quinté ${p(pct(oQui, N))} % · écart restant ${p(+(pct(oQui, N) - ref.qui).toFixed(1))} points\n`)

/* ─────────────────────── ⑦ le verdict (règle pré-déclarée) ─────────────── */
const gGlobal = Object.entries(globaux)
  .filter(([, g]) => g.h1.qui >= refH1.qui && g.h2.qui >= refH2.qui && g.boot.mieux >= 80 && g.gagneQuarts >= 3 && g.perdQuarts === 0)
  .sort((a, b) => b[1].qui - a[1].qui)
const meilleurGlobal = Object.entries(globaux).sort((a, b) => b[1].qui - a[1].qui)[0]

const verdict = gGlobal.length
  ? `Scénario global retenu : ${REGLES[gGlobal[0][0]]} — quinté ${gGlobal[0][1].qui} % contre ${ref.qui} %, moitiés ${gGlobal[0][1].h1.qui}/${gGlobal[0][1].h2.qui}, bootstrap ${gGlobal[0][1].boot.mieux} %, quarts ${gGlobal[0][1].gagneQuarts}/4.`
  : fort.length
    ? `Par bloc : ${fort.map((l) => l.cle).join(', ')} passe(nt) 2/2 + bootstrap ≥ 80 % + 3/4 quarts — à décider par l'utilisateur, car ${fort.map((l) => 'quinté ' + l.qui + ' % mais podium ' + l.pod + ' %').join(' ; ')}. Aucun scénario global ne tient.`
    : `Aucune règle de carrière ne bat la production. Le meilleur scénario global est « ${REGLES[meilleurGlobal[0]]} » : quinté ${meilleurGlobal[1].qui} % contre ${ref.qui} %, moitiés ${meilleurGlobal[1].h1.qui}/${meilleurGlobal[1].h2.qui}, bootstrap ${meilleurGlobal[1].boot.mieux} %, quarts ${meilleurGlobal[1].gagneQuarts}/4 −${meilleurGlobal[1].perdQuarts}. La carrière automatique ne voit que distance, hippodrome et place : sans terrain, sans niveau, sans corde, elle ne peut pas trier mieux que le carnet.`

const sortie = {
  outil: 'tools/choix-logique.mjs',
  le: new Date().toISOString().slice(0, 10),
  source: 'data/quintes.json + data/corpus/carriere96.json — presse réelle, blocs pleins',
  n: N, ecartees, sansCarriere, quotas: QUOTA, prod: PROD_CLE,
  definition: 'LOGIQUE 1 = forme utile (±400 m, poids 1/(1+0,55·i)) + distance pratiquée, 50/50. LOGIQUE 2 = forme + distance + piste (a-t-il déjà couru cet hippodrome, et comment), repondérés aux poids de la méthode (22/22/18 → 100 %). ILLOGIQUE = le cheval que la note rejette le plus fort dans le bloc. MIXTE = (k−1) meilleures notes + ce cheval-là. Aucune règle ne lit la cote ni la presse, sauf les deux lignes de comparaison carnet/marché.',
  reference: { ...ref, h1: refH1, h2: refH2 },
  blocs: Object.fromEntries(BLOCS.map((b) => [b, parBloc[b]])),
  globaux,
  oracle: { pod: pct(oPod, N), qui: pct(oQui, N) },
  verdict,
}
fs.writeFileSync('data/choix-logique.json', JSON.stringify(sortie, null, 1))
fs.writeFileSync('public/data/choix-logique.json', JSON.stringify(sortie, null, 1))
console.log('VERDICT\n  ' + verdict + '\n')
