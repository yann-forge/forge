/* Tests de robustesse : variantes ciblées sur les défauts du signalement FB-STUDIO (21/11/2026).
   Chaque cas vérifie qu'une tournure piège ne fait pas dérailler le moteur, et des cas témoins vérifient
   que la correction ne casse pas l'inverse (un vrai problème reste un problème, un vrai budget reste un budget).
   Écrits AVANT la refonte, sans exécuter le moteur. Lancer : SET=./reformulations.js node tests/bench.js -v */
const T = (id, text, expect, note) => ({ id, theme: 'Robustesse', level: 'variante', note, steps: [{ kind: 'raw', text, expect }] });
module.exports = [
  /* 1. Le mot « problème » dans un projet */
  T('RF-NAT1', "J'aimerai vendre des journées d'enregistrement dans mon studio, ça règle le problème des artistes qui n'ont pas de budget.",
    { dom: 'Business', nat: 'projet', noTitle: 'Résoudre', noPlan: ['symptôme'] }, 'j’aimerai sans s + problème'),
  T('RF-NAT2', "Sortir un EP de 5 titres en juin 2027, ça résout le problème de visibilité du groupe.",
    { dom: 'Musique', nat: 'projet', due: '2027-06-30', noPlan: ['symptôme', 'Isoler la cause'] }, 'projet musical + problème'),
  T('RF-NAT3', "alors en gros je voudrais lancer mon activité d'ingé son, studio et live, le souci c'est de trouver des clients avant l'été 2027",
    { dom: 'Business', nat: 'projet', T: '!absent', noPlan: ['symptôme'] }, 'oral + souci'),
  T('RF-NAT4', "Organiser une soirée concert au Quart'Ney en avril pour régler le problème de trésorerie de l'asso, objectif 150 entrées à 8 euros.",
    { nat: 'projet', M: 'ok', noPlan: ['symptôme', 'Isoler la cause'] }, 'événement + problème'),
  /* 2. Témoins : un vrai problème doit rester un problème */
  T('RF-NAT5', "Mon ampli fait un bruit de masse dès que je branche la pédale de delay, je dois trouver d'où vient le problème avant le concert du 12 décembre.",
    { nat: 'problème à résoudre', due: '2026-12-12' }, 'témoin panne'),
  T('RF-NAT6', "Le PC du studio plante pendant les enregistrements depuis la dernière mise à jour.",
    { nat: 'problème à résoudre' }, 'témoin panne sans verbe'),
  /* 3. Rôle des montants */
  T('RF-MON1', "J'ai déjà dépensé 3000 euros en micros l'an dernier, je veux louer mon kit 80 euros la journée aux groupes du coin.",
    { dom: 'Business', noRes: ['Budget : 80', 'Budget : 3000'], noCrit: ['Budget respecté'] }, 'dépense passée + tarif'),
  T('RF-MON2', "Acheter une interface audio 8 entrées, budget 500 euros maximum, avant fin janvier.",
    { dom: 'Achat', res: ['500'], due: '2027-01-31', crit: ['500'] }, 'témoin vrai budget'),
  T('RF-MON3', "Monter une offre de mixage à 150 euros le titre, objectif 2000 euros de chiffre d'affaires par mois d'ici septembre 2027.",
    { dom: 'Business', M: 'ok', crit: ['2000'], noRes: ['Budget : 150'] }, 'tarif + objectif'),
  /* 4. Lexique matériel son */
  T('RF-LEX1', "Proposer mes services de sonorisation aux groupes locaux : j'ai une stagebox 16 entrées, une console Allen & Heath, deux enceintes actives, un caisson de basse et 6 retours.",
    { dom: 'Business', res: ['stagebox', 'console', 'caisson', 'retours'], noRes: ['Déjà là : basse'] }, 'matériel de sono'),
  T('RF-LEX2', "Enregistrer la maquette du groupe dans mon home studio : interface RME, 8 préamplis, deux micros statiques et un casque.",
    { dom: 'Musique', res: ['RME', 'préampli', 'micro'] }, 'matériel studio'),
  /* 5. Actions avec fautes et en liste */
  T('RF-ACT1', "Pour lancer le studio, il faut que je fasse valoir mon offre, posé mes prix et démarché les salles du coin.",
    { act: ['valoir', 'prix', 'salles'] }, 'participes au lieu d’infinitifs'),
  T('RF-ACT2', "Je dois créer un site, faire des photos du studio et contacter les écoles de musique d'Angers.",
    { act: ['Créer un site', 'photos', 'Contacter les écoles'] }, 'liste d’actions'),
  T('RF-ACT3', "Mon studio s'adresse aux artistes qui débutent et répond à une demande de prix bas, je veux le lancer en mars 2027.",
    { noAct: ['Répond'], noPlan: ['Répond'], T: 'ok' }, 'positionnement, pas action'),
  /* 6. Statut */
  T('RF-STA1', "Vendre des prestations son : le live en CDDU via mon statut d'intermittent, les enregistrements studio sur facture en micro-entreprise.",
    { dom: 'Business', risk: ['statut'], plan: ['statut'] }, 'intermittence + facture')
];
