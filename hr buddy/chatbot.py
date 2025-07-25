from fastapi import FastAPI, HTTPException, Depends, status, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Union
import logging
from openai import OpenAI
from dotenv import load_dotenv
import asyncio
import os
import time
from functools import wraps
import pytz

# Import separated functions
from attendance_functions import (
    get_attendance_by_employee_name,
    get_team_attendance_today,
    get_today_attendance,
    get_admin_attendance_range,
    checkin_attendance,
    checkout_attendance,
    get_missing_checkouts
)
from attendance_today_yesterday import (
    get_attendance_today_and_yesterday,
    get_team_attendance_yesterday
)
from task_report_functions import (
    get_team_task_reports_today,
    get_task_reports_by_employee,
    submit_task_report
)
from leave_functions import (
    get_team_pending_leave_requests,
    get_leave_requests_by_employee,
    request_leave,
    update_leave_status,
    get_team_pending_regularization_requests,
    get_all_regularizations,
    request_regularization,
    review_regularization
)
from utils import (
    validate_date_string,
    format_date_for_api,
    get_ist_now,
    get_yesterday_date,
    get_today_date,
    convert_utc_to_ist,
    format_time_for_display,
    format_date_for_display,
    safe_json_parse,
    convert_timestamps_in_data,
    handle_api_response
)

load_dotenv()
client = OpenAI()

# Setup enhanced logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('hrms_buddy.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Retry decorator for robust API calls - optimized for performance
def retry_on_failure(max_retries: int = 2, delay: float = 0.3):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}: {str(e)}. Retrying in {delay}s...")
                        time.sleep(delay * (1.5 ** attempt))  # Reduced exponential backoff
                    else:
                        logger.error(f"All {max_retries} attempts failed for {func.__name__}: {str(e)}")
            raise last_exception
        return wrapper
    return decorator


