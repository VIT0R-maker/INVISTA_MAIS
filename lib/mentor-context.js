import { createHmac, timingSafeEqual } from 'node:crypto';

const CONTEXT_TTL_MS = 30 * 60 * 1000;

function sign(payload, key) {
  return createHmac('sha256', key).update(`invista-mentor-context:v1:${payload}`).digest('base64url');
}

// Guarda exatamente a análise entregue aos cards, sem depender do cache de uma instância.
export function criarContextoMentor(indicadores, tipo, key, now = Date.now()) {
  if (!key?.trim()) return null;
  const contexto = {
    tipo,
    indicadores,
    consultadoEm: new Date(now).toISOString(),
    expiraEm: now + CONTEXT_TTL_MS,
    fonte: `https://investidor10.com.br/${tipo}/${indicadores.ticker.toLowerCase()}/`,
    observacao: 'Mesmos indicadores exibidos na busca. Dados sujeitos a atraso e cache de até 5 minutos. Valuations são estimativas do Invista+.',
  };
  const payload = Buffer.from(JSON.stringify(contexto)).toString('base64url');
  return { payload, signature: sign(payload, key.trim()) };
}

export function lerContextoMentor(snapshot, ativo, key, now = Date.now()) {
  const invalid = () => Object.assign(new Error('Refaça a busca do ativo para atualizar os indicadores do Mentor IA.'), { status: 400 });
  if (!snapshot || typeof snapshot.payload !== 'string' || snapshot.payload.length > 24000 ||
      typeof snapshot.signature !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(snapshot.signature)) throw invalid();
  const actual = Buffer.from(snapshot.signature);
  const expected = Buffer.from(sign(snapshot.payload, key.trim()));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw invalid();
  let contexto;
  try { contexto = JSON.parse(Buffer.from(snapshot.payload, 'base64url').toString('utf8')); } catch { throw invalid(); }
  if (!contexto || contexto.tipo !== ativo.tipo || contexto.indicadores?.ticker !== ativo.ticker ||
      contexto.indicadores?.perfil !== ativo.perfil || !Number.isFinite(contexto.expiraEm) || contexto.expiraEm <= now) throw invalid();
  return contexto;
}
