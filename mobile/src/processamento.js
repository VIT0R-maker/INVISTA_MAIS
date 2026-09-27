export function lerReais(texto) {
  if (typeof texto === 'number') return texto;
  const limpo = String(texto ?? '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const valor = Number.parseFloat(limpo);
  return Number.isFinite(valor) ? valor : null;
}

export function cotasCompraveis(saldoCentavos, cotacaoReais) {
  if (!(cotacaoReais > 0)) return 0;
  return Math.floor(saldoCentavos / Math.round(cotacaoReais * 100));
}

export function mediaMovel(valores, janela = 7) {
  return valores.map((_, i) => {
    const trecho = valores.slice(Math.max(0, i - janela + 1), i + 1);
    return trecho.reduce((soma, x) => soma + x, 0) / trecho.length;
  });
}

export function diasParaMeta(saldoCentavos, metaCentavos, mediaDiariaReais) {
  if (!metaCentavos) return null;
  const falta = (metaCentavos - saldoCentavos) / 100;
  if (falta <= 0) return 0;
  if (!(mediaDiariaReais > 0)) return null;
  return Math.ceil(falta / mediaDiariaReais);
}

export function resumoDepositos(depositos) {
  if (!depositos.length) return { quantidade: 0, totalReais: 0, mediaReais: 0, maiorReais: 0, moedas: 0, cedulas: 0 };
  const valores = depositos.map(d => d.valorCentavos / 100);
  const total = valores.reduce((soma, x) => soma + x, 0);
  return {
    quantidade: depositos.length,
    totalReais: total,
    mediaReais: total / depositos.length,
    maiorReais: Math.max(...valores),
    moedas: depositos.filter(d => d.forma === 'moeda').length,
    cedulas: depositos.filter(d => d.forma === 'cedula').length,
  };
}

export const reais = valor =>
  valor === null || valor === undefined || Number.isNaN(valor)
    ? 'n/d'
    : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const centavos = valor => reais(valor === null || valor === undefined ? valor : valor / 100);

export const numero = (valor, casas = 2) =>
  valor === null || valor === undefined || Number.isNaN(valor) ? 'n/d' : valor.toLocaleString('pt-BR', { maximumFractionDigits: casas });
