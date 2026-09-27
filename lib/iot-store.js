import { FieldPath } from 'firebase-admin/firestore';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

function duplicate(existing, reading) {
  const keys = ['sessionId', 'sequence', 'analogRaw', 'buttonPressed', 'buttonPresses', 'intervalSeconds', 'ledOn', 'source'];
  if (keys.some(key => existing[key] !== reading[key])) throw Object.assign(new Error('Esta sequência já foi recebida com outro conteúdo.'), { status: 409 });
  return false;
}

export function firestoreIotStore(db) {
  const device = id => db.collection('iotDevices').doc(id);
  return {
    async list(uid) { return (await db.collection('iotDevices').where('ownerUid', '==', uid).get()).docs.map(d => ({ id: d.id, ...d.data() })); },
    async get(id) { const d = await device(id).get(); return d.exists ? { id: d.id, ...d.data() } : null; },
    async claim(id, uid, name) {
      return db.runTransaction(async tx => {
        const ref = device(id); const doc = await tx.get(ref);
        if (doc.exists && doc.data().ownerUid !== uid) throw Object.assign(new Error('Este terminal já pertence a outra conta.'), { status: 409 });
        if (doc.exists) return { id, ...doc.data() };
        const item = { ownerUid: uid, name, createdAt: new Date().toISOString(), latest: null, latestCommand: null };
        tx.set(ref, item); return { id, ...item };
      });
    },
    async patch(id, value) { await device(id).update(value); },
    async ingest(id, reading) {
      return db.runTransaction(async tx => {
        const ref = device(id); const sample = ref.collection('telemetry').doc(reading.id);
        const [dev, existing] = await Promise.all([tx.get(ref), tx.get(sample)]);
        if (!dev.exists) throw Object.assign(new Error('Vincule o terminal a uma conta antes de enviar dados.'), { status: 409 });
        if (existing.exists) return duplicate(existing.data(), reading);
        tx.create(sample, reading);
        if (!dev.data().latest || dev.data().latest.receivedAt <= reading.receivedAt) tx.update(ref, { latest: reading });
        return true;
      });
    },
    async readings(id, { from, to, limit, before }) {
      let query = device(id).collection('telemetry').where('receivedAt', '>=', from).where('receivedAt', '<=', to).orderBy('receivedAt', 'desc').orderBy(FieldPath.documentId(), 'desc');
      if (before) query = query.startAfter(...before);
      return (await query.limit(limit + 1).get()).docs.map(d => d.data());
    },
    async command(id, command) { await device(id).update({ latestCommand: command }); },
  };
}

// Persistência local para desenvolvimento. Nunca selecionada em uma função Vercel.
export function fileIotStore(path = 'data/iot.json') {
  let queue = Promise.resolve();
  async function read() { try { return JSON.parse(await readFile(path, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return { devices: {}, telemetry: {} }; throw e; } }
  function change(fn) {
    const task = queue.then(async () => {
      const state = await read(); const result = fn(state);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(`${path}.tmp`, JSON.stringify(state)); await rename(`${path}.tmp`, path); return result;
    });
    queue = task.catch(() => {}); return task;
  }
  return {
    async list(uid) { await queue; return Object.values((await read()).devices).filter(d => d.ownerUid === uid); },
    async get(id) { await queue; return (await read()).devices[id] || null; },
    claim: (id, uid, name) => change(s => {
      if (s.devices[id] && s.devices[id].ownerUid !== uid) throw Object.assign(new Error('Este terminal já pertence a outra conta.'), { status: 409 });
      return s.devices[id] ||= { id, ownerUid: uid, name, createdAt: new Date().toISOString(), latest: null, latestCommand: null };
    }),
    patch: (id, value) => change(s => Object.assign(s.devices[id], value)),
    ingest: (id, reading) => change(s => {
      if (!s.devices[id]) throw Object.assign(new Error('Vincule o terminal antes de enviar dados.'), { status: 409 });
      const samples = s.telemetry[id] ||= {};
      if (samples[reading.id]) return duplicate(samples[reading.id], reading);
      samples[reading.id] = reading;
      if (!s.devices[id].latest || s.devices[id].latest.receivedAt <= reading.receivedAt) s.devices[id].latest = reading;
      return true;
    }),
    async readings(id, { from, to, limit, before }) {
      await queue;
      return Object.values((await read()).telemetry[id] || {}).filter(r => r.receivedAt >= from && r.receivedAt <= to && (!before || r.receivedAt < before[0] || (r.receivedAt === before[0] && r.id < before[1])))
        .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt) || b.id.localeCompare(a.id)).slice(0, limit + 1);
    },
    command: (id, command) => change(s => { s.devices[id].latestCommand = command; }),
  };
}
