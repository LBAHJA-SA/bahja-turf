const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36', Accept: 'application/json' };

async function j(u) {
  try {
    const r = await fetch(u, { headers: UA });
    const t = await r.text();
    return { s: r.status, t };
  } catch (e) { return { s: 0, t: '' }; }
}

const base = 'https://pro.casacourses.com';

// 1. voir la forme d'un programme
const p = await j(`${base}/api/programme?date=2026-10-03`);
console.log('programme: status=' + p.s + ' len=' + p.t.length);
if (p.s === 200) {
  try {
    const d = JSON.parse(p.t);
    const m = d.meetings?.[0];
    const r = m?.races?.[0];
    console.log('  meeting keys: ' + Object.keys(m || {}).join(', '));
    console.log('  race keys  : ' + Object.keys(r || {}).join(', '));
    const pa = r?.participants || m?.participants;
    if (pa && pa[0]) console.log('  participant keys: ' + Object.keys(pa[0]).join(', '));
  } catch (e) { console.log('  pas JSON'); }
}

// 2. sonder des endpoints cheval / resultats
const paths = [
  '/api/cheval?nom=EBIYAR',
  '/api/chevaux?nom=EBIYAR',
  '/api/resultats?date=2026-10-03',
  '/api/carriere?nom=EBIYAR',
  '/api/horse?nom=EBIYAR',
  '/api/programme/2026-10-03',
];
console.log('\n--- sondage ---');
for (const x of paths) {
  const r = await j(base + x);
  console.log(`  ${r.s}  ${x}  len=${r.t.length}  ${r.t.slice(0, 90).replace(/\s+/g, ' ')}`);
}