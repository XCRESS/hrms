import mongoose from "mongoose";

const taskReportSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    employeeId: { // For easier querying without population
        type: String,
        required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    tasks: {
      type: [String],
      required: true,
      validate: [v => Array.isArray(v) && v.length > 0 && v.every(task => task.trim() !== ''), 'At least one non-empty task is required.']
    },
  },
  { timestamps: true }
);

// Index for efficient querying by employee and date
taskReportSchema.index({ employee: 1, date: -1 });
taskReportSchema.index({ employeeId: 1, date: -1 });
// Add an index to prevent a user from submitting more than one report per day
taskReportSchema.index({ employee: 1, date: 1 }, { unique: true });


const TaskReport = mongoose.model("TaskReport", taskReportSchema);

export default TaskReport; 