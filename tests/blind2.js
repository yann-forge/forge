/* Jeu aveugle n°2 — USÉ le 21/11/2026 : mesuré (82 %) puis utilisé pour corriger le moteur 1.2. Sert désormais
   d'entraînement (garde-fou contre les régressions), plus de mesure honnête. Mesure : voir blind3.js.
   Écrit le 21/11/2026 AVANT la refonte du moteur, attentes fixées sans exécuter le moteur.
   AV2-1 à AV2-3 : idées réelles de Yann, texte intact. AV2-4 à AV2-10 : idées rédigées dans son style (oral, fautes,
   phrases enchaînées) sur ses domaines. Ce jeu sert UNIQUEMENT à mesurer : ne jamais régler le moteur dessus,
   ne jamais modifier ses attentes. Une fois mesuré après la refonte, il sera « usé » et remplacé par un nouveau jeu.
   Alternatives : « a|b » = l'un ou l'autre suffit. */
module.exports = [
  { id: 'AV2-1', theme: 'Fabrication', level: 'réel', steps: [{ kind: 'raw',
    text: "Faire un climatiseur écologique qui fonctionne sur 12v  a très faible consommation d'énergie.  Basé sur la technologie de système alvéolaire des structures indiennes. Materiel : pompe à eau (25euros), bac d'eau (15euros), système alveolaire (50euros) habillage(10 euros) ventilateur (20euros), temps de fabrication prototypage estimé à 30 heures, doit baisser la temperature d'une pièce de 5 degré.",
    expect: { dom: 'Fabrication', nat: 'projet', S: 'ok', M: 'ok', A: '!absent', T: 'absent', due: null, title: 'climatiseur',
      res: ['pompe', 'bac', 'ventilateur', '12v|12 v'], crit: ['5 degr'], plan: ['prototype', 'mesur|test'], risk: ['humidit'],
      noRisk: ['frigorig', '230'], noRes: ['Budget : 25', 'Budget : 15', 'Budget : 50'] } }] },

  { id: 'AV2-2', theme: 'Business', level: 'réel', steps: [{ kind: 'raw',
    text: "Créer une marque de t-shirt vendue par l'association avec des noms rigolos, des choses humoristiques concernant le milieu artistique et technique. Profiter d'un site internet du label pour avoir un onglet merchandising et vendre des t-shirts. Esthétique simple, avec souvent simplement du texte des symboles et au plus complexe, il y aura du graphisme. Obligation que le graphisme ne soit pas réalisé par IA. L'objectif serait de rentrer de l'argent dans le label en ayant sa des produits de merchandising.",
    expect: { dom: 'Business|Association', nat: 'projet', S: '!absent', M: '!ok', T: 'absent', due: null, title: 't-shirt',
      plan: ['prix', 'fournisseur|impression|imprimeur'], risk: ['stock|invendu', 'fiscal'], noRisk: ['électrique', 'frigorig'] } }] },

  { id: 'AV2-3', theme: 'Musique', level: 'réel', steps: [{ kind: 'raw',
    text: "Scénario du futur clip d'un de mes groupes qui sera l'histoire d'une femme qui a perdu le goût de l'ambition, des choses de la vie et surtout la confiance en elle. Elle va souvent dans une bibliothèque. Un jour, dans cette bibliothèque, elle tombe sur un livre. Le livre est vide. Et dans un élan un peu désespéré et pensif, elle va noter dans ce livre « Coucou, c'est moi ». Elle va reposer le livre dans la bibliothèque. Ensuite, elle le reprend le lendemain et quelqu'un a écrit dedans. Il y a une réponse qui dit « Comment t'appelles-tu » S'ensuit alors une conversation à travers un livre où cette femme pense qu'elle joue à un jeu avec quelqu'un qui va dans la même bibliothèque qu'elle. Mais au fur et à mesure, elle se rend compte que la personne à qui elle écrit la connaît par cœur et sait très bien ce qu'elle vit, d'où elle vient et qui elle est. On se rendra compte à la fin, et c'est l'objectif, que la personne à qui elle parle dans ce livre est la version d'elle petite, quand elle était gamine. Un message de pardon et de confiance en soi. C'est ce que doit retransmettre cette réalisation.",
    expect: { dom: 'Musique', nat: 'projet', M: 'absent', T: 'absent', due: null, title: 'clip',
      plan: ['tournage|tourner', 'lieu|repérage|bibliothèque', 'casting|comédien|actrice'], risk: ['autorisation', 'enfant|mineur'],
      noAct: ['noter', 'reposer', 'reprend'], noPlan: ['reposer le livre', 'noter dans'], noRisk: ['électrique', 'frigorig', 'symptôme'] } }] },

  { id: 'AV2-4', theme: 'Association', level: 'style', steps: [{ kind: 'raw',
    text: "il faudrait faire la demande de subvention a la région pour l'asso avant le 15 janvier, il faut le bilan de l'année derniere, les statuts et un budget prévisionnel, c'est pour financer le prochain festival",
    expect: { dom: 'Association', nat: 'projet|action ponctuelle', T: 'ok', due: '2027-01-15', act: ['subvention'], dep: ['région'],
      plan: ['budget prévisionnel', 'bilan|statuts'], risk: ['délai|dossier|incomplet'], noRisk: ['électrique'] } }] },

  { id: 'AV2-5', theme: 'Achat de matériel', level: 'style', steps: [{ kind: 'raw',
    text: "j'aimerai changer ma console, la qu-6 commence a fatiguer, je regarde une sq5 d'occasion autour de 2500 euros, faudrait que je revende la qu6 avant pour financer",
    expect: { dom: 'Achat', nat: 'projet|amélioration', A: '!absent', T: 'absent', due: null, res: ['2500'], act: ['revend'],
      plan: ['compar|essai|tester'], risk: ['occasion|garantie|état'], noRisk: ['électrique', 'symptôme'] } }] },

  { id: 'AV2-6', theme: 'Événement', level: 'style', steps: [{ kind: 'raw',
    text: "organiser un concert de soutien pour l'asso au quart'ney le samedi 13 mars, 3 groupes, entrée 8 euros, objectif 120 personnes, faut trouver des bénévoles pour le bar et l'entrée et faire la sacem",
    expect: { dom: 'Événement', nat: 'projet', M: 'ok', T: 'ok', due: '2027-03-13', crit: ['120'], act: ['bénévoles', 'sacem'],
      plan: ['communication|promotion|affiche'], risk: ['fréquentation|public|remplissage'], noRes: ['Budget : 8'] } }] },

  { id: 'AV2-7', theme: 'Action culturelle', level: 'style', steps: [{ kind: 'raw',
    text: "monter un atelier de découverte du son pour les ados de la maison de quartier, 4 séances le mercredi aprem en fevrier, apprendre a brancher une sono et faire un mix simple, faut voir avec la mairie pour le financement",
    expect: { dom: 'Action culturelle|Culturel', nat: 'projet', R: '!absent', T: '!absent', due: '2027-02-28', dep: ['mairie'],
      plan: ['séance|atelier|contenu'], risk: ['financement|mairie|subvention'], noRisk: ['frigorig', 'symptôme'] } }] },

  { id: 'AV2-8', theme: 'Musique', level: 'style', steps: [{ kind: 'raw',
    text: "faut qu'on sorte le single du groupe avant l'été, le mix est fini mais il manque le master, je pensais demander a hugo, et faire une petite campagne insta avec un teaser",
    expect: { dom: 'Musique', nat: 'projet', T: '!absent', res: ['Hugo'], act: ['master|hugo', 'campagne|teaser'],
      plan: ['distribut|plateforme', 'master'], risk: ['promotion|visibilité|délai'], noRisk: ['électrique'] } }] },

  { id: 'AV2-9', theme: 'Personnel', level: 'style', steps: [{ kind: 'raw',
    text: "la carte son du studio grésille quand je branche le preampli warm, ca le fait que sur l'entrée 2, faut que je règle ca avant la session du 5 décembre",
    expect: { nat: 'problème à résoudre', T: 'ok', due: '2026-12-05', plan: ['symptôme|cause|isoler'], noPlan: ['client', 'prix'] } }] },

  { id: 'AV2-10', theme: 'Formation', level: 'style', steps: [{ kind: 'raw',
    text: "j'aimerai me former au mixage dolby atmos, il y a une formation afdas de 5 jours a paris, faut que je fasse la demande de prise en charge avant fin decembre",
    expect: { dom: 'Formation', nat: 'projet|action ponctuelle', T: 'ok', due: '2026-12-31', act: ['prise en charge'], dep: ['afdas'],
      noRisk: ['frigorig', 'symptôme'] } }] }
];
