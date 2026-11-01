/**
 * One-off: drop Attendance indexes the schema no longer declares.
 *
 * Mongoose creates missing indexes on startup but never drops stale ones, so
 * the five redundant indexes removed from the schema stay in the database (and
 * keep slowing every write) until this runs. Run once per environment.
 *
 *   cd backend
 *   pnpm exec tsx scripts/syncAttendanceIndexes.ts --dry-run # preview
 *   pnpm exec tsx scripts/syncAttendanceIndexes.ts           # apply
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Attendance from '../models/Attendance.model.js';

const dryRun = process.argv.includes('--dry-run');

const run = async (): Promise<void> => {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    console.error('MONGO_URL is not set. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(mongoUrl);
  const { toDrop, toCreate } = await Attendance.diffIndexes();
  console.log(`to drop: ${toDrop.length ? toDrop.join(', ') : 'none'}`);
  console.log(`to create: ${toCreate.length ? toCreate.map((i) => JSON.stringify(i)).join(', ') : 'none'}`);

  if (!dryRun) {
    const dropped = await Attendance.syncIndexes();
    console.log(`dropped: ${dropped.length ? dropped.join(', ') : 'none'}`);
  }

  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error('Index sync failed:', error);
  await mongoose.connection.close().catch(() => undefined);
  process.exit(1);
});
