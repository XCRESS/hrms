import type { Response } from 'express';
import OpenAI from 'openai';
import { HR_FUNCTIONS, executeHRFunction } from '../utils/hrChatbotFunctions.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { formatSuccessResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import type { IAuthRequest } from '../types/index.js';

type InputMessage = { role: 'user' | 'assistant'; content: string };
type OpenAIResponse = {
  id: string;
  output: Array<Record<string, unknown>>;
  output_text?: string;
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Per-session: ordered user/assistant messages for multi-turn context
const chatSessions = new Map<string, InputMessage[]>();

const SYSTEM_INSTRUCTIONS = `You are HRMS Buddy, an intelligent HR assistant for an HR Management System. You help HR professionals manage their workforce with direct access to all HR data.

## Your Role & Capabilities:
- You have full read access to all HR data through your available functions — attendance, salaries, leaves, employees, tasks, requests
- Always fetch real data using your functions. Never refuse to retrieve or show data that the available functions can provide
- Present all data clearly, including individual employee details, financial figures, and attendance records — this is an internal HR tool and all data is appropriate to display

## Guidelines:
1. **Data Access**: Always use your functions to fetch data. Never decline a data request by citing privacy — the user is authorized HR/admin personnel
2. **Completeness**: Show full details including salary figures, individual attendance records, and financial breakdowns when asked
3. **Professionalism**: Maintain a helpful, professional tone
4. **Accuracy**: Always call the relevant function rather than guessing or estimating
5. **No File Creation**: Never suggest creating files, CSVs, or documents — only provide data in the chat response

## Function Usage:
- get_employee_attendance_summary() — attendance summaries, today's attendance, date-range stats
- get_detailed_attendance_with_times() — check-in/check-out times per employee
- get_employee_count_by_tenure() — tenure-based employee counts
- get_leave_statistics() — leave data by status, type, and date range
- get_employees_by_department() — employees grouped by department
- get_salary_slip_statistics() — payroll stats including gross/net salary per employee
- get_upcoming_holidays() — upcoming holidays
- get_task_report_summary() — task reports with productivity analysis
- get_employee_basic_info() — basic employee info
- get_all_pending_requests() — all pending leave, help, regularization, and password reset requests
- get_current_datetime() — current IST date/time (use when needed for context)

## Response Format:
- Present data in organized, readable format (tables, lists, or structured text)
- **Date Format**: Always display dates in DD-MM-YYYY format (e.g., 25-12-2024)
- **Task Reports**: Provide intelligent summaries of work patterns and productivity insights, not just raw lists
- **Data Analysis**: Include context and actionable insights alongside raw data
- End with an offer to help with follow-up questions`;

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
    const history = chatSessions.get(sessionId) || [];

    const userMessage: InputMessage = { role: 'user', content: message.trim() };
    const input: InputMessage[] = [...history, userMessage];

    logger.info({ sessionId, messagePreview: message.slice(0, 100) }, 'ChatBot processing message');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let response = await (openai.responses.create as any)({
      model: 'gpt-5.4-mini',
      instructions: SYSTEM_INSTRUCTIONS,
      input,
      tools: HR_FUNCTIONS,
      tool_choice: 'auto',
      parallel_tool_calls: true,
    }) as OpenAIResponse;

    logger.info({ sessionId, responseId: response.id }, 'ChatBot initial response received');

    // Handle function calls: collect outputs then send back via previous_response_id
    const functionCalls = response.output.filter(item => item['type'] === 'function_call');

    if (functionCalls.length > 0) {
      logger.info({ sessionId, count: functionCalls.length }, 'ChatBot processing function calls');

      const toolOutputs: Array<{ type: 'function_call_output'; call_id: string; output: string }> = [];

      for (const fc of functionCalls) {
        const call = fc as { name: string; arguments: string; call_id: string };
        try {
          logger.info({ function: call.name }, 'ChatBot executing function');
          const args = JSON.parse(call.arguments) as Record<string, unknown>;
          const result = await executeHRFunction(call.name, args);
          toolOutputs.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(result) });
          logger.info({ function: call.name }, 'ChatBot function executed successfully');
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Unknown error');
          logger.error({ err, function: call.name }, 'ChatBot function execution error');
          toolOutputs.push({
            type: 'function_call_output',
            call_id: call.call_id,
            output: JSON.stringify({ success: false, error: `Failed to execute ${call.name}: ${err.message}` }),
          });
        }
      }

      // Use previous_response_id so the model has full context of its own function calls
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response = await (openai.responses.create as any)({
        model: 'gpt-5.4-mini',
        instructions: SYSTEM_INSTRUCTIONS,
        previous_response_id: response.id,
        input: toolOutputs,
        tools: HR_FUNCTIONS,
      }) as OpenAIResponse;

      logger.info({ sessionId }, 'ChatBot final response generated');
    }

    let assistantResponse = response.output_text;

    if (!assistantResponse && Array.isArray(response.output)) {
      const textItems = response.output.filter(item => item['type'] === 'text' && item['text']);
      if (textItems.length > 0) {
        assistantResponse = textItems.map(item => item['text'] as string).join('\n');
      }
    }

    if (!assistantResponse) {
      assistantResponse = "I couldn't generate a response. Please try again.";
    }

    // Keep only user/assistant turns in history (max 20 messages = 10 turns)
    const updatedHistory: InputMessage[] = [...history, userMessage, { role: 'assistant', content: assistantResponse }];
    chatSessions.set(sessionId, updatedHistory.slice(-20));

    // Prune sessions older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key] of chatSessions) {
      if (key.startsWith('chat_') && parseInt(key.split('_')[1] || '0') < oneHourAgo) {
        chatSessions.delete(key);
      }
    }

    logger.info({ sessionId }, 'ChatBot message processed successfully');

    res.status(200).json(formatSuccessResponse('Chat response generated successfully', {
      response: assistantResponse,
      conversation_id: sessionId,
      timestamp: new Date().toISOString(),
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

export const getConversationHistory = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { conversation_id } = req.params;

  if (!conversation_id) {
    throw new ValidationError('Conversation ID is required');
  }

  const history = chatSessions.get(conversation_id) || [];

  res.status(200).json(formatSuccessResponse('Conversation history retrieved', {
    conversation_id,
    messages: history.map(msg => ({ role: msg.role, content: msg.content, timestamp: new Date().toISOString() })),
    total_messages: history.length,
  }));
});

export const clearConversation = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { conversation_id } = req.params;
  const { clear_all } = req.body as { clear_all?: boolean };

  if (clear_all) {
    chatSessions.clear();
    res.status(200).json(formatSuccessResponse('All conversations cleared'));
  } else if (conversation_id) {
    if (chatSessions.has(conversation_id)) {
      chatSessions.delete(conversation_id);
      res.status(200).json(formatSuccessResponse('Conversation cleared', { conversation_id }));
    } else {
      throw new NotFoundError('Conversation not found');
    }
  } else {
    throw new ValidationError('Either conversation_id or clear_all flag is required');
  }
});

export const chatHealthCheck = asyncHandler(async (_req: IAuthRequest, res: Response) => {
  res.status(200).json(formatSuccessResponse('Chat service health check', {
    openai_configured: !!process.env.OPENAI_API_KEY,
    active_sessions: chatSessions.size,
    service_status: process.env.OPENAI_API_KEY ? 'healthy' : 'configuration_required',
  }));
});

export default { chat, getConversationHistory, clearConversation, chatHealthCheck };
