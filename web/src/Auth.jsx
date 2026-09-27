import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth } from './api.js';
export default function Auth({ user, close }) {
  const [register, setRegister] = useState(false), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage('');
    try { await (register ? createUserWithEmailAndPassword : signInWithEmailAndPassword)(auth, email, password); close(); }
    catch (e) { setMessage(e.code === 'auth/email-already-in-use' ? 'Este e-mail já está cadastrado. Use Entrar.' : e.code === 'auth/weak-password' ? 'Use uma senha com pelo menos 6 caracteres.' : 'Não foi possível entrar. Confira e-mail e senha ou tente novamente.'); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onClick={close}><section role="dialog" aria-modal="true" aria-labelledby="auth-title" className="panel auth" onClick={e => e.stopPropagation()}>
    <button className="close" aria-label="Fechar" onClick={close}>×</button><span className="eyebrow">SUA CONTA INVISTA+</span><h2 id="auth-title">{user ? 'Você está conectado' : register ? 'Comece sua jornada' : 'Bem-vindo de volta'}</h2>
    {user ? <><p>{user.email}</p><button onClick={async () => { await signOut(auth); close(); }}>Sair da conta</button></> : <form onSubmit={submit}>
      <label>E-mail<input autoFocus autoComplete="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}/></label>
      <label>Senha<input autoComplete={register ? 'new-password' : 'current-password'} type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}/></label>
      <button className="primary" disabled={busy}>{busy ? 'Conectando…' : register ? 'Criar conta' : 'Entrar'}</button>
      <button type="button" className="text-button" onClick={() => setRegister(!register)}>{register ? 'Já tenho uma conta' : 'Criar uma conta'}</button>
      <button type="button" className="text-button" disabled={busy} onClick={async () => { if (!email) return setMessage('Informe seu e-mail acima.'); try { await sendPasswordResetEmail(auth, email); setMessage('Se houver uma conta, você receberá instruções por e-mail.'); } catch { setMessage('Não foi possível enviar. Confira o e-mail e tente novamente.'); } }}>Esqueci minha senha</button>
    </form>}{message && <p role="status" className="notice">{message}</p>}
  </section></div>;
}
