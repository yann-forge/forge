# Forge — consignes pour Claude

Forge est une PWA (HTML/CSS/JS sans framework ni build) qui capture des idées à la voix et les structure en fiche SMART, SWOT, risques et plan. Elle est servie par GitHub Pages depuis la racine de la branche `main`. Tout pousser sur `main` publie l'app : le service worker est « réseau d'abord », les appareils récupèrent la nouvelle version à la prochaine ouverture en ligne, sans réinstallation.

Langue : français, partout (code commenté, interface, commits, PR). Ton sobre, pas de formules marketing.

## Règle de fond, non négociable

Forge est intelligente mais **jamais générative ni créative**. Le moteur extrait, classe, vérifie et applique des méthodes. Il n'invente pas d'idées, de noms, de chiffres ou de dates à la place de l'utilisateur.

- Tout élément affiché porte sa provenance : `dit` (écrit par l'utilisateur), `deduit` (déduit de son texte), `methode` (étape standard d'une méthode), `liste` (risque ou hypothèse d'une base de connaissance), `ajout` (ajouté à la main).
- Une base de connaissance (PLAN, RISKS, HYPOS, TESTS, QUESTIONS dans `engine.js`) ne contient que des éléments génériques et vérifiables du domaine. Jamais de contenu propre à un cas signalé.
- En cas de doute, le moteur pose une question plutôt que de supposer.

## Fichiers

| Fichier | Rôle |
|---|---|
| `lexique.js` | Vocabulaire du moteur (données seulement) : domaines et mots-clés pondérés, matériel nommé (GEAR, lu avant le matériel générique), rôles, publics, composants, mots flous. Enrichir ici en priorité : aucune logique ne change. |
| `engine.js` | Moteur local hors ligne. `structure(text, {cats, today})` et `eprouver(text, structure, {today})`. Exporté en `window.ForgeEngine` et `module.exports`. Constante `version`. |
| `app.js` | Interface, stockage localStorage (`forge3.ideas.v1`, `forge3.settings.v1`), carte, PDF, appels API Claude facultatifs. Constante `APP_VERSION`. |
| `report.js` | Bouton « Signaler une erreur », stockage `forge3.reports.v1`, export JSON, ticket GitHub pré-rempli. Partagé avec la version artefact. |
| `sw.js` | Service worker. `CACHE = 'forge3-<APP_VERSION>'`, liste `ASSETS`. |
| `index.html`, `style.css`, `manifest.webmanifest`, `icons/`, `vendor/` | Coque, charte, icônes, jsPDF et police Inter. Ne pas toucher à `vendor/`. |
| `tests/` | Bancs d'essai. `node tests/all.js` lance tout. |
| `feedback/` | Signalements exportés déposés par l'utilisateur, à traiter puis vider. |

Charte : fond sombre, violet `#7b4dd6`, mauve `#c49be6`, vert `#4fd1a0`, police Inter, coins arrondis, petits effets (dégradés, transitions courtes). Le logo (cerveau blanc + roue dentée sur violet) ne change pas.

## Tests : obligatoires

```
node tests/all.js        # cohérence + jeux développement, contrôle, aveugle, signalements, reformulations
node tests/all.js -v     # avec le détail
node tests/bench.js -v --only=MUS-2            # un scénario
SET=./feedback.js node tests/bench.js -v       # un jeu précis
```

Photo de référence : `tests/baseline/moteur-1.0.json` contient toutes les sorties du moteur 1.0 sur tous les jeux. Avant toute refonte : `node tests/snapshot.js --compare=tests/baseline/moteur-1.0.json` liste champ par champ ce qui change. Chaque écart doit être une amélioration expliquée dans le commit ; un écart inexpliqué est une régression. Après une version validée, prendre une nouvelle photo (`node tests/snapshot.js`).

Jeux aveugles : `tests/blind3.js` est le jeu de MESURE actuel (non bloquant, ne jamais régler le moteur dessus ni modifier ses attentes). Quand on corrige ses défauts, il devient un jeu d'entraînement (bloquant) et il faut écrire un nouveau jeu aveugle AVANT d'exécuter le moteur dessus. `blind2.js` est un ancien aveugle devenu entraînement.

`tests/couts.js` : listes de pièces chiffrées et totaux attendus (déjà payé, à payer, total, budget). Règles : pièce sans statut = à payer ; « 2 × à 3 € » = prix unitaire ; « pour 6 € » = prix global ; tarifs de vente, entrées, contreparties et recettes exclus ; pas de bloc coûts pour un montant isolé.

`tests/reformulations.js` : variantes pièges (mot « problème » dans un projet, rôle des montants, lexique son, actions mal orthographiées, statut) et cas témoins inverses. Un correctif doit faire passer les variantes sans casser les témoins.

Format d'un scénario (voir l'en-tête de `tests/scenarios.js`) : `steps` = `raw` puis `prec` ou `ans:<critère>` ; `expect` cumulatif par étape : `dom`, `nat`, `S/M/A/R/T` (`ok`, `partiel`, `absent`, `!absent`, `ok*`), `due`, `title`, listes de fragments attendus `res/act/plan/risk/hyp/dep/crit/force/faib/opp`, fragments interdits `noRisk/noPlan/noRes/noAct/noCrit/noFaib/noHyp`, `noTitle`, état `!ok`. Dans `tests/feedback.js`, ajouter `today` (date du signalement) et `source` (id du signalement).

