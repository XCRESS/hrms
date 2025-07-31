import Policy from "../models/Policy.model.js";
import { formatResponse } from "../utils/response.js";

// Create a new policy
export const createPolicy = async (req, res) => {
  try {
    const {
      title,
      content,
      category,
      priority,
      effectiveDate,
      expiryDate,
      tags,
      acknowledgmentRequired,
      targetAudience,
      attachments
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json(formatResponse(false, "Title and content are required"));
    }

    // Create policy data
    const policyData = {
      title: title.trim(),
      content,
      category: category || 'General',
      priority: priority || 'Medium',
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      tags: tags || [],
      acknowledgmentRequired: acknowledgmentRequired || false,
      targetAudience: targetAudience || 'All Employees',
      attachments: attachments || [],
      createdBy: req.user._id,
      lastUpdatedBy: req.user._id
    };

    const policy = new Policy(policyData);
    await policy.save();

    // Populate creator info
    await policy.populate('createdBy', 'firstName lastName');

    console.log("Policy created successfully:", {
      id: policy._id,
      title: policy.title,
      category: policy.category,
      createdBy: policy.createdBy.firstName + ' ' + policy.createdBy.lastName
    });

    res.status(201).json(formatResponse(true, "Policy created successfully", policy));
  } catch (error) {
    console.error("Error creating policy:", error);
    if (error.code === 11000) {
      return res.status(400).json(formatResponse(false, "A policy with this title already exists"));
    }
    res.status(500).json(formatResponse(false, "Server error while creating policy", error.message));
  }
};

// Get all policies with pagination and filters
export const getAllPolicies = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      priority,
      targetAudience,
      isActive,
      search
    } = req.query;

    // Build filter object
    let filter = {};
    
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (targetAudience) filter.targetAudience = targetAudience;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Add search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get policies with pagination
    const [policies, total] = await Promise.all([
      Policy.find(filter)
        .populate('createdBy', 'firstName lastName')
        .populate('lastUpdatedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Policy.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    const response = {
      policies,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };

    res.status(200).json(formatResponse(true, "Policies fetched successfully", response));
  } catch (error) {
    console.error("Error fetching policies:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching policies", error.message));
  }
};

// Get active policies for updates sidebar
export const getActivePolicies = async (req, res) => {
  try {
    const { limit = 5, targetAudience } = req.query;
    
    const options = {
      limit: parseInt(limit),
      targetAudience: targetAudience || 'All Employees'
    };

    const policies = await Policy.getActivePolicies(options);

    res.status(200).json(formatResponse(true, "Active policies fetched successfully", policies));
  } catch (error) {
    console.error("Error fetching active policies:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching active policies", error.message));
  }
};

// Get policy by ID
export const getPolicyById = async (req, res) => {
  try {
    const { id } = req.params;

    const policy = await Policy.findById(id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName');

    if (!policy) {
      return res.status(404).json(formatResponse(false, "Policy not found"));
    }

    res.status(200).json(formatResponse(true, "Policy fetched successfully", policy));
  } catch (error) {
    console.error("Error fetching policy:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching policy", error.message));
  }
};

// Update policy
export const updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove fields that shouldn't be updated directly
    delete updateData.createdBy;
    delete updateData.createdAt;
    delete updateData.version;

    // Add last updated info
    updateData.lastUpdatedBy = req.user._id;

    // If content is being updated, increment version
    const existingPolicy = await Policy.findById(id);
    if (!existingPolicy) {
      return res.status(404).json(formatResponse(false, "Policy not found"));
    }

    if (updateData.content && updateData.content !== existingPolicy.content) {
      updateData.version = existingPolicy.version + 1;
    }

    const policy = await Policy.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName')
     .populate('lastUpdatedBy', 'firstName lastName');

    console.log("Policy updated successfully:", {
      id: policy._id,
      title: policy.title,
      version: policy.version,
      updatedBy: policy.lastUpdatedBy.firstName + ' ' + policy.lastUpdatedBy.lastName
    });

    res.status(200).json(formatResponse(true, "Policy updated successfully", policy));
  } catch (error) {
    console.error("Error updating policy:", error);
    res.status(500).json(formatResponse(false, "Server error while updating policy", error.message));
  }
};

// Delete policy (soft delete)
export const deletePolicy = async (req, res) => {
  try {
    const { id } = req.params;

    const policy = await Policy.findByIdAndUpdate(
      id,
      {
        isActive: false,
        lastUpdatedBy: req.user._id
      },
      { new: true }
    );

    if (!policy) {
      return res.status(404).json(formatResponse(false, "Policy not found"));
    }

    console.log("Policy deleted (soft delete) successfully:", {
      id: policy._id,
      title: policy.title
    });

    res.status(200).json(formatResponse(true, "Policy deleted successfully"));
  } catch (error) {
    console.error("Error deleting policy:", error);
    res.status(500).json(formatResponse(false, "Server error while deleting policy", error.message));
  }
};

// Permanently delete policy (only for inactive policies)
export const permanentDeletePolicy = async (req, res) => {
  try {
    const { id } = req.params;

    // First check if policy exists and is inactive
    const policy = await Policy.findById(id);
    if (!policy) {
      return res.status(404).json(formatResponse(false, "Policy not found"));
    }

    if (policy.isActive) {
      return res.status(400).json(formatResponse(false, "Cannot permanently delete active policies. Please deactivate first."));
    }

    // Permanently delete the policy
    await Policy.findByIdAndDelete(id);

    console.log("Policy permanently deleted successfully:", {
      id: policy._id,
      title: policy.title
    });

    res.status(200).json(formatResponse(true, "Policy permanently deleted successfully"));
  } catch (error) {
    console.error("Error permanently deleting policy:", error);
    res.status(500).json(formatResponse(false, "Server error while permanently deleting policy", error.message));
  }
};

// Get policy statistics
export const getPolicyStatistics = async (req, res) => {
  try {
    const [
      totalPolicies,
      activePolicies,
      policiesByCategory,
      policiesByPriority,
      recentPolicies
    ] = await Promise.all([
      Policy.countDocuments({}),
      Policy.countDocuments({ isActive: true }),
      Policy.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Policy.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Policy.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('createdBy', 'firstName lastName')
    ]);

    const statistics = {
      overview: {
        totalPolicies,
        activePolicies,
        inactivePolicies: totalPolicies - activePolicies
      },
      distribution: {
        byCategory: policiesByCategory,
        byPriority: policiesByPriority
      },
      recent: recentPolicies
    };

    res.status(200).json(formatResponse(true, "Policy statistics fetched successfully", statistics));
  } catch (error) {
    console.error("Error fetching policy statistics:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching statistics", error.message));
  }
};