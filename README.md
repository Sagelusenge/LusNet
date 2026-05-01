# LWASIVA_NET - Gestion des abonnements Internet

Projet de site web pour gerer les clients, contrats, abonnements, equipements, paiements et support technique de LWASIVA_NET a Goma, Nord-Kivu, RDC.

## Backend Node.js/Express

Le backend est maintenant disponible dans le dossier `src/`.

### Installation

```powershell
npm.cmd install
```

### Configuration

Copier `.env.example` vers `.env`, puis adapter les valeurs MySQL si necessaire:

```text
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=lwasiva_net
JWT_SECRET=change_this_secret_before_production
```

Important: le backend utilise le driver Node `mysql2`. Si votre utilisateur MariaDB/MySQL utilise une authentification speciale comme `auth_gssapi_client`, creez un utilisateur applicatif classique pour le site:

```sql
CREATE USER 'lwasiva_app'@'localhost' IDENTIFIED BY 'mot_de_passe_fort';
GRANT ALL PRIVILEGES ON lwasiva_net.* TO 'lwasiva_app'@'localhost';
FLUSH PRIVILEGES;
```

Puis mettez dans `.env`:

```text
DB_USER=lwasiva_app
DB_PASSWORD=mot_de_passe_fort
```

### Initialiser la base depuis Node

```powershell
npm.cmd run db:init
```

### Tester la connexion a la base

```powershell
npm.cmd run db:check
```

### Lancer l'API

```powershell
npm.cmd run dev
```

Ou en mode simple:

```powershell
npm.cmd start
```

Par defaut, l'API demarre sur:

```text
http://localhost:3000/api
```

Endpoint de verification:

```text
GET /api/health
```

## Frontend React

Le frontend React est disponible dans:

```text
frontend/
```

Il utilise Vite et se connecte par defaut a l'API Express via `/api`.

### Lancer le frontend

```powershell
npm.cmd run frontend:dev
```

Adresse par defaut:

```text
http://localhost:5173
```

### Build de production

```powershell
npm.cmd run frontend:build
```

Le build est genere dans:

```text
dist/frontend
```

### Connexion API

En developpement, Vite redirige `/api` vers:

```text
http://localhost:3000
```

Pour utiliser une autre URL API, creer un fichier `.env` ou definir:

```text
VITE_API_BASE_URL=http://localhost:3000/api
```

## Notifications WhatsApp

Le projet contient un module de rappel WhatsApp pour avertir les clients cinq (5) jours avant la fin de leur abonnement.

Le rappel utilise les factures dont `period_end = aujourd'hui + 5 jours`. Le message est journalise dans `whatsapp_notification_logs` pour eviter les doublons.

### Configuration

Dans `.env`:

```text
WHATSAPP_ENABLED=false
WHATSAPP_PROVIDER=meta
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_FROM_NUMBER=243980208012
```

`WHATSAPP_ENABLED=false` garde le module en mode simulation. Pour envoyer de vrais messages, il faut configurer un compte WhatsApp Business/Meta Cloud API, renseigner `WHATSAPP_ACCESS_TOKEN` et `WHATSAPP_PHONE_NUMBER_ID`, puis mettre:

```text
WHATSAPP_ENABLED=true
```

Le numero officiel utilise comme reference entreprise est:

```text
+243 980 208 012
```

### Envoi manuel depuis le terminal

```powershell
npm.cmd run notifications:whatsapp
```

### Envoi manuel depuis l'admin

Dans le frontend, ouvrir:

```text
Notifications > Envoyer maintenant
```

### Endpoint API

```text
GET  /api/notifications/whatsapp
POST /api/notifications/whatsapp/send-j5
```

Ces routes sont reservees aux roles `admin` et `manager`.

## Objectif

L'application doit permettre a l'operateur de centraliser toute la gestion liee aux abonnements Internet:

