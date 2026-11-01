/**
 * One-off migration: set the `employee` ObjectId from the `employeeId` string
 *
 * Records are linked to their Employee by ObjectId; employeeId is only a
 * display label. Records written before a model carried the ObjectId (users,
 * documents and regularization requests, mainly) are invisible to the new
 * queries until this runs.
 *
 * Run it right before deploying, then once more right after, to catch records
 * the old build wrote in between. Idempotent: records that already have
 * `employee` are skipped.
 *
 *   cd backend
 *   npx tsx scripts/backfillEmployeeRefs.ts           # apply
 *   npx tsx scripts/backfillEmployeeRefs.ts --dry-run # preview
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Employee from '../models/Employee.model.js';
import { COPIES } from '../services/employeeIdRename.js';

const dryRun = process.argv.includes('--dry-run');

const run = async (): Promise<void> => {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    console.error('MONGO_URL is not set. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(mongoUrl);
  console.log(`Connected. ${dryRun ? 'DRY RUN - no writes will be made.' : 'Applying migration.'}`);

  const employees = await Employee.find().select('_id employeeId').lean();
  const idByLabel = new Map(employees.map((e) => [e.employeeId, e._id]));

  let orphaned = 0;
  for (const model of COPIES) {
    const missing = { employeeId: { $nin: [null, ''] }, $or: [{ employee: { $exists: false } }, { employee: null }] };
    const labels: string[] = await model.distinct('employeeId', missing);
    let linked = 0;

    for (const label of labels) {
      const employee = idByLabel.get(label);
      if (!employee) {
        const count = await model.countDocuments({ ...missing, employeeId: label });
        console.warn(`  ! ${model.modelName}: ${count} record(s) for unknown employee ID ${label}`);
        orphaned += count;
        continue;
      }
      if (dryRun) {
        linked += await model.countDocuments({ ...missing, employeeId: label });
      } else {
        const { modifiedCount } = await model.updateMany({ ...missing, employeeId: label }, { $set: { employee } });
        linked += modifiedCount;
      }
    }
    console.log(`${model.modelName}: ${dryRun ? 'would link' : 'linked'} ${linked}`);
  }

  console.log(`\nDone. orphaned=${orphaned}` + (dryRun ? '  (dry run - nothing was written)' : ''));
  await mongoose.connection.close();
  process.exit(orphaned > 0 ? 1 : 0);
};

run().catch(async (error) => {
  console.error('Migration failed:', error);
  await mongoose.connection.close().catch(() => undefined);
  process.exit(1);
});
