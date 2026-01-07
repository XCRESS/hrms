import type { Response } from 'express';
import Announcement from '../models/Announcement.model.js';
import Leave from '../models/Leave.model.js';
import Regularization from '../models/Regularization.model.js';
import type { IAuthRequest } from '../types/index.js';
import logger from '../utils/logger.js';

type AuthRequest = IAuthRequest;

interface Activity {
  id: string;
  type: string;
  text: string;
  date: Date;
  initials: string;
  theme: string;
}

// Helper to format initials from a name
const getInitials = (name: string | undefined): string => {
  if (!name) return 'S'; // System
  const parts = name.split(' ');
  if (parts.length > 1 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const getActivityFeed = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const activityPromises: Promise<Activity[]>[] = [];

    // 1. Announcements (for all or user's role)
    activityPromises.push(
      Announcement.find({
        status: 'published',
        targetAudience: { $in: ['all', user.role] },
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .then((announcements) =>
          announcements.map((a) => ({
            id: a._id?.toString() || 'unknown',
            type: 'announcement',
            text: `New announcement: ${a.title}`,
            date: a.createdAt,
            initials: getInitials(a.authorName || 'Admin'),
            theme: 'purple',
          }))
        )
    );

    // 2. User's approved/rejected leave requests
    if (user.employeeId) {
      activityPromises.push(
        Leave.find({
          employee: user.employeeId,
          status: { $in: ['approved', 'rejected'] },
        })
          .sort({ updatedAt: -1 })
          .limit(5)
          .then((leaves) =>
            leaves.map((l) => ({
              id: l._id.toString(),
              type: 'leave',
              text: `Your ${l.leaveType} leave request was ${l.status}`,
              date: l.updatedAt,
              initials: 'HR',
              theme: l.status === 'approved' ? 'green' : 'red',
            }))
          )
      );
    }

    // 3. User's approved/rejected regularization requests
    activityPromises.push(
      Regularization.find({
        user: user._id,
        status: { $in: ['approved', 'rejected'] },
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .then((regs) =>
          regs.map((r) => ({
            id: r._id?.toString() || 'unknown',
            type: 'regularization',
            text: `Your regularization request for ${new Date(r.date).toLocaleDateString()} was ${r.status}`,
            date: r.updatedAt,
            initials: 'HR',
            theme: r.status === 'approved' ? 'green' : 'red',
          }))
        )
    );

    const allActivitiesNested = await Promise.all(activityPromises);
    const flattenedActivities = allActivitiesNested.flat();

    // Sort all activities by date, descending
    const sortedActivities = flattenedActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Limit to the most recent 15 activities
    const finalActivities = sortedActivities.slice(0, 15);

    res.status(200).json({ success: true, data: finalActivities });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error fetching activity feed');
    res.status(500).json({ success: false, message: 'Server error while fetching activity feed.', error: err.message });
  }
};
