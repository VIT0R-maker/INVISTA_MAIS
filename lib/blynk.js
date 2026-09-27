export class BlynkError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const PINOS = {
  saldo: 'v0', ultimoDeposito: 'v1', peso: 'v2', luz: 'v3', tampa: 'v4',
  trava: 'v5', cor: 'v6', brilho: 'v7', buzzer: 'v8', meta: 'v9',
};
export const CORES = ['desligado', 'verde', 'amarelo', 'vermelho', 'azul'];

export function criarClienteBlynk({ servidor = 'blynk.cloud', fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  if (!/^[a-z0-9.-]+$/.test(servidor)) throw new Error('BLYNK_SERVER inválido.');

  async function chamar(caminho, token, parametros = []) {
    const url = new URL(`https://${servidor}/external/api/${caminho}`);
    url.searchParams.set('token', token);
    for (const [nome, valor] of parametros) url.searchParams.append(nome, valor);
    let resposta;
    try {
      resposta = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch {
      throw new BlynkError(504, 'O Blynk não respondeu. Tente novamente.');
    }
    if (resposta.status === 429) throw new BlynkError(429, 'Limite de uso do Blynk atingido. Tente mais tarde.');
    if (!resposta.ok) throw new BlynkError(502, 'O Blynk recusou a solicitação. Confira o token e os datastreams do dispositivo.');
    return resposta.text();
  }

  return {
    async ler(token, pinos) {
      const texto = await chamar('get', token, pinos.map(pino => [pino, '']));
      try { return JSON.parse(texto); } catch { throw new BlynkError(502, 'O Blynk retornou uma resposta inválida.'); }
    },
    async atualizar(token, valores) {
      for (const [pino, valor] of Object.entries(valores)) await chamar('update', token, [[pino, String(valor)]]);
    },
    async conectado(token) {
      return (await chamar('isHardwareConnected', token)).trim() === 'true';
    },
  };
}
