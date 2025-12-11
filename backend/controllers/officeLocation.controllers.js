import OfficeLocation from "../models/OfficeLocation.model.js";
import { formatResponse } from "../utils/attendance/attendanceHelpers.js";
import { BusinessLogicError } from "../utils/attendance/attendanceErrorHandler.js";
import { HTTP_STATUS } from "../utils/attendance/attendanceConstants.js";
import GeofenceService from "../services/GeofenceService.js";
import settingsService from "../services/settings/SettingsService.js";

const getDefaultRadius = async () => {
  const effectiveSettings = await settingsService.getEffectiveSettings();
  return (
    effectiveSettings?.general?.geofence?.defaultRadius ||
    100
  );
};

export const getOfficeLocations = async (req, res) => {
  try {
    const filter = {};
    if (req.query.active !== undefined) {
      filter.isActive = req.query.active === "true";
    }

    const locations = await OfficeLocation.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json(
      formatResponse(true, "Office locations retrieved", { locations })
    );
  } catch (error) {
    console.error("Failed to fetch office locations", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        formatResponse(false, "Failed to fetch office locations", null, {
          server: error.message,
        })
      );
  }
};

export const getActiveOfficeLocations = async (req, res) => {
  try {
    const locations = await OfficeLocation.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    res.json(
      formatResponse(true, "Active office locations retrieved", {
        locations,
      })
    );
  } catch (error) {
    console.error("Failed to fetch active office locations", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        formatResponse(false, "Failed to fetch office locations", null, {
          server: error.message,
        })
      );
  }
};

export const createOfficeLocation = async (req, res) => {
  try {
    const { name, address, latitude, longitude, radius, isActive = true } =
      req.body;

    if (!name || latitude === undefined || longitude === undefined) {
      throw new BusinessLogicError(
        "Name, latitude and longitude are required",
        { missingFields: ["name", "latitude", "longitude"] }
      );
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!GeofenceService.validateCoordinates(lat, lng)) {
      throw new BusinessLogicError("Invalid coordinates provided", {
        latitude,
        longitude,
      });
    }

    const effectiveRadius = radius || (await getDefaultRadius());

    const location = await OfficeLocation.create({
      name,
      address,
      coordinates: { latitude: lat, longitude: lng },
      radius: effectiveRadius,
      isActive,
      createdBy: req.user?._id,
    });

    res
      .status(HTTP_STATUS.CREATED)
      .json(formatResponse(true, "Office location created", { location }));
  } catch (error) {
    if (error instanceof BusinessLogicError) {
      return res
        .status(error.statusCode)
        .json(formatResponse(false, error.message, null, error.details));
    }

    console.error("Failed to create office location", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        formatResponse(false, "Failed to create office location", null, {
          server: error.message,
        })
      );
  }
};

export const updateOfficeLocation = async (req, res) => {
  try {
    const { locationId } = req.params;
    const updates = { ...req.body };

    if (updates.latitude !== undefined || updates.longitude !== undefined) {
      const lat = Number(
        updates.latitude ?? updates.coordinates?.latitude
      );
      const lng = Number(
        updates.longitude ?? updates.coordinates?.longitude
      );
      if (!GeofenceService.validateCoordinates(lat, lng)) {
        throw new BusinessLogicError("Invalid coordinates provided", {
          latitude: updates.latitude,
          longitude: updates.longitude,
        });
      }
      updates.coordinates = {
        latitude: lat,
        longitude: lng,
      };
      delete updates.latitude;
      delete updates.longitude;
    }

    if (updates.radius !== undefined) {
      updates.radius = Number(updates.radius);
      if (isNaN(updates.radius) || updates.radius < 50) {
        throw new BusinessLogicError("Radius must be at least 50 meters", {
          radius: updates.radius,
        });
      }
    }

    const location = await OfficeLocation.findByIdAndUpdate(
      locationId,
      updates,
      { new: true, runValidators: true }
    );

    if (!location) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          formatResponse(false, "Office location not found", null, {
            locationId,
          })
        );
    }

    res.json(formatResponse(true, "Office location updated", { location }));
  } catch (error) {
    if (error instanceof BusinessLogicError) {
      return res
        .status(error.statusCode)
        .json(formatResponse(false, error.message, null, error.details));
    }

    console.error("Failed to update office location", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        formatResponse(false, "Failed to update office location", null, {
          server: error.message,
        })
      );
  }
};

export const deleteOfficeLocation = async (req, res) => {
  try {
    const { locationId } = req.params;
    const location = await OfficeLocation.findByIdAndDelete(locationId);

    if (!location) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          formatResponse(false, "Office location not found", null, {
            locationId,
          })
        );
    }

    res.json(
      formatResponse(true, "Office location removed", {
        locationId,
      })
    );
  } catch (error) {
    console.error("Failed to delete office location", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        formatResponse(false, "Failed to delete office location", null, {
          server: error.message,
        })
      );
  }
};

// No default export - use named exports for consistency with other controllers




