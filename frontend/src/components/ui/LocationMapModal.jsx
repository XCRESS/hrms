import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, MapPin, Clock, User, AlertCircle } from 'lucide-react';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon
const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const LocationMapModal = ({ 
  isOpen, 
  onClose, 
  attendanceRecord, 
  employeeProfile 
}) => {
  const mapRef = useRef(null);

  useEffect(() => {
    if (isOpen && mapRef.current) {
      // Force map to resize when modal opens
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasLocation = attendanceRecord?.location?.latitude && attendanceRecord?.location?.longitude;
  const latitude = attendanceRecord?.location?.latitude;
  const longitude = attendanceRecord?.location?.longitude;

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  const formatTime = (date) => {
    if (!date) return "N/A";
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800';
      case 'absent': return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800';
      case 'late': return 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-800';
      case 'half-day': return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800';
      case 'leave': return 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-800';
      default: return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-900/20 dark:border-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Check-in Location
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {formatDate(attendanceRecord?.date)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Employee Info */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-600 text-white rounded-lg">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                {employeeProfile?.firstName} {employeeProfile?.lastName}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                ID: {employeeProfile?.employeeId} • {employeeProfile?.department}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Check In</span>
              </div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {formatTime(attendanceRecord?.checkIn)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Check Out</span>
              </div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {formatTime(attendanceRecord?.checkOut)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded-full bg-slate-500"></div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Status</span>
              </div>
              <span className={`inline-flex px-2 py-1 rounded-full text-sm font-medium border ${getStatusColor(attendanceRecord?.status)}`}>
                {attendanceRecord?.status?.charAt(0).toUpperCase() + attendanceRecord?.status?.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Map Content */}
        <div className="p-6 flex-grow overflow-y-auto">
          {hasLocation ? (
            <div className="space-y-4">
              {/* Coordinates Display */}
              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Coordinates</span>
                  </div>
                  <button
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank')}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition-colors flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" />
                    Open in Map
                  </button>
                </div>
                <p className="text-sm font-mono text-slate-700 dark:text-slate-300">
                  Latitude: {latitude?.toFixed(6)}, Longitude: {longitude?.toFixed(6)}
                </p>
              </div>

              {/* Map Container */}
              <div className="h-96 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                <MapContainer
                  center={[latitude, longitude]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  whenCreated={(mapInstance) => {
                    mapRef.current = mapInstance;
                  }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[latitude, longitude]} icon={customIcon}>
                    <Popup>
                      <div className="text-center">
                        <h4 className="font-semibold text-slate-900 mb-1">
                          {employeeProfile?.firstName} {employeeProfile?.lastName}
                        </h4>
                        <p className="text-sm text-slate-600 mb-2">
                          Checked in at {formatTime(attendanceRecord?.checkIn)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(attendanceRecord?.date)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>

              
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                  <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                    No Location Data
                  </h3>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                  This attendance record doesn't contain location information. 
                  Location data is only available for check-ins made after the location feature was enabled.
                </p>
                <div className="bg-yellow-100 dark:bg-yellow-900/40 p-3 rounded-lg">
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                    Note: Location tracking requires user permission and is optional for check-ins.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        
      </div>
    </div>
  );
};

export default LocationMapModal;