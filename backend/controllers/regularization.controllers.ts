import type { Response } from 'express';
import RegularizationRequest from '../models/Regularization.model.js';
import User from '../models/User.model.js';
import Attendance from '../models/Attendance.model.js';
import Employee from '../models/Employee.model.js';
import { DateTime } from 'luxon';
import { getISTDayBoundaries, toIST, getISTNow } from '../utils/timezone.js';
import { invalidateAttendanceCache, invalidateDashboardCache } from '../utils/cacheInvalidation.js';
import { AttendanceBusinessService } from '../services/attendance/AttendanceBusinessService.js';
import NotificationService from '../services/notificationService.js';
import logger from '../utils/logger.js';
import type { IAuthRequest } from '../types/index.js';
import type { RegularizationStatus } from '../types/index.js';

export const requestRegularization = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { date, requestedCheckIn, requestedCheckOut, reason } = req.body as {
      date: string;
      requestedCheckIn?: string;
      requestedCheckOut?: string;
      reason: string;
    };

    const user = req.user;
    if (!user || !user.employeeId) {
      res.status(400).json({ message: 'You must be linked to an employee profile to request regularization.' });
      return;
    }

    const dateIST = toIST(date).startOf('day').toJSDate();

    let requestedCheckInIST: Date | undefined = undefined;
    let requestedCheckOutIST: Date | undefined = undefined;

    if (requestedCheckIn) {
      let parsedCheckIn: DateTime;
      if (requestedCheckIn.includes('T') || requestedCheckIn.includes(' ') || requestedCheckIn.length > 8) {
        parsedCheckIn = toIST(requestedCheckIn);
      } else {
        parsedCheckIn = toIST(date + ' ' + requestedCheckIn);
      }

      if (!parsedCheckIn.isValid) {
        res.status(400).json({
          message: `Invalid check-in time format: ${requestedCheckIn}`
        });
        return;
      }

      requestedCheckInIST = parsedCheckIn.toJSDate();
    }

    if (requestedCheckOut) {
      let parsedCheckOut: DateTime;
      if (requestedCheckOut.includes('T') || requestedCheckOut.includes(' ') || requestedCheckOut.length > 8) {
        parsedCheckOut = toIST(requestedCheckOut);
      } else {
        parsedCheckOut = toIST(date + ' ' + requestedCheckOut);
      }

      if (!parsedCheckOut.isValid) {
        res.status(400).json({
          message: `Invalid check-out time format: ${requestedCheckOut}`
        });
        return;
      }

      requestedCheckOutIST = parsedCheckOut.toJSDate();
    }

    const regularizationDateStr = toIST(date).toFormat('yyyy-MM-dd');

    if (requestedCheckInIST) {
      const checkInDateStr = toIST(requestedCheckInIST).toFormat('yyyy-MM-dd');
      if (checkInDateStr !== regularizationDateStr) {
        res.status(400).json({
          message: `Check-in time must be on the regularization date (${regularizationDateStr}). Got: ${checkInDateStr}`
        });
        return;
      }
    }

    if (requestedCheckOutIST) {
      const checkOutDateStr = toIST(requestedCheckOutIST).toFormat('yyyy-MM-dd');
      if (checkOutDateStr !== regularizationDateStr) {
        res.status(400).json({
          message: `Check-out time must be on the regularization date (${regularizationDateStr}). Got: ${checkOutDateStr}`
        });
        return;
      }
    }

    if (requestedCheckInIST && requestedCheckOutIST) {
      if (requestedCheckInIST >= requestedCheckOutIST) {
        res.status(400).json({
          message: 'Check-in time must be before check-out time'
        });
        return;
      }
    }

    const existing = await RegularizationRequest.findOne({ employeeId: user.employeeId, date: dateIST, status: 'pending' });
    if (existing) {
      existing.requestedCheckIn = requestedCheckInIST;
      existing.requestedCheckOut = requestedCheckOutIST;
      existing.reason = reason;
      await existing.save();
      res.status(200).json({ success: true, message: 'Regularization request updated.', reg: existing });
      return;
    }

    const reg = await RegularizationRequest.create({
      employeeId: user.employeeId,
      user: user._id,
      date: dateIST,
      requestedCheckIn: requestedCheckInIST,
      requestedCheckOut: requestedCheckOutIST,
      reason
    });

    const userInfo = await User.findById(user._id);

    NotificationService.notifyHR('regularization_request', {
      employee: userInfo ? userInfo.name : 'Unknown User',
      employeeId: user.employeeId,
      date,
      checkIn: requestedCheckIn || 'Not specified',
      checkOut: requestedCheckOut || 'Not specified',
      reason
    }).catch((error: unknown) => {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err }, 'Failed to send regularization request notification');
    });

    res.status(201).json({ success: true, message: 'Regularization request submitted.', reg });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Failed to submit regularization request');
    res.status(500).json({ message: 'Failed to submit regularization request', error: error.message });
  }
};

