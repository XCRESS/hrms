import type { Request, Response } from 'express';
import Announcement from '../models/Announcement.model.js';
import NotificationService from '../services/notificationService.js';
import FrontendNotificationService from '../utils/notificationService.js';
import type { IUser } from '../types/index.js';
import logger from '../utils/logger.js';

interface AuthRequest extends Request {
  user?: IUser;
}

export const createAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content, targetAudience, status } = req.body;
    const authorId = req.user?.id;
    const authorName = req.user?.name;

    if (!title || !content) {
      res.status(400).json({ success: false, message: 'Title and content are required.' });
      return;
    }

    if (!authorId || !authorName) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const announcement = await Announcement.create({
      title,
      content,
      author: authorId,
      authorName,
      targetAudience,
      status,
    });

    if (status === 'published') {
      NotificationService.notifyAllEmployees('announcement', {
        title: title,
        content: content,
        author: authorName,
        targetAudience: targetAudience,
      }).catch((error: unknown) => {
        const err = error instanceof Error ? error : new Error('Unknown error');
        logger.error({ err }, 'Failed to send announcement notification');
      });
    }

    res.status(201).json({ success: true, message: 'Announcement created successfully', announcement });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error creating announcement');
    res.status(500).json({ success: false, message: 'Server error while creating announcement.', error: err.message });
  }
};

export const getAnnouncements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query: Record<string, unknown> = {};

    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      query.status = 'published';
      query.targetAudience = { $in: ['all', req.user?.role] };
    } else {
      if (req.query.status) query.status = req.query.status;
      if (req.query.targetAudience) query.targetAudience = req.query.targetAudience;
    }

    const announcements = await Announcement.find(query).populate('author', 'name email').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: announcements.length, announcements });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error fetching announcements');
    res.status(500).json({ success: false, message: 'Server error while fetching announcements.', error: err.message });
  }
};

export const getAnnouncementById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const announcement = await Announcement.findById(req.params.id).populate('author', 'name email');
    if (!announcement) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      if (
        announcement.status !== 'published' ||
        (announcement.targetAudience !== 'all' && announcement.targetAudience !== req.user?.role)
      ) {
        res.status(403).json({ success: false, message: 'You do not have permission to view this announcement.' });
        return;
      }
    }

    res.status(200).json({ success: true, announcement });
  } catch (error) {
    const err = error as { kind?: string; message: string };
    logger.error({ err }, 'Error fetching announcement by ID');
    if (err.kind === 'ObjectId') {
      res.status(404).json({ success: false, message: 'Announcement not found (invalid ID format)' });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

export const updateAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const announcementId = req.params.id;
    const { title, content, targetAudience, status } = req.body;

    if (Object.keys(req.body).length === 0) {
      res.status(400).json({ success: false, message: 'No update data provided.' });
      return;
    }

    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }

    const updatedFields: Record<string, unknown> = {};
    if (title !== undefined) updatedFields.title = title;
    if (content !== undefined) updatedFields.content = content;
    if (targetAudience !== undefined) updatedFields.targetAudience = targetAudience;
    if (status !== undefined) updatedFields.status = status;

    if (Object.keys(updatedFields).length === 0) {
      res.status(400).json({ success: false, message: 'No valid fields to update were provided.' });
      return;
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(announcementId, updatedFields, {
      new: true,
      runValidators: true,
    }).populate('author', 'name email');

    if (!updatedAnnouncement) {
      res.status(404).json({ success: false, message: 'Announcement not found after update' });
      return;
    }

    if (status === 'published' && announcement.status !== 'published') {
      try {
        await FrontendNotificationService.sendAnnouncementNotification(updatedAnnouncement as unknown as { _id: string; title: string; content: string; targetAudience: string });
      } catch (notificationError) {
        const err = notificationError instanceof Error ? notificationError : new Error('Unknown error');
        logger.error({ err }, 'Failed to send announcement notification');
      }
    }

    res.status(200).json({ success: true, message: 'Announcement updated successfully', announcement: updatedAnnouncement });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error updating announcement');
    res.status(500).json({ success: false, message: 'Server error while updating announcement.', error: err.message });
  }
};

export const deleteAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const announcementId = req.params.id;
    const announcement = await Announcement.findById(announcementId);

    if (!announcement) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }

    await Announcement.findByIdAndDelete(announcementId);

    res.status(200).json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error deleting announcement');
    res.status(500).json({ success: false, message: 'Server error while deleting announcement.', error: err.message });
  }
};
