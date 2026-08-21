import { useState, ChangeEvent } from "react";
import { MapPin, AlertCircle, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Location {
  latitude?: number;
  longitude?: number;
}

interface Geofence {
  distance?: number | null;
  radius?: number;
  nearestOffice?: string;
  reason?: string;
  message?: string;
}

interface Context {
  geofence?: Geofence;
  location?: Location;
  locationError?: string;
}

interface WFHRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  submitting?: boolean;
  context?: Context | null;
}

const WFHRequestModal = ({
  isOpen,
  onClose,
  onSubmit,
  submitting = false,
  context
}: WFHRequestModalProps) => {
  // Reset happens by remount: the parent keys this component on `isOpen`, so
  // each open starts with fresh state and no reset effect is needed.
  const [reason, setReason] = useState("");

  const geofence = context?.geofence ?? {};
  const location = context?.location ?? {};
  const locationError = context?.locationError;
  const distance = geofence.distance ?? null;
  const radius = geofence.radius ?? 100;
  const nearestOffice = geofence.nearestOffice || "the office";
  const isLocationUnavailable = geofence.reason === 'location_unavailable' || !location.latitude;
  const minReasonLength = 10;
  const canSubmit = reason.trim().length >= minReasonLength && !submitting;

  const formatCoordinate = (value: number | undefined): string => {
    if (typeof value !== "number") return "N/A";
    return value.toFixed(5);
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl border-border bg-white p-6 dark:bg-slate-900">
        <DialogHeader className="flex-row items-center gap-3 space-y-0 mb-4 pr-8 text-left">
          <div className="p-2 rounded-xl bg-red-50 text-red-500 dark:bg-red-500/10">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-xl font-semibold text-foreground">
              Request Work From Home
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {isLocationUnavailable
                ? "Unable to verify your location. Submit a WFH request to proceed."
                : "You appear to be outside the allowed office radius. Submit a WFH request to proceed."}
            </DialogDescription>
          </div>
        </DialogHeader>

        {isLocationUnavailable ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Location Unavailable</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  {locationError || geofence.message || "We couldn't access your location. This could be due to permission denial, timeout, or GPS unavailability."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-card rounded-xl p-4 mb-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">{nearestOffice}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Allowed Radius</p>
                <p className="font-semibold">{radius} m</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Your Distance</p>
                <p className={`font-semibold ${distance && distance > radius ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {distance !== null ? `${Math.round(distance)} m` : 'Unknown'}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Current location: {formatCoordinate(location.latitude)}, {formatCoordinate(location.longitude)}
            </div>
          </div>
        )}

        <label className="block text-sm font-medium text-foreground mb-2">
          Reason for Work From Home
        </label>
        <textarea
          value={reason}
          onChange={handleTextChange}
          rows={4}
          className="w-full rounded-xl border border-border bg-white dark:bg-slate-900 text-foreground px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-400"
          placeholder="Share a brief reason (e.g., client visit, internet outage, commute disruption)..."
        />
        <p className="text-xs text-muted-foreground mt-1">
          Minimum {minReasonLength} characters. Provide enough detail for HR to make a decision quickly.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-muted-foreground hover:bg-muted dark:hover:bg-card transition"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(reason.trim())}
            disabled={!canSubmit}
            className={`px-5 py-2 rounded-xl flex items-center gap-2 text-white transition ${
              canSubmit ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-400 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              "Submitting..."
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Request
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WFHRequestModal;
