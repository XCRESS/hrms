# HRMS Attendance API - Postman Testing Guide

## Overview
This guide provides comprehensive documentation for testing all attendance-related APIs in the HRMS system using Postman.

## Base Configuration

### Environment Variables
Set up the following environment variables in Postman:
- `BASE_URL`: `http://localhost:4000` (default server port)
- `AUTH_TOKEN`: JWT token obtained from login endpoint

### Headers
Include these headers in all authenticated requests:
```
Authorization: Bearer {{AUTH_TOKEN}}
Content-Type: application/json
Cache-Control: no-cache
```

## Authentication Setup

### 1. Login to Get Token
**Endpoint:** `POST {{BASE_URL}}/api/auth/login`

**Request Body:**
```json
{
  "email": "employee@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_id",
      "email": "employee@example.com",
      "role": "employee"
    }
  }
}
```

## Attendance API Endpoints

### 1. Check In
**Endpoint:** `POST {{BASE_URL}}/api/attendance/checkin`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
Content-Type: application/json
```

**Request Body (Optional location):**
```json
{
  "latitude": 12.9716,
  "longitude": 77.5946
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Successfully checked in",
  "data": {
    "attendance": {
      "_id": "68996dfaedd04858821571ef",
      "employee": "685262af468626fd2a08ee3b",
      "employeeName": "Veshant Singh Dahiya",
      "date": "2025-08-11T04:13:46.147Z",
      "checkIn": "2025-08-11T04:13:46.147Z",
      "status": "present",
      "workHours": 0,
      "location": {
        "latitude": 28.5795,
        "longitude": 77.0266
      },
      "createdAt": "2025-08-11T04:13:46.408Z",
      "updatedAt": "2025-08-11T04:13:46.408Z"
    }
  }
}
```

**Error Responses:**
- **400 - Already Checked In:**
```json
{
  "success": false,
  "message": "Already checked in for today",
  "errors": {
    "existingRecord": {
      "id": "68996dfaedd04858821571ef",
      "checkIn": "2025-08-11T04:13:46.147Z"
    }
  }
}
```

- **400 - Invalid Location:**
```json
{
  "success": false,
  "message": "Invalid location coordinates",
  "errors": {
    "latitude": 12.9716,
    "longitude": 77.5946
  }
}
```

### 2. Check Out
**Endpoint:** `POST {{BASE_URL}}/api/attendance/checkout`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "tasks": [
    {
      "description": "Completed user dashboard updates",
      "category": "Development",
      "duration": "4 hours"
    },
    {
      "description": "Fixed bug in attendance module",
      "category": "Bug Fix",
      "duration": "2 hours"
    }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully checked out",
  "data": {
    "attendance": {
      "_id": "68996dfaedd04858821571ef",
      "employee": "685262af468626fd2a08ee3b",
      "employeeName": "Veshant Singh Dahiya",
      "date": "2025-08-11T04:13:46.147Z",
      "checkIn": "2025-08-11T04:13:46.147Z",
      "checkOut": "2025-08-11T13:30:00.000Z",
      "status": "present",
      "workHours": 9.27,
      "location": {
        "latitude": 28.5795,
        "longitude": 77.0266
      },
      "createdAt": "2025-08-11T04:13:46.408Z",
      "updatedAt": "2025-08-11T13:30:00.000Z"
    }
  }
}
```

**Error Responses:**
- **400 - Task Validation Error:**
```json
{
  "success": false,
  "message": "A task report with at least one task is required to check out.",
  "errors": {
    "eligibilityErrors": ["A task report with at least one task is required to check out."],
    "warnings": ["Short work duration detected"]
  }
}
```

- **400 - No Check-in Found:**
```json
{
  "success": false,
  "message": "No check-in record found for today",
  "errors": {
    "eligibilityErrors": ["No check-in record found for today"]
  }
}
```

