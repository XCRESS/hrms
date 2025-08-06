from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
from datetime import datetime
from typing import Dict, List, Optional
import logging
from openai import OpenAI
from dotenv import load_dotenv
import os

# Import core HR functions for required operations only
from hr_api_client import SimplifiedHRClient
from hr_functions import (
    get_today_date,
    get_yesterday_date
)

load_dotenv()

# OpenAI setup
openai_api_key = os.getenv('OPENAI_API_KEY')
if not openai_api_key:
    print("❌ ERROR: OPENAI_API_KEY not found in environment variables!")
    exit(1)

client = OpenAI()
print("✅ OpenAI client initialized successfully")

# Enhanced logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('hrms_buddy.log', mode='a', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# FastAPI setup
app = FastAPI(title="HRMS Buddy API - Simplified", version="2.1.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://hr.intakesense.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize HR client
hr_client = SimplifiedHRClient()
logger.info("HR client initialized successfully")

def format_employees_response(api_response):
    """Format employees API response for proper display"""
    try:
        if not api_response.get("success"):
            return api_response
        
        # The employees API returns data directly without formatResponse wrapper
        # Structure: { "success": True, "data": { "employees": [...] } }
        data = api_response.get("data", {})
        employees = data.get("employees", [])
        
        # Debug logging
        logger.info(f"Employees API response structure: success={api_response.get('success')}, data_keys={list(data.keys()) if data else 'None'}, employees_count={len(employees) if employees else 0}")
        
        if not employees:
            return {
                "success": True,
                "data": [],
                "formatted_response": "No employees found in the system."
            }
        
        # Format the response - show ALL employee information for HR access
        response_text = f"📋 **Complete Employee Directory** ({len(employees)} employees)\n\n"
        
        for emp in employees:  # Show all employees with complete information
            name = emp.get("fullName", f"{emp.get('firstName', '')} {emp.get('lastName', '')}").strip()
            emp_id = emp.get("employeeId", "N/A")
            first_name = emp.get("firstName", "N/A")
            last_name = emp.get("lastName", "N/A")
            department = emp.get("department", "N/A")
            position = emp.get("position", "N/A")
            status = "Active" if emp.get("isActive", True) else "Inactive"
            email = emp.get("email", "N/A")
            phone = emp.get("phone", "N/A")
            company = emp.get("companyName", "N/A")
            joining_date = emp.get("joiningDate", "N/A")
            bank_name = emp.get("bankName", "N/A")
            bank_account = emp.get("bankAccountNumber", "N/A")
            pan_number = emp.get("panNumber", "N/A")
            
            # Format joining date
            if joining_date != "N/A":
                try:
                    date_obj = datetime.fromisoformat(joining_date.replace('Z', '+00:00'))
                    joining_date = date_obj.strftime('%d %B %Y')
                except:
                    pass  # Keep original if parsing fails
            
            response_text += f"**{name}** ({emp_id})\n"
            response_text += f"  👤 Name: {first_name} {last_name}\n"
            response_text += f"  📧 Email: {email}\n"
            response_text += f"  📱 Phone: {phone}\n"
            response_text += f"  🏢 Department: {department}\n"
            response_text += f"  💼 Position: {position}\n"
            response_text += f"  🏛️  Company: {company}\n"
            response_text += f"  📅 Joined: {joining_date}\n"
            response_text += f"  🏦 Bank: {bank_name}\n"
            response_text += f"  💳 Account: {bank_account}\n"
            response_text += f"  🆔 PAN: {pan_number}\n"
            response_text += f"  🟢 Status: {status}\n\n"
        
        return {
            "success": True,
            "data": employees,
            "formatted_response": response_text
        }
        
    except Exception as e:
        logger.error(f"Error formatting employees response: {e}")
        return {
            "success": False,
            "error": str(e),
            "formatted_response": "Error formatting employee data."
        }

def format_profile_response(api_response):
    """Format user profile API response for proper display"""
    try:
        if not api_response.get("success"):
            return api_response
        
        # The profile API returns employee data spread directly in response
        # API Client wraps: {success: true, data: {success: true, ...employee_fields}}
        backend_response = api_response.get("data", {})
        
        # Check if it's a partial profile (from User collection)
        if backend_response.get("isPartialProfile"):
            response_text = f"👤 **Profile** (Basic Information)\n\n"
            response_text += f"• **Name:** {backend_response.get('firstName', '')} {backend_response.get('lastName', '')}\n"
            response_text += f"• **Email:** {backend_response.get('email', 'N/A')}\n"
            response_text += f"• **Employee ID:** {backend_response.get('employeeId', 'N/A')}\n"
            response_text += f"• **Department:** {backend_response.get('department', 'N/A')}\n"
            response_text += f"• **Position:** {backend_response.get('position', 'N/A')}\n\n"
            response_text += f"⚠️ **Note:** Complete profile not found in employee records.\n"
        else:
            # Full employee profile
            name = f"{backend_response.get('firstName', '')} {backend_response.get('lastName', '')}".strip()
            response_text = f"👤 **{name}** - Complete Profile\n\n"
            
            # Personal Information
            response_text += f"**📋 Personal Information:**\n"
            response_text += f"• **Employee ID:** {backend_response.get('employeeId', 'N/A')}\n"
            response_text += f"• **Email:** {backend_response.get('email', 'N/A')}\n"
            response_text += f"• **Phone:** {backend_response.get('phone', 'N/A')}\n"
            response_text += f"• **Gender:** {backend_response.get('gender', 'N/A').title()}\n"
            response_text += f"• **Date of Birth:** {backend_response.get('dateOfBirth', 'N/A')}\n"
            response_text += f"• **Marital Status:** {backend_response.get('maritalStatus', 'N/A').title()}\n\n"
            
            # Work Information
            response_text += f"**🏢 Work Information:**\n"
            response_text += f"• **Company:** {backend_response.get('companyName', 'N/A')}\n"
            response_text += f"• **Department:** {backend_response.get('department', 'N/A')}\n"
            response_text += f"• **Position:** {backend_response.get('position', 'N/A')}\n"
            response_text += f"• **Employment Type:** {backend_response.get('employmentType', 'N/A').title()}\n"
            response_text += f"• **Office Address:** {backend_response.get('officeAddress', 'N/A')}\n"
            
            # Format joining date
            joining_date = backend_response.get('joiningDate', 'N/A')
            if joining_date != 'N/A':
                try:
                    date_obj = datetime.fromisoformat(joining_date.replace('Z', '+00:00'))
                    joining_date = date_obj.strftime('%d %B %Y')
                except:
                    pass
            response_text += f"• **Joining Date:** {joining_date}\n"
            response_text += f"• **Reporting Supervisor:** {backend_response.get('reportingSupervisor', 'N/A')}\n"
            
            status = "Active" if backend_response.get("isActive", True) else "Inactive"
            response_text += f"• **Status:** {status}\n"
        
        return {
            "success": True,
            "data": backend_response,
            "formatted_response": response_text
        }
        
    except Exception as e:
        logger.error(f"Error formatting profile response: {e}")
        return api_response

def format_attendance_response(api_response):
    """Format attendance API response for proper display"""
    try:
        if not api_response.get("success"):
            return api_response
            
        # Extract data from nested response structure
        # API Client wraps backend response: {success, data: {success, data: {...}}}
        backend_response = api_response.get("data", {})
        data = backend_response.get("data", {})
        
        if "overview" in data:
            # Attendance overview response
            overview = data["overview"]
            stats = overview.get("statistics", {})
            
            response_text = f"📊 **Attendance Overview**\n\n"
            response_text += f"• **Total Employees:** {stats.get('totalEmployees', 'N/A')}\n"
            response_text += f"• **Present Today:** {stats.get('presentToday', 'N/A')} ({stats.get('attendanceRate', 'N/A')}%)\n"
            response_text += f"• **Absent Today:** {stats.get('absentToday', 'N/A')}\n"
            response_text += f"• **Late Arrivals:** {stats.get('lateToday', 'N/A')}\n"
            response_text += f"• **Half Day Today:** {stats.get('halfDayToday', 'N/A')}\n"
            response_text += f"• **Punctuality Rate:** {stats.get('punctualityRate', 'N/A')}%\n"
            
            # Add insights if available
            insights = overview.get("insights", [])
            if insights:
                response_text += f"\n💡 **Key Insights:**\n"
                for insight in insights[:3]:  # Show top 3 insights
                    response_text += f"• {insight}\n"
            
            return {
                "success": True,
                "data": data,
                "formatted_response": response_text
            }
        elif "records" in data:
            # Attendance records list from get_attendance_records
            records = data["records"]
            pagination = data.get("pagination", {})
            
            if not records:
                return {
                    "success": True,
                    "data": data,
                    "formatted_response": "No attendance records found for the specified criteria."
                }
            
            response_text = f"📋 **Attendance Records** ({len(records)} records, Page {pagination.get('page', 1)} of {pagination.get('pages', 1)})\n\n"
            
            for record in records:
                emp_name = record.get("employeeName", "Unknown")
                emp_id = record.get("employeeId", "N/A")
                date_str = record.get("date", "N/A")
                status = record.get("status", "N/A").title()
                check_in = record.get("checkIn", "N/A")
                check_out = record.get("checkOut", "N/A")
                working_hours = record.get("workingHours", 0)
                department = record.get("department", "N/A")
                
                response_text += f"**{emp_name}** ({emp_id}) - {department}\n"
                response_text += f"  📅 Date: {date_str}\n"
                response_text += f"  🟢 Status: {status}\n"
                if check_in != "N/A":
                    response_text += f"  ⏰ Check-in: {check_in}\n"
                if check_out != "N/A":
                    response_text += f"  ⏰ Check-out: {check_out}\n"
                response_text += f"  ⏱️ Working Hours: {working_hours}\n\n"
            
            if pagination.get("total", 0) > len(records):
                response_text += f"📊 Showing {len(records)} of {pagination.get('total', 0)} total records\n"
            
            return {
                "success": True,
                "data": data,
                "formatted_response": response_text
            }
        elif "employee" in data:
            # Individual employee attendance analysis from get_employee_attendance
            employee = data.get("employee", {})
            analysis = data.get("analysis", {})
            records = data.get("records", [])
            
            emp_name = employee.get("name", "Unknown Employee")
            emp_id = employee.get("employeeId", "N/A")
            department = employee.get("department", "N/A")
            
            response_text = f"👤 **{emp_name}** ({emp_id}) - Attendance Analysis\n\n"
            response_text += f"• **Department:** {department}\n"
            response_text += f"• **Total Days:** {analysis.get('totalDays', 'N/A')}\n"
            response_text += f"• **Present Days:** {analysis.get('presentDays', 'N/A')}\n"
            response_text += f"• **Absent Days:** {analysis.get('absentDays', 'N/A')}\n"
            response_text += f"• **Late Days:** {analysis.get('lateDays', 'N/A')}\n"
            response_text += f"• **Half Days:** {analysis.get('halfDays', 'N/A')}\n"
            response_text += f"• **Attendance Rate:** {analysis.get('attendanceRate', 'N/A')}%\n"
            response_text += f"• **Punctuality Score:** {analysis.get('punctualityScore', 'N/A')}%\n\n"
            
            if records:
                response_text += f"📋 **Recent Attendance Records:**\n\n"
                for record in records[:10]:  # Show last 10 records
                    date_str = record.get("date", "N/A")
                    status = record.get("status", "N/A").title()
                    check_in = record.get("checkIn", "N/A")
                    working_hours = record.get("workingHours", 0)
                    
                    response_text += f"• **{date_str}**: {status}"
                    if check_in and check_in != "N/A":
                        try:
                            # Format check-in time from ISO string
                            check_in_obj = datetime.fromisoformat(check_in.replace('Z', '+00:00'))
                            check_in_time = check_in_obj.strftime('%H:%M')
                            response_text += f" (Check-in: {check_in_time})"
                        except:
                            response_text += f" (Check-in: {check_in})"
                    if working_hours > 0:
                        response_text += f" - {working_hours}h"
                    response_text += "\n"
            
            return {
                "success": True,
                "data": data,
                "formatted_response": response_text
            }
        else:
            return {
                "success": True,
                "data": data,
                "formatted_response": "Attendance data retrieved successfully."
            }
            
    except Exception as e:
        logger.error(f"Error formatting attendance response: {e}")
        return api_response

def format_task_response(api_response):
    """Format task reports API response for proper display"""
    try:
        if not api_response.get("success"):
            return api_response
            
        # Extract data from nested response structure
        # API Client wraps backend response: {success, data: {success, data: {...}}}
        backend_response = api_response.get("data", {})
        data = backend_response.get("data", {})
        
        if "overview" in data:
            # Task reports overview - simple stats based on actual model
            overview = data["overview"]
            stats = overview.get("statistics", {})
            
            response_text = f"📈 **Task Reports Overview**\n\n"
            response_text += f"• **Total Employees:** {stats.get('totalEmployees', 'N/A')}\n"
            response_text += f"• **Employees with Task Reports:** {stats.get('employeesWithTasks', 'N/A')}\n"
            response_text += f"• **Task Reporting Rate:** {stats.get('taskReportingRate', 'N/A')}%\n"
            response_text += f"• **Total Reports:** {stats.get('totalReports', 'N/A')}\n"
            response_text += f"• **Total Tasks Reported:** {stats.get('totalTasks', 'N/A')}\n"
            response_text += f"• **Average Tasks per Report:** {stats.get('avgTasksPerReport', 'N/A')}\n"
            
            return {
                "success": True,
                "data": data,
                "formatted_response": response_text
            }
        elif "reports" in data:
            # Task reports list - show complete task lists
            reports = data["reports"]
            if not reports:
                return {
                    "success": True,
                    "data": data,
                    "formatted_response": "No task reports found for the specified criteria."
                }
                
            response_text = f"📝 **Task Reports** ({len(reports)} reports)\n\n"
            
            for report in reports:  # Show all reports in date range
                emp_name = report.get("employee", {}).get("firstName", "") + " " + report.get("employee", {}).get("lastName", "")
                emp_name = emp_name.strip() or "Unknown"
                date_str = report.get("date", "N/A")
                tasks = report.get("tasks", [])
                
                response_text += f"**{emp_name}** - {date_str}\n"
                response_text += f"Tasks ({len(tasks)}):\n"
                
                # Show all tasks for this report
                for i, task in enumerate(tasks, 1):
                    response_text += f"  {i}. {task}\n"
                response_text += "\n"
                
            return {
                "success": True,
                "data": data,
                "formatted_response": response_text
            }
        elif "employee" in data:
            # Individual employee task analysis with complete task history
            employee = data.get("employee", {})
            analysis = data.get("analysis", {})
            reports = data.get("reports", [])
            
            response_text = f"👤 **{employee.get('name', 'Employee')} - Task Reports**\n\n"
            response_text += f"• **Department:** {employee.get('department', 'N/A')}\n"
            response_text += f"• **Position:** {employee.get('position', 'N/A')}\n"
            response_text += f"• **Total Reports:** {analysis.get('totalReports', 'N/A')}\n"
            response_text += f"• **Total Tasks:** {analysis.get('totalTasks', 'N/A')}\n"
            response_text += f"• **Average Tasks per Report:** {analysis.get('avgTasksPerReport', 'N/A')}\n\n"
            
            # Show complete task reports for the employee
            if reports:
                response_text += f"**📋 Complete Task History:**\n\n"
                for report in reports:
                    date_str = report.get("date", "N/A")
                    tasks = report.get("tasks", [])
                    
                    response_text += f"**{date_str}** - {len(tasks)} tasks:\n"
                    for i, task in enumerate(tasks, 1):
                        response_text += f"  {i}. {task}\n"
                    response_text += "\n"
            
            return {
                "success": True,
                "data": data,
                "formatted_response": response_text
            }
        else:
            return {
                "success": True,
                "data": data,
                "formatted_response": "Task reports data retrieved successfully."
            }
            
    except Exception as e:
        logger.error(f"Error formatting task response: {e}")
        return api_response

def get_bearer_token(email: str, password: str):
    """Get authentication token for HRMS backend"""
    url = "https://hrms-backend.up.railway.app/api/auth/login"
    headers = {"Content-Type": "application/json"}
    payload = {"email": email, "password": password}
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        return response.json().get("token", "Token not found in response")
    except requests.exceptions.HTTPError as http_err:
        return {"error": f"HTTP error occurred: {http_err}", "status_code": response.status_code}
    except Exception as err:
        return {"error": f"An error occurred: {err}"}

def extract_token_from_header(authorization: str = None) -> str:
    """Extract token from Authorization header"""
    if not authorization:
        return None
    
    if authorization.startswith('Bearer '):
        return authorization[7:]
    return authorization

# =============================================================================
# AVAILABLE FUNCTIONS WITH CLEAR SPECIFICATIONS
# =============================================================================

available_tools = {
    # Core API Functions for HR Controllers
    "get_attendance_overview": {
        "function": lambda date=None: format_attendance_response(hr_client.get_attendance_overview(date)),
        "description": "Get attendance overview from hr-attendance.controller.js",
        "inputs": "date (string, optional): Date in YYYY-MM-DD format",
        "returns": "Attendance statistics and insights"
    },
    
    "get_attendance_records": {
        "function": lambda **kwargs: format_attendance_response(hr_client.get_attendance_records(**kwargs)),
        "description": "Get attendance records from hr-attendance.controller.js",
        "inputs": "start_date (string): Start date in YYYY-MM-DD format, end_date (string): End date in YYYY-MM-DD format, employee_name (string, optional): Employee name for filtering",
        "returns": "Filtered attendance records with pagination"
    },
    
    "get_employee_attendance": {
        "function": lambda **kwargs: format_attendance_response(hr_client.get_employee_attendance(**kwargs)),
        "description": "Get individual employee attendance from hr-attendance.controller.js",
        "inputs": "employee_id (string, optional): Employee ID (e.g., 'EMP001'), employee_name (string, optional): Employee name, start_date (string): Start date, end_date (string): End date",
        "returns": "Employee attendance analysis"
    },
    
    "get_task_reports_overview": {
        "function": lambda period='month': format_task_response(hr_client.get_task_reports_overview(period)),
        "description": "Get task reports overview from hr-task-reports.controller.js",
        "inputs": "period (string, optional): 'today', 'week', 'month' (default)",
        "returns": "Task reporting statistics and metrics"
    },
    
    "get_task_reports": {
        "function": lambda **kwargs: format_task_response(hr_client.get_task_reports(**kwargs)),
        "description": "Get task reports from hr-task-reports.controller.js",
        "inputs": "start_date (string): Start date in YYYY-MM-DD format, end_date (string): End date in YYYY-MM-DD format, page (int, optional): Page number, limit (int, optional): Records per page",
        "returns": "Filtered task reports with complete task lists"
    },
    
    "get_employee_task_reports": {
        "function": lambda employee_id, start_date, end_date: format_task_response(hr_client.get_employee_task_reports(employee_id, start_date, end_date)),
        "description": "Get individual employee task reports from hr-task-reports.controller.js",
        "inputs": "employee_id (string): Employee ID, start_date (string): Start date, end_date (string): End date",
        "returns": "Employee task performance analysis"
    },
    
    "get_all_employees": {
        "function": lambda: format_employees_response(hr_client.get_all_employees()),
        "description": "Get all employees from employee.controllers.js getEmployees function",
        "inputs": "No parameters required",
        "returns": "List of all employees"
    },
    
    "get_user_profile": {
        "function": lambda: format_profile_response(hr_client.get_user_profile()),
        "description": "Get current user profile from employee.controllers.js getProfile function",
        "inputs": "No parameters required",
        "returns": "Current user's profile details"
    },
    
    # Date Helper Functions
    "get_today_date": {
        "function": lambda: (lambda today: {"success": True, "data": today, "formatted_response": f"Today's date: {today}"})(get_today_date()),
        "description": "Get today's date in YYYY-MM-DD format",
        "inputs": "No parameters required",
        "returns": "Today's date string"
    },
    
    "get_yesterday_date": {
        "function": lambda: (lambda yesterday: {"success": True, "data": yesterday, "formatted_response": f"Yesterday's date: {yesterday}"})(get_yesterday_date()),
        "description": "Get yesterday's date in YYYY-MM-DD format", 
        "inputs": "No parameters required",
        "returns": "Yesterday's date string"
    }
}


# Updated system prompt for core API functions
sys_prompt = '''You are HR Buddy, an AI assistant for HR management using core HRMS APIs.

CRITICAL: You MUST always respond in valid JSON format with one of these structures:
- Planning: {"step": "plan", "thinking": "your planning thoughts"}
- Taking action: {"step": "action", "function": "function_name", "input": "parameter_value_or_json"}
- Final response: {"step": "output", "content": "your final response to the user"}

AVAILABLE FUNCTIONS (Direct API Calls):

📊 **Attendance APIs (hr-attendance.controller.js):**
• get_attendance_overview(date=None) → Get attendance overview with statistics
• get_attendance_records(start_date, end_date, employee_name=None, page=1, limit=50) → Get filtered attendance records (supports name search & pagination)
• get_employee_attendance(employee_id=None, employee_name=None, start_date, end_date) → Individual employee attendance (supports name or ID)

📈 **Task Reports APIs (hr-task-reports.controller.js):**
• get_task_reports_overview(period='month') → Task reports overview with metrics
• get_task_reports(start_date, end_date, page=1, limit=50) → Get filtered task reports (supports pagination)
• get_employee_task_reports(employee_id, start_date, end_date) → Individual employee task reports

👥 **Employee APIs (employee.controllers.js):**
• get_all_employees() → Get all employees (getEmployees function)
• get_user_profile() → Get current user profile (getProfile function)

📅 **Date Helpers:**
• get_today_date() → Today's date in YYYY-MM-DD
• get_yesterday_date() → Yesterday's date in YYYY-MM-DD

WORKFLOW EXAMPLES:

User: "What's today's attendance?"
1. {"step": "action", "function": "get_attendance_overview", "input": null}

User: "Get attendance for EMP001 this month"
1. {"step": "plan", "thinking": "Need to get start and end dates for this month"}
2. {"step": "action", "function": "get_employee_attendance", "input": {"employee_id": "EMP001", "start_date": "2025-01-01", "end_date": "2025-01-31"}}

User: "Show attendance for John Doe last week"
1. {"step": "plan", "thinking": "Need to get start and end dates for last week, search by employee name"}
2. {"step": "action", "function": "get_employee_attendance", "input": {"employee_name": "John Doe", "start_date": "2024-12-23", "end_date": "2024-12-29"}}

User: "Get attendance records for marketing team this week"
1. {"step": "plan", "thinking": "Need attendance records filtered by employee name containing marketing employees"}
2. {"step": "action", "function": "get_attendance_records", "input": {"start_date": "2024-12-30", "end_date": "2025-01-05", "employee_name": "marketing"}}

User: "Show task reports overview"
1. {"step": "action", "function": "get_task_reports_overview", "input": "month"}

User: "List all employees"
1. {"step": "action", "function": "get_all_employees", "input": null}

PARAMETER HANDLING RULES:
- Always use JSON objects for functions with multiple parameters
- For optional parameters, omit them from JSON if not needed
- Employee search supports both employee_id (exact match) and employee_name (partial match)
- Date parameters must be in YYYY-MM-DD format
- Use get_today_date() and get_yesterday_date() helpers for current dates

IMPORTANT RULES:
- All API functions directly call backend controllers
- Handle API responses and format them appropriately
- Provide clear error messages from API responses
- Support both employee ID and employee name searches for attendance functions
- When user mentions employee names, use employee_name parameter for flexible matching'''

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    timestamp: datetime

# Store conversations in memory
conversations: Dict[str, List[Dict]] = {}

@app.get("/")
async def root():
    return {
        "message": "HR Buddy API v2.1 - Simplified", 
        "features": [
            "Simplified HR APIs",
            "Employee Search & Analysis", 
            "Attendance Tracking",
            "Task Performance Metrics",
            "Combined Performance Analysis"
        ],
        "available_functions": len(available_tools)
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "version": "2.1.0",
        "apis": ["simplified_attendance", "simplified_task_reports"],
        "functions": len(available_tools),
        "timestamp": datetime.now()
    }

@app.get("/functions")
async def list_functions():
    """List all available functions with their specifications"""
    functions_info = {}
    for func_name, func_info in available_tools.items():
        functions_info[func_name] = {
            "description": func_info["description"],
            "inputs": func_info["inputs"],
            "returns": func_info["returns"]
        }
    return {
        "available_functions": functions_info,
        "total_count": len(available_tools)
    }

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    chat_request: ChatMessage, 
    authorization: Optional[str] = Header(None)
):
    logger.info(f"Chat request received: {chat_request.message[:100]}...")
    
    try:
        # Extract and set token for this request
        token = extract_token_from_header(authorization)
        if token:
            logger.info("Using provided authorization token")
            hr_client.set_token(token)
        else:
            logger.info("No token provided, using fallback credentials")
            # Fallback to default credentials if no token provided
            fallback_token = get_bearer_token("veshant@cosmosfin.com", "admin")
            if isinstance(fallback_token, str):
                hr_client.set_token(fallback_token)
                logger.info("Successfully obtained fallback token")
            else:
                logger.error(f"Failed to obtain fallback token: {fallback_token}")
                raise HTTPException(status_code=401, detail="Authentication required and fallback failed")
        
        conversation_id = chat_request.conversation_id or str(datetime.now().timestamp())
        
        # Initialize conversation if new
        if conversation_id not in conversations:
            conversations[conversation_id] = [{"role": "system", "content": sys_prompt}]
        
        messages = conversations[conversation_id]
        messages.append({"role": "user", "content": chat_request.message})
        
        # Process the query through the AI system
        final_response = await process_query(messages)
        
        # Store the conversation
        conversations[conversation_id] = messages
        
        return ChatResponse(
            response=final_response,
            conversation_id=conversation_id,
            timestamp=datetime.now()
        )
        
    except HTTPException as http_e:
        logger.error(f"HTTP exception in chat endpoint: {http_e.detail}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in chat endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )

async def process_query(messages: List[Dict]) -> str:
    """Process the query through the AI system and return final response"""
    
    iteration_count = 0
    max_iterations = 10
    
    while iteration_count < max_iterations:
        iteration_count += 1
        logger.info(f"Processing iteration {iteration_count}/{max_iterations}")
        
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                response_format={"type": "json_object"},
                messages=messages,
                timeout=30
            )
            
            raw_content = response.choices[0].message.content
            logger.info(f"Received OpenAI response: {raw_content[:200]}...")
            
            messages.append({"role": "assistant", "content": raw_content})
            
            try:
                parsed_response = json.loads(raw_content)
                logger.info(f"Parsed response step: {parsed_response.get('step', 'unknown')}")
            except json.JSONDecodeError as json_err:
                logger.error(f"Failed to parse OpenAI response as JSON: {json_err}")
                return f"I received an invalid response format. Please try rephrasing your question."
            
            step = parsed_response.get("step")
            
            if step == "plan":
                logger.info("AI is in planning phase, continuing...")
                continue
                
            elif step == "action":
                logger.info(f"AI wants to execute action: {parsed_response.get('function', 'unknown')}")
                tool_name = parsed_response.get("function")
                
                if tool_name in available_tools:
                    try:
                        # Handle tool function parameters
                        tool_input = parsed_response.get("input")
                        logger.info(f"Executing tool {tool_name} with input: {tool_input}")
                        
                        # Get the function from available_tools
                        tool_func = available_tools[tool_name]["function"]
                        
                        # Parse parameters for different tool types
                        if tool_input:
                            try:
                                # Try to parse as JSON first
                                if isinstance(tool_input, str) and tool_input.startswith('{'):
                                    params = json.loads(tool_input)
                                    if len(params) == 1:
                                        # Single parameter
                                        output = tool_func(list(params.values())[0])
                                    elif len(params) == 2:
                                        # Two parameters  
                                        param_values = list(params.values())
                                        output = tool_func(param_values[0], param_values[1])
                                    else:
                                        # Multiple parameters - pass as kwargs
                                        output = tool_func(**params)
                                else:
                                    # Single string parameter
                                    output = tool_func(tool_input)
                            except json.JSONDecodeError:
                                # Treat as string parameter
                                output = tool_func(tool_input)
                        else:
                            # No parameters
                            output = tool_func()
                        
                        logger.info(f"Tool {tool_name} executed successfully")
                        
                        # Handle the response
                        if isinstance(output, dict) and not output.get("success", True):
                            error_message = output.get("user_message", output.get("error", "Unknown error occurred"))
                            logger.error(f"Tool {tool_name} failed: {error_message}")
                            messages.append({
                                "role": "user", 
                                "content": json.dumps({
                                    "step": "observe", 
                                    "error": error_message,
                                    "tool_name": tool_name
                                })
                            })
                        else:
                            # Use formatted response if available, otherwise raw data
                            response_content = output.get("formatted_response") if isinstance(output, dict) and "formatted_response" in output else output
                            messages.append({"role": "user", "content": json.dumps({"step": "observe", "output": response_content, "tool_name": tool_name})})
                        continue
                        
                    except Exception as e:
                        error_msg = f"Tool execution failed for {tool_name}: {str(e)}"
                        logger.error(f"Tool {tool_name} execution error: {e}", exc_info=True)
                        messages.append({
                            "role": "user", 
                            "content": json.dumps({
                                "step": "observe", 
                                "error": error_msg,
                                "tool_name": tool_name
                            })
                        })
                        continue
                else:
                    error_msg = f"Tool '{tool_name}' not available. Available tools: {', '.join(available_tools.keys())}"
                    logger.error(f"Unknown tool requested: {tool_name}")
                    messages.append({"role": "user", "content": json.dumps({"step": "observe", "error": error_msg})})
                    continue
                    
            elif step == "output":
                final_content = parsed_response.get("content", "I couldn't process your request properly.")
                logger.info(f"AI provided final output, length: {len(final_content)}")
                return final_content
                
            else:
                logger.warning(f"Unknown step received: {step}")
                return f"I encountered an unknown processing step. Please try rephrasing your question."
                
        except Exception as e:
            logger.error(f"Processing error in iteration {iteration_count}: {e}")
            return f"I encountered an error while processing your request: {str(e)}. Please try a different approach."
    
    # Max iterations reached
    logger.error(f"Max iterations ({max_iterations}) reached without resolution")
    return f"I reached the maximum processing iterations without completing your request. Please try a simpler request."

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚀 Starting HR Buddy Server...")
    print("="*60)
    logger.info("Starting HR Buddy server on port 8000")
    
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)