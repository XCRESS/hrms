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

# Import simplified HR functions
from hr_api_client import SimplifiedHRClient
from hr_functions import (
    get_attendance_overview,
    get_team_attendance_today,
    get_employee_attendance_analysis,
    get_attendance_records,
    get_task_reports_overview,
    get_employee_task_analysis,
    get_task_reports,
    search_employee_by_name,
    get_all_employees,
    get_user_profile,
    get_today_date,
    get_yesterday_date,
    get_date_range
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
    # Employee Management Functions
    "get_all_employees": {
        "function": lambda: get_all_employees(hr_client),
        "description": "Get list of all employees in the system",
        "inputs": "No parameters required",
        "returns": "List of all employees with their basic information"
    },
    
    "get_user_profile": {
        "function": lambda: get_user_profile(hr_client),
        "description": "Get current user's profile information",
        "inputs": "No parameters required",
        "returns": "Current user's profile details"
    },
    
    "search_employee_by_name": {
        "function": lambda employee_name: search_employee_by_name(hr_client, employee_name),
        "description": "Search for employee by name (supports partial matching)",
        "inputs": "employee_name (string): Name or partial name of employee",
        "returns": "Employee details including employeeId, name, department, position"
    },
    
    # Attendance Functions
    "get_attendance_overview": {
        "function": lambda period='today': get_attendance_overview(hr_client, period),
        "description": "Get attendance overview with statistics and insights",
        "inputs": "period (string, optional): 'today' (default), 'yesterday', 'week', 'month'",
        "returns": "Attendance statistics, rates, insights with formatted response"
    },
    
    "get_team_attendance_today": {
        "function": lambda: get_team_attendance_today(hr_client),
        "description": "Get today's team attendance overview",
        "inputs": "No parameters required",
        "returns": "Today's attendance statistics and insights"
    },
    
    "get_employee_attendance_analysis": {
        "function": lambda employee_id, period='month': get_employee_attendance_analysis(hr_client, employee_id, period),
        "description": "Get detailed attendance analysis for specific employee",
        "inputs": "employee_id (string): Employee ID (e.g., 'EMP001'), period (string, optional): 'week', 'month' (default), 'quarter'",
        "returns": "Employee attendance analysis with rates, punctuality, and detailed records"
    },
    
    "get_attendance_records": {
        "function": lambda start_date, end_date: get_attendance_records(hr_client, start_date, end_date),
        "description": "Get attendance records for a date range",
        "inputs": "start_date (string): Start date in YYYY-MM-DD format, end_date (string): End date in YYYY-MM-DD format",
        "returns": "Filtered attendance records with pagination"
    },
    
    # Task Reports Functions
    "get_task_reports_overview": {
        "function": lambda period='month': get_task_reports_overview(hr_client, period),
        "description": "Get task reports overview with productivity metrics",
        "inputs": "period (string, optional): 'today', 'week', 'month' (default)",
        "returns": "Task reporting statistics, productivity scores, top performers"
    },
    
    "get_employee_task_analysis": {
        "function": lambda employee_id, period='month': get_employee_task_analysis(hr_client, employee_id, period),
        "description": "Get detailed task performance analysis for specific employee",
        "inputs": "employee_id (string): Employee ID (e.g., 'EMP001'), period (string, optional): 'week', 'month' (default), 'quarter'",
        "returns": "Employee task performance analysis with productivity/quality scores and recommendations"
    },
    
    "get_task_reports": {
        "function": lambda start_date, end_date: get_task_reports(hr_client, start_date, end_date),
        "description": "Get task reports for a date range",
        "inputs": "start_date (string): Start date in YYYY-MM-DD format, end_date (string): End date in YYYY-MM-DD format",
        "returns": "Filtered task reports with productivity and quality scores"
    },
    
    # Combined Analysis Functions  
    "get_employee_performance_overview": {
        "function": lambda employee_name, period='month': get_employee_performance_overview(employee_name, period),
        "description": "Get comprehensive employee performance (attendance + task analysis)",
        "inputs": "employee_name (string): Employee name or partial name, period (string, optional): 'week', 'month' (default), 'quarter'",
        "returns": "Combined attendance and task performance analysis"
    },
    
    # Date Helper Functions
    "get_today_date": {
        "function": lambda: {"success": True, "data": get_today_date(), "formatted_response": f"Today's date: {get_today_date()}"},
        "description": "Get today's date in YYYY-MM-DD format",
        "inputs": "No parameters required",
        "returns": "Today's date string"
    },
    
    "get_yesterday_date": {
        "function": lambda: {"success": True, "data": get_yesterday_date(), "formatted_response": f"Yesterday's date: {get_yesterday_date()}"},
        "description": "Get yesterday's date in YYYY-MM-DD format", 
        "inputs": "No parameters required",
        "returns": "Yesterday's date string"
    }
}

