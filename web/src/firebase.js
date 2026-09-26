import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';

const emulador = import.meta.env.VITE_FIREBASE_EMULADOR === 'true';

const app = initializeApp({
  apiKey: 'AIzaSyC4ivuaeCkRzlnMf1wj8NMAYgGMvD_jLzQ',
  authDomain: 'invista-ai-63bba.firebaseapp.com',
  projectId: emulador ? 'demo-invista' : 'invista-ai-63bba',
  storageBucket: 'invista-ai-63bba.firebasestorage.app',
  messagingSenderId: '941158151001',
  appId: '1:941158151001:web:127d37db6b903b81585248',
});

export const auth = getAuth(app);

if (emulador) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
