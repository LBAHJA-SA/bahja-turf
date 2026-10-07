const TARGET = 'https://www.pronostics-turf.info/';
const enc = encodeURIComponent(TARGET);

const PROXIES = [
  ['allorigins',   `https://api.allorigins.win/raw?url=${enc}`],
  ['codetabs',     `https://api.codetabs.com/v1/proxy?quest=${TARGET}`],
  ['corsproxy.io', `https://corsproxy.io/?url=${enc}`],
  ['whateverorigin', `http://www.whateverorigin.org/get?url=${enc}`],
  ['thingproxy',   `https://thingproxy.freeboard.io/fetch/${TARGET}`],
  ['cors.lol',     `https://api.cors.lol/?url=${enc}`],
  ['isomorphic',   `https://cors.isomorphic-git.org/${TARGET}`],
  ['r.jina.ai',    `https://r.jina.ai/${TARGET}`],
];

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' };

console.log('='.repeat(96));
console.log('  TEST DES PROXIES CORS pour pronostics-turf.info');
console.log('='.repeat(96));

for (const [name, url] of PROXIES) {
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 25000);
    const r = await fetch(url, { headers: UA, signal: ctrl.signal });
    clearTimeout(to);
    const txt = await r.text();
    const ms = Date.now() - t0;
    const cors = r.headers.get('access-control-allow-origin') || '(pas de header ACAO)';
    const ok = /RECAPITULATIVE/i.test(txt);
    console.log(`\n  ${name.padEnd(15)} ${String(r.status).padStart(3)}  ${String(txt.length).padStart(7)} car.  ${String(ms).padStart(6)} ms`);
    console.log(`                  ACAO: ${cors}`);
    console.log(`                  RECAPITULATIVE trouve: ${ok ? 'OUI' : 'non'}`);
    if (ok) {
      const i = txt.toUpperCase().indexOf('RECAPITULATIVE');
      const seg = txt.slice(i, i + 2500);
      const rows = [...seg.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].slice(0, 6);
      rows.forEach((m, idx) => {
        const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
          .map(x => x[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace(/\s+/g, ' ').trim());
        console.log(`                    ${idx}: ${cells.join(' | ')}`);
      });
    }
  } catch (e) {
    console.log(`\n  ${name.padEnd(15)} ERR  ${e.name}: ${e.message}`);
  }
}