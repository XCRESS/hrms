/**
 * Backend Notification Service
 * Handles sending notifications to frontend clients through various channels
 */

class NotificationService {
  constructor() {
    this.clients = new Set(); // For SSE connections (future implementation)
  }

  /**
   * Send announcement notification to frontend
   * This will be called when HR/Admin publishes an announcement
   */
  async sendAnnouncementNotification(announcement) {
    try {
      console.log(`📢 Announcement notification: ${announcement.title}`);
      
      // Here you could implement:
      // 1. Server-Sent Events (SSE) to connected clients
      // 2. WebSocket broadcasting
      // 3. Database notification logs
      // 4. Integration with push notification services
      
      // For now, we'll log the notification
      const notificationData = {
        type: 'announcement',
        title: `📢 New Announcement: ${announcement.title}`,
        body: announcement.content.length > 100 
          ? announcement.content.substring(0, 100) + '...' 
          : announcement.content,
        data: {
          id: announcement._id,
          url: '/announcements',
          targetAudience: announcement.targetAudience
        },
        timestamp: new Date()
      };

      // Log notification for debugging
      console.log('Announcement notification data:', notificationData);

      // Future: Send to connected PWA clients via push service
      // await this.sendPushNotification(notificationData);

      return notificationData;
    } catch (error) {
      console.error('Error sending announcement notification:', error);
      throw error;
    }
  }

  /**
   * Send holiday notification to frontend
   * This will be called when HR/Admin creates/updates a holiday
   */
  async sendHolidayNotification(holiday) {
    try {
      console.log(`🎉 Holiday notification: ${holiday.title}`);
      
      const notificationData = {
        type: 'holiday',
        title: `🎉 Holiday Update: ${holiday.title}`,
        body: holiday.description || 'New holiday has been added to the calendar',
        data: {
          id: holiday._id,
          url: '/holidays',
          date: holiday.date
        },
        timestamp: new Date()
      };

      // Log notification for debugging
      console.log('Holiday notification data:', notificationData);

      // Future: Send to connected PWA clients via push service
      // await this.sendPushNotification(notificationData);

      return notificationData;
    } catch (error) {
      console.error('Error sending holiday notification:', error);
      throw error;
    }
  }

  /**
   * Send system notification
   */
  async sendSystemNotification(title, message, data = {}) {
    try {
      console.log(`🔔 System notification: ${title}`);
      
      const notificationData = {
        type: 'system',
        title: `HRMS: ${title}`,
        body: message,
        data: {
          url: '/dashboard',
          ...data
        },
        timestamp: new Date()
      };

      console.log('System notification data:', notificationData);
      return notificationData;
    } catch (error) {
      console.error('Error sending system notification:', error);
      throw error;
    }
  }

  /**
   * Future: Send push notification to PWA clients
   * This would integrate with web push services like Firebase, OneSignal, etc.
   */
  async sendPushNotification(notificationData) {
    // Implementation for actual push notifications
    // This would require:
    // 1. Web Push Protocol implementation
    // 2. VAPID keys
    // 3. Client subscription management
    // 4. Push service integration (Firebase, OneSignal, etc.)
    
    console.log('Push notification would be sent:', notificationData);
  }

  /**
   * Add client for SSE notifications (future implementation)
   */
  addClient(clientConnection) {
    this.clients.add(clientConnection);
    console.log(`Client connected. Total clients: ${this.clients.size}`);
  }

  /**
   * Remove client for SSE notifications (future implementation)
   */
  removeClient(clientConnection) {
    this.clients.delete(clientConnection);
    console.log(`Client disconnected. Total clients: ${this.clients.size}`);
  }

  /**
   * Broadcast notification to all connected clients via SSE (future implementation)
   */
  broadcastToClients(notificationData) {
    this.clients.forEach(client => {
      try {
        client.write(`data: ${JSON.stringify(notificationData)}\n\n`);
      } catch (error) {
        console.error('Error sending to client:', error);
        this.clients.delete(client);
      }
    });
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;