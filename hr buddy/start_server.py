#!/usr/bin/env python3
"""
HRMS Buddy FastAPI Server Launcher
Run this script to start the HRMS Buddy chatbot server.
"""

import subprocess
import sys
import os

def check_requirements():
    """Check if required packages are installed"""
    try:
        import fastapi
        import uvicorn
        import requests
        import openai
        from dotenv import load_dotenv
        print("✅ All required packages are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing required package: {e.name}")
        print("Please install requirements: pip install -r requirements.txt")
        return False

def check_env_file():
    """Check if .env file exists and has OpenAI API key"""
    if not os.path.exists('.env'):
        print("❌ .env file not found")
        print("Please create a .env file with your OpenAI API key:")
        print("OPENAI_API_KEY=your_api_key_here")
        return False
    
    from dotenv import load_dotenv
    load_dotenv()
    
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ OPENAI_API_KEY not found in .env file")
        print("Please add your OpenAI API key to the .env file:")
        print("OPENAI_API_KEY=your_api_key_here")
        return False
    
    print("✅ Environment configuration found")
    return True

def start_server():
    """Start the FastAPI server"""
    if not check_requirements():
        return False
    
    if not check_env_file():
        return False
    
    print("\n🚀 Starting HRMS Buddy Server...")
    print("Server will be available at: http://localhost:8000")
    print("API documentation at: http://localhost:8000/docs")
    print("Press Ctrl+C to stop the server\n")
    
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "fastapi_server:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\n👋 HRMS Buddy Server stopped")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return False
    
    return True

if __name__ == "__main__":
    start_server()