import SalarySlip from "../models/SalarySlip.model.js";
import Employee from "../models/Employee.model.js";
import { formatResponse } from "../utils/response.js";

// Create or update salary slip
export const createOrUpdateSalarySlip = async (req, res) => {
  try {
    const { employeeId, month, year, earnings, deductions = {}, taxRegime = 'new' } = req.body;

    // Validate required fields
    if (!employeeId || !month || !year || !earnings || !earnings.basic) {
      return res.status(400).json(formatResponse(false, "Employee ID, month, year, and basic salary are required"));
    }

    // Find employee
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json(formatResponse(false, "Employee not found"));
    }

    // Prepare salary slip data (tax will be calculated automatically in pre-save hook)
    const salarySlipData = {
      employee: employee._id,
      employeeId,
      month,
      year,
      earnings: {
        basic: earnings.basic,
        hra: earnings.hra || 0,
        conveyance: earnings.conveyance || 0,
        medical: earnings.medical || 0,
        lta: earnings.lta || 0,
        specialAllowance: earnings.specialAllowance || 0,
        mobileAllowance: earnings.mobileAllowance || 0
      },
      deductions: {
        incomeTax: 0, // Will be calculated in pre-save hook
        customDeductions: deductions.customDeductions || []
      },
      taxRegime,
      createdBy: req.user._id
    };

    // Check if salary slip already exists
    const existingSalarySlip = await SalarySlip.findOne({ employee: employee._id, month, year });

    let salarySlip;
    if (existingSalarySlip) {
      // Update existing salary slip
      Object.assign(existingSalarySlip, salarySlipData);
      salarySlip = await existingSalarySlip.save();
    } else {
      // Create new salary slip
      salarySlip = new SalarySlip(salarySlipData);
      await salarySlip.save();
    }

    // Populate employee data
    await salarySlip.populate('employee', 'firstName lastName employeeId department position bankName bankAccountNumber panNumber joiningDate companyName email');

    res.status(200).json(formatResponse(true, "Salary slip saved successfully", salarySlip));
  } catch (error) {
    console.error("Error creating/updating salary slip:", error);
    if (error.code === 11000) {
      return res.status(400).json(formatResponse(false, "Salary slip already exists for this employee and month/year"));
    }
    res.status(500).json(formatResponse(false, "Server error while saving salary slip", error.message));
  }
};

// Get salary slip by employee, month, and year
export const getSalarySlip = async (req, res) => {
  try {
    const { employeeId, month, year } = req.params;
    const decodedEmployeeId = decodeURIComponent(employeeId);

    // Find employee
    const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
    if (!employee) {
      return res.status(404).json(formatResponse(false, "Employee not found"));
    }

    // Find salary slip
    const salarySlip = await SalarySlip.findOne({ 
      employee: employee._id, 
      month: parseInt(month), 
      year: parseInt(year) 
    }).populate('employee', 'firstName lastName employeeId department position bankName bankAccountNumber');

    if (!salarySlip) {
      return res.status(404).json(formatResponse(false, "Salary slip not found"));
    }

    res.status(200).json(formatResponse(true, "Salary slip fetched successfully", salarySlip));
  } catch (error) {
    console.error("Error fetching salary slip:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching salary slip", error.message));
  }
};

