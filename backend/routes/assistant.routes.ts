import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { validateBody, validateParams } from '../middlewares/zodValidation.middleware.js';
import {
  createThread,
  deleteThread,
  generateThreadTitle,
  getThread,
  getThreadMessages,
  listThreads,
  saveReceipt,
  updateThread,
} from '../controllers/assistantThread.controllers.js';
import { chat } from '../controllers/assistantChat.controllers.js';
import { sendAssistantEmail } from '../controllers/assistantEmail.controllers.js';
import { downloadAssistantFile, exportTable, handleAssistantUpload, uploadAssistantFile } from '../controllers/assistantFile.controllers.js';
import { assistantLimiter } from '../middlewares/rateLimit.middleware.js';
import {
  chatRequestSchema,
  exportTableSchema,
  saveReceiptSchema,
  sendAssistantEmailSchema,
  threadIdParamsSchema,
  updateThreadSchema,
} from '../validators/assistant.schemas.js';

const router: Router = Router();
// Employees are paused out of HR Buddy for now; their tools stay scoped and ready in services/assistant.
const staff = authMiddleware(['admin', 'hr']);
const threadParams = validateParams(threadIdParamsSchema);

router.post('/chat', staff, assistantLimiter, validateBody(chatRequestSchema), chat);
router.post('/email', authMiddleware(['admin', 'hr']), validateBody(sendAssistantEmailSchema), sendAssistantEmail);
router.post('/files', staff, assistantLimiter, handleAssistantUpload, uploadAssistantFile);
router.get('/files/:id', staff, threadParams, downloadAssistantFile);
router.post('/export', staff, validateBody(exportTableSchema), exportTable);
router.get('/threads', staff, listThreads);
router.post('/threads', staff, createThread);
router.get('/threads/:id', staff, threadParams, getThread);
router.patch('/threads/:id', staff, threadParams, validateBody(updateThreadSchema), updateThread);
router.delete('/threads/:id', staff, threadParams, deleteThread);
router.get('/threads/:id/messages', staff, threadParams, getThreadMessages);
router.post('/threads/:id/title', staff, threadParams, generateThreadTitle);
router.post('/threads/:id/receipts', staff, threadParams, validateBody(saveReceiptSchema), saveReceipt);

export default router;
