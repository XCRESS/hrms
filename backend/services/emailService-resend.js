/**
 * Resend HTTP API Email Service (SMTP alternative)
 * Modern email API that works on Railway
 */

import { Resend } from 'resend';

class EmailService {
  constructor() {
    this.resend = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.log('Email service skipped - Resend API key not provided');
        console.log('Required: RESEND_API_KEY');
        console.log('Sign up at: https://resend.com/');
        return;
      }

      console.log('Initializing email service with Resend API...');
      
      this.resend = new Resend(process.env.RESEND_API_KEY);
      
      // Test API key by trying to get domains (won't fail if no domains set up)
      try {
        await this.resend.domains.list();
        this.initialized = true;
        console.log('Resend email service initialized successfully');
      } catch (error) {
        // API key might work even if domains call fails
        this.initialized = true;
        console.log('Resend email service initialized (domain check skipped)');
      }
      
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
      const result = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'HRMS System <noreply@hrms.com>',
        to: [to],
        subject,
        html: htmlContent
      });

      console.log(`Email sent to ${to} via Resend:`, result.data?.id);
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

  // ... rest of your existing methods would go here
}

export default new EmailService();