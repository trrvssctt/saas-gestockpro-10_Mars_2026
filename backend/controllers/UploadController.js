import multer from 'multer';
import { uploadToS3, getStorageInfo, s3Client, getS3Config } from '../services/S3Service.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Tenant } from '../models/Tenant.js';

// Multer en mémoire — pas de disque, tout passe en buffer vers S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo max
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

      if (req.file.size > storageInfo.remainingBytes && storageInfo.limitBytes > 0) {
        return res.status(413).json({
          error: `Espace de stockage insuffisant. Il vous reste ${(storageInfo.remainingBytes / 1024 / 1024).toFixed(1)} Mo.`
        });
      }

      const folder = req.body.folder || 'uploads';
      const result = await uploadToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        tenantId,
        folder
      );

      // URL proxy : passe par le backend qui génère une URL signée S3 à la volée
      // Fonctionne en dev (localhost:3000) et prod (domaine réel) automatiquement
      const host = req.get('host');
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const proxyUrl = `${protocol}://${host}/api/files?key=${encodeURIComponent(result.key)}`;

      return res.status(200).json({
        url:       proxyUrl,
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
   * GET /api/files?key=tenantId/dossier/fichier.ext
   * Endpoint PUBLIC — proxy direct vers S3 (pas de redirect, évite les incompatibilités
   * de paramètres de signature avec les S3-compatibles comme MamuteCloud).
   */
  static async serveFile(req, res) {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: 'Paramètre "key" manquant.' });

    try {
      const decodedKey = decodeURIComponent(key);
      const { bucket } = getS3Config();
      const command = new GetObjectCommand({ Bucket: bucket, Key: decodedKey });
      const data = await s3Client.send(command);

      // Propager les headers utiles
      if (data.ContentType)   res.set('Content-Type',   data.ContentType);
      if (data.ContentLength) res.set('Content-Length', String(data.ContentLength));
      res.set('Cache-Control', 'public, max-age=3600');

      // Pipe directement le stream S3 vers le client
      data.Body.pipe(res);
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
      return res.status(200).json(info);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}
