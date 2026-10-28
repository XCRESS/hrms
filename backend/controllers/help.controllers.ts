import type { SubmitInquiryInput, UpdateInquiryInput } from '../validators/hr.schemas.js';
import type { Response } from 'express';
import Help from '../models/Help.model.js';
import User from '../models/User.model.js';
import Employee from '../models/Employee.model.js';
import NotificationService from '../services/notificationService.js';
import type { IAuthRequest } from '../types/index.js';
import logger from '../utils/logger.js';

type AuthRequest = IAuthRequest;

// Standard response formatter for consistency
const formatResponse = (success: boolean, message: string, data: unknown = null, errors: unknown = null) => {
  const response: Record<string, unknown> = {
    success,
    message,
  };
  if (data) response.data = data;
  if (errors) response.errors = errors;
  return response;
};

/**
 * Submit a help inquiry
 */
export const submitInquiry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, description, category, priority } = req.body as SubmitInquiryInput;

    // Validation
    if (!subject || !description) {
      res.status(400).json(
        formatResponse(false, 'Missing required fields', null, {
          fields: ['subject', 'description'],
        })
      );
      return;
    }

    if (!req.user) {
      res.status(401).json(formatResponse(false, 'Authentication required'));
      return;
    }

    // `employee`/`employeeName` were passed here but are not in the Help schema,
    // so Mongoose silently dropped them. The name is resolved on read instead.
    const inquiry = await Help.create({
      userId: req.user._id,
      subject,
      description,
      category: category || 'other',
      priority: priority || 'medium',
    });

    // Trigger notification to HR
    NotificationService.notifyHR('help_request', {
      employee: req.user.name,
      employeeId: req.user.employeeId || 'N/A',
      subject: subject,
      description: description,
      category: category || 'other',
      priority: priority || 'medium',
    }).catch((error: unknown) => {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err }, 'Failed to send help request notification');
    });

    res.status(201).json(formatResponse(true, 'Inquiry submitted successfully', { inquiry }));
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Submit inquiry error');
    res.status(500).json(
      formatResponse(false, 'Failed to submit inquiry', null, {
        server: error.message,
      })
    );
  }
};

/**
 * Get my inquiries
 */
export const getMyInquiries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse(false, 'Authentication required'));
      return;
    }

    const inquiries = await Help.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();

    res.json(formatResponse(true, 'Inquiries retrieved successfully', { inquiries }));
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Get my inquiries error');
    res.status(500).json(
      formatResponse(false, 'Failed to retrieve inquiries', null, {
        server: error.message,
      })
    );
  }
};

/**
 * Get all inquiries (admin/HR)
 */
export const getAllInquiries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, priority, category, startDate, endDate } = req.query as {
      status?: string;
      priority?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
    };
    const filter: Record<string, unknown> = {};

    // Apply filters if provided
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    if (startDate || endDate) {
      const createdAt: { $gte?: Date; $lte?: Date } = {};
      if (startDate) createdAt.$gte = new Date(startDate);
      if (endDate) createdAt.$lte = new Date(endDate);
      filter.createdAt = createdAt;
    }

    const inquiries = await Help.find(filter).sort({ createdAt: -1 }).populate('userId', 'name email employeeId').lean();

    // User.name is not always populated, so fall back to the Employee record —
    // the same resolution the regularization list does.
    const employeeIds = [...new Set(
      inquiries.map(i => (i.userId as { employeeId?: string } | null)?.employeeId).filter(Boolean)
    )];
    const employees = await Employee.find({ employeeId: { $in: employeeIds } })
      .select('employeeId firstName lastName')
      .lean();
    const employeeMap = new Map(employees.map(e => [`${e.employeeId}`, `${e.firstName} ${e.lastName}`]));

    const withNames = inquiries.map(inquiry => {
      const populated = inquiry.userId as { name?: string; employeeId?: string } | null;
      return {
        ...inquiry,
        employeeName:
          (populated?.employeeId ? employeeMap.get(populated.employeeId) : undefined) ||
          populated?.name ||
          'Unknown User',
      };
    });

    res.json(formatResponse(true, 'All inquiries retrieved successfully', { inquiries: withNames }));
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Get all inquiries error');
    res.status(500).json(
      formatResponse(false, 'Failed to retrieve inquiries', null, {
        server: error.message,
      })
    );
  }
};

/**
 * Update inquiry status/response
 */
export const updateInquiry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { inquiryId } = req.params;
    const { status, response } = req.body as UpdateInquiryInput;

    const inquiry = await Help.findById(inquiryId);

    if (!inquiry) {
      res.status(404).json(formatResponse(false, 'Inquiry not found'));
      return;
    }

    // Update fields if provided
    if (status) inquiry.status = status;
    if (response && req.user) {
      inquiry.response = response;
      inquiry.respondedBy = req.user._id;
    }

    await inquiry.save();

    res.json(formatResponse(true, 'Inquiry updated successfully', { inquiry }));
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Update inquiry error');
    res.status(500).json(
      formatResponse(false, 'Failed to update inquiry', null, {
        server: error.message,
      })
    );
  }
};
