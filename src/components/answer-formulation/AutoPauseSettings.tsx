/**
 * AutoPauseSettings Component
 * 
 * Configuration panel for auto-pause dictation feature.
 * Includes toggle switch, duration slider, presets, and test functionality.
 */

import React, { useState } from 'react';
import { Settings, Check, X, Zap } from 'lucide-react';

interface AutoPauseSettingsProps {
  enabled: boolean;
  duration: number;
  onEnabledChange: (enabled: boolean) => void;
  onDurationChange: (duration: number) => void;
  onSave: () => void;
  onCancel: () => void;
  onTest?: () => void;
}

const AutoPauseSettings: React.FC<AutoPauseSettingsProps> = ({
  enabled,
  duration,
  onEnabledChange,
  onDurationChange,
  onSave,
  onCancel,
  onTest,
}) => {
  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [localDuration, setLocalDuration] = useState(duration);
  const [hasChanges, setHasChanges] = useState(false);

  const handleEnabledToggle = () => {
    setLocalEnabled(!localEnabled);
    setHasChanges(true);
  };

  const handleDurationChange = (value: number) => {
    setLocalDuration(value);
    setHasChanges(true);
  };

  const handlePresetClick = (presetDuration: number) => {
    setLocalDuration(presetDuration);
    setHasChanges(true);
  };

  const handleSave = () => {
    onEnabledChange(localEnabled);
    onDurationChange(localDuration);
    onSave();
    setHasChanges(false);
  };

  const handleCancel = () => {
    setLocalEnabled(enabled);
    setLocalDuration(duration);
    setHasChanges(false);
    onCancel();
  };

  const presets = [
    { label: 'Fast speakers', duration: 1.5, description: '1-2s' },
    { label: 'Standard (recommended)', duration: 3.0, description: '3-4s' },
    { label: 'Need thinking time', duration: 6.0, description: '5-7s' },
    { label: 'Processing delays', duration: 9.0, description: '8-10s' },
  ];

  return (
    <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg border-2 border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">
          Dictation Settings
        </h2>
        {hasChanges && (
          <span className="ml-auto text-xs text-orange-600 font-medium">● Unsaved changes</span>
        )}
      </div>

      {/* Auto-Pause Toggle Section */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-800 mb-1">
              Auto-Pause Detection
            </h3>
            <p className="text-sm text-gray-600">
              Automatically stop dictating when you pause speaking
            </p>
          </div>
          
          {/* Toggle Switch */}
          <button
            onClick={handleEnabledToggle}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 ${
              localEnabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={localEnabled}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 ${
                localEnabled ? 'translate-x-9' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        
        <p className="text-sm text-gray-500">
          Current: <span className="font-medium">{localEnabled ? 'Enabled' : 'Disabled (Manual stop only)'}</span>
        </p>
      </div>

      {/* Pause Duration Slider Section */}
      <div className={`mb-6 p-4 border border-gray-200 rounded-lg transition-opacity duration-200 ${
        localEnabled ? 'bg-white' : 'bg-gray-50 opacity-50'
      }`}>
        <h3 className="text-base font-semibold text-gray-800 mb-2">
          Pause Duration
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          How long to wait before auto-stopping
        </p>

        {/* Slider */}
        <div className="mb-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 font-medium">1s</span>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={localDuration}
              onChange={(e) => handleDurationChange(parseFloat(e.target.value))}
              disabled={!localEnabled}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                       disabled:cursor-not-allowed disabled:opacity-50
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-5
                       [&::-webkit-slider-thumb]:h-5
                       [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:bg-blue-600
                       [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-moz-range-thumb]:w-5
                       [&::-moz-range-thumb]:h-5
                       [&::-moz-range-thumb]:rounded-full
                       [&::-moz-range-thumb]:bg-blue-600
                       [&::-moz-range-thumb]:border-0
                       [&::-moz-range-thumb]:cursor-pointer"
            />
            <span className="text-sm text-gray-600 font-medium">10s</span>
          </div>
          
          <p className="text-center mt-2 text-lg font-semibold text-blue-600">
            Current: {localDuration.toFixed(1)} seconds
          </p>
        </div>

        {/* Recommendations */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1">
            <Zap className="w-4 h-4" />
            Recommendations:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presets.map((preset, index) => (
              <button
                key={index}
                onClick={() => handlePresetClick(preset.duration)}
                disabled={!localEnabled}
                className={`px-3 py-2 text-left text-sm rounded-md transition-all duration-200
                         disabled:cursor-not-allowed disabled:opacity-50
                         ${localDuration === preset.duration
                           ? 'bg-blue-600 text-white font-semibold'
                           : 'bg-white hover:bg-blue-100 text-gray-700 border border-blue-200'
                         }`}
              >
                <div className="font-medium">{preset.label}</div>
                <div className="text-xs opacity-80">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview/Test Section */}
      {onTest && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="text-base font-semibold text-purple-900 mb-2">
            Preview
          </h3>
          <p className="text-sm text-purple-700 mb-3">
            Try speaking and pausing to see how it feels
          </p>
          <button
            onClick={onTest}
            disabled={!localEnabled}
            className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg
                     shadow-md hover:shadow-lg
                     transition-all duration-200
                     disabled:bg-gray-400 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-4 focus:ring-purple-300
                     flex items-center justify-center gap-2"
          >
            🎤 Test Auto-Pause
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg
                   shadow-md hover:shadow-lg
                   transition-all duration-200
                   disabled:bg-gray-400 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-4 focus:ring-green-300
                   flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Save Settings
        </button>

        <button
          onClick={handleCancel}
          className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg
                   transition-all duration-200
                   focus:outline-none focus:ring-4 focus:ring-gray-300
                   flex items-center gap-2"
        >
          <X className="w-5 h-5" />
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AutoPauseSettings;
