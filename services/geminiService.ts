
/**
 * Agent IA Orchestrator - Bridge n8n & Moteur de Données MySQL/PostgreSQL
 */
import { apiClient } from "./api";

const PROD_WEBHOOK = 'https://malvasian-pleonic-fatimah.ngrok-free.dev/webhook/chat-ia';

export interface AIChatResponse {
  formattedResponse: string;
  format: 'list' | 'table' | 'stats' | 'chart' | 'general' | 'excel';
  resultCount: number;
  rawResults?: any[];
  downloadUrl?: string;
  status: 'SUCCESS' | 'DENIED' | 'ERROR';
  mode?: 'BRIDGE' | 'TEST' | 'NATIVE';
}

/**
 * Nettoie le texte des artefacts techniques
 */
export const cleanProfessionalText = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/[#*`_]/g, '')
    .replace(/\[object Object\]/g, '')
    .trim();
};

/**
 * Parseur universel pour extraire les données structurées des réponses textuelles
 */
export const extractDataFromText = (text: string): any[] => {
  const results: any[] = [];
  const regex = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z)\s*-\s*([\d.]+)\s*-\s*([\d.]+)/g;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    const dateObj = new Date(match[1]);
    results.push({
      date: dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      fullDate: dateObj.toLocaleDateString('fr-FR'),
      Volume: parseFloat(match[2]),
      Montant: parseFloat(match[3])
    });
  }
  return results;
};

export const getAIResponse = async (message: string, tenantId: string): Promise<AIChatResponse> => {
  try {
    // Call backend proxy to avoid CORS and let server-side handle external webhook
    // Send both shapes so target webhook (n8n) can read either `chatInput/sessionId` or `message/id`.
    const rawData = await apiClient.post('/ai/bridge', { chatInput: message, sessionId: tenantId, message, id: tenantId });
    return processResponse(rawData);
  } catch (e) {
    // Forward the error up for the UI to show a friendly message
    throw e;
  }
};

const processResponse = (rawData: any): AIChatResponse => {
  // The bridge may return several shapes:
  // - direct object or array from n8n: { formattedResponse, format, rawResults }
  // - wrapper from bridge when using fallback: { fromFallback: true, fallbackUrl, data: <n8n payload> }
  // Normalize to a single object (prefer first element when array)
  let data = rawData;
  if (data && typeof data === 'object' && data.data) data = data.data;
  if (Array.isArray(data)) data = data[0] || {};
  const rawText = (data && (data.formattedResponse || data.output || data.text)) || "";
  
  let format = (data && data.format) || 'general';
  let results = (data && (data.rawResults || data.data || data.results)) || [];
  
  // Gestion spécifique du format Excel / Téléchargement
  let downloadUrl = (data && (data.downloadUrl || null)) || null;
  if (format === 'excel') {
    // Simuler ou récupérer un lien d'export n8n/ERP
    downloadUrl = data.downloadUrl || `http://localhost:3000/api/documents/export/${data.sessionId || 'current'}`;
  }

  // Détection auto du format chart si données temporelles trouvées
  const extracted = extractDataFromText(rawText);
  if (extracted.length > 0 && format === 'general') {
    format = 'chart';
    results = extracted;
  }

  return {
    formattedResponse: cleanProfessionalText(rawText) || "Nous rencontrons des difficultés à interpréter la réponse. Veuillez reformuler votre question ou contacter le support.",
    format: format as any,
    resultCount: results.length,
    rawResults: results,
    downloadUrl,
    status: 'SUCCESS',
    mode: 'BRIDGE'
  };
};

// Native kernel fallback removed: n8n is the source of truth for webhook responses.

export const fetchChatHistory = async (): Promise<any[]> => apiClient.get('/ai/history');
export const fetchPromptTemplates = async (): Promise<any[]> => apiClient.get('/ai/templates');
