
import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, Key, Plus, X, Search, 
  ShieldCheck, UserPlus, Check, ArrowRight,
  RefreshCw, Trash2, Edit3, AlertCircle, Lock
} from 'lucide-react';
import { User, UserRole, SubscriptionPlan } from '../types';
import { authBridge } from '../services/authBridge';
import { apiClient } from '../services/api';

const AVAILABLE_ROLES = [
  { id: 'ADMIN', label: 'Administrateur', desc: 'Accès total à l\'instance.' },
  { id: 'STOCK_MANAGER', label: 'Gestionnaire Stock', desc: 'Contrôle logistique et inventaire.' },
  { id: 'ACCOUNTANT', label: 'Comptable', desc: 'Gestion financière et facturation.' },
  { id: 'SALES', label: 'Commercial', desc: 'Gestion des ventes et des clients.' },
  { id: 'EMPLOYEE', label: 'Employé', desc: 'Accès standard et consultations.' },
];

interface GovernanceProps {
  tenantId: string;
  plan?: SubscriptionPlan;
}

const Governance: React.FC<GovernanceProps> = ({ tenantId, plan }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [userData, setUserData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    roles: [] as string[] 
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/auth/users');
      setUsers(data);
    } catch { setError("Erreur sync Kernel"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const planId = String(plan?.id || plan?.name || plan?.plan || '').toUpperCase() || 'BASIC';
  const isUserCreationAllowed = authBridge.isCreationAllowed({ planId } as any, 'users', users.length);
  const isUserLimitReached = !isUserCreationAllowed;

  const toggleRole = (roleId: string) => {
    setUserData(prev => ({
      ...prev,
      roles: prev.roles.includes(roleId) 
        ? prev.roles.filter(r => r !== roleId)
        : [...prev.roles, roleId]
    }));
  };

  const handleOpenEdit = (user: User) => {
    const roles = (user as any).roles || [user.role];
    setEditingUser(user);
    setUserData({
      name: user.name,
      email: user.email,
      password: '', // On ne pré-remplit pas le password pour la sécurité
      roles: roles
    });
    setShowUserModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userData.roles.length === 0) {
      setError("Veuillez sélectionner au moins un rôle.");
      return;
    }

    setActionLoading(true);
    try {
      if (!editingUser && isUserLimitReached) {
        setError(planId === 'PRO' ? 'Limite du plan PRO atteinte : maximum 10 utilisateurs.' : 'Limite du plan Basic atteinte : maximum 3 utilisateurs.');
        setActionLoading(false);
        return;
      }

      if (editingUser) {
        // Mise à jour : le password est optionnel
        const payload = { ...userData };
        if (!payload.password) delete (payload as any).password;
        await apiClient.put(`/auth/users/${editingUser.id}`, payload);
      } else {
        await apiClient.post('/auth/users', userData);
      }
      await fetchUsers();
      closeModal();
    } catch (err: any) { 
      setError(err.message || "Échec de l'opération.");
    } finally { 
      setActionLoading(false); 
    }
  };

  const closeModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
    setUserData({ name: '', email: '', password: '', roles: [] });
    setError(null);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
            <Shield className="text-indigo-600" size={32} /> Gouvernance & IAM
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Gestion Multi-Rôles des Opérateurs</p>
        </div>
        {isUserLimitReached ? (
           <div className="flex items-center gap-3 px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 text-[10px] font-black uppercase tracking-widest shadow-sm">
             <Lock size={16} /> {planId === 'PRO' ? 'Limite du plan PRO atteinte : maximum 10 utilisateurs.' : 'Limite du plan Basic atteinte : maximum 3 opérateurs.'}
           </div>
        ) : (
          <button 
            onClick={() => { closeModal(); setShowUserModal(true); }}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all shadow-xl flex items-center gap-3 text-xs uppercase tracking-widest"
          >
            <UserPlus size={18} /> NOUVEL OPÉRATEUR
          </button>
        )}
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-10 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Registre des accès</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="bg-white border-none rounded-xl pl-10 pr-4 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" 
            />
          </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/30 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b">
              <th className="px-10 py-4">Opérateur</th>
              <th className="px-10 py-4">Périmètre de Rôles</th>
              <th className="px-10 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredUsers.map(u => {
              const roles = (u as any).roles || [u.role];
              return (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs">{u.name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex flex-wrap gap-2">
                      {roles.map((r: string) => (
                        <span key={r} className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase border ${r === 'ADMIN' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right flex justify-end gap-2">
                    <button onClick={() => handleOpenEdit(u)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit3 size={18}/></button>
                    <button className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={18}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showUserModal && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
             <div className={`px-10 py-8 text-white flex justify-between items-center ${editingUser ? 'bg-amber-500' : 'bg-slate-900'}`}>
                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                  {editingUser ? <Edit3 size={24}/> : <UserPlus size={24}/>}
                  {editingUser ? 'Révision Opérateur' : 'Provisionnement Multi-Rôles'}
                </h3>
                <button onClick={closeModal} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={24}/></button>
             </div>
             
             <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
                {error && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-[10px] font-black uppercase flex items-center gap-3">
                    <AlertCircle size={16}/> {error}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Identité & Sécurité</label>
                      <input type="text" required value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="Nom Complet" />
                      <input type="email" required value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="Email Professionnel" />
                      <input type="password" required={!editingUser} value={userData.password} onChange={e => setUserData({...userData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder={editingUser ? "Laisser vide pour inchangé" : "Clé d'Accès Initiale"} />
                   </div>

                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Sélection des Rôles</label>
                      <div className="space-y-2">
                        {AVAILABLE_ROLES.map(role => (
                          <button 
                            key={role.id}
                            type="button"
                            onClick={() => toggleRole(role.id)}
                            className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${userData.roles.includes(role.id) ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}
                          >
                            <div>
                              <p className={`text-[10px] font-black uppercase ${userData.roles.includes(role.id) ? 'text-indigo-600' : 'text-slate-700'}`}>{role.label}</p>
                              <p className="text-[8px] text-slate-400 font-bold leading-tight">{role.desc}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${userData.roles.includes(role.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 group-hover:border-slate-300'}`}>
                              {userData.roles.includes(role.id) && <Check size={12} className="text-white"/>}
                            </div>
                          </button>
                        ))}
                      </div>
                   </div>
                </div>

                <button type="submit" disabled={actionLoading} className={`w-full py-5 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${editingUser ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-slate-900'}`}>
                  {actionLoading ? <RefreshCw className="animate-spin" /> : <>{editingUser ? 'METTRE À JOUR' : 'ACTIVER L\'OPÉRATEUR'} <ArrowRight size={18}/></>}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Governance;
