import { useEffect, useState } from "react";
import { MapPin, AlertCircle, X, Send } from "lucide-react";

const WFHRequestModal = ({
  isOpen,
  onClose,
  onSubmit,
  submitting = false,
  context = {}
}) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const geofence = context.geofence || {};
  const location = context.location || {};
  const locationError = context.locationError;
  const distance = geofence.distance ?? null;
  const radius = geofence.radius ?? 100;
  const nearestOffice = geofence.nearestOffice || "the office";
  const isLocationUnavailable = geofence.reason === 'location_unavailable' || !location.latitude;
  const minReasonLength = 10;
  const canSubmit = reason.trim().length >= minReasonLength && !submitting;

  const formatCoordinate = (value) => {
    if (typeof value !== "number") return "N/A";
    return value.toFixed(5);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4 py-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border border-slate-200 dark:border-slate-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-red-50 text-red-500 dark:bg-red-500/10">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Request Work From Home
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isLocationUnavailable
                ? "Unable to verify your location. Submit a WFH request to proceed."
                : "You appear to be outside the allowed office radius. Submit a WFH request to proceed."}
            </p>
          </div>
        </div>

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
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 mb-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">{nearestOffice}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Allowed Radius</p>
                <p className="font-semibold">{radius} m</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Your Distance</p>
                <p className={`font-semibold ${distance && distance > radius ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {distance !== null ? `${Math.round(distance)} m` : 'Unknown'}
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Current location: {formatCoordinate(location.latitude)}, {formatCoordinate(location.longitude)}
            </div>
          </div>
        )}

        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Reason for Work From Home
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-400"
          placeholder="Share a brief reason (e.g., client visit, internet outage, commute disruption)..."
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Minimum {minReasonLength} characters. Provide enough detail for HR to make a decision quickly.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
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
      </div>
    </div>
  );
};

export default WFHRequestModal;




