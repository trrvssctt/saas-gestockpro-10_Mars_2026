
import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Filter,
  Search,
  Clock3,
  Sunrise,
  Sunset,
  Timer,
  BarChart3,
  ArrowLeft,
  Edit3,
  Save,
  X,
  TrendingUp,
  Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HRModal from './HRModal';
import { api } from '../../services/api';

interface AttendanceProps {
  onNavigate?: (tab: string, meta?: any) => void;
}

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'HOLIDAY' | 'REMOTE';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: AttendanceStatus;
  overtimeMinutes?: number;
  meta?: { lateMinutes?: number; expectedStart?: string };
  source?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position?: string;
  photoUrl?: string;
  status: string;
  departmentInfo?: { name: string };
}

interface DayRecord {
  employee: Employee;
  attendance: AttendanceRecord | null;
}

interface PayrollSettings {
  workStartTime: string;
  workEndTime: string;
  workingDaysPerMonth: number;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Présent',
  ABSENT: 'Absent',
  LATE: 'En retard',
  HALF_DAY: 'Mi-journée',
  HOLIDAY: 'Congé',
  REMOTE: 'Télétravail'
};

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  ABSENT: 'bg-rose-100 text-rose-700 border-rose-200',
  LATE: 'bg-amber-100 text-amber-700 border-amber-200',
  HALF_DAY: 'bg-blue-100 text-blue-700 border-blue-200',
  HOLIDAY: 'bg-purple-100 text-purple-700 border-purple-200',
  REMOTE: 'bg-cyan-100 text-cyan-700 border-cyan-200'
};

const STATUS_ICONS: Record<AttendanceStatus, React.ReactNode> = {
  PRESENT: <CheckCircle2 size={12} />,
  ABSENT: <XCircle size={12} />,
  LATE: <AlertTriangle size={12} />,
  HALF_DAY: <Clock3 size={12} />,
  HOLIDAY: <Calendar size={12} />,
  REMOTE: <Users size={12} />
};

const toDateOnly = (dateStr: string): string => dateStr?.substring(0, 10) ?? '';

