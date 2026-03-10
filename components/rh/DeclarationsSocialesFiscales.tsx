import React, { useState, useEffect } from 'react';
import { 
  FileCheck, 
  Plus, 
  Settings, 
  Building2,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Download,
  Eye,
  Edit,
  Trash2,
  Send,
  Calculator,
  BarChart3,
  Shield,
  Users,
  Globe,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HRModal from './HRModal';
import { api } from '../../services/api';

interface DeclarationsSocialesFiscalesProps {}

const DeclarationsSocialesFiscales: React.FC<DeclarationsSocialesFiscalesProps> = () => {
  // États principaux
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  
  // États pour les paramètres de l'entreprise
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    companyName: '',
    siret: '',
    nafCode: '',
    legalForm: 'SARL',
    collectiveAgreement: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Sénégal',
    ipresNumber: '',
    cssNumber: '',
    cfceNumber: '',
    taxNumber: '',
    vatNumber: '',
    taxRegime: 'RSI',
    ipresEmployeeRate: 5.6,
    ipresEmployerRate: 8.4,
    cssEmployeeRate: 3.5,
    cssEmployerRate: 7.0,
    cfceEmployerRate: 7.0,
    accidentWorkRate: 3.0,
    declarationDay: 15,
    responsibleName: '',
    responsibleEmail: '',
    responsiblePhone: ''
  });
  
  // États pour les déclarations
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [selectedDeclaration, setSelectedDeclaration] = useState<any>(null);
  const [isDeclarationModalOpen, setIsDeclarationModalOpen] = useState(false);
  const [isNewDeclarationModalOpen, setIsNewDeclarationModalOpen] = useState(false);
  
  // États pour les alertes
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');

  // Sous-onglets
  const subTabs = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: <BarChart3 size={16} /> },
    { id: 'declarations', label: 'Déclarations', icon: <FileCheck size={16} /> },
    { id: 'settings', label: 'Paramètres Entreprise', icon: <Building2 size={16} /> },
  ];

  // Chargement initial
  useEffect(() => {
    loadDashboard();
    loadCompanySettings();
    if (activeSubTab === 'declarations') {
      loadDeclarations();
    }
  }, [activeSubTab]);

  // === FONCTIONS DE CHARGEMENT ===

  const loadDashboard = async () => {
    try {
      const response = await api.get('/hr/declarations/dashboard');
      const data = response?.data || response || {};
      setDashboard(data);
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
      setDashboard(null);
    }
  };

  const loadCompanySettings = async () => {
    try {
      const response = await api.get('/hr/declarations/settings');
      const data = response?.data || response || null;
      setCompanySettings(data);
      
      // Remplir le formulaire si des données existent
      if (data) {
        setSettingsForm({
          companyName: data.companyName || '',
          siret: data.siret || '',
          nafCode: data.nafCode || '',
          legalForm: data.legalForm || 'SARL',
          collectiveAgreement: data.collectiveAgreement || '',
          address: data.address || '',
          city: data.city || '',
          postalCode: data.postalCode || '',
          country: data.country || 'Sénégal',
          ipresNumber: data.ipresNumber || '',
          cssNumber: data.cssNumber || '',
          cfceNumber: data.cfceNumber || '',
          taxNumber: data.taxNumber || '',
          vatNumber: data.vatNumber || '',
          taxRegime: data.taxRegime || 'RSI',
          ipresEmployeeRate: data.ipresEmployeeRate || 5.6,
          ipresEmployerRate: data.ipresEmployerRate || 8.4,
          cssEmployeeRate: data.cssEmployeeRate || 3.5,
          cssEmployerRate: data.cssEmployerRate || 7.0,
          cfceEmployerRate: data.cfceEmployerRate || 7.0,
          accidentWorkRate: data.accidentWorkRate || 3.0,
          declarationDay: data.declarationDay || 15,
          responsibleName: data.responsibleName || '',
          responsibleEmail: data.responsibleEmail || '',
          responsiblePhone: data.responsiblePhone || ''
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      setCompanySettings(null);
    }
  };

  const loadDeclarations = async () => {
    try {
      const response = await api.get('/hr/declarations');
      const data = response?.data || response || {};
      setDeclarations(Array.isArray(data) ? data : (data.declarations || []));
    } catch (error) {
      console.error('Erreur lors du chargement des déclarations:', error);
      setDeclarations([]);
    }
  };

  // === HANDLERS ===

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des champs obligatoires
    const requiredFields = {
      companyName: 'Nom de l\'entreprise',
      legalForm: 'Forme juridique',
      country: 'Pays',
      ipresEmployeeRate: 'Taux IPRES salarié',
      ipresEmployerRate: 'Taux IPRES employeur',
      cssEmployeeRate: 'Taux CSS salarié',
      cssEmployerRate: 'Taux CSS employeur',
      declarationDay: 'Jour de déclaration'
    };
    
    const errors = [];
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!settingsForm[field as keyof typeof settingsForm] || settingsForm[field as keyof typeof settingsForm] === '') {
        errors.push(label);
      }
    }
    
    if (errors.length > 0) {
      showAlertMessage(`Champs manquants: ${errors.join(', ')}`, 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      await api.put('/hr/declarations/settings', settingsForm);
      await loadCompanySettings();
      setIsSettingsModalOpen(false);
      showAlertMessage('Paramètres sauvegardés avec succès', 'success');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showAlertMessage('Erreur lors de la sauvegarde des paramètres', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMonthlyDeclarations = async () => {
    try {
      setIsLoading(true);
      const currentDate = new Date();
      const period = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      await api.post('/hr/declarations/generate-monthly', { period });
      await loadDeclarations();
      await loadDashboard();
      showAlertMessage('Déclarations mensuelles générées avec succès', 'success');
    } catch (error) {
      console.error('Erreur lors de la génération:', error);
      showAlertMessage('Erreur lors de la génération des déclarations', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showAlertMessage = (message: string, type: 'success' | 'error') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 4000);
  };

  // === RENDER FUNCTIONS ===

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Statistiques principales */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-[2rem] border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
                <FileCheck className="text-white" size={24} />
              </div>
              <span className="text-2xl font-black text-blue-600">{dashboard.statistics?.totalDeclarations || 0}</span>
            </div>
            <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Total Déclarations</p>
            <p className="text-xs text-slate-500">Cette année</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-[2rem] border border-emerald-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="text-white" size={24} />
              </div>
              <span className="text-2xl font-black text-emerald-600">{dashboard.statistics?.submissionRate || 0}%</span>
            </div>
            <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Taux de Soumission</p>
            <p className="text-xs text-slate-500">{dashboard.statistics?.submittedDeclarations} / {dashboard.statistics?.totalDeclarations}</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-[2rem] border border-amber-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center">
                <Clock className="text-white" size={24} />
              </div>
              <span className="text-2xl font-black text-amber-600">{dashboard.statistics?.pendingDeclarations || 0}</span>
            </div>
            <p className="text-sm font-black text-slate-700 uppercase tracking-tight">En Attente</p>
            <p className="text-xs text-slate-500">À traiter</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-rose-50 p-6 rounded-[2rem] border border-red-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="text-white" size={24} />
              </div>
              <span className="text-2xl font-black text-red-600">{dashboard.statistics?.overdueDeclarations || 0}</span>
            </div>
            <p className="text-sm font-black text-slate-700 uppercase tracking-tight">En Retard</p>
            <p className="text-xs text-slate-500">Action requise</p>
          </div>
        </div>
      )}

      {/* Actions rapides */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-3">
          <TrendingUp className="text-indigo-500" /> Actions Rapides
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={handleGenerateMonthlyDeclarations}
            disabled={isLoading}
            className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 flex items-center gap-3"
          >
            <Plus size={20} /> Générer Déclarations Mensuelles
          </button>
          
          <button 
            onClick={() => setActiveSubTab('settings')}
            className="p-6 bg-gradient-to-br from-slate-500 to-slate-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:from-slate-600 hover:to-slate-700 transition-all shadow-lg flex items-center gap-3"
          >
            <Settings size={20} /> Configurer Entreprise
          </button>
          
          <button 
            onClick={() => setActiveSubTab('declarations')}
            className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg flex items-center gap-3"
          >
            <FileCheck size={20} /> Voir Déclarations
          </button>
        </div>
      </div>
    </div>
  );

  const renderDeclarations = () => (
    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-10">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
          <FileCheck className="text-indigo-500" /> Liste des Déclarations
        </h3>
        <button 
          onClick={() => setIsNewDeclarationModalOpen(true)}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
        >
          <Plus size={16} /> Nouvelle Déclaration
        </button>
      </div>
      
      <div className="space-y-6">
        {declarations.length > 0 ? declarations.map((declaration: any) => {
          const statusColors = {
            'DRAFT': 'bg-slate-50 text-slate-600',
            'READY': 'bg-blue-50 text-blue-600',
            'SUBMITTED': 'bg-amber-50 text-amber-600',
            'VALIDATED': 'bg-emerald-50 text-emerald-600',
            'REJECTED': 'bg-red-50 text-red-600',
            'PAID': 'bg-green-50 text-green-600'
          };
          
          const statusLabels = {
            'DRAFT': 'Brouillon',
            'READY': 'Prêt',
            'SUBMITTED': 'Soumis',
            'VALIDATED': 'Validé',
            'REJECTED': 'Rejeté',
            'PAID': 'Payé'
          };
          
          return (
            <div key={declaration.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all group">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm group-hover:scale-110 transition-transform">
                  <FileCheck size={28} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{declaration.title}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {declaration.organisme} • {new Date(declaration.dueDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  statusColors[declaration.status as keyof typeof statusColors]
                }`}>
                  {statusLabels[declaration.status as keyof typeof statusLabels]}
                </span>
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-12">
            <FileCheck className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">Aucune déclaration trouvée</p>
            <p className="text-xs text-slate-400 mt-2">Cliquez sur "Nouvelle Déclaration" pour commencer</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-10">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
          <Building2 className="text-indigo-500" /> Paramètres de l'Entreprise
        </h3>
        <button 
          onClick={() => setIsSettingsModalOpen(true)}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
        >
          <Edit size={16} /> {companySettings ? 'Modifier' : 'Configurer'}
        </button>
      </div>
      
      {companySettings ? (
        <div className="space-y-8">
          {/* Informations générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-2xl">
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Building2 size={16} /> Informations Générales
                </h4>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nom de l'entreprise</p>
                    <p className="text-sm font-black text-slate-900">{companySettings.companyName || 'Non défini'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">SIRET</p>
                    <p className="text-sm font-black text-slate-900">{companySettings.siret || 'Non défini'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Code NAF</p>
                    <p className="text-sm font-black text-slate-900">{companySettings.nafCode || 'Non défini'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Forme juridique</p>
                    <p className="text-sm font-black text-slate-900">{companySettings.legalForm || 'Non défini'}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-2xl">
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Globe size={16} /> Organismes Sociaux
                </h4>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Numéro IPRES</p>
                    <p className="text-sm font-black text-slate-900">{companySettings.ipresNumber || 'Non défini'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Numéro CSS</p>
                    <p className="text-sm font-black text-slate-900">{companySettings.cssNumber || 'Non défini'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Numéro CFCE</p>
                    <p className="text-sm font-black text-slate-900">{companySettings.cfceNumber || 'Non défini'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Taux de cotisations */}
          <div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calculator size={16} /> Taux de Cotisations
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">IPRES Salarié</p>
                <p className="text-lg font-black text-indigo-600">{companySettings.ipresEmployeeRate || 5.6}%</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">IPRES Employeur</p>
                <p className="text-lg font-black text-indigo-600">{companySettings.ipresEmployerRate || 8.4}%</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">CSS Salarié</p>
                <p className="text-lg font-black text-indigo-600">{companySettings.cssEmployeeRate || 3.5}%</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">CSS Employeur</p>
                <p className="text-lg font-black text-indigo-600">{companySettings.cssEmployerRate || 7.0}%</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500 font-medium">Paramètres non configurés</p>
          <p className="text-xs text-slate-400 mt-2">Cliquez sur "Configurer" pour définir les informations de votre entreprise</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Alert */}
      <AnimatePresence>
        {showAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-8 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 font-black uppercase text-[10px] tracking-widest ${
              alertType === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {alertType === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            {alertMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Configuration Entreprise */}
      <HRModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Configuration de l'Entreprise"
        size="xl"
        footer={
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl disabled:opacity-50"
            >
              {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveSettings} className="space-y-8">
          {/* Informations générales */}
          <div className="p-6 bg-slate-50 rounded-2xl">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Building2 size={16} /> Informations Générales
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Nom de l'entreprise *
                </label>
                <input
                  type="text"
                  value={settingsForm.companyName}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, companyName: e.target.value }))}
                  className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    !settingsForm.companyName ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  placeholder="Nom complet de l'entreprise"
                  required
                />
                {!settingsForm.companyName && (
                  <p className="text-xs text-red-500 mt-1">Ce champ est obligatoire</p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Forme juridique *
                </label>
                <select
                  value={settingsForm.legalForm}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, legalForm: e.target.value }))}
                  className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    !settingsForm.legalForm ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  required
                >
                  <option value="">Sélectionner...</option>
                  <option value="SARL">SARL</option>
                  <option value="SA">SA</option>
                  <option value="SAS">SAS</option>
                  <option value="SASU">SASU</option>
                  <option value="EURL">EURL</option>
                  <option value="EI">EI</option>
                  <option value="SNC">SNC</option>
                  <option value="SCS">SCS</option>
                  <option value="OTHER">Autre</option>
                </select>
                {!settingsForm.legalForm && (
                  <p className="text-xs text-red-500 mt-1">Ce champ est obligatoire</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  SIRET / Ninea
                </label>
                <input
                  type="text"
                  value={settingsForm.siret}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, siret: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Numéro d'identification"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Code NAF / APE
                </label>
                <input
                  type="text"
                  value={settingsForm.nafCode}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, nafCode: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Code activité"
                />
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div className="p-6 bg-slate-50 rounded-2xl">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
              <MapPin size={16} /> Adresse
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Adresse complète
                </label>
                <textarea
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                  placeholder="Rue, avenue, quartier..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={settingsForm.city}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={settingsForm.postalCode}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, postalCode: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Pays *
                  </label>
                  <input
                    type="text"
                    value={settingsForm.country}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, country: e.target.value }))}
                    className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      !settingsForm.country ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    }`}
                    placeholder="Sénégal"
                    required
                  />
                  {!settingsForm.country && (
                    <p className="text-xs text-red-500 mt-1">Ce champ est obligatoire</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Organismes sociaux */}
          <div className="p-6 bg-slate-50 rounded-2xl">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Shield size={16} /> Organismes Sociaux
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Numéro IPRES
                </label>
                <input
                  type="text"
                  value={settingsForm.ipresNumber}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, ipresNumber: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Institution de Prévoyance Retraite"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Numéro CSS
                </label>
                <input
                  type="text"
                  value={settingsForm.cssNumber}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, cssNumber: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Caisse de Sécurité Sociale"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Numéro CFCE
                </label>
                <input
                  type="text"
                  value={settingsForm.cfceNumber}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, cfceNumber: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Caisse Prestations Familiales"
                />
              </div>
            </div>
          </div>

          {/* Paramètres fiscaux */}
          <div className="p-6 bg-slate-50 rounded-2xl">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
              <DollarSign size={16} /> Paramètres Fiscaux
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Numéro fiscal
                </label>
                <input
                  type="text"
                  value={settingsForm.taxNumber}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, taxNumber: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Régime fiscal
                </label>
                <select
                  value={settingsForm.taxRegime}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, taxRegime: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="RSI">RSI - Régime Synthétique</option>
                  <option value="RNI">RNI - Régime Normal</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>
            </div>
          </div>

          {/* Taux de cotisations */}
          <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Calculator size={16} /> Taux de Cotisations (%)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  IPRES Salarié (%) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={settingsForm.ipresEmployeeRate}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, ipresEmployeeRate: parseFloat(e.target.value) || 0 }))}
                  className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    (!settingsForm.ipresEmployeeRate && settingsForm.ipresEmployeeRate !== 0) ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  required
                />
                {(!settingsForm.ipresEmployeeRate && settingsForm.ipresEmployeeRate !== 0) && (
                  <p className="text-xs text-red-500 mt-1">Ce champ est obligatoire</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  IPRES Employeur (%) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={settingsForm.ipresEmployerRate}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, ipresEmployerRate: parseFloat(e.target.value) || 0 }))}
                  className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    (!settingsForm.ipresEmployerRate && settingsForm.ipresEmployerRate !== 0) ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  required
                />
                {(!settingsForm.ipresEmployerRate && settingsForm.ipresEmployerRate !== 0) && (
                  <p className="text-xs text-red-500 mt-1">Ce champ est obligatoire</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  CSS Salarié (%) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={settingsForm.cssEmployeeRate}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, cssEmployeeRate: parseFloat(e.target.value) || 0 }))}
                  className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    (!settingsForm.cssEmployeeRate && settingsForm.cssEmployeeRate !== 0) ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  required
                />
                {(!settingsForm.cssEmployeeRate && settingsForm.cssEmployeeRate !== 0) && (
                  <p className="text-xs text-red-500 mt-1">Ce champ est obligatoire</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  CSS Employeur (%) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={settingsForm.cssEmployerRate}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, cssEmployerRate: parseFloat(e.target.value) || 0 }))}
                  className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    (!settingsForm.cssEmployerRate && settingsForm.cssEmployerRate !== 0) ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  required
                />
                {(!settingsForm.cssEmployerRate && settingsForm.cssEmployerRate !== 0) && (
                  <p className="text-xs text-red-500 mt-1">Ce champ est obligatoire</p>
                )}
              </div>
            </div>
          </div>

          {/* Responsable déclarations */}
          <div className="p-6 bg-slate-50 rounded-2xl">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Users size={16} /> Responsable Déclarations
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={settingsForm.responsibleName}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, responsibleName: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  <Mail size={12} className="inline mr-1" /> Email
                </label>
                <input
                  type="email"
                  value={settingsForm.responsibleEmail}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, responsibleEmail: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  <Phone size={12} className="inline mr-1" /> Téléphone
                </label>
                <input
                  type="tel"
                  value={settingsForm.responsiblePhone}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, responsiblePhone: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          
          {/* Paramètres de déclaration */}
          <div className="p-6 bg-slate-50 rounded-2xl">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Calendar size={16} /> Paramètres de Déclaration
            </h4>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Jour de déclaration mensuelle (1-31) *
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={settingsForm.declarationDay}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, declarationDay: parseInt(e.target.value) || 15 }))}
                className={`w-32 px-4 py-3 bg-white border rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  !settingsForm.declarationDay ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
                required
              />
              {!settingsForm.declarationDay && (
                <p className="text-xs text-red-500 mt-1">Ce champ est obligatoire</p>
              )}
              <p className="text-xs text-slate-400 mt-2">Les déclarations doivent être soumises avant le 15 de chaque mois</p>
            </div>
          </div>
        </form>
      </HRModal>

      {/* En-tête */}
      <div className="flex items-center gap-6">
        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
          <FileCheck size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Déclarations Sociales & Fiscales</h2>
          <p className="text-slate-500 font-medium uppercase text-[10px] tracking-[0.3em]">Gestion des obligations déclaratives</p>
        </div>
      </div>

      {/* Navigation sous-onglets */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-[2rem] w-fit overflow-x-auto no-scrollbar">
        {subTabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <motion.div
        key={activeSubTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeSubTab === 'dashboard' && renderDashboard()}
        {activeSubTab === 'declarations' && renderDeclarations()}
        {activeSubTab === 'settings' && renderSettings()}
      </motion.div>
    </div>
  );
};

export default DeclarationsSocialesFiscales;