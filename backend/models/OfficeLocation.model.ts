/**
 * Office Location Model - TypeScript + Mongoose
 * Office locations for geofencing attendance
 *
 * Storage is GeoJSON (`location: { type: 'Point', coordinates: [lng, lat] }`)
 * behind a `2dsphere` index, so proximity is answered by MongoDB rather than by
 * fetching every office and looping in JS.
 *
 * The API surface stays `coordinates: { latitude, longitude }`. A virtual maps
 * the stored GeoJSON back to that shape and a pre-validate hook maps it forward,
 * so callers (and the frontend `OfficeLocation` type) are unaffected by the
 * change of representation. GeoJSON is [longitude, latitude] - the reversed
 * order is the classic bug here, which is exactly why it is confined to this
 * file and never handled by callers.
 */

import mongoose, { Schema, type Document } from 'mongoose';

export interface ICoordinates {
  latitude: number;
  longitude: number;
}

export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface IOfficeLocationDoc extends Document {
  name: string;
  address?: string;
  location: IGeoPoint;
  /** Virtual: `{ latitude, longitude }` view over `location`. */
  coordinates: ICoordinates;
  radius: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/** Shared radius bounds. Settings, Zod and this model all defer to these. */
export const MIN_GEOFENCE_RADIUS_METERS = 50;
export const MAX_GEOFENCE_RADIUS_METERS = 5000;
export const DEFAULT_GEOFENCE_RADIUS_METERS = 100;

const officeLocationSchema = new Schema<IOfficeLocationDoc>(
  {
    name: {
      type: String,
      required: [true, 'Office location name is required'],
      trim: true,
      maxlength: [120, 'Office name cannot exceed 120 characters'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number],
        required: [true, 'Coordinates are required'],
        validate: {
          validator: (value: number[]) =>
            Array.isArray(value) &&
            value.length === 2 &&
            typeof value[0] === 'number' &&
            typeof value[1] === 'number' &&
            Number.isFinite(value[0]) &&
            Number.isFinite(value[1]) &&
            value[0] >= -180 &&
            value[0] <= 180 &&
            value[1] >= -90 &&
            value[1] <= 90,
          message: 'Coordinates must be [longitude, latitude] within valid ranges',
        },
      },
    },
    radius: {
      type: Number,
      default: DEFAULT_GEOFENCE_RADIUS_METERS,
      min: [MIN_GEOFENCE_RADIUS_METERS, `Radius must be at least ${MIN_GEOFENCE_RADIUS_METERS} meters`],
      max: [MAX_GEOFENCE_RADIUS_METERS, `Radius cannot exceed ${MAX_GEOFENCE_RADIUS_METERS} meters`],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator reference is required'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * `coordinates` virtual - the `{ latitude, longitude }` view callers use.
 *
 * The setter lets `OfficeLocation.create({ coordinates: { latitude, longitude } })`
 * and `doc.coordinates = { ... }` keep working against GeoJSON storage.
 */
officeLocationSchema
  .virtual('coordinates')
  .get(function (this: IOfficeLocationDoc): ICoordinates | undefined {
    const point = this.location?.coordinates;
    if (!Array.isArray(point) || point.length !== 2) return undefined;
    const [longitude, latitude] = point;
    if (typeof longitude !== 'number' || typeof latitude !== 'number') return undefined;
    return { latitude, longitude };
  })
  .set(function (this: IOfficeLocationDoc, value: ICoordinates | undefined) {
    if (!value || typeof value.latitude !== 'number' || typeof value.longitude !== 'number') {
      return;
    }
    this.set('location', {
      type: 'Point',
      coordinates: [value.longitude, value.latitude],
    });
  });

// 2dsphere powers $near / $geoNear; isActive filters the candidate set.
officeLocationSchema.index({ location: '2dsphere' });
officeLocationSchema.index({ isActive: 1 });

const OfficeLocation = mongoose.model<IOfficeLocationDoc>('OfficeLocation', officeLocationSchema);

export default OfficeLocation;
