import { jwtVerify, SignJWT } from 'jose';

// Default placeholder that doesn't contain actual secret material
const PLACEHOLDER_SECRET = "JWT_SECRET_MUST_BE_SET_IN_ENVIRONMENT";

/**
 * Resolves the JWT secret based on environment
 * @param env The environment object, if available
 * @returns The appropriate JWT secret for the current environment
 */
export function getJwtSecret(env?: any): string {
  // 1. Try to get from env parameter (Cloudflare Workers)
  if (env?.JWT_SECRET) {
    return env.JWT_SECRET;
  }
  
  // 2. Try to get from process.env (Node.js/Next.js)
  if (process?.env?.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  
  // 3. Try to get from globalThis (Cloudflare Workers runtime)
  if ((globalThis as any).JWT_SECRET) {
    return (globalThis as any).JWT_SECRET;
  }
  
  // 4. Warn about missing secret and use placeholder for development
  if (process.env.NODE_ENV === 'development') {
    console.warn('WARNING: JWT_SECRET not found in environment. Using insecure placeholder for development only.');
    return PLACEHOLDER_SECRET;
  }
  
  // For production, throw an error if no secret is found
  throw new Error('JWT_SECRET environment variable is required but not set');
}

/**
 * Verify a JWT token
 * @param token The JWT token to verify
 * @param env The environment object, if available
 * @returns The decoded payload
 */
export async function verifyToken(token: string, env?: any) {
  // Get the secret key
  const secretValue = getJwtSecret(env);
  
  // Don't log the secret length in production
  if (process.env.NODE_ENV === 'development') {
    console.log('[jwt] Secret length:', secretValue.length);
  }
  
  const secret = new TextEncoder().encode(secretValue);
  
  // For debugging, log token parts without verification
  if (process.env.NODE_ENV === 'development') {
    try {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(atob(parts[1]));
        console.log('[jwt] Token payload (unverified):', payload);
      }
    } catch (e) {
      console.error('[jwt] Failed to decode token parts:', e);
    }
  }
  
  // Perform verification
  return await jwtVerify(token, secret);
}

/**
 * Sign a new JWT token
 * @param payload The payload to sign
 * @param env The environment object, if available
 * @returns The signed JWT token
 */
export async function signToken(payload: any, env?: any) {
  const secretValue = getJwtSecret(env);
  
  // Don't log secret details in production
  if (process.env.NODE_ENV === 'development') {
    console.log('[jwt] Using secret to sign, length:', secretValue.length);
  }
  
  const secret = new TextEncoder().encode(secretValue);
  
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer('openhouse3')
    .setAudience('openhouse3-users')
    .setExpirationTime('7d')
    .sign(secret);
} 