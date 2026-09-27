import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const bearer = req => /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1];

export function exigirUsuario(verifyToken) {
  return async (req, _res, next) => {
    const token = bearer(req);
    if (!token) return next(new HttpError(401, 'Entre na sua conta para continuar.'));
    let usuario;
    try { usuario = await verifyToken(token); } catch { return next(new HttpError(401, 'Sua sessão expirou. Entre novamente.')); }
    if (!usuario?.uid || usuario.firebase?.sign_in_provider === 'anonymous') {
      return next(new HttpError(401, 'Entre na sua conta para continuar.'));
    }
    req.usuario = { uid: usuario.uid, email: usuario.email_verified === false ? null : usuario.email ?? null };
    next();
  };
}

export function gerarChaveDispositivo() {
  const chave = randomBytes(24).toString('base64url');
  return { chave, hash: hashChave(chave) };
}

export const hashChave = chave => createHash('sha256').update(chave).digest('hex');

export function chaveConfere(req, hashEsperado) {
  const chave = bearer(req);
  if (!chave || typeof hashEsperado !== 'string') return false;
  const recebido = Buffer.from(hashChave(chave), 'hex');
  const esperado = Buffer.from(hashEsperado, 'hex');
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}
