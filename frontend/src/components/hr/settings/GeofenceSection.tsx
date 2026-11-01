/**
 * Container for the Geo Fence tab: owns office fetching and mutations so
 * GeofenceSettings stays presentational.
 */

import React from 'react';
import {
  useOfficeLocations,
  useCreateOfficeLocation,
  useUpdateOfficeLocation,
  useDeleteOfficeLocation,
} from '@/hooks/queries';
import { useToast } from '../../ui/toast';
import { useConfirm } from '../../ui/confirm-dialog';
import type { CreateOfficeLocationDto, OfficeLocation } from '@/types';
import GeofenceSettings from './GeofenceSettings';
import type { GeofenceSettings as GeofenceSettingsType } from './types';

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

  const { data: officeLocations = [], isLoading: officeLoading } = useOfficeLocations({ enabled });

  const createOfficeLocation = useCreateOfficeLocation();
  const updateOfficeLocation = useUpdateOfficeLocation();
  const deleteOfficeLocation = useDeleteOfficeLocation();

  const showError = (err: unknown, title: string) => {
    const message = err instanceof Error ? err.message : 'Action failed';
    toast({ variant: 'destructive', title, description: message });
  };

  const handleSaveOffice = async (data: CreateOfficeLocationDto, officeId?: string): Promise<boolean> => {
    try {
      if (officeId) {
        await updateOfficeLocation.mutateAsync({ locationId: officeId, updates: data });
      } else {
        await createOfficeLocation.mutateAsync(data);
      }
      toast({ variant: 'success', title: officeId ? 'Office updated' : 'Office added', description: data.name });
      return true;
    } catch (err) {
      showError(err, 'Failed to save office');
      return false;
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
        title: 'Office updated',
        description: `${location.name} is now ${!location.isActive ? 'active' : 'inactive'}.`,
      });
    } catch (err) {
      showError(err, 'Failed to update office');
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    const confirmed = await confirm({
      title: 'Delete this office?',
      description: 'Employees will no longer be able to check in from this geofence. Past attendance keeps the office name. Disabling is reversible; deleting is not.',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteOfficeLocation.mutateAsync(locationId);
      toast({ variant: 'success', title: 'Office deleted' });
    } catch (err) {
      showError(err, 'Failed to delete office');
    }
  };

  return (
    <GeofenceSettings
      geofenceSettings={geofenceSettings}
      officeLocations={officeLocations}
      onUpdateGeofence={onUpdateGeofence}
      onSaveOffice={handleSaveOffice}
      onDeleteLocation={handleDeleteLocation}
      onToggleLocation={handleToggleLocation}
      onSave={onSave}
      onReset={onReset}
      loading={loading}
      officeLoading={officeLoading}
      saving={saving}
      savingOffice={createOfficeLocation.isPending || updateOfficeLocation.isPending}
    />
  );
};

export default GeofenceSection;
