import OfficeLocation from "../models/OfficeLocation.model.js";

class GeofenceService {
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  static validateCoordinates(latitude, longitude) {
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return false;
    }

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return false;
    }

    if (latitude < -90 || latitude > 90) {
      return false;
    }

    if (longitude < -180 || longitude > 180) {
      return false;
    }

    return true;
  }

  static async getActiveOfficeLocations() {
    return OfficeLocation.find({ isActive: true });
  }

  static async findNearestOffice(latitude, longitude) {
    if (!this.validateCoordinates(latitude, longitude)) {
      return { office: null, distance: null };
    }

    const offices = await this.getActiveOfficeLocations();
    if (!offices.length) {
      return { office: null, distance: null };
    }

    let nearestOffice = null;
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

  static async isWithinGeofence(latitude, longitude, radius = null) {
    if (!this.validateCoordinates(latitude, longitude)) {
      return { isValid: false, nearestOffice: null, distance: null };
    }

    const { office, distance } = await this.findNearestOffice(latitude, longitude);
    if (!office) {
      return { isValid: false, nearestOffice: null, distance: null };
    }

    const effectiveRadius = radius ?? office.radius;
    const GEOFENCE_TOLERANCE_METERS = 10; // Add a 10 meter buffer
    const isValid = distance <= (effectiveRadius + GEOFENCE_TOLERANCE_METERS);

    return { isValid, nearestOffice: office, distance };
  }
}

export default GeofenceService;




