import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Users, 
  GitPullRequest, 
  Download, 
  Plus, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight,
  User,
  Briefcase,
  Layers,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import HRModal from './HRModal';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../services/api';

interface OrgChartProps {
  onNavigate: (tab: string, meta?: any) => void;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  dept: string;
  departmentId: string;
  managerId: string | null;
  hireDate: string;
  photoUrl: string | null;
  contracts: any[];
  children: Employee[];
}

interface OrgChartData {
  type: 'hierarchical' | 'flat';
  orgChart?: Employee[];
  departments?: { [key: string]: Employee[] };
  totalEmployees: number;
}

const OrgChart: React.FC<OrgChartProps> = ({ onNavigate }) => {
  const [isAddLevelModalOpen, setIsAddLevelModalOpen] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [orgData, setOrgData] = useState<OrgChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  useEffect(() => {
    loadOrgChartData();
  }, []);

  const loadOrgChartData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get('/hr/employees/orgchart');
      setOrgData(data);
    } catch (err: any) {
      console.error('Erreur lors du chargement de l\'organigramme:', err);
      setError('Impossible de charger l\'organigramme. ' + (err.message || 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddLevel = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddLevelModalOpen(false);
    setAlertMessage('Nouveau niveau ajouté à l\'organigramme');
    setShowSuccessAlert(true);
    setTimeout(() => setShowSuccessAlert(false), 3000);
    loadOrgChartData();
  };

  const filterEmployees = (employees: Employee[]): Employee[] => {
    return employees.filter(emp => {
      const matchesSearch = searchTerm === '' || 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartment = selectedDepartment === 'all' || 
        emp.dept === selectedDepartment;
      
      return matchesSearch && matchesDepartment;
    }).map(emp => ({
      ...emp,
      children: filterEmployees(emp.children)
    }));
  };

  const getDepartments = (): string[] => {
    if (!orgData) return [];
    
    const departments = new Set<string>();
    
    if (orgData.type === 'hierarchical' && orgData.orgChart) {
      const collectDepartments = (employees: Employee[]) => {
        employees.forEach(emp => {
          if (emp.dept && emp.dept !== 'N/A') departments.add(emp.dept);
          collectDepartments(emp.children);
        });
      };
      collectDepartments(orgData.orgChart);
    } else if (orgData.type === 'flat' && orgData.departments) {
      Object.keys(orgData.departments).forEach(dept => {
        if (dept !== 'Non assigné') departments.add(dept);
      });
    }
    
    return Array.from(departments).sort();
  };

  const renderNode = (node: Employee) => (
    <div key={node.id} className="flex flex-col items-center">
      <div className="relative p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group cursor-pointer w-64 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-[1.5rem] overflow-hidden mx-auto mb-4 border-4 border-white shadow-md group-hover:scale-110 transition-transform">
          <img 
            src={node.photoUrl || `https://picsum.photos/seed/${node.id}/100/100`} 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer" 
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://picsum.photos/seed/${node.id}/100/100`;
            }}
          />
        </div>
        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">{node.name}</h4>
        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">{node.role}</p>
        <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 py-1 px-3 rounded-full mb-2">
          <Layers size={10} /> {node.dept}
        </div>
        {node.contracts && node.contracts.length > 0 && (
          <div className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            {node.contracts[0].type} - Actif
          </div>
        )}
      </div>
      
      {node.children.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="w-px h-12 bg-slate-200"></div>
          <div className="flex gap-12 relative">
            {node.children.length > 1 && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[calc(100%-16rem)] h-px bg-slate-200"></div>
            )}
            {node.children.map((child: Employee) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-px h-8 bg-slate-200"></div>
                {renderNode(child)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderDepartmentView = (departments: { [key: string]: Employee[] }) => {
    const filteredDepartments = Object.entries(departments).reduce((acc, [dept, employees]) => {
      const filtered = employees.filter(emp => {
        const matchesSearch = searchTerm === '' || 
          emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.role.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesDepartment = selectedDepartment === 'all' || 
          dept === selectedDepartment;
        
        return matchesSearch && matchesDepartment;
      });
      
      if (filtered.length > 0) {
        acc[dept] = filtered;
      }
      return acc;
    }, {} as { [key: string]: Employee[] });

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Object.entries(filteredDepartments).map(([dept, employees]) => (
          <div key={dept} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
            <div className="text-center mb-8">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">
                {dept}
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {employees.length} employé{employees.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="space-y-6">
              {employees.map(emp => (
                <div key={emp.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all">
                  <div className="w-12 h-12 bg-slate-200 rounded-xl overflow-hidden flex-shrink-0">
                    <img 
                      src={emp.photoUrl || `https://picsum.photos/seed/${emp.id}/100/100`} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://picsum.photos/seed/${emp.id}/100/100`;
                      }}
                    />
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-sm font-bold text-slate-900">{emp.name}</h4>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{emp.role}</p>
                    {emp.contracts && emp.contracts.length > 0 && (
                      <p className="text-[8px] font-bold text-emerald-600">
                        {emp.contracts[0].type} - Actif
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ✅ FIXED: extracted rendering logic into a dedicated function to avoid
  // deeply nested ternaries that caused the "Unexpected token" parser error
  const renderOrgContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          <p className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">
            Chargement de l'organigramme...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
          <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-red-800 mb-2">Erreur de chargement</h3>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button 
              onClick={loadOrgChartData}
              className="px-6 py-3 bg-red-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    if (!orgData || orgData.totalEmployees === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
          <div className="bg-slate-100 border border-slate-200 rounded-3xl p-8 text-center max-w-md">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-600 mb-2">Aucun employé actif</h3>
            <p className="text-slate-500 text-sm">
              Aucun employé avec un contrat actif n'a été trouvé. 
              Ajoutez des employés et des contrats pour voir l'organigramme.
            </p>
          </div>
        </div>
      );
    }

    if (orgData.type === 'hierarchical' && orgData.orgChart) {
      const filtered = filterEmployees(orgData.orgChart);
      return (
        <div className="flex justify-center">
          <div className="w-fit">
            {filtered.length > 0 ? (
              filtered.map((rootEmployee) => renderNode(rootEmployee))
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-500 font-bold">Aucun employé ne correspond aux filtres appliqués</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (orgData.type === 'flat' && orgData.departments) {
      return renderDepartmentView(orgData.departments);
    }

    // Cas où l'API retourne une liste d'employés sans structure départementale
    if (orgData.type === 'flat' && (orgData as any).employees) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(orgData as any).employees
            .filter((emp: Employee) => {
              const matchesSearch = searchTerm === '' || 
                emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.role.toLowerCase().includes(searchTerm.toLowerCase());
              const matchesDepartment = selectedDepartment === 'all' || 
                emp.dept === selectedDepartment;
              return matchesSearch && matchesDepartment;
            })
            .map((emp: Employee) => (
              <div key={emp.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                <div className="text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-[2rem] overflow-hidden mx-auto mb-4 border-4 border-white shadow-md">
                    <img 
                      src={emp.photoUrl || `https://picsum.photos/seed/${emp.id}/100/100`} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://picsum.photos/seed/${emp.id}/100/100`;
                      }}
                    />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">{emp.name}</h4>
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">{emp.role}</p>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 py-1 px-3 rounded-full mb-2">
                    <Layers size={10} className="inline mr-1" /> {emp.dept}
                  </div>
                  {emp.contracts && emp.contracts.length > 0 ? (
                    <p className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      {emp.contracts[0].type} - Actif
                    </p>
                  ) : (
                    <p className="text-[8px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                      Pas de contrat actif
                    </p>
                  )}
                </div>
              </div>
            ))
          }
        </div>
      );
    }

    // Fallback : structure non reconnue
    if (orgData.departments) {
      return renderDepartmentView(orgData.departments);
    }

    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <p className="text-slate-500 font-bold">Structure d'organigramme non reconnue</p>
      </div>
    );
  };

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
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('rh')}
            className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Organigramme</h1>
            <p className="text-slate-500 font-medium uppercase text-[10px] tracking-[0.3em]">
              Structure hiérarchique de l'entreprise
              {orgData && <span className="ml-2">({orgData.totalEmployees} employés actifs)</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-white border border-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
            <Download size={16} /> Export PDF
          </button>
          <button 
            onClick={() => setIsAddLevelModalOpen(true)}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
          >
            <Plus size={16} /> Ajouter Niveau
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-center">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher un membre..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
          />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 px-6 py-4 rounded-2xl">
            <Filter size={18} className="text-slate-400" />
            <select 
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="bg-transparent border-none focus:ring-0 font-black text-[10px] uppercase tracking-widest text-slate-600"
            >
              <option value="all">Tous les Départements</option>
              {getDepartments().map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Org Chart View */}
      <div className="bg-slate-50 p-20 rounded-[4rem] border border-slate-100 shadow-inner overflow-auto min-h-[600px]">
        {renderOrgContent()}
      </div>

      {/* Add Level Modal */}
      <HRModal 
        isOpen={isAddLevelModalOpen} 
        onClose={() => setIsAddLevelModalOpen(false)} 
        title="Ajouter un Niveau à l'Organigramme"
        size="md"
        footer={
          <div className="flex justify-end gap-4">
            <button 
              onClick={() => setIsAddLevelModalOpen(false)}
              className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all"
            >
              Annuler
            </button>
            <button 
              onClick={handleAddLevel}
              className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl"
            >
              Ajouter le Niveau
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm">
                <GitPullRequest size={24} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Nouveau Niveau Hiérarchique</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Définir la position dans la structure</p>
              </div>
            </div>
          </div>
          
          <form className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom du Niveau</label>
              <input type="text" placeholder="Ex: Équipe Technique" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm" />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Niveau Parent</label>
              <select className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm">
                <option>Direction Générale</option>
                <option>Département IT</option>
                <option>Département Sales</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
              <textarea rows={3} placeholder="Description du rôle et responsabilités..." className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm resize-none"></textarea>
            </div>
          </form>
        </div>
      </HRModal>
    </div>
  );
};

export default OrgChart;
