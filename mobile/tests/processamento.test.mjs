import test from 'node:test';
import assert from 'node:assert/strict';
import { cotasCompraveis, diasParaMeta, lerReais, mediaMovel, resumoDepositos } from '../src/processamento.js';

test('lê valores em reais no formato da API', () => {
  assert.equal(lerReais('R$ 9,10'), 9.1);
  assert.equal(lerReais('R$ 1.234,56'), 1234.56);
  assert.equal(lerReais('-'), null);
  assert.equal(lerReais(12.5), 12.5);
});

test('calcula cotas compráveis sem erro de arredondamento', () => {
  assert.equal(cotasCompraveis(9100, 9.1), 10);
  assert.equal(cotasCompraveis(9099, 9.1), 9);
  assert.equal(cotasCompraveis(5000, 0), 0);
});

test('média móvel e dias para a meta', () => {
  assert.deepEqual(mediaMovel([1, 2, 3, 4], 2), [1, 1.5, 2.5, 3.5]);
  assert.equal(diasParaMeta(5000, 10000, 5), 10);
  assert.equal(diasParaMeta(12000, 10000, 5), 0);
  assert.equal(diasParaMeta(5000, 10000, 0), null);
  assert.equal(diasParaMeta(5000, null, 5), null);
});

test('resume os depósitos', () => {
  const r = resumoDepositos([
    { valorCentavos: 100, forma: 'moeda' },
    { valorCentavos: 500, forma: 'cedula' },
    { valorCentavos: 25, forma: 'moeda' },
  ]);
  assert.equal(r.quantidade, 3);
  assert.equal(r.totalReais, 6.25);
  assert.equal(r.maiorReais, 5);
  assert.deepEqual([r.moedas, r.cedulas], [2, 1]);
  assert.equal(resumoDepositos([]).quantidade, 0);
});
