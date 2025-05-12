import { jwtVerify, SignJWT } from 'jose';

// The fixed JWT secret that matches what's in your .dev.vars file
const DEV_JWT_SECRET = "Zq83vN!@uXP4w$Kt9sLrB^AmE5cG1dYz";

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
  
  // 4. Fall back to development secret
  console.warn('JWT_SECRET not found in environment, using development secret');
  return DEV_JWT_SECRET;
}

/**
 * Verify a JWT token
 * @param token The JWT token to verify
 * @param env The environment object, if available
 * @returns The decoded payload
 */
export async function verifyToken(token: string, env?: any) {
  const secretValue = getJwtSecret(env);
  const secret = new TextEncoder().encode(secretValue);
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
  const secret = new TextEncoder().encode(secretValue);
  
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('openhouse3')
    .setAudience('openhouse3-users')
    .setExpirationTime('7d')
    .sign(secret);
} 