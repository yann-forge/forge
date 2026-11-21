/* 12 scénarios évolutifs. Attentes écrites avant exécution.
   kind : raw (texte initial), prec (précision ajoutée), ans:<lettre> (réponse à une question SMART).
   Attentes (cumulatives à l'étape) :
   dom, nat, S/M/A/R/T ('ok' | 'partiel' | 'absent' | '!absent' | 'ok*' = ok ou réglé par réponse),
   due (date AAAA-MM-JJ ou null), res/act/plan/risk/hyp/dep/crit/force/faib/opp (fragments attendus),
   noRisk/noPlan/noRes (fragments interdits), title (fragment du titre) */
module.exports = [
  { id: 'MUS-1', theme: 'Musique', level: 'complet', steps: [
    { kind: 'raw', text: "Je veux enregistrer et sortir un EP de 4 titres de Lumière du Soir avant le 30 avril 2027. Budget 1200 euros pour le studio et le mixage. Hugo fait le mix, Antoine s'occupe de la pochette. Il faut réserver le studio Tiny Room pour février, déposer les titres à la Sacem et envoyer au distributeur un mois avant la sortie. L'objectif c'est 5000 écoutes sur Spotify le premier mois pour décrocher des dates en salle.",
      expect: { dom: 'Musique', nat: 'projet', S: 'ok', M: 'ok', A: 'ok', R: '!absent', T: 'ok', due: '2027-04-30', title: 'EP', res: ['1200', 'Hugo', 'Antoine'], act: ['Réserver le studio', 'Déposer les titres', 'Envoyer au distributeur'], plan: ['Réserver le studio', 'Sacem', 'distributeur', 'promotion'], risk: ['promotion', 'Hugo'], crit: ['5000'], noRisk: ['électrique', 'fluide'] } }
  ] },
  { id: 'MUS-2', theme: 'Musique', level: 'flou', steps: [
    { kind: 'raw', text: "Faire un clip pour un morceau de Braise, un truc stylé.",
      expect: { dom: 'Musique', S: 'partiel', M: 'absent', T: 'absent', title: 'clip' } },
    { kind: 'prec', text: "Le morceau c'est Helix, on voudrait tourner dans un tram à Tours.",
      expect: { S: '!absent' } },
    { kind: 'ans:temporel', text: "Tournage en janvier, sortie du clip le 14 février.",
      expect: { T: 'ok*', due: '2027-02-14' } },
    { kind: 'prec', text: "Budget 800 euros, il faut demander l'autorisation à Fil Bleu et trouver un vidéaste.",
      expect: { A: 'ok', res: ['800'], act: ['Demander l', 'Trouver un vidéaste'], plan: ['autorisation', 'tournage'], risk: ['autorisation'], dep: ['Fil Bleu'], noRisk: ['électrique'] } }
  ] },
  { id: 'FAB-1', theme: 'Fabrication', level: 'complet', steps: [
    { kind: 'raw', text: "Fabriquer une pédale de delay analogique PT2399 pour mon pedalboard, alimentation 9V, temps de delay jusqu'à 600 ms, consommation sous 50 mA, dans un boîtier 1590B. Budget 45 euros. J'ai un fer à souder, un multimètre et un oscilloscope. Je dois commander les composants chez Tayda cette semaine, faire le PCB sur stripboard et percer le boîtier. Je veux qu'elle soit finie pour le concert du 20 décembre.",
      expect: { dom: 'Fabrication', nat: 'projet', S: 'ok', M: 'ok', A: 'ok', R: 'ok', T: 'ok', due: '2026-12-20', title: 'delay', res: ['45', 'fer à souder', 'oscilloscope'], act: ['Commander les composants', 'Percer le boîtier'], plan: ['Commander les composants', 'Percer', 'prototype'], risk: ['souffle', 'Alimentation'], crit: ['600 ms'], noRisk: ['électrique', 'fluide', 'Outillage'], noRes: ['À acquérir : pédale'] } }
  ] },
  { id: 'FAB-2', theme: 'Fabrication', level: 'flou', steps: [
    { kind: 'raw', text: "Je pense fabriquer un truc pour rafraîchir le studio l'été, il fait trop chaud.",
      expect: { dom: 'Fabrication', S: 'partiel', M: 'absent' } },
    { kind: 'prec', text: "Plutôt un climatiseur mobile avec un compresseur récupéré sur un vieux frigo.",
      expect: { risk: ['fluide', 'électrique'] } },
    { kind: 'ans:mesurable', text: "Il faudrait descendre la pièce de 5 degrés, elle fait 15 m2.",
      expect: { M: 'ok*', crit: ['5 degrés'] } },
    { kind: 'prec', text: "Budget max 250 euros, je n'ai jamais travaillé sur du froid.",
      expect: { res: ['250'], faib: ['jamais travaillé'], risk: ['fluide'], hyp: ['compétences'] } }
  ] },
  { id: 'ASSO-1', theme: 'Association', level: 'complet', steps: [
    { kind: 'raw', text: "Monter le dossier de demande de subvention à la Région Pays de la Loire pour TLM103 avant le 15 janvier : 6000 euros pour la tournée de Braise en 2027. Il faut faire valider le budget par le bureau le 10 décembre, demander le bilan 2025 au trésorier et faire une lettre de soutien avec le Quart'Ney.",
      expect: { dom: 'Association', S: 'ok', M: 'ok', A: 'ok', T: 'ok', due: '2027-01-15', title: 'subvention', act: ['Faire valider le budget', 'Demander le bilan', 'lettre de soutien'], plan: ['valider', 'Déposer'], risk: ['délai', 'Trésorerie'], crit: ['6000'], noRes: ['Budget : 6000'] } }
  ] },
  { id: 'ASSO-2', theme: 'Association', level: 'moyen', steps: [
    { kind: 'raw', text: "Relancer les adhésions de l'asso pour 2027, on a perdu des membres.",
      expect: { dom: 'Association', S: '!absent', M: 'absent' } },
    { kind: 'ans:mesurable', text: "Objectif 40 adhérents à 15 euros.",
      expect: { M: 'ok*', crit: ['40 adhérents'], noRes: ['Budget : 15'] } },
    { kind: 'prec', text: "Faire une campagne sur HelloAsso et Instagram en janvier, avec un tarif réduit pour les étudiants.",
      expect: { T: 'ok', act: ['campagne'], plan: ['campagne'], risk: ['renouvel'] } }
  ] },
  { id: 'EVT-1', theme: 'Événement', level: 'complet', steps: [
    { kind: 'raw', text: "Organiser un concert de soutien pour TLM103 le samedi 13 mars 2027 à la salle Confluences, jauge de 200 personnes, entrée à 8 euros, 3 groupes : Fleuri Désert, Braise et un groupe invité. Budget technique 600 euros, je fais la régie son avec la Qu-6. Il faut déclarer à la Sacem, ouvrir la billetterie sur HelloAsso début février et trouver 6 bénévoles. Objectif : 1600 euros de recette pour financer le prochain album.",
      expect: { dom: 'Événement', S: 'ok', M: 'ok', A: 'ok', R: '!absent', T: 'ok', due: '2027-03-13', title: 'concert', res: ['600', 'Qu-6'], act: ['Déclarer à la Sacem', 'Ouvrir la billetterie', 'Trouver 6 bénévoles'], plan: ['Sacem', 'billetterie', 'bénévoles', 'jour J'], risk: ['Fréquentation', 'Déclarations'], crit: ['1600'], noRes: ['Budget : 8', 'Budget : 1600'] } }
  ] },
  { id: 'EVT-2', theme: 'Événement', level: 'flou', steps: [
    { kind: 'raw', text: "Faire une soirée sympa cet été avec des potes musiciens, genre une jam.",
      expect: { dom: 'Événement', S: 'partiel', M: 'absent' } },
    { kind: 'prec', text: "Ce serait dans le jardin de mon frère à Trélazé, en plein air.",
      expect: { risk: ['Météo'] } },
    { kind: 'ans:mesurable', text: "Une trentaine de personnes, entrée libre, chacun ramène à manger.",
      expect: { M: 'ok*' } },
    { kind: 'ans:temporel', text: "Le samedi 26 juin.",
      expect: { T: 'ok*', due: '2027-06-26' } },
    { kind: 'prec', text: "Il faut une petite sono, je prends mes enceintes, et prévenir les voisins.",
      expect: { act: ['Prévenir les voisins'], res: ['enceintes'], risk: ['voisin'], noRisk: ['SACEM, sécurité'] } }
  ] },
  { id: 'ACH-1', theme: 'Achat de matériel', level: 'complet', steps: [
    { kind: 'raw', text: "Acheter un micro statique pour enregistrer les voix et la guitare acoustique dans le home studio, budget max 300 euros. Je compare le Rode NT1 et l'Audio-Technica AT2035, mon interface a l'alimentation fantôme. Achat avant les sessions de janvier.",
      expect: { dom: 'Achat', S: 'ok', A: '!absent', R: 'ok', T: 'ok', title: 'micro', res: ['300', 'interface'], plan: ['Comparer', 'compatibilité'], risk: ['incompatible', 'Prix final'], noRisk: ['véhicule'] } }
  ] },
  { id: 'CULT-1', theme: 'Action culturelle', level: 'flou', steps: [
    { kind: 'raw', text: "Faire quelque chose autour du son avec des ados du quartier.",
      expect: { dom: 'Action culturelle', S: 'partiel', R: '!absent' } },
    { kind: 'prec', text: "Des ateliers de création sonore au centre social de Belle-Beille, avec enregistrement de sons de la ville.",
      expect: { plan: ['partenaire'] } },
    { kind: 'ans:mesurable', text: "10 séances de 2 heures pour un groupe de 8 jeunes.",
      expect: { M: 'ok*', crit: ['10 séances'] } },
    { kind: 'ans:temporel', text: "D'avril à juin 2027, restitution publique fin juin.",
      expect: { T: 'ok*', due: '2027-06-30' } },
    { kind: 'prec', text: "Financement possible via l'appel à projets politique de la ville, dépôt avant le 31 janvier.",
      expect: { opp: ['appel à projets'], risk: ['Financement'], due: '2027-06-30' } }
  ] },
  { id: 'BUS-1', theme: 'Business', level: 'moyen', steps: [
    { kind: 'raw', text: "Monter une petite activité de régie son en freelance pour des petites salles et des associations autour d'Angers.",
      expect: { dom: 'Business', S: 'ok', R: '!absent', M: 'absent', T: 'absent' } },
    { kind: 'ans:mesurable', text: "Viser 2 prestations par mois à 250 euros la date.",
      expect: { M: 'ok*', res: ['250'], noRes: ['Budget : 250'] } },
    { kind: 'prec', text: "Je suis déjà intermittent, il faut vérifier si je peux facturer à côté, et faire un site simple avec mes références.",
      expect: { act: ['Vérifier', 'Faire un site'], risk: ['situation actuelle'], force: ['intermittent'] } },
    { kind: 'ans:temporel', text: "Démarrer en mars.",
      expect: { T: 'ok*', due: '2027-03-31' } }
  ] },
  { id: 'FAB-3', theme: 'Fabrication', level: 'moyen', steps: [
    { kind: 'raw', text: "Construire un flight case pour la Qu-6 avec du contreplaqué filmé 9 mm et des cornières, aux dimensions de la console.",
      expect: { dom: 'Fabrication', S: 'ok', title: 'flight case', noRisk: ['électrique', 'souffle', 'Alimentation inversée', 'Échauffement'] } },
    { kind: 'ans:pertinent', text: "Pour protéger la console pendant les transports, avant la tournée d'avril.",
      expect: { R: 'ok*', T: 'ok', due: '2027-04-01' } },
    { kind: 'prec', text: "J'ai une scie plongeante et une visseuse, il me faut juste les cornières, les poignées et les fermetures, environ 90 euros chez Adam Hall.",
      expect: { A: 'ok', res: ['90', 'scie'], dep: ['Adam Hall'], noRisk: ['électrique', 'Outillage'] } }
  ] }
];
