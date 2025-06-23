# HRMS API Documentation

## Base Configuration
- **Base URL**: `http://localhost:4000/api` (development) or your production URL
- **Authentication**: Bearer token in Authorization header
- **Content Type**: `application/json`

## Authentication

### POST `/auth/register`
Create a new user account (Admin/HR only)
- **Access**: Admin, HR
- **Body**:
```json
{
  "name": "string",
  "email": "string", 
  "password": "string"
}
```

### POST `/auth/login`
User login
- **Access**: Public
- **Body**:
```json
{
  "email": "string",
  "password": "string"
}
```

### POST `/auth/forgot-password`
Request password reset
- **Access**: Public
- **Body**:
```json
{
  "email": "string"
}
```

### POST `/auth/reset-password`
Reset password with token
- **Access**: Public
- **Body**:
```json
{
  "token": "string",
  "newPassword": "string"
}
```

## Employee Management

### POST `/employees/create`
Create new employee
- **Access**: Admin, HR
- **Body**:
```json
{
  "name": "string",
  "email": "string",
  "employeeId": "string",
  "department": "string",
  "designation": "string",
  "dateOfJoining": "date",
  "salary": "number"
}
```

### GET `/employees`
Get all employees
- **Access**: Admin, HR
- **Query Parameters**: 
  - `page`: number
  - `limit`: number
  - `department`: string
  - `search`: string

### GET `/employees/:id`
Get employee by ID
- **Access**: Admin, HR

### PUT `/employees/update/:id`
Update employee information
- **Access**: Admin, HR
- **Body**: Same as create employee

### GET `/employees/profile`
Get current user's employee profile
- **Access**: Admin, HR, Employee

### POST `/employees/link`
Link user account to employee record
- **Access**: Admin, HR
- **Body**:
```json
{
  "userId": "string",
  "employeeId": "string"
}
```

## User Management

### GET `/users`
Get all users
- **Access**: Admin, HR

### GET `/users/missing-employee-id`
Get users without linked employee records
- **Access**: Admin, HR

### GET `/users/by-employee-id/:employeeId`
Get user by employee ID
- **Access**: Admin, HR

## Attendance Management

### POST `/attendance/checkin`
Employee check-in
- **Access**: All authenticated users
- **Body**:
```json
{
  "location": "string" // optional
}
```

### POST `/attendance/checkout`
Employee check-out
- **Access**: All authenticated users
- **Body**:
```json
{
  "tasks": ["string"] // array of task descriptions
}
```

### GET `/attendance`
Get attendance records
- **Access**: All authenticated users
- **Query Parameters**:
  - `employeeId`: string
  - `startDate`: date (YYYY-MM-DD)
  - `endDate`: date (YYYY-MM-DD)
  - `page`: number
  - `limit`: number

### GET `/attendance/records`
Alternative endpoint for attendance records
- **Access**: All authenticated users
- **Query Parameters**: Same as above

### GET `/attendance/my`
Get current user's attendance with pagination
- **Access**: All authenticated users
- **Query Parameters**:
  - `page`: number
  - `limit`: number
  - `startDate`: date
  - `endDate`: date

### GET `/attendance/missing-checkouts`
Get attendance records with missing checkouts for regularization
- **Access**: All authenticated users

### GET `/attendance/today-with-absents`
Get today's attendance including absent employees
- **Access**: All authenticated users

### GET `/attendance/employee-with-absents`
Get employee attendance including absent days
- **Access**: All authenticated users
- **Query Parameters**:
  - `employeeId`: string
  - `startDate`: date
  - `endDate`: date

## Leave Management

### POST `/leaves/request`
Request leave
- **Access**: All authenticated users
- **Body**:
```json
{
  "leaveType": "string", // "sick", "casual", "annual", etc.
  "startDate": "date",
  "endDate": "date",
  "reason": "string",
  "halfDay": "boolean"
}
```

### GET `/leaves/my`
Get current user's leave requests
- **Access**: All authenticated users

### GET `/leaves`
Get leave requests (filtered by role)
- **Access**: All authenticated users
- Returns all leaves for Admin/HR, own leaves for employees

### GET `/leaves/all`
Get all leave requests
- **Access**: Admin, HR

### PUT `/leaves/:leaveId/status`
Approve/reject leave request
- **Access**: Admin, HR
- **Body**:
```json
{
  "status": "string", // "approved", "rejected"
  "reviewComment": "string"
}
```

## Holiday Management

### POST `/holidays`
Create holiday
- **Access**: Admin, HR
- **Body**:
```json
{
  "title": "string",
  "date": "date",
  "isOptional": "boolean",
  "description": "string"
}
```

