import SalaryStructure from "../models/SalaryStructure.model.js";
import SalarySlip from "../models/SalarySlip.model.js";
import Employee from "../models/Employee.model.js";
import { formatResponse } from "../utils/response.js";

// Create or update salary structure
export const createOrUpdateSalaryStructure = async (req, res) => {
  try {
    const { employeeId, earnings } = req.body;

    // Validate required fields
    if (!employeeId || !earnings || !earnings.basic) {
      return res.status(400).json(formatResponse(false, "Employee ID and basic salary are required"));
    }

    // Find employee
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json(formatResponse(false, "Employee not found"));
    }

    // Prepare salary structure data
    const structureData = {
      employee: employee._id,
      employeeId,
      earnings: {
        basic: earnings.basic,
        hra: earnings.hra || 0,
        conveyance: earnings.conveyance || 0,
        medical: earnings.medical || 0,
        lta: earnings.lta || 0,
        specialAllowance: earnings.specialAllowance || 0,
        mobileAllowance: earnings.mobileAllowance || 0
      },
      isActive: true, // Explicitly set to true
      lastUpdatedBy: req.user._id
    };

    console.log("createOrUpdateSalaryStructure: Structure data to save:", {
      employeeObjectId: employee._id,
      employeeId: employeeId,
      earnings: structureData.earnings,
      isActive: structureData.isActive
    });

    // Check if salary structure already exists
    const existingStructure = await SalaryStructure.findOne({ employee: employee._id });
    console.log("createOrUpdateSalaryStructure: Existing structure found:", !!existingStructure);

    let salaryStructure;
    if (existingStructure) {
      // Update existing structure
      console.log("createOrUpdateSalaryStructure: Updating existing structure ID:", existingStructure._id);
      Object.assign(existingStructure, structureData);
      salaryStructure = await existingStructure.save();
      console.log("createOrUpdateSalaryStructure: Updated structure saved with ID:", salaryStructure._id);
    } else {
      // Create new structure
      console.log("createOrUpdateSalaryStructure: Creating new structure");
      structureData.createdBy = req.user._id;
      salaryStructure = new SalaryStructure(structureData);
      await salaryStructure.save();
      console.log("createOrUpdateSalaryStructure: New structure created with ID:", salaryStructure._id);
    }

    // Verify the structure was saved correctly by re-fetching it
    const verificationStructure = await SalaryStructure.findOne({ 
      employee: employee._id, 
      isActive: true 
    });
    
    console.log("createOrUpdateSalaryStructure: Verification - structure exists after save:", !!verificationStructure);
    if (verificationStructure) {
      console.log("createOrUpdateSalaryStructure: Verification - structure details:", {
        id: verificationStructure._id,
        employeeId: verificationStructure.employeeId,
        isActive: verificationStructure.isActive,
        grossSalary: verificationStructure.grossSalary
      });
    }

    console.log("createOrUpdateSalaryStructure: Structure saved successfully:", { 
      id: salaryStructure._id, 
      employeeId: salaryStructure.employeeId,
      isActive: salaryStructure.isActive,
      grossSalary: salaryStructure.grossSalary
    });

    // Populate employee data
    await salaryStructure.populate('employee', 'firstName lastName employeeId department position');

    res.status(200).json(formatResponse(true, "Salary structure saved successfully", salaryStructure));
  } catch (error) {
    console.error("Error creating/updating salary structure:", error);
    if (error.code === 11000) {
      return res.status(400).json(formatResponse(false, "Salary structure already exists for this employee"));
    }
    res.status(500).json(formatResponse(false, "Server error while saving salary structure", error.message));
  }
};

// Get salary structure by employee ID
export const getSalaryStructure = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const decodedEmployeeId = decodeURIComponent(employeeId);
    console.log("getSalaryStructure: Looking for employeeId:", decodedEmployeeId);

    // Find employee
    const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
    if (!employee) {
      console.log("getSalaryStructure: Employee not found:", decodedEmployeeId);
      return res.status(404).json(formatResponse(false, "Employee not found"));
    }

    console.log("getSalaryStructure: Found employee:", { id: employee._id, employeeId: employee.employeeId });

    // Find salary structure
    const salaryStructure = await SalaryStructure.findOne({ 
      employee: employee._id, 
      isActive: true 
    }).populate('employee', 'firstName lastName employeeId department position');

    // Also check if there are any inactive structures for debugging
    const allStructuresForEmployee = await SalaryStructure.find({ employee: employee._id });
    console.log("getSalaryStructure: All structures for employee (including inactive):", allStructuresForEmployee.length);
    console.log("getSalaryStructure: Active structure found:", !!salaryStructure);

    if (!salaryStructure) {
      // Log additional debugging info
      console.log("getSalaryStructure: Employee Object ID:", employee._id);
      console.log("getSalaryStructure: All structures for this employee:", 
        allStructuresForEmployee.map(s => ({ 
          id: s._id, 
          employeeId: s.employeeId, 
          isActive: s.isActive,
          createdAt: s.createdAt 
        }))
      );

      return res.status(404).json(formatResponse(false, "No salary structure found for this employee", null, { 
        reason: "NO_STRUCTURE",
        employeeId: decodedEmployeeId,
        employeeObjectId: employee._id.toString(),
        totalStructuresFound: allStructuresForEmployee.length
      }));
    }

    res.status(200).json(formatResponse(true, "Salary structure fetched successfully", salaryStructure));
  } catch (error) {
    console.error("Error fetching salary structure:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching salary structure", error.message));
  }
};

