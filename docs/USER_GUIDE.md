# HRMS User Guide

A comprehensive guide for using the Human Resource Management System effectively, organized by user roles.

## 🚀 Getting Started

### First Time Login

1. **Receive Credentials**
   - Your admin will provide you with login credentials
   - You'll receive an email with your username and temporary password

2. **Access the System**
   - Visit the HRMS web application
   - Enter your email and password
   - Change your password on first login

3. **Complete Your Profile**
   - Navigate to your profile section
   - Fill in all required personal information
   - Upload a profile picture (optional)

### Navigation Overview

The system has a responsive sidebar with role-based navigation:

- **Dashboard:** Overview of your data and quick actions
- **Profile:** Personal information and settings
- **Role-specific sections:** Based on your access level

---

## 👨‍💼 Admin User Guide

Administrators have full system access and user management capabilities.

### 🏠 Admin Dashboard

**What you'll see:**
- Total employees count
- Today's attendance summary
- Pending approvals (leaves, regularizations)
- System health status
- Recent activities
- Quick action buttons

**Key Metrics:**
- Present/absent employees today
- Pending leave requests
- Employees without salary structures
- Birthday and milestone alerts

### 👥 User Management

#### Creating New Users

1. **Navigate:** Go to "Users" → "Add New User"
2. **Fill Details:**
   ```
   - Email (required, must be unique)
   - Name (required)
   - Role (admin/hr/employee)
   - Temporary Password (system will generate if empty)
   ```
3. **Submit:** User will receive welcome email with credentials

#### Managing Existing Users

**View All Users:**
- Filter by role, status, or search by name/email
- See last login dates and activity status

**User Actions:**
- Edit user details
- Change user roles
- Activate/deactivate accounts
- Reset passwords
- Link users to employee records

#### Password Reset Management

**Handling Reset Requests:**
1. **Navigate:** "Users" → "Password Reset Requests"
2. **Review Request:** Check employee reason and identity
3. **Approve:** Generate temporary password and notify user
4. **Reject:** Provide reason and suggest alternative

### 👷 Employee Management

#### Adding New Employees

1. **Navigate:** "Employees" → "Add Employee"
2. **Personal Information:**
   ```
   - Full Name (required)
   - Email (required, unique)
   - Phone Number (10 digits, required)
   - Aadhaar Number (12 digits, required)
   - Date of Birth
   - Gender
   - Address details
   ```

3. **Professional Information:**
   ```
   - Employee ID (auto-generated or manual)
   - Department
   - Designation
   - Date of Joining
   - Reporting Manager
   - Work Location
   - Salary
   ```

4. **Bank Details:**
   ```
   - Account Number
   - IFSC Code
   - Bank Name
   - Branch Name
   ```

5. **Emergency Contact:**
   ```
   - Contact Person Name
   - Relationship
   - Phone Number
   - Address
   ```

#### Managing Employee Records

**Employee List View:**
- Search and filter employees
- Sort by name, department, or join date
- Quick actions: view, edit, deactivate

**Employee Profile:**
- Complete personal and professional details
- Attendance history and statistics
- Leave balance and history
- Salary information
- Document uploads

**Bulk Operations:**
- Export employee data to Excel
- Bulk email communications
- Mass updates (coming soon)

### 📊 Attendance Management

#### Monitoring Daily Attendance

**Today's Overview:**
- Real-time attendance status
- Present/absent/late counts
- Missing checkouts
- Location-based attendance (if enabled)

**Attendance Reports:**
1. **Date Range Reports:**
   - Select start and end dates
   - Choose specific employees or departments
   - Export to Excel/PDF

2. **Monthly Summary:**
   - Department-wise attendance
   - Individual employee attendance
   - Working hours analysis

#### Attendance Corrections

**Manual Attendance Updates:**
1. **Navigate:** "Attendance" → "Attendance Records"
2. **Find Record:** Use filters to locate specific attendance
3. **Edit:** Update check-in/out times with reason
4. **Save:** Changes are logged for audit

**Bulk Corrections:**
- Upload CSV for multiple corrections
- Holiday marking (affects multiple employees)
- Working day adjustments

### 🏖️ Leave Management

#### Processing Leave Requests

