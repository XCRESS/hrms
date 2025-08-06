/**
 * UTC to IST Database Migration Script
 * 
 * This script converts existing UTC timestamps in the database to IST timestamps.
 * 
 * IMPORTANT: 
 * - Run this script ONLY ONCE after deploying the IST code changes
 * - Take a database backup before running
 * - Run during low-traffic hours
 * 
 * What this script does:
 * 1. Updates all date/time fields in Attendance collection
 * 2. Updates all date/time fields in TaskReport collection
 * 3. Updates all date/time fields in Leave collection
 * 4. Updates all date/time fields in Holiday collection
 * 5. Updates all date/time fields in Employee collection (joiningDate, etc.)
 * 
 * Run with: node backend/migrations/utc-to-ist-migration.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// IST offset: +5:30 hours = 5.5 * 60 * 60 * 1000 milliseconds
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Convert UTC date to IST equivalent
 * Note: The stored dates were actually IST times stored as UTC
 * So we need to subtract the offset to get the correct IST time
 */
const convertUTCToIST = (utcDate) => {
  if (!utcDate) return null;
  
  // The original times were IST but stored as UTC
  // So we need to adjust them back to IST
  return new Date(utcDate.getTime() - IST_OFFSET_MS);
};

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
 * Migrate Attendance Collection
 */
const migrateAttendanceCollection = async () => {
  console.log('\n🔄 Migrating Attendance collection...');
  
  try {
    const collection = mongoose.connection.db.collection('attendances');
    const totalRecords = await collection.countDocuments();
    
    console.log(`📊 Found ${totalRecords} attendance records to migrate`);
    
    if (totalRecords === 0) {
      console.log('✅ No attendance records to migrate');
      return;
    }
    
    // Process in batches of 100 to avoid memory issues
    const batchSize = 100;
    let processed = 0;
    
    while (processed < totalRecords) {
      const records = await collection.find({})
        .skip(processed)
        .limit(batchSize)
        .toArray();
      
      const bulkOps = [];
      
      for (const record of records) {
        const updateDoc = {};
        
        // Convert date field (attendance date)
        if (record.date) {
          updateDoc.date = convertUTCToIST(record.date);
        }
        
        // Convert checkIn field
        if (record.checkIn) {
          updateDoc.checkIn = convertUTCToIST(record.checkIn);
        }
        
        // Convert checkOut field
        if (record.checkOut) {
          updateDoc.checkOut = convertUTCToIST(record.checkOut);
        }
        
        // Convert timestamps
        if (record.createdAt) {
          updateDoc.createdAt = convertUTCToIST(record.createdAt);
        }
        
        if (record.updatedAt) {
          updateDoc.updatedAt = convertUTCToIST(record.updatedAt);
        }
        
        bulkOps.push({
          updateOne: {
            filter: { _id: record._id },
            update: { $set: updateDoc }
          }
        });
      }
      
      if (bulkOps.length > 0) {
        await collection.bulkWrite(bulkOps);
      }
      
      processed += records.length;
      console.log(`📈 Processed ${processed}/${totalRecords} attendance records`);
    }
    
    console.log('✅ Attendance collection migration completed');
  } catch (error) {
    console.error('❌ Error migrating Attendance collection:', error);
    throw error;
  }
};

/**
 * Migrate TaskReport Collection
 */
const migrateTaskReportCollection = async () => {
  console.log('\n🔄 Migrating TaskReport collection...');
  
  try {
    const collection = mongoose.connection.db.collection('taskreports');
    const totalRecords = await collection.countDocuments();
    
    console.log(`📊 Found ${totalRecords} task report records to migrate`);
    
    if (totalRecords === 0) {
      console.log('✅ No task report records to migrate');
      return;
    }
    
    const batchSize = 100;
    let processed = 0;
    
    while (processed < totalRecords) {
      const records = await collection.find({})
        .skip(processed)
        .limit(batchSize)
        .toArray();
      
      const bulkOps = [];
      
      for (const record of records) {
        const updateDoc = {};
        
        // Convert date field
        if (record.date) {
          updateDoc.date = convertUTCToIST(record.date);
        }
        
        // Convert timestamps
        if (record.createdAt) {
          updateDoc.createdAt = convertUTCToIST(record.createdAt);
        }
        
        if (record.updatedAt) {
          updateDoc.updatedAt = convertUTCToIST(record.updatedAt);
        }
        
        bulkOps.push({
          updateOne: {
            filter: { _id: record._id },
            update: { $set: updateDoc }
          }
        });
      }
      
      if (bulkOps.length > 0) {
        await collection.bulkWrite(bulkOps);
      }
      
      processed += records.length;
      console.log(`📈 Processed ${processed}/${totalRecords} task report records`);
    }
    
    console.log('✅ TaskReport collection migration completed');
  } catch (error) {
    console.error('❌ Error migrating TaskReport collection:', error);
    throw error;
  }
};

/**
 * Migrate Leave Collection
 */
