/**
 * Holiday Model - TypeScript + Mongoose
 * Company holidays and optional holidays management
 */

import mongoose, { Schema, type Model } from 'mongoose';
import type { IHoliday, HolidayType } from '../types/index.js';

const holidaySchema = new Schema<IHoliday>(
  {
    name: {
      type: String,
      required: [true, 'Holiday name is required'],
      trim: true,
      minlength: [2, 'Holiday name must be at least 2 characters'],
      maxlength: [200, 'Holiday name cannot exceed 200 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Holiday date is required'],
    },
    type: {
      type: String,
      enum: {
        values: ['public', 'restricted', 'optional'] as HolidayType[],
        message: 'Holiday type must be one of: public, restricted, optional',
      },
      default: 'public',
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Virtual: Check if holiday is in the past
 */
holidaySchema.virtual('isPast').get(function (this: IHoliday) {
  return new Date(this.date) < new Date();
});

/**
 * Virtual: Check if holiday is upcoming (within next 30 days)
 */
holidaySchema.virtual('isUpcoming').get(function (this: IHoliday) {
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const holidayDate = new Date(this.date);
  return holidayDate >= today && holidayDate <= thirtyDaysFromNow;
});

// Indexes for performance optimization
holidaySchema.index({ date: 1 }, { unique: true }); // Unique constraint on date
holidaySchema.index({ date: 1, type: 1 }); // Date-based queries with type filter
holidaySchema.index({ isActive: 1, date: 1 }); // Active holidays sorted by date

/**
 * Static method: Find holidays in date range
 */
holidaySchema.statics.findInRange = function (startDate: Date, endDate: Date) {
  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate,
    },
    isActive: true,
  }).sort({ date: 1 });
};

/**
 * Static method: Find upcoming holidays
 */
holidaySchema.statics.findUpcoming = function (days: number = 30) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

  return this.find({
    date: {
      $gte: today,
      $lte: futureDate,
    },
    isActive: true,
  }).sort({ date: 1 });
};

/**
 * Static method: Find holidays for a specific year
 */
holidaySchema.statics.findByYear = function (year: number) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate,
    },
    isActive: true,
  }).sort({ date: 1 });
};

/**
 * Static method: Find public holidays only
 */
holidaySchema.statics.findPublicHolidays = function (year?: number) {
  const query: Record<string, unknown> = {
    type: 'public',
    isActive: true,
  };

  if (year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    query.date = { $gte: startDate, $lte: endDate };
  }

  return this.find(query).sort({ date: 1 });
};

/**
 * Static method: Check if a date is a holiday
 */
holidaySchema.statics.isHoliday = async function (date: Date): Promise<boolean> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const holiday = await this.findOne({
    date: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
    isActive: true,
  });

  return holiday !== null;
};

/**
 * Instance method: Deactivate holiday
 */
holidaySchema.methods.deactivate = function (this: IHoliday) {
  this.isActive = false;
  return this.save();
};

// Extend IHoliday interface with custom properties and methods
declare module '../types/index.js' {
  interface IHoliday {
    isPast: boolean;
    isUpcoming: boolean;
    deactivate(): Promise<IHoliday>;
  }
}

// Extend model with static methods
interface IHolidayModel extends Model<IHoliday> {
  findInRange(startDate: Date, endDate: Date): Promise<IHoliday[]>;
  findUpcoming(days?: number): Promise<IHoliday[]>;
  findByYear(year: number): Promise<IHoliday[]>;
  findPublicHolidays(year?: number): Promise<IHoliday[]>;
  isHoliday(date: Date): Promise<boolean>;
}

const Holiday = mongoose.model<IHoliday, IHolidayModel>('Holiday', holidaySchema);

export default Holiday;
