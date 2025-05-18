import { jwtVerify, SignJWT } from 'jose';

// Default placeholder that doesn't contain actual secret material
const PLACEHOLDER_SECRET = "JWT_SECRET_MUST_BE_SET_IN_ENVIRONMENT";

/**
 * Resolves the JWT secret based on environment
 * @param env The environment object, if available
 * @returns The appropriate JWT secret for the current environment
 */
export async function getJwtSecret(env?: any) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Verify a JWT token
 * @param token The JWT token to verify
 * @param env The environment object, if available
 * @returns The decoded payload
 */
export async function verifyToken(token: string, env?: any) {
  // Get the secret key
  const secret = await getJwtSecret(env);
  
  // Don't log the secret length in production
  if (process.env.NODE_ENV === 'development') {
    console.log('[jwt] Secret length:', secret.length);
  }
  
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
  const secret = await getJwtSecret(env);
  
  // Don't log secret details in production
  if (process.env.NODE_ENV === 'development') {
    console.log('[jwt] Using secret to sign, length:', secret.length);
  }
  
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer('openhouse3')
    .setAudience('openhouse3-users')
    .setExpirationTime('7d')
    .sign(secret);
} 