app = FastAPI(title="HRMS Buddy API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000","https://hr.intakesense.com"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HRMSClient:
    def __init__(self, base_url: str = "https://hrms-backend.up.railway.app"):
        self.base_url = base_url.rstrip('/')
        self.api_base = f"{self.base_url}/api"
        self.session = requests.Session()
        self.token = None
        self.session.timeout = 15  # Reduced timeout for faster response
        # Set default headers
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'HRMS-Buddy/1.0.0'
        })
        
    def set_token(self, token: str):
        """Set authentication token for API requests"""
        self.token = token
        self.session.headers.update({'Authorization': f'Bearer {token}'})
        
    @retry_on_failure(max_retries=2, delay=0.5)  # Reduced retry attempts for performance
    def _make_request(self, method: str, endpoint: str, data: dict = None, params: dict = None) -> dict:
        """Make HTTP request with comprehensive error handling and retry logic"""
        url = f"{self.api_base}/{endpoint.lstrip('/')}"
        
        # Log the request for debugging
        logger.info(f"Making {method} request to {url} with params: {params}")
        
        try:
            # Validate and clean parameters
            if params:
                params = self._clean_params(params)
            
            response = self.session.request(
                method, 
                url, 
                json=data, 
                params=params, 
                timeout=15  # Reduced timeout
            )
            
            # Handle different status codes appropriately
            if response.status_code == 401:
                return {
                    "success": False, 
                    "message": "Authentication required or token expired", 
                    "status_code": 401,
                    "error_type": "authentication_error"
                }
            elif response.status_code == 403:
                return {
                    "success": False,
                    "message": "Insufficient permissions to access this resource",
                    "status_code": 403,
                    "error_type": "permission_error"
                }
            elif response.status_code == 404:
                return {
                    "success": False,
                    "message": "Resource not found or endpoint does not exist",
                    "status_code": 404,
                    "error_type": "not_found_error"
                }
            elif response.status_code == 400:
                try:
                    error_detail = response.json()
                    return {
                        "success": False,
                        "message": f"Bad request: {error_detail.get('message', 'Invalid request parameters')}",
                        "status_code": 400,
                        "error_type": "validation_error",
                        "details": error_detail
                    }
                except:
                    return {
                        "success": False,
                        "message": "Bad request: Invalid request parameters or format",
                        "status_code": 400,
                        "error_type": "validation_error"
                    }
            elif response.status_code == 500:
                return {
                    "success": False,
                    "message": "Internal server error. Please try again later or contact support.",
                    "status_code": 500,
                    "error_type": "server_error"
                }
            
            response.raise_for_status()
            
            # Parse JSON response
            try:
                result = response.json()
                logger.info(f"Successful response from {url}")
                return {"success": True, "data": result, "status_code": response.status_code}
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error for {url}: {e}")
                return {
                    "success": False, 
                    "message": "Invalid JSON response from server",
                    "error_type": "json_decode_error"
                }
                
        except requests.exceptions.Timeout:
            logger.error(f"Request timeout for {url}")
            return {
                "success": False, 
                "message": "Request timed out. The server might be busy, please try again.",
                "error_type": "timeout_error"
            }
        except requests.exceptions.ConnectionError:
            logger.error(f"Connection error for {url}")
            return {
                "success": False, 
                "message": "Unable to connect to the server. Please check your internet connection.",
                "error_type": "connection_error"
            }
        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP error for {url}: {e}")
            return {
                "success": False, 
                "message": f"HTTP error occurred: {str(e)}",
                "status_code": getattr(e.response, 'status_code', None),
                "error_type": "http_error"
            }
        except Exception as e:
            logger.error(f"Unexpected error for {url}: {e}")
            return {
                "success": False, 
                "message": f"Unexpected error: {str(e)}",
                "error_type": "unexpected_error"
            }
    
    def _clean_params(self, params: dict) -> dict:
        """Clean and validate parameters"""
        cleaned = {}
        for key, value in params.items():
            if value is not None and value != '':
                # Handle date formatting
                if 'date' in key.lower() and isinstance(value, str):
                    try:
                        cleaned[key] = format_date_for_api(value)
                    except:
                        cleaned[key] = value
                else:
                    cleaned[key] = value
        return cleaned
    
    def get_user_profile(self) -> dict:
        """Get current user profile"""
        return self._make_request("GET", "/employees/profile")
    
    # Attendance functions
    def get_my_attendance(self, params: dict = None) -> dict:
        """Get my attendance records"""
        return self._make_request("GET", "/attendance/my", params=params)
    
    def get_today_attendance(self) -> dict:
        """Get today's attendance for all employees (admin/hr only)"""
        return self._make_request("GET", "/attendance/today-with-absents")
    
    def get_admin_attendance_range(self, params: dict = None) -> dict:
        """Get attendance data for date range (admin/hr only)"""
        return self._make_request("GET", "/attendance/admin-range", params=params)
    
    def checkin(self, data: dict = None) -> dict:
        """Check in for attendance"""
        return self._make_request("POST", "/attendance/checkin", data=data)
    
    def checkout(self, data: dict = None) -> dict:
        """Check out for attendance"""
        return self._make_request("POST", "/attendance/checkout", data=data)
    
    def get_missing_checkouts(self) -> dict:
        """Get missing checkouts for regularization"""
        return self._make_request("GET", "/attendance/missing-checkouts")
    
    # Task Reports functions
    def get_my_task_reports(self, params: dict = None) -> dict:
        """Get my task reports"""
        return self._make_request("GET", "/task-reports/my", params=params)
    
    def get_all_task_reports(self, params: dict = None) -> dict:
        """Get all task reports (admin/hr only)"""
        return self._make_request("GET", "/task-reports/all", params=params)
    
    def submit_task_report(self, data: dict) -> dict:
        """Submit a task report"""
        return self._make_request("POST", "/task-reports/submit", data=data)
    
    # Leave/Request functions
    def get_my_leaves(self, params: dict = None) -> dict:
        """Get my leave requests"""
        return self._make_request("GET", "/leaves/my", params=params)
    
    def get_all_leaves(self, params: dict = None) -> dict:
        """Get all leave requests (admin/hr only)"""
        return self._make_request("GET", "/leaves/all", params=params)
    
    def request_leave(self, data: dict) -> dict:
        """Submit a leave request"""
        return self._make_request("POST", "/leaves/request", data=data)
    
    def update_leave_status(self, leave_id: str, data: dict) -> dict:
        """Update leave status (admin/hr only)"""
        return self._make_request("PUT", f"/leaves/{leave_id}/status", data=data)
    
    # Regularization functions
    def get_my_regularizations(self, params: dict = None) -> dict:
        """Get my regularization requests"""
        return self._make_request("GET", "/regularizations/my", params=params)
    
    def get_all_regularizations(self, params: dict = None) -> dict:
        """Get all regularization requests (admin/hr only)"""
        return self._make_request("GET", "/regularizations/all", params=params)
    
    def request_regularization(self, data: dict) -> dict:
        """Submit a regularization request"""
        return self._make_request("POST", "/regularizations/request", data=data)
    
    def review_regularization(self, reg_id: str, data: dict) -> dict:
        """Review regularization request (admin/hr only)"""
        return self._make_request("POST", f"/regularizations/{reg_id}/review", data=data)

