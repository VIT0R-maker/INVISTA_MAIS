// Estatística descritiva: desvio amostral, assimetria de Fisher corrigida e excesso de curtose corrigido.
export function describe(values) {
  const x = values.filter(Number.isFinite).sort((a, b) => a - b);
  const n = x.length;
  if (!n) return { n: 0, mean: null, median: null, modes: [], standardDeviation: null, skewness: null, excessKurtosis: null, min: null, max: null };
  const mean = x.reduce((a, b) => a + b, 0) / n;
  const centered = x.map(v => v - mean);
  const sum2 = centered.reduce((s, v) => s + v ** 2, 0);
  const s = n > 1 ? Math.sqrt(sum2 / (n - 1)) : null;
  const counts = new Map();
  x.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
  const maxCount = Math.max(...counts.values());
  const modes = maxCount > 1 ? [...counts].filter(([, c]) => c === maxCount).map(([v]) => v) : [];
  return {
    n, mean, median: n % 2 ? x[(n - 1) / 2] : (x[n / 2 - 1] + x[n / 2]) / 2,
    modes, standardDeviation: s, min: x[0], max: x[n - 1],
    skewness: n > 2 && s > 0 ? n * centered.reduce((a, v) => a + (v / s) ** 3, 0) / ((n - 1) * (n - 2)) : null,
    excessKurtosis: n > 3 && s > 0
      ? n * (n + 1) * centered.reduce((a, v) => a + (v / s) ** 4, 0) / ((n - 1) * (n - 2) * (n - 3)) - 3 * (n - 1) ** 2 / ((n - 2) * (n - 3)) : null,
  };
}

export function regression(pairs) {
  const n = pairs.length;
  if (n < 3) return null;
  const mx = pairs.reduce((s, p) => s + p.x, 0) / n;
  const my = pairs.reduce((s, p) => s + p.y, 0) / n;
  const xx = pairs.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  const yy = pairs.reduce((s, p) => s + (p.y - my) ** 2, 0);
  if (xx === 0 || yy === 0) return null;
  const xy = pairs.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  const slope = xy / xx;
  return { n, slope, intercept: my - slope * mx, r: xy / Math.sqrt(xx * yy), rSquared: Math.min(1, xy ** 2 / (xx * yy)) };
}

export function wilson(successes, n) {
  if (!n) return null;
  const z = 1.959963984540054;
  const p = successes / n;
  const denominator = 1 + z ** 2 / n;
  const center = (p + z ** 2 / (2 * n)) / denominator;
  const margin = z * Math.sqrt(p * (1 - p) / n + z ** 2 / (4 * n ** 2)) / denominator;
  return { confidence: 0.95, lower: Math.max(0, center - margin), upper: Math.min(1, center + margin), method: 'Wilson' };
}

export const profileForRisk = value => value < 34 ? 'conservador' : value < 67 ? 'moderado' : 'arrojado';

export function analyzeTelemetry(rows) {
  const risk = describe(rows.map(row => row.riskLevel));
  const rates = rows.map(row => row.buttonPresses * 60 / row.intervalSeconds);
  const presses = describe(rows.map(row => row.buttonPresses));
  const highRisk = rows.filter(row => row.riskLevel >= 67).length;
  const withPresses = rows.filter(row => row.buttonPresses > 0).length;
  const histogram = ['conservador', 'moderado', 'arrojado'].map(profile => ({ profile, count: rows.filter(row => profileForRisk(row.riskLevel) === profile).length }));
  return {
    sampleCount: rows.length, risk, presses, rate: describe(rates), histogram,
    totalPresses: rows.reduce((s, row) => s + row.buttonPresses, 0),
    probability: { highRisk: rows.length ? highRisk / rows.length : null, withPresses: rows.length ? withPresses / rows.length : null, highRiskCI95: wilson(highRisk, rows.length) },
    regression: regression(rows.map((row, i) => ({ x: row.riskLevel, y: rates[i] }))),
    inferenceNote: 'Probabilidades empíricas por amostra. IC de Wilson de 95% assume amostras independentes; a autocorrelação e a seleção do período limitam a inferência. Regressão exploratória, sem causalidade ou previsão financeira.',
  };
}
