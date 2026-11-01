import { lazy, Suspense, useState } from 'react';
import { Crosshair, Loader2, TriangleAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { CreateOfficeLocationDto, OfficeLocation } from '@/types';
import { acquireBestFix, parseCoordinates, MIN_GEOFENCE_RADIUS as MIN_RADIUS, MAX_GEOFENCE_RADIUS as MAX_RADIUS, type GeoFix } from '@/utils/geolocation';

const GeofenceMap = lazy(() => import('./GeofenceMap'));

/** Worse than this, a "current location" fix is probably Wi-Fi/IP, not GPS. */
const TRUSTWORTHY_FIX_METERS = 50;

interface Props {
  open: boolean;
  office: OfficeLocation | null;
  defaultRadius: number;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateOfficeLocationDto) => Promise<void>;
}

export default function OfficeEditorDialog({ open, office, defaultRadius, saving, onOpenChange, onSave }: Props) {
  const [name, setName] = useState(office?.name ?? '');
  const [address, setAddress] = useState(office?.address ?? '');
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(office?.coordinates ?? null);
  const [radius, setRadius] = useState(office?.radius ?? defaultRadius);
  const [isActive, setIsActive] = useState(office?.isActive ?? true);
  const [coordinateText, setCoordinateText] = useState('');
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [locating, setLocating] = useState<number | 'start' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const movePin = (latitude: number, longitude: number) => {
    setPoint({ latitude, longitude });
    setCoordinateText('');
  };

  const applyCoordinateText = (text: string) => {
    setCoordinateText(text);
    const parsed = parseCoordinates(text);
    if (parsed) {
      setPoint(parsed);
      setFix(null);
      setError(null);
    }
  };

  const useMyLocation = async () => {
    setLocating('start');
    setError(null);
    try {
      const result = await acquireBestFix({ targetAccuracy: 15, maxWaitMs: 15_000, onProgress: setLocating });
      setFix(result);
      setPoint({ latitude: result.latitude, longitude: result.longitude });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not get your location');
    } finally {
      setLocating(null);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError('Give the office a name.');
    if (!point) return setError('Place the office on the map, paste coordinates, or use your location.');
    if (radius < MIN_RADIUS || radius > MAX_RADIUS) {
      return setError(`Radius must be between ${MIN_RADIUS} and ${MAX_RADIUS} m.`);
    }
    setError(null);
    await onSave({
      name: name.trim(),
      address: address.trim(),
      latitude: Number(point.latitude.toFixed(6)),
      longitude: Number(point.longitude.toFixed(6)),
      radius,
      isActive,
    });
  };

  const coarseFix = fix && fix.accuracy > TRUSTWORTHY_FIX_METERS;
  const pasteInvalid = coordinateText.trim() !== '' && !parseCoordinates(coordinateText);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{office ? `Edit ${office.name}` : 'Add office'}</DialogTitle>
          <DialogDescription>
            Click the map or drag the pin onto the building entrance. The amber circle is where check-in is allowed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-5 md:grid-cols-[1fr_18rem]">
          <div className="space-y-3">
            <Suspense fallback={<div className="h-72 md:h-96 rounded-lg bg-muted animate-pulse" />}>
              <GeofenceMap
                className="h-72 md:h-96 rounded-lg overflow-hidden border border-border"
                pin={point ? { ...point, radius } : undefined}
                onPick={movePin}
                fix={fix}
              />
            </Suspense>
            <p className="text-xs text-muted-foreground tabular-nums">
              {point
                ? `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
                : 'Click the map to drop a pin, paste coordinates, or use your current location.'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="office-name">Name</Label>
              <Input id="office-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="office-coords">Coordinates or maps link</Label>
              <Input
                id="office-coords"
                value={coordinateText}
                placeholder="12.9716, 77.5946"
                onChange={(e) => applyCoordinateText(e.target.value)}
                aria-invalid={pasteInvalid}
                aria-describedby="office-coords-hint"
              />
              <p id="office-coords-hint" className={pasteInvalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
                {pasteInvalid ? "Couldn't find coordinates in that." : 'Paste from Google Maps: right-click the building → copy coordinates.'}
              </p>
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={useMyLocation} disabled={locating !== null}>
              {locating !== null ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  <span className="tabular-nums">{typeof locating === 'number' ? `Refining · ±${Math.round(locating)} m` : 'Locating…'}</span>
                </>
              ) : (
                <>
                  <Crosshair className="size-4 mr-2" />
                  Use my current location
                </>
              )}
            </Button>
            {coarseFix && (
              <p role="alert" className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
                <TriangleAlert className="size-4 shrink-0" />
                Only accurate to ±{Math.round(fix.accuracy)} m. That's usually a Wi-Fi estimate, so drag the pin onto the building before saving.
              </p>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="office-radius">Check-in radius</Label>
                <span className="text-sm tabular-nums text-muted-foreground">{radius} m</span>
              </div>
              <input
                id="office-radius"
                type="range"
                min={MIN_RADIUS}
                max={1000}
                step={10}
                value={Math.min(radius, 1000)}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <Input
                type="number"
                min={MIN_RADIUS}
                max={MAX_RADIUS}
                value={radius}
                aria-label="Radius in meters"
                onChange={(e) => setRadius(Math.round(Number(e.target.value) || 0))}
              />
              <p className="text-xs text-muted-foreground">
                50–150 m suits a single building. GPS indoors drifts 20–60 m, which is already allowed for.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="office-address">Address (optional)</Label>
              <Textarea id="office-address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={500} />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="office-active" checked={isActive} onCheckedChange={(c) => setIsActive(c === true)} />
              <Label htmlFor="office-active">Active: employees can check in here</Label>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : office ? 'Save changes' : 'Add office'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
