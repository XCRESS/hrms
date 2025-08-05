import Leave from "../models/Leave.model.js";
import User from "../models/User.model.js";
import Employee from "../models/Employee.model.js";

export const requestLeave = async (req, res) => {
  try {
    const { leaveType, leaveDate, leaveReason } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (!user.employeeId || typeof user.employeeId !== 'string' || user.employeeId.trim() === "") {
      return res.status(400).json({ message: "You must be linked to an employee profile to request leave. Please contact HR." });
    }
    
    const leave = await Leave.create({
      employeeId: user.employeeId,
      leaveType,
      leaveDate: new Date(leaveDate),
      leaveReason,
    });
    
    res.status(201).json({ 
      success: true, 
      message: "Leave request submitted successfully", 
      leave 
    });
  } catch (err) {
    res.status(500).json({ 
      message: "Failed to submit leave request", 
      error: err.message 
    });
  }
};

export const getMyLeaves = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const employeeId = user.employeeId || req.user.id;
    const leaves = await Leave.find({ employeeId }).sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      leaves 
    });
  } catch (err) {
    res.status(500).json({ 
      message: "Failed to fetch leave requests", 
      error: err.message 
    });
  }
};

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

export const updateLeaveStatus = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status } = req.body;
    
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    
    const leave = await Leave.findById(leaveId);
    
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }
    
    leave.status = status;
    leave.approvedBy = req.user.id;
    await leave.save();
    
    res.json({ 
      success: true, 
      message: `Leave request ${status}`, 
      leave 
    });
  } catch (err) {
    res.status(500).json({ 
      message: "Failed to update leave status", 
      error: err.message 
    });
  }
}; 