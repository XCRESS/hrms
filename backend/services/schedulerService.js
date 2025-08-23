import cron from 'node-cron';
import Holiday from '../models/Holiday.model.js';
import Employee from '../models/Employee.model.js';
import Settings from '../models/Settings.model.js';
import NotificationService from './notificationService.js';

class SchedulerService {
  constructor() {
    this.holidayReminderJob = null;
    this.milestoneJob = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;

    console.log('Starting scheduler service...');

    // Holiday reminder job - runs daily at 6 PM
    this.holidayReminderJob = cron.schedule('0 18 * * *', async () => {
      await this.checkHolidayReminders();
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });

    // Employee milestone job - runs daily at 9 AM
    this.milestoneJob = cron.schedule('0 9 * * *', async () => {
      await this.checkEmployeeMilestones();
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });

    this.isRunning = true;
    console.log('Scheduler service started successfully');
  }

  stop() {
    if (!this.isRunning) return;

    if (this.holidayReminderJob) {
      this.holidayReminderJob.stop();
      this.holidayReminderJob = null;
    }

    if (this.milestoneJob) {
      this.milestoneJob.stop();
      this.milestoneJob = null;
    }

    this.isRunning = false;
    console.log('Scheduler service stopped');
  }

  async checkHolidayReminders() {
    try {
      console.log('Checking for holiday reminders...');
      
      const settings = await Settings.getGlobalSettings();
      if (!settings.notifications.holidayReminderEnabled) {
        console.log('Holiday reminders are disabled');
        return;
      }

      const reminderDays = settings.notifications.holidayReminderDays;
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + reminderDays);

      // Reset time to start of day for accurate comparison
      reminderDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(reminderDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const holidays = await Holiday.find({
        date: {
          $gte: reminderDate,
          $lt: nextDay
        }
      });

      for (const holiday of holidays) {
        console.log(`Sending holiday reminder for: ${holiday.title}`);
        
        await NotificationService.notifyAllEmployees('holiday_reminder', {
          title: holiday.title,
          date: holiday.date.toDateString(),
          isOptional: holiday.isOptional,
          description: holiday.description
        });
      }

      if (holidays.length > 0) {
        console.log(`Sent ${holidays.length} holiday reminder(s)`);
      }
    } catch (error) {
      console.error('Error checking holiday reminders:', error);
    }
  }

  async checkEmployeeMilestones() {
    try {
      console.log('Checking for employee milestones...');
      
      const settings = await Settings.getGlobalSettings();
      if (!settings.notifications.milestoneAlertsEnabled) {
        console.log('Milestone alerts are disabled');
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const employees = await Employee.find({ isActive: true });
      let milestonesFound = 0;

      for (const employee of employees) {
        const joiningDate = new Date(employee.joiningDate);
        joiningDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today - joiningDate) / (1000 * 60 * 60 * 24));
        
        let milestoneType = null;
        
        // Check for exact milestone matches
        if (settings.notifications.milestoneTypes.threeMonths && daysDiff === 90) {
          milestoneType = '3 months';
        } else if (settings.notifications.milestoneTypes.sixMonths && daysDiff === 180) {
          milestoneType = '6 months';
        } else if (settings.notifications.milestoneTypes.oneYear && daysDiff === 365) {
          milestoneType = '1 year';
        }

        if (milestoneType) {
          console.log(`Employee milestone: ${employee.firstName} ${employee.lastName} - ${milestoneType}`);
          
          await NotificationService.notifyHR('employee_milestone', {
            employee: `${employee.firstName} ${employee.lastName}`,
            employeeId: employee.employeeId,
            milestone: milestoneType,
            joiningDate: joiningDate.toDateString(),
            department: employee.department,
            position: employee.position
          });
          
          milestonesFound++;
        }
      }

      if (milestonesFound > 0) {
        console.log(`Found ${milestonesFound} employee milestone(s)`);
      }
    } catch (error) {
      console.error('Error checking employee milestones:', error);
    }
  }

  // Manual trigger methods for testing
  async triggerHolidayReminder() {
    console.log('Manually triggering holiday reminder check...');
    await this.checkHolidayReminders();
  }

  async triggerMilestoneCheck() {
    console.log('Manually triggering milestone check...');
    await this.checkEmployeeMilestones();
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      holidayReminderActive: this.holidayReminderJob ? this.holidayReminderJob.getStatus() === 'scheduled' : false,
      milestoneJobActive: this.milestoneJob ? this.milestoneJob.getStatus() === 'scheduled' : false
    };
  }
}

export default new SchedulerService();