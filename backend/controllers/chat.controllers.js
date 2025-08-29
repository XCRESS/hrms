/**
 * HR Chatbot Controller
 * Implements OpenAI GPT-5 Responses API with function calling for HR queries
 * Provides intelligent HR assistance with access to HRMS data
 */

import OpenAI from 'openai';
import { HR_FUNCTIONS, executeHRFunction } from '../utils/hrChatbotFunctions.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { formatResponse } from '../utils/response.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Chat session storage (in production, use Redis or database)
 * Stores conversation history and context
 */
const chatSessions = new Map();

/**
 * System instructions for the HR chatbot
 * Defines the chatbot's role, capabilities, and behavior guidelines
 */
const SYSTEM_INSTRUCTIONS = `You are HRMS Buddy, an intelligent HR assistant for an HR Management System. You help HR professionals and employees with HR-related queries.

## Your Role & Capabilities:
- You have access to HR data through secure, read-only functions
- You can provide attendance summaries, employee information, leave statistics, salary insights, and more
- You present information in a clear, professional, and helpful manner
- You maintain confidentiality and only access appropriate data based on user permissions

## Guidelines:
1. **Data Access**: Always use the available functions to get real-time, accurate data from the HRMS
2. **Privacy**: Only provide aggregated data or basic employee information (names, departments, positions)
3. **Professionalism**: Maintain a helpful, professional tone suitable for HR interactions
4. **Accuracy**: Always verify data through function calls rather than making assumptions
5. **Clarity**: Present complex data in easy-to-understand formats with clear explanations
6. **No File Creation**: Never suggest creating files, CSVs, or documents. Only provide data in the chat response

## Function Usage:
- Use get_current_datetime() to get current date/time for date-based queries
- Use get_employee_attendance_summary() for attendance-related questions
- Use get_employee_count_by_tenure() for tenure-related queries
- Use get_leave_statistics() for leave-related information
- Use get_employees_by_department() for department-wise employee data
- Use get_salary_slip_statistics() for payroll-related queries
- Use get_upcoming_holidays() for holiday information
- Use get_task_report_summary() for task reporting insights
- Use get_employee_basic_info() for general employee information
- Use get_all_pending_requests() for comprehensive pending requests across all types (leave, help, regularization, password reset)

## Response Format:
- Start with a brief acknowledgment of the query
- Present data in organized, readable format (use tables, lists, or structured text)
- **Date Format**: Always display dates in DD-MM-YYYY format (e.g., 25-12-2024, not 2024-12-25)
- Provide context and insights when relevant
- End with an offer to help with follow-up questions

Remember: You are a helpful HR assistant focused on providing accurate, timely information to support HR operations and employee inquiries.`;

/**
 * Main chat endpoint - handles conversation with OpenAI GPT-5
 */
export const chat = asyncHandler(async (req, res) => {
  const { message, conversation_id } = req.body;

  // Validate input
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new ValidationError('Message is required and cannot be empty');
  }

  if (message.length > 4000) {
    throw new ValidationError('Message is too long. Please keep messages under 4000 characters.');
  }

  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    throw new ValidationError('OpenAI API key is not configured');
  }

  try {
    // Generate or use existing conversation ID
    const sessionId = conversation_id || `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get or create conversation history for OpenAI API
    let conversationHistory = chatSessions.get(sessionId) || [];
    
    // Add user message to history
    const userMessage = {
      role: 'user',
      content: message.trim()
    };
    
    // Create a fresh conversation history for this API call
    const apiConversationHistory = [...conversationHistory, userMessage];

    console.log(`[ChatBot] Processing message for session ${sessionId}:`, message.substring(0, 100) + '...');

    // Make initial request to GPT-5 nano with function calling (cost-effective)
    let response = await openai.responses.create({
      model: 'gpt-5-nano',
      instructions: SYSTEM_INSTRUCTIONS,
      input: apiConversationHistory,
      tools: HR_FUNCTIONS,
      tool_choice: 'auto', // Let the model decide when to use tools
      reasoning: { effort: 'low' }, // Lower reasoning effort for cost efficiency
      text: { verbosity: 'medium' }, // Clear, comprehensive responses
      parallel_tool_calls: true, // Allow multiple function calls if needed
    });

    console.log(`[ChatBot] Initial OpenAI response received for session ${sessionId}`);

    // Process function calls if any
    const functionCalls = response.output.filter(item => item.type === 'function_call');
    
    if (functionCalls.length > 0) {
      console.log(`[ChatBot] Processing ${functionCalls.length} function calls for session ${sessionId}`);
      
      // Add ALL response items to conversation (including reasoning items)
      // This is critical for reasoning models like GPT-5
      for (const item of response.output) {
        apiConversationHistory.push(item);
      }
      
      // Execute function calls and add their outputs
      for (const functionCall of functionCalls) {
        try {
          console.log(`[ChatBot] Executing function: ${functionCall.name} with args:`, functionCall.arguments);
          
          const functionArgs = JSON.parse(functionCall.arguments);
          const functionResult = await executeHRFunction(functionCall.name, functionArgs);
          
          // Add function result to conversation
          apiConversationHistory.push({
            type: 'function_call_output',
            call_id: functionCall.call_id,
            output: JSON.stringify(functionResult)
          });

          console.log(`[ChatBot] Function ${functionCall.name} executed successfully`);
        } catch (error) {
          console.error(`[ChatBot] Error executing function ${functionCall.name}:`, error);
          
          // Add error result to conversation
          apiConversationHistory.push({
            type: 'function_call_output',
            call_id: functionCall.call_id,
            output: JSON.stringify({
              success: false,
              error: `Failed to execute ${functionCall.name}: ${error.message}`
            })
          });
        }
      }

      // Make second request to get final response with function results
      // Use previous_response_id to maintain reasoning continuity
      response = await openai.responses.create({
        model: 'gpt-5-nano',
        instructions: SYSTEM_INSTRUCTIONS,
        input: apiConversationHistory,
        tools: HR_FUNCTIONS,
        previous_response_id: response.id, // Pass previous response ID for reasoning continuity
        reasoning: { effort: 'low' }, // Lower effort for final formatting
        text: { verbosity: 'medium' }
      });

      console.log(`[ChatBot] Final response generated for session ${sessionId}`);
    }

    // Extract the assistant's response text
    const assistantResponse = response.output_text || "I apologize, but I couldn't generate a proper response. Please try again.";

    // Add assistant response to conversation history
    const assistantMessage = {
      role: 'assistant',
      content: assistantResponse
    };
    
    // Update session storage with user/assistant messages only
    // We don't need to store OpenAI's internal reasoning items, function calls, etc.
    conversationHistory.push(userMessage); // Add the original user message
    conversationHistory.push(assistantMessage); // Add the assistant response
    
    // Keep only last 20 user/assistant messages to manage memory
    const filteredHistory = conversationHistory.filter(msg => 
      msg.role === 'user' || msg.role === 'assistant'
    );
    if (filteredHistory.length > 20) {
      const trimmedHistory = filteredHistory.slice(-20);
      chatSessions.set(sessionId, trimmedHistory);
    } else {
      chatSessions.set(sessionId, filteredHistory);
    }

    // Clean up old sessions (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [key] of chatSessions) {
      if (key.includes('chat_') && parseInt(key.split('_')[1]) < oneHourAgo) {
        chatSessions.delete(key);
      }
    }

    console.log(`[ChatBot] Successfully processed message for session ${sessionId}`);

    // Return response
    res.status(200).json(formatResponse(true, 'Chat response generated successfully', {
      response: assistantResponse,
      conversation_id: sessionId,
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    console.error('[ChatBot] Error processing chat:', error);

    // Handle OpenAI specific errors
    if (error.code === 'insufficient_quota') {
      throw new ValidationError('OpenAI API quota exceeded. Please try again later.');
    } else if (error.code === 'invalid_api_key') {
      throw new ValidationError('Invalid OpenAI API configuration.');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new ValidationError('Too many requests. Please wait a moment before trying again.');
    }

    // Generic error response
    throw new ValidationError(`Chat service error: ${error.message}`);
  }
});

/**
 * Get conversation history for a specific session
 */
export const getConversationHistory = asyncHandler(async (req, res) => {
  const { conversation_id } = req.params;

  if (!conversation_id) {
    throw new ValidationError('Conversation ID is required');
  }

  const conversationHistory = chatSessions.get(conversation_id) || [];
  
  // Filter out system messages and function calls, only return user/assistant messages
  const userFriendlyHistory = conversationHistory.filter(msg => 
    msg.role === 'user' || msg.role === 'assistant'
  ).map(msg => ({
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp || new Date().toISOString()
  }));

  res.status(200).json(formatResponse(true, 'Conversation history retrieved', {
    conversation_id,
    messages: userFriendlyHistory,
    total_messages: userFriendlyHistory.length
  }));
});

/**
 * Clear a specific conversation or all conversations
 */
export const clearConversation = asyncHandler(async (req, res) => {
  const { conversation_id } = req.params;
  const { clear_all } = req.body;

  if (clear_all) {
    // Clear all conversations
    chatSessions.clear();
    res.status(200).json(formatResponse(true, 'All conversations cleared'));
  } else if (conversation_id) {
    // Clear specific conversation
    if (chatSessions.has(conversation_id)) {
      chatSessions.delete(conversation_id);
      res.status(200).json(formatResponse(true, 'Conversation cleared', { conversation_id }));
    } else {
      throw new NotFoundError('Conversation not found');
    }
  } else {
    throw new ValidationError('Either conversation_id or clear_all flag is required');
  }
});

/**
 * Health check for chat service
 */
export const chatHealthCheck = asyncHandler(async (req, res) => {
  const isOpenAIConfigured = !!process.env.OPENAI_API_KEY;
  const activeSessions = chatSessions.size;

  res.status(200).json(formatResponse(true, 'Chat service health check', {
    openai_configured: isOpenAIConfigured,
    active_sessions: activeSessions,
    service_status: isOpenAIConfigured ? 'healthy' : 'configuration_required'
  }));
});

export default {
  chat,
  getConversationHistory,
  clearConversation,
  chatHealthCheck
};