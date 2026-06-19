# MEMOIRE PROJET — GeStockPro AI-Native ERP

> **FICHIER DE RÉFÉRENCE CENTRAL**
> Ce fichier est la mémoire vivante du projet. Toute modification, toute décision, toute évolution
> de la base de données, du code ou de l'architecture DOIT être consignée ici AVANT d'être
> effectuée. Il sert de source de vérité pour tous les développeurs et toutes les IA qui
> interviennent sur le projet.
>
> **Dernière mise à jour : 2026-06-10**

---

## TABLE DES MATIÈRES

1. [Vision & Description du Projet](#1-vision--description-du-projet)
2. [Architecture Technique](#2-architecture-technique)
3. [Bases de Données](#3-bases-de-données)
4. [Modèles & Tables (PostgreSQL — ERP)](#4-modèles--tables-postgresql--erp)
5. [Modèles (MySQL — Registry IA)](#5-modèles-mysql--registry-ia)
6. [Plans & Abonnements](#6-plans--abonnements)
7. [Rôles & Permissions (RBAC)](#7-rôles--permissions-rbac)
8. [Backend — Controllers & Services](#8-backend--controllers--services)
9. [Frontend — Composants](#9-frontend--composants)
10. [Modules Fonctionnels Détaillés](#10-modules-fonctionnels-détaillés)
11. [APIs & Routes](#11-apis--routes)
12. [Intégrations Externes](#12-intégrations-externes)
13. [Déploiement & Infrastructures](#13-déploiement--infrastructures)
14. [Historique des Modifications](#14-historique-des-modifications)
15. [Tâches Accomplies](#15-tâches-accomplies)
16. [Travaux en Cours / À Faire](#16-travaux-en-cours--à-faire)
17. [Décisions Techniques Importantes](#17-décisions-techniques-importantes)

---

## 1. VISION & DESCRIPTION DU PROJET

**GeStockPro** est un ERP SaaS AI-Native conçu pour les entreprises africaines, particulièrement
celles opérant en Afrique de l'Ouest (Sénégal en priorité). Il couvre l'intégralité de la gestion
d'une PME : stocks, ventes, clients, fournisseurs, RH, paie, finance, et facturation.

### Nom technique
`gestockpro-ai-native-erp` (version `0.0.0` / branche active : `ge_stock_pro_9_fevrier`)

### Caractéristiques clés
- **Multi-tenant** : chaque entreprise est un "Tenant" isolé avec ses données propres
- **Architecture SaaS** : gestion des abonnements (FREE_TRIAL → BASIC → PRO → ENTERPRISE)
- **IA intégrée** : chatbot Gemini (Google AI), analyse IA des stocks et des finances
- **Devise principale** : F CFA (XOF)
- **Langue principale** : Français
- **Conformité** : déclarations sociales sénégalaises (IPRES, CSS, IR)
- **Paiements mobiles** : Wave, Orange Money, MTN MoMo, Stripe, Chèque, Virement

### Stack principal
| Couche | Technologie |
|--------|-------------|
| Frontend | React 19 + TypeScript + Vite 6 |
| UI Library | Lucide React, Recharts, Framer Motion |
| PDF / Export | jsPDF, html2canvas, xlsx, JSZip |
| Backend | Node.js + Express 5 (ESM) |
| ORM | Sequelize 6 |
| BDD ERP | PostgreSQL (AlwaysData) |
| BDD IA | MySQL (AlwaysData) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Stockage fichiers | S3-compatible (MamuteCloud) |
| Paiements | Stripe (cartes) + Mobile Money |
| Email | SMTP (Mailtrap en dev) |

---

## 2. ARCHITECTURE TECHNIQUE

```
GeStockPro/
├── App.tsx                    # Racine de l'app React — routing principal
├── index.tsx                  # Point d'entrée React
├── types.ts                   # Types TypeScript globaux
├── constants.tsx              # Constantes (mock users, plans)
├── vite.config.ts             # Configuration Vite
├── components/                # Composants UI React
│   ├── rh/                    # Module Ressources Humaines
│   ├── superadmin/            # Interface Super Admin
│   └── legal/                 # Pages légales (CGU, RGPD…)
├── services/                  # Services frontend
│   ├── api.ts                 # Client HTTP centralisé (apiClient)
│   ├── authBridge.ts          # Pont d'authentification (localStorage)
│   ├── config.ts              # URL backend dynamique
│   ├── geminiService.ts       # Intégration Google Gemini AI
│   ├── paymentService.ts      # Gestion paiements frontend
│   ├── exportUtils.ts         # Utilitaires export PDF/Excel
│   └── uploadService.ts       # Upload vers S3
└── backend/
    ├── server.js              # Point d'entrée Express
    ├── config/
    │   ├── database.js        # Connexions PostgreSQL + MySQL
    │   └── payroll.js         # Config paie
    ├── models/                # Modèles Sequelize (52 modèles)
    ├── controllers/           # Logique métier (42 controllers)
    ├── routes/                # Routes Express (22 fichiers)
    ├── middlewares/           # Auth, RBAC, Tenant, Error
    ├── services/              # Services backend (16 services)
    ├── migrations/            # Scripts SQL de migration
    └── utils/                 # Utilitaires divers
```

### Flux de requête type
```
Client React → apiClient (services/api.ts)
  → POST /api/auth/login  (public)
  → GET  /api/stock/items (JWT requis)
       → authenticateJWT middleware (vérifie token)
       → tenantIsolation middleware (charge tenant, vérifie suspension)
       → checkPermission('ADMIN','STOCK_MANAGER') (RBAC)
       → InventoryController.listItems()
       → Sequelize → PostgreSQL
       → JSON response
```

---

## 3. BASES DE DONNÉES

### 3.1 Base ERP Principale — PostgreSQL

| Paramètre | Valeur |
|-----------|--------|
| **Hôte** | `postgresql-gestionapp.alwaysdata.net` |
| **Port** | `5432` |
| **Nom BDD** | `gestionapp_stockgestion_13_janv_2026` |
| **Utilisateur** | `gestionapp` |
| **SSL** | Requis (`rejectUnauthorized: false`) |
| **Pool** | min: 2, max: 8, acquire: 60s, idle: 20s |
| **Sync** | `alter: false` (jamais de modification automatique) |

### 3.2 Base Registry IA — MySQL

| Paramètre | Valeur |
|-----------|--------|
| **Hôte** | `mysql-gestionapp.alwaysdata.net` |
| **Port** | `3306` |
| **Nom BDD** | `gestionapp_saas_gestockpro_bot` |
| **Utilisateur** | `385922` |
| **Pool** | min: 2, max: 8, acquire: 60s, idle: 20s |

### 3.3 Stockage Objet S3-compatible

| Paramètre | Valeur |
|-----------|--------|
| **Provider** | MamuteCloud |
| **Endpoint** | `https://s3-us-east-1.mamutecloud.com` |
| **Bucket** | `bucket-gestockpro` |
| **Région** | `us-east-1` |

---

## 4. MODÈLES & TABLES (PostgreSQL — ERP)

### 4.1 Table `tenants` — Entreprises clientes

Modèle central. Chaque tenant = une entreprise abonnée.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | Identifiant unique |
| `name` | STRING | Nom de l'entreprise |
| `domain` | STRING (UNIQUE) | Domaine de l'instance |
| `is_active` | BOOLEAN | Compte actif |
| `siret` | STRING | N° SIRET / NINEA |
| `address` | TEXT | Adresse |
| `phone` | STRING (UNIQUE) | Téléphone |
| `email` | STRING (UNIQUE) | Email principal |
| `currency` | STRING | Devise (défaut: `F CFA`) |
| `timezone` | STRING | Fuseau horaire |
| `language` | STRING | Langue (défaut: `fr`) |
| `tax_rate` | NUMERIC(5,2) | Taux TVA (défaut: 18.00%) |
| `logo_url` | TEXT | URL logo entreprise (S3) |
| `cachet_url` | TEXT | URL cachet/tampon (S3) |
| `primary_color` | STRING(7) | Couleur principale UI |
| `button_color` | STRING(7) | Couleur boutons |
| `theme` | STRING(10) | Thème UI (light/dark) |
| `font_family` | STRING | Police de caractères |
| `base_font_size` | INTEGER | Taille de police base (14) |
| `invoice_prefix` | STRING(20) | Préfixe factures (`INV-`) |
| `invoice_footer` | TEXT | Pied de page factures |
| `enforce_mfa` | BOOLEAN | MFA obligatoire |
| `onboarding_completed` | BOOLEAN | Onboarding terminé |
| `mrr` | NUMERIC(15,2) | Revenu mensuel récurrent |
| `payment_status` | STRING(20) | Statut paiement abonnement |
| `last_payment_date` | DATE | Date dernier paiement |
| `plan_id` | STRING(50) | Plan actuel (FK plans) |
| `subscription_ends_at` | TIMESTAMPTZ | Fin d'abonnement |
| `pending_plan_id` | STRING(50) | Plan en attente de paiement |
| `pending_period` | STRING(10) | Période en attente |
| `is_suspended` | BOOLEAN | Compte suspendu |
| `suspended_at` | TIMESTAMPTZ | Date suspension |
| `suspension_reason` | TEXT | Raison suspension |
| `pending_deletion` | BOOLEAN | Suppression planifiée |
| `deletion_requested_at` | TIMESTAMPTZ | Date demande suppression |
| `deletion_scheduled_for` | TIMESTAMPTZ | Date suppression effective |
| `deletion_reason` | TEXT | Raison suppression |
| `deletion_backup_path` | STRING(500) | Chemin backup avant suppression |
| `storage_used_bytes` | BIGINT | Stockage S3 utilisé |
| `created_at` / `updated_at` | TIMESTAMPTZ | Timestamps |

**Index uniques** : `siret` (non null), `phone` (non null), `lower(email)` (non null), `domain`

---

### 4.2 Table `users` — Utilisateurs

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `tenant_id` | UUID (FK tenants) | |
| `name` | STRING | Nom complet |
| `email` | STRING | Email (unique par `lower(email)`) |
| `password` | TEXT | Hash bcrypt |
| `role` | STRING(30) | Rôle principal |
| `roles` | ARRAY(STRING) | Rôles cumulatifs |
| `employee_id` | UUID (FK employees) | Lien employé (plan ENTERPRISE) |
| `mfa_enabled` | BOOLEAN | MFA activé |
| `last_login` | DATE | Dernière connexion |
| `active_session` | BOOLEAN | Session active |
| `is_active` | BOOLEAN | Compte actif |

**Hook** : `beforeCreate` — hash automatique du mot de passe

---

### 4.3 Table `stock_items` — Articles de stock

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `tenant_id` | UUID (FK) | |
| `sku` | STRING(100) | Code article (unique par tenant actif) |
| `name` | STRING(255) | Nom du produit |
| `category` | STRING(100) | Catégorie texte (legacy) |
| `subcategory_id` | UUID (FK subcategories) | Sous-catégorie |
| `image_url` | TEXT | Image S3 |
| `quantity` | INTEGER | Quantité (alias) |
| `current_level` | INTEGER | Niveau actuel |
| `min_threshold` | INTEGER | Seuil d'alerte (défaut: 5) |
| `forecasted_level` | INTEGER | Niveau prévu IA |
| `purchase_price` | NUMERIC(15,2) | Prix d'achat moyen pondéré (PUMP) |
| `unit_price` | NUMERIC(15,2) | Prix de vente unitaire |
| `location` | STRING(100) | Emplacement physique |
| `status` | STRING(20) | `actif` / `archive` |
| `deleted_at` | DATE | Soft delete |

**Index** : `(tenant_id, sku)` unique sur articles actifs ; `(tenant_id, name)`

---

### 4.4 Table `sales` — Ventes / Factures

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `tenant_id` | UUID (FK) | |
| `customer_id` | UUID (FK customers, nullable) | Client enregistré |
| `reference` | STRING(50) UNIQUE | Référence facture |
| `walkin_name` | STRING(150) | Nom client de passage |
| `walkin_phone` | STRING(50) | Téléphone client de passage |
| `status` | ENUM | `EN_COURS`, `TERMINE`, `ANNULE`, `REMBOURSE`, `BROUILLON` |
| `total_ht` | NUMERIC(15,2) | Montant HT |
| `total_ttc` | NUMERIC(15,2) | Montant TTC |
| `tax_amount` | NUMERIC(15,2) | Montant TVA |
| `amount_paid` | NUMERIC(15,2) | Montant encaissé |
| `sale_date` | DATE | Date de vente |
| `recurring_installment_id` | UUID (FK) | Lien vers échéance récurrente |

---

### 4.5 Table `sale_items` — Lignes de vente

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `sale_id` | UUID (FK sales) | |
| `stock_item_id` | UUID (FK stock_items, nullable) | Produit |
| `service_id` | UUID (FK services, nullable) | Service |
| `quantity` | INTEGER | Quantité |
| `unit_price` | NUMERIC(15,2) | Prix unitaire |
| `total_price` | NUMERIC(15,2) | Total ligne |

---

### 4.6 Table `payments` — Paiements

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `tenant_id` | UUID (FK) | |
| `sale_id` | UUID (FK sales, nullable) | Vente associée |
| `amount` | NUMERIC(15,2) | Montant |
| `method` | ENUM | `CASH`, `ORANGE_MONEY`, `WAVE`, `MTN_MOMO`, `STRIPE`, `TRANSFER`, `CHEQUE` |
| `reference` | STRING(100) | Référence transaction |
| `proof_image` | TEXT | Preuve image (base64/URL) |
| `cheque_number` | STRING(50) | Numéro de chèque |
| `bank_name` | STRING(100) | Banque |
| `cheque_date` | DATE | Date du chèque |
| `cheque_order` | STRING(150) | Ordre du chèque |
| `statut` | STRING(20) | `PENDING` (CHEQUE/TRANSFER) ou `PAID` |
| `payment_date` | DATE | Date d'encaissement |

**Règle métier** : `CHEQUE` et `TRANSFER` restent en `PENDING` jusqu'à encaissement manuel. Les autres méthodes sont immédiatement `PAID`.

---

### 4.7 Table `customers` — Clients

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `tenant_id` | UUID (FK) | |
| `company_name` | STRING | Nom entreprise (auto-rempli depuis main_contact si vide) |
| `main_contact` | STRING | Contact principal |
| `email` | STRING | Email |
| `phone` | STRING | Téléphone |
| `billing_address` | TEXT | Adresse de facturation |
| `siret` | STRING | SIRET |
| `tva_intra` | STRING | TVA intracommunautaire |
| `outstanding_balance` | FLOAT | Solde dû |
| `max_credit_limit` | FLOAT | Limite de crédit (5000 par défaut) |
| `payment_terms` | INTEGER | Délai de paiement (30j) |
| `health_status` | ENUM | `GOOD`, `WARNING`, `CRITICAL` |
| `status` | STRING(20) | `actif` / `archive` |
| `deleted_at` | DATE | Soft delete |

**Index** : `(tenant_id, company_name)` unique sur clients actifs

---

### 4.8 Table `suppliers` — Fournisseurs

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `tenant_id` | UUID (FK) | |
| `company_name` | STRING | Nom entreprise |
| `main_contact` | STRING | Contact principal |
| `email` | STRING | Email |
| `phone` | STRING | Téléphone |
| `address` | TEXT | Adresse |
| `siret` / `tva_intra` | STRING | Identifiants légaux |
| `website` | STRING | Site web |
| `payment_terms` | INTEGER | Délai paiement (30j) |
| `status` | STRING(20) | `actif` / `archive` |
| `deleted_at` | DATE | Soft delete |

---

### 4.9 Table `deliveries` — Livraisons fournisseurs

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `tenant_id` | UUID (FK) | |
| `reference` | STRING(100) UNIQUE/tenant | Référence livraison (ex: LIV-YYYYMMDD-0001) |
| `supplier_id` | UUID (FK suppliers) | Fournisseur |
| `delivery_date` | DATE | Date livraison |
| `total_ht` | NUMERIC(15,2) | Total HT |
| `status` | ENUM | `PENDING`, `RECEIVED`, `PARTIAL`, `CANCELLED` |
| `notes` | TEXT | Notes |
| `purchase_order_ref` | STRING(100) | Référence bon de commande |
| `deleted_at` | DATE | Soft delete |

---

### 4.10 Table `delivery_items` — Lignes de livraison

| Colonne | Type | Description |
|---------|------|-------------|
| `delivery_id` | UUID (FK deliveries) | |
| `stock_item_id` | UUID (FK stock_items) | Article reçu |
| `quantity_received` | INTEGER | Quantité reçue |
| `purchase_price` | NUMERIC(15,2) | Prix d'achat unitaire |
| `total_ht` | NUMERIC(15,2) | Total ligne HT |

**Effet** : à la réception, met à jour le `purchase_price` (PUMP) du stock_item

---

### 4.11 Table `services` — Services vendus

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `tenant_id` | UUID (FK) | |
| `name` | STRING | Nom du service |
| `description` | TEXT | Description |
| `image_url` | TEXT | Image S3 |
| `price` | NUMERIC(15,2) | Prix unitaire |
| `is_active` | BOOLEAN | Actif |
| `status` | STRING(20) | `actif` / `archive` |

---

### 4.12 Table `subscriptions` — Abonnements

| Colonne | Type | Description |
|---------|------|-------------|
| `tenant_id` | UUID (PK = FK tenants) | Relation 1:1 strict |
| `plan_id` | STRING(50) | Plan actif (FK plans) |
| `status` | STRING(20) | `TRIAL`, `ACTIVE`, `EXPIRED`, `CANCELLED` |
| `next_billing_date` | DATE | Prochaine facturation |
| `auto_renew` | BOOLEAN | Renouvellement auto |
| `current_period` | STRING(10) | Période : `1M`, `3M`, `1Y` |

---

### 4.13 Table `plans` — Plans tarifaires

| ID | Nom | Mensuel | 3 Mois | Annuel | Max Users | IA |
|----|-----|---------|--------|--------|-----------|-----|
| `FREE_TRIAL` | Essai Gratuit | 0 | 0 | 0 | 5 | Oui (14j) |
| `BASIC` | Starter AI | 7 900 F | 20 145 F | 66 360 F | 1 | Non |
| `PRO` | Business Pro | 19 900 F | 50 745 F | 167 160 F | 5 | Oui |
| `ENTERPRISE` | Enterprise Cloud | 69 000 F | 175 950 F | 579 600 F | 100 | Oui |

**Colonnes** : `id`, `name`, `price_monthly`, `price_three_months`, `price_yearly`, `trial_days` (14), `max_users`, `has_ai_chatbot`, `has_stock_forecast`, `is_active`, `level` (0-3), `features` (JSONB)

---

### 4.14 Table `categories` & `subcategories`

- `categories` : `id`, `tenant_id`, `name`, `description`, `color`, `icon`
- `subcategories` : `id`, `tenant_id`, `category_id`, `name`, `description`
- Relation : `Category hasMany Subcategory` → `Subcategory hasMany StockItem`

---

### 4.15 Tables RH

#### `employees` — Employés
| Colonne | Type |
|---------|------|
| `first_name`, `last_name` | STRING |
| `email`, `phone` | STRING |
| `birth_date`, `hire_date` | DATE |
| `gender` | ENUM(M, F, O) |
| `address`, `city`, `country` | STRING/TEXT |
| `department_id` | UUID (FK departments) |
| `position` | STRING |
| `manager_id` | UUID (FK employees, self-referential) |
| `status` | ENUM(ACTIVE, INACTIVE, SUSPENDED) |
| `base_salary` | DECIMAL |
| `bank_info` | JSONB |
| `photo_url` | STRING |
| `meta` | JSONB |

#### `departments` — Départements
`id`, `tenant_id`, `name`, `description`, `manager_id` (FK employees), `created_at`

#### `contracts` — Contrats de travail
| Colonne | Description |
|---------|-------------|
| `contract_type` | ENUM(CDI, CDD, STAGE, FREELANCE) |
| `start_date`, `end_date` | Durée contrat |
| `salary` | Salaire contractuel |
| `working_hours` | Heures/semaine (défaut: 40) |
| `status` | ENUM(ACTIVE, EXPIRED, TERMINATED, SUSPENDED, RENEWED) |
| `termination_*` | Colonnes résiliation |
| `suspension_*` | Colonnes suspension |
| `trial_period_end` | Fin période d'essai |
| `previous_contract_id` | Lien renouvellement |
| `renewal_count` / `max_renewals` | Compteur renouvellements |

#### `payrolls` — Fiches de paie
| Colonne | Description |
|---------|-------------|
| `period_year` / `period_month` | Période de paie |
| `base_salary` | Salaire de base |
| `overtime` | Heures supplémentaires |
| `bonuses` | Primes |
| `deductions` | Retenues |
| `social_charges` | Charges sociales |
| `tax_amount` | Impôts |
| `net_salary` | Salaire net |
| `status` | ENUM(DRAFT, VALIDATED, PAID) |
| `document_url` | URL fiche de paie PDF/PNG (S3) |
| `meta` | JSONB (détail calcul) |

#### `payroll_settings` — Paramètres paie (1 par tenant)
| Paramètre | Défaut |
|-----------|--------|
| `employer_social_charge_rate` | 18.5% |
| `employee_social_charge_rate` | 8.2% |
| `tax_rate` | 10.0% |
| `minimum_wage` | 60 000 F CFA |
| `overtime_rate` | x1.5 |
| `payment_day` | 28 |
| `deduction_enabled` | false |
| `work_start_time` | 08:00 |
| `work_end_time` | 17:00 |
| `working_days_per_month` | 26 |

#### `payroll_items` — Éléments de paie personnalisés
Permet d'ajouter des lignes de calcul custom (primes fixes, cotisations spéciales…)

#### `attendances` — Pointages
`id`, `tenant_id`, `employee_id`, `date`, `clock_in`, `clock_out`, `source` (manual/qr/etc), `status` (PRESENT/ABSENT/LATE…), `overtime_minutes`, `meta`

**Index** : `(employee_id, date)`, `(tenant_id, date)`

#### `overtime_requests` — Demandes heures sup.
`id`, `tenant_id`, `employee_id`, `requested_date`, `start_time`, `end_time`, `requested_minutes`, `reason`, `status` (PENDING/APPROVED/REJECTED), `reviewed_by`, `actual_minutes`

#### `leaves` — Congés
`id`, `tenant_id`, `employee_id`, `type`, `start_date`, `end_date`, `status` (PENDING/APPROVED/REJECTED), `approved_by`, `reason`

#### `employee_documents` — Documents RH
`id`, `tenant_id`, `employee_id`, `document_type`, `file_url`, `uploaded_by`, `expiry_date`

#### `advances` — Avances sur salaire
`id`, `employee_id`, `tenant_id`, `amount`, `months`, `reason`, `status` (PENDING/APPROVED/REJECTED), `approved_by`, `start_date`, `end_date`, `remaining_amount`

#### `primes` — Primes
`id`, `employee_id`, `tenant_id`, `amount`, `reason`, `type` (PERFORMANCE/EXCEPTIONAL/ANNUAL_BONUS/PROJECT_BONUS/OTHER), `status`, `payroll_month`, `is_paid`

#### `job_offers` — Offres d'emploi
`id`, `tenant_id`, `title`, `description`, `department_id`, `status`, `deadline`, `created_by`

#### `candidates` — Candidats
`id`, `tenant_id`, `job_offer_id`, `first_name`, `last_name`, `email`, `phone`, `cv_url`, `status` (APPLIED/INTERVIEW/OFFERED/HIRED/REJECTED)

#### `trainings` — Formations
`id`, `tenant_id`, `title`, `description`, `start_date`, `end_date`, `budget`, `status`, `created_by`

#### `training_participants` — Participants formations
`id`, `tenant_id`, `training_id`, `employee_id`, `status` (ENROLLED/COMPLETED/ABSENT)

#### `performance_reviews` — Évaluations
`id`, `tenant_id`, `employee_id`, `reviewer_id`, `period`, `score`, `notes`, `status`

#### `declarations` — Déclarations sociales/fiscales
Tables de déclarations IPRES, CSS, IR avec statuts DRAFT/SUBMITTED/PAID

#### `hr_rules` — Règles RH configurables
Règles personnalisables par tenant (retards, absences, primes automatiques…)

---

### 4.16 Tables Contrats Récurrents

#### `recurring_contracts` — Contrats à facturation récurrente
| Colonne | Description |
|---------|-------------|
| `customer_id` | Client (nullable si client de passage) |
| `walkin_name` / `walkin_phone` | Client de passage |
| `service_id` | Service principal (nullable si multi-services) |
| `service_items` | JSONB — liste de services (multi-services) |
| `title` | Titre du contrat |
| `frequency` | ENUM(HEBDOMADAIRE, MENSUEL, TRIMESTRIEL) |
| `payment_day` | Jour fixe des échéances (défaut: 5) |
| `start_date` / `end_date` | Durée du contrat |
| `number_of_installments` | Nombre total d'échéances |
| `installment_amount` | Montant par échéance |
| `total_amount` | Montant total |
| `amount_paid` | Montant encaissé |
| `status` | ACTIF / TERMINE / SUSPENDU |

#### `recurring_installments` — Échéances des contrats récurrents
| Colonne | Description |
|---------|-------------|
| `contract_id` | FK recurring_contracts |
| `installment_number` | Numéro d'ordre |
| `due_date` | Date d'échéance |
| `amount` | Montant |
| `status` | ENUM(EN_ATTENTE, PAYE, EN_RETARD, ANNULE) |
| `paid_at` | Date encaissement |
| `payment_method` | Méthode paiement |
| `generated_sale_id` | Vente auto-générée (J-5 avant échéance) |

**Mécanisme** : un CRON génère automatiquement une `sale` 5 jours avant chaque échéance

---

### 4.17 Tables Système & Sécurité

#### `backups` — Sauvegardes
`id`, `tenant_id` (nullable = backup système), `type` (AUTOMATIC/MANUAL/SYSTEM/DELETION), `status` (SUCCESS/FAILED/RESTORED), `size`, `storage_path`, `checksum`, `retain_until`, `metadata`

#### `sessions` — Sessions utilisateurs
`id`, `tenant_id`, `user_id`, `token_hash`, `ip_address`, `user_agent`, `expires_at`, `is_active`

#### `audit_logs` — Journal d'audit
`id`, `tenant_id`, `user_id`, `action`, `resource`, `resource_id`, `before`, `after`, `ip_address`

#### `notifications` — Notifications in-app
`id`, `tenant_id`, `target_user_id` (nullable = broadcast), `title`, `body`, `type` (INFO/WARNING/ERROR/SUCCESS), `action_link`, `created_by`, `expires_at`

#### `notification_reads` — Lu/Non-lu
`notification_id`, `user_id`, `read_at` — UNIQUE(notification_id, user_id)

#### `registration_intents` — Inscriptions Stripe en attente
Stocke les données d'inscription avant création compte (flux Stripe pré-paiement)
`id`, `stripe_session_id` (UNIQUE), `registration_data` (TEXT chiffré), `status` (PENDING/COMPLETED/EXPIRED), `expires_at`

#### `support_tickets` — Tickets support
`id`, `tenant_id`, `subject`, `body`, `status`, `priority`

#### `administrators` — Super Admins plateforme
Compte séparé du système User pour les admins plateforme GeStockPro

---

### 4.18 Autres Tables

| Table | Description |
|-------|-------------|
| `product_movements` | Historique mouvements de stock (entrée/sortie) |
| `invoices` + `invoice_items` | Système de factures (legacy / avancé) |
| `documents` | Documents business (devis, BL, etc.) |
| `messages` | Messagerie interne |
| `prompt_templates` | Templates de prompts IA par tenant |
| `contact_messages` | Messages du formulaire de contact Landing Page |
| `announcements` | Annonces globales plateforme (visible tous tenants) |

---

## 5. MODÈLES (MySQL — Registry IA)

Utilisé par le module IA pour stocker les conversations et templates de prompts.
- **`PromptTemplate`** : templates de prompts IA configurables par tenant
- **`Message`** : historique des échanges avec l'IA

---

## 6. PLANS & ABONNEMENTS

### Flux d'inscription
```
1. Landing Page → Choix plan
2. Formulaire inscription → POST /api/auth/register
3. Plan payant (BASIC/PRO/ENTERPRISE) → Stripe Checkout Session
4. Stripe webhook → création compte + tenant
5. Onboarding Wizard → Paramétrage initial
6. Dashboard
```

### Plans
| Plan | Prix/mois | Utilisateurs | IA Chatbot | Prévision Stock | Essai |
|------|-----------|-------------|------------|-----------------|-------|
| FREE_TRIAL | Gratuit | 5 | Oui | Oui | 14 jours |
| BASIC | 7 900 F | 1 | Non | Non | Non |
| PRO | 19 900 F | 5 | Oui | Oui | Non |
| ENTERPRISE | 69 000 F | 100 | Oui | Oui | Non |

### Restrictions FREE_TRIAL
- Quota : 1 Client, 5 Produits, 5 Ventes
- 3 Catégories / 3 Sous-catégories max
- Durée : 14 jours

---

## 7. RÔLES & PERMISSIONS (RBAC)

### Rôles disponibles
| Rôle | Description |
|------|-------------|
| `SUPER_ADMIN` | Maître du kernel — accès universel total |
| `ADMIN` | Administrateur tenant — accès complet à son instance |
| `STOCK_MANAGER` | Gestion des stocks et inventaires |
| `ACCOUNTANT` | Accès finances, paiements, factures |
| `HR_MANAGER` | Gestion RH complète |
| `SALES` | Gestion ventes et clients |
| `EMPLOYEE` | Accès restreint (pointage, profil) |

### Architecture RBAC
- Les rôles sont **cumulatifs** : un utilisateur peut avoir `['ADMIN', 'HR_MANAGER']`
- Stockés dans `users.roles` (ARRAY) et `users.role` (STRING, rôle principal)
- Middleware `checkPermission(['ROLE1', 'ROLE2'])` : accès si l'utilisateur a AU MOINS UN des rôles
- `SUPER_ADMIN` bypass tout contrôle — accès universel

---

## 8. BACKEND — CONTROLLERS & SERVICES

### Controllers (42 fichiers dans `backend/controllers/`)

| Controller | Responsabilité |
|-----------|----------------|
| `AuthController` | Inscription, connexion, MFA, reset password, tokens |
| `TenantController` | Paramètres entreprise, branding, suspension, suppression |
| `AdminController` | Gestion des utilisateurs du tenant |
| `InventoryController` | CRUD articles de stock |
| `StockMovementController` | Mouvements de stock (entrée/sortie manuelle) |
| `InventoryCampaignController` | Campagnes d'inventaire physique |
| `SalesController` | Ventes, facturation, brouillons |
| `CustomerController` | CRUD clients, soldes, santé financière |
| `SupplierController` | CRUD fournisseurs |
| `DeliveryController` | Livraisons fournisseurs, mise à jour PUMP |
| `PaymentController` | Paiements, webhook Stripe/Mobile Money |
| `FinanceController` | Dashboard financier, export comptable |
| `RecoveryController` | Recouvrement créances clients |
| `RecurringContractController` | Contrats récurrents + échéances |
| `ServiceController` | CRUD services vendus |
| `CategoryController` | Catégories articles |
| `SubcategoryController` | Sous-catégories articles |
| `SubscriptionController` | Plans, abonnements, Stripe webhooks |
| `AIController` | Chatbot IA, analyse, bridge webhook |
| `BackupController` | Sauvegardes manuelles/restauration |
| `ResilienceController` | Diagnostics, health check |
| `SecurityController` | Sessions, MFA, audit |
| `EmployeeController` | CRUD employés |
| `DepartmentController` | CRUD départements |
| `ContractController` | Contrats de travail RH |
| `PayrollController` | Calcul et validation des paies |
| `PayrollSettingsController` | Paramètres paie (taux, horaires) |
| `PayrollItemController` | Éléments de paie custom |
| `PayslipController` | Génération fiches de paie PDF/PNG |
| `AttendanceController` | Pointage (clock-in/clock-out) |
| `OvertimeController` | Demandes heures supplémentaires |
| `LeaveController` | Congés et absences |
| `EmployeeDocumentController` | Documents RH |
| `JobOfferController` | Offres d'emploi |
| `CandidateController` | Candidatures |
| `TrainingController` | Formations |
| `PerformanceReviewController` | Évaluations de performance |
| `DeclarationController` | Déclarations sociales/fiscales |
| `HRRuleController` | Règles RH configurables |
| `NotificationController` | Notifications in-app |
| `SupportController` | Tickets support |
| `AnnouncementController` | Annonces plateforme |
| `DocumentController` | Documents business |
| `UploadController` | Upload vers S3 + serve fichiers signés |

### Services Backend (16 fichiers dans `backend/services/`)

| Service | Rôle |
|---------|------|
| `AuthService` | Génération/vérification JWT |
| `AIService` | Appels API Gemini / OpenAI |
| `BackupService` | Export/restauration données tenant |
| `BillingService` | Logique facturation, renouvellement |
| `CustomerService` | Calcul santé financière clients |
| `DocumentService` | Génération documents PDF |
| `FinanceService` | Agrégations financières |
| `InvoiceService` | Génération factures PDF |
| `NotificationService` | Envoi notifications in-app |
| `PaymentGateway` | Abstraction Mobile Money (Wave, OM, MTN) |
| `PayrollCalculationService` | Moteur de calcul brut→net |
| `PayslipGeneratorService` | Génération fiches de paie (PNG/PDF) |
| `ResilienceService` | Health checks, diagnostics |
| `S3Service` | Upload, download, URL signée, quota |
| `SecurityService` | Gestion sessions, audit logs |
| `StripeService` | Checkout sessions, webhooks Stripe |

---

## 9. FRONTEND — COMPOSANTS

### Composants principaux (`components/`)

| Composant | Module |
|-----------|--------|
| `LandingPage.tsx` | Page d'accueil publique avec tarifs |
| `Login.tsx` | Connexion + inscription |
| `OnboardingWizard.tsx` | Configuration initiale post-inscription |
| `Dashboard.tsx` | Tableau de bord principal |
| `Inventory.tsx` | Gestion des articles de stock |
| `InventoryCampaign.tsx` | Campagnes d'inventaire physique |
| `InventoryCampaignAudit.tsx` | Rapport d'audit inventaire |
| `InventoryAuditReport.tsx` | Rapport d'audit avancé |
| `StockMovements.tsx` | Mouvements de stock |
| `CategoryManager.tsx` | Gestion catégories |
| `SubcategoryManager.tsx` | Gestion sous-catégories |
| `Customers.tsx` | Gestion clients |
| `Suppliers.tsx` | Gestion fournisseurs |
| `Deliveries.tsx` | Livraisons fournisseurs |
| `Sales.tsx` | Ventes et factures |
| `Services.tsx` | Catalogue services |
| `RecurringContracts.tsx` | Contrats récurrents |
| `Payments.tsx` | Paiements et encaissements |
| `Recovery.tsx` | Recouvrement créances |
| `AIAnalysis.tsx` | Analyse IA (stocks, finances) |
| `ChatInterface.tsx` | Chatbot IA intégré |
| `Settings.tsx` | Paramètres entreprise/branding |
| `SecurityPanel.tsx` | Gestion sécurité et sessions |
| `AuditLogs.tsx` | Journal d'audit |
| `Governance.tsx` | Gouvernance et conformité |
| `Subscription.tsx` | Gestion abonnement |
| `Checkout.tsx` | Paiement Stripe (upgrade plan) |
| `Support.tsx` | Tickets support |
| `SuperAdmin.tsx` | Interface super-administrateur |
| `SuperAdminLogin.tsx` | Connexion super-admin |
| `Layout.tsx` | Layout principal avec sidebar |
| `SessionManager.tsx` | Gestion sessions actives |
| `DocumentPreview.tsx` | Prévisualisation documents |
| `TimeMachineFilter.tsx` | Filtre temporel global |
| `YearMonthPicker.tsx` | Sélecteur mois/année |
| `DashboardTour.tsx` | Tour de démarrage interactif |
| `ToastProvider.tsx` | Notifications toast |
| `Info.tsx` | Page d'information |
| `RegistrationSuccess.tsx` | Confirmation inscription |
| `StripeRedirect.tsx` | Pages succès/annulation Stripe |

### Composants RH (`components/rh/`)

| Composant | Module RH |
|-----------|-----------|
| `HRDashboard.tsx` | Tableau de bord RH |
| `EmployeeList.tsx` | Liste des employés |
| `EmployeeProfile.tsx` | Profil détaillé employé |
| `ContractList.tsx` | Contrats de travail |
| `PayrollManagement.tsx` | Gestion de la paie |
| `PayslipPreview.tsx` | Prévisualisation fiche de paie |
| `LeaveManagement.tsx` | Gestion des congés |
| `Attendance.tsx` | Pointage (vue manager) |
| `EmployeePointage.tsx` | Pointage (vue employé) |
| `OvertimeRequests.tsx` | Demandes heures sup |
| `TimeDeductionSettings.tsx` | Paramètres déductions temps |
| `DepartmentManager.tsx` | Gestion départements |
| `OrgChart.tsx` | Organigramme |
| `DocumentCenter.tsx` | Centre de documents RH |
| `DeclarationsSocialesFiscales.tsx` | Déclarations IPRES/CSS/IR |
| `ModulePlaceholder.tsx` | Composant placeholder modules |
| `HRModal.tsx` | Modal RH générique |

### Composants Super Admin (`components/superadmin/`)

| Composant | Description |
|-----------|-------------|
| `SADashboard.tsx` | Dashboard plateforme (KPIs globaux) |
| `SAAccounts.tsx` | Gestion de tous les tenants |
| `SAPayments.tsx` | Paiements et revenus plateforme |
| `SAPlans.tsx` | Gestion des plans |
| `SALogs.tsx` | Logs globaux |
| `SAAlerts.tsx` | Alertes système |
| `SAMessages.tsx` | Messagerie admin→tenants |
| `SACommunication.tsx` | Annonces et communications |
| `SASupport.tsx` | Support tickets plateforme |

---

## 10. MODULES FONCTIONNELS DÉTAILLÉS

### Module Stock
- CRUD articles avec SKU, catégorie, sous-catégorie, image S3
- Suivi du niveau de stock en temps réel
- Alertes de stock bas (seuil configurable)
- Prix d'achat moyen pondéré (PUMP) mis à jour à chaque livraison
- Prévision IA du niveau de stock
- Campagnes d'inventaire physique (DRAFT → VALIDATED avec ajustements)
- Mouvements manuels (entrée/sortie avec justification)

### Module Ventes
- Création de factures (produits + services mixés)
- Clients enregistrés ou clients de passage (walkin)
- Statuts : BROUILLON → EN_COURS → TERMINE / ANNULE / REMBOURSE
- Calcul automatique HT / TVA / TTC
- Génération PDF facture avec logo et cachet entreprise
- Liaison automatique avec les paiements

### Module Paiements
- Multi-méthodes : Cash, Wave, Orange Money, MTN MoMo, Stripe, Chèque, Virement
- CHEQUE et TRANSFER : statut PENDING jusqu'à validation manuelle
- Preuve image upload pour Mobile Money
- Webhook Stripe pour paiements carte en ligne
- Gestion des remboursements

### Module Clients / Recouvrement
- CRM client avec santé financière (GOOD/WARNING/CRITICAL)
- Solde dû et limite de crédit
- Recouvrement des créances avec suivi des relances

### Module Fournisseurs & Livraisons
- CRUD fournisseurs
- Bons de livraison avec mise à jour automatique du PUMP des articles
- Réceptions partielles (PARTIAL) et complètes (RECEIVED)

### Module Contrats Récurrents
- Contrats de prestation récurrente (maintenance, abonnement, loyer...)
- Fréquence : hebdomadaire, mensuelle, trimestrielle
- Génération automatique des ventes J-5 avant chaque échéance (CRON)
- Suivi des paiements par échéance

### Module RH
- **Administratif** : employés, départements, organigramme, contrats (CDI/CDD/STAGE/FREELANCE)
- **Temps** : pointage clock-in/out, heures supplémentaires, congés
- **Paie** : calcul brut→net (charges sociales sénégalaises), primes, avances
- **Recrutement** : offres d'emploi, gestion candidatures
- **Formation** : plans de formation, participants
- **Évaluation** : revues de performance périodiques
- **Conformité** : déclarations IPRES, CSS, IR (Sénégal)

### Module Finance
- Dashboard financier (CA, dépenses, marge)
- Export comptable (Excel/PDF)
- Rapports de trésorerie

### Module IA
- Chatbot Gemini intégré (plan PRO et ENTERPRISE)
- Analyse IA des stocks (prévisions, anomalies)
- Analyse IA des finances
- Templates de prompts personnalisables par tenant

### Module Super Admin
- Vue globale de tous les tenants
- Suspension/réactivation de comptes
- Suppression planifiée (30j de délai)
- Gestion des plans et tarifs
- Logs et alertes système
- Communication avec les tenants
- Gestion des sauvegardes

---

## 11. APIS & ROUTES

### Routes publiques (sans JWT)
```
POST /api/auth/register          — Inscription
POST /api/auth/login             — Connexion
GET  /api/plans                  — Liste des plans
POST /api/contact                — Message de contact (Landing)
POST /api/payments/callback      — Webhook paiement mobile
POST /api/billing/stripe/webhook — Webhook Stripe (corps brut requis)
GET  /api/files?key=...          — Servir fichier S3 (URL signée)
POST /api/ai/bridge              — Bridge IA (server-to-server)
```

### Routes protégées (JWT requis + isolation tenant)
```
/api/stock/*           — Stocks
/api/sales/*           — Ventes
/api/customers/*       — Clients
/api/suppliers/*       — Fournisseurs
/api/deliveries/*      — Livraisons
/api/services/*        — Services
/api/categories/*      — Catégories
/api/subcategories/*   — Sous-catégories
/api/payments/*        — Paiements
/api/finance/*         — Finance
/api/billing/*         — Abonnements
/api/ai/*              — IA
/api/documents/*       — Documents
/api/resilience/*      — Diagnostics
/api/recovery/*        — Recouvrement
/api/hr/*              — RH
/api/upload/*          — Upload fichiers
/api/support/*         — Support
/api/recurring/*       — Contrats récurrents
/api/admin/*           — Admin tenant (ADMIN requis)
```

### En-têtes HTTP importants
- `Authorization: Bearer <JWT>` — authentification
- `x-session-token: <token>` — token de session (double sécurité)
- `x-tenant-id: <uuid>` — override tenant (SUPER_ADMIN uniquement)

---

## 12. INTÉGRATIONS EXTERNES

| Service | Usage | Config |
|---------|-------|--------|
| **Stripe** | Paiements carte, abonnements | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Wave / OM / MTN** | Paiements Mobile Money | Géré via `PaymentGateway.js` |
| **Google Gemini AI** | Chatbot IA, analyses | `GEMINI_API_KEY` |
| **AWS S3 / MamuteCloud** | Stockage fichiers | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| **SMTP (Mailtrap dev)** | Emails (invitations, notifications) | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` |
| **Firebase** | (présent dans dépendances, usage à confirmer) | `firebase-admin` |
| **AlwaysData** | Hébergement BDD PostgreSQL + MySQL | Hôtes dédiés |

---

## 13. DÉPLOIEMENT & INFRASTRUCTURES

### URLs de production
- **Frontend** : `https://gestock.realtechprint.com` (ou Render static)
- **Backend API** : `https://gestock.realtechprint.com/api`
- **Backend direct** : `https://gestock.realtechprint.com`

### Configuration URL backend (services/config.ts)
- En production → utilise l'origine de la page (même domaine)
- En dev (localhost) → pointe vers `https://gestock.realtechprint.com` (prod)
- Override possible via `VITE_BACKEND_URL`

### Déploiement Frontend (Render)
- Type : Static site
- Build : `npm ci && npm run build`
- Publish dir : `dist`
- SPA routing : toutes les routes → `index.html`

### Déploiement Backend
- Node.js ESM (`"type": "module"`)
- Serveur : Express 5 sur port 3000 (ou `$PORT`)
- Process manager : PM2 (`ecosystem.config.cjs`)
- Proxy : `app.set('trust proxy', 1)` pour Nginx/Cloudflare

### Variables d'environnement Backend (`.env`)
```
# Base de données
DB_HOST / DB_USER / DB_PASS / DB_NAME (PostgreSQL)
MYSQL_HOST / MYSQL_USER / MYSQL_PASS / MYSQL_DB

# Sécurité
JWT_SECRET

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PRO_MONTHLY=price_1TCmubQ54W1IDtbTwmP4QPvx
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_1TCmtCQ54W1IDtbTcjlgBbDb

# S3
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_ENDPOINT=https://s3-us-east-1.mamutecloud.com
S3_REGION=us-east-1
S3_BUCKET=bucket-gestockpro

# Email
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=...
SMTP_PASS=...

# Frontend URL (Stripe redirects)
FRONTEND_URL=https://gestock.realtechprint.com

# IA
GEMINI_API_KEY
```

### CRON Jobs (node-cron dans server.js)
- Génération automatique des ventes récurrentes (J-5 avant échéance)
- Vérification des abonnements expirés
- Pointage automatique fin de journée
- Nettoyage des sessions expirées

---

## 14. HISTORIQUE DES MODIFICATIONS

### 2026-06-10 — Création du fichier MEMOIRE.md
- Audit complet du projet par Claude (Sonnet 4.6)
- Documentation exhaustive de toute l'architecture, BDD, composants
- Création de ce fichier de référence centralisé

### Dernière version commitée
- **Commit** : `865059ab` — "Version final du projet sans module IA"
- **Branche** : `ge_stock_pro_9_fevrier`

### Modifications majeures connues (depuis le code)
1. **Contrats récurrents** : ajout des tables `recurring_contracts` + `recurring_installments`, génération CRON de ventes
2. **Paiements chèque** : ajout de l'enum `CHEQUE` + colonnes `cheque_number`, `bank_name`, `cheque_date`, `cheque_order`
3. **Preuve de paiement** : colonne `proof_image` sur `payments`
4. **Client de passage (walkin)** : colonnes `walkin_name` + `walkin_phone` sur `sales`
5. **Suspension compte** : colonnes `is_suspended`, `suspended_at`, `suspension_reason` sur `tenants`
6. **Suppression planifiée** : colonnes `pending_deletion`, `deletion_*` sur `tenants`
7. **Statut BROUILLON** : ajout à l'enum `enum_sales_status`
8. **Notifications in-app** : tables `notifications` + `notification_reads`
9. **Stockage S3** : colonne `storage_used_bytes` sur `tenants`
10. **Abonnements multi-périodes** : colonnes `price_three_months`, `price_yearly` sur `plans`
11. **Pointage avancé** : tables `attendances` + `overtime_requests` avec déductions configurables
12. **Fournisseurs & Livraisons** : tables `suppliers` + `deliveries` + `delivery_items`, calcul PUMP
13. **Module RH complet** : employees, departments, contracts, payrolls, leaves, advances, primes, declarations, etc.
14. **Backup DELETION** : valeur ajoutée à l'enum `enum_backups_type`

---

## 15. TÂCHES ACCOMPLIES

- [x] Architecture SaaS multi-tenant complète
- [x] Système d'authentification JWT + MFA + sessions
- [x] RBAC multi-rôles cumulatifs
- [x] Isolation des données par tenant (middleware)
- [x] Module Stock complet (CRUD, mouvements, inventaire)
- [x] Module Ventes complet (facturation, PDF, brouillons)
- [x] Module Clients avec recouvrement et santé financière
- [x] Module Fournisseurs + Livraisons + mise à jour PUMP
- [x] Module Paiements multi-méthodes (Cash, OM, Wave, MTN, Stripe, Chèque)
- [x] Module Services vendus
- [x] Module Contrats Récurrents (facturation par échéances + CRON)
- [x] Module Finance (dashboard, exports)
- [x] Module RH complet (employés, paie, congés, pointage, recrutement, formation)
- [x] Génération de fiches de paie (PDF + PNG via S3)
- [x] Déclarations sociales sénégalaises (IPRES, CSS, IR)
- [x] Module IA (Gemini chatbot + analyse)
- [x] Système de sauvegarde et restauration
- [x] Sécurité : audit logs, sessions, rate limiting
- [x] Stockage S3-compatible (MamuteCloud)
- [x] Intégration Stripe complète (checkout, webhooks)
- [x] Notifications in-app
- [x] Super Admin Panel complet
- [x] Landing Page avec tarifs
- [x] Onboarding Wizard post-inscription
- [x] Tour de démarrage interactif
- [x] Pages légales (CGU, Mentions Légales, RGPD, Cookies)
- [x] Support tickets

---

## 16. TRAVAUX EN COURS / À FAIRE

> Mettre à jour cette section à chaque nouvelle tâche ou modification

### En cours
- Consolidation et stabilisation des modifications sur la branche `ge_stock_pro_9_fevrier`

### À faire (backlog connu)
- [ ] Ré-intégration module IA (retiré dans le dernier commit final)
- [ ] Tests automatisés (unitaires + intégration)
- [ ] Documentation API (Swagger/OpenAPI)
- [ ] Module e-commerce / boutique en ligne
- [ ] Application mobile (React Native)
- [ ] Extraction du module RH en standalone indépendant (voir `Transfert.MD`)
- [ ] Multi-devises avancé
- [ ] Intégration comptable (export Sage/OHADA)

---

## 17. DÉCISIONS TECHNIQUES IMPORTANTES

### Isolation stricte des tenants
Chaque requête protégée passe par `tenantIsolation` middleware qui charge le tenant depuis la BDD et injecte `req.tenantFilter`. Aucune requête inter-tenant n'est possible côté RBAC standard.

### Pas de `alter: true` sur Sequelize
Le sync est configuré avec `alter: false`. Toutes les modifications de schéma se font via des `ALTER TABLE IF EXISTS` dans `connectDB()` (idempotents). Cela évite les migrations destructives en prod.

### PUMP (Prix d'Achat Moyen Pondéré)
À chaque livraison fournisseur reçue, le `purchase_price` des articles est recalculé via la formule PUMP. Ce prix est distinct du `unit_price` (prix de vente).

### Double base de données
La séparation PostgreSQL (ERP) / MySQL (IA) est délibérée : les conversations IA et templates de prompts sont isolés de la base ERP pour des raisons de performance et de cloisonnement des données.

### Stripe + Mobile Money
Pour les marchés africains, les paiements Mobile Money (Wave, Orange Money, MTN) sont gérés nativement. Stripe est réservé aux paiements carte (abonnements en ligne).

### Soft Delete
Les tables `stock_items`, `customers`, `suppliers`, `services` utilisent un soft delete via `deleted_at` + `status` ('actif'/'archive'). Les contraintes uniques s'appliquent uniquement sur les enregistrements actifs.

### Session System
Double couche de sécurité : JWT standard + token de session (`x-session-token`). Documenté dans `SESSION_SYSTEM_DOCUMENTATION.md`.

---

*Ce fichier doit être mis à jour à CHAQUE modification du projet. Il est la mémoire partagée entre tous les développeurs et toutes les IA intervenant sur GeStockPro.*
