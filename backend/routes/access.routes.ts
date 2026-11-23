import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { validateBody, validateQuery } from '../middlewares/zodValidation.middleware.js';
import { teamQuerySchema, upsertAccessGrantSchema } from '../validators/access.schemas.js';
import {
  getMyAccess,
  getTeamMembers,
  listAccessGrants,
  upsertAccessGrant,
  deleteAccessGrant,
} from '../controllers/access.controllers.js';

const router: Router = Router();

router.get('/me', authMiddleware(), getMyAccess);
router.get('/team', authMiddleware(), validateQuery(teamQuerySchema), getTeamMembers);

router.get('/grants', authMiddleware(['admin']), listAccessGrants);
router.put('/grants', authMiddleware(['admin']), validateBody(upsertAccessGrantSchema), upsertAccessGrant);
router.delete('/grants/:id', authMiddleware(['admin']), deleteAccessGrant);

export default router;
