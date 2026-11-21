/**
 * One-off: replace the global unique index on Letter.referenceNo with one
 * that is unique per company (each company numbers its letters separately).
 * Mongoose creates new indexes on startup but never drops old ones, so the
 * old `referenceNo_1` stays until this runs. Run once per environment.
 *
 *   cd backend
 *   pnpm exec tsx scripts/syncLetterIndexes.ts --dry-run # preview
 *   pnpm exec tsx scripts/syncLetterIndexes.ts           # apply
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Letter from '../models/Letter.model.js';

const dryRun = process.argv.includes('--dry-run');

const run = async (): Promise<void> => {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    console.error('MONGO_URL is not set. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(mongoUrl);
  const { toDrop, toCreate } = await Letter.diffIndexes();
  console.log(`to drop: ${toDrop.length ? toDrop.join(', ') : 'none'}`);
  console.log(`to create: ${toCreate.length ? toCreate.map((i) => JSON.stringify(i)).join(', ') : 'none'}`);

  if (!dryRun) {
    const dropped = await Letter.syncIndexes();
    console.log(`dropped: ${dropped.length ? dropped.join(', ') : 'none'}`);
  }

  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error('Index sync failed:', error);
  await mongoose.connection.close().catch(() => undefined);
  process.exit(1);
});
