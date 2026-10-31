# Brief Claude Code — Instance de démo GeStockPro (vidéo pub)

## 0. Contexte et objectif

GeStockPro (https://gestock.realtechprint.com) est un ERP SaaS multi-tenant : stock, ventes, contrats récurrents, recouvrement, trésorerie, RH & paie, IAM, assistant IA « Kernel IA Orchestrator ». Chaque tenant a son schéma PostgreSQL dédié.

On va tourner une vidéo pub en naviguant dans l'application. L'instance actuelle (« Payless Computer ») contient des données de test et des données personnelles réelles, et affiche plusieurs bugs. Il faut :

1. **Corriger les bugs visibles** listés en section 2.
2. **Créer un NOUVEAU tenant de démo** et le remplir avec le jeu de données de la section 3.
3. **Vérifier** avec la checklist de la section 4.

## 1. Règles impératives

- **Ne rien supprimer ni modifier dans les tenants existants** (Payless Computer, Le Toit des Anges, etc.). Tout se passe dans un tenant neuf.
- Le seed doit être **idempotent** : un script `seed-demo` qui peut être relancé, avec une option `--reset` qui ne vide **que** le schéma du tenant de démo (vérifier le nom du schéma avant tout `TRUNCATE`).
- **Passer par la couche service / les contrôleurs du backend** (ou l'API) plutôt que par du SQL brut, pour que les données dérivées soient cohérentes : mouvements de stock, encours clients, journaux d'activité, factures auto des contrats, flux du dashboard. Le SQL direct n'est acceptable que pour antidater les enregistrements (`created_at`) une fois créés.
- **100 % données fictives** : noms, emails en `@exemple.sn`, téléphones au format `+221 70 000 XX XX`. Aucun email ou numéro réel.
- Noms de produits **génériques, sans marque** (pas de Samsung, Apple, Nike, Jordan…).
- Photos produits : images libres de droits (Unsplash / Pexels, licence vérifiée) stockées localement, ou visuels génériques. **Aucune image cassée** : vérifier chaque URL.
- TVA 18 % (comme l'application le fait déjà). Les prix ci-dessous sont **HT**. Devise F CFA.
- Orthographe française soignée dans toutes les libellés et descriptions.
- Fournir à la fin les identifiants du compte admin de démo **dans un fichier `.env.demo` non commité**, pas dans le chat.

## 2. Bugs à corriger avant le tournage

| # | Où | Constat | Attendu |
|---|----|---------|---------|
| B1 | Dashboard → Flux d'activité récent | Les mouvements de stock affichent « -undefined unités » / « +undefined unités » et le titre générique « Produit » | « −3 unités • Climatiseur split 12 000 BTU • Awa Ndiaye » (quantité et nom du produit réels) |
| B2 | Dashboard → Top créances clients | Un débiteur s'affiche avec le nom « Client » | Nom réel du client (même source que la page Recouvrement) |
| B3 | Dashboard → Dernières ventes | Colonne Client = « N/A » sur toutes les lignes | Nom du client de la vente (la page Ventes l'affiche correctement, réutiliser la même jointure) |
| B4 | Dashboard → cartes KPI | « Chiffre d'affaires 17 514 420 F — 20 ventes » et « Ventes 2026 : 20 — 7 478 160 F » : deux montants différents pour les mêmes 20 ventes | Même base de calcul (TTC, hors ventes annulées, période sélectionnée) ou libellés qui expliquent la différence |
| B5 | Contrats récurrents → carte « facturées dans Ventes » | Affiche 0 alors que des factures RC-… existent dans Ventes | Nombre réel de factures générées par les contrats |
| B6 | Ventes → colonne Taux livraison | Factures de services : « 100 % livré — 0/0 articles livrés » | Pour une vente sans article physique : afficher « Prestation » ou « — », pas un taux de livraison |
| B7 | Clients | Encours = 0 F CFA pour tous les clients, alors que Recouvrement affiche 11,6 M de dette | Même calcul d'encours que la page Recouvrement |
| B8 | Clients vs Recouvrement | Recouvrement liste des débiteurs (ex. Mouhamed Mbodj, Habib Fall) absents de la page Clients | Les contrats et ventes doivent pointer sur des fiches clients existantes ; la page Clients doit lister tous les clients du tenant |
| B9 | Trésorerie → colonne Client | Les paiements de contrats récurrents affichent « VENTE DIRECTE » | Nom du client et type « Contrat récurrent » |
| B10 | Catalogue Stocks / Services | Images cassées (attribut alt visible) | Fallback visuel (icône de catégorie) quand l'image ne charge pas |
| B11 | Catalogue Stocks → Marge | Produit à prix d'achat 0 F affiche « Marge 100 % » | Afficher « — » si le PUMP est inconnu |

Pour chaque bug : corriger, puis ajouter un test (unitaire ou e2e) quand c'est raisonnable.

## 3. Jeu de données de démo

### 3.1 Tenant

- **Raison sociale** : Teranga Équipements SARL (entreprise fictive)
- **Activité** : distribution d'électroménager, climatisation et informatique + services d'installation et de maintenance
- **Adresse** : Liberté 6, Dakar
- **Email** : contact@exemple.sn — **Téléphone** : +221 70 000 00 01
- **NINEA (fictif)** : 0000000 2G3
- **Plan d'abonnement** : Business Pro actif, prochaine échéance dans ~3 semaines, 6 règlements Wave historiques propres (références au format `#TX-…`, pas de caractères bizarres)
- **Admin de démo** : Fatou Sarr, Directrice générale, fatou.sarr@exemple.sn

### 3.2 Catégories et sous-catégories

| Catégorie | Description | Sous-catégories |
|-----------|-------------|-----------------|
| Électroménager | Froid, lavage et cuisson pour la maison | Réfrigération, Lavage, Cuisson |
| Climatisation | Climatiseurs et ventilation | Climatiseurs split, Ventilation |
| Informatique | Postes de travail et périphériques | Ordinateurs, Impression, Énergie |
| Téléphonie | Smartphones et accessoires | Smartphones |
| Mobilier de bureau | Aménagement des espaces de travail | Bureaux, Sièges |

### 3.3 Produits (15)

| Produit | Sous-catégorie | Prix achat HT | Prix vente HT | Stock final | Seuil alerte |
|---------|----------------|---------------|---------------|-------------|--------------|
| Réfrigérateur double porte 350 L | Réfrigération | 285 000 | 365 000 | 18 | 5 |
| Congélateur coffre 300 L | Réfrigération | 210 000 | 265 000 | 12 | 4 |
| Machine à laver 8 kg | Lavage | 195 000 | 249 000 | 9 | 3 |
| Cuisinière 4 feux avec four | Cuisson | 140 000 | 185 000 | 7 | 3 |
| Climatiseur split 12 000 BTU | Climatiseurs split | 230 000 | 310 000 | 24 | 6 |
| Climatiseur split 18 000 BTU | Climatiseurs split | 320 000 | 425 000 | **4** | 5 → **alerte** |
| Ventilateur sur pied | Ventilation | 14 000 | 22 000 | 60 | 15 |
| Ordinateur portable 15" i5 16 Go | Ordinateurs | 380 000 | 495 000 | 15 | 4 |
| Ordinateur de bureau i7 + écran 24" | Ordinateurs | 450 000 | 575 000 | 6 | 2 |
| Imprimante multifonction laser | Impression | 165 000 | 219 000 | **3** | 4 → **alerte** |
| Photocopieur A3 professionnel | Impression | 1 250 000 | 1 600 000 | 2 | 1 |
| Onduleur 1500 VA | Énergie | 65 000 | 89 000 | **0** → **rupture** | 5 |
| Smartphone 6,7" 256 Go | Smartphones | 210 000 | 275 000 | 30 | 8 |
| Bureau de direction | Bureaux | 175 000 | 240 000 | 5 | 2 |
| Fauteuil ergonomique | Sièges | 68 000 | 95 000 | 20 | 5 |

Le stock final doit **résulter** des livraisons fournisseurs (entrées) moins les ventes livrées (sorties). Calculer les quantités livrées en conséquence.

### 3.4 Services (5)

| Service | Prix HT | Description |
|---------|---------|-------------|
| Installation climatiseur | 35 000 | Pose, mise en service et test d'un climatiseur split |
| Maintenance préventive climatisation | 25 000 | Nettoyage des filtres, contrôle du gaz et de l'électricité, par unité |
| Livraison Dakar et banlieue | 5 000 | Livraison à domicile ou en entreprise sous 48 h |
| Extension de garantie 1 an | 30 000 | Prolonge la garantie constructeur de 12 mois |
| Configuration poste informatique | 15 000 | Installation du système, logiciels et mise en réseau |

### 3.5 Fournisseurs (4)

| Fournisseur | Contact | Ville | Délai paiement | Spécialité |
|-------------|---------|-------|----------------|------------|
| Atlantic Distribution SA | Moussa Fall | Dakar, Zone industrielle | 30 j | Électroménager |
| Sahel Informatique | Khady Diop | Dakar, Plateau | 45 j | Informatique, téléphonie |
| Froid Service Dakar | Ousmane Gueye | Pikine | 30 j | Climatisation |
| Bureau Concept | Mariama Sy | Dakar, Point E | 15 j | Mobilier |

### 3.6 Livraisons fournisseurs (6, toutes « Reçue » sauf une « Partielle »)

Réparties entre janvier et octobre 2026, une par fournisseur au minimum, la plus récente à J-5 avec statut **Partielle** (pour montrer la gestion du reliquat). Quantités calculées pour atteindre les stocks finaux de 3.3.

### 3.7 Clients (10)

| Client | Type | Délai | Profil attendu dans Recouvrement |
|--------|------|-------|----------------------------------|
| Hôtel Océan Bleu | Entreprise | 30 j | Bon payeur, contrat de maintenance |
| Cabinet Sow & Associés | Entreprise | 30 j | Bon payeur, location photocopieur |
| École Les Petits Génies | Entreprise | 30 j | 1 échéance en retard → Modéré |
| Clinique Les Palmiers | Entreprise | 45 j | 2 échéances en retard → **Critique** (plus grosse dette) |
| Supermarché Diama Market | Entreprise | 30 j | 1 facture partiellement payée → Élevé |
| Agence Événements Teranga | Entreprise | 15 j | Bon payeur, contrat trimestriel |
| Restaurant Le Petit Thiof | Entreprise | 15 j | Payé comptant |
| Boulangerie Le Fournil de Ouakam | Entreprise | 30 j | Payé |
| Mme Aïssatou Ba | Particulier | comptant | Payé |
| M. Ibrahima Ndoye | Particulier | comptant | 1 vente impayée → Modéré |

Marquer 2 clients VIP (Hôtel Océan Bleu, Cabinet Sow & Associés).

### 3.8 Ventes (≈ 35 entre janvier et octobre 2026)

- **Courbe de CA HT croissante**, cibles mensuelles approximatives (F CFA) :
  janv 2,1 M · févr 2,6 M · mars 3,0 M · avr 3,4 M · mai 3,9 M · juin 4,3 M · juil 4,8 M · août 5,2 M · sept 5,9 M · oct 6,6 M (factures auto des contrats incluses).
- Mélanger produits seuls, produits + services (ex. climatiseur + installation + livraison), services seuls.
- Taux d'encaissement global visé : **≈ 78 %**. Créances restantes portées par les clients notés en 3.7.
- 3 à 4 ventes dans les **7 derniers jours**, dont une créée « aujourd'hui », pour que le flux d'activité du dashboard soit vivant.
- Vendeurs répartis entre les commerciaux (3.10) pour que le « Classement équipe » soit crédible (pas de vendeur « SYSTÈME » en tête : les factures auto des contrats ne doivent pas compter dans ce classement, ou être attribuées au gestionnaire du contrat).

### 3.9 Paiements

- Canaux : **Wave ≈ 40 %**, **Orange Money ≈ 25 %**, Espèces ≈ 25 %, Virement ≈ 10 % (montants).
- Notes de paiement propres (« Acompte 50 % », « Solde », « Échéance mars »), jamais de texte aléatoire.
- Quelques paiements partiels (acompte puis solde) sur les grosses ventes.

### 3.10 Contrats récurrents (6)

| Contrat | Client | Service | Fréquence | Montant HT / échéance | Période | État |
|---------|--------|---------|-----------|-----------------------|---------|------|
| Maintenance climatisation — 10 unités | Hôtel Océan Bleu | Maintenance préventive climatisation | Mensuel | 250 000 | janv 2026 → déc 2026 | À jour |
| Location photocopieur A3 | Cabinet Sow & Associés | (service location à créer) | Mensuel | 120 000 | févr 2026 → janv 2027 | À jour |
| Maintenance parc informatique | École Les Petits Génies | Configuration poste informatique | Mensuel | 180 000 | mars 2026 → févr 2027 | 1 en retard |
| Contrat SAV froid médical | Clinique Les Palmiers | Maintenance préventive climatisation | Mensuel | 95 000 | avr 2026 → mars 2027 | 2 en retard |
| Entretien chambres froides | Supermarché Diama Market | Maintenance préventive climatisation | Mensuel | 150 000 | mai 2026 → avr 2027 | À jour |
| Location climatiseurs événementiels | Agence Événements Teranga | Installation climatiseur | Trimestriel | 450 000 | janv 2026 → déc 2026 | À jour |

Les factures auto (préfixe RC-) doivent apparaître dans Ventes, rattachées au bon client, et être comptées dans « facturées dans Ventes ».

### 3.11 RH & Paie

- **Départements (5)** : Direction, Commercial, Logistique, Technique & SAV, Comptabilité.
- **Employés (8)**, tous avec contrat actif :

| Nom | Poste | Département | Contrat | Salaire brut |
|-----|-------|-------------|---------|--------------|
| Fatou Sarr | Directrice générale | Direction | CDI | 1 200 000 |
| Awa Ndiaye | Responsable commerciale | Commercial | CDI | 650 000 |
| Cheikh Mbaye | Commercial | Commercial | CDI | 380 000 |
| Ndèye Faye | Commerciale | Commercial | CDD | 350 000 |
| Mamadou Kane | Magasinier | Logistique | CDI | 280 000 |
| Lamine Sène | Technicien froid & clim | Technique & SAV | CDI | 400 000 |
| Pape Thiam | Technicien informatique | Technique & SAV | CDD | 360 000 |
| Coumba Diagne | Comptable | Comptabilité | CDI | 520 000 |

- 1 demande de congé **en attente**, 1 congé validé ce mois-ci.
- Pointage des 10 derniers jours ouvrés, avec 2 ou 3 retards réalistes.
- 1 demande d'heures supplémentaires validée.

### 3.12 Gouvernance IAM (comptes utilisateurs)

Fatou Sarr (Admin), Awa Ndiaye (Sales), Cheikh Mbaye (Sales), Ndèye Faye (Sales), Mamadou Kane (Stock manager), Coumba Diagne (Accountant). Emails `prenom.nom@exemple.sn`.

### 3.13 Inventaire

- 1 campagne **clôturée/archivée** en juin 2026 (écarts faibles, réconciliés).
- 1 campagne **en cours** démarrée il y a 2 jours sur la catégorie Climatisation.

### 3.14 Notifications et support

- 3 notifications internes récentes (ex. « Réunion commerciale lundi 9 h », « Inventaire climatisation en cours », « Objectif d'octobre atteint à 92 % »).
- 1 ticket support **résolu** (ex. « Personnaliser l'en-tête des factures »).

### 3.15 Paramétrage

Remplir Profil structure, Design & branding (un logo simple et une couleur principale), Fiscalité & factures (TVA 18 %, mentions légales fictives).

## 4. Checklist de validation (à me renvoyer cochée)

- [ ] Aucun texte « undefined », « N/A », « Client » générique, « null » sur aucune page.
- [ ] Aucune image cassée sur Catalogue Stocks et Catalogue Services.
- [ ] Dashboard : CA, trésorerie et créances cohérents entre eux et avec Ventes / Trésorerie / Recouvrement.
- [ ] Courbe « Revenus 2026 » croissante de janvier à octobre.
- [ ] Alertes stock : 1 rupture (Onduleur) + 2 alertes (Clim 18 000 BTU, Imprimante laser).
- [ ] Page Clients : 10 fiches, encours égaux à ceux de Recouvrement.
- [ ] Recouvrement : Clinique Les Palmiers en Critique, au moins un Élevé et un Modéré.
- [ ] Trésorerie : répartition Wave / Orange Money / Espèces / Virement visible, noms clients corrects.
- [ ] Contrats récurrents : compteur « facturées dans Ventes » > 0 et cohérent.
- [ ] Classement équipe : les commerciaux humains en tête.
- [ ] Inventaire, Notifications, Support : non vides.
- [ ] L'assistant IA répond correctement à : « Top 5 produits vendus ce mois-ci », « Quels clients ont des impayés ? », « Quels produits sont en rupture ou en alerte ? ».
- [ ] Aucune donnée personnelle réelle (emails, téléphones, noms de l'équipe réelle).
- [ ] Les tenants existants sont intacts.
- [ ] Identifiants de l'admin de démo dans `.env.demo` (non commité).
