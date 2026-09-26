import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../api';
import { Carregando, Cartao, Erro } from '../componentes/Estado';
import { numero, porcentagem, reais } from '../formatos';

export default function Simulacao() {
  const { id } = useParams();
  const [meses, setMeses] = useState(12);
  const [aporte, setAporte] = useState('0');
  const [aplicado, setAplicado] = useState({ meses: 12, aporteMensalCentavos: 0 });
  const { dados, erro, carregando, recarregar } = useApi(
    `/api/dispositivos/${id}/simulacao?meses=${aplicado.meses}&aporteMensalCentavos=${aplicado.aporteMensalCentavos}`,
  );
  const final = dados?.serie.at(-1);

  function aplicar(evento) {
    evento.preventDefault();
    const centavos = Math.max(0, Math.round(Number(aporte.replace(',', '.')) * 100) || 0);
    setAplicado({ meses: Math.min(120, Math.max(1, Number(meses) || 12)), aporteMensalCentavos: centavos });
  }

  return (
    <section>
      <div className="linha-titulo">
        <h1>Quanto seu dinheiro renderia?</h1>
        <Link className="botao secundario" to={`/cofrinhos/${id}`}>Voltar ao painel</Link>
      </div>

      <form className="painel filtros" onSubmit={aplicar}>
        <label>Meses <input type="number" min="1" max="120" value={meses} onChange={e => setMeses(e.target.value)} /></label>
        <label>Guardar por mês (R$) <input inputMode="decimal" value={aporte} onChange={e => setAporte(e.target.value)} /></label>
        <button className="botao">Simular</button>
      </form>

      <Erro mensagem={erro} tentarDeNovo={recarregar} />
      {carregando && !dados && <Carregando />}

      {dados && (
        <>
          <div className="grade-cartoes">
            <Cartao titulo="Parado no cofre" valor={reais(final.cofre)} />
            <Cartao titulo="Na poupança" valor={reais(final.poupanca)} detalhe={`${porcentagem(dados.taxasMensais.poupanca, 2)} ao mês`} />
            <Cartao titulo="Título Selic" valor={reais(final.selic)} detalhe={`${porcentagem(dados.taxasMensais.selic, 2)} ao mês (Selic ${numero(dados.selicAnual)}% ao ano)`} classe="bom" />
          </div>
          <div className="painel grafico">
            <h3>Evolução mês a mês</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dados.serie}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={v => numero(v)} />
                <Tooltip formatter={valor => reais(valor)} labelFormatter={mes => `Mês ${mes}`} />
                <Legend />
                <Line dataKey="cofre" name="Cofre" stroke="#9aa5b1" dot={false} strokeWidth={2} />
                <Line dataKey="poupanca" name="Poupança" stroke="#e67e22" dot={false} strokeWidth={2} />
                <Line dataKey="selic" name="Título Selic" stroke="#28a745" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="aviso">{dados.aviso}</p>
        </>
      )}
    </section>
  );
}
