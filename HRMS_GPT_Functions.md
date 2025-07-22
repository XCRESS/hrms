# HRMS GPT Bot API Functions

This document provides ready-to-use Python functions for interacting with your HRMS backend APIs. These functions are optimized for GPT bot integration with proper error handling, authentication, and structured responses.

## Setup and Configuration

```python
import requests
import json
from datetime import datetime, date
from typing import Dict, List, Optional, Union
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HRMSClient:
    def __init__(self, base_url: str = "https://hrms-backend.up.railway.app"):
        self.base_url = base_url.rstrip('/')
        self.api_base = f"{self.base_url}/api"
        self.session = requests.Session()
        self.token = None
        
    def set_token(self, token: str):
        """Set authentication token for API requests"""
        self.token = token
        self.session.headers.update({'Authorization': f'Bearer {token}'})
        
    def _make_request(self, method: str, endpoint: str, data: dict = None, params: dict = None) -> dict:
        """Make HTTP request with error handling"""
        try:
            url = f"{self.api_base}/{endpoint.lstrip('/')}"
            response = self.session.request(method, url, json=data, params=params, timeout=30)
            
            if response.status_code == 401:
                return {"success": False, "message": "Authentication required or token expired", "status_code": 401}
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            return {"success": False, "message": f"API request failed: {str(e)}"}
        except json.JSONDecodeError:
            return {"success": False, "message": "Invalid JSON response from server"}

# Initialize client
hrms = HRMSClient()
```

## 1. Authentication & Session Management

### Login User
```python
def login_user(username_or_email: str, password: str) -> dict:
    """
    Authenticate user and get access token
    
    Args:
        username_or_email: User's username or email
        password: User's password
    
    Returns:
        dict: Login response with token and user info
    """
    data = {
        "usernameOrEmail": username_or_email,
        "password": password
    }
    
    response = hrms._make_request("POST", "/auth/login", data)
    
    if response.get("success") and "token" in response.get("data", {}):
        token = response["data"]["token"]
        hrms.set_token(token)
        logger.info(f"User logged in successfully: {response['data'].get('user', {}).get('username')}")
    
    return response
```

### Register New User (Admin/HR only)
```python
def register_user(username: str, password: str, role: str, email: str = None) -> dict:
    """
    Register a new user (requires admin/hr authentication)
    
    Args:
        username: Unique username
        password: User password
        role: User role (admin, hr, employee)
        email: User email (optional)
    
    Returns:
        dict: Registration response
    """
    data = {
        "username": username,
        "password": password,
        "role": role
    }
    if email:
        data["email"] = email
    
    return hrms._make_request("POST", "/auth/register", data)
```

### Get User Profile
```python
def get_user_profile() -> dict:
    """
    Get current user's profile information
    
    Returns:
        dict: User profile data
    """
    return hrms._make_request("GET", "/employees/profile")
```

### Request Password Reset
```python
def request_password_reset(email: str, reason: str = None) -> dict:
    """
    Submit password reset request
    
    Args:
        email: User's email address
        reason: Reason for password reset
    
    Returns:
        dict: Password reset request response
    """
    data = {"email": email}
    if reason:
        data["reason"] = reason
    
    return hrms._make_request("POST", "/password-reset/request", data)
```

## 2. Employee Management

### Get All Employees (Admin/HR only)
```python
def get_all_employees(page: int = 1, limit: int = 50, status: str = None) -> dict:
    """
    Get list of all employees with pagination
    
    Args:
        page: Page number (default: 1)
        limit: Results per page (default: 50)
        status: Filter by status ('active', 'inactive')
    
    Returns:
        dict: List of employees with pagination info
    """
    params = {"page": page, "limit": limit}
    if status:
        params["status"] = status
    
    return hrms._make_request("GET", "/employees", params=params)
```

### Create New Employee (Admin/HR only)
```python
def create_employee(employee_data: dict) -> dict:
    """
    Create a new employee record
    
    Args:
        employee_data: Dictionary containing employee information
        Required fields: firstName, lastName, email, employeeId
        Optional fields: phone, department, position, joiningDate, etc.
    
    Returns:
        dict: Created employee data
    """
    required_fields = ["firstName", "lastName", "email", "employeeId"]
    for field in required_fields:
        if field not in employee_data:
            return {"success": False, "message": f"Required field missing: {field}"}
    
    return hrms._make_request("POST", "/employees/create", employee_data)
```

