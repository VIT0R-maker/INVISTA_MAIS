import { getSelicAtual } from './bcb.js';
import { buscarAcao, buscarFii } from './scraper.js';
import { grahamNumero, grahamRevisado, grahamTupiniquim, precoTetoBazin } from './valuation.js';
import { classifyAcao, classifyFii } from './classify.js';
import { formatCurrency, formatPercent, formNum, margemSeguranca } from './format.js';

function cardValorJusto(cotacao, valorJusto) {
  if (valorJusto === null || valorJusto === undefined || isNaN(valorJusto)) {
    return { value: '-', class: 'neutral', margem: null };
  }
  const cls = cotacao && cotacao < valorJusto ? 'good' : 'bad';
  return {
    value: formatCurrency(valorJusto),
    class: cls,
    margem: margemSeguranca(cotacao, valorJusto),
  };
}

export function analisarAcao(ticker, perfil, dict, selicAtual) {
  const cotacao = dict['cotacao'];
  const pl = dict['pl'];
  const pvp = dict['pvp'];
  const dy = dict['dividendyield'] ?? dict['dy'];
  const payout = dict['payout'];
  const roe = dict['roe'];
  const roic = dict['roic'];
  const roa = dict['roa'];
  const margemBruta = dict['margembruta'];
  const margemEbitda = dict['margemebtida'] ?? dict['margemebitda'];
  const margemLiquida = dict['margemliquida'];
  const divLiqPatrimonio = dict['dividaliquidapatrimonio'];
  const divLiqEbitda = dict['dividaliquidaebitda'];
  const liquidezCorrente = dict['liquidezcorrente'];
  const lpa = dict['lpa'];
  const vpa = dict['vpa'];
  const cagr5a = dict['cagrlucros5anos'];
  const giroAtivos = dict['giroativos'];

  const valorGrahamPadrao = grahamNumero(lpa, vpa);
  const valorGrahamRev = grahamRevisado(lpa, cagr5a, selicAtual);
  const valorGrahamTupiniquim = grahamTupiniquim(lpa, cagr5a, selicAtual);
  const precoTeto6 = precoTetoBazin(dy, cotacao, 0.06);
  const precoTeto8 = precoTetoBazin(dy, cotacao, 0.08);

  return {
    ticker: ticker.toUpperCase(),
    perfil,
    selicUtilizada: selicAtual,
    cotacao: { value: formatCurrency(cotacao), class: 'neutral' },
    valorGrahamPadrao: cardValorJusto(cotacao, valorGrahamPadrao),
    valorGrahamRev: cardValorJusto(cotacao, valorGrahamRev),
    valorGrahamTupiniquim: cardValorJusto(cotacao, valorGrahamTupiniquim),
    precoTeto6: cardValorJusto(cotacao, precoTeto6),
    precoTeto8: cardValorJusto(cotacao, precoTeto8),
    pl: { value: formNum(pl), class: classifyAcao(perfil, 'pl', pl) },
    pvp: { value: formNum(pvp), class: classifyAcao(perfil, 'pvp', pvp) },
    dy: { value: formatPercent(dy), class: classifyAcao(perfil, 'dy', dy) },
    payout: { value: formatPercent(payout), class: 'neutral' },
    roe: { value: formatPercent(roe), class: classifyAcao(perfil, 'roe', roe) },
    roic: { value: formatPercent(roic), class: 'neutral' },
    roa: { value: formatPercent(roa), class: 'neutral' },
    margemBruta: { value: formatPercent(margemBruta), class: 'neutral' },
    margemEbitda: { value: formatPercent(margemEbitda), class: 'neutral' },
    margemLiquida: { value: formatPercent(margemLiquida), class: classifyAcao(perfil, 'margemLiquida', margemLiquida) },
    divLiqPatrimonio: { value: formNum(divLiqPatrimonio), class: classifyAcao(perfil, 'divLiqPatrimonio', divLiqPatrimonio) },
    divLiqEbitda: { value: formNum(divLiqEbitda), class: 'neutral' },
    liquidezCorrente: { value: formNum(liquidezCorrente), class: classifyAcao(perfil, 'liquidezCorrente', liquidezCorrente) },
    lpa: { value: formNum(lpa), class: 'neutral' },
    vpa: { value: formNum(vpa), class: 'neutral' },
    cagr5a: { value: formatPercent(cagr5a), class: 'neutral' },
    giroAtivos: { value: formNum(giroAtivos), class: 'neutral' },
  };
}

