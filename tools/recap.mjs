// Lecture Récapitulative de pronostics-turf.info + application du découpage
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' };

async function getRecap() {
  const html = await (await fetch('https://www.pronostics-turf.info/', { headers: UA })).text();
  const i = html.toUpperCase().indexOf('RECAPITULATIVE');
  if (i < 0) return { rows: [], titre: null, arrivee: null };

  // titre de la course
  const up = html.toUpperCase();
  const q = up.indexOf('QUINTE', up.lastIndexOf('QUINTE', i - 200) + 1);
  const seg0 = html.slice(Math.max(0, i - 3000), i);
  const tm = seg0.match(/QUINTE\s*([A-Z0-9''\u2019 \-]{4,60}?)\s*A\s+([A-Z\-]+)/i)
          || seg0.match(/QUINTE\s*([A-Z0-9''\u2019 \-]{4,60}?)\s*A\s+PARISLONGCHAMP/i);
  const titre = tm ? tm[0].replace(/\s+/g,' ').trim() : null;

  // arrivée du jour précédent
  const am = html.match(/d'aujourd'hui[^:]*:\s*([\d\s\-–]{5,30})/i);
  const arrivee = am ? am[1].trim() : null;

  // lignes du tableau
  const seg = html.slice(i, i + 8000);
  const rows = [];
  for (const m of seg.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(x => x[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace(/\s+/g, ' ').trim());
    // cellule 1 = image (Pronostic N) ; cellule 2 = numéro ; cellule 3 = fois cité
    const nums = cells.slice(1).map(Number).filter(Number.isFinite);
    if (nums.length >= 2) rows.push({ pos: rows.length + 1, num: nums[0], fois: nums[1] });
    if (rows.length >= 20) break;
  }
  return { rows, titre, arrivee };
}

const { rows, titre, arrivee } = await getRecap();

console.log('='.repeat(80));
console.log(`  ${titre || 'QUINTE'}`);
console.log('='.repeat(80));
if (arrivee) console.log(`  Arrivée du jour précédent : ${arrivee}`);

if (!rows.length) { console.log('  Aucune donnée (le tableau est vide avant la publication).'); process.exit(0); }

console.log(`\n  ${rows.length} chevaux dans le RÉCAPITULATIVE :\n`);
console.log('   Pos  Numéro  Fois cité   barre');
const mx = Math.max(...rows.map(r => r.fois));
rows.forEach((r, i) => {
  const bar = '█'.repeat(Math.round(r.fois / mx * 30));
  console.log(`   ${String(i + 1).padStart(3)}   ${String(r.num).padStart(3)}    ${String(r.fois).padStart(4)}    ${bar}`);
});

// ===== découpage en blocs 2×2 =====
console.log('\n' + '='.repeat(80));
console.log('  DÉCOUPAGE EN BLOCS (2 colonnes × 2 lignes)');
console.log('='.repeat(80));

const nums = rows.map(r => r.num);
const W = Math.ceil(nums.length / 4);           // colonnes de la grille
const grid = [];
for (let i = 0; i < W * 4; i++) grid.push(nums[i] ?? null);

console.log('\n        ');
for (let c = 0; c < W; c++) console.log(`  col ${c + 1}`.padStart(8));
console.log('   ' + '-'.repeat(W * 8 + 4));
for (let line = 0; line < 4; line++) {
  let s = '   ';
  for (let c = 0; c < W; c++) {
    const v = grid[line * W + c];
    s += (v == null ? '   —   ' : String(v).padStart(7) + ' ');
  }
  console.log(s + (line === 0 ? '   <- ligne 1' : line === 2 ? '   <- ligne 3' : ''));
}
console.log('\n   lecture verticale :');
console.log('   ' + grid.filter(v => v != null).join(' - '));

// ===== les blocs de la méthode =====
console.log('\n' + '='.repeat(80));
console.log('  BLOCS : G1 (4) · G2 (4) · B3 (1) · B4 (1) · G5 (4)');
console.log('='.repeat(80));
const S = grid.filter(v => v != null);
const G = [
  { n: 'G1', a: S.slice(0, 2), b: S.slice(2, 4) },
  { n: 'G2', a: S.slice(4, 6), b: S.slice(6, 8) },
  { n: 'B3', a: S.slice(8, 9), b: [] },
  { n: 'B4', a: S.slice(9, 10), b: [] },
  { n: 'G5', a: S.slice(10, 12), b: S.slice(12, 14) },
];
console.log('\n  Bloc   A                  B');
for (const g of G) console.log(`  ${g.n}     ${(g.a.join('-') || '—').padEnd(18)} ${g.b.join('-') || '—'}`);
