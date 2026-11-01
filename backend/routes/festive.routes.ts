import express, { type Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/zodValidation.middleware.js';
import {
  festiveGameParamsSchema,
  finishFestiveGameSchema,
  festiveLeaderboardQuerySchema,
} from '../validators/festive.schemas.js';
import { startFestiveGame, finishFestiveGame, getFestiveLeaderboard } from '../controllers/festive.controllers.js';

const router: Router = express.Router();

router.use(authMiddleware());

router.post('/:instanceId/:game/start', validateParams(festiveGameParamsSchema), startFestiveGame);
router.post(
  '/:instanceId/:game/finish',
  validateParams(festiveGameParamsSchema),
  validateBody(finishFestiveGameSchema),
  finishFestiveGame
);
router.get(
  '/:instanceId/:game/leaderboard',
  validateParams(festiveGameParamsSchema),
  validateQuery(festiveLeaderboardQuerySchema),
  getFestiveLeaderboard
);

export default router;
