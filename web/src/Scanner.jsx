import { useEffect, useRef, useState } from 'react';
import { API, auth, request } from './api.js';
import { createMentor } from '../../assets/mentor.js';
import mentorMarkup from './mentor.html?raw';
const labels = { cotacao: 'Cotação', valorGrahamPadrao: 'Graham clássico', valorGrahamRev: 'Graham revisado', valorGrahamTupiniquim: 'Graham Tupiniquim', precoTeto6: 'Bazin · retorno 6%', precoTeto8: 'Bazin · retorno 8%', pl: 'P/L', pvp: 'P/VP', dy: 'Dividend yield', payout: 'Payout', roe: 'ROE', roic: 'ROIC', roa: 'ROA', margemBruta: 'Margem bruta', margemEbitda: 'Margem EBITDA', margemLiquida: 'Margem líquida', divLiqPatrimonio: 'Dívida líquida / patrimônio', divLiqEbitda: 'Dívida líquida / EBITDA', liquidezCorrente: 'Liquidez corrente', lpa: 'Lucro por ação', vpa: 'Valor patrimonial por ação/cota', cagr5a: 'CAGR lucros · 5 anos', giroAtivos: 'Giro de ativos', ebn: 'Cotas para efeito bola de neve', vn: 'Capital para efeito bola de neve', ultimoRendimento: 'Último rendimento', variacao12m: 'Variação · 12 meses', segmento: 'Segmento', mandato: 'Mandato', tipoFundo: 'Tipo de fundo', tipoGestao: 'Tipo de gestão', taxaAdministracao: 'Taxa de administração', liquidezDiaria: 'Liquidez diária', valorPatrimonial: 'Patrimônio', vacancia: 'Vacância', numeroCotistas: 'Número de cotistas' };
function Mentor({ asset, user, login }) {
  const host = useRef(null), controller = useRef(null);
  useEffect(() => {
    host.current.innerHTML = mentorMarkup;
    controller.current = createMentor({ root: host.current.firstElementChild, apiBase: API, getToken: () => auth.currentUser?.getIdToken() });
    const link = host.current.querySelector('#mentor-login');
    const open = e => { e.preventDefault(); login(); }; link.addEventListener('click', open);
    return () => { controller.current.setAsset(null); link.removeEventListener('click', open); };
  }, [login]);
  useEffect(() => { controller.current?.setAsset({ ticker: asset.ticker, tipo: asset.tipo, snapshot: asset.mentorContext }, asset.perfil); }, [asset, login]);
  useEffect(() => { controller.current?.setUser(user); }, [user, login]);
  return <div ref={host}/>;
}
export default function Scanner({ user, login, terminalProfile }) {
  const [ticker, setTicker] = useState(''), [tipo, setTipo] = useState('acoes'), [perfil, setPerfil] = useState('moderado');
  const [asset, setAsset] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [favorites, setFavorites] = useState([]), [saving, setSaving] = useState(false);
  const pending = useRef(null);
  useEffect(() => { const c = new AbortController(); setFavorites([]); if (user) request('/api/v1/favorites', { signal: c.signal }).then(d => setFavorites(d.tickers)).catch(e => { if (!c.signal.aborted) setError(e.message); }); return () => { c.abort(); }; }, [user]);
  useEffect(() => () => pending.current?.abort(), []);
  async function search(e) {
    e.preventDefault(); pending.current?.abort(); const c = new AbortController(); pending.current = c;
    setAsset(null); setBusy(true); setError('');
    try { const data = await request(`/api/${tipo}`, { method: 'POST', body: { ticker, perfil }, signal: c.signal }); if (!c.signal.aborted) setAsset({ ...data, tipo }); }
    catch (e) { if (!c.signal.aborted) setError(e.message); }
    finally { if (!c.signal.aborted) setBusy(false); }
  }
  async function favorite() {
    if (!user) return login(); setSaving(true);
    const next = favorites.includes(asset.ticker) ? favorites.filter(t => t !== asset.ticker) : [...favorites, asset.ticker];
    try { const data = await request('/api/v1/favorites', { method: 'PUT', body: { tickers: next } }); setFavorites(data.tickers); }
    catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  return <><div className="section-heading"><div><span className="eyebrow">SCANNER FUNDAMENTALISTA</span><h1>Conheça antes de investir.</h1><p>Indicadores, valuation e contexto para uma análise mais consciente.</p></div><span className="pill">Ações & FIIs · B3</span></div>
    <form className="panel search-form" onSubmit={search}><label>Ativo<input placeholder="Ex.: PETR4 ou MXRF11" required pattern="[A-Za-z]{4}[0-9]{1,2}" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}/></label><label>Categoria<select value={tipo} onChange={e => setTipo(e.target.value)}><option value="acoes">Ações</option><option value="fiis">Fundos imobiliários</option></select></label><label>Perfil de leitura<select value={perfil} onChange={e => setPerfil(e.target.value)}>{['conservador', 'moderado', 'arrojado'].map(p => <option key={p}>{p}</option>)}</select></label><button className="primary" disabled={busy}>{busy ? 'Analisando…' : 'Analisar ativo →'}</button>
    {terminalProfile && <button type="button" className="text-button" onClick={() => setPerfil(terminalProfile)}>Aplicar perfil do potenciômetro: {terminalProfile}</button>}</form>
    {favorites.length > 0 && <div className="favorites"><span>Seus favoritos</span>{favorites.map(t => <button key={t} onClick={() => { setTicker(t); setTipo(t.endsWith('11') ? 'fiis' : 'acoes'); }}>{t}</button>)}</div>}
    {error && <p className="notice error" role="alert">{error}</p>}
    {busy && <div className="panel empty" role="status">Consultando os indicadores e calculando as estimativas…</div>}
    {!asset && !busy && <section className="panel scanner-intro"><div className="orb">↗</div><div><h2>Uma visão completa do ativo</h2><p>Pesquise um ticker para comparar fundamentos, estimativas de valor e margens. Depois, converse com o Mentor Gemini sobre os resultados.</p><div className="tag-row"><span>Fundamentos</span><span>Graham & Bazin</span><span>Mentor Gemini</span></div></div></section>}
    {asset && <><div className="section-heading result-heading"><div><span className="eyebrow">RESULTADO DA CONSULTA</span><h2>{asset.ticker} <small>· {asset.perfil}</small></h2></div><button onClick={favorite} disabled={saving}>{favorites.includes(asset.ticker) ? '★ Salvo nos favoritos' : '☆ Salvar favorito'}</button></div>
      <p className="caption">Dados: Investidor10. Podem ter atraso. Cálculos: Invista+. {asset.selicUtilizada != null && `Taxa usada nas fórmulas: ${asset.selicUtilizada}% (sujeita a contingência).`} Cores representam critérios do perfil, não recomendações.</p>
      <div className="indicator-grid">{Object.entries(asset).filter(([, v]) => v && typeof v === 'object' && 'value' in v).map(([k, v]) => <article className={`panel indicator ${v.class || 'neutral'}`} key={k}><span>{labels[k] || k}</span><strong>{v.value}</strong>{v.margem != null && <small>Margem: {Number(v.margem).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</small>}</article>)}</div>
      <Mentor asset={asset} user={user} login={login}/>
    </>}
  </>;
}
