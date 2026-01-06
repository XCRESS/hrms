/**
 * Test endpoint for scheduler debugging
 * TEMPORARY - REMOVE AFTER TESTING
 */

import express, { type Router } from 'express';
import Holiday from '../models/Holiday.model.js';
import Settings from '../models/Settings.model.js';
import schedulerService from '../services/schedulerService.js';
import { parseISTDateString, getISTDayBoundaries, dateTimeToJSDate, getISTNow } from '../utils/timezone.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import type { IAuthRequest } from '../types/index.js';
import type { Response } from 'express';
import logger from '../utils/logger.js';

const router: Router = express.Router();

// ADMIN ONLY - Test scheduler endpoint
router.post('/trigger-holiday-test', authMiddleware(['admin']), async (req: IAuthRequest, res: Response) => {
  let testHolidayId = null;
  let originalHrEmails = null;

  try {
    logger.info('='.repeat(80));
    logger.info('[TEST ENDPOINT] Manual scheduler test triggered');
    logger.info('='.repeat(80));

    // Backup and set test email
    const settings = await Settings.findOne();
    if (!settings) {
      throw new Error('Settings not found');
    }
    originalHrEmails = [...settings.notifications.hrEmails];

    // Set to only your email for testing
    const testEmail = req.body.testEmail || 'veshantdahiya@gmail.com';
    settings.notifications.hrEmails = [testEmail];
    await settings.save();

    logger.info(`[TEST] Test email set to: ${testEmail}`);

    // Create test holiday for tomorrow
    const tomorrow = getISTNow().plus({ days: 1 }).toFormat('yyyy-MM-dd');
    const parsedDate = parseISTDateString(tomorrow);
    const { startOfDay } = getISTDayBoundaries(parsedDate);
    const holidayDate = dateTimeToJSDate(startOfDay);

    logger.info(`[TEST] Creating holiday for: ${tomorrow}`);
    logger.info(`[TEST] Stored as (UTC): ${holidayDate.toISOString()}`);

    const testHoliday = await Holiday.create({
      title: 'TEST - Scheduler Debug',
      date: holidayDate,
      isOptional: false,
      description: 'Temporary test holiday'
    });

    testHolidayId = testHoliday._id;
    logger.info(`[TEST] Holiday created: ${testHolidayId}`);

    // Run scheduler
    logger.info('[TEST] Triggering scheduler...');
    await schedulerService.checkHolidayReminders();
    logger.info('[TEST] Scheduler completed');

    // Cleanup
    await Holiday.findByIdAndDelete(testHolidayId);
    logger.info('[TEST] Test holiday deleted');

    // Restore settings
    settings.notifications.hrEmails = originalHrEmails;
    await settings.save();
    logger.info('[TEST] Settings restored');

    logger.info('='.repeat(80));

    res.json({
      success: true,
      message: 'Test completed. Check your email and Railway logs.',
      testEmail,
      holidayDate: holidayDate.toISOString(),
      holidayDateIST: holidayDate.toString()
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, '[TEST] Error');

    // Cleanup on error
    if (testHolidayId) {
      await Holiday.findByIdAndDelete(testHolidayId).catch(() => {});
    }
    if (originalHrEmails) {
      const settings = await Settings.findOne();
      if (settings) {
        settings.notifications.hrEmails = originalHrEmails;
        await settings.save().catch(() => {});
      }
    }

    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

export default router;
