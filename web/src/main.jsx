import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { onAuthStateChanged } from 'firebase/auth';
import { API, auth } from './api.js';
import Auth from './Auth.jsx';
import Scanner from './Scanner.jsx';
import IotDashboard from './IotDashboard.jsx';
import './style.css';
import '../../assets/mentor.css';
function App() {
  const [tab, setTab] = useState('terminal'), [user, setUser] = useState(null), [authOpen, setAuthOpen] = useState(false), [profile, setProfile] = useState(null);
  const login = useCallback(() => setAuthOpen(true), []);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => { if (!authOpen) return; const listener = e => { if (e.key === 'Escape') setAuthOpen(false); }; document.addEventListener('keydown', listener); return () => document.removeEventListener('keydown', listener); }, [authOpen]);
  return <><header><div className="header-inner"><a className="brand" href="#" onClick={() => setTab('terminal')}><span className="brand-icon">↗</span>invista<span>+</span></a><nav aria-label="Navegação principal"><button className={tab === 'terminal' ? 'active' : ''} onClick={() => setTab('terminal')}>Terminal IoT</button><button className={tab === 'scanner' ? 'active' : ''} onClick={() => setTab('scanner')}>Analisar ativos</button><a href={`${API}/api/docs`} target="_blank" rel="noreferrer">API ↗</a></nav><button className="account" onClick={login}>{user ? 'Minha conta' : 'Entrar'}</button></div></header>
    <main><div hidden={tab !== 'terminal'}><IotDashboard user={user} login={login} onProfile={setProfile}/></div><div hidden={tab !== 'scanner'}><Scanner user={user} login={login} terminalProfile={profile}/></div>
      <section className="mobile-banner"><div><span className="eyebrow">SEU TERMINAL VAI COM VOCÊ</span><h2>Mesmos dados. Em qualquer tela.</h2><p>O app React Native com Expo consulta a mesma API e controla seu LED pelo Blynk.</p></div><a className="button" href="https://github.com/VIT0R-maker/INVISTA_MAIS/tree/main/mobile" target="_blank" rel="noreferrer">Configurar aplicativo ↗</a></section>
    </main><footer><a className="brand" href="#">invista<span>+</span></a><p>Projeto Integrador · Web, Mobile, IoT & Estatística</p><a href="https://github.com/VIT0R-maker/INVISTA_MAIS" target="_blank" rel="noreferrer">Código & documentação ↗</a></footer>
    {authOpen && <Auth user={user} close={() => setAuthOpen(false)}/>}
  </>;
}
createRoot(document.getElementById('root')).render(<App/>);
