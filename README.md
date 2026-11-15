# Tournoi de belote

Appli web pour un concours de belote en équipes fixes : tirage au sort de la première manche, puis les
mieux classés s'affrontent à chaque manche (système suisse, sans revanche). Les joueurs scannent le QR code
de leur table et entrent eux-mêmes le score. Classement en direct.

## Mise en ligne sur Vercel

1. Décompressez le dossier sur un ordinateur où Node.js est installé.
2. Dans ce dossier, lancez `npx vercel` et suivez les questions (aucun réglage de framework à changer).
   Autre voie : poussez le dossier sur GitHub et importez le dépôt depuis vercel.com.
3. Dans le projet Vercel, onglet **Storage** : créez une base **Upstash Redis** (offre gratuite) et reliez-la
   au projet. Vercel ajoute seul les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN`.
4. Dans **Settings > Environment Variables**, ajoutez `ADMIN_CODE` avec le code organisateur de votre choix.
5. Redéployez pour que les variables soient prises en compte : `npx vercel --prod`.

Ouvrez l'adresse du site, onglet **Organisateur**, et entrez votre code.

## Le jour du tournoi

1. **Avant** : onglet Organisateur, collez la liste des équipes (une par ligne). Chaque équipe reçoit un numéro.
2. Imprimez la planche de QR codes et posez-en un par table. Ils servent pour toutes les manches.
   Imprimez-les depuis l'adresse définitive du site : le QR code contient cette adresse.
3. **Tirer au sort la manche 1**. L'onglet Parties indique qui joue à quelle table (à projeter ou à annoncer).
4. À la fin de chaque partie, les joueurs scannent le QR de leur table et entrent les deux totaux.
5. Quand tous les scores sont là, **Lancer la manche suivante**. Vous arrêtez quand vous voulez :
   le classement est toujours à jour.

## Règles appliquées

- Table 1 = les deux premiers du classement, table 2 = 3e contre 4e, etc. Deux équipes ne se rencontrent
  pas deux fois, sauf s'il n'y a plus d'autre possibilité.
- Nombre impair d'équipes : la moins bien classée qui n'a pas encore été exempte passe son tour. Elle reçoit
  une victoire et la moyenne des scores de la manche.
- Classement par total de points puis victoires (ou l'inverse, au choix dans Réglages).
- Les joueurs peuvent corriger le score de leur table tant que la manche est en cours. Ensuite, seul
  l'organisateur peut corriger (onglet Parties, choisir la manche, toucher la table).
- Équipe qui abandonne : bouton Retirer. Équipe en retard : ajoutez-la entre deux manches.

## Essai sur votre ordinateur

`node dev.js` puis http://localhost:3000 (code organisateur : 1234). Aucune installation nécessaire.

## Fichiers

- `public/index.html` : toute l'interface. `public/qrcode.js` : générateur de QR codes (Kazuhiko Arase, licence MIT).
- `api/` : les trois fonctions serveur (état, saisie d'un score, actions de l'organisateur).
- `lib/tournoi.js` : classement et appariement. `lib/store.js` : accès à la base.
