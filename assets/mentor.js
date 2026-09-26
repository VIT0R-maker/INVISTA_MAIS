export function createMentor({ root, apiBase, getToken, fetchImpl = fetch }) {
  const byId = id => root.querySelector(`#${id}`);
  const status = byId('mentor-status');
  const messages = byId('mentor-messages');
  const input = byId('mentor-question');
  const form = byId('mentor-form');
  const summary = byId('mentor-summary');
  const retry = byId('mentor-retry');
  const contextLabel = byId('mentor-context');
  const login = byId('mentor-login');
  let asset = null;
  let perfil = 'moderado';
  let history = [];
  let signedIn = false;
  let userId = null;
  let pending = null;
  let revision = 0;
  let lastRequest = null;
  let summaryDone = false;

  function controls(busy = false) {
    form.querySelectorAll('button, textarea').forEach(el => { el.disabled = busy || !signedIn; });
    root.querySelectorAll('[data-question]').forEach(el => { el.disabled = busy || !signedIn; });
    summary.disabled = busy || !signedIn || !asset;
    retry.disabled = busy || !signedIn;
    login.hidden = signedIn;
    root.setAttribute('aria-busy', String(busy));
  }

  function message(role, text) {
    const item = document.createElement('div');
    item.className = `mentor-message mentor-message-${role}`;
    const label = document.createElement('strong');
    label.textContent = role === 'user' ? 'Você' : 'Mentor IA';
    const body = document.createElement('p');
    body.textContent = text; // Respostas e perguntas nunca são interpretadas como HTML.
    item.append(label, body);
    messages.append(item);
    messages.scrollTop = messages.scrollHeight;
    return item;
  }

  function reset() {
    revision++;
    pending?.abort();
    pending = null;
    history = [];
    lastRequest = null;
    summaryDone = false;
    messages.replaceChildren();
    byId('mentor-source').replaceChildren();
    retry.hidden = true;
    input.value = '';
    contextLabel.textContent = asset ? `${asset.ticker} · ${asset.tipo === 'fiis' ? 'FII' : 'Ação'} · Perfil ${perfil}` : 'Conversa sobre finanças';
    status.textContent = signedIn ? 'Tire uma dúvida ou escolha uma sugestão abaixo.' : 'Entre na sua conta para usar o Mentor IA.';
    controls();
  }

  async function request(modo, pergunta = '') {
    if (!signedIn || pending || (modo === 'resumo' && !asset)) return;
    const currentRevision = revision;
    const controller = new AbortController();
    pending = controller;
    controls(true);
    retry.hidden = true;
    status.textContent = modo === 'resumo' ? 'Preparando um resumo dos indicadores…' : 'Pensando na sua pergunta…';
    lastRequest = { modo, pergunta };
    const userMessage = modo === 'pergunta' ? message('user', pergunta) : null;
    const timeout = setTimeout(() => controller.abort(), 65000);
    try {
      const token = await getToken();
      if (currentRevision !== revision) return;
      if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
      const response = await fetchImpl(`${apiBase}/api/mentor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        signal: controller.signal,
        body: JSON.stringify({ modo, pergunta, perfil, ...(asset || {}), historico: history.slice(-8) }),
      });
      const data = await response.json().catch(() => ({}));
      if (currentRevision !== revision) return;
      if (!response.ok) throw new Error(data.error || 'O Mentor IA está indisponível. Tente novamente.');
      if (typeof data.texto !== 'string' || !data.texto.trim()) throw new Error('A IA retornou uma resposta vazia. Tente novamente.');
      message('model', data.texto);
      if (modo === 'pergunta') {
        history.push({ role: 'user', text: pergunta }, { role: 'model', text: data.texto });
        history = history.slice(-8);
        input.value = '';
      } else {
        summaryDone = true;
        history = [{ role: 'user', text: `Resuma os indicadores de ${asset.ticker}.` }, { role: 'model', text: data.texto }];
      }
      const source = byId('mentor-source');
      source.replaceChildren();
      if (data.contexto && asset) {
        const link = document.createElement('a');
        link.href = `https://investidor10.com.br/${asset.tipo}/${asset.ticker.toLowerCase()}/`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Dados: Investidor10';
        const date = new Date(data.contexto.consultadoEm);
        source.append(link, ` · Consulta: ${date.toLocaleString('pt-BR')}. Dados podem ter atraso; cálculos: Invista+.`);
      }
      status.textContent = 'Resposta gerada por IA. Confira os dados antes de tomar decisões.';
      lastRequest = null;
    } catch (error) {
      if (currentRevision !== revision) return;
      userMessage?.remove();
      status.textContent = controller.signal.aborted ? 'A resposta demorou demais. Tente novamente.' : error.message;
      retry.hidden = false;
    } finally {
      clearTimeout(timeout);
      if (currentRevision === revision) {
        pending = null;
        controls();
      }
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const question = input.value.trim();
    if (question && question.length <= 1500) void request('pergunta', question);
  });
  root.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => {
    input.value = button.dataset.question;
    void request('pergunta', input.value);
  }));
  summary.addEventListener('click', () => void request('resumo'));
  retry.addEventListener('click', () => { if (lastRequest) void request(lastRequest.modo, lastRequest.pergunta); });
  byId('mentor-clear').addEventListener('click', () => { asset = null; reset(); });

  reset();
  return {
    setUser(user) {
      const changed = userId !== (user?.uid ?? null);
      userId = user?.uid ?? null;
      signedIn = Boolean(user);
      if (changed) reset(); else controls(Boolean(pending));
      if (signedIn && asset && !summaryDone && !pending) void request('resumo');
    },
    setAsset(nextAsset, nextPerfil = perfil) {
      asset = nextAsset;
      perfil = nextPerfil;
      reset();
      if (asset && signedIn) void request('resumo');
    },
  };
}
