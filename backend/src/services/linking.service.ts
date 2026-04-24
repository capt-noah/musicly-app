// Simple in-memory map: token -> userId
// In production, this should be in Redis or a DB table with TTL
const tokenMap: Map<string, string> = new Map();

/**
 * Generates a unique token for a user and stores it.
 */
export function generateLinkToken(userId: string): string {
  const token = Math.random().toString(36).substring(2, 10).toUpperCase(); // Short 8-char alphanumeric token
  tokenMap.set(token, userId);
  
  // Auto-expire after 10 minutes
  setTimeout(() => {
    tokenMap.delete(token);
  }, 10 * 60 * 1000);

  return token;
}

/**
 * Finds a userId by token and consumes (deletes) it.
 */
export function consumeLinkToken(token: string): string | null {
  const userId = tokenMap.get(token);
  if (userId) {
    tokenMap.delete(token);
    return userId;
  }
  return null;
}
