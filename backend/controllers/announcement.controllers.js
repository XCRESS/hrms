import Announcement from "../models/Announcement.model.js";
import User from "../models/User.model.js"; // To populate author details
import NotificationService from "../services/notificationService.js";

// @desc    Create a new announcement
// @route   POST /api/announcements
// @access  Private (Admin/HR)
export const createAnnouncement = async (req, res) => {
  try {
    const { title, content, targetAudience, status } = req.body;
    const authorId = req.user.id; // From authMiddleware
    const authorName = req.user.name; // From authMiddleware

    if (!title || !content) {
      return res.status(400).json({ success: false, message: "Title and content are required." });
    }

    const announcement = await Announcement.create({
      title,
      content,
      author: authorId,
      authorName, // Storing name for easier display without always populating
      targetAudience,
      status
    });

    // Send notification if announcement is published
    if (status === 'published') {
      NotificationService.notifyAllEmployees('announcement', {
        title: title,
        content: content,
        author: authorName,
        targetAudience: targetAudience
      }).catch(error => console.error('Failed to send announcement notification:', error));
    }

    res.status(201).json({ success: true, message: "Announcement created successfully", announcement });
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ success: false, message: "Server error while creating announcement.", error: error.message });
  }
};

// @desc    Get all announcements (filtered by role/status)
// @route   GET /api/announcements
// @access  Private (All authenticated users)
export const getAnnouncements = async (req, res) => {
  try {
    let query = {};
    // Non-admin/HR users see only published announcements targeted to 'all' or their specific role
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      query.status = 'published';
      query.targetAudience = { $in: ['all', req.user.role] }; 
    } else {
      // Admin/HR can filter by status or target audience if query params are provided
      if (req.query.status) query.status = req.query.status;
      if (req.query.targetAudience) query.targetAudience = req.query.targetAudience;
    }

    const announcements = await Announcement.find(query)
                                        .populate('author', 'name email') // Populate author's name and email
                                        .sort({ createdAt: -1 }); // Newest first
    res.status(200).json({ success: true, count: announcements.length, announcements });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ success: false, message: "Server error while fetching announcements.", error: error.message });
  }
};

// @desc    Get a single announcement by ID
// @route   GET /api/announcements/:id
// @access  Private (All authenticated users - if they have access based on status/audience)
export const getAnnouncementById = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id).populate('author', 'name email');
        if (!announcement) {
            return res.status(404).json({ success: false, message: "Announcement not found" });
        }

        // Check access for non-admin/hr
        if (req.user.role !== 'admin' && req.user.role !== 'hr') {
            if (announcement.status !== 'published' || 
                (announcement.targetAudience !== 'all' && announcement.targetAudience !== req.user.role)) {
                return res.status(403).json({ success: false, message: "You do not have permission to view this announcement." });
            }
        }

        res.status(200).json({ success: true, announcement });
    } catch (error) {
        console.error("Error fetching announcement by ID:", error);
        if (error.kind === 'ObjectId') {
             return res.status(404).json({ success: false, message: "Announcement not found (invalid ID format)" });
        }
        res.status(500).json({ success: false, message: "Server error.", error: error.message });
    }
};

// @desc    Update an announcement
// @route   PUT /api/announcements/:id
// @access  Private (Admin/HR)
export const updateAnnouncement = async (req, res) => {
  try {
    const announcementId = req.params.id;
    const { title, content, targetAudience, status } = req.body;

    if (Object.keys(req.body).length === 0) {
        return res.status(400).json({ success: false, message: "No update data provided." });
    }

    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ success: false, message: "Announcement not found" });
    }

    // Optional: Check if the user updating is the author or has higher privileges
    // if (announcement.author.toString() !== req.user.id && req.user.role !== 'admin') {
    //   return res.status(403).json({ success: false, message: "Not authorized to update this announcement" });
    // }

    const updatedFields = {};
    if (title !== undefined) updatedFields.title = title;
    if (content !== undefined) updatedFields.content = content;
    if (targetAudience !== undefined) updatedFields.targetAudience = targetAudience;
    if (status !== undefined) updatedFields.status = status;
    
    // Add user who last updated it, if needed - requires schema change
    // updatedFields.lastUpdatedBy = req.user.id;

    if (Object.keys(updatedFields).length === 0) {
        return res.status(400).json({ success: false, message: "No valid fields to update were provided." });
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      announcementId,
      updatedFields,
      { new: true, runValidators: true }
    ).populate('author', 'name email');

    // Send notification if announcement status changed to published
    if (status === 'published' && announcement.status !== 'published') {
      try {
        await notificationService.sendAnnouncementNotification(updatedAnnouncement);
      } catch (notificationError) {
        console.error('Failed to send announcement notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }

    res.status(200).json({ success: true, message: "Announcement updated successfully", announcement: updatedAnnouncement });
  } catch (error) {
    console.error("Error updating announcement:", error);
    res.status(500).json({ success: false, message: "Server error while updating announcement.", error: error.message });
  }
};

// @desc    Delete an announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Admin/HR)
export const deleteAnnouncement = async (req, res) => {
  try {
    const announcementId = req.params.id;
    const announcement = await Announcement.findById(announcementId);

    if (!announcement) {
      return res.status(404).json({ success: false, message: "Announcement not found" });
    }

    // Optional: Check if the user deleting is the author or has higher privileges
    // if (announcement.author.toString() !== req.user.id && req.user.role !== 'admin') {
    //   return res.status(403).json({ success: false, message: "Not authorized to delete this announcement" });
    // }

    await Announcement.findByIdAndDelete(announcementId);

    res.status(200).json({ success: true, message: "Announcement deleted successfully" });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({ success: false, message: "Server error while deleting announcement.", error: error.message });
  }
}; 