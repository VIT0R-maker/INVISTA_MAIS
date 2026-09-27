import { useCallback, useEffect, useState } from 'react';
import { request } from './api.js';
import { analyzeTelemetry, profileForRisk } from '../../shared/statistics.js';
import { demoReadings } from '../../shared/demo.js';
import { Timeline, Scatter, number } from './Charts.jsx';
const fmt = d => d ? new Date(d).toLocaleString('pt-BR') : 'Aguardando leitura';
export default function IotDashboard({ user, login, onProfile }) {
  const [devices, setDevices] = useState([]), [rows, setRows] = useState([]), [stats, setStats] = useState(null), [hours, setHours] = useState('24');
  const [demo, setDemo] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [blynk, setBlynk] = useState(false), [updated, setUpdated] = useState(null);
  const [code, setCode] = useState(''), [name, setName] = useState('Meu terminal financeiro'), [revision, setRevision] = useState(0);
  const refresh = useCallback(async signal => {
    const [list, config] = await Promise.all([request('/api/v1/devices', { signal }), request('/api/v1/status', { signal })]);
    const d = list.devices[0]; let data = { readings: [] }, statistics = null;
    if (d) {
      const to = new Date(), from = new Date(to.getTime() - Number(hours) * 3600000);
      const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), limit: '1000' });
      [data, statistics] = await Promise.all([request(`/api/v1/devices/${d.id}/telemetry?${query}`, { signal }), request(`/api/v1/devices/${d.id}/statistics?${query}`, { signal })]);
    }
    if (signal.aborted) return;
    setDevices(list.devices); setBlynk(config.blynk); setRows(data.readings); setStats(statistics); setUpdated(new Date()); setError(''); onProfile(d?.online ? d.profile : null);
  }, [hours, onProfile]);
  useEffect(() => {
    const controller = new AbortController(); let timer;
    setDevices([]); setRows([]); setStats(null); setUpdated(null); setError(''); onProfile(null);
    if (demo) {
      const readings = demoReadings(); setRows(readings); setStats(analyzeTelemetry(readings));
      setDevices([{ id: 'demo', name: 'Terminal demonstrativo', online: false, latest: readings.at(-1), profile: profileForRisk(readings.at(-1).riskLevel) }]);
    } else if (user) {
      const poll = async () => { try { await refresh(controller.signal); } catch (e) { if (!controller.signal.aborted) { setError(e.message); onProfile(null); } } finally { if (!controller.signal.aborted) timer = setTimeout(poll, 10000); } };
      void poll();
    }
    return () => { controller.abort(); clearTimeout(timer); };
  }, [user, demo, refresh, revision, onProfile]);
  const device = devices[0], latest = device?.latest;
  async function pair(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await request('/api/v1/devices', { method: 'POST', body: { name, pairingCode: code } }); setCode(''); setRevision(v => v + 1); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function led(on) {
    setBusy(true); setMessage(''); setError('');
    try { const result = await request(`/api/v1/devices/${device.id}/actuators/led`, { method: 'PUT', body: { on } }); setMessage(result.message); setDevices(ds => ds.map(d => ({ ...d, latestCommand: result }))); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function csv() {
    const fields = ['receivedAt', 'source', 'analogRaw', 'riskLevel', 'buttonPressed', 'buttonPresses', 'intervalSeconds', 'ledOn'];
    const text = [fields.join(';'), ...rows.map(r => fields.map(f => r[f]).join(';'))].join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', text], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'invista-telemetria.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <><div className="section-heading"><div><span className="eyebrow">DO CIRCUITO À DECISÃO</span><h1>Seu terminal, conectado.</h1><p>Observe o perfil selecionado, registre consultas e explore os dados.</p></div><span className="pill">ESP32 · Wokwi + Blynk</span></div>
    <div className="toolbar"><div className="segmented"><button aria-pressed={!demo} onClick={() => setDemo(false)}>Meu dispositivo</button><button aria-pressed={demo} onClick={() => setDemo(true)}>Explorar demonstração</button></div><label className="inline-label">Período<select disabled={demo} value={hours} onChange={e => setHours(e.target.value)}><option value="1">Última hora</option><option value="24">Últimas 24 horas</option><option value="168">Últimos 7 dias</option></select></label></div>
    {demo && <p className="notice">Demonstração com 60 amostras ilustrativas. Os controles físicos estão desativados; estes dados não são salvos no banco.</p>}
    {error && <p className="notice error" role="alert">{error} {updated && 'Os dados abaixo pertencem à última atualização bem-sucedida.'}</p>}
    {!demo && !user && <section className="panel empty"><span className="orb">⌁</span><h2>Conecte seu terminal ao Invista+</h2><p>Entre para vincular o ESP32, consultar leituras e controlar o LED. Você também pode explorar a demonstração acima.</p><button className="primary" onClick={login}>Entrar ou criar conta</button></section>}
    {!demo && user && !device && <form className="panel pair-form" onSubmit={pair}><div><h2>Vincular terminal</h2><p>Use o código de vínculo configurado no servidor. O terminal pertence a uma única conta.</p></div><label>Nome<input required maxLength={60} value={name} onChange={e => setName(e.target.value)}/></label><label>Código de vínculo<input required type="password" autoComplete="off" value={code} onChange={e => setCode(e.target.value)}/></label><button className="primary" disabled={busy}>{busy ? 'Vinculando…' : 'Vincular dispositivo'}</button></form>}
    {device && <><div className="device-bar"><strong>{device.name}</strong><span className={`status-dot ${device.online && !error ? 'online' : ''}`}>{demo ? 'Dados demonstrativos' : device.online && !error ? 'Recebendo leituras' : 'Sem leitura recente'}</span><small>{demo ? 'Simulação ilustrativa' : `Última leitura: ${fmt(latest?.receivedAt)}`}</small></div>
      <div className="metrics"><article className="panel metric"><span>01 / SENSOR ANALÓGICO</span><h3>Nível de risco</h3><strong>{latest?.riskLevel ?? '—'}<small> / 100</small></strong><div className="meter"><i style={{ width: `${latest?.riskLevel || 0}%` }}/></div><p>{device.profile || 'Gire o potenciômetro'} · ADC {latest?.analogRaw ?? '—'}</p></article>
      <article className="panel metric"><span>02 / SENSOR DIGITAL</span><h3>Consultas registradas</h3><strong>{stats?.totalPresses ?? 0}<small> no período</small></strong><p>Botão: {latest ? latest.buttonPressed ? 'pressionado' : 'solto' : 'sem leitura'}</p><small>Contagem dos acionamentos, não das buscas no scanner.</small></article>
      <article className="panel metric actuator"><span>03 / ATUADOR</span><h3>LED de sinalização</h3><div className="led-control"><strong>{latest ? latest.ledOn ? 'Ligado' : 'Desligado' : '—'}</strong><button className="switch" role="switch" aria-label="Ligar LED pelo Blynk" aria-checked={Boolean(latest?.ledOn)} disabled={demo || busy || !blynk} onClick={() => led(!latest?.ledOn)}><i/></button></div><p>Estado confirmado pela telemetria.</p>{!demo && !blynk && <small>Configure o token Blynk no servidor para habilitar.</small>}{device.latestCommand && <small>Último comando: {device.latestCommand.on ? 'ligar' : 'desligar'} · {fmt(device.latestCommand.sentAt)}</small>}</article></div>
      {message && <p className="notice" role="status">{message}</p>}
      <div className="chart-grid"><section className="panel chart"><div className="panel-heading"><div><span className="eyebrow">HISTÓRICO DO TERMINAL</span><h2>Perfil ao longo do tempo</h2></div><button onClick={csv} disabled={!rows.length}>Exportar CSV ↓</button></div><Timeline rows={rows}/></section><section className="panel distribution"><span className="eyebrow">DISTRIBUIÇÃO</span><h2>Perfis selecionados</h2>{stats?.histogram.map(h => <div className="distribution-row" key={h.profile}><div><span>{h.profile}</span><strong>{h.count}</strong></div><div className="meter"><i style={{ width: `${stats.sampleCount ? h.count / stats.sampleCount * 100 : 0}%` }}/></div></div>)}<p className="caption">Frequência por amostra recebida.</p></section></div>
      <section className="panel statistics"><div className="panel-heading"><div><span className="eyebrow">ESTATÍSTICA DESCRITIVA</span><h2>O que as interações mostram</h2></div><span className="pill">{stats?.sampleCount || 0} amostras</span></div>{stats?.truncated && <p className="notice">Exibindo as 1.000 amostras mais recentes deste período. Reduza o período para analisar o conjunto completo.</p>}
        <div className="table-scroll"><table><caption>Nível de risco e acionamentos do botão por intervalo de coleta</caption><thead><tr><th>Variável</th><th>Média</th><th>Moda</th><th>Mediana</th><th>Desvio padrão</th><th>Assimetria</th><th>Excesso de curtose</th></tr></thead><tbody>{[['Nível de risco', stats?.risk], ['Acionamentos / amostra', stats?.presses], ['Acionamentos / minuto', stats?.rate]].map(([label, s]) => <tr key={label}><th>{label}</th><td>{number(s?.mean)}</td><td>{s?.modes.length ? s.modes.map(n => number(n)).join(', ') : 'Amodal'}</td><td>{number(s?.median)}</td><td>{number(s?.standardDeviation)}</td><td>{number(s?.skewness)}</td><td>{number(s?.excessKurtosis)}</td></tr>)}</tbody></table></div><p className="caption">Desvio amostral; assimetria de Fisher e excesso de curtose corrigidos. “—” indica amostra insuficiente ou variância nula. Fontes: {demo ? 'demonstração' : stats?.sources?.join(', ') || 'aguardando dados'}.</p>
      </section>
      <div className="chart-grid"><section className="panel chart"><span className="eyebrow">REGRESSÃO LINEAR</span><h2>Risco × frequência de consultas</h2><Scatter rows={rows} regression={stats?.regression}/><p className="caption">{stats?.regression ? `y = ${number(stats.regression.intercept)} + (${number(stats.regression.slope, 4)})x · R² = ${number(stats.regression.rSquared, 4)} · r = ${number(stats.regression.r, 4)}` : 'São necessárias pelo menos 3 amostras e variação nas duas variáveis.'}</p></section>
      <section className="panel probabilities"><span className="eyebrow">PROBABILIDADE & INFERÊNCIA</span><h2>Frequências observadas</h2><dl><div><dt>P(risco ≥ 67)</dt><dd>{number(stats?.probability.highRisk == null ? null : stats.probability.highRisk * 100)}%</dd></div><div><dt>P(ao menos 1 acionamento)</dt><dd>{number(stats?.probability.withPresses == null ? null : stats.probability.withPresses * 100)}%</dd></div><div><dt>IC 95% · risco ≥ 67</dt><dd>{stats?.probability.highRiskCI95 ? `${number(stats.probability.highRiskCI95.lower * 100)}% a ${number(stats.probability.highRiskCI95.upper * 100)}%` : '—'}</dd></div></dl><p className="caption">{stats?.inferenceNote || 'Aguardando amostras para os cálculos.'}</p></section></div>
      <details className="panel"><summary>Conferir últimas leituras recebidas</summary><div className="table-scroll"><table><thead><tr><th>Recebida em</th><th>Origem</th><th>ADC</th><th>Risco</th><th>Acionamentos</th><th>Intervalo</th><th>LED</th></tr></thead><tbody>{[...rows].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).slice(0, 12).map(r => <tr key={r.id}><td>{fmt(r.receivedAt)}</td><td>{r.source}</td><td>{r.analogRaw}</td><td>{r.riskLevel}</td><td>{r.buttonPresses}</td><td>{number(r.intervalSeconds)} s</td><td>{r.ledOn ? 'Ligado' : 'Desligado'}</td></tr>)}</tbody></table></div></details>
    </>}
  </>;
}
