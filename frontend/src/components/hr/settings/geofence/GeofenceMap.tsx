import { useEffect, useRef } from 'react';
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { pinIcon } from '@/components/ui/locationModal/pinIcon';

export interface MapOffice {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
}

interface EditablePin {
  latitude: number;
  longitude: number;
  radius: number;
}

type PickHandler = (latitude: number, longitude: number) => void;

interface Props {
  offices?: MapOffice[];
  pin?: EditablePin;
  /** Makes the map editable: click places the pin, the pin is draggable. */
  onPick?: PickHandler;
  /** Accuracy circle for a "use my location" fix, so HR can see how trustworthy it is. */
  fix?: { latitude: number; longitude: number; accuracy: number } | null;
  className?: string;
}

const INDIA: L.LatLngTuple = [22.5, 79];

function ClickToPlace({ onPick }: { onPick: PickHandler }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/**
 * Keeps the viewport on whatever is being edited. The target is serialized so
 * the effect re-runs on a real change, not on every parent render.
 */
function FitView({ offices, pin }: Pick<Props, 'offices' | 'pin'>) {
  const map = useMap();
  const target = JSON.stringify(
    pin
      ? [[pin.latitude, pin.longitude, pin.radius * 3]]
      : (offices ?? []).map((o) => [o.latitude, o.longitude, o.radius * 2.5])
  );

  useEffect(() => {
    const areas = JSON.parse(target) as Array<[number, number, number]>;
    const id = window.setTimeout(() => {
      map.invalidateSize();
      if (areas.length === 0) return;
      const bounds = areas
        .map(([lat, lng, meters]) => L.latLng(lat, lng).toBounds(meters))
        .reduce((acc, b) => acc.extend(b));
      map.fitBounds(bounds, { maxZoom: 18, padding: [16, 16] });
    }, 120);
    return () => window.clearTimeout(id);
  }, [map, target]);

  return null;
}

export default function GeofenceMap({ offices = [], pin, onPick, fix, className }: Props) {
  const markerRef = useRef<L.Marker | null>(null);
  const center: L.LatLngTuple = pin
    ? [pin.latitude, pin.longitude]
    : offices[0]
      ? [offices[0].latitude, offices[0].longitude]
      : INDIA;

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={pin || offices.length ? 16 : 4}
        scrollWheelZoom={Boolean(onPick)}
        style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {offices.map((office) => (
          <Circle
            key={office.id}
            center={[office.latitude, office.longitude]}
            radius={office.radius}
            pathOptions={{
              color: office.isActive ? '#10b981' : '#94a3b8',
              fillOpacity: office.isActive ? 0.15 : 0.05,
              dashArray: office.isActive ? undefined : '6 6',
              weight: 2,
            }}
          >
            <Tooltip direction="top">
              {office.name} · {office.radius} m{office.isActive ? '' : ' (inactive)'}
            </Tooltip>
          </Circle>
        ))}

        {fix && (
          <Circle
            center={[fix.latitude, fix.longitude]}
            radius={fix.accuracy}
            pathOptions={{ color: '#3b82f6', fillOpacity: 0.08, weight: 1, dashArray: '4 4' }}
          />
        )}

        {pin && (
          <>
            <Circle
              center={[pin.latitude, pin.longitude]}
              radius={pin.radius}
              pathOptions={{ color: '#f59e0b', fillOpacity: 0.18, weight: 2 }}
            />
            <Marker
              position={[pin.latitude, pin.longitude]}
              icon={pinIcon}
              draggable={Boolean(onPick)}
              ref={markerRef}
              eventHandlers={{
                dragend: () => {
                  const position = markerRef.current?.getLatLng();
                  if (position) onPick?.(position.lat, position.lng);
                },
              }}
            />
          </>
        )}

        {onPick && <ClickToPlace onPick={onPick} />}

        <FitView offices={offices} pin={pin} />
      </MapContainer>
    </div>
  );
}
