/**
 * Tailwind compilé au build Vite (remplace le « Play CDN » cdn.tailwindcss.com,
 * non prévu pour la production). Config par défaut = celle du CDN.
 * Toute classe utilisée doit apparaître en toutes lettres dans un fichier listé
 * ci-dessous (pas de nom de classe construit par concaténation).
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './*.{ts,tsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './services/**/*.{ts,tsx,js}',
    './utils/**/*.{ts,tsx,js}',
  ],
  theme: { extend: {} },
  plugins: [],
};