- enregistrer les clients;
- creer et suivre les contrats d'abonnement;
- choisir un bouquet Internet;
- suivre le kit d'installation et son paiement par tranches;
- generer les factures mensuelles;
- enregistrer les paiements en especes ou Mobile Money;
- suspendre ou reactiver un service;
- gerer les pannes et interventions techniques;
- conserver les documents lies au contrat.

## Base de donnees

Les fichiers SQL se trouvent ici:

```text
database/001_initial_schema.sql
database/002_views_procedures.sql
```

Ils sont prevus pour MySQL 8+ ou MariaDB 10.5+.

### Installation rapide

Depuis un terminal MySQL/MariaDB:

```sql
SOURCE database/001_initial_schema.sql;
SOURCE database/002_views_procedures.sql;
```

Ou depuis PowerShell, si `mysql` est disponible:

```powershell
mysql -u root -p < database/001_initial_schema.sql
mysql -u root -p lwasiva_net < database/002_views_procedures.sql
```

La base creee s'appelle:

```text
lwasiva_net
```

## Tables principales

### `users`

Utilisateurs internes du futur site: administrateur, manager, technicien ou caissier.

### `clients`

Informations du client: nom, type de client, telephone, adresse, ville, province, pieces d'identite et notes internes.

### `internet_plans`

Bouquets Internet proposes par LWASIVA_NET.

Donnees initiales incluses:

| Bouquet | Debit | Usage | Prix mensuel |
| --- | ---: | --- | ---: |
| Basic Home | 5 Mbps | Navigation, reseaux sociaux, video SD | 15 USD |
| Stream Plus | 10 Mbps | Streaming HD, teletravail, appels video | 20 USD |
| Pro Ultra | 30 Mbps | Streaming 4K, gaming, multi-utilisateurs | 50 USD |

### `contracts`

Contrats d'abonnement. Cette table relie un client a un bouquet et stocke les informations importantes du contrat:

- numero du contrat;
- statut du service;
- date de signature;
- date d'activation;
- fin de la periode d'essai;
- engagement minimum;
- jour d'echeance mensuelle;
- adresse d'installation;
- interdiction de revente;
- representant de l'operateur.

Statuts prevus:

```text
brouillon, essai, actif, suspendu, resilie
```

### `equipment_kits`

Kits d'installation disponibles. Le schema contient deja le kit standard a 100 USD:

- antenne receptrice/CPE;
- routeur Wi-Fi;
- cablage;
- accessoires.

### `contract_equipment`

Materiel installe chez un client pour un contrat donne: numero de serie CPE, numero de serie routeur, date d'installation, technicien et etat du materiel.

La propriete du materiel peut rester chez l'operateur jusqu'au paiement complet.

### `equipment_installments`

Paiement du materiel par tranches. Exemple selon le contrat:

- tranche initiale a l'installation: 20 USD;
- tranches mensuelles ajoutees avec l'abonnement.

Cette table permet de suivre ce qui est paye, en retard ou annule.

### `invoices`

Factures mensuelles liees au contrat.

Une facture peut contenir:

- montant de l'abonnement;
- montant de la tranche materiel;
- penalite;
- remise;
- total calcule automatiquement.

### `payments`

Paiements effectues par le client:

- especes;
- Airtel Money;
- M-Pesa;
- Orange Money;
- banque;
- autre.

Chaque paiement peut etre lie a une facture, a un contrat et au client.

### `service_suspensions`

Historique des suspensions et restaurations du service.

Raisons prevues:

```text
impaye, revente_interdite, maintenance, demande_client, autre
```

### `support_tickets`

Gestion des pannes, plaintes et interventions techniques.

### `contract_documents`

Fichiers lies au contrat:

- contrat signe;
- piece d'identite;
- photo d'installation;
- autre document.

## Vues disponibles

Le fichier `database/002_views_procedures.sql` ajoute des vues pour faciliter les ecrans du futur site web.

### `vw_active_contracts`

Liste des contrats en essai, actifs ou suspendus avec les informations du client et du bouquet.

### `vw_contract_balances`

Solde global par contrat: total facture, total paye et reste a payer.

### `vw_unpaid_invoices`

