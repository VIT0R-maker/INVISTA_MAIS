import express from 'express';
import { HttpError, exigirUsuario } from './auth.js';

const MAX_FAVORITOS = 30;
const TICKER = /^[A-Z]{4}[0-9]{1,2}$/;

export function criarRotasFavoritos({ db, verifyToken }) {
  const router = express.Router();

  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next(db ? undefined : new HttpError(503, 'Banco de dados indisponível no momento.'));
  }, exigirUsuario(verifyToken));

  const ticker = req => {
    const valor = String(req.params.ticker || '').toUpperCase();
    if (!TICKER.test(valor)) throw new HttpError(400, 'Informe um ticker válido (ex.: PETR4, MXRF11).');
    return valor;
  };

  async function alterar(uid, mudar) {
    const ref = db.collection('users').doc(uid);
    return db.runTransaction(async tx => {
      const doc = await tx.get(ref);
      const favoritos = mudar(doc.exists ? doc.data().favoritos ?? [] : []);
      tx.set(ref, { favoritos }, { merge: true });
      return favoritos;
    });
  }

  router.get('/', async (req, res, next) => {
    try {
      const doc = await db.collection('users').doc(req.usuario.uid).get();
      res.json({ favoritos: doc.exists ? doc.data().favoritos ?? [] : [] });
    } catch (error) { next(error); }
  });

  router.put('/:ticker', async (req, res, next) => {
    try {
      const novo = ticker(req);
      const favoritos = await alterar(req.usuario.uid, lista => {
        if (lista.includes(novo)) return lista;
        if (lista.length >= MAX_FAVORITOS) throw new HttpError(409, `Limite de ${MAX_FAVORITOS} favoritos.`);
        return [...lista, novo];
      });
      res.json({ favoritos });
    } catch (error) { next(error); }
  });

  router.delete('/:ticker', async (req, res, next) => {
    try {
      const removido = ticker(req);
      res.json({ favoritos: await alterar(req.usuario.uid, lista => lista.filter(t => t !== removido)) });
    } catch (error) { next(error); }
  });

  router.use((error, _req, res, _next) => {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
    console.error('Erro nas rotas de favoritos:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  });

  return router;
}
