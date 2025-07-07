import Attendance from "../models/Attendance.model.js";
import Employee from "../models/Employee.model.js";
import Leave from "../models/Leave.model.js";
import Help from "../models/Help.model.js";
import RegularizationRequest from "../models/Regularization.model.js";
import PasswordResetRequest from "../models/PasswordResetRequest.model.js";
import Holiday from "../models/Holiday.model.js";
import moment from "moment-timezone";

export const getAdminDashboardSummary = async (req, res) => {
  try {
    // --- Date and Time Setup (IST) ---
    const today = moment.tz("Asia/Kolkata");
    const startOfToday = today.clone().startOf('day').toDate();
    const endOfToday = today.clone().endOf('day').toDate();

    // --- Core Counts ---
    const totalEmployeesPromise = Employee.countDocuments({ isActive: true });
    const presentTodayPromise = Attendance.countDocuments({ date: { $gte: startOfToday, $lte: endOfToday } });
    
    // --- Pending Requests ---
    const pendingLeavesPromise = Leave.countDocuments({ status: 'pending' });
    const pendingHelpPromise = Help.countDocuments({ status: 'pending' });
    const pendingRegularizationsPromise = RegularizationRequest.countDocuments({ status: 'pending' });
    const pendingPasswordResetsPromise = PasswordResetRequest.countDocuments({ status: 'pending' });

    // --- Holidays ---
    const upcomingHolidaysPromise = Holiday.countDocuments({ date: { $gte: startOfToday } });

    // --- Execute All Promises ---
    const [
      totalEmployees,
      presentToday,
      pendingLeaves,
      pendingHelp,
      pendingRegularizations,
      pendingPasswordResets,
      upcomingHolidays,
    ] = await Promise.all([
      totalEmployeesPromise,
      presentTodayPromise,
      pendingLeavesPromise,
      pendingHelpPromise,
      pendingRegularizationsPromise,
      pendingPasswordResetsPromise,
      upcomingHolidaysPromise,
    ]);

    const absentToday = totalEmployees - presentToday;
    const totalPendingRequests = pendingLeaves + pendingHelp + pendingRegularizations + pendingPasswordResets;

    res.status(200).json({
      success: true,
      data: {
        presentToday,
        absentToday: Math.max(0, absentToday), // Ensure it's not negative
        totalPendingRequests,
        upcomingHolidays
      }
    });

  } catch (error) {
    console.error("Error fetching admin dashboard summary:", error);
    res.status(500).json({ success: false, message: "Server error while fetching admin summary.", error: error.message });
  }
}; 