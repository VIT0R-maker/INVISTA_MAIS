import { useCallback, useEffect, useState } from 'react';
import { API_URL } from './config';
import { token } from './sessao';

export async function api(caminho, { metodo = 'GET', corpo, autenticado = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (autenticado) {
    const idToken = await token();
    if (!idToken) throw new Error('Entre na sua conta para continuar.');
    headers.Authorization = `Bearer ${idToken}`;
  }
  let resposta;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new Error('Sem conexão com o servidor.');
  }
  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.error || 'Não foi possível concluir a operação.');
  return dados;
}

export function useApi(caminho, autenticado = true) {
  const [estado, setEstado] = useState({ dados: null, erro: null, carregando: true });

  const recarregar = useCallback(async () => {
    setEstado(atual => ({ ...atual, carregando: true, erro: null }));
    try {
      const dados = await api(caminho, { autenticado });
      setEstado({ dados, erro: null, carregando: false });
    } catch (erro) {
      setEstado(atual => ({ ...atual, erro: erro.message, carregando: false }));
    }
  }, [caminho, autenticado]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { ...estado, recarregar };
}
