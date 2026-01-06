/**
 * HR Chatbot Controller
 * Implements OpenAI GPT-5 Responses API with function calling for HR queries
 * Provides intelligent HR assistance with access to HRMS data
 */

import type { Response } from 'express';
import OpenAI from 'openai';
import { HR_FUNCTIONS, executeHRFunction } from '../utils/hrChatbotFunctions.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { formatResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import type { IAuthRequest } from '../types/index.js';

// OpenAI type helpers
type OpenAIMessage = { role: string; content: string } | Record<string, unknown>;
type OpenAIResponse = {
  output: Array<Record<string, unknown>>;
  output_text?: string;
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Chat session storage (in production, use Redis or database)
 * Stores conversation history and context
 */
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

const chatSessions = new Map<string, ChatMessage[]>();

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
- Use get_employee_attendance_summary() for attendance-related questions (includes today's attendance, attendance summaries, etc.)
- Use get_current_datetime() only if you need the current date/time for other purposes
- Use get_employee_count_by_tenure() for tenure-related queries
- Use get_leave_statistics() for leave-related information
- Use get_employees_by_department() for department-wise employee data
- Use get_salary_slip_statistics() for payroll-related queries
- Use get_upcoming_holidays() for holiday information
- Use get_task_report_summary() for task reporting insights - analyze and summarize task patterns, don't just list tasks
- Use get_employee_basic_info() for general employee information
- Use get_all_pending_requests() for comprehensive pending requests across all types (leave, help, regularization, password reset)

## Response Format:
- Start with a brief acknowledgment of the query
- Present data in organized, readable format (use tables, lists, or structured text)
- **Date Format**: Always display dates in DD-MM-YYYY format (e.g., 25-12-2024, not 2024-12-25)
- **Task Reports**: When analyzing task reports, provide intelligent summaries of work patterns, productivity insights, and key accomplishments rather than just listing tasks
- **Data Analysis**: Always provide context, insights, and actionable information when presenting data
- End with an offer to help with follow-up questions

Remember: You are a helpful HR assistant focused on providing accurate, timely information to support HR operations and employee inquiries.`;

/**
 * Main chat endpoint - handles conversation with OpenAI GPT-5
 */
export const chat = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { message, conversation_id } = req.body as {
    message: string;
    conversation_id?: string;
  };

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new ValidationError('Message is required and cannot be empty');
  }

  if (message.length > 4000) {
    throw new ValidationError('Message is too long. Please keep messages under 4000 characters.');
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new ValidationError('OpenAI API key is not configured');
  }

  try {
    const sessionId = conversation_id || `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let conversationHistory = chatSessions.get(sessionId) || [];

    const userMessage: ChatMessage = {
      role: 'user',
      content: message.trim()
    };

    const apiConversationHistory: OpenAIMessage[] = [...conversationHistory, userMessage];

    logger.info({ sessionId, messagePreview: message.substring(0, 100) }, 'ChatBot processing message');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let response = await openai.responses.create({
      model: 'gpt-5-mini',
      instructions: SYSTEM_INSTRUCTIONS,
      input: apiConversationHistory,
      tools: HR_FUNCTIONS,
      tool_choice: 'auto',
      reasoning: { effort: 'low' },
      text: { verbosity: 'medium' },
      parallel_tool_calls: true
    } as any) as unknown as OpenAIResponse;

    logger.info({ sessionId }, 'ChatBot initial response received');

    const functionCalls = response.output.filter((item: Record<string, unknown>) => item.type === 'function_call');

    if (functionCalls.length > 0) {
      logger.info({ sessionId, count: functionCalls.length }, 'ChatBot processing function calls');

      apiConversationHistory.push(...(response.output as OpenAIMessage[]));

      for (const functionCall of functionCalls) {
        try {
          const call = functionCall as { name: string; arguments: string; call_id: string };
          logger.info({ function: call.name, args: call.arguments }, 'ChatBot executing function');

          const functionArgs = JSON.parse(call.arguments);
          const functionResult = await executeHRFunction(call.name, functionArgs);

          apiConversationHistory.push({
            type: 'function_call_output',
            call_id: call.call_id,
            output: JSON.stringify(functionResult)
          });

          logger.info({ function: call.name }, 'ChatBot function executed successfully');
        } catch (error) {
          const call = functionCall as { name: string; call_id: string };
          const err = error instanceof Error ? error : new Error('Unknown error');
          logger.error({ err, function: call.name }, 'ChatBot function execution error');

          apiConversationHistory.push({
            type: 'function_call_output',
            call_id: call.call_id,
            output: JSON.stringify({
              success: false,
              error: `Failed to execute ${call.name}: ${err.message}`
            })
          });
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response = await openai.responses.create({
        model: 'gpt-5-mini',
        instructions: SYSTEM_INSTRUCTIONS,
        input: apiConversationHistory,
        tools: HR_FUNCTIONS,
        reasoning: { effort: 'low' },
        text: { verbosity: 'medium' }
      } as any) as unknown as OpenAIResponse;

      logger.info({ sessionId }, 'ChatBot final response generated');
    }

    logger.debug({
      keys: Object.keys(response),
      hasOutputText: !!response.output_text,
      outputTextLength: response.output_text?.length || 0
    }, 'ChatBot response structure');

    let assistantResponse = response.output_text;

    if (!assistantResponse && response.output && Array.isArray(response.output)) {
      const textItems = response.output.filter((item: Record<string, unknown>) => item.type === 'text' && item.text);
      if (textItems.length > 0) {
        assistantResponse = textItems.map((item: Record<string, unknown>) => item.text as string).join('\n');
        logger.debug({ preview: assistantResponse.substring(0, 100) }, 'ChatBot extracted text from output array');
      }
    }

    if (!assistantResponse) {
      assistantResponse = "I apologize, but I couldn't generate a proper response. Please try again.";
    }

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: assistantResponse
    };

    conversationHistory.push(userMessage);
    conversationHistory.push(assistantMessage);

    const filteredHistory = conversationHistory.filter(msg =>
      msg.role === 'user' || msg.role === 'assistant'
    );
    if (filteredHistory.length > 20) {
      const trimmedHistory = filteredHistory.slice(-20);
      chatSessions.set(sessionId, trimmedHistory);
    } else {
      chatSessions.set(sessionId, filteredHistory);
    }

    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [key] of chatSessions) {
      if (key.includes('chat_') && parseInt(key.split('_')[1] || '0') < oneHourAgo) {
        chatSessions.delete(key);
      }
    }

    logger.info({ sessionId }, 'ChatBot message processed successfully');

    res.status(200).json(formatResponse(true, 'Chat response generated successfully', {
      response: assistantResponse,
      conversation_id: sessionId,
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    const err = error as { code?: string; message?: string };
    logger.error({ err }, 'ChatBot error processing chat');

    if (err.code === 'insufficient_quota') {
      throw new ValidationError('OpenAI API quota exceeded. Please try again later.');
    } else if (err.code === 'invalid_api_key') {
      throw new ValidationError('Invalid OpenAI API configuration.');
    } else if (err.code === 'rate_limit_exceeded') {
      throw new ValidationError('Too many requests. Please wait a moment before trying again.');
    }

    throw new ValidationError(`Chat service error: ${err.message || 'Unknown error'}`);
  }
});

/**
 * Get conversation history for a specific session
 */
export const getConversationHistory = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { conversation_id } = req.params;

  if (!conversation_id) {
    throw new ValidationError('Conversation ID is required');
  }

  const conversationHistory = chatSessions.get(conversation_id) || [];

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
export const clearConversation = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { conversation_id } = req.params;
  const { clear_all } = req.body as { clear_all?: boolean };

  if (clear_all) {
    chatSessions.clear();
    res.status(200).json(formatResponse(true, 'All conversations cleared'));
  } else if (conversation_id) {
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
export const chatHealthCheck = asyncHandler(async (req: IAuthRequest, res: Response) => {
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
