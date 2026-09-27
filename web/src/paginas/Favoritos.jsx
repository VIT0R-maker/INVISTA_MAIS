import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../api';
import { Carregando, Erro } from '../componentes/Estado';

export default function Favoritos() {
  const { dados, erro, carregando, recarregar } = useApi('/api/usuarios/me/favoritos');
  const [erroRemover, setErroRemover] = useState('');

  async function remover(ticker) {
    setErroRemover('');
    try {
      await api(`/api/usuarios/me/favoritos/${ticker}`, { metodo: 'DELETE' });
      recarregar();
    } catch (falha) {
      setErroRemover(falha.message);
    }
  }

  return (
    <section>
      <h1>Favoritos</h1>
      {carregando && !dados && <Carregando />}
      <Erro mensagem={erro || erroRemover} tentarDeNovo={erro ? recarregar : undefined} />
      {dados?.favoritos.length === 0 && <p className="aviso">Nenhum favorito. Busque um ativo no Scanner e clique em Favoritar.</p>}
      <div className="lista-favoritos">
        {dados?.favoritos.map(ticker => (
          <div key={ticker} className="painel favorito">
            <Link to={`/scanner?tipo=${/11$/.test(ticker) ? 'fiis' : 'acoes'}&ticker=${ticker}`}>{ticker}</Link>
            <button className="botao secundario" onClick={() => remover(ticker)} aria-label={`Remover ${ticker}`}>Remover</button>
          </div>
        ))}
      </div>
    </section>
  );
}