**Pending Approvals:**
1. **Dashboard Alert:** View pending count on dashboard
2. **Navigate:** "Leaves" → "Pending Approvals"
3. **Review Request:**
   - Employee details and leave balance
   - Leave type and duration
   - Reason provided
   - Work coverage plan (if applicable)

4. **Decision:**
   - **Approve:** Leave is granted, balance updated
   - **Reject:** Provide reason for rejection
   - **Request Info:** Ask for additional details

**Leave Analytics:**
- Department-wise leave trends
- Leave type analysis
- Peak leave periods
- Employee leave patterns

#### Leave Policy Management

**Configure Leave Types:**
```
- Annual Leave: 21 days per year
- Sick Leave: 12 days per year
- Casual Leave: 12 days per year
- Maternity Leave: 180 days
- Paternity Leave: 15 days
```

**Leave Rules:**
- Minimum advance notice requirements
- Maximum consecutive days
- Blackout periods (if any)
- Carry forward policies

### 💰 Salary Management

#### Salary Structure Management

**Creating Salary Structures:**
1. **Navigate:** "Salary" → "Salary Structures"
2. **Select Employee:** Choose employee without structure
3. **Define Components:**
   ```
   Earnings:
   - Basic Salary (required)
   - House Rent Allowance (HRA)
   - Transport Allowance
   - Medical Allowance
   - Other Allowances
   
   Deductions:
   - Provident Fund (PF)
   - Employee State Insurance (ESI)
   - Professional Tax
   - Income Tax (TDS)
   - Other Deductions
   ```

4. **Tax Regime:** Choose old or new tax regime
5. **Save:** Structure is effective immediately

#### Salary Slip Generation

**Monthly Process:**
1. **Navigate:** "Salary" → "Generate Salary Slips"
2. **Select Period:** Choose month and year
3. **Select Employees:** All or specific employees
4. **Review:** Check calculations and tax deductions
5. **Generate:** Create draft salary slips

**Publishing Salary Slips:**
1. **Review:** Verify all calculations are correct
2. **Publish:** Make slips visible to employees
3. **Notify:** Automatic email notifications sent
4. **Bulk Actions:** Publish multiple slips at once

**Salary Reports:**
- Monthly payroll summaries
- Tax deduction reports
- Department-wise salary analysis
- Year-end tax statements

### ⚙️ System Settings

#### Global Configuration

**Company Settings:**
```
- Company Name
- Address and Contact
- Logo Upload
- Time Zone
- Currency
- Financial Year
```

**Attendance Settings:**
```
- Working Hours (e.g., 9:30 AM - 6:30 PM)
- Late Mark Time (e.g., 9:55 AM)
- Minimum Working Hours for Full Day
- Weekend Configuration
- Holiday Calendar
```

**Leave Settings:**
```
- Leave Types and Balances
- Approval Workflow
- Carry Forward Rules
- Encashment Policies
```

#### Department Management

**Adding Departments:**
1. **Navigate:** "Settings" → "Departments"
2. **Add Department:** Name and description
3. **Assign Employees:** Move employees to departments
4. **Set HOD:** Assign Head of Department

**Department Analytics:**
- Employee count per department
- Department-wise attendance
- Leave trends by department
- Salary distribution

### 📱 Notifications & Communication

#### Announcement Management

**Creating Announcements:**
1. **Navigate:** "Communication" → "Announcements"
2. **Draft Announcement:**
   ```
   - Title (required)
   - Content (rich text editor)
   - Target Audience (all/specific roles/departments)
   - Publish Date
   - Expiry Date (optional)
   ```
3. **Publish:** Immediate or scheduled publication

#### Notification Settings

**Email Notifications:**
- Leave approval/rejection alerts
- Salary slip generation notifications
- Birthday and anniversary alerts
- System maintenance notifications

**Push Notifications:**
- Real-time browser notifications
- Mobile app notifications (if applicable)
- WhatsApp integration (if configured)

---

## 👩‍💼 HR User Guide

HR users have comprehensive employee management capabilities without system administration features.

### 🏠 HR Dashboard

**Dashboard Overview:**
- Department metrics you manage
- Pending approvals in your queue
- Recent employee activities
- Quick access to common tasks

