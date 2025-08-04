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

# Import new unified HR functions
from hr_api_client import UnifiedHRClient
from hr_functions import (
    get_attendance_overview,
    get_team_attendance_today,
    get_employee_attendance_analysis,
    get_attendance_analytics,
    get_task_reports_overview,
    get_employee_task_analysis,
    get_productivity_insights,
    get_team_productivity_metrics,
    search_employee_by_name,
    get_all_employees,
    get_user_profile,
    get_today_date,
    get_yesterday_date,
    get_date_range
)

load_dotenv()

# Check for OpenAI API key
import os
openai_api_key = os.getenv('OPENAI_API_KEY')
if not openai_api_key:
    print("❌ ERROR: OPENAI_API_KEY not found in environment variables!")
    print("Please set your OpenAI API key in .env file or environment variables")
    exit(1)
else:
    print(f"✅ OpenAI API key loaded: {openai_api_key[:10]}...")

try:
    client = OpenAI()
    print("✅ OpenAI client initialized successfully")
except Exception as e:
    print(f"❌ ERROR: Failed to initialize OpenAI client: {e}")
    exit(1)

# Setup enhanced logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
    handlers=[
        logging.FileHandler('hrms_buddy.log', mode='a', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Set more verbose logging for debugging
logging.getLogger('hr_functions').setLevel(logging.INFO)
logging.getLogger('hr_api_client').setLevel(logging.INFO)

print("✅ Logging system initialized")
logger.info("HR Buddy server starting up...")
logger.info(f"OpenAI client status: {'✅ Ready' if client else '❌ Not initialized'}")

app = FastAPI(title="HRMS Buddy API - Unified", version="2.0.0")
print("✅ FastAPI app created")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://hr.intakesense.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print("✅ CORS middleware added")

# Initialize unified HR client
try:
    hr_client = UnifiedHRClient()
    print("✅ HR client initialized")
    logger.info("HR client initialized successfully")
except Exception as e:
    print(f"❌ ERROR: Failed to initialize HR client: {e}")
    logger.error(f"HR client initialization failed: {e}")
    exit(1)

def get_bearer_token(email: str, password: str):
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

# Enhanced tool functions using unified APIs
available_tools = {
    # Employee Management
    "get_all_employees": lambda: get_all_employees(hr_client),
    "get_user_profile": lambda: get_user_profile(hr_client),
    "search_employee_by_name": lambda employee_name: search_employee_by_name(hr_client, employee_name),
    
    # Unified Attendance Functions
    "get_attendance_overview": lambda period='today': get_attendance_overview(hr_client, period),
    "get_team_attendance_today": lambda: get_team_attendance_today(hr_client),
    "get_employee_attendance_analysis": lambda employee_id, period='month': get_employee_attendance_analysis(hr_client, employee_id, period),
    "get_attendance_analytics": lambda period='month', group_by='department': get_attendance_analytics(hr_client, period, group_by),
    
    # Unified Task Reports Functions  
    "get_task_reports_overview": lambda period='month': get_task_reports_overview(hr_client, period),
    "get_employee_task_analysis": lambda employee_id, period='month': get_employee_task_analysis(hr_client, employee_id, period),
    "get_productivity_insights": lambda period='month': get_productivity_insights(hr_client, period),
    "get_team_productivity_metrics": lambda period='month': get_team_productivity_metrics(hr_client, period),
    
    # Combined Analysis Functions
    "get_employee_performance_overview": lambda employee_name, period='month': get_employee_performance_overview(employee_name, period),
    "get_team_performance_dashboard": lambda period='today': get_team_performance_dashboard(period),
    "get_productivity_analytics": lambda period='month': get_productivity_analytics(period),
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

def get_team_performance_dashboard(period: str = 'today') -> dict:
    """Get comprehensive team performance dashboard"""
    try:
        # Get both attendance and task overviews
        attendance_overview = get_attendance_overview(hr_client, period)
        task_overview = get_task_reports_overview(hr_client, period)
        
        # Combine the results
        combined_response = f"🎯 **Team Performance Dashboard - {period.title()}**\n\n"
        
        # Add attendance overview
        if attendance_overview.get("success") and attendance_overview.get("formatted_response"):
            combined_response += attendance_overview["formatted_response"] + "\n\n"
        
        # Add task reports overview
        if task_overview.get("success") and task_overview.get("formatted_response"):
            combined_response += task_overview["formatted_response"] + "\n\n"
        
        return {
            "success": True,
            "formatted_response": combined_response,
            "data": {
                "attendance": attendance_overview.get("data"),
                "tasks": task_overview.get("data")
            }
        }
        
    except Exception as e:
        logger.error(f"get_team_performance_dashboard error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve team performance dashboard."}

def get_productivity_analytics(period: str = 'month') -> dict:
    """Get comprehensive productivity analytics"""
    try:
        # Get advanced insights and analytics
        insights = get_productivity_insights(hr_client, period)
        metrics = get_team_productivity_metrics(hr_client, period)
        analytics = get_attendance_analytics(hr_client, period)
        
        combined_response = f"📈 **Productivity Analytics - {period.title()}**\n\n"
        
        # Add productivity insights
        if insights.get("success") and insights.get("formatted_response"):
            combined_response += insights["formatted_response"] + "\n\n"
        
        # Add productivity metrics
        if metrics.get("success") and metrics.get("formatted_response"):
            combined_response += metrics["formatted_response"] + "\n\n"
        
        # Add attendance analytics
        if analytics.get("success") and analytics.get("formatted_response"):
            combined_response += "## Attendance Analytics\n"
            combined_response += analytics["formatted_response"] + "\n\n"
        
        return {
            "success": True,
            "formatted_response": combined_response,
            "data": {
                "insights": insights.get("data"),
                "metrics": metrics.get("data"), 
                "analytics": analytics.get("data")
            }
        }
        
    except Exception as e:
        logger.error(f"get_productivity_analytics error: {e}")
        return {"success": False, "error": str(e), "user_message": "Unable to retrieve productivity analytics."}

# Updated system prompt for unified APIs
sys_prompt = '''You are HR Buddy, an advanced AI assistant designed specifically for HR management using unified, intelligent APIs. 
You help users manage attendance, task reports, productivity analytics, and employee performance with powerful, industry-standard tools.

CRITICAL: You MUST always respond in valid JSON format with one of these structures:

For planning: {"step": "plan", "thinking": "your planning thoughts"}
For taking action: {"step": "action", "function": "function_name", "input": "parameter_value_or_json"}
For final response: {"step": "output", "content": "your final response to the user"}

You operate in a plan → action → observe → output workflow, providing comprehensive insights and analysis.

IMPORTANT CAPABILITIES:
- Unified attendance management with real-time analytics
- AI-powered task performance insights and productivity scoring
- Comprehensive employee performance analysis (attendance + tasks)
- Advanced team performance dashboards and trending
- Intelligent employee search and data correlation

ERROR HANDLING RULES:
- Always check for "user_message" in error responses and use it directly
- Provide specific, actionable guidance for authentication/permission errors
- For employee name queries, suggest using full names or employee IDs
- Handle date formatting automatically (support "today", "yesterday", "this month", etc.)
- Offer alternative approaches when primary methods fail
- When tools fail, explain the specific issue and suggest solutions
- For "Sonali" or similar queries, try different name variations if initial search fails
- Log all errors with context for debugging purposes
- Never give generic "try again later" responses without specific error details

UNIFIED FEATURES:
- All attendance data includes analytics, trends, and insights
- Task reports include productivity scoring and AI recommendations
- Employee analysis combines attendance and task performance
- Team dashboards provide comprehensive overview across all metrics
- Search functions are intelligent and handle partial names

OUTPUT RULES:
- Always format responses clearly with emojis and sections
- Provide actionable insights, not just raw data
- Include performance trends and recommendations when available
- Handle multiple data sources intelligently
- Give context-aware suggestions for follow-up queries

Available Tools:

# Employee Management:
- get_all_employees: Get complete employee directory with details
- get_user_profile: Get current user's profile information  
- search_employee_by_name: Find employee by name (intelligent matching). Use: employee_name

# Unified Attendance Tools (with analytics & insights):
- get_attendance_overview: Get attendance overview with analytics. Use: period ('today', 'week', 'month')
- get_team_attendance_today: Get today's team attendance with insights
- get_employee_attendance_analysis: Get employee attendance analysis. Use: employee_id, period ('week', 'month', 'quarter') 
- get_attendance_analytics: Get attendance trends and analytics. Use: period, group_by ('department', 'position')

# Unified Task Reports Tools (with AI insights):
- get_task_reports_overview: Get task reports overview with productivity metrics. Use: period
- get_employee_task_analysis: Get employee task performance analysis. Use: employee_id, period
- get_productivity_insights: Get AI-powered productivity insights. Use: period
- get_team_productivity_metrics: Get team productivity metrics and benchmarking. Use: period

# Advanced Combined Analysis:
- get_employee_performance_overview: Get comprehensive employee performance (attendance + tasks). Use: employee_name, period
- get_team_performance_dashboard: Get complete team dashboard. Use: period
- get_productivity_analytics: Get advanced productivity analytics. Use: period

INTELLIGENT QUERY HANDLING:
- For employee-specific queries, use employee name first (will auto-convert to ID)
- Period parameters: 'today', 'yesterday', 'week', 'month', 'quarter', 'last_month'
- All responses include formatted, user-friendly output with insights
- Combine multiple data sources for comprehensive analysis

Example Interactions:
User: "Show me John's performance this month"
→ Use: get_employee_performance_overview with employee_name="John", period="month"

User: "Give me today's team dashboard"  
→ Use: get_team_performance_dashboard with period="today"

User: "What are the productivity insights for this quarter?"
→ Use: get_productivity_analytics with period="quarter"

Always provide rich, formatted responses with actionable insights and follow-up suggestions.'''

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
        "message": "HR Buddy API v2.0 - Unified HR Management", 
        "features": [
            "Unified Attendance Analytics",
            "AI-Powered Task Insights", 
            "Employee Performance Analysis",
            "Team Dashboards",
            "Productivity Benchmarking"
        ]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "version": "2.0.0",
        "apis": ["unified_attendance", "unified_task_reports"],
        "timestamp": datetime.now()
    }

@app.post("/debug/direct-search")
async def debug_direct_search(
    request: dict,
    authorization: Optional[str] = Header(None)
):
    """Direct test endpoint to debug employee search issues"""
    try:
        employee_name = request.get("employee_name", "sonali")
        
        # Set up HR client
        token = extract_token_from_header(authorization)
        if token:
            hr_client.set_token(token)
        else:
            fallback_token = get_bearer_token("veshant@cosmosfin.com", "admin")
            if isinstance(fallback_token, str):
                hr_client.set_token(fallback_token)
            else:
                return {"error": "Authentication failed"}
        
        logger.info(f"DEBUG: Direct search for employee: {employee_name}")
        
        # Test employee search directly
        search_result = search_employee_by_name(hr_client, employee_name)
        logger.info(f"DEBUG: Search result: {search_result}")
        
        if search_result.get("success"):
            # If employee found, try to get task analysis
            employee_id = search_result["data"]["employeeId"]
            task_result = get_employee_task_analysis(hr_client, employee_id, "month")
            logger.info(f"DEBUG: Task analysis result: {task_result}")
            
            return {
                "search_result": search_result,
                "task_result": task_result
            }
        else:
            return {
                "search_result": search_result,
                "message": "Employee search failed, no task analysis attempted"
            }
            
    except Exception as e:
        logger.error(f"DEBUG endpoint error: {e}", exc_info=True)
        return {"error": str(e), "type": type(e).__name__}

@app.get("/debug/employees")
async def debug_get_employees(authorization: Optional[str] = Header(None)):
    """Debug endpoint to check employee list"""
    try:
        # Set up HR client
        token = extract_token_from_header(authorization)
        if token:
            hr_client.set_token(token)
        else:
            fallback_token = get_bearer_token("veshant@cosmosfin.com", "admin")
            if isinstance(fallback_token, str):
                hr_client.set_token(fallback_token)
            else:
                return {"error": "Authentication failed"}
        
        logger.info("DEBUG: Getting all employees")
        result = get_all_employees(hr_client)
        logger.info(f"DEBUG: Employee list result success: {result.get('success')}")
        
        if result.get("success"):
            employees = result.get("data", {}).get("data", [])
            employee_names = [f"{emp.get('firstName', '')} {emp.get('lastName', '')}".strip() for emp in employees[:20]]
            return {
                "success": True,
                "total_employees": len(employees),
                "sample_names": employee_names,
                "raw_sample": employees[:3] if employees else []
            }
        else:
            return result
            
    except Exception as e:
        logger.error(f"DEBUG employees endpoint error: {e}", exc_info=True)
        return {"error": str(e), "type": type(e).__name__}

@app.post("/test/simple")
async def test_simple_response():
    """Simple test endpoint that bypasses AI completely"""
    return {
        "response": "Hello! This is a direct response without AI processing. The system is working at the basic HTTP level.",
        "conversation_id": "test_simple",
        "timestamp": datetime.now()
    }

@app.post("/test/openai")
async def test_openai_direct():
    """Test OpenAI API directly with a simple request"""
    try:
        logger.info("Testing OpenAI API directly...")
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Always respond in JSON format."},
                {"role": "user", "content": "Say hello in JSON format"}
            ],
            timeout=30
        )
        
        raw_content = response.choices[0].message.content
        logger.info(f"OpenAI raw response: {raw_content}")
        
        try:
            parsed = json.loads(raw_content)
            return {
                "success": True,
                "openai_response": parsed,
                "raw_content": raw_content
            }
        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"JSON decode error: {e}",
                "raw_content": raw_content
            }
            
    except Exception as e:
        logger.error(f"OpenAI test error: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "type": type(e).__name__
        }

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    chat_request: ChatMessage, 
    authorization: Optional[str] = Header(None)
):
    print(f"🔥 CHAT REQUEST RECEIVED: {chat_request.message}")
    logger.info(f"🔥 CHAT REQUEST RECEIVED: {chat_request.message}")
    
    try:
        logger.info(f"Received chat request: {chat_request.message[:100]}...")
        
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
        logger.info(f"Processing conversation: {conversation_id}")
        
        # Initialize conversation if new
        if conversation_id not in conversations:
            conversations[conversation_id] = [{"role": "system", "content": sys_prompt}]
            logger.info(f"Initialized new conversation: {conversation_id}")
        
        messages = conversations[conversation_id]
        messages.append({"role": "user", "content": chat_request.message})
        
        # Process the query through the AI system
        logger.info("Starting query processing...")
        final_response = await process_query(messages)
        logger.info(f"Query processed successfully, response length: {len(final_response)}")
        
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
            detail=f"Internal server error: {str(e)}. Please check the logs for more details."
        )

