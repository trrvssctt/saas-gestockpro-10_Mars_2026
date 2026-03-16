import { AIService } from '../services/AIService.js';
import { StockItem, PromptTemplate } from '../models/index.js';
import { sequelize } from '../config/database.js';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse une ligne de l'historique stockée dans la colonne `message`.
 *
 * Le workflow n8n v2 persiste un JSON complet :
 *   { formattedResponse, format, rawResults, metadata, resultCount, documentData }
 *
 * Les anciennes lignes (avant la migration) peuvent être du texte brut.
 * Cette fonction gère les deux cas et retourne TOUJOURS un objet normalisé.
 */
const parseHistoryMessage = (raw) => {
  // Cas 1 : déjà un objet (Postgres JSONB ou driver qui auto-parse)
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return sanitizeParsed(raw);
  }

  const str = typeof raw === 'string' ? raw : JSON.stringify(raw || '');

  // Cas 2 : JSON stringifié par le workflow n8n v2
  const trimmed = str.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && 'formattedResponse' in parsed) {
        return sanitizeParsed(parsed);
      }
      if (Array.isArray(parsed)) {
        return { formattedResponse: JSON.stringify(parsed), format: 'general', rawResults: null, metadata: null };
      }
      return sanitizeParsed(parsed);
    } catch {
      // Pas du JSON valide → texte brut
    }
  }

  // Cas 3 : texte brut (anciens messages avant migration)
  return { formattedResponse: str, format: 'general', rawResults: null, metadata: null, resultCount: 0 };
};

/**
 * Nettoie un objet parsé de l'historique :
 * - Si formattedResponse contient du CSS/HTML brut (bug historique pré-fix),
 *   le remplace par un texte propre basé sur le titre du document.
 * - Extrait documentData depuis metadata si absent au niveau racine.
 */
const sanitizeParsed = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  const fr = String(obj.formattedResponse || '');
  const looksLikeCssOrHtml = fr.startsWith(':root')
    || fr.startsWith('<!DOCTYPE')
    || fr.startsWith('<html')
    || fr.includes('font-family:')
    || fr.includes('border-collapse:')
    || fr.includes('.items-table');

  if (looksLikeCssOrHtml) {
    // Remplace le contenu CSS/HTML par un titre lisible
    const title = obj.metadata?.title || obj.documentTitle || 'Document';
    obj = {
      ...obj,
      formattedResponse: `📄 **${title}** généré avec succès.`,
    };
  }

  // S'assure que documentData est disponible au niveau racine
  if (!obj.documentData && obj.metadata?.documentData) {
    obj = { ...obj, documentData: obj.metadata.documentData };
  }

  return obj;
};

/**
 * Normalise le sender depuis les différentes valeurs possibles en DB.
 */
const normalizeSender = (raw) => {
  const s = String(raw || '').toLowerCase().trim();
  if (s === 'user' || s === 'human') return 'user';
  return 'ai'; // assistant / ai / bot → 'ai' pour le frontend
};

// ─────────────────────────────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────────────────────────────

export class AIController {