### 👥 Employee Management (HR Scope)

**Employee Lifecycle Management:**
- Onboarding new employees
- Updating employee information
- Managing employee status changes
- Handling employee exits

**Employee Data Access:**
- View all active employees
- Access complete employee profiles
- Generate employee reports
- Manage employee documents

### 📊 HR Analytics

**Reports Available:**
- Headcount reports
- Turnover analysis
- Department-wise statistics
- Attendance trends
- Leave utilization reports

**Export Options:**
- Excel spreadsheets
- PDF reports
- CSV data files
- Email scheduled reports

### 🏖️ Leave & Attendance (HR View)

**Daily Operations:**
- Review and approve leave requests
- Monitor daily attendance
- Handle attendance regularizations
- Manage attendance exceptions

**Monthly Reporting:**
- Generate attendance reports
- Process payroll attendance data
- Handle month-end corrections
- Submit compliance reports

---

## 👨‍💻 Employee User Guide

Employees have access to their personal data and can perform self-service operations.

### 🏠 Employee Dashboard

**Your Personal Overview:**
- Today's attendance status
- Leave balance summary
- Recent activities
- Pending actions (regularizations, forms)
- Birthday alerts for colleagues

**Quick Actions:**
- Check in/Check out
- Apply for leave
- View salary slips
- Update profile
- Request regularization

### ⏰ Attendance Management

#### Daily Check-in/Check-out

**Checking In:**
1. **Navigate:** Dashboard or "Attendance" section
2. **Location:** System may request location (if enabled)
3. **Click:** "Check In" button
4. **Confirmation:** Success message with time recorded

**Checking Out:**
1. **Navigate:** Same location as check-in
2. **Click:** "Check Out" button
3. **Summary:** View today's working hours
4. **Status:** System calculates attendance status

**Attendance Status Guide:**
- **Present:** Checked in before 9:55 AM, worked full hours
- **Late:** Checked in after 9:55 AM but worked full hours
- **Half Day:** Worked less than 4 hours
- **Absent:** No check-in recorded

#### Viewing Attendance History

**Monthly View:**
- Calendar view with color-coded attendance
- Total working days and present days
- Late arrivals and early departures
- Working hours summary

**Detailed History:**
- Date-wise attendance records
- Check-in and check-out times
- Location information (if enabled)
- Regularization history

#### Attendance Regularization

**When to Request Regularization:**
- Forgot to check in/out
- System failure during check-in/out
- Working from different location
- Emergency situations

**How to Request:**
1. **Navigate:** "Attendance" → "Regularization"
2. **Select Date:** Choose the date to regularize
3. **Provide Details:**
   ```
   - Actual check-in time
   - Actual check-out time
   - Reason for regularization
   - Supporting documents (if applicable)
   ```
4. **Submit:** Request goes to HR/Admin for approval

### 🏖️ Leave Management

#### Understanding Your Leave Balance

**Leave Types & Balance:**
```
Annual Leave: 21 days per year
- Earned: 1.75 days per month
- Available: Current balance
- Used: Days taken this year
- Pending: Applied but not approved

Sick Leave: 12 days per year
- Cannot be carried forward
- Requires medical certificate (>3 days)

Casual Leave: 12 days per year
- For personal emergencies
- Cannot be carried forward
```

#### Applying for Leave

**Leave Application Process:**
1. **Navigate:** "Leave" → "Apply Leave"
2. **Select Leave Type:** Choose appropriate type
3. **Choose Dates:**
   - Start date
   - End date (system calculates working days)
   - Half-day option available
4. **Provide Reason:** Explain purpose of leave
5. **Work Coverage:** Mention work delegation (if required)
6. **Submit:** Application goes to approving authority

**Leave Application Tips:**
- Apply well in advance (minimum 2-3 days)
- Check team calendar for conflicts
- Ensure work coverage is arranged
- Attach supporting documents if required

#### Managing Leave Requests

**Tracking Your Applications:**
- View all leave requests (pending, approved, rejected)
- Check approval status and comments
- Modify pending requests (if allowed)
- Cancel approved leaves (with restrictions)

**Leave Calendar:**
- View your approved leaves
- See team leave schedule
- Check company holidays
- Plan future leave applications

### 💰 Salary Information

#### Viewing Salary Slips

**Accessing Salary Slips:**
1. **Navigate:** "Salary" → "My Salary Slips"
2. **Select Period:** Choose month and year
3. **View Details:** Earnings, deductions, and net pay
4. **Download:** PDF copy for your records

**Understanding Your Salary Slip:**
```
Earnings:
- Basic Salary: Base component
- HRA: House Rent Allowance
- Transport: Conveyance allowance
- Medical: Medical reimbursement
- Other: Special allowances

Deductions:
- PF: Provident Fund (12% of basic)
- ESI: Employee State Insurance
- Professional Tax: State tax
- TDS: Tax Deducted at Source
- Other: Loan deductions, etc.

Net Pay: Total earnings minus total deductions
```

#### PDF Download Features

**Downloading Salary Slips:**
1. **Navigate:** "Salary" → "My Salary Slips"
2. **Select Period:** Choose month and year
3. **View/Download:** 
   - View in browser
   - Download PDF with company branding
   - Professional formatting for official use
4. **Features:**
   - Company logo and details
   - Employee information
   - Detailed earnings and deductions breakdown
   - Tax calculations and net pay
   - Digital signature (if configured)

#### Tax Information

**Tax Regime Selection:**
- Old regime vs new regime benefits
- Impact on your take-home salary
- Annual tax calculations
- Form 16 generation

**Tax Saving Investments:**
- PF contributions
- Insurance premiums
- Investment declarations
- Tax exemption certificates

### 📄 Profile Management

#### Personal Information

**Updating Your Profile:**
1. **Navigate:** "Profile" → "Personal Information"
2. **Editable Fields:**
   ```
   - Contact number
   - Address details
   - Emergency contact
   - Bank account information
   - Tax-related declarations
   ```
3. **Restricted Fields:** Name, email, employee ID (contact HR)
4. **Save Changes:** Updates require verification

#### Document Management

**Uploading Documents:**
1. **Navigate:** "Profile" → "Documents"
2. **Document Categories:**
   ```
   - Identity Proof (Aadhaar, PAN)
   - Address Proof
   - Educational Certificates
   - Experience Letters
   - Medical Reports
   - Other Documents
   ```
3. **Upload Requirements:**
   - PDF format preferred
   - Maximum 10MB file size
   - Clear, readable scans

### 💬 Communication & Support

#### HR Chatbot

**Using the AI Assistant:**
1. **Access:** Click chat icon (bottom-right)
2. **Ask Questions:** HR policies, leave balance, salary info
3. **Get Instant Answers:** 24/7 availability
4. **Escalate:** Complex issues redirect to HR

**Common Queries:**
- "What's my leave balance?"
- "How do I apply for maternity leave?"
- "When will I get my salary slip?"
- "How to request attendance regularization?"

#### Help & Support

**Getting Help:**
1. **Navigate:** "Help & Support"
2. **Submit Request:**
   ```
   - Category: Technical, HR, Payroll, etc.
   - Priority: Low, Medium, High
   - Description: Detailed explanation
   - Attachments: Screenshots if needed
   ```
3. **Track Status:** Monitor request progress
4. **Rate Resolution:** Provide feedback

### 📱 Mobile Experience

#### Mobile Features

**Optimized for Mobile:**
- Responsive design for all screen sizes
- Touch-friendly buttons and forms
- Swipe gestures for navigation
- Quick check-in/out actions

**Mobile Specific Features:**
- Location-based attendance
- Camera integration for document upload
- Push notifications
- Offline functionality (limited)

#### Mobile Best Practices

**For Better Experience:**
- Use latest browser version
- Enable location services (if required)
- Allow notifications for important updates
- Bookmark the application for quick access

---

## 🔔 Notifications & Alerts

### Email Notifications

**What You'll Receive:**
- Leave approval/rejection updates
- Salary slip availability
- Birthday and anniversary wishes
- Policy updates and announcements
- System maintenance notifications

### Push Notifications

**Browser Notifications:**
- Real-time attendance confirmations
- Leave request updates
- Important announcements
- Deadline reminders

**Mobile Notifications:**
- Same as browser notifications
- Optimized for mobile devices
- Battery-efficient delivery