export function analisarFii(ticker, perfil, dictNum, dictRaw) {
  const cotacao = dictNum['cotacao'];
  const ultimoRendimento = dictNum['ultimorendimento'];
  const dyMath = dictNum['dividendyield'] ?? dictNum['dy12m'] ?? dictNum['dy'];
  const pvpMath = dictNum['pvp'];
  const vacanciaMath = dictNum['vacancia'];
  const liquidezDiariaMath = dictNum['liquidezdiaria'];
  const valorPatrimonialMath = dictNum['valorpatrimonial'];
  const numeroCotistasMath = dictNum['numerodecotistas'];

  let ebn = '-';
  let ebnNum = null;
  let vn = '-';
  if (cotacao > 0 && ultimoRendimento > 0) {
    ebnNum = Math.ceil(cotacao / ultimoRendimento);
    ebn = String(ebnNum);
    vn = formatCurrency(ebnNum * cotacao);
  }

  return {
    ticker: ticker.toUpperCase(),
    perfil,
    cotacao: { value: dictRaw['cotacao'] || formatCurrency(cotacao), class: 'neutral' },
    ebn: { value: ebn, class: 'neutral' },
    vn: { value: vn, class: 'neutral' },
    ultimoRendimento: { value: dictRaw['ultimorendimento'] || '-', class: 'neutral' },
    variacao12m: { value: dictRaw['variacao12m'] || '-', class: 'neutral' },
    vpa: { value: dictRaw['valpatrimonialpcota'] || dictRaw['valorpatrimonialpcota'] || '-', class: 'neutral' },
    segmento: { value: dictRaw['segmento'] || '-', class: 'neutral' },
    mandato: { value: dictRaw['mandato'] || '-', class: 'neutral' },
    tipoFundo: { value: dictRaw['tipodefundo'] || '-', class: 'neutral' },
    tipoGestao: { value: dictRaw['tipodegestao'] || '-', class: 'neutral' },
    taxaAdministracao: { value: dictRaw['taxadeadministracao'] || '-', class: 'neutral' },
    pvp: { value: dictRaw['pvp'] || formNum(pvpMath), class: classifyFii(perfil, 'pvp', pvpMath) },
    dy: { value: dictRaw['dividendyield'] || dictRaw['dy12m'] || formatPercent(dyMath), class: classifyFii(perfil, 'dy', dyMath) },
    liquidezDiaria: { value: dictRaw['liquidezdiaria'] || '-', class: classifyFii(perfil, 'liquidezDiaria', liquidezDiariaMath) },
    valorPatrimonial: { value: dictRaw['valorpatrimonial'] || '-', class: classifyFii(perfil, 'valorPatrimonial', valorPatrimonialMath) },
    vacancia: { value: dictRaw['vacancia'] || '-', class: classifyFii(perfil, 'vacancia', vacanciaMath) },
    numeroCotistas: { value: dictRaw['numerodecotistas'] || '-', class: classifyFii(perfil, 'numeroCotistas', numeroCotistasMath) },
  };
}

export function validarAtivo(body) {
  const ticker = typeof body?.ticker === 'string' ? body.ticker.trim().toUpperCase() : '';
  const perfil = body?.perfil ?? 'moderado';
  if (!/^[A-Z]{4}[0-9]{1,2}$/.test(ticker) || !['conservador', 'moderado', 'arrojado'].includes(perfil)) {
    throw Object.assign(new Error('Informe um ticker válido (ex.: PETR4, MXRF11) e um perfil válido.'), { status: 400 });
  }
  return { ticker, perfil };
}

export async function analisarAtivo({ ticker, perfil = 'moderado', tipo }) {
  if (tipo === 'acoes') {
    const [dict, selic] = await Promise.all([buscarAcao(ticker), getSelicAtual()]);
    return analisarAcao(ticker, perfil, dict, selic);
  }
  const { dictNum, dictRaw } = await buscarFii(ticker);
  return analisarFii(ticker, perfil, dictNum, dictRaw);
}
