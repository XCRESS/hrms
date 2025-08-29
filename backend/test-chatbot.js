/**
 * Test script for HR Chatbot functionality
 * Tests authentication and chat endpoints
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000/api';

// Test login credentials (use existing user)
const TEST_CREDENTIALS = {
  email: 'admin@example.com', // Update with actual admin email
  password: 'admin123' // Update with actual password
};

async function testChatbot() {
  try {
    console.log('🚀 Starting HR Chatbot Tests...\n');

    // Step 1: Login to get authentication token
    console.log('📋 Step 1: Authenticating...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_CREDENTIALS)
    });

    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginData.message);
      console.log('Please update TEST_CREDENTIALS with valid user credentials');
      return;
    }

    const authToken = loginData.token;
    console.log('✅ Login successful\n');

    // Step 2: Test chat health check
    console.log('📋 Step 2: Testing chat health check...');
    const healthResponse = await fetch(`${BASE_URL}/chat/health`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const healthData = await healthResponse.json();
    console.log('Health Check Response:', JSON.stringify(healthData, null, 2));
    
    if (!healthData.success || !healthData.data.openai_configured) {
      console.error('❌ Chat service not properly configured');
      return;
    }
    console.log('✅ Chat service is healthy\n');

    // Step 3: Test basic chat functionality
    console.log('📋 Step 3: Testing basic chat...');
    const chatResponse = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Hello! What is the current date and time?'
      })
    });

    const chatData = await chatResponse.json();
    console.log('Chat Response:', JSON.stringify(chatData, null, 2));
    
    if (!chatData.success) {
      console.error('❌ Basic chat test failed');
      return;
    }
    console.log('✅ Basic chat working\n');

    // Step 4: Test function calling with HR data
    console.log('📋 Step 4: Testing HR function calling...');
    const conversationId = chatData.data.conversation_id;
    
    const functionChatResponse = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'How many employees have completed 6 months of tenure?',
        conversation_id: conversationId
      })
    });

    const functionChatData = await functionChatResponse.json();
    console.log('Function Call Response:', JSON.stringify(functionChatData, null, 2));
    
    if (!functionChatData.success) {
      console.error('❌ Function calling test failed');
      return;
    }
    console.log('✅ Function calling working\n');

    // Step 5: Test conversation history
    console.log('📋 Step 5: Testing conversation history...');
    const historyResponse = await fetch(`${BASE_URL}/chat/history/${conversationId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const historyData = await historyResponse.json();
    console.log('Conversation History:', JSON.stringify(historyData, null, 2));
    
    if (!historyData.success) {
      console.error('❌ Conversation history test failed');
      return;
    }
    console.log('✅ Conversation history working\n');

    console.log('🎉 All tests passed! HR Chatbot is working correctly.');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testChatbot();