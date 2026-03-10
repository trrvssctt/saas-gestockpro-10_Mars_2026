
import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  BarChart3, 
  Users, 
  Package, 
  CreditCard, 
  Layers, 
  Lock, 
  RefreshCw, 
  Globe, 
  Cpu, 
  MessageSquare, 
  Mail, 
  Phone, 
  MapPin,
  ChevronDown,
  Star,
  Plus,
  Minus,
  ShieldAlert,
  FileText
} from 'lucide-react';

interface LandingPageProps {
  onLogin: (opts?: { openRegister?: boolean; planId?: string; regStep?: number }) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const features = [
    {
      icon: <Layers className="text-indigo-500" />,
      title: "Catégories & Sous-catégories",
      description: "Organisation granulaire de votre catalogue pour une recherche instantanée."
    },
    {
      icon: <Package className="text-indigo-500" />,
      title: "Inventaire & Mouvements",
      description: "Suivi en temps réel des stocks avec alertes automatiques de rupture."
    },
    {
      icon: <Zap className="text-indigo-500" />,
      title: "Gestion des Services",
      description: "Vendez vos prestations aussi facilement que vos produits physiques."
    },
    {
      icon: <Users className="text-indigo-500" />,
      title: "Gestion Clients CRM",
      description: "Centralisez l'historique et les préférences de vos clients fidèles."
    },
    {
      icon: <FileText className="text-indigo-500" />,
      title: "Ventes & Facturation",
      description: "Générez des factures professionnelles et suivez vos devis en un clic."
    },
    {
      icon: <CreditCard className="text-indigo-500" />,
      title: "Paiements & Trésorerie",
      description: "Intégration Stripe et Mobile Money pour une encaissement fluide."
    },
    {
      icon: <ShieldCheck className="text-indigo-500" />,
      title: "Gouvernance & RBAC",
      description: "Contrôlez précisément qui accède à quoi avec des rôles personnalisés."
    },
    {
      icon: <RefreshCw className="text-indigo-500" />,
      title: "Sécurité & Recovery",
      description: "Sauvegardes automatiques et protocoles de résilience de niveau bancaire."
    },
    {
      icon: <BarChart3 className="text-indigo-500" />,
      title: "Dashboard Analytique",
      description: "Visualisez vos performances avec des graphiques intelligents et prédictifs."
    },
    {
      icon: <Cpu className="text-indigo-500" />,
      title: "Inventory Campaigns",
      description: "Audits de stock massifs assistés par IA pour les grandes entreprises."
    }
  ];

