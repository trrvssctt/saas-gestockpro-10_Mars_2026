
import { UserRole, User, StockItem, Invoice, AuditLog, Customer, SubscriptionPlan, Subscription, Tenant, Employee, Contract, PayrollEntry, Leave, HRDocument, PayrollSettings } from './types';

export const MOCK_TENANTS: Tenant[] = [
  { id: 'T1', name: 'TechCorp Solutions', domain: 'techcorp.gestock.pro', isActive: true, plan: 'ENTERPRISE', mrr: 250000, lastPaymentDate: '2023-10-25', paymentStatus: 'UP_TO_DATE', createdAt: '2023-01-01' },
  { id: 'T2', name: 'Global Logistics', domain: 'globallog.gestock.pro', isActive: true, plan: 'PRO', mrr: 85000, lastPaymentDate: '2023-10-20', paymentStatus: 'UP_TO_DATE', createdAt: '2023-05-15' },
  { id: 'T3', name: 'Impayé SARL', domain: 'impaye.gestock.pro', isActive: true, plan: 'BASIC', mrr: 30000, lastPaymentDate: '2023-09-15', paymentStatus: 'FAILED', createdAt: '2023-09-01' },
  { id: 'T-TRIAL', name: 'Nouveau Client', domain: 'test.gestock.pro', isActive: true, plan: 'FREE_TRIAL', mrr: 0, lastPaymentDate: '', paymentStatus: 'TRIAL', createdAt: new Date().toISOString() },
];

export const MOCK_USERS: User[] = [
  // Fix: Added missing 'isActive' property
  { id: '0', name: 'Super Admin', role: UserRole.SUPER_ADMIN, roles: [UserRole.SUPER_ADMIN], email: 'super@gestock.pro', mfaEnabled: true, lastLogin: '2023-10-27 12:00', activeSession: true, isActive: true, tenantId: 'SYSTEM' },
  // Fix: Added missing 'isActive' property
  { id: '1', name: 'Jean Admin', role: UserRole.ADMIN, roles: [UserRole.ADMIN], email: 'admin@gestock.pro', mfaEnabled: true, lastLogin: '2023-10-27 09:15', activeSession: true, isActive: true, tenantId: 'T1' },
  // Fix: Added missing 'isActive' property
  { id: '2', name: 'Marie Stock', role: UserRole.STOCK_MANAGER, roles: [UserRole.STOCK_MANAGER], email: 'marie@gestock.pro', mfaEnabled: true, lastLogin: '2023-10-27 08:30', activeSession: true, isActive: true, tenantId: 'T1' },
  // Fix: Added missing 'isActive' property
  { id: '4', name: 'Lucie Sales', role: UserRole.SALES, roles: [UserRole.SALES], email: 'lucie@gestock.pro', mfaEnabled: false, lastLogin: '2023-10-27 10:00', activeSession: true, isActive: true, tenantId: 'T1' },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { 
    id: 'FREE_TRIAL', 
    name: 'Essai Gratuit', 
    level: 0,
    price: 0, 
    features: ['14 jours complets', 'Quota: 1 Client, 5 Produits, 5 Ventes', '3 Catégories / 3 Sous-cat.'],
    maxUsers: 1,
    hasAiChatbot: true,
    hasStockForecast: true
  },
  { 
    id: 'BASIC', 
    name: 'Starter AI', 
    level: 1,
    price: 30000, 
    features: ['100 Factures/mois', '1 Utilisateur'],
    maxUsers: 1,
    hasAiChatbot: false,
    hasStockForecast: false
  },
  { 
    id: 'PRO', 
    name: 'Business Pro', 
    level: 2,
    price: 85000, 
    features: ['Illimité', '5 Utilisateurs'], 
    maxUsers: 5,
    hasAiChatbot: true,
    hasStockForecast: true,
    isPopular: true 
  },
  { 
    id: 'ENTERPRISE', 
    name: 'Enterprise Cloud', 
    level: 3,
    price: 250000, 
    features: ['Multi-Entités', '100 Utilisateurs'],
    maxUsers: 100,
    hasAiChatbot: true,
    hasStockForecast: true
  }
];

