const buildTimeBackend = (import.meta as any).env?.VITE_BACKEND_URL;
let rawBackend: string;

if (buildTimeBackend) {
  rawBackend = buildTimeBackend;
} else {
  try {
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    if (origin && /localhost:517[3-9]/.test(origin)) {
      //rawBackend = 'http://localhost:3000';
      rawBackend = 'https://gestock.realtechprint.com';
    } else if (origin && !/localhost|127\.0\.0\.1/.test(origin)) {
      rawBackend = origin;
    } else {
      //rawBackend = 'http://localhost:3000';
      rawBackend = 'https://gestock.realtechprint.com';
    }
  } catch (e) {
    //rawBackend = 'http://localhost:3000';
    rawBackend = 'https://gestock.realtechprint.com';

  }
}

export const BASE_URL = rawBackend.replace(/\/+$/, '');
export const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;