async def process_query(messages: List[Dict]) -> str:
    """Process the query through the AI system and return final response"""
    
    iteration_count = 0
    max_iterations = 10
    
    while iteration_count < max_iterations:
        iteration_count += 1
        logger.info(f"Processing iteration {iteration_count}/{max_iterations}")
        
        try:
            logger.info(f"Sending request to OpenAI with {len(messages)} messages")
            response = client.chat.completions.create(
                model="gpt-4o-mini",  # Fixed model name
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
                logger.error(f"Raw response content: {raw_content}")
                return f"I received an invalid response format from the AI system. Raw response: {raw_content[:500]}..."
            
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
                        
                        # Parse parameters for different tool types
                        if tool_input:
                            try:
                                # Try to parse as JSON first
                                if isinstance(tool_input, str) and tool_input.startswith('{'):
                                    params = json.loads(tool_input)
                                    if len(params) == 1:
                                        # Single parameter
                                        output = available_tools[tool_name](list(params.values())[0])
                                    elif len(params) == 2:
                                        # Two parameters  
                                        param_values = list(params.values())
                                        output = available_tools[tool_name](param_values[0], param_values[1])
                                    else:
                                        # Multiple parameters - pass as dict
                                        output = available_tools[tool_name](**params)
                                else:
                                    # Single string parameter
                                    output = available_tools[tool_name](tool_input)
                            except json.JSONDecodeError as json_err:
                                logger.warning(f"JSON decode error for tool input, treating as string: {json_err}")
                                # Treat as string parameter
                                output = available_tools[tool_name](tool_input)
                        else:
                            # No parameters
                            output = available_tools[tool_name]()
                        
                        logger.info(f"Tool {tool_name} output success: {output.get('success', True) if isinstance(output, dict) else True}")
                        
                        # Handle the response
                        if isinstance(output, dict) and not output.get("success", True):
                            error_message = output.get("user_message", output.get("error", "Unknown error occurred"))
                            logger.error(f"Tool {tool_name} failed: {error_message}")
                            messages.append({
                                "role": "user", 
                                "content": json.dumps({
                                    "step": "observe", 
                                    "error": error_message,
                                    "tool_name": tool_name,
                                    "details": output
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
                                "tool_name": tool_name,
                                "exception_type": type(e).__name__
                            })
                        })
                        continue
                else:
                    error_msg = f"Tool '{tool_name}' not available. Available tools: {', '.join(available_tools.keys())}"
                    logger.error(f"Unknown tool requested: {tool_name}")
                    messages.append({"role": "user", "content": json.dumps({"step": "observe", "error": error_msg, "available_tools": list(available_tools.keys())})})
                    continue
                    
            elif step == "output":
                final_content = parsed_response.get("content", "I couldn't process your request properly.")
                logger.info(f"AI provided final output, length: {len(final_content)}")
                return final_content
                
            else:
                logger.warning(f"Unknown step received: {step}")
                fallback_content = parsed_response.get("content", f"I encountered an unknown processing step: {step}")
                return fallback_content
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error in process_query iteration {iteration_count}: {e}")
            logger.error(f"Failed response content: {response.choices[0].message.content if 'response' in locals() else 'No response'}")
            return f"I encountered a JSON parsing error while processing your request. Error details: {str(e)}. Please try rephrasing your question."
        except Exception as e:
            logger.error(f"Processing error in process_query iteration {iteration_count}: {e}")
            logger.error(f"Full error context: {str(e)}", exc_info=True)
            return f"I encountered an unexpected error while processing your request: {str(e)}. Please check the logs for more details or try a different approach."
    
    # Max iterations reached
    logger.error(f"Max iterations ({max_iterations}) reached without resolution")
    return f"I reached the maximum processing iterations ({max_iterations}) without completing your request. This might indicate a complex query or system issue. Please try a simpler request or check the logs."

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
    print("\n" + "="*60)
    print("🚀 Starting HR Buddy Server...")
    print("="*60)
    logger.info("Starting HR Buddy server on port 8000")
    
    import uvicorn
    print("✅ All systems ready - starting uvicorn server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)