export const MOCK_CUSTOMERS: Customer[] = [
  { 
    id: 'C1', 
    companyName: 'TechCorp Solutions', 
    mainContact: 'Alice Martin', 
    email: 'contact@techcorp.com', 
    phone: '+33 1 23 45 67 89',
    billingAddress: '12 Rue de la Paix, 75001 Paris',
    siret: '12345678900012',
    tvaIntra: 'FR12123456789',
    outstandingBalance: 12450.50,
    paymentTerms: 30,
    healthStatus: 'GOOD'
  }
];

export const MOCK_STOCKS: StockItem[] = [
  { 
    id: 'S1', 
    sku: 'CPU-I9-14900K',
    name: 'Processeur Core i9', 
    category: 'Hardware', 
    currentLevel: 45, 
    minThreshold: 10, 
    forecastedLevel: 32, 
    unitPrice: 395000,
    location: 'Zone A - Rang 04',
    movements: [
      { id: 'M1', date: '2023-10-26', type: 'IN', qty: 50, reason: 'Réapprovisionnement fournisseur', user: 'Marie Stock' }
    ]
  }
];

export const MOCK_INVOICES: Invoice[] = [
  { 
    id: 'INV-2023-001', 
    customer: 'TechCorp Solutions', 
    customerId: 'C1', 
    date: '2023-10-25', 
    amount: 12450.50, 
    status: 'PAID', 
    type: 'FACTUR-X',
    taxAmount: 2490.10,
    transmissionStatus: 'SENT',
    items: [
      { productId: 'S1', name: 'Processeur Core i9', qty: 5, price: 395000, tva: 18 }
    ]
  }
];

export const MOCK_LOGS: AuditLog[] = [
  { id: 'L1', timestamp: '2023-10-27 10:45:12', userId: '1', userName: 'Jean Admin', action: 'ROLE_UPDATE', resource: 'User:Lucie Sales', status: 'SUCCESS', severity: 'MEDIUM' }
];

export const MOCK_SUBSCRIPTION: Subscription = {
  planId: 'PRO',
  status: 'ACTIVE',
  nextBillingDate: '25 Nov 2023',
  paymentHistory: [
    { id: 'PAY-2023-10-25', date: '25 Oct 2023', amount: 85000, method: 'STRIPE', status: 'SUCCESS' }
  ],
  autoRenew: true
};

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'EMP001',
    firstName: 'Moussa',
    lastName: 'Diop',
    email: 'moussa.diop@techcorp.com',
    phone: '+221 77 123 4567',
    position: 'Directeur Technique',
    department: 'IT',
    hireDate: '2020-03-15',
    salary: 1200000,
    status: 'ACTIVE',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    address: 'Dakar, Sénégal',
    birthDate: '1985-07-20',
    emergencyContact: 'Fatou Diop',
    emergencyPhone: '+221 77 987 6543',
    performanceRating: 95,
    managerId: null
  },
  {
    id: 'EMP002',
    firstName: 'Awa',
    lastName: 'Ndiaye',
    email: 'awa.ndiaye@techcorp.com',
    phone: '+221 78 234 5678',
    position: 'Responsable RH',
    department: 'HR',
    hireDate: '2019-11-10',
    salary: 950000,
    status: 'ACTIVE',
    photoUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    address: 'Thiès, Sénégal',
    birthDate: '1988-03-12',
    emergencyContact: 'Mamadou Ndiaye',
    emergencyPhone: '+221 78 876 5432',
    performanceRating: 88,
    managerId: 'EMP001'
  },
  {
    id: 'EMP003',
    firstName: 'Amadou',
    lastName: 'Fall',
    email: 'amadou.fall@techcorp.com',
    phone: '+221 79 345 6789',
    position: 'Développeur Senior',
    department: 'IT',
    hireDate: '2021-06-01',
    salary: 850000,
    status: 'ACTIVE',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    address: 'Rufisque, Sénégal',
    birthDate: '1990-09-18',
    emergencyContact: 'Aissatou Fall',
    emergencyPhone: '+221 79 765 4321',
    performanceRating: 92,
    managerId: 'EMP001'
  },
  {
    id: 'EMP004',
    firstName: 'Khadija',
    lastName: 'Sow',
    email: 'khadija.sow@techcorp.com',
    phone: '+221 77 456 7890',
    position: 'Comptable Senior',
    department: 'Finance',
    hireDate: '2020-09-15',
    salary: 750000,
    status: 'ACTIVE',
    photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    address: 'Pikine, Sénégal',
    birthDate: '1987-12-05',
    emergencyContact: 'Ousmane Sow',
    emergencyPhone: '+221 77 654 3210',
    performanceRating: 85,
    managerId: null
  },
  {
    id: 'EMP005',
    firstName: 'Ibrahima',
    lastName: 'Kane',
    email: 'ibrahima.kane@techcorp.com',
    phone: '+221 78 567 8901',
    position: 'Chef de Projet',
    department: 'Sales',
    hireDate: '2022-01-20',
    salary: 900000,
    status: 'ACTIVE',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    address: 'Guédiawaye, Sénégal',
    birthDate: '1985-04-22',
    emergencyContact: 'Mariama Kane',
    emergencyPhone: '+221 78 543 2109',
    performanceRating: 90,
    managerId: null
  },
  {
    id: 'EMP006',
    firstName: 'Fatou',
    lastName: 'Diouf',
    email: 'fatou.diouf@techcorp.com',
    phone: '+221 79 678 9012',
    position: 'Assistante Marketing',
    department: 'Marketing',
    hireDate: '2023-03-01',
    salary: 450000,
    status: 'ACTIVE',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
    address: 'Mbour, Sénégal',
    birthDate: '1995-11-30',
    emergencyContact: 'Cheikh Diouf',
    emergencyPhone: '+221 79 432 1098',
    performanceRating: 78,
    managerId: 'EMP005'
  }
];

