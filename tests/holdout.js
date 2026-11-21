/* Jeu de contrôle : 12 scénarios inédits, attentes écrites avant toute exécution, style oral / dicté */
module.exports = [
  { id: 'H-MUS-1', theme: 'Musique', level: 'moyen', steps: [
    { kind: 'raw', text: "bon faudrait qu'on reprenne les répètes avec Fleuri Désert pour préparer 3 nouveaux morceaux", expect: { dom: 'Musique', S: '!absent', M: 'ok', T: 'absent' } },
    { kind: 'ans:temporel', text: "pour le concert au Joker's Pub le 6 février", expect: { T: 'ok*', due: '2027-02-06' } },
    { kind: 'prec', text: "on peut répéter le mardi soir au local de la MPT, Hugo ramène la batterie", expect: { res: ['Hugo'], noRisk: ['électrique'] } }
  ] },
  { id: 'H-MUS-2', theme: 'Musique', level: 'complet', steps: [
    { kind: 'raw', text: "Lancer une campagne Ulule de 3000 euros avant le 1er mars pour presser 300 vinyles de l'album de Braise. Contreparties : vinyle dédicacé à 25 euros, concert privé à 300 euros. Il faut tourner une vidéo de présentation et contacter le presseur MPO pour le devis.",
      expect: { dom: 'Musique', S: 'ok', M: 'ok', T: 'ok', due: '2027-03-01', act: ['Tourner une vidéo', 'Contacter le presseur'], crit: ['3000'], noRes: ['Budget : 3000', 'Budget : 25'] } }
  ] },
  { id: 'H-FAB-1', theme: 'Fabrication', level: 'flou', steps: [
    { kind: 'raw', text: "j'aimerais bien me faire un ampli pour la basse, un truc maison", expect: { dom: 'Fabrication', S: 'partiel' } },
    { kind: 'ans:mesurable', text: "genre 100 watts en classe D sur un HP de 12 pouces", expect: { M: 'ok*', crit: ['100 watts'] } },
    { kind: 'prec', text: "avec un module TPA3255 et une alim 48V à découpage, budget 200 balles", expect: { res: ['200'], risk: ['électrique'] } }
  ] },
  { id: 'H-FAB-2', theme: 'Fabrication', level: 'complet', steps: [
    { kind: 'raw', text: "Construire un pedalboard en bois de 60 x 35 cm avec une alimentation isolée 8 sorties intégrée, pour le 15 janvier. J'ai déjà la planche de contreplaqué et la scie sauteuse, il me reste à commander l'alim (environ 110 euros) et le velcro.",
      expect: { dom: 'Fabrication', S: 'ok', M: 'ok', A: 'ok', T: 'ok', due: '2027-01-15', res: ['110', 'scie'], noRisk: ['fluide', 'Échauffement'] } }
  ] },
  { id: 'H-ASSO-1', theme: 'Association', level: 'moyen', steps: [
    { kind: 'raw', text: "Il faut que TLM103 ouvre un compte pro à la banque, l'ancien compte est au nom de l'ex-président", expect: { dom: 'Association', S: '!absent', dep: ['Banque'] } },
    { kind: 'prec', text: "faut le PV de la dernière AG et les statuts à jour, et que la présidente et le trésorier passent à l'agence", expect: { act: ['passent'] === undefined ? [] : [], plan: ['valid'] } },
    { kind: 'ans:temporel', text: "avant fin décembre pour pouvoir encaisser les billets du concert", expect: { T: 'ok*', due: '2026-12-31' } }
  ] },
  { id: 'H-ASSO-2', theme: 'Association', level: 'flou', steps: [
    { kind: 'raw', text: "trouver des sous pour l'asso", expect: { dom: 'Association', S: 'partiel', M: 'absent', T: 'absent' } },
    { kind: 'ans:specifique', text: "Faire une demande de mécénat auprès de 5 commerçants angevins pour financer le festival", expect: { S: 'ok*', risk: ['réponse'] } },
    { kind: 'ans:mesurable', text: "objectif 2000 euros", expect: { M: 'ok*', crit: ['2000'], noRes: ['Budget : 2000'] } },
    { kind: 'prec', text: "Je dois préparer une plaquette et appeler la boulangerie Pichon et Musique Studio", expect: { act: ['Préparer une plaquette', 'Appeler'], risk: ['Éligibilité'] } }
  ] },
  { id: 'H-EVT-1', theme: 'Événement', level: 'moyen', steps: [
    { kind: 'raw', text: "Monter une scène ouverte mensuelle au bar Le Chabada à partir de janvier", expect: { dom: 'Événement', S: 'ok', T: '!absent' } },
    { kind: 'prec', text: "6 à 8 artistes par soirée, inscription par mail, je fournis la sono", expect: { M: 'ok', risk: ['Désistement'] } },
    { kind: 'prec', text: "le bar paie 150 euros par soirée pour la technique", expect: { noRes: ['Budget : 150'] } }
  ] },
  { id: 'H-EVT-2', theme: 'Événement', level: 'complet', steps: [
    { kind: 'raw', text: "Organiser le bal folk de l'asso le 8 mai 2027 en extérieur au parc Balzac, 2 groupes, entrée libre, buvette tenue par 10 bénévoles. Budget 900 euros. Il faut faire la demande d'autorisation à la mairie trois mois avant, louer une scène et prévoir une solution de repli en cas de pluie.",
      expect: { dom: 'Événement', S: 'ok', M: 'ok', A: 'ok', T: 'ok', due: '2027-05-08', act: ['Louer une scène', 'Prévoir une solution de repli'], risk: ['Météo', 'Déclarations'], dep: ['mairie'] } }
  ] },
  { id: 'H-ACH-1', theme: 'Achat', level: 'flou', steps: [
    { kind: 'raw', text: "changer d'ordi pour la MAO", expect: { dom: 'Achat', S: 'partiel', T: 'absent' } },
    { kind: 'ans:mesurable', text: "au moins 32 Go de RAM et 1 To de SSD, pas plus de 1500 euros", expect: { M: 'ok*', res: ['1500'] } },
    { kind: 'prec', text: "plutôt un Mac reconditionné, je regarde chez Back Market", expect: { risk: ['occasion'], dep: ['Back Market'] } }
  ] },
  { id: 'H-CULT-1', theme: 'Action culturelle', level: 'complet', steps: [
    { kind: 'raw', text: "Proposer une résidence de création de 5 jours à Braise au centre culturel de Trélazé en avril 2027, avec 2 ateliers d'écriture pour les collégiens et un concert de restitution. Budget 4500 euros, financé par la DRAC et la ville. Dossier à déposer avant le 15 février.",
      expect: { dom: 'Action culturelle', S: 'ok', M: 'ok', A: 'ok', R: '!absent', T: 'ok', due: '2027-04-30', risk: ['Financement'], dep: ['DRAC'] } }
  ] },
  { id: 'H-BUS-1', theme: 'Business', level: 'flou', steps: [
    { kind: 'raw', text: "vendre des kits de pédales à monter soi-même", expect: { dom: 'Business', S: '!absent', M: 'absent' } },
    { kind: 'ans:mesurable', text: "20 kits par mois à 60 euros pièce", expect: { M: 'ok*', noRes: ['Budget : 60'] } },
    { kind: 'prec', text: "il faut faire le PCB en série chez JLCPCB et écrire une notice de montage claire, je pense que les guitaristes adorent ça", expect: { act: ['Écrire une notice'], hyp: ['guitaristes'], risk: ['clients'] } },
    { kind: 'ans:temporel', text: "premiers kits en vente au printemps", expect: { T: 'ok*' } }
  ] },
  { id: 'H-FAB-3', theme: 'Fabrication', level: 'moyen', steps: [
    { kind: 'raw', text: "Réparer et modifier mon vieil ampli à lampes Vox AC15 qui crache dans les aigus", expect: { nat: 'problème à résoudre', risk: ['électrique'] } },
    { kind: 'prec', text: "Je pense changer les lampes de préampli et les condensateurs de filtrage", expect: { hyp: ['lampes'] } }
  ] }
];
