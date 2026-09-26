import express from 'express';
import cors from 'cors';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { createMentorHandler, reservarUso } from './lib/mentor.js';

import { analisarAtivo, validarAtivo } from './lib/analysis.js';
import { perfisAcoesDisponiveis, perfisFiiDisponiveis } from './lib/classify.js';
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '48kb' }));

// Lista explícita: nunca expor .env, código do servidor ou credenciais como arquivos estáticos.
for (const file of ['index.html', 'login.html', 'cadastro.html', 'assets/mentor.js', 'assets/mentor.css', 'assets/config.js']) {
  app.get(`/${file}`, (_req, res) => res.sendFile(fileURLToPath(new URL(file, import.meta.url))));
}

// 1. Inicialização segura do Firestore com os módulos modernos
let db;
try {
  if (!getApps().length) {
    initializeApp({
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
    res.json(await analisarAtivo({ ...input, tipo: 'acoes' }));
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
    res.json(await analisarAtivo({ ...input, tipo: 'fiis' }));
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    tratarErro(res, error, ticker || '', 'FII');
  }
});

// =================================================================
// ROTA DE SINCRONIZAÇÃO: FRONTEND -> FIREBASE
// =================================================================
app.post('/api/favoritos/sync', async (req, res) => {
  const { deviceId, favoritos } = req.body;
  
  if (!deviceId || !Array.isArray(favoritos)) {
    return res.status(400).json({ error: 'Dados inválidos.' });
  }

  try {
    if (!db) throw new Error("Banco de dados não está conectado.");
    
    // Atualiza apenas a matriz 'ativosFavoritos' no documento do usuário
    const docRef = db.collection('devices').doc(deviceId);
    await docRef.set({ ativosFavoritos: favoritos }, { merge: true });
    
    console.log(`[Sync] Nuvem atualizada para o aparelho ${deviceId}:`, favoritos);
    res.json({ success: true, message: 'Sincronizado com sucesso!' });

  } catch (error) {
    console.error("Erro ao sincronizar favoritos na nuvem:", error);
    res.status(500).json({ error: 'Falha ao salvar na nuvem.' });
  }
});

// =================================================================
// ROTA DO IOT: FIREBASE REAL + GMAIL + VALUATION
// =================================================================
app.post('/api/relatorio', async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'Device ID não informado.' });

  try {
    if (!db) throw new Error("Banco de dados não está conectado.");

    const docRef = db.collection('devices').doc(deviceId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Aparelho não cadastrado no Firebase.' });
    }

    const usuario = doc.data();
    console.log(`[IoT] Analisando ativos de ${usuario.nome}: ${usuario.ativosFavoritos.join(', ')}`);

    let relatorioHTML = `
      <div style="font-family: Arial; color: #333;">
        <h2 style="color: #0056b3;">Relatório Invista+</h2>
        <p>Olá, <b>${usuario.nome}</b>! Aqui está a análise atualizada da sua carteira disparada pelo seu dispositivo físico:</p>
        <hr>
    `;
    
    for (const ticker of usuario.ativosFavoritos) {
      try {
        // Verifica se o ticker é um Fundo Imobiliário (termina com 11) ou Ação
        const isFii = ticker.endsWith('11');
        const endpoint = isFii ? 'api/fiis' : 'api/acoes';

        const response = await fetch(`https://invistaai-ochre.vercel.app/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker: ticker, perfil: "moderado" })
        });
        
        const dados = await response.json();
        
        if (isFii) {
          // Layout específico para FIIs
          relatorioHTML += `
            <div style="margin-bottom: 15px; padding: 10px; border-left: 4px solid #28a745; background: #f9f9f9;">
              <h3 style="margin: 0 0 5px 0;">${ticker} <span style="font-size: 0.8em; color: #666;">(FII)</span></h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li><b>Cotação:</b> ${dados.cotacao?.value || '-'}</li>
                <li><b>P/VP:</b> ${dados.pvp?.value || '-'}</li>
                <li><b>DY:</b> ${dados.dy?.value || '-'}</li>
                <li><b>Último Rendimento:</b> ${dados.ultimoRendimento?.value || '-'}</li>
              </ul>
            </div>
          `;
        } else {
          // Layout original para Ações
          relatorioHTML += `
            <div style="margin-bottom: 15px; padding: 10px; border-left: 4px solid #0056b3; background: #f9f9f9;">
              <h3 style="margin: 0 0 5px 0;">${ticker} <span style="font-size: 0.8em; color: #666;">(Ação)</span></h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li><b>Cotação:</b> ${dados.cotacao?.value || '-'}</li>
                <li><b>P/L:</b> ${dados.pl?.value || '-'}</li>
                <li><b>DY:</b> ${dados.dy?.value || '-'}</li>
                <li><b>Valor de Graham:</b> ${dados.valorGrahamTupiniquim?.value || '-'}</li>
              </ul>
            </div>
          `;
        }
      } catch (e) {
        relatorioHTML += `<p><b>${ticker}:</b> Falha ao analisar este ativo no momento.</p>`;
      }
    }
    
    relatorioHTML += `<br><p><i>Análise gerada automaticamente pelo sistema Invista+ IoT.</i></p></div>`;

    await transporter.sendMail({
      from: `"Motor Invista+" <${process.env.EMAIL_USER}>`,
      to: usuario.email,
      subject: `📈 Relatório de Ativos Invista+ (${usuario.nome})`,
      html: relatorioHTML
    });

    console.log(`[IoT] E-mail enviado com sucesso para ${usuario.email}!`);
    res.json({ success: true, message: "Relatorio enviado no e-mail!" });

  } catch (error) {
    console.error("Erro geral no IoT:", error);
    res.status(500).json({ error: 'Falha ao processar relatório.' });
  }
});

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