Règles :
1. Aucun commit sur `main` si `node tests/all.js` échoue.
2. Aucune régression : un correctif ne fait jamais baisser un autre jeu. Si deux attentes se contredisent, s'arrêter et l'expliquer dans la PR plutôt que d'en affaiblir une.
3. Ne jamais modifier les attentes de `scenarios.js`, `holdout.js` et `blind.js` pour faire passer un test. Seule exception : une attente prouvée fausse, à justifier ligne par ligne dans la PR.
4. Corriger par des règles générales (motifs, lexiques, priorités), jamais par un cas particulier codé en dur (pas de test sur une phrase ou un nom précis).

## Traiter un signalement

Entrée : un ticket GitHub `[Signalement] …` (le JSON est dans le commentaire HTML `<!-- forge-report … -->`) ou un fichier `feedback/forge-signalements-*.json`.

1. Convertir : `node tests/import-reports.js <fichier>` (accepte aussi le corps du ticket enregistré dans un fichier). On obtient un squelette par signalement.
2. Écrire les attentes **avant** de toucher au moteur, uniquement à partir de `faux`, `attendu` et du texte saisi. Ne rien attendre que le texte ne permette pas de trouver. Ajouter le scénario à `tests/feedback.js`.
3. Vérifier qu'il échoue : `SET=./feedback.js node tests/bench.js -v --only=FB-…`. S'il passe déjà, le moteur a été corrigé entre-temps : le noter.
4. Diagnostiquer dans `engine.js` (détection de dates, montants, personnes, domaine, actions, bases de connaissance) et corriger de façon générale.
5. `node tests/all.js` : tout à 100 %. Si un point reste impossible à corriger proprement, mettre `todo: true` sur ce scénario et l'expliquer.
6. Incrémenter la version (voir plus bas).
7. Supprimer le fichier traité de `feedback/` (son contenu vit désormais dans `tests/feedback.js`).
8. Commit en français : `moteur : <ce qui est corrigé> (signalement R-…)`.

Confidentialité : le dépôt est public. Dans `tests/feedback.js`, remplacer les noms de personnes privées par des prénoms génériques et retirer téléphones, adresses et e-mails, en gardant la structure de la phrase.

## Publier une version

À chaque modification visible par l'utilisateur :
- `app.js` : `APP_VERSION` (3.1.0 → 3.1.1 pour un correctif, 3.2.0 pour une fonction).
- `sw.js` : `CACHE = 'forge3-<même version>'`. Ajouter tout nouveau fichier à `ASSETS`.
- `engine.js` : `version` si le moteur change.
- `LISEZMOI.md` : une ligne dans « Historique ».
- `node tests/check.js` vérifie la concordance.

Puis commit et `git push` sur `main` (ou PR si on travaille depuis GitHub Actions). GitHub Pages publie en une à deux minutes. L'app affiche « Forge mise à jour : version … » à l'ouverture suivante.

## Ne pas faire

- Ajouter une dépendance npm, un bundler ou un framework : l'app doit rester des fichiers statiques.
- Envoyer des données ailleurs que vers l'API Anthropic, et seulement quand l'utilisateur le déclenche avec sa clé.
- Changer les clés localStorage sans migration (les idées existantes doivent survivre).
- Modifier `vendor/` ou les icônes.
