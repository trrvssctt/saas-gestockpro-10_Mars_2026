import { v2 as cloudinary } from 'cloudinary';
import { sequelize } from '../config/database.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

const IMAGE_MIMES = [
  'image/jpeg', 'image/jpg', 'image/png',
  'image/gif',  'image/webp', 'image/svg+xml', 'image/avif',
];

const getResourceType = (mimeType) => {
  if (IMAGE_MIMES.includes(mimeType)) return 'image';
  if (mimeType.startsWith('video/'))  return 'video';
  return 'raw';
};

// Key format : "{resourceType}:{publicId}"
// Ex: "image:gestockpro/t1/logos/1234_logo"
//     "raw:gestockpro/t1/docs/1234_contrat.pdf"
export const encodeKey = (resourceType, publicId) => `${resourceType}:${publicId}`;

export const decodeKey = (key) => {
  const col = key.indexOf(':');
  if (col === -1 || !['image', 'video', 'raw'].includes(key.slice(0, col))) {
    // Clé S3 legacy — inaccessible, on ne peut rien faire
    return { resourceType: 'raw', publicId: key };
  }
  return { resourceType: key.slice(0, col), publicId: key.slice(col + 1) };
};

/**
 * Upload un fichier vers Cloudinary.
 * Structure : gestockpro/{tenantId}/{folder}/{timestamp}_{nom_fichier}
 *
 * @returns {{ url: string, key: string, sizeBytes: number }}
 */
export const uploadToCloudinary = async (fileBuffer, originalName, mimeType, tenantId, folder = 'uploads') => {
  const resourceType = getResourceType(mimeType);
  const safeName     = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Cloudinary retire l'extension du public_id pour les images — on la retire en amont
  const nameForId    = resourceType === 'image' ? safeName.replace(/\.[^.]+$/, '') : safeName;
  const publicId     = `gestockpro/${tenantId}/${folder}/${Date.now()}_${nameForId}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: resourceType, overwrite: false },
      async (error, result) => {
        if (error) return reject(error);
        try { await incrementStorageUsed(tenantId, fileBuffer.length); } catch (_) {}
        resolve({
          url:       result.secure_url,
          key:       encodeKey(result.resource_type, result.public_id),
          sizeBytes: fileBuffer.length,
        });
      }
    );
    stream.end(fileBuffer);
  });
};

/**
 * Supprime un fichier Cloudinary et décrémente le stockage du tenant.
 */
export const deleteFromCloudinary = async (key, tenantId) => {
  try {
    const { resourceType, publicId } = decodeKey(key);
    let sizeBytes = 0;
    try {
      const info = await cloudinary.api.resource(publicId, { resource_type: resourceType });
      sizeBytes = info.bytes || 0;
    } catch (_) {}
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    if (tenantId && sizeBytes > 0) await decrementStorageUsed(tenantId, sizeBytes);
  } catch (err) {
    console.error('[CloudinaryService] deleteFromCloudinary error:', err.message);
  }
};

/**
 * Reconstruit l'URL publique Cloudinary à partir d'une clé encodée.
 */
export const getCloudinaryDirectUrl = (key) => {
  const { resourceType, publicId } = decodeKey(key);
  return cloudinary.url(publicId, { resource_type: resourceType, secure: true });
};

// ─── Storage tracking (même logique qu'avec S3) ───────────────────────────────

const STORAGE_LIMITS = {
  FREE_TRIAL: 500  * 1024 * 1024,
  BASIC:      2    * 1024 * 1024 * 1024,
  PRO:        10   * 1024 * 1024 * 1024,
  ENTERPRISE: 50   * 1024 * 1024 * 1024,
};

const incrementStorageUsed = async (tenantId, bytes) => {
  try {
    await sequelize.query(
      `UPDATE tenants SET storage_used_bytes = COALESCE(storage_used_bytes, 0) + :bytes WHERE id = :tenantId`,
      { replacements: { bytes, tenantId }, type: 'UPDATE' }
    );
  } catch (err) {
    console.warn('[CloudinaryService] incrementStorageUsed:', err.message);
  }
};

const decrementStorageUsed = async (tenantId, bytes) => {
  try {
    await sequelize.query(
      `UPDATE tenants SET storage_used_bytes = GREATEST(0, COALESCE(storage_used_bytes, 0) - :bytes) WHERE id = :tenantId`,
      { replacements: { bytes, tenantId }, type: 'UPDATE' }
    );
  } catch (err) {
    console.warn('[CloudinaryService] decrementStorageUsed:', err.message);
  }
};

export const getStorageInfo = async (tenantId, planId = 'BASIC') => {
  try {
    const [rows] = await sequelize.query(
      `SELECT storage_used_bytes FROM tenants WHERE id = :tenantId`,
      { replacements: { tenantId }, type: 'SELECT' }
    );
    const used  = parseInt((rows?.[0] || rows)?.storage_used_bytes || 0, 10);
    const limit = STORAGE_LIMITS[planId?.toUpperCase()] || STORAGE_LIMITS.BASIC;
    return {
      usedBytes:      used,
      limitBytes:     limit,
      remainingBytes: Math.max(0, limit - used),
      usedMB:         +(used / 1024 / 1024).toFixed(2),
      limitMB:        +(limit / 1024 / 1024).toFixed(2),
      usedPercent:    limit > 0 ? +((used / limit) * 100).toFixed(1) : 0,
    };
  } catch (err) {
    console.warn('[CloudinaryService] getStorageInfo error:', err.message);
    return { usedBytes: 0, limitBytes: 0, remainingBytes: 0, usedMB: 0, limitMB: 0, usedPercent: 0 };
  }
};
