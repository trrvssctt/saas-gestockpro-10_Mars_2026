
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  Layers, 
  ShieldCheck, 
  FileText, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Download, 
  Edit3, 
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Plus,
  History,
  FolderOpen,
  CreditCard,
  Activity,
  UserCheck,
  UserX,
  X,
  Camera,
  RefreshCw,
  ExternalLink,
  Image,
  Code,
  Search,
  Filter,
  BarChart3
} from 'lucide-react';
import { apiClient } from '../../services/api';
import { authBridge } from '../../services/authBridge';
import { useToast } from '../ToastProvider';
import { motion, AnimatePresence } from 'framer-motion';
import HRModal from './HRModal';
import PayslipPreview from './PayslipPreview';
import { createRoot } from 'react-dom/client';

interface EmployeeProfileProps {
  employeeId: string;
  onNavigate: (tab: string, meta?: any) => void;
}

// Helper functions pour la validation et l'affichage
const getContractTypeRules = (type: string) => {
  switch (type) {
    case 'CDI':
      return {
        needsEndDate: false,
        maxTrialPeriod: 4,
        helpText: 'CDI : Contrat permanent. Date de fin optionnelle (si omise, contrat permanent).'
      };
    case 'CDD':
      return {
        needsEndDate: true,
        maxTrialPeriod: 1,
        helpText: 'CDD : Contrat temporaire. Date de fin obligatoire (maximum 5 ans).'
      };
    case 'STAGE':
      return {
        needsEndDate: true,
        maxTrialPeriod: 0,
        maxDuration: 6,
        helpText: 'STAGE : Stage limité à 6 mois maximum. Pas de période d\'essai.'
      };
    default:
      return { needsEndDate: true, maxTrialPeriod: 4, helpText: 'Sélectionnez un type de contrat pour voir les règles.' };
  }
};

const formatDateForDisplay = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const calculateContractDuration = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return '';
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 30) {
    return `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  } else if (diffDays <= 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} mois`;
  } else {
    const years = Math.floor(diffDays / 365);
    const remainingMonths = Math.floor((diffDays % 365) / 30);
    return `${years} an${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` et ${remainingMonths} mois` : ''}`;
  }
};

const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ employeeId, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [employee, setEmployee] = useState<any | null>(null);
  const [tenant, setTenant] = useState<any | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();
  const [editForm, setEditForm] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [contractForm, setContractForm] = useState({
    type: 'CDI',
    startDate: '',
    endDate: '',
    salary: '',
    trialPeriodEnd: '',
    currency: 'F CFA'
  });
  const [terminationForm, setTerminationForm] = useState({ reason: '' });
  const [suspensionForm, setSuspensionForm] = useState({ reason: '' });
  const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docForm, setDocForm] = useState({
    name: '',
    type: 'ID_CARD',
    category: '',
    file: null as File | null
  });
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<any | null>(null);
  const [isGeneratingPayslip, setIsGeneratingPayslip] = useState(false);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null);
  
  // États pour les filtres de fiches de paie
  const [payslipFilters, setPayslipFilters] = useState({
    search: '',
    month: '',
    displayCount: 10
  });
  
  // États pour la timeline de carrière
  const [careerTimeline, setCareerTimeline] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  
  // États pour les primes et avances avec filtres avancés
  const [advances, setAdvances] = useState<any[]>([]);
  const [primes, setPrimes] = useState<any[]>([]);
  const [advanceFilters, setAdvanceFilters] = useState({
    status: 'ALL',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    search: ''
  });
  const [primeFilters, setPrimeFilters] = useState({
    type: 'ALL',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    search: ''
  });
  
  // État pour le salaire du mois en cours
  const [currentMonthSalary, setCurrentMonthSalary] = useState<any>(null);
  const [loadingSalary, setLoadingSalary] = useState(false);
  
  // États pour la timeline de carrière
  const resetContractForm = () => {
    setContractForm({
      type: 'CDI',
      startDate: '',
      endDate: '',
      salary: '',
      trialPeriodEnd: '',
      currency: 'F CFA'
    });
  };

  // Fonction utilitaire pour déterminer le statut de présence d'un employé
  const getEmployeePresenceStatus = (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const activeLeave = leaves.find(leave => {
      return leave.employeeId === employeeId && 
             leave.status === 'APPROVED' && 
             leave.startDate <= today && 
             leave.endDate >= today;
    });
    
    return {
      isPresent: !activeLeave,
      leave: activeLeave,
      leaveType: activeLeave?.type,
      leaveEndDate: activeLeave?.endDate
    };
  };

  const handleContractTypeChange = (newType: string) => {
    const updatedForm = { ...contractForm, type: newType };
    
    // Auto-nettoyage selon le type de contrat
    if (newType === 'CDI') {
      // CDI ne doit pas avoir de date de fin
      updatedForm.endDate = '';
    }
    
    if (newType === 'STAGE') {
      // Stage ne peut pas avoir de période d'essai
      updatedForm.trialPeriodEnd = '';
    }
    
    setContractForm(updatedForm);
  };

  const resetTerminationForm = () => {
    setTerminationForm({ reason: '' });
  };

  const resetSuspensionForm = () => {
    setSuspensionForm({ reason: '' });
  };

  const resetDocForm = () => {
    setDocForm({
      name: '',
      type: 'ID_CARD',
      category: '',
      file: null
    });
  };

  // Fonction pour calculer le salaire du mois en cours
  const calculateCurrentMonthSalary = async (employeeId: string) => {
    try {
      setLoadingSalary(true);
      const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM format
      
      // Utiliser la nouvelle API backend pour le calcul précis
      const response = await apiClient.get(`/hr/employees/${employeeId}/monthly-salary?month=${currentMonth}`);
      
      if (response && response.baseSalary !== undefined) {
        setCurrentMonthSalary({
          baseSalary: response.baseSalary,
          totalPrimes: response.totalPrimes,
          totalAdvances: response.totalAdvanceDeductions,
          socialChargesEmployee: response.socialChargesEmployee,
          socialChargesEmployer: response.socialChargesEmployer,
          grossSalary: response.grossSalary,
          netSalary: response.netSalary,
          currency: response.currency,
          primesCount: response.details?.primesCount || 0,
          advancesCount: response.details?.advancesCount || 0,
          contractType: response.details?.contractType || 'N/A'
        });
      } else {
        // Fallback au calcul côté client si l'API échoue
        await calculateCurrentMonthSalaryFallback(employeeId);
      }
    } catch (error: any) {
      console.error('Error calculating current month salary via API:', error);
      // Fallback au calcul côté client en cas d'erreur API
      await calculateCurrentMonthSalaryFallback(employeeId);
    } finally {
      setLoadingSalary(false);
    }
  };
  
  // Méthode fallback pour le calcul côté client
  const calculateCurrentMonthSalaryFallback = async (employeeId: string) => {
    try {
      const currentMonth = new Date().toISOString().substring(0, 7);
      
      const activeContract = contracts.find(c => c.employeeId === employeeId && c.status === 'ACTIVE');
      if (!activeContract) {
        setCurrentMonthSalary(null);
        return;
      }
      
      // Validation et parsing sécurisé du salaire de base
      const baseSalary = parseFloat(activeContract.salary) || 0;
      
      // Validation des données de base
      if (baseSalary <= 0) {
        console.warn('Salaire de base invalide ou non défini');
        setCurrentMonthSalary(null);
        return;
      }
      
      // Récupérer les primes du mois en cours
      const currentMonthPrimes = primes.filter(prime => {
        const primeMonth = new Date(prime.createdAt).toISOString().substring(0, 7);
        return primeMonth === currentMonth && prime.status === 'APPROVED';
      });
      
      // Récupérer les avances ACTIVES pendant ce mois (pas créées ce mois)
      const monthStart = new Date(currentMonth + '-01');
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      
      const activeAdvances = advances.filter(advance => {
        if (advance.status !== 'APPROVED' || !advance.startDate || !advance.endDate) {
          return false;
        }
        
        const startDate = new Date(advance.startDate);
        const endDate = new Date(advance.endDate);
        
        // L'avance est active si elle chevauche avec le mois courant
        return startDate <= monthEnd && endDate >= monthStart;
      });
      
      // Calculer les totaux avec validation numérique
      const totalPrimes = currentMonthPrimes.reduce((sum, prime) => {
        const amount = parseFloat(prime.amount) || 0;
        return sum + amount;
      }, 0);
      
      const totalAdvances = activeAdvances.reduce((sum, advance) => {
        // advance.amount représente le montant mensuel à déduire
        const monthlyDeduction = parseFloat(advance.amount) || 0;
        return sum + monthlyDeduction;
      }, 0);
      
      // Validation des montants calculés
      const validTotalPrimes = isNaN(totalPrimes) ? 0 : totalPrimes;
      const validTotalAdvances = isNaN(totalAdvances) ? 0 : totalAdvances;
      
      // Calculs des charges sociales avec arrondi
      const socialChargesEmployee = Math.round(baseSalary * 0.22 * 100) / 100;
      const socialChargesEmployer = Math.round(baseSalary * 0.18 * 100) / 100;
      
      const grossSalary = Math.round((baseSalary + validTotalPrimes) * 100) / 100;
      const netSalary = Math.round((grossSalary - socialChargesEmployee - validTotalAdvances) * 100) / 100;
      
      setCurrentMonthSalary({
        baseSalary: Math.round(baseSalary * 100) / 100,
        totalPrimes: Math.round(validTotalPrimes * 100) / 100,
        totalAdvances: Math.round(validTotalAdvances * 100) / 100,
        socialChargesEmployee: Math.round(socialChargesEmployee * 100) / 100,
        socialChargesEmployer: Math.round(socialChargesEmployer * 100) / 100,
        grossSalary: Math.round(grossSalary * 100) / 100,
        netSalary: Math.round(netSalary * 100) / 100,
        currency: activeContract.currency || 'F CFA',
        primesCount: currentMonthPrimes.length,
        advancesCount: activeAdvances.length,
        contractType: activeContract.type
      });
    } catch (error: any) {
      console.error('Error in fallback salary calculation:', error);
      setCurrentMonthSalary(null);
    }
  };
  
  // Fonction pour charger les avances et primes avec détails
  const loadAdvancesAndPrimes = async (employeeId: string) => {
    try {
      const [advancesResponse, primesResponse] = await Promise.all([
        apiClient.get('/hr/advances').catch(() => ({ data: [] })),
        apiClient.get('/hr/primes').catch(() => ({ data: [] }))
      ]);
      
      const allAdvances = advancesResponse.data || advancesResponse || [];
      const allPrimes = primesResponse.data || primesResponse || [];
      
      // Filtrer pour cet employé
      const employeeAdvances = allAdvances.filter((advance: any) => advance.employeeId === employeeId);
      const employeePrimes = allPrimes.filter((prime: any) => prime.employeeId === employeeId);
      
      setAdvances(employeeAdvances);
      setPrimes(employeePrimes);
    } catch (error: any) {
      console.error('Error loading advances and primes:', error);
      setAdvances([]);
      setPrimes([]);
    }
  };
  
  // Fonction pour charger la timeline de carrière
  const loadCareerTimeline = async (employeeId: string) => {
    try {
      setLoadingTimeline(true);
      
      // Charger les contrats, avances et primes en parallèle
      const [contractsResponse, advancesResponse, primesResponse] = await Promise.all([
        apiClient.get(`/hr/contracts/employee/${employeeId}/history`),
        apiClient.get(`/hr/advances`).catch(() => ({ data: [] })), // Fallback si endpoint n'existe pas encore
        apiClient.get(`/hr/primes`).catch(() => ({ data: [] }))    // Fallback si endpoint n'existe pas encore
      ]);

      const contracts = contractsResponse.timeline || [];
      const allAdvances = advancesResponse.data || advancesResponse || [];
      const allPrimes = primesResponse.data || primesResponse || [];

      // Filtrer les avances et primes de cet employé
      const employeeAdvances = allAdvances.filter((advance: any) => advance.employeeId === employeeId);
      const employeePrimes = allPrimes.filter((prime: any) => prime.employeeId === employeeId);

      // Créer les événements pour les avances
      const advanceEvents = employeeAdvances.map((advance: any) => ({
        type: 'ADVANCE',
        date: advance.createdAt,
        title: 'Avance sur Salaire',
        description: advance.reason || 'Avance accordée',
        amount: advance.amount,
        currency: advance.currency,
        months: advance.months,
        status: advance.status,
        details: {
          id: advance.id,
          amount: advance.amount,
          months: advance.months,
          totalAmount: advance.amount * advance.months,
          status: advance.status,
          approvedAt: advance.approvedAt,
          rejectionReason: advance.rejectionReason
        }
      }));

      // Créer les événements pour les primes
      const primeEvents = employeePrimes.map((prime: any) => ({
        type: 'PRIME',
        date: prime.createdAt,
        title: `Prime ${prime.type}`,
        description: prime.reason || 'Prime accordée',
        amount: prime.amount,
        currency: prime.currency,
        primeType: prime.type,
        status: prime.status,
        details: {
          id: prime.id,
          amount: prime.amount,
          type: prime.type,
          category: prime.category,
          status: prime.status,
          isPaid: prime.isPaid,
          paidAt: prime.paidAt,
          payrollMonth: prime.payrollMonth
        }
      }));

      // Combiner tous les événements et les trier par date
      const allEvents = [...contracts, ...advanceEvents, ...primeEvents];
      allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setCareerTimeline(allEvents);
    } catch (error: any) {
      console.error('Error loading career timeline:', error);
      setCareerTimeline([]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const [empRes, deptRes, contractsRes, expiringRes, docsRes, leavesRes, tenantRes] = await Promise.all([
          apiClient.get(`/hr/employees/${employeeId}`),
          apiClient.get('/hr/departments'),
          apiClient.get('/hr/contracts'),
          apiClient.get('/hr/contracts/alerts/expiring'),
          apiClient.get(`/hr/employees/${employeeId}/documents`),
          apiClient.get('/hr/leaves'),
          apiClient.get('/tenant/info') // Récupérer les informations du tenant
        ]);
        setEmployee(empRes);
        setTenant(tenantRes);
        setDepartments(deptRes?.rows || deptRes || []);
        setContracts(contractsRes?.rows || contractsRes || []);
        setExpiringContracts(expiringRes || []);
        setDocuments(docsRes || []);
        setLeaves(leavesRes?.rows || leavesRes || []);
        
        // Charger les fiches de paie pour cet employé spécifique
        if (empRes?.id) {
          try {
            const payslipsRes = await apiClient.get(`/hr/employees/${empRes.id}/payslips`);
            setPayslips(payslipsRes || []);
          } catch (error) {
            console.error('Error loading payslips:', error);
            setPayslips([]);
          }
        }
        
        // Charger la timeline de carrière et les données enrichies
        if (empRes?.id) {
          loadCareerTimeline(empRes.id);
          loadAdvancesAndPrimes(empRes.id);
          calculateCurrentMonthSalary(empRes.id);
        }
      } catch (err: any) {
        console.error('Error loading employee profile:', err);
        setAlertMessage("Impossible de charger l'employé");
        setShowSuccessAlert(true);
        setTimeout(() => setShowSuccessAlert(false), 3000);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <RefreshCw className="animate-spin mr-2" />
        <span>Chargement du profil employé...</span>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="py-20 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <UserX size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Employé non trouvé</h3>
          <p className="text-slate-500 font-medium text-sm">L'employé demandé n'existe pas ou a été supprimé.</p>
          <button 
            onClick={() => onNavigate('rh.employees')}
            className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl"
          >
            <ArrowLeft size={16} className="mr-2" /> Retour à la Liste
          </button>
        </div>
      </div>
    );
  }
  
  // Rechercher le contrat actif pour cet employé
  const contract = contracts.find((c: any) => String(c.employeeId) === String(employeeId) && c.status === 'ACTIVE');
  
  // Vérifier si l'employé a un contrat actif pour la génération de fiche de paie
  const hasActiveContract = contract !== undefined;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    const cloudinaryData = new FormData();
    cloudinaryData.append('file', file);
    cloudinaryData.append('upload_preset', 'ml_default'); 
    cloudinaryData.append('cloud_name', 'dq7avew9h');

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/dq7avew9h/image/upload`, {
        method: 'POST',
        body: cloudinaryData
      });
      
      const data = await response.json();
      if (data.secure_url) {
        setEditForm(prev => ({ ...prev, photoUrl: data.secure_url }));
        showToast('Photo téléchargée avec succès', 'success');
      }
    } catch (err) {
      console.error("Upload Error:", err);
      showToast("Échec de l'envoi de la photo.", 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    try {
      const payload: any = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone,
        position: editForm.position,
        departmentId: editForm.departmentId || null,
        hireDate: editForm.hireDate,
        photoUrl: editForm.photoUrl || null
      };
      await apiClient.put(`/hr/employees/${employee.id}`, payload);
      setIsEditModalOpen(false);
      showToast('Profil mis à jour', 'success');
      // Refresh
      const refreshed = await apiClient.get(`/hr/employees/${employeeId}`);
      setEmployee(refreshed);
    } catch (err: any) {
      console.error('Error updating employee profile:', err);
      showToast(err.message || "Erreur lors de la mise à jour", 'error');
    }
  };

  const handleAddContract = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation stricte des dates
    if (!contractForm.type || !contractForm.startDate) {
      showToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    const startDate = new Date(contractForm.startDate);
    const today = new Date();
    const maxPastDate = new Date();
    maxPastDate.setFullYear(today.getFullYear() - 10); // Max 10 ans dans le passé
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(today.getFullYear() + 2); // Max 2 ans dans le futur

    // Validation date de début
    if (startDate < maxPastDate) {
      showToast('La date de début ne peut pas être antérieure à 10 ans', 'error');
      return;
    }
    if (startDate > maxFutureDate) {
      showToast('La date de début ne peut pas être supérieure à 2 ans dans le futur', 'error');
      return;
    }

    // Validation date de fin pour CDD/Stage
    if ((contractForm.type === 'CDD' || contractForm.type === 'STAGE') && !contractForm.endDate) {
      showToast(`Une date de fin est obligatoire pour un contrat de type ${contractForm.type}`, 'error');
      return;
    }

    // Validation CDI ne doit pas avoir de date de fin
    if (contractForm.type === 'CDI' && contractForm.endDate) {
      showToast('Un contrat CDI ne peut pas avoir de date de fin', 'error');
      return;
    }

    if (contractForm.endDate) {
      const endDate = new Date(contractForm.endDate);
      
      // Date de fin doit être postérieure à la date de début
      if (endDate <= startDate) {
        showToast('La date de fin doit être postérieure à la date de début', 'error');
        return;
      }

      // Date de fin ne peut pas être trop lointaine
      const maxEndDate = new Date(startDate);
      maxEndDate.setFullYear(startDate.getFullYear() + 5); // Max 5 ans de contrat
      if (endDate > maxEndDate) {
        showToast('La durée du contrat ne peut pas excéder 5 ans', 'error');
        return;
      }

      // Validation durée minimale pour CDD (1 jour minimum)
      const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (contractForm.type === 'CDD' && diffDays < 1) {
        showToast('Un CDD doit avoir une durée minimale d\'1 jour', 'error');
        return;
      }

      // Validation durée Stage (max 6 mois)
      if (contractForm.type === 'STAGE') {
        const diffMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
        if (diffMonths > 6) {
          showToast('Un stage ne peut pas excéder 6 mois', 'error');
          return;
        }
      }
    }

    // Validation période d'essai
    if (contractForm.trialPeriodEnd) {
      const trialEnd = new Date(contractForm.trialPeriodEnd);
      
      if (trialEnd <= startDate) {
        showToast('La fin de période d\'essai doit être postérieure à la date de début', 'error');
        return;
      }

      if (contractForm.endDate && trialEnd >= new Date(contractForm.endDate)) {
        showToast('La période d\'essai doit se terminer avant la fin du contrat', 'error');
        return;
      }

      // Durée maximale période d'essai selon le type
      const maxTrialMonths = contractForm.type === 'CDI' ? 4 : 
                            contractForm.type === 'CDD' ? 1 : 
                            contractForm.type === 'STAGE' ? 0 : 2;
      
      if (maxTrialMonths === 0) {
        showToast('Les stages ne peuvent pas avoir de période d\'essai', 'error');
        return;
      }

      const trialMonths = (trialEnd.getFullYear() - startDate.getFullYear()) * 12 + (trialEnd.getMonth() - startDate.getMonth());
      if (trialMonths > maxTrialMonths) {
        showToast(`La période d'essai ne peut pas excéder ${maxTrialMonths} mois pour un ${contractForm.type}`, 'error');
        return;
      }
    }

    // Validation salaire
    if (contractForm.salary && parseFloat(contractForm.salary) < 0) {
      showToast('Le salaire ne peut pas être négatif', 'error');
      return;
    }

    try {
      const payload = {
        employeeId: employee.id,
        type: contractForm.type,
        startDate: contractForm.startDate,
        endDate: contractForm.endDate || null,
        salary: contractForm.salary ? parseFloat(contractForm.salary) : null,
        trialPeriodEnd: contractForm.trialPeriodEnd || null,
        currency: contractForm.currency
      };
      
      await apiClient.post('/hr/contracts', payload);
      
      // Refresh contracts
      const contractsRes = await apiClient.get('/hr/contracts');
      setContracts(contractsRes?.rows || contractsRes || []);
      
      // Recharger la timeline de carrière
      if (employee?.id) {
        await loadCareerTimeline(employee.id);
      }
      
      setIsContractModalOpen(false);
      resetContractForm();
      showToast('Contrat créé avec succès', 'success');
    } catch (error: any) {
      console.error('Error creating contract:', error);
      showToast(error.response?.data?.error || 'Erreur lors de la création du contrat', 'error');
    }
  };

  const handleTerminateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract || !terminationForm.reason.trim()) return;
    
    try {
      await apiClient.post(`/hr/contracts/${selectedContract.id}/terminate`, {
        reason: terminationForm.reason.trim()
      });
      
      // Refresh contracts
      const contractsRes = await apiClient.get('/hr/contracts');
      setContracts(contractsRes?.rows || contractsRes || []);
      
      // Recharger la timeline de carrière
      if (employee?.id) {
        await loadCareerTimeline(employee.id);
      }
      
      setIsTerminateModalOpen(false);
      resetTerminationForm();
      setSelectedContract(null);
      showToast('Contrat résilié avec succès', 'success');
    } catch (error: any) {
      console.error('Error terminating contract:', error);
      showToast(error.response?.data?.error || 'Erreur lors de la résiliation', 'error');
    }
  };

  const handleSuspendContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract || !suspensionForm.reason.trim()) return;
    
    try {
      await apiClient.post(`/hr/contracts/${selectedContract.id}/suspend`, {
        reason: suspensionForm.reason.trim()
      });
      
      // Refresh contracts
      const contractsRes = await apiClient.get('/hr/contracts');
      setContracts(contractsRes?.rows || contractsRes || []);
      
      // Recharger la timeline de carrière
      if (employee?.id) {
        await loadCareerTimeline(employee.id);
      }
      
      setIsSuspendModalOpen(false);
      resetSuspensionForm();
      setSelectedContract(null);
      showToast('Contrat suspendu avec succès', 'success');
    } catch (error: any) {
      console.error('Error suspending contract:', error);
      showToast(error.response?.data?.error || 'Erreur lors de la suspension', 'error');
    }
  };

  const handleReactivateContract = async (contractId: string) => {
    try {
      // Trouver le contrat à réactiver
      const contractToReactivate = contracts.find(c => c.id === contractId);
      if (!contractToReactivate) {
        showToast('Contrat non trouvé', 'error');
        return;
      }
      
      // Vérifier si l'employé a déjà un contrat actif
      const hasActiveContract = contracts.some(c => 
        c.employeeId === contractToReactivate.employeeId && 
        c.id !== contractId && 
        c.status === 'ACTIVE'
      );
      
      if (hasActiveContract) {
        showToast('Impossible de réactiver : cet employé a déjà un contrat actif. Un employé ne peut pas avoir plus d\'un contrat actif simultanément.', 'error');
        return;
      }
      
      await apiClient.post(`/hr/contracts/${contractId}/reactivate`, {});
      
      // Refresh contracts
      const contractsRes = await apiClient.get('/hr/contracts');
      setContracts(contractsRes?.rows || contractsRes || []);
      
      // Recharger la timeline de carrière
      if (employee?.id) {
        await loadCareerTimeline(employee.id);
      }
      
      showToast('Contrat réactivé avec succès', 'success');
    } catch (error: any) {
      console.error('Error reactivating contract:', error);
      showToast(error.response?.data?.error || 'Erreur lors de la réactivation', 'error');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation du type de fichier
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Type de fichier non autorisé. Utilisez PDF, JPG ou PNG.', 'error');
      return;
    }

    // Validation de la taille (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showToast('Le fichier est trop volumineux. Taille maximale : 10MB.', 'error');
      return;
    }

    setDocForm({ ...docForm, file });
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!docForm.name.trim() || !docForm.file || !docForm.type) {
      showToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    setIsUploadingDoc(true);
    
    try {
      // Tentative d'upload vers Cloudinary avec configuration corrigée
      const cloudinaryData = new FormData();
      cloudinaryData.append('file', docForm.file);
      cloudinaryData.append('upload_preset', 'ml_default');
      cloudinaryData.append('cloud_name', 'dq7avew9h');
      cloudinaryData.append('resource_type', 'auto');
      cloudinaryData.append('folder', 'employee_documents'); // Organisation en dossier
      cloudinaryData.append('public_id', `doc_${Date.now()}`); // ID unique
      // Retirer access_mode car non autorisé avec unsigned upload

      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/dq7avew9h/upload`, {
        method: 'POST',
        body: cloudinaryData
      });
      
      const uploadData = await uploadResponse.json();
      
      // Vérifier si l'upload a réussi
      if (!uploadResponse.ok || !uploadData.secure_url) {
        console.error('Erreur Cloudinary:', uploadData);
        throw new Error(`Erreur Cloudinary: ${uploadData.error?.message || 'Upload impossible'}`);
      }

      // Sauvegarder en base de données
      const payload = {
        employeeId: employee.id,
        name: docForm.name.trim(),
        type: docForm.type,
        category: docForm.category.trim() || null,
        fileUrl: uploadData.secure_url,
        mimeType: docForm.file.type,
        fileSize: docForm.file.size
      };
      
      await apiClient.post('/hr/employee-documents', payload);
      
      // Refresh documents
      const docsRes = await apiClient.get(`/hr/employees/${employeeId}/documents`);
      setDocuments(docsRes || []);
      
      setIsDocModalOpen(false);
      resetDocForm();
      showToast('Document ajouté avec succès', 'success');
    } catch (error: any) {
      console.error('Error uploading document:', error);
      
      // Fallback: Upload vers le serveur local
      try {
        console.log('Tentative d\'upload vers le serveur local...');
        const localFormData = new FormData();
        localFormData.append('file', docForm.file);
        localFormData.append('employeeId', employee.id.toString());
        localFormData.append('name', docForm.name.trim());
        localFormData.append('type', docForm.type);
        localFormData.append('category', docForm.category.trim() || '');
        
        // Utiliser fetch directement pour éviter les problèmes de Content-Type avec FormData
        const session = authBridge.getSession();
        const backendUrl = 'http://localhost:3000'; // Utiliser la même URL que dans api.ts
        const uploadResponse = await fetch(`${backendUrl}/api/hr/employee-documents/upload-local`, {
          method: 'POST',
          body: localFormData,
          headers: {
            ...(session?.token ? { 'Authorization': `Bearer ${session.token}` } : {})
          }
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Erreur lors de l\'upload');
        }
        
        const localUploadData = await uploadResponse.json();
        
        // Refresh documents
        const docsRes = await apiClient.get(`/hr/employees/${employeeId}/documents`);
        setDocuments(docsRes || []);
        
        setIsDocModalOpen(false);
        resetDocForm();
        showToast('Document ajouté avec succès (stockage local)', 'success');
      } catch (localError: any) {
        console.error('Erreur upload local:', localError);
        showToast('Erreur lors de l\'ajout du document. Veuillez réessayer.', 'error');
      }
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDownloadDoc = (doc: any) => {
    // Créer un lien de téléchargement
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.originalName || doc.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteDoc = (doc: any) => {
    setDocToDelete(doc);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteDoc = async () => {
    if (!docToDelete) return;
    
    try {
      await apiClient.delete(`/hr/employee-documents/${docToDelete.id}`);
      
      // Refresh documents
      const docsRes = await apiClient.get(`/hr/employees/${employeeId}/documents`);
      setDocuments(docsRes || []);
      
      setIsDeleteModalOpen(false);
      setDocToDelete(null);
      showToast('Document supprimé avec succès', 'success');
    } catch (error: any) {
      console.error('Error deleting document:', error);
      showToast(error.message || 'Erreur lors de la suppression', 'error');
    }
  };

  const handlePreviewDoc = (doc: any) => {
    setPreviewDoc(doc);
    setIsPreviewModalOpen(true);
  };

  const handleGeneratePayslip = async () => {
    if (!employee) return;
    
    // Vérifier qu'il y a un contrat actif avant de générer la fiche de paie
    if (!hasActiveContract) {
      showToast('Impossible de générer une fiche de paie : aucun contrat actif pour cet employé', 'error');
      return;
    }
    
    setIsGeneratingPayslip(true);
    
    try {
      const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM format
      const response = await apiClient.post('/hr/payslips/generate', {
        employeeId: employee.id,
        month: currentMonth
      });
      
      if (response.pdfUrl) {
        // Télécharger automatiquement le PDF
        const link = document.createElement('a');
        link.href = response.pdfUrl;
        link.download = `Fiche_Paie_${employee.firstName}_${employee.lastName}_${currentMonth}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Refresh payslips list
        await loadPayslips();
        
        showToast('Fiche de paie générée et téléchargée avec succès', 'success');
      }
    } catch (error: any) {
      console.error('Error generating payslip:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erreur lors de la génération de la fiche de paie';
      showToast(errorMessage, 'error');
    } finally {
      setIsGeneratingPayslip(false);
    }
  };
  
  const handleDownloadPayslip = async (payslip: any, format: string = 'html') => {
    setDownloadLoading(payslip.month);
    
    if (!employee || !contract || !tenant) {
      showToast('Informations manquantes pour générer la fiche de paie', 'error');
      setDownloadLoading(null);
      return;
    }
    
    try {
      // Calculer les données de salaire pour le mois
      const [monthStr, yearStr] = payslip.month.split('-');
      const month = parseInt(monthStr);
      const year = parseInt(yearStr);
      
      const baseSalary = parseFloat(contract.salary) || 0;
      if (baseSalary <= 0) {
        showToast('Salaire de base non défini dans le contrat', 'error');
        setDownloadLoading(null);
        return;
      }
      
      // Calculer les primes du mois
      const monthPrimes = primes.filter(prime => {
        const primeDate = new Date(prime.createdAt);
        return primeDate.getMonth() + 1 === month && 
               primeDate.getFullYear() === year && 
               prime.status === 'APPROVED';
      });
      const totalPrimes = monthPrimes.reduce((sum, prime) => sum + (prime.amount || 0), 0);
      
      // Calculer les avances actives pour ce mois
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      const activeAdvances = advances.filter(advance => {
        if (advance.status !== 'APPROVED') return false;
        const startDate = new Date(advance.createdAt);
        const endMonths = advance.months || 1;
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + endMonths);
        return startDate <= monthEnd && endDate >= monthStart;
      });
      const totalAdvanceDeductions = activeAdvances.reduce((sum, advance) => {
        return sum + (advance.amount || 0);
      }, 0);
      
      // Calculer les charges sociales
      const grossSalary = baseSalary + totalPrimes;
      const socialChargesEmployee = Math.round(grossSalary * 0.22 * 100) / 100;
      const socialChargesEmployer = Math.round(grossSalary * 0.18 * 100) / 100;
      const netSalary = Math.round((grossSalary - socialChargesEmployee - totalAdvanceDeductions) * 100) / 100;
      
      const salaryCalculation = {
        baseSalary: Math.round(baseSalary * 100) / 100,
        grossSalary: Math.round(grossSalary * 100) / 100,
        netSalary: Math.round(netSalary * 100) / 100,
        totalPrimes: Math.round(totalPrimes * 100) / 100,
        socialChargesEmployee: Math.round(socialChargesEmployee * 100) / 100,
        socialChargesEmployer: Math.round(socialChargesEmployer * 100) / 100,
        totalAdvanceDeductions: Math.round(totalAdvanceDeductions * 100) / 100,
        currency: contract.currency || tenant.currency || 'F CFA'
      };
      
      // Générer le bulletin selon le format
      if (format === 'html') {
        await downloadPayslipAsHtml(employee, contract, tenant, salaryCalculation, month, year);
      } else if (format === 'png' || format === 'jpg') {
        await downloadPayslipAsImage(employee, contract, tenant, salaryCalculation, month, year, format);
      } else if (format === 'pdf') {
        await downloadPayslipAsPdf(employee, contract, tenant, salaryCalculation, month, year);
      }
      
      showToast('Fiche de paie téléchargée avec succès', 'success');
    } catch (error: any) {
      console.error('Error downloading payslip:', error);
      showToast(`Erreur lors du téléchargement: ${error.message}`, 'error');
    } finally {
      setDownloadLoading(null);
    }
  };

  // Fonction pour télécharger la fiche de paie en HTML
  const downloadPayslipAsHtml = async (
    employee: any, 
    contract: any, 
    tenant: any, 
    salaryCalculation: any, 
    month: number, 
    year: number
  ) => {
    // Créer un conteneur temporaire
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-10000px';
    container.style.top = '-10000px';
    document.body.appendChild(container);

    try {
      // Créer un root React pour le rendu
      const root = createRoot(container);
      
      // Rendre le composant PayslipPreview
      const payslipElement = React.createElement(PayslipPreview, {
        employee,
        contract,
        tenant,
        salaryCalculation,
        month,
        year
      });
      
      root.render(payslipElement);
      
      // Attendre que le rendu soit terminé
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Récupérer le HTML généré
      const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bulletin de Paie - ${employee.firstName} ${employee.lastName}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    ${getPayslipStyles()}
  </style>
</head>
<body>
  ${container.innerHTML}
</body>
</html>`;

      // Créer et télécharger le fichier
      const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bulletin_Paie_${employee.firstName}_${employee.lastName}_${String(month).padStart(2, '0')}_${year}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      // Nettoyer
      root.unmount();
    } finally {
      document.body.removeChild(container);
    }
  };

  // Fonction pour télécharger la fiche de paie en image
  const downloadPayslipAsImage = async (
    employee: any, 
    contract: any, 
    tenant: any, 
    salaryCalculation: any, 
    month: number, 
    year: number,
    format: string
  ) => {
    // Créer un conteneur temporaire
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-10000px';
    container.style.top = '-10000px';
    container.style.width = '794px'; // 210mm à 96 DPI
    container.style.height = '1123px'; // 297mm à 96 DPI
    document.body.appendChild(container);

    try {
      // Créer un root React pour le rendu
      const root = createRoot(container);
      
      // Rendre le composant PayslipPreview
      const payslipElement = React.createElement(PayslipPreview, {
        employee,
        contract,
        tenant,
        salaryCalculation,
        month,
        year
      });
      
      root.render(payslipElement);
      
      // Attendre que le rendu soit terminé
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Utiliser html2canvas pour capturer l'image
      const { default: html2canvas } = await import('html2canvas');
      
      const canvas = await html2canvas(container, {
        width: 794,
        height: 1123,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Convertir en blob et télécharger
      canvas.toBlob((blob) => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Bulletin_Paie_${employee.firstName}_${employee.lastName}_${String(month).padStart(2, '0')}_${year}.${format}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        }
      }, `image/${format}`, 0.95);
      
      // Nettoyer
      root.unmount();
    } finally {
      document.body.removeChild(container);
    }
  };

  // Fonction pour télécharger la fiche de paie en PDF (via impression)
  const downloadPayslipAsPdf = async (
    employee: any, 
    contract: any, 
    tenant: any, 
    salaryCalculation: any, 
    month: number, 
    year: number
  ) => {
    // Créer une nouvelle fenêtre avec le bulletin de paie
    const newWindow = window.open('', '_blank', 'width=800,height=600');
    if (!newWindow) {
      throw new Error('Impossible d\'ouvrir une nouvelle fenêtre. Vérifiez les paramètres de votre navigateur.');
    }

    // Créer le contenu HTML
    const container = document.createElement('div');
    const root = createRoot(container);
    
    const payslipElement = React.createElement(PayslipPreview, {
      employee,
      contract,
      tenant,
      salaryCalculation,
      month,
      year
    });
    
    root.render(payslipElement);
    
    // Attendre que le rendu soit terminé
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bulletin de Paie - ${employee.firstName} ${employee.lastName}</title>
  <style>
    ${getPayslipStyles()}
    @media print {
      body { margin: 0; }
      #payslip-render { box-shadow: none; border: none; }
    }
  </style>
</head>
<body>
  ${container.innerHTML}
  <script>
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

    newWindow.document.write(htmlContent);
    newWindow.document.close();
    
    // Nettoyer
    root.unmount();
  };

  // Fonction pour obtenir les styles CSS du bulletin de paie
  const getPayslipStyles = () => `
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0; 
      padding: 48px; 
      background: white; 
      color: #1e293b;
      width: 210mm;
      min-height: 297mm;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 40px;
      margin-bottom: 48px;
    }
    
    .company-info .logo-section {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .logo-placeholder {
      width: 48px;
      height: 48px;
      background: #4f46e5;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 900;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
    
    .company-name { 
      font-size: 24px; 
      font-weight: 900; 
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: -0.5px;
    }
    
    .payslip-table { 
      width: 100%; 
      border-collapse: separate;
      border-spacing: 0;
      margin: 48px 0;
    }
    
    .payslip-table thead tr {
      background: #0f172a;
      color: white;
    }
    
    .payslip-table th { 
      padding: 20px;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      text-align: left;
    }
    
    .payslip-table th:first-child { border-top-left-radius: 16px; }
    .payslip-table th:last-child { border-top-right-radius: 16px; }
    
    .payslip-table td { 
      padding: 20px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
      font-weight: 600;
    }
    
    @media print { 
      body { margin: 0; padding: 20px; }
      .shadow-sm, .shadow-xl { box-shadow: none !important; }
      .border { border: none !important; }
    }
  `;
  
  
  const loadPayslips = async () => {
    if (!employee?.id) return;
    try {
      const response = await apiClient.get(`/hr/employees/${employee.id}/payslips`);
      setPayslips(response || []);
    } catch (error: any) {
      console.error('Error loading payslips:', error);
      setPayslips([]);
    }
  };
  
  // Fonctions pour les filtres de fiches de paie
  const handleFilterChange = (key: string, value: string | number) => {
    setPayslipFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setPayslipFilters({
      search: '',
      month: '',
      displayCount: 10
    });
  };

  // Filtrage des fiches de paie
  const getFilteredPayslips = () => {
    let filtered = [...payslips];

    // Filtrage par recherche (nom de mois, année, statut)
    if (payslipFilters.search.trim()) {
      const searchTerm = payslipFilters.search.toLowerCase().trim();
      filtered = filtered.filter(slip => {
        const monthYear = new Date(slip.month + '-01').toLocaleDateString('fr-FR', { 
          month: 'long', 
          year: 'numeric' 
        }).toLowerCase();
        const status = slip.status?.toLowerCase() || '';
        const netSalary = slip.netSalary?.toString() || '';
        
        return monthYear.includes(searchTerm) || 
               status.includes(searchTerm) || 
               netSalary.includes(searchTerm);
      });
    }

    // Filtrage par mois spécifique
    if (payslipFilters.month) {
      filtered = filtered.filter(slip => slip.month === payslipFilters.month);
    }

    // Limitation du nombre d'éléments affichés
    if (payslipFilters.displayCount !== 'all') {
      filtered = filtered.slice(0, payslipFilters.displayCount as number);
    }

    return filtered;
  };

  // Obtenir la liste unique des mois disponibles
  const getAvailableMonths = () => {
    const months = payslips.map(slip => slip.month);
    return [...new Set(months)].sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime());
  };

  // Fonctions de filtrage pour les avances
  const getFilteredAdvances = () => {
    let filtered = [...advances];

    // Filtrage par statut
    if (advanceFilters.status !== 'ALL') {
      filtered = filtered.filter(advance => advance.status === advanceFilters.status);
    }

    // Filtrage par recherche
    if (advanceFilters.search.trim()) {
      const searchTerm = advanceFilters.search.toLowerCase().trim();
      filtered = filtered.filter(advance => 
        advance.reason?.toLowerCase().includes(searchTerm) ||
        advance.amount?.toString().includes(searchTerm)
      );
    }

    // Filtrage par date
    if (advanceFilters.dateFrom) {
      filtered = filtered.filter(advance => 
        new Date(advance.createdAt) >= new Date(advanceFilters.dateFrom)
      );
    }
    if (advanceFilters.dateTo) {
      filtered = filtered.filter(advance => 
        new Date(advance.createdAt) <= new Date(advanceFilters.dateTo)
      );
    }

    // Filtrage par montant
    if (advanceFilters.amountMin) {
      filtered = filtered.filter(advance => advance.amount >= parseFloat(advanceFilters.amountMin));
    }
    if (advanceFilters.amountMax) {
      filtered = filtered.filter(advance => advance.amount <= parseFloat(advanceFilters.amountMax));
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  // Fonctions de filtrage pour les primes
  const getFilteredPrimes = () => {
    let filtered = [...primes];

    // Filtrage par type
    if (primeFilters.type !== 'ALL') {
      filtered = filtered.filter(prime => prime.type === primeFilters.type);
    }

    // Filtrage par recherche
    if (primeFilters.search.trim()) {
      const searchTerm = primeFilters.search.toLowerCase().trim();
      filtered = filtered.filter(prime => 
        prime.reason?.toLowerCase().includes(searchTerm) ||
        prime.type?.toLowerCase().includes(searchTerm) ||
        prime.amount?.toString().includes(searchTerm)
      );
    }

    // Filtrage par date
    if (primeFilters.dateFrom) {
      filtered = filtered.filter(prime => 
        new Date(prime.createdAt) >= new Date(primeFilters.dateFrom)
      );
    }
    if (primeFilters.dateTo) {
      filtered = filtered.filter(prime => 
        new Date(prime.createdAt) <= new Date(primeFilters.dateTo)
      );
    }

    // Filtrage par montant
    if (primeFilters.amountMin) {
      filtered = filtered.filter(prime => prime.amount >= parseFloat(primeFilters.amountMin));
    }
    if (primeFilters.amountMax) {
      filtered = filtered.filter(prime => prime.amount <= parseFloat(primeFilters.amountMax));
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  // Fonctions de gestion des filtres
  const handleAdvanceFilterChange = (key: string, value: string) => {
    setAdvanceFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePrimeFilterChange = (key: string, value: string) => {
    setPrimeFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetAdvanceFilters = () => {
    setAdvanceFilters({
      status: 'ALL',
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: '',
      search: ''
    });
  };

  const resetPrimeFilters = () => {
    setPrimeFilters({
      type: 'ALL',
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: '',
      search: ''
    });
  };

  // Statistiques pour les avances et primes
  const getAdvanceStats = () => {
    const approved = advances.filter(a => a.status === 'APPROVED');
    const pending = advances.filter(a => a.status === 'PENDING');
    const rejected = advances.filter(a => a.status === 'REJECTED');
    const totalAmount = approved.reduce((sum, a) => sum + (a.amount || 0), 0);

    return {
      total: advances.length,
      approved: approved.length,
      pending: pending.length,
      rejected: rejected.length,
      totalAmount,
      averageAmount: approved.length > 0 ? totalAmount / approved.length : 0
    };
  };

  const getPrimeStats = () => {
    const totalAmount = primes.reduce((sum, p) => sum + (p.amount || 0), 0);
    const byType = primes.reduce((acc, prime) => {
      acc[prime.type] = (acc[prime.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: primes.length,
      totalAmount,
      averageAmount: primes.length > 0 ? totalAmount / primes.length : 0,
      byType
    };
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return '📄';
    } else if (fileType.includes('image')) {
      return '🖼️';
    }
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Fonction utilitaire pour formater correctement les montants
  const formatAmount = (amount: any, currency: string = 'F CFA') => {
    if (amount === null || amount === undefined || isNaN(amount)) return '0 ' + currency;
    // Convertir en nombre et supprimer les zéros inutiles
    const numAmount = parseFloat(amount.toString());
    if (numAmount === 0) return '0 ' + currency;
    return numAmount.toLocaleString('fr-FR') + ' ' + currency;
  };

  const tabs = [
    { id: 'general', label: 'Général', icon: <UserCheck size={16} /> },
    { id: 'contracts', label: 'Contrats', icon: <FileText size={16} /> },
    { id: 'history', label: 'Historique', icon: <History size={16} /> },
    { id: 'documents', label: 'Documents', icon: <FolderOpen size={16} /> },
    { id: 'payroll', label: 'Paie', icon: <CreditCard size={16} /> },
    { id: 'performance', label: 'Performance', icon: <Activity size={16} /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {/* Success Alert */}
      <AnimatePresence>
        {showSuccessAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 font-black uppercase text-[10px] tracking-widest"
          >
            <CheckCircle2 size={20} /> {alertMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => onNavigate('rh.employees')}
            className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl">
              <img 
                src={employee.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.firstName + ' ' + employee.lastName)}&background=6366f1&color=fff&size=200&font-size=0.6`} 
                alt={`${employee.firstName} ${employee.lastName}`} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.firstName + ' ' + employee.lastName)}&background=6366f1&color=fff&size=200&font-size=0.6`;
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{employee.firstName} {employee.lastName}</h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${employee.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  {employee.status}
                </span>
                
                {/* Indicateur de présence/absence */}
                {(() => {
                  const presenceStatus = getEmployeePresenceStatus(employee.id);
                  return presenceStatus.isPresent ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest">Présent</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full border border-red-200">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {presenceStatus.leaveType === 'SICK' ? 'En maladie' : 
                           presenceStatus.leaveType === 'PAID' ? 'En congé payé' :
                           presenceStatus.leaveType === 'MATERNITY' ? 'Congé maternité' :
                           presenceStatus.leaveType === 'UNPAID' ? 'Congé sans solde' : 'Absent'}
                        </span>
                        {presenceStatus.leaveEndDate && (
                          <span className="text-[8px] text-red-500 font-medium">
                            Retour le {new Date(presenceStatus.leaveEndDate).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <p className="text-indigo-600 font-black uppercase text-xs tracking-widest">{employee.position} • {departments.find(d => d.id === employee.departmentId)?.name || 'Non spécifié'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-white border border-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
            <Download size={16} /> Dossier Complet
          </button>
          <button 
            onClick={() => { 
              setEditForm({ 
                ...employee, 
                hireDate: employee.hireDate?.split('T')[0] || '',
                photoUrl: employee.photoUrl || '' 
              }); 
              setIsEditModalOpen(true); 
            }}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
          >
            <Edit3 size={16} /> Modifier Fiche
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      <HRModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="Modifier la Fiche Employé"
        size="lg"
        footer={
          <div className="flex justify-end gap-4">
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all"
            >
              Annuler
            </button>
            <button 
              onClick={handleUpdateEmployee}
              className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl"
            >
              Mettre à jour
            </button>
          </div>
        }
      >
        <form className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prénom <span className="text-red-500">*</span></label>
            <input type="text" value={editForm?.firstName || ''} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom <span className="text-red-500">*</span></label>
            <input type="text" value={editForm?.lastName || ''} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Professionnel <span className="text-red-500">*</span></label>
            <input type="email" value={editForm?.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Téléphone</label>
            <input type="text" value={editForm?.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Département</label>
            <select value={editForm?.departmentId || ''} onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm">
              <option value="">Sélectionner un département</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Poste</label>
            <input type="text" value={editForm?.position || ''} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date d'Embauche</label>
            <input type="date" value={editForm?.hireDate?.split('T')[0] || ''} onChange={(e) => setEditForm({ ...editForm, hireDate: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Photo de Profil</label>
            <div className="flex items-center gap-4">
              {editForm?.photoUrl && (
                <div className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden border-2 border-white shadow-lg">
                  <img 
                    src={editForm.photoUrl} 
                    alt="Aperçu" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden" 
                  id="photoUploadProfile"
                />
                <label 
                  htmlFor="photoUploadProfile"
                  className={`w-full px-6 py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-indigo-300 transition-all cursor-pointer ${
                    isUploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isUploading ? (
                    <><RefreshCw size={18} className="animate-spin mr-2" /> Téléchargement...</>
                  ) : (
                    <><Camera size={18} className="mr-2" /> Choisir une photo</>
                  )}
                </label>
              </div>
            </div>
          </div>
        </form>
      </HRModal>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-[2rem] w-fit overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <>
            {activeTab === 'general' && (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                    <UserCheck className="text-indigo-500" /> Informations Personnelles
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-10">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Professionnel</p>
                      <p className="text-sm font-bold text-slate-900">{employee.email || 'Non renseigné'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone</p>
                      <p className="text-sm font-bold text-slate-900">{employee.phone || 'Non renseigné'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Département</p>
                      <p className="text-sm font-bold text-slate-900">{departments.find(d => d.id === employee.departmentId)?.name || 'Non spécifié'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Poste Actuel</p>
                      <p className="text-sm font-bold text-slate-900">{employee.position || 'Non spécifié'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date d'Embauche</p>
                      <p className="text-sm font-bold text-slate-900">{employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('fr-FR') : 'Non renseignée'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut du Contrat</p>
                      <p className={`text-sm font-bold ${
                        contract?.status === 'ACTIVE' ? 'text-emerald-600' :
                        contract?.status === 'SUSPENDED' ? 'text-amber-600' :
                        contract?.status === 'TERMINATED' ? 'text-red-600' :
                        'text-slate-500'
                      }`}>
                        {contract ? (
                          contract.status === 'ACTIVE' ? 'Contrat Actif' :
                          contract.status === 'SUSPENDED' ? 'Contrat Suspendu' :
                          contract.status === 'TERMINATED' ? 'Contrat Résilié' : 
                          contract.status
                        ) : 'Aucun contrat'}
                      </p>
                    </div>
                  </div>

                  {/* Contract status details */}
                  {contract && (contract.status === 'SUSPENDED' || contract.status === 'TERMINATED') && (
                    <div className="mt-8 p-6 bg-slate-50 rounded-2xl">
                      <h4 className="text-sm font-bold text-slate-900 mb-4">
                        Détails {contract.status === 'SUSPENDED' ? 'de la suspension' : 'de la résiliation'}
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-bold text-slate-500">Date:</p>
                          <p className="text-sm text-slate-900">
                            {contract.status === 'SUSPENDED' && contract.suspensionDate ? 
                              new Date(contract.suspensionDate).toLocaleDateString('fr-FR') :
                              contract.status === 'TERMINATED' && contract.terminationDate ?
                              new Date(contract.terminationDate).toLocaleDateString('fr-FR') :
                              'Non renseignée'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500">Raison:</p>
                          <p className="text-sm text-slate-900">
                            {contract.status === 'SUSPENDED' ? contract.suspensionReason :
                             contract.status === 'TERMINATED' ? contract.terminationReason :
                             'Non renseignée'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section Statut de Présence */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                    <Clock className="text-blue-500" /> Statut de Présence
                  </h3>
                  {(() => {
                    const presenceStatus = getEmployeePresenceStatus(employee.id);
                    return (
                      <div className={`p-6 rounded-2xl ${presenceStatus.isPresent ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-4 h-4 rounded-full ${presenceStatus.isPresent ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <div>
                              <h4 className={`text-lg font-black uppercase tracking-tighter ${presenceStatus.isPresent ? 'text-emerald-700' : 'text-red-700'}`}>
                                {presenceStatus.isPresent ? 'Employé Présent' : 'Employé Absent'}
                              </h4>
                              <p className={`text-sm font-medium ${presenceStatus.isPresent ? 'text-emerald-600' : 'text-red-600'}`}>
                                {presenceStatus.isPresent ? 
                                  'Disponible pour les tâches et réunions' : 
                                  `En ${presenceStatus.leaveType === 'SICK' ? 'arrêt maladie' : 
                                         presenceStatus.leaveType === 'PAID' ? 'congé payé' :
                                         presenceStatus.leaveType === 'MATERNITY' ? 'congé maternité/paternité' :
                                         presenceStatus.leaveType === 'UNPAID' ? 'congé sans solde' : 'absence'}`
                                }
                              </p>
                            </div>
                          </div>
                          {!presenceStatus.isPresent && presenceStatus.leaveEndDate && (
                            <div className="text-right">
                              <p className="text-xs font-black text-red-500 uppercase tracking-widest">Retour prévu</p>
                              <p className="text-sm font-bold text-red-700">
                                {new Date(presenceStatus.leaveEndDate).toLocaleDateString('fr-FR', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {!presenceStatus.isPresent && presenceStatus.leave && (
                          <div className="mt-4 pt-4 border-t border-red-200">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-xs font-black text-red-500 uppercase tracking-widest">Début du congé</p>
                                <p className="font-bold text-red-700">
                                  {new Date(presenceStatus.leave.startDate).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-black text-red-500 uppercase tracking-widest">Durée</p>
                                <p className="font-bold text-red-700">
                                  {(() => {
                                    const start = new Date(presenceStatus.leave.startDate);
                                    const end = new Date(presenceStatus.leave.endDate);
                                    const diffTime = Math.abs(end.getTime() - start.getTime());
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                    return `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
                                  })()}
                                </p>
                              </div>
                            </div>
                            {presenceStatus.leave.reason && (
                              <div className="mt-3">
                                <p className="text-xs font-black text-red-500 uppercase tracking-widest">Motif</p>
                                <p className="font-medium text-red-700">{presenceStatus.leave.reason}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                    <TrendingUp className="text-emerald-500" /> KPI & Performance Visuelle
                  </h3>
                  <div className="grid sm:grid-cols-3 gap-8">
                    <div className="text-center p-6 bg-slate-50 rounded-[2rem]">
                      <p className="text-3xl font-black text-slate-900 mb-1">92%</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Productivité</p>
                    </div>
                    <div className="text-center p-6 bg-slate-50 rounded-[2rem]">
                      <p className="text-3xl font-black text-slate-900 mb-1">4.8/5</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Feedback Team</p>
                    </div>
                    <div className="text-center p-6 bg-slate-50 rounded-[2rem]">
                      <p className="text-3xl font-black text-slate-900 mb-1">0</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Absences Non Just.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-slate-900 p-10 rounded-[3rem] text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-2xl rounded-full"></div>
                  <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-3">
                    <Clock className="text-indigo-400" /> Temps & Présence
                  </h3>
                  <div className="space-y-6 relative z-10">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">Congés Restants</span>
                      <span className="text-lg font-black text-white">18.5 Jours</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">Heures Sup. (Mois)</span>
                      <span className="text-lg font-black text-emerald-400">+4.5h</span>
                    </div>
                    <div className="pt-4">
                      <button className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/10">
                        Consulter Planning
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3">
                    <AlertCircle className="text-amber-500" /> Alertes & Rappels
                  </h3>
                  <div className="space-y-4">
                    {/* Contract expiration alerts */}
                    {expiringContracts.filter(c => c.employee_id === employee.id).map((c, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 bg-red-50 rounded-2xl border border-red-100">
                        <AlertCircle className="text-red-500 shrink-0" size={18} />
                        <p className="text-xs font-medium text-red-800">
                          Contrat {c.type} expire le {new Date(c.end_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    ))}
                    
                    {/* Trial period alert */}
                    {contract?.trialPeriodEnd && new Date(contract.trialPeriodEnd) > new Date() && (
                      <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <AlertCircle className="text-amber-500 shrink-0" size={18} />
                        <p className="text-xs font-medium text-amber-800">
                          La période d'essai se termine le {new Date(contract.trialPeriodEnd).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}
                    
                    {/* Default alert if no contract */}
                    {!contract && (
                      <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <Calendar className="text-blue-500 shrink-0" size={18} />
                        <p className="text-xs font-medium text-blue-800">Aucun contrat actif pour cet employé.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                  <FileText className="text-indigo-500" /> Gestion du Contrat
                </h3>
                {!contract && (
                  <button 
                    onClick={() => {
                      resetContractForm();
                      setIsContractModalOpen(true);
                    }}
                    className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
                  >
                    <Plus size={16} /> Créer Contrat
                  </button>
                )}
              </div>
              
              {/* Contract Modal */}
              <HRModal 
                isOpen={isContractModalOpen} 
                onClose={() => {
                  resetContractForm();
                  setIsContractModalOpen(false);
                }} 
                title="Créer un Contrat"
                size="md"
                footer={
                  <div className="flex justify-end gap-4">
                    <button onClick={() => {
                      resetContractForm();
                      setIsContractModalOpen(false);
                    }} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">Annuler</button>
                    <button onClick={handleAddContract} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl">Créer</button>
                  </div>
                }
              >
                <form className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type de Contrat <span className="text-red-500">*</span></label>
                      <select 
                        value={contractForm.type}
                        onChange={(e) => handleContractTypeChange(e.target.value)}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm"
                      >
                        <option value="CDI">CDI (Contrat à Durée Indéterminée)</option>
                        <option value="CDD">CDD (Contrat à Durée Déterminée)</option>
                        <option value="STAGE">Stage</option>
                        <option value="FREELANCE">Freelance</option>
                      </select>
                      <p className="text-[9px] text-slate-500 font-medium">
                        {contractForm.type === 'CDI' && 'Pas de date de fin requise'}
                        {contractForm.type === 'CDD' && 'Date de fin obligatoire'}
                        {contractForm.type === 'STAGE' && 'Durée max: 6 mois'}
                        {contractForm.type === 'FREELANCE' && 'Dates flexibles'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Salaire de Base</label>
                      <input 
                        type="number" 
                        min="0"
                        step="1000"
                        placeholder="Ex: 1500000" 
                        value={contractForm.salary}
                        onChange={(e) => setContractForm({ ...contractForm, salary: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm" 
                      />
                      <p className="text-[9px] text-slate-500 font-medium">Montant en F CFA (optionnel)</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date de Début <span className="text-red-500">*</span></label>
                      <input 
                        type="date" 
                        value={contractForm.startDate}
                        onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                        min={(() => {
                          const minDate = new Date();
                          minDate.setFullYear(minDate.getFullYear() - 10);
                          return minDate.toISOString().split('T')[0];
                        })()}
                        max={(() => {
                          const maxDate = new Date();
                          maxDate.setFullYear(maxDate.getFullYear() + 2);
                          return maxDate.toISOString().split('T')[0];
                        })()}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm" 
                      />
                      <p className="text-[9px] text-slate-500 font-medium">Entre -10 ans et +2 ans max</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Date de Fin 
                        {(contractForm.type === 'CDD' || contractForm.type === 'STAGE') && <span className="text-red-500">*</span>}
                        {contractForm.type === 'CDI' && <span className="text-slate-400">(Non applicable)</span>}
                      </label>
                      <input 
                        type="date" 
                        value={contractForm.endDate}
                        onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })}
                        min={contractForm.startDate || new Date().toISOString().split('T')[0]}
                        max={(() => {
                          if (!contractForm.startDate) return undefined;
                          const maxDate = new Date(contractForm.startDate);
                          if (contractForm.type === 'STAGE') {
                            maxDate.setMonth(maxDate.getMonth() + 6);
                          } else {
                            maxDate.setFullYear(maxDate.getFullYear() + 5);
                          }
                          return maxDate.toISOString().split('T')[0];
                        })()}
                        disabled={contractForm.type === 'CDI'}
                        className={`w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm ${contractForm.type === 'CDI' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                      <p className="text-[9px] text-slate-500 font-medium">
                        {contractForm.type === 'CDI' && 'CDI = durée indéterminée'}
                        {contractForm.type === 'CDD' && 'Obligatoire pour CDD (max 5 ans)'}
                        {contractForm.type === 'STAGE' && 'Obligatoire pour stage (max 6 mois)'}
                        {contractForm.type === 'FREELANCE' && 'Optionnel (max 5 ans)'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Fin de Période d'Essai (Optionnel)
                      {contractForm.type === 'STAGE' && <span className="text-slate-400"> - Non applicable</span>}
                    </label>
                    <input 
                      type="date" 
                      value={contractForm.trialPeriodEnd}
                      onChange={(e) => setContractForm({ ...contractForm, trialPeriodEnd: e.target.value })}
                      min={contractForm.startDate || new Date().toISOString().split('T')[0]}
                      max={(() => {
                        if (!contractForm.startDate) return undefined;
                        const maxDate = new Date(contractForm.startDate);
                        const maxMonths = contractForm.type === 'CDI' ? 4 : 
                                         contractForm.type === 'CDD' ? 1 : 0;
                        maxDate.setMonth(maxDate.getMonth() + maxMonths);
                        return contractForm.type === 'STAGE' ? undefined : maxDate.toISOString().split('T')[0];
                      })()}
                      disabled={contractForm.type === 'STAGE'}
                      className={`w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm ${contractForm.type === 'STAGE' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    <p className="text-[9px] text-slate-500 font-medium">
                      {contractForm.type === 'CDI' && 'Max 4 mois pour CDI'}
                      {contractForm.type === 'CDD' && 'Max 1 mois pour CDD'}
                      {contractForm.type === 'STAGE' && 'Pas de période d\'essai pour stages'}
                      {contractForm.type === 'FREELANCE' && 'Max 2 mois pour Freelance'}
                    </p>
                  </div>
                  
                  {/* Résumé du contrat en temps réel */}
                  {(contractForm.startDate || contractForm.endDate || contractForm.salary) && (
                    <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">Résumé du Contrat</h4>
                      <div className="space-y-2">
                        {contractForm.startDate && formatDateForDisplay(contractForm.startDate) && (
                          <p className="text-sm text-indigo-700">
                            <strong>Début :</strong> {formatDateForDisplay(contractForm.startDate)}
                          </p>
                        )}
                        {contractForm.endDate && formatDateForDisplay(contractForm.endDate) && (
                          <p className="text-sm text-indigo-700">
                            <strong>Fin :</strong> {formatDateForDisplay(contractForm.endDate)}
                          </p>
                        )}
                        {contractForm.startDate && contractForm.endDate && (
                          <p className="text-sm text-indigo-700">
                            <strong>Durée :</strong> {calculateContractDuration(contractForm.startDate, contractForm.endDate)}
                          </p>
                        )}
                        {contractForm.salary && (
                          <p className="text-sm text-indigo-700">
                            <strong>Salaire :</strong> {formatAmount(parseInt(contractForm.salary))}
                          </p>
                        )}
                        <p className="text-xs text-indigo-600 mt-3 p-3 bg-white rounded-xl">
                          💡 {getContractTypeRules(contractForm.type).helpText}
                        </p>
                      </div>
                    </div>
                  )}
                </form>
              </HRModal>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="text-left py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                      <th className="text-left py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Début</th>
                      <th className="text-left py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fin</th>
                      <th className="text-left py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Salaire de Base</th>
                      <th className="text-left py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                      <th className="text-right py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contract ? (
                      <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-6">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            contract.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' :
                            contract.status === 'SUSPENDED' ? 'bg-amber-50 text-amber-600' :
                            contract.status === 'TERMINATED' ? 'bg-red-50 text-red-600' :
                            'bg-slate-50 text-slate-600'
                          }`}>
                            {contract.contractType || contract.type || 'N/A'}
                          </span>
                        </td>
                        <td className="py-6 text-sm font-bold text-slate-900">{contract.startDate ? new Date(contract.startDate).toLocaleDateString('fr-FR') : 'N/A'}</td>
                        <td className="py-6 text-sm font-bold text-slate-500">{contract.endDate ? new Date(contract.endDate).toLocaleDateString('fr-FR') : 'Indéterminé'}</td>
                        <td className="py-6 text-sm font-black text-slate-900">{contract.salary ? formatAmount(contract.salary, contract.currency) : 'Confidentiel'}</td>
                        <td className="py-6">
                          <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${
                            contract.status === 'ACTIVE' ? 'text-emerald-500' :
                            contract.status === 'SUSPENDED' ? 'text-amber-500' :
                            contract.status === 'TERMINATED' ? 'text-red-500' :
                            'text-slate-500'
                          }`}>
                            <CheckCircle2 size={14} /> 
                            {contract.status === 'ACTIVE' ? 'Actif' : 
                             contract.status === 'SUSPENDED' ? 'Suspendu' :
                             contract.status === 'TERMINATED' ? 'Résilié' : contract.status}
                          </span>
                        </td>
                        <td className="py-6 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            {contract.status === 'ACTIVE' && (
                              <>
                                <button 
                                  onClick={() => {
                                    resetSuspensionForm();
                                    setSelectedContract(contract);
                                    setIsSuspendModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-amber-100 transition-all"
                                >
                                  Suspendre
                                </button>
                                <button 
                                  onClick={() => {
                                    resetTerminationForm();
                                    setSelectedContract(contract);
                                    setIsTerminateModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-100 transition-all"
                                >
                                  Résilier
                                </button>
                              </>
                            )}
                            {contract.status === 'SUSPENDED' && (
                              <button 
                                onClick={() => handleReactivateContract(contract.id)}
                                className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-100 transition-all"
                              >
                                Réactiver
                              </button>
                            )}
                            <button className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                              <Download size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center">
                              <FileText size={32} />
                            </div>
                            <div>
                              <p className="text-lg font-bold text-slate-900 mb-1">Aucun contrat trouvé</p>
                              <p className="text-sm text-slate-500">Créez le premier contrat pour cet employé.</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Termination Modal */}
              <HRModal
                isOpen={isTerminateModalOpen}
                onClose={() => {
                  setIsTerminateModalOpen(false);
                  resetTerminationForm();
                  setSelectedContract(null);
                }}
                title="Résilier le Contrat"
                size="md"
                footer={
                  <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        resetTerminationForm();
                        setSelectedContract(null);
                        setIsTerminateModalOpen(false);
                      }}
                      className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={handleTerminateContract}
                      disabled={terminationForm.reason.trim().length < 10}
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirmer la Résiliation
                    </button>
                  </div>
                }
              >
                <div className="space-y-6">
                  <div className="text-center p-6 bg-red-50 rounded-2xl">
                    <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-red-900 mb-2">Attention</h3>
                    <p className="text-sm text-red-700">Cette action va résilier définitivement le contrat. Cette opération ne peut pas être annulée.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Raison de la résiliation <span className="text-red-500">*</span></label>
                    <textarea 
                      value={terminationForm.reason}
                      onChange={(e) => setTerminationForm({ reason: e.target.value })}
                      placeholder="Décrivez la raison de la résiliation (minimum 10 caractères)..."
                      rows={4}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-red-500 transition-all font-medium text-sm resize-none"
                    />
                    <p className="text-xs text-slate-500 mt-2">{terminationForm.reason.length}/10 minimum</p>
                  </div>
                </div>
              </HRModal>

              {/* Suspension Modal */}
              <HRModal
                isOpen={isSuspendModalOpen}
                onClose={() => {
                  setIsSuspendModalOpen(false);
                  resetSuspensionForm();
                  setSelectedContract(null);
                }}
                title="Suspendre le Contrat"
                size="md"
                footer={
                  <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        resetSuspensionForm();
                        setSelectedContract(null);
                        setIsSuspendModalOpen(false);
                      }}
                      className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={handleSuspendContract}
                      disabled={suspensionForm.reason.trim().length < 10}
                      className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirmer la Suspension
                    </button>
                  </div>
                }
              >
                <div className="space-y-6">
                  <div className="text-center p-6 bg-amber-50 rounded-2xl">
                    <AlertCircle size={48} className="text-amber-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-amber-900 mb-2">Suspension Temporaire</h3>
                    <p className="text-sm text-amber-700">Le contrat sera suspendu temporairement. Il pourra être réactivé ultérieurement.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Raison de la suspension <span className="text-red-500">*</span></label>
                    <textarea 
                      value={suspensionForm.reason}
                      onChange={(e) => setSuspensionForm({ reason: e.target.value })}
                      placeholder="Décrivez la raison de la suspension (minimum 10 caractères)..."
                      rows={4}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all font-medium text-sm resize-none"
                    />
                    <p className="text-xs text-slate-500 mt-2">{suspensionForm.reason.length}/10 minimum</p>
                  </div>
                </div>
              </HRModal>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                  <History className="text-indigo-500" /> Timeline Carrière
                </h3>
                <button 
                  onClick={() => employee?.id && loadCareerTimeline(employee.id)}
                  disabled={loadingTimeline}
                  className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                >
                  {loadingTimeline ? (
                    <><RefreshCw className="animate-spin" size={16} /> Actualisation...</>
                  ) : (
                    <><RefreshCw size={16} /> Actualiser Timeline</>
                  )}
                </button>
              </div>
              
              {/* Salaire du Mois En Cours */}
              <div className="mb-10 p-8 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-[2.5rem] border border-indigo-100">
                <h4 className="text-sm font-black uppercase tracking-widest text-indigo-900 mb-6 flex items-center gap-2">
                  <CreditCard className="text-indigo-600" /> Salaire du Mois ({new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })})
                </h4>
                
                {loadingSalary ? (
                  <div className="flex items-center gap-3 text-indigo-600">
                    <RefreshCw className="animate-spin" size={16} />
                    <span className="text-sm font-medium">Calcul en cours...</span>
                  </div>
                ) : currentMonthSalary ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Salaire Base</p>
                      <p className="text-xl font-black text-slate-900">{formatAmount(currentMonthSalary.baseSalary, currentMonthSalary.currency)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Primes ({currentMonthSalary.primesCount})</p>
                      <p className="text-xl font-black text-emerald-600">+{formatAmount(currentMonthSalary.totalPrimes, currentMonthSalary.currency)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Avances ({currentMonthSalary.advancesCount})</p>
                      <p className="text-xl font-black text-red-600">-{formatAmount(currentMonthSalary.totalAdvances, currentMonthSalary.currency)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Net à Payer</p>
                      <p className="text-2xl font-black text-indigo-900">{formatAmount(currentMonthSalary.netSalary, currentMonthSalary.currency)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="text-amber-500 mx-auto mb-2" size={24} />
                    <p className="text-sm font-medium text-slate-600">
                      {contract ? 'Impossible de calculer le salaire du mois' : 'Aucun contrat actif'}
                    </p>
                  </div>
                )}
                
                {/* Détails des déductions d'avances si présentes */}
                {currentMonthSalary?.advanceDetails && currentMonthSalary.advanceDetails.length > 0 && (
                  <div className="mt-6 p-6 bg-red-50 rounded-[2rem] border border-red-100">
                    <h5 className="text-sm font-black uppercase tracking-widest text-red-900 mb-4 flex items-center gap-2">
                      <TrendingDown className="text-red-600" size={16} /> Déductions Avances ce Mois
                    </h5>
                    <div className="space-y-3">
                      {currentMonthSalary.advanceDetails.map((advance: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-white rounded-xl border border-red-100">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900">{advance.reason}</p>
                            <p className="text-xs text-slate-500">
                              Reste {advance.remainingMonths} mois • Total: {formatAmount(advance.totalAmount, currentMonthSalary.currency)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-red-600">-{formatAmount(advance.monthlyAmount, currentMonthSalary.currency)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Détails des primes si présentes */}
                {currentMonthSalary?.primeDetails && currentMonthSalary.primeDetails.length > 0 && (
                  <div className="mt-6 p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                    <h5 className="text-sm font-black uppercase tracking-widest text-emerald-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="text-emerald-600" size={16} /> Primes ce Mois
                    </h5>
                    <div className="space-y-3">
                      {currentMonthSalary.primeDetails.map((prime: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-white rounded-xl border border-emerald-100">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900">{prime.reason}</p>
                            <p className="text-xs text-slate-500">
                              Type: {prime.type} • Accordée le {new Date(prime.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-emerald-600">+{formatAmount(prime.amount, currentMonthSalary.currency)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {loadingTimeline ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex items-center gap-3 text-slate-500">
                    <RefreshCw className="animate-spin" size={20} />
                    <span className="font-medium">Chargement de l'historique...</span>
                  </div>
                </div>
              ) : careerTimeline.length > 0 ? (
                <div className="relative space-y-8 before:absolute before:left-8 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {careerTimeline.map((event: any) => {
                    // Icônes selon le type d'événement
                    const getEventIcon = (type: string) => {
                      switch (type) {
                        case 'CONTRACT_START':
                          return event.isRenewal ? 
                            <RefreshCw className="text-emerald-500" /> : 
                            <FileText className="text-indigo-500" />;
                        case 'CONTRACT_MODIFICATION':
                          return <Edit3 className="text-blue-500" />;
                        case 'CONTRACT_END':
                          return <Clock className="text-slate-500" />;
                        case 'CONTRACT_TERMINATED':
                          return <X className="text-red-500" />;
                        case 'CONTRACT_SUSPENDED':
                          return <AlertCircle className="text-amber-500" />;
                        case 'CONTRACT_RENEWED':
                          return <RefreshCw className="text-emerald-500" />;
                        case 'ADVANCE':
                          return <CreditCard className="text-blue-600" />;
                        case 'PRIME':
                          return <TrendingUp className="text-emerald-600" />;
                        default:
                          return <FileText className="text-slate-500" />;
                      }
                    };
                    
                    // Couleurs selon le type d'événement  
                    const getEventColor = (type: string) => {
                      switch (type) {
                        case 'CONTRACT_START':
                          return event.isRenewal ? 'border-emerald-200 bg-emerald-50' : 'border-indigo-200 bg-indigo-50';
                        case 'CONTRACT_MODIFICATION':
                          return 'border-blue-200 bg-blue-50';
                        case 'CONTRACT_TERMINATED':
                          return 'border-red-200 bg-red-50';
                        case 'CONTRACT_SUSPENDED':
                          return 'border-amber-200 bg-amber-50';
                        case 'CONTRACT_RENEWED':
                          return 'border-emerald-200 bg-emerald-50';
                        case 'ADVANCE':
                          return 'border-blue-200 bg-blue-50';
                        case 'PRIME':
                          return 'border-emerald-200 bg-emerald-50';
                        default:
                          return 'border-slate-200 bg-slate-50';
                      }
                    };
                    
                    return (
                      <div key={event.id} className="relative pl-20">
                        <div className={`absolute left-0 w-16 h-16 border-4 rounded-2xl flex items-center justify-center shadow-sm z-10 ${getEventColor(event.type)}`}>
                          {getEventIcon(event.type)}
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                {new Date(event.date).toLocaleDateString('fr-FR', { 
                                  day: '2-digit', 
                                  month: 'long', 
                                  year: 'numeric' 
                                })}
                              </p>
                              <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                {event.title}
                              </h4>
                            </div>
                            {/* Affichage du montant selon le type d'événement */}
                            {(event.salary || event.amount) && (
                              <div className="text-right">
                                <p className="text-xs font-bold text-slate-500 uppercase">
                                  {event.type === 'ADVANCE' ? 'Montant Avance' :
                                   event.type === 'PRIME' ? 'Montant Prime' :
                                   'Salaire'}
                                </p>
                                <p className="text-sm font-black text-indigo-600">
                                  {formatAmount(event.amount || event.salary, event.currency)}
                                </p>
                                {event.type === 'ADVANCE' && event.months > 1 && (
                                  <p className="text-xs text-slate-500 font-medium">
                                    {event.months} mois • Total: {formatAmount(event.amount * event.months, event.currency)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 font-medium leading-relaxed mb-3">
                            {event.description}
                          </p>
                          
                          {/* Informations additionnelles selon le type */}
                          <div className="flex items-center gap-4 text-xs flex-wrap">
                            {/* Affichage pour les contrats */}
                            {event.type.startsWith('CONTRACT') && (
                              <>
                                <span className={`px-3 py-1 rounded-full font-bold uppercase tracking-wide ${
                                  event.contractType === 'CDI' ? 'bg-emerald-100 text-emerald-700' :
                                  event.contractType === 'CDD' ? 'bg-blue-100 text-blue-700' :
                                  event.contractType === 'STAGE' ? 'bg-purple-100 text-purple-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {event.contractType || 'N/A'}
                                </span>
                                <span className={`px-3 py-1 rounded-full font-bold uppercase tracking-wide ${
                                  event.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                                  event.status === 'TERMINATED' ? 'bg-red-100 text-red-700' :
                                  event.status === 'SUSPENDED' ? 'bg-amber-100 text-amber-700' :
                                  event.status === 'RENEWED' ? 'bg-indigo-100 text-indigo-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {event.status === 'ACTIVE' ? 'Actif' :
                                   event.status === 'TERMINATED' ? 'Résilié' :
                                   event.status === 'SUSPENDED' ? 'Suspendu' :
                                   event.status === 'RENEWED' ? 'Renouvelé' :
                                   event.status || 'N/A'}
                                </span>
                                {event.isRenewal && (
                                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold uppercase tracking-wide">
                                    ✨ Renouvellement
                                  </span>
                                )}
                              </>
                            )}
                            
                            {/* Affichage pour les avances */}
                            {event.type === 'ADVANCE' && (
                              <>
                                <span className={`px-3 py-1 rounded-full font-bold uppercase tracking-wide ${
                                  event.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                  event.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {event.status === 'APPROVED' ? '✓ Approuvée' :
                                   event.status === 'REJECTED' ? '✗ Refusée' :
                                   '⏳ En attente'}
                                </span>
                                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold uppercase tracking-wide">
                                  💰 Avance sur salaire
                                </span>
                                {event.months > 1 && (
                                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold uppercase tracking-wide">
                                    📅 {event.months} mois
                                  </span>
                                )}
                              </>
                            )}
                            
                            {/* Affichage pour les primes */}
                            {event.type === 'PRIME' && (
                              <>
                                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold uppercase tracking-wide">
                                  🎉 Prime accordée
                                </span>
                                <span className={`px-3 py-1 rounded-full font-bold uppercase tracking-wide ${
                                  event.primeType === 'PERFORMANCE' ? 'bg-indigo-100 text-indigo-700' :
                                  event.primeType === 'EXCEPTIONAL' ? 'bg-purple-100 text-purple-700' :
                                  event.primeType === 'ANNUAL_BONUS' ? 'bg-orange-100 text-orange-700' :
                                  event.primeType === 'PROJECT_BONUS' ? 'bg-cyan-100 text-cyan-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {event.primeType === 'PERFORMANCE' ? '⭐ Performance' :
                                   event.primeType === 'EXCEPTIONAL' ? '🏆 Exceptionnelle' :
                                   event.primeType === 'ANNUAL_BONUS' ? '📅 Annuelle' :
                                   event.primeType === 'PROJECT_BONUS' ? '🚀 Projet' :
                                   event.primeType}
                                </span>
                                {event.details?.isPaid && (
                                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold uppercase tracking-wide">
                                    ✅ Payée
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          
                          {/* Détails complémentaires */}
                          {event.type === 'ADVANCE' && event.details?.rejectionReason && (
                            <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
                              <p className="text-xs font-bold text-red-700 mb-1 uppercase">Raison du refus</p>
                              <p className="text-sm text-red-800 font-medium">{event.details.rejectionReason}</p>
                            </div>
                          )}
                          
                          {event.type === 'PRIME' && event.details?.payrollMonth && (
                            <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                              <p className="text-xs font-bold text-emerald-700 mb-1 uppercase">Mois de paie</p>
                              <p className="text-sm text-emerald-800 font-medium">{event.details.payrollMonth}</p>
                            </div>
                          )}
                          
                          {/* Raison du renouvellement si applicable */}
                          {event.renewalReason && (
                            <div className="mt-4 p-3 bg-white rounded-xl border border-emerald-100">
                              <p className="text-xs font-bold text-emerald-700 mb-1 uppercase">Raison du renouvellement</p>
                              <p className="text-sm text-emerald-800 font-medium">{event.renewalReason}</p>
                            </div>
                          )}
                          
                          {/* Détails des modifications si applicable */}
                          {event.isModification && event.changes && (
                            <div className="mt-4 p-4 bg-white rounded-xl border border-blue-100">
                              <p className="text-xs font-bold text-blue-700 mb-3 uppercase">Changements effectués</p>
                              <div className="space-y-2">
                                {event.changes.map((change: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-3 text-xs">
                                    <span className="font-medium text-slate-700 min-w-20">
                                      {change.field === 'type' ? 'Type' :
                                       change.field === 'salary' ? 'Salaire' :
                                       change.field === 'startDate' ? 'Début' :
                                       change.field === 'endDate' ? 'Fin' :
                                       change.field === 'workLocation' ? 'Lieu' :
                                       change.field}:
                                    </span>
                                    <div className="flex items-center gap-2 flex-1">
                                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-medium">
                                        {change.oldValue || 'Non défini'}
                                      </span>
                                      <span>→</span>
                                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                                        {change.newValue || 'Non défini'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {event.modifiedBy && (
                                <p className="text-xs text-slate-500 mt-3 italic">
                                  Modifié par: {event.modifiedBy}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <History className="text-slate-400" size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-700 mb-2">Aucun historique disponible</h4>
                  <p className="text-slate-500 max-w-md mx-auto">
                    L'historique des contrats et renouvellements apparaîtra ici une fois que des données seront disponibles.
                  </p>
                  <button 
                    onClick={() => employee?.id && loadCareerTimeline(employee.id)}
                    className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all"
                  >
                    Actualiser
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                  <FolderOpen className="text-indigo-500" /> Dossier Numérique
                </h3>
                <button 
                  onClick={() => setIsDocModalOpen(true)}
                  className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
                >
                  <Plus size={16} /> Ajouter Document
                </button>
              </div>

              {/* Document Modal */}
              <HRModal 
                isOpen={isDocModalOpen} 
                onClose={() => {
                  setIsDocModalOpen(false);
                  resetDocForm();
                }} 
                title="Ajouter un Document"
                size="md"
                footer={
                  <div className="flex justify-end gap-4">
                    <button 
                      onClick={() => {
                        setIsDocModalOpen(false);
                        resetDocForm();
                      }} 
                      className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={handleAddDoc}
                      disabled={isUploadingDoc || !docForm.name.trim() || !docForm.file}
                      className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingDoc ? 'Upload...' : 'Uploader'}
                    </button>
                  </div>
                }
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom du Document <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      placeholder="Ex: CNI_Recto.pdf" 
                      value={docForm.name}
                      onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type de Document <span className="text-red-500">*</span></label>
                    <select 
                      value={docForm.type}
                      onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm"
                    >
                      <option value="ID_CARD">Pièce d'Identité</option>
                      <option value="CONTRACT">Contrat</option>
                      <option value="DIPLOMA">Diplôme</option>
                      <option value="BANK_DETAILS">RIB/Compte Bancaire</option>
                      <option value="MEDICAL">Certificat Médical</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Catégorie (optionnel)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: CNI, Passeport, Permis..." 
                      value={docForm.category}
                      onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm" 
                    />
                  </div>
                  
                  {/* File Upload Area */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fichier <span className="text-red-500">*</span></label>
                    <input 
                      type="file" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                      disabled={isUploadingDoc}
                      className="hidden" 
                      id="documentUpload"
                    />
                    <label 
                      htmlFor="documentUpload"
                      className={`p-10 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-center hover:border-indigo-500 transition-all cursor-pointer group ${
                        isUploadingDoc ? 'opacity-50 cursor-not-allowed' : ''
                      } ${
                        docForm.file ? 'border-emerald-300 bg-emerald-50' : ''
                      }`}
                    >
                      {docForm.file ? (
                        <div className="text-center">
                          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 text-2xl">
                            {getFileIcon(docForm.file.type)}
                          </div>
                          <p className="text-sm font-bold text-emerald-700 mb-1">{docForm.file.name}</p>
                          <p className="text-xs font-medium text-emerald-600">{formatFileSize(docForm.file.size)}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Cliquez pour changer</p>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4 group-hover:scale-110 transition-transform">
                            <Plus size={32} />
                          </div>
                          <p className="text-xs font-bold text-slate-500">Cliquez pour sélectionner un fichier</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">PDF, JPG, PNG (Max 10MB)</p>
                        </>
                      )}
                    </label>
                  </div>
                  
                  {/* File Preview for Images */}
                  {docForm.file && docForm.file.type.startsWith('image/') && (
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Aperçu</p>
                      <div className="w-full h-40 bg-white rounded-xl overflow-hidden border border-slate-100">
                        <img 
                          src={URL.createObjectURL(docForm.file)} 
                          alt="Aperçu" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </HRModal>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.length > 0 ? documents.map((doc) => (
                  <div key={doc.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-indigo-200 transition-all group">
                    <div className="flex items-start justify-between mb-6">
                      <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                        doc.type === 'CONTRACT' ? 'bg-blue-50 text-blue-600' :
                        doc.type === 'ID_CARD' ? 'bg-green-50 text-green-600' :
                        doc.type === 'DIPLOMA' ? 'bg-purple-50 text-purple-600' :
                        doc.type === 'BANK_DETAILS' ? 'bg-amber-50 text-amber-600' :
                        doc.type === 'MEDICAL' ? 'bg-red-50 text-red-600' :
                        'bg-slate-50 text-slate-600'
                      }`}>
                        {doc.type === 'CONTRACT' ? 'Contrat' :
                         doc.type === 'ID_CARD' ? 'Identité' :
                         doc.type === 'DIPLOMA' ? 'Diplôme' :
                         doc.type === 'BANK_DETAILS' ? 'Bancaire' :
                         doc.type === 'MEDICAL' ? 'Médical' :
                         'Autre'}
                        {doc.category && (
                          <span className="ml-2 opacity-75">• {doc.category}</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handlePreviewDoc(doc)}
                          className="w-8 h-8 bg-white border border-slate-100 rounded-xl flex items-center gap-1 justify-center text-slate-400 hover:text-indigo-600 transition-all px-2"
                          title="Prévisualiser"
                        >
                          👁
                        </button>
                        <button 
                          onClick={() => handleDownloadDoc(doc)}
                          className="w-8 h-8 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-all"
                          title="Télécharger"
                        >
                          <Download size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteDoc(doc)}
                          className="w-8 h-8 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 transition-all"
                          title="Supprimer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Preview pour images */}
                    {doc.mimeType && doc.mimeType.startsWith('image/') && (
                      <div className="w-full h-32 bg-white rounded-xl overflow-hidden border border-slate-100 mb-4">
                        <img 
                          src={doc.fileUrl} 
                          alt={doc.name}
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => handlePreviewDoc(doc)}
                        />
                      </div>
                    )}
                    
                    {/* Icon pour PDF */}
                    {doc.mimeType && doc.mimeType.includes('pdf') && (
                      <div className="w-full h-32 bg-white rounded-xl border border-slate-100 mb-4 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-all"
                           onClick={() => handlePreviewDoc(doc)}>
                        <div className="text-center">
                          <div className="text-4xl mb-2">📄</div>
                          <p className="text-xs font-bold text-slate-500">Document PDF</p>
                          <p className="text-[9px] text-slate-400 mt-1">Cliquer pour prévisualiser</p>
                        </div>
                      </div>
                    )}
                    
                    <h4 className="text-sm font-black text-slate-900 truncate mb-1">{doc.name}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {doc.fileSize ? formatFileSize(doc.fileSize) : 'N/A'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('fr-FR') : 'N/A'}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                      <FolderOpen size={40} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-2">Aucun document</h3>
                    <p className="text-slate-500 font-medium text-sm mb-6">Ajoutez le premier document à ce dossier employé.</p>
                    <button 
                      onClick={() => setIsDocModalOpen(true)}
                      className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl"
                    >
                      <Plus size={16} className="mr-2" /> Ajouter un Document
                    </button>
                  </div>
                )}
              </div>
              
              {/* Modal de Prévisualisation */}
              <HRModal 
                isOpen={isPreviewModalOpen} 
                onClose={() => {
                  setIsPreviewModalOpen(false);
                  setPreviewDoc(null);
                }} 
                title={`Prévisualisation - ${previewDoc?.name || 'Document'}`}
                size="xl"
                footer={
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-500">
                        {previewDoc?.fileSize ? formatFileSize(previewDoc.fileSize) : 'N/A'} • 
                        {previewDoc?.uploadedAt ? new Date(previewDoc.uploadedAt).toLocaleDateString('fr-FR') : 'Date inconnue'}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => previewDoc && handleDownloadDoc(previewDoc)}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all"
                      >
                        <Download size={16} /> Télécharger
                      </button>
                      <button 
                        onClick={() => previewDoc?.fileUrl && window.open(previewDoc.fileUrl, '_blank')}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all"
                      >
                        Ouvrir dans un nouvel onglet
                      </button>
                      <button 
                        onClick={() => {
                          setIsPreviewModalOpen(false);
                          setPreviewDoc(null);
                        }}
                        className="px-6 py-3 border border-slate-200 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                }
              >
                {previewDoc && (
                  <div className="space-y-4">
                    {/* Informations du document */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-slate-900 mb-2">{previewDoc.name}</h4>
                          <div className="flex items-center gap-6 text-sm text-slate-600">
                            <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                              previewDoc.type === 'CONTRACT' ? 'bg-blue-50 text-blue-600' :
                              previewDoc.type === 'ID_CARD' ? 'bg-green-50 text-green-600' :
                              previewDoc.type === 'DIPLOMA' ? 'bg-purple-50 text-purple-600' :
                              previewDoc.type === 'BANK_DETAILS' ? 'bg-amber-50 text-amber-600' :
                              previewDoc.type === 'MEDICAL' ? 'bg-red-50 text-red-600' :
                              'bg-slate-50 text-slate-600'
                            }`}>
                              {previewDoc.type === 'CONTRACT' ? 'Contrat' :
                               previewDoc.type === 'ID_CARD' ? 'Identité' :
                               previewDoc.type === 'DIPLOMA' ? 'Diplôme' :
                               previewDoc.type === 'BANK_DETAILS' ? 'Bancaire' :
                               previewDoc.type === 'MEDICAL' ? 'Médical' :
                               'Autre'}
                            </span>
                            {previewDoc.category && (
                              <span className="text-slate-500">Catégorie : {previewDoc.category}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Zone de prévisualisation */}
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                      {previewDoc.mimeType && previewDoc.mimeType.startsWith('image/') && (
                        <div className="w-full flex items-center justify-center bg-slate-50 p-4">
                          <img 
                            src={previewDoc.fileUrl} 
                            alt={previewDoc.name}
                            className="max-w-full max-h-96 object-contain rounded-xl shadow-lg"
                            style={{ maxHeight: '500px' }}
                          />
                        </div>
                      )}
                      
                      {previewDoc.mimeType && previewDoc.mimeType.includes('pdf') && (
                        <div className="w-full">
                          <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">📄</div>
                              <div>
                                <p className="font-bold text-slate-900">Document PDF</p>
                                <p className="text-xs text-slate-500">Utilisez les contrôles ci-dessous pour naviguer</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => window.open(previewDoc.fileUrl, '_blank')}
                              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all flex items-center gap-2"
                            >
                              <ExternalLink size={14} /> Ouvrir dans un nouvel onglet
                            </button>
                          </div>
                          <div className="relative" style={{ height: '70vh' }}>
                            <iframe 
                              src={previewDoc.fileUrl}
                              title={previewDoc.name}
                              className="w-full h-full border-0"
                              style={{ minHeight: '500px' }}
                              onError={(e) => {
                                console.error('Erreur de chargement PDF:', e);
                              }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Fallback pour autres types de fichiers */}
                      {previewDoc.mimeType && !previewDoc.mimeType.startsWith('image/') && !previewDoc.mimeType.includes('pdf') && (
                        <div className="w-full h-64 flex items-center justify-center bg-slate-50">
                          <div className="text-center">
                            <div className="text-4xl mb-4">📎</div>
                            <p className="text-lg font-bold text-slate-900 mb-2">Prévisualisation non disponible</p>
                            <p className="text-sm text-slate-500 mb-4">Ce type de fichier ne peut pas être prévisualisé directement.</p>
                            <button 
                              onClick={() => window.open(previewDoc.fileUrl, '_blank')}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all"
                            >
                              Ouvrir le fichier
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}              </HRModal>
              
              {/* Modal de Confirmation de Suppression */}
              <HRModal 
                isOpen={isDeleteModalOpen} 
                onClose={() => {
                  setIsDeleteModalOpen(false);
                  setDocToDelete(null);
                }} 
                title="Supprimer le Document"
                size="md"
                footer={
                  <div className="flex gap-4 w-full">
                    <button 
                      onClick={() => {
                        setIsDeleteModalOpen(false);
                        setDocToDelete(null);
                      }}
                      className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={confirmDeleteDoc}
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg active:scale-95"
                    >
                      Supprimer Définitivement
                    </button>
                  </div>
                }
              >
                {docToDelete && (
                  <div className="space-y-6">
                    <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-100">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X size={32} className="text-red-600" />
                      </div>
                      <h3 className="text-lg font-bold text-red-900 mb-2">Attention !</h3>
                      <p className="text-sm text-red-700 mb-4">
                        Cette action va supprimer définitivement le document. 
                        <br />
                        Cette opération ne peut pas être annulée.
                      </p>
                    </div>
                    
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <div className="flex items-start gap-4">
                        <div className="text-3xl">{getFileIcon(docToDelete.mimeType || '')}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 truncate mb-2">
                            {docToDelete.name}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="px-2 py-1 bg-slate-200 rounded-lg font-medium">
                              {docToDelete.type?.replace('_', ' ')}
                            </span>
                            {docToDelete.category && (
                              <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-medium">
                                {docToDelete.category}
                              </span>
                            )}
                            <span className="text-slate-600 font-medium">
                              {formatFileSize(docToDelete.fileSize || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center p-4 bg-slate-100 rounded-2xl">
                      <p className="text-sm font-bold text-slate-700">
                        Êtes-vous sûr de vouloir supprimer ce document ?
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Cette action est irréversible et le fichier sera définitivement perdu.
                      </p>
                    </div>
                  </div>
                )}
              </HRModal>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="space-y-8">
              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                    <CreditCard className="text-indigo-500" /> Historique des Bulletins
                  </h3>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleGeneratePayslip}
                      disabled={isGeneratingPayslip || !hasActiveContract}
                      className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition-all ${
                        hasActiveContract && !isGeneratingPayslip 
                          ? 'bg-slate-900 text-white hover:bg-indigo-600' 
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                      title={!hasActiveContract ? 'Aucun contrat actif - Impossible de générer une fiche de paie' : ''}
                    >
                      {isGeneratingPayslip ? (
                        <><RefreshCw size={14} className="animate-spin" /> Génération...</>
                      ) : (
                        <><FileText size={14} /> Générer Fiche du Mois{!hasActiveContract && ' (Inactif)'}</>
                      )}
                    </button>
                    <select className="bg-slate-50 border-none rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-600 px-4 py-2 focus:ring-2 focus:ring-indigo-500">
                      <option>Année 2026</option>
                      <option>Année 2025</option>
                      <option>Année 2024</option>
                    </select>
                  </div>
                </div>

                {/* Avertissement si pas de contrat actif */}
                {!hasActiveContract && (
                  <div className="mb-8 flex items-start gap-4 p-6 bg-amber-50 rounded-2xl border border-amber-200">
                    <AlertCircle className="text-amber-500 shrink-0" size={20} />
                    <div>
                      <h4 className="font-black text-amber-800 uppercase text-xs tracking-widest mb-1">Aucun Contrat Actif</h4>
                      <p className="text-amber-700 text-sm font-medium">
                        Cet employé n'a pas de contrat actif. La génération de fiches de paie nécessite un contrat en statut "ACTIF".
                        {contracts.some(c => String(c.employeeId) === String(employeeId)) && (
                          <span className="block mt-2">
                            Vérifiez les contrats existants dans l'onglet "Contrats" ou créez un nouveau contrat actif.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Filtres et recherche */}
                <div className="mb-8 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Barre de recherche */}
                    <div className="md:col-span-2 relative">
                      <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Rechercher par mois, année, statut..."
                        value={payslipFilters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="w-full pl-12 pr-6 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                      />
                    </div>

                    {/* Filtre par mois */}
                    <div className="relative">
                      <select
                        value={payslipFilters.month}
                        onChange={(e) => handleFilterChange('month', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm appearance-none cursor-pointer"
                      >
                        <option value="">Tous les mois</option>
                        {getAvailableMonths().map(month => (
                          <option key={month} value={month}>
                            {new Date(month + '-01').toLocaleDateString('fr-FR', { 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </option>
                        ))}
                      </select>
                      <Filter size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Nombre d'éléments à afficher */}
                    <div className="relative">
                      <select
                        value={payslipFilters.displayCount}
                        onChange={(e) => handleFilterChange('displayCount', e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm appearance-none cursor-pointer"
                      >
                        <option value={5}>5 bulletins</option>
                        <option value={10}>10 bulletins</option>
                        <option value={25}>25 bulletins</option>
                        <option value="all">Tous</option>
                      </select>
                    </div>
                  </div>

                  {/* Indicateurs et bouton reset */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-500 font-medium">
                        {getFilteredPayslips().length} sur {payslips.length} bulletin{payslips.length > 1 ? 's' : ''}
                      </span>
                      {(payslipFilters.search || payslipFilters.month || payslipFilters.displayCount !== 10) && (
                        <button
                          onClick={resetFilters}
                          className="text-indigo-600 hover:text-indigo-700 font-black text-xs uppercase tracking-widest transition-all"
                        >
                          Réinitialiser filtres
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {getFilteredPayslips().length > 0 ? getFilteredPayslips().map((slip, i) => (
                    <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-slate-100">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                            {new Date(slip.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                          </p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Net à payer: {formatAmount(slip.netSalary)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                          slip.status === 'PAID' ? 'text-emerald-500 bg-emerald-50' : 
                          slip.status === 'PENDING' ? 'text-amber-500 bg-amber-50' : 
                          'text-slate-500 bg-slate-100'
                        }`}>
                          {slip.status === 'PAID' ? 'Payé' : slip.status === 'PENDING' ? 'En attente' : 'Brouillon'}
                        </span>
                        
                        {/* Dropdown pour les options de téléchargement */}
                        <div className="relative group">
                          <button 
                            disabled={downloadLoading === slip.month}
                            className="px-6 py-3 bg-white border border-slate-100 text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                          >
                            <Download size={14} />
                            {downloadLoading === slip.month ? 'Téléchargement...' : 'Télécharger'}
                          </button>
                          
                          <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                            <div className="p-2">
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-3 py-2 border-b border-slate-50">
                                Formats disponibles
                              </div>
                              
                              <button
                                onClick={() => handleDownloadPayslip(slip, 'pdf')}
                                className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors flex items-center gap-3"
                              >
                                <FileText size={16} className="text-red-500" />
                                <div>
                                  <div className="font-black uppercase tracking-tight">PDF</div>
                                  <div className="text-[10px] text-slate-400">Document officiel</div>
                                </div>
                              </button>
                              
                              <button
                                onClick={() => handleDownloadPayslip(slip, 'png')}
                                className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-3"
                              >
                                <Camera size={16} className="text-blue-500" />
                                <div>
                                  <div className="font-black uppercase tracking-tight">PNG</div>
                                  <div className="text-[10px] text-slate-400">Image haute qualité</div>
                                </div>
                              </button>
                              
                              <button
                                onClick={() => handleDownloadPayslip(slip, 'jpg')}
                                className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-green-50 hover:text-green-600 rounded-lg transition-colors flex items-center gap-3"
                              >
                                <Image size={16} className="text-green-500" />
                                <div>
                                  <div className="font-black uppercase tracking-tight">JPG</div>
                                  <div className="text-[10px] text-slate-400">Image compressée</div>
                                </div>
                              </button>
                              
                              <button
                                onClick={() => handleDownloadPayslip(slip, 'html')}
                                className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors flex items-center gap-3"
                              >
                                <Code size={16} className="text-indigo-500" />
                                <div>
                                  <div className="font-black uppercase tracking-tight">HTML</div>
                                  <div className="text-[10px] text-slate-400">Format web</div>
                                </div>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText size={24} className="text-slate-400" />
                      </div>
                      {payslips.length === 0 ? (
                        <>
                          <h3 className="text-lg font-bold text-slate-600 mb-2">Aucune fiche de paie</h3>
                          <p className="text-sm text-slate-500 mb-6">Aucune fiche de paie n'a encore été générée pour cet employé.</p>
                          <button 
                            onClick={handleGeneratePayslip}
                            disabled={isGeneratingPayslip}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isGeneratingPayslip ? 'Génération...' : 'Générer la première fiche'}
                          </button>
                        </>
                      ) : (
                        <>
                          <h3 className="text-lg font-bold text-slate-600 mb-2">Aucun résultat</h3>
                          <p className="text-sm text-slate-500 mb-6">Aucune fiche de paie ne correspond à vos critères de recherche.</p>
                          <button 
                            onClick={resetFilters}
                            className="px-6 py-3 bg-slate-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all shadow-lg active:scale-95"
                          >
                            Effacer les filtres
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                  <TrendingUp className="text-indigo-500" /> Primes & Avances
                </h3>
                
                {/* Statistiques Rapides */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="text-emerald-600" size={20} />
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Primes Total</p>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{formatAmount(getPrimeStats().totalAmount)}</p>
                    <p className="text-xs text-slate-500 mt-1">{getPrimeStats().total} prime(s)</p>
                  </div>
                  <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100">
                    <div className="flex items-center gap-3 mb-2">
                      <CreditCard className="text-indigo-600" size={20} />
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Avances Total</p>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{formatAmount(getAdvanceStats().totalAmount)}</p>
                    <p className="text-xs text-slate-500 mt-1">{getAdvanceStats().total} avance(s)</p>
                  </div>
                  <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="text-amber-600" size={20} />
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">En Attente</p>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{getAdvanceStats().pending}</p>
                    <p className="text-xs text-slate-500 mt-1">avance(s) pending</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <div className="flex items-center gap-3 mb-2">
                      <BarChart3 className="text-slate-600" size={20} />
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Moyenne Prime</p>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{Math.round(getPrimeStats().averageAmount).toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">F CFA par prime</p>
                  </div>
                </div>

                {/* Section Primes avec Filtres Avancés */}
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="text-emerald-500" size={18} />
                        Primes Exceptionnelles ({getFilteredPrimes().length})
                      </h4>
                      <button 
                        onClick={resetPrimeFilters}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-all"
                      >
                        Réinitialiser filtres
                      </button>
                    </div>

                    {/* Filtres Primes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-6 bg-slate-50 rounded-2xl">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">Recherche</label>
                        <input 
                          type="text"
                          placeholder="Raison, type ou montant..."
                          value={primeFilters.search}
                          onChange={(e) => handlePrimeFilterChange('search', e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">Type</label>
                        <select 
                          value={primeFilters.type}
                          onChange={(e) => handlePrimeFilterChange('type', e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        >
                          <option value="ALL">Tous les types</option>
                          <option value="PERFORMANCE">Performance</option>
                          <option value="EXCEPTIONAL">Exceptionnelle</option>
                          <option value="ANNUAL_BONUS">Prime annuelle</option>
                          <option value="PROJECT_BONUS">Prime de projet</option>
                          <option value="OTHER">Autre</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">Du</label>
                          <input 
                            type="date"
                            value={primeFilters.dateFrom}
                            onChange={(e) => handlePrimeFilterChange('dateFrom', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">Au</label>
                          <input 
                            type="date"
                            value={primeFilters.dateTo}
                            onChange={(e) => handlePrimeFilterChange('dateTo', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Liste des Primes */}
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {getFilteredPrimes().length > 0 ? (
                        getFilteredPrimes().map((prime) => (
                          <div key={prime.id} className="flex items-center justify-between p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl border border-emerald-100 hover:shadow-lg transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <TrendingUp className="text-emerald-600" size={20} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-widest">
                                    {prime.type}
                                  </span>
                                  <span className="text-sm font-bold text-slate-900">{formatAmount(prime.amount)}</span>
                                </div>
                                <p className="text-sm text-slate-600 max-w-md">{prime.reason}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {new Date(prime.createdAt).toLocaleDateString('fr-FR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-bold">
                                Accordée
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                          <h4 className="text-lg font-bold text-slate-600 mb-2">Aucune prime trouvée</h4>
                          <p className="text-slate-500 text-sm">Aucune prime ne correspond aux critères de filtrage.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section Avances avec Filtres Avancés */}
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <CreditCard className="text-indigo-500" size={18} />
                        Avances sur Salaire ({getFilteredAdvances().length})
                      </h4>
                      <button 
                        onClick={resetAdvanceFilters}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-all"
                      >
                        Réinitialiser filtres
                      </button>
                    </div>

                    {/* Filtres Avances */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-6 bg-slate-50 rounded-2xl">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">Recherche</label>
                        <input 
                          type="text"
                          placeholder="Raison ou montant..."
                          value={advanceFilters.search}
                          onChange={(e) => handleAdvanceFilterChange('search', e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">Statut</label>
                        <select 
                          value={advanceFilters.status}
                          onChange={(e) => handleAdvanceFilterChange('status', e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        >
                          <option value="ALL">Tous les statuts</option>
                          <option value="PENDING">En attente</option>
                          <option value="APPROVED">Approuvée</option>
                          <option value="REJECTED">Refusée</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">Du</label>
                          <input 
                            type="date"
                            value={advanceFilters.dateFrom}
                            onChange={(e) => handleAdvanceFilterChange('dateFrom', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">Au</label>
                          <input 
                            type="date"
                            value={advanceFilters.dateTo}
                            onChange={(e) => handleAdvanceFilterChange('dateTo', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">Montant Min</label>
                          <input 
                            type="number"
                            placeholder="0"
                            value={advanceFilters.amountMin}
                            onChange={(e) => handleAdvanceFilterChange('amountMin', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">Montant Max</label>
                          <input 
                            type="number"
                            placeholder="∞"
                            value={advanceFilters.amountMax}
                            onChange={(e) => handleAdvanceFilterChange('amountMax', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Liste des Avances */}
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {getFilteredAdvances().length > 0 ? (
                        getFilteredAdvances().map((advance) => (
                          <div key={advance.id} className={`flex items-center justify-between p-6 rounded-2xl border transition-all hover:shadow-lg ${
                            advance.status === 'APPROVED' ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100' :
                            advance.status === 'PENDING' ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-100' :
                            'bg-gradient-to-r from-red-50 to-rose-50 border-red-100'
                          }`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                advance.status === 'APPROVED' ? 'bg-emerald-100' :
                                advance.status === 'PENDING' ? 'bg-amber-100' :
                                'bg-red-100'
                              }`}>
                                <CreditCard className={`${
                                  advance.status === 'APPROVED' ? 'text-emerald-600' :
                                  advance.status === 'PENDING' ? 'text-amber-600' :
                                  'text-red-600'
                                }`} size={20} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-bold text-slate-900">{formatAmount(advance.amount)}</span>
                                  <span className="text-xs text-slate-500">× {advance.months} mois</span>
                                  <span className="text-xs font-bold text-slate-700">
                                    = {formatAmount(advance.amount * advance.months)} total
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600 max-w-md">{advance.reason}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                  Demandée le {new Date(advance.createdAt).toLocaleDateString('fr-FR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                advance.status === 'APPROVED' ? 'bg-emerald-600 text-white' :
                                advance.status === 'PENDING' ? 'bg-amber-600 text-white' :
                                'bg-red-600 text-white'
                              }`}>
                                {advance.status === 'APPROVED' ? 'Approuvée' :
                                 advance.status === 'PENDING' ? 'En attente' :
                                 'Refusée'}
                              </span>
                              {advance.status === 'APPROVED' && advance.approvedAt && (
                                <p className="text-xs text-slate-500 mt-1">
                                  Approuvée le {new Date(advance.approvedAt).toLocaleDateString('fr-FR')}
                                </p>
                              )}
                              {advance.status === 'REJECTED' && advance.rejectionReason && (
                                <p className="text-xs text-red-600 mt-1 max-w-xs">
                                  {advance.rejectionReason}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <CreditCard className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                          <h4 className="text-lg font-bold text-slate-600 mb-2">Aucune avance trouvée</h4>
                          <p className="text-slate-500 text-sm">Aucune avance ne correspond aux critères de filtrage.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-8">
              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-10 flex items-center gap-3">
                  <Activity className="text-indigo-500" /> Évaluation de la Performance
                </h3>
                <div className="grid lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Objectifs 2024</h4>
                    {[
                      { label: 'Développement Module Kernel', progress: 95, status: 'En cours' },
                      { label: 'Optimisation Base de Données', progress: 100, status: 'Terminé' },
                      { label: 'Mentorat Junior Developers', progress: 70, status: 'En cours' },
                    ].map((obj, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-900">{obj.label}</span>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${obj.status === 'Terminé' ? 'text-emerald-500' : 'text-indigo-500'}`}>{obj.status}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${obj.status === 'Terminé' ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${obj.progress}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-50 p-10 rounded-[3rem] flex flex-col items-center justify-center text-center">
                    <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mb-6 border border-slate-100">
                      <TrendingUp size={48} className="text-indigo-500" />
                    </div>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter mb-2">A+</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Score Global Performance</p>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs">
                      Moussa dépasse systématiquement les attentes techniques et fait preuve d'un leadership exemplaire.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                  <MessageSquare size={20} className="text-indigo-500" /> Feedback Continu
                </h3>
                <div className="space-y-6">
                  {[
                    { from: 'Awa Ndiaye', text: 'Excellente gestion de la crise sur le serveur de prod hier.', date: 'Hier' },
                    { from: 'Jean Koffi', text: 'Merci pour ton aide sur l\'intégration de l\'API Sales.', date: 'Il y a 3 jours' },
                  ].map((f, i) => (
                    <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{f.from}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{f.date}</span>
                      </div>
                      <p className="text-sm text-slate-500 font-medium italic">"{f.text}"</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          </>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const MessageSquare = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

export default EmployeeProfile;
