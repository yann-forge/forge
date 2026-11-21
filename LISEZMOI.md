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

- 3.1.1 : hors ligne fiabilisé (un fichier manquant ne bloque plus le cache, délai réseau de 4 s, état et réparation dans Réglages).
- 3.1.0 : bouton « Signaler une erreur », envoi vers GitHub, mise à jour automatique, bancs d'essai automatisés (`node tests/all.js`).
- 3.0 : onglets Fiche, Développer, Risques, Plan, Carte ; moteur local hors ligne.
