const vazio = valor => valor === null || valor === undefined || Number.isNaN(valor);

export const reais = valor => (vazio(valor) ? 'n/d' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

export const centavos = valor => reais(vazio(valor) ? valor : valor / 100);

export const numero = (valor, casas = 2) =>
  vazio(valor) ? 'n/d' : valor.toLocaleString('pt-BR', { maximumFractionDigits: casas });

export const porcentagem = (valor, casas = 1) => (vazio(valor) ? 'n/d' : `${numero(valor * 100, casas)}%`);

export const dataHora = iso => (iso ? new Date(iso).toLocaleString('pt-BR') : 'n/d');

export const diaMes = dia => dia.split('-').reverse().slice(0, 2).join('/');

export const hojeIso = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

export const somarDias = (dia, dias) => {
  const data = new Date(`${dia}T12:00:00`);
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
};
