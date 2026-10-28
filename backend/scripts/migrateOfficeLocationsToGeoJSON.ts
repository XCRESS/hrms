/**
 * One-off migration: OfficeLocation.coordinates -> GeoJSON OfficeLocation.location
 *
 * Before: { coordinates: { latitude, longitude } }   (two stored scalars)
 * After:  { location: { type: 'Point', coordinates: [longitude, latitude] } }
 *
 * `coordinates` is now a virtual over `location`, so documents written under the
 * old shape are invisible to geofencing until this runs. It must be executed
 * once against each environment before the new build serves traffic.
 *
 * Idempotent: documents that already have a `location` point are skipped, so
 * re-running is safe.
 *
 *   cd backend
 *   npx tsx scripts/migrateOfficeLocationsToGeoJSON.ts           # apply
 *   npx tsx scripts/migrateOfficeLocationsToGeoJSON.ts --dry-run # preview
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import OfficeLocation from '../models/OfficeLocation.model.js';

const dryRun = process.argv.includes('--dry-run');

interface LegacyOfficeDoc {
  _id: mongoose.Types.ObjectId;
  name?: string;
  coordinates?: { latitude?: unknown; longitude?: unknown };
  location?: { type?: string; coordinates?: unknown };
}

const run = async (): Promise<void> => {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    console.error('MONGO_URL is not set. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(mongoUrl);
  console.log(`Connected. ${dryRun ? 'DRY RUN - no writes will be made.' : 'Applying migration.'}`);

  // Read through the raw collection: the Mongoose schema no longer maps the
  // legacy `coordinates` path, so the ODM would hide exactly what we need.
  const collection = mongoose.connection.collection<LegacyOfficeDoc>(
    OfficeLocation.collection.name
  );

  const docs = await collection.find({}).toArray();
  console.log(`Found ${docs.length} office location document(s).`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of docs) {
    const label = `${doc.name ?? '(unnamed)'} [${doc._id.toString()}]`;

    if (Array.isArray(doc.location?.coordinates) && doc.location.coordinates.length === 2) {
      console.log(`  skip     ${label} - already GeoJSON`);
      skipped++;
      continue;
    }

    const latitude = Number(doc.coordinates?.latitude);
    const longitude = Number(doc.coordinates?.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      console.error(
        `  FAILED   ${label} - unusable legacy coordinates: ` +
          `${JSON.stringify(doc.coordinates)}. Fix this row by hand.`
      );
      failed++;
      continue;
    }

    console.log(`  migrate  ${label} -> [${longitude}, ${latitude}]`);

    if (!dryRun) {
      await collection.updateOne(
        { _id: doc._id },
        {
          // GeoJSON is [longitude, latitude].
          $set: { location: { type: 'Point', coordinates: [longitude, latitude] } },
          $unset: { coordinates: '' },
        }
      );
    }

    migrated++;
  }

  if (!dryRun && migrated > 0) {
    console.log('Building 2dsphere index...');
    await OfficeLocation.syncIndexes();
  }

  console.log(
    `\nDone. migrated=${migrated} skipped=${skipped} failed=${failed}` +
      (dryRun ? '  (dry run - nothing was written)' : '')
  );

  await mongoose.connection.close();
  process.exit(failed > 0 ? 1 : 0);
};

run().catch(async (error) => {
  console.error('Migration failed:', error);
  await mongoose.connection.close().catch(() => undefined);
  process.exit(1);
});
