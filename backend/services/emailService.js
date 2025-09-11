import { Resend } from 'resend';
import Settings from '../models/Settings.model.js';

class EmailService {
  constructor() {
    this.resend = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.log('Email service skipped - Resend API key not provided');
        console.log('Required: RESEND_API_KEY (sign up at https://resend.com)');
        return;
      }

      console.log('Initializing email service with Resend API...');
      
      this.resend = new Resend(process.env.RESEND_API_KEY);
      
      // Test the API key by attempting to get account info
      try {
        // Simple test - if API key is invalid, this will throw
        await this.resend.domains.list();
        this.initialized = true;
        console.log('Resend email service initialized successfully');
      } catch (error) {
        // If domains call fails but API key might be valid, mark as initialized
        // (some Resend accounts might not have domains set up yet)
        if (error.message.includes('API key')) {
          throw error; // Re-throw if it's definitely an API key issue
        }
        this.initialized = true;
        console.log('Resend email service initialized (domain verification skipped)');
      }
      
    } catch (error) {
      console.error('Email service initialization failed:', error.message);
      console.log('Email service will be disabled. Emails will not be sent.');
      console.log('Check your RESEND_API_KEY at https://resend.com/api-keys');
      this.resend = null;
      this.initialized = false;
    }
  }


  async send(to, subject, htmlContent) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized || !this.resend) {
      throw new Error('Email service not initialized');
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'HRMS System <onboarding@resend.dev>',
        to: [to],
        subject,
        html: htmlContent
      });

      if (error) {
        console.error(`Failed to send email to ${to}:`, error);
        throw new Error(`Email sending failed: ${JSON.stringify(error)}`);
      }

      console.log(`Email sent to ${to} via Resend:`, data.id);
      return { data, error };
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error.message);
      throw error;
    }
  }

  async sendToMultiple(emails, subject, htmlContent) {
    const results = [];
    const delay = 600; // 600ms delay between emails (safer than 500ms for 2/second limit)
    
    console.log(`Sending ${emails.length} emails with rate limiting...`);
    
    for (let i = 0; i < emails.length; i++) {
      try {
        // Add delay between emails (except for the first one)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const result = await this.send(emails[i], subject, htmlContent);
        results.push({ status: 'fulfilled', value: result });
        
        console.log(`Progress: ${i + 1}/${emails.length} emails sent`);
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
        console.error(`Failed to send email ${i + 1}/${emails.length} to ${emails[i]}:`, error.message);
      }
    }
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`Email batch completed: ${successful} successful, ${failed} failed`);
    
    return results;
  }

  async sendBatchWithCallback(emailCallbacks) {
    const results = [];
    const delay = 600; // 600ms delay between emails
    
    console.log(`Processing ${emailCallbacks.length} email operations with rate limiting...`);
    
    for (let i = 0; i < emailCallbacks.length; i++) {
      try {
        // Add delay between emails (except for the first one)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const result = await emailCallbacks[i]();
        results.push({ status: 'fulfilled', value: result });
        
        console.log(`Progress: ${i + 1}/${emailCallbacks.length} operations completed`);
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
        console.error(`Failed operation ${i + 1}/${emailCallbacks.length}:`, error.message);
      }
    }
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`Batch operations completed: ${successful} successful, ${failed} failed`);
    
    return results;
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
        subject: `Leave Request ${data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1) : 'Update'}`,
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
        subject: `Regularization Request ${data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1) : 'Update'}`,
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
      },
      birthday_wish: {
        subject: `🎉 Happy Birthday ${data.employee}!`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px;">
            <div style="text-align: center; padding: 20px;">
              <h1 style="font-size: 2.5em; margin: 0; color: #fff;">🎉 Happy Birthday! 🎉</h1>
              <h2 style="color: #fff; margin: 10px 0;">${data.employee}</h2>
              <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="font-size: 1.2em; margin: 0;">Wishing you a wonderful birthday and an amazing year ahead!</p>
                ${data.age ? `<p style="margin: 10px 0;">Celebrating ${data.age} years of awesomeness! 🎂</p>` : ''}
                ${data.department ? `<p style="margin: 10px 0;">From your ${data.department} team and the entire HRMS family</p>` : ''}
              </div>
              <div style="margin-top: 20px;">
                <p style="font-size: 1.1em; margin: 5px 0;">🎁 May this special day bring you joy and happiness</p>
                <p style="font-size: 1.1em; margin: 5px 0;">🌟 Here's to another year of great achievements</p>
                <p style="font-size: 1.1em; margin: 5px 0;">🎈 Enjoy your celebration!</p>
              </div>
            </div>
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