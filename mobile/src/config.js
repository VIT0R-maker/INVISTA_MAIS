const emulador = process.env.EXPO_PUBLIC_FIREBASE_EMULADOR || '';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://invista-mais-api.vercel.app').replace(/\/$/, '');

export const FIREBASE_API_KEY = emulador ? 'chave-do-emulador' : 'AIzaSyB_Y15KWLEeyMcNNQJUFCKzp7ktdvEVeVk';

export const AUTH_URL = emulador ? `http://${emulador}/identitytoolkit.googleapis.com` : 'https://identitytoolkit.googleapis.com';

export const TOKEN_URL = emulador ? `http://${emulador}/securetoken.googleapis.com` : 'https://securetoken.googleapis.com';
