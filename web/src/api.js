import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '../../shared/firebase-config.js';
export const auth = getAuth(initializeApp(firebaseConfig));
export const API = import.meta.env.VITE_API_URL || (location.hostname.endsWith('github.io') ? 'https://invista-chi.vercel.app' : '');
export async function request(path, { body, method = 'GET', signal } = {}) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${API}${path}`, { method, signal, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Não foi possível concluir. Tente novamente.');
  return data;
}
