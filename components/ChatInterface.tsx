
import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, Send, X, Bot, Sparkles, 
  BarChart3, Table as TableIcon, Activity,
  ChevronRight, ArrowRight, Loader2, ShieldAlert
} from 'lucide-react';
import { getAIResponse, AIChatResponse } from '../services/geminiService';
import { 
  ResponsiveContainer, AreaChart, Area, 
  XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

interface Message extends AIChatResponse {
  role: 'user' | 'ai';
  timestamp: Date;
}

const ChatInterface = ({ user }: { user: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    const tenantId = user.tenantId || 'system-default';
    
    setInput('');
    setMessages(prev => [...prev, { 
      role: 'user', 
      formattedResponse: userMsg,
      format: 'general',
      resultCount: 0,
      status: 'SUCCESS',
      timestamp: new Date() 
    }]);
    
    setIsLoading(true);
    const aiResponse = await getAIResponse(userMsg, tenantId);
    
    setMessages(prev => [...prev, { 
      ...aiResponse, 
      role: 'ai', 
      timestamp: new Date() 
    }]);
    setIsLoading(false);
  };

  const renderVisuals = (msg: Message) => {
    const { format, rawResults } = msg;
    if (!rawResults || rawResults.length === 0) return null;

    if (format === 'table') {
      const cols = Object.keys(rawResults[0]);
      return (
        <div className="mt-4 border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
          <div className="overflow-x-auto max-h-60 custom-scrollbar">
            <table className="w-full text-left text-[10px]">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                <tr>
                  {cols.map(c => <th key={c} className="px-3 py-2 font-black uppercase text-slate-400">{c}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rawResults.map((row, i) => (
                  <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                    {cols.map(c => <td key={c} className="px-3 py-2 font-bold text-slate-700">{row[c]?.toString()}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (format === 'chart') {
      const keys = Object.keys(rawResults[0]);
      const x = keys[0];
      const y = keys[1] || keys[0];
      return (
        <div className="mt-4 p-4 bg-slate-900 rounded-2xl border border-slate-800 h-44 w-full shadow-inner">
          <p className="text-[8px] font-black text-indigo-400 uppercase mb-2 flex items-center gap-1">
            <BarChart3 size={10} /> Analyse Analytique
          </p>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rawResults}>
              <defs>
                <linearGradient id="colorIA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey={x} hide />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '10px', fontSize: '9px', color: '#fff' }} />
              <Area type="monotone" dataKey={y} stroke="#818cf8" fillOpacity={1} fill="url(#colorIA)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (format === 'stats') {
      return (
        <div className="mt-4 grid grid-cols-1 gap-2">
          {rawResults.map((r, i) => (
            <div key={i} className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex justify-between items-center">
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{Object.keys(r)[0]}</span>
              <span className="text-sm font-black text-indigo-900">{r[Object.keys(r)[0]]?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed bottom-8 right-8 z-[1000]">
      {isOpen ? (
        <div className="bg-white w-[420px] h-[600px] rounded-[3rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg relative">
                <Bot size={24} />
                <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
              </div>
              <div>
                <h4 className="font-black text-sm uppercase tracking-tight">Kernel IA Orchestrator</h4>
                <p className="text-[8px] text-indigo-400 font-bold uppercase tracking-widest flex items-center gap-1">
                  <Activity size={8} /> n8n Live Analysis
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400"><X size={20} /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar">
            {messages.length === 0 && (
              <div className="text-center py-10 space-y-6">
                <Sparkles size={40} className="text-indigo-600 mx-auto animate-pulse" />
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest px-10 leading-relaxed">
                  Posez-moi des questions sur vos factures, vos stocks ou vos performances.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1`}>
                <div className={`max-w-[90%] p-4 rounded-[2rem] text-xs leading-relaxed shadow-sm border ${
                  m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none border-indigo-500 font-bold' :
                  m.status === 'ERROR' ? 'bg-rose-50 text-rose-700 border-rose-100 rounded-bl-none' :
                  'bg-white text-slate-800 border-slate-100 rounded-bl-none font-medium'
                }`}>
                  <div className="whitespace-pre-wrap">{m.formattedResponse}</div>
                  {renderVisuals(m)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 p-4 bg-white rounded-2xl w-fit shadow-sm border border-slate-100">
                <Loader2 className="animate-spin text-indigo-600" size={16} />
                <span className="text-[10px] font-black text-slate-400 uppercase">Calcul SQL...</span>
              </div>
            )}
          </div>

          <div className="p-6 bg-white border-t border-slate-100">
            <div className="relative">
              <input 
                type="text" value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ex: Top 5 produits vendus..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none pr-14"
              />
              <button onClick={handleSend} disabled={isLoading || !input.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all active:scale-90">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="w-20 h-20 bg-slate-900 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all group relative">
          <MessageSquare size={28} />
          <span className="absolute -top-1 -right-1 w-7 h-7 bg-indigo-600 border-4 border-slate-50 rounded-full flex items-center justify-center text-[8px] font-black uppercase">IA</span>
        </button>
      )}
    </div>
  );
};

export default ChatInterface;
