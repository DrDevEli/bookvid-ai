import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { login, clearError, selectIsLoading, selectError, enterDemoMode } from '../../store/slices/authSlice';

// Validation schema
const loginSchema = z.object({
  identifier: z.string()
    .min(1, 'Email or username is required')
    .refine((val) => {
      // Basic email validation
      if (val.includes('@')) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      }
      return true; // Allow username
    }, 'Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const LoginForm = ({ onSuccess, onDemoMode }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    dispatch(clearError());
    try {
      const result = await dispatch(login(data)).unwrap();
      if (onSuccess) {
        onSuccess(result);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      // Error is handled by Redux
    }
  };

  const handleDemoMode = () => {
    dispatch(enterDemoMode());
    if (onDemoMode) {
      onDemoMode();
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          {error.message || 'Login failed'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
            Email or Username
          </label>
          <input
            {...register('identifier')}
            type="text"
            id="identifier"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your email or username"
          />
          {errors.identifier && (
            <p className="text-red-500 text-sm mt-1">{errors.identifier.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              aria-label="Toggle password visibility"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={handleDemoMode}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Try Demo Mode
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;