  /**
   * GET /api/ai/history
   * Récupère l'historique complet d'une session avec toutes les métadonnées
   * nécessaires à la reconstruction des graphiques et tableaux.
   */
  static async getHistory(req, res) {
    try {
      // tenantId sert de sessionId — isolation multi-tenant garantie par le middleware
      const sessionId = req.tenantFilter?.tenantId ?? req.user?.tenantId;
      if (!sessionId) {
        return res.status(400).json({ error: 'MissingSession', message: 'Session ID introuvable.' });
      }

      const sql = `
        SELECT id, session_id, message, sender, created_at
        FROM n8n_chat_histories
        WHERE session_id = :sessionId
        ORDER BY created_at ASC
        LIMIT 500
      `;

      let rows;
      try {
        [rows] = await sequelize.query(sql, { replacements: { sessionId } });
      } catch (pgErr) {
        // Table absente → historique vide (premier usage)
        const isMissing = pgErr?.original?.code === '42P01'
          || /does not exist/i.test(String(pgErr?.message));
        if (isMissing) {
          console.warn('[AI HISTORY] n8n_chat_histories table not found, returning empty history.');
          return res.status(200).json([]);
        }
        throw pgErr;
      }

      const payload = (rows || []).map(row => {
        const parsed = parseHistoryMessage(row.message);
        const ts = row.created_at ?? null;

        return {
          id: row.id,
          sender: normalizeSender(row.sender),

          // ── Texte affiché dans la bulle ──────────────────────────
          message: parsed.formattedResponse ?? '',

          // ── Données pour les visualisations (graphiques, tableaux, stats) ──
          rawResults: parsed.rawResults ?? null,

          // ── Données structurées DocumentPreview — rechargement de page ──
          // Stockées dans metadata.documentData par le nœud n8n
          documentData: parsed.documentData ?? parsed.metadata?.documentData ?? null,

          // ── Métadonnées : chart_config, kpi_config, table_config, title… ──
          // Critiques pour reconstruire les graphiques au rechargement
          metadata: parsed.metadata
            ? {
                ...parsed.metadata,
                // Garantit que format est toujours présent dans metadata
                format: parsed.metadata.format ?? parsed.format ?? 'general',
              }
            : null,

          // ── Format explicite (bar_chart, donut_chart, stats, table…) ──
          format: parsed.format ?? 'general',

          // ── Compteur de résultats ──
          resultCount: parsed.resultCount
            ?? (Array.isArray(parsed.rawResults) ? parsed.rawResults.length : 0),

          // ── Timestamps ──
          created_at: ts ? new Date(ts).toISOString() : null,
          createdAt:  ts ? new Date(ts).toISOString() : null,
        };
      });

      return res.status(200).json(payload);

    } catch (error) {
      console.error('[AI HISTORY ERROR]:', error);
      return res.status(500).json({
        error: 'HistoryFetchError',
        message: 'Impossible de récupérer l\'historique des conversations.',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/ai/templates
   */
  static async getTemplates(req, res) {
    try {
      const templates = await PromptTemplate.findAll({
        where: { isActive: true },
        order: [['category', 'ASC'], ['title', 'ASC']],
      });
      return res.status(200).json(templates);
    } catch (error) {
      return res.status(500).json({ error: 'TemplateFetchError', message: error.message });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/ai/insights
   * KPIs de rupture de stock pour le dashboard
   */
  static async getDashboardInsights(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const lowStocks = await StockItem.findAll({
        where: { tenantId },
        order: [['currentLevel', 'ASC']],
        limit: 5,
      });

      const insights = [];
      for (const item of lowStocks) {
        const prediction = await AIService.predictStockOut(tenantId, item.id);
        if (prediction && prediction.daysRemaining < 7) {
          insights.push({
            productId: item.id,
            productName: item.name,
            sku: item.sku,
            message: `Risque de rupture dans ${prediction.daysRemaining} jours.`,
            severity: prediction.daysRemaining < 3 ? 'CRITICAL' : 'HIGH',
            velocity: prediction.velocity.toFixed(2),
          });
        }
      }

      return res.status(200).json({
        engine: 'GeStockPro-IA',
        timestamp: new Date(),
        insights,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * POST /api/ai/forecasts
   */
  static async updateForecasts(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const { predictions, period } = req.body;
      let preds = predictions;
      if (!preds || !Array.isArray(preds)) {
        if (period) {
          preds = await AIService.generateForecasts(tenantId, period);
        } else {
          return res.status(400).json({ error: 'BadRequest', message: 'predictions[] ou period requis.' });
        }
      }
      for (const pred of preds) {
        if (!pred?.sku) continue;
        await StockItem.update(
          { forecastedLevel: pred.forecastedLevel },
          { where: { sku: pred.sku, tenantId } },
        );
      }
      return res.status(200).json({ status: 'SUCCESS', count: preds.length });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * POST /api/ai/bridge
   * Proxy vers le webhook n8n — évite les problèmes CORS depuis le navigateur.
   * Transmet le payload complet (message, id, planId) au workflow.
   */
  static async bridgeWebhook(req, res) {
    const { chatInput, sessionId, planId, message, id } = req.body || {};

    // ── Résolution de l'URL cible ──────────────────────────────────────────
    const orchestratorOverride =
      req.body?.orchestratorUrl ?? req.headers['x-orchestrator-url'] ?? null;

    const envWebhook  = process.env.WEBHOOK_URL || process.env.N8N_WEBHOOK_URL || process.env.N8N_AI_ORCHESTRATOR_URL || null;
    const envProd     = process.env.PROD_WEBHOOK || process.env.N8N_PROD_WEBHOOK || null;
    const prodUrl     = 'https://n8n.realtechprint.com/webhook/booba/gestock-ia';
    const testUrl     = 'https://n8n.realtechprint.com/webhook/booba/gestock-ia';

    const isProd = (process.env.NODE_ENV || 'development') === 'production';

    const primaryTarget = orchestratorOverride
      ?? (isProd
          ? (envProd ?? envWebhook ?? prodUrl)
          : (envWebhook ?? testUrl ?? envProd ?? prodUrl));

    console.info('[Bridge] target webhook:', primaryTarget, '| planId:', planId, '| isProd:', isProd);

    // ── Payload normalisé ──────────────────────────────────────────────────
    const payload = { chatInput, sessionId, message, id, planId };

    // ── Tentative principale ───────────────────────────────────────────────
    const tried = [primaryTarget];
    try {
      const resp = await axios.post(primaryTarget, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 200_000, // 200s pour les requêtes SQL lourdes
      });
      return res.status(200).json(resp.data);

    } catch (primaryErr) {
      console.error('[Bridge] primary webhook failed:', {
        url: primaryTarget,
        status: primaryErr?.response?.status,
        message: primaryErr?.message,
      });

      const remoteStatus = primaryErr?.response?.status ?? 502;
      const remoteData   = primaryErr?.response?.data   ?? primaryErr?.message ?? 'Unknown error';
      const isTimeout    = primaryErr?.code === 'ECONNABORTED';
      const isNetworkErr = !primaryErr?.response;

      // ── 404 : workflow n8n non activé ─────────────────────────────────
      if (remoteStatus === 404) {
        return res.status(404).json({
          error: 'WebhookNotRegistered',
          message: 'Le workflow n8n n\'est pas activé.',
          hint: 'Cliquez sur "Execute workflow" dans l\'éditeur n8n pour activer le webhook.',
          attempted: primaryTarget,
        });
      }

      // ── Fallbacks sur timeout / erreur réseau / 502 ───────────────────
      if (isTimeout || isNetworkErr || remoteStatus === 502) {
        const fallbacks = [prodUrl, testUrl, envWebhook, envProd]
          .filter(Boolean)
          .filter(u => u !== primaryTarget && !tried.includes(u));

        for (const fb of fallbacks) {
          tried.push(fb);
          try {
            console.info('[Bridge] trying fallback:', fb);
            const retry = await axios.post(fb, payload, {
              headers: { 'Content-Type': 'application/json' },
              timeout: 30_000,
            });
            return res.status(200).json({ fromFallback: true, fallbackUrl: fb, data: retry.data });
          } catch (retryErr) {
            console.warn('[Bridge] fallback failed:', fb, retryErr?.message);
          }
        }
      }

      // ── Page HTML ngrok / proxy hors-ligne ────────────────────────────
      const remoteStr = typeof remoteData === 'string' ? remoteData : '';
      if (remoteStr.includes('<!DOCTYPE') || /ngrok/i.test(remoteStr) || remoteStr.includes('not registered')) {
        return res.status(503).json({
          error: 'WebhookUnavailable',
          message: 'Le serveur n8n semble indisponible.',
          hint: 'Vérifiez que n8n est démarré et que le workflow est activé.',
          attempted: tried,
        });
      }

      // ── Erreur générique ──────────────────────────────────────────────
      return res.status(remoteStatus).json({
        error: 'BridgeError',
        message: 'Impossible de contacter le webhook n8n.',
        details: remoteData,
        attempted: tried,
      });
    }
  }
}