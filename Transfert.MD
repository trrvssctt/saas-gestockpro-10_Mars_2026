# 🚀 Guide de Transfert du Module RH (Human Resources) - GeStockPro

Ce document détaille tous les composants nécessaires pour extraire et réutiliser le module de Gestion des Ressources Humaines (RH) de GeStockPro dans une application indépendante.

## 📊 1. Base de Données (PostgreSQL)

Le module repose sur un ensemble de tables robustes. Vous devez importer les schémas SQL suivants (situés à la racine du projet) :

- **`database_hr_init.sql`** : Tables de base (Employés, Départements, Contrats, Congés, Paies, Pointages, Documents).
- **`database_advances_primes.sql`** : Gestion des avances sur salaire et des primes exceptionnelles.
- **`database_declarations_sociales.sql`** : Paramètres et gestion des déclarations IPRES/CSS (contexte Sénégal).

### Tables Clés et Attributs :
- `employees` : Identité, poste, salaire de base, info bancaires.
- `contracts` : Type (CDI, CDD, etc.), dates, salaire contractuel.
- `payrolls` : Bulletins générés, brut, net, retenues.
- `attendances` : Pointage (check-in/out), heures supp.
- `leaves` : Type de congé, statut d'approbation.

---

## ⚙️ 2. Backend (Node.js / Express / Sequelize)

### Modèles Sequelize (`backend/models/`)
Importez les fichiers suivants pour la logique ORM :
- `Employee.js`, `Department.js`, `Contract.js`
- `Payroll.js`, `PayrollSettings.js`, `PayrollItem.js`
- `Attendance.js`, `Leave.js`, `EmployeeDocument.js`
- `JobOffer.js`, `Candidate.js` (Recrutement)
- `Training.js`, `TrainingParticipant.js` (Formation)
- `PerformanceReview.js` (Évaluations)
- `Advance.js`, `Prime.js`
- `HRRule.js` (Moteur de règles)

### Contrôleurs (`backend/controllers/`)
La logique métier est encapsulée ici :
- `EmployeeController.js`
- `PayrollController.js` & `PayslipController.js`
- `AttendanceController.js`
- `LeaveController.js`
- `ContractController.js`
- ... (Tous les contrôleurs liés aux modèles ci-dessus)

### Services (`backend/services/`) - **CRITIQUE**
Ces services contiennent l'intelligence du module :
- **`PayrollCalculationService.js`** : Gère le calcul complexe du net à payer, l'intégration des avances et des primes.
- **`PayslipGeneratorService.js`** : Génère les fiches de paie au format PDF/PNG en utilisant **Puppeteer**.

### Routes (`backend/routes/`)
- **`hr.routes.js`** : Centralise tous les endpoints du module RH.

---

## 🛡️ 3. Dépendances & Middlewares

Pour que le module fonctionne, il dépend de certains middlewares système de GeStockPro :
- **`auth.js`** : Authentification JWT.
- **`tenant.js`** : Isolation des données (Multi-tenancy via `tenant_id`).
- **`rbac.js`** : Contrôle d'accès basé sur les rôles (`ADMIN`, `HR_MANAGER`, `ACCOUNTANT`, `EMPLOYEE`).

---

## 💻 4. Frontend (React / TypeScript / Tailwind)

### Composants (`components/rh/`)
C'est ici que se trouve l'interface utilisateur complète :
- `HRDashboard.tsx` : Vue d'ensemble et statistiques.
- `EmployeeList.tsx` & `EmployeeProfile.tsx` : Gestion et fiche détaillée.
- `PayrollManagement.tsx` & `PayslipPreview.tsx` : Gestion de la paie.
- `Attendance.tsx` & `EmployeePointage.tsx` : Système de pointage.
- `LeaveManagement.tsx` : Gestion des congés.
- `ContractList.tsx` : Suivi des contrats.
- `OrgChart.tsx` : Organigramme dynamique.

### Services API (`services/api.ts`)
Toutes les fonctions `leaveApi`, `employeeApi`, etc., nécessaires pour communiquer avec le backend.

---

## 🛠️ 5. Instructions d'Installation (Standalone)

1. **DB** : Exécutez les 3 fichiers `.sql` dans votre base PostgreSQL.
2. **Backend** : 
   - Copiez les modèles, contrôleurs et services.
   - Installez les dépendances : `npm install puppeteer sequelize express multer`.
   - Montez `hr.routes.js` dans votre `server.js`.
3. **Frontend** :
   - Copiez le dossier `components/rh`.
   - Assurez-vous d'avoir une gestion d'authentification compatible (JWT).
4. **Variables d'Environnement** :
   - Configurez les accès S3 ou stockage local pour les documents (`uploads/`).

---

## 💡 Note Spéciale : Multi-tenancy
Le module est conçu pour être "Tenant-Aware". Si vous l'utilisez pour une seule entreprise, vous pouvez simplifier en supprimant les références à `tenant_id` ou en le fixant par défaut.