### Update Employee (Admin/HR only)
```python
def update_employee(employee_id: str, update_data: dict) -> dict:
    """
    Update employee information
    
    Args:
        employee_id: Employee's database ID
        update_data: Dictionary with fields to update
    
    Returns:
        dict: Updated employee data
    """
    return hrms._make_request("PUT", f"/employees/update/{employee_id}", update_data)
```

### Get Employee by ID (Admin/HR only)
```python
def get_employee_by_id(employee_id: str) -> dict:
    """
    Get specific employee details by ID
    
    Args:
        employee_id: Employee's database ID
    
    Returns:
        dict: Employee details
    """
    return hrms._make_request("GET", f"/employees/{employee_id}")
```

### Toggle Employee Status (Admin/HR only)
```python
def toggle_employee_status(employee_id: str) -> dict:
    """
    Toggle employee active/inactive status
    
    Args:
        employee_id: Employee's database ID
    
    Returns:
        dict: Updated employee status
    """
    return hrms._make_request("PUT", f"/employees/toggle-status/{employee_id}")
```

## 3. Attendance Management

### Check In
```python
def check_in(location_data: dict = None) -> dict:
    """
    Record employee check-in
    
    Args:
        location_data: Optional location information (lat, lng, address)
    
    Returns:
        dict: Check-in response with attendance record
    """
    data = {}
    if location_data:
        data.update(location_data)
    
    return hrms._make_request("POST", "/attendance/checkin", data)
```

### Check Out
```python
def check_out(location_data: dict = None) -> dict:
    """
    Record employee check-out
    
    Args:
        location_data: Optional location information (lat, lng, address)
    
    Returns:
        dict: Check-out response with updated attendance record
    """
    data = {}
    if location_data:
        data.update(location_data)
    
    return hrms._make_request("POST", "/attendance/checkout", data)
```

### Get Attendance Records
```python
def get_attendance_records(employee_id: str = None, start_date: str = None, 
                          end_date: str = None, page: int = 1, limit: int = 50) -> dict:
    """
    Get attendance records with filtering
    
    Args:
        employee_id: Filter by specific employee (admin/hr only)
        start_date: Start date (YYYY-MM-DD format)
        end_date: End date (YYYY-MM-DD format)
        page: Page number
        limit: Results per page
    
    Returns:
        dict: Attendance records with pagination
    """
    params = {"page": page, "limit": limit}
    if employee_id:
        params["employeeId"] = employee_id
    if start_date:
        params["startDate"] = start_date
    if end_date:
        params["endDate"] = end_date
    
    return hrms._make_request("GET", "/attendance/records", params=params)
```

### Get My Attendance
```python
def get_my_attendance(page: int = 1, limit: int = 50) -> dict:
    """
    Get current user's attendance records
    
    Args:
        page: Page number
        limit: Results per page
    
    Returns:
        dict: User's attendance records
    """
    params = {"page": page, "limit": limit}
    return hrms._make_request("GET", "/attendance/my", params=params)
```

### Get Missing Checkouts
```python
def get_missing_checkouts() -> dict:
    """
    Get attendance records with missing checkouts for regularization
    
    Returns:
        dict: List of attendance records needing checkout
    """
    return hrms._make_request("GET", "/attendance/missing-checkouts")
```

### Update Attendance Record
```python
def update_attendance_record(record_id: str, update_data: dict) -> dict:
    """
    Update attendance record (typically for corrections)
    
    Args:
        record_id: Attendance record ID
        update_data: Fields to update (checkIn, checkOut, etc.)
    
    Returns:
        dict: Updated attendance record
    """
    return hrms._make_request("PUT", f"/attendance/update/{record_id}", update_data)
```

## 4. Leave Management

### Request Leave
```python
def request_leave(start_date: str, end_date: str, reason: str, leave_type: str = "sick") -> dict:
    """
    Submit a leave request
    
    Args:
        start_date: Leave start date (YYYY-MM-DD)
        end_date: Leave end date (YYYY-MM-DD)
        reason: Reason for leave
        leave_type: Type of leave (sick, casual, annual, etc.)
    
    Returns:
        dict: Leave request response
    """
    data = {
        "startDate": start_date,
        "endDate": end_date,
        "reason": reason,
        "leaveType": leave_type
    }
    
    return hrms._make_request("POST", "/leaves/request", data)
```

