import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import Settings from '../models/Settings.model.js';

class WhatsAppService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.isInitializing = false;
  }

  async initialize() {
    if (this.isInitializing || this.isReady) {
      return;
    }

    // Skip WhatsApp initialization to avoid Chrome dependency issues
    console.log('WhatsApp service disabled - requires Chrome/Chromium for production use');
    console.log('Consider using WhatsApp Business API for production environments');
    return;

    this.isInitializing = true;
    
    try {
      this.client = new Client({
        authStrategy: new LocalAuth({
          name: 'hrms-whatsapp-session'
        }),
        puppeteer: {
          headless: true,
          executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }
      });

      this.client.on('qr', (qr) => {
        console.log('WhatsApp QR Code generated. Scan this QR code:');
        qrcode.generate(qr, { small: true });
        console.log('Alternatively, you can scan the QR code above with your phone.');
      });

      this.client.on('ready', () => {
        console.log('WhatsApp client is ready!');
        this.isReady = true;
        this.isInitializing = false;
      });

      this.client.on('authenticated', () => {
        console.log('WhatsApp client authenticated successfully');
      });

      this.client.on('auth_failure', (msg) => {
        console.error('WhatsApp authentication failed:', msg);
        this.isInitializing = false;
      });

      this.client.on('disconnected', (reason) => {
        console.log('WhatsApp client disconnected:', reason);
        this.isReady = false;
        this.isInitializing = false;
      });

      await this.client.initialize();
    } catch (error) {
      console.error('WhatsApp service initialization failed:', error);
      this.isInitializing = false;
    }
  }

  async send(phoneNumber, message) {
    if (!this.isReady) {
      console.log('WhatsApp client not ready. Initializing...');
      await this.initialize();
      
      // Wait up to 30 seconds for client to be ready
      let attempts = 0;
      while (!this.isReady && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (!this.isReady) {
        throw new Error('WhatsApp client not ready after initialization');
      }
    }

    try {
      // Format phone number (remove +91 and add @c.us)
      const formattedNumber = phoneNumber.replace(/^\+91/, '') + '@c.us';
      
      await this.client.sendMessage(formattedNumber, message);
      console.log(`WhatsApp message sent to ${phoneNumber}`);
      return true;
    } catch (error) {
      console.error(`Failed to send WhatsApp message to ${phoneNumber}:`, error);
      throw error;
    }
  }

  async sendToMultiple(phoneNumbers, message) {
    const promises = phoneNumbers.map(phone => this.send(phone, message));
    return Promise.allSettled(promises);
  }

  async sendNotification(type, data, recipients) {
    const settings = await Settings.getGlobalSettings();
    if (!settings.notifications.whatsappEnabled) {
      console.log('WhatsApp notifications are disabled');
      return;
    }

    const message = this.getTemplate(type, data);
    
    if (Array.isArray(recipients)) {
      return this.sendToMultiple(recipients, message);
    } else {
      return this.send(recipients, message);
    }
  }

  getTemplate(type, data) {
    const templates = {
      leave_request: `🏢 *New Leave Request*

👤 Employee: ${data.employee}
📅 Type: ${data.type}
📆 Date: ${new Date(data.date).toDateString()}
💬 Reason: ${data.reason}

Please review in HRMS system.`,

      help_request: `🆘 *New Help Request*

👤 Employee: ${data.employee}
📋 Subject: ${data.subject}
🏷️ Category: ${data.category}
⚠️ Priority: ${data.priority.toUpperCase()}

💬 ${data.description}

Please respond in HRMS system.`,

      regularization_request: `⏰ *New Regularization Request*

👤 Employee: ${data.employee}
📅 Date: ${new Date(data.date).toDateString()}
🕘 Check-in: ${data.checkIn || 'Not specified'}
🕕 Check-out: ${data.checkOut || 'Not specified'}
💬 Reason: ${data.reason}

Please review in HRMS system.`,

      holiday_reminder: `🏖️ *Holiday Reminder*

🎉 Holiday: ${data.title}
📅 Date: ${data.date}

Office will be closed. Plan accordingly.`,

      announcement: `📢 *New Announcement*

📋 ${data.title}

${data.content}

- ${data.author}`,

      employee_milestone: `🎉 *Employee Milestone Alert*

👤 Employee: ${data.employee}
🏆 Milestone: ${data.milestone} work anniversary
📅 Joining Date: ${data.joiningDate}

Consider recognizing their contribution!`,

      leave_status_update: `📋 *Leave Request Update*

Your leave request has been *${data.status.toUpperCase()}*.

📅 Type: ${data.type}
📆 Date: ${data.date}
💬 Reason: ${data.reason}`,

      regularization_status_update: `⏰ *Regularization Request Update*

Your attendance regularization has been *${data.status.toUpperCase()}*.

📅 Date: ${data.date}
🕘 Check-in: ${data.checkIn}
🕕 Check-out: ${data.checkOut}
💬 Reason: ${data.reason}${data.comment ? `\n📝 Comment: ${data.comment}` : ''}`
    };

    return templates[type] || 'You have a new notification from HRMS.';
  }

  async destroy() {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
    }
  }
}

export default new WhatsAppService();