# Initialize client
hrms = HRMSClient()

def get_bearer_token(email: str, password: str):
    url = "https://hrms-backend.up.railway.app/api/auth/login"
    headers = {"Content-Type": "application/json"}
    payload = {"email": email, "password": password}
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)  # Add timeout
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
        return authorization[7:]  # Remove 'Bearer ' prefix
    return authorization

# Enhanced tool functions with better error handling
def get_all_employee():
    """Get all employees with enhanced error handling"""
    try:
        response = hrms._make_request("GET", "/employees")
        return handle_api_response(response, "get_all_employee")
    except Exception as e:
        logger.error(f"get_all_employee error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve employee list."}

def get_my_profile():
    """Get user profile with enhanced error handling"""
    try:
        response = hrms.get_user_profile()
        return handle_api_response(response, "get_my_profile")
    except Exception as e:
        logger.error(f"get_my_profile error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve your profile information."}


available_tools = {
    "get_all_employee": get_all_employee,
    "get_my_profile": get_my_profile,
    
    # Attendance tools - HR-focused functions
    "get_attendance_by_employee_name": lambda employee_name, date_str=None: get_attendance_by_employee_name(hrms, employee_name, date_str),
    "get_team_attendance_today": lambda: get_team_attendance_today(hrms),
    "get_team_attendance_yesterday": lambda: get_team_attendance_yesterday(hrms),
    "get_attendance_today_and_yesterday": lambda: get_attendance_today_and_yesterday(hrms),
    "get_today_attendance": lambda: get_today_attendance(hrms),
    "get_admin_attendance_range": lambda params=None: get_admin_attendance_range(hrms, params),
    "checkin_attendance": lambda data=None: checkin_attendance(hrms, data),
    "checkout_attendance": lambda data=None: checkout_attendance(hrms, data),
    "get_missing_checkouts": lambda: get_missing_checkouts(hrms),
    
    # Task Reports tools - HR-focused functions
    "get_team_task_reports_today": lambda: get_team_task_reports_today(hrms),
    "get_task_reports_by_employee": lambda employee_name, date_str=None: get_task_reports_by_employee(hrms, employee_name, date_str),
    "submit_task_report": lambda data: submit_task_report(hrms, data),
    
    # Leave/Request tools - HR-focused functions
    "get_team_pending_leave_requests": lambda: get_team_pending_leave_requests(hrms),
    "get_leave_requests_by_employee": lambda employee_name: get_leave_requests_by_employee(hrms, employee_name),
    "request_leave": lambda data: request_leave(hrms, data),
    "update_leave_status": lambda leave_id, data: update_leave_status(hrms, leave_id, data),
    
    # Regularization tools - HR-focused functions
    "get_team_pending_regularization_requests": lambda: get_team_pending_regularization_requests(hrms),
    "get_all_regularizations": lambda params=None: get_all_regularizations(hrms, params),
    "request_regularization": lambda data: request_regularization(hrms, data),
    "review_regularization": lambda reg_id, data: review_regularization(hrms, reg_id, data),
}