### Get Leave Requests
```python
def get_leave_requests(status: str = None, employee_id: str = None) -> dict:
    """
    Get leave requests (role-based access)
    
    Args:
        status: Filter by status (pending, approved, rejected)
        employee_id: Filter by employee (admin/hr only)
    
    Returns:
        dict: List of leave requests
    """
    params = {}
    if status:
        params["status"] = status
    if employee_id:
        params["employeeId"] = employee_id
    
    return hrms._make_request("GET", "/leaves", params=params)
```

### Get My Leave Requests
```python
def get_my_leave_requests() -> dict:
    """
    Get current user's leave requests
    
    Returns:
        dict: User's leave requests
    """
    return hrms._make_request("GET", "/leaves/my")
```

### Approve/Reject Leave (Admin/HR only)
```python
def update_leave_status(leave_id: str, status: str, comments: str = None) -> dict:
    """
    Approve or reject a leave request
    
    Args:
        leave_id: Leave request ID
        status: New status (approved, rejected)
        comments: Optional comments
    
    Returns:
        dict: Updated leave request
    """
    data = {"status": status}
    if comments:
        data["comments"] = comments
    
    return hrms._make_request("PUT", f"/leaves/{leave_id}/status", data)
```

## 5. Regularization Management

### Request Regularization
```python
def request_regularization(date: str, actual_check_in: str, actual_check_out: str, reason: str) -> dict:
    """
    Submit attendance regularization request
    
    Args:
        date: Date to regularize (YYYY-MM-DD)
        actual_check_in: Actual check-in time (HH:MM format)
        actual_check_out: Actual check-out time (HH:MM format)
        reason: Reason for regularization
    
    Returns:
        dict: Regularization request response
    """
    data = {
        "date": date,
        "actualCheckIn": actual_check_in,
        "actualCheckOut": actual_check_out,
        "reason": reason
    }
    
    return hrms._make_request("POST", "/regularizations/request", data)
```

### Get Regularization Requests
```python
def get_regularization_requests(status: str = None) -> dict:
    """
    Get regularization requests (role-based access)
    
    Args:
        status: Filter by status (pending, approved, rejected)
    
    Returns:
        dict: List of regularization requests
    """
    params = {}
    if status:
        params["status"] = status
    
    return hrms._make_request("GET", "/regularizations", params=params)
```

### Review Regularization (Admin/HR only)
```python
def review_regularization(request_id: str, status: str, comments: str = None) -> dict:
    """
    Review regularization request
    
    Args:
        request_id: Regularization request ID
        status: Decision (approved, rejected)
        comments: Optional review comments
    
    Returns:
        dict: Updated regularization request
    """
    data = {"status": status}
    if comments:
        data["comments"] = comments
    
    return hrms._make_request("POST", f"/regularizations/{request_id}/review", data)
```

## 6. Salary Management

### Get Salary Structures (Admin/HR only)
```python
def get_salary_structures(page: int = 1, limit: int = 50, search: str = None) -> dict:
    """
    Get all salary structures
    
    Args:
        page: Page number
        limit: Results per page
        search: Search by employee name/ID
    
    Returns:
        dict: List of salary structures
    """
    params = {"page": page, "limit": limit}
    if search:
        params["search"] = search
    
    return hrms._make_request("GET", "/salary-structures", params=params)
```

### Create/Update Salary Structure (Admin/HR only)
```python
def create_salary_structure(employee_id: str, basic_salary: float, allowances: dict, deductions: dict) -> dict:
    """
    Create or update salary structure for employee
    
    Args:
        employee_id: Employee ID
        basic_salary: Basic salary amount
        allowances: Dictionary of allowances (hra, da, ta, etc.)
        deductions: Dictionary of deductions (pf, esi, etc.)
    
    Returns:
        dict: Created/updated salary structure
    """
    data = {
        "employeeId": employee_id,
        "basicSalary": basic_salary,
        "allowances": allowances,
        "deductions": deductions
    }
    
    return hrms._make_request("POST", "/salary-structures", data)
```

### Get Employees Without Salary Structure (Admin/HR only)
```python
def get_employees_without_salary_structure() -> dict:
    """
    Get list of employees who don't have salary structures
    
    Returns:
        dict: List of employees without salary structures
    """
    return hrms._make_request("GET", "/salary-structures/employees-without-structure")
```

