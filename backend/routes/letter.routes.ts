import express, { type Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/zodValidation.middleware.js';
import {
  createLetter,
  deleteLetter,
  getLetter,
  getLetterPdf,
  getLetterWording,
  issue,
  listLetters,
  myLetters,
  previewLetter,
  previewUnsavedLetter,
  sendLetter,
  updateLetter,
  voidLetter,
} from '../controllers/letter.controllers.js';
import {
  createLetterSchema,
  letterListQuerySchema,
  sendLetterSchema,
  updateLetterSchema,
  voidLetterSchema,
  createTemplateSchema,
  letterIdParamsSchema,
  previewTemplateSchema,
  templateListQuerySchema,
  updateTemplateSchema,
  applyMappingSchema,
} from '../validators/letter.schemas.js';
import {
  createTemplate,
  deactivateTemplate,
  getLetterFields,
  getTemplate,
  listTemplates,
  previewTemplate,
  updateTemplate,
  applyMapping,
} from '../controllers/letterTemplate.controllers.js';

const router: Router = express.Router();
const hr = authMiddleware(['admin', 'hr']);
const id = validateParams(letterIdParamsSchema);

router.get('/fields', hr, getLetterFields);
router.post('/apply-mapping', hr, validateBody(applyMappingSchema), applyMapping);

router.get('/templates', hr, validateQuery(templateListQuerySchema), listTemplates);
router.post('/templates', hr, validateBody(createTemplateSchema), createTemplate);
router.post('/templates/preview', hr, validateBody(previewTemplateSchema), previewTemplate);
router.get('/templates/:id', hr, id, getTemplate);
router.put('/templates/:id', hr, id, validateBody(updateTemplateSchema), updateTemplate);
router.delete('/templates/:id', hr, id, deactivateTemplate);

router.get('/', hr, validateQuery(letterListQuerySchema), listLetters);
router.get('/mine', authMiddleware(['employee', 'hr', 'admin']), myLetters);
router.post('/', hr, validateBody(createLetterSchema), createLetter);
router.post('/preview', hr, validateBody(createLetterSchema), previewUnsavedLetter);
router.get('/:id', hr, id, getLetter);
router.put('/:id', hr, id, validateBody(updateLetterSchema), updateLetter);
router.delete('/:id', hr, id, deleteLetter);
router.get('/:id/wording', hr, id, getLetterWording);
router.post('/:id/preview', hr, id, previewLetter);
router.post('/:id/issue', hr, id, issue);
router.post('/:id/void', hr, id, validateBody(voidLetterSchema), voidLetter);
router.post('/:id/send', hr, id, validateBody(sendLetterSchema), sendLetter);
router.get('/:id/pdf', authMiddleware(['employee', 'hr', 'admin']), id, getLetterPdf);

export default router;
