import type { Response } from 'express';
import { generateText } from 'ai';
import type { IAuthRequest } from '../types/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { formatResponse } from '../utils/response.js';
import { AuthenticationError } from '../utils/errors.js';
import { getValidatedParams } from '../middlewares/zodValidation.middleware.js';
import AssistantThread from '../models/AssistantThread.model.js';
import AssistantMessage from '../models/AssistantMessage.model.js';
import { applyReceipt, findOwnedThread } from '../services/assistant/history.js';
import { assistantModel, assistantProviderOptions } from '../services/assistant/model.js';
import type { SaveReceiptInput, UpdateThreadInput } from '../validators/assistant.schemas.js';

const MESSAGE_FORMAT = 'ai-sdk/v6';

const requireUser = (req: IAuthRequest) => {
  if (!req.user) throw new AuthenticationError();
  return req.user;
};

const ownedThread = (req: IAuthRequest) =>
  findOwnedThread(getValidatedParams<{ id: string }>(req).id, requireUser(req)._id);

export const listThreads = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const user = requireUser(req);
  const threads = await AssistantThread.find({ user: user._id })
    .sort({ updatedAt: -1 })
    .limit(100)
    .select('title archived updatedAt')
    .lean();

  res.json(formatResponse(true, 'Conversations retrieved', {
    threads: threads.map((t) => ({ id: t._id.toString(), title: t.title, archived: t.archived, updatedAt: t.updatedAt })),
  }));
});

export const createThread = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const thread = await AssistantThread.create({ user: requireUser(req)._id });
  res.status(201).json(formatResponse(true, 'Conversation created', { id: thread._id.toString() }));
});

export const getThread = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const thread = await ownedThread(req);
  res.json(formatResponse(true, 'Conversation retrieved', {
    id: thread._id.toString(),
    title: thread.title,
    archived: thread.archived,
  }));
});

export const updateThread = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const thread = await ownedThread(req);
  const { title, archived } = req.body as UpdateThreadInput;
  await AssistantThread.updateOne(
    { _id: thread._id },
    { $set: { ...(title != null ? { title } : {}), ...(archived != null ? { archived } : {}) } }
  );
  res.json(formatResponse(true, 'Conversation updated'));
});

export const deleteThread = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const thread = await ownedThread(req);
  await AssistantMessage.deleteMany({ thread: thread._id });
  await AssistantThread.deleteOne({ _id: thread._id });
  res.json(formatResponse(true, 'Conversation deleted'));
});

export const getThreadMessages = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const thread = await ownedThread(req);
  const messages = await AssistantMessage.find({ thread: thread._id })
    .sort({ createdAt: 1 })
    .select('messageId parentId role parts metadata')
    .lean();

  res.json(formatResponse(true, 'Messages retrieved', {
    headId: thread.headId,
    messages: messages.map((m) => ({
      id: m.messageId,
      parent_id: m.parentId,
      format: MESSAGE_FORMAT,
      content: { role: m.role, parts: m.parts, ...(m.metadata !== undefined ? { metadata: m.metadata } : {}) },
    })),
  }));
});

const firstUserText = (parts: unknown[]): string =>
  parts
    .map((p) => (typeof p === 'object' && p !== null && (p as { type?: unknown }).type === 'text' ? String((p as { text?: unknown }).text ?? '') : ''))
    .join(' ')
    .trim()
    .slice(0, 1000);

export const generateThreadTitle = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const user = requireUser(req);
  const thread = await ownedThread(req);
  if (thread.title) {
    res.json(formatResponse(true, 'Title retrieved', { title: thread.title }));
    return;
  }

  const first = await AssistantMessage.findOne({ thread: thread._id, role: 'user' }).sort({ createdAt: 1 }).select('parts').lean();
  const text = first ? firstUserText(first.parts) : '';
  if (!text) {
    res.json(formatResponse(true, 'Title retrieved', { title: '' }));
    return;
  }

  const { text: raw } = await generateText({
    model: assistantModel(),
    instructions: 'Write a title of 2 to 6 words for a conversation that starts with the message below. Plain words, no quotes, no trailing punctuation.',
    prompt: text,
    maxOutputTokens: 30,
    providerOptions: assistantProviderOptions(user.role),
  });
  const title = raw.replace(/["'`]/g, '').replace(/[.!?]+$/, '').trim().slice(0, 80) || 'New chat';

  await AssistantThread.updateOne({ _id: thread._id }, { $set: { title } });
  res.json(formatResponse(true, 'Title generated', { title }));
});

export const saveReceipt = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const thread = await ownedThread(req);
  const { messageId, toolCallId, receipt } = req.body as SaveReceiptInput;
  await applyReceipt(thread._id, messageId, toolCallId, receipt);
  res.json(formatResponse(true, 'Receipt saved'));
});
