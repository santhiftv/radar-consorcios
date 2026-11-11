/**
 * Envio de Web Push (RFC 8030 + RFC 8291 + VAPID RFC 8292) usando só o crypto
 * nativo do Node, sem dependências. Gera o header `Authorization` VAPID (JWT
 * ES256 assinado com a chave privada), criptografa o payload com aes128gcm
 * (ECDH P-256 com as chaves efêmeras + HKDF), e faz POST no `endpoint` da
 * subscription.
 *
 * Retorna `ok: true` em 2xx, `gone: true` em 404/410 (subscription inválida —
 * dispatcher desativa), `retriable: true` em outros.
 */
import { createHmac, createPrivateKey, createSign, createECDH, randomBytes } from 'node:crypto';

function b64url(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s: string): Buffer {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function hkdf(ikm: Buffer, salt: Buffer, info: Buffer, length: number): Buffer {
  const prk = createHmac('sha256', salt).update(ikm).digest();
  // Como length <= 32, basta uma iteração
  const t1 = createHmac('sha256', prk).update(Buffer.concat([info, Buffer.from([1])])).digest();
  return t1.subarray(0, length);
}

function derFromRawEcPrivateKey(d32: Buffer, pubUncompressed65: Buffer): Buffer {
  // Monta PKCS8 EC P-256 manualmente
  const header = Buffer.from('308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b0201010420', 'hex');
  const mid = Buffer.from('a14403420004', 'hex'); // [1] BIT STRING uncompressed public key
  const pub = pubUncompressed65.subarray(1); // sem o 0x04 prefix
  return Buffer.concat([header, d32, mid, pub]);
}

// Constrói uma chave privada ES256 a partir de d (32 bytes raw)
function privateKeyFromRaw(d32: Buffer): { pem: string; publicUncompressed: Buffer } {
  const ecdh = createECDH('prime256v1');
  ecdh.setPrivateKey(d32);
  const pub = ecdh.getPublicKey(); // 65 bytes uncompressed
  const der = derFromRawEcPrivateKey(d32, pub);
  const pem =
    '-----BEGIN PRIVATE KEY-----\n' +
    der.toString('base64').replace(/(.{64})/g, '$1\n') +
    '\n-----END PRIVATE KEY-----\n';
  return { pem, publicUncompressed: pub };
}

function signVapidJwt(audience: string, subject: string, privateKeyPem: string, ttlSec = 12 * 60 * 60): string {
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp: Math.floor(Date.now() / 1000) + ttlSec, sub: subject };
  const headerB64 = b64url(Buffer.from(JSON.stringify(header)));
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)));
  const data = `${headerB64}.${payloadB64}`;
  const sign = createSign('SHA256');
  sign.update(data);
  sign.end();
  const derSig = sign.sign({ key: createPrivateKey(privateKeyPem), dsaEncoding: 'ieee-p1363' });
  return `${data}.${b64url(derSig)}`;
}

// Criptografa o payload no esquema aes128gcm (RFC 8188 + RFC 8291)
async function encryptPayload(payload: Buffer, p256dhB64: string, authB64: string) {
  const uaPublic = fromB64url(p256dhB64); // 65 bytes
  const authSecret = fromB64url(authB64); // 16 bytes

  const ecdh = createECDH('prime256v1');
  const asPublic = ecdh.generateKeys(); // 65 bytes uncompressed
  const sharedSecret = ecdh.computeSecret(uaPublic);

  const salt = randomBytes(16);

  // Key info: "WebPush: info\0" | UA public (65) | AS public (65)
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
  const ikm = hkdf(sharedSecret, authSecret, keyInfo, 32);

  const cek = hkdf(ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12);

  // Header do payload: salt(16) || rs(4, big-endian 4096) || idlen(1) || keyid (uncompressed AS public)
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096, 0);
  const header = Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic]);

  // Record final: payload || 0x02 (delimiter indicating last record) — depois criptografa com GCM
  const plain = Buffer.concat([payload, Buffer.from([0x02])]);
  const { createCipheriv } = await import('node:crypto');
  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  const body = Buffer.concat([header, enc, tag]);
  return body;
}

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushResult {
  ok: boolean;
  status: number;
  gone?: boolean; // 404/410 — subscription inválida
  retriable?: boolean;
  error?: string;
}

export async function sendWebPush(
  sub: PushSubscriptionInput,
  payload: Record<string, unknown>,
  vapid: { publicKeyB64: string; privateKeyB64: string; subject: string },
): Promise<PushResult> {
  try {
    const body = await encryptPayload(Buffer.from(JSON.stringify(payload)), sub.p256dh, sub.auth);
    const url = new URL(sub.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const d32 = fromB64url(vapid.privateKeyB64);
    const { pem } = privateKeyFromRaw(d32);
    const jwt = signVapidJwt(audience, vapid.subject, pem);

    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        TTL: '86400',
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        Urgency: 'high',
        Authorization: `vapid t=${jwt}, k=${vapid.publicKeyB64}`,
      },
      body,
    });

    if (res.status === 404 || res.status === 410) {
      return { ok: false, status: res.status, gone: true };
    }
    if (res.status >= 200 && res.status < 300) {
      return { ok: true, status: res.status };
    }
    return { ok: false, status: res.status, retriable: res.status >= 500 || res.status === 429 };
  } catch (e) {
    return { ok: false, status: 0, retriable: true, error: (e as Error).message };
  }
}