### 3. Get My Attendance Records
**Endpoint:** `GET {{BASE_URL}}/api/attendance/my`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Query Parameters:**
- `startDate` (optional): `2025-07-01`
- `endDate` (optional): `2025-08-11`
- `page` (optional): `1`
- `limit` (optional): `10`

**Example Request:**
```
GET {{BASE_URL}}/api/attendance/my?startDate=2025-07-01&endDate=2025-08-11&page=1&limit=10
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Records retrieved successfully",
  "data": {
    "records": [
      {
        "_id": "68996dfaedd04858821571ef",
        "employee": {
          "_id": "685262af468626fd2a08ee3b",
          "employeeId": "CFG/CIAML/15FBD",
          "firstName": "Veshant",
          "lastName": "Singh Dahiya",
          "department": "IT"
        },
        "employeeName": "Veshant Singh Dahiya",
        "date": "2025-08-11T04:13:46.147Z",
        "checkIn": "2025-08-11T04:13:46.147Z",
        "checkOut": null,
        "status": "present",
        "workHours": 0,
        "location": {
          "latitude": 28.3992007,
          "longitude": 77.269035
        },
        "createdAt": "2025-08-11T04:13:46.408Z",
        "updatedAt": "2025-08-11T04:13:46.408Z"
      }
    ],
    "pagination": {
      "total": 46,
      "page": 1,
      "limit": 10,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false,
      "nextPage": 2,
      "prevPage": null
    }
  }
}
```

### 4. Get Missing Checkouts
**Endpoint:** `GET {{BASE_URL}}/api/attendance/missing-checkouts`

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Records retrieved successfully",
  "data": {
    "missingCheckouts": [
      {
        "_id": "68996dfaedd04858821571ef",
        "employee": "685262af468626fd2a08ee3b",
        "employeeName": "Veshant Singh Dahiya",
        "date": "2025-08-10T00:00:00.000Z",
        "checkIn": "2025-08-10T04:30:00.000Z",
        "checkOut": null,
        "status": "present",
        "workHours": 0
      }
    ],
    "total": 1
  }
}
```

**Empty Response (when no missing checkouts):**
```json
{
  "success": true,
  "message": "Records retrieved successfully",
  "data": {
    "missingCheckouts": [],
    "total": 0
  }
}
```

## Admin/HR Only Endpoints

### 5. Get All Attendance Records
**Endpoint:** `GET {{BASE_URL}}/api/attendance`
**Role Required:** Admin or HR

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
```

**Query Parameters:**
- `employeeId` (optional): `EMP001`
- `startDate` (optional): `2025-07-01`
- `endDate` (optional): `2025-08-11`
- `status` (optional): `Present|Late|Half Day|Absent`
- `page` (optional): `1`
- `limit` (optional): `10`

**Example Request:**
```
GET {{BASE_URL}}/api/attendance?employeeId=EMP001&startDate=2025-07-01&status=Present&page=1&limit=20
```

### 6. Get Today's Attendance with Absents
**Endpoint:** `GET {{BASE_URL}}/api/attendance/today-with-absents`
**Role Required:** Admin or HR

**Success Response (200):**
```json
{
  "success": true,
  "message": "Records retrieved successfully",
  "data": {
    "records": [
      {
        "date": "2025-08-11T04:56:45.362Z",
        "employee": {
          "_id": "685262af468626fd2a08ee3b",
          "employeeId": "CFG/CIAML/15FBD",
          "firstName": "Veshant",
          "lastName": "Singh Dahiya"
        },
        "employeeName": "Veshant Singh Dahiya",
        "checkIn": "2025-08-11T04:13:46.147Z",
        "checkOut": null,
        "status": "present",
        "workHours": 0,
        "flags": {}
      },
      {
        "date": "2025-08-11T04:56:45.362Z",
        "employee": {
          "_id": "686502e28ae3002ab24ffc36",
          "employeeId": "CFG/IFSL/03",
          "firstName": "Archana",
          "lastName": "Sapra"
        },
        "employeeName": "Archana Sapra",
        "checkIn": null,
        "checkOut": null,
        "status": "absent",
        "workHours": null,
        "comments": null,
        "reason": "No check-in recorded",
        "flags": {}
      }
    ],
    "statistics": {
      "total": 18,
      "present": 10,
      "absent": 8,
      "halfDay": 0,
      "late": 4,
      "leave": 0,
      "weekend": 0,
      "holiday": 0,
      "totalWorkHours": 0,
      "averageWorkHours": 0
    },
    "total": 18,
    "date": "2025-08-11"
  }
}
```

