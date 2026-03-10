
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  STOCK_MANAGER = 'STOCK_MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  HR_MANAGER = 'HR_MANAGER',
  SALES = 'SALES',
  EMPLOYEE = 'EMPLOYEE'
}

export type Currency = 'F CFA' | '€' | '$';
export type Language = 'Français' | 'English';

export type PaymentMethod = 'STRIPE' | 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'PAYPAL';
export type TransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED';

export interface AppSettings {
  language: Language;
  currency: string;
  platformLogo: string;
  invoiceLogo: string;
  companyName: string;
  siret?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface InventoryCampaign {
  id: string;
  name: string;
  status: 'DRAFT' | 'VALIDATED';
  createdAt: string;
  items?: InventoryCampaignItem[];
}

export interface InventoryCampaignItem {
  id: string;
  stockItemId: string;
  stockItem?: StockItem;
  systemQty: number;
  countedQty: number;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
  plan: 'FREE_TRIAL' | 'BASIC' | 'PRO' | 'ENTERPRISE';
  mrr: number;
  lastPaymentDate: string;
  paymentStatus: 'UP_TO_DATE' | 'LATE' | 'FAILED' | 'TRIAL' | 'PENDING';
  createdAt?: string; 
  // UI preferences
  primaryColor?: string;
  buttonColor?: string;
  fontFamily?: string;
  baseFontSize?: number;
  theme?: 'light' | 'dark' | string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  roles: UserRole[];
  email: string;
  mfaEnabled: boolean;
  lastLogin: string;
  activeSession: boolean;
  isActive: boolean;
  tenantId: string;
  token?: string; 
  planId?: string; 
}

export interface StockMovement {
  id: string;
  date: string;
  type: 'IN' | 'OUT';
  qty: number;
  reason: string;
  user: string;
}

export interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentLevel: number;
  minThreshold: number;
  forecastedLevel: number;
  unitPrice: number;
  location: string;
  imageUrl?: string;
  subcategoryId?: string;
  movements?: StockMovement[];
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  imageUrl?: string;
  status: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  companyName: string;
  mainContact: string;
  email: string;
  phone: string;
  billingAddress: string;
  siret?: string;
  tvaIntra?: string;
  outstandingBalance?: number;
  maxCreditLimit?: number;
  paymentTerms: number;
  healthStatus: 'GOOD' | 'WARNING' | 'CRITICAL';
}

export interface InvoiceItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  tva: number;
}

export interface Invoice {
  id: string;
  customer: string;
  customerId: string;
  date: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'DRAFT';
  type: string;
  taxAmount: number;
  transmissionStatus: string;
  items: InvoiceItem[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  status: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  level: number;
  price: number;
  features: string[];
  maxUsers: number;
  hasAiChatbot: boolean;
  hasStockForecast: boolean;
  isPopular?: boolean;
}

export interface SubscriptionPayment {
  id: string;
  date: string;
  amount: number;
  method: string;
  status: TransactionStatus;
}

export interface Subscription {
  planId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'TRIAL' | 'PENDING';
  nextBillingDate: string;
  paymentHistory: SubscriptionPayment[];
  autoRenew: boolean;
}

export interface Employee {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string; // Nom du département (calculé)
  departmentId?: string; // ID du département
  photoUrl?: string;
  hireDate?: string;
  baseSalary?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  address?: string;
  city?: string;
  country?: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'O';
  managerId?: string;
  contractType?: string;
  bankInfo?: any;
  meta?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string;
  employeeId: string;
  type: 'CDI' | 'CDD' | 'STAGE' | 'FREELANCE';
  startDate: string;
  endDate?: string;
  salary: number;
  workingHours: number;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'SUSPENDED';
  signedDate: string;
  renewalDate?: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    position: string;
    departmentId?: string;
  };
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  month: string;
  year: number;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  socialCharges: number;
  netSalary: number;
  taxAmount: number;
  status: 'DRAFT' | 'PROCESSED' | 'PAID';
  processedAt?: string;
  paidAt?: string;
}

export interface Leave {
  id: string;
  employeeId: string;
  type: 'PAID_LEAVE' | 'SICK_LEAVE' | 'MATERNITY' | 'PATERNITY' | 'UNPAID';
  startDate: string;
  endDate: string;
  days: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface HRDocument {
  id: string;
  employeeId: string;
  name: string;
  type: 'ID_CARD' | 'CONTRACT' | 'DIPLOMA' | 'BANK_DETAILS' | 'MEDICAL' | 'OTHER';
  category: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface PayrollSettings {
  id: string;
  tenantId: string;
  socialChargeRate: number;
  taxRate: number;
  minimumWage: number;
  currency: string;
  paymentDay: number;
  overtimeRate: number;
  updatedAt: string;
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  tenantId: string;
  year: number;
  month: number;
  baseSalary: number;
  overtime: number;
  bonuses: number;
  deductions: number;
  socialCharges: number;
  taxes: number;
  netSalary: number;
  status: 'DRAFT' | 'VALIDATED' | 'PAID';
  generatedAt: string;
  paidAt?: string;
}

// ============== LEAVE (CONGÉS) TYPES ==============
export type LeaveType = 'PAID' | 'SICK' | 'MATERNITY' | 'UNPAID' | 'ANNUAL';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface Leave {
  id: string;
  tenantId: string;
  employeeId: string;
  employee?: Employee;
  type: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  status: LeaveStatus;
  reason?: string;
  approvedBy?: string;
  approver?: Employee;
  approvedAt?: string;
  rejectionReason?: string;
  documentUrl?: string;
  documentName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveFormData {
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  document?: File;
}

export interface LeaveListResponse {
  rows: Leave[];
  count: number;
  page: number;
  perPage: number;
}
