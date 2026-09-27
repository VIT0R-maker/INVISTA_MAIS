import test from 'node:test';
import assert from 'node:assert/strict';
import { describe, regression, wilson, analyzeTelemetry, profileForRisk } from '../shared/statistics.js';
const close = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≠ ${b}`);
test('estatísticas amostrais conhecidas, incluindo assimetria e excesso de curtose', () => {
  const s = describe([1, 2, 3, 4, 5]);
  close(s.mean, 3); close(s.median, 3); close(s.standardDeviation, Math.sqrt(2.5)); close(s.skewness, 0); close(s.excessKurtosis, -1.2); assert.deepEqual(s.modes, []);
  assert.deepEqual(describe([1, 1, 3, 3, 8]).modes, [1, 3]);
  assert.equal(describe([2, 9]).median, 5.5);
});
test('amostra vazia, singular, constante e números inválidos não produzem NaN', () => {
  assert.equal(describe([]).mean, null); assert.equal(describe([5]).standardDeviation, null);
  const constant = describe([5, 5, 5, 5]); assert.equal(constant.standardDeviation, 0); assert.equal(constant.skewness, null); assert.equal(constant.excessKurtosis, null);
  assert.equal(describe([1, NaN, Infinity, 2]).n, 2);
});
test('regressão recupera y = 2x + 1 e trata degeneração', () => {
  const fit = regression([1, 2, 3, 4].map(x => ({ x, y: 2 * x + 1 })));
  close(fit.slope, 2); close(fit.intercept, 1); close(fit.rSquared, 1); close(fit.r, 1);
  assert.equal(regression([{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }]), null);
  assert.equal(regression([{ x: 1, y: 1 }]), null);
});
test('Wilson e probabilidade são frequências amostrais, taxa normaliza intervalo', () => {
  const ci = wilson(5, 10); close(ci.lower, 0.236593090512564, 1e-9); close(ci.upper, 0.763406909487436, 1e-9);
  assert.equal(wilson(0, 0), null); close(wilson(0, 10).lower, 0);
  const stats = analyzeTelemetry([{ riskLevel: 10, buttonPresses: 1, intervalSeconds: 10 }, { riskLevel: 80, buttonPresses: 0, intervalSeconds: 20 }]);
  close(stats.rate.mean, 3); close(stats.probability.highRisk, .5); close(stats.probability.withPresses, .5); assert.equal(stats.totalPresses, 1);
  assert.deepEqual([33, 34, 66, 67].map(profileForRisk), ['conservador', 'moderado', 'moderado', 'arrojado']);
});
