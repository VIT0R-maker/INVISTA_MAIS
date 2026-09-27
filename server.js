import express from 'express';
import cors from 'cors';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { fileURLToPath } from 'node:url';
import { createMentorHandler, reservarUso } from './lib/mentor.js';
import { criarContextoMentor } from './lib/mentor-context.js';
import { analisarAtivo, validarAtivo } from './lib/analysis.js';
import { perfisAcoesDisponiveis, perfisFiiDisponiveis } from './lib/classify.js';
import { createIotRouter } from './lib/iot.js';
import { firestoreIotStore, fileIotStore } from './lib/iot-store.js';

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '48kb' }));
let db;
try {
  if (!getApps().length) initializeApp({ credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }) });
  db = getFirestore();
} catch { console.warn('Firebase Admin não configurado. Rotas autenticadas exigem configuração.'); }
const iotStore = process.env.IOT_STORAGE === 'file' && !process.env.VERCEL
  ? fileIotStore() : db ? firestoreIotStore(db) : null;
const verifyToken = token => getAuth().verifyIdToken(token);
app.use('/api/v1', createIotRouter({ getStore: () => iotStore, verifyToken }));
app.get('/api/health', (_req, res) => res.json({ status: 'online', version: '3.0.0', database: Boolean(db), mentor: Boolean(process.env.GEMINI_API_KEY) }));
app.get('/api/perfis', (_req, res) => res.json({ acoes: perfisAcoesDisponiveis(), fiis: perfisFiiDisponiveis() }));
app.post('/api/mentor', createMentorHandler({ verifyToken, consumeQuota: uid => reservarUso(db, uid) }));
for (const tipo of ['acoes', 'fiis']) app.post('/api/' + tipo, async (req, res) => {
  try {
    const input = validarAtivo(req.body);
    const indicators = await analisarAtivo({ ...input, tipo });
    res.json({ ...indicators, mentorContext: criarContextoMentor(indicators, tipo, process.env.GEMINI_API_KEY) });
  } catch (e) {
    const status = e.status === 400 ? 400 : e.response?.status === 404 ? 404 : 502;
    res.status(status).json({ error: status === 400 ? e.message : status === 404 ? 'Ativo não encontrado.' : 'A fonte de cotações está indisponível ou limitou o acesso. Tente novamente em instantes.' });
  }
});
app.use('/api/v1/favorites', async (req, res, next) => {
  try {
    const token = /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1];
    if (!token) return res.status(401).json({ error: 'Entre na sua conta.' });
    const user = await verifyToken(token);
    if (!user.uid || user.firebase?.sign_in_provider === 'anonymous') throw new Error();
    req.uid = user.uid; next();
  } catch { res.status(401).json({ error: 'Sessão inválida. Entre novamente.' }); }
});
app.get('/api/v1/favorites', async (req, res) => {
  try { if (!db) throw new Error(); const doc = await db.collection('users').doc(req.uid).get(); res.json({ tickers: doc.data()?.ativosFavoritos || [] }); }
  catch { res.status(503).json({ error: 'Banco indisponível.' }); }
});
app.put('/api/v1/favorites', async (req, res) => {
  const tickers = req.body?.tickers;
  if (!Array.isArray(tickers) || tickers.length > 30 || tickers.some(t => typeof t !== 'string' || !/^[A-Z]{4}[0-9]{1,2}$/.test(t))) return res.status(400).json({ error: 'Informe até 30 tickers válidos.' });
  try { if (!db) throw new Error(); const unique = [...new Set(tickers)]; await db.collection('users').doc(req.uid).set({ ativosFavoritos: unique }, { merge: true }); res.json({ tickers: unique }); }
  catch { res.status(503).json({ error: 'Banco indisponível.' }); }
});
// O novo terminal registra consultas por botão; envio de e-mails do protótipo foi descontinuado.
app.post(['/api/favoritos/sync', '/api/relatorio'], (_req, res) => res.status(410).json({ error: 'Rota legada descontinuada. Consulte /api/docs para a API autenticada v1.' }));
app.get('/api/openapi.json', (_req, res) => res.sendFile(fileURLToPath(new URL('docs/openapi.json', import.meta.url))));
app.get('/api/docs', (_req, res) => res.sendFile(fileURLToPath(new URL('docs/api.html', import.meta.url))));
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint não encontrado.' }));
app.use(express.static(fileURLToPath(new URL('dist', import.meta.url))));
app.get('*', (_req, res) => res.sendFile(fileURLToPath(new URL('dist/index.html', import.meta.url))));
app.use((error, _req, res, _next) => {
  const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500;
  res.status(status).json({ error: status === 413 ? 'Mensagem muito grande.' : status === 400 ? 'JSON inválido.' : 'Erro interno do servidor.' });
});
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') app.listen(process.env.PORT || 3000, () => console.log('Invista+ em http://localhost:' + (process.env.PORT || 3000)));
export default app;
