# HRMS API Documentation

A comprehensive REST API for the Human Resource Management System (HRMS) with AI chatbot, WhatsApp notifications, and PDF generation capabilities.

## Base Configuration

**Base URL:** `http://localhost:4000/api`  
**Production URL:** `https://your-api-domain.railway.app/api`

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

**Token Acquisition:** Obtain tokens via `/api/auth/login` endpoint.  
**Token Expiry:** Tokens expire after 7 days by default.

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ },
  "pagination": { /* for paginated endpoints */ },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🔐 Authentication & User Management

### Authentication

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/auth/register` | Register new user | Admin/HR | `{email, password, role, name}` |
| POST | `/auth/login` | User login | Public | `{email, password}` |
| POST | `/auth/forgot-password` | Request password reset | Public | `{email}` |
| POST | `/auth/reset-password` | Reset password with token | Public | `{token, newPassword}` |

### User Management

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| GET | `/users` | Get all users | Admin/HR | - |
| GET | `/users/missing-employee-id` | Users without employee ID | Admin/HR | - |
| GET | `/users/by-employee-id/:employeeId` | Get user by employee ID | Admin/HR | - |

### Password Reset Requests

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/password-reset/request` | Submit reset request | Public | `{email, reason}` |
| GET | `/password-reset/requests` | Get all reset requests | Admin/HR | Query: `?status=pending` |
| PUT | `/password-reset/request/:id/approve` | Approve reset request | Admin/HR | `{temporaryPassword}` |
| PUT | `/password-reset/request/:id/reject` | Reject reset request | Admin/HR | `{reason}` |

---

## 🔗 User-Employee Linking

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/employees/link` | Link user to employee record | Admin/HR | `{userId, employeeId}` |
| GET | `/users/missing-employee-id` | Get users without employee links | Admin/HR | - |
| GET | `/users/by-employee-id/:employeeId` | Get user by employee ID | Admin/HR | - |

**Linking System:**
- Users are authenticated accounts with roles
- Employees are HR records with detailed information
- Linking connects authentication with HR data
- API-based linking mechanism via endpoints above

## 👥 Employee Management

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/employees/create` | Create new employee | Admin/HR | Employee data object |
| GET | `/employees` | Get all employees | Admin/HR | Query params for filtering |
| GET | `/employees/profile` | Get own profile | All auth | - |
| GET | `/employees/:id` | Get employee by ID | Admin/HR | - |
| PUT | `/employees/update/:id` | Update employee | Admin/HR | Employee update data |
| PUT | `/employees/toggle-status/:id` | Toggle employee status | Admin/HR | - |

**Employee Data Schema:**
```json
{
  "name": "string",
  "email": "string", 
  "phone": "string (10 digits)",
  "aadhaarNumber": "string (12 digits)",
  "department": "string",
  "designation": "string",
  "dateOfJoining": "date",
  "salary": "number",
  "personalDetails": {
    "dateOfBirth": "date",
    "gender": "string",
    "address": "object",
    "emergencyContact": "object",
    "parentDetails": "object"
  },
  "bankDetails": {
    "accountNumber": "string",
    "ifscCode": "string",
    "bankName": "string"
  },
  "professionalDetails": {
    "employeeId": "string",
    "workLocation": "string",
    "reportingManager": "string"
  }
}
```

---

## ⏰ Attendance Management

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/attendance/checkin` | Check in attendance | All auth | `{checkInTime?, location?}` |
| POST | `/attendance/checkout` | Check out attendance | All auth | `{checkOutTime?}` |
| GET | `/attendance` | Get attendance records | All auth | Query params |
| GET | `/attendance/my` | Get own attendance | All auth | Query params |
| GET | `/attendance/missing-checkouts` | Missing checkouts for regularization | All auth | - |
| GET | `/attendance/today-with-absents` | Today's attendance summary | Admin/HR | - |
| GET | `/attendance/admin-range` | Attendance for date range | Admin/HR | Query: date range |
| PUT | `/attendance/update/:recordId` | Update attendance record | Admin/HR | Attendance updates |

**Query Parameters:**
- `startDate`, `endDate`: Date range filter
- `employeeId`: Filter by employee (Admin/HR only)
- `page`, `limit`: Pagination
- `status`: Filter by status (present, absent, late, half-day)

**Attendance Rules:**
- Check-in before 9:55 AM = Present
- Check-in after 9:55 AM = Late
- Work hours < 4 = Half-day
- No check-in = Absent (unless on approved leave)

---

## 🏖️ Leave Management

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/leaves/request` | Request leave | All auth | `{type, startDate, endDate, reason}` |
| GET | `/leaves` | Get leaves (role-based) | All auth | Query params |
| GET | `/leaves/my` | Get own leaves | All auth | Query params |
| GET | `/leaves/all` | Get all leaves | Admin/HR | Query params |
| PUT | `/leaves/:leaveId/status` | Approve/reject leave | Admin/HR | `{status, adminComments?}` |

