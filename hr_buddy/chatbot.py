"""
Minimal HR Buddy Chatbot - OpenAI Connection Only
Basic chatbot with just OpenAI client initialization and chat functionality
"""

import os
import logging
from openai import OpenAI
from dotenv import load_dotenv
from function import get_employee_attendance, get_employee_details
import json
from datetime import date

Today_date = date.today().strftime("%d-%m-%Y")
employee_data = get_employee_details()

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('hrms_buddy.log', mode='a', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MinimalHRChatbot:
    """Minimal chatbot with OpenAI connection and function calling capabilities"""

    def __init__(self):
        # Initialize OpenAI client
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        if not self.openai_api_key:
            logger.error("❌ ERROR: OPENAI_API_KEY not found in environment variables!")
            raise ValueError("OpenAI API key is required")

        self.client = OpenAI()
        logger.info("✅ OpenAI client initialized successfully")

        self.available_functions = {
            "get_employee_attendance": get_employee_attendance,
        }

        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_employee_attendance",
                    "description": "Fetches attendance records for employees. Can filter by employee ID, date range, and attendance status.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "employeeId": {
                                "type": "string",
                                "description": "The ID of the employee (e.g., 'CFG/CIAML/15FBD')."
                            },
                            "startDate": {
                                "type": "string",
                                "description": "The start date in YYYY-MM-DD format (e.g., '2025-07-01')."
                            },
                            "endDate": {
                                "type": "string",
                                "description": "The end date in YYYY-MM-DD format (e.g., '2025-08-11')."
                            },
                            "status": {
                                "type": "string",
                                "enum": ["present", "absent", "late", "half-day"],
                                "description": "The attendance status (e.g., 'present', 'absent', 'late', 'half-day')."
                            },
                            "page": {
                                "type": "integer",
                                "description": "The page number for pagination."
                            },
                            "limit": {
                                "type": "integer",
                                "description": "The number of records per page."
                            }
                        },
                        "required": [],
                    },
                },
            }
        ]

    def chat(self, message: str, model: str = "gpt-4o-mini") -> str:
        """
        Send a message to OpenAI and get response, handling function calls.

        Args:
            message (str): User message
            model (str): OpenAI model to use

        Returns:
            str: AI response
        """
        messages = [
            {"role": "system", "content": f"You are a helpful HR assistant. Today's date is {Today_date}. Employee data: {employee_data}. Use the available tools to answer questions about employee attendance."}, 
            {"role": "user", "content": message}
        ]

        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                tools=self.tools,
                tool_choice="auto",
                timeout=60 # Increased timeout for potential function calls
            )
            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls

            # Step 2: Check if the model wanted to call a tool
            if tool_calls:
                messages.append(response_message)  # extend conversation with assistant's reply
                # Step 3: Call the tool
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    function_to_call = self.available_functions[function_name]
                    function_args = json.loads(tool_call.function.arguments)
                    function_response = function_to_call(**function_args)
                    messages.append(
                        {
                            "tool_call_id": tool_call.id,
                            "role": "tool",
                            "name": function_name,
                            "content": json.dumps(function_response), # Send function response back to model
                        }
                    )
                # Step 4: Get a new response from the model that incorporates the tool's output
                second_response = self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    timeout=60
                )
                return second_response.choices[0].message.content
            else:
                return response_message.content

        except Exception as e:
            logger.error(f"Error in chat: {e}")
            return f"Error: {str(e)}"

def main():
    """Simple command line interface for testing"""
    try:
        chatbot = MinimalHRChatbot()
        
        print("\n" + "="*50)
        print("🤖 Minimal HR Buddy Chatbot")
        print("Type 'quit' to exit")
        print("="*50)
        
        while True:
            user_input = input("\nYou: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'bye']:
                print("👋 Goodbye!")
                break
                
            if not user_input:
                continue
                
            print("🤖 AI:", chatbot.chat(user_input))
            
    except Exception as e:
        logger.error(f"Error in main: {e}")
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()