Factures non payees, partiellement payees ou en retard, avec le montant restant et le nombre de jours de retard.

### `vw_equipment_payment_status`

Suivi du paiement du kit d'installation: total du materiel, montant paye, solde restant et statut de propriete.

### `vw_dashboard_summary`

Resume rapide pour le tableau de bord: clients, contrats actifs, contrats suspendus, factures impayees, paiements du jour et tickets ouverts.

## Procedures stockees disponibles

### `sp_create_monthly_invoice`

Cree une facture mensuelle pour un contrat donne en utilisant automatiquement le prix du bouquet.

### `sp_register_payment`

Enregistre un paiement, le relie a une facture et met a jour le statut de la facture en `payee` ou `partielle`.

### `sp_suspend_contract`

Suspend un contrat et ajoute une entree dans l'historique des suspensions.

### `sp_restore_contract`

Reactive un contrat suspendu et marque la suspension ouverte comme restauree.

### `sp_mark_late_invoices`

Passe automatiquement les factures depassees au statut `en_retard`.

### `sp_open_support_ticket`

Ouvre un ticket support pour une panne, une plainte ou une intervention technique.

## Cycle de vie propose

1. Creer le client dans `clients`.
2. Creer le contrat dans `contracts` avec le bouquet choisi.
3. Enregistrer le materiel installe dans `contract_equipment`.
4. Creer les tranches du materiel dans `equipment_installments`.
5. Generer chaque mois une facture dans `invoices`.
6. Enregistrer les paiements dans `payments`.
7. Mettre a jour le statut du contrat si besoin: actif, suspendu ou resilie.
8. Ouvrir un ticket support en cas de panne ou intervention.

## Endpoints API principaux

### Authentification

```text
POST /api/auth/register
POST /api/auth/login
```

### Bouquets

```text
GET  /api/plans
POST /api/plans
PUT  /api/plans/:id
```

### Clients

```text
GET  /api/clients
GET  /api/clients/:id
POST /api/clients
PUT  /api/clients/:id
```

### Contrats

```text
GET   /api/contracts
GET   /api/contracts/balances
GET   /api/contracts/equipment-status
GET   /api/contracts/:id
POST  /api/contracts
PATCH /api/contracts/:id/status
POST  /api/contracts/:id/suspend
POST  /api/contracts/:id/restore
```

### Factures

```text
GET  /api/invoices
GET  /api/invoices/unpaid
POST /api/invoices/monthly
POST /api/invoices/mark-late
```

### Paiements

```text
GET  /api/payments
POST /api/payments
```

### Materiel

```text
GET   /api/equipment/kits
POST  /api/equipment/kits
POST  /api/equipment/assignments
GET   /api/equipment/installments
POST  /api/equipment/installments
PATCH /api/equipment/installments/:id/pay
```

### Documents contractuels

```text
GET  /api/documents
POST /api/documents
```

### Dashboard

```text
GET /api/dashboard/summary
```

### Support

```text
GET   /api/support/tickets
POST  /api/support/tickets
PATCH /api/support/tickets/:id/status
```

Les routes de creation/modification utilisent un token JWT dans l'en-tete:

```text
Authorization: Bearer VOTRE_TOKEN
```

## Prochaines etapes recommandees

1. Choisir la stack du site web: PHP/Laravel, Node.js/Express, Django, ou autre.
2. Ajouter les migrations du framework choisi.
3. Creer l'authentification des agents LWASIVA_NET.
4. Construire les modules: clients, contrats, factures, paiements, support.
5. Generer une version imprimable du contrat d'abonnement depuis les donnees du client.

## Notes importantes

- Les montants sont stockes en USD avec deux decimales.
- Le jour d'echeance est limite de 1 a 28 pour eviter les problemes des mois courts.
- Les accents ont ete evites dans les valeurs techniques pour faciliter la compatibilite avec les futurs codes backend.
- Le texte juridique complet du contrat pourra etre transforme plus tard en modele PDF ou document imprimable.
