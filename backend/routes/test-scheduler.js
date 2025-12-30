/**
 * Test endpoint for scheduler debugging
 * TEMPORARY - REMOVE AFTER TESTING
 */

import express from 'express';
import Holiday from '../models/Holiday.model.js';
import Settings from '../models/Settings.model.js';
import schedulerService from '../services/schedulerService.js';
import { parseISTDateString, getISTDayBoundaries, momentToDate, getISTNow } from '../utils/timezoneUtils.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.middlewares.js';

const router = express.Router();

// ADMIN ONLY - Test scheduler endpoint
router.post('/trigger-holiday-test', authenticate, authorizeRoles('admin'), async (req, res) => {
  let testHolidayId = null;
  let originalHrEmails = null;

  try {
    console.log('='.repeat(80));
    console.log('[TEST ENDPOINT] Manual scheduler test triggered');
    console.log('='.repeat(80));

    // Backup and set test email
    const settings = await Settings.findOne();
    originalHrEmails = [...settings.notifications.hrEmails];

    // Set to only your email for testing
    const testEmail = req.body.testEmail || 'veshantdahiya@gmail.com';
    settings.notifications.hrEmails = [testEmail];
    await settings.save();

    console.log(`[TEST] Test email set to: ${testEmail}`);

    // Create test holiday for tomorrow
    const tomorrow = getISTNow().add(1, 'days').format('YYYY-MM-DD');
    const parsedDate = parseISTDateString(tomorrow);
    const { startOfDay } = getISTDayBoundaries(parsedDate);
    const holidayDate = momentToDate(startOfDay);

    console.log(`[TEST] Creating holiday for: ${tomorrow}`);
    console.log(`[TEST] Stored as (UTC): ${holidayDate.toISOString()}`);

    const testHoliday = await Holiday.create({
      title: 'TEST - Scheduler Debug',
      date: holidayDate,
      isOptional: false,
      description: 'Temporary test holiday'
    });

    testHolidayId = testHoliday._id;
    console.log(`[TEST] Holiday created: ${testHolidayId}`);

    // Run scheduler
    console.log('[TEST] Triggering scheduler...');
    await schedulerService.checkHolidayReminders();
    console.log('[TEST] Scheduler completed');

    // Cleanup
    await Holiday.findByIdAndDelete(testHolidayId);
    console.log('[TEST] Test holiday deleted');

    // Restore settings
    settings.notifications.hrEmails = originalHrEmails;
    await settings.save();
    console.log('[TEST] Settings restored');

    console.log('='.repeat(80));

    res.json({
      success: true,
      message: 'Test completed. Check your email and Railway logs.',
      testEmail,
      holidayDate: holidayDate.toISOString(),
      holidayDateIST: holidayDate.toString()
    });

  } catch (error) {
    console.error('[TEST] Error:', error);

    // Cleanup on error
    if (testHolidayId) {
      await Holiday.findByIdAndDelete(testHolidayId).catch(() => {});
    }
    if (originalHrEmails) {
      const settings = await Settings.findOne();
      settings.notifications.hrEmails = originalHrEmails;
      await settings.save().catch(() => {});
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
