import logger from '../utils/logger.js';

interface NotificationData {
  [key: string]: unknown;
}

class WhatsAppService {
  client: unknown | null;
  isReady: boolean;
  isInitializing: boolean;

  constructor() {
    this.client = null;
    this.isReady = false;
    this.isInitializing = false;
  }

  async initialize(): Promise<void> {
    if (this.isInitializing || this.isReady) {
      return;
    }

    logger.info('WhatsApp service disabled - requires Chrome/Chromium for production use');
    logger.info('Consider using WhatsApp Business API for production environments');
    return;
  }

  async sendNotification(type: string, data: NotificationData, recipients: string | string[]): Promise<void> {
    logger.info({ type, recipients }, 'WhatsApp notification skipped - service not initialized');
  }
}

export default new WhatsAppService();