### Generate Salary Slip (Admin/HR only)
```python
def generate_salary_slip(employee_id: str, month: int, year: int, tax_regime: str = "new") -> dict:
    """
    Generate salary slip for employee
    
    Args:
        employee_id: Employee ID
        month: Month (1-12)
        year: Year (YYYY)
        tax_regime: Tax regime (old, new)
    
    Returns:
        dict: Generated salary slip
    """
    data = {
        "employeeId": employee_id,
        "month": month,
        "year": year,
        "taxRegime": tax_regime
    }
    
    return hrms._make_request("POST", "/salary-slips", data)
```

### Get Salary Slips
```python
def get_salary_slips(employee_id: str = None, month: int = None, year: int = None, 
                    status: str = None, page: int = 1, limit: int = 50) -> dict:
    """
    Get salary slips with filters
    
    Args:
        employee_id: Filter by employee
        month: Filter by month (1-12)
        year: Filter by year
        status: Filter by status (draft, published)
        page: Page number
        limit: Results per page
    
    Returns:
        dict: List of salary slips
    """
    params = {"page": page, "limit": limit}
    if employee_id:
        params["employeeId"] = employee_id
    if month:
        params["month"] = month
    if year:
        params["year"] = year
    if status:
        params["status"] = status
    
    return hrms._make_request("GET", "/salary-slips", params=params)
```

### Publish/Unpublish Salary Slip (Admin/HR only)
```python
def update_salary_slip_status(employee_id: str, month: int, year: int, status: str) -> dict:
    """
    Update salary slip status (publish/unpublish)
    
    Args:
        employee_id: Employee ID
        month: Month (1-12)
        year: Year
        status: New status (published, draft)
    
    Returns:
        dict: Updated salary slip
    """
    data = {"status": status}
    return hrms._make_request("PUT", f"/salary-slips/{employee_id}/{month}/{year}/status", data)
```

## 7. Task Reports

### Submit Task Report
```python
def submit_task_report(date: str, tasks: list, total_hours: float) -> dict:
    """
    Submit daily task report
    
    Args:
        date: Report date (YYYY-MM-DD)
        tasks: List of tasks completed
        total_hours: Total hours worked
    
    Returns:
        dict: Submitted task report
    """
    data = {
        "date": date,
        "tasks": tasks,
        "totalHours": total_hours
    }
    
    return hrms._make_request("POST", "/task-reports/submit", data)
```

### Get Task Reports
```python
def get_task_reports(employee_id: str = None, start_date: str = None, end_date: str = None) -> dict:
    """
    Get task reports (role-based access)
    
    Args:
        employee_id: Filter by employee (admin/hr only)
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
    
    Returns:
        dict: List of task reports
    """
    params = {}
    if employee_id:
        params["employeeId"] = employee_id
    if start_date:
        params["startDate"] = start_date
    if end_date:
        params["endDate"] = end_date
    
    return hrms._make_request("GET", "/task-reports", params=params)
```

## 8. Holiday Management

### Create Holiday (Admin/HR only)
```python
def create_holiday(name: str, date: str, description: str = None, holiday_type: str = "public") -> dict:
    """
    Create a new holiday
    
    Args:
        name: Holiday name
        date: Holiday date (YYYY-MM-DD)
        description: Holiday description
        holiday_type: Type of holiday (public, restricted, etc.)
    
    Returns:
        dict: Created holiday
    """
    data = {
        "name": name,
        "date": date,
        "type": holiday_type
    }
    if description:
        data["description"] = description
    
    return hrms._make_request("POST", "/holidays", data)
```

### Get Holidays
```python
def get_holidays(year: int = None) -> dict:
    """
    Get list of holidays
    
    Args:
        year: Filter by year (optional)
    
    Returns:
        dict: List of holidays
    """
    params = {}
    if year:
        params["year"] = year
    
    return hrms._make_request("GET", "/holidays", params=params)
```

### Update Holiday (Admin/HR only)
```python
def update_holiday(holiday_id: str, update_data: dict) -> dict:
    """
    Update holiday information
    
    Args:
        holiday_id: Holiday ID
        update_data: Fields to update
    
    Returns:
        dict: Updated holiday
    """
    return hrms._make_request("PUT", f"/holidays/{holiday_id}", update_data)
```

