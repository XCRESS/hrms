/**
 * Task Report Model - TypeScript + Mongoose
 * Daily task reports submitted by employees
 */

import mongoose, { Schema, type Document } from 'mongoose';

export interface ITaskReportDoc extends Document {
  employee: mongoose.Types.ObjectId;
  employeeId: string;
  date: Date;
  tasks: string[];
  createdAt: Date;
  updatedAt: Date;
}

const taskReportSchema = new Schema<ITaskReportDoc>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    tasks: {
      type: [String],
      required: [true, 'Tasks are required'],
      validate: {
        validator: function (v: string[]): boolean {
          return (
            Array.isArray(v) &&
            v.length > 0 &&
            v.every((task) => typeof task === 'string' && task.trim() !== '')
          );
        },
        message: 'At least one non-empty task is required',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
taskReportSchema.index({ employee: 1, date: -1 });
taskReportSchema.index({ employeeId: 1, date: -1 });

// Unique constraint: one report per employee per day
taskReportSchema.index({ employee: 1, date: 1 }, { unique: true });

const TaskReport = mongoose.model<ITaskReportDoc>('TaskReport', taskReportSchema);

export default TaskReport;
