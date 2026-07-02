# Contribuer à SSI Trainer

SSI Trainer est un projet pédagogique en relecture active. Les retours des enseignants de la filière sécurité sont particulièrement bienvenus — c'est la meilleure garantie de rigueur pour un outil de ce type.

## Signaler une erreur ou une imprécision

Le plus utile : préciser
- le **scénario ou la page** concernée (nom du fichier ou URL) ;
- ce qui est écrit, et pourquoi c'est incorrect ou à nuancer ;
- si possible, la source ou la formulation correcte.

Deux façons de le faire :
- ouvrir une **issue** sur le dépôt GitHub : [github.com/frigorx/ssi-trainer/issues](https://github.com/frigorx/ssi-trainer/issues) ;
- ou écrire directement à **inerweb.fh@gmail.com**.

## Proposer une correction

Le dépôt est un site statique (HTML/CSS/JS, sans étape de build) : voir [README.md](README.md) pour le lancer en local. Les scénarios sont des fichiers JSON dans `scenarios/`, documentés dans `docs/`.

Pour une modification de fond touchant au vocabulaire ou aux procédures SSI, merci de citer la source normative (NF S 61-9xx, arrêté SSIAP…) — voir la philosophie du projet dans [LEGAL.md](LEGAL.md) : on ne réaffirme rien sans pouvoir le sourcer.

## Ce qui n'est pas dans le périmètre v1

Remontée automatique de notes vers un serveur, comptes multi-établissements, éditeur de scénarios en ligne. Voir `docs/SPEC-PARTIE-ENSEIGNANT.md` pour la feuille de route envisagée.
