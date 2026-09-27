import React from 'react';
import { Text } from 'react-native';
import Svg, { Polyline, Line, Text as Label, Circle } from 'react-native-svg';
export function Chart({ rows, scatter = false, regression }) {
  if (!rows.length) return <Text>Aguardando leituras para formar o gráfico.</Text>;
  const values = [...rows].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  const rates = values.map(r => r.buttonPresses * 60 / r.intervalSeconds), max = Math.max(1, ...rates);
  const x = (r, i) => 30 + (scatter ? r.riskLevel / 100 : i / Math.max(1, values.length - 1)) * 295;
  const y = v => 145 - v * 1.2;
  return <Svg width="100%" height={180} viewBox="0 0 350 180" accessibilityLabel={scatter ? 'Risco e acionamentos por minuto' : 'Evolução temporal do nível de risco'}>
    {[0, 50, 100].map(n => <React.Fragment key={n}><Line x1={30} y1={y(n)} x2={325} y2={y(n)} stroke="#dfe7df"/><Label x={24} y={y(n) + 4} textAnchor="end" fontSize={9} fill="#6d8275">{scatter ? (n * max / 100).toFixed(1) : n}</Label></React.Fragment>)}
    {scatter ? values.map((r, i) => <Circle key={r.id} cx={x(r, i)} cy={y(rates[i] * 100 / max)} r={3} fill="#238477" opacity={.5}/>) : <Polyline points={values.map((r, i) => `${x(r, i)},${y(r.riskLevel)}`).join(' ')} fill="none" stroke="#238477" strokeWidth={2.5}/>}
    {scatter && regression && (() => { const a = regression.intercept, b = a + regression.slope * 100; return a >= 0 && b >= 0 && a <= max && b <= max ? <Line x1={30} y1={y(a * 100 / max)} x2={325} y2={y(b * 100 / max)} stroke="#b38139" strokeWidth={2}/> : null; })()}
    <Label x={30} y={165} fontSize={9} fill="#6d8275">{scatter ? '0' : new Date(values[0].receivedAt).toLocaleTimeString('pt-BR')}</Label><Label x={325} y={165} textAnchor="end" fontSize={9} fill="#6d8275">{scatter ? '100 · nível de risco' : new Date(values.at(-1).receivedAt).toLocaleTimeString('pt-BR')}</Label>
  </Svg>;
}
