import requests
import json
from datetime import datetime, date
from typing import Dict, List, Optional, Union
import logging
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI()

# Setup basic logging
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

def get_bearer_token(email : str, password : str) : 
    url = "https://hrms-backend.up.railway.app/api/auth/login"
    headers = {
        "Content-Type": "application/json"
    }
    payload = {
        "email": email,
        "password": password
    }
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()  # Raise an error for bad responses
        return response.json().get("token", "Token not found in response")
    except requests.exceptions.HTTPError as http_err:
        return {"error": f"HTTP error occurred: {http_err}", "status_code": response.status_code}
    except Exception as err:
        return {"error": f"An error occurred: {err}"}

token = get_bearer_token("veshant@cosmosfin.com","admin")

hrms.set_token(token)
get_all_employee = hrms._make_request("GET", "/employees")


sys_prompt='''You are HR Buddy a helpful hr assistant made for the sole purpose of helping hr manage our hrms portal using various tools provided below. 
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

    Output JSON Format:
    {{
        "step": "string",
        "content": "string",
        "function": "The name of function if the step is action",
        "input": "The input parameter for the function",
    }}
     Available Tools:
     - get_all_employee: This tool will return all the employee information in the hrms portal.
     The only available tool is get_all_employee, which returns a list of employees."

    Example:f
    User Query: What is the total no of employees?
    Output: {{ "step": "plan", "content": "The user is wants to know the total number of employees" }}
    Output: {{ "step": "plan", "content": "From the available tools I should call get_all_employee" }}
    Output: {{ "step": "action", "function": "get_all_employee" }}
    Output: {{ "step": "observe", "output": "96" }}
    Output: {{ "step": "output", "content": "Total number of employees are 96 ." }}
'''

available_tools = {
    "get_all_employee": get_all_employee
}
messages = [
  { "role": "system", "content": sys_prompt }
]

while True:
    query = input("> ")
    messages.append({ "role": "user", "content": query })

    while True:
        response = client.chat.completions.create(
            model="gpt-4.1",
            response_format={"type": "json_object"},
            messages=messages
        )

        messages.append({ "role": "assistant", "content": response.choices[0].message.content })
        parsed_response = json.loads(response.choices[0].message.content)

        if parsed_response.get("step") == "plan":
            print(f"🧠: {parsed_response.get("content")}")
            continue

        if parsed_response.get("step") == "action":
            tool_name = parsed_response.get("function")

            print(f"🛠️: Calling Tool:{tool_name}")

            if available_tools.get(tool_name) != False:
                output = available_tools[tool_name]
                messages.append({ "role": "user", "content": json.dumps({ "step": "observe", "output": output }) })
                continue
        
        if parsed_response.get("step") == "output":
            print(f"🤖: {parsed_response.get("content")}")
            break