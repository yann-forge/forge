/* Jeu aveugle n°3 — écrit le 21/11/2026 APRÈS le moteur 1.2 mais AVANT de l'exécuter dessus, attentes fixées à la main.
   Idées rédigées dans le style de Yann (oral, fautes, phrases enchaînées) sur ses domaines, avec quelques pièges.
   Sert UNIQUEMENT à mesurer : ne jamais régler le moteur dessus, ne jamais modifier ses attentes.
   Alternatives : « a|b » = l'un ou l'autre suffit. */
const T = (id, theme, text, expect) => ({ id, theme, level: 'style', steps: [{ kind: 'raw', text, expect }] });
module.exports = [
  T('AV3-1', 'Achat de matériel', "faut que je m'achete un camion pour les prestas, un trafic ou un jumpy d'occasion, max 9000 euros, je dois revendre ma clio avant fevrier",
    { dom: 'Achat', nat: 'projet|action ponctuelle', due: '2027-02-28', res: ['9000'], act: ['revendre'], risk: ['occasion|état|garantie|panne'], crit: ['9000'], noRisk: ['frigorig', 'symptôme'] }),
  T('AV3-2', 'Fabrication', "fabriquer un ampli guitare 15w a lampes en kit, j'ai deja le boitier et le transfo de sortie, il me manque les lampes el84 et le transfo d'alim, je veux le finir pour noel",
    { dom: 'Fabrication', nat: 'projet', due: '2026-12-25', res: ['boitier|boîtier', 'el84|lampes'], risk: ['électrique'], noRisk: ['frigorig', 'humidit'] }),
  T('AV3-3', 'Association', "on doit faire l'AG de l'asso avant fin mars, faut envoyer les convocs 15 jours avant, le tresorier doit faire le bilan financier et faut renouveler le bureau",
    { dom: 'Association', due: '2027-03-31', T: 'ok', act: ['convoc'], plan: ['rapport|bilan'], risk: ['quorum|participation|présents|presents'], noRisk: ['électrique'] }),
  T('AV3-4', 'Événement', "je voudrais organiser une scène ouverte tous les premiers jeudi du mois au bar le Chabada a partir de janvier, entrée gratuite au chapeau, faut une petite sono et quelqu'un pour l'accueil",
    { dom: 'Événement', nat: 'projet', T: '!absent', res: ['sono'], risk: ['fréquentation|public|remplissage|régularité'], noRes: ['Budget'] }),
  T('AV3-5', 'Business', "lancer une offre de location de lumière pour les mariages, j'ai 8 par led et une console dmx, je loue le pack 150 euros le week-end, faut faire un contrat de location et assurer le materiel",
    { dom: 'Business', nat: 'projet', res: ['150', 'console'], noRes: ['Budget : 150'], act: ['contrat', 'assurer'], risk: ['casse|dégradation|assurance|dommage'], hyp: ['150'] }),
  T('AV3-6', 'Musique', "enregistrer une live session video de 3 titres au studio en janvier, j'ai besoin d'un cadreur et de 2 cameras en plus, budget 400 balles",
    { dom: 'Musique', nat: 'projet', due: '2027-01-31', res: ['400'], plan: ['tourn|captation|filmer', 'montage|monter'], crit: ['400'], noRisk: ['symptôme'] }),
  T('AV3-7', 'Personnel', "depuis que j'ai changé de cable usb l'interface se deconnecte toute seule pendant les prises, ca me ruine les sessions, faut que je trouve avant jeudi",
    { nat: 'problème à résoudre', T: '!absent', plan: ['cause|isoler|symptôme'], noPlan: ['client', 'prix'] }),
  T('AV3-8', 'Action culturelle', "proposer aux ecoles de trelaze des interventions sur les metiers du spectacle, montrer la regie son et lumiere aux eleves de cm2, voir avec la mairie et l'inspection",
    { dom: 'Action culturelle|Culturel', nat: 'projet', R: '!absent', dep: ['mairie'], risk: ['autorisation|scolaire|encadrement|calendrier'], noRisk: ['frigorig'] }),
  T('AV3-9', 'Musique', "le gros souci c'est que personne connait le label, je veux faire une campagne de pub sur insta pour la sortie de l'album en mai 2027, budget 300 euros",
    { dom: 'Musique', nat: 'projet', due: '2027-05-31', res: ['300'], noPlan: ['symptôme', 'Isoler la cause'], noRisk: ['Cause mal identifiée'] }),
  T('AV3-10', 'Formation', "apprendre a me servir de la dlive pour bosser sur les gros festivals, regarder les tutos et demander a la boite si je peux m'entrainer sur la console entre deux presta",
    { dom: 'Formation', nat: 'projet', T: 'absent', act: ['tuto', 'demander'], noRisk: ['frigorig', 'symptôme'] })
];
