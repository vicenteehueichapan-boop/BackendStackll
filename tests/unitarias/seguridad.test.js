import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { hashearContrasena, verificarContrasena } from '../../src/security/contrasenas.js';
import { emitirToken, verificarToken } from '../../src/security/tokens.js';

const clave = Buffer.from(process.env.JWT_SECRETO, 'base64');
const usuario = { id: '019a6f2c-1d2e-7c3b-9a10-5b6c7d8e9f00', versionSesion: 0 };

describe('contraseñas con Argon2id', () => {
  it('guarda un hash Argon2id con sal propia y nunca el texto plano', async () => {
    const primero = await hashearContrasena('Ficticia2026');
    const segundo = await hashearContrasena('Ficticia2026');
    expect(primero).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(primero).not.toContain('Ficticia2026');
    expect(primero).not.toBe(segundo);
  });

  it('acepta la contraseña correcta y rechaza otra', async () => {
    const hash = await hashearContrasena('Ficticia2026');
    expect(await verificarContrasena(hash, 'Ficticia2026')).toBe(true);
    expect(await verificarContrasena(hash, 'ficticia2026')).toBe(false);
  });
});

describe('JWT', () => {
  it('emite sub, iss, aud, iat, exp, jti y ver, sin rol ni datos sensibles', async () => {
    const afirmaciones = await verificarToken(await emitirToken(usuario));
    expect(afirmaciones).toMatchObject({ sub: usuario.id, iss: process.env.JWT_EMISOR, aud: process.env.JWT_AUDIENCIA, ver: 0 });
    expect(afirmaciones.exp - afirmaciones.iat).toBe(Number(process.env.JWT_DURACION_SEGUNDOS));
    expect(afirmaciones).not.toHaveProperty('rol');
  });

  it('rechaza un token con la firma alterada', async () => {
    const token = await emitirToken(usuario);
    const alterado = `${token.slice(0, -2)}${token.endsWith('AA') ? 'BB' : 'AA'}`;
    await expect(verificarToken(alterado)).rejects.toThrow();
  });

  it('rechaza un token vencido', async () => {
    const vencido = await new SignJWT({ ver: 0 }).setProtectedHeader({ alg: 'HS256' }).setSubject(usuario.id)
      .setIssuer(process.env.JWT_EMISOR).setAudience(process.env.JWT_AUDIENCIA).setJti('x')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 1000).setExpirationTime(Math.floor(Date.now() / 1000) - 10).sign(clave);
    await expect(verificarToken(vencido)).rejects.toThrow(/exp/);
  });

  it('rechaza otro destinatario y el algoritmo «none»', async () => {
    const otroDestino = await new SignJWT({ ver: 0 }).setProtectedHeader({ alg: 'HS256' }).setSubject(usuario.id)
      .setIssuer(process.env.JWT_EMISOR).setAudience('otra-app').setJti('x').setIssuedAt().setExpirationTime('5m').sign(clave);
    await expect(verificarToken(otroDestino)).rejects.toThrow(/aud/);

    const cuerpo = Buffer.from(JSON.stringify({ sub: usuario.id, ver: 0 })).toString('base64url');
    const sinFirma = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${cuerpo}.`;
    await expect(verificarToken(sinFirma)).rejects.toThrow();
  });
});
