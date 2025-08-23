import nodemailer from 'nodemailer';
import Settings from '../models/Settings.model.js';

class EmailService {
  constructor() {
    this.transporter = null;
  }

  async initialize() {
    try {
      if (!process.env.EMAIL_APP_PASSWORD || !process.env.EMAIL_USER) {
        console.log('Email service skipped - App Password credentials not provided');
        console.log('Required: EMAIL_APP_PASSWORD, EMAIL_USER');
        return;
      }

      console.log('Initializing email service with App Password...');
      await this.initializeAppPassword();
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Email service initialization failed:', error.message);
      this.transporter = null;
    }
  }

  async initializeAppPassword() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });

    // Test the connection
    await this.transporter.verify();
    console.log('Gmail SMTP with App Password verified successfully');
  }

  async send(to, subject, htmlContent) {
    if (!this.transporter) {
      await this.initialize();
    }

    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"HRMS System" <noreply@hrms.com>',
        to,
        subject,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${to}:`, result.messageId);
      return result;
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error.message);
      throw error;
    }
  }

  async sendToMultiple(emails, subject, htmlContent) {
    const promises = emails.map(email => this.send(email, subject, htmlContent));
    return Promise.allSettled(promises);
  }

  async sendNotification(type, data, recipients) {
    const settings = await Settings.getGlobalSettings();
    if (!settings.notifications.emailEnabled) {
      console.log('Email notifications are disabled');
      return;
    }

    const { subject, htmlContent } = this.getTemplate(type, data);
    
    if (Array.isArray(recipients)) {
      return this.sendToMultiple(recipients, subject, htmlContent);
    } else {
      return this.send(recipients, subject, htmlContent);
    }
  }

  getTemplate(type, data) {
    const templates = {
      leave_request: {
        subject: `New Leave Request - ${data.employee}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>New Leave Request</h2>
            <p><strong>Employee:</strong> ${data.employee}</p>
            <p><strong>Type:</strong> ${data.type}</p>
            <p><strong>Date:</strong> ${new Date(data.date).toDateString()}</p>
            <p><strong>Reason:</strong> ${data.reason}</p>
            <p>Please review and approve/reject in the HRMS system.</p>
          </div>
        `
      },
      help_request: {
        subject: `New Help Request - ${data.employee}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>New Help Request</h2>
            <p><strong>Employee:</strong> ${data.employee}</p>
            <p><strong>Subject:</strong> ${data.subject}</p>
            <p><strong>Category:</strong> ${data.category}</p>
            <p><strong>Priority:</strong> ${data.priority}</p>
            <p><strong>Description:</strong></p>
            <p>${data.description}</p>
            <p>Please respond in the HRMS system.</p>
          </div>
        `
      },
      regularization_request: {
        subject: `New Regularization Request - ${data.employee}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>New Attendance Regularization Request</h2>
            <p><strong>Employee:</strong> ${data.employee}</p>
            <p><strong>Date:</strong> ${new Date(data.date).toDateString()}</p>
            <p><strong>Check-in Time:</strong> ${data.checkIn || 'Not specified'}</p>
            <p><strong>Check-out Time:</strong> ${data.checkOut || 'Not specified'}</p>
            <p><strong>Reason:</strong> ${data.reason}</p>
            <p>Please review and approve/reject in the HRMS system.</p>
          </div>
        `
      },
      holiday_reminder: {
        subject: `Holiday Reminder - ${data.title}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Upcoming Holiday</h2>
            <p><strong>Holiday:</strong> ${data.title}</p>
            <p><strong>Date:</strong> ${data.date}</p>
            <p>The office will be closed on this day. Plan your work accordingly.</p>
          </div>
        `
      },
      announcement: {
        subject: `New Announcement - ${data.title}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>New Announcement</h2>
            <h3>${data.title}</h3>
            <p>${data.content}</p>
            <p><em>- ${data.author}</em></p>
          </div>
        `
      },
      employee_milestone: {
        subject: `Employee Milestone Alert - ${data.employee}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Employee Milestone Alert</h2>
            <p><strong>Employee:</strong> ${data.employee}</p>
            <p><strong>Milestone:</strong> ${data.milestone} work anniversary</p>
            <p><strong>Joining Date:</strong> ${data.joiningDate}</p>
            <p>Consider recognizing this employee's contribution and dedication.</p>
          </div>
        `
      },
      leave_status_update: {
        subject: `Leave Request ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Leave Request Update</h2>
            <p>Your leave request has been <strong>${data.status}</strong>.</p>
            <p><strong>Type:</strong> ${data.type}</p>
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Reason:</strong> ${data.reason}</p>
          </div>
        `
      },
      regularization_status_update: {
        subject: `Regularization Request ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Regularization Request Update</h2>
            <p>Your attendance regularization request has been <strong>${data.status}</strong>.</p>
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Check-in:</strong> ${data.checkIn}</p>
            <p><strong>Check-out:</strong> ${data.checkOut}</p>
            <p><strong>Reason:</strong> ${data.reason}</p>
            ${data.comment ? `<p><strong>Review Comment:</strong> ${data.comment}</p>` : ''}
          </div>
        `
      }
    };

    return templates[type] || {
      subject: 'HRMS Notification',
      htmlContent: '<p>You have a new notification from HRMS.</p>'
    };
  }
}

export default new EmailService();