**Leave Types:**
- `annual`: Annual leave
- `sick`: Sick leave
- `casual`: Casual leave
- `maternity`: Maternity leave
- `paternity`: Paternity leave
- `emergency`: Emergency leave

**Leave Status:**
- `pending`: Awaiting approval
- `approved`: Approved by admin/HR
- `rejected`: Rejected with reason

---

## 💰 Salary Management

### Salary Structures

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/salary-structures` | Create/update salary structure | Admin/HR | Salary structure data |
| GET | `/salary-structures` | Get all salary structures | Admin/HR | Query params |
| GET | `/salary-structures/employees-without-structure` | Employees without structure | Admin/HR | - |
| GET | `/salary-structures/stats/overview` | Salary statistics | Admin/HR | - |
| GET | `/salary-structures/:employeeId` | Get structure by employee | Admin/HR | - |
| DELETE | `/salary-structures/:employeeId` | Delete salary structure | Admin/HR | - |

### Salary Slips

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/salary-slips` | Create/update salary slip | Admin/HR | Salary slip data |
| GET | `/salary-slips` | Get all salary slips | Admin/HR | Query params |
| GET | `/salary-slips/:employeeId/:month/:year` | Get specific salary slip | All auth | - |
| GET | `/salary-slips/employee/:employeeId` | Get all slips for employee | All auth | - |
| PUT | `/salary-slips/:employeeId/:month/:year/status` | Publish/unpublish slip | Admin/HR | `{status}` |
| PUT | `/salary-slips/bulk/status` | Bulk update slip status | Admin/HR | `{slips, status}` |
| DELETE | `/salary-slips/:employeeId/:month/:year` | Delete salary slip | Admin/HR | - |
| GET | `/salary-slips/tax-calculation` | Tax calculation preview | Admin/HR | Query params |

**Salary Structure Schema:**
```json
{
  "employeeId": "string",
  "basicSalary": "number",
  "allowances": {
    "hra": "number",
    "transport": "number",
    "medical": "number",
    "other": "number"
  },
  "deductions": {
    "pf": "number",
    "esi": "number",
    "tax": "number",
    "other": "number"
  },
  "taxRegime": "old" | "new"
}
```

---

## 🔄 Regularization Management

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/regularizations/request` | Submit regularization request | All auth | `{date, actualCheckIn?, actualCheckOut?, reason}` |
| GET | `/regularizations` | Get regularizations (role-based) | All auth | Query params |
| GET | `/regularizations/my` | Get own requests | All auth | Query params |
| GET | `/regularizations/all` | Get all requests | Admin/HR | Query params |
| POST | `/regularizations/:id/review` | Review request | Admin/HR | `{status, adminComments?}` |

---

## 🗓️ Holiday Management

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/holidays` | Create holiday | Admin/HR | `{name, date, type?, description?}` |
| GET | `/holidays` | Get all holidays | All auth | Query params |
| PUT | `/holidays/:id` | Update holiday | Admin/HR | Holiday update data |
| DELETE | `/holidays/:id` | Delete holiday | Admin/HR | - |

**Holiday Types:**
- `national`: National holiday
- `festival`: Religious/cultural festival
- `company`: Company-specific holiday

---

## 📊 Dashboard & Analytics

| Method | Endpoint | Description | Auth | Response |
|--------|----------|-------------|------|----------|
| GET | `/dashboard/admin` | Admin dashboard metrics | Admin/HR | Dashboard summary |
| GET | `/dashboard/alerts` | Birthday & milestone alerts | All auth | Array of alerts |

**Dashboard Metrics Include:**
- Total employees count
- Present/absent counts for today
- Pending leave requests
- Pending regularization requests
- Recent activities
- Monthly attendance trends

