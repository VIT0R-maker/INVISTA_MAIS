import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Line, Polyline, Rect, Text as TextoSvg } from 'react-native-svg';
import { cores, estilos } from './UI';

const ALTURA = 180;
const MARGEM = { topo: 12, base: 24, esquerda: 40, direita: 8 };

function useLargura() {
  const [largura, setLargura] = useState(0);
  return [largura, evento => setLargura(evento.nativeEvent.layout.width)];
}

function Eixos({ largura, maximo, formatar }) {
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base;
  return [0, 0.5, 1].map(f => {
    const y = MARGEM.topo + alturaUtil * (1 - f);
    return (
      <Line key={f} x1={MARGEM.esquerda} x2={largura - MARGEM.direita} y1={y} y2={y} stroke={cores.borda} strokeWidth={1} />
    );
  }).concat([0, 0.5, 1].map(f => (
    <TextoSvg key={`t${f}`} x={MARGEM.esquerda - 4} y={MARGEM.topo + alturaUtil * (1 - f) + 4} fontSize={10} fill={cores.suave} textAnchor="end">
      {formatar(maximo * f)}
    </TextoSvg>
  )));
}

export function GraficoLinhas({ titulo, series, rotulos, formatar = v => v.toFixed(0) }) {
  const [largura, aoMedir] = useLargura();
  const todos = series.flatMap(s => s.valores);
  const maximo = Math.max(1, ...todos);
  const n = Math.max(...series.map(s => s.valores.length));
  const x = i => MARGEM.esquerda + (n <= 1 ? 0 : (i / (n - 1)) * (largura - MARGEM.esquerda - MARGEM.direita));
  const y = v => MARGEM.topo + (ALTURA - MARGEM.topo - MARGEM.base) * (1 - v / maximo);

  return (
    <View style={estilos.painel}>
      <Text style={estilos.subtitulo}>{titulo}</Text>
      <View onLayout={aoMedir}>
        {largura > 0 && (
          <Svg width={largura} height={ALTURA}>
            {Eixos({ largura, maximo, formatar })}
            {series.map(s => (
              <Polyline
                key={s.nome}
                points={s.valores.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
                fill="none"
                stroke={s.cor}
                strokeWidth={2.5}
              />
            ))}
            {rotulos && [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i).map(i => (
              <TextoSvg key={i} x={x(i)} y={ALTURA - 6} fontSize={10} fill={cores.suave} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
                {rotulos[i]}
              </TextoSvg>
            ))}
          </Svg>
        )}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {series.map(s => (
          <View key={s.nome} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: s.cor }} />
            <Text style={estilos.suave}>{s.nome}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function GraficoBarras({ titulo, itens, cor = cores.primaria, formatar = v => v.toFixed(0) }) {
  const [largura, aoMedir] = useLargura();
  const maximo = Math.max(1e-9, ...itens.map(i => i.valor));
  const larguraUtil = largura - MARGEM.esquerda - MARGEM.direita;
  const passo = itens.length ? larguraUtil / itens.length : 0;
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base;

  return (
    <View style={estilos.painel}>
      <Text style={estilos.subtitulo}>{titulo}</Text>
      <View onLayout={aoMedir}>
        {largura > 0 && (
          <Svg width={largura} height={ALTURA}>
            {Eixos({ largura, maximo, formatar })}
            {itens.map((item, i) => {
              const altura = (item.valor / maximo) * alturaUtil;
              return (
                <Rect
                  key={item.rotulo}
                  x={MARGEM.esquerda + i * passo + passo * 0.15}
                  y={MARGEM.topo + alturaUtil - altura}
                  width={passo * 0.7}
                  height={altura}
                  rx={3}
                  fill={cor}
                />
              );
            })}
            {itens.map((item, i) => (
              <TextoSvg key={`r${item.rotulo}`} x={MARGEM.esquerda + i * passo + passo / 2} y={ALTURA - 6} fontSize={10} fill={cores.suave} textAnchor="middle">
                {item.rotulo}
              </TextoSvg>
            ))}
          </Svg>
        )}
      </View>
    </View>
  );
}
