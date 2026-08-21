/**
 * Container for the Geo Fence tab.
 *
 * Owns office-location fetching and mutations so SettingsPage does not have to
 * thread them through. GeofenceSettings stays presentational.
 */

import React, { useState } from 'react';
import {
  useOfficeLocations,
  useCreateOfficeLocation,
  useUpdateOfficeLocation,
  useDeleteOfficeLocation,
} from '@/hooks/queries';
import { useToast } from '../../ui/toast';
import { useConfirm } from '../../ui/confirm-dialog';
import type { OfficeLocation } from '@/types';
import GeofenceSettings from './GeofenceSettings';
import type { GeofenceSettings as GeofenceSettingsType, OfficeFormData } from './types';

interface GeofenceSectionProps {
  geofenceSettings: GeofenceSettingsType;
  onUpdateGeofence: (next: GeofenceSettingsType) => void;
  onSave: () => void;
  onReset: () => void;
  loading: boolean;
  saving: boolean;
  /** Gate the query on tab visibility. */
  enabled: boolean;
}

const GeofenceSection: React.FC<GeofenceSectionProps> = ({
  geofenceSettings,
  onUpdateGeofence,
  onSave,
  onReset,
  loading,
  saving,
  enabled,
}) => {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [creatingLocation, setCreatingLocation] = useState(false);

  const { data: officeLocations = [], isLoading: officeLoading } = useOfficeLocations({ enabled });

  const createOfficeLocation = useCreateOfficeLocation();
  const updateOfficeLocation = useUpdateOfficeLocation();
  const deleteOfficeLocation = useDeleteOfficeLocation();

  const showError = (err: unknown, title: string) => {
    const message = err instanceof Error ? err.message : 'Action failed';
    toast({ variant: 'destructive', title, description: message });
  };

  const handleCreateLocation = async (data: OfficeFormData) => {
    setCreatingLocation(true);
    try {
      await createOfficeLocation.mutateAsync({
        name: data.name,
        address: data.address,
        latitude: typeof data.latitude === 'string' ? parseFloat(data.latitude) : data.latitude,
        longitude: typeof data.longitude === 'string' ? parseFloat(data.longitude) : data.longitude,
        radius: data.radius,
        isActive: data.isActive,
      });
      toast({
        variant: 'success',
        title: 'Office Location Added',
        description: `${data.name} has been saved.`,
      });
    } catch (err) {
      showError(err, 'Failed to save location');
    } finally {
      setCreatingLocation(false);
    }
  };

  const handleToggleLocation = async (location: OfficeLocation) => {
    try {
      await updateOfficeLocation.mutateAsync({
        locationId: location._id,
        updates: { isActive: !location.isActive },
      });
      toast({
        variant: 'success',
        title: 'Office Updated',
        description: `${location.name} is now ${!location.isActive ? 'active' : 'inactive'}.`,
      });
    } catch (err) {
      showError(err, 'Failed to update office');
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    const confirmed = await confirm({
      title: 'Remove office location?',
      description: 'Are you sure you want to remove this office location? Employees will no longer be able to check in from this geofence.',
      confirmText: 'Remove',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteOfficeLocation.mutateAsync(locationId);
      toast({
        variant: 'success',
        title: 'Office Removed',
        description: 'The office location has been deleted.',
      });
    } catch (err) {
      showError(err, 'Failed to delete office');
    }
  };

  return (
    <GeofenceSettings
      geofenceSettings={geofenceSettings}
      officeLocations={officeLocations}
      onUpdateGeofence={onUpdateGeofence}
      onCreateLocation={handleCreateLocation}
      onDeleteLocation={handleDeleteLocation}
      onToggleLocation={handleToggleLocation}
      onSave={onSave}
      onReset={onReset}
      loading={loading}
      officeLoading={officeLoading}
      saving={saving}
      creatingLocation={creatingLocation}
    />
  );
};

export default GeofenceSection;
