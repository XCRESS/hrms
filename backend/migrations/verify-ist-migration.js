/**
 * IST Migration Verification Script
 * 
 * This script verifies that the UTC to IST migration completed successfully.
 * It checks data integrity and validates that times are in the correct format.
 * 
 * Run with: node backend/migrations/verify-ist-migration.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// IST offset: +5:30 hours
const IST_OFFSET_HOURS = 5.5;

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

/**
 * Check if a date looks like a reasonable IST business time
 */
const isReasonableBusinessTime = (date) => {
  if (!date) return true; // null dates are okay for some fields
  
  const hour = date.getHours();
  // Business hours should be roughly 6 AM to 11 PM IST
  return hour >= 6 && hour <= 23;
};

/**
 * Check if dates are in reasonable ranges
 */
const isReasonableDateRange = (date) => {
  if (!date) return true;
  
  const currentYear = new Date().getFullYear();
  const dateYear = date.getFullYear();
  
  // Should be within last 5 years to next 1 year
  return dateYear >= (currentYear - 5) && dateYear <= (currentYear + 1);
};

/**
 * Verify Attendance Collection
 */
const verifyAttendanceCollection = async () => {
  console.log('\n🔍 Verifying Attendance collection...');
  
  try {
    const collection = mongoose.connection.db.collection('attendances');
    const totalRecords = await collection.countDocuments();
    
    console.log(`📊 Total attendance records: ${totalRecords}`);
    
    if (totalRecords === 0) {
      console.log('✅ No attendance records to verify');
      return { success: true, issues: [] };
    }
    
    // Get sample records for verification
    const sampleRecords = await collection.find({})
      .sort({ date: -1 })
      .limit(100)
      .toArray();
    
    const issues = [];
    let businessHoursOk = 0;
    let dateRangesOk = 0;
    let checkInCount = 0;
    let checkOutCount = 0;
    
    for (const record of sampleRecords) {
      // Check date field
      if (!isReasonableDateRange(record.date)) {
        issues.push(`Attendance ${record._id}: Date out of range - ${record.date}`);
      } else {
        dateRangesOk++;
      }
      
      // Check checkIn field
      if (record.checkIn) {
        checkInCount++;
        if (!isReasonableBusinessTime(record.checkIn)) {
          issues.push(`Attendance ${record._id}: Check-in time looks wrong - ${record.checkIn} (hour: ${record.checkIn.getHours()})`);
        } else {
          businessHoursOk++;
        }
      }
      
      // Check checkOut field
      if (record.checkOut) {
        checkOutCount++;
        if (!isReasonableBusinessTime(record.checkOut)) {
          issues.push(`Attendance ${record._id}: Check-out time looks wrong - ${record.checkOut} (hour: ${record.checkOut.getHours()})`);
        } else {
          businessHoursOk++;
        }
      }
    }
    
    // Summary statistics
    console.log(`📈 Date ranges valid: ${dateRangesOk}/${sampleRecords.length}`);
    console.log(`📈 Business hours reasonable: ${businessHoursOk}/${checkInCount + checkOutCount}`);
    console.log(`📈 Records with check-in: ${checkInCount}/${sampleRecords.length}`);
    console.log(`📈 Records with check-out: ${checkOutCount}/${sampleRecords.length}`);
    
    // Check for null dates (data loss indicator)
    const nullDates = await collection.countDocuments({ date: null });
    if (nullDates > 0) {
      issues.push(`Found ${nullDates} records with null dates - possible data loss`);
    }
    
    // Check for future dates (migration error indicator)
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDates = await collection.countDocuments({ date: { $gt: futureDate } });
    if (futureDates > 0) {
      issues.push(`Found ${futureDates} records with dates more than 1 year in future`);
    }
    
    if (issues.length === 0) {
      console.log('✅ Attendance collection verification passed');
    } else {
      console.log(`⚠️  Found ${issues.length} potential issues in Attendance collection`);
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    return { success: issues.length === 0, issues };
    
  } catch (error) {
    console.error('❌ Error verifying Attendance collection:', error);
    return { success: false, issues: [error.message] };
  }
};

/**
 * Verify Employee Collection
 */
const verifyEmployeeCollection = async () => {
  console.log('\n🔍 Verifying Employee collection...');
  
  try {
    const collection = mongoose.connection.db.collection('employees');
    const totalRecords = await collection.countDocuments();
    
    console.log(`📊 Total employee records: ${totalRecords}`);
    
    if (totalRecords === 0) {
      console.log('✅ No employee records to verify');
      return { success: true, issues: [] };
    }
    
    const sampleRecords = await collection.find({})
      .limit(50)
      .toArray();
    
    const issues = [];
    let joiningDatesOk = 0;
    
    for (const record of sampleRecords) {
      // Check joining date
      if (record.joiningDate) {
        if (!isReasonableDateRange(record.joiningDate)) {
          issues.push(`Employee ${record.employeeId}: Joining date out of range - ${record.joiningDate}`);
        } else {
          joiningDatesOk++;
        }
      }
      
      // Check date of birth if exists
      if (record.dateOfBirth) {
        const birthYear = record.dateOfBirth.getFullYear();
        if (birthYear < 1950 || birthYear > 2010) {
          issues.push(`Employee ${record.employeeId}: Birth date seems wrong - ${record.dateOfBirth}`);
        }
      }
    }
    
    console.log(`📈 Joining dates valid: ${joiningDatesOk}/${sampleRecords.filter(r => r.joiningDate).length}`);
    
    // Check for null joining dates
    const nullJoiningDates = await collection.countDocuments({ joiningDate: null });
    if (nullJoiningDates > 0) {
      console.log(`⚠️  ${nullJoiningDates} employees have null joining dates`);
    }
    
    if (issues.length === 0) {
      console.log('✅ Employee collection verification passed');
    } else {
      console.log(`⚠️  Found ${issues.length} potential issues in Employee collection`);
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    return { success: issues.length === 0, issues };
    
  } catch (error) {
    console.error('❌ Error verifying Employee collection:', error);
    return { success: false, issues: [error.message] };
  }
};

/**
 * Verify Holiday Collection
 */
const verifyHolidayCollection = async () => {
  console.log('\n🔍 Verifying Holiday collection...');
  
  try {
    const collection = mongoose.connection.db.collection('holidays');
    const totalRecords = await collection.countDocuments();
    
    console.log(`📊 Total holiday records: ${totalRecords}`);
    
    if (totalRecords === 0) {
      console.log('✅ No holiday records to verify');
      return { success: true, issues: [] };
    }
    
    const sampleRecords = await collection.find({}).toArray();
    const issues = [];
    
    for (const record of sampleRecords) {
      if (!isReasonableDateRange(record.date)) {
        issues.push(`Holiday ${record._id}: Date out of range - ${record.date}`);
      }
    }
    
    // Check for null dates
    const nullDates = await collection.countDocuments({ date: null });
    if (nullDates > 0) {
      issues.push(`Found ${nullDates} holiday records with null dates`);
    }
    
    if (issues.length === 0) {
      console.log('✅ Holiday collection verification passed');
    } else {
      console.log(`⚠️  Found ${issues.length} potential issues in Holiday collection`);
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    return { success: issues.length === 0, issues };
    
  } catch (error) {
    console.error('❌ Error verifying Holiday collection:', error);
    return { success: false, issues: [error.message] };
  }
};

/**
 * Verify Leave Collection
 */
const verifyLeaveCollection = async () => {
  console.log('\n🔍 Verifying Leave collection...');
  
  try {
    const collection = mongoose.connection.db.collection('leaves');
    const totalRecords = await collection.countDocuments();
    
    console.log(`📊 Total leave records: ${totalRecords}`);
    
    if (totalRecords === 0) {
      console.log('✅ No leave records to verify');
      return { success: true, issues: [] };
    }
    
    const sampleRecords = await collection.find({})
      .limit(50)
      .toArray();
    
    const issues = [];
    
    for (const record of sampleRecords) {
      // Check leave dates
      if (record.leaveDate && !isReasonableDateRange(record.leaveDate)) {
        issues.push(`Leave ${record._id}: Leave date out of range - ${record.leaveDate}`);
      }
      
      if (record.fromDate && !isReasonableDateRange(record.fromDate)) {
        issues.push(`Leave ${record._id}: From date out of range - ${record.fromDate}`);
      }
      
      if (record.toDate && !isReasonableDateRange(record.toDate)) {
        issues.push(`Leave ${record._id}: To date out of range - ${record.toDate}`);
      }
    }
    
    if (issues.length === 0) {
      console.log('✅ Leave collection verification passed');
    } else {
      console.log(`⚠️  Found ${issues.length} potential issues in Leave collection`);
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    return { success: issues.length === 0, issues };
    
  } catch (error) {
    console.error('❌ Error verifying Leave collection:', error);
    return { success: false, issues: [error.message] };
  }
};

/**
 * Check Recent Data Patterns
 */
const checkRecentDataPatterns = async () => {
  console.log('\n🔍 Checking recent data patterns...');
  
  try {
    const attendanceCollection = mongoose.connection.db.collection('attendances');
    
    // Get recent attendance records
    const recentRecords = await attendanceCollection.find({})
      .sort({ date: -1 })
      .limit(10)
      .toArray();
    
    console.log('\n📋 Sample recent attendance records:');
    recentRecords.forEach((record, index) => {
      const checkInTime = record.checkIn ? record.checkIn.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';
      const checkOutTime = record.checkOut ? record.checkOut.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';
      
      console.log(`${index + 1}. Employee: ${record.employeeName}`);
      console.log(`   Date: ${record.date.toDateString()}`);
      console.log(`   Check-in: ${checkInTime}`);
      console.log(`   Check-out: ${checkOutTime}`);
      console.log(`   Status: ${record.status}`);
      console.log('');
    });
    
    return { success: true, issues: [] };
    
  } catch (error) {
    console.error('❌ Error checking recent data patterns:', error);
    return { success: false, issues: [error.message] };
  }
};

/**
 * Main verification function
 */
const runVerification = async () => {
  console.log('🔍 Starting IST Migration Verification...');
  
  try {
    await connectDB();
    
    const results = {
      attendance: await verifyAttendanceCollection(),
      employee: await verifyEmployeeCollection(),
      holiday: await verifyHolidayCollection(),
      leave: await verifyLeaveCollection(),
      patterns: await checkRecentDataPatterns()
    };
    
    // Summary report
    console.log('\n📋 VERIFICATION SUMMARY:');
    console.log('========================');
    
    let totalIssues = 0;
    const allResults = Object.entries(results);
    
    allResults.forEach(([collection, result]) => {
      const status = result.success ? '✅ PASSED' : '❌ FAILED';
      const issueCount = result.issues.length;
      console.log(`${collection.toUpperCase()}: ${status} (${issueCount} issues)`);
      totalIssues += issueCount;
    });
    
    console.log('\n========================');
    
    if (totalIssues === 0) {
      console.log('🎉 ALL VERIFICATIONS PASSED!');
      console.log('✅ IST migration appears to be successful');
      console.log('✅ Data integrity maintained');
      console.log('✅ Times are in reasonable IST ranges');
    } else {
      console.log(`⚠️  FOUND ${totalIssues} TOTAL ISSUES`);
      console.log('❌ Please review the issues above');
      console.log('❌ Consider investigating or rolling back if issues are severe');
    }
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the verification if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runVerification();
}

export default runVerification;