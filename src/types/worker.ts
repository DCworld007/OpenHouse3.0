export interface Env {
  AUTH_SECRET: string;
  JWT_SECRET: string;
  KV: KVNamespace;
  DB: D1Database;
}
