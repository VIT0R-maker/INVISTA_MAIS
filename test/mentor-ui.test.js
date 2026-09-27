import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { JSDOM } from 'jsdom';
import { createMentor } from '../assets/mentor.js';

const html = readFileSync(new URL('../legacy/index.html', import.meta.url), 'utf8');
const settle = async () => { for (let i = 0; i < 5; i++) await setImmediate(); };
const response = (texto, status = 200) => new Response(JSON.stringify(status === 200 ? { texto } : { error: texto }), { status });

function setup(t, fetchImpl) {
  const dom = new JSDOM(html, { url: 'http://localhost:3000' });
  globalThis.document = dom.window.document;
  const root = document.getElementById('mentor');
  const mentor = createMentor({ root, apiBase: '', getToken: async () => 'test-id-token', fetchImpl });
  t.after(() => { mentor.setAsset(null); dom.window.close(); delete globalThis.document; });
  const el = id => root.querySelector(`#mentor-${id}`);
  const submit = text => { el('question').value = text; el('form').dispatchEvent(new dom.window.Event('submit', { cancelable: true })); };
  return { root, mentor, el, submit };
}

test('Mentor aparece somente após busca, depois dos cards, e consulta apenas por solicitação', async t => {
  const requests = [];
  const { root, mentor, el } = setup(t, async (_url, options) => { requests.push(JSON.parse(options.body)); return response('Resumo'); });
  assert.equal(root.hidden, true);
  assert.ok(document.getElementById('resultContainer').compareDocumentPosition(root) & 4);
  const snapshot = { payload: 'snapshot-data', signature: 'signature' };
  mentor.setAsset({ ticker: 'PETR4', tipo: 'acoes', snapshot }, 'conservador');
  assert.equal(root.hidden, false);
  await settle();
  assert.equal(requests.length, 0);
  assert.equal(el('question').disabled, true);
  mentor.setUser({ uid: 'u1' });
  await settle();
  assert.equal(requests.length, 0);
  el('summary').click();
  await settle();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].modo, 'resumo');
  assert.equal(requests[0].perfil, 'conservador');
  assert.deepEqual(requests[0].snapshot, snapshot);
  assert.equal(el('messages').textContent.includes('Resumo'), true);
  mentor.setAsset(null);
  assert.equal(root.hidden, true);
  assert.equal(el('messages').children.length, 0);
});

test('resposta e pergunta com HTML são texto, histórico acompanha a conversa', async t => {
  const requests = [];
  const { mentor, el, submit } = setup(t, async (_url, options) => { requests.push(JSON.parse(options.body)); return response('<img src=x onerror=alert(1)>'); });
  mentor.setUser({ uid: 'u1' });
  mentor.setAsset({ ticker: 'PETR4', tipo: 'acoes' });
  submit('<script>alert(1)</script>');
  await settle();
  assert.equal(el('messages').querySelector('script, img'), null);
  assert.ok(el('messages').textContent.includes('<img'));
  submit('E P/L?');
  await settle();
  assert.equal(requests[1].historico.length, 2);
  el('clear').click();
  submit('O que é reserva de emergência?');
  await settle();
  assert.equal(requests[2].historico.length, 0);
  assert.equal(requests[2].ticker, 'PETR4');
});

test('troca de ativo descarta resposta atrasada, mesmo se fetch ignorar abort', async t => {
  let resolveOld;
  const { mentor, el } = setup(t, async (_url, options) => {
    if (JSON.parse(options.body).ticker === 'PETR4') return new Promise(resolve => { resolveOld = resolve; });
    return response('Resumo de MXRF11');
  });
  mentor.setUser({ uid: 'u1' });
  mentor.setAsset({ ticker: 'PETR4', tipo: 'acoes' });
  el('summary').click();
  await settle();
  mentor.setAsset({ ticker: 'MXRF11', tipo: 'fiis' });
  el('summary').click();
  await settle();
  resolveOld(response('Resposta antiga de PETR4'));
  await settle();
  assert.ok(el('messages').textContent.includes('MXRF11'));
  assert.ok(!el('messages').textContent.includes('PETR4'));
});

test('falha libera controles e permite repetir sem duplicar histórico', async t => {
  let fail = true;
  const requests = [];
  const { mentor, el, submit } = setup(t, async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return fail ? response('Limite temporário', 429) : response('Explicação');
  });
  mentor.setUser({ uid: 'u1' });
  mentor.setAsset({ ticker: 'PETR4', tipo: 'acoes' });
  submit('O que é DY?');
  await settle();
  assert.equal(el('retry').hidden, false);
  assert.equal(el('question').disabled, false);
  assert.equal(el('messages').children.length, 0);
  fail = false;
  el('retry').click();
  await settle();
  assert.equal(el('messages').children.length, 2);
  assert.equal(requests[1].historico.length, 0);
  mentor.setUser(null);
  assert.equal(el('messages').children.length, 0);
  assert.equal(el('question').disabled, true);
});