### Delete Holiday (Admin/HR only)
```python
def delete_holiday(holiday_id: str) -> dict:
    """
    Delete a holiday
    
    Args:
        holiday_id: Holiday ID
    
    Returns:
        dict: Deletion confirmation
    """
    return hrms._make_request("DELETE", f"/holidays/{holiday_id}")
```

## 9. Help Desk

### Submit Help Inquiry
```python
def submit_help_inquiry(subject: str, description: str, priority: str = "medium") -> dict:
    """
    Submit a help desk inquiry
    
    Args:
        subject: Inquiry subject
        description: Detailed description
        priority: Priority level (low, medium, high, urgent)
    
    Returns:
        dict: Submitted inquiry
    """
    data = {
        "subject": subject,
        "description": description,
        "priority": priority
    }
    
    return hrms._make_request("POST", "/help", data)
```

### Get My Help Inquiries
```python
def get_my_help_inquiries() -> dict:
    """
    Get current user's help inquiries
    
    Returns:
        dict: List of user's inquiries
    """
    return hrms._make_request("GET", "/help/my")
```

### Get All Help Inquiries (Admin/HR only)
```python
def get_all_help_inquiries(status: str = None, priority: str = None) -> dict:
    """
    Get all help inquiries with filtering
    
    Args:
        status: Filter by status (open, in-progress, resolved, closed)
        priority: Filter by priority (low, medium, high, urgent)
    
    Returns:
        dict: List of all inquiries
    """
    params = {}
    if status:
        params["status"] = status
    if priority:
        params["priority"] = priority
    
    return hrms._make_request("GET", "/help/all", params=params)
```

### Update Help Inquiry Status (Admin/HR only)
```python
def update_help_inquiry_status(inquiry_id: str, status: str, response: str = None) -> dict:
    """
    Update help inquiry status
    
    Args:
        inquiry_id: Inquiry ID
        status: New status (in-progress, resolved, closed)
        response: Response message
    
    Returns:
        dict: Updated inquiry
    """
    data = {"status": status}
    if response:
        data["response"] = response
    
    return hrms._make_request("PATCH", f"/help/{inquiry_id}", data)
```

## 10. Announcements

### Create Announcement (Admin/HR only)
```python
def create_announcement(title: str, content: str, priority: str = "normal", target_roles: list = None) -> dict:
    """
    Create a new announcement
    
    Args:
        title: Announcement title
        content: Announcement content
        priority: Priority level (low, normal, high, urgent)
        target_roles: List of target roles (admin, hr, employee)
    
    Returns:
        dict: Created announcement
    """
    data = {
        "title": title,
        "content": content,
        "priority": priority
    }
    if target_roles:
        data["targetRoles"] = target_roles
    
    return hrms._make_request("POST", "/announcements", data)
```

### Get Announcements
```python
def get_announcements() -> dict:
    """
    Get announcements (role-filtered)
    
    Returns:
        dict: List of announcements for current user's role
    """
    return hrms._make_request("GET", "/announcements")
```

### Update Announcement (Admin/HR only)
```python
def update_announcement(announcement_id: str, update_data: dict) -> dict:
    """
    Update announcement
    
    Args:
        announcement_id: Announcement ID
        update_data: Fields to update
    
    Returns:
        dict: Updated announcement
    """
    return hrms._make_request("PUT", f"/announcements/{announcement_id}", update_data)
```

### Delete Announcement (Admin/HR only)
```python
def delete_announcement(announcement_id: str) -> dict:
    """
    Delete announcement
    
    Args:
        announcement_id: Announcement ID
    
    Returns:
        dict: Deletion confirmation
    """
    return hrms._make_request("DELETE", f"/announcements/{announcement_id}")
```

## 11. Dashboard & Analytics

### Get Admin Dashboard Summary (Admin/HR only)
```python
def get_admin_dashboard_summary() -> dict:
    """
    Get admin dashboard with key metrics and statistics
    
    Returns:
        dict: Dashboard data with employee count, attendance stats, leave requests, etc.
    """
    return hrms._make_request("GET", "/dashboard/admin")
```

### Get Activity Feed
```python
def get_activity_feed() -> dict:
    """
    Get recent activity feed
    
    Returns:
        dict: List of recent activities in the system
    """
    return hrms._make_request("GET", "/activity/feed")
```

