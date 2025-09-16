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

  getEmailHeader() {
    return `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 0; text-align: center; margin-bottom: 30px;">
        <div style="max-width: 600px; margin: 0 auto;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 0.5px;">
            📊 HRMS System
          </h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 5px 0 0 0; font-size: 14px;">
            Human Resource Management System
          </p>
        </div>
      </div>
    `;
  }

  getEmailFooter() {
    return `
      <div style="margin-top: 40px; padding: 25px 0; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 13px;">
        <p style="margin: 0 0 8px 0;">This is an automated message from HRMS System</p>
        <p style="margin: 0; font-size: 12px;">Please do not reply to this email</p>
        <div style="margin-top: 15px; font-size: 12px;">
          <span style="color: #94a3b8;">© ${new Date().getFullYear()} HRMS System. All rights reserved.</span>
        </div>
      </div>
    `;
  }

  getBaseEmailTemplate(content) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HRMS Notification</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
              margin: 0 !important;
            }
            .content-padding {
              padding: 20px 15px !important;
            }
            .header-padding {
              padding: 20px 15px !important;
            }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155;">
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
          ${this.getEmailHeader()}
          <div class="content-padding" style="padding: 0 40px 40px 40px;">
            ${content}
          </div>
          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;
  }

  getStatusBadge(status) {
    const statusColors = {
      approved: '#10b981',
      rejected: '#ef4444',
      pending: '#f59e0b',
      completed: '#10b981',
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981'
    };
    
    const color = statusColors[status?.toLowerCase()] || '#6b7280';
    
    return `
      <span style="
        display: inline-block;
        background-color: ${color};
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      ">${status}</span>
    `;
  }

  getActionButton(text, color = '#667eea') {
    return `
      <div style="text-align: center; margin: 25px 0;">
        <a href="#" style="
          display: inline-block;
          background-color: ${color};
          color: white;
          text-decoration: none;
          padding: 12px 30px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transition: background-color 0.2s;
        ">${text}</a>
      </div>
    `;
  }

  getInfoCard(items) {
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
          <strong style="color: #475569; font-size: 14px;">${item.label}:</strong>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">
          <span style="color: #1e293b; font-size: 14px;">${item.value}</span>
        </td>
      </tr>
    `).join('');

    return `
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea;">
        <table style="width: 100%; border-collapse: collapse;">
          ${itemsHtml}
        </table>
      </div>
    `;
  }

  getTemplate(type, data) {
    const templates = {
      leave_request: () => ({
        subject: `🏖️ New Leave Request - ${data.employee}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">🏖️</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">New Leave Request</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Requires your attention</p>
          </div>
          
          ${this.getInfoCard([
            { label: 'Employee', value: data.employee },
            { label: 'Leave Type', value: data.type },
            { label: 'Date', value: new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
            { label: 'Reason', value: data.reason }
          ])}
          
          <div style="background: linear-gradient(135deg, #fef3c7, #fed7aa); border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">
              ⚡ Action Required: Please review and approve/reject this request in the HRMS system.
            </p>
          </div>
          
          ${this.getActionButton('Review Request', '#10b981')}
        `)
      }),

      help_request: () => ({
        subject: `🆘 New Help Request - ${data.employee}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">🆘</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">New Help Request</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Employee needs assistance</p>
          </div>
          
          ${this.getInfoCard([
            { label: 'Employee', value: data.employee },
            { label: 'Subject', value: data.subject },
            { label: 'Category', value: data.category },
            { label: 'Priority', value: this.getStatusBadge(data.priority) }
          ])}
          
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h4 style="color: #1e293b; margin: 0 0 10px 0; font-size: 16px;">Description:</h4>
            <p style="color: #475569; margin: 0; font-size: 14px; line-height: 1.6;">${data.description}</p>
          </div>
          
          ${this.getActionButton('Respond in HRMS', '#3b82f6')}
        `)
      }),  

      regularization_request: () => ({
        subject: `⏰ New Regularization Request - ${data.employee}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">⏰</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">Attendance Regularization Request</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Requires approval</p>
          </div>
          
          ${this.getInfoCard([
            { label: 'Employee', value: data.employee },
            { label: 'Date', value: new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
            { label: 'Check-in Time', value: data.checkIn || 'Not specified' },
            { label: 'Check-out Time', value: data.checkOut || 'Not specified' },
            { label: 'Reason', value: data.reason }
          ])}
          
          <div style="background: linear-gradient(135deg, #fef3c7, #fed7aa); border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">
              ⚡ Action Required: Please review and approve/reject this regularization request.
            </p>
          </div>
          
          ${this.getActionButton('Review Request', '#8b5cf6')}
        `)
      }),

      holiday_reminder: () => ({
        subject: `🏖️ Holiday Reminder - ${data.title}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #06b6d4, #0891b2); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">🏖️</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">Upcoming Holiday</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Plan your work accordingly</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #dbeafe, #bfdbfe); border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0; border: 2px solid #60a5fa;">
            <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 22px; font-weight: 700;">${data.title}</h3>
            <p style="color: #1e40af; margin: 0; font-size: 18px; font-weight: 600;">${data.date}</p>
            ${data.description ? `<p style="color: #3730a3; margin: 15px 0 0 0; font-size: 14px; font-style: italic;">${data.description}</p>` : ''}
            ${data.isOptional ? `<div style="margin-top: 15px;">${this.getStatusBadge('Optional Holiday')}</div>` : ''}
          </div>
          
          <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #06b6d4; text-align: center;">
            <p style="margin: 0; color: #0c4a6e; font-size: 16px; font-weight: 500;">
              🏢 The office will be closed on this day
            </p>
            <p style="margin: 5px 0 0 0; color: #075985; font-size: 14px;">
              Please plan your work schedule accordingly
            </p>
          </div>
        `)
      }),

      announcement: () => ({
        subject: `📢 ${data.title}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">📢</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">New Announcement</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Important update from management</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #fefbeb, #fef3c7); border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 20px; font-weight: 700;">${data.title}</h3>
            <div style="color: #78350f; font-size: 16px; line-height: 1.7;">
              ${data.content.split('\n').map(paragraph => `<p style="margin: 0 0 15px 0;">${paragraph}</p>`).join('')}
            </div>
            <div style="text-align: right; margin-top: 20px; padding-top: 15px; border-top: 1px solid #fed7aa;">
              <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: 600;">— ${data.author}</p>
            </div>
          </div>
          
          <div style="background: #fffbeb; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b; text-align: center;">
            <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">
              📋 This announcement is also available in your HRMS dashboard
            </p>
          </div>
        `)
      }),

      employee_milestone: () => ({
        subject: `🏆 Employee Milestone Alert - ${data.employee}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">🏆</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">Employee Milestone Achievement</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Time to celebrate!</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #fefbeb, #fef3c7); border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0; border: 2px solid #f59e0b;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 22px; font-weight: 700;">🎉 ${data.employee}</h3>
            <p style="color: #78350f; margin: 0; font-size: 18px; font-weight: 600;">has completed ${data.milestone} with the company!</p>
            ${data.department ? `<p style="color: #92400e; margin: 10px 0 0 0; font-size: 14px;">${data.department} Department</p>` : ''}
          </div>
          
          ${this.getInfoCard([
            { label: 'Employee', value: data.employee },
            { label: 'Employee ID', value: data.employeeId },
            { label: 'Milestone', value: data.milestone + ' work anniversary' },
            { label: 'Joining Date', value: new Date(data.joiningDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
            ...(data.department ? [{ label: 'Department', value: data.department }] : []),
            ...(data.position ? [{ label: 'Position', value: data.position }] : [])
          ])}
          
          <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; text-align: center;">
            <p style="margin: 0; color: #065f46; font-size: 16px; font-weight: 500;">
              🎊 Consider recognizing this employee's contribution and dedication
            </p>
            <p style="margin: 5px 0 0 0; color: #047857; font-size: 14px;">
              A milestone like this deserves celebration and appreciation
            </p>
          </div>
        `)
      }),

      leave_status_update: () => ({
        subject: `📋 Leave Request ${data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1) : 'Update'}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">📋</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">Leave Request Update</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Status notification</p>
          </div>
          
          <div style="text-align: center; margin: 25px 0;">
            <p style="color: #475569; font-size: 18px; margin: 0 0 10px 0;">Your leave request has been</p>
            <div style="margin: 10px 0;">
              ${this.getStatusBadge(data.status)}
            </div>
          </div>
          
          ${this.getInfoCard([
            { label: 'Leave Type', value: data.type },
            { label: 'Date', value: data.date },
            { label: 'Reason', value: data.reason },
            { label: 'Status', value: data.status }
          ])}
          
          <div style="background: ${data.status === 'approved' ? '#ecfdf5' : data.status === 'rejected' ? '#fef2f2' : '#fefbeb'}; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${data.status === 'approved' ? '#10b981' : data.status === 'rejected' ? '#ef4444' : '#f59e0b'}; text-align: center;">
            <p style="margin: 0; color: ${data.status === 'approved' ? '#065f46' : data.status === 'rejected' ? '#991b1b' : '#92400e'}; font-size: 16px; font-weight: 500;">
              ${data.status === 'approved' ? '✅ Your leave has been approved!' : data.status === 'rejected' ? '❌ Your leave request was not approved' : '⏳ Your leave request is under review'}
            </p>
            ${data.comment ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid ${data.status === 'approved' ? '#a7f3d0' : data.status === 'rejected' ? '#fca5a5' : '#fed7aa'};">
                <p style="margin: 0; color: ${data.status === 'approved' ? '#047857' : data.status === 'rejected' ? '#7f1d1d' : '#78350f'}; font-size: 14px; font-weight: 500;">Review Comment:</p>
                <p style="margin: 5px 0 0 0; color: ${data.status === 'approved' ? '#065f46' : data.status === 'rejected' ? '#991b1b' : '#92400e'}; font-size: 14px;">${data.comment}</p>
              </div>
            ` : ''}
          </div>
        `)
      }),

      regularization_status_update: () => ({
        subject: `⏰ Regularization Request ${data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1) : 'Update'}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">⏰</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">Regularization Update</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Attendance regularization status</p>
          </div>
          
          <div style="text-align: center; margin: 25px 0;">
            <p style="color: #475569; font-size: 18px; margin: 0 0 10px 0;">Your regularization request has been</p>
            <div style="margin: 10px 0;">
              ${this.getStatusBadge(data.status)}
            </div>
          </div>
          
          ${this.getInfoCard([
            { label: 'Date', value: data.date },
            { label: 'Check-in', value: data.checkIn },
            { label: 'Check-out', value: data.checkOut },
            { label: 'Reason', value: data.reason },
            { label: 'Status', value: data.status }
          ])}
          
          <div style="background: ${data.status === 'approved' ? '#ecfdf5' : data.status === 'rejected' ? '#fef2f2' : '#fefbeb'}; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${data.status === 'approved' ? '#10b981' : data.status === 'rejected' ? '#ef4444' : '#f59e0b'}; text-align: center;">
            <p style="margin: 0; color: ${data.status === 'approved' ? '#065f46' : data.status === 'rejected' ? '#991b1b' : '#92400e'}; font-size: 16px; font-weight: 500;">
              ${data.status === 'approved' ? '✅ Your attendance has been regularized!' : data.status === 'rejected' ? '❌ Your regularization request was not approved' : '⏳ Your request is under review'}
            </p>
            ${data.comment ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid ${data.status === 'approved' ? '#a7f3d0' : data.status === 'rejected' ? '#fca5a5' : '#fed7aa'};">
                <p style="margin: 0; color: ${data.status === 'approved' ? '#047857' : data.status === 'rejected' ? '#7f1d1d' : '#78350f'}; font-size: 14px; font-weight: 500;">Review Comment:</p>
                <p style="margin: 5px 0 0 0; color: ${data.status === 'approved' ? '#065f46' : data.status === 'rejected' ? '#991b1b' : '#92400e'}; font-size: 14px;">${data.comment}</p>
              </div>
            ` : ''}
          </div>
        `)
      }),

      birthday_wish: () => ({
        subject: `🎉 Happy Birthday ${data.employee}!`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #ff6b6b, #ff8e53); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 8px 25px rgba(255, 107, 107, 0.3);">
              <span style="font-size: 32px; animation: bounce 2s infinite;">🎂</span>
            </div>
            <h1 style="color: #1e293b; margin: 0 0 10px 0; font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #ff6b6b, #ff8e53); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
              Happy Birthday!
            </h1>
            <h2 style="color: #667eea; margin: 0; font-size: 24px; font-weight: 700;">${data.employee}</h2>
          </div>
          
          <div style="background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 16px; padding: 30px; text-align: center; margin: 30px 0; position: relative; overflow: hidden; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);">
            <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><text y=\"50\" font-size=\"20\">🎉</text></svg>') repeat; opacity: 0.1;"></div>
            <div style="position: relative; z-index: 1;">
              <p style="color: white; font-size: 20px; margin: 0 0 15px 0; font-weight: 600;">
                Wishing you a wonderful birthday and an amazing year ahead!
              </p>
              ${data.age ? `<p style="color: rgba(255,255,255,0.9); margin: 0 0 15px 0; font-size: 18px;">Celebrating ${data.age} years of awesomeness! 🎂</p>` : ''}
              ${data.department ? `<p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">From your ${data.department} team and the entire HRMS family</p>` : ''}
            </div>
          </div>
          
          <div style="display: flex; justify-content: space-around; margin: 30px 0; flex-wrap: wrap;">
            <div style="text-align: center; margin: 10px; flex: 1; min-width: 150px;">
              <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #ff9a9e, #fecfef); border-radius: 50%; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 20px;">🎁</span>
              </div>
              <p style="color: #64748b; margin: 0; font-size: 14px; font-weight: 600;">May this special day bring you joy and happiness</p>
            </div>
            <div style="text-align: center; margin: 10px; flex: 1; min-width: 150px;">
              <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #a8edea, #fed6e3); border-radius: 50%; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 20px;">🌟</span>
              </div>
              <p style="color: #64748b; margin: 0; font-size: 14px; font-weight: 600;">Here's to another year of great achievements</p>
            </div>
            <div style="text-align: center; margin: 10px; flex: 1; min-width: 150px;">
              <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #ffecd2, #fcb69f); border-radius: 50%; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 20px;">🎈</span>
              </div>
              <p style="color: #64748b; margin: 0; font-size: 14px; font-weight: 600;">Enjoy your special celebration!</p>
            </div>
          </div>
          
          <div style="background: linear-gradient(135deg, #ffeaa7, #fab1a0); border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
            <p style="color: #2d3436; margin: 0; font-size: 16px; font-weight: 600;">
              🎊 Have a fantastic day filled with love, laughter, and cake! 🎊
            </p>
          </div>
        `)
      })
    };

    const template = templates[type];
    if (template) {
      return template();
    }
    
    return {
      subject: 'HRMS Notification',
      htmlContent: this.getBaseEmailTemplate(`
        <div style="text-align: center; padding: 40px 0;">
          <h2 style="color: #1e293b; margin: 0;">HRMS Notification</h2>
          <p style="color: #64748b; margin: 10px 0 0 0;">You have a new notification from the HRMS system.</p>
        </div>
      `)
    };
  }
}

export default new EmailService();