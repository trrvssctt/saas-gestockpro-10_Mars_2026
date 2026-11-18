import multer from 'multer';
import { uploadToCloudinary, getStorageInfo, getCloudinaryDirectUrl } from '../services/CloudinaryService.js';
import { Tenant } from '../models/Tenant.js';
import { SupportTicket } from '../models/SupportTicket.js';

// Quota universel documents (indépendant du plan d'abonnement)
const DOCUMENT_QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5 Go

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Vérifie le contenu réel du fichier (signature binaire) : le `mimetype` de
 * multer vient de l'en-tête envoyé par le client et peut être falsifié.
 */
const startsWith = (buf, bytes, offset = 0) => bytes.every((b, i) => buf[offset + i] === b);
const ZIP = [0x50, 0x4b, 0x03, 0x04];                       // docx / xlsx
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // doc / xls
const CONTENT_CHECKS = {
  'image/jpeg': (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  'image/jpg':  (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  'image/png':  (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/gif':  (b) => startsWith(b, [0x47, 0x49, 0x46, 0x38]),
  'image/webp': (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8),
  'application/pdf': (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46]),
  'application/msword': (b) => startsWith(b, OLE),
  'application/vnd.ms-excel': (b) => startsWith(b, OLE),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': (b) => startsWith(b, ZIP),
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': (b) => startsWith(b, ZIP),
  // SVG : texte XML, sans script ni gestionnaire d'événement
  'image/svg+xml': (b) => {
    const txt = b.subarray(0, 512 * 1024).toString('utf8');
    return /<svg[\s>]/i.test(txt) && !/<script|\son[a-z]+\s*=|javascript:/i.test(txt);
  },
  // Texte / CSV : pas d'octet nul
  'text/plain': (b) => !b.subarray(0, 8192).includes(0),
  'text/csv':   (b) => !b.subarray(0, 8192).includes(0),
};

/** Sous-dossier sûr : le dossier racine du tenant est imposé par le serveur. */
const sanitizeFolder = (raw) => {
  const cleaned = String(raw || 'uploads')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
  return cleaned || 'uploads';
};

// Multer en mémoire — pas de disque, tout passe en buffer vers S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES }, // 10 Mo max (aligné sur la limite affichée côté front)
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Type de fichier non autorisé : ${file.mimetype}`), false);
  }
});

export const uploadMiddleware = upload.single('file');

export class UploadController {
  /**
   * POST /api/upload
   * Corps multipart/form-data : champ "file" + champ optionnel "folder"
   * Retourne : { url, key, sizeBytes }
   */
  static async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier fourni.' });
      }

      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Tenant non identifié.' });
      }

      // Vérifier l'espace disponible
      const tenant = await Tenant.findByPk(tenantId, { attributes: ['planId', 'storageUsedBytes'] });
      const planId = tenant?.planId || 'BASIC';
      const storageInfo = await getStorageInfo(tenantId, planId);

      // ── Quota documents universel : 5 Go ──────────────────────────────────
      const usedBytes = parseInt(tenant?.storageUsedBytes || 0, 10);
      if (usedBytes >= DOCUMENT_QUOTA_BYTES) {
        return res.status(413).json({
          error: 'STORAGE_QUOTA_EXCEEDED',
          message: 'Votre quota de stockage de 5 Go est atteint. Veuillez demander une extension.',
          usedBytes,
          quotaBytes: DOCUMENT_QUOTA_BYTES,
        });
      }

      // ── Vérification plan (espace restant dans le plan) ───────────────────
      if (req.file.size > storageInfo.remainingBytes && storageInfo.limitBytes > 0) {
        return res.status(413).json({
          error: 'PLAN_STORAGE_INSUFFICIENT',
          message: `Espace de stockage insuffisant. Il vous reste ${(storageInfo.remainingBytes / 1024 / 1024).toFixed(1)} Mo.`,
        });
      }

      const check = CONTENT_CHECKS[req.file.mimetype];
      if (!check || !check(req.file.buffer)) {
        return res.status(415).json({
          error: 'INVALID_FILE_CONTENT',
          message: 'Le contenu du fichier ne correspond pas à son type déclaré.',
        });
      }

      // Jamais de chemin fourni par le client : `gestockpro/{tenantId}/` est
      // ajouté par uploadToCloudinary, on ne garde ici qu'un nom de sous-dossier.
      const folder = sanitizeFolder(req.body.folder);
      const result = await uploadToCloudinary(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        tenantId,
        folder
      );

      return res.status(200).json({
        url:       result.url,
        key:       result.key,
        sizeBytes: result.sizeBytes,
        mimeType:  req.file.mimetype,
        fileName:  req.file.originalname
      });
    } catch (err) {
      console.error('[UploadController] uploadFile error:', err);
      return res.status(500).json({ error: 'Erreur lors de l\'upload : ' + err.message });
    }
  }

  /**
   * GET /api/files?key=...   (clé Cloudinary encodée : "raw:gestockpro/...")
   * GET /api/files?url=...   (URL Cloudinary directe : "https://res.cloudinary.com/...")
   * Génère une URL signée (valide 1h) et redirige.
   * Les anciennes clés S3 retournent 410.
   */
  static async serveFile(req, res) {
    const raw = req.query.key || req.query.url;
    if (!raw) return res.status(400).json({ error: 'Paramètre "key" ou "url" manquant.' });

    try {
      const input = decodeURIComponent(raw);
      let cloudinaryKey = input;

      // Si c'est une URL Cloudinary complète, on en extrait la clé
      if (input.startsWith('https://res.cloudinary.com/') || input.startsWith('http://res.cloudinary.com/')) {
        // Format : https://res.cloudinary.com/{cloud}/{resourceType}/upload/[v{n}/]{publicId}
        const match = input.match(/res\.cloudinary\.com\/[^/]+\/([^/]+)\/upload\/(?:v\d+\/)?(.+?)(?:\?.*)?$/);
        if (!match) return res.status(400).json({ error: 'URL Cloudinary invalide.' });
        const [, resourceType, publicIdPath] = match;
        // Pour les images Cloudinary retire l'extension interne — on la garde pour raw/video
        const publicId = resourceType === 'image'
          ? publicIdPath.replace(/\.[^.]+$/, '')
          : publicIdPath;
        cloudinaryKey = `${resourceType}:${publicId}`;
      }

      // Clé S3 legacy (pas de préfixe image:/raw:/video:)
      if (!cloudinaryKey.startsWith('image:') && !cloudinaryKey.startsWith('raw:') && !cloudinaryKey.startsWith('video:')) {
        return res.status(410).json({
          error: 'Fichier non disponible.',
          detail: 'Ce document a été archivé avant la migration cloud. Veuillez le re-téléverser.',
        });
      }

      const signedUrl = getCloudinaryDirectUrl(cloudinaryKey);
      return res.redirect(302, signedUrl);
    } catch (err) {
      console.error('[UploadController] serveFile error:', err.message);
      return res.status(404).json({ error: 'Fichier introuvable.' });
    }
  }

  /**
   * GET /api/upload/storage
   * Retourne l'utilisation du stockage du tenant courant.
   */
  static async getStorageUsage(req, res) {
    try {
      const tenantId = req.user?.tenantId;
      const tenant   = await Tenant.findByPk(tenantId, { attributes: ['planId', 'storageUsedBytes'] });
      const planId   = tenant?.planId || 'BASIC';
      const info     = await getStorageInfo(tenantId, planId);

      // Enrichit la réponse avec le quota document universel (5 Go)
      const usedBytes     = parseInt(tenant?.storageUsedBytes || 0, 10);
      const quotaExceeded = usedBytes >= DOCUMENT_QUOTA_BYTES;

      return res.status(200).json({
        ...info,
        documentQuotaBytes:    DOCUMENT_QUOTA_BYTES,
        documentQuotaMB:       +(DOCUMENT_QUOTA_BYTES / 1024 / 1024).toFixed(0),
        documentQuotaExceeded: quotaExceeded,
        documentUsedPercent:   +((usedBytes / DOCUMENT_QUOTA_BYTES) * 100).toFixed(1),
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/upload/request-storage
   * Crée automatiquement un ticket de support pour demander plus d'espace.
   */
  static async requestStorageExtension(req, res) {
    try {
      const tenantId = req.user?.tenantId;
      const userId   = req.user?.id;
      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Non authentifié.' });
      }

      const { message: customMessage } = req.body || {};

      // Vérifier l'utilisation courante
      const tenant    = await Tenant.findByPk(tenantId, { attributes: ['storageUsedBytes', 'name'] });
      const usedBytes = parseInt(tenant?.storageUsedBytes || 0, 10);
      const usedGB    = (usedBytes / 1024 / 1024 / 1024).toFixed(2);

      const subject = `Demande d'extension de stockage — quota 5 Go atteint`;
      const body    = customMessage?.trim()
        || `Bonjour,\n\nNotre entreprise ("${tenant?.name || tenantId}") a atteint le quota de stockage de 5 Go (utilisation actuelle : ${usedGB} Go).\n\nNous souhaitons bénéficier d'une extension de stockage supplémentaire afin de continuer à gérer nos documents RH.\n\nMerci de traiter cette demande dans les meilleurs délais.`;

      // Créer un ticket de support
      const ticket = await SupportTicket.create({
        tenantId,
        userId,
        subject,
        message: body,
        category: 'BILLING',
        priority: 'NORMAL',
        status: 'OPEN',
      });

      return res.status(201).json({
        success: true,
        ticketId: ticket.id,
        message: 'Votre demande a bien été envoyée. Notre équipe vous contactera sous 24h.',
      });
    } catch (err) {
      console.error('[UploadController] requestStorageExtension error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}
