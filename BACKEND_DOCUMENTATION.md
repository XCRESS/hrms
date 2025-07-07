# HRMS Backend API Documentation for React Native Development

## Table of Contents
1. [Quick Start Guide](#quick-start-guide)
2. [API Base URL & Authentication](#api-base-url--authentication)
3. [Authentication Endpoints](#authentication-endpoints)
4. [Employee Management APIs](#employee-management-apis)
5. [Attendance Management APIs](#attendance-management-apis)
6. [Leave Management APIs](#leave-management-apis)
7. [Salary Management APIs](#salary-management-apis)
8. [Dashboard & Reports APIs](#dashboard--reports-apis)
9. [Utility APIs](#utility-apis)
10. [Error Handling](#error-handling)
11. [Data Models](#data-models)
12. [Security Implementation](#security-implementation)
13. [Architecture Details](#architecture-details)
14. [React Native Implementation Examples](#react-native-implementation-examples)

## Quick Start Guide

### API Base URL
```
Production: https://your-hrms-api.com/api
Development: http://localhost:5000/api
```

### Authentication Header
All protected endpoints require JWT token:
```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

### Standard Response Format
All API responses follow this format:
```javascript
{
  "success": boolean,
  "message": string,
  "data": object | null,
  "errors": object | null
}
```

## API Base URL & Authentication

### Environment Setup
```javascript
// React Native API configuration
const API_CONFIG = {
  baseURL: __DEV__ ? 'http://localhost:5000/api' : 'https://your-production-api.com/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
};
```

### JWT Token Management
```javascript
// Store token after login
await AsyncStorage.setItem('authToken', response.data.token);

// Add token to requests
const token = await AsyncStorage.getItem('authToken');
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

## Authentication Endpoints

### 1. User Registration
```javascript
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "employeeId": "EMP001",
  "role": "employee"
}

// Response
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "role": "employee",
      "employeeId": "EMP001"
    }
  }
}
```

### 2. User Login
```javascript
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

// Response
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "role": "employee",
      "employeeId": "EMP001"
    }
  }
}
```

### 3. Get User Profile
```javascript
GET /auth/profile
Authorization: Bearer jwt_token_here

// Response
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "role": "employee",
      "employeeId": "EMP001"
    }
  }
}
```

### 4. Password Reset Flow
```javascript
// Step 1: Request password reset
POST /password-reset/request
{
  "name": "John Doe",
  "email": "john@example.com"
}

// Step 2: Admin approves request (Admin only)
PUT /password-reset/request/:id/approve
Authorization: Bearer admin_token

// Step 3: User resets password with token
POST /password-reset/reset
{
  "resetToken": "secure_token_from_admin",
  "newPassword": "newSecurePassword123"
}
```

## Employee Management APIs

### 1. Get All Employees (Admin/HR)
```javascript
GET /employees?page=1&limit=10
Authorization: Bearer jwt_token_here

// Response
{
  "success": true,
  "message": "Employees fetched successfully",
  "data": {
    "employees": [...],
    "pagination": {
      "page": 1,
      "pages": 5,
      "total": 50,
      "limit": 10
    }
  }
}
```

### 2. Get Employee Details
```javascript
GET /employees/:id
Authorization: Bearer jwt_token_here

// Response
{
  "success": true,
  "message": "Employee details fetched successfully",
  "data": {
    "employee": {
      "employeeId": "EMP001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "department": "Engineering",
      "designation": "Software Developer",
      "dateOfJoining": "2023-01-15",
      // ... other fields
    }
  }
}
```

### 3. Create Employee (Admin/HR)
```javascript
POST /employees
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "department": "Engineering",
  "designation": "Software Developer",
  "dateOfJoining": "2023-01-15",
  "basicSalary": 50000
}
```

### 4. Update Employee
```javascript
PUT /employees/:id
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
  "firstName": "John Updated",
  "phone": "9876543210"
}
```

## Attendance Management APIs

### 1. Employee Check-in
```javascript
POST /attendance/checkin
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
  "location": "Office",
  "notes": "On time arrival"
}

// Response
{
  "success": true,
  "message": "Check-in successful",
  "data": {
    "attendance": {
      "id": "attendance_id",
      "employeeId": "EMP001",
      "date": "2023-12-01",
      "checkInTime": "2023-12-01T09:00:00Z",
      "status": "present",
      "location": "Office"
    }
  }
}
```

### 2. Employee Check-out
```javascript
POST /attendance/checkout
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
  "notes": "Completed daily tasks"
}

// Response includes calculated hours worked and final status
```

### 3. Get Employee Attendance
```javascript
GET /attendance/employee/:employeeId?startDate=2023-12-01&endDate=2023-12-31&page=1&limit=10
Authorization: Bearer jwt_token_here

// Response
{
  "success": true,
  "message": "Attendance records fetched successfully",
  "data": {
    "records": [...],
    "summary": {
      "totalDays": 20,
      "present": 18,
      "absent": 1,
      "late": 1,
      "halfDay": 0,
      "totalHours": 144,
      "averageHours": 7.2
    },
    "pagination": {...}
  }
}
```

### 4. Get Today's Attendance (Admin/HR)
```javascript
GET /attendance/today
Authorization: Bearer jwt_token_here

// Response includes all employees' attendance for today
```

### 5. Get Missing Checkouts (Admin/HR)
```javascript
GET /attendance/missing-checkouts?days=7
Authorization: Bearer jwt_token_here

// Response
{
  "success": true,
  "message": "Missing checkouts fetched successfully",
  "data": {
    "missingCheckouts": [
      {
        "employee": {
          "employeeId": "EMP001",
          "firstName": "John",
          "lastName": "Doe"
        },
        "date": "2023-12-01",
        "checkInTime": "2023-12-01T09:00:00Z",
        "hoursWorked": 0
      }
    ]
  }
}
```

## Leave Management APIs

### 1. Apply for Leave
```javascript
POST /leave
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
  "leaveType": "casual",
  "startDate": "2023-12-15",
  "endDate": "2023-12-16",
  "reason": "Family function",
  "halfDay": false
}

// Response
{
  "success": true,
  "message": "Leave application submitted successfully",
  "data": {
    "leave": {
      "id": "leave_id",
      "employeeId": "EMP001",
      "leaveType": "casual",
      "startDate": "2023-12-15",
      "endDate": "2023-12-16",
      "reason": "Family function",
      "status": "pending",
      "appliedDate": "2023-12-01T10:00:00Z"
    }
  }
}
```

### 2. Get Leave Applications
```javascript
// Employee: Get own leaves
GET /leave/my?status=pending&page=1&limit=10
Authorization: Bearer jwt_token_here

// Admin/HR: Get all leaves
GET /leave?status=pending&employeeId=EMP001&page=1&limit=10
Authorization: Bearer jwt_token_here

// Response
{
  "success": true,
  "message": "Leave applications fetched successfully",
  "data": {
    "leaves": [...],
    "pagination": {...}
  }
}
```

### 3. Update Leave Status (Admin/HR)
```javascript
PUT /leave/:id
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
  "status": "approved",
  "remarks": "Approved by manager"
}
```

### 4. Get Leave Balance
```javascript
GET /leave/balance/:employeeId
Authorization: Bearer jwt_token_here

// Response
{
  "success": true,
  "message": "Leave balance fetched successfully",
  "data": {
    "balance": {
      "casual": 12,
      "sick": 7,
      "annual": 21,
      "maternity": 90,
      "paternity": 15
    }
  }
}
```

## Salary Management APIs

### 1. Get Salary Slips (Employee)
```javascript
GET /salary-slips/my?year=2023&month=12
Authorization: Bearer jwt_token_here

// Response
{
  "success": true,
  "message": "Salary slips fetched successfully",
  "data": {
    "salarySlips": [
      {
        "id": "slip_id",
        "employeeId": "EMP001",
        "month": 12,
        "year": 2023,
        "basicSalary": 50000,
        "allowances": {
          "hra": 20000,
          "da": 5000,
          "ta": 2000
        },
        "deductions": {
          "pf": 6000,
          "esi": 750,
          "tds": 5000
        },
        "netSalary": 65250,
        "status": "published",
        "generatedDate": "2023-12-01T10:00:00Z"
      }
    ]
  }
}
```

### 2. Get All Salary Slips (Admin/HR)
```javascript
GET /salary-slips?employeeId=EMP001&year=2023&month=12&status=published&page=1&limit=10
Authorization: Bearer jwt_token_here
```

### 3. Create Salary Slip (Admin/HR)
```javascript
POST /salary-slips
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
  "employeeId": "EMP001",
  "month": 12,
  "year": 2023,
  "basicSalary": 50000,
  "allowances": {
    "hra": 20000,
    "da": 5000,
    "ta": 2000
  },
  "deductions": {
    "pf": 6000,
    "esi": 750
  },
  "taxRegime": "new"
}
```

### 4. Publish/Unpublish Salary Slip (Admin/HR)
```javascript
PUT /salary-slips/:id/publish
Authorization: Bearer jwt_token_here

PUT /salary-slips/:id/unpublish
Authorization: Bearer jwt_token_here
```

### 5. Download Salary Slip PDF
```javascript
GET /salary-slips/:id/download
Authorization: Bearer jwt_token_here

// Returns PDF file
```

## Dashboard & Reports APIs

### 1. Get Dashboard Data
```javascript
GET /dashboard
Authorization: Bearer jwt_token_here

// Response varies by role
{
  "success": true,
  "message": "Dashboard data fetched successfully",
  "data": {
    // For Employee
    "employee": {
      "todayAttendance": {...},
      "monthlyAttendance": {...},
      "leaveBalance": {...},
      "latestSalarySlip": {...}
    },
    // For Admin/HR
    "admin": {
      "totalEmployees": 150,
      "todayAttendance": {
        "present": 120,
        "absent": 20,
        "late": 10
      },
      "pendingLeaves": 5,
      "pendingRegularizations": 3
    }
  }
}
```

### 2. Get Attendance Reports (Admin/HR)
```javascript
GET /reports/attendance?startDate=2023-12-01&endDate=2023-12-31&department=Engineering
Authorization: Bearer jwt_token_here
```

### 3. Get Leave Reports (Admin/HR)
```javascript
GET /reports/leaves?startDate=2023-12-01&endDate=2023-12-31&status=approved
Authorization: Bearer jwt_token_here
```

## Utility APIs

### 1. Get Announcements
```javascript
GET /announcements?page=1&limit=10
Authorization: Bearer jwt_token_here

// Response
{
  "success": true,
  "message": "Announcements fetched successfully",
  "data": {
    "announcements": [
      {
        "id": "announcement_id",
        "title": "Holiday Announcement",
        "content": "Office will be closed on...",
        "priority": "medium",
        "targetAudience": "all",
        "author": "HR Team",
        "createdAt": "2023-12-01T10:00:00Z",
        "isActive": true
      }
    ],
    "pagination": {...}
  }
}
```

### 2. Get Holidays
```javascript
GET /holidays?year=2023&month=12
Authorization: Bearer jwt_token_here

// Response
{
  "success": true,
  "message": "Holidays fetched successfully",
  "data": {
    "holidays": [
      {
        "id": "holiday_id",
        "name": "Christmas",
        "date": "2023-12-25",
        "type": "public",
        "description": "Christmas Day celebration"
      }
    ]
  }
}
```

### 3. Submit Help Request
```javascript
POST /help
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
  "subject": "Login Issue",
  "description": "Unable to login to the system",
  "category": "technical",
  "priority": "medium"
}
```

### 4. Get Task Reports
```javascript
GET /task-reports/my?date=2023-12-01
Authorization: Bearer jwt_token_here

// Response
{
  "success": true,
  "message": "Task reports fetched successfully",
  "data": {
    "reports": [
      {
        "id": "report_id",
        "taskTitle": "API Development",
        "description": "Developed user authentication API",
        "hoursWorked": 8,
        "date": "2023-12-01",
        "status": "completed"
      }
    ]
  }
}
```

## Error Handling

### Standard Error Response Format
```javascript
{
  "success": false,
  "message": "Error message",
  "data": null,
  "errors": {
    "field": "Specific error message",
    "validation": "Validation error details"
  }
}
```

### Common HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **500**: Internal Server Error

### Error Handling in React Native
```javascript
try {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data;
} catch (error) {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    if (status === 401) {
      // Handle authentication error
      await AsyncStorage.removeItem('authToken');
      navigation.navigate('Login');
    } else if (status === 400) {
      // Handle validation errors
      setValidationErrors(data.errors);
    }
    
    throw new Error(data.message || 'Request failed');
  } else if (error.request) {
    // Network error
    throw new Error('Network error. Please check your connection.');
  } else {
    // Other error
    throw new Error('Something went wrong');
  }
}
```

## Directory Structure

```
backend/
├── controllers/          # Business logic and request handlers
├── models/              # MongoDB schemas and models
├── routes/              # API route definitions
├── middlewares/         # Custom middleware functions
├── utils/               # Utility functions and helpers
├── server.js            # Main server configuration
├── linkuser.js          # User-Employee linking utility
├── seedAdmin.js         # Admin user seeding script
└── package.json         # Dependencies and scripts
```

## Models Documentation

### Core Models

#### User Model (`User.model.js`)
**Purpose**: Authentication and basic user information
```javascript
{
  employeeId: String,
  email: String (required, unique),
  password: String (required),
  role: String (enum: ['admin', 'hr', 'employee']),
  // Password reset fields (redundant with PasswordResetRequest)
  resetPasswordToken: String,
  resetPasswordExpires: Date
}
```

#### Employee Model (`Employee.model.js`)
**Purpose**: Comprehensive employee HR information
```javascript
{
  employeeId: String (unique),
  personalInfo: {
    firstName, lastName, email, phone,
    dateOfBirth, gender, maritalStatus,
    address, city, state, zipCode
  },
  professionalInfo: {
    department, designation, dateOfJoining,
    employmentType, officeAddress, reportingManager
  },
  bankingInfo: {
    bankName, accountNumber, ifscCode, panNumber,
    aadhaarNumber, pfNumber, esiNumber
  },
  salaryInfo: {
    basicSalary, allowances, deductions
  }
}
```

#### Other Models
- **Attendance**: Daily attendance tracking with automatic status calculation
- **Leave**: Leave request management
- **SalarySlip**: Monthly salary processing with tax calculations
- **SalaryStructure**: Salary component definitions
- **Announcement**: Company announcements
- **Holiday**: Holiday calendar management
- **TaskReport**: Employee task reporting
- **Help**: Support ticket system
- **Regularization**: Attendance correction requests
- **PasswordResetRequest**: Password reset handling

### Model Issues Identified

#### Critical Issues
1. **Security Vulnerability**: `PasswordResetRequest` stores plain text passwords
2. **Data Type Inconsistencies**: Phone numbers stored as `Number` with string validations
3. **Business Logic in Models**: Complex calculations in pre-save hooks
4. **Redundant References**: Multiple models use both ObjectId and string references

#### Recommendations
- Move business logic to service layer
- Standardize data types and validation patterns
- Implement proper password reset token system
- Create shared schemas for common structures

## Controllers Documentation

### Authentication Controllers

#### User Controller (`user.controllers.js`)
**Endpoints**:
- `POST /register` - User registration
- `POST /login` - User authentication
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile

#### Password Reset Controller (`passwordReset.controllers.js`)
**Security Issue**: Stores plain text passwords temporarily
**Endpoints**:
- `POST /request` - Request password reset
- `POST /approve` - Approve password reset (Admin only)

### HR Management Controllers

#### Employee Controller (`employee.controllers.js`)
**Endpoints**:
- `POST /` - Create employee
- `GET /` - List employees (with pagination)
- `GET /:id` - Get employee details
- `PUT /:id` - Update employee
- `DELETE /:id` - Delete employee

#### Attendance Controller (`attendance.controllers.js`)
**Complex Logic**: Handles automatic status calculation
**Endpoints**:
- `POST /checkin` - Employee check-in
- `POST /checkout` - Employee check-out
- `GET /` - Attendance records
- `GET /employee/:id` - Employee attendance history

#### Leave Controller (`leave.controllers.js`)
**Endpoints**:
- `POST /` - Apply for leave
- `GET /` - List leave requests
- `PUT /:id` - Update leave status

### Salary Management Controllers

#### Salary Slip Controller (`salarySlip.controllers.js`)
**Complex Logic**: Tax calculations and PDF generation
**Endpoints**:
- `POST /` - Create salary slip
- `GET /` - List salary slips
- `GET /my` - Employee's salary slips
- `PUT /:id/publish` - Publish salary slip
- `POST /bulk-update` - Bulk salary slip updates

#### Salary Structure Controller (`salaryStructure.controllers.js`)
**Endpoints**:
- `POST /` - Create salary structure
- `GET /` - List salary structures
- `PUT /:id` - Update salary structure

### Common Issues in Controllers

#### Code Quality Issues
1. **Inconsistent Response Formatting**: Mixed use of response utilities
2. **Duplicate Code**: Repeated `formatResponse` functions
3. **Complex Functions**: Some functions exceed 100 lines
4. **Magic Numbers**: Hardcoded values throughout controllers

#### Security Issues
1. **Insufficient Input Validation**: Limited request validation
2. **Error Information Disclosure**: Stack traces in production
3. **Missing Rate Limiting**: No protection against abuse

## Routes Documentation

### Route Organization

#### Authentication Routes (`auth.js`)
```javascript
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET  /api/auth/logout
```

#### Employee Management Routes (`employee.js`)
```javascript
GET    /api/employees
POST   /api/employees
GET    /api/employees/:id
PUT    /api/employees/:id
DELETE /api/employees/:id
```

#### File Naming Inconsistencies
- Most routes use `.js` extension
- Some use `.routes.js` extension (announcement, salarySlip, etc.)

### Middleware Usage

#### Authentication Middleware
```javascript
// Applied to all protected routes
authMiddleware(['admin', 'hr', 'employee'])
```

#### Role-Based Access Control
```javascript
// Different roles have different access levels
router.use(authMiddleware(['admin', 'hr'])); // Admin/HR only
router.get('/', authMiddleware(['employee'])); // Employee access
```

### Route Issues Identified

#### Organizational Issues
1. **Inconsistent Naming**: Mixed `.js` and `.routes.js` extensions
2. **Duplicate Logic**: Role-checking logic repeated across routes
3. **Missing Validation**: No input validation middleware
4. **Inconsistent URL Patterns**: Mixed plural/singular, dash/camelCase

## Utilities Documentation

### Response Utility (`response.js`)
**Purpose**: Standardized API response formatting
```javascript
formatResponse(success, message, data, errors)
```

### JWT Utility (`jwt.js`)
**Purpose**: JWT token generation and verification
```javascript
generateToken(payload)
verifyToken(token)
```

### Notification Service (`notificationService.js`)
**Purpose**: Centralized notification handling
**Pattern**: Singleton with extensible notification types

### Utility Issues
1. **Inconsistent Usage**: Not all controllers use response utility
2. **Missing Validation**: No centralized validation utilities
3. **Limited Error Handling**: Basic error handling in utilities

## Authentication & Authorization

### JWT Implementation
- **Token Storage**: localStorage and cookies
- **Token Expiration**: Configurable via environment variables
- **Refresh Tokens**: Implemented for session management

### Role-Based Access Control
- **Admin**: Full system access
- **HR**: Employee and attendance management
- **Employee**: Personal data access only

### Security Features
- **Password Hashing**: bcrypt for password security
- **Token Validation**: Middleware-based token verification
- **Role Validation**: Route-level role checking

## Code Quality Analysis

### Overall Quality Score: 5.5/10

#### Strengths
1. **Clear Architecture**: Well-organized MVC structure
2. **Consistent Patterns**: Most code follows established patterns
3. **Good Error Handling**: Basic error handling in most functions
4. **Proper Authentication**: JWT implementation with role-based access

#### Areas for Improvement
1. **Code Duplication**: Repeated patterns across files
2. **Inconsistent Formatting**: Mixed response and error formats
3. **Complex Functions**: Some functions are too large and complex
4. **Missing Validation**: Limited input validation

### Specific Issues

#### Critical Issues (Fix Immediately)
1. **Security**: Plain text password storage in password reset
2. **Data Consistency**: Mixed data types and validation patterns
3. **Business Logic**: Complex calculations in model hooks

#### Medium Priority Issues
1. **Code Organization**: Extract duplicate patterns
2. **Performance**: N+1 queries and inefficient pagination
3. **Error Handling**: Inconsistent error response formats

#### Low Priority Issues
1. **Documentation**: Missing JSDoc comments
2. **Testing**: No unit tests
3. **Logging**: Inconsistent logging patterns

## Security Analysis

### Security Strengths
1. **JWT Authentication**: Proper token-based authentication
2. **Role-Based Access**: Hierarchical permission system
3. **CORS Configuration**: Proper origin restrictions
4. **Password Security**: bcrypt hashing for passwords

### Security Vulnerabilities

#### Critical Vulnerabilities
1. **Password Reset**: Plain text password storage
2. **Input Validation**: Missing sanitization and validation
3. **Error Disclosure**: Stack traces exposed in errors

#### Medium Risk Issues
1. **Rate Limiting**: No protection against brute force
2. **Request Size**: No limits on request body size
3. **Security Headers**: Missing security headers

#### Recommendations
1. **Implement Token-Based Password Reset**: Use secure tokens instead of plain text
2. **Add Input Validation**: Implement comprehensive validation middleware
3. **Rate Limiting**: Add rate limiting for authentication endpoints
4. **Security Headers**: Use helmet.js for security headers

## Performance Considerations

### Current Performance Issues
1. **N+1 Queries**: Multiple database queries in loops
2. **Inefficient Pagination**: Full collection counting
3. **No Caching**: No caching mechanism implemented
4. **Large Payloads**: No response size optimization

### Optimization Recommendations
1. **Database Optimization**: Add proper indexing and query optimization
2. **Caching**: Implement Redis for frequently accessed data
3. **Pagination**: Use cursor-based pagination for large datasets
4. **Response Compression**: Add compression middleware

## Recommendations

### Immediate Actions (High Priority)
1. **Fix Security Issue**: Implement proper password reset tokens
2. **Standardize Responses**: Use response utility consistently
3. **Extract Duplicate Code**: Create shared helper functions
4. **Add Input Validation**: Implement validation middleware

### Architecture Improvements (Medium Priority)
1. **Service Layer**: Extract business logic from controllers
2. **Error Handling**: Implement centralized error handling
3. **Logging**: Add structured logging with correlation IDs
4. **Database Optimization**: Add indexes and query optimization

### Long-term Improvements (Low Priority)
1. **Testing**: Add comprehensive unit and integration tests
2. **Documentation**: Add API documentation (Swagger)
3. **Monitoring**: Implement APM and health checks
4. **Performance**: Add caching and optimization strategies

### Refactoring Priorities
1. **Security First**: Address password reset vulnerability
2. **Consistency**: Standardize response formats and error handling
3. **Performance**: Optimize database queries and pagination
4. **Maintainability**: Extract business logic and reduce complexity

## Development Guidelines

### Code Standards
- Use consistent naming conventions (camelCase for variables, PascalCase for models)
- Implement proper error handling with standardized responses
- Add input validation for all endpoints
- Use the response utility for consistent API responses

### Security Guidelines
- Never store plain text passwords or sensitive data
- Implement proper input validation and sanitization
- Use parameterized queries to prevent injection attacks
- Add rate limiting for authentication endpoints

### Performance Guidelines
- Use database indexes for frequently queried fields
- Implement pagination for large datasets
- Use aggregation pipelines for complex queries
- Add caching for frequently accessed data

## Data Models

### User Model
```javascript
{
  "_id": "ObjectId",
  "employeeId": "string",
  "email": "string",
  "password": "string (hashed)",
  "role": "admin | hr | employee",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Employee Model
```javascript
{
  "_id": "ObjectId",
  "employeeId": "string",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string",
  "dateOfBirth": "Date",
  "gender": "male | female | other",
  "maritalStatus": "single | married | divorced | widowed",
  "address": "string",
  "city": "string",
  "state": "string",
  "zipCode": "string",
  "department": "string",
  "designation": "string",
  "dateOfJoining": "Date",
  "employmentType": "full-time | part-time | contract | intern",
  "reportingManager": "string",
  "basicSalary": "number",
  "bankDetails": {
    "bankName": "string",
    "accountNumber": "string",
    "ifscCode": "string",
    "panNumber": "string",
    "aadhaarNumber": "string"
  },
  "isActive": "boolean",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Attendance Model
```javascript
{
  "_id": "ObjectId",
  "employeeId": "string",
  "employee": "ObjectId (ref: Employee)",
  "employeeName": "string",
  "date": "Date",
  "checkInTime": "Date",
  "checkOutTime": "Date",
  "location": "string",
  "hoursWorked": "number",
  "status": "present | absent | late | half-day",
  "notes": "string",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Leave Model
```javascript
{
  "_id": "ObjectId",
  "employeeId": "string",
  "employee": "ObjectId (ref: Employee)",
  "leaveType": "casual | sick | annual | maternity | paternity",
  "startDate": "Date",
  "endDate": "Date",
  "totalDays": "number",
  "reason": "string",
  "status": "pending | approved | rejected",
  "appliedDate": "Date",
  "approvedBy": "ObjectId (ref: User)",
  "remarks": "string",
  "halfDay": "boolean",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Salary Slip Model
```javascript
{
  "_id": "ObjectId",
  "employeeId": "string",
  "employee": "ObjectId (ref: Employee)",
  "month": "number",
  "year": "number",
  "basicSalary": "number",
  "allowances": {
    "hra": "number",
    "da": "number",
    "ta": "number",
    "medical": "number",
    "special": "number"
  },
  "deductions": {
    "pf": "number",
    "esi": "number",
    "tds": "number",
    "loan": "number",
    "other": "number"
  },
  "grossSalary": "number",
  "totalDeductions": "number",
  "netSalary": "number",
  "taxRegime": "old | new",
  "status": "draft | published",
  "generatedBy": "ObjectId (ref: User)",
  "generatedDate": "Date",
  "publishedDate": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## Security Implementation

### Authentication Flow
1. **User Login**: Email/password authentication
2. **JWT Generation**: Server generates JWT token with user info
3. **Token Storage**: Store token securely in React Native
4. **Token Validation**: All protected endpoints validate JWT
5. **Role-based Access**: Endpoints check user role permissions

### Token Management in React Native
```javascript
// Store token securely
import { SecureStore } from 'expo-secure-store';

// Store token
await SecureStore.setItemAsync('authToken', token);

// Retrieve token
const token = await SecureStore.getItemAsync('authToken');

// Remove token (logout)
await SecureStore.deleteItemAsync('authToken');
```

### API Security Headers
```javascript
// Add security headers to all requests
const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
});

// Add token to requests
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## Architecture Details

### Backend Technology Stack
- **Framework**: Express.js (Node.js)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Custom middleware with input sanitization
- **File Upload**: Multer for file handling
- **PDF Generation**: PDFKit for salary slip generation
- **Email**: Nodemailer for notifications
- **Timezone**: Moment.js with timezone support

### Database Schema Design
- **Users**: Authentication and basic user info
- **Employees**: Detailed employee information
- **Attendance**: Daily attendance tracking
- **Leaves**: Leave management
- **Salary**: Salary structure and slip generation
- **Announcements**: Company announcements
- **Holidays**: Holiday calendar
- **Task Reports**: Daily task reporting

### Business Logic Layers
1. **Routes**: API endpoint definitions
2. **Middleware**: Authentication, validation, error handling
3. **Controllers**: Request/response handling
4. **Services**: Business logic implementation
5. **Models**: Data structure and validation
6. **Utilities**: Helper functions and shared logic

## React Native Implementation Examples

### 1. Setting up API Client
```javascript
// services/apiClient.js
import axios from 'axios';
import { SecureStore } from 'expo-secure-store';
import { Alert } from 'react-native';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000/api'
  : 'https://your-production-api.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await SecureStore.deleteItemAsync('authToken');
      // Navigate to login screen
      // You can use navigation ref here
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 2. Authentication Service
```javascript
// services/authService.js
import apiClient from './apiClient';
import { SecureStore } from 'expo-secure-store';

class AuthService {
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password
      });
      
      const { token, user } = response.data.data;
      
      // Store token securely
      await SecureStore.setItemAsync('authToken', token);
      await SecureStore.setItemAsync('userData', JSON.stringify(user));
      
      return { token, user };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(userData) {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout() {
    try {
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('userData');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async getCurrentUser() {
    try {
      const userData = await SecureStore.getItemAsync('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  }

  async isAuthenticated() {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      return !!token;
    } catch (error) {
      return false;
    }
  }

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      return new Error(data.message || `HTTP ${status} Error`);
    } else if (error.request) {
      return new Error('Network error. Please check your connection.');
    } else {
      return new Error('Something went wrong');
    }
  }
}

export default new AuthService();
```

### 3. Employee Service
```javascript
// services/employeeService.js
import apiClient from './apiClient';

class EmployeeService {
  async getEmployees(page = 1, limit = 10, filters = {}) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });
      
      const response = await apiClient.get(`/employees?${params}`);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEmployeeById(id) {
    try {
      const response = await apiClient.get(`/employees/${id}`);
      return response.data.data.employee;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createEmployee(employeeData) {
    try {
      const response = await apiClient.post('/employees', employeeData);
      return response.data.data.employee;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateEmployee(id, updateData) {
    try {
      const response = await apiClient.put(`/employees/${id}`, updateData);
      return response.data.data.employee;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      return new Error(data.message || `HTTP ${status} Error`);
    } else if (error.request) {
      return new Error('Network error. Please check your connection.');
    } else {
      return new Error('Something went wrong');
    }
  }
}

export default new EmployeeService();
```

### 4. Attendance Service
```javascript
// services/attendanceService.js
import apiClient from './apiClient';

class AttendanceService {
  async checkIn(location, notes = '') {
    try {
      const response = await apiClient.post('/attendance/checkin', {
        location,
        notes
      });
      return response.data.data.attendance;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async checkOut(notes = '') {
    try {
      const response = await apiClient.post('/attendance/checkout', {
        notes
      });
      return response.data.data.attendance;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMyAttendance(startDate, endDate, page = 1, limit = 10) {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        page: page.toString(),
        limit: limit.toString()
      });
      
      const response = await apiClient.get(`/attendance/my?${params}`);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTodayAttendance() {
    try {
      const response = await apiClient.get('/attendance/today');
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      return new Error(data.message || `HTTP ${status} Error`);
    } else if (error.request) {
      return new Error('Network error. Please check your connection.');
    } else {
      return new Error('Something went wrong');
    }
  }
}

export default new AttendanceService();
```

### 5. React Native Screens Example

#### Login Screen
```javascript
// screens/auth/LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import authService from '../../services/authService';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const { user } = await authService.login(email, password);
      
      // Navigate based on role
      if (user.role === 'admin' || user.role === 'hr') {
        navigation.replace('AdminDashboard');
      } else {
        navigation.replace('EmployeeDashboard');
      }
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HRMS Login</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('ForgotPassword')}
      >
        <Text style={styles.linkText}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  button: {
    height: 50,
    backgroundColor: '#007bff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#007bff',
    fontSize: 14,
  },
});

export default LoginScreen;
```

#### Dashboard Screen
```javascript
// screens/dashboard/EmployeeDashboard.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  RefreshControl
} from 'react-native';
import attendanceService from '../../services/attendanceService';
import authService from '../../services/authService';

const EmployeeDashboard = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      
      const attendance = await attendanceService.getTodayAttendance();
      setTodayAttendance(attendance);
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleCheckIn = async () => {
    try {
      await attendanceService.checkIn('Office');
      Alert.alert('Success', 'Check-in successful');
      loadDashboardData();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCheckOut = async () => {
    try {
      await attendanceService.checkOut();
      Alert.alert('Success', 'Check-out successful');
      loadDashboardData();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            await authService.logout();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome, {user?.firstName || 'Employee'}!
        </Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.attendanceCard}>
        <Text style={styles.cardTitle}>Today's Attendance</Text>
        
        {todayAttendance?.checkInTime ? (
          <View>
            <Text>Check-in: {new Date(todayAttendance.checkInTime).toLocaleTimeString()}</Text>
            {todayAttendance.checkOutTime ? (
              <Text>Check-out: {new Date(todayAttendance.checkOutTime).toLocaleTimeString()}</Text>
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleCheckOut}>
                <Text style={styles.buttonText}>Check Out</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleCheckIn}>
            <Text style={styles.buttonText}>Check In</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.menuGrid}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('MyAttendance')}
        >
          <Text style={styles.menuText}>My Attendance</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ApplyLeave')}
        >
          <Text style={styles.menuText}>Apply Leave</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('MySalarySlips')}
        >
          <Text style={styles.menuText}>Salary Slips</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.menuText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#007bff',
  },
  welcomeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  logoutText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  attendanceCard: {
    margin: 15,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
  },
  menuItem: {
    width: '48%',
    height: 100,
    backgroundColor: '#fff',
    margin: '1%',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  menuText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default EmployeeDashboard;
```

### 6. State Management (Optional - Redux)
```javascript
// store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await authService.login(email, password);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
```

This comprehensive documentation provides everything needed to develop a React Native Expo app that integrates with the HRMS backend. It includes all API endpoints, data models, security implementation, and complete React Native examples with authentication, services, and UI components.