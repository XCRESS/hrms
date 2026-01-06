/**
 * Backend Notification Service
 * Handles sending notifications to frontend clients through various channels
 */

import type { Response } from 'express';
import logger from './logger.js';

interface IAnnouncement {
  _id: string;
  title: string;
  content: string;
  targetAudience: string;
}

interface IHoliday {
  _id: string;
  title: string;
  description?: string;
  date: Date;
}

interface INotificationData {
  type: 'announcement' | 'holiday' | 'system';
  title: string;
  body: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

class NotificationService {
  private clients: Set<Response>;

  constructor() {
    this.clients = new Set<Response>(); // For SSE connections (future implementation)
  }

  /**
   * Send announcement notification to frontend
   * This will be called when HR/Admin publishes an announcement
   */
  async sendAnnouncementNotification(announcement: IAnnouncement): Promise<INotificationData> {
    try {
      logger.info({ announcementId: announcement._id, title: announcement.title }, 'Announcement notification');

      // Here you could implement:
      // 1. Server-Sent Events (SSE) to connected clients
      // 2. WebSocket broadcasting
      // 3. Database notification logs
      // 4. Integration with push notification services

      // For now, we'll log the notification
      const notificationData: INotificationData = {
        type: 'announcement',
        title: `📢 New Announcement: ${announcement.title}`,
        body:
          announcement.content.length > 100
            ? announcement.content.substring(0, 100) + '...'
            : announcement.content,
        data: {
          id: announcement._id,
          url: '/announcements',
          targetAudience: announcement.targetAudience,
        },
        timestamp: new Date(),
      };

      // Log notification for debugging
      logger.info({ notificationData }, 'Announcement notification data');

      // Future: Send to connected PWA clients via push service
      // await this.sendPushNotification(notificationData);

      return notificationData;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error sending announcement notification');
      logger.error({ err, announcementId: announcement._id }, 'Error sending announcement notification');
      throw err;
    }
  }

  /**
   * Send holiday notification to frontend
   * This will be called when HR/Admin creates/updates a holiday
   */
  async sendHolidayNotification(holiday: IHoliday): Promise<INotificationData> {
    try {
      logger.info({ holidayId: holiday._id, title: holiday.title }, 'Holiday notification');

      const notificationData: INotificationData = {
        type: 'holiday',
        title: `🎉 Holiday Update: ${holiday.title}`,
        body: holiday.description || 'New holiday has been added to the calendar',
        data: {
          id: holiday._id,
          url: '/holidays',
          date: holiday.date,
        },
        timestamp: new Date(),
      };

      // Log notification for debugging
      logger.info({ notificationData }, 'Holiday notification data');

      // Future: Send to connected PWA clients via push service
      // await this.sendPushNotification(notificationData);

      return notificationData;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error sending holiday notification');
      logger.error({ err, holidayId: holiday._id }, 'Error sending holiday notification');
      throw err;
    }
  }

  /**
   * Send system notification
   */
  async sendSystemNotification(
    title: string,
    message: string,
    data: Record<string, unknown> = {}
  ): Promise<INotificationData> {
    try {
      logger.info({ title, message }, 'System notification');

      const notificationData: INotificationData = {
        type: 'system',
        title: `HRMS: ${title}`,
        body: message,
        data: {
          url: '/dashboard',
          ...data,
        },
        timestamp: new Date(),
      };

      logger.info({ notificationData }, 'System notification data');
      return notificationData;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error sending system notification');
      logger.error({ err, title }, 'Error sending system notification');
      throw err;
    }
  }

  /**
   * Future: Send push notification to PWA clients
   * This would integrate with web push services like Firebase, OneSignal, etc.
   */
  async sendPushNotification(notificationData: INotificationData): Promise<void> {
    // Implementation for actual push notifications
    // This would require:
    // 1. Web Push Protocol implementation
    // 2. VAPID keys
    // 3. Client subscription management
    // 4. Push service integration (Firebase, OneSignal, etc.)

    logger.info({ notificationData }, 'Push notification would be sent');
  }

  /**
   * Add client for SSE notifications (future implementation)
   */
  addClient(clientConnection: Response): void {
    this.clients.add(clientConnection);
    logger.info({ totalClients: this.clients.size }, 'Client connected');
  }

  /**
   * Remove client for SSE notifications (future implementation)
   */
  removeClient(clientConnection: Response): void {
    this.clients.delete(clientConnection);
    logger.info({ totalClients: this.clients.size }, 'Client disconnected');
  }

  /**
   * Broadcast notification to all connected clients via SSE (future implementation)
   */
  broadcastToClients(notificationData: INotificationData): void {
    this.clients.forEach((client) => {
      try {
        client.write(`data: ${JSON.stringify(notificationData)}\n\n`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error sending to client');
        logger.error({ err }, 'Error sending to client');
        this.clients.delete(client);
      }
    });
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
