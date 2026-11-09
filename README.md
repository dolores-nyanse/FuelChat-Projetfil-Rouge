# FuelChat
Une messagerie web instantanée permettant aux utilisateurs de communiquer, de gérer leurs contacts et d'échanger des messages.

Développé dans le cadre du cours **8WEB101 à l'Université du Québec à Chicoutimi (UQAC)**, FuelChat intègre également une fonctionnalité supplémentaire, **Carburant**, destinée aux automobilistes du Québec. Elle permet d'estimer la consommation et le coût du carburant pour un trajet, puis de rechercher et comparer les stations-service à proximité.

## Fonctionnalités

### Authentification et gestion des utilisateurs

- Création d'un compte à partir d'un nom d'utilisateur, d'une adresse courriel et d'un mot de passe.
- Connexion et déconnexion des utilisateurs.
- Gestion des sessions avec Supabase Authentication.
- Création automatique d'un profil utilisateur lors de l'inscription.
- Vérification des accès aux pages nécessitant une connexion.

La confirmation des adresses courriel est actuellement désactivée dans Supabase afin de faciliter les inscriptions pendant les tests du projet.

### Messagerie

- Interface de conversations accessible aux utilisateurs connectés.
- Échange de messages entre utilisateurs.
- Consultation des conversations.
- Navigation entre les différentes pages de l'application.

### Gestion des contacts et invitations

- Recherche d'utilisateurs inscrits à partir de leur nom d'utilisateur.
- Affichage des résultats de recherche.
- Envoi  et reception d'invitations de contact.
- Consultation des invitations envoyées et de leur statut.
- Consultation des invitations reçues.
- Boutons permettant d'accepter ou de refuser une invitation.
- Affichage de la liste des contacts enregistrés.

### Paramètres

- Choix entre les thèmes clair et sombre.
- Interface de paramètres de notifications.
- Déconnexion.
- Présentation de l'application dans la section « À propos ».

### Fonctionnalité supplémentaire : Carburant

Cette fonctionnalité est principalement destinée aux automobilistes du Québec.

**Calcul d'itinéraire**

- Saisie d'un point de départ et d'une destination.
- Recherche des coordonnées géographiques des adresses.
- Calcul automatique de la distance routière.
- Estimation de la durée du trajet.
- Saisie de la consommation moyenne du véhicule en L/100 km.
- Sélection du carburant : ordinaire, super ou diesel.
- Estimation de la quantité de carburant nécessaire.
- Calcul du coût estimé du carburant.
- Possibilité de saisir manuellement la distance ou le prix en cas d'indisponibilité des données automatiques.

**Recherche de stations-service**

- Recherche de stations à proximité du point de départ.
- Utilisation facultative de la position GPS de l'utilisateur.
- Choix du rayon de recherche.
- Affichage du nom, de l'adresse, de la distance approximative et du prix des stations.
- Classement selon le prix le plus bas, la proximité ou un compromis prix/proximité.
- Utilisation des prix disponibles pour estimer le coût du trajet.

## Technologies utilisées

| Rôle | Technologies |
|---|---|
| Structure des pages | HTML |
| Présentation et adaptation des interfaces | CSS |
| Interactions et logique côté navigateur | JavaScript |
| Authentification | Supabase Authentication |
| Base de données | Supabase PostgreSQL |
| Communication avec Supabase | Bibliothèque `supabase-js` |
| Fonctions exécutées côté serveur | Supabase Edge Functions |
| Langage des fonctions serveur | TypeScript |
| Environnement d'exécution serveur | Deno |
| Géocodage et itinéraires | OpenRouteService |
| Données des stations-service | Gas Quebec |


## Structure du projet

Les principaux fichiers sont organisés de la manière suivante :

```text
FuelChat-Projetfil-Rouge/
│
├── index.html                 Accueil, inscription et connexion
├── conversation.html          Interface de messagerie
├── conversation.js            Logique de la messagerie
│
├── contacts.html              Interface de gestion des contacts
├── contacts.js                Recherche, contacts et invitations
│
├── carburant.html             Interface du calculateur de carburant
├── carburant.js               Calculs et interactions du module
├── carburant.css              Présentation du module Carburant
├── stations.js                Recherche et traitement des stations
│
├── parametre.html             Interface des paramètres
├── supabase-config.js         Configuration du client Supabase
│
├── calculer-trajet.ts         Code source de l'Edge Function
├── rechercher-stations.ts     Code source de l'Edge Function
│
└── README.md                  Documentation du projet
```

D'autres fichiers CSS et JavaScript assurent la mise en forme et les fonctionnalités complémentaires des pages.

