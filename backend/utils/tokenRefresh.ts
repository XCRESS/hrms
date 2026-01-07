/**
 * Token Refresh Utilities
 * Automatically refresh JWT tokens when user data changes
 */

import { regenerateTokenForUser } from './jwt.js';
import logger from './logger.js';

/**
 * Refresh token after user profile update
 * Call this whenever user data that's stored in JWT changes (name, email, role, etc.)
 * 
 * @param userId - User ID whose token needs refreshing
 * @returns New JWT token with updated user data, or null if refresh fails
 * 
 * @example
 * // In user.controllers.ts after updating user
 * const newToken = await refreshUserToken(userId);
 * res.json({ success: true, token: newToken });
 */
export async function refreshUserToken(userId: string): Promise<string | null> {
  try {
    return await regenerateTokenForUser(userId);
  } catch (error) {
    logger.error({ err: error, userId }, 'Failed to refresh user token');
    return null;
  }
}

/**
 * Middleware to automatically include refreshed token in response
 * Use this after operations that modify user data
 * 
 * @example
 * router.patch('/profile', auth, updateProfile, sendRefreshedToken);
 */
export const sendRefreshedToken = async (req: any, res: any, next: any) => {
  if (req.user && req.userDataModified) {
    const newToken = await refreshUserToken(req.user._id.toString());
    if (newToken) {
      // Add new token to response
      const originalJson = res.json.bind(res);
      res.json = function(data: any) {
        return originalJson({ ...data, newToken });
      };
    }
  }
  next();
};
