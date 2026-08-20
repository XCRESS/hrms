import { getDistance, isValidCoordinate } from 'geolib';
import OfficeLocation, {
  DEFAULT_GEOFENCE_RADIUS_METERS,
  MAX_GEOFENCE_RADIUS_METERS,
} from '../models/OfficeLocation.model.js';
import type { IOfficeLocationDoc } from '../models/OfficeLocation.model.js';
import logger from '../utils/logger.js';

interface GeofenceResult {
  isValid: boolean;
  /** The office the decision was made against: the matched one, else the nearest. */
  nearestOffice: IOfficeLocationDoc | null;
  distance: number | null;
  /** Set when the fix was too imprecise to judge containment either way. */
  accuracyRejected?: boolean;
  /** The accuracy actually credited against the radius, in meters. */
  appliedTolerance?: number;
}

interface NearestOfficeResult {
  office: IOfficeLocationDoc | null;
  distance: number | null;
}

/**
 * A GPS fix reporting worse accuracy than this tells us nothing useful about
 * containment in a 50-500m geofence - a desktop Wi-Fi/IP fix is routinely
 * kilometers off. Rather than silently pass or fail such a fix, callers surface
 * it as "retry outdoors".
 */
export const MAX_TRUSTED_ACCURACY_METERS = 100;

/**
 * Floor on the tolerance credited to a fix. Even a fix claiming 1m accuracy
 * carries some error, and offices are polygons approximated by a circle.
 */
const MIN_TOLERANCE_METERS = 10;

/** Office rows change on the order of twice a year; every check-in reads them. */
const OFFICE_CACHE_TTL_MS = 5 * 60 * 1000;

class GeofenceService {
  private static officeCache: IOfficeLocationDoc[] | null = null;
  private static officeCacheExpiry = 0;

