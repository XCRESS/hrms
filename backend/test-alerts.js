import AlertService from './services/alertService.js';
import mongoose from 'mongoose';

// Test the alert service
async function testAlerts() {
  try {
    // Connect to MongoDB (you'll need your connection string)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms');
    
    console.log('Testing Alert Service...');
    const alerts = await AlertService.getTodayAlerts();
    
    console.log(`Found ${alerts.length} alerts for today:`);
    alerts.forEach(alert => {
      console.log(`- ${alert.type}: ${alert.message}`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testAlerts();