import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

const Contexto = createContext({ usuario: null, carregando: true });

export function ProvedorAuth({ children }) {
  const [estado, setEstado] = useState({ usuario: null, carregando: true });

  useEffect(() => onAuthStateChanged(auth, usuario => setEstado({ usuario, carregando: false })), []);

  return <Contexto.Provider value={estado}>{children}</Contexto.Provider>;
}

export const useAuth = () => useContext(Contexto);
