import Help from "../models/Help.model.js";

// Standard response formatter for consistency
const formatResponse = (success, message, data = null, errors = null) => {
  return {
    success,
    message,
    ...(data && { data }),
    ...(errors && { errors })
  };
};

/**
 * Submit a help inquiry
 */
export const submitInquiry = async (req, res) => {
  try {
    const { subject, description, category, priority } = req.body;
    
    // Validation
    if (!subject || !description) {
      return res.status(400).json(
        formatResponse(false, "Missing required fields", null, {
          fields: ["subject", "description"]
        })
      );
    }
    
    const inquiry = await Help.create({
      userId: req.user._id,
      subject,
      description,
      category: category || "other",
      priority: priority || "medium"
    });
    
    res.status(201).json(
      formatResponse(true, "Inquiry submitted successfully", { inquiry })
    );
  } catch (err) {
    console.error("Submit inquiry error:", err);
    res.status(500).json(
      formatResponse(false, "Failed to submit inquiry", null, {
        server: err.message
      })
    );
  }
};

/**
 * Get my inquiries
 */
export const getMyInquiries = async (req, res) => {
  try {
    const inquiries = await Help.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json(
      formatResponse(true, "Inquiries retrieved successfully", { inquiries })
    );
  } catch (err) {
    console.error("Get my inquiries error:", err);
    res.status(500).json(
      formatResponse(false, "Failed to retrieve inquiries", null, {
        server: err.message
      })
    );
  }
};

/**
 * Get all inquiries (admin/HR)
 */
export const getAllInquiries = async (req, res) => {
  try {
    const { status, priority, category } = req.query;
    const filter = {};
    
    // Apply filters if provided
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    
    const inquiries = await Help.find(filter)
      .sort({ createdAt: -1 })
      .populate("userId", "name email");
    
    res.json(
      formatResponse(true, "All inquiries retrieved successfully", { inquiries })
    );
  } catch (err) {
    console.error("Get all inquiries error:", err);
    res.status(500).json(
      formatResponse(false, "Failed to retrieve inquiries", null, {
        server: err.message
      })
    );
  }
};

/**
 * Update inquiry status/response
 */
export const updateInquiry = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { status, response } = req.body;
    
    const inquiry = await Help.findById(inquiryId);
    
    if (!inquiry) {
      return res.status(404).json(
        formatResponse(false, "Inquiry not found")
      );
    }
    
    // Update fields if provided
    if (status) inquiry.status = status;
    if (response) {
      inquiry.response = response;
      inquiry.respondedBy = req.user._id;
    }
    
    await inquiry.save();
    
    res.json(
      formatResponse(true, "Inquiry updated successfully", { inquiry })
    );
  } catch (err) {
    console.error("Update inquiry error:", err);
    res.status(500).json(
      formatResponse(false, "Failed to update inquiry", null, {
        server: err.message
      })
    );
  }
}; 