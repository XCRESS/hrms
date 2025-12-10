import { describe, it, expect } from 'vitest';
import GeofenceService from '../../services/GeofenceService.js';

describe('GeofenceService', () => {
  it('calculates zero distance for identical coordinates', () => {
    const distance = GeofenceService.calculateDistance(12.9716, 77.5946, 12.9716, 77.5946);
    expect(distance).toBeCloseTo(0, 3);
  });

  it('validates coordinate ranges correctly', () => {
    expect(GeofenceService.validateCoordinates(12.9, 77.5)).toBe(true);
    expect(GeofenceService.validateCoordinates(-91, 77.5)).toBe(false);
    expect(GeofenceService.validateCoordinates(12.9, 181)).toBe(false);
  });
});




