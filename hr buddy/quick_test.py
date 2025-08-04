"""
Quick test to isolate the HR Buddy issue
"""
import requests
import json
import time

def test_hr_buddy():
    print("🧪 Quick HR Buddy Test")
    print("=" * 40)
    
    base_url = "http://localhost:8000"
    
    # Wait a moment for server to be ready
    print("⏳ Waiting for server to be ready...")
    time.sleep(2)
    
    # Test 1: Basic health check
    print("\n1. Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Health check exception: {e}")
        print("❌ Server might not be running!")
        return
    
    # Test 2: Simple test endpoint
    print("\n2. Testing simple endpoint...")
    try:
        response = requests.post(f"{base_url}/test/simple", timeout=5)
        if response.status_code == 200:
            result = response.json()
            print("✅ Simple test passed")
            print(f"   Response: {result.get('response', 'No response')}")
        else:
            print(f"❌ Simple test failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Simple test exception: {e}")
    
    # Test 3: OpenAI test
    print("\n3. Testing OpenAI API...")
    try:
        response = requests.post(f"{base_url}/test/openai", timeout=15)
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print("✅ OpenAI test passed")
                print(f"   OpenAI response: {result.get('openai_response', {})}")
            else:
                print(f"❌ OpenAI test failed: {result.get('error', 'Unknown error')}")
                print(f"   Raw content: {result.get('raw_content', 'None')}")
        else:
            print(f"❌ OpenAI test HTTP error: {response.status_code}")
    except Exception as e:
        print(f"❌ OpenAI test exception: {e}")
    
    # Test 4: Simple chat
    print("\n4. Testing simple chat (hi)...")
    try:
        payload = {
            "message": "hi",
            "conversation_id": "test_hi"
        }
        response = requests.post(f"{base_url}/chat", json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            chat_response = result.get("response", "No response")
            print(f"✅ Chat response received (length: {len(chat_response)})")
            print(f"   Response: {chat_response[:200]}...")
            
            # Check if it's the generic error
            if "I'm having trouble processing your request right now" in chat_response:
                print("❌ STILL GETTING GENERIC ERROR!")
            else:
                print("✅ Got specific response, not generic error!")
        else:
            print(f"❌ Chat failed: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"❌ Chat exception: {e}")

if __name__ == "__main__":
    test_hr_buddy()