## 12. System Health & Utilities

### Check System Health
```python
def check_system_health() -> dict:
    """
    Check system health and status
    
    Returns:
        dict: System health information
    """
    try:
        response = requests.get(f"{hrms.base_url}/health", timeout=10)
        return response.json()
    except Exception as e:
        return {"success": False, "message": f"Health check failed: {str(e)}"}
```

### Check API Health
```python
def check_api_health() -> dict:
    """
    Check API health and status
    
    Returns:
        dict: API health information
    """
    try:
        response = requests.get(f"{hrms.api_base}/", timeout=10)
        return response.json()
    except Exception as e:
        return {"success": False, "message": f"API health check failed: {str(e)}"}
```

## Usage Examples

### Example 1: Employee Daily Check-in Flow
```python
# Login user
login_response = login_user("john.doe", "password123")
if not login_response.get("success"):
    print("Login failed:", login_response.get("message"))
    exit()

# Check in with location
checkin_response = check_in({
    "latitude": 28.6139,
    "longitude": 77.2090,
    "address": "Office Location, Delhi"
})

if checkin_response.get("success"):
    print("Checked in successfully!")
    print(f"Check-in time: {checkin_response['data']['checkIn']}")
else:
    print("Check-in failed:", checkin_response.get("message"))
```

### Example 2: HR Managing Leave Requests
```python
# Login as HR
login_user("hr.manager", "hrpassword")

# Get pending leave requests
leave_requests = get_leave_requests(status="pending")

for request in leave_requests.get("data", []):
    print(f"Leave Request: {request['employee']['name']} - {request['startDate']} to {request['endDate']}")
    
    # Approve the request
    approve_response = update_leave_status(
        request["_id"], 
        "approved", 
        "Leave approved. Enjoy your time off!"
    )
    print(f"Approval status: {approve_response.get('success')}")
```

### Example 3: Generate Monthly Salary Slips
```python
# Login as admin
login_user("admin", "adminpassword")

# Get all employees
employees = get_all_employees(status="active")

# Generate salary slips for current month
from datetime import datetime
current_month = datetime.now().month
current_year = datetime.now().year

for employee in employees.get("data", {}).get("employees", []):
    salary_slip = generate_salary_slip(
        employee["employeeId"],
        current_month,
        current_year,
        "new"  # tax regime
    )
    
    if salary_slip.get("success"):
        # Publish the salary slip
        publish_response = update_salary_slip_status(
            employee["employeeId"],
            current_month,
            current_year,
            "published"
        )
        print(f"Salary slip generated and published for {employee['firstName']} {employee['lastName']}")
```

## Error Handling Best Practices

```python
def handle_api_response(response: dict, success_message: str = None) -> bool:
    """
    Handle API response with proper error logging
    
    Args:
        response: API response dictionary
        success_message: Message to display on success
    
    Returns:
        bool: True if successful, False otherwise
    """
    if response.get("success"):
        if success_message:
            print(success_message)
        return True
    else:
        error_msg = response.get("message", "Unknown error occurred")
        print(f"Error: {error_msg}")
        
        # Handle specific error cases
        if response.get("status_code") == 401:
            print("Authentication required. Please login again.")
        elif "validation" in error_msg.lower():
            print("Please check your input data and try again.")
        
        return False

# Example usage
response = check_in()
if handle_api_response(response, "Successfully checked in!"):
    # Continue with success flow
    pass
else:
    # Handle error case
    pass
```

## Notes for GPT Bot Integration

1. **Authentication**: Always call `login_user()` first and check for successful authentication before making other API calls.

2. **Error Handling**: All functions return a consistent response format. Always check the `success` field before processing data.

3. **Role-Based Access**: Functions marked with "(Admin/HR only)" will return authentication errors if called by employee users.

4. **Date Formats**: All dates should be in "YYYY-MM-DD" format, and times in "HH:MM" format.

5. **Pagination**: Most list functions support pagination. Use `page` and `limit` parameters for better performance.

6. **Rate Limiting**: The API may have rate limiting. Implement appropriate delays between requests if needed.

7. **Token Management**: Store and reuse the authentication token. It's included in the session automatically after login.

8. **Logging**: All functions include logging for debugging. Enable logging in production for better error tracking.

This comprehensive function library provides everything needed for a GPT bot to interact with your HRMS system effectively!