---

## 📋 Task Reports

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/task-reports/submit` | Submit task report | All auth | `{taskDescription, hoursSpent, date}` |
| GET | `/task-reports` | Get task reports (role-based) | All auth | Query params |
| GET | `/task-reports/my` | Get own task reports | All auth | Query params |
| GET | `/task-reports/all` | Get all task reports | Admin/HR | Query params |

---

## 📢 Announcements & Communication

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/announcements` | Create announcement | Admin/HR | `{title, content, type?, targetRoles?}` |
| GET | `/announcements` | Get announcements | All auth | Query params |
| GET | `/announcements/:id` | Get announcement by ID | All auth | - |
| PUT | `/announcements/:id` | Update announcement | Admin/HR | Update data |
| DELETE | `/announcements/:id` | Delete announcement | Admin/HR | - |

**Target Roles:** `admin`, `hr`, `employee`, `all`

---

## 📄 Document & PDF Management

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/documents/upload` | Upload document | All auth | FormData with file |
| GET | `/documents/employee/:employeeId` | Get employee documents | All auth | - |
| DELETE | `/documents/:id` | Delete document | All auth | - |
| GET | `/salary-slips/:employeeId/:month/:year/pdf` | Download salary slip PDF | All auth | - |

**PDF Generation Features:**
- Salary slip PDF generation with company branding
- Document uploads with categorization
- Secure file storage and retrieval via AWS S3
- Multiple format support (PDF, DOC, images)
- Automatic PDF generation for salary slips

---

## 🤖 HR Chatbot (OpenAI Integration)

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/chat` | Send message to AI chatbot | All auth | `{message, conversation_id?}` |
| GET | `/chat/history/:conversation_id` | Get conversation history | All auth | - |
| DELETE | `/chat/clear/:conversation_id` | Clear specific conversation | All auth | - |
| DELETE | `/chat/clear` | Clear all conversations | All auth | `{clear_all: true}` |
| GET | `/chat/health` | Check chat service health | All auth | - |

**AI Chatbot Features:**
- Powered by OpenAI GPT for intelligent HR assistance
- Contextual conversations about HR policies
- Employee data queries and assistance
- 24/7 availability for common HR questions
- Conversation history and context retention

---

## 📱 WhatsApp Integration

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/notifications/whatsapp/send` | Send WhatsApp notification | Admin/HR | `{phoneNumber, message, type}` |
| GET | `/notifications/whatsapp/status` | Check WhatsApp service status | Admin/HR | - |
| POST | `/notifications/whatsapp/broadcast` | Broadcast to multiple users | Admin/HR | `{recipients, message}` |

**WhatsApp Features:**
- Birthday and anniversary notifications
- Leave approval/rejection alerts  
- Salary slip notifications
- Emergency announcements
- Service status monitoring
- Automated employee communications

---

## 📄 Policy Management

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/policies` | Create policy | Admin/HR | `{title, content, category?, isActive?}` |
| GET | `/policies` | Get all policies | Admin/HR | Query params |
| GET | `/policies/active` | Get active policies | All auth | - |
| GET | `/policies/statistics` | Get policy statistics | Admin/HR | - |
| GET | `/policies/:id` | Get policy by ID | All auth | - |
| PUT | `/policies/:id` | Update policy | Admin/HR | Update data |
| DELETE | `/policies/:id` | Soft delete policy | Admin/HR | - |
| DELETE | `/policies/:id/permanent` | Permanently delete policy | Admin/HR | - |

---

## ⚙️ Settings & Configuration

### Global Settings

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| GET | `/settings/global` | Get global settings | Admin/HR | - |
| PUT | `/settings/global` | Update global settings | Admin/HR | Settings data |
| GET | `/settings/effective` | Get effective settings | All auth | - |

### Department Management

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| GET | `/settings/department/:department` | Get department settings | Admin/HR | - |
| PUT | `/settings/department/:department` | Update department settings | Admin/HR | Settings data |
| DELETE | `/settings/department/:department` | Delete department settings | Admin/HR | - |
| GET | `/settings/departments/list` | Get departments list | Admin/HR | - |
| GET | `/settings/departments/stats` | Get department statistics | Admin/HR | - |
| POST | `/settings/departments` | Add new department | Admin/HR | `{name, description?}` |
| PUT | `/settings/departments/:oldName/rename` | Rename department | Admin/HR | `{newName}` |
| DELETE | `/settings/departments/:name` | Delete department | Admin/HR | - |

