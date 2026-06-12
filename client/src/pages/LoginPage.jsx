import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import AuthGuard from '../components/auth/AuthGuard';
import GuestModeButton from '../components/demo/GuestModeButton';

const LoginPage = () => {
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              BookVid AI
            </h1>
            <span className="inline-block px-3 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full mb-4">
              Personal Project Demo
            </span>
            <p className="text-gray-600 mb-8">
              AI-Powered Video Creation Portfolio Demonstration
            </p>
          </div>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <LoginForm onSuccess={handleLoginSuccess} />
          
          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or</span>
              </div>
            </div>
            
            <GuestModeButton className="w-full px-4 py-2 rounded-md text-sm font-medium" />
            
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default LoginPage;