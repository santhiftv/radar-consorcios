/** Tipos compartilhados pelos serviços (injeção de dependências para testes). */

export interface RpcError {
  message: string;
  code?: string;
}

export type RpcResult<T> = { data: T | null; error: RpcError | null };

/** Compatível com supabase.rpc(fn, args). */
export type Rpc = <T = unknown>(fn: string, args?: Record<string, unknown>) => PromiseLike<RpcResult<T>>;

export interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

export interface ServiceResponse<B = Record<string, unknown>> {
  status: number;
  body: B;
}

export const silentLogger: Logger = { info() {}, warn() {}, error() {} };

/** Extrai o código de negócio (ex.: CONSENT_REQUIRED) de uma mensagem do Postgres. */
export function businessCode(err: RpcError | null | undefined): string | null {
  if (!err?.message) return null;
  const m = /^([A-Z][A-Z_]{3,})/.exec(err.message.trim());
  return m ? m[1]! : null;
}
