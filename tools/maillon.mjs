// ===== LE MAILLON FAIBLE : qui ne peut pas ARRIMER dans le Quinté ? =====
// (pas "qui retirer du pari" -> qui ne peut pas finir dans les 5 premiers)
const Q = { nbPartants: 18, dist: 2500, corde: 'Droite', discipline: 'PLAT', niveau: 'Cl.1 Hand.' };

const M = [
  { n:13, nom:'EBIYAR',
    top5:'4/5 (4e,4e,3e,2e,6e)', top5N:4,
    phyOK:[ 'a couru 3200m ET 2400m -> la distance du jour est COURTE pour lui',
            'corde 3/18 = le MEILLEUR draw du lot',
            'VH 40 vs 41.8 = il descend de classe (-1.8)',
            '3/5 courses a droite' ],
    phyKO:[] },

  { n:4,  nom:'REMBRAND TO GO',
    top5:'5/5 (2e,4e,1er,2e,3e)', top5N:5,
    phyOK:[ '4/5 a 2400m -> ecart +100m avec la course du jour',
            'ParisLongchamp x3 sur les 5 dernieres',
            '4/5 a droite', 'corde 8/18', 'gazon partout, aucun PSF' ],
    phyKO:[] },

  { n:9,  nom:'NITY GALESTE',
    top5:'4/5 (3e,2e,4e,2e,7e)', top5N:4,
    phyOK:[ 'niveau le plus haut (VH 41)', '3e dans un GP a 96 000 euros' ],
    phyKO:[ 'DISTANCE  0 course a 2500m de sa vie ; 2/5 seulement a >= 2400m',
            'PISTE      3/5 a GAUCHE (Saint-Cloud x2, Compiegne) - la course est a DROITE',
            'CORDE      17/18 : le depart le plus large ; sur 2500m il doit couvrir ~20-25m de plus que la moyenne',
            'AGE        3 ans sur une Classe 1 de 2500m, jamais tente' ] },
];

const poidsKO = { DISTANCE:3, PISTE:2, CORDE:3, AGE:2 };

console.log('='.repeat(100));
console.log('  MAILLON FAIBLE   -   qui ne peut pas arriver dans les 5 premiers ?');
console.log(`  ${Q.nbPartants} partants · ${Q.dist}m · ${Q.corde} · ${Q.niveau}`);
console.log('='.repeat(100));

const sc = M.map(m => {
  let ko = 0, liste = [];
  for (const x of m.phyKO) {
    const cle = Object.keys(poidsKO).find(k => x.startsWith(k));
    ko += poidsKO[cle] || 1; liste.push(x);
  }
  return { ...m, ko };
});

sc.sort((a, b) => b.ko - a.ko || b.top5N - a.top5N);

for (const m of sc) {
  console.log('\n  n°' + m.n + '  ' + m.nom + '   ->  PENALITE PHYSIQUE = ' + m.ko);
  console.log('      top5 sur 5 : ' + m.top5);
  m.phyOK.forEach(x => console.log('        + ' + x));
  m.phyKO.forEach(x => console.log('        - ' + x));
}

const faible = sc[0];
const autres = sc.slice(1);
console.log('\n' + '='.repeat(100));
console.log('  >>  MAILLON FAIBLE : n°' + faible.n + ' ' + faible.nom + '  (penalite ' + faible.ko + ')');
console.log('  >>  ON GARDE       : n°' + autres[0].n + ' ' + autres[0].nom + '  +  n°' + autres[1].n + ' ' + autres[1].nom);
console.log(`
  COMBINAISONS (ta methode) :
    Jeu 1  =  les 3 qui passent        ->  ${sc.map(m=>m.n).join(' - ')}
    Jeu 2  =  les 2 forts + le coupe  ->  ${autres[0].n} - ${autres[1].n} - 8

  Pourquoi le maillon faible n arrive pas :
      son TOP5 est bon (${faible.top5N}/5) mais ses 4 problemes sont TOUS PHYSIQUES.
      Or un Quinté a ${Q.nbPartants} partants se gagne sur le physique
      (draw + distance + piste), pas sur la forme.`);