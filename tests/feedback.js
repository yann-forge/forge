/* Scénarios issus des signalements faits dans l'app (menu ⋮ > Signaler une erreur).
   Même format que scenarios.js, plus : source (id du signalement), today (date du signalement, pour les dates relatives).
   todo: true = cas reconnu mais pas encore corrigé (affiché, non compté). Lancer : SET=./feedback.js node tests/bench.js */
module.exports = [
  /* Idée réelle du 21/11/2026, exportée en PDF (fiche + carte). Attentes écrites avant toute modification du moteur,
     uniquement à partir du texte saisi. Défauts constatés : nature basculée en « problème à résoudre » par la dernière
     précision, investissement passé lu comme budget, tarifs lus comme budgets, actions du texte non repérées,
     matériel mal relevé (« caisson basse » → basse, « boîtier de scène » → scène), échéance rangée en faiblesse. */
  { id: 'FB-STUDIO', source: 'PDF 2026-11-21', today: '2026-11-21', theme: 'Business', level: 'signalement', steps: [
    { kind: 'raw', text: "j'aimerai vendre mes services d'ingenieur du son en studio et en live. Il ya un an j'ai investi 13000 euros dans du materiel. Je possède un boitier de scène, une console numérique, un système de diffusion (2 satellites + 1 caisson basse) ainsi que 4 retours. Je possède aussi un préampli warm audio et 12 preamp en carte RME. J'ai un studio partagé en Maine et Loire avec tout ce materiel avec micro et cable. J'ai besoin de faire valoir mes services de posé des tarifs et de toucher le marché local",
      expect: { dom: 'Business', nat: 'projet', S: 'ok', title: 'ingenieur du son',
        res: ['console', 'caisson', 'RME', 'warm audio', 'studio'], noRes: ['Déjà là : basse', 'Déjà là : scène'],
        act: ['Faire valoir', 'tarifs', 'marché local'], noCrit: ['Budget respecté : 13000'] } },
    { kind: 'prec', text: "13000 euros est le budget d'investissement initial", expect: { noCrit: ['Budget respecté : 13000'] } },
    { kind: 'prec', text: "je peux vendre une journée d'enregistrement en studio 200 euros et des journée d'enregistrement sur l'extérieur dans d'autres lieux pour 250 euros",
      expect: { res: ['200', '250'], noRes: ['Budget : 200', 'Budget : 250'] } },
    { kind: 'prec', text: "enregistrement sur facture", expect: {} },
    { kind: 'prec', text: "prestation live en contrat CDDU", expect: { risk: ['statut'] } },
    { kind: 'prec', text: "repond a une clientèle avec peu de moyen financier, enregistrement pas cher, solution clé en main",
      expect: { noAct: ['Répondre a une clientèle'], noPlan: ['Répondre a une clientèle'] } },
    { kind: 'prec', text: "cible : artiste", expect: { R: '!absent' } },
    { kind: 'prec', text: "clients / artistes repartent avec les audios", expect: {} },
    { kind: 'prec', text: "le studio doit être fonctionnel pour fevrier 2027", expect: { T: 'ok', due: '2027-02-28', noFaib: ['fonctionnel'] } },
    { kind: 'prec', text: "ca règle le problème enregistrement pas cher, solution clé en main, artistes repartent avec les audios",
      expect: { dom: 'Business', nat: 'projet', noTitle: 'Résoudre',
        noPlan: ['symptôme', 'Isoler la cause', 'correction'], noRisk: ['Cause mal identifiée'], noHyp: ['reproduire le problème', 'un seul élément'],
        plan: ['prix|tarif', 'statut'], /* 21/11 : « prix » → « prix|tarif » : ta propre étape « Poser des tarifs » remplace l'étape de méthode équivalente (attente trop stricte, corrigée et justifiée) */ risk: ['clients', 'statut'], hyp: ['200'], noCrit: ['Budget respecté : 13000'] } },
    { kind: 'ans:mesurable', text: "Déjà dépensé, l'argent a été investis il y a un an dans tout le materiel",
      expect: { M: '!ok', noCrit: ['Budget respecté : 13000'] } }
  ] }
];
