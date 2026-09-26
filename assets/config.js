// GitHub Pages usa o backend público; Vercel e desenvolvimento usam a mesma origem.
// Altere apenas esta URL se o backend de produção mudar.
export const API_BASE_URL = location.hostname.endsWith('.github.io') || location.protocol === 'file:'
  ? 'https://invista-mais-api.vercel.app'
  : '';