export const getMyRegularizations = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.employeeId) {
      res.status(400).json({ message: 'You must be linked to an employee profile.' });
      return;
    }

    const regs = await RegularizationRequest.find({ employeeId: user.employeeId }).sort({ createdAt: -1 });
    res.json({ success: true, regs });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Failed to fetch regularization requests');
    res.status(500).json({ message: 'Failed to fetch regularization requests', error: error.message });
  }
};

export const getAllRegularizations = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== 'hr' && req.user.role !== 'admin')) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }
    const regs = await RegularizationRequest.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, regs });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Failed to fetch all regularization requests');
    res.status(500).json({ message: 'Failed to fetch all regularization requests', error: error.message });
  }
};

export const reviewRegularization = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== 'hr' && req.user.role !== 'admin')) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    const { id } = req.params;
    const { status, reviewComment } = req.body as { status: string; reviewComment?: string };

    if (!id) {
      res.status(400).json({ message: 'Request ID is required' });
      return;
    }

    if (!status) {
      res.status(400).json({ message: 'Status is required' });
      return;
    }

    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ message: `Invalid status: ${status}. Must be 'approved' or 'rejected'` });
      return;
    }

    const reg = await RegularizationRequest.findById(id);
    if (!reg) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    if (reg.status !== 'pending') {
      res.status(400).json({ message: 'Request already reviewed' });
      return;
    }

    reg.status = status as RegularizationStatus;
    reg.reviewedBy = req.user._id;
    reg.reviewComment = reviewComment || '';
    await reg.save();

    if (status === 'approved') {
      logger.info({ id, employeeId: reg.employeeId, date: reg.date }, 'Processing regularization approval');

      const employeeDoc = await Employee.findOne({ employeeId: reg.employeeId });
      if (!employeeDoc) {
        logger.error({ employeeId: reg.employeeId }, 'Employee not found for regularization');
        res.status(404).json({ message: 'Employee not found for regularization.' });
        return;
      }

      const checkInTime = reg.requestedCheckIn;
      const checkOutTime = reg.requestedCheckOut;

      if (!checkInTime && !checkOutTime) {
        logger.error('No check-in or check-out time provided');
        res.status(400).json({ message: 'At least check-in or check-out time must be provided for regularization.' });
        return;
      }

      if (checkInTime && checkOutTime && checkInTime >= checkOutTime) {
        logger.error('Check-in time must be before check-out time');
        res.status(400).json({ message: 'Check-in time must be before check-out time.' });
        return;
      }

      logger.info({ checkIn: checkInTime, checkOut: checkOutTime, date: reg.date }, 'Regularization times');

      const { startOfDay, endOfDay } = getISTDayBoundaries(reg.date);

      let att = await Attendance.findOne({
        employee: employeeDoc._id,
        date: {
          $gte: startOfDay.toJSDate(),
          $lte: endOfDay.toJSDate()
        }
      });

      if (!att && !checkInTime) {
        logger.error('No existing attendance record and no check-in time provided');
        res.status(400).json({
          message: 'Check-in time is required when no existing attendance record exists for the date.'
        });
        return;
      }

      logger.info({
        regularizationDate: reg.date,
        startOfDay: startOfDay.toJSDate(),
        endOfDay: endOfDay.toJSDate(),
        foundAttendance: !!att,
        attendanceDate: att?.date
      }, 'Date matching');

      if (!att) {
        const attendanceData = {
          employee: employeeDoc._id,
          employeeName: `${employeeDoc.firstName} ${employeeDoc.lastName}`,
          date: startOfDay.toJSDate(),
          checkIn: checkInTime,
          checkOut: checkOutTime,
          status: 'present' as const,
          comments: 'Regularized by HR/Admin',
          reason: 'Regularized by HR/Admin'
        };

        logger.info({ attendanceData }, 'Creating new attendance record');
        att = await Attendance.create(attendanceData);
        logger.info({ id: att._id }, 'Created attendance record');
      } else {
        logger.info({ id: att._id }, 'Updating existing attendance record');

        if (checkInTime) {
          att.checkIn = checkInTime;
          logger.info({ checkIn: checkInTime }, 'Updated check-in');
        }

        if (checkOutTime) {
          att.checkOut = checkOutTime;
          logger.info({ checkOut: checkOutTime }, 'Updated check-out');
        }

        att.reason = 'Regularized by HR/Admin';
        att.comments = 'Regularized by HR/Admin';

        if (!att.employeeName) {
          att.employeeName = `${employeeDoc.firstName} ${employeeDoc.lastName}`;
        }

        await att.save();
        logger.info('Updated attendance record saved');
      }

      if (att.checkIn && att.checkOut) {
        const statusResult = await AttendanceBusinessService.calculateFinalStatus(att.checkIn, att.checkOut);

        att.status = statusResult.status;
        att.workHours = statusResult.workHours;

        await att.save();
        logger.info({ status: att.status, workHours: att.workHours, flags: statusResult.flags }, 'Final attendance status');
      } else if (att.checkIn && !att.checkOut) {
        const statusResult = await AttendanceBusinessService.determineAttendanceStatus(att.checkIn, null);
        att.status = statusResult.status;

        await att.save();
        logger.info({ status: att.status, flags: statusResult.flags }, 'Attendance updated with check-in only');
      }

      try {
        logger.info({ employeeId: employeeDoc.employeeId }, 'Invalidating cache');
        invalidateAttendanceCache(employeeDoc.employeeId);
        invalidateDashboardCache();
      } catch (cacheError) {
        const err = cacheError instanceof Error ? cacheError : new Error('Unknown error');
        logger.error({ err }, 'Error invalidating cache (non-critical)');
      }
    }

    try {
      if (reg.employeeId) {
        NotificationService.notifyEmployee(reg.employeeId, 'regularization_status_update', {
          status,
          date: reg.date ? reg.date.toDateString() : 'Unknown date',
          checkIn: reg.requestedCheckIn ? reg.requestedCheckIn.toLocaleString() : 'Not specified',
          checkOut: reg.requestedCheckOut ? reg.requestedCheckOut.toLocaleString() : 'Not specified',
          reason: reg.reason || 'No reason provided',
          comment: reviewComment || 'No comment'
        }).catch((error: unknown) => {
          const err = error instanceof Error ? error : new Error('Unknown error');
          logger.error({ err }, 'Failed to send regularization status notification');
        });
      }
    } catch (notificationError) {
      const err = notificationError instanceof Error ? notificationError : new Error('Unknown error');
      logger.error({ err }, 'Error in notification service (non-critical)');
    }

    res.json({ success: true, message: `Request ${status}`, reg });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({
      err: error,
      stack: error.stack,
      requestId: req.params.id,
      status: req.body.status,
      reviewComment: req.body.reviewComment
    }, 'Detailed error in reviewRegularization');
    res.status(500).json({
      message: 'Failed to review request',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
