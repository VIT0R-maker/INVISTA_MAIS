import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analisarDepositos, assimetria, curtose, diaLocal, intervaloConfiancaMedia, modas, normalCdf,
  quantil, regressaoLinear, resumoDescritivo, tCdf, tQuantil, testeTWelch,
} from '../lib/estatistica.js';

const valores = [0.05, 0.10, 0.25, 0.25, 0.50, 1.00, 1.00, 1.00, 2.00, 5.00, 0.25, 0.10, 1.00, 0.50, 10.00];
const perto = (atual, esperado, tolerancia = 1e-4) =>
  assert.ok(Math.abs(atual - esperado) < tolerancia, `${atual} ≠ ${esperado}`);

test('medidas de posição e dispersão batem com o Python', () => {
  const r = resumoDescritivo(valores);
  perto(r.media, 1.5333333);
  assert.equal(r.mediana, 0.5);
  assert.deepEqual(r.modas, [1]);
  perto(r.desvioPadraoPopulacional, 2.5618136);
  perto(r.desvioPadraoAmostral, 2.6517290);
  assert.deepEqual([r.quartis.q1, r.quartis.q3], [0.25, 1]);
  perto(quantil(valores, 0.1), 0.1);
  perto(quantil(valores, 0.9), 3.8);
  perto(r.coeficienteVariacao, 167.0748, 1e-3);
  assert.deepEqual(modas([1, 2, 2, 3, 3]), [2, 3]);
});

test('assimetria e curtose (Pearson, Fisher, Bowley, percentílica e momentos)', () => {
  const a = assimetria(valores);
  perto(a.fisher, 2.4996052);
  perto(a.pearson2, 3 * (1.5333333 - 0.5) / 2.5618136);
  perto(a.pearson1, (1.5333333 - 1) / 2.5618136);
  perto(a.bowley, (1 + 0.25 - 2 * 0.5) / (1 - 0.25));
  assert.equal(a.classificacao, 'assimetria forte positiva (à direita)');
  const k = curtose(valores);
  perto(k.excesso, 5.2144908);
  perto(k.percentilica, 0.75 / (2 * 3.7));
  assert.equal(k.classificacao, 'leptocúrtica');
  assert.equal(assimetria([1, 2]).classificacao, 'não aplicável');
});

test('distribuições normal e t de Student', () => {
  perto(normalCdf(1.96), 0.9750021, 1e-6);
  perto(normalCdf(-0.5), 0.3085375, 1e-6);
  perto(tCdf(1.3, 7), 0.8826161, 1e-6);
  perto(tQuantil(0.975, 10), 2.2281389, 1e-5);
  perto(tQuantil(0.975, 29), 2.0452296, 1e-5);
  perto(tQuantil(0.975, 1), 12.7062047, 1e-4);
  perto(tQuantil(0.975, 2.5), 3.5746548, 1e-4);
});

test('inferência: intervalo de confiança e teste t de Welch', () => {
  const ic = intervaloConfiancaMedia(valores);
  perto(ic.inferior, 0.0648548);
  perto(ic.superior, 3.0018119);
  const w = testeTWelch([1.0, 2.0, 0.5, 5.0, 1.0, 2.0], [0.25, 0.5, 0.1, 1.0, 0.25, 0.5, 0.05]);
  perto(w.t, 2.2792730);
  perto(w.grausLiberdade, 5.3436552);
  perto(w.p, 0.0682181, 1e-5);
  assert.equal(w.rejeitaH0, false);
  assert.equal(intervaloConfiancaMedia([1]), null);
});

test('regressão linear', () => {
  const r = regressaoLinear([10, 20, 30, 40, 50], [1.1, 2.3, 2.9, 4.2, 5.1]);
  perto(r.a, 0.15);
  perto(r.b, 0.099);
  perto(r.r, 0.9955910);
  perto(r.r2, 0.9912015);
  assert.equal(regressaoLinear([1, 1, 1], [1, 2, 3]), null);
});

test('dias e semana usam o fuso de Brasília', () => {
  assert.deepEqual(diaLocal(Date.UTC(2026, 8, 27, 1)), { chave: '2026-09-26', diaSemana: 6 });
});

test('análise dos depósitos monta série, probabilidades, regressões e previsão da meta', () => {
  const inicio = Date.UTC(2026, 8, 1, 15);
  const depositos = Array.from({ length: 20 }, (_, i) => ({
    valorCentavos: [100, 50, 25, 100, 500][i % 5],
    forma: i % 5 === 4 ? 'cedula' : 'moeda',
    pesoGramas: 7 * (i + 1),
    registradoEm: inicio + i * 86400000,
    origem: i < 10 ? 'simulado' : 'sensor',
  }));
  const agora = inicio + 20 * 86400000;
  const r = analisarDepositos(depositos, {
    deMs: inicio - 12 * 3600000, ateMs: agora, agoraMs: agora,
    saldoCentavos: 3100, metaCentavos: 10000, dataMetaMs: agora + 60 * 86400000,
  });
  assert.equal(r.n, 20);
  assert.deepEqual(r.origem, { sensor: 10, simulado: 10 });
  assert.equal(r.descritiva.media, 1.55);
  assert.equal(r.serieDiaria.at(-1).saldoAcumuladoReais, 31);
  assert.equal(r.probabilidade.depositoPorDiaSemana.find(d => d.dia === 'ter').probabilidade, 1);
  assert.ok(r.regressao.tendencia.b > 1 && r.regressao.tendencia.r2 > 0.9);
  assert.ok(r.regressao.calibracao.r2 > 0.9);
  assert.ok(new Date(r.regressao.previsaoMeta) > new Date(agora));
  assert.ok(r.probabilidade.meta.probabilidade > 0.5);
  assert.equal(r.probabilidade.meta.faltaReais, 69);
  assert.match(r.inferencia.fimDeSemanaVsDiasUteis.conclusao, /evidência|diferença/);
  const vazio = analisarDepositos([], { deMs: inicio, ateMs: agora });
  assert.equal(vazio.n, 0);
  assert.equal(vazio.regressao.tendencia, null);
});
