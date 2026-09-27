import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Cartao, Erro } from '../componentes/Estado';
import { numero } from '../formatos';

const SECOES = {
  acoes: [
    ['Valuation (preço justo)', [
      ['cotacao', 'Cotação atual'], ['valorGrahamPadrao', 'Graham padrão'], ['valorGrahamRev', 'Graham revisado'],
      ['valorGrahamTupiniquim', 'Graham Tupiniquim'], ['precoTeto6', 'Preço teto Bazin 6%'], ['precoTeto8', 'Preço teto Bazin 8%'],
    ]],
    ['Múltiplos e dividendos', [['pl', 'P/L'], ['pvp', 'P/VP'], ['dy', 'DY 12 meses'], ['payout', 'Payout']]],
    ['Rentabilidade', [
      ['roe', 'ROE'], ['roic', 'ROIC'], ['roa', 'ROA'], ['margemBruta', 'Margem bruta'],
      ['margemEbitda', 'Margem EBITDA'], ['margemLiquida', 'Margem líquida'],
    ]],
    ['Endividamento e liquidez', [['divLiqPatrimonio', 'Dív. líq./Patrimônio'], ['divLiqEbitda', 'Dív. líq./EBITDA'], ['liquidezCorrente', 'Liquidez corrente']]],
    ['Outros', [['lpa', 'LPA'], ['vpa', 'VPA'], ['cagr5a', 'CAGR lucros 5 anos'], ['giroAtivos', 'Giro dos ativos']]],
  ],
  fiis: [
    ['Efeito bola de neve', [['ebn', 'Cotas para a bola de neve'], ['vn', 'Valor necessário'], ['ultimoRendimento', 'Último rendimento']]],
    ['Indicadores do fundo', [
      ['cotacao', 'Cotação atual'], ['pvp', 'P/VP'], ['dy', 'DY 12 meses'], ['liquidezDiaria', 'Liquidez diária'],
      ['variacao12m', 'Variação 12 meses'], ['vpa', 'Valor patrimonial por cota'], ['valorPatrimonial', 'Valor patrimonial'],
      ['vacancia', 'Vacância'], ['numeroCotistas', 'Nº de cotistas'],
    ]],
    ['Perfil do fundo', [
      ['segmento', 'Segmento'], ['mandato', 'Mandato'], ['tipoFundo', 'Tipo de fundo'],
      ['tipoGestao', 'Tipo de gestão'], ['taxaAdministracao', 'Taxa de administração'],
    ]],
  ],
};

const CLASSE = { good: 'bom', bad: 'ruim' };

function detalheMargem(margem) {
  if (margem === null || margem === undefined) return undefined;
  return `${numero(Math.abs(margem), 1)}% ${margem >= 0 ? 'abaixo' : 'acima'} do justo`;
}

