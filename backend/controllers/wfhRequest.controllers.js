import moment from "moment-timezone";
import WFHRequest from "../models/WFHRequest.model.js";
import Employee from "../models/Employee.model.js";
import Attendance from "../models/Attendance.model.js";
import { formatResponse } from "../utils/attendance/attendanceHelpers.js";
import {
  BusinessLogicError,
  NotFoundError,
} from "../utils/attendance/attendanceErrorHandler.js";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
} from "../utils/attendance/attendanceConstants.js";
import {
  getEmployeeObjectId,
} from "../utils/attendance/index.js";
import { getISTDayBoundaries, toIST } from "../utils/timezoneUtils.js";
import GeofenceService from "../services/GeofenceService.js";

const buildTodayFilter = (date = new Date()) => {
  const { startOfDay, endOfDay } = getISTDayBoundaries(date);
  return {
    $gte: startOfDay.toDate(),
    $lte: endOfDay.toDate(),
  };
};

export const createWFHRequest = async (req, res) => {
  try {
    const { reason, latitude, longitude, capturedAt } = req.body;

    if (!reason || reason.trim().length < 10) {
      throw new BusinessLogicError(
        "Please provide a detailed reason (at least 10 characters)",
        { field: "reason" }
      );
    }

    if (!capturedAt || !Date.parse(capturedAt)) {
      throw new BusinessLogicError("Valid check-in time (capturedAt) is required.");
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
      status: { $in: ["pending", "approved"] },
    });

    if (existingRequest) {
      throw new BusinessLogicError(
        "A WFH request already exists for this date",
        { requestId: existingRequest._id }
      );
    }


    const istMoment = toIST(capturedAtDate);
    const requestDate = moment.utc([istMoment.year(), istMoment.month(), istMoment.date()]).toDate();
    const lat = latitude !== undefined ? Number(latitude) : undefined;
    const lng = longitude !== undefined ? Number(longitude) : undefined;

    let nearestOffice = null;
    let distance = null;
    if (
      lat !== undefined &&
      lng !== undefined &&
      GeofenceService.validateCoordinates(lat, lng)
    ) {
      const lookup = await GeofenceService.findNearestOffice(lat, lng);
      if (lookup.office) {
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
          ? { latitude: lat, longitude: lng }
          : undefined,
      nearestOffice,
      distanceFromOffice: distance,
    });
    res
      .status(HTTP_STATUS.CREATED)
      .json(
        formatResponse(true, "WFH request submitted", {
          request: wfhRequest,
        })
      );
  } catch (error) {
    if (error instanceof BusinessLogicError || error instanceof NotFoundError) {
      return res
        .status(error.statusCode)
        .json(formatResponse(false, error.message, null, error.details));
    }

    console.error("Failed to create WFH request", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        formatResponse(false, "Failed to submit WFH request", null, {
          server: error.message,
        })
      );
  }
};

export const getMyWFHRequests = async (req, res) => {
  try {
    const employeeObjId = await getEmployeeObjectId(req.user);
    if (!employeeObjId) {
      throw new BusinessLogicError(ERROR_MESSAGES.NO_EMPLOYEE_PROFILE);
    }

    const requests = await WFHRequest.find({ employee: employeeObjId })
      .sort({ createdAt: -1 })
      .lean();

    res.json(
      formatResponse(true, "WFH requests retrieved", {
        requests,
      })
    );
  } catch (error) {
    if (error instanceof BusinessLogicError) {
      return res
        .status(error.statusCode)
        .json(formatResponse(false, error.message, null, error.details));
    }
    console.error("Failed to fetch WFH requests", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        formatResponse(false, "Failed to fetch WFH requests", null, {
          server: error.message,
        })
      );
  }
};

export const getWFHRequests = async (req, res) => {
  try {
    const { status, employeeId } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (employeeId) {
      filter.employeeId = employeeId;
    }

    const requests = await WFHRequest.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json(
      formatResponse(true, "WFH requests retrieved", {
        requests,
      })
    );
  } catch (error) {
    console.error("Failed to fetch WFH requests", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        formatResponse(false, "Failed to fetch WFH requests", null, {
          server: error.message,
        })
      );
  }
};

export const reviewWFHRequest = async (req, res) => {
  try {

    const { requestId } = req.params;

    const { status, reviewComment } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      throw new BusinessLogicError(
        "Status must be either approved or rejected",
        { status }
      );
    }

    const request = await WFHRequest.findById(requestId);
    if (!request) {
      throw new NotFoundError("WFH request not found", { requestId });
    }

    if (request.status !== "pending") {
      throw new BusinessLogicError(
        "Only pending requests can be updated",
        { status: request.status }
      );
    }

    if (status === 'approved') {
      // Check for existing attendance record first (like regularization does)
      const { startOfDay, endOfDay } = getISTDayBoundaries(request.requestDate);

      let existingAttendance = await Attendance.findOne({
        employee: request.employee,
        date: {
          $gte: startOfDay.toDate(),
          $lte: endOfDay.toDate()
        }
      });

      if (existingAttendance) {
        // Update existing attendance to mark as WFH
        existingAttendance.geofence = {
          enforced: true,
          status: 'wfh',
          wfhRequest: request._id,
          officeName: request.nearestOffice,
          distance: request.distanceFromOffice,
          validatedAt: new Date(),
          notes: 'Work From Home - Approved after check-in'
        };

        // Update location if WFH request has location but attendance doesn't
        if (request.attemptedLocation && !existingAttendance.location) {
          existingAttendance.location = request.attemptedLocation;
        }

        await existingAttendance.save();
        request.consumedAt = new Date();
        request.consumedAttendance = existingAttendance._id;
      } else {
        // Create new attendance record
        const newAttendance = await Attendance.create({
          employee: request.employee,
          employeeName: request.employeeName,
          date: startOfDay.toDate(),
          checkIn: request.requestedCheckInTime,
          status: 'present',
          location: request.attemptedLocation,
          geofence: {
            enforced: true,
            status: 'wfh',
            wfhRequest: request._id,
            officeName: request.nearestOffice,
            distance: request.distanceFromOffice,
            validatedAt: new Date(),
            notes: 'Work From Home - Approved'
          }
        });

        request.consumedAt = new Date();
        request.consumedAttendance = newAttendance._id;
      }
    }

    request.status = status;
    request.reviewComment = reviewComment;
    request.reviewedAt = new Date();
    request.approvedBy = req.user._id;
    await request.save();

    res.json(
      formatResponse(true, "WFH request updated", {
        request,
      })
    );
  } catch (error) {
    if (error instanceof BusinessLogicError || error instanceof NotFoundError) {
      return res
        .status(error.statusCode)
        .json(formatResponse(false, error.message, null, error.details));
    }
    console.error("Failed to review WFH request", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        formatResponse(false, "Failed to review WFH request", null, {
          server: error.message,
        })
      );
  }
};

export default {
  createWFHRequest,
  getMyWFHRequests,
  getWFHRequests,
  reviewWFHRequest,
};





