import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import demoService from '../../services/demoService';

const GuestModeButton = ({ className = '' }) => {
  const navigate = useNavigate();

  const handleGuestMode = () => {
    // Initialize demo mode
    demoService.initializeDemoMode();
    
    // Navigate to dashboard in demo mode
    navigate('/dashboard');
  };

  return (
    <button
      onClick={handleGuestMode}
      className={`flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors ${className}`}
    >
      <Eye className="h-4 w-4" />
      <span>Explore as Guest</span>
    </button>
  );
};

export default GuestModeButton;