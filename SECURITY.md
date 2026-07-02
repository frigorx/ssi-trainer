# Sécurité

SSI Trainer est un site statique pédagogique (HTML/CSS/JS, sans serveur ni base de données). Il ne traite aucune donnée sensible côté serveur : le simulateur élève et le tableau de bord enseignant fonctionnent entièrement dans le navigateur (voir [LEGAL.md](LEGAL.md), section RGPD).

## Ce qui n'est pas un problème de sécurité

- Le **code d'accès de l'espace enseignant** est volontairement visible dans le code source : c'est un simple filtre anti-élèves, pas un secret (voir le commentaire dans `enseignant.html`). Aucune donnée confidentielle n'est protégée par ce code.
- Le **token de mesure d'audience** (Cloudflare, dans les pages publiques) est un identifiant public sans cookie, sans donnée personnelle.

## Signaler un problème

Si vous identifiez une vulnérabilité réelle (par exemple une fuite de données d'élève, une faille XSS, une dépendance compromise), merci de la signaler directement à **inerweb.fh@gmail.com** plutôt que par une issue publique, le temps qu'un correctif soit publié.

Pour toute autre remarque (erreur de contenu, bug fonctionnel), voir [CONTRIBUTING.md](CONTRIBUTING.md).
