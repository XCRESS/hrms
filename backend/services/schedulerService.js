import cron from 'node-cron';
import Holiday from '../models/Holiday.model.js';
import Employee from '../models/Employee.model.js';
import Settings from '../models/Settings.model.js';
import NotificationService from './notificationService.js';
import { getISTNow, toIST } from '../utils/timezoneUtils.js';

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

    // Birthday wishes job - runs daily at 8 AM
    this.birthdayJob = cron.schedule('0 8 * * *', async () => {
      await this.checkBirthdayWishes();
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

    if (this.birthdayJob) {
      this.birthdayJob.stop();
      this.birthdayJob = null;
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

      const today = getISTNow().startOf('day').toDate();
      
      const employees = await Employee.find({ isActive: true });
      let milestonesFound = 0;

      for (const employee of employees) {
        const joiningDate = toIST(employee.joiningDate).startOf('day');
        const todayIST = toIST(today).startOf('day');
        
        const daysDiff = todayIST.diff(joiningDate, 'days');
        
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
            joiningDate: joiningDate.format('YYYY-MM-DD'),
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

  async checkBirthdayWishes() {
    try {
      console.log('Checking for birthday wishes to send...');
      
      const settings = await Settings.getGlobalSettings();
      if (!settings.notifications.emailEnabled) {
        console.log('Email notifications are disabled - skipping birthday wishes');
        return;
      }

      const today = getISTNow().toDate(); // Get proper IST date
      const employees = await Employee.find({ 
        isActive: true,
        dateOfBirth: { $exists: true, $ne: null }
      });

      let birthdayCount = 0;

      for (const employee of employees) {
        const birthday = toIST(employee.dateOfBirth);
        const todayIST = toIST(today);
        
        // Check if today matches birthday (month and day) in IST
        if (birthday.month() === todayIST.month() && 
            birthday.date() === todayIST.date()) {
          
          console.log(`Sending birthday wishes to: ${employee.firstName} ${employee.lastName}`);
          
          const age = todayIST.year() - birthday.year();
          
          await NotificationService.notifyEmployee(employee.employeeId, 'birthday_wish', {
            employee: `${employee.firstName} ${employee.lastName}`,
            age: age,
            department: employee.department,
            employeeId: employee.employeeId
          });
          
          birthdayCount++;
        }
      }

      if (birthdayCount > 0) {
        console.log(`Sent ${birthdayCount} birthday wish email(s)`);
      } else {
        console.log('No birthdays today');
      }
    } catch (error) {
      console.error('Error checking birthday wishes:', error);
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

  async triggerBirthdayCheck() {
    console.log('Manually triggering birthday check...');
    await this.checkBirthdayWishes();
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      holidayReminderActive: this.holidayReminderJob ? this.holidayReminderJob.getStatus() === 'scheduled' : false,
      milestoneJobActive: this.milestoneJob ? this.milestoneJob.getStatus() === 'scheduled' : false,
      birthdayJobActive: this.birthdayJob ? this.birthdayJob.getStatus() === 'scheduled' : false
    };
  }
}

export default new SchedulerService();