import type { Response } from 'express';
import type { Types } from 'mongoose';
import {
  convertToModelMessages,
  createIdGenerator,
  isStepCount,
  pipeUIMessageStreamToResponse,
  streamText,
  toUIMessageStream,
  TypeValidationError,
  validateUIMessages,
  type DataUIPart,
  type TextPart,
  type UIDataTypes,
  type UIMessage,
} from 'ai';
import type { IAuthRequest } from '../types/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthenticationError, BadRequestError } from '../utils/errors.js';
import { getISTNow } from '../utils/timezone.js';
import logger from '../utils/logger.js';
import AssistantMessage from '../models/AssistantMessage.model.js';
import { findOwnedThread, loadBranch, saveMessage } from '../services/assistant/history.js';
import { fileForModel } from '../services/assistant/files/read.js';
import { loadOwnedFile } from '../services/assistant/files/store.js';
import { assistantModel, assistantProviderOptions } from '../services/assistant/model.js';
import { buildInstructions } from '../services/assistant/instructions.js';
import { buildToolsFor } from '../services/assistant/tools/index.js';
import type { ToolCaller } from '../services/assistant/tools/types.js';
import type { ChatRequestInput } from '../validators/assistant.schemas.js';

const MAX_STEPS = 8;
const MAX_OUTPUT_TOKENS = 2000;
const generateMessageId = createIdGenerator({ prefix: 'msg', size: 16 });

const textOf = (message: UIMessage | undefined): string =>
  (message?.parts ?? [])
    .map((part) => (part.type === 'text' ? part.text : part.type.startsWith('data-') ? JSON.stringify((part as { data?: unknown }).data ?? '') : ''))
    .join('\n')
    .trim();

interface DraftContext {
  draftId?: string;
  draftKind?: string;
  fields?: unknown;
  selection?: string;
}

const convertDataPart = (part: DataUIPart<UIDataTypes>): TextPart | undefined => {
  if (part.type !== 'data-draft-context') return undefined;
  const ctx = (part.data ?? {}) as DraftContext;
  const selection = ctx.selection ? ` Selected text: "${ctx.selection}".` : '';
  return {
    type: 'text',
    text: `[draft:${ctx.draftId ?? ''} kind=${ctx.draftKind ?? ''}] Current fields (including the user's edits): ${JSON.stringify(ctx.fields ?? {})}.${selection}`,
  };
};

const STORED_FILE = /^[0-9a-f]{24}$/i;

/** Attachments are stored by id; the model gets their contents. The saved messages keep only the id. */
const withAttachments = (messages: UIMessage[], userId: Types.ObjectId): Promise<UIMessage[]> =>
  Promise.all(
    messages.map(async (message) => {
      if (message.role !== 'user' || !message.parts.some((p) => p.type === 'file' && STORED_FILE.test(p.url))) return message;
      const parts: UIMessage['parts'] = [];
      for (const part of message.parts) {
        if (part.type !== 'file' || !STORED_FILE.test(part.url)) {
          parts.push(part);
          continue;
        }
        try {
          parts.push(...(await fileForModel(await loadOwnedFile(part.url, userId), part.url)));
        } catch {
          parts.push({ type: 'text', text: `[Attached file "${part.filename ?? 'file'}" is no longer available]` });
        }
      }
      return { ...message, parts };
    })
  );

export const chat = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const user = req.user;
  if (!user) throw new AuthenticationError();
  const { threadId, trigger, parentId, message } = req.body as ChatRequestInput;

  const thread = await findOwnedThread(threadId, user._id);
  const history = await loadBranch(thread._id, parentId);

  let userMessage: UIMessage | null = null;
  if (trigger === 'submit-message' && message) {
    const existing = await AssistantMessage.findOne({ thread: thread._id, messageId: message.id }).select('role parentId').lean();
    if (existing && (existing.role !== 'user' || existing.parentId !== parentId)) throw new BadRequestError('That message id is already in use');
    userMessage = { id: message.id, role: 'user', parts: message.parts, metadata: message.metadata } as UIMessage;
  } else if (history.at(-1)?.role !== 'user') {
    throw new BadRequestError('Regenerate needs the user message to answer');
  }

  const caller: ToolCaller = { userId: user._id, name: user.name, email: user.email, role: user.role, employee: user.employee };
  const now = getISTNow();
  const candidate = userMessage ? [...history, userMessage] : history;
  const latestUser = userMessage ?? [...history].reverse().find((m) => m.role === 'user');
  const tools = buildToolsFor({ caller, now, threadId: thread._id, history: candidate, latestUserText: textOf(latestUser), turnResults: [] });

  let messages: UIMessage[];
  try {
    messages = await validateUIMessages({ messages: candidate, tools });
  } catch (error) {
    if (TypeValidationError.isInstance(error)) throw new BadRequestError('This conversation contains a message HR Buddy can no longer read');
    throw error;
  }

  if (userMessage) await saveMessage(thread._id, user._id, userMessage, parentId);
  const answerParentId = latestUser?.id ?? null;

  const result = streamText({
    model: assistantModel(),
    instructions: buildInstructions(caller, now),
    messages: await convertToModelMessages(await withAttachments(messages, user._id), { tools, convertDataPart }),
    tools,
    stopWhen: isStepCount(MAX_STEPS),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    providerOptions: assistantProviderOptions(user.role),
    onToolExecutionEnd: ({ toolCall, toolOutput, toolExecutionMs }) => {
      const output = toolOutput.type === 'tool-result' ? (toolOutput.output as { rows?: unknown[] } | undefined) : undefined;
      logger.info(
        { tool: toolCall.toolName, ms: toolExecutionMs, rows: output?.rows?.length, failed: toolOutput.type === 'tool-error', userId: String(user._id) },
        'HR Buddy tool call'
      );
    },
    onEnd: ({ usage, steps }) => {
      logger.info({ userId: String(user._id), steps: steps.length, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens }, 'HR Buddy turn');
    },
  });

  const uiStream = toUIMessageStream({
    stream: result.stream,
    tools,
    sendSources: true,
    originalMessages: messages,
    generateMessageId,
    onError: (error) => {
      logger.error({ err: error, userId: String(user._id) }, 'HR Buddy stream error');
      return 'HR Buddy ran into a problem answering that. Please try again.';
    },
    onEnd: async ({ responseMessage }) => {
      try {
        await saveMessage(thread._id, user._id, responseMessage, answerParentId);
      } catch (err) {
        logger.error({ err, threadId: String(thread._id) }, 'Failed to save HR Buddy answer');
      }
    },
  });

  // The server's branch is always read to the end, so a closed tab or Stop still saves the full answer.
  const [toClient, toServer] = uiStream.tee();
  void drain(toServer);

  await pipeUIMessageStreamToResponse({ response: res, stream: toClient });
});

const drain = async (stream: ReadableStream<unknown>): Promise<void> => {
  const reader = stream.getReader();
  try {
    while (!(await reader.read()).done) continue;
  } catch (err) {
    logger.error({ err }, 'HR Buddy stream drain failed');
  }
};
