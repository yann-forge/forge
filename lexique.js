/* Forge — lexique du moteur local.
   Données seulement : mots, expressions et poids. Le moteur (engine.js) les lit ; la logique reste dans engine.js.
   Les motifs sont des fragments d'expressions régulières appliqués au texte « replié » : minuscules, sans accents
   (é → e, ç → c…), apostrophes droites. Ajouter un mot ici ne change aucune règle. Après modification : node tests/all.js */
(function (root) {
  'use strict';
  const L = {};

  /* Mots flous : [affiché, motif] */
  L.VAGUE = [['peut-être', 'peut[- ]etre'], ['genre', "genre(?! de| d'|s)"], ['un peu', "un peu(?! de| d')"], ['quelque chose', 'quelque chose'], ['un truc', 'un truc|des trucs'], ['machin', 'machin'], ['plus ou moins', 'plus ou moins'], ['éventuellement', 'eventuellement'], ['à voir', 'a voir|on verra'], ['si possible', 'si possible'], ['sûrement', 'surement|probablement'], ['quelques', 'quelques'], ['plusieurs', 'plusieurs'], ['pas mal', 'pas mal'], ['bientôt', 'bientot'], ['un jour', 'un jour(?! de| ou)'], ['à un moment', 'a un moment'], ['vite fait', 'vite fait'], ['en gros', 'en gros'], ['etc.', 'etc'], ['pourquoi pas', 'pourquoi pas'], ['sympa', 'sympa']];

  /* Publics visés (pour qui) */
  L.AUDIENCE = 'lyceens|collegiens|apprentis|stagiaires|public|gens|personnes|jeunes|ados|adolescents|enfants|familles|parents|seniors|retraites|habitants|riverains|adherents|membres|benevoles|musiciens|artistes|groupes|eleves|etudiants|clients|abonnes|auditeurs|spectateurs|fans|amateurs|debutants|pros|professionnels|guitaristes|bassistes|chanteurs|batteurs|techniciens|partenaires|ecoles|structures|associations|entreprises|commercants|quartier|ville|mairie|collectivites|programmateurs|salles|labels|medias|journalistes|touristes|scolaires|centre social|maisons de quartier|ehpad|hopitaux|personnes agees|personnes handicapees';

  /* Rôles et structures (personnes ou organismes qui aident, financent, valident) */
  L.ROLES = 'afdas|opco|uniformation|cpf|caf|cnc|ville|fondation|inge son|ingenieur du son|technicien|regisseur|graphiste|monteur|monteuse|videaste|photographe|mixeur|masteriseur|producteur|realisateur|beatmaker|musicien|batteur|bassiste|guitariste|chanteur|chanteuse|choriste|comptable|tresorier|tresoriere|president|presidente|secretaire|bureau|conseil d\'administration|benevoles?|mecene|sponsor|partenaire|banque|banquier|mairie|prefecture|region|departement|drac|sacem|cnm|adami|spedidam|urssaf|guso|pole emploi|france travail|imprimeur|fournisseur|distributeur|label|tourneur|attache de presse|programmateur|luthier|electronicien|electricien|frigoriste|soudeur|menuisier|artisan|fablab|ami|amie|pote|frere|soeur|cousin|cousine|pere|mere|copain|copine|collegue|associe|associee';

  /* Matériel nommé précisément : [motif, libellé affiché]. Lu AVANT L.EQUIP : une expression longue
     (« caisson de basses ») l'emporte sur un mot court qu'elle contient (« basse »). */
  L.GEAR = [
    ['boitiers? de scene|stage ?box(?:es)?|boitiers? de patch|multipaires?', 'boîtier de scène (stagebox)'],
    ['caissons? (?:de |des )?basses?|subwoofers?|caissons? de graves?', 'caisson de basses'],
    ['systemes? de diffusion|systemes? de sonorisation|diffusion facade', 'système de diffusion'],
    ['satellites', 'enceintes satellites'],
    ['enceintes? (?:actives?|passives?|amplifiees?)', 'enceintes'],
    ['(?:preamplis?|preamps?) warm audio|warm audio', 'préampli Warm Audio'],
    ['preamplis?(?: micro)?|preamps?|pre-amplis?', 'préamplis'],
    ['cartes? rme|interfaces? rme|rme', 'interface RME'],
    ['consoles? numeriques?|consoles? analogiques?', 'console'],
    ['retours? de scene|wedges?|in-ears?', 'retours'],
    ['micros? statiques?|micros? dynamiques?|micros? a ruban', 'micros'],
    ['boites? de direct|boitiers? di|di box', 'boîtes de direct (DI)'],
    ['home studio|studio partage|studio d\'enregistrement', 'studio']
  ];

  /* Matériel générique (ressources) */
  L.EQUIP = 'qu-?\\d+|x32|m32|sq-?\\d|dlive|platines|cdj|micro|micros|interface|carte son|console|table de mixage|enceintes?|retours?|ampli|amplis|amplificateur|guitare|basse|batterie|clavier|synthe|synthetiseur|pedales?|pedalier|cables?|casque|ordinateur|ordi|pc|mac|logiciel|daw|ableton|cubase|reaper|pro tools|logic|plugin|camera|appareil photo|eclairage|projecteurs?|lumieres?|sono|scene|vehicule|camion|voiture|remorque|local|salle|studio|atelier|garage|imprimante 3d|imprimante|fer a souder|station de soudage|oscilloscope|multimetre|generateur|alimentation de labo|perceuse|visseuse|scie|ponceuse|defonceuse|etabli|etau|tour|fraiseuse|laser|cnc|arduino|raspberry|esp32|breadboard|site internet|site web|compte bancaire|stock|outils?|materiel';

  /* Mots qui ressemblent à des prénoms mais n'en sont pas (début de phrase, marques, lieux, organismes) */
  L.NON_PERSONNES = ['J\'ai', 'J’ai', 'Déjà', 'Reste', 'Ensuite', 'Puis', 'Aussi', 'Enfin', 'Après', 'Avant', 'Depuis', 'Total', 'Budget', 'Dépenses', 'Matériel', 'Pièces', 'Objectif', 'Je', 'Il', 'On', 'Le', 'La', 'Les', 'Un', 'Une', 'Pour', 'Avec', 'Et', 'Mais', 'Spotify', 'Deezer', 'Youtube', 'YouTube', 'Bandcamp', 'Instagram', 'Facebook', 'Tiktok', 'TikTok', 'Amazon', 'Thomann', 'Leboncoin', 'Angers', 'Paris', 'Nantes', 'Tours', 'Lyon', 'Mairie', 'Région', 'Drac', 'DRAC', 'Sacem', 'SACEM', 'Urssaf', 'URSSAF', 'Arduino', 'Qu', 'Noël', 'IA', 'AI', 'ChatGPT', 'Claude', 'Midjourney', 'Canva', 'Photoshop', 'Internet', 'Google', 'Paypal', 'PayPal', 'Shopify', 'Etsy', 'Vinted', 'Afdas', 'AFDAS', 'Guso', 'GUSO', 'Cnm', 'CNM', 'Adami', 'Spedidam'];

  /* Composants électroniques et mécaniques (fabrication) */
  L.COMPONENTS = 'resistances?|condensateurs?|transistors?|diodes?|leds?|potentiometres?|potars?|footswitch|footswitchs|interrupteurs?|switchs?|jacks?|boitiers?|boitier|pcb|circuit imprime|plaque d\'essai|veroboard|stripboard|ampli op|aop|op-amp|ne5532|tl072|jrc4558|lm386|lampes?|tubes?|12ax7|el34|el84|6l6|transfos?|transformateurs?|self|redresseur|regulateur|compresseurs?|ventilateurs?|ventilo|echangeur|evaporateur|condenseur|radiateur|dissipateur|peltier|module peltier|tuyaux?|cuivre|fluide|gaz|r290|r32|r410a|thermostat|capteurs?|sondes?|moteurs?|relais|fusibles?|cordon secteur|prise|batterie lithium|accu|cellules|bms|haut-parleurs?|hp|baffle|caisson|bois|contreplaque|mdf|alu|aluminium|acier|tole|vis|colle|peinture|vernis|tissu|grille';

  /* Objets qu'on fabrique soi-même */
  L.MAKE_OBJ = 'ampli|amplificateur|preampli|pedale|pedalboard|enceinte|baffle|caisson|synthe|synthetiseur|boite a rythmes|flight case|meuble|etagere|table|lampe|boitier|cable|cables|micro|guitare|basse|instrument|controleur|sequenceur|clim|climatiseur|ventilateur|radiateur|robot|drone|machine';

  /* Matériel technique (achat, panne) */
  L.TECH_GEAR = 'carte son|interface|console|table de mixage|ampli|micro|enceinte|ordinateur|ordi|logiciel|pedale|cable|synthe|clavier|guitare|basse|batterie|casque|plugin|qu-?\\d|camera|projecteur';

  /* Véhicules */
  L.VEHICLE = 'camion|camionnette|voiture|vehicule|utilitaire|van|fourgon|remorque|scooter';

  /* Domaines : libellé et mots-clés pondérés (1 à 3). Le domaine retenu est celui qui cumule le plus de points. */
  L.DOMAINS = {
    musique: { label: 'Musique', kw: { 'booker': 3, 'booking': 3, 'programmateurs': 3, 'dossier de presse': 3, 'dates de concert': 3, 'trio': 2, 'quartet': 2, 'solo': 1, 'enregistre': 2, 'pressage': 3, 'presser': 3, 'album': 3, 'ep': 3, 'single': 3, 'morceau': 3, 'morceaux': 3, 'titre': 1, 'chanson': 3, 'chansons': 3, 'compo': 3, 'composer': 3, 'composition': 3, 'enregistrer': 2, 'enregistrement': 3, 'studio': 2, 'mixage': 3, 'mixer': 2, 'mastering': 3, 'master': 1, 'maquette': 2, 'demo': 2, 'clip': 3, 'groupe': 2, 'repet': 2, 'repetition': 2, 'concert': 2, 'tournee': 3, 'live': 1, 'spotify': 3, 'deezer': 3, 'bandcamp': 3, 'streaming': 3, 'distribution': 1, 'vinyle': 3, 'cd': 2, 'sacem': 2, 'musique': 2, 'musical': 2, 'podcast': 3, 'beat': 2, 'prod': 1, 'chanteur': 1, 'guitare': 1, 'basse': 1, 'batterie': 1, 'jazz': 2, 'rock': 2, 'folk': 2, 'rap': 2, 'electro': 2, 'arrangement': 2, 'paroles': 3, 'texte': 1, 'label': 1, 'sortie': 1, 'playlist': 3, 'radio': 2, 'son': 1, 'sound': 1 } },
    asso: { label: 'Association', kw: { 'association': 3, 'asso': 3, 'tlm103': 3, 'bureau': 2, 'ca': 1, "conseil d'administration": 3, 'ag': 2, 'assemblee generale': 3, 'statuts': 3, 'adherent': 3, 'adherents': 3, 'adhesion': 3, 'cotisation': 3, 'subvention': 3, 'subventions': 3, 'dossier': 2, 'prefecture': 3, 'mairie': 2, 'benevole': 3, 'benevoles': 3, 'mecenat': 3, 'mecene': 3, 'rescrit': 3, 'recu fiscal': 3, 'cerfa': 3, 'tresorerie': 2, 'tresorier': 3, 'president': 2, 'loi 1901': 3, 'compte rendu': 2, 'demarche': 2, 'demarches': 2, 'administratif': 2, 'licence': 2, 'guso': 3, 'convention': 2, 'partenariat': 2 } },
    achat: { label: 'Achat de matériel', kw: { 'acheter': 3, 'achat': 3, 'commander': 2, 'commande': 1, 'investir': 2, 'investissement': 2, 'occasion': 3, 'neuf': 2, 'leboncoin': 3, 'thomann': 3, 'woodbrass': 3, 'amazon': 2, 'magasin': 2, 'prix': 2, 'modele': 2, 'marque': 2, 'comparer': 3, 'budget': 1, 'louer': 2, 'location': 2, 'devis': 2, 'remplacer': 2, 'upgrade': 3, 'equiper': 3, "s'equiper": 3, 'materiel': 2 } },
    evenement: { label: 'Événement', kw: { 'anniversaire': 2, 'ans de': 2, 'celebrer': 3, 'inauguration': 3, 'soiree concert': 3, 'festival': 3, 'soiree': 3, 'evenement': 3, 'event': 3, 'concert': 2, 'spectacle': 3, 'scene': 1, 'programmation': 3, 'programmer': 2, 'billetterie': 3, 'billets': 3, 'entree': 2, 'jauge': 3, 'salle': 2, 'lieu': 2, 'buvette': 3, 'catering': 3, 'artistes': 2, 'plateau': 2, 'affiche': 2, 'communication': 1, 'flyer': 2, 'technique': 1, 'sono': 2, 'lumiere': 2, 'regie': 2, 'securite': 2, 'benevoles': 1, 'date': 1, 'organiser': 3, 'fete': 2, 'bal': 2, 'vernissage': 3, 'apero': 2, 'scene ouverte': 3, 'jam': 3, 'open mic': 3, 'tremplin': 3 } },
    culturel: { label: 'Action culturelle', kw: { 'faire decouvrir': 3, 'decouvrir': 2, 'metier': 2, 'metiers': 2, 'lyceens': 3, 'collegiens': 3, 'eleves': 2, 'bac pro': 3, 'apprentis': 2, 'immersion': 3, 'mise en situation': 2, 'ados': 2, 'adolescents': 2, 'jeunes': 1, 'enfants': 1, 'habitants': 2, 'creation sonore': 3, 'restitution': 3, 'seances': 2, 'ateliers de': 3, 'atelier': 3, 'ateliers': 3, 'action culturelle': 3, 'mediation': 3, 'eac': 3, 'education artistique': 3, 'ecole': 2, 'ecoles': 2, 'college': 2, 'lycee': 2, 'scolaire': 3, 'scolaires': 3, 'residence': 3, 'intervention': 3, 'quartier': 2, 'centre social': 3, 'ehpad': 3, 'public': 1, 'publics': 2, 'sensibiliser': 3, 'sensibilisation': 3, 'transmission': 3, 'pedagogique': 3, 'drac': 3, 'appel a projets': 3, 'politique de la ville': 3, 'inclusion': 2, 'participatif': 3, 'exposition': 2, 'rencontre': 2, 'conference': 2, 'patrimoine': 3, 'decouverte': 2, 'initiation': 3 } },
    business: { label: 'Business', kw: { 'offre': 2, 'location de': 2, 'journee': 1, 'contrat de location': 3, 'assurer le materiel': 2, 'page web': 1, 'business': 3, 'entreprise': 3, 'societe': 2, 'micro-entreprise': 3, 'auto-entrepreneur': 3, 'auto entrepreneur': 3, 'siret': 3, 'statut': 2, 'clients': 3, 'client': 3, 'vendre': 3, 'vente': 3, 'ventes': 3, 'chiffre d\'affaires': 3, 'ca': 1, 'marge': 3, 'rentable': 3, 'rentabilite': 3, 'benefice': 3, 'tarif': 3, 'tarifs': 3, 'prix de vente': 3, 'devis': 2, 'facture': 3, 'facturer': 3, 'urssaf': 3, 'tva': 3, 'marche': 2, 'concurrence': 3, 'concurrents': 3, 'boutique': 3, 'e-commerce': 3, 'site de vente': 3, 'etsy': 3, 'commercialiser': 3, 'lancer ma': 2, 'lancer mon': 2, 'service': 1, 'prestation': 2, 'prestations': 2, 'investisseur': 3, 'pret': 2, 'banque': 2, 'business plan': 3, 'freelance': 3 } },
    formation: { label: 'Formation', kw: { 'former': 3, 'formation': 3, 'apprendre': 3, 'cours': 2, 'tuto': 2, 'tutos': 2, 'tutoriel': 2, 'certification': 3, 'diplome': 2, 'progresser': 3, 'maitriser': 3, 'pratiquer': 2, 'entrainer': 2, 'exercices': 2, 'methode': 1, 'stage': 2, 'masterclass': 3 } },
    fabrication: { label: 'Fabrication', kw: { 'fabriquer': 3, 'fabrication': 3, 'construire': 3, 'construction': 2, 'diy': 3, 'bricoler': 3, 'bricolage': 3, 'prototype': 3, 'souder': 3, 'soudure': 3, 'circuit': 3, 'schema': 3, 'pcb': 3, 'composants': 3, 'electronique': 3, 'pedale': 3, 'pedales': 3, 'overdrive': 3, 'fuzz': 3, 'distortion': 3, 'delay': 2, 'reverb': 2, 'ampli': 2, 'amplificateur': 3, 'lampes': 2, 'lampe': 1, 'enceinte': 2, 'baffle': 3, 'climatiseur': 3, 'clim': 3, 'compresseur': 2, 'peltier': 3, 'refroidir': 2, 'ventilateur': 2, 'boitier': 3, 'imprimante 3d': 3, 'impression 3d': 3, 'modelisation': 3, 'cnc': 3, 'arduino': 3, 'esp32': 3, 'raspberry': 3, 'capteur': 2, 'moteur': 2, 'menuiserie': 3, 'bois': 1, 'atelier': 1, 'plans': 2, 'kit': 2, 'monter': 1, 'transfo': 3, 'alimentation': 2, 'tension': 2, 'watts': 2, 'luthier': 3, 'lutherie': 3 } }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = L; else root.ForgeLexique = L;
})(typeof window !== 'undefined' ? window : globalThis);