### 7. Get Admin Attendance Range
**Endpoint:** `GET {{BASE_URL}}/api/attendance/admin-range`
**Role Required:** Admin or HR

**Query Parameters (Required):**
- `startDate`: `2025-07-01`
- `endDate`: `2025-08-11`

**Example Request:**
```
GET {{BASE_URL}}/api/attendance/admin-range?startDate=2025-08-01&endDate=2025-08-11
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Records retrieved successfully", 
  "data": {
    "filters": {
      "startDate": "2025-08-01T00:00:00.000Z",
      "endDate": "2025-08-11T00:00:00.000Z",
      "includeCharts": true
    },
    "period": {
      "startDate": "2025-08-01",
      "endDate": "2025-08-11"
    },
    "employeeCount": 18,
    "aggregatedStats": {
      "totalWorkingDays": 144,
      "totalPresentDays": 86,
      "totalAbsentDays": 103,
      "totalWorkHours": 544.26
    },
    "employeeReports": [
      {
        "employee": {
          "_id": "685262af468626fd2a08ee3b",
          "employeeId": "CFG/CIAML/15FBD",
          "firstName": "Veshant",
          "lastName": "Singh Dahiya",
          "department": "IT",
          "position": "Junior web developer",
          "joiningDate": "2025-03-16T18:30:00.000Z"
        },
        "period": {
          "startDate": "2025-08-01",
          "endDate": "2025-08-11",
          "totalDays": 11
        },
        "statistics": {
          "total": 11,
          "present": 7,
          "absent": 3,
          "halfDay": 1,
          "late": 4,
          "leave": 0,
          "weekend": 2,
          "holiday": 1,
          "totalWorkHours": 43.39,
          "averageWorkHours": 5.42
        },
        "attendancePercentage": {
          "totalWorkingDays": 8,
          "presentDays": 8,
          "absentDays": 0,
          "percentage": 100
        },
        "summary": {
          "totalWorkingDays": 8,
          "presentDays": 7,
          "absentDays": 3,
          "halfDays": 1,
          "lateDays": 4,
          "leaveDays": 0,
          "totalWorkHours": 43.39,
          "averageWorkHours": 5.42
        }
      }
    ]
  }
}
```

### 8. Get Employee Attendance with Absents
**Endpoint:** `GET {{BASE_URL}}/api/attendance/employee-with-absents`
**Role Required:** Admin, HR, or Employee (own records only)

**Query Parameters (Required):**
- `employeeId`: `EMP001`
- `startDate`: `2025-07-01`
- `endDate`: `2025-08-11`

