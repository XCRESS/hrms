import { Types } from 'mongoose';
import type { UIMessage } from 'ai';
import AssistantThread, { type IAssistantThread } from '../../models/AssistantThread.model.js';
import AssistantMessage from '../../models/AssistantMessage.model.js';
import { NotFoundError } from '../../utils/errors.js';
import type { ReceiptInput } from '../../validators/assistant.schemas.js';

export const findOwnedThread = async (threadId: string, userId: Types.ObjectId): Promise<IAssistantThread> => {
  if (!Types.ObjectId.isValid(threadId)) throw new NotFoundError('Conversation not found');
  const thread = await AssistantThread.findOne({ _id: threadId, user: userId }).lean();
  if (!thread) throw new NotFoundError('Conversation not found');
  return thread;
};

export const toUIMessage = (doc: { messageId: string; role: 'user' | 'assistant'; parts: unknown[]; metadata?: unknown }): UIMessage =>
  ({
    id: doc.messageId,
    role: doc.role,
    parts: doc.parts,
    ...(doc.metadata !== undefined ? { metadata: doc.metadata } : {}),
  }) as UIMessage;

/** Messages on the path from the root to `leafId`, root first. */
export const loadBranch = async (threadId: Types.ObjectId, leafId: string | null): Promise<UIMessage[]> => {
  if (!leafId) return [];
  const docs = await AssistantMessage.find({ thread: threadId })
    .select('messageId parentId role parts metadata')
    .lean();
  const byId = new Map(docs.map((doc) => [doc.messageId, doc]));

  const path: UIMessage[] = [];
  const seen = new Set<string>();
  let cursor: string | null = leafId;
  while (cursor) {
    const doc = byId.get(cursor);
    if (!doc || seen.has(cursor)) throw new NotFoundError('Message not found in this conversation');
    seen.add(cursor);
    path.push(toUIMessage(doc));
    cursor = doc.parentId;
  }
  return path.reverse();
};

// BSON stores `undefined` as null, which validateUIMessages then rejects on reload.
const withoutUndefined = <T>(value: T): T => (value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T));

export const saveMessage = async (
  threadId: Types.ObjectId,
  userId: Types.ObjectId,
  message: UIMessage,
  parentId: string | null
): Promise<void> => {
  await AssistantMessage.updateOne(
    { thread: threadId, messageId: message.id },
    {
      $set: {
        user: userId,
        parentId,
        role: message.role === 'assistant' ? 'assistant' : 'user',
        parts: withoutUndefined(message.parts),
        metadata: withoutUndefined(message.metadata),
      },
    },
    { upsert: true }
  );
  await AssistantThread.updateOne({ _id: threadId }, { $set: { headId: message.id } });
};

export const applyReceipt = async (
  threadId: Types.ObjectId,
  messageId: string,
  toolCallId: string,
  receipt: ReceiptInput
): Promise<void> => {
  const doc = await AssistantMessage.findOne({ thread: threadId, messageId });
  if (!doc) throw new NotFoundError('Message not found in this conversation');

  const part = doc.parts.find(
    (p): p is { toolCallId: string; output?: Record<string, unknown> } =>
      typeof p === 'object' && p !== null && (p as { toolCallId?: unknown }).toolCallId === toolCallId
  );
  if (!part || typeof part.output !== 'object' || part.output === null) {
    throw new NotFoundError('Draft not found in this message');
  }

  part.output = withoutUndefined({ ...part.output, receipt });
  doc.markModified('parts');
  await doc.save();
  await AssistantThread.updateOne({ _id: threadId }, { $set: { updatedAt: new Date() } });
};
