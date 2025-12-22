import mongoose from 'mongoose';
import Settings from './models/Settings.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkSettings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms');
    console.log('Connected to MongoDB');
    
    const settings = await Settings.findOne({ scope: 'global' });
    if (settings) {
      console.log('\n=== GLOBAL SETTINGS ===');
      console.log('Working Days:', settings.attendance.workingDays);
      console.log('Non-Working Days:', settings.attendance.nonWorkingDays);
      console.log('Saturday Holidays:', settings.attendance.saturdayHolidays);
      console.log('\nDaily HR Report Enabled:', settings.notifications.dailyHrAttendanceReport.enabled);
      console.log('Daily HR Report Time:', settings.notifications.dailyHrAttendanceReport.sendTime);
    } else {
      console.log('No global settings found');
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSettings();
