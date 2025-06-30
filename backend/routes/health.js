import express from 'express';

const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'HRMS Backend',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

export default router;