import { Router } from 'express';
import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { analyzeTelemetry, profileForRisk } from '../shared/statistics.js';

export const fail = (status, message) => Object.assign(new Error(message), { status });
function sameSecret(a, b) {
  if (typeof a !== 'string' || !b) return false;
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}

export function validateTelemetry(body, now = new Date()) {
  const integer = (x, min, max) => Number.isInteger(x) && x >= min && x <= max;
  if (!body || !/^[\w-]{8,64}$/.test(body.sessionId || '') || !integer(body.sequence, 0, 2147483647) ||
      !integer(body.analogRaw, 0, 4095) || typeof body.buttonPressed !== 'boolean' || !integer(body.buttonPresses, 0, 10000) ||
      typeof body.ledOn !== 'boolean' || !Number.isFinite(body.intervalSeconds) || body.intervalSeconds < 1 || body.intervalSeconds > 3600 ||
      !['wokwi', 'esp32', 'simulator'].includes(body.source)) throw fail(400, 'Leitura inválida. Confira os campos e limites na documentação da API.');
  return { id: `${body.sessionId}-${body.sequence}`, sessionId: body.sessionId, sequence: body.sequence,
    analogRaw: body.analogRaw, riskLevel: Math.round(body.analogRaw * 100 / 4095), buttonPressed: body.buttonPressed,
    buttonPresses: body.buttonPresses, intervalSeconds: body.intervalSeconds, ledOn: body.ledOn, source: body.source,
    receivedAt: now.toISOString() };
}

export function parseWindow(query, now = new Date()) {
  function iso(value, fallback) { if (!value) return fallback; const date = new Date(value); if (typeof value !== 'string' || !Number.isFinite(date.getTime())) throw fail(400, 'Período inválido. Use datas ISO 8601.'); return date.toISOString(); }
  const to = iso(query.to, now.toISOString());
  const from = iso(query.from, new Date(new Date(to).getTime() - 86400000).toISOString());
  const limit = query.limit === undefined ? 500 : Number(query.limit);
  if (from > to || new Date(to) - new Date(from) > 90 * 86400000 || !Number.isInteger(limit) || limit < 1 || limit > 1000) throw fail(400, 'Use uma janela de até 90 dias e limite entre 1 e 1.000.');
  let before;
  if (query.before) {
    try { before = JSON.parse(Buffer.from(query.before, 'base64url').toString()); } catch { throw fail(400, 'Cursor inválido.'); }
    if (!Array.isArray(before) || before.length !== 2 || !/^[\w-]{8,80}$/.test(before[1])) throw fail(400, 'Cursor inválido.');
    before[0] = iso(before[0]);
    if (!before[0]) throw fail(400, 'Cursor inválido.');
  }
  return { from, to, limit, ...(before ? { before } : {}) };
}

export async function updateBlynkLed(on, env = process.env, fetchImpl = fetch) {
  if (!env.BLYNK_AUTH_TOKEN) throw fail(503, 'Configure o dispositivo Blynk no servidor para controlar o LED.');
  const host = env.BLYNK_SERVER || 'blynk.cloud';
  if (!/^(?:[a-z0-9-]+\.)?blynk\.cloud$/.test(host)) throw fail(503, 'Servidor Blynk inválido.');
  const url = new URL(`https://${host}/external/api/update`);
  url.searchParams.set('token', env.BLYNK_AUTH_TOKEN);
  url.searchParams.set('V2', on ? '1' : '0');
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error();
  } catch { throw fail(502, 'O Blynk não aceitou o comando. Confira a conexão do dispositivo e tente novamente.'); }
}

export function createIotRouter({ getStore, verifyToken, env = process.env, sendLed = on => updateBlynkLed(on, env), now = () => new Date() }) {
  const router = Router();
  const run = fn => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try { await fn(req, res); } catch (e) { res.status(e.status || 503).json({ error: e.status ? e.message : 'Serviço de dados indisponível. Tente novamente.' }); }
  };
  const store = () => { const s = getStore(); if (!s) throw fail(503, 'Banco de dados não configurado.'); return s; };
  async function user(req) {
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
    if (!match) throw fail(401, 'Entre na sua conta para acessar o terminal.');
    try { const u = await verifyToken(match[1]); if (!u?.uid || u.firebase?.sign_in_provider === 'anonymous') throw new Error(); return u.uid; } catch { throw fail(401, 'Sessão inválida. Entre novamente.'); }
  }
  async function owned(req) {
    const uid = await user(req); const device = await store().get(req.params.id);
    if (!device || device.ownerUid !== uid) throw fail(404, 'Terminal não encontrado.');
    return device;
  }
  const publicDevice = d => ({ id: d.id, name: d.name, createdAt: d.createdAt, latest: d.latest, latestCommand: d.latestCommand,
    online: Boolean(d.latest && now() - new Date(d.latest.receivedAt) < 45000), profile: d.latest ? profileForRisk(d.latest.riskLevel) : null });
  router.get('/status', run(async (_req, res) => res.json({ database: Boolean(getStore()), blynk: Boolean(env.BLYNK_AUTH_TOKEN), deviceId: env.IOT_DEVICE_ID || 'terminal-01', sensors: ['potentiometer', 'button'], actuator: 'led' })));
  router.get('/devices', run(async (req, res) => res.json({ devices: (await store().list(await user(req))).map(publicDevice) })));
  router.post('/devices', run(async (req, res) => {
    const uid = await user(req);
    if (!env.IOT_PAIRING_CODE) throw fail(503, 'O código de vínculo do terminal não foi configurado.');
    if (!sameSecret(req.body?.pairingCode, env.IOT_PAIRING_CODE)) throw fail(403, 'Código de vínculo inválido.');
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (typeof name !== 'string' || !name || name.length > 60) throw fail(400, 'Nome deve ter entre 1 e 60 caracteres.');
    const d = await store().claim(env.IOT_DEVICE_ID || 'terminal-01', uid, name);
    res.status(201).location(`/api/v1/devices/${d.id}`).json(publicDevice(d));
  }));
  router.get('/devices/:id', run(async (req, res) => res.json(publicDevice(await owned(req)))));
  router.patch('/devices/:id', run(async (req, res) => {
    await owned(req); const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (typeof name !== 'string' || !name || name.length > 60) throw fail(400, 'Nome deve ter entre 1 e 60 caracteres.');
    await store().patch(req.params.id, { name }); res.json(publicDevice(await store().get(req.params.id)));
  }));
  router.post('/devices/:id/telemetry', run(async (req, res) => {
    if (!env.IOT_DEVICE_TOKEN) throw fail(503, 'Credencial do dispositivo não configurada.');
    if (req.params.id !== (env.IOT_DEVICE_ID || 'terminal-01') || !sameSecret(req.headers['x-device-token'], env.IOT_DEVICE_TOKEN)) throw fail(401, 'Credencial do dispositivo inválida.');
    const sample = validateTelemetry(req.body, now());
    const created = await store().ingest(req.params.id, sample);
    res.status(created ? 201 : 200).json({ id: sample.id, created, riskLevel: sample.riskLevel, profile: profileForRisk(sample.riskLevel) });
  }));
  router.get('/devices/:id/telemetry', run(async (req, res) => {
    await owned(req); const window = parseWindow(req.query, now()); const all = await store().readings(req.params.id, window);
    const rows = all.slice(0, window.limit); const hasMore = all.length > window.limit;
    res.json({ readings: rows, window, hasMore, nextCursor: hasMore ? Buffer.from(JSON.stringify([rows.at(-1).receivedAt, rows.at(-1).id])).toString('base64url') : null });
  }));
  router.get('/devices/:id/statistics', run(async (req, res) => {
    await owned(req); const window = parseWindow(req.query, now()); const all = await store().readings(req.params.id, window);
    const rows = all.slice(0, window.limit);
    res.json({ ...analyzeTelemetry(rows), window, truncated: all.length > window.limit, sources: [...new Set(rows.map(r => r.source))] });
  }));
  router.put('/devices/:id/actuators/led', run(async (req, res) => {
    await owned(req); if (typeof req.body?.on !== 'boolean') throw fail(400, 'Informe on como true ou false.');
    await sendLed(req.body.on);
    const command = { id: randomUUID(), on: req.body.on, sentAt: now().toISOString(), transport: 'blynk', status: 'sent' };
    await store().command(req.params.id, command);
    res.status(202).json({ ...command, message: 'Comando enviado ao Blynk. Aguarde a próxima leitura para confirmar o estado físico.' });
  }));
  return router;
}