// Get all salary structures (for HR/Admin)
export const getAllSalaryStructures = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    // Build filter
    const filter = { isActive: true };
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = SalaryStructure.find(filter)
      .populate('employee', 'firstName lastName employeeId department position')
      .sort({ createdAt: -1 });

    // Apply search if provided
    if (search) {
      // First get employees matching search criteria
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
      
      query = SalaryStructure.find(filter)
        .populate('employee', 'firstName lastName employeeId department position')
        .sort({ createdAt: -1 });
    }

    const [salaryStructures, total] = await Promise.all([
      query.skip(skip).limit(parseInt(limit)),
      SalaryStructure.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json(formatResponse(true, "Salary structures fetched successfully", {
      salaryStructures,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    }));
  } catch (error) {
    console.error("Error fetching all salary structures:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching salary structures", error.message));
  }
};

// Delete salary structure
export const deleteSalaryStructure = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const decodedEmployeeId = decodeURIComponent(employeeId);
    console.log("deleteSalaryStructure: Looking for employeeId:", decodedEmployeeId);

    // Find employee
    const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
    if (!employee) {
      console.log("deleteSalaryStructure: Employee not found:", decodedEmployeeId);
      return res.status(404).json(formatResponse(false, "Employee not found"));
    }

    // Soft delete - mark as inactive instead of deleting
    const salaryStructure = await SalaryStructure.findOneAndUpdate(
      { employee: employee._id },
      { 
        isActive: false,
        lastUpdatedBy: req.user._id
      },
      { new: true }
    );

    if (!salaryStructure) {
      return res.status(404).json(formatResponse(false, "Salary structure not found"));
    }

    res.status(200).json(formatResponse(true, "Salary structure deleted successfully"));
  } catch (error) {
    console.error("Error deleting salary structure:", error);
    res.status(500).json(formatResponse(false, "Server error while deleting salary structure", error.message));
  }
};

// Get employees without salary structure
export const getEmployeesWithoutStructure = async (req, res) => {
  try {
    // Get all active employees
    const allEmployees = await Employee.find({ isActive: true });
    
    // Get all employees with salary structures
    const employeesWithStructures = await SalaryStructure.find({ isActive: true })
      .populate('employee', 'employeeId');
    
    const employeeIdsWithStructure = employeesWithStructures.map(
      structure => structure.employee.employeeId
    );
    
    // Filter employees without salary structure
    const employeesWithoutStructure = allEmployees.filter(
      employee => !employeeIdsWithStructure.includes(employee.employeeId)
    );

    res.status(200).json(formatResponse(true, "Employees without salary structure fetched successfully", employeesWithoutStructure));
  } catch (error) {
    console.error("Error fetching employees without salary structure:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching employees", error.message));
  }
};

// Get salary statistics for dashboard
export const getSalaryStatistics = async (req, res) => {
  try {
    // Get current month and year
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = currentDate.getFullYear();

    // Run all queries in parallel for better performance
    const [
      totalEmployees,
      activeSalaryStructures,
      employeesWithoutStructure,
      currentMonthSlips,
      totalSalaryStructures,
      allActiveSalaryStructures
    ] = await Promise.all([
      // Total active employees
      Employee.countDocuments({ isActive: true }),
      
      // Active salary structures count
      SalaryStructure.countDocuments({ isActive: true }),
      
      // Employees without salary structure
      Employee.find({ isActive: true }).then(async (allEmployees) => {
        const employeesWithStructures = await SalaryStructure.find({ isActive: true })
          .populate('employee', 'employeeId');
        const employeeIdsWithStructure = employeesWithStructures.map(
          structure => structure.employee.employeeId
        );
        return allEmployees.filter(
          employee => !employeeIdsWithStructure.includes(employee.employeeId)
        );
      }),
      
      // Current month salary slips
      SalarySlip.countDocuments({ 
        month: currentMonth, 
        year: currentYear 
      }),
      
      // Total salary structures (including inactive for historical data)
      SalaryStructure.countDocuments({}),
      
      // All active salary structures for calculations
      SalaryStructure.find({ isActive: true })
    ]);

    // Calculate total gross salary from all active structures
    const totalGrossSalary = allActiveSalaryStructures.reduce((sum, structure) => {
      return sum + (structure.grossSalary || 0);
    }, 0);

    // Find highest and lowest paid employees
    const sortedStructures = allActiveSalaryStructures
      .sort((a, b) => (b.grossSalary || 0) - (a.grossSalary || 0));
    
    const highestPaid = sortedStructures.length > 0 ? sortedStructures[0].grossSalary : 0;
    const lowestPaid = sortedStructures.length > 0 ? sortedStructures[sortedStructures.length - 1].grossSalary : 0;

    const statistics = {
      overview: {
        totalEmployees,
        activeSalaryStructures,
        employeesWithoutStructure: employeesWithoutStructure.length,
        currentMonthSlips,
        totalSalaryStructures
      },
      financial: {
        totalGrossSalary,
        highestPaid,
        lowestPaid
      },
      currentMonth: {
        month: currentMonth,
        year: currentYear,
        slipsGenerated: currentMonthSlips,
        slipsRemaining: activeSalaryStructures - currentMonthSlips
      }
    };

    console.log("Salary statistics calculated:", {
      totalEmployees,
      activeSalaryStructures,
      employeesWithoutStructure: employeesWithoutStructure.length,
      currentMonthSlips,
      totalGrossSalary
    });

    res.status(200).json(formatResponse(true, "Salary statistics fetched successfully", statistics));
  } catch (error) {
    console.error("Error fetching salary statistics:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching salary statistics", error.message));
  }
}; 