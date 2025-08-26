import Attendance from "../models/Attendance.model.js";
import Employee from "../models/Employee.model.js";
import Leave from "../models/Leave.model.js";
import Help from "../models/Help.model.js";
import RegularizationRequest from "../models/Regularization.model.js";
import PasswordResetRequest from "../models/PasswordResetRequest.model.js";
import Holiday from "../models/Holiday.model.js";
import moment from "moment-timezone";
import AlertService from "../services/alertService.js";

export const getAdminDashboardSummary = async (req, res) => {
  try {
    // --- Date and Time Setup (IST) - same as getAdminAttendanceRange ---
    const today = moment.tz("Asia/Kolkata");
    const startOfToday = today.clone().startOf('day').toDate();
    const endOfToday = today.clone().endOf('day').toDate();


    // --- Get all active employees ---
    const allEmployees = await Employee.find({ isActive: true })
      .select('_id firstName lastName employeeId department')
      .lean();

    // --- Get today's attendance records ---
    const attendanceRecords = await Attendance.find({
      date: { $gte: startOfToday, $lte: endOfToday }
    }).populate('employee', 'firstName lastName employeeId');

    // --- Get approved leaves for today ---
    const approvedLeaves = await Leave.find({
      status: 'approved',
      leaveDate: { $gte: startOfToday, $lte: endOfToday }
    });

    // --- Get holidays for today ---
    const holidays = await Holiday.find({
      date: { $gte: startOfToday, $lte: endOfToday }
    });

    // --- Pending Requests ---
    const [pendingLeaves, pendingHelp, pendingRegularizations, pendingPasswordResets, upcomingHolidays] = await Promise.all([
      Leave.countDocuments({ status: 'pending' }),
      Help.countDocuments({ status: 'pending' }),
      RegularizationRequest.countDocuments({ status: 'pending' }),
      PasswordResetRequest.countDocuments({ status: 'pending' }),
      Holiday.countDocuments({ date: { $gte: startOfToday } })
    ]);

    // Create maps for quick lookup
    const attendanceMap = new Map();
    const leaveMap = new Set();

    // Map attendance by employee ID
    attendanceRecords.forEach(record => {
      if (record.employee && record.employee._id) {
        const empId = record.employee._id.toString();
        attendanceMap.set(empId, record);
      }
    });

    // Map leaves by employee ID
    approvedLeaves.forEach(leave => {
      leaveMap.add(leave.employeeId.toString());
    });

    // Check if today is holiday
    const isHoliday = holidays.length > 0;

    // Calculate stats and build present/absent employees lists
    let presentToday = 0;
    const presentEmployees = [];
    const absentEmployees = [];

    allEmployees.forEach(employee => {
      const empId = employee._id.toString();
      const attendanceRecord = attendanceMap.get(empId);
      const isOnLeave = leaveMap.has(empId) || leaveMap.has(employee.employeeId);
      
      // Present if status=present OR has checkIn
      if (attendanceRecord && (attendanceRecord.status === 'present' || attendanceRecord.checkIn)) {
        presentToday++;
        presentEmployees.push({
          name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
          employeeId: employee.employeeId || 'N/A'
        });
      } else if (isOnLeave) {
        // On leave - don't count as absent
      } else if (isHoliday) {
        // Holiday - don't count as absent
      } else {
        // Check if today is weekend (Sunday or 2nd Saturday)
        const dayOfWeek = today.day(); // 0=Sunday, 6=Saturday
        if (dayOfWeek === 0 || (dayOfWeek === 6 && Math.ceil(today.date() / 7) === 2)) {
          // Weekend - don't count as absent
        } else {
          // Actually absent
          absentEmployees.push({
            name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
            employeeId: employee.employeeId || 'N/A'
          });
        }
      }
    });

    const totalPendingRequests = pendingLeaves + pendingHelp + pendingRegularizations + pendingPasswordResets;

    res.status(200).json({
      success: true,
      data: {
        presentToday,
        absentToday: absentEmployees.length,
        totalPendingRequests,
        upcomingHolidays,
        absentEmployees,
        presentEmployees
      }
    });

  } catch (error) {
    console.error("Error fetching admin dashboard summary:", error);
    res.status(500).json({ success: false, message: "Server error while fetching admin summary.", error: error.message });
  }
};

export const getTodayAlerts = async (req, res) => {
  try {
    const alerts = await AlertService.getTodayAlerts();
    
    res.status(200).json({
      success: true,
      data: {
        alerts,
        count: alerts.length
      }
    });
  } catch (error) {
    console.error("Error fetching today's alerts:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching alerts.", 
      error: error.message 
    });
  }
};

 