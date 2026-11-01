import type { CreateWFHRequestInput, ReviewWFHRequestInput } from '../validators/request.schemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { Response } from 'express';
import WFHRequest from '../models/WFHRequest.model.js';
import Employee from '../models/Employee.model.js';
import Attendance from '../models/Attendance.model.js';
import { formatResponse } from '../utils/attendance/attendanceHelpers.js';
import { BusinessLogicError, NotFoundError } from '../utils/attendance/attendanceErrorHandler.js';
import { ERROR_MESSAGES, HTTP_STATUS } from '../utils/attendance/attendanceConstants.js';
import { getEmployeeObjectId } from '../utils/attendance/index.js';
import { getISTDayBoundaries, toIST } from '../utils/timezone.js';
import GeofenceService from '../services/GeofenceService.js';
import NotificationService from '../services/notificationService.js';
import type { IAuthRequest } from '../types/index.js';
import type { WFHStatus } from '../types/index.js';

const buildTodayFilter = (date = new Date()) => {
  const { startOfDay, endOfDay } = getISTDayBoundaries(date);
  return {
    $gte: startOfDay.toJSDate(),
    $lte: endOfDay.toJSDate()
  };
};

export const createWFHRequest = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { reason, latitude, longitude, accuracy, capturedAt } = req.body as CreateWFHRequestInput;

  if (!reason || reason.trim().length < 10) {
    throw new BusinessLogicError(
      'Please provide a detailed reason (at least 10 characters)',
      { field: 'reason' }
    );
  }

  if (!capturedAt || !Date.parse(capturedAt)) {
    throw new BusinessLogicError('Valid check-in time (capturedAt) is required.');
  }

  const employeeObjId = await getEmployeeObjectId(req.user);
  if (!employeeObjId) {
    throw new BusinessLogicError(ERROR_MESSAGES.NO_EMPLOYEE_PROFILE);
  }

  const employee = await Employee.findById(employeeObjId);
  if (!employee) {
    throw new NotFoundError(ERROR_MESSAGES.EMPLOYEE_NOT_FOUND);
  }

  const capturedAtDate = new Date(capturedAt);
  const existingRequest = await WFHRequest.findOne({
    employee: employeeObjId,
    requestDate: buildTodayFilter(capturedAtDate),
    status: { $in: ['pending', 'approved'] }
  });

  if (existingRequest) {
    throw new BusinessLogicError(
      'A WFH request already exists for this date',
      { requestId: existingRequest._id }
    );
  }

  const istMoment = toIST(capturedAtDate);
  const { startOfDay } = getISTDayBoundaries(istMoment);
  const requestDate = startOfDay.toJSDate();
  const lat = latitude !== undefined ? Number(latitude) : undefined;
  const lng = longitude !== undefined ? Number(longitude) : undefined;

  let nearestOffice: string | null = null;
  let distance: number | null = null;
  if (
    lat !== undefined &&
    lng !== undefined &&
    GeofenceService.validateCoordinates(lat, lng)
  ) {
    const lookup = await GeofenceService.findNearestOffice(lat, lng);
    if (lookup.office && lookup.distance !== null) {
      nearestOffice = lookup.office.name;
      distance = Math.round(lookup.distance);
    }
  }

  const wfhRequest = await WFHRequest.create({
    employee: employeeObjId,
    employeeId: employee.employeeId,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    requestDate,
    requestedCheckInTime: capturedAtDate,
    reason: reason.trim(),
    attemptedLocation:
      lat !== undefined && lng !== undefined
        ? { latitude: lat, longitude: lng, accuracy: accuracy ?? undefined }
        : undefined,
    nearestOffice,
    distanceFromOffice: distance
  });

  NotificationService.notifyHR('wfh_request', {
    employee: employee.firstName + ' ' + employee.lastName,
    employeeId: employee.employeeId,
    requestDate: `${istMoment.day.toString().padStart(2, '0')}-${istMoment.month.toString().padStart(2, '0')}-${istMoment.year}`,
    reason: reason.trim()
  });

  res
    .status(HTTP_STATUS.CREATED)
    .json(
      formatResponse(true, 'WFH request submitted', {
        request: wfhRequest
      })
    );
});

export const getMyWFHRequests = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const employeeObjId = await getEmployeeObjectId(req.user);
  if (!employeeObjId) {
    throw new BusinessLogicError(ERROR_MESSAGES.NO_EMPLOYEE_PROFILE);
  }

  const requests = await WFHRequest.find({ employee: employeeObjId })
    .sort({ createdAt: -1 })
    .lean();

  res.json(
    formatResponse(true, 'WFH requests retrieved', {
      requests
    })
  );
});

export const getWFHRequests = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { status, employeeId } = req.query;
  const filter: { status?: string; employee?: unknown } = {};

  if (status && typeof status === 'string') {
    filter.status = status;
  }
  if (employeeId && typeof employeeId === 'string') {
    const employee = await Employee.findOne({ employeeId }).select('_id').lean();
    if (!employee) {
      res.json(formatResponse(true, 'WFH requests retrieved', { requests: [] }));
      return;
    }
    filter.employee = employee._id;
  }

  const requests = await WFHRequest.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  res.json(
    formatResponse(true, 'WFH requests retrieved', {
      requests
    })
  );
});

export const reviewWFHRequest = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { requestId } = req.params;
  const { status, reviewComment } = req.body as ReviewWFHRequestInput;

  if (!['approved', 'rejected'].includes(status)) {
    throw new BusinessLogicError(
      'Status must be either approved or rejected',
      { status }
    );
  }

  const request = await WFHRequest.findById(requestId);
  if (!request) {
    throw new NotFoundError('WFH request not found', { requestId });
  }

  if (request.status !== 'pending') {
    throw new BusinessLogicError(
      'Only pending requests can be updated',
      { status: request.status }
    );
  }

  if (status === 'approved') {
    const { startOfDay, endOfDay } = getISTDayBoundaries(request.requestDate);

    const existingAttendance = await Attendance.findOne({
      employee: request.employee,
      date: {
        $gte: startOfDay.toJSDate(),
        $lte: endOfDay.toJSDate()
      }
    });

    if (existingAttendance) {
      existingAttendance.geofence = {
        enforced: true,
        status: 'wfh',
        wfhRequest: request._id as unknown as import('mongoose').Types.ObjectId,
        officeName: request.nearestOffice,
        distance: request.distanceFromOffice,
        validatedAt: new Date(),
        notes: 'Work From Home - Approved after check-in'
      };

      if (request.attemptedLocation && !existingAttendance.location) {
        existingAttendance.location = {
          latitude: request.attemptedLocation.latitude,
          longitude: request.attemptedLocation.longitude,
          accuracy: request.attemptedLocation.accuracy,
          capturedAt: request.requestedCheckInTime
        };
      }

      await existingAttendance.save();
      request.consumedAt = new Date();
      request.consumedAttendance = existingAttendance._id as unknown as typeof request.consumedAttendance;
    } else {
      const newAttendance = await Attendance.create({
        employee: request.employee,
        employeeName: request.employeeName,
        date: startOfDay.toJSDate(),
        checkIn: request.requestedCheckInTime,
        status: 'present',
        location: request.attemptedLocation ? {
          latitude: request.attemptedLocation.latitude,
          longitude: request.attemptedLocation.longitude,
          accuracy: request.attemptedLocation.accuracy,
          capturedAt: request.requestedCheckInTime
        } : undefined,
        geofence: {
          enforced: true,
          status: 'wfh',
          wfhRequest: request._id as unknown as import('mongoose').Types.ObjectId,
          officeName: request.nearestOffice,
          distance: request.distanceFromOffice,
          validatedAt: new Date(),
          notes: 'Work From Home - Approved'
        }
      });

      request.consumedAt = new Date();
      request.consumedAttendance = newAttendance._id as unknown as typeof request.consumedAttendance;
    }
  }

  if (!req.user) {
    throw new BusinessLogicError('Authentication required');
  }

  request.status = status as WFHStatus;
  request.reviewComment = reviewComment ?? undefined;
  request.reviewedAt = new Date();
  request.approvedBy = req.user._id;
  await request.save();

  void NotificationService.notifyEmployee(request.employee, 'wfh_status_update', {
    status,
    date: toIST(request.requestDate).toFormat('d LLL'),
    comment: reviewComment,
  });

  res.json(
    formatResponse(true, 'WFH request updated', {
      request
    })
  );
});
