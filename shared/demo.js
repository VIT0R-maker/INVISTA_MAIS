// Série determinística e explicitamente demonstrativa. Nunca enviada ao banco de dados.
export function demoReadings(now = Date.now()) {
  return Array.from({ length: 60 }, (_, i) => {
    const riskLevel = Math.round(48 + 30 * Math.sin(i / 7) + 12 * Math.cos(i / 3));
    return { id: `demo-${i}`, receivedAt: new Date(now - (59 - i) * 10000).toISOString(), analogRaw: Math.round(riskLevel * 4095 / 100), riskLevel, buttonPressed: i % 4 === 0, buttonPresses: i % 4 === 0 ? 1 : i % 9 === 0 ? 2 : 0, intervalSeconds: 10, ledOn: i > 45, source: 'demo' };
  });
}
