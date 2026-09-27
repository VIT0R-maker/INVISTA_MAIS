import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
const base = process.env.IOT_API_URL || 'http://localhost:3000';
const id = process.env.IOT_DEVICE_ID || 'terminal-01';
if (!process.env.IOT_DEVICE_TOKEN) throw new Error('Configure IOT_DEVICE_TOKEN. Vincule primeiro o terminal pela Web/app.');
const sessionId = randomUUID();
const count = Number(process.env.SIMULATOR_SAMPLES || 30);
if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error('SIMULATOR_SAMPLES deve estar entre 1 e 1000.');
for (let sequence = 0; sequence < count; sequence++) {
  const body = { sessionId, sequence, analogRaw: Math.round(2047 + 1900 * Math.sin(sequence / 4)), buttonPressed: false, buttonPresses: sequence % 3 === 0 ? 2 : 0, intervalSeconds: 10, ledOn: false, source: 'simulator' };
  const res = await fetch(`${base}/api/v1/devices/${id}/telemetry`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Device-Token': process.env.IOT_DEVICE_TOKEN }, body: JSON.stringify(body) });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Falha no envio.');
  console.log(`Amostra ${sequence + 1}/${count}: risco ${result.riskLevel} (${result.profile})`);
  if (sequence + 1 < count) await setTimeout(10000);
}
