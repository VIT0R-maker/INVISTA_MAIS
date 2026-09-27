export const number = (n, digits = 2) => n == null || !Number.isFinite(n) ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: digits });
export function Timeline({ rows }) {
  if (!rows.length) return <div className="chart-empty">As primeiras leituras formarão este gráfico.</div>;
  const values = [...rows].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  const x = i => 40 + i * 610 / Math.max(1, values.length - 1), y = v => 175 - v * 1.5;
  return <><svg viewBox="0 0 680 210" role="img" aria-label="Evolução do nível de risco de 0 a 100 e acionamentos do botão por amostra">
    {[0, 25, 50, 75, 100].map(n => <g key={n}><line x1="40" y1={y(n)} x2="650" y2={y(n)} stroke="#e4eae7"/><text x="30" y={y(n) + 4} textAnchor="end">{n}</text></g>)}
    {values.map((v, i) => v.buttonPresses > 0 && <line key={v.id} x1={x(i)} x2={x(i)} y1="175" y2={175 - Math.min(v.buttonPresses, 10) * 10} stroke="#ebae50" strokeWidth="4"><title>{v.buttonPresses} acionamentos</title></line>)}
    <polyline points={values.map((v, i) => `${x(i)},${y(v.riskLevel)}`).join(' ')} fill="none" stroke="#198475" strokeWidth="2.7"/>
    <text x="40" y="201">{new Date(values[0].receivedAt).toLocaleTimeString('pt-BR')}</text><text x="650" y="201" textAnchor="end">{new Date(values.at(-1).receivedAt).toLocaleTimeString('pt-BR')}</text>
  </svg><p className="chart-legend"><span>● Nível de risco (0–100)</span><span>▮ Botão (10 px/acionamento, até 10)</span></p></>;
}
export function Scatter({ rows, regression }) {
  if (!rows.length) return <div className="chart-empty">Aguardando amostras.</div>;
  const rates = rows.map(r => r.buttonPresses * 60 / r.intervalSeconds), max = Math.max(1, ...rates);
  const x = v => 45 + v * 5.9, y = v => 170 - v / max * 145;
  return <svg viewBox="0 0 680 210" role="img" aria-label="Dispersão e regressão: nível de risco no eixo horizontal e acionamentos por minuto no vertical">
    {[0, .5, 1].map(n => <g key={n}><line x1="45" y1={y(n * max)} x2="635" y2={y(n * max)} stroke="#e4eae7"/><text x="36" y={y(n * max) + 4} textAnchor="end">{number(n * max, 1)}</text></g>)}
    <defs><clipPath id="plot"><rect x="45" y="20" width="590" height="150"/></clipPath></defs>
    <g clipPath="url(#plot)">{rows.map((r, i) => <circle key={r.id} cx={x(r.riskLevel)} cy={y(rates[i])} r="3" fill="#198475" opacity=".45"/>)}{regression && <line x1={x(0)} y1={y(regression.intercept)} x2={x(100)} y2={y(regression.intercept + 100 * regression.slope)} stroke="#c17628" strokeWidth="2"/>}</g>
    {[0, 25, 50, 75, 100].map(n => <text key={n} x={x(n)} y="190" textAnchor="middle">{n}</text>)}<text x="340" y="207" textAnchor="middle">Nível de risco → · eixo vertical: acionamentos/min</text>
  </svg>;
}
