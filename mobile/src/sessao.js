import * as SecureStore from 'expo-secure-store';
import { AUTH_URL, FIREBASE_API_KEY, TOKEN_URL } from './config';

const CHAVE_REFRESH = 'invista_refresh_token';
const MENSAGENS = {
  EMAIL_NOT_FOUND: 'E-mail ou senha incorretos.',
  INVALID_PASSWORD: 'E-mail ou senha incorretos.',
  INVALID_LOGIN_CREDENTIALS: 'E-mail ou senha incorretos.',
  EMAIL_EXISTS: 'Não foi possível criar a conta com este e-mail.',
  WEAK_PASSWORD: 'A senha deve ter pelo menos 8 caracteres.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Muitas tentativas. Aguarde alguns minutos.',
  INVALID_EMAIL: 'E-mail inválido.',
};

let sessao = null;
let memoria = null;

async function guardar(valor) {
  if (await SecureStore.isAvailableAsync()) {
    if (valor) await SecureStore.setItemAsync(CHAVE_REFRESH, valor);
    else await SecureStore.deleteItemAsync(CHAVE_REFRESH);
  } else {
    memoria = valor;
  }
}

async function ler() {
  return (await SecureStore.isAvailableAsync()) ? SecureStore.getItemAsync(CHAVE_REFRESH) : memoria;
}

async function chamar(url, opcoes) {
  let resposta;
  try {
    resposta = await fetch(url, opcoes);
  } catch {
    throw new Error('Sem conexão com a internet.');
  }
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const codigo = String(dados.error?.message || '').split(' ')[0];
    throw new Error(MENSAGENS[codigo] || 'Não foi possível entrar. Tente novamente.');
  }
  return dados;
}

function registrar({ idToken, refreshToken, expiresIn, email }) {
  sessao = { idToken, refreshToken, email, expiraEm: Date.now() + (Number(expiresIn) - 60) * 1000 };
  return guardar(refreshToken).then(() => ({ email }));
}

export async function entrar(email, senha, criarConta = false) {
  if (criarConta && senha.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.');
  const acao = criarConta ? 'signUp' : 'signInWithPassword';
  const dados = await chamar(`${AUTH_URL}/v1/accounts:${acao}?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password: senha, returnSecureToken: true }),
  });
  return registrar(dados);
}

async function renovar(refreshToken) {
  const dados = await chamar(`${TOKEN_URL}/v1/token?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });
  return registrar({ idToken: dados.id_token, refreshToken: dados.refresh_token, expiresIn: dados.expires_in, email: sessao?.email });
}

export async function restaurar() {
  const refreshToken = await ler();
  if (!refreshToken) return null;
  try {
    await renovar(refreshToken);
    return { email: sessao.email };
  } catch {
    await guardar(null);
    return null;
  }
}

export async function token() {
  if (!sessao) return null;
  if (Date.now() >= sessao.expiraEm) await renovar(sessao.refreshToken);
  return sessao.idToken;
}

export async function sair() {
  sessao = null;
  await guardar(null);
}
