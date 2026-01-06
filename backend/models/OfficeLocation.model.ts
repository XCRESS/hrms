/**
 * Office Location Model - TypeScript + Mongoose
 * Office locations for geofencing attendance
 */

import mongoose, { Schema, type Document } from 'mongoose';

export interface ICoordinates {
  latitude: number;
  longitude: number;
}

export interface IOfficeLocationDoc extends Document {
  name: string;
  address?: string;
  coordinates: ICoordinates;
  radius: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

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
    coordinates: {
      latitude: {
        type: Number,
        required: [true, 'Latitude is required'],
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90'],
      },
      longitude: {
        type: Number,
        required: [true, 'Longitude is required'],
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180'],
      },
    },
    radius: {
      type: Number,
      default: 100,
      min: [50, 'Radius must be at least 50 meters'],
      max: [500, 'Radius cannot exceed 500 meters'],
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
  }
);

// Indexes for geospatial queries
officeLocationSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });
officeLocationSchema.index({ isActive: 1 });

const OfficeLocation = mongoose.model<IOfficeLocationDoc>('OfficeLocation', officeLocationSchema);

export default OfficeLocation;