### WhatsApp Notifications

**Automated WhatsApp Messages:**
- Birthday and work anniversary alerts
- Leave approval/rejection notifications
- Important HR announcements
- Emergency communications
- Salary slip availability notifications

**WhatsApp Features:**
- Delivered to registered mobile number
- No app installation required
- Works on all phone types
- Instant delivery and read receipts
- Professional formatting with company branding

**Managing WhatsApp Notifications:**
- Update mobile number in profile to receive notifications
- Contact HR to opt-in or opt-out of WhatsApp notifications
- Emergency notifications cannot be disabled

---

## 🆘 Troubleshooting & FAQ

### Common Issues & Solutions

**Login Problems:**
- **Forgot Password:** Use "Forgot Password" link
- **Account Locked:** Contact HR/Admin
- **Invalid Credentials:** Check email and password

**Attendance Issues:**
- **Can't Check In:** Check internet connection, try refresh
- **Wrong Time Recorded:** Submit regularization request
- **Location Error:** Enable location services or contact IT

**Leave Application Problems:**
- **Insufficient Balance:** Check leave balance, consider LOP
- **Can't Submit:** Ensure all fields are filled correctly
- **Application Rejected:** Check admin comments, reapply if needed

**Salary Slip Issues:**
- **Slip Not Visible:** May not be published yet, contact HR
- **Calculation Error:** Report to HR with specific details
- **Download Problems:** Try different browser or contact IT

### Getting Help

**Self-Service Options:**
1. **FAQ Section:** Common questions and answers
2. **User Guide:** This comprehensive guide
3. **Video Tutorials:** Step-by-step video guides
4. **Chatbot:** Instant answers to common queries

**Human Support:**
1. **Help Desk:** Submit support ticket
2. **HR Team:** Employee-related queries
3. **IT Support:** Technical issues
4. **Admin:** System access and permissions

### System Requirements

**Supported Browsers:**
- Chrome (recommended)
- Firefox
- Safari
- Edge

**Device Requirements:**
- Desktop/Laptop: Any modern computer
- Mobile: iOS 12+ or Android 8+
- Internet: Stable connection required
- Screen Resolution: 320px minimum width

---

## 📊 Reports & Analytics (Role-Based)

### Admin/HR Reports

**Employee Reports:**
- Employee master list
- New joiners and exits
- Department-wise headcount
- Employee birthday reports

**Attendance Reports:**
- Daily attendance summary
- Monthly attendance register
- Late arrival reports
- Absenteeism analysis

**Leave Reports:**
- Leave balance reports
- Leave utilization analysis
- Department-wise leave trends
- Leave approval summaries

**Payroll Reports:**
- Monthly payroll register
- Tax deduction summaries
- Bank transfer reports
- Compliance reports

### Employee Reports

**Personal Reports:**
- Attendance history
- Leave history and balance
- Salary slip history
- Tax statements

**Export Options:**
- Download as PDF
- Export to Excel
- Email to personal address
- Print-friendly format

---

## 🔒 Security & Privacy

### Data Protection

**Your Data is Secure:**
- Encrypted data transmission
- Regular security updates
- Access logging and monitoring
- Role-based data access

**Privacy Guidelines:**
- Personal data used only for HR purposes
- No sharing with unauthorized parties
- Right to access your data
- Report privacy concerns to admin

### Best Practices

**Account Security:**
- Use strong passwords
- Don't share login credentials
- Log out from shared computers
- Report suspicious activities

**Data Handling:**
- Don't share sensitive information
- Verify recipient before sharing data
- Use secure channels for communication
- Report data breaches immediately

---

## 📞 Contact Information

### Support Channels

**Technical Support:**
- Email: it-support@yourcompany.com
- Phone: +1-XXX-XXX-XXXX
- Hours: 9:00 AM - 6:00 PM (weekdays)

**HR Support:**
- Email: hr@yourcompany.com
- Phone: +1-XXX-XXX-XXXX
- Hours: 9:00 AM - 6:00 PM (weekdays)

**Emergency Contact:**
- After-hours technical issues
- Critical system failures
- Security incidents

---

*This user guide is regularly updated. Last updated: January 2025*  
*For the latest version, check the system's help section or contact your administrator.*