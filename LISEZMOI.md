# Forge V3

Chaque idée s'ouvre sur quatre onglets : Fiche, Développer, Risques, Plan. Le bouton ◎ affiche la carte. Le menu ⋮ regroupe Restructurer, Éprouver, les PDF, la copie du texte et la suppression.

## Installation

L'installation (ordinateur et téléphone, hors ligne) se fait depuis une adresse en ligne unique, sur GitHub Pages. Le guide pas à pas est à suivre avec Claude.

## Moteur d'analyse

Par défaut, Forge analyse tes idées sur l'appareil, sans internet et sans IA : repérage des dates, montants, chiffres, personnes, actions et objectifs, évaluation SMART, puis plans, risques et hypothèses tirés de listes types par domaine (musique, association, achat, événement, action culturelle, business, fabrication, formation, dépannage). Chaque élément indique sa provenance : « Toi » (tiré de ton texte), « Méthode » ou « liste type » (connaissance du domaine).

Avec une clé API (facultatif), le menu ⋮ d'une idée propose « Analyse approfondie (Claude) ». Dans Réglages, tu peux aussi choisir Claude comme moteur par défaut.

## Fonctionnement hors ligne

Après le premier lancement en ligne, tout fonctionne sans internet : capture, structuration, analyse, plan, carte, PDF et export agenda. Seules l'analyse approfondie par Claude et la dictée intégrée de Chrome demandent une connexion (hors ligne, utilise le micro du clavier).

## Données

Tout reste sur l'appareil. Pour passer d'un appareil à l'autre : Réglages → Exporter une sauvegarde, puis Importer sur l'autre appareil. Les idées des versions précédentes installées à la même adresse sont reprises au premier lancement.

## Licences

jsPDF (MIT) et la police Inter (SIL Open Font License) sont inclus dans le dossier vendor.

## Mises à jour

Voir `MISE-A-JOUR.md` : signaler une erreur depuis l'app, la faire corriger par Claude (PC ou GitHub), publication automatique sans réinstaller. Les consignes données à Claude sont dans `CLAUDE.md`.

## Historique

- 3.3.0 : moteur 1.3 — coûts du projet : chaque pièce chiffrée est repérée quelle que soit l'écriture (parenthèses, « à », « pour », prix avant le nom, quantités, tarif à la journée × nombre de jours), classée déjà payée ou à payer, additionnée (déjà payé, reste à payer, coût total) et comparée au budget annoncé (marge ou risque de dépassement). Tarifs de vente, entrées, contreparties et objectifs de recette ne sont pas comptés.
- 3.2.1 : moteur 1.2 — corrections issues du jeu aveugle n°2 : « IA » n'est plus une personne, climatiseur à eau sans risque frigorigène (risques humidité et eau stagnante), coût de chaque pièce et somme, critère principal tiré de la phrase d'objectif, casting et mineur pour un clip, fournisseur et stock pour du merch, pièces de dossier listées, prénoms en minuscules, Afdas et OPCO, étapes déjà faites retirées du plan. Mesure sur un nouveau jeu aveugle : 87,5 %.
- 3.2.0 : moteur 1.1 — nature décidée par votes (un mot isolé comme « problème » ne fait plus basculer un projet), vocabulaire sorti dans lexique.js (matériel son précis), montants distingués (investissement déjà fait, tarif, budget), actions en liste et participes (« posé des tarifs »), public « cible : … ».
- 3.1.3 : message clair si engine.js manque sur le site.
- 3.1.2 : bouton « Installer Forge » dans Réglages.
- 3.1.1 : hors ligne fiabilisé (un fichier manquant ne bloque plus le cache, délai réseau de 4 s, état et réparation dans Réglages).
- 3.1.0 : bouton « Signaler une erreur », envoi vers GitHub, mise à jour automatique, bancs d'essai automatisés (`node tests/all.js`).
- 3.0 : onglets Fiche, Développer, Risques, Plan, Carte ; moteur local hors ligne.
