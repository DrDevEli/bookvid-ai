import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { getProfile, selectIsAuthenticated, selectIsLoading, selectUser, selectIsDemoMode, enterDemoMode } from '../../store/slices/authSlice';
import demoService from '../../services/demoService';

const AuthGuard = ({ children, requireAuth = true }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);
  const user = useSelector(selectUser);
  const isDemoMode = useSelector(selectIsDemoMode);
  const token = localStorage.getItem('token');

  useEffect(() => {
    // Check if demo mode is active in localStorage but not in Redux
    if (demoService.isDemoMode() && !isDemoMode && !isAuthenticated) {
      dispatch(enterDemoMode());
      return;
    }

    // If we have a token but no user data, try to get profile
    if (token && !user && !isLoading && !isDemoMode) {
      dispatch(getProfile());
    }
  }, [dispatch, token, user, isLoading, isDemoMode, isAuthenticated]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authentication is not required but user is authenticated (e.g., login page)
  if (!requireAuth && isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return children;
};

export default AuthGuard;