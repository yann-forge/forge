/* Coûts du projet : listes de pièces chiffrées sous toutes les formes. Écrit le 21/11/2026 AVANT le code,
   totaux calculés à la main. Attente « cost » : deja (déjà payé), reste (à payer), total, budget (annoncé, sinon null), n (nombre de pièces).
   Règles retenues :
   - une pièce sans indication de statut est « à payer » ;
   - « 2 potars à 3 € » = 3 € pièce (6 €) ; « 2 potars pour 6 € » = 6 € au total ;
   - un tarif de vente, une entrée, un objectif de recette ou de subvention ne sont pas des coûts ;
   - pas de bloc de coûts pour un seul montant (c'est un budget ou un prix, pas une liste). */
const T = (id, text, expect, note) => ({ id, theme: 'Coûts', level: 'liste', note, steps: [{ kind: 'raw', text, expect }] });
module.exports = [
  T('CO-1', "Fabriquer une pédale. Matériel : boîtier (12 euros), potentiomètres (8 euros), jacks (6 euros).",
    { cost: { deja: 0, reste: 26, total: 26, budget: null, n: 3 }, crit: ['26'], noRes: ['Budget : 12', 'Budget : 8'] }, 'parenthèses'),
  T('CO-2', "Fabriquer une pédale. Il me faut un boîtier à 12 euros, des potentiomètres 8 euros et des jacks pour 6 euros.",
    { cost: { deja: 0, reste: 26, total: 26, budget: null, n: 3 }, noRes: ['Budget : 8', 'Prix envisagé : 12'] }, 'à / rien / pour'),
  T('CO-3', "Fabriquer une pédale. J'ai déjà acheté le boîtier (12 euros) et les jacks (6 euros). Reste à acheter : potentiomètres (8 euros), circuit (15 euros).",
    { cost: { deja: 18, reste: 23, total: 41, budget: null, n: 4 }, res: ['41'], noRes: ['et les jacks'] }, 'payé puis à payer'),
  T('CO-4', "Fabriquer une pédale, budget 50 euros. Matériel : boîtier (12 euros), potentiomètres (8 euros).",
    { cost: { deja: 0, reste: 20, total: 20, budget: 50, n: 2 }, crit: ['50'], noRisk: ['Dépassement'] }, 'budget suffisant'),
  T('CO-5', "Construire un pedalboard, budget 30 euros. Pièces : boîtier 12 €, potars 8 €, jacks 6 €, pcb 10 €.",
    { cost: { deja: 0, reste: 36, total: 36, budget: 30, n: 4 }, risk: ['Dépassement'], noRes: ['Budget : 12'] }, 'budget dépassé, symbole €'),
  T('CO-6', "Monter un rack d'effets : 12 euros le boîtier, 8 euros les potars, 25 euros le transfo.",
    { cost: { deja: 0, reste: 45, total: 45, budget: null, n: 3 } }, 'prix avant le nom'),
  T('CO-7', "Faire un câble multipaire : 4 jacks à 1,50 euros pièce, 2 connecteurs XLR à 3 euros et 10 mètres de câble pour 15 euros.",
    { cost: { deja: 0, reste: 27, total: 27, budget: null, n: 3 } }, 'quantités et décimales'),
  T('CO-8', "Pour la soirée de l'asso, j'ai réglé la salle 300 euros et le traiteur 450 euros, il reste à payer le son 600 euros et la déco 150 euros.",
    { cost: { deja: 750, reste: 750, total: 1500, budget: null, n: 4 } }, 'événement, réglé / reste à payer'),
  T('CO-9', "Monter mon home studio : j'ai déjà payé le micro 120 euros et le casque 80 euros, il me manque une interface 200 euros et des câbles 30 euros.",
    { cost: { deja: 200, reste: 230, total: 430, budget: null, n: 4 } }, 'déjà payé / il me manque'),
  T('CO-10', "Réparer l'ampli : condensateurs (3,50 €), résistances (1,20 €), lampes (40 €).",
    { cost: { deja: 0, reste: 44.7, total: 44.7, budget: null, n: 3 } }, 'décimales avec €'),
  T('CO-11', "Organiser un concert le 14 mars : entrée 8 euros, objectif 120 personnes. Dépenses : cachet des groupes 300 euros, location sono 150 euros, affiches 40 euros.",
    { cost: { deja: 0, reste: 490, total: 490, budget: null, n: 3 }, noRes: ['Budget : 300'] }, 'entrée exclue'),
  T('CO-12', "Vendre des journées de studio, je vends la journée 200 euros. J'ai acheté un micro 300 euros et une interface 400 euros.",
    { cost: { deja: 700, reste: 0, total: 700, budget: null, n: 2 }, res: ['200'] }, 'tarif exclu'),
  T('CO-13', "Acheter une interface audio 250 euros avant fin janvier.",
    { noCost: true, res: ['250'] }, 'un seul montant : pas de liste'),
  T('CO-14', "Demander une subvention pour récolter 2000 euros. Dépenses prévues : salle 500 euros, communication 200 euros.",
    { cost: { deja: 0, reste: 700, total: 700, budget: null, n: 2 } }, 'objectif de recette exclu'),
  T('CO-15', "Finir l'ampli. Il y a un mois j'ai commandé le pcb (15 euros). Il faut encore les lampes (40 euros) et le transfo (35 euros).",
    { cost: { deja: 15, reste: 75, total: 90, budget: null, n: 3 } }, 'statut dans des phrases séparées'),
  T('CO-16', "Fabriquer une enceinte, pas plus de 100 euros. Haut-parleur (60 euros), bois (25 euros), filtre (25 euros).",
    { cost: { deja: 0, reste: 110, total: 110, budget: 100, n: 3 }, risk: ['Dépassement'] }, 'plafond dépassé'),
  T('CO-17', "Préparer la tournée : van 450 euros déjà réglé, essence 200 euros, péages 80 euros.",
    { cost: { deja: 450, reste: 280, total: 730, budget: null, n: 3 } }, 'statut après le montant'),
  T('CO-18', "Faire le merch : t-shirts 300 euros, stickers 60 euros, budget total 400 euros.",
    { cost: { deja: 0, reste: 360, total: 360, budget: 400, n: 2 }, noRisk: ['Dépassement'] }, 'budget annoncé après la liste'),
  /* ajoutés après les premiers essais (vérification de formulations piégeuses), attentes calculées à la main avant correction */
  T('CO-19', "Enregistrer un EP : le studio coûte 400 euros la journée, il faut 3 jours, et le mix 150 euros par titre pour 4 titres.",
    { cost: { deja: 0, reste: 1800, total: 1800, budget: null, n: 2 }, res: ['studio 1200'], noRes: ['coûte'] }, 'tarif unitaire × quantité'),
  T('CO-20', "Organiser un festival, budget 5000 euros. Déjà payé : la scène 1200 euros. Reste : cachets 2500 euros, sécu 600 euros, com 300 euros.",
    { cost: { deja: 1200, reste: 3400, total: 4600, budget: 5000, n: 4 }, noRes: ['Déjà ('] }, 'titres « Déjà payé : » / « Reste : »'),
  T('CO-21', "Je vends mes pédales 90 euros pièce, le kit me coûte 35 euros et la boîte 8 euros.",
    { cost: { deja: 0, reste: 43, total: 43, budget: null, n: 2 }, res: ['kit 35', '90'], noRes: ['coûte'] }, 'prix de vente exclu, coût de revient compté')
];
