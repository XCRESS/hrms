from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
from datetime import datetime, date
from typing import Dict, List, Optional, Union
import logging
from openai import OpenAI
from dotenv import load_dotenv
import asyncio
import os

load_dotenv()
client = OpenAI()

# Setup basic logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

app = FastAPI(title="HRMS Buddy API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Add your frontend URLs
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

def get_bearer_token(email: str, password: str):
    url = "https://hrms-backend.up.railway.app/api/auth/login"
    headers = {"Content-Type": "application/json"}
    payload = {"email": email, "password": password}
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json().get("token", "Token not found in response")
    except requests.exceptions.HTTPError as http_err:
        return {"error": f"HTTP error occurred: {http_err}", "status_code": response.status_code}
    except Exception as err:
        return {"error": f"An error occurred: {err}"}

# Initialize with default credentials (you might want to make this configurable)
token = get_bearer_token("veshant@cosmosfin.com", "admin")
hrms.set_token(token)

# Available tools
def get_all_employee():
    return hrms._make_request("GET", "/employees")

def get_my_profile():
    return hrms._make_request("GET", "/employees/profile")

available_tools = {
    "get_all_employee": get_all_employee,
    "get_my_profile": get_my_profile
}

sys_prompt = '''You are HR Buddy a helpful hr assistant made for the sole purpose of helping hr manage our hrms portal using various tools provided below. 
you take the query as input then see if it's a general question that's not asking for any data or imformation or a query that is asking for data insights like for example queries about attendance, requests, task reports, salary slips or employee information, 
then you will look among the various tools available so best solve the query.
You work on start, plan, action, observe mode.

For the given user query and available tools, plan the step by step execution, based on the planning,
select the relevant tool from the available tool. and based on the tool selection you perform an action to call the tool.

Wait for the observation and based on the observation from the tool call resolve the user query.

Rules:
- Follow the Output JSON Format.
- Always perform one step at a time and wait for next input
- Carefully analyse the user query
- only call tools that are in the available tools list

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

Example:
User Query: What is the total no of employees?
Output: {{ "step": "plan", "content": "The user is wants to know the total number of employees" }}
Output: {{ "step": "plan", "content": "From the available tools I should call get_all_employee" }}
Output: {{ "step": "action", "function": "get_all_employee" }}
Output: {{ "step": "observe", "output": "the fetched emoloyee directory have 18 employee names" }}
Output: {{ "step": "output", "content": "Total number of employees are 18 ." }}
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
async def chat_endpoint(chat_request: ChatMessage):
    try:
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
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_query(messages: List[Dict]) -> str:
    """Process the query through the AI system and return final response"""
    
    while True:
        try:
            response = client.chat.completions.create(
                model="gpt-4.1",
                response_format={"type": "json_object"},
                messages=messages
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
                        output = available_tools[tool_name]()
                        messages.append({"role": "user", "content": json.dumps({"step": "observe", "output": output})})
                        continue
                    except Exception as e:
                        error_msg = f"Tool execution failed: {str(e)}"
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