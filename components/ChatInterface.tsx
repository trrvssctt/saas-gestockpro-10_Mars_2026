
import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, Send, X, Bot, Sparkles, 
  BarChart3, Table as TableIcon, Activity,
  ChevronRight, ArrowRight, Loader2, Maximize, Minimize, Download
} from 'lucide-react';
import { getAIResponse, AIChatResponse, cleanProfessionalText, fetchChatHistory } from '../services/geminiService';
import { UserRole } from '../types';
import { 
  ResponsiveContainer, AreaChart, Area, 
  XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

interface Message extends AIChatResponse {
  role: 'user' | 'ai';
  timestamp: Date;
}

const ChatInterface = ({ user }: { user: any }) => {
  const isAdmin = !!(user && user.roles && (user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN)));
  const [isOpen, setIsOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Utility: download a Blob as file
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const arrayToCSV = (arr: any[]) => {
    if (!arr || !arr.length) return '';
    const keys = Array.from(arr.reduce((acc, r) => { Object.keys(r || {}).forEach(k => acc.add(k)); return acc; }, new Set<string>()));
    const rows = [keys.join(',')];
    for (const r of arr) {
      rows.push(keys.map(k => {
        const v = r[k];
        if (v === null || v === undefined) return '';
        const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return '"' + s.replace(/"/g, '""') + '"';
      }).join(','));
    }
    return rows.join('\n');
  };

  const exportDataAsCSV = (data: any[], filename = 'export.csv') => {
    try {
      const csv = arrayToCSV(data || []);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, filename);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('CSV export error', e);
    }
  };

  const exportDataAsXLSX = async (data: any[], filename = 'export.xlsx') => {
    try {
      // dynamic import so project can still build if xlsx isn't installed; fallback to CSV
      // Install with: npm install xlsx
      const XLSX = (await import('xlsx')).default as any;
      const ws = XLSX.utils.json_to_sheet(data || []);
      const wb = { Sheets: { data: ws }, SheetNames: ['data'] } as any;
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      downloadBlob(blob, filename);
    } catch (e) {
      // If library missing, fallback to CSV
      // eslint-disable-next-line no-console
      console.warn('xlsx not available, falling back to CSV', e);
      exportDataAsCSV(data, filename.replace(/\.xlsx$/i, '.csv'));
    }
  };

  const exportChartAsPNG = async (key: string, filename = 'chart.png') => {
    const container = chartRefs.current[key];
    if (!container) return;
    try {
      // Find svg inside container
      const svg = container.querySelector('svg') as SVGSVGElement | null;
      if (!svg) return;
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);
      const canvas = document.createElement('canvas');
      const rect = svg.getBoundingClientRect();
      canvas.width = rect.width * 2; // higher res
      canvas.height = rect.height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej();
        img.src = url;
      });
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => { if (b) downloadBlob(b, filename); }, 'image/png');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Chart PNG export error', e);
    }
  };

  const formatStatValue = (v: any) => {
    if (v === null || v === undefined) return '-';
    if (typeof v === 'number') return v.toLocaleString();
    if (typeof v === 'string') {
      const n = Number(v.replace(/[^0-9.-]+/g, ''));
      if (!Number.isNaN(n) && String(v).trim().match(/^[-0-9,.]+$/)) return n.toLocaleString();
      return v;
    }
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  const parseStructuredFormatted = (formatted: string) => {
    if (!formatted || typeof formatted !== 'string') return { text: formatted, format: null, rawResults: undefined };
    // Remove leading language markers and code fences (e.g. "json\n```json\n{...}```")
    let trimmed = formatted.trim();
    trimmed = trimmed.replace(/^\s*```(?:json|js|text)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    // Remove a leading literal "json" marker sometimes added by providers
    trimmed = trimmed.replace(/^json\s+/i, '').trim();
    if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return { text: trimmed, format: null, rawResults: undefined };
    try {
      const parsed: any = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return { text: null, format: 'list', rawResults: parsed };
      }

      const pickKey = (obj: any, keys: string[]) => keys.find(k => obj[k] !== undefined && obj[k] !== null && (typeof obj[k] !== 'string' || String(obj[k]).trim().length > 0));
      const textKey = pickKey(parsed, ['response', 'formattedResponse', 'formatted_response', 'finalresponse', 'finalResponse', 'final_response', 'final', 'message', 'text']);
      let text: string | null = textKey ? (typeof parsed[textKey] === 'string' ? parsed[textKey] : JSON.stringify(parsed[textKey])) : null;
      const rawResults = parsed.rawResults || parsed.data || parsed.results || parsed.rows || undefined;
      const format = parsed.format || parsed.type || (Array.isArray(rawResults) ? (rawResults.length && typeof rawResults[0] === 'object' ? 'table' : 'list') : null);

      if (!text && rawResults) {
        text = parsed.summary || parsed.title || `Résultats: ${Array.isArray(rawResults) ? rawResults.length : 1}`;
      }

      if (!text) {
        // Build a readable summary instead of returning raw JSON
        const keys = Object.keys(parsed).filter(k => !['data', 'results', 'rows', 'rawResults'].includes(k));
        if (keys.length) {
          text = keys.map(k => `**${k}**: ${typeof parsed[k] === 'object' ? JSON.stringify(parsed[k]) : String(parsed[k])}`).join('\n');
        } else {
          text = 'Réponse structurée reçue.';
        }
      }

      return { text: String(text), format, rawResults };
    } catch (e) {
      // If parsing fails, avoid returning raw JSON string — show a concise fallback
      return { text: 'Réponse structurée reçue (format non exploitable).', format: null, rawResults: undefined };
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const formatTimestamp = (ts: Date) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    if (!isOpen) return;
    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        // Use apiClient-backed helper which targets the backend URL (avoids Vite serving index.html)
        const data = await fetchChatHistory();
        // Map backend messages to local Message shape, preserving structured payloads in metadata
        let mapped: Message[] = data.map((m: any) => {
          const meta = m.metadata || {};
          const messageText = String(m.message || meta.text || '');
          const parsed = parseStructuredFormatted(messageText);
          const rawResults = meta.rawResults || meta.data || meta.results || parsed.rawResults || null;
          const format = meta.format || meta.type || parsed.format || (rawResults ? (Array.isArray(rawResults[0]) || typeof rawResults[0] === 'object' ? (meta.chart ? 'chart' : 'table') : 'list') : 'general');
          const rawSender = (m.sender || meta.sender || '').toString().toLowerCase();
          const role = (rawSender === 'user' || rawSender === 'human') ? 'user' : 'ai';
          const ts = m.created_at || m.createdAt || meta.created_at || meta.createdAt || null;
          // Build a safe display text: prefer parsed.text, otherwise summarize structured results
          let displayText = parsed.text;
          if (!displayText) {
            if (parsed.rawResults && Array.isArray(parsed.rawResults)) {
              displayText = `Résultats structurés (${parsed.rawResults.length} éléments).`;
            } else if (parsed.rawResults) {
              displayText = 'Résultat structuré reçu.';
            } else {
              displayText = 'Réponse structurée reçue.';
            }
          }

          return ({
              role,
              formattedResponse: cleanProfessionalText(String(displayText)),
              format: format as any,
              resultCount: rawResults ? (Array.isArray(rawResults) ? rawResults.length : 0) : 0,
              rawResults: rawResults || undefined,
              timestamp: ts ? new Date(ts) : new Date(),
              status: meta.status || 'SUCCESS'
            } as Message);
        });

        // Ensure chronological ordering by created_at
        mapped = mapped.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setMessages(mapped);
      } catch (err) {
        // Log error for debugging (client-side only)
        // eslint-disable-next-line no-console
        console.error('Chat history fetch error:', err);
        // Show friendly message with hint to open devtools
        setMessages([{
          role: 'ai',
          formattedResponse: 'Nous rencontrons un problème, veuillez réessayer. (Vérifiez la console pour plus de détails.)',
          format: 'general',
          resultCount: 0,
          status: 'ERROR',
          timestamp: new Date()
        }] as Message[]);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [isOpen]);

  const sendWebhook = async (accountId: string, message: string) => {
    // Deprecated: we now use backend bridge to forward to n8n (avoid CORS)
    // Keep function for compatibility but call backend bridge endpoint instead
    try {
      const res = await fetch('/api/ai/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatInput: message, sessionId: accountId, message, id: accountId })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        // eslint-disable-next-line no-console
        console.error('Bridge responded with non-ok:', res.status, body);
        return false;
      }
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('sendWebhook error:', err);
      return false;
    }
  };

  const sampleQuestions = [
    'Top 5 produits vendus ce mois-ci',
    'Montant total des factures impayées',
    "Quels sont les articles en rupture de stock ?",
    'Prévision de stock pour les 30 prochains jours'
  ];

  const handleSend = async (overrideMsg?: string) => {
    const raw = overrideMsg ?? input;
    if (!raw || !raw.trim() || isLoading) return;
    
    const userMsg = raw.trim();
    const tenantId = user.tenantId || 'system-default';
    const accountId = user.id ?? tenantId ?? 'system-default';

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
    try {
      const aiResponse = await getAIResponse(userMsg, tenantId);
      // Normalize possible JSON-wrapped formattedResponse
      const { formattedResponse, format, rawResults, downloadUrl, resultCount, status, mode } = aiResponse as AIChatResponse & any;
      const parsed = parseStructuredFormatted(formattedResponse as string);
      const finalFormat = (format || parsed.format) as any || 'general';
      const finalRaw = rawResults || parsed.rawResults;

      // Determine safe display text: prefer parsed.text; if absent, summarize structured results
      let finalText = parsed.text;
      if (!finalText) {
        if (finalRaw && Array.isArray(finalRaw)) finalText = `Résultats structurés (${finalRaw.length} éléments).`;
        else if (finalRaw) finalText = 'Résultat structuré reçu.';
        else finalText = 'Réponse structurée reçue.';
      }

      setMessages(prev => [...prev, { 
        formattedResponse: finalText,
        format: finalFormat,
        rawResults: finalRaw,
        downloadUrl,
        resultCount: (finalRaw && Array.isArray(finalRaw)) ? finalRaw.length : (resultCount || 0),
        status: status || 'SUCCESS',
        mode: mode || 'BRIDGE',
        role: 'ai', 
        timestamp: new Date() 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'ai',
        formattedResponse: 'Nous rencontrons un problème, veuillez réessayer.',
        format: 'general',
        resultCount: 0,
        status: 'ERROR',
        timestamp: new Date()
      }] as Message[]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderVisuals = (msg: Message) => {
    const { format, rawResults } = msg;
    const key = String((msg.timestamp && (msg.timestamp as any).getTime && (msg.timestamp as any).getTime()) || Math.random());
    if (!rawResults || rawResults.length === 0) return null;

    if (format === 'table') {
      const cols = Object.keys(rawResults[0]);
      return (
        <div className="mt-4 border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
            <div className="flex justify-end gap-2 p-2">
              <button aria-label="Exporter CSV" onClick={() => exportDataAsCSV(rawResults, `table-export-${key}.csv`)} className="px-3 py-1 text-[11px] bg-white border border-slate-200 rounded-full text-slate-700 flex items-center gap-2 shadow-sm hover:bg-slate-50 transition">
                <Download size={14} />
                <span className="font-bold">CSV</span>
              </button>
              <button aria-label="Exporter XLSX" onClick={() => exportDataAsXLSX(rawResults, `table-export-${key}.xlsx`)} className="px-3 py-1 text-[11px] bg-white border border-slate-200 rounded-full text-slate-700 flex items-center gap-2 shadow-sm hover:bg-slate-50 transition">
                <TableIcon size={14} />
                <span className="font-bold">XLSX</span>
              </button>
            </div>
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
                    {cols.map(c => <td key={c} className="px-3 py-2 font-bold text-current">{row[c]?.toString()}</td>)}
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
        <div ref={(el) => { chartRefs.current[key] = el; }} className="mt-4 p-4 bg-slate-900 rounded-2xl border border-slate-800 h-44 w-full shadow-inner relative">
          <div className="absolute top-2 right-2 flex gap-2 z-10">
            <button aria-label="Exporter données CSV" onClick={() => exportDataAsCSV(rawResults, `chart-data-${key}.csv`)} className="px-2.5 py-1 text-[10px] bg-white/10 border border-white/20 rounded-full text-white flex items-center gap-2 shadow-sm hover:bg-white/20 transition">
              <Download size={12} />
              <span className="font-bold">CSV</span>
            </button>
            <button aria-label="Exporter données XLSX" onClick={() => exportDataAsXLSX(rawResults, `chart-data-${key}.xlsx`)} className="px-2.5 py-1 text-[10px] bg-white/10 border border-white/20 rounded-full text-white flex items-center gap-2 shadow-sm hover:bg-white/20 transition">
              <TableIcon size={12} />
              <span className="font-bold">XLSX</span>
            </button>
            <button aria-label="Exporter graphique PNG" onClick={() => exportChartAsPNG(key, `chart-${key}.png`)} className="px-2.5 py-1 text-[10px] bg-white/10 border border-white/20 rounded-full text-white flex items-center gap-2 shadow-sm hover:bg-white/20 transition">
              <Download size={12} />
              <span className="font-bold">PNG</span>
            </button>
          </div>
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
      // Normalize stats payload into list of {label, value}
      const stats = rawResults;
      const items: Array<{ label: string; value: any }> = [];
      if (Array.isArray(stats)) {
        if (stats.length && typeof stats[0] === 'object') {
          if ('label' in stats[0] || 'value' in stats[0]) {
            for (const s of stats) items.push({ label: String(s.label ?? s.name ?? s.title ?? ''), value: s.value ?? s.v ?? s.count ?? s.amount ?? s });
          } else {
            for (const s of stats) {
              const keys = Object.keys(s || {});
              if (keys.length === 1) items.push({ label: keys[0], value: s[keys[0]] });
              else items.push({ label: s.title || s.name || keys[0], value: s.value ?? s[ keys[1] || keys[0] ] });
            }
          }
        } else {
          for (let i = 0; i < stats.length; i++) items.push({ label: `Item ${i + 1}`, value: stats[i] });
        }
      } else if (stats && typeof stats === 'object') {
        for (const k of Object.keys(stats)) items.push({ label: k, value: stats[k] });
      }

      return (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {items.map((it, idx) => (
            <div key={idx} className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
              <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{it.label}</div>
              <div className="text-lg font-extrabold text-indigo-900 mt-1">{formatStatValue(it.value)}</div>
              {typeof it.value === 'number' && (
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-indigo-400" style={{ width: `${Math.min(100, Math.abs(it.value))}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (format === 'list') {
      return (
        <ul className="mt-3 list-disc pl-5 text-[12px] space-y-1">
          {rawResults.map((item: any, idx: number) => (
            <li key={idx} className="text-slate-700 font-medium">{typeof item === 'string' ? item : JSON.stringify(item)}</li>
          ))}
        </ul>
      );
    }

    if (format === 'excel') {
      return (
        <div className="mt-3">
          <a href={msg.downloadUrl || '#'} className="text-indigo-600 font-bold underline">Télécharger le fichier</a>
        </div>
      );
    }

    return null;
  };

  const renderMarkdownWithTable = (content: string | undefined) => {
    if (!content) return null;
    const lines = content.split('\n');

    const nodes: any[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Detect table header (a line with | and next line contains ---)
      const next = lines[i + 1] || '';
      const isTableHeader = line.includes('|') && /(^|\s)\|?\s*[-:]{3,}/.test(next.replace(/\s*\|\s*/g, '|'));

      if (isTableHeader) {
        // Consume table block: header + separator + rows until blank line or non-| line
        const tableLines: string[] = [];
        // header
        tableLines.push(line);
        // separator
        tableLines.push(next);
        i += 2;
        while (i < lines.length && lines[i].includes('|')) {
          tableLines.push(lines[i]);
          i += 1;
        }

        // Parse table robustly: split on '|' and remove empty edge cells
        const splitRow = (l: string) => {
          let cells = l.split('|').map(c => c.trim());
          if (cells.length > 0 && cells[0] === '') cells = cells.slice(1);
          if (cells.length > 0 && cells[cells.length - 1] === '') cells = cells.slice(0, -1);
          return cells;
        };

        const parsedRows = tableLines.map(l => splitRow(l));
        const header = parsedRows[0] || [];
        // rows after separator (index 2...)
        const body = parsedRows.slice(2).map(r => {
          // Ensure each row has exactly header.length cells (pad with empty strings if needed)
          const out = [] as string[];
          for (let ci = 0; ci < header.length; ci++) {
            out.push(r[ci] !== undefined ? r[ci] : '');
          }
          return out;
        });

        nodes.push(
          <div key={nodes.length} className="mt-3 border border-slate-100 rounded-lg overflow-auto bg-white">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {header.map((h, idx) => <th key={idx} className="px-3 py-2 font-black uppercase text-slate-400">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {body.map((r, ri) => (
                  <tr key={ri} className="hover:bg-indigo-50/30 transition-colors">
                    {r.map((c, ci) => <td key={ci} className="px-3 py-2 font-medium text-current">{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      // Render headings
      if (/^###\s+/.test(line)) {
        nodes.push(<h4 key={nodes.length} className="text-sm font-black">{line.replace(/^###\s+/, '')}</h4>);
        i += 1; continue;
      }
      if (/^##\s+/.test(line)) {
        nodes.push(<h3 key={nodes.length} className="text-sm font-black">{line.replace(/^##\s+/, '')}</h3>);
        i += 1; continue;
      }

      // Bullet lists
      if (/^\s*[-*+]\s+/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
          i += 1;
        }
        nodes.push(
          <ul key={nodes.length} className="list-disc pl-5 text-[12px] space-y-1">
            {items.map((it, idx) => <li key={idx} className="font-medium">{it}</li>)}
          </ul>
        );
        continue;
      }

      // Horizontal rule
      if (/^---+$/.test(line.trim())) {
        nodes.push(<hr key={nodes.length} className="my-3 border-slate-100" />);
        i += 1; continue;
      }

      // Normal paragraph with inline bold **text**
      const paragraph = line.replace(/\*\*(.+?)\*\*/g, (_, p1) => `<strong>${p1}</strong>`);
      // Use dangerouslySetInnerHTML for small sanitized snippet (input is generated server-side)
      nodes.push(<p key={nodes.length} className="text-[12px]" dangerouslySetInnerHTML={{ __html: paragraph }} />);
      i += 1;
    }

    return <div className="prose-sm max-w-full">{nodes}</div>;
  };

  // Try to parse the first markdown table in content into an array of objects
  const parseMarkdownTableToData = (content: string | undefined) => {
    if (!content) return null;
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const next = lines[i + 1] || '';
      const isTableHeader = line.includes('|') && /(^|\s)\|?\s*[-:]{3,}/.test(next.replace(/\s*\|\s*/g, '|'));
      if (isTableHeader) {
        const tableLines: string[] = [];
        tableLines.push(line);
        tableLines.push(next);
        let j = i + 2;
        while (j < lines.length && lines[j].includes('|')) {
          tableLines.push(lines[j]);
          j += 1;
        }

        const splitRow = (l: string) => {
          let cells = l.split('|').map(c => c.trim());
          if (cells.length > 0 && cells[0] === '') cells = cells.slice(1);
          if (cells.length > 0 && cells[cells.length - 1] === '') cells = cells.slice(0, -1);
          return cells;
        };

        const parsedRows = tableLines.map(l => splitRow(l));
        const header = parsedRows[0] || [];
        const body = parsedRows.slice(2).map(r => {
          const out: any = {};
          for (let ci = 0; ci < header.length; ci++) {
            out[header[ci] || `col${ci}`] = r[ci] !== undefined ? r[ci] : '';
          }
          return out;
        });
        return body;
      }
    }
    return null;
  };

  return (
    <div className="fixed bottom-8 right-8 z-[1000]">
      {isOpen ? (
        <div className={isFullscreen ? 'bg-white fixed inset-0 rounded-none shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in duration-500 z-[2000]' : 'bg-white w-[420px] h-[600px] rounded-[3rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-500'}>
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
            <div className="flex items-center gap-2">
              <button onClick={() => setIsFullscreen(prev => !prev)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400" aria-label="Basculer plein écran">
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400"><X size={20} /></button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar">
            {messages.length === 0 && !loadingHistory && (
              <div className="text-center py-8 space-y-6">
                <Sparkles size={56} className="text-indigo-600 mx-auto animate-pulse" />
                <h3 className="text-sm font-black text-slate-700">Venez chattez avec moi</h3>
                <p className="text-[10px] text-slate-400 font-medium px-6">Je peux aider à analyser vos ventes, factures et stocks. Essayez une des propositions ci-dessous :</p>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {sampleQuestions.map((q, idx) => (
                    <button key={idx} onClick={() => handleSend(q)} className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold hover:bg-indigo-100">{q}</button>
                  ))}
                </div>
              </div>
            )}
            {loadingHistory && (
              <div className="text-center text-[10px] text-slate-400">Chargement de l'historique...</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1`}>
                <div className={`max-w-[90%] p-3 rounded-[2rem] text-xs leading-relaxed shadow-sm border ${
                  m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none border-indigo-600 font-semibold shadow-md' :
                  m.status === 'ERROR' ? 'bg-rose-100 text-rose-800 border-rose-200 rounded-bl-none' :
                  'bg-white text-slate-900 border-slate-200 rounded-bl-none font-medium'
                }`}>
                  <div>
                          {/* Export controls when message contains table data (rawResults) or markdown table */}
                          {(() => {
                            const tableData = (m.rawResults && Array.isArray(m.rawResults) && m.rawResults.length) ? m.rawResults : parseMarkdownTableToData(m.formattedResponse);
                            if (tableData && Array.isArray(tableData) && tableData.length) {
                              const key = String((m.timestamp && (m.timestamp as any).getTime && (m.timestamp as any).getTime()) || Math.random());
                              return (
                                <div className="relative">
                                  <div className="absolute top-2 right-2 flex gap-2 z-20">
                                    <button aria-label="Exporter CSV" onClick={() => exportDataAsCSV(tableData, `export-${key}.csv`)} className="px-2.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded-md text-slate-700 flex items-center gap-2 shadow-sm hover:bg-slate-50 transition"> 
                                      <Download size={12} />
                                    </button>
                                    <button aria-label="Exporter XLSX" onClick={() => exportDataAsXLSX(tableData, `export-${key}.xlsx`)} className="px-2.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded-md text-slate-700 flex items-center gap-2 shadow-sm hover:bg-slate-50 transition"> 
                                      <TableIcon size={12} />
                                    </button>
                                  </div>
                                  <div className="pt-2">
                                    {renderMarkdownWithTable(m.formattedResponse)}
                                    {renderVisuals(m)}
                                  </div>
                                </div>
                              );
                            }
                            return (<>
                              {renderMarkdownWithTable(m.formattedResponse)}
                              {renderVisuals(m)}
                            </>);
                          })()}
                  </div>
                  <div className="text-right mt-2">
                    <span className="text-[9px] text-slate-400 font-bold">{formatTimestamp(m.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 p-4 bg-white rounded-2xl w-fit shadow-sm border border-slate-100">
                <Loader2 className="animate-spin text-indigo-600" size={16} />
                <span className="text-[10px] font-black text-slate-400 uppercase">Génération en cours...</span>
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
        isAdmin ? (
          <button onClick={() => setIsOpen(true)} className="w-20 h-20 bg-slate-900 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all group relative">
            <MessageSquare size={28} />
            <span className="absolute -top-1 -right-1 w-7 h-7 bg-indigo-600 border-4 border-slate-50 rounded-full flex items-center justify-center text-[8px] font-black uppercase">IA</span>
          </button>
        ) : null
      )}
    </div>
  );
};

export default ChatInterface;
