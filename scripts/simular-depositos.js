import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const [dispositivoId, argumento = '60'] = process.argv.slice(2);
if (!/^[A-Za-z0-9]{10,40}$/.test(dispositivoId || '')) {
  console.error('Uso: node --env-file=.env scripts/simular-depositos.js <dispositivoId> [dias|--limpar]');
  process.exit(1);
}

initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}) });
const db = getFirestore();
const depositos = db.collection('dispositivos').doc(dispositivoId).collection('depositos');

if (argumento === '--limpar') {
  const simulados = await depositos.where('origem', '==', 'simulado').get();
  for (let i = 0; i < simulados.docs.length; i += 400) {
    const lote = db.batch();
    simulados.docs.slice(i, i + 400).forEach(doc => lote.delete(doc.ref));
    await lote.commit();
  }
  console.log(`${simulados.docs.length} depósitos simulados removidos.`);
  process.exit(0);
}

let semente = 20261001;
const aleatorio = () => {
  semente = (semente + 0x6d2b79f5) | 0;
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const sortear = opcoes => {
  let r = aleatorio() * opcoes.reduce((s, o) => s + o.peso, 0);
  return opcoes.find(o => (r -= o.peso) < 0) ?? opcoes.at(-1);
};

const MOEDAS = [
  { valor: 5, gramas: 4.10, peso: 2 }, { valor: 10, gramas: 4.80, peso: 3 }, { valor: 25, gramas: 7.55, peso: 3 },
  { valor: 50, gramas: 7.81, peso: 3 }, { valor: 100, gramas: 7.00, peso: 4 },
];
const CEDULAS = [{ valor: 200, peso: 4 }, { valor: 500, peso: 3 }, { valor: 1000, peso: 2 }, { valor: 2000, peso: 1 }];
const CHANCE_POR_DIA = [0.6, 0.3, 0.3, 0.35, 0.35, 0.55, 0.65];

const dias = Math.min(Math.max(parseInt(argumento, 10) || 60, 1), 365);
const hoje = new Date();
hoje.setUTCHours(15, 0, 0, 0);
let pesoTotal = 0;
const lote = [];
for (let d = dias; d >= 1; d--) {
  const dia = new Date(hoje.getTime() - d * 86400000);
  if (aleatorio() > CHANCE_POR_DIA[dia.getUTCDay()]) continue;
  const quantidade = 1 + Math.floor(aleatorio() * 3);
  for (let i = 0; i < quantidade; i++) {
    const cedula = aleatorio() < 0.15;
    const item = sortear(cedula ? CEDULAS : MOEDAS);
    pesoTotal += cedula ? 1 : item.gramas + (aleatorio() - 0.5) * 0.2;
    lote.push({
      id: `sim-${dia.toISOString().slice(0, 10)}-${i}`,
      dados: {
        valorCentavos: item.valor, forma: cedula ? 'cedula' : 'moeda', pesoGramas: Math.round(pesoTotal * 10) / 10,
        registradoEm: dia.getTime() - 3 * 3600000 + Math.floor(aleatorio() * 10 * 3600000) + i * 60000, origem: 'simulado',
      },
    });
  }
}
for (let i = 0; i < lote.length; i += 400) {
  const escrita = db.batch();
  lote.slice(i, i + 400).forEach(({ id, dados }) => escrita.set(depositos.doc(id), dados));
  await escrita.commit();
}
console.log(`${lote.length} depósitos simulados gravados em ${dias} dias (origem: "simulado").`);
