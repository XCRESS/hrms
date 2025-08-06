"""
Test script to verify error handling improvements for HR Buddy
"""
import requests
import json
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_hr_buddy_error_handling():
    """Test various error scenarios to ensure proper error handling"""
    
    base_url = "http://localhost:8000"
    chat_endpoint = f"{base_url}/chat"
    debug_employees_endpoint = f"{base_url}/debug/employees"
    debug_search_endpoint = f"{base_url}/debug/direct-search"
    simple_test_endpoint = f"{base_url}/test/simple"
    openai_test_endpoint = f"{base_url}/test/openai"
    
    print("🧪 Testing HR Buddy Error Handling Improvements")
    print("=" * 60)
    
    # First, test basic system functionality
    print("\n🔧 PHASE 0: Basic System Testing")
    print("-" * 40)
    
    # Test 0.1: Simple HTTP endpoint
    print("0.1 Testing basic HTTP functionality...")
    try:
        response = requests.post(simple_test_endpoint, timeout=5)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Basic HTTP: {result.get('response', 'No response')[:50]}...")
        else:
            print(f"❌ Basic HTTP failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Basic HTTP exception: {e}")
    
    # Test 0.2: OpenAI API connectivity
    print("\n0.2 Testing OpenAI API connectivity...")
    try:
        response = requests.post(openai_test_endpoint, timeout=15)
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print(f"✅ OpenAI API working: {result.get('openai_response', {})}")
            else:
                print(f"❌ OpenAI API failed: {result.get('error', 'Unknown error')}")
        else:
            print(f"❌ OpenAI test endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ OpenAI test exception: {e}")
    
    # Now test direct endpoints to isolate issues
    print("\n🔍 PHASE 1: Direct API Testing")
    print("-" * 40)
    
    # Test 1: Get employees list
    print("1. Testing employee list retrieval...")
    try:
        response = requests.get(debug_employees_endpoint, timeout=10)
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print(f"✅ Found {result.get('total_employees', 0)} employees")
                print(f"Sample names: {', '.join(result.get('sample_names', [])[:5])}")
            else:
                print(f"❌ Employee list failed: {result}")
        else:
            print(f"❌ HTTP Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    # Test 2: Direct search for Sonali
    print("\n2. Testing direct search for 'sonali'...")
    try:
        payload = {"employee_name": "sonali"}
        response = requests.post(debug_search_endpoint, json=payload, timeout=10)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Direct search result: {result}")
        else:
            print(f"❌ HTTP Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    # Test 3: Test various name variations
    print("\n3. Testing name variations...")
    name_variations = ["sonali", "Sonali", "SONALI", "sonal", "john", "veshant"]
    for name in name_variations:
        try:
            payload = {"employee_name": name}
            response = requests.post(debug_search_endpoint, json=payload, timeout=10)
            if response.status_code == 200:
                result = response.json()
                success = result.get("search_result", {}).get("success", False)
                print(f"  {name}: {'✅' if success else '❌'} {result.get('search_result', {}).get('user_message', 'No message')[:100]}")
            else:
                print(f"  {name}: ❌ HTTP {response.status_code}")
        except Exception as e:
            print(f"  {name}: ❌ {e}")
    
    print("\n🤖 PHASE 2: AI Chat Testing")
    print("-" * 40)
    
    test_cases = [
        {
            "name": "Simple greeting",
            "message": "hi",
            "expected_behavior": "Should respond with a greeting, not generic error"
        },
        {
            "name": "Employee not found - Sonali query",
            "message": "give me the task report of sonali for july month",
            "expected_behavior": "Should provide specific error with suggestions"
        },
        {
            "name": "Employee search with partial name",  
            "message": "show me task reports for john",
            "expected_behavior": "Should either find John or show multiple matches"
        },
        {
            "name": "General task overview",
            "message": "show me task reports overview for this month",
            "expected_behavior": "Should work or show specific API error"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. {test_case['name']}")
        print(f"Query: {test_case['message']}")
        print(f"Expected: {test_case['expected_behavior']}")
        print("-" * 40)
        
        try:
            payload = {
                "message": test_case['message'],
                "conversation_id": f"test_{i}"
            }
            
            response = requests.post(
                chat_endpoint,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                bot_response = result.get("response", "No response")
                print(f"✅ Status: {response.status_code}")
                print(f"Response: {bot_response[:200]}...")
            else:
                print(f"❌ Status: {response.status_code}")
                print(f"Error: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            
        print()
    
    print("🏁 Test completed! Check the logs and responses above.")
    print("\nTo run this test:")
    print("1. Start the HR Buddy server: python chatbot.py")
    print("2. Run this test: python test_error_handling.py")

if __name__ == "__main__":
    test_hr_buddy_error_handling()