sys_prompt = '''You are HR Buddy, a helpful HR assistant made for the sole purpose of helping users manage the HRMS portal using various tools provided below. 
You take the query as input then see if it's a general question that's not asking for any data or information, or a query that is asking for data insights like attendance, requests, task reports, salary slips or employee information.
Then you will look among the various tools available to best solve the query.
You work on plan, action, observe, output mode.

For the given user query and available tools, plan the step by step execution, based on the planning,
select the relevant tool from the available tool. Based on the tool selection you perform an action to call the tool.

Wait for the observation and based on the observation from the tool call resolve the user query.

IMPORTANT ERROR HANDLING RULES:
- When you receive an error in observation, check if there's a "user_message" in the response
- If there's a user_message, use that as your response to the user as it's specifically formatted for them
- If the error is about authentication or permissions, inform the user politely about the issue
- If the error is about validation or bad requests, explain what might be wrong with the request
- If you encounter date-related queries, ensure proper date formatting (YYYY-MM-DD)
- For "yesterday" queries, use the specific date instead of relative terms
- Always provide helpful suggestions when errors occur

TIMEZONE AND DATE HANDLING:
- All timestamps are automatically converted to local time
- Display times in user-friendly format (e.g., "02:30 PM")
- Dates are displayed in user-friendly format (e.g., "24 July 2025")
- The system handles "today" and "yesterday" queries properly

Rules:
- Follow the Output JSON Format exactly.
- Always perform one step at a time and wait for next input
- Carefully analyse the user query
- Only call tools that are in the available tools list
- Handle errors gracefully and provide user-friendly messages
- When dealing with dates, always format them properly
- For attendance queries about specific dates, include the date parameter
- Display times in clean, readable format
- Use user-friendly date formats in responses

Output JSON Format:
{{
    "step": "string",
    "content": "string",
    "function": "The name of function if the step is action",
    "input": "The input parameter for the function",
}}

Available Tools:
- get_all_employee: This tool will return list of employees with all there information.
- get_my_profile: This tool will return the employee profile of the user.

# Attendance Tools:
- get_team_attendance_today: Get today's attendance for all employees (HR use). No parameters needed.
- get_team_attendance_yesterday: Get yesterday's attendance for all employees (HR use). No parameters needed.
- get_attendance_today_and_yesterday: Get combined attendance for today and yesterday for all employees (HR use). No parameters needed.
- get_attendance_by_employee_name: Get attendance for a specific employee. Use: employee_name and optional date_str.
- get_admin_attendance_range: Get attendance data for date range. Use: {"startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD"}.
- checkin_attendance: Check in for attendance. Usually no parameters needed: {} or include location data.
- checkout_attendance: Check out for attendance. Usually no parameters needed: {} or include location data.
- get_missing_checkouts: Get missing checkouts for regularization. No parameters needed.

# Task Reports Tools:
- get_my_task_reports: Get my task reports. Can accept params as JSON string for filters.
- get_all_task_reports: Get all task reports (admin/hr only). Can accept params as JSON string for filters.
- submit_task_report: Submit a task report. Requires data as JSON string.

# Leave/Request Tools:
- get_my_leaves: Get my leave requests. Can accept params as JSON string for filters.
- get_all_leaves: Get all leave requests (admin/hr only). Can accept params as JSON string for filters.
- request_leave: Submit a leave request. Requires data as JSON string.
- update_leave_status: Update leave status (admin/hr only). Requires leave_id and data as JSON string.

# Regularization Tools:
- get_my_regularizations: Get my regularization requests. Can accept params as JSON string for filters.
- get_all_regularizations: Get all regularization requests (admin/hr only). Can accept params as JSON string for filters.
- request_regularization: Submit a regularization request. Requires data as JSON string.
- review_regularization: Review regularization request (admin/hr only). Requires reg_id and data as JSON string.

Example:
User Query: What is the total no of employees?
Output: {{ "step": "plan", "content": "The user wants to know the total number of employees" }}
Output: {{ "step": "plan", "content": "From the available tools I should call get_all_employee" }}
Output: {{ "step": "action", "function": "get_all_employee" }}
Output: {{ "step": "observe", "output": "the fetched employee directory have 18 employee names" }}
Output: {{ "step": "output", "content": "Total number of employees are 18." }}

Example 2:
User Query: Tell me the employee attendance for today and yesterday in a readable format
Output: {{ "step": "plan", "content": "The user wants to see attendance data for all employees for both today and yesterday in a readable format" }}
Output: {{ "step": "action", "function": "get_attendance_today_and_yesterday" }}
Output: {{ "step": "observe", "output": "Successfully retrieved combined attendance data for today and yesterday with employee check-in/check-out times in IST format" }}
Output: {{ "step": "output", "content": "Here's the employee attendance for today and yesterday:\\n\\n**Today (25 July 2025):**\\n- John Doe: Check-in 09:15 AM, Check-out 06:30 PM\\n- Jane Smith: Check-in 09:45 AM, Check-out 06:00 PM\\n\\n**Yesterday (24 July 2025):**\\n- John Doe: Check-in 09:30 AM, Check-out 06:15 PM\\n- Jane Smith: Absent" }}

Example 3:
User Query: Show me yesterday's attendance
Output: {{ "step": "plan", "content": "The user wants to see yesterday's attendance for all employees" }}
Output: {{ "step": "action", "function": "get_team_attendance_yesterday" }}
Output: {{ "step": "observe", "output": "Successfully retrieved yesterday's attendance data for all employees" }}
Output: {{ "step": "output", "content": "Here's yesterday's attendance (24 July 2025):\\n\\n- John Doe: Check-in 09:30 AM, Check-out 06:15 PM\\n- Jane Smith: Absent\\n- Mike Johnson: Check-in 10:00 AM, Check-out 07:00 PM" }}
'''

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    timestamp: datetime