// Get all salary slips for an employee
export const getEmployeeSalarySlips = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const decodedEmployeeId = decodeURIComponent(employeeId);
    const { page = 1, limit = 10 } = req.query;

    // Find employee
    const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
    if (!employee) {
      return res.status(404).json(formatResponse(false, "Employee not found"));
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find salary slips with pagination
    const [salarySlips, total] = await Promise.all([
      SalarySlip.find({ employee: employee._id })
        .populate('employee', 'firstName lastName employeeId department position')
        .sort({ year: -1, month: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      SalarySlip.countDocuments({ employee: employee._id })
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json(formatResponse(true, "Salary slips fetched successfully", {
      salarySlips,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    }));
  } catch (error) {
    console.error("Error fetching employee salary slips:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching salary slips", error.message));
  }
};

// Get all salary slips (for HR/Admin with filters)
export const getAllSalarySlips = async (req, res) => {
  try {
    const { month, year, page = 1, limit = 10, employeeId, search } = req.query;

    // Build filter
    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (employeeId) {
      const employee = await Employee.findOne({ employeeId });
      if (employee) filter.employee = employee._id;
    }

    // Handle search functionality
    if (search) {
      const employees = await Employee.find({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { employeeId: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } }
        ]
      });
      
      const employeeIds = employees.map(emp => emp._id);
      filter.employee = { $in: employeeIds };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find salary slips with pagination
    const [salarySlips, total] = await Promise.all([
      SalarySlip.find(filter)
        .populate('employee', 'firstName lastName employeeId department position bankName bankAccountNumber panNumber joiningDate companyName')
        .sort({ year: -1, month: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      SalarySlip.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json(formatResponse(true, "Salary slips fetched successfully", {
      salarySlips,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    }));
  } catch (error) {
    console.error("Error fetching all salary slips:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching salary slips", error.message));
  }
};

// Delete salary slip
export const deleteSalarySlip = async (req, res) => {
  try {
    const { employeeId, month, year } = req.params;
    const decodedEmployeeId = decodeURIComponent(employeeId);

    // Find employee
    const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
    if (!employee) {
      return res.status(404).json(formatResponse(false, "Employee not found"));
    }

    // Find and delete salary slip
    const salarySlip = await SalarySlip.findOneAndDelete({ 
      employee: employee._id, 
      month: parseInt(month), 
      year: parseInt(year) 
    });

    if (!salarySlip) {
      return res.status(404).json(formatResponse(false, "Salary slip not found"));
    }

    res.status(200).json(formatResponse(true, "Salary slip deleted successfully"));
  } catch (error) {
    console.error("Error deleting salary slip:", error);
    res.status(500).json(formatResponse(false, "Server error while deleting salary slip", error.message));
  }
};

// Get tax calculation preview
export const getTaxCalculation = async (req, res) => {
  try {
    const { grossSalary, taxRegime = 'new' } = req.query;

    if (!grossSalary || isNaN(grossSalary)) {
      return res.status(400).json(formatResponse(false, "Valid gross salary is required"));
    }

    // Create a temporary salary slip instance to use the tax calculation methods
    const tempSalarySlip = new SalarySlip({
      employee: null,
      employeeId: 'temp',
      month: 1,
      year: 2024,
      earnings: { basic: 0 },
      taxRegime,
      createdBy: null
    });

    const annualGross = parseFloat(grossSalary) * 12;
    const annualTax = tempSalarySlip.calculateIncomeTax(annualGross, taxRegime);
    const monthlyTax = annualTax / 12;

    res.status(200).json(formatResponse(true, "Tax calculation completed", {
      monthlyGross: parseFloat(grossSalary),
      annualGross,
      monthlyTax,
      annualTax,
      taxRegime,
      standardDeduction: taxRegime === 'new' ? 75000 : 50000
    }));
  } catch (error) {
    console.error("Error calculating tax:", error);
    res.status(500).json(formatResponse(false, "Server error while calculating tax", error.message));
  }
};

// Update salary slip status (publish/unpublish)
export const updateSalarySlipStatus = async (req, res) => {
  try {
    const { employeeId, month, year } = req.params;
    const { status } = req.body;

    // Validate required fields
    if (!employeeId || !month || !year || !status) {
      return res.status(400).json(formatResponse(false, "Employee ID, month, year, and status are required"));
    }

    // Validate status
    if (!['draft', 'finalized'].includes(status)) {
      return res.status(400).json(formatResponse(false, "Status must be either 'draft' or 'finalized'"));
    }

    // Find employee
    const decodedEmployeeId = decodeURIComponent(employeeId);
    const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
    if (!employee) {
      return res.status(404).json(formatResponse(false, "Employee not found"));
    }

    // Find and update salary slip
    const salarySlip = await SalarySlip.findOneAndUpdate(
      { 
        employee: employee._id, 
        month: parseInt(month), 
        year: parseInt(year) 
      },
      { status },
      { new: true }
    ).populate('employee', 'firstName lastName employeeId department position bankName bankAccountNumber panNumber joiningDate companyName email');

    if (!salarySlip) {
      return res.status(404).json(formatResponse(false, "Salary slip not found"));
    }

    res.status(200).json(formatResponse(true, `Salary slip ${status === 'finalized' ? 'published' : 'unpublished'} successfully`, salarySlip));
  } catch (error) {
    console.error("Error updating salary slip status:", error);
    res.status(500).json(formatResponse(false, "Server error while updating salary slip status", error.message));
  }
};

// Bulk update salary slip status
export const bulkUpdateSalarySlipStatus = async (req, res) => {
  try {
    const { salarySlips, status } = req.body;

    // Validate required fields
    if (!salarySlips || !Array.isArray(salarySlips) || !status) {
      return res.status(400).json(formatResponse(false, "Salary slips array and status are required"));
    }

    // Validate status
    if (!['draft', 'finalized'].includes(status)) {
      return res.status(400).json(formatResponse(false, "Status must be either 'draft' or 'finalized'"));
    }

    const updatePromises = salarySlips.map(async ({ employeeId, month, year }) => {
      const employee = await Employee.findOne({ employeeId });
      if (!employee) return null;

      return SalarySlip.findOneAndUpdate(
        { 
          employee: employee._id, 
          month: parseInt(month), 
          year: parseInt(year) 
        },
        { status },
        { new: true }
      );
    });

    const results = await Promise.all(updatePromises);
    const updated = results.filter(result => result !== null);

    res.status(200).json(formatResponse(true, `${updated.length} salary slips ${status === 'finalized' ? 'published' : 'unpublished'} successfully`, {
      updatedCount: updated.length,
      totalRequested: salarySlips.length
    }));
  } catch (error) {
    console.error("Error bulk updating salary slip status:", error);
    res.status(500).json(formatResponse(false, "Server error while updating salary slip status", error.message));
  }
}; 