function Mentor({ ativo }) {
  const [historico, setHistorico] = useState([]);
  const [mensagens, setMensagens] = useState([]);
  const [pergunta, setPergunta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function perguntar(modo, texto = '') {
    setEnviando(true);
    setErro('');
    try {
      const { texto: resposta } = await api('/api/mentor', {
        metodo: 'POST',
        corpo: { modo, pergunta: texto, perfil: ativo.perfil, ticker: ativo.ticker, tipo: ativo.tipo, snapshot: ativo.snapshot, historico: modo === 'pergunta' ? historico.slice(-8) : [] },
      });
      const deUsuario = modo === 'pergunta' ? texto : `Resumo de ${ativo.ticker}`;
      setMensagens(atual => [...atual, { autor: 'Você', texto: deUsuario }, { autor: 'Mentor IA', texto: resposta }]);
      setHistorico(modo === 'pergunta'
        ? [...historico, { role: 'user', text: texto }, { role: 'model', text: resposta }].slice(-8)
        : [{ role: 'user', text: `Resuma os indicadores de ${ativo.ticker}.` }, { role: 'model', text: resposta }]);
      setPergunta('');
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="painel mentor">
      <div className="linha-titulo">
        <h2>Mentor IA</h2>
        <button className="botao secundario" disabled={enviando} onClick={() => perguntar('resumo')}>Resumir {ativo.ticker}</button>
      </div>
      <div className="mensagens">
        {mensagens.map((m, i) => (
          <div key={i} className={`mensagem ${m.autor === 'Você' ? 'minha' : ''}`}>
            <strong>{m.autor}</strong>
            <p>{m.texto}</p>
          </div>
        ))}
      </div>
      <form className="linha-form" onSubmit={e => { e.preventDefault(); if (pergunta.trim()) perguntar('pergunta', pergunta.trim()); }}>
        <input maxLength={1500} value={pergunta} onChange={e => setPergunta(e.target.value)} placeholder="Pergunte sobre os indicadores" />
        <button className="botao" disabled={enviando || !pergunta.trim()}>{enviando ? 'Pensando...' : 'Enviar'}</button>
      </form>
      <Erro mensagem={erro} />
      <small className="dica">Resposta gerada por IA com os dados desta busca. Confira antes de decidir.</small>
    </div>
  );
}

export default function Scanner() {
  const [parametros, setParametros] = useSearchParams();
  const [tipo, setTipo] = useState(parametros.get('tipo') === 'fiis' ? 'fiis' : 'acoes');
  const [ticker, setTicker] = useState(parametros.get('ticker') || '');
  const [perfil, setPerfil] = useState('moderado');
  const [resultado, setResultado] = useState(null);
  const [favoritos, setFavoritos] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api('/api/usuarios/me/favoritos').then(r => setFavoritos(r.favoritos)).catch(() => {});
  }, []);

  const buscar = useCallback(async (tipoBusca, tickerBusca, perfilBusca) => {
    const codigo = tickerBusca.trim().toUpperCase();
    if (!/^[A-Z]{4}[0-9]{1,2}$/.test(codigo)) {
      setErro('Informe um ticker válido, como PETR4 ou MXRF11.');
      return;
    }
    setErro('');
    setBuscando(true);
    setResultado(null);
    try {
      const dados = await api(`/api/ativos/${tipoBusca}/${codigo}?perfil=${perfilBusca}`, { autenticado: false });
      setResultado({ tipo: tipoBusca, perfil: perfilBusca, dados });
      setParametros({ tipo: tipoBusca, ticker: codigo }, { replace: true });
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setBuscando(false);
    }
  }, [setParametros]);

  const [inicio] = useState(() => ({ ticker: parametros.get('ticker'), tipo: parametros.get('tipo') === 'fiis' ? 'fiis' : 'acoes' }));

  useEffect(() => {
    if (inicio.ticker) buscar(inicio.tipo, inicio.ticker, 'moderado');
  }, [inicio, buscar]);

  async function alternarFavorito(codigo) {
    const metodo = favoritos.includes(codigo) ? 'DELETE' : 'PUT';
    try {
      const r = await api(`/api/usuarios/me/favoritos/${codigo}`, { metodo });
      setFavoritos(r.favoritos);
    } catch (falha) {
      setErro(falha.message);
    }
  }

  const dados = resultado?.dados;

  return (
    <section>
      <h1>Scanner de ativos</h1>
      <form className="painel filtros" onSubmit={e => { e.preventDefault(); buscar(tipo, ticker, perfil); }}>
        <div className="abas">
          <button type="button" className={tipo === 'acoes' ? 'ativa' : ''} onClick={() => setTipo('acoes')}>Ações</button>
          <button type="button" className={tipo === 'fiis' ? 'ativa' : ''} onClick={() => setTipo('fiis')}>FIIs</button>
        </div>
        <label>Ticker <input value={ticker} onChange={e => setTicker(e.target.value)} placeholder={tipo === 'acoes' ? 'PETR4' : 'MXRF11'} /></label>
        <label>
          Perfil
          <select value={perfil} onChange={e => setPerfil(e.target.value)}>
            <option value="conservador">Conservador</option>
            <option value="moderado">Moderado</option>
            <option value="arrojado">Arrojado</option>
          </select>
        </label>
        <button className="botao" disabled={buscando}>{buscando ? 'Buscando...' : 'Buscar'}</button>
      </form>
      <Erro mensagem={erro} />

      {dados && (
        <>
          <div className="linha-titulo">
            <h2>{dados.ticker} <small>{resultado.tipo === 'fiis' ? 'FII' : 'Ação'} · perfil {dados.perfil}</small></h2>
            <button className={`botao ${favoritos.includes(dados.ticker) ? '' : 'secundario'}`} onClick={() => alternarFavorito(dados.ticker)}>
              {favoritos.includes(dados.ticker) ? '★ Favorito' : '☆ Favoritar'}
            </button>
          </div>
          {dados.selicUtilizada && <p className="aviso">Selic usada nos cálculos: {numero(dados.selicUtilizada)}%</p>}
          {SECOES[resultado.tipo].map(([titulo, campos]) => (
            <div key={titulo}>
              <h3>{titulo}</h3>
              <div className="grade-cartoes">
                {campos.map(([chave, rotulo]) => (
                  <Cartao
                    key={chave}
                    titulo={rotulo}
                    valor={dados[chave]?.value || 'n/d'}
                    classe={CLASSE[dados[chave]?.class] || ''}
                    detalhe={detalheMargem(dados[chave]?.margem)}
                  />
                ))}
              </div>
            </div>
          ))}
          <Mentor key={`${dados.ticker}-${resultado.perfil}`} ativo={{ ticker: dados.ticker, tipo: resultado.tipo, perfil: resultado.perfil, snapshot: dados.mentorContext }} />
        </>
      )}
    </section>
  );
}
