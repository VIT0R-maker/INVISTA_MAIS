import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { createMentorHandler, reservarUso } from './lib/mentor.js';
import { criarContextoMentor } from './lib/mentor-context.js';

import { analisarAtivo, validarAtivo } from './lib/analysis.js';
import { perfisAcoesDisponiveis, perfisFiiDisponiveis } from './lib/classify.js';
import { getSelicAtual } from './lib/bcb.js';
import { criarClienteBlynk } from './lib/blynk.js';
import { criarRotasDispositivos } from './lib/cofrinho.js';
import { criarRotasFavoritos } from './lib/favoritos.js';
import { HttpError } from './lib/auth.js';
const app = express();
const port = process.env.PORT || 3000;

app.set('trust proxy', 1);

const origensPermitidas = (process.env.CORS_ORIGINS ||
  'https://invista-mais-api.vercel.app,https://vit0r-maker.github.io,http://localhost:3000,http://localhost:5173,http://localhost:8081')
  .split(',').map(origem => origem.trim()).filter(Boolean);
app.use(cors({ origin: (origem, callback) => callback(null, !origem || origensPermitidas.includes(origem)) }));
app.use(express.json({ limit: '48kb' }));
app.use('/api', rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Muitas requisições. Aguarde um minuto.' } }));

// Lista explícita: nunca expor .env, código do servidor ou credenciais como arquivos estáticos.
for (const file of ['index.html', 'login.html', 'cadastro.html', 'assets/mentor.js', 'assets/mentor.css', 'assets/config.js']) {
  app.get(`/${file}`, (_req, res) => res.sendFile(fileURLToPath(new URL(file, import.meta.url))));
}

// 1. Inicialização segura do Firestore com os módulos modernos
let db;
try {
  if (!getApps().length) {
    const emulador = process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST;
    initializeApp(emulador ? { projectId: process.env.FIREBASE_PROJECT_ID || 'demo-invista' } : {
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      })
    });
  }
  db = getFirestore();
  console.log("🔥 Firestore conectado com sucesso!");
} catch (error) {
  console.error("❌ Falha crítica ao conectar no Firebase:", error.message);
}

// 2. Configura o "carteiro" (Nodemailer) com a sua Senha de App
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.get('/', (_req, res) => res.sendFile(fileURLToPath(new URL('index.html', import.meta.url))));

// Rota de Pulsação
app.get('/api/health', (req, res) => {
    res.json({ 
        status: "Online 🟢", 
        sistema: "Motor Quântico InvistaAI", 
        mensagem: "API operando em capacidade máxima. Acesse a interface pelo GitHub Pages." 
    });
});

app.post('/api/mentor', createMentorHandler({
  verifyToken: token => getAuth().verifyIdToken(token),
  consumeQuota: uid => reservarUso(db, uid),
}));

function tratarErro(res, error, ticker, tipo) {
  console.error(`Erro ${tipo}:`, error.message);

  if (error.possivelBloqueio) {
    return res.status(502).json({
      error: 'O investidor10 recusou ou limitou a requisição (possível bloqueio de IP do servidor). Tente novamente em alguns minutos.',
    });
  }

  const status = error.response?.status === 404 ? 404 : 502;
  const msg = status === 404
      ? `${tipo === 'FII' ? 'Fundo' : 'Ticker'} "${ticker.toUpperCase()}" não encontrado.`
      : 'Não foi possível consultar os dados agora. Tente novamente em instantes.';
  res.status(status).json({ error: msg });
}

app.get('/api/perfis', (_req, res) => {
  res.json({ acoes: perfisAcoesDisponiveis(), fiis: perfisFiiDisponiveis() });
});

app.post('/api/acoes', async (req, res) => {
  let ticker;
  try {
    const input = validarAtivo(req.body);
    ticker = input.ticker;
    const indicadores = await analisarAtivo({ ...input, tipo: 'acoes' });
    res.json({ ...indicadores, mentorContext: criarContextoMentor(indicadores, 'acoes', process.env.GEMINI_API_KEY) });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    tratarErro(res, error, ticker || '', 'Ação');
  }
});

app.post('/api/fiis', async (req, res) => {
  let ticker;
  try {
    const input = validarAtivo(req.body);
    ticker = input.ticker;
    const indicadores = await analisarAtivo({ ...input, tipo: 'fiis' });
    res.json({ ...indicadores, mentorContext: criarContextoMentor(indicadores, 'fiis', process.env.GEMINI_API_KEY) });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    tratarErro(res, error, ticker || '', 'FII');
  }
});

app.get('/api/ativos/:tipo/:ticker', async (req, res) => {
  const { tipo } = req.params;
  if (!['acoes', 'fiis'].includes(tipo)) return res.status(404).json({ error: 'Tipo de ativo inválido. Use acoes ou fiis.' });
  let ticker;
  try {
    const input = validarAtivo({ ticker: req.params.ticker, perfil: req.query.perfil });
    ticker = input.ticker;
    const indicadores = await analisarAtivo({ ...input, tipo });
    res.json({ ...indicadores, mentorContext: criarContextoMentor(indicadores, tipo, process.env.GEMINI_API_KEY) });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    tratarErro(res, error, ticker || '', tipo === 'fiis' ? 'FII' : 'Ação');
  }
});

const verifyToken = token => getAuth().verifyIdToken(token);
const blynk = criarClienteBlynk({ servidor: process.env.BLYNK_SERVER || 'blynk.cloud' });
const enviarEmail = ({ para, assunto, html }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new HttpError(503, 'O envio de e-mail não está configurado no servidor.');
  }
  return transporter.sendMail({ from: `"Invista+" <${process.env.EMAIL_USER}>`, to: para, subject: assunto, html });
};

app.use('/api/usuarios/me/favoritos', criarRotasFavoritos({ db, verifyToken }));
app.use('/api/dispositivos', criarRotasDispositivos({
  db, verifyToken, blynk, enviarEmail, getSelic: getSelicAtual, analisarAtivo,
}));

const openapi = readFileSync(new URL('docs/openapi.yaml', import.meta.url), 'utf8');
app.get('/api/openapi.yaml', (_req, res) => res.type('application/yaml').send(openapi));
app.get('/api/docs', (_req, res) => res.type('html').send(`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>API Invista+</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"></head>
<body><div id="swagger"></div><script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/api/openapi.yaml', dom_id: '#swagger' });</script></body></html>`));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

app.use((error, _req, res, _next) => {
  const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500;
  res.status(status).json({ error: status === 413 ? 'Mensagem muito grande.' : status === 400 ? 'JSON inválido.' : 'Erro interno do servidor.' });
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`🚀 Motor Quântico operando em http://localhost:${port}`);
  });
}

// Configuração estática lida pelo runtime Node da Vercel.
export const config = { maxDuration: 60 };
export default app;
