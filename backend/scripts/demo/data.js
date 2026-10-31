/**
 * Jeu de données 100 % fictif du tenant de démonstration « Teranga Équipements SARL ».
 * Prix HT en F CFA. Aucune donnée réelle : emails @exemple.sn, téléphones +221 70 000 XX XX.
 */

export const DEMO_DOMAIN = 'teranga-equipements-demo.gestock.pro';
export const DEMO_NAME = 'Teranga Équipements SARL';
export const YEAR = 2026;
export const TVA = 0.18;

export const TENANT = {
  name: DEMO_NAME,
  address: 'Liberté 6, Dakar',
  email: 'contact@exemple.sn',
  phone: '+221 70 000 00 01',
  siret: '0000000 2G3',
  planId: 'ENTERPRISE',
  primaryColor: '#0f766e',
  buttonColor: '#0f766e',
  invoicePrefix: 'TE-',
  invoiceFooter: 'Teranga Équipements SARL — SARL au capital de 1 000 000 F CFA — RCCM SN-DKR-2020-B-00000 — NINEA 0000000 2G3 — Liberté 6, Dakar. Paiement à réception de facture sauf conditions particulières. Garantie constructeur 12 mois sur le matériel neuf.'
};

// ── Équipe (RH + comptes IAM) ────────────────────────────────────────────────
export const DEPARTMENTS = [
  { key: 'DIR', name: 'Direction', description: 'Direction générale et stratégie', manager: 'FATOU' },
  { key: 'COM', name: 'Commercial', description: 'Vente aux entreprises et aux particuliers', manager: 'AWA' },
  { key: 'LOG', name: 'Logistique', description: 'Réception, stockage et livraison', manager: 'MAMADOU' },
  { key: 'TEC', name: 'Technique & SAV', description: 'Installation, maintenance et service après-vente', manager: 'LAMINE' },
  { key: 'CPT', name: 'Comptabilité', description: 'Facturation, recouvrement et paie', manager: 'COUMBA' }
];

export const STAFF = [
  { key: 'FATOU', firstName: 'Fatou', lastName: 'Sarr', gender: 'F', position: 'Directrice générale', dept: 'DIR', contract: 'CDI', salary: 1200000, hire: '2019-03-01', role: 'ADMIN' },
  { key: 'AWA', firstName: 'Awa', lastName: 'Ndiaye', gender: 'F', position: 'Responsable commerciale', dept: 'COM', contract: 'CDI', salary: 650000, hire: '2020-06-15', role: 'SALES' },
  { key: 'CHEIKH', firstName: 'Cheikh', lastName: 'Mbaye', gender: 'M', position: 'Commercial', dept: 'COM', contract: 'CDI', salary: 380000, hire: '2021-09-01', role: 'SALES' },
  { key: 'NDEYE', firstName: 'Ndèye', lastName: 'Faye', gender: 'F', position: 'Commerciale', dept: 'COM', contract: 'CDD', salary: 350000, hire: '2025-11-03', end: '2026-11-02', role: 'SALES' },
  { key: 'MAMADOU', firstName: 'Mamadou', lastName: 'Kane', gender: 'M', position: 'Magasinier', dept: 'LOG', contract: 'CDI', salary: 280000, hire: '2020-01-06', role: 'STOCK_MANAGER' },
  { key: 'LAMINE', firstName: 'Lamine', lastName: 'Sène', gender: 'M', position: 'Technicien froid & clim', dept: 'TEC', contract: 'CDI', salary: 400000, hire: '2021-02-01', role: null },
  { key: 'PAPE', firstName: 'Pape', lastName: 'Thiam', gender: 'M', position: 'Technicien informatique', dept: 'TEC', contract: 'CDD', salary: 360000, hire: '2026-02-02', end: '2027-02-01', role: null },
  { key: 'COUMBA', firstName: 'Coumba', lastName: 'Diagne', gender: 'F', position: 'Comptable', dept: 'CPT', contract: 'CDI', salary: 520000, hire: '2019-09-02', role: 'ACCOUNTANT' }
];
STAFF.forEach((s, i) => {
  s.name = `${s.firstName} ${s.lastName}`;
  s.email = `${slug(s.firstName)}.${slug(s.lastName)}@exemple.sn`;
  s.phone = `+221 70 000 30 ${String(i + 1).padStart(2, '0')}`;
});

