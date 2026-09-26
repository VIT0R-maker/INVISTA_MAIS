const emulador = process.env.EXPO_PUBLIC_FIREBASE_EMULADOR || '';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://invistaai-ochre.vercel.app').replace(/\/$/, '');

export const FIREBASE_API_KEY = emulador ? 'chave-do-emulador' : 'AIzaSyC4ivuaeCkRzlnMf1wj8NMAYgGMvD_jLzQ';

export const AUTH_URL = emulador ? `http://${emulador}/identitytoolkit.googleapis.com` : 'https://identitytoolkit.googleapis.com';

export const TOKEN_URL = emulador ? `http://${emulador}/securetoken.googleapis.com` : 'https://securetoken.googleapis.com';
