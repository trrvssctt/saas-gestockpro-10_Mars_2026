/**
 * Avatar à initiales généré localement (SVG en data URI) : remplace les photos
 * aléatoires picsum.photos quand un employé n'a pas de photo. Aucun appel externe.
 */
const PALETTE = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed', '#475569'];

const escapeXml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c] as string));

export const getInitials = (name?: string | null): string => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

export const initialsAvatar = (name?: string | null, seed?: string | null): string => {
  const key = String(seed || name || '');
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const bg = PALETTE[hash % PALETTE.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">`
    + `<rect width="200" height="200" fill="${bg}"/>`
    + `<text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="80" font-weight="700" fill="#fff">${escapeXml(getInitials(name))}</text>`
    + `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