def get_employee_performance_overview(employee_name: str, period: str = 'month') -> dict:
    """Get comprehensive employee performance overview (attendance + tasks)"""
    try:
        # First, find the employee
        employee_search = search_employee_by_name(hr_client, employee_name)
        if not employee_search.get("success"):
            return employee_search
        
        employee_id = employee_search["data"]["employeeId"]
        employee_full_name = employee_search["data"]["name"]
        
        # Get both attendance and task analysis
        attendance_result = get_employee_attendance_analysis(hr_client, employee_id, period)
        task_result = get_employee_task_analysis(hr_client, employee_id, period)
        
        # Combine the results
        combined_response = f"📊 **Performance Overview for {employee_full_name}**\n\n"
        
        # Add attendance information
        if attendance_result.get("success") and attendance_result.get("formatted_response"):
            combined_response += "## Attendance Performance\n"
            combined_response += attendance_result["formatted_response"] + "\n\n"
        
        # Add task performance information  
        if task_result.get("success") and task_result.get("formatted_response"):
            combined_response += "## Task Performance\n"
            combined_response += task_result["formatted_response"] + "\n\n"
        
        # Add overall assessment
        combined_response += "## Overall Assessment\n"
        if attendance_result.get("success") and task_result.get("success"):
            combined_response += "✅ Complete performance data available for comprehensive analysis."
        else:
            combined_response += "⚠️ Some performance data may be incomplete."
        
        return {
            "success": True,
            "formatted_response": combined_response,
            "data": {
                "employee": employee_search["data"],
                "attendance": attendance_result.get("data"),
                "tasks": task_result.get("data")
            }
        }
        
    except Exception as e:
        logger.error(f"get_employee_performance_overview error: {e}")
        return {"success": False, "error": str(e), "user_message": f"Unable to retrieve performance overview for {employee_name}."}

# Updated system prompt for simplified APIs
sys_prompt = '''You are HR Buddy, an advanced AI assistant for HR management with simplified, intelligent APIs.

CRITICAL: You MUST always respond in valid JSON format with one of these structures:
- Planning: {"step": "plan", "thinking": "your planning thoughts"}
- Taking action: {"step": "action", "function": "function_name", "input": "parameter_value_or_json"}
- Final response: {"step": "output", "content": "your final response to the user"}

AVAILABLE FUNCTIONS AND THEIR INPUTS:

📋 **Employee Management:**
• get_all_employees() → Get list of all employees
• get_user_profile() → Get current user's profile
• search_employee_by_name(employee_name) → Find employee by name

📊 **Attendance Functions:**
• get_attendance_overview(period='today') → Attendance overview with stats
  - period: 'today', 'yesterday', 'week', 'month'
• get_team_attendance_today() → Today's team attendance
• get_employee_attendance_analysis(employee_id, period='month') → Individual attendance analysis
  - employee_id: Employee ID (e.g., 'EMP001')
  - period: 'week', 'month', 'quarter'
• get_attendance_records(start_date, end_date) → Attendance records for date range
  - start_date, end_date: YYYY-MM-DD format

📈 **Task Reports Functions:**
• get_task_reports_overview(period='month') → Task reports overview with metrics
  - period: 'today', 'week', 'month'
• get_employee_task_analysis(employee_id, period='month') → Individual task analysis
  - employee_id: Employee ID (e.g., 'EMP001')
  - period: 'week', 'month', 'quarter'
• get_task_reports(start_date, end_date) → Task reports for date range
  - start_date, end_date: YYYY-MM-DD format

🔄 **Combined Analysis:**
• get_employee_performance_overview(employee_name, period='month') → Complete performance analysis
  - employee_name: Employee name or partial name
  - period: 'week', 'month', 'quarter'

📅 **Date Helpers:**
• get_today_date() → Today's date in YYYY-MM-DD
• get_yesterday_date() → Yesterday's date in YYYY-MM-DD

WORKFLOW EXAMPLES:

User: "Show me John's performance this month"
1. {"step": "action", "function": "get_employee_performance_overview", "input": "John"}

User: "What's today's attendance?"
1. {"step": "action", "function": "get_attendance_overview", "input": "today"}

User: "Get task reports for last week"
1. {"step": "plan", "thinking": "Need to calculate date range for last week and get task reports"}
2. {"step": "action", "function": "get_task_reports", "input": {"start_date": "2024-01-15", "end_date": "2024-01-21"}}

IMPORTANT RULES:
- For employee-specific queries, search by name first if you only have the name
- All date inputs must be in YYYY-MM-DD format
- Period parameters: 'today', 'yesterday', 'week', 'month', 'quarter'
- Always provide formatted, user-friendly responses
- Handle errors gracefully with specific error messages
- For multiple parameters, use JSON object format: {"param1": "value1", "param2": "value2"}

ERROR HANDLING:
- Check for "user_message" in error responses and use it directly
- Provide specific guidance for authentication/permission errors
- Suggest using full names for employee searches
- Handle date formatting automatically'''

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