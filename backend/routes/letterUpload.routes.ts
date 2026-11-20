import express, { type Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { validateBody, validateParams } from '../middlewares/zodValidation.middleware.js';
import { companyParamsSchema, letterheadBodySchema } from '../validators/letter.schemas.js';
import { getLetterhead, handleLetterheadUpload, previewLetterhead, saveLetterhead } from '../controllers/letterhead.controllers.js';
import { handleDocxUpload, importDocx } from '../controllers/letterTemplate.controllers.js';

// Mounted at /api/letters before express.json(). Auth stays per route: unmatched
// requests must fall through to the JSON letters router mounted later.
const router: Router = express.Router();
const hr = authMiddleware(['admin', 'hr']);

router.get('/letterheads/:companyId', hr, validateParams(companyParamsSchema), getLetterhead);
router.put('/letterheads/:companyId', hr, validateParams(companyParamsSchema), handleLetterheadUpload, validateBody(letterheadBodySchema), saveLetterhead);
router.post('/letterheads/:companyId/preview', hr, validateParams(companyParamsSchema), previewLetterhead);
router.post('/import-docx', hr, handleDocxUpload, importDocx);

export default router;
