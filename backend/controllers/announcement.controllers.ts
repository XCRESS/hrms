import type { AnnouncementInput, UpdateAnnouncementInput } from '../validators/hr.schemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { Response } from 'express';
import Announcement from '../models/Announcement.model.js';
import NotificationService from '../services/notificationService.js';
import type { IAuthRequest } from '../types/index.js';

export const createAnnouncement = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { title, content, targetAudience, status } = req.body as AnnouncementInput;
  const authorId = req.user?._id;
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
    void NotificationService.notifyAudience(targetAudience ?? 'all', 'announcement', {
      title,
      content,
      author: authorName,
    });
  }

  res.status(201).json({ success: true, message: 'Announcement created successfully', announcement });
});

export const getAnnouncements = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const query: Record<string, unknown> = {};

  if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
    query.status = 'published';
    query.targetAudience = { $in: ['all', req.user?.role] };
  } else {
    if (req.query.status) query.status = req.query.status;
    if (req.query.targetAudience) query.targetAudience = req.query.targetAudience;
  }

  const announcements = await Announcement.find(query).populate('author', 'name email').sort({ createdAt: -1 }).lean();
  res.status(200).json({ success: true, count: announcements.length, announcements });
});

export const getAnnouncementById = asyncHandler(async (req: IAuthRequest, res: Response) => {
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
});

export const updateAnnouncement = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const announcementId = req.params.id;
  const { title, content, targetAudience, status } = req.body as UpdateAnnouncementInput;

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
    void NotificationService.notifyAudience(updatedAnnouncement.targetAudience, 'announcement', {
      title: updatedAnnouncement.title,
      content: updatedAnnouncement.content,
      author: updatedAnnouncement.authorName,
    });
  }

  res.status(200).json({ success: true, message: 'Announcement updated successfully', announcement: updatedAnnouncement });
});

export const deleteAnnouncement = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const announcementId = req.params.id;
  const announcement = await Announcement.findById(announcementId);

  if (!announcement) {
    res.status(404).json({ success: false, message: 'Announcement not found' });
    return;
  }

  await Announcement.findByIdAndDelete(announcementId);

  res.status(200).json({ success: true, message: 'Announcement deleted successfully' });
});
