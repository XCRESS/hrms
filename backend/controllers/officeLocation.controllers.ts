import type { CreateOfficeLocationInput, UpdateOfficeLocationInput } from '../validators/content.schemas.js';
import type { Response } from 'express';
import OfficeLocation, {
  DEFAULT_GEOFENCE_RADIUS_METERS,
  MIN_GEOFENCE_RADIUS_METERS,
  MAX_GEOFENCE_RADIUS_METERS,
} from '../models/OfficeLocation.model.js';
import { formatResponse } from '../utils/attendance/attendanceHelpers.js';
import { BusinessLogicError } from '../utils/attendance/attendanceErrorHandler.js';
import { HTTP_STATUS } from '../utils/attendance/attendanceConstants.js';
import GeofenceService from '../services/GeofenceService.js';
import settingsService from '../services/settings/SettingsService.js';
import logger from '../utils/logger.js';
import type { IAuthRequest } from '../types/index.js';

const getDefaultRadius = async (): Promise<number> => {
  const effectiveSettings = await settingsService.getEffectiveSettings();
  const general = effectiveSettings.general as { geofence?: { defaultRadius?: number } } | undefined;
  const configured = general?.geofence?.defaultRadius;
  // `??` not `||`: a configured 0 should fail validation loudly rather than be
  // silently replaced by the built-in default.
  return typeof configured === 'number' ? configured : DEFAULT_GEOFENCE_RADIUS_METERS;
};

/** Shape of an OfficeLocation as returned by `.lean()` (virtuals stripped). */
interface LeanOfficeLocation {
  location?: { type?: string; coordinates?: number[] };
  [key: string]: unknown;
}

/**
 * Reject a radius outside the model's bounds with a 400 rather than letting it
 * reach Mongoose, which would surface the same problem as an opaque 500.
 */
const assertRadiusInRange = (radius: number): void => {
  if (
    !Number.isFinite(radius) ||
    radius < MIN_GEOFENCE_RADIUS_METERS ||
    radius > MAX_GEOFENCE_RADIUS_METERS
  ) {
    throw new BusinessLogicError(
      `Radius must be between ${MIN_GEOFENCE_RADIUS_METERS} and ${MAX_GEOFENCE_RADIUS_METERS} meters`,
      { radius, min: MIN_GEOFENCE_RADIUS_METERS, max: MAX_GEOFENCE_RADIUS_METERS }
    );
  }
};

/**
 * Restore the `coordinates` shape on a lean document.
 *
 * `.lean()` skips virtuals, and `coordinates` is now a virtual over the stored
 * GeoJSON `location`. Without this the list endpoints would return `location`
 * and every client reading `coordinates` would see undefined. Reads stay lean
 * per the project convention; only the response shape is reassembled here.
 */
const serializeLocation = (doc: LeanOfficeLocation) => {
  const { location, ...rest } = doc;
  const point = location?.coordinates;
  const hasPoint = Array.isArray(point) && point.length === 2;

  return {
    ...rest,
    coordinates: hasPoint
      ? { latitude: point[1], longitude: point[0] }
      : null,
  };
};

export const getOfficeLocations = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const filter: { isActive?: boolean } = {};
    if (req.query.active !== undefined) {
      filter.isActive = req.query.active === 'true';
    }

    const locations = (await OfficeLocation.find(filter)
      .sort({ createdAt: -1 })
      .lean()) as unknown as LeanOfficeLocation[];

    res.json(
      formatResponse(true, 'Office locations retrieved', {
        locations: locations.map(serializeLocation)
      })
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Failed to fetch office locations');
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        formatResponse(false, 'Failed to fetch office locations', null, {
          server: err.message
        })
      );
  }
};

export const getActiveOfficeLocations = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const locations = (await OfficeLocation.find({ isActive: true })
      .sort({ name: 1 })
      .lean()) as unknown as LeanOfficeLocation[];

    res.json(
      formatResponse(true, 'Active office locations retrieved', {
        locations: locations.map(serializeLocation)
      })
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Failed to fetch active office locations');
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        formatResponse(false, 'Failed to fetch office locations', null, {
          server: err.message
        })
      );
  }
};

export const createOfficeLocation = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { name, address, latitude, longitude, radius, isActive } = req.body as CreateOfficeLocationInput;

    if (!name || latitude === undefined || longitude === undefined) {
      throw new BusinessLogicError(
        'Name, latitude and longitude are required',
        { missingFields: ['name', 'latitude', 'longitude'] }
      );
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!GeofenceService.validateCoordinates(lat, lng)) {
      throw new BusinessLogicError('Invalid coordinates provided', {
        latitude,
        longitude
      });
    }

    // `??` not `||`: an explicit radius of 0 is invalid input to reject below,
    // not a signal to fall back to the configured default.
    const effectiveRadius = radius ?? (await getDefaultRadius());
    assertRadiusInRange(effectiveRadius);

    const location = await OfficeLocation.create({
      name,
      address,
      coordinates: { latitude: lat, longitude: lng },
      radius: effectiveRadius,
      isActive,
      createdBy: req.user?._id
    });

    GeofenceService.invalidateOfficeCache();

    res
      .status(HTTP_STATUS.CREATED)
      .json(formatResponse(true, 'Office location created', { location }));
  } catch (error) {
    const err = error as { statusCode?: number; message?: string; details?: unknown };
    if (error instanceof BusinessLogicError) {
      res.status(err.statusCode || 400).json(formatResponse(false, err.message || 'Error', null, err.details));
      return;
    }

    const logErr = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err: logErr }, 'Failed to create office location');
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        formatResponse(false, 'Failed to create office location', null, {
          server: logErr.message
        })
      );
  }
};

export const updateOfficeLocation = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { locationId } = req.params;
    const updates = { ...(req.body as UpdateOfficeLocationInput) };

    // Also fires when only a nested `coordinates` object was sent - the schema
    // permits that form, and it must not bypass coordinate validation.
    const hasCoordinateUpdate =
      updates.latitude !== undefined ||
      updates.longitude !== undefined ||
      updates.coordinates !== undefined;

    if (hasCoordinateUpdate) {
      const lat = updates.latitude ?? updates.coordinates?.latitude;
      const lng = updates.longitude ?? updates.coordinates?.longitude;

      // A half-supplied pair would otherwise coerce to NaN and be rejected with
      // a misleading "invalid coordinates"; say what is actually wrong.
      if (lat === undefined || lat === null || lng === undefined || lng === null) {
        throw new BusinessLogicError(
          'Both latitude and longitude must be provided when updating coordinates',
          { latitude: lat ?? null, longitude: lng ?? null }
        );
      }

      if (!GeofenceService.validateCoordinates(Number(lat), Number(lng))) {
        throw new BusinessLogicError('Invalid coordinates provided', {
          latitude: lat,
          longitude: lng
        });
      }

      updates.coordinates = {
        latitude: Number(lat),
        longitude: Number(lng)
      };
      delete updates.latitude;
      delete updates.longitude;
    }

    if (updates.radius !== undefined && updates.radius !== null) {
      updates.radius = Number(updates.radius);
      assertRadiusInRange(updates.radius);
    }

    // Load-and-save rather than findByIdAndUpdate: `coordinates` is a virtual
    // over the stored GeoJSON, and query-level updates bypass virtual setters -
    // the update would persist a stray `coordinates` field and leave the real
    // `location` point untouched.
    const location = await OfficeLocation.findById(locationId);

    if (!location) {
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          formatResponse(false, 'Office location not found', null, {
            locationId
          })
        );
      return;
    }

    const { coordinates, ...scalarUpdates } = updates;

    for (const [key, value] of Object.entries(scalarUpdates)) {
      if (value !== undefined) {
        location.set(key, value);
      }
    }

    if (coordinates) {
      location.set('coordinates', coordinates);
    }

    await location.save();

    GeofenceService.invalidateOfficeCache();

    res.json(formatResponse(true, 'Office location updated', { location }));
  } catch (error) {
    const err = error as { statusCode?: number; message?: string; details?: unknown };
    if (error instanceof BusinessLogicError) {
      res.status(err.statusCode || 400).json(formatResponse(false, err.message || 'Error', null, err.details));
      return;
    }

    const logErr = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err: logErr }, 'Failed to update office location');
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        formatResponse(false, 'Failed to update office location', null, {
          server: logErr.message
        })
      );
  }
};

export const deleteOfficeLocation = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { locationId } = req.params;
    const location = await OfficeLocation.findByIdAndDelete(locationId);

    if (!location) {
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          formatResponse(false, 'Office location not found', null, {
            locationId
          })
        );
      return;
    }

    GeofenceService.invalidateOfficeCache();

    res.json(
      formatResponse(true, 'Office location removed', {
        locationId
      })
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Failed to delete office location');
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        formatResponse(false, 'Failed to delete office location', null, {
          server: err.message
        })
      );
  }
};
