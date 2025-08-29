import Leave from "../models/Leave.model.js";
import User from "../models/User.model.js";
import Employee from "../models/Employee.model.js";
import NotificationService from "../services/notificationService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";

export const requestLeave = asyncHandler(async (req, res) => {
  const { leaveType, leaveDate, leaveReason } = req.body;
  const user = await User.findById(req.user.id);
  
  if (!user) {
    throw new NotFoundError("User not found");
  }
  
  if (!user.employeeId || typeof user.employeeId !== 'string' || user.employeeId.trim() === "") {
    throw new ValidationError("You must be linked to an employee profile to request leave. Please contact HR.");
  }
  
  const leave = await Leave.create({
    employeeId: user.employeeId,
    leaveType,
    leaveDate: new Date(leaveDate),
    leaveReason,
  });
  
  // Trigger notification to HR
  NotificationService.notifyHR('leave_request', {
    employee: user.name,
    employeeId: user.employeeId,
    type: leaveType,
    date: leaveDate,
    reason: leaveReason
  }).catch(error => console.error('Failed to send leave request notification:', error));
  
  res.status(201).json({ 
    success: true, 
    message: "Leave request submitted successfully", 
    leave 
  });
});

export const getMyLeaves = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    throw new NotFoundError("User not found");
  }
  
  const employeeId = user.employeeId || req.user.id;
  const leaves = await Leave.find({ employeeId }).sort({ createdAt: -1 });
  
  res.json({ 
    success: true, 
    leaves 
  });
});

export const getAllLeaves = async (req, res) => {
  try {
    const { employeeId } = req.query;
    let filter = {};
    
    // If employeeId is provided in query, filter by it
    if (employeeId) {
      filter.employeeId = employeeId;
    }
    
    const leaves = await Leave.find(filter).sort({ createdAt: -1 });
    
    // Populate employee names for each leave
    const leavesWithEmployeeNames = await Promise.all(
      leaves.map(async (leave) => {
        const employee = await Employee.findOne({ employeeId: leave.employeeId });
        return {
          ...leave.toObject(),
          employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'
        };
      })
    );
    
    res.json({ 
      success: true, 
      leaves: leavesWithEmployeeNames 
    });
  } catch (err) {
    res.status(500).json({ 
      message: "Failed to fetch leave requests", 
      error: err.message 
    });
  }
};

export const updateLeaveStatus = asyncHandler(async (req, res) => {
  const { leaveId } = req.params;
  const { status } = req.body;
  
  if (!["approved", "rejected"].includes(status)) {
    throw new ValidationError("Invalid status");
  }
  
  const leave = await Leave.findById(leaveId);
  
  if (!leave) {
    throw new NotFoundError("Leave request not found");
  }
  
  leave.status = status;
  leave.approvedBy = req.user.id;
  await leave.save();
  
  // Notify employee about status update
  NotificationService.notifyEmployee(leave.employeeId, 'leave_status_update', {
    status: status,
    type: leave.leaveType,
    date: leave.leaveDate.toDateString(),
    reason: leave.leaveReason
  }).catch(error => console.error('Failed to send leave status notification:', error));
  
  res.json({ 
    success: true, 
    message: `Leave request ${status}`, 
    leave 
  });
}); 