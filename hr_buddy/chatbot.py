"""
Minimal HR Buddy Chatbot - OpenAI Connection Only
Basic chatbot with just OpenAI client initialization and chat functionality
"""

import os
import logging
from openai import OpenAI
from dotenv import load_dotenv

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
    """Minimal chatbot with OpenAI connection only"""
    
    def __init__(self):
        # Initialize OpenAI client
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        if not self.openai_api_key:
            logger.error("❌ ERROR: OPENAI_API_KEY not found in environment variables!")
            raise ValueError("OpenAI API key is required")
            
        self.client = OpenAI()
        logger.info("✅ OpenAI client initialized successfully")
    
    def chat(self, message: str, model: str = "gpt-4o-mini") -> str:
        """
        Send a message to OpenAI and get response
        
        Args:
            message (str): User message
            model (str): OpenAI model to use
            
        Returns:
            str: AI response
        """
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": message}],
                timeout=30
            )
            
            return response.choices[0].message.content
            
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