const migrateLeaveCollection = async () => {
  console.log('\n🔄 Migrating Leave collection...');
  
  try {
    const collection = mongoose.connection.db.collection('leaves');
    const totalRecords = await collection.countDocuments();
    
    console.log(`📊 Found ${totalRecords} leave records to migrate`);
    
    if (totalRecords === 0) {
      console.log('✅ No leave records to migrate');
      return;
    }
    
    const batchSize = 100;
    let processed = 0;
    
    while (processed < totalRecords) {
      const records = await collection.find({})
        .skip(processed)
        .limit(batchSize)
        .toArray();
      
      const bulkOps = [];
      
      for (const record of records) {
        const updateDoc = {};
        
        // Convert leave date fields
        if (record.leaveDate) {
          updateDoc.leaveDate = convertUTCToIST(record.leaveDate);
        }
        
        if (record.fromDate) {
          updateDoc.fromDate = convertUTCToIST(record.fromDate);
        }
        
        if (record.toDate) {
          updateDoc.toDate = convertUTCToIST(record.toDate);
        }
        
        // Convert timestamps
        if (record.createdAt) {
          updateDoc.createdAt = convertUTCToIST(record.createdAt);
        }
        
        if (record.updatedAt) {
          updateDoc.updatedAt = convertUTCToIST(record.updatedAt);
        }
        
        bulkOps.push({
          updateOne: {
            filter: { _id: record._id },
            update: { $set: updateDoc }
          }
        });
      }
      
      if (bulkOps.length > 0) {
        await collection.bulkWrite(bulkOps);
      }
      
      processed += records.length;
      console.log(`📈 Processed ${processed}/${totalRecords} leave records`);
    }
    
    console.log('✅ Leave collection migration completed');
  } catch (error) {
    console.error('❌ Error migrating Leave collection:', error);
    throw error;
  }
};

/**
 * Migrate Holiday Collection
 */
const migrateHolidayCollection = async () => {
  console.log('\n🔄 Migrating Holiday collection...');
  
  try {
    const collection = mongoose.connection.db.collection('holidays');
    const totalRecords = await collection.countDocuments();
    
    console.log(`📊 Found ${totalRecords} holiday records to migrate`);
    
    if (totalRecords === 0) {
      console.log('✅ No holiday records to migrate');
      return;
    }
    
    const batchSize = 100;
    let processed = 0;
    
    while (processed < totalRecords) {
      const records = await collection.find({})
        .skip(processed)
        .limit(batchSize)
        .toArray();
      
      const bulkOps = [];
      
      for (const record of records) {
        const updateDoc = {};
        
        // Convert holiday date
        if (record.date) {
          updateDoc.date = convertUTCToIST(record.date);
        }
        
        // Convert timestamps
        if (record.createdAt) {
          updateDoc.createdAt = convertUTCToIST(record.createdAt);
        }
        
        if (record.updatedAt) {
          updateDoc.updatedAt = convertUTCToIST(record.updatedAt);
        }
        
        bulkOps.push({
          updateOne: {
            filter: { _id: record._id },
            update: { $set: updateDoc }
          }
        });
      }
      
      if (bulkOps.length > 0) {
        await collection.bulkWrite(bulkOps);
      }
      
      processed += records.length;
      console.log(`📈 Processed ${processed}/${totalRecords} holiday records`);
    }
    
    console.log('✅ Holiday collection migration completed');
  } catch (error) {
    console.error('❌ Error migrating Holiday collection:', error);
    throw error;
  }
};

/**
 * Migrate Employee Collection (joining dates, etc.)
 */
const migrateEmployeeCollection = async () => {
  console.log('\n🔄 Migrating Employee collection...');
  
  try {
    const collection = mongoose.connection.db.collection('employees');
    const totalRecords = await collection.countDocuments();
    
    console.log(`📊 Found ${totalRecords} employee records to migrate`);
    
    if (totalRecords === 0) {
      console.log('✅ No employee records to migrate');
      return;
    }
    
    const batchSize = 100;
    let processed = 0;
    
    while (processed < totalRecords) {
      const records = await collection.find({})
        .skip(processed)
        .limit(batchSize)
        .toArray();
      
      const bulkOps = [];
      
      for (const record of records) {
        const updateDoc = {};
        
        // Convert joining date
        if (record.joiningDate) {
          updateDoc.joiningDate = convertUTCToIST(record.joiningDate);
        }
        
        // Convert date of birth if exists
        if (record.dateOfBirth) {
          updateDoc.dateOfBirth = convertUTCToIST(record.dateOfBirth);
        }
        
        // Convert timestamps
        if (record.createdAt) {
          updateDoc.createdAt = convertUTCToIST(record.createdAt);
        }
        
        if (record.updatedAt) {
          updateDoc.updatedAt = convertUTCToIST(record.updatedAt);
        }
        
        bulkOps.push({
          updateOne: {
            filter: { _id: record._id },
            update: { $set: updateDoc }
          }
        });
      }
      
      if (bulkOps.length > 0) {
        await collection.bulkWrite(bulkOps);
      }
      
      processed += records.length;
      console.log(`📈 Processed ${processed}/${totalRecords} employee records`);
    }
    
    console.log('✅ Employee collection migration completed');
  } catch (error) {
    console.error('❌ Error migrating Employee collection:', error);
    throw error;
  }
};

/**
 * Main migration function
 */
const runMigration = async () => {
  console.log('🚀 Starting UTC to IST Migration...');
  console.log('⚠️  Make sure you have a database backup before proceeding!');
  
  try {
    await connectDB();
    
    // Run all migrations
    await migrateAttendanceCollection();
    await migrateTaskReportCollection();
    await migrateLeaveCollection();
    await migrateHolidayCollection();
    await migrateEmployeeCollection();
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ All UTC timestamps have been converted to IST');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('❌ Please restore from backup and check the error');
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export default runMigration;