# Store conversations in memory (in production, use a database)
conversations: Dict[str, List[Dict]] = {}

@app.get("/")
async def root():
    return {"message": "HRMS Buddy API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    chat_request: ChatMessage, 
    authorization: Optional[str] = Header(None)
):
    try:
        # Extract and set token for this request
        token = extract_token_from_header(authorization)
        if token:
            hrms.set_token(token)
        else:
            # Fallback to default credentials if no token provided
            fallback_token = get_bearer_token("veshant@cosmosfin.com", "admin")
            if isinstance(fallback_token, str):
                hrms.set_token(fallback_token)
            else:
                raise HTTPException(status_code=401, detail="Authentication required")
        
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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_query(messages: List[Dict]) -> str:
    """Process the query through the AI system and return final response"""
    
    while True:
        try:
            response = client.chat.completions.create(
                model="gpt-4.1-mini",
                response_format={"type": "json_object"},
                messages=messages,
                timeout=30  # Increased timeout for data formatting
            )
            
            messages.append({"role": "assistant", "content": response.choices[0].message.content})
            parsed_response = json.loads(response.choices[0].message.content)
            
            step = parsed_response.get("step")
            
            if step == "plan":
                # Continue planning
                continue
                
            elif step == "action":
                tool_name = parsed_response.get("function")
                
                if tool_name in available_tools:
                    try:
                        # Handle tool function parameters
                        tool_input = parsed_response.get("input")
                        if tool_input and tool_name not in ["get_all_employee", "get_my_profile", "get_today_attendance", "get_missing_checkouts"]:
                            if tool_name in ["update_leave_status", "review_regularization"]:
                                # These tools need two parameters
                                tool_params = safe_json_parse(tool_input, {})
                                if "id" in tool_params and "data" in tool_params:
                                    output = available_tools[tool_name](tool_params["id"], json.dumps(tool_params["data"]))
                                else:
                                    output = {"success": False, "error": "Missing required parameters", "user_message": "Required parameters are missing for this operation."}
                            else:
                                output = available_tools[tool_name](tool_input)
                        else:
                            output = available_tools[tool_name]()
                        
                        # Handle the structured response format
                        if isinstance(output, dict) and not output.get("success", True):
                            if "user_message" in output:
                                messages.append({"role": "user", "content": json.dumps({"step": "observe", "error": output["user_message"], "details": output})})
                            else:
                                messages.append({"role": "user", "content": json.dumps({"step": "observe", "error": output.get("error", "Unknown error occurred"), "details": output})})
                        else:
                            messages.append({"role": "user", "content": json.dumps({"step": "observe", "output": output})})
                        continue
                    except Exception as e:
                        error_msg = f"Tool execution failed: {str(e)}"
                        logger.error(f"Tool {tool_name} execution error: {e}")
                        messages.append({"role": "user", "content": json.dumps({"step": "observe", "error": error_msg})})
                        continue
                else:
                    error_msg = f"Tool '{tool_name}' not available"
                    messages.append({"role": "user", "content": json.dumps({"step": "observe", "error": error_msg})})
                    continue
                    
            elif step == "output":
                return parsed_response.get("content", "I couldn't process your request properly.")
                
            else:
                # Fallback for unexpected steps
                return parsed_response.get("content", "I encountered an issue processing your request.")
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return "I encountered an error processing your request. Please try again."
        except Exception as e:
            logger.error(f"Processing error: {e}")
            return "I'm having trouble processing your request right now. Please try again later."

@app.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get conversation history"""
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {
        "conversation_id": conversation_id,
        "messages": conversations[conversation_id]
    }

@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation"""
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    del conversations[conversation_id]
    return {"message": "Conversation deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)