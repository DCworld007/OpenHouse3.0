interface CloudflareEnv {
  DB: D1Database;
  CACHE?: KVNamespace;
  MY_TEST_VAR?: string;
  AUTH_SECRET?: string;
  AUTH_RESEND_KEY?: string;
  AUTH_EMAIL_FROM?: string;
  AUTH_URL?: string;
} 