  const faqs = [
    {
      question: "GeStockPro est-il adapté à une très petite entreprise ?",
      answer: "Absolument. Notre plan Starter AI est conçu spécifiquement pour les indépendants et TPE qui souhaitent professionnaliser leur gestion sans complexité inutile."
    },
    {
      question: "Mes données sont-elles en sécurité ?",
      answer: "Nous utilisons un chiffrement AES-256 et des sauvegardes redondantes sur plusieurs zones géographiques. Votre sécurité est notre priorité absolue."
    },
    {
      question: "Puis-je changer de plan à tout moment ?",
      answer: "Oui, vous pouvez upgrader ou downgrader votre abonnement directement depuis votre interface de gestion sans interruption de service."
    },
    {
      question: "L'IA est-elle incluse dans tous les plans ?",
      answer: "L'IA est au cœur de GeStockPro. Tous les plans bénéficient de fonctionnalités intelligentes, avec des capacités avancées (prédictions, chatbot) sur les plans PRO et Enterprise."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="../../assets/logo_gestockpro-removebg-preview.png" alt="GeStockPro" className="h-12 w-auto" />
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Tarifs</a>
            <a href="#about" className="hover:text-slate-900 transition-colors">À propos</a>
            <a href="#contact" className="hover:text-slate-900 transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onLogin}
              className="px-6 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
            >
              Connexion
            </button>
            <button 
              onClick={onLogin}
              className="px-6 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95"
            >
              Essayer gratuitement
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
              <Zap size={12} /> AI-Native ERP for Modern Business
            </div>
            <h1 className="text-6xl md:text-7xl font-black tracking-tighter leading-[0.9] mb-8 uppercase">
              Pilotez votre entreprise avec <span className="text-indigo-600">intelligence.</span>
            </h1>
            <p className="text-xl text-slate-500 font-medium leading-relaxed mb-10 max-w-lg">
              GeStockPro est un ERP léger intelligent conçu pour simplifier la gestion des ventes, stocks, clients et trésorerie des TPE et PME africaines.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => onLogin({ openRegister: true, planId: 'BASIC', regStep: 1 })}
                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-200"
              >
                Essayer gratuitement <ArrowRight size={18} />
              </button>
              <a 
                href="#pricing"
                className="px-8 py-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:border-slate-900 transition-all"
              >
                Voir les tarifs
              </a>
            </div>
            <div className="mt-12 flex items-center gap-6">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold border-2 border-white">M</div>
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold border-2 border-white">A</div>
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold border-2 border-white">S</div>
                <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 font-bold border-2 border-white">+</div>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Rejoint par +500 entreprises en 2024
              </p>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-indigo-500/10 blur-3xl rounded-full"></div>
            <div className="relative bg-slate-900 rounded-[3rem] p-4 shadow-2xl border border-slate-800 overflow-hidden">
              <div className="bg-slate-800/50 h-8 flex items-center gap-2 px-6 border-b border-slate-700">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              </div>
              <div className="w-full h-96 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-b-[2rem] flex items-center justify-center">
                <img src="../../assets/logo_gestockpro.png" alt="GeStockPro Dashboard" className="h-32 w-auto opacity-80" />
              </div>
            </div>
            {/* Floating Stats */}
            <div className="absolute -bottom-10 -left-10 bg-white p-6 rounded-3xl shadow-2xl border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <BarChart3 className="text-emerald-600" size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ventes aujourd'hui</p>
                  <p className="text-lg font-black text-slate-900">+24.5%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-black tracking-tighter uppercase mb-6">Pourquoi changer maintenant ?</h2>
            <p className="text-slate-500 font-medium">Les méthodes traditionnelles freinent votre croissance. Identifiez les goulots d'étranglement avant qu'ils ne deviennent critiques.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Perte de temps", desc: "Des heures perdues sur des fichiers Excel complexes et des saisies manuelles répétitives." },
              { title: "Stocks opaques", desc: "Des ruptures imprévues ou des surstocks immobilisant votre précieuse trésorerie." },
              { title: "Facturation lente", desc: "Des délais de paiement rallongés par une facturation manuelle et peu professionnelle." },
              { title: "Erreurs de caisse", desc: "Un manque de visibilité sur les flux réels entraînant des écarts de trésorerie." },
              { title: "Manque de vision", desc: "Prendre des décisions à l'aveugle sans données analytiques fiables en temps réel." },
              { title: "Sécurité fragile", desc: "Risque de perte de données critiques sans système de sauvegarde automatisé." }
            ].map((item, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 hover:shadow-xl transition-all group">
                <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                  <ShieldAlert size={24} />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight mb-4">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative">
              <div className="absolute -inset-10 bg-indigo-500/5 blur-3xl rounded-full"></div>
              <div className="relative w-full rounded-[4rem] shadow-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-20">
                <img src="../../assets/logo_gestockpro.png" alt="GeStockPro Solution" className="h-74 w-auto" />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
                <CheckCircle2 size={12} /> La Solution Ultime
              </div>
              <h2 className="text-5xl font-black tracking-tighter leading-[0.9] mb-8 uppercase">
                L'ERP qui pense <span className="text-indigo-600">pour vous.</span>
              </h2>
              <div className="space-y-8">
                {[
                  { title: "Centralisation Totale", desc: "Toutes vos données commerciales au même endroit, accessibles partout.", icon: <Layers /> },
                  { title: "Automatisation Intelligente", desc: "L'IA s'occupe des tâches répétitives pour vous libérer du temps.", icon: <Zap /> },
                  { title: "Sécurité de Niveau Bancaire", desc: "Vos données sont cryptées et sauvegardées automatiquement.", icon: <Lock /> },
                  { title: "Simplicité Déconcertante", desc: "Une interface intuitive que votre équipe maîtrisera en 15 minutes.", icon: <Globe /> }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="flex-shrink-0 w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-lg font-black uppercase tracking-tight mb-2">{item.title}</h4>
                      <p className="text-slate-500 text-sm font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-black tracking-tighter uppercase mb-6">Fonctionnalités Puissantes</h2>
            <p className="text-slate-400 font-medium">Un arsenal complet d'outils conçus pour l'excellence opérationnelle.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div 
                key={i}
                className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl hover:border-indigo-500/50 transition-all"
              >
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6">
                  {f.icon}
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight mb-4">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-black tracking-tighter uppercase mb-6">Tarification Transparente</h2>
            <p className="text-slate-500 font-medium">Choisissez le plan qui correspond à l'ambition de votre entreprise.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="p-10 bg-white border border-slate-100 rounded-[3rem] hover:shadow-2xl transition-all flex flex-col">
              <div className="mb-8">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">Starter AI</span>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tighter">9 900</span>
                  <span className="text-slate-400 font-bold text-sm">FCFA / mois</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                {["3 Utilisateurs", "5 Clients", "Modules Essentiels", "Support Standard", "Dashboard Basique"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                    <CheckCircle2 size={18} className="text-emerald-500" /> {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => onLogin({ openRegister: true, planId: 'BASIC', regStep: 1 })} className="w-full py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">Commencer</button>
            </div>

            {/* PRO */}
            <div className="p-10 bg-slate-900 text-white border border-slate-800 rounded-[3rem] shadow-2xl relative transform lg:scale-105 z-10 flex flex-col">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Le plus populaire</div>
              <div className="mb-8">
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest">PRO</span>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tighter">24 900</span>
                  <span className="text-slate-500 font-bold text-sm">FCFA / mois</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                {["10 Utilisateurs", "12 Clients", "Security + Recovery", "Support Prioritaire", "Chatbot", "Facturation Factur-X"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-300">
                    <CheckCircle2 size={18} className="text-indigo-400" /> {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => onLogin({ openRegister: true, planId: 'PRO', regStep: 1 })} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20">Commencer</button>
            </div>

            {/* Enterprise */}
            <div className="p-10 bg-white border border-slate-100 rounded-[3rem] hover:shadow-2xl transition-all flex flex-col">
              <div className="mb-8">
                <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-widest">Enterprise Cloud</span>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tighter">79 000</span>
                  <span className="text-slate-500 font-bold text-sm">FCFA / mois</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                {["Utilisateurs Illimités","Module RH Avancé","Inventory Campaigns", "Récouvrement", "Chatbot Intelligent", "Support Premium 24/7"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                    <CheckCircle2 size={18} className="text-purple-500" /> {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => onLogin({ openRegister: true, planId: 'ENTERPRISE', regStep: 1 })} className="w-full py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">Commencer</button>
            </div>  
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl font-black tracking-tighter uppercase mb-12">Pourquoi choisir <span className="text-indigo-600">GeStockPro ?</span></h2>
              <div className="grid sm:grid-cols-2 gap-8">
                {[
                  { title: "Sécurité Renforcée", desc: "Protocoles de sécurité militaires pour vos données.", icon: <ShieldCheck /> },
                  { title: "Cloud Scalable", desc: "Une infrastructure qui grandit avec votre succès.", icon: <Globe /> },
                  { title: "AI-Native", desc: "L'intelligence artificielle intégrée nativement.", icon: <Cpu /> },
                  { title: "Performance", desc: "Une rapidité d'exécution inégalée sur le marché.", icon: <Zap /> }
                ].map((item, i) => (
                  <div key={i}>
                    <div className="w-12 h-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mb-6">
                      {item.icon}
                    </div>
                    <h4 className="text-sm font-black uppercase mb-2">{item.title}</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full"></div>
              <h3 className="text-3xl font-black tracking-tighter uppercase mb-8 leading-tight">Optimisez votre trésorerie dès aujourd'hui.</h3>
              <p className="text-slate-400 font-medium mb-10 leading-relaxed">
                Nos clients constatent en moyenne une réduction de 30% de leurs coûts opérationnels dès les 3 premiers mois d'utilisation.
              </p>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                    <CheckCircle2 size={20} />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-wider">+15% de marge nette moyenne</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                    <CheckCircle2 size={20} />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-wider">-40% de temps administratif</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black tracking-tighter uppercase mb-6">Ils nous font confiance</h2>
            <div className="flex justify-center gap-1">
              {[1,2,3,4,5].map(i => <Star key={i} className="text-amber-400 fill-amber-400" size={20} />)}
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Moussa Diop", role: "CEO, TechSolutions Dakar", text: "GeStockPro a radicalement changé notre façon de gérer nos stocks. L'IA nous prévient avant même que nous soyons en rupture." },
              { name: "Awa Ndiaye", role: "Gérante, Mode & Style", text: "La facturation est devenue un plaisir. Mes clients reçoivent des factures professionnelles et je suis payée plus rapidement." },
              { name: "Jean-Marc Koffi", role: "Directeur, AgroBusiness CI", text: "Un outil puissant, intuitif et surtout sécurisé. Le support client est réactif et très professionnel." }
            ].map((t, i) => (
              <div key={i} className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-all">
                <p className="text-slate-600 italic mb-8 leading-relaxed text-sm">"{t.text}"</p>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight">{t.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500 blur-[120px] rounded-full"></div>
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-5xl font-black tracking-tighter leading-[0.9] mb-10 uppercase">
                Notre Vision pour <span className="text-indigo-400">l'Afrique.</span>
              </h2>
              <p className="text-xl text-slate-400 font-medium leading-relaxed mb-12">
                GeStockPro est né pour aider les TPE/PME africaines à entrer dans l'ère numérique avec un outil moderne, sécurisé et intelligent.
              </p>
              <div className="space-y-8">
                {[
                  { title: "Mission", desc: "Démocratiser l'accès aux technologies ERP de pointe pour toutes les entreprises." },
                  { title: "Vision", desc: "Devenir le standard de la gestion commerciale intelligente sur le continent." },
                  { title: "Engagement", desc: "Innovation constante et support de proximité pour nos partenaires." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="w-1 h-12 bg-indigo-500 rounded-full"></div>
                    <div>
                      <h4 className="text-lg font-black uppercase mb-2">{item.title}</h4>
                      <p className="text-slate-400 text-sm font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-slate-800 rounded-[4rem] flex items-center justify-center p-12 border border-slate-700">
                <div className="text-center">
                  <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-600/20">
                    <Globe size={48} />
                  </div>
                  <p className="text-4xl font-black tracking-tighter uppercase mb-4">Basé à Dakar</p>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Rayonnement Continental</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-4xl font-black tracking-tighter uppercase text-center mb-16">Questions Fréquentes</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-slate-100 rounded-2xl overflow-hidden">
                <button 
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-black uppercase tracking-tight text-sm">{faq.question}</span>
                  {activeFaq === i ? <Minus size={18} /> : <Plus size={18} />}
                </button>
                {activeFaq === i && (
                  <div className="p-6 pt-0 text-slate-500 text-sm font-medium leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20">
            <div>
              <h2 className="text-4xl font-black tracking-tighter uppercase mb-8">Contactez-nous</h2>
              <p className="text-slate-500 font-medium mb-12">Notre équipe d'experts est à votre écoute pour vous accompagner dans votre transformation digitale.</p>
              
              <div className="space-y-8">
               <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg text-indigo-600">
                    <Mail size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Professionnel</p>
                    <p className="text-lg font-black text-slate-900">diankaseydou52@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg text-emerald-500">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp Business</p>
                    <p className="text-lg font-black text-slate-900">+221 78 131 13 71</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg text-slate-900">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Siège Social</p>
                    <p className="text-lg font-black text-slate-900">Dakar, Sénégal</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100">
              <form className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom complet</label>
                    <input type="text" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium" placeholder="Ex: Moussa Diop" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</label>
                    <input type="email" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium" placeholder="Ex: m.diop@tech.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Téléphone</label>
                  <input type="tel" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium" placeholder="+221 ..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message</label>
                  <textarea rows={4} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium resize-none" placeholder="Comment pouvons-nous vous aider ?"></textarea>
                </div>
                <button type="button" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200">Envoyer le message</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-indigo-600 rounded-[4rem] p-16 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
              <div className="absolute -top-20 -left-20 w-96 h-96 bg-white blur-[100px] rounded-full"></div>
              <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-slate-900 blur-[100px] rounded-full"></div>
            </div>
            <div className="relative z-10">
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-8 leading-tight">Prêt à transformer <br />votre gestion ?</h2>
              <p className="text-xl text-indigo-100 font-medium mb-12 max-w-2xl mx-auto">Rejoignez des centaines d'entrepreneurs qui ont déjà fait le choix de l'intelligence et de la simplicité.</p>
              <div className="flex flex-wrap justify-center gap-6">
                <button 
                  onClick={onLogin}
                  className="px-10 py-5 bg-white text-indigo-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-2xl"
                >
                  Essayer gratuitement
                </button>
                <button 
                  onClick={onLogin}
                  className="px-10 py-5 bg-indigo-700 text-white border-2 border-indigo-500 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-800 transition-all"
                >
                  Parler à un expert
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-8">
                <div className="flex items-center gap-3">
            <img src="../../assets/logo_gestockpro-removebg-preview.png" alt="GeStockPro" className="h-12 w-auto" />
          </div>
              </div>
              <p className="text-slate-500 font-medium max-w-sm leading-relaxed mb-8">
                L'ERP intelligent conçu pour propulser les TPE et PME africaines vers l'excellence opérationnelle.
              </p>
              <div className="flex gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer">
                    <Globe size={18} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest mb-8">Liens Rapides</h4>
              <ul className="space-y-4 text-sm font-bold text-slate-500">
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Accueil</a></li>
                <li><a href="#features" className="hover:text-indigo-600 transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-indigo-600 transition-colors">Tarifs</a></li>
                <li><a href="#about" className="hover:text-indigo-600 transition-colors">À propos</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest mb-8">Légal</h4>
              <ul className="space-y-4 text-sm font-bold text-slate-500">
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Confidentialité</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Conditions d'utilisation</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Cookies</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Sécurité</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">© 2024 GeStockPro. Tous droits réservés.</p>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
              Fait avec <Star size={12} className="text-indigo-500 fill-indigo-500" /> à Dakar
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;