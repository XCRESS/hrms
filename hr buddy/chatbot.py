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
client = OpenAI()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('hrms_buddy.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="HRMS Buddy API - Unified", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://hr.intakesense.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize unified HR client
hr_client = UnifiedHRClient()

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

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    chat_request: ChatMessage, 
    authorization: Optional[str] = Header(None)
):
    try:
        # Extract and set token for this request
        token = extract_token_from_header(authorization)
        if token:
            hr_client.set_token(token)
        else:
            # Fallback to default credentials if no token provided
            fallback_token = get_bearer_token("veshant@cosmosfin.com", "admin")
            if isinstance(fallback_token, str):
                hr_client.set_token(fallback_token)
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
                timeout=30
            )
            
            messages.append({"role": "assistant", "content": response.choices[0].message.content})
            parsed_response = json.loads(response.choices[0].message.content)
            
            step = parsed_response.get("step")
            
            if step == "plan":
                continue
                
            elif step == "action":
                tool_name = parsed_response.get("function")
                
                if tool_name in available_tools:
                    try:
                        # Handle tool function parameters
                        tool_input = parsed_response.get("input")
                        
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
                            except json.JSONDecodeError:
                                # Treat as string parameter
                                output = available_tools[tool_name](tool_input)
                        else:
                            # No parameters
                            output = available_tools[tool_name]()
                        
                        # Handle the response
                        if isinstance(output, dict) and not output.get("success", True):
                            if "user_message" in output:
                                messages.append({"role": "user", "content": json.dumps({"step": "observe", "error": output["user_message"], "details": output})})
                            else:
                                messages.append({"role": "user", "content": json.dumps({"step": "observe", "error": output.get("error", "Unknown error occurred"), "details": output})})
                        else:
                            # Use formatted response if available, otherwise raw data
                            response_content = output.get("formatted_response") if isinstance(output, dict) and "formatted_response" in output else output
                            messages.append({"role": "user", "content": json.dumps({"step": "observe", "output": response_content})})
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