**Example Request:**
```
GET {{BASE_URL}}/api/attendance/employee-with-absents?employeeId=CFG/CIAML/15FBD&startDate=2025-08-01&endDate=2025-08-11
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Records retrieved successfully",
  "data": {
    "employee": {
      "_id": "685262af468626fd2a08ee3b",
      "employeeId": "CFG/CIAML/15FBD",
      "firstName": "Veshant",
      "lastName": "Singh Dahiya",
      "department": "IT",
      "position": "Junior web developer",
      "joiningDate": "2025-03-16T18:30:00.000Z"
    },
    "period": {
      "startDate": "2025-08-01",
      "endDate": "2025-08-11",
      "totalDays": 11
    },
    "statistics": {
      "total": 11,
      "present": 7,
      "absent": 3,
      "halfDay": 1,
      "late": 4,
      "leave": 0,
      "weekend": 2,
      "holiday": 1,
      "totalWorkHours": 43.39,
      "averageWorkHours": 5.42
    },
    "attendancePercentage": {
      "totalWorkingDays": 8,
      "presentDays": 8,
      "absentDays": 0,
      "percentage": 100
    },
    "records": [
      {
        "date": "2025-08-01T00:00:00.000Z",
        "employee": {
          "_id": "685262af468626fd2a08ee3b",
          "employeeId": "CFG/CIAML/15FBD",
          "firstName": "Veshant",
          "lastName": "Singh Dahiya"
        },
        "employeeName": "Veshant Singh Dahiya",
        "checkIn": "2025-08-01T04:34:00.000Z",
        "checkOut": "2025-08-01T11:10:46.413Z",
        "status": "present",
        "workHours": 6.61,
        "flags": {
          "isLate": true
        }
      },
      {
        "date": "2025-08-09T00:00:00.000Z",
        "employee": {
          "_id": "685262af468626fd2a08ee3b",
          "employeeId": "CFG/CIAML/15FBD",
          "firstName": "Veshant",
          "lastName": "Singh Dahiya"
        },
        "employeeName": "Veshant Singh Dahiya",
        "checkIn": null,
        "checkOut": null,
        "status": "absent",
        "workHours": null,
        "comments": null,
        "reason": null,
        "holidayTitle": "Raksha Bandhan",
        "flags": {
          "isHoliday": true
        }
      }
    ],
    "summary": {
      "totalWorkingDays": 8,
      "presentDays": 7,
      "absentDays": 3,
      "halfDays": 1,
      "lateDays": 4,
      "leaveDays": 0,
      "totalWorkHours": 43.39,
      "averageWorkHours": 5.42
    }
  }
}
```

### 9. Update Attendance Record
**Endpoint:** `PUT {{BASE_URL}}/api/attendance/update/{recordId}`
**Role Required:** Admin or HR

**Headers:**
```
Authorization: Bearer {{AUTH_TOKEN}}
Content-Type: application/json
```

**Path Parameters:**
- `recordId`: Attendance record ID or `new` for creating new record

**Request Body (Update existing):**
```json
{
  "status": "present",
  "checkIn": "2025-08-11T04:30:00.000Z",
  "checkOut": "2025-08-11T13:30:00.000Z"
}
```

**Request Body (Create new - use recordId = 'new'):**
```json
{
  "employeeId": "CFG/CIAML/16ID",
  "date": "2025-08-10",
  "status": "present",
  "checkIn": "2025-08-10T04:30:00.000Z",
  "checkOut": "2025-08-10T13:00:00.000Z"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Attendance record updated successfully",
  "data": {
    "attendance": {
      "_id": "6899785693b77163a7067655",
      "employee": "684ffcd12c5788b4f46b2120",
      "employeeName": "Jaydeep Singh Kushwah",
      "date": "2025-08-10T00:00:00.000Z",
      "checkIn": "2025-08-10T04:30:00.000Z",
      "checkOut": "2025-08-10T13:00:00.000Z",
      "status": "present",
      "workHours": 8.5,
      "createdAt": "2025-08-11T04:57:58.357Z",
      "updatedAt": "2025-08-11T04:57:58.357Z"
    }
  }
}
```

**Error Response - Invalid Status:**
```json
{
  "success": false,
  "message": "Invalid data provided",
  "errors": {
    "validation": {
      "status": "`Present` is not a valid enum value for path `status`."
    }
  }
}
```

## Common Error Responses

### Authentication Errors
```json
{
  "success": false,
  "message": "Authentication required",
  "errors": {
    "auth": "No valid user found"
  }
}
```