export const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'CONT001',
    employeeId: 'EMP001',
    type: 'CDI',
    startDate: '2020-03-15',
    salary: 1200000,
    workingHours: 40,
    status: 'ACTIVE',
    signedDate: '2020-03-10'
  },
  {
    id: 'CONT002',
    employeeId: 'EMP002',
    type: 'CDI',
    startDate: '2019-11-10',
    salary: 950000,
    workingHours: 40,
    status: 'ACTIVE',
    signedDate: '2019-11-05'
  },
  {
    id: 'CONT003',
    employeeId: 'EMP003',
    type: 'CDI',
    startDate: '2021-06-01',
    salary: 850000,
    workingHours: 40,
    status: 'ACTIVE',
    signedDate: '2021-05-25'
  },
  {
    id: 'CONT004',
    employeeId: 'EMP004',
    type: 'CDD',
    startDate: '2022-01-15',
    endDate: '2026-06-30',
    salary: 1100000,
    workingHours: 40,
    status: 'ACTIVE',
    signedDate: '2022-01-10'
  },
  {
    id: 'CONT005',
    employeeId: 'EMP005',
    type: 'CDI',
    startDate: '2020-09-15',
    salary: 750000,
    workingHours: 35,
    status: 'ACTIVE',
    signedDate: '2020-09-10'
  },
  {
    id: 'CONT006',
    employeeId: 'EMP006',
    type: 'CDI',
    startDate: '2022-01-20',
    salary: 900000,
    workingHours: 40,
    status: 'ACTIVE',
    signedDate: '2022-01-15'
  },
  {
    id: 'CONT006',
    employeeId: 'EMP006',
    type: 'CDD',
    startDate: '2023-03-01',
    endDate: '2024-02-29',
    salary: 450000,
    workingHours: 35,
    status: 'ACTIVE',
    signedDate: '2023-02-25'
  }
];

export const MOCK_PAYROLL: PayrollEntry[] = [
  {
    id: 'PAY001_2024_02',
    employeeId: 'EMP001',
    month: 'février',
    year: 2024,
    baseSalary: 1200000,
    bonuses: 150000,
    deductions: 0,
    socialCharges: 240000,
    taxes: 180000,
    netSalary: 930000,
    status: 'PAID',
    generatedAt: '2024-02-25T10:00:00Z',
    paidAt: '2024-02-28T14:30:00Z'
  },
  {
    id: 'PAY002_2024_02',
    employeeId: 'EMP002',
    month: 'février',
    year: 2024,
    baseSalary: 950000,
    bonuses: 50000,
    deductions: 0,
    socialCharges: 190000,
    taxes: 120000,
    netSalary: 690000,
    status: 'PAID',
    generatedAt: '2024-02-25T10:00:00Z',
    paidAt: '2024-02-28T14:30:00Z'
  },
  {
    id: 'PAY003_2024_02',
    employeeId: 'EMP003',
    month: 'février',
    year: 2024,
    baseSalary: 850000,
    bonuses: 0,
    deductions: 25000,
    socialCharges: 170000,
    taxes: 102000,
    netSalary: 553000,
    status: 'PAID',
    generatedAt: '2024-02-25T10:00:00Z',
    paidAt: '2024-02-28T14:30:00Z'
  }
];

// Données mock pour les congés
export const MOCK_LEAVES = [
  { id: 'L001', employeeId: 'EMP001', type: 'PAID_LEAVE', employee: 'Moussa Diop', startDate: '2024-12-20', endDate: '2025-01-05', days: 15, status: 'PENDING', reason: 'Vacances de fin d\'année', createdAt: '2024-11-15T10:00:00Z' },
  { id: 'L002', employeeId: 'EMP002', type: 'SICK_LEAVE', employee: 'Awa Ndiaye', startDate: '2024-10-25', endDate: '2024-10-27', days: 3, status: 'APPROVED', reason: 'Grippe saisonnière', createdAt: '2024-10-20T08:00:00Z', approvedAt: '2024-10-21T14:00:00Z' },
  { id: 'L003', employeeId: 'EMP003', type: 'PATERNITY', employee: 'Jean Koffi', startDate: '2024-11-01', endDate: '2024-11-15', days: 14, status: 'APPROVED', reason: 'Naissance enfant', createdAt: '2024-10-15T09:00:00Z', approvedAt: '2024-10-16T11:00:00Z' },
  { id: 'L004', employeeId: 'EMP001', type: 'PAID_LEAVE', employee: 'Moussa Diop', startDate: '2024-08-10', endDate: '2024-08-20', days: 10, status: 'APPROVED', reason: 'Repos estival', createdAt: '2024-07-20T16:00:00Z', approvedAt: '2024-07-22T10:00:00Z' }
];

// Données mock pour les documents RH
export const MOCK_HR_DOCUMENTS = [
  { id: 'DOC001', employeeId: 'EMP001', name: 'CNI_Moussa_Diop.pdf', type: 'ID_CARD', category: 'Identité', employee: 'Moussa Diop', fileUrl: '/documents/cni_moussa.pdf', fileSize: 1200000, mimeType: 'application/pdf', uploadedAt: '2024-10-15T14:30:00Z', uploadedBy: 'admin' },
  { id: 'DOC002', employeeId: 'EMP002', name: 'Contrat_CDI_Awa_Ndiaye.pdf', type: 'CONTRACT', category: 'Contrat', employee: 'Awa Ndiaye', fileUrl: '/documents/contrat_awa.pdf', fileSize: 2400000, mimeType: 'application/pdf', uploadedAt: '2024-10-12T09:15:00Z', uploadedBy: 'admin' },
  { id: 'DOC003', employeeId: 'EMP003', name: 'Diplome_Master_Jean.pdf', type: 'DIPLOMA', category: 'Diplôme', employee: 'Jean Koffi', fileUrl: '/documents/diplome_jean.pdf', fileSize: 3800000, mimeType: 'application/pdf', uploadedAt: '2024-10-10T16:45:00Z', uploadedBy: 'admin' },
  { id: 'DOC004', employeeId: 'EMP001', name: 'RIB_Bancaire_Moussa.pdf', type: 'BANK_DETAILS', category: 'Finance', employee: 'Moussa Diop', fileUrl: '/documents/rib_moussa.pdf', fileSize: 500000, mimeType: 'application/pdf', uploadedAt: '2024-10-08T11:20:00Z', uploadedBy: 'admin' },
  { id: 'DOC005', employeeId: 'EMP002', name: 'Certificat_Medical.pdf', type: 'MEDICAL', category: 'Santé', employee: 'Awa Ndiaye', fileUrl: '/documents/medical_awa.pdf', fileSize: 1100000, mimeType: 'application/pdf', uploadedAt: '2024-10-05T13:10:00Z', uploadedBy: 'admin' }
];

// Paramètres de paie par défaut
export const MOCK_PAYROLL_SETTINGS = {
  id: 'SETTINGS_001',
  tenantId: 'T1',
  socialChargeRate: 0.20, // 20%
  taxRate: 0.12, // 12%
  minimumWage: 100000, // SMIG Sénégal
  currency: 'F CFA',
  paymentDay: 30, // Fin de mois
  overtimeRate: 1.5, // 150% pour heures sup
  updatedAt: '2024-10-01T10:00:00Z'
};