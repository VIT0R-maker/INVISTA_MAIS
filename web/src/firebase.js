import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';

const emulador = import.meta.env.VITE_FIREBASE_EMULADOR === 'true';

const app = initializeApp({
  apiKey: 'AIzaSyB_Y15KWLEeyMcNNQJUFCKzp7ktdvEVeVk',
  authDomain: 'invista-mais-31a71.firebaseapp.com',
  projectId: emulador ? 'demo-invista' : 'invista-mais-31a71',
  storageBucket: 'invista-mais-31a71.firebasestorage.app',
  messagingSenderId: '74617818857',
  appId: '1:74617818857:web:7d4a3e3cd684315f736a78',
});

export const auth = getAuth(app);

if (emulador) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
