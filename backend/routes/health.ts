import express, { type Router } from 'express';
import type { Request, Response } from 'express';

const router: Router = express.Router();

// Health check endpoint
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'HRMS Backend',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

export default router;
