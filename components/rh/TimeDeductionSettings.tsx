import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Clock,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';

interface TimeDeductionSettingsProps {
  onNavigate?: (tab: string, meta?: any) => void;
}

interface PayrollSettings {
  deductionEnabled: boolean;
  workStartTime: string;
  workEndTime: string;
  workingDaysPerMonth: number;
}

interface HRRule {
  id: string;
  name: string;
  description?: string;
  type: 'LATE' | 'ABSENCE' | 'UNPAID_LEAVE';
  conditionOperator: 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ';
  conditionValue: number;
  conditionUnit: 'MINUTES' | 'HOURS' | 'DAYS';
  actionType: 'DEDUCT_FIXED' | 'DEDUCT_SALARY_HOURS' | 'DEDUCT_SALARY_DAYS' | 'DEDUCT_PERCENT';
  actionValue: number;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY_RULE: Omit<HRRule, 'id'> = {
  name: '',
  description: '',
  type: 'LATE',
  conditionOperator: 'GT',
  conditionValue: 15,
  conditionUnit: 'MINUTES',
  actionType: 'DEDUCT_SALARY_HOURS',
  actionValue: 1,
  isActive: true,
  sortOrder: 0
};

const TYPE_LABELS: Record<string, string> = {
  LATE: 'Retard',
  ABSENCE: 'Absence injustifiée',
  UNPAID_LEAVE: 'Congé non payé'
};

const OP_LABELS: Record<string, string> = {
  GT: '>', GTE: '≥', LT: '<', LTE: '≤', EQ: '='
};

const ACTION_LABELS: Record<string, string> = {
  DEDUCT_FIXED: 'Montant fixe (F CFA)',
  DEDUCT_SALARY_HOURS: 'Heures de salaire',
  DEDUCT_SALARY_DAYS: 'Jours de salaire',
  DEDUCT_PERCENT: '% du salaire'
};

const TYPE_COLORS: Record<string, string> = {
  LATE: 'bg-amber-100 text-amber-700 border-amber-200',
  ABSENCE: 'bg-rose-100 text-rose-700 border-rose-200',
  UNPAID_LEAVE: 'bg-purple-100 text-purple-700 border-purple-200'
};

const TimeDeductionSettings: React.FC<TimeDeductionSettingsProps> = ({ onNavigate }) => {
  const [settings, setSettings] = useState<PayrollSettings>({
    deductionEnabled: false,
    workStartTime: '08:00',
    workEndTime: '17:00',
    workingDaysPerMonth: 26
  });
  const [rules, setRules] = useState<HRRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<HRRule> | null>(null);
  const [isNewRule, setIsNewRule] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');

  const showNotif = (msg: string, type: 'success' | 'error' = 'success') => {
    setAlertMsg(msg);
    setAlertType(type);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsData, rulesData] = await Promise.all([
        api.get('/hr/payroll-settings'),
        api.get('/hr/rules')
      ]);
      if (settingsData) {
        setSettings({
          deductionEnabled: settingsData.deductionEnabled ?? false,
          workStartTime: settingsData.workStartTime || '08:00',
          workEndTime: settingsData.workEndTime || '17:00',
          workingDaysPerMonth: settingsData.workingDaysPerMonth || 26
        });
      }
      setRules(rulesData || []);
    } catch (err) {
      showNotif('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/hr/payroll-settings', settings);
      showNotif('Paramètres enregistrés');
    } catch (err: any) {
      showNotif(err.message || 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDeduction = async () => {
    const newVal = !settings.deductionEnabled;
    const updated = { ...settings, deductionEnabled: newVal };
    setSettings(updated);
    try {
      await api.put('/hr/payroll-settings', updated);
      showNotif(newVal ? 'Déductions activées' : 'Déductions désactivées');
    } catch (err: any) {
      setSettings(settings); // revert
      showNotif(err.message || 'Erreur', 'error');
    }
  };

  const handleToggleRule = async (rule: HRRule) => {
    setSavingRuleId(rule.id);
    try {
      const updated = await api.patch(`/hr/rules/${rule.id}/toggle`, {});
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: updated.isActive } : r));
    } catch (err: any) {
      showNotif(err.message || 'Erreur', 'error');
    } finally {
      setSavingRuleId(null);
    }
  };

  const openNewRule = () => {
    setEditingRule({ ...EMPTY_RULE });
    setIsNewRule(true);
    setShowRuleModal(true);
  };

  const openEditRule = (rule: HRRule) => {
    setEditingRule({ ...rule });
    setIsNewRule(false);
    setShowRuleModal(true);
  };

  const handleSaveRule = async () => {
    if (!editingRule?.name || !editingRule.type) {
      showNotif('Nom et type requis', 'error');
      return;
    }
    setSaving(true);
    try {
      if (isNewRule) {
        const created = await api.post('/hr/rules', editingRule);
        setRules(prev => [...prev, created]);
      } else {
        const updated = await api.put(`/hr/rules/${editingRule.id}`, editingRule);
        setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
      }
      setShowRuleModal(false);
      showNotif(isNewRule ? 'Règle créée' : 'Règle mise à jour');
    } catch (err: any) {
      showNotif(err.message || 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Supprimer cette règle ?')) return;
    try {
      await api.delete(`/hr/rules/${id}`);
      setRules(prev => prev.filter(r => r.id !== id));
      showNotif('Règle supprimée');
    } catch (err: any) {
      showNotif(err.message || 'Erreur', 'error');
    }
  };

  const ruleLabel = (rule: HRRule) => {
    const unit = rule.conditionUnit === 'MINUTES' ? 'min' : rule.conditionUnit === 'HOURS' ? 'h' : 'j';
    const action = rule.actionType === 'DEDUCT_FIXED'
      ? `${rule.actionValue} F CFA`
      : rule.actionType === 'DEDUCT_PERCENT'
      ? `${rule.actionValue}%`
      : rule.actionType === 'DEDUCT_SALARY_HOURS'
      ? `${rule.actionValue}h de salaire`
      : `${rule.actionValue}j de salaire`;
    return `Si ${TYPE_LABELS[rule.type]} ${OP_LABELS[rule.conditionOperator]} ${rule.conditionValue}${unit} → déduire ${action}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Alert */}
      <AnimatePresence>
        {showAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-3 ${
              alertType === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {alertType === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertTriangle size={16} />}
            {alertMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
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
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Gestion des Temps — Paramètres</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Configurez les règles de déduction sur salaire</p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="ml-auto w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* ─── Global toggle card ─── */}
        <div className={`p-8 rounded-[2.5rem] border shadow-sm transition-all ${
          settings.deductionEnabled
            ? 'bg-indigo-950 border-indigo-900'
            : 'bg-white border-slate-100'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-lg font-black uppercase tracking-tighter ${settings.deductionEnabled ? 'text-white' : 'text-slate-900'}`}>
                Déductions automatiques
              </h2>
              <p className={`text-xs font-medium mt-1 ${settings.deductionEnabled ? 'text-indigo-300' : 'text-slate-400'}`}>
                {settings.deductionEnabled
                  ? 'Activé — les règles ci-dessous s\'appliquent au calcul de la paie'
                  : 'Désactivé — aucune déduction ne sera effectuée sur les salaires'}
              </p>
            </div>
            <button
              onClick={handleToggleDeduction}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                settings.deductionEnabled
                  ? 'bg-white text-indigo-900 hover:bg-indigo-50'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {settings.deductionEnabled
                ? <><ToggleRight size={18} /> Activé</>
                : <><ToggleLeft size={18} /> Désactivé</>}
            </button>
          </div>

          {!settings.deductionEnabled && (
            <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <Info size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-medium">
                Tant que cette option est désactivée, aucune règle de retard ou d'absence ne sera appliquée lors du calcul des fiches de paie. Vous pouvez configurer les règles à l'avance sans qu'elles soient actives.
              </p>
            </div>
          )}
        </div>

        {/* ─── Horaires de travail ─── */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h2 className="text-base font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-3">
            <Clock size={18} className="text-indigo-500" /> Horaires de référence
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Heure d'arrivée normale
              </label>
              <input
                type="time"
                value={settings.workStartTime}
                onChange={e => setSettings(s => ({ ...s, workStartTime: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <p className="text-[9px] text-slate-400">Référence pour calculer les retards</p>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Heure de départ normale
              </label>
              <input
                type="time"
                value={settings.workEndTime}
                onChange={e => setSettings(s => ({ ...s, workEndTime: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <p className="text-[9px] text-slate-400">Référence pour les heures supplémentaires</p>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Jours ouvrables / mois
              </label>
              <input
                type="number"
                min={20}
                max={31}
                value={settings.workingDaysPerMonth}
                onChange={e => setSettings(s => ({ ...s, workingDaysPerMonth: parseInt(e.target.value) || 26 }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <p className="text-[9px] text-slate-400">Pour le calcul du taux journalier</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              Enregistrer
            </button>
          </div>
        </div>

        {/* ─── Rules list ─── */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
              <Settings size={18} className="text-indigo-500" /> Règles de déduction
              <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-xl text-xs font-black">{rules.length}</span>
            </h2>
            <button
              onClick={openNewRule}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all"
            >
              <Plus size={14} /> Nouvelle règle
            </button>
          </div>

          {!settings.deductionEnabled && rules.length > 0 && (
            <div className="mb-4 flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <Info size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500 font-medium">
                Ces règles sont configurées mais <strong>inactives globalement</strong>. Activez les déductions automatiques ci-dessus pour qu'elles s'appliquent.
              </p>
            </div>
          )}

          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Settings size={40} className="mb-4 text-slate-200" />
              <p className="font-bold text-slate-500">Aucune règle définie</p>
              <p className="text-sm mt-1">Créez votre première règle de déduction</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => (
                <motion.div
                  key={rule.id}
                  layout
                  className={`flex items-center gap-4 p-5 rounded-2xl border transition-all ${
                    rule.isActive && settings.deductionEnabled
                      ? 'bg-white border-indigo-100 shadow-sm'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${TYPE_COLORS[rule.type]}`}>
                        {TYPE_LABELS[rule.type]}
                      </span>
                      <span className="text-sm font-black text-slate-900">{rule.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{ruleLabel(rule)}</p>
                    {rule.description && (
                      <p className="text-[10px] text-slate-400 mt-1">{rule.description}</p>
                    )}
                  </div>

                  {/* Per-rule toggle */}
                  <button
                    onClick={() => handleToggleRule(rule)}
                    disabled={savingRuleId === rule.id}
                    title={rule.isActive ? 'Désactiver cette règle' : 'Activer cette règle'}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border ${
                      rule.isActive
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                        : 'bg-slate-50 text-slate-300 border-slate-100 hover:border-slate-300'
                    } disabled:opacity-50`}
                  >
                    {savingRuleId === rule.id
                      ? <RefreshCw size={12} className="animate-spin" />
                      : rule.isActive
                      ? <ToggleRight size={14} />
                      : <ToggleLeft size={14} />}
                  </button>

                  <button
                    onClick={() => openEditRule(rule)}
                    className="w-8 h-8 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="w-8 h-8 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-200 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Rule Modal ─── */}
      <AnimatePresence>
        {showRuleModal && editingRule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={e => { if (e.target === e.currentTarget) setShowRuleModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">
                  {isNewRule ? 'Nouvelle règle' : 'Modifier la règle'}
                </h3>
                <button
                  onClick={() => setShowRuleModal(false)}
                  className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nom *</label>
                  <input
                    type="text"
                    placeholder="Ex: Retard > 15 min"
                    value={editingRule.name || ''}
                    onChange={e => setEditingRule(r => ({ ...r!, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Type */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type *</label>
                  <select
                    value={editingRule.type || 'LATE'}
                    onChange={e => setEditingRule(r => ({
                      ...r!,
                      type: e.target.value as HRRule['type'],
                      conditionUnit: e.target.value === 'LATE' ? 'MINUTES' : 'DAYS'
                    }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="LATE">Retard</option>
                    <option value="ABSENCE">Absence injustifiée</option>
                    <option value="UNPAID_LEAVE">Congé non payé</option>
                  </select>
                </div>

                {/* Condition */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Condition</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={editingRule.conditionOperator || 'GT'}
                      onChange={e => setEditingRule(r => ({ ...r!, conditionOperator: e.target.value as HRRule['conditionOperator'] }))}
                      className="px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-20"
                    >
                      <option value="GT">&gt;</option>
                      <option value="GTE">≥</option>
                      <option value="LT">&lt;</option>
                      <option value="LTE">≤</option>
                      <option value="EQ">=</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      value={editingRule.conditionValue ?? 15}
                      onChange={e => setEditingRule(r => ({ ...r!, conditionValue: parseFloat(e.target.value) || 0 }))}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <select
                      value={editingRule.conditionUnit || 'MINUTES'}
                      onChange={e => setEditingRule(r => ({ ...r!, conditionUnit: e.target.value as HRRule['conditionUnit'] }))}
                      className="px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {(editingRule.type || 'LATE') === 'LATE' ? (
                        <>
                          <option value="MINUTES">min</option>
                          <option value="HOURS">heures</option>
                        </>
                      ) : (
                        <option value="DAYS">jours</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Action */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Action de déduction</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={editingRule.actionType || 'DEDUCT_SALARY_HOURS'}
                      onChange={e => setEditingRule(r => ({ ...r!, actionType: e.target.value as HRRule['actionType'] }))}
                      className="flex-1 px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="DEDUCT_FIXED">Montant fixe (F CFA)</option>
                      <option value="DEDUCT_SALARY_HOURS">Heures de salaire</option>
                      <option value="DEDUCT_SALARY_DAYS">Jours de salaire</option>
                      <option value="DEDUCT_PERCENT">% du salaire</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      step={editingRule.actionType === 'DEDUCT_PERCENT' ? 0.1 : 1}
                      value={editingRule.actionValue ?? 1}
                      onChange={e => setEditingRule(r => ({ ...r!, actionValue: parseFloat(e.target.value) || 0 }))}
                      className="w-24 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Description (optionnel)</label>
                  <input
                    type="text"
                    placeholder="Note interne…"
                    value={editingRule.description || ''}
                    onChange={e => setEditingRule(r => ({ ...r!, description: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Preview */}
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Aperçu</p>
                  <p className="text-xs font-bold text-indigo-800">
                    Si {TYPE_LABELS[editingRule.type || 'LATE']} {OP_LABELS[editingRule.conditionOperator || 'GT']} {editingRule.conditionValue ?? 0}
                    {editingRule.conditionUnit === 'MINUTES' ? ' min' : editingRule.conditionUnit === 'HOURS' ? ' h' : ' j'}
                    {' '}→ déduire {editingRule.actionValue ?? 0}
                    {editingRule.actionType === 'DEDUCT_FIXED' ? ' F CFA' :
                      editingRule.actionType === 'DEDUCT_PERCENT' ? '%' :
                      editingRule.actionType === 'DEDUCT_SALARY_HOURS' ? ' heure(s) de salaire' : ' jour(s) de salaire'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowRuleModal(false)}
                  className="px-6 py-3 bg-slate-50 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveRule}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  {isNewRule ? 'Créer' : 'Enregistrer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TimeDeductionSettings;