const fmtTime = (isoStr?: string): string => {
  if (!isoStr) return '--:--';
  try {
    return new Date(isoStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoStr.substring(11, 16) || '--:--';
  }
};

const Attendance: React.FC<AttendanceProps> = ({ onNavigate }) => {
  const today = new Date().toISOString().substring(0, 10);

  const [activeView, setActiveView] = useState<'daily' | 'history' | 'stats'>('daily');
  const [selectedDate, setSelectedDate] = useState(today);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allAttendances, setAllAttendances] = useState<AttendanceRecord[]>([]);
  const [dayRecords, setDayRecords] = useState<DayRecord[]>([]);
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | 'ALL'>('ALL');
  const [editingRecord, setEditingRecord] = useState<{ empId: string; record: Partial<AttendanceRecord> } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  // History filters
  const [historyMonth, setHistoryMonth] = useState(today.substring(0, 7));
  const [historyEmployee, setHistoryEmployee] = useState('');

  const showNotif = (msg: string) => {
    setAlertMsg(msg);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [empsData, attendData, settingsData] = await Promise.all([
        api.get('/hr/employees'),
        api.get('/hr/attendance'),
        api.get('/hr/payroll-settings').catch(() => null)
      ]);
      const emps: Employee[] = (empsData?.rows || empsData || []).filter((e: Employee) => e.status === 'ACTIVE');
      const atts: AttendanceRecord[] = attendData || [];
      setEmployees(emps);
      setAllAttendances(atts);
      if (settingsData) setPayrollSettings(settingsData as PayrollSettings);
    } catch (err) {
      console.error('Erreur chargement pointage:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Rebuild day records whenever date or data changes
  useEffect(() => {
    const records: DayRecord[] = employees.map(emp => ({
      employee: emp,
      attendance: allAttendances.find(a => a.employeeId === emp.id && toDateOnly(a.date) === selectedDate) ?? null
    }));
    setDayRecords(records);
  }, [employees, allAttendances, selectedDate]);

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().substring(0, 10));
  };

  // Quick-mark a status for one employee on the selected date
  const handleQuickMark = async (empId: string, status: AttendanceStatus) => {
    const existing = allAttendances.find(a => a.employeeId === empId && toDateOnly(a.date) === selectedDate);
    setSaving(empId);
    try {
      if (existing) {
        const updated = await api.put(`/hr/attendance/${existing.id}`, { status });
        setAllAttendances(prev => prev.map(a => a.id === existing.id ? { ...a, ...updated } : a));
      } else {
        const created = await api.post('/hr/attendance', {
          employeeId: empId,
          date: selectedDate,
          status,
          source: 'manual'
        });
        setAllAttendances(prev => [...prev, created]);
      }
    } catch (err: any) {
      showNotif(err.message || 'Erreur lors du pointage');
    } finally {
      setSaving(null);
    }
  };

  // Open detail edit modal
  const openEdit = (empId: string, current: AttendanceRecord | null) => {
    setEditingRecord({
      empId,
      record: current
        ? { ...current }
        : {
            employeeId: empId,
            date: selectedDate,
            status: 'PRESENT',
            clockIn: `${selectedDate}T08:00`,
            clockOut: `${selectedDate}T17:00`,
            overtimeMinutes: 0
          }
    });
    setIsEditModalOpen(true);
  };

  const handleSaveDetail = async () => {
    if (!editingRecord) return;
    const { empId, record } = editingRecord;
    const existing = allAttendances.find(a => a.employeeId === empId && toDateOnly(a.date) === selectedDate);
    setSaving(empId);
    try {
      if (existing) {
        const updated = await api.put(`/hr/attendance/${existing.id}`, record);
        setAllAttendances(prev => prev.map(a => a.id === existing.id ? { ...a, ...updated } : a));
      } else {
        const created = await api.post('/hr/attendance', { ...record, employeeId: empId, date: selectedDate, source: 'manual' });
        setAllAttendances(prev => [...prev, created]);
      }
      setIsEditModalOpen(false);
      showNotif('Pointage enregistré');
    } catch (err: any) {
      showNotif(err.message || 'Erreur');
    } finally {
      setSaving(null);
    }
  };

  // Bulk mark all employees for today
  const handleMarkAllPresent = async () => {
    const unmarked = dayRecords.filter(r => !r.attendance);
    if (unmarked.length === 0) { showNotif('Tous les employés sont déjà pointés'); return; }
    setLoading(true);
    try {
      const created = await Promise.all(unmarked.map(r =>
        api.post('/hr/attendance', { employeeId: r.employee.id, date: selectedDate, status: 'PRESENT', source: 'manual' })
      ));
      setAllAttendances(prev => [...prev, ...created]);
      showNotif(`${created.length} employé(s) marqué(s) présent`);
    } catch (err: any) {
      showNotif(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Computed stats for selected date
  const stats = {
    present: dayRecords.filter(r => r.attendance?.status === 'PRESENT').length,
    absent: dayRecords.filter(r => !r.attendance || r.attendance.status === 'ABSENT').length,
    late: dayRecords.filter(r => r.attendance?.status === 'LATE' || (r.attendance?.meta?.lateMinutes ?? 0) > 0).length,
    halfDay: dayRecords.filter(r => r.attendance?.status === 'HALF_DAY').length,
    holiday: dayRecords.filter(r => r.attendance?.status === 'HOLIDAY').length,
    remote: dayRecords.filter(r => r.attendance?.status === 'REMOTE').length,
    total: employees.length
  };

  const filteredRecords = dayRecords.filter(r => {
    const matchSearch = !searchTerm
      || `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      || r.employee.position?.toLowerCase().includes(searchTerm.toLowerCase());
    const effectiveStatus: AttendanceStatus = r.attendance?.status as AttendanceStatus || 'ABSENT';
    const matchStatus = filterStatus === 'ALL' || effectiveStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  // History: all records for the month (optionally filtered by employee)
  const historyRecords = allAttendances.filter(a => {
    const matchMonth = a.date && toDateOnly(a.date).startsWith(historyMonth);
    const matchEmp = !historyEmployee || a.employeeId === historyEmployee;
    return matchMonth && matchEmp;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const getEmployee = (id: string) => employees.find(e => e.id === id);

  const dateDisplay = new Date(selectedDate + 'T12:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Alert */}
      <AnimatePresence>
        {showAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 px-6 py-4 bg-slate-900 text-white rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-3"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            {alertMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Pointage & Présences</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Gestion des présences et absences des employés</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-fit">
          {[
            { id: 'daily', label: 'Journalier', icon: <Calendar size={14} /> },
            { id: 'history', label: 'Historique', icon: <Clock size={14} /> },
            { id: 'stats', label: 'Statistiques', icon: <BarChart3 size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeView === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ─── DAILY VIEW ─── */}
        {activeView === 'daily' && (
          <div className="space-y-6">
            {/* Date navigation */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => shiftDate(-1)}
                    className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-all border border-slate-100"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 capitalize">{dateDisplay}</h2>
                    {selectedDate === today && (
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">
                        Aujourd'hui
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => shiftDate(1)}
                    disabled={selectedDate >= today}
                    className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-all border border-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    max={today}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleMarkAllPresent}
                    disabled={loading}
                    className="px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <CheckCircle2 size={14} /> Tous présents
                  </button>
                </div>
              </div>

              {/* Stats summary */}
              <div className="grid grid-cols-6 gap-3 mt-6">
                {[
                  { label: 'Présents', value: stats.present, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Absents', value: stats.absent, color: 'text-rose-600', bg: 'bg-rose-50' },
                  { label: 'Retards', value: stats.late, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Mi-temps', value: stats.halfDay, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Congés', value: stats.holiday, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Télétravail', value: stats.remote, color: 'text-cyan-600', bg: 'bg-cyan-50' }
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un employé…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                {(['ALL', 'PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'HOLIDAY', 'REMOTE'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                      filterStatus === s
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {s === 'ALL' ? 'Tous' : STATUS_LABELS[s as AttendanceStatus]}
                  </button>
                ))}
              </div>
            </div>

            {/* Employee List */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-400">
                  <RefreshCw size={24} className="animate-spin mr-3" />
                  <span className="font-medium">Chargement…</span>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Users size={40} className="mb-4 text-slate-300" />
                  <p className="font-bold text-slate-500">Aucun employé trouvé</p>
                  <p className="text-sm mt-1">Ajustez les filtres ou ajoutez des employés</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Employé</th>
                      <th className="text-left py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                      <th className="text-left py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <Sunrise size={10} className="inline mr-1" /> Arrivée
                      </th>
                      <th className="text-left py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <Sunset size={10} className="inline mr-1" /> Départ
                      </th>
                      <th className="text-left py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <Timer size={10} className="inline mr-1" /> Retard
                      </th>
                      <th className="text-left py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <TrendingUp size={10} className="inline mr-1" /> Heures supp.
                      </th>
                      <th className="text-right py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredRecords.map(({ employee, attendance }) => {
                        const effectiveStatus: AttendanceStatus = attendance?.status as AttendanceStatus || 'ABSENT';
                        const lateMin = attendance?.meta?.lateMinutes ?? 0;
                        const isSavingThis = saving === employee.id;

                        return (
                          <motion.tr
                            key={employee.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {employee.photoUrl ? (
                                    <img src={employee.photoUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                                  ) : (
                                    <span className="text-xs font-black text-slate-500">
                                      {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-black text-slate-900">{employee.firstName} {employee.lastName}</p>
                                  <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                                    {employee.departmentInfo?.name || employee.position || '—'}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${STATUS_COLORS[effectiveStatus]}`}>
                                {STATUS_ICONS[effectiveStatus]}
                                {STATUS_LABELS[effectiveStatus]}
                              </span>
                            </td>

                            <td className="py-4 px-4 text-sm font-bold text-slate-600">
                              {fmtTime(attendance?.clockIn)}
                            </td>

                            <td className="py-4 px-4 text-sm font-bold text-slate-600">
                              {fmtTime(attendance?.clockOut)}
                            </td>

                            <td className="py-4 px-4">
                              {lateMin > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                                  <AlertTriangle size={10} /> {lateMin} min
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs font-medium">—</span>
                              )}
                            </td>

                            <td className="py-4 px-4">
                              {(attendance?.overtimeMinutes ?? 0) > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                                  <TrendingUp size={10} /> +{attendance!.overtimeMinutes} min
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs font-medium">—</span>
                              )}
                            </td>

                            <td className="py-4 px-6">
                              <div className="flex items-center justify-end gap-2">
                                {/* Quick status buttons */}
                                {(['PRESENT', 'ABSENT', 'LATE', 'HOLIDAY', 'REMOTE'] as AttendanceStatus[]).map(s => (
                                  <button
                                    key={s}
                                    onClick={() => handleQuickMark(employee.id, s)}
                                    disabled={isSavingThis}
                                    title={STATUS_LABELS[s]}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] transition-all border ${
                                      effectiveStatus === s && attendance
                                        ? STATUS_COLORS[s] + ' shadow-sm'
                                        : 'bg-white border-slate-100 text-slate-300 hover:border-slate-300'
                                    } disabled:opacity-50`}
                                  >
                                    {isSavingThis ? <RefreshCw size={9} className="animate-spin" /> : STATUS_ICONS[s]}
                                  </button>
                                ))}
                                {/* Detail edit */}
                                <button
                                  onClick={() => openEdit(employee.id, attendance)}
                                  className="w-7 h-7 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                                  title="Modifier le détail"
                                >
                                  <Edit3 size={11} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ─── HISTORY VIEW ─── */}
        {activeView === 'history' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-3">
                <Clock className="text-indigo-500" /> Historique des Présences
              </h3>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mois</label>
                  <input
                    type="month"
                    value={historyMonth}
                    onChange={e => setHistoryMonth(e.target.value)}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Employé</label>
                  <select
                    value={historyEmployee}
                    onChange={e => setHistoryEmployee(e.target.value)}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none min-w-[180px]"
                  >
                    <option value="">Tous les employés</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                    ))}
                  </select>
                </div>
                <div className="ml-auto pt-5">
                  <span className="text-sm font-black text-slate-500">
                    {historyRecords.length} enregistrement(s)
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              {historyRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Clock size={40} className="mb-4 text-slate-300" />
                  <p className="font-bold text-slate-500">Aucun enregistrement pour cette période</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="text-left py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Employé</th>
                      <th className="text-left py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                      <th className="text-left py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Arrivée</th>
                      <th className="text-left py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Départ</th>
                      <th className="text-left py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Retard</th>
                      <th className="text-left py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Heures supp.</th>
                      <th className="text-left py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRecords.map(att => {
                      const emp = getEmployee(att.employeeId);
                      const status: AttendanceStatus = att.status as AttendanceStatus || 'ABSENT';
                      return (
                        <tr key={att.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-6 text-sm font-black text-slate-900">
                            {new Date(toDateOnly(att.date) + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </td>
                          <td className="py-4 px-4">
                            {emp ? (
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-black text-slate-500 flex-shrink-0">
                                  {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                                </div>
                                <span className="text-sm font-bold text-slate-800">{emp.firstName} {emp.lastName}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">Inconnu</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${STATUS_COLORS[status]}`}>
                              {STATUS_ICONS[status]} {STATUS_LABELS[status]}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm font-bold text-slate-600">{fmtTime(att.clockIn)}</td>
                          <td className="py-4 px-4 text-sm font-bold text-slate-600">{fmtTime(att.clockOut)}</td>
                          <td className="py-4 px-4">
                            {(att.meta?.lateMinutes ?? 0) > 0 ? (
                              <span className="text-xs font-black text-amber-600">{att.meta!.lateMinutes} min</span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-4 px-4">
                            {(att.overtimeMinutes ?? 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600">
                                <TrendingUp size={10} /> +{att.overtimeMinutes} min
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              {att.source || 'manual'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ─── STATS VIEW ─── */}
        {activeView === 'stats' && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Employés actifs', value: employees.length, icon: <Users size={22} />, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                {
                  label: 'Taux présence (mois)',
                  value: (() => {
                    const thisMonth = today.substring(0, 7);
                    const monthAtts = allAttendances.filter(a => toDateOnly(a.date).startsWith(thisMonth) && a.status === 'PRESENT');
                    const workdays = Math.min(new Date().getDate(), 30);
                    const expected = employees.length * workdays;
                    return expected > 0 ? `${Math.round(monthAtts.length / expected * 100)}%` : '—';
                  })(),
                  icon: <CheckCircle2 size={22} />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100'
                },
                {
                  label: 'Retards ce mois',
                  value: allAttendances.filter(a => toDateOnly(a.date).startsWith(today.substring(0, 7)) && (a.meta?.lateMinutes ?? 0) > 0).length,
                  icon: <AlertTriangle size={22} />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100'
                },
                {
                  label: 'Absences ce mois',
                  value: allAttendances.filter(a => toDateOnly(a.date).startsWith(today.substring(0, 7)) && a.status === 'ABSENT').length,
                  icon: <XCircle size={22} />, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100'
                }
              ].map(card => (
                <div key={card.label} className={`bg-white p-8 rounded-[2.5rem] border ${card.border} shadow-sm`}>
                  <div className={`w-12 h-12 ${card.bg} ${card.color} rounded-2xl flex items-center justify-center mb-4`}>
                    {card.icon}
                  </div>
                  <p className={`text-3xl font-black ${card.color}`}>{card.value}</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Per-employee summary for current month */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-3">
                <BarChart3 className="text-indigo-500" /> Récapitulatif mensuel par employé
              </h3>
              {/* Légende compensation */}
              <div className="flex items-center gap-4 mb-4 px-2">
                <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase tracking-widest"><TrendingUp size={10}/> Heures supp.</span>
                <span className="flex items-center gap-1.5 text-[9px] font-black text-rose-500 uppercase tracking-widest"><XCircle size={10}/> Absences</span>
                <span className="flex items-center gap-1.5 text-[9px] font-black text-indigo-600 uppercase tracking-widest"><Scale size={10}/> Compensation</span>
              </div>
              <div className="space-y-3">
                {employees.slice(0, 20).map(emp => {
                  const thisMonth = today.substring(0, 7);
                  const empAtts = allAttendances.filter(a => a.employeeId === emp.id && toDateOnly(a.date).startsWith(thisMonth));
                  const presentDays    = empAtts.filter(a => ['PRESENT','LATE'].includes(a.status)).length;
                  const absentDays     = empAtts.filter(a => a.status === 'ABSENT').length;
                  const lateDays       = empAtts.filter(a => (a.meta?.lateMinutes ?? 0) > 0).length;
                  const totalLateMin   = empAtts.reduce((s, a) => s + (a.meta?.lateMinutes ?? 0), 0);
                  const totalOvertimeMin = empAtts.reduce((s, a) => s + (a.overtimeMinutes ?? 0), 0);

                  // Calcul compensation locale
                  const workStart = payrollSettings?.workStartTime || '08:00';
                  const workEnd   = payrollSettings?.workEndTime   || '17:00';
                  const [sh, sm]  = workStart.split(':').map(Number);
                  const [eh, em]  = workEnd.split(':').map(Number);
                  const workDayMinutes = (eh * 60 + em) - (sh * 60 + sm);
                  const totalAbsenceMin  = absentDays * workDayMinutes;
                  const totalDeficitMin  = totalAbsenceMin + totalLateMin;
                  const compensatedMin   = Math.min(totalOvertimeMin, totalDeficitMin);
                  const remainingDeficit = totalDeficitMin - compensatedMin;
                  const remainingOT      = totalOvertimeMin - compensatedMin;

                  const workdaysInMonth = Math.min(new Date().getDate(), 26);
                  const attendanceRate  = workdaysInMonth > 0 ? Math.round(presentDays / workdaysInMonth * 100) : 0;

                  const fmtMin = (m: number) => {
                    const h = Math.floor(m / 60);
                    const mn = m % 60;
                    return h > 0 ? `${h}h${String(mn).padStart(2,'0')}` : `${mn}min`;
                  };

                  return (
                    <div key={emp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      {/* Ligne principale */}
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-xs font-black text-slate-600 border border-slate-100 flex-shrink-0">
                          {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-900 truncate">{emp.firstName} {emp.lastName}</p>
                          <p className="text-[9px] text-slate-400 font-medium uppercase">{emp.departmentInfo?.name || emp.position || '—'}</p>
                        </div>
                        <div className="flex items-center gap-4 text-center">
                          <div>
                            <p className="text-sm font-black text-emerald-600">{presentDays}</p>
                            <p className="text-[8px] text-slate-400 font-black uppercase">Présences</p>
                          </div>
                          <div>
                            <p className="text-sm font-black text-rose-600">{absentDays}</p>
                            <p className="text-[8px] text-slate-400 font-black uppercase">Absences</p>
                          </div>
                          <div>
                            <p className="text-sm font-black text-amber-600">{lateDays}</p>
                            <p className="text-[8px] text-slate-400 font-black uppercase">Retards</p>
                          </div>
                          {totalOvertimeMin > 0 && (
                            <div>
                              <p className="text-sm font-black text-emerald-500">+{fmtMin(totalOvertimeMin)}</p>
                              <p className="text-[8px] text-slate-400 font-black uppercase">Supp.</p>
                            </div>
                          )}
                        </div>
                        <div className="w-24 flex-shrink-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black text-slate-400">Taux</span>
                            <span className={`text-[9px] font-black ${attendanceRate >= 90 ? 'text-emerald-600' : attendanceRate >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                              {attendanceRate}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${attendanceRate >= 90 ? 'bg-emerald-500' : attendanceRate >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${attendanceRate}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Barre compensation (seulement si données significatives) */}
                      {(totalOvertimeMin > 0 || totalDeficitMin > 0) && (
                        <div className="flex items-center gap-3 pt-1 border-t border-slate-200">
                          <Scale size={11} className="text-indigo-400 flex-shrink-0" />
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden flex">
                            {(() => {
                              const total = Math.max(totalOvertimeMin + totalDeficitMin, 1);
                              const otPct  = Math.round(totalOvertimeMin / total * 100);
                              const defPct = Math.round(totalDeficitMin  / total * 100);
                              return (
                                <>
                                  <div className="h-full bg-emerald-400" style={{ width: `${otPct}%` }} />
                                  <div className="h-full bg-rose-400"    style={{ width: `${defPct}%` }} />
                                </>
                              );
                            })()}
                          </div>
                          {compensatedMin > 0 && (
                            <span className="text-[9px] font-black text-indigo-600 whitespace-nowrap">
                              ✓ {fmtMin(compensatedMin)} compensé
                            </span>
                          )}
                          {remainingDeficit > 0 && (
                            <span className="text-[9px] font-black text-rose-500 whitespace-nowrap">
                              -{fmtMin(remainingDeficit)} déficit
                            </span>
                          )}
                          {remainingOT > 0 && (
                            <span className="text-[9px] font-black text-emerald-600 whitespace-nowrap">
                              +{fmtMin(remainingOT)} crédit
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── DETAIL EDIT MODAL ─── */}
      <HRModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Détail du Pointage"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleSaveDetail}
              disabled={!!saving}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
              Enregistrer
            </button>
          </div>
        }
      >
        {editingRecord && (() => {
          const emp = employees.find(e => e.id === editingRecord.empId);
          const rec = editingRecord.record;
          const update = (patch: Partial<AttendanceRecord>) =>
            setEditingRecord(prev => prev ? { ...prev, record: { ...prev.record, ...patch } } : prev);

          const toTimeInput = (isoStr?: string) => isoStr ? isoStr.substring(11, 16) : '';
          const fromTimeInput = (t: string) => t ? `${selectedDate}T${t}:00` : undefined;

          return (
            <div className="space-y-6 p-2">
              {emp && (
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                  <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-sm font-black text-slate-600">
                    {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-slate-900">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-slate-500">{new Date(selectedDate + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Statut</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => update({ status: s })}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                        rec.status === s ? STATUS_COLORS[s] + ' shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {STATUS_ICONS[s]} {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <Sunrise size={10} /> Heure d'arrivée
                  </label>
                  <input
                    type="time"
                    value={toTimeInput(rec.clockIn)}
                    onChange={e => update({ clockIn: fromTimeInput(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <Sunset size={10} /> Heure de départ
                  </label>
                  <input
                    type="time"
                    value={toTimeInput(rec.clockOut)}
                    onChange={e => update({ clockOut: fromTimeInput(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Heure de début attendue</label>
                  <input
                    type="time"
                    value={rec.meta?.expectedStart || '08:00'}
                    onChange={e => update({ meta: { ...rec.meta, expectedStart: e.target.value } })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Heures supplémentaires (min)</label>
                  <input
                    type="number"
                    min={0}
                    value={rec.overtimeMinutes ?? 0}
                    onChange={e => update({ overtimeMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {(rec.meta?.lateMinutes ?? 0) > 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black text-amber-700">Retard calculé : {rec.meta!.lateMinutes} minutes</p>
                    <p className="text-[10px] text-amber-600">Sera appliqué aux déductions salariales si des règles RH le prévoient</p>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </HRModal>
    </div>
  );
};

export default Attendance;
