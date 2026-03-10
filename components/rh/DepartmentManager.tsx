import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, Edit3, Trash2, X, 
  RefreshCw, ChevronRight, Lock, Eye, Save, AlertCircle, ArrowRight,
  ShieldAlert, Info, CheckCircle2, Users, UserCheck, ArrowLeft
} from 'lucide-react';
import { authBridge } from '../../services/authBridge';
import { apiClient } from '../../services/api';
import { SubscriptionPlan } from '../../types';
import { useToast } from '../ToastProvider';
import HRModal from './HRModal';

interface Department {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  employeeCount?: number;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position?: string;
}

const DepartmentManager: React.FC<{ plan?: SubscriptionPlan; onNavigate?: (tab: string) => void }> = ({ plan, onNavigate }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'CARD' | 'LIST'>('CARD');
  const [pageSize, setPageSize] = useState<number>(6);

  const [filters, setFilters] = useState({
    search: '',
    hasManager: 'ALL' // 'ALL', 'WITH_MANAGER', 'WITHOUT_MANAGER'
  });
  
  const [showModal, setShowModal] = useState<'CREATE' | 'EDIT' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Department | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [showDetailsDepartment, setShowDetailsDepartment] = useState<Department | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    managerId: '' 
  });

  const currentUser = authBridge.getSession()?.user;
  const canModify = currentUser ? authBridge.canPerform(currentUser, 'EDIT', 'departments') : false;
  const showToast = useToast();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptData, empData] = await Promise.all([
        apiClient.get('/hr/departments'),
        apiClient.get('/hr/employees')
      ]);
      setDepartments(deptData?.rows || deptData || []);
      setEmployees(empData?.rows || empData || []);
    } catch (err: any) { 
      setError("Erreur de liaison avec le module RH.");
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Vérifie si un département a des employés associés
  const hasEmployees = (deptId: string) => {
    const dept = departments.find(d => d.id === deptId);
    return dept ? (dept.employeeCount || 0) > 0 : false;
  };

  const filteredDepartments = departments.filter(dept => {
    const matchSearch = !filters.search || 
      dept.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      (dept.description || '').toLowerCase().includes(filters.search.toLowerCase());
    
    const matchManager = filters.hasManager === 'ALL' ||
      (filters.hasManager === 'WITH_MANAGER' && dept.managerId) ||
      (filters.hasManager === 'WITHOUT_MANAGER' && !dept.managerId);
    
    return matchSearch && matchManager;
  });

  const displayedDepartments = viewMode === 'CARD' ? 
    filteredDepartments.slice(0, pageSize) : 
    filteredDepartments;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) return;
    
    setActionLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        managerId: formData.managerId || null
      };

      if (showModal === 'CREATE') {
        const newDept = await apiClient.post('/hr/departments', payload);
        setDepartments([newDept, ...departments]);
        showToast('Département créé avec succès', 'success');
      } else if (showModal === 'EDIT' && selectedDepartment) {
        const updatedDept = await apiClient.put(`/hr/departments/${selectedDepartment.id}`, payload);
        setDepartments(departments.map(d => d.id === updatedDept.id ? updatedDept : d));
        showToast('Département modifié avec succès', 'success');
      }
      
      setShowModal(null);
      setFormData({ name: '', description: '', managerId: '' });
      setSelectedDepartment(null);
    } catch (err: any) {
      const message = err.message || "L'opération a été rejetée par le système.";
      setError(message);
      showToast(message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!showDeleteConfirm || !canModify) return;
    
    setActionLoading(true);
    setError(null);

    try {
      await apiClient.delete(`/hr/departments/${showDeleteConfirm.id}`);
      setDepartments(departments.filter(d => d.id !== showDeleteConfirm.id));
      setShowDeleteConfirm(null);
      showToast('Département supprimé avec succès', 'success');
    } catch (err: any) {
      const message = err.message || "Erreur lors de la suppression.";
      setError(message);
      showToast(message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department);
    setFormData({ 
      name: department.name, 
      description: department.description || '', 
      managerId: department.managerId || '' 
    });
    setShowModal('EDIT');
  };

  const handleCreate = () => {
    setSelectedDepartment(null);
    setFormData({ name: '', description: '', managerId: '' });
    setShowModal('CREATE');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin mr-2" />
        <span>Chargement des départements...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onNavigate && (
            <button 
              onClick={() => onNavigate('rh')}
              className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
              <Building2 className="text-indigo-600" />
              Départements
            </h1>
            <p className="text-slate-500 font-medium uppercase text-[10px] tracking-[0.3em]">
              Organisation des équipes et structures
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canModify && (
            <button 
              onClick={handleCreate}
              className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
            >
              <Plus size={16} /> Nouveau Département
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <Building2 />
            </div>
          </div>
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-1">Total Départements</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter">{departments.length}</p>
        </div>
        
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <UserCheck />
            </div>
          </div>
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-1">Avec Manager</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter">
            {departments.filter(d => d.managerId).length}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
              <Users />
            </div>
          </div>
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-1">Total Employés</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter">
            {departments.reduce((sum, d) => sum + (d.employeeCount || 0), 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un département..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          
          <select
            value={filters.hasManager}
            onChange={(e) => setFilters({...filters, hasManager: e.target.value})}
            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Tous</option>
            <option value="WITH_MANAGER">Avec manager</option>
            <option value="WITHOUT_MANAGER">Sans manager</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'CARD' ? 'LIST' : 'CARD')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-sm transition-all"
          >
            {viewMode === 'CARD' ? 'Liste' : 'Cartes'}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0" />
          <span className="text-red-700 font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Departments Content */}
      {filteredDepartments.length === 0 ? (
        <div className="py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 text-center">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Aucun département trouvé</p>
          <p className="text-slate-300 text-xs font-medium mt-2">
            {departments.length === 0 ? 'Créez votre premier département pour organiser vos équipes' : 'Aucun département ne correspond aux critères de recherche'}
          </p>
        </div>
      ) : (
        <>
          {/* Departments Grid */}
          <div className={viewMode === 'CARD' ? 
            "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : 
            "space-y-4"
          }>
        {displayedDepartments.map((department) => (
          <div key={department.id} className={viewMode === 'CARD' ?
            "bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative overflow-hidden" :
            "bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
          }>
            <div className={viewMode === 'CARD' ? '' : 'flex-1'}>
              <div className={viewMode === 'CARD' ? 'mb-6' : 'flex items-center gap-4'}>
                <div className={`${viewMode === 'CARD' ? 'w-16 h-16 mb-4' : 'w-12 h-12'} bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0`}>
                  <Building2 size={viewMode === 'CARD' ? 32 : 24} />
                </div>
                <div className={viewMode === 'CARD' ? '' : 'flex-1'}>
                  <h3 className={`${viewMode === 'CARD' ? 'text-xl mb-2' : 'text-lg mb-1'} font-black text-slate-900 uppercase tracking-tighter`}>
                    {department.name}
                  </h3>
                  {department.description && (
                    <p className={`text-slate-500 font-medium ${viewMode === 'CARD' ? 'text-sm leading-relaxed mb-4' : 'text-xs'}`}>
                      {department.description}
                    </p>
                  )}
                </div>
              </div>

              {viewMode === 'CARD' && (
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Manager</span>
                    <span className="text-sm font-medium text-slate-600">
                      {department.manager ? 
                        `${department.manager.firstName} ${department.manager.lastName}` : 
                        'Non assigné'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Employés</span>
                    <span className="text-sm font-medium text-slate-600">
                      {department.employeeCount || 0}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className={`flex items-center gap-2 ${viewMode === 'CARD' ? 'pt-6 border-t border-slate-50' : ''}`}>
              {canModify && (
                <>
                  <button
                    onClick={() => handleEdit(department)}
                    className="p-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(department)}
                    disabled={hasEmployees(department.id)}
                    className={`p-2 rounded-xl transition-all ${
                      hasEmployees(department.id) 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-slate-50 hover:bg-red-50 hover:text-red-600'
                    }`}
                    title={hasEmployees(department.id) ? 'Impossible de supprimer : des employés sont associés' : 'Supprimer'}
                  >
                    {hasEmployees(department.id) ? <Lock size={16} /> : <Trash2 size={16} />}
                  </button>
                </>
              )}
              <button
                onClick={() => setShowDetailsDepartment(department)}
                className="p-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
              >
                <Eye size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Load More for Card View */}
      {viewMode === 'CARD' && filteredDepartments.length > pageSize && (
        <div className="text-center">
          <button
            onClick={() => setPageSize(pageSize + 6)}
            className="px-8 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl font-medium text-sm transition-all"
          >
            Voir plus ({filteredDepartments.length - pageSize} restants)
          </button>
        </div>
      )}
          </>
        )}

      {/* Create/Edit Modal */}
      <HRModal
        isOpen={!!showModal}
        onClose={() => setShowModal(null)}
        title={showModal === 'CREATE' ? 'Nouveau Département' : 'Modifier le Département'}
        size="md"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowModal(null)}
              className="flex-1 px-6 py-3 border border-slate-200 rounded-2xl font-medium hover:bg-slate-50 transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={actionLoading}
              className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">
              Nom du département <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="Ex: Ressources Humaines"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
              rows={3}
              placeholder="Description du département..."
            />
          </div>

          <div>
            <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">
              Manager
            </label>
            <select
              value={formData.managerId}
              onChange={(e) => setFormData({...formData, managerId: e.target.value})}
              className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="">Sélectionner un manager (optionnel)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} {emp.position ? `- ${emp.position}` : ''}
                </option>
              ))}
            </select>
          </div>
        </form>
      </HRModal>

      {/* Delete Confirmation Modal */}
      <HRModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="Confirmer la suppression"
        size="sm"
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="flex-1 px-6 py-3 border border-slate-200 rounded-2xl font-medium hover:bg-slate-50 transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={actionLoading}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Supprimer
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <p className="text-slate-500">
            Êtes-vous sûr de vouloir supprimer le département "{showDeleteConfirm?.name}" ?
            Cette action est irréversible.
          </p>
        </div>
      </HRModal>

      {/* Details Modal */}
      <HRModal
        isOpen={!!showDetailsDepartment}
        onClose={() => setShowDetailsDepartment(null)}
        title="Détails du Département"
        size="lg"
        footer={
          <div className="flex justify-end">
            <button
              onClick={() => setShowDetailsDepartment(null)}
              className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-all"
            >
              Fermer
            </button>
          </div>
        }
      >
        {showDetailsDepartment && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                  Nom
                </label>
                <p className="text-lg font-bold text-slate-900">{showDetailsDepartment.name}</p>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                  Employés
                </label>
                <p className="text-lg font-bold text-slate-900">{showDetailsDepartment.employeeCount || 0}</p>
              </div>
            </div>

            {showDetailsDepartment.description && (
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                  Description
                </label>
                <p className="text-slate-700">{showDetailsDepartment.description}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                Manager
              </label>
              {showDetailsDepartment.manager ? (
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="font-bold text-slate-900">
                    {showDetailsDepartment.manager.firstName} {showDetailsDepartment.manager.lastName}
                  </p>
                  <p className="text-sm text-slate-500">{showDetailsDepartment.manager.email}</p>
                </div>
              ) : (
                <p className="text-slate-500 italic">Aucun manager assigné</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                  Créé le
                </label>
                <p className="text-sm text-slate-600">
                  {new Date(showDetailsDepartment.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                  Modifié le
                </label>
                <p className="text-sm text-slate-600">
                  {new Date(showDetailsDepartment.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </HRModal>
    </div>
  );
};

export default DepartmentManager;