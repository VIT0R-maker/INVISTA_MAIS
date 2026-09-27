export function Carregando({ texto = 'Carregando...' }) {
  return <p className="aviso">{texto}</p>;
}

export function Erro({ mensagem, tentarDeNovo }) {
  if (!mensagem) return null;
  return (
    <div className="erro" role="alert">
      <span>{mensagem}</span>
      {tentarDeNovo && <button className="botao secundario" onClick={tentarDeNovo}>Tentar de novo</button>}
    </div>
  );
}

export function Cartao({ titulo, valor, detalhe, classe = '' }) {
  return (
    <div className={`cartao ${classe}`}>
      <span className="cartao-titulo">{titulo}</span>
      <strong className="cartao-valor">{valor}</strong>
      {detalhe && <span className="cartao-detalhe">{detalhe}</span>}
    </div>
  );
}

export function Progresso({ atual, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((atual / total) * 100)) : 0;
  return (
    <div className="progresso" aria-label={`${pct}% da meta`}>
      <div className="progresso-barra" style={{ width: `${pct}%` }} />
      <span>{pct}%</span>
    </div>
  );
}
