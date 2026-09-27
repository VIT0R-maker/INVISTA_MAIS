import { useCallback, useEffect, useState } from 'react';
import { auth } from './firebase';

const BASE = import.meta.env.VITE_API_URL || '';

export class ErroApi extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

export async function api(caminho, { metodo = 'GET', corpo, autenticado = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (autenticado) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new ErroApi(401, 'Entre na sua conta para continuar.');
    headers.Authorization = `Bearer ${token}`;
  }
  let resposta;
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ErroApi(0, 'Sem conexão com o servidor.');
  }
  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new ErroApi(resposta.status, dados.error || 'Não foi possível concluir a operação.');
  return dados;
}

export function useApi(caminho, autenticado = true) {
  const [estado, setEstado] = useState({ dados: null, erro: null, carregando: Boolean(caminho) });

  const recarregar = useCallback(async () => {
    if (!caminho) return;
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
