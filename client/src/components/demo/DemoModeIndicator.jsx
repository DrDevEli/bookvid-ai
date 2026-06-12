import React from 'react';
import { Eye, Info } from 'lucide-react';
import demoService from '../../services/demoService';

const DemoModeIndicator = ({ onExitDemo }) => {
  const isDemoMode = demoService.isDemoMode();

  if (!isDemoMode) return null;

  return (
    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">Demo Mode Active</span>
          <div className="hidden sm:flex items-center space-x-1 text-blue-100">
            <Info className="h-3 w-3" />
            <span className="text-xs">
              You're viewing sample data for portfolio demonstration
            </span>
          </div>
        </div>
        {onExitDemo && (
          <button
            onClick={onExitDemo}
            className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
          >
            Exit Demo
          </button>
        )}
      </div>
    </div>
  );
};

export default DemoModeIndicator;