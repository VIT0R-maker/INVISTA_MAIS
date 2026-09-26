import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../api';
import { Carregando, Erro, Progresso } from '../componentes/Estado';
import { centavos } from '../formatos';

function NovoCofrinho({ aoCriar }) {
  const [apelido, setApelido] = useState('');
  const [blynkToken, setBlynkToken] = useState('');
  const [meta, setMeta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [criado, setCriado] = useState(null);

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const corpo = { apelido: apelido.trim(), blynkToken: blynkToken.trim() };
      if (meta) corpo.metaCentavos = Math.round(Number(meta.replace(',', '.')) * 100);
      const resposta = await api('/api/dispositivos', { metodo: 'POST', corpo });
      setCriado(resposta);
      setApelido('');
      setBlynkToken('');
      setMeta('');
      aoCriar();
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(false);
    }
  }

  if (criado) {
    return (
      <div className="painel destaque">
        <h2>Cofrinho criado</h2>
        <p>Copie os dois valores abaixo para o <code>secrets.h</code> do ESP32. <strong>A chave aparece só agora.</strong></p>
        <dl className="segredos">
          <dt>DISPOSITIVO_ID</dt>
          <dd><code>{criado.id}</code></dd>
          <dt>CHAVE_DISPOSITIVO</dt>
          <dd><code>{criado.chaveDispositivo}</code></dd>
        </dl>
        <div className="acoes">
          <button className="botao" onClick={() => navigator.clipboard?.writeText(`#define DISPOSITIVO_ID "${criado.id}"\n#define CHAVE_DISPOSITIVO "${criado.chaveDispositivo}"`)}>
            Copiar para o secrets.h
          </button>
          <button className="botao secundario" onClick={() => setCriado(null)}>Já guardei</button>
        </div>
      </div>
    );
  }

  return (
    <form className="painel" onSubmit={enviar}>
      <h2>Novo cofrinho</h2>
      <div className="grade-form">
        <label>
          Apelido
          <input required maxLength={40} value={apelido} onChange={e => setApelido(e.target.value)} placeholder="Cofre da Ana" />
        </label>
        <label>
          Token do Blynk
          <input required value={blynkToken} onChange={e => setBlynkToken(e.target.value)} placeholder="Auth token do dispositivo" />
        </label>
        <label>
          Meta (R$)
          <input inputMode="decimal" value={meta} onChange={e => setMeta(e.target.value)} placeholder="100,00" />
        </label>
      </div>
      <small className="dica">Use um apelido, nunca o nome completo da criança.</small>
      <Erro mensagem={erro} />
      <button className="botao" disabled={enviando}>{enviando ? 'Criando...' : 'Criar cofrinho'}</button>
    </form>
  );
}

export default function Cofrinhos() {
  const { dados, erro, carregando, recarregar } = useApi('/api/dispositivos');

  return (
    <section>
      <h1>Meus cofrinhos</h1>
      {carregando && !dados && <Carregando />}
      <Erro mensagem={erro} tentarDeNovo={recarregar} />
      {dados?.dispositivos.length === 0 && <p className="aviso">Nenhum cofrinho ainda. Cadastre o primeiro abaixo.</p>}
      <div className="lista-cofrinhos">
        {dados?.dispositivos.map(d => (
          <Link key={d.id} to={`/cofrinhos/${d.id}`} className="painel cofrinho">
            <strong>{d.apelido}</strong>
            <span className="saldo">{centavos(d.saldoCentavos)}</span>
            {d.metaCentavos ? (
              <>
                <small>Meta: {centavos(d.metaCentavos)}</small>
                <Progresso atual={d.saldoCentavos} total={d.metaCentavos} />
              </>
            ) : (
              <small>Sem meta definida</small>
            )}
          </Link>
        ))}
      </div>
      <NovoCofrinho aoCriar={recarregar} />
    </section>
  );
}
