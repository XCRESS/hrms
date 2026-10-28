import { validateBody } from '../middlewares/zodValidation.middleware.js';
import { chatMessageSchema, clearConversationSchema } from '../validators/content.schemas.js';
/**
 * Chat Routes
 * Defines API endpoints for HR Chatbot functionality
 */

import express, { type Router } from 'express';
import {
  chat,
  getConversationHistory,
  clearConversation,
  chatHealthCheck
} from '../controllers/chat.controllers.js';
import authMiddleware from '../middlewares/auth.middleware.js';

// Create middleware for authenticated users (any role)
const authenticateToken = authMiddleware([]);

const router: Router = express.Router();

/**
 * @route POST /api/chat
 * @desc Send a message to the HR chatbot
 * @access Private (requires authentication)
 * @body {string} message - The user's message
 * @body {string} [conversation_id] - Optional conversation ID to continue existing chat
 */
router.post('/', authenticateToken, validateBody(chatMessageSchema), chat);

/**
 * @route GET /api/chat/history/:conversation_id
 * @desc Get conversation history for a specific session
 * @access Private (requires authentication)
 * @param {string} conversation_id - The conversation ID
 */
router.get('/history/:conversation_id', authenticateToken, getConversationHistory);

/**
 * @route DELETE /api/chat/clear/:conversation_id
 * @desc Clear a specific conversation
 * @access Private (requires authentication)
 * @param {string} conversation_id - The conversation ID to clear
 */
router.delete('/clear/:conversation_id', authenticateToken, validateBody(clearConversationSchema), clearConversation);

/**
 * @route DELETE /api/chat/clear
 * @desc Clear all conversations (admin only)
 * @access Private (requires authentication)
 * @body {boolean} clear_all - Flag to confirm clearing all conversations
 */
router.delete('/clear', authenticateToken, validateBody(clearConversationSchema), clearConversation);

/**
 * @route GET /api/chat/health
 * @desc Check chat service health and configuration
 * @access Private (requires authentication)
 */
router.get('/health', authenticateToken, chatHealthCheck);

export default router;
