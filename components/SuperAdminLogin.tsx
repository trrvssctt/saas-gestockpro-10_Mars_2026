
import React, { useState } from 'react';
import { 
  ShieldCheck, Lock, Mail, ArrowRight, RefreshCw, 
  Terminal, ShieldAlert, X, Eye, EyeOff, Zap, Fingerprint
} from 'lucide-react';
import { User, UserRole } from '../types';
import { authBridge } from '../services/authBridge';
import { apiClient } from '../services/api';

interface Props {
  onLoginSuccess: (user: User) => void;
}

const SuperAdminLogin: React.FC<Props> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Rappel : identifiants par défaut = master@gestock.pro / admin123
      const data = await apiClient.post('/auth/superadmin/login', {
        email: email.trim().toLowerCase(),
        password: password.trim()
      });
      
      const user = { 
        ...data.user, 
        role: UserRole.SUPER_ADMIN, 
        roles: [UserRole.SUPER_ADMIN], 
        tenantId: 'SYSTEM' 
      };
      
      authBridge.saveSession(user, data.token);
      onLoginSuccess(user);
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message || err?.response?.data?.error;
      setError(serverMessage || err.message || "Accès au Kernel refusé.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-mono selection:bg-rose-500 selection:text-white">
      {/* Background Matrix-like effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#1e1b4b,transparent_70%)]"></div>
         <div className="grid grid-cols-12 gap-4 h-full w-full opacity-10">
            {[...Array(48)].map((_, i) => (
              <div key={i} className="h-full border-r border-slate-800"></div>
            ))}
         </div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
           <div className="w-24 h-24 bg-rose-500/10 border-2 border-rose-500/30 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(244,63,94,0.1)] relative group">
              <Fingerprint size={48} className="text-rose-500 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-rose-500/20 blur-2xl rounded-full animate-pulse"></div>
           </div>
           <h2 className="text-sm font-black text-rose-500 tracking-[0.5em] uppercase mb-2">Restricted Area</h2>
           <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Kernel Master</h1>
        </div>

        <div className="bg-slate-900 border-t-4 border-rose-500 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
           {error && (
             <div className="mb-8 p-5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-4 text-rose-500 text-xs font-bold uppercase animate-in shake">
               <ShieldAlert size={18} />
               {error}
             </div>
           )}

           <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                 <div className="relative group">
                    <Terminal className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-rose-500 transition-colors" size={18} />
                    <input 
                      type="email" 
                      required 
                      value={email}
                      onChange={e => setEmail(e.target.value.toLowerCase())}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-rose-500/30 transition-all" 
                      placeholder="MASTER_ID" 
                    />
                 </div>
                 <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-rose-500 transition-colors" size={18} />
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      required 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-14 pr-14 py-5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-rose-500/30 transition-all" 
                      placeholder="ACCESS_KEY" 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-rose-500">
                      {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                 </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-6 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-rose-600 active:scale-[0.98] transition-all flex items-center justify-center gap-4"
              >
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <>AUTHENTICATE <ArrowRight size={18}/></>}
              </button>
           </form>
        </div>

        <div className="mt-12 text-center">
           <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-loose">
             Authorized Personnel Only.<br/>
             Every access attempt is logged with IP & Geolocation signature.
           </p>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
