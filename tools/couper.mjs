// Qui couper si on doit en retirer UN des trois ?
const C = [
  { n:4,  nom:'REMBRAND TO GO', score:7.64,
    force:[ '4/5 courses a 2400m (aujourd hui 2500m -> ecart +100m seulement)',
            'ParisLongchamp x3 dans les 5 dernieres',
            '4/5 a droite (aujourd hui droite)',
            'corde 8/18 = bon parcours',
            'gazon dans les 5 dernieres, aucun PSF' ],
    faible:[ 'ses meilleurs resultats viennent de VH 36.5 (1er, 2e, 3e)',
             'a VH 39.5 il fait 4e puis 2e : la forme baisse quand le niveau monte',
             'cote la plus courte du marche = la moins de valeur' ],
    bloq:0 },

  { n:9,  nom:'NITY GALESTE', score:6.39,
    force:[ 'niveau le plus haut du lot (VH 41)',
            '3e dans un GP a 96 000 euros, 2e dead-heat a 2400m' ],
    faible:[ 'DISTANCE   : 0 course a 2500m, 2/5 seulement a >= 2400m',
             'PISTE       : 3/5 courses a GAUCHE (Saint-Cloud x2, Compiegne) - aujourd hui DROITE',
             'CORDE       : 17/18 = le depart le plus large, parcours exterieur sur 2500m',
             'AGE         : 3 ans sur une Classe 1 de 2500m, jamais tente a cette distance',
             'il a gagne sa derniere sortie de 2000m en se disputant l arrivee (GHABRI)' ],
    bloq:4 },

  { n:13, nom:'EBIYAR', score:6.16,
    force:[ 'a couru 3200m et 2400m -> 2500m est COURT pour lui',
            'corde 3/18 = le meilleur draw du lot',
            'VH 40 aujourd hui vs 41.8 sur ses 2 dernieres : il descend de niveau (-1.8)',
            '3/5 a droite' ],
    faible:[ 'FORME       : bloque a 4e, 4e sur ses 2 dernieres',
             'VALEUR      : deprecie de 43 (juillet) a 40 (aujourd hui)',
             'aucune victoire en 6 courses' ],
    bloq:0 },
];

console.log('='.repeat(102));
console.log('  A QUI COUPER ?   (3 retenus : n°4 - n°9 - n°13)');
console.log('='.repeat(102));
console.log('\n  REGLE : on ecarte celui qui cumule des problemes PHYSIQUES le meme jour');
console.log('          (distance / piste / corde / age).');
console.log('          Une mauvaise FORME se rattrape. Un physique qui colle pas, non.\n');

for (const c of C) {
  console.log('  ' + '-'.repeat(98));
  console.log('  n°' + c.n + '  ' + c.nom + '   (score ' + c.score + ')   ->  ' + c.bloq + ' probleme(s) physique(s)');
  console.log('      SES ATOUTS');
  c.force.forEach(x => console.log('        + ' + x));
  console.log('      CE QUI POSE PROBLEME');
  c.faible.forEach(x => console.log('        - ' + x));
}

const p = C.slice().sort((a, b) => b.bloq - a.bloq || a.score - b.score);
console.log('\n' + '='.repeat(102));
console.log('  VERDICT');
console.log('='.repeat(102));
console.log('\n  >>  ON COUPE  n°' + p[0].n + '  ' + p[0].nom + '   (' + p[0].bloq + ' problemes physiques)');
console.log('  >>  ON GARDE  n°' + p[1].n + '  ' + p[1].nom + '  +  n°' + p[2].n + '  ' + p[2].nom);
console.log('\n  Raised :');
console.log('      n°' + p[1].n + ' et n°' + p[2].n + ' ont une FORME mediocre,');
console.log('      mais ZERO probleme physique. La forme se rattrape.');
console.log('      n°' + p[0].n + ' a ' + p[0].bloq + ' problemes PHYSIQUES le meme jour.');
console.log('      Un seul de ces problemes suffit a le sortir d un Quinté.');