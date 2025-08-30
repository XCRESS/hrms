/**
 * SendGrid HTTP API Email Service (SMTP alternative)
 * Works on Railway and other hosting providers that block SMTP
 */

import sgMail from '@sendgrid/mail';

class EmailService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.log('Email service skipped - SendGrid API key not provided');
        console.log('Required: SENDGRID_API_KEY');
        console.log('Sign up at: https://sendgrid.com/');
        return;
      }

      console.log('Initializing email service with SendGrid API...');
      
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      // Test the API key with a simple validation
      const testMsg = {
        to: process.env.EMAIL_FROM || 'test@example.com',
        from: process.env.EMAIL_FROM || 'noreply@hrms.com',
        subject: 'SendGrid Test - Do Not Send',
        text: 'This is a test message',
        mailSettings: {
          sandboxMode: {
            enable: true // This prevents actual sending during test
          }
        }
      };

      await sgMail.send(testMsg);
      this.initialized = true;
      console.log('SendGrid email service initialized successfully');
      
    } catch (error) {
      console.error('Email service initialization failed:', error.message);
      console.log('Email service will be disabled. Emails will not be sent.');
      this.initialized = false;
    }
  }

  async send(to, subject, htmlContent) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    try {
      const msg = {
        to,
        from: process.env.EMAIL_FROM || '"HRMS System" <noreply@hrms.com>',
        subject,
        html: htmlContent
      };

      const result = await sgMail.send(msg);
      console.log(`Email sent to ${to} via SendGrid`);
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

  // ... rest of your existing methods (sendNotification, getTemplate, etc.)
  // Copy from your original emailService.js
}

export default new EmailService();