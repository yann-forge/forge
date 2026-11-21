# Améliorer Forge sans réinstaller

Principe : le dépôt GitHub `forge` est la seule copie de référence. Chaque modification poussée sur `main` est publiée par GitHub Pages, et le téléphone comme le PC la récupèrent tout seuls à l'ouverture suivante (avec du réseau). Plus de zip à refaire, plus de réinstallation.

Deux façons de faire corriger l'app par Claude :
- **A. Depuis le PC** avec Claude Code (le plus sûr, tu vois tout).
- **B. Depuis le téléphone**, sans PC : un signalement crée un ticket GitHub, Claude corrige dans GitHub et te propose une modification à valider d'un bouton.

Les deux utilisent ton abonnement Pro, sans clé API ni crédits. Ça consomme ton quota Pro comme une conversation longue.

---

## 1. Mise en place, une seule fois (PC Windows, 20 min)

### 1.1 Installer Git
1. Télécharge Git pour Windows sur git-scm.com, installe avec les options par défaut.
2. Ferme et rouvre PowerShell, tape `git --version` : un numéro doit s'afficher.

### 1.2 Installer Claude Code
1. Ouvre PowerShell (pas en administrateur).
2. Colle : `irm https://claude.ai/install.ps1 | iex`
3. Ferme et rouvre PowerShell, tape `claude --version`.

### 1.3 Récupérer le dépôt sur le PC
```
cd $HOME\Documents
git clone https://github.com/TON-PSEUDO/forge.git
cd forge
```
La première fois, Git ouvre Brave pour te connecter à GitHub : accepte.

### 1.4 Y mettre cette version
1. Décompresse `forge-v3.zip`.
2. Copie **tout son contenu** dans `Documents\forge` en remplaçant les fichiers. Vérifie que le dossier `.github` est bien copié (dans l'Explorateur : Affichage > Afficher > Éléments masqués).
3. Dans PowerShell, dans le dossier `forge`, lance `claude`.
4. Au premier lancement, choisis la connexion avec ton compte Claude (abonnement Pro) et valide dans le navigateur.
5. Écris : `Lance node tests/all.js. Si tout passe, commit et pousse sur main.`
   Node.js est nécessaire pour les tests : si Claude dit qu'il manque, installe la version LTS depuis nodejs.org puis relance `claude`.
6. Une à deux minutes après, ouvre Forge sur le téléphone : un message « Forge mise à jour : version 3.1.0 » s'affiche.

### 1.5 (pour la méthode B) Brancher Claude sur GitHub
1. Dans `claude` (dans le dossier forge), tape `/install-github-app` et suis les étapes : il installe l'application Claude sur ton dépôt et enregistre le jeton secret `CLAUDE_CODE_OAUTH_TOKEN`.
   Si ça bloque : dans PowerShell, `claude setup-token`, copie le jeton, puis sur github.com > ton dépôt > Settings > Secrets and variables > Actions > New repository secret, nom `CLAUDE_CODE_OAUTH_TOKEN`.
2. Sur github.com > ton dépôt > Settings > Actions > General, tout en bas : coche **Allow GitHub Actions to create and approve pull requests**, puis Save.
3. Installe l'app GitHub sur ton Android et connecte-toi : c'est là que tu valideras les corrections.

---

## 2. Signaler une erreur dans l'app

Sur une idée structurée : menu ⋮ > **Signaler une erreur**.
1. Coche ce qui est faux (domaine, échéance, ressources, plan, risques…).
2. Écris en une phrase ce qui ne va pas et ce que tu attendais. Plus c'est précis, meilleure est la correction : « échéance 14 février, pas 14 janvier » vaut mieux que « la date est fausse ».
3. Relis le texte transmis : **le dépôt est public**, retire les noms, numéros ou détails privés.
4. Enregistre. L'app propose de l'envoyer sur GitHub.

Les signalements restent sur l'appareil tant qu'ils ne sont pas envoyés : Réglages > Signalements.

---

## 3A. Faire corriger depuis le PC

1. Sur le téléphone : Réglages > Signalements > **Exporter (.json)**. Envoie-toi le fichier (mail, Drive…).
2. Mets le fichier dans `Documents\forge\feedback\`.
3. PowerShell :
   ```
   cd $HOME\Documents\forge
   git pull
   claude
   ```
4. Écris :
   > Traite les signalements du dossier feedback en suivant CLAUDE.md. Montre-moi les attentes que tu écris avant de corriger le moteur.
5. Claude te montre les cas de test. Valide ou corrige ses attentes : c'est toi qui sais ce qui était juste.
6. Quand il annonce que `node tests/all.js` passe à 100 %, écris : `Commit et pousse.`
7. L'app se met à jour à la prochaine ouverture.

Pour toute autre amélioration, même démarche, en français courant :
> Dans le domaine Fabrication, ajoute les risques liés au 230 V pour les amplis à lampes. Respecte CLAUDE.md.

## 3B. Faire corriger depuis le téléphone

1. Après avoir enregistré un signalement, touche **Envoyer** : GitHub s'ouvre avec le ticket déjà rempli. Touche **Submit new issue**. (Pour plusieurs signalements à la fois : Réglages > Signalements > Envoyer sur GitHub.)
2. Le titre commence par `[Signalement]` : Claude démarre seul dans GitHub (onglet Actions, 5 à 20 min).
3. Tu reçois une notification : Claude a commenté le ticket et ouvert une **pull request** avec le cas de test, le correctif et le résultat des tests.
4. Dans l'app GitHub, ouvre la pull request : vérifie que la coche verte « Tests du moteur » est présente, lis le résumé, puis **Merge pull request**.
5. GitHub Pages publie, l'app se met à jour à la prochaine ouverture.

Si la correction ne te va pas : commente la pull request en commençant par `@claude`, par exemple `@claude l'échéance doit être la sortie du clip, pas le tournage`. Il reprend son travail.

Sécurité : Claude ne se déclenche que pour les tickets et commentaires écrits par toi (propriétaire du dépôt). Il ne peut jamais publier sans ton clic sur Merge.

---

## 4. Si quelque chose ne va pas

| Problème | Solution |
|---|---|
| L'app ne se met pas à jour | Ouvre-la avec du réseau, ferme-la complètement, rouvre-la. Réglages affiche la version en bas. |
| Le bouton Envoyer ne propose pas GitHub | Réglages > Signalements > Dépôt GitHub : écris `ton-pseudo/forge`. |
| La coche « Tests du moteur » est rouge | Ne merge pas. Commente `@claude les tests échouent, corrige`. |
| L'action Claude échoue tout de suite | Le secret `CLAUDE_CODE_OAUTH_TOKEN` manque ou a expiré : refais l'étape 1.5. |
| Revenir en arrière | Sur GitHub, ouvre la pull request fusionnée > **Revert**, puis Merge. |

Les idées ne sont jamais sur GitHub : elles restent dans chaque appareil. Seuls les textes des signalements que tu envoies y sont publiés.
