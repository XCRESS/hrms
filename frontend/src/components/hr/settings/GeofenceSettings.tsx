import React, { lazy, Suspense, useState } from 'react';
import { Building2, MapPin, Pencil, Plus, Power, RotateCcw, Save, Trash2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { CreateOfficeLocationDto, OfficeLocation } from '@/types';
import { MAX_GEOFENCE_RADIUS, MIN_GEOFENCE_RADIUS } from '@/utils/geolocation';
import type { GeofenceSettings as GeofenceSettingsType } from './types';
import OfficeEditorDialog from './geofence/OfficeEditorDialog';

const GeofenceMap = lazy(() => import('./geofence/GeofenceMap'));

interface GeofenceSettingsProps {
    geofenceSettings: GeofenceSettingsType;
    officeLocations: OfficeLocation[];
    onUpdateGeofence: (newSettings: GeofenceSettingsType) => void;
    /** Resolves true when saved, so the editor only closes on success. */
    onSaveOffice: (data: CreateOfficeLocationDto, officeId?: string) => Promise<boolean>;
    onDeleteLocation: (id: string) => void;
    onToggleLocation: (location: OfficeLocation) => void;
    onSave: () => void;
    onReset: () => void;
    loading: boolean;
    officeLoading?: boolean;
    saving: boolean;
    savingOffice: boolean;
}

type ToggleKey = 'enforceCheckIn' | 'enforceCheckOut' | 'allowWFHBypass';

const TOGGLES: Array<{ key: ToggleKey; label: string; hint: string }> = [
    { key: 'enforceCheckIn', label: 'Enforce on check-in', hint: 'Block check-ins from outside every office radius' },
    { key: 'enforceCheckOut', label: 'Enforce on check-out', hint: 'Also require being on-site to check out (skipped on approved WFH days)' },
    { key: 'allowWFHBypass', label: 'Offer a WFH request when outside', hint: 'Instead of a hard block, the employee can ask HR to approve work from home' },
];

const GeofenceSettings: React.FC<GeofenceSettingsProps> = ({
    geofenceSettings,
    officeLocations,
    onUpdateGeofence,
    onSaveOffice,
    onDeleteLocation,
    onToggleLocation,
    onSave,
    onReset,
    loading,
    officeLoading = false,
    saving,
    savingOffice,
}) => {
    const [editing, setEditing] = useState<OfficeLocation | 'new' | null>(null);

    const set = <K extends keyof GeofenceSettingsType>(field: K, value: GeofenceSettingsType[K]) =>
        onUpdateGeofence({ ...geofenceSettings, [field]: value });

    const activeOffices = officeLocations.filter((o) => o.isActive);
    const blocksEveryone = geofenceSettings.enabled && !officeLoading && activeOffices.length === 0;

    const handleSaveOffice = async (data: CreateOfficeLocationDto) => {
        const saved = await onSaveOffice(data, editing && editing !== 'new' ? editing._id : undefined);
        if (saved) setEditing(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={onReset} disabled={loading || saving} title="Discard changes and reload">
                    <RotateCcw className="size-4 sm:mr-2" />
                    <span className="hidden sm:inline">Reset</span>
                </Button>
                <Button onClick={onSave} disabled={loading || saving}>
                    <Save className="size-4 mr-2" />
                    {saving ? 'Saving…' : 'Save'}
                </Button>
            </div>

            {blocksEveryone && (
                <p role="alert" className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    <TriangleAlert className="size-5 shrink-0" />
                    Geo-fencing is on but there is no active office, so every enforced check-in will fail. Add an office below or turn enforcement off.
                </p>
            )}

            <section aria-labelledby="geofence-rules" className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
                <div className="flex items-start gap-3">
                    <Checkbox
                        id="geofence-enabled"
                        checked={geofenceSettings.enabled}
                        onCheckedChange={(c) => set('enabled', c === true)}
                        className="mt-1"
                    />
                    <div>
                        <Label id="geofence-rules" htmlFor="geofence-enabled" className="text-base font-semibold text-foreground">
                            Geo-fenced attendance
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Employees must be inside an office radius to check in. When off, location is still recorded so you can see who was on-site.
                        </p>
                    </div>
                </div>

                <ul className={cn('mt-5 space-y-4 border-l-2 border-border pl-5 ml-2', !geofenceSettings.enabled && 'opacity-50')}>
                    {TOGGLES.map((toggle) => (
                        <li key={toggle.key} className="flex items-start gap-3">
                            <Checkbox
                                id={`geofence-${toggle.key}`}
                                checked={geofenceSettings[toggle.key]}
                                disabled={!geofenceSettings.enabled}
                                onCheckedChange={(c) => set(toggle.key, c === true)}
                                className="mt-0.5"
                            />
                            <div>
                                <Label htmlFor={`geofence-${toggle.key}`} className="text-foreground">{toggle.label}</Label>
                                <p className="text-sm text-muted-foreground">{toggle.hint}</p>
                            </div>
                        </li>
                    ))}
                    <li className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                        <Label htmlFor="geofence-default-radius" className="text-foreground">Default radius for new offices</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="geofence-default-radius"
                                type="number"
                                min={MIN_GEOFENCE_RADIUS}
                                max={MAX_GEOFENCE_RADIUS}
                                value={geofenceSettings.defaultRadius}
                                onChange={(e) => set('defaultRadius', Math.round(Number(e.target.value) || 0))}
                                className="w-28"
                            />
                            <span className="text-sm text-muted-foreground">m</span>
                        </div>
                    </li>
                </ul>
            </section>

            <section aria-labelledby="offices-title" className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-4 sm:px-6">
                    <div>
                        <h3 id="offices-title" className="text-base sm:text-lg font-semibold text-foreground">Offices</h3>
                        <p className="text-sm text-muted-foreground">
                            {activeOffices.length} active of {officeLocations.length}
                        </p>
                    </div>
                    <Button onClick={() => setEditing('new')}>
                        <Plus className="size-4 mr-2" />
                        Add office
                    </Button>
                </div>

                {officeLocations.length > 0 && (
                    <Suspense fallback={<div className="h-64 bg-muted animate-pulse" />}>
                        <GeofenceMap
                            className="h-64 sm:h-80 border-y border-border"
                            offices={officeLocations.map((o) => ({
                                id: o._id,
                                name: o.name,
                                latitude: o.coordinates.latitude,
                                longitude: o.coordinates.longitude,
                                radius: o.radius,
                                isActive: o.isActive,
                            }))}
                        />
                    </Suspense>
                )}

                {officeLoading ? (
                    <p className="p-6 text-sm text-muted-foreground">Loading offices…</p>
                ) : officeLocations.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-6 pb-10 pt-4 text-center">
                        <Building2 className="size-8 text-muted-foreground" />
                        <p className="max-w-sm text-sm text-muted-foreground">
                            Add your first office. You can paste a Google Maps link, drop a pin, or stand in the building and use your location.
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {officeLocations.map((office) => (
                            <li key={office._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-6">
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                    <MapPin className={cn('mt-0.5 size-5 shrink-0', office.isActive ? 'text-emerald-500' : 'text-muted-foreground')} />
                                    <div className="min-w-0">
                                        <p className="flex items-center gap-2 font-medium text-foreground">
                                            <span className="truncate">{office.name}</span>
                                            {!office.isActive && (
                                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inactive</span>
                                            )}
                                        </p>
                                        <p className="truncate text-sm text-muted-foreground">
                                            {office.address || `${office.coordinates.latitude.toFixed(5)}, ${office.coordinates.longitude.toFixed(5)}`}
                                        </p>
                                        <p className="text-xs text-muted-foreground tabular-nums">{office.radius} m radius</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 pl-8 sm:pl-0">
                                    <Button variant="ghost" size="sm" onClick={() => setEditing(office)}>
                                        <Pencil className="size-4 mr-1" /> Edit
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => onToggleLocation(office)}>
                                        <Power className="size-4 mr-1" /> {office.isActive ? 'Disable' : 'Enable'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => onDeleteLocation(office._id)}
                                        aria-label={`Delete ${office.name}`}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {editing && (
                <OfficeEditorDialog
                    key={editing === 'new' ? 'new' : editing._id}
                    open
                    office={editing === 'new' ? null : editing}
                    defaultRadius={geofenceSettings.defaultRadius}
                    saving={savingOffice}
                    onOpenChange={(open) => !open && setEditing(null)}
                    onSave={handleSaveOffice}
                />
            )}
        </div>
    );
};

export default GeofenceSettings;
