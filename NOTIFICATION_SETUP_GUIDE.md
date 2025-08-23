# HRMS Notification System Setup Guide

Complete setup guide for Email (OAuth2), WhatsApp, and Push notifications in your HRMS system.

## 🚀 Quick Overview

Your HRMS supports three notification channels:
- **📧 Email** - OAuth2 with Gmail (modern & secure)  
- **💬 WhatsApp** - WhatsApp Web integration
- **🔔 Push** - Browser push notifications

## 📧 Email Service Setup (OAuth2)

### Step 1: Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API:
   - Go to **APIs & Services** → **Library**
   - Search "Gmail API" → Click → **Enable**

### Step 2: Create OAuth2 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Configure OAuth consent screen if prompted:
   - User Type: **External**
   - App name: **HRMS Email Service**
   - Add your email in test users
4. Application type: **Web application**
5. Authorized redirect URIs: `https://developers.google.com/oauthplayground`
6. **Save** and copy `Client ID` and `Client Secret`

### Step 3: Generate Refresh Token
1. Go to [OAuth2 Playground](https://developers.google.com/oauthplayground)
2. Click gear icon → Check **Use your own OAuth credentials**
3. Enter your `Client ID` and `Client Secret`
4. In **Step 1**: Select **Gmail API v1** → `https://www.googleapis.com/auth/gmail.send`
5. Click **Authorize APIs** → Sign in → Allow
6. In **Step 2**: Click **Exchange authorization code for tokens**
7. Copy the **refresh_token**

### Step 4: Environment Variables
Add to your `backend/.env`:
```bash
# Email OAuth2 Configuration
GOOGLE_CLIENT_ID=your-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
EMAIL_USER=your-email@gmail.com
EMAIL_FROM="HRMS System <noreply@yourcompany.com>"
```

## 💬 WhatsApp Service Setup

### Step 1: Enable WhatsApp Service
The WhatsApp service is now enabled by default. No code changes needed.

### Step 2: First-Time Setup
1. Start your backend server: `cd backend && pnpm dev`
2. Watch for QR code in terminal output
3. Scan QR code with your WhatsApp mobile app:
   - Open WhatsApp → **Settings** → **Linked Devices** → **Link a Device**
   - Scan the QR code displayed in terminal
4. Session will be saved for future use

### Step 3: Verify Connection
- Terminal should show: "WhatsApp client is ready!"
- Session persists - no need to scan QR again on restart

## 🔔 Push Notification Setup

### Step 1: Generate VAPID Keys
```bash
cd backend
npx web-push generate-vapid-keys
```

### Step 2: Environment Variables
Add to your `backend/.env`:
```bash
# Push Notification Configuration
VAPID_PUBLIC_KEY=your-generated-public-key
VAPID_PRIVATE_KEY=your-generated-private-key
VAPID_EMAIL=admin@yourcompany.com
```

### Step 3: Frontend Implementation (Future)
- Service worker registration needed in frontend
- Push subscription management
- Notification permission requests

## ⚙️ HRMS Configuration

### Step 1: Login as Admin/HR
Access your HRMS system with admin or HR credentials.

### Step 2: Navigate to Settings
Go to **Settings** → **Notifications** tab

### Step 3: Configure Notification Preferences
- **HR Contacts**:
  - Add HR email addresses
  - Add HR phone numbers (format: 9012345678)
- **Service Toggle**:
  - Enable Email notifications
  - Enable WhatsApp notifications  
  - Enable Push notifications
- **Preferences**:
  - Holiday reminder days
  - Milestone alerts settings

## 🧪 Testing Your Setup

### Method 1: API Testing (Admin/HR only)
```bash
# Test HR notifications
POST /api/notifications/test
Content-Type: application/json
{
  "type": "hr"
}

# Test employee notifications  
POST /api/notifications/test
Content-Type: application/json
{
  "type": "all"
}

# Check system status
GET /api/notifications/status
```

### Method 2: System Status Check
```bash
GET /api/notifications/status
```
Response shows service readiness:
```json
{
  "notification": {
    "initialized": true,
    "emailReady": true,
    "whatsappReady": true,
    "pushReady": true
  }
}
```

## 📋 Notification Types Supported

Your system will automatically send notifications for:

- **Leave Requests** → HR
- **Help Requests** → HR  
- **Attendance Regularization** → HR
- **Holiday Reminders** → All Employees
- **Announcements** → All Employees
- **Employee Milestones** → HR
- **Leave Status Updates** → Employee
- **Regularization Status Updates** → Employee

## 🔧 Troubleshooting

### Email Service Issues
- ✅ Check all 4 environment variables are set
- ✅ Verify OAuth2 credentials are correct
- ✅ Ensure Gmail API is enabled
- ✅ Check refresh token hasn't expired

### WhatsApp Service Issues  
- ✅ Check QR code scanning was successful
- ✅ Ensure phone has stable internet
- ✅ Verify WhatsApp account is active
- ✅ Check server logs for connection status

### Push Service Issues
- ✅ Verify VAPID keys are generated correctly
- ✅ Check VAPID_EMAIL format (must include mailto:)
- ✅ Frontend service worker implementation needed

## 📞 Phone Number Format

- **Database Storage**: `9012345678` (10 digits, no country code)
- **WhatsApp Format**: System automatically adds `+91` prefix
- **HR Configuration**: Enter 10-digit numbers in settings

## 🚀 Production Deployment

1. **Environment Variables**: Ensure all required vars are in production `.env`
2. **WhatsApp Session**: Transfer session files or re-scan QR in production
3. **Gmail Quotas**: Gmail has daily sending limits (~100-150 emails/day for regular accounts)
4. **Monitoring**: Check `/api/notifications/status` endpoint regularly

---

## ✅ Setup Checklist

- [ ] Google Cloud project created & Gmail API enabled
- [ ] OAuth2 credentials generated
- [ ] Refresh token obtained via OAuth Playground  
- [ ] All email environment variables added
- [ ] WhatsApp QR code scanned successfully
- [ ] VAPID keys generated for push notifications
- [ ] HR contacts configured in HRMS settings
- [ ] Notification services enabled in HRMS
- [ ] Test notifications sent successfully
- [ ] System status shows all services ready

Your notification system is now ready for production use! 🎉