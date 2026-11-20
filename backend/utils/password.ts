import bcrypt from 'bcryptjs';
import type { Types } from 'mongoose';
import User from '../models/User.model.js';

const BCRYPT_COST = 10;

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, BCRYPT_COST);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> => bcrypt.compare(plain, hash);

/** The only way to change an existing user's password: also signs out every device holding an older JWT. */
export async function setPassword(userId: Types.ObjectId | string, plain: string): Promise<void> {
  const password = await hashPassword(plain);
  await User.updateOne({ _id: userId }, { $set: { password }, $inc: { tokenVersion: 1 } });
}
