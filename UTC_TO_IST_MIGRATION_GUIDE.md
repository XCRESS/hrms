# UTC to IST Migration Guide

This guide provides step-by-step instructions for migrating the HRMS application from UTC to IST (Indian Standard Time) timezone handling.

## 🚨 PRE-MIGRATION CHECKLIST

### 1. **MANDATORY: Create Database Backup**
```bash
# MongoDB backup command
mongodump --uri="your_mongodb_connection_string" --out="./backup-$(date +%Y%m%d)"

# Verify backup was created
ls -la backup-*
```

### 2. **Verify Current Code Deployment**
Make sure all IST code changes are deployed to the server:
- ✅ Backend IST utilities (`backend/utils/istUtils.js`)
- ✅ Updated attendance controller
- ✅ Frontend IST utilities (`frontend/src/utils/istUtils.js`)
- ✅ Updated frontend components

### 3. **Schedule Maintenance Window**
- Choose low-traffic hours (preferably 2-4 AM IST)
- Notify users about potential downtime
- Prepare rollback plan

## 📊 UNDERSTANDING THE PROBLEM

### Current State:
- Dates/times stored in database as UTC
- Frontend/Backend constantly converting UTC ↔ IST
- Complex timezone handling code throughout application
- Time display inconsistencies

### Target State:
- All dates/times stored as IST in database
- No timezone conversions needed (India-only app)
- Simplified date handling code
- Consistent time display

## 🔧 MIGRATION STEPS

### Step 1: Pre-Migration Verification

#### 1.1 Check Database Collections
Run these queries to understand data volume:

```javascript
// Connect to your MongoDB
use your_database_name

// Check data counts
db.attendances.countDocuments()
db.taskreports.countDocuments() 
db.leaves.countDocuments()
db.holidays.countDocuments()
db.employees.countDocuments()

// Sample current data format
db.attendances.findOne()
db.employees.findOne()
```

#### 1.2 Test IST Utilities
```bash
cd backend
node -e "
import { getISTNow, formatISTDate } from './utils/istUtils.js';
console.log('IST Now:', getISTNow());
console.log('Formatted:', formatISTDate(getISTNow()));
"
```

### Step 2: Run Migration Script

#### 2.1 Execute Migration
```bash
cd backend
node migrations/utc-to-ist-migration.js
```

#### 2.2 Monitor Output
The script will show progress like:
```
🚀 Starting UTC to IST Migration...
✅ Connected to MongoDB

🔄 Migrating Attendance collection...
📊 Found 1500 attendance records to migrate
📈 Processed 100/1500 attendance records
📈 Processed 200/1500 attendance records
...
✅ Attendance collection migration completed

🔄 Migrating TaskReport collection...
...
```

### Step 3: Verification Queries

After migration, run these queries to verify data:

#### 3.1 Attendance Data Verification
```javascript
// Check sample attendance records
db.attendances.find().sort({date: -1}).limit(5)

// Verify IST times look correct (should be Indian business hours)
db.attendances.find({
  checkIn: {$exists: true}
}).limit(10).forEach(function(doc) {
  print("Employee: " + doc.employeeName + ", Check-in: " + doc.checkIn + ", Check-out: " + doc.checkOut);
});
```

#### 3.2 Date Range Verification
```javascript
// Check dates are in reasonable ranges
db.attendances.aggregate([
  {$group: {
    _id: null,
    minDate: {$min: "$date"},
    maxDate: {$max: "$date"},
    count: {$sum: 1}
  }}
])

// Check for any NULL dates (should be none)
db.attendances.find({date: null}).count()
```

### Step 4: Application Testing

#### 4.1 Restart Application Services
```bash
# Restart backend
pm2 restart hrms-backend

# Restart frontend (if using pm2)
pm2 restart hrms-frontend

# Or using systemctl
sudo systemctl restart hrms-backend
sudo systemctl restart hrms-frontend
```

#### 4.2 Test Key Features
Test these critical features:

1. **Employee Check-in/Check-out**
   - Check-in should work normally
   - Times should display in IST format (e.g., "9:30 AM")
   - No timezone conversion errors

2. **Admin Attendance Table**
   - View current month attendance
   - Times should display correctly
   - Edit attendance records should work

3. **Employee Attendance Table**
   - Personal attendance view
   - Date filtering should work
   - Export features should work

4. **Reports**
   - Monthly attendance reports
   - Leave reports
   - Any date-based filtering

#### 4.3 Check for Errors
```bash
# Check application logs
tail -f /var/log/hrms/backend.log
tail -f /var/log/hrms/frontend.log

# Check for any timezone-related errors
grep -i "timezone\|utc\|ist" /var/log/hrms/*.log
```

## 🚨 ROLLBACK PROCEDURE (If Something Goes Wrong)

### Step 1: Stop Application
```bash
pm2 stop all
# or
sudo systemctl stop hrms-backend hrms-frontend
```

### Step 2: Restore Database
```bash
# Restore from backup
mongorestore --uri="your_mongodb_connection_string" --drop backup-YYYYMMDD/
```

### Step 3: Deploy Previous Code Version
```bash
# Checkout previous commit
git checkout previous_commit_hash

# Rebuild and restart
npm run build
pm2 restart all
```

## 📋 POST-MIGRATION CHECKLIST

### ✅ Immediate Checks (Within 1 Hour)
- [ ] Application starts without errors
- [ ] Employee can check-in/check-out
- [ ] Times display correctly in IST
- [ ] Admin can view attendance table
- [ ] No console errors in browser
- [ ] No server errors in logs

### ✅ Daily Monitoring (Next 3 Days)
- [ ] All new attendance records are correct
- [ ] Date filtering works properly
- [ ] Reports generate correctly
- [ ] No user complaints about time display
- [ ] Performance is normal or improved

### ✅ Weekly Verification
- [ ] Historical data displays correctly
- [ ] Monthly reports work correctly
- [ ] Leave system works properly
- [ ] Holiday system works correctly

## 🔍 TROUBLESHOOTING

### Issue: Times Show Incorrectly

**Symptoms:** Times showing 5.5 hours off, or showing previous day's date

**Solution:**
```javascript
// Check if migration ran correctly
db.attendances.find({employeeId: "EMP001"}).sort({date: -1}).limit(1)

// If times are still wrong, the conversion logic might need adjustment
// Check the convertUTCToIST function in migration script
```

### Issue: Application Won't Start

**Symptoms:** Server errors, import errors

**Solution:**
```bash
# Check if IST utilities are properly deployed
ls -la backend/utils/istUtils.js
ls -la frontend/src/utils/istUtils.js

# Check for syntax errors
node --check backend/utils/istUtils.js
```

### Issue: Database Connection Errors

**Symptoms:** Migration script can't connect to MongoDB

**Solution:**
```bash
# Test MongoDB connection
mongosh "your_connection_string"

# Check environment variables
echo $MONGO_URI

# Verify credentials and network access
```

## 📞 ESCALATION CONTACTS

### If Migration Fails:
1. **Immediate:** Stop the migration script (Ctrl+C)
2. **Restore:** Run rollback procedure immediately
3. **Report:** Document exact error message and steps taken
4. **Contact:** Senior developer with full error logs

### If Application Issues After Migration:
1. **Document:** Screenshot errors and note exact functionality affected
2. **Check:** Recent logs for specific error patterns
3. **Temporary:** If critical, consider rolling back
4. **Report:** Send detailed issue description

## 📝 MIGRATION LOG TEMPLATE

Fill this out during migration:

```
Migration Date: ___________
Start Time: ___________
Database Backup Location: ___________

Pre-Migration Counts:
- Attendances: _______
- TaskReports: _______  
- Leaves: _______
- Holidays: _______
- Employees: _______

Migration Results:
- Attendance: ✅/❌ (___ records processed)
- TaskReport: ✅/❌ (___ records processed)
- Leave: ✅/❌ (___ records processed) 
- Holiday: ✅/❌ (___ records processed)
- Employee: ✅/❌ (___ records processed)

End Time: ___________
Total Duration: ___________

Post-Migration Verification:
- Application starts: ✅/❌
- Check-in works: ✅/❌
- Times display correctly: ✅/❌
- Admin functions work: ✅/❌

Issues Encountered:
___________

Resolution Steps:
___________

Final Status: SUCCESS/ROLLBACK/PARTIAL
```

## 🎯 SUCCESS CRITERIA

Migration is considered successful when:

1. ✅ All database records converted without data loss
2. ✅ Application starts and runs normally  
3. ✅ Times display in correct IST format
4. ✅ All attendance functionality works
5. ✅ No timezone conversion errors
6. ✅ Performance is same or better
7. ✅ Users can work normally without issues

---

**Remember:** This is a one-time migration. Once completed successfully, the application will be much simpler and more reliable for Indian operations!