  /**
   * Calculate distance between two coordinates using geolib
   * @param lat1 Latitude of first point
   * @param lon1 Longitude of first point
   * @param lat2 Latitude of second point
   * @param lon2 Longitude of second point
   * @returns Distance in meters
   */
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return getDistance(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    );
  }

  /**
   * Validate geographic coordinates using geolib
   * @param latitude Latitude value
   * @param longitude Longitude value
   * @returns true if coordinates are valid
   */
  static validateCoordinates(latitude: number, longitude: number): boolean {
    return isValidCoordinate({ latitude, longitude });
  }

  /**
   * How much slack to credit a fix, given its reported accuracy.
   *
   * A fix accurate to 40m that lands 30m outside the radius is plausibly inside;
   * refusing it punishes the honest employee for their building's GPS. Fixes
   * worse than MAX_TRUSTED_ACCURACY_METERS are not credited here - they are
   * rejected upstream instead, since crediting them would make the fence
   * meaningless.
   */
  static toleranceForAccuracy(accuracy?: number | null): number {
    if (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy < 0) {
      return MIN_TOLERANCE_METERS;
    }
    return Math.max(MIN_TOLERANCE_METERS, Math.min(accuracy, MAX_TRUSTED_ACCURACY_METERS));
  }

  /** Drop the cached office list. Call after any office mutation. */
  static invalidateOfficeCache(): void {
    this.officeCache = null;
    this.officeCacheExpiry = 0;
  }

  /**
   * Get all active office locations
   * @returns Array of active office locations
   */
  static async getActiveOfficeLocations(): Promise<IOfficeLocationDoc[]> {
    if (this.officeCache && this.officeCacheExpiry > Date.now()) {
      return this.officeCache;
    }

    const offices = await OfficeLocation.find({ isActive: true });
    this.officeCache = offices;
    this.officeCacheExpiry = Date.now() + OFFICE_CACHE_TTL_MS;
    return offices;
  }

  /**
   * Find the nearest office to given coordinates.
   *
   * Scans the cached office list rather than issuing $near: the candidate set
   * is a handful of rows already held in memory, so a round trip per check-in
   * would cost more than the scan saves. The 2dsphere index earns its keep for
   * ad-hoc/geospatial queries and keeps the door open if the office count grows.
   *
   * @param latitude User's latitude
   * @param longitude User's longitude
   * @returns Nearest office and distance to it
   */
  static async findNearestOffice(latitude: number, longitude: number): Promise<NearestOfficeResult> {
    if (!this.validateCoordinates(latitude, longitude)) {
      return { office: null, distance: null };
    }

    const offices = await this.getActiveOfficeLocations();
    if (!offices.length) {
      return { office: null, distance: null };
    }

    let nearestOffice: IOfficeLocationDoc | null = null;
    let minDistance = Infinity;

    for (const office of offices) {
      const coordinates = office.coordinates;
      if (!coordinates) continue;

      const distance = this.calculateDistance(
        latitude,
        longitude,
        coordinates.latitude,
        coordinates.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestOffice = office;
      }
    }

    if (!nearestOffice) {
      return { office: null, distance: null };
    }

    return { office: nearestOffice, distance: minDistance };
  }

  /**
   * Check whether coordinates fall inside ANY active office geofence.
   *
   * Deliberately not "inside the nearest office's radius": with a small office
   * 300m away (radius 100m) and a large campus 400m away (radius 500m), the
   * user is legitimately inside the campus. Picking the nearest office first
   * and then testing its radius would reject them.
   *
   * @param latitude User's latitude
   * @param longitude User's longitude
   * @param radius Optional radius override applied to every office
   * @param accuracy Reported GPS accuracy in meters, used as the tolerance
   * @returns Geofence validation result
   */
  static async isWithinGeofence(
    latitude: number,
    longitude: number,
    radius: number | null = null,
    accuracy?: number | null
  ): Promise<GeofenceResult> {
    if (!this.validateCoordinates(latitude, longitude)) {
      return { isValid: false, nearestOffice: null, distance: null };
    }

    const offices = await this.getActiveOfficeLocations();
    if (!offices.length) {
      return { isValid: false, nearestOffice: null, distance: null };
    }

    const tooImprecise =
      typeof accuracy === 'number' &&
      Number.isFinite(accuracy) &&
      accuracy > MAX_TRUSTED_ACCURACY_METERS;
    const tolerance = this.toleranceForAccuracy(accuracy);

    let matchedOffice: IOfficeLocationDoc | null = null;
    let matchedDistance: number | null = null;
    let nearestOffice: IOfficeLocationDoc | null = null;
    let nearestDistance = Infinity;

    for (const office of offices) {
      const coordinates = office.coordinates;
      if (!coordinates) continue;

      const distance = this.calculateDistance(
        latitude,
        longitude,
        coordinates.latitude,
        coordinates.longitude
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestOffice = office;
      }

      const effectiveRadius = radius ?? office.radius ?? DEFAULT_GEOFENCE_RADIUS_METERS;
      if (distance <= effectiveRadius + tolerance) {
        // Prefer the closest containing office, so the recorded office is the
        // most plausible one when geofences overlap.
        if (matchedDistance === null || distance < matchedDistance) {
          matchedOffice = office;
          matchedDistance = distance;
        }
      }
    }

    if (!nearestOffice) {
      return { isValid: false, nearestOffice: null, distance: null };
    }

    // An imprecise fix cannot establish containment. Report it distinctly so
    // callers can say "retry outdoors" rather than "you are not at the office".
    if (tooImprecise) {
      return {
        isValid: false,
        nearestOffice: matchedOffice ?? nearestOffice,
        distance: matchedDistance ?? nearestDistance,
        accuracyRejected: true,
        appliedTolerance: tolerance,
      };
    }

    if (matchedOffice && matchedDistance !== null) {
      return {
        isValid: true,
        nearestOffice: matchedOffice,
        distance: matchedDistance,
        appliedTolerance: tolerance,
      };
    }

    return {
      isValid: false,
      nearestOffice,
      distance: nearestDistance,
      appliedTolerance: tolerance,
    };
  }

  /**
   * Ensure the 2dsphere index exists. Called once at startup so the first
   * check-in of the day does not race index creation.
   */
  static async ensureIndexes(): Promise<void> {
    try {
      await OfficeLocation.syncIndexes();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.warn({ err }, 'Failed to sync OfficeLocation geospatial indexes');
    }
  }
}

export { MAX_GEOFENCE_RADIUS_METERS, DEFAULT_GEOFENCE_RADIUS_METERS };
export default GeofenceService;