---

## 📁 Document Management

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/documents/upload` | Upload document | All auth | FormData with file |
| GET | `/documents/employee/:employeeId` | Get employee documents | All auth | - |
| DELETE | `/documents/:id` | Delete document | All auth | - |

**Supported File Types:** PDF, DOC, DOCX, JPG, PNG, GIF  
**Max File Size:** 10MB  
**Upload via FormData:**
```javascript
const formData = new FormData();
formData.append('document', file);
formData.append('title', 'Document Title');
formData.append('category', 'identity'); // identity, education, experience, etc.
```

---

## 🔔 Notifications & Push Services

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/notifications/test` | Test notification system | Admin/HR | `{type: 'hr'|'all'|'milestone'|'holiday'}` |
| GET | `/notifications/status` | Get notification system status | Admin/HR | - |
| POST | `/notifications/subscribe` | Subscribe to push notifications | All auth | `{subscription}` |
| POST | `/notifications/unsubscribe` | Unsubscribe from push notifications | All auth | - |
| GET | `/notifications/vapid-key` | Get VAPID public key | Public | - |

---

## 🆘 Help & Support

| Method | Endpoint | Description | Auth | Request Body |
|--------|----------|-------------|------|--------------|
| POST | `/help` | Submit help inquiry | All auth | `{subject, message, priority?}` |
| GET | `/help/my` | Get own inquiries | All auth | Query params |
| GET | `/help/all` | Get all inquiries | Admin/HR | Query params |
| PATCH | `/help/:inquiryId` | Update inquiry status | Admin/HR | `{status, adminResponse?}` |

---

## 📈 Activity Feed

| Method | Endpoint | Description | Auth | Query Params |
|--------|----------|-------------|------|--------------|
| GET | `/activity` | Get activity feed | All auth | `page`, `limit`, `type`, `userId` |

**Activity Types:** `login`, `attendance`, `leave`, `salary`, `employee_update`, `system`

---

## 🏥 System Health & Monitoring

| Method | Endpoint | Description | Auth | Response |
|--------|----------|-------------|------|----------|
| GET | `/health` | System health check | Public | Health status |
| GET | `/` | API status check | Public | API status |
| GET | `/performance/cache-stats` | Cache performance stats | Public | Cache statistics |

---

## Error Codes & Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation error |
| 500 | Internal Server Error | Server error |

### Common Error Scenarios

**Authentication Errors:**
```json
{
  "success": false,
  "message": "Access denied. No token provided.",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Validation Errors:**
```json
{
  "success": false,
  "message": "Validation error",
  "error": {
    "phone": "Phone number must be exactly 10 digits",
    "email": "Invalid email format"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Authorization Errors:**
```json
{
  "success": false,
  "message": "Access denied. Insufficient permissions.",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Rate Limiting

- **General endpoints:** 100 requests per 15 minutes per IP
- **Authentication endpoints:** 5 requests per 15 minutes per IP
- **File upload endpoints:** 10 requests per 15 minutes per user

---

## Pagination

List endpoints support pagination via query parameters:

```http
GET /api/employees?page=1&limit=20&sortBy=name&sortOrder=asc
```

**Response includes pagination info:**
```json
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "limit": 20,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Filtering & Sorting

Most list endpoints support filtering and sorting:

**Common Query Parameters:**
- `search`: Text search across relevant fields
- `department`: Filter by department
- `status`: Filter by status
- `dateFrom`, `dateTo`: Date range filter
- `sortBy`: Field to sort by
- `sortOrder`: `asc` or `desc`

**Example:**
```http
GET /api/employees?department=IT&status=active&search=john&sortBy=name&sortOrder=asc
```

---

## Webhooks (Future Enhancement)

Planned webhook events:
- `employee.created`
- `attendance.checkin`
- `leave.approved`
- `salary.processed`

---

## SDK & Client Libraries

Official client libraries planned for:
- JavaScript/TypeScript
- Python
- PHP

---

## Support & Resources

- **API Status Page:** `/health`
- **Postman Collection:** Available on request
- **OpenAPI/Swagger Spec:** Coming soon
- **Support:** Create issue in GitHub repository

---

*Last Updated: January 2025*  
*API Version: 1.0*