import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileIotStore } from '../lib/iot-store.js';
import { createIotRouter, updateBlynkLed, validateTelemetry, parseWindow } from '../lib/iot.js';
const sample = { sessionId: 'test-session-001', sequence: 1, analogRaw: 2048, buttonPressed: false, buttonPresses: 2, intervalSeconds: 10, ledOn: false, source: 'wokwi' };
async function setup(t) {
  const dir = await mkdtemp(join(tmpdir(), 'invista-iot-')); const file = join(dir, 'data.json');
  const store = fileIotStore(file), commands = [];
  const app = express(); app.use(express.json());
  app.use('/api/v1', createIotRouter({ getStore: () => store, verifyToken: async token => { if (!['owner','other'].includes(token)) throw new Error(); return { uid: token }; }, env: { IOT_DEVICE_TOKEN: 'device-secret', IOT_PAIRING_CODE: 'pair-secret' }, sendLed: async on => commands.push(on), now: () => new Date('2026-09-27T10:00:00Z') }));
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(dir, { recursive: true, force: true }); });
  const request = async (path, { method = 'GET', body, token = 'owner', deviceToken } = {}) => {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/v1${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(deviceToken ? { 'X-Device-Token': deviceToken } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: res.status, data: await res.json() };
  };
  const pair = () => request('/devices', { method: 'POST', body: { name: 'Teste', pairingCode: 'pair-secret' } });
  return { store, file, commands, request, pair };
}
test('API autentica dono, isola outra conta e valida vínculo', async t => {
  const { request, pair } = await setup(t);
  assert.equal((await request('/devices', { token: null })).status, 401);
  assert.equal((await request('/devices', { method: 'POST', body: { pairingCode: 'incorrect', name: 'Test' } })).status, 403);
  assert.equal((await request('/devices', { method: 'POST', body: { pairingCode: 'pair-secret', name: 123 } })).status, 400);
  assert.equal((await pair()).status, 201);
  assert.equal((await request('/devices/terminal-01', { token: 'other' })).status, 404);
  assert.equal((await request('/devices', { method: 'POST', token: 'other', body: { name: 'Test', pairingCode: 'pair-secret' } })).status, 409);
  assert.equal((await request('/devices', { token: 'other' })).data.devices.length, 0);
});
test('ingestão autenticada, persistência após reabrir, idempotência e cursor com timestamps iguais', async t => {
  const { request, pair, file } = await setup(t); await pair();
  const put = (body, deviceToken = 'device-secret') => request('/devices/terminal-01/telemetry', { method: 'POST', body, deviceToken, token: null });
  assert.equal((await put(sample, 'wrong')).status, 401);
  assert.equal((await put(sample)).status, 201); assert.equal((await put(sample)).status, 200);
  assert.equal((await put({ ...sample, buttonPresses: 8 })).status, 409);
  assert.equal((await put({ ...sample, sequence: 2, analogRaw: 4095 })).status, 201);
  assert.equal((await fileIotStore(file).get('terminal-01')).latest.riskLevel, 100);
  const page1 = await request('/devices/terminal-01/telemetry?limit=1');
  assert.equal(page1.data.hasMore, true); assert.equal(page1.data.readings[0].sequence, 2);
  const page2 = await request('/devices/terminal-01/telemetry?limit=1&before=' + page1.data.nextCursor);
  assert.equal(page2.data.readings[0].sequence, 1); assert.equal(page2.data.hasMore, false);
  const stats = await request('/devices/terminal-01/statistics');
  assert.equal(stats.data.sampleCount, 2); assert.equal(stats.data.totalPresses, 4); assert.equal(stats.data.risk.mean, 75);
  assert.equal((await request('/devices/terminal-01/statistics', { token: 'other' })).status, 404);
});
test('atuador usa comando separado do estado reportado e exige booleano/dono', async t => {
  const { request, pair, commands, store } = await setup(t); await pair();
  assert.equal((await request('/devices/terminal-01/actuators/led', { method: 'PUT', token: 'other', body: { on: true } })).status, 404);
  assert.equal((await request('/devices/terminal-01/actuators/led', { method: 'PUT', body: { on: 'true' } })).status, 400);
  assert.equal((await request('/devices/terminal-01/actuators/led', { method: 'PUT', body: { on: true } })).status, 202);
  assert.deepEqual(commands, [true]); const d = await store.get('terminal-01'); assert.equal(d.latest, null); assert.equal(d.latestCommand.on, true);
});
test('validação bloqueia dados incoerentes e janelas/cursor inválidos', () => {
  for (const body of [null, { ...sample, analogRaw: 4096 }, { ...sample, source: 'fake' }, { ...sample, buttonPresses: -1 }, { ...sample, intervalSeconds: 0 }, { ...sample, sessionId: '../bad' }]) assert.throws(() => validateTelemetry(body), { status: 400 });
  for (const query of [{ limit: 1001 }, { from: 'invalid' }, { from:'2020-01-01',to:'2026-01-01' }, { before:'e30' }]) assert.throws(() => parseWindow(query), { status: 400 });
});
test('Blynk usa HTTPS e V2; não revela token em falhas', async () => {
  let sent; await updateBlynkLed(true, { BLYNK_AUTH_TOKEN:'secret' }, async url => { sent = url; return new Response(''); });
  assert.equal(sent.origin,'https://blynk.cloud'); assert.equal(sent.searchParams.get('V2'),'1');
  await assert.rejects(updateBlynkLed(false, {}), { status: 503 });
  await assert.rejects(updateBlynkLed(true, { BLYNK_AUTH_TOKEN:'secret' }, async () => { throw new Error('secret'); }), e => e.status === 502 && !e.message.includes('secret'));
});
