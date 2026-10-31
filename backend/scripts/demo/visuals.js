/**
 * Visuels génériques des produits/services : pictogramme Lucide (licence ISC, déjà
 * dépendance du frontend) sur dégradé, encodés en data URI SVG — jamais d'image cassée.
 */
const ICON_DIR = new URL('../../../node_modules/lucide-react/dist/esm/icons/', import.meta.url);

const escapeAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

async function iconMarkup(name) {
  const mod = await import(new URL(`${name}.js`, ICON_DIR).href);
  return mod.__iconNode.map(([tag, attrs]) =>
    `<${tag} ${Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${escapeAttr(v)}"`).join(' ')}/>`
  ).join('');
}

export async function productVisual(iconName, [from, to]) {
  const icon = await iconMarkup(iconName);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>`
    + `<rect width="400" height="400" rx="56" fill="url(#g)"/>`
    + `<circle cx="200" cy="200" r="132" fill="#fff" fill-opacity=".14"/>`
    + `<g transform="translate(104 104) scale(8)" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icon}</g>`
    + `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function logoVisual() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">`
    + `<rect width="240" height="240" rx="52" fill="#0f766e"/>`
    + `<path d="M60 92h120M120 92v88" stroke="#fff" stroke-width="22" stroke-linecap="round"/>`
    + `<circle cx="168" cy="160" r="18" fill="#fbbf24"/>`
    + `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