### GET `/holidays`
Get all holidays
- **Access**: Admin, HR, Employee

### PUT `/holidays/:id`
Update holiday
- **Access**: Admin, HR
- **Body**: Same as create holiday

### DELETE `/holidays/:id`
Delete holiday
- **Access**: Admin, HR

## Regularization Management

### POST `/regularizations/request`
Submit regularization request
- **Access**: All authenticated users
- **Body**:
```json
{
  "date": "date",
  "checkIn": "time",
  "checkOut": "time",
  "reason": "string"
}
```

### GET `/regularizations/my`
Get current user's regularization requests
- **Access**: All authenticated users

### GET `/regularizations`
Get regularization requests (filtered by role)
- **Access**: All authenticated users

### GET `/regularizations/all`
Get all regularization requests
- **Access**: Admin, HR

### POST `/regularizations/:id/review`
Review regularization request
- **Access**: Admin, HR
- **Body**:
```json
{
  "status": "string", // "approved", "rejected"
  "reviewComment": "string"
}
```

## Task Reports

### GET `/task-reports`
Get task reports (filtered by role)
- **Access**: All authenticated users
- **Query Parameters**:
  - `employeeId`: string
  - `startDate`: date
  - `endDate`: date
  - `page`: number
  - `limit`: number

### GET `/task-reports/my`
Get current user's task reports
- **Access**: All authenticated users

### GET `/task-reports/all`
Get all task reports
- **Access**: Admin, HR

## Announcements

### POST `/announcements`
Create announcement
- **Access**: Admin, HR
- **Body**:
```json
{
  "title": "string",
  "content": "string",
  "priority": "string", // "low", "medium", "high"
  "targetAudience": ["string"], // ["all", "admin", "hr", "employee"]
  "isActive": "boolean"
}
```

### GET `/announcements`
Get announcements
- **Access**: Admin, HR, Employee
- **Query Parameters**:
  - `status`: string
  - `priority`: string
  - `page`: number
  - `limit`: number

### GET `/announcements/:id`
Get announcement by ID
- **Access**: Admin, HR, Employee

### PUT `/announcements/:id`
Update announcement
- **Access**: Admin, HR
- **Body**: Same as create announcement

### DELETE `/announcements/:id`
Delete announcement
- **Access**: Admin, HR

## Help Desk

### POST `/help`
Submit help inquiry
- **Access**: All authenticated users
- **Body**:
```json
{
  "subject": "string",
  "message": "string",
  "priority": "string", // "low", "medium", "high"
  "category": "string"
}
```

### GET `/help/my`
Get current user's help inquiries
- **Access**: All authenticated users

### GET `/help/all`
Get all help inquiries
- **Access**: Admin, HR

### PATCH `/help/:inquiryId`
Update help inquiry status
- **Access**: Admin, HR
- **Body**:
```json
{
  "status": "string", // "open", "in-progress", "resolved", "closed"
  "response": "string"
}
```

## Dashboard

### GET `/dashboard/admin`
Get admin dashboard summary
- **Access**: Admin, HR

### GET `/dashboard/admin-summary`
Alternative endpoint for admin dashboard summary
- **Access**: Admin, HR

## Activity Feed

### GET `/activity`
Get activity feed
- **Access**: All authenticated users

### GET `/activity/feed`
Alternative endpoint for activity feed
- **Access**: All authenticated users

## Password Reset Requests

### POST `/password-reset/request`
Submit password reset request
- **Access**: Public
- **Body**:
```json
{
  "email": "string",
  "reason": "string"
}
```

### GET `/password-reset/requests`
Get all password reset requests
- **Access**: Admin, HR
- **Query Parameters**:
  - `status`: string ("pending", "approved", "rejected")

### PUT `/password-reset/request/:id/approve`
Approve password reset request
- **Access**: Admin, HR

### PUT `/password-reset/request/:id/reject`
Reject password reset request
- **Access**: Admin, HR
- **Body**:
```json
{
  "remarks": "string"
}
```

## Health Check

### GET `/api`
API health check
- **Access**: Public
- **Response**:
```json
{
  "success": true,
  "message": "HRMS API is working!",
  "timestamp": "ISO 8601 datetime"
}
```

## Error Handling

All endpoints return errors in the following format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information (in development)"
}
```

## HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Authentication
Include the JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Role-Based Access Control
- **Admin**: Full access to all endpoints
- **HR**: Same as admin for most endpoints
- **Employee**: Limited access, can only view/modify own records

## Notes
- All dates should be in ISO 8601 format (YYYY-MM-DD)
- Times should be in HH:MM format
- Pagination is supported on list endpoints with `page` and `limit` parameters
- The API uses MongoDB ObjectIds for resource identification