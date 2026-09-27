import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '../shared/firebase-config';
export const auth = getAuth(initializeApp(firebaseConfig));
export const API = (process.env.EXPO_PUBLIC_API_URL || 'https://invista-chi.vercel.app').replace(/\/$/, '');
export async function request(path, { method = 'GET', body, signal } = {}) {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(API + path, { method, signal, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível acessar o servidor.');
  return data;
}
