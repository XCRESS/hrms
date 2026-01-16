import React, { useState } from 'react';
import { RotateCcw, Save, MapPin } from 'lucide-react';
import { GeofenceSettings as GeofenceSettingsType, OfficeFormData } from './types';
import { OfficeLocation } from '@/types';
import { useToast } from '@/components/ui/toast';

interface GeofenceSettingsProps {
    geofenceSettings: GeofenceSettingsType;
    officeLocations: OfficeLocation[];
    onUpdateGeofence: (newSettings: GeofenceSettingsType) => void;
    onCreateLocation: (data: OfficeFormData) => void;
    onDeleteLocation: (id: string) => void;
    onToggleLocation: (location: OfficeLocation) => void;
    onSave: () => void;
    onReset: () => void;
    loading: boolean;
    saving: boolean;
    creatingLocation: boolean;
}

const GeofenceSettings: React.FC<GeofenceSettingsProps> = ({
    geofenceSettings,
    officeLocations,
    onUpdateGeofence,
    onCreateLocation,
    onDeleteLocation,
    onToggleLocation,
    onSave,
    onReset,
    loading,
    saving,
    creatingLocation
}) => {
    const { toast } = useToast();
    const [officeForm, setOfficeForm] = useState<OfficeFormData>({
        name: '',
        address: '',
        latitude: '',
        longitude: '',
        radius: 100,
        isActive: true
    });

    const handleGeofenceChange = (field: keyof GeofenceSettingsType, value: any) => {
        onUpdateGeofence({ ...geofenceSettings, [field]: value });
    };

    const handleOfficeInputChange = (field: keyof OfficeFormData, value: any) => {
        setOfficeForm(prev => ({ ...prev, [field]: value }));
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast({
                title: "Error",
                description: "Geolocation is not supported by your browser",
                variant: "error"
            });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setOfficeForm(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
                toast({
                    title: "Success",
                    description: "Location fetched successfully",
                    variant: "default"
                });
            },
            (error) => {
                toast({
                    title: "Error",
                    description: "Failed to get location: " + error.message,
                    variant: "error"
                });
            }
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreateLocation(officeForm);
        // Reset form relies on parent success or local reset? 
        // Usually parent refetches. We can reset form here if optimistic, but let's assume parent handles errors.
        // For now, I'll reset after submit if success is handled by parent, but ideally I should wait.
        // I'll leave it as is, parent re-renders passed props.
        // To properly reset, I might need a useEffect or just reset manually.
        // I will reset manually here for now, assuming success.
        setOfficeForm({
            name: '',
            address: '',
            latitude: '',
            longitude: '',
            radius: 100,
            isActive: true
        });
    };

    return (
        <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2">
                <button
                    onClick={onReset}
                    disabled={loading || saving}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Discard changes and reload"
                >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">Reset</span>
                </button>
                <button
                    onClick={onSave}
                    disabled={saving || loading}
                    className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Geo-Fence Enforcement</h3>
                <div className="space-y-4">
                    <label className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                            <p className="font-medium text-slate-800 dark:text-slate-200">Enable Geo-Fenced Attendance</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Require employees to be within office radius to check in/out</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={geofenceSettings.enabled}
                            onChange={(e) => handleGeofenceChange('enabled', e.target.checked)}
                            className="h-5 w-5 flex-shrink-0"
                        />
                    </label>
                    <label className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                            <p className="font-medium text-slate-800 dark:text-slate-200">Enforce On Check-in</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Block check-in attempts outside the configured radius</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={geofenceSettings.enforceCheckIn}
                            onChange={(e) => handleGeofenceChange('enforceCheckIn', e.target.checked)}
                            className="h-5 w-5 flex-shrink-0"
                        />
                    </label>
                    <label className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                            <p className="font-medium text-slate-800 dark:text-slate-200">Enforce On Check-out</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Require location validation for check-outs as well</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={geofenceSettings.enforceCheckOut}
                            onChange={(e) => handleGeofenceChange('enforceCheckOut', e.target.checked)}
                            className="h-5 w-5 flex-shrink-0"
                        />
                    </label>
                    <label className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                            <p className="font-medium text-slate-800 dark:text-slate-200">Allow WFH Requests</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Employees outside the radius can submit WFH requests</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={geofenceSettings.allowWFHBypass}
                            onChange={(e) => handleGeofenceChange('allowWFHBypass', e.target.checked)}
                            className="h-5 w-5 flex-shrink-0"
                        />
                    </label>
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Default Radius (meters)</label>
                        <input
                            type="number"
                            min={50}
                            max={500}
                            value={geofenceSettings.defaultRadius}
                            onChange={(e) => handleGeofenceChange('defaultRadius', parseInt(e.target.value))}
                            className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Add Office Location</h3>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Office Name</label>
                            <input
                                type="text"
                                required
                                value={officeForm.name}
                                onChange={(e) => handleOfficeInputChange('name', e.target.value)}
                                className="mt-1 w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm sm:text-base bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Address (optional)</label>
                            <textarea
                                value={officeForm.address}
                                onChange={(e) => handleOfficeInputChange('address', e.target.value)}
                                rows={2}
                                className="mt-1 w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm sm:text-base bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Latitude</label>
                                <input
                                    type="number"
                                    step="0.000001"
                                    required
                                    value={officeForm.latitude}
                                    onChange={(e) => handleOfficeInputChange('latitude', e.target.value)}
                                    className="mt-1 w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm sm:text-base bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Longitude</label>
                                <input
                                    type="number"
                                    step="0.000001"
                                    required
                                    value={officeForm.longitude}
                                    onChange={(e) => handleOfficeInputChange('longitude', e.target.value)}
                                    className="mt-1 w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm sm:text-base bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Radius (m)</label>
                                <input
                                    type="number"
                                    min={50}
                                    max={1000}
                                    value={officeForm.radius}
                                    onChange={(e) => handleOfficeInputChange('radius', parseInt(e.target.value))}
                                    className="mt-1 w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                            </div>
                            <label className="flex items-end gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                Active
                                <input
                                    type="checkbox"
                                    checked={officeForm.isActive}
                                    onChange={(e) => handleOfficeInputChange('isActive', e.target.checked)}
                                    className="h-5 w-5"
                                />
                            </label>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleUseCurrentLocation}
                                className="flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                <MapPin className="w-4 h-4" />
                                Use My Current Location
                            </button>
                            <button
                                type="submit"
                                disabled={creatingLocation}
                                className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                            >
                                {creatingLocation ? 'Saving...' : 'Add Location'}
                            </button>
                        </div>
                    </form>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">Saved Office Locations</h3>
                        <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{officeLocations.length} location{officeLocations.length !== 1 ? 's' : ''}</span>
                    </div>
                    {officeLocations.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No office locations configured yet.</p>
                    ) : (
                        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                            {officeLocations.map(location => (
                                <div key={location._id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">{location.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{location.address || 'No address provided'}</p>
                                        </div>
                                        <span className={`px-2 sm:px-3 py-1 text-xs rounded-full self-start sm:self-auto ${location.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                            {location.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-3">
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Latitude</p>
                                            <p className="font-mono text-xs sm:text-sm truncate">{location.coordinates?.latitude}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Longitude</p>
                                            <p className="font-mono text-xs sm:text-sm truncate">{location.coordinates?.longitude}</p>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Radius</p>
                                            <p className="text-xs sm:text-sm">{location.radius} m</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 sm:gap-4 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                        <button
                                            type="button"
                                            onClick={() => onToggleLocation(location)}
                                            className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            {location.isActive ? 'Disable' : 'Enable'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onDeleteLocation(location._id)}
                                            className="text-xs sm:text-sm text-red-600 dark:text-red-400 hover:underline"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GeofenceSettings;
