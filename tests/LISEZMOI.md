# Banc d'essai du moteur local

36 scénarios d'idées (complets, moyens, flous), rejoués étape par étape comme dans l'app, avec des attentes précises à chaque étape (domaine, SMART, échéance, actions, plan, risques…).

Lancer (Node.js requis) :

    node tests/bench.js                      # jeu de développement (12 scénarios)
    SET=./holdout.js node tests/bench.js     # jeu de contrôle (12 scénarios)
    SET=./blind.js node tests/bench.js       # jeu aveugle (12 scénarios)
    node tests/bench.js -v --only=MUS-2      # détail d'un scénario

À relancer après chaque modification de engine.js.
