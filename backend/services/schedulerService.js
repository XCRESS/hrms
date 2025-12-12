import cron from 'node-cron';
import Holiday from '../models/Holiday.model.js';
import Employee from '../models/Employee.model.js';
import Attendance from '../models/Attendance.model.js';
import Settings from '../models/Settings.model.js';
import NotificationService from './notificationService.js';
import EmailService from './emailService.js';
import { getISTNow, toIST } from '../utils/timezoneUtils.js';

class SchedulerService {
  constructor() {
    this.holidayReminderJob = null;
    this.milestoneJob = null;
    this.birthdayJob = null;
    this.dailyHrAttendanceReportJob = null;
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

    if (this.dailyHrAttendanceReportJob) {
      this.dailyHrAttendanceReportJob.stop();
      this.dailyHrAttendanceReportJob = null;
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
        
        // Calculate months between joining date and today
        const monthsDiff = todayIST.year() * 12 + todayIST.month() - (joiningDate.year() * 12 + joiningDate.month());
        
        let milestoneType = null;
        
        // Check for exact milestone matches using calendar months and same day
        const isSameDay = todayIST.date() === joiningDate.date();
        
        if (isSameDay) {
          if (settings.notifications.milestoneTypes.threeMonths && monthsDiff === 3) {
            milestoneType = '3 months';
          } else if (settings.notifications.milestoneTypes.sixMonths && monthsDiff === 6) {
            milestoneType = '6 months';
          } else if (settings.notifications.milestoneTypes.oneYear && monthsDiff === 12) {
            milestoneType = '1 year';
          }
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

  async scheduleDailyHrAttendanceReport() {
    try {
      // Stop existing job if running
      if (this.dailyHrAttendanceReportJob) {
        this.dailyHrAttendanceReportJob.stop();
        this.dailyHrAttendanceReportJob = null;
      }

      // Get settings
      const settings = await Settings.getGlobalSettings();

      if (!settings.notifications.dailyHrAttendanceReport.enabled) {
        console.log('[Scheduler] Daily HR attendance report is disabled');
        return;
      }

      const sendTime = settings.notifications.dailyHrAttendanceReport.sendTime; // e.g., "19:00"
      const [hour, minute] = sendTime.split(':');

      // Create cron expression: "minute hour * * *"
      const cronExpression = `${minute} ${hour} * * *`;

      this.dailyHrAttendanceReportJob = cron.schedule(
        cronExpression,
        async () => {
          console.log(`[Scheduler] Running daily HR attendance report at ${sendTime} IST`);
          await this.sendDailyHrAttendanceReport();
        },
        {
          scheduled: true,
          timezone: 'Asia/Kolkata'
        }
      );

      console.log(`[Scheduler] Daily HR attendance report scheduled at ${sendTime} IST`);
    } catch (error) {
      console.error('[Scheduler] Failed to schedule daily HR attendance report:', error);
    }
  }

  async sendDailyHrAttendanceReport() {
    try {
      const settings = await Settings.getGlobalSettings();

      if (!settings.notifications.emailEnabled) {
        console.log('[Scheduler] Email notifications are disabled');
        return;
      }

      const hrEmails = settings.notifications.hrEmails;
      if (!hrEmails || hrEmails.length === 0) {
        console.log('[Scheduler] No HR emails configured');
        return;
      }

      // Get today's date in IST
      const today = getISTNow().startOf('day').toDate();
      const reportDateFormatted = toIST(today).format('MMMM D, YYYY');

      // Fetch all active employees
      const employees = await Employee.find({ isActive: true })
        .select('firstName lastName officeAddress')
        .lean();

      // Fetch all attendance records for today
      const attendanceRecords = await Attendance.find({ date: today })
        .lean();

      // Create attendance map: employeeId -> attendance record
      const attendanceMap = new Map();
      attendanceRecords.forEach(record => {
        attendanceMap.set(record.employee.toString(), record);
      });

      // Group by office
      const officeGroups = {};

      for (const employee of employees) {
        const officeAddress = employee.officeAddress || 'Unassigned';

        if (!officeGroups[officeAddress]) {
          officeGroups[officeAddress] = {
            officeAddress: officeAddress,
            presentEmployees: [],
            absentEmployees: []
          };
        }

        const group = officeGroups[officeAddress];
        const attendance = attendanceMap.get(employee._id.toString());
        const employeeName = `${employee.firstName} ${employee.lastName}`;

        if (attendance) {
          // Employee checked in
          group.presentEmployees.push({
            name: employeeName,
            checkIn: attendance.checkIn ? toIST(attendance.checkIn).format('hh:mm A') : null,
            checkOut: attendance.checkOut ? toIST(attendance.checkOut).format('hh:mm A') : null
          });
        } else if (settings.notifications.dailyHrAttendanceReport.includeAbsentees) {
          // Employee absent
          group.absentEmployees.push({
            name: employeeName
          });
        }
      }

      // Sort employees by name within each group
      Object.values(officeGroups).forEach(group => {
        group.presentEmployees.sort((a, b) => a.name.localeCompare(b.name));
        group.absentEmployees.sort((a, b) => a.name.localeCompare(b.name));
      });

      // Convert to array and sort by office name
      const officeGroupsArray = Object.values(officeGroups)
        .sort((a, b) => {
          if (a.officeAddress === 'Unassigned') return 1;
          if (b.officeAddress === 'Unassigned') return -1;
          return a.officeAddress.localeCompare(b.officeAddress);
        });

      // Calculate totals
      let totalPresent = 0;
      let totalAbsent = 0;
      officeGroupsArray.forEach(group => {
        totalPresent += group.presentEmployees.length;
        totalAbsent += group.absentEmployees.length;
      });

      // Prepare email data
      const subjectLine = settings.notifications.dailyHrAttendanceReport.subjectLine.replace('{date}', reportDateFormatted);

      const emailData = {
        reportDateFormatted,
        officeGroups: officeGroupsArray,
        totalEmployees: employees.length,
        totalPresent,
        totalAbsent,
        generatedAt: getISTNow().format('hh:mm A'),
        subjectLine
      };

      // Get email template
      const { subject, htmlContent } = EmailService.getTemplate('daily_hr_attendance_report', emailData);

      // Send to all HR emails
      let sentCount = 0;
      let failedCount = 0;

      for (const hrEmail of hrEmails) {
        try {
          await EmailService.send(hrEmail, subject, htmlContent);
          sentCount++;
          console.log(`[Scheduler] Sent daily HR attendance report to ${hrEmail}`);
        } catch (error) {
          console.error(`[Scheduler] Failed to send report to ${hrEmail}:`, error);
          failedCount++;
        }

        // Rate limiting: 600ms between emails
        if (sentCount + failedCount < hrEmails.length) {
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      }

      console.log(`[Scheduler] Daily HR attendance report sent: ${sentCount} successful, ${failedCount} failed`);
    } catch (error) {
      console.error('[Scheduler] Error in sendDailyHrAttendanceReport:', error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      holidayReminderActive: this.holidayReminderJob ? this.holidayReminderJob.getStatus() === 'scheduled' : false,
      milestoneJobActive: this.milestoneJob ? this.milestoneJob.getStatus() === 'scheduled' : false,
      birthdayJobActive: this.birthdayJob ? this.birthdayJob.getStatus() === 'scheduled' : false,
      dailyHrAttendanceReportActive: this.dailyHrAttendanceReportJob ? this.dailyHrAttendanceReportJob.getStatus() === 'scheduled' : false
    };
  }
}

export default new SchedulerService();