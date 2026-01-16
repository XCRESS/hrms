import React from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { GeneralSettingsData } from './types';

interface GeneralSettingsProps {
    generalSettings: GeneralSettingsData;
    onUpdate: (newSettings: GeneralSettingsData) => void;
    onSave: () => void;
    onReset: () => void;
    loading: boolean;
    saving: boolean;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({
    generalSettings,
    onUpdate,
    onSave,
    onReset,
    loading,
    saving
}) => {
    const handleChange = (field: keyof GeneralSettingsData, value: string) => {
        onUpdate({ ...generalSettings, [field]: value });
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

            {/* Location Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Check-in Location Settings</h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <input
                            type="radio"
                            id="location-na"
                            name="general.locationSetting"
                            value="na"
                            checked={generalSettings.locationSetting === 'na'}
                            onChange={() => handleChange('locationSetting', 'na')}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="location-na" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            <span className="block">N/A - No Location Required</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">Check-in without location tracking</span>
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="radio"
                            id="location-optional"
                            name="general.locationSetting"
                            value="optional"
                            checked={generalSettings.locationSetting === 'optional'}
                            onChange={() => handleChange('locationSetting', 'optional')}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="location-optional" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            <span className="block">Optional - Allow Check-in Without Location</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">Try to get location, but allow check-in even if permission is denied</span>
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="radio"
                            id="location-mandatory"
                            name="general.locationSetting"
                            value="mandatory"
                            checked={generalSettings.locationSetting === 'mandatory'}
                            onChange={() => handleChange('locationSetting', 'mandatory')}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="location-mandatory" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            <span className="block">Mandatory - Location Required</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">Check-in not allowed if location permission is denied or unavailable</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Task Report Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Check-out Task Report Settings</h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <input
                            type="radio"
                            id="task-na"
                            name="general.taskReportSetting"
                            value="na"
                            checked={generalSettings.taskReportSetting === 'na'}
                            onChange={() => handleChange('taskReportSetting', 'na')}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="task-na" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            <span className="block">N/A - Direct Check-out</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">Check-out without task report prompt</span>
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="radio"
                            id="task-optional"
                            name="general.taskReportSetting"
                            value="optional"
                            checked={generalSettings.taskReportSetting === 'optional'}
                            onChange={() => handleChange('taskReportSetting', 'optional')}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="task-optional" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            <span className="block">Optional - Prompt After Check-out</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">Allow check-out, then ask if employee wants to submit task report</span>
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="radio"
                            id="task-mandatory"
                            name="general.taskReportSetting"
                            value="mandatory"
                            checked={generalSettings.taskReportSetting === 'mandatory'}
                            onChange={() => handleChange('taskReportSetting', 'mandatory')}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="task-mandatory" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            <span className="block">Mandatory - Required for Check-out</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">Check-out not allowed without submitting task report</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeneralSettings;