Les fichiers TypeScript présents à la racine du dépôt constituent des copies du code des Edge Functions. Les versions exécutées par l'application sont déployées dans Supabase.

## Architecture

### Organisation générale

FuelChat repose sur trois principaux ensembles :

**1. Interface utilisateur**

Les pages HTML et CSS présentent les éléments visuels. JavaScript gère les événements, la manipulation du document HTML, les validations et les interactions avec les services.

**2. Supabase**

Supabase assure l'authentification, la persistance des données et l'exécution des fonctions serveur.

**3. Services externes**

OpenRouteService fournit les informations nécessaires au calcul des itinéraires. Gas Quebec fournit les données des stations-service et les prix du carburant disponibles.


### Organisation des fichiers JavaScript

Les fichiers JavaScript remplissent des responsabilités distinctes :

- **`conversation.js`** : interactions et logique de la page de messagerie.
- **`contacts.js`** : recherche des utilisateurs, gestion des contacts et invitations.
- **`carburant.js`** : calculs, validation des données et présentation des résultats du module Carburant.
- **`stations.js`** : communication avec la fonction de recherche des stations et normalisation des résultats.
- **`supabase-config.js`** : paramètres nécessaires à la connexion avec Supabase.

Les fonctions serveur TypeScript complètent ces fichiers pour les opérations qui ne doivent pas être exécutées directement dans le navigateur.


## Fonctionnement du module Carburant

### Calcul automatique du trajet

Lorsqu'un utilisateur renseigne un départ et une destination :

1. Le navigateur transmet les adresses à la fonction `calculer-trajet`.
2. La fonction recherche les coordonnées géographiques des deux lieux.
3. Elle interroge OpenRouteService pour obtenir un itinéraire routier.
4. OpenRouteService retourne notamment la distance et la durée estimée.
5. Notre messagerie utilise ces informations pour calculer la quantité de carburant nécessaire.

La communication avec OpenRouteService passe par une Edge Function afin de conserver la clé API côté serveur.

### Recherche des stations-service

Lorsqu'un utilisateur demande les stations à proximité :

1. FuelChat récupère les coordonnées du point de recherche.
2. La position peut provenir du départ du trajet ou du GPS de l'utilisateur.
3. Le navigateur transmet les paramètres à `rechercher-stations`.
4. Cette fonction interroge Gas Quebec.
5. Les résultats sont transmis à `stations.js`, puis affichés dans l'interface.

Les résultats peuvent être classés selon le prix, la distance ou un compromis prix/proximité.


## Base de données

La base de données utilise PostgreSQL, hébergé par Supabase.

### Table `profiles`

Cette table contient les informations publiques nécessaires à l'identification des utilisateurs.

| Colonne | Rôle |
|---|---|
| `id` | Identifiant unique du profil, lié à `auth.users` |
| `username` | Pseudo de l'utilisateur |

Un déclencheur SQL permet de créer automatiquement le profil lors de l'inscription.

Une contrainte d'unicité sur le nom d'utilisateur, sans distinction entre majuscules et minuscules, évite les noms d'utilisateur identiques.

### Table `contacts`

Cette table enregistre les relations entre les utilisateurs et leurs contacts.

| Colonne | Rôle |
|---|---|
| `user_id` | Identifiant du propriétaire de la liste de contacts |
| `contact_id` | Identifiant du contact enregistré |
| `created_at` | Date d'ajout du contact |

Les identifiants permettent de retrouver les informations du contact dans `profiles`.

### Table `invitations_contacts`

Cette table gère les demandes de contact.

| Colonne | Rôle |
|---|---|
| `id` | Identifiant unique de l'invitation |
| `expediteur_id` | Utilisateur qui envoie la demande |
| `destinataire_id` | Utilisateur qui reçoit la demande |
| `statut` | `en_attente`, `acceptee` ou `refusee` |
| `created_at` | Date de création de la demande |

Une contrainte empêche plusieurs invitations identiques en attente entre le même expéditeur et le même destinataire.

### Réponse aux invitations

La fonction PostgreSQL `repondre_invitation` est prévue pour traiter les réponses.

Son fonctionnement est le suivant :

1. Vérifier l'identité de l'utilisateur connecté.
2. Vérifier que cet utilisateur est le destinataire de l'invitation.
3. Vérifier que l'invitation est toujours en attente.
4. Enregistrer l'acceptation ou le refus.
5. En cas d'acceptation, enregistrer les contacts correspondants.


## Sécurité

### Authentification

L'authentification est assurée par Supabase Auth. Les utilisateurs possèdent un identifiant unique associé à leur compte.

### Sécurité des données — RLS

Les politiques Row Level Security (RLS) de PostgreSQL contrôlent l'accès aux données.

Pour les invitations :

- Un utilisateur connecté peut consulter les invitations dont il est expéditeur ou destinataire.
- Il ne peut envoyer une invitation qu'en utilisant son propre identifiant comme expéditeur.
- Une invitation est créée avec le statut `en_attente`.
- Les réponses aux invitations passent par une fonction SQL dédiée.

Les autres tables disposent de règles d'accès adaptées aux fonctionnalités concernées.


## Installation et utilisation

### Accès à l'application

FuelChat est accessible sur GitHub Pages :

https://dolores-nyanse.github.io/FuelChat-Projetfil-Rouge/

Pour utiliser les fonctionnalités nécessitant une authentification, l'utilisateur doit créer un compte puis se connecter.

### Exécution locale

Pour consulter ou développer le projet localement :

1. Récupérer le dépôt GitHub.
2. Ouvrir le dossier dans VS Codium ou un éditeur équivalent.
3. Utiliser un serveur local, par exemple avec l'extension Live Preview.
4. Ouvrir la page `index.html`.
5. Se connecter avec un compte FuelChat.

Les fonctionnalités dépendant de Supabase nécessitent que les services distants soient disponibles et correctement configurés.

## Limites connues et pistes d'amélioration

### Fonctionnalité Carburant


**Carburant déjà présent dans le réservoir :** le calculateur estime le carburant consommé pendant un trajet, sans tenir compte de la quantité déjà disponible dans le véhicule. Une amélioration future permettrait à l'utilisateur d'indiquer cette quantité afin d'estimer le volume supplémentaire à acheter, avec une marge de sécurité.

**Actualisation des prix :** les prix dépendent des informations retournées par Gas Quebec et peuvent changer. La date de mise à jour n'est pas toujours disponible.

**Disponibilité des services :** le calcul automatique dépend d'OpenRouteService et de Gas Quebec. Un service indisponible peut empêcher certains calculs ou certaines recherches.

**Améliorations possibles :**

- Afficher les stations-service sur une carte.
- Intégrer le carburant déjà disponible dans le réservoir.
- Améliorer l'estimation selon les conditions de circulation.
- Étendre la couverture des stations-service à d'autres provinces canadiennes.

### Interface et expérience utilisateur

- Améliorer davantage l'adaptation aux différents écrans.
- Remplacer certains messages d'alerte par des messages intégrés aux pages.
- Ajouter des notifications internes pour les nouvelles invitations.
- Poursuivre l'amélioration de l'ergonomie des pages.

## Collaboration et répartition du travail

Le projet a été réalisé en équipe, avec une répartition des tâches entre les membres et une collaboration lors des intégrations et des tests.

### dolores-nyanse

- **Authentification et comptes utilisateurs :** développement de la page d'accueil, des formulaires d'inscription et de connexion, ainsi que de leur intégration à Supabase Auth.

- **Gestion des contacts :** conception et développement de la page Contact, incluant sa structure HTML, sa mise en forme CSS et sa logique JavaScript.

- **Base de données et sécurité :** création et configuration du projet Supabase, mise en place des profils utilisateurs, des relations entre les tables, des déclencheurs SQL et des politiques RLS.

- **Système d'invitations :** développement du mécanisme d'envoi, de réception et de traitement des invitations, avec sa logique JavaScript et SQL.

- **Intégration des API :** développement des Edge Functions en TypeScript pour connecter FuelChat à OpenRouteService et Gas Quebec.


### Deborah Yassi

- **Messagerie :** conception et développement de la page Conversations, incluant sa structure HTML, sa mise en forme CSS et sa logique JavaScript pour la gestion des échanges entre utilisateurs.

- **Base de données de la messagerie** : création et configuration des tables Supabase nécessaires à l'enregistrement et à la gestion des conversations et des messages.

- **Paramètres :** conception et développement de la page Paramètres, comprenant la structure HTML, la présentation CSS et les fonctionnalités associées aux préférences utilisateur.

- **Fonctionnalité supplémentaire Carburant :** conception et développement de la page Carburant, comprenant sa structure HTML, son design CSS et la programmation JavaScript des interactions, des formulaires, des estimations et de l'affichage des stations-service.

- **Adaptation des interfaces :** travail sur la présentation visuelle, l'organisation des éléments et l'adaptation des pages aux différents formats d'écran.

Ensemble nous avons effectués les tests et apporté des améliorations globales au projet.


