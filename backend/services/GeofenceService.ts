import { getDistance, isValidCoordinate } from 'geolib';
import OfficeLocation from '../models/OfficeLocation.model.js';
import type { IOfficeLocationDoc } from '../models/OfficeLocation.model.js';

interface GeofenceResult {
  isValid: boolean;
  nearestOffice: IOfficeLocationDoc | null;
  distance: number | null;
}

interface NearestOfficeResult {
  office: IOfficeLocationDoc | null;
  distance: number | null;
}

class GeofenceService {
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
   * Get all active office locations
   * @returns Array of active office locations
   */
  static async getActiveOfficeLocations(): Promise<IOfficeLocationDoc[]> {
    return OfficeLocation.find({ isActive: true });
  }

  /**
   * Find the nearest office to given coordinates
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
      const distance = this.calculateDistance(
        latitude,
        longitude,
        office.coordinates.latitude,
        office.coordinates.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestOffice = office;
      }
    }

    return { office: nearestOffice, distance: minDistance };
  }

  /**
   * Check if coordinates are within geofence radius of nearest office
   * @param latitude User's latitude
   * @param longitude User's longitude
   * @param radius Optional custom radius (uses office radius if not provided)
   * @returns Geofence validation result
   */
  static async isWithinGeofence(latitude: number, longitude: number, radius: number | null = null): Promise<GeofenceResult> {
    if (!this.validateCoordinates(latitude, longitude)) {
      return { isValid: false, nearestOffice: null, distance: null };
    }

    const { office, distance } = await this.findNearestOffice(latitude, longitude);
    if (!office || distance === null) {
      return { isValid: false, nearestOffice: null, distance: null };
    }

    const effectiveRadius = radius ?? office.radius;
    const GEOFENCE_TOLERANCE_METERS = 10; // Add a 10 meter buffer
    const isValid = distance <= (effectiveRadius + GEOFENCE_TOLERANCE_METERS);

    return { isValid, nearestOffice: office, distance };
  }
}

export default GeofenceService;