### Authorization Errors
```json
{
  "success": false,
  "message": "Access denied. Admin or HR role required"
}
```

### Validation Errors
```json
{
  "success": false,
  "message": "Employee ID, start date, and end date are required"
}
```

### Server Errors
```json
{
  "success": false,
  "message": "Failed to fetch attendance records",
  "errors": {
    "server": "Database connection error"
  }
}
```

## Testing Scenarios

### Employee Flow
1. **Login** as employee
2. **Check In** for the day
3. **Get My Attendance** to view records
4. **Get Missing Checkouts** to see pending checkouts
5. **Check Out** with task report

### Admin/HR Flow
1. **Login** as admin/hr
2. **Get Today's Attendance** to see all employees
3. **Get Admin Range** for date-based reports
4. **Update Attendance Record** to modify records
5. **Get Employee Attendance** for specific employee analysis

### Error Testing
1. **Duplicate Check-in** - Try checking in twice
2. **Unauthorized Access** - Employee trying admin endpoints
3. **Missing Authentication** - Requests without token
4. **Invalid Parameters** - Wrong date formats, missing required fields

## Postman Collection Setup

### Pre-request Scripts
```javascript
// Auto-add auth token if available
if (pm.environment.get("AUTH_TOKEN")) {
    pm.request.headers.add({
        key: "Authorization",
        value: "Bearer " + pm.environment.get("AUTH_TOKEN")
    });
}
```

### Test Scripts
```javascript
// Auto-save token from login response
if (pm.response.json().data && pm.response.json().data.token) {
    pm.environment.set("AUTH_TOKEN", pm.response.json().data.token);
}

// Validate response structure
pm.test("Response has correct structure", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
    pm.expect(jsonData).to.have.property('message');
});

// Check status code
pm.test("Status code is 200 or 201", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});
```

## Status Codes Reference
- `200` - Success (GET, PUT)
- `201` - Created (POST check-in)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (no token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (record not found)
- `500` - Internal Server Error

## Important Notes & Testing Findings

### Key Implementation Details
- **Server Port**: Default port is `4000`, not `5000`
- **Status Values**: Use lowercase values (`"present"`, `"absent"`, `"late"`, `"half-day"`) - NOT capitalized
- **Timestamps**: All timestamps are in IST (Indian Standard Time)
- **Work Hours**: Automatically calculated between check-in and check-out times
- **Location**: Coordinates are optional for check-in but stored when provided
- **Task Reports**: Required for check-out with proper validation

### Status Enum Values (Case Sensitive)
```json
{
  "validStatuses": [
    "present",
    "absent", 
    "late",
    "half-day"
  ]
}
```

### Issues Found During Testing

1. **Status Case Sensitivity**: 
   - ❌ Wrong: `"Present"`, `"Absent"`, `"Late"`
   - ✅ Correct: `"present"`, `"absent"`, `"late"`, `"half-day"`

2. **Task Validation**: 
   - Checkout endpoint has strict task validation
   - Requires proper task structure with description, category, and duration
   - May fail with complex business logic checks

3. **Duplicate Check-in Prevention**: 
   - API correctly prevents multiple check-ins on same day
   - Returns existing record details in error response

### Sample Real Responses from Testing
The response examples in this document are based on actual API testing with real data from the system, ensuring accuracy and reliability for development and testing purposes.

## Attendance Status Logic
- **Present**: Check-in before 9:55 AM
- **Late**: Check-in after 9:55 AM (flagged with `"isLate": true`)
- **Half-day**: Work hours < 4 hours
- **Absent**: No check-in record (unless on approved leave)

## Weekend & Holiday Handling
- **Weekends**: Sundays are automatically marked with `"isWeekend": true` flag
- **Holidays**: System recognizes holidays like "Raksha Bandhan" with `"isHoliday": true` flag
- **Working Days**: Excludes weekends and holidays from attendance calculations