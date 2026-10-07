const fs = require('fs');
const L = fs.readFileSync('C:/Users/sam/Desktop/ttt.txt', 'utf8').split(/\r?\n/);
const idx = i => (L[i] || '').trim();

const seps = []; L.forEach((l, i) => { if (/^={10,}/.test(l.trim())) seps.push(i); });
const bounds = [-1, ...seps, L.length];

for (let b = 0; b < seps.length; b++) {
  const s = bounds[b] + 1, e = bounds[b + 1];
  const tete = L.slice(s, s + 35);
  const head = (tete.find(x => /^\d{1,2}\. /.test(x.trim())) || '(manquant)').trim();
  const mus = (tete.find(x => x.trim().length > 6 && /\d[a-z]\d?[a-z]/.test(x)) || '-').trim();
  const corde = (() => { const i = tete.findIndex(x => x.trim() === 'Corde'); return i >= 0 ? tete[i + 2].trim() : '?'; })();
  const val = (() => { const i = tete.findIndex(x => x.trim() === 'Valeur'); return i >= 0 ? tete[i + 2].trim() : '?'; })();
  const pds = (() => { const i = tete.findIndex(x => x.trim() === 'Poids'); return i >= 0 ? tete[i + 2].trim() : '?'; })();
  const jock = (() => { const i = tete.findIndex(x => x.trim() === 'Jockey'); return i >= 0 ? tete[i + 2].trim() : '?'; })();

  console.log('\n' + '#'.repeat(100));
  console.log('  ' + head + '   |  corde ' + corde + '  |  valeur ' + val + '  |  poids ' + pds + '  |  jockey ' + jock);
  console.log('  musique : ' + mus);

  const dates = [];
  for (let i = s; i < e; i++) if (/^\d{2}\/\d{2}\/\d{2}$/.test(idx(i))) dates.push(i);

  for (const d of dates) {
    let k = d + 1; while (k < e && !idx(k)) k++;
    const hippo = idx(k); k++;
    while (k < e && !idx(k)) k++;
    const spe = idx(k); k++;
    while (k < e && !idx(k)) k++;
    const dist = idx(k).replace(/\s+/g, '');
    k++;
    // fin de la ligne de carriere = ligne "e" ou "er"
    let r = k; while (r < e && !/^(e|er)$/.test(idx(r))) r++;
    const seg = L.slice(k, r).map(idx).filter(Boolean);
    const rang = parseInt(seg[seg.length - 1], 10);
    const nums = seg.filter(x => /^\d+([.,]\d+)?$/.test(x));
    const vh = nums.length >= 3 ? nums[nums.length - 3] : null;
    const rap = nums.length >= 3 ? nums[nums.length - 2] : null;
    const champ = seg.slice(0, 6);
    console.log('    ' + idx(d) + '  ' + hippo.padEnd(21) + dist.padStart(6) +
      '   corde=' + (champ[1] || '?').padEnd(2) +
      '  terrain=' + (champ[2] || '?').padEnd(13) +
      '  type=' + (champ[3] || '?').padEnd(7) +
      '  VH=' + String(vh ?? '?').padEnd(6) +
      '  cote=' + String(rap ?? '?').padEnd(6) +
      '  -> ' + (rang > 9 ? 'X' : rang + 'e'));
  }
}