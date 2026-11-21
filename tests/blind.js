/* Jeu aveugle final : écrit après les corrections, jamais exécuté avant la mesure */
module.exports = [
  { id: 'B-MUS-1', level: 'flou', steps: [
    { kind: 'raw', text: "j'ai envie de faire un album solo un jour", expect: { dom: 'Musique', S: 'partiel', T: 'partiel', M: 'absent' } },
    { kind: 'ans:specifique', text: "un album jazz de 8 titres en trio, clarinette contrebasse batterie", expect: { S: 'ok*', M: 'ok' } },
    { kind: 'ans:temporel', text: "enregistré l'été prochain et sorti avant la fin de l'année 2027", expect: { T: 'ok*' } },
    { kind: 'prec', text: "Gaétan pourrait jouer la clarinette, il faut lui proposer et trouver un studio avec un bon piano", expect: { res: ['Gaétan'], act: ['Trouver un studio'], risk: ['Gaétan'] } }
  ] },
  { id: 'B-MUS-2', level: 'complet', steps: [
    { kind: 'raw', text: "Booker 10 dates de concert pour Braise entre mars et juin 2027 dans des salles de 100 à 300 places en Pays de la Loire. Il faut mettre à jour le dossier de presse, envoyer 40 mails aux programmateurs avant le 15 décembre et relancer début janvier.",
      expect: { dom: 'Musique', S: 'ok', M: 'ok', T: 'ok', act: ['Mettre à jour le dossier de presse', 'Envoyer 40 mails', 'Relancer'], crit: ['10 dates'], noRisk: ['électrique'] } }
  ] },
  { id: 'B-FAB-1', level: 'moyen', steps: [
    { kind: 'raw', text: "Fabriquer une boîte DI passive pour la scène avec un transfo Lundahl", expect: { dom: 'Fabrication', S: 'ok', noRisk: ['fluide'] } },
    { kind: 'prec', text: "2 exemplaires, budget 120 euros, pour la tournée de février", expect: { M: 'ok', T: 'ok', res: ['120'] } }
  ] },
  { id: 'B-FAB-2', level: 'flou', steps: [
    { kind: 'raw', text: "un truc pour piloter les lumières depuis le pied", expect: { S: 'partiel' } },
    { kind: 'prec', text: "Je voudrais construire un pédalier MIDI avec un Arduino et 6 footswitchs pour envoyer du DMX via un boîtier USB", expect: { dom: 'Fabrication', S: 'ok', crit: [] } },
    { kind: 'ans:temporel', text: "pour le festival de juin", expect: { T: 'ok*' } }
  ] },
  { id: 'B-ASSO-1', level: 'complet', steps: [
    { kind: 'raw', text: "Rédiger et faire voter les nouveaux statuts de TLM103 à l'AG extraordinaire du 30 janvier 2027 pour ajouter l'activité de production phonographique. Il faut envoyer la convocation 15 jours avant, faire relire les statuts par Sophie et déclarer la modification en préfecture.",
      expect: { dom: 'Association', S: 'ok', T: 'ok', due: '2027-01-30', act: ['Envoyer la convocation', 'Faire relire', 'Déclarer la modification'], plan: ['préfecture'], res: ['Sophie'] } }
  ] },
  { id: 'B-ASSO-2', level: 'moyen', steps: [
    { kind: 'raw', text: "Demander l'agrément jeunesse et éducation populaire pour l'asso", expect: { dom: 'Association', S: 'ok', M: 'absent' } },
    { kind: 'prec', text: "il faut constituer le dossier avec 3 ans de bilans d'activité, à déposer à la préfecture avant juin", expect: { T: 'ok', act: ['Constituer le dossier'], dep: ['Préfecture'] } }
  ] },
  { id: 'B-EVT-1', level: 'flou', steps: [
    { kind: 'raw', text: "organiser un truc pour les 10 ans de l'asso", expect: { dom: 'Événement', S: 'partiel' } },
    { kind: 'ans:specifique', text: "une grande soirée concert avec tous les artistes passés par le label, au Quart'Ney", expect: { S: 'ok*' } },
    { kind: 'ans:mesurable', text: "300 personnes, entrée à 12 euros", expect: { M: 'ok*', noRes: ['Budget : 12'] } },
    { kind: 'ans:temporel', text: "le samedi 18 septembre 2027", expect: { T: 'ok*', due: '2027-09-18' } },
    { kind: 'prec', text: "budget 5000 euros, il faut caler la date avec la salle et contacter les 8 artistes", expect: { res: ['5000'], act: ['Caler la date', 'Contacter les 8 artistes'], risk: ['Fréquentation'] } }
  ] },
  { id: 'B-ACH-1', level: 'moyen', steps: [
    { kind: 'raw', text: "Remplacer les retours de scène de la salle par 4 retours actifs 12 pouces", expect: { dom: 'Achat', S: 'ok' } },
    { kind: 'prec', text: "budget 2400 euros pour les 4, en comparant RCF et Yamaha, avant la saison de concerts de mars", expect: { res: ['2400'], T: 'ok', plan: ['Comparer'] } }
  ] },
  { id: 'B-CULT-1', level: 'moyen', steps: [
    { kind: 'raw', text: "Faire découvrir le métier de technicien son à des lycéens en bac pro", expect: { dom: 'Action culturelle', S: '!absent', R: '!absent' } },
    { kind: 'prec', text: "3 demi-journées au Quart'Ney avec mise en situation sur la console, en lien avec le lycée Chevrollier", expect: { M: 'ok' } }
  ] },
  { id: 'B-BUS-1', level: 'complet', steps: [
    { kind: 'raw', text: "Lancer une offre de location de backline (amplis, batterie, claviers) aux groupes de passage à Angers, à 80 euros la journée. Il faut assurer le matériel, faire un contrat de location type et créer une page web. Objectif 4 locations par mois dès avril.",
      expect: { dom: 'Business', S: 'ok', M: 'ok', T: 'ok', act: ['Assurer le matériel', 'Faire un contrat', 'Créer une page'], noRes: ['Budget : 80'], risk: ['clients'] } }
  ] },
  { id: 'B-FAB-3', level: 'complet', steps: [
    { kind: 'raw', text: "Construire un caisson de basse 18 pouces en bass-reflex de 150 litres pour la sono de l'asso, avec un ampli Class D de 1000 W. Budget 700 euros. J'ai accès à l'atelier bois du fablab. À finir avant le festival de juin.",
      expect: { dom: 'Fabrication', S: 'ok', M: 'ok', A: 'ok', T: 'ok', res: ['700'], crit: ['1000 W'], risk: ['électrique'] } }
  ] },
  { id: 'B-PB-1', level: 'moyen', steps: [
    { kind: 'raw', text: "La Qu-6 perd la connexion avec l'iPad en plein concert", expect: { nat: 'problème à résoudre' } },
    { kind: 'prec', text: "sûrement le routeur wifi, je pense le remplacer par un modèle dédié avant le concert du 12 décembre", expect: { T: 'ok', due: '2026-12-12', hyp: ['routeur'] } }
  ] }
];