function slug(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

// ── Catalogue ────────────────────────────────────────────────────────────────
export const CATEGORIES = [
  { key: 'ELEC', name: 'Électroménager', description: 'Froid, lavage et cuisson pour la maison', color: ['#0ea5e9', '#0369a1'],
    subs: [['REF', 'Réfrigération'], ['LAV', 'Lavage'], ['CUI', 'Cuisson']] },
  { key: 'CLIM', name: 'Climatisation', description: 'Climatiseurs et ventilation', color: ['#14b8a6', '#0f766e'],
    subs: [['SPL', 'Climatiseurs split'], ['VEN', 'Ventilation']] },
  { key: 'INFO', name: 'Informatique', description: 'Postes de travail et périphériques', color: ['#6366f1', '#4338ca'],
    subs: [['ORD', 'Ordinateurs'], ['IMP', 'Impression'], ['ENE', 'Énergie']] },
  { key: 'TEL', name: 'Téléphonie', description: 'Smartphones et accessoires', color: ['#a855f7', '#7e22ce'],
    subs: [['SMA', 'Smartphones']] },
  { key: 'MOB', name: 'Mobilier de bureau', description: 'Aménagement des espaces de travail', color: ['#f59e0b', '#b45309'],
    subs: [['BUR', 'Bureaux'], ['SIE', 'Sièges']] }
];

// final = stock visé après livraisons fournisseurs reçues − ventes livrées ± écarts d'inventaire
export const PRODUCTS = [
  { key: 'FRI', name: 'Réfrigérateur double porte 350 L', sub: 'REF', pa: 285000, pv: 365000, final: 18, min: 5, icon: 'refrigerator', loc: 'Entrepôt A — Allée 1' },
  { key: 'CON', name: 'Congélateur coffre 300 L', sub: 'REF', pa: 210000, pv: 265000, final: 12, min: 4, icon: 'snowflake', loc: 'Entrepôt A — Allée 1' },
  { key: 'LAV', name: 'Machine à laver 8 kg', sub: 'LAV', pa: 195000, pv: 249000, final: 9, min: 3, icon: 'washing-machine', loc: 'Entrepôt A — Allée 2' },
  { key: 'CUI', name: 'Cuisinière 4 feux avec four', sub: 'CUI', pa: 140000, pv: 185000, final: 7, min: 3, icon: 'cooking-pot', loc: 'Entrepôt A — Allée 2' },
  { key: 'C12', name: 'Climatiseur split 12 000 BTU', sub: 'SPL', pa: 230000, pv: 310000, final: 24, min: 6, icon: 'air-vent', loc: 'Entrepôt B — Allée 1' },
  { key: 'C18', name: 'Climatiseur split 18 000 BTU', sub: 'SPL', pa: 320000, pv: 425000, final: 4, min: 5, icon: 'thermometer-snowflake', loc: 'Entrepôt B — Allée 1' },
  { key: 'VEN', name: 'Ventilateur sur pied', sub: 'VEN', pa: 14000, pv: 22000, final: 60, min: 15, icon: 'fan', loc: 'Entrepôt B — Allée 2' },
  { key: 'PCP', name: 'Ordinateur portable 15" i5 16 Go', sub: 'ORD', pa: 380000, pv: 495000, final: 15, min: 4, icon: 'laptop', loc: 'Magasin — Vitrine informatique' },
  { key: 'PCB', name: 'Ordinateur de bureau i7 + écran 24"', sub: 'ORD', pa: 450000, pv: 575000, final: 6, min: 2, icon: 'monitor', loc: 'Magasin — Vitrine informatique' },
  { key: 'IMP', name: 'Imprimante multifonction laser', sub: 'IMP', pa: 165000, pv: 219000, final: 3, min: 4, icon: 'printer', loc: 'Magasin — Rayon impression' },
  { key: 'PHO', name: 'Photocopieur A3 professionnel', sub: 'IMP', pa: 1250000, pv: 1600000, final: 2, min: 1, icon: 'file-text', loc: 'Entrepôt B — Zone gros volumes' },
  { key: 'OND', name: 'Onduleur 1500 VA', sub: 'ENE', pa: 65000, pv: 89000, final: 0, min: 5, icon: 'battery-charging', loc: 'Magasin — Rayon énergie' },
  { key: 'SMA', name: 'Smartphone 6,7" 256 Go', sub: 'SMA', pa: 210000, pv: 275000, final: 30, min: 8, icon: 'smartphone', loc: 'Magasin — Vitrine téléphonie' },
  { key: 'BUR', name: 'Bureau de direction', sub: 'BUR', pa: 175000, pv: 240000, final: 5, min: 2, icon: 'lamp-desk', loc: 'Entrepôt C — Mobilier' },
  { key: 'FAU', name: 'Fauteuil ergonomique', sub: 'SIE', pa: 68000, pv: 95000, final: 20, min: 5, icon: 'armchair', loc: 'Entrepôt C — Mobilier' }
];

export const SERVICES = [
  { key: 'INS', name: 'Installation climatiseur', price: 35000, icon: 'wrench', description: 'Pose, mise en service et test d\'un climatiseur split.' },
  { key: 'MNT', name: 'Maintenance préventive climatisation', price: 25000, icon: 'settings', description: 'Nettoyage des filtres, contrôle du gaz et de l\'électricité, par unité.' },
  { key: 'LIV', name: 'Livraison Dakar et banlieue', price: 5000, icon: 'truck', description: 'Livraison à domicile ou en entreprise sous 48 h.' },
  { key: 'GAR', name: 'Extension de garantie 1 an', price: 30000, icon: 'shield-check', description: 'Prolonge la garantie constructeur de 12 mois.' },
  { key: 'CFG', name: 'Configuration poste informatique', price: 15000, icon: 'laptop', description: 'Installation du système, des logiciels et mise en réseau.' },
  { key: 'LOC', name: 'Location photocopieur A3', price: 120000, icon: 'printer', description: 'Mise à disposition mensuelle d\'un photocopieur A3 avec entretien et consommables inclus.' }
];

export const SUPPLIERS = [
  { key: 'ATL', companyName: 'Atlantic Distribution SA', mainContact: 'Moussa Fall', address: 'Dakar, Zone industrielle', paymentTerms: 30, email: 'commandes@atlantic-distribution.exemple.sn', phone: '+221 70 000 20 01' },
  { key: 'SAH', companyName: 'Sahel Informatique', mainContact: 'Khady Diop', address: 'Dakar, Plateau', paymentTerms: 45, email: 'ventes@sahel-informatique.exemple.sn', phone: '+221 70 000 20 02' },
  { key: 'FRO', companyName: 'Froid Service Dakar', mainContact: 'Ousmane Gueye', address: 'Pikine', paymentTerms: 30, email: 'contact@froid-service.exemple.sn', phone: '+221 70 000 20 03' },
  { key: 'BUC', companyName: 'Bureau Concept', mainContact: 'Mariama Sy', address: 'Dakar, Point E', paymentTerms: 15, email: 'pro@bureau-concept.exemple.sn', phone: '+221 70 000 20 04' }
];

export const CUSTOMERS = [
  { key: 'HOTEL', companyName: 'Hôtel Océan Bleu', mainContact: 'Seynabou Diallo', terms: 30, vip: true, address: 'Corniche Ouest, Dakar', created: '2026-01-07' },
  { key: 'SOW', companyName: 'Cabinet Sow & Associés', mainContact: 'Maître Alioune Sow', terms: 30, vip: true, address: 'Avenue Léopold Sédar Senghor, Plateau, Dakar', created: '2026-01-14' },
  { key: 'ECOLE', companyName: 'École Les Petits Génies', mainContact: 'Mariètou Cissé', terms: 30, address: 'Sacré-Cœur 3, Dakar', created: '2026-02-20' },
  { key: 'CLINIQUE', companyName: 'Clinique Les Palmiers', mainContact: 'Dr Babacar Ndour', terms: 45, address: 'Mermoz, Dakar', created: '2026-03-18' },
  { key: 'DIAMA', companyName: 'Supermarché Diama Market', mainContact: 'Ibou Gaye', terms: 30, address: 'Route de Rufisque, Thiaroye', created: '2026-04-22' },
  { key: 'AGENCE', companyName: 'Agence Événements Teranga', mainContact: 'Aminata Sall', terms: 15, address: 'Almadies, Dakar', created: '2026-01-09' },
  { key: 'THIOF', companyName: 'Restaurant Le Petit Thiof', mainContact: 'Ousseynou Camara', terms: 15, address: 'Ngor, Dakar', created: '2026-01-15' },
  { key: 'FOURNIL', companyName: 'Boulangerie Le Fournil de Ouakam', mainContact: 'Moustapha Diouf', terms: 30, address: 'Ouakam, Dakar', created: '2026-02-10' },
  { key: 'BA', companyName: 'Mme Aïssatou Ba', mainContact: 'Aïssatou Ba', terms: 0, particulier: true, address: 'Sicap Liberté 2, Dakar', created: '2026-01-22' },
  { key: 'NDOYE', companyName: 'M. Ibrahima Ndoye', mainContact: 'Ibrahima Ndoye', terms: 0, particulier: true, address: 'Grand Yoff, Dakar', created: '2026-07-25' }
];
CUSTOMERS.forEach((c, i) => {
  c.email = `${slug(c.companyName).slice(0, 24)}@exemple.sn`;
  c.phone = `+221 70 000 10 ${String(i + 1).padStart(2, '0')}`;
});

// ── Ventes directes ──────────────────────────────────────────────────────────
// lines : [code, quantité] ; codes produits (PRODUCTS) ou services (SERVICES).
// pay : 'FULL' (comptant), 'SPLIT' (acompte 50 % puis solde ~15 j), 'NONE', ou montant TTC d'acompte.
// day : date ISO, ou nombre ≤ 0 = jours relatifs à aujourd'hui (flux d'activité vivant).
export const SALES = [
  { day: '2026-01-12', c: 'HOTEL', by: 'AWA', lines: [['C12', 2], ['INS', 2], ['LIV', 1]], pay: 'FULL' },
  { day: '2026-01-19', c: 'THIOF', by: 'CHEIKH', lines: [['CON', 1], ['FRI', 1], ['LIV', 1]], pay: 'FULL' },
  { day: '2026-01-26', c: 'BA', by: 'NDEYE', lines: [['VEN', 3]], pay: 'FULL' },
  { day: '2026-02-06', c: 'SOW', by: 'AWA', lines: [['PCP', 2], ['CFG', 2], ['IMP', 1]], pay: 'SPLIT' },
  { day: '2026-02-14', c: 'FOURNIL', by: 'CHEIKH', lines: [['CON', 2], ['LIV', 1]], pay: 'FULL' },
  { day: '2026-02-24', c: 'AGENCE', by: 'NDEYE', lines: [['VEN', 10], ['FAU', 2]], pay: 'FULL' },
  { day: '2026-03-04', c: 'ECOLE', by: 'CHEIKH', lines: [['PCB', 2], ['CFG', 2], ['OND', 2]], pay: 'SPLIT' },
  { day: '2026-03-13', c: 'HOTEL', by: 'AWA', lines: [['FRI', 2], ['LIV', 1]], pay: 'FULL' },
  { day: '2026-03-25', c: 'BA', by: 'FATOU', lines: [['LAV', 1], ['GAR', 1], ['LIV', 1]], pay: 'FULL' },
  { day: '2026-04-03', c: 'CLINIQUE', by: 'AWA', lines: [['C12', 3], ['INS', 3]], pay: 'SPLIT' },
  { day: '2026-04-16', c: 'THIOF', by: 'NDEYE', lines: [['CUI', 2], ['LIV', 1]], pay: 'FULL' },
  { day: '2026-04-28', c: 'SOW', by: 'CHEIKH', lines: [['BUR', 2], ['FAU', 4]], pay: 'SPLIT' },
  { day: '2026-05-06', c: 'HOTEL', by: 'AWA', lines: [['C12', 4], ['INS', 4], ['GAR', 4]], pay: 'SPLIT' },
  { day: '2026-05-15', c: 'AGENCE', by: 'CHEIKH', lines: [['VEN', 15], ['C18', 1]], pay: 'FULL' },
  { day: '2026-05-20', c: 'FOURNIL', by: 'AWA', lines: [['MNT', 2]], pay: 'FULL' },
  { day: '2026-05-27', c: 'FOURNIL', by: 'NDEYE', lines: [['CUI', 1], ['FRI', 1], ['LAV', 1], ['LIV', 1]], pay: 'FULL' },
  { day: '2026-06-05', c: 'ECOLE', by: 'CHEIKH', lines: [['PCP', 3], ['CFG', 3], ['IMP', 1]], pay: 'SPLIT' },
  { day: '2026-06-12', c: 'DIAMA', by: 'AWA', lines: [['C12', 2], ['INS', 2]], pay: 'FULL' },
  { day: '2026-06-24', c: 'BA', by: 'NDEYE', lines: [['SMA', 1], ['GAR', 1]], pay: 'FULL' },
  { day: '2026-06-27', c: 'THIOF', by: 'AWA', lines: [['C12', 2], ['INS', 2], ['MNT', 1]], pay: 'FULL' },
  { day: '2026-07-03', c: 'HOTEL', by: 'CHEIKH', lines: [['PHO', 1], ['GAR', 1], ['LIV', 1]], pay: 'SPLIT' },
  { day: '2026-07-14', c: 'AGENCE', by: 'NDEYE', lines: [['C18', 2], ['INS', 2]], pay: 'FULL' },
  { day: '2026-07-22', c: 'FOURNIL', by: 'AWA', lines: [['CON', 1], ['FRI', 1], ['LIV', 1]], pay: 'FULL' },
  { day: '2026-07-29', c: 'NDOYE', by: 'CHEIKH', lines: [['LAV', 1], ['LIV', 1]], pay: 'FULL' },
  // Grosse commande à crédit, partiellement réglée → Élevé dans Recouvrement
  { day: '2026-08-07', c: 'DIAMA', by: 'AWA', lines: [['CON', 6], ['FRI', 4], ['C12', 3], ['INS', 3]], pay: 1000000, note: 'Acompte à la commande' },
  { day: '2026-08-21', c: 'ECOLE', by: 'NDEYE', lines: [['SMA', 1], ['CFG', 1]], pay: 'FULL' },
  { day: '2026-08-26', c: 'SOW', by: 'CHEIKH', lines: [['CFG', 3]], pay: 'FULL' },
  // Équipement de la nouvelle aile, à crédit 45 jours non réglé → plus grosse dette (Critique)
  { day: '2026-09-08', c: 'CLINIQUE', by: 'CHEIKH', lines: [['C18', 6], ['INS', 6], ['FRI', 4], ['PCB', 1]], pay: 'NONE' },
  { day: '2026-10-20', c: 'HOTEL', by: 'AWA', lines: [['FAU', 4], ['MNT', 4]], pay: 'FULL' },
  { day: '2026-09-23', c: 'THIOF', by: 'NDEYE', lines: [['SMA', 1], ['LIV', 1]], pay: 'FULL' },
  { day: '2026-10-03', c: 'SOW', by: 'AWA', lines: [['PCP', 4], ['CFG', 4], ['IMP', 1]], pay: 'SPLIT' },
  { day: '2026-10-14', c: 'HOTEL', by: 'CHEIKH', lines: [['FAU', 2], ['BUR', 1]], pay: 'FULL' },
  // 7 derniers jours (relatif à la date d'exécution)
  { day: -6, c: 'NDOYE', by: 'NDEYE', lines: [['SMA', 1]], pay: 'NONE' },
  { day: -3, c: 'AGENCE', by: 'CHEIKH', lines: [['VEN', 10], ['C12', 1], ['INS', 1]], pay: 'FULL' },
  { day: -1, c: 'ECOLE', by: 'AWA', lines: [['OND', 4], ['CFG', 1]], pay: 'FULL' },
  { day: 0, c: 'FOURNIL', by: 'AWA', lines: [['C12', 3], ['INS', 3], ['LIV', 1]], pay: 'FULL' }
];

// ── Contrats récurrents ──────────────────────────────────────────────────────
// htPerInstallment : montant HT d'une échéance ; l'application stocke l'échéance en TTC.
// unpaid : numéros d'échéance laissés impayés (→ « en retard » après leur date).
export const CONTRACTS = [
  { key: 'HOTEL', title: 'Maintenance climatisation — 10 unités', c: 'HOTEL', service: 'MNT', qty: 10, unit: 25000, freq: 'MENSUEL', start: '2026-01-01', n: 12, unpaid: [], manager: 'AWA' },
  { key: 'SOW', title: 'Location photocopieur A3', c: 'SOW', service: 'LOC', qty: 1, unit: 120000, freq: 'MENSUEL', start: '2026-02-01', n: 12, unpaid: [], manager: 'AWA' },
  { key: 'ECOLE', title: 'Maintenance parc informatique', c: 'ECOLE', service: 'CFG', qty: 12, unit: 15000, freq: 'MENSUEL', start: '2026-03-01', n: 12, unpaid: [8], manager: 'CHEIKH' },
  { key: 'CLINIQUE', title: 'Contrat SAV froid médical', c: 'CLINIQUE', service: 'MNT', qty: 1, unit: 95000, freq: 'MENSUEL', start: '2026-04-01', n: 12, unpaid: [6, 7], manager: 'CHEIKH', lineName: 'Contrat SAV froid médical' },
  { key: 'DIAMA', title: 'Entretien chambres froides', c: 'DIAMA', service: 'MNT', qty: 6, unit: 25000, freq: 'MENSUEL', start: '2026-05-01', n: 12, unpaid: [], manager: 'AWA' },
  { key: 'AGENCE', title: 'Location climatiseurs événementiels', c: 'AGENCE', service: 'INS', qty: 1, unit: 450000, freq: 'TRIMESTRIEL', start: '2026-01-01', n: 4, unpaid: [], manager: 'NDEYE', lineName: 'Location climatiseurs événementiels' }
];
export const PAYMENT_DAY = 10; // jour fixe des échéances

// ── Livraisons fournisseurs ──────────────────────────────────────────────────
// qty : quantités fixées ; 'REST' = complément calculé pour atteindre le stock final.
export const DELIVERIES = [
  { date: '2026-01-06', s: 'ATL', by: 'MAMADOU', items: { FRI: 'REST', CON: 'REST', LAV: 'REST', CUI: 'REST' }, ref: 'BC-2026-001' },
  { date: '2026-01-08', s: 'SAH', by: 'MAMADOU', items: { PCP: 'REST', PCB: 'REST', IMP: 'REST', PHO: 'REST', OND: 'REST', SMA: 'REST' }, ref: 'BC-2026-002' },
  { date: '2026-01-09', s: 'FRO', by: 'MAMADOU', items: { C12: 20, C18: 6, VEN: 40 }, ref: 'BC-2026-003' },
  { date: '2026-02-03', s: 'BUC', by: 'MAMADOU', items: { BUR: 'REST', FAU: 'REST' }, ref: 'BC-2026-004' },
  { date: '2026-06-15', s: 'FRO', by: 'MAMADOU', items: { C12: 'REST', C18: 'REST', VEN: 'REST' }, ref: 'BC-2026-011', notes: 'Réassort avant la saison chaude' },
  // J-5 : livraison partielle, reliquat attendu (non entrée en stock tant qu'elle n'est pas validée)
  { date: -5, s: 'SAH', by: 'MAMADOU', partial: true, items: { OND: 12, IMP: 4 }, ref: 'BC-2026-019',
    notes: 'Livraison partielle : 12 onduleurs sur 20 et 4 imprimantes sur 6 reçus. Reliquat attendu sous 10 jours.' }
];

// Inventaire de juin : écarts faibles, réconciliés à la clôture
export const JUNE_INVENTORY = { date: '2026-06-30', name: 'Inventaire semestriel — juin 2026', diffs: { VEN: -1, FAU: +1 } };
export const CURRENT_INVENTORY = { daysAgo: 2, name: 'Inventaire Climatisation — octobre 2026', counted: ['C12', 'C18', 'VEN'] };

export const SUBSCRIPTION_PAYMENTS = [
  { date: '2026-01-21', period: '3M', amount: 175950 },
  { date: '2026-04-21', period: '3M', amount: 175950 },
  { date: '2026-07-21', period: '1M', amount: 69000 },
  { date: '2026-08-21', period: '1M', amount: 69000 },
  { date: '2026-09-21', period: '1M', amount: 69000 },
  { date: '2026-10-21', period: '1M', amount: 69000 }
];

export const NOTIFICATIONS = [
  { daysAgo: 4, type: 'INFO', title: 'Réunion commerciale lundi 9 h', body: 'Point hebdomadaire de l\'équipe commerciale lundi à 9 h en salle de réunion : bilan d\'octobre et objectifs de novembre.' },
  { daysAgo: 2, type: 'WARNING', title: 'Inventaire climatisation en cours', body: 'Le comptage du rayon climatisation a démarré. Merci de signaler toute sortie de stock à Mamadou Kane avant validation.' },
  { daysAgo: 0, type: 'INFO', title: 'Objectif d\'octobre atteint à 92 %', body: 'Bravo à toute l\'équipe : 92 % de l\'objectif mensuel est atteint. Encore un effort sur les derniers devis en attente !' }
];

export const SUPPORT_TICKET = {
  daysAgo: 12,
  subject: 'Personnaliser l\'en-tête des factures',
  message: 'Bonjour, nous souhaitons afficher notre logo et nos mentions légales (RCCM, NINEA) en en-tête de nos factures. Comment procéder ?',
  reply: 'Bonjour Madame Sarr, rendez-vous dans Paramètres > Design & branding pour importer votre logo, puis dans Fiscalité & factures pour renseigner vos mentions légales. Elles apparaîtront automatiquement sur toutes vos factures. Belle journée !',
  category: 'ACCOUNT'
};

export const PAYMENT_CHANNEL_TARGETS = { WAVE: 0.40, ORANGE_MONEY: 0.25, CASH: 0.25, TRANSFER: 0.10 };
