import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'staff' | 'teacher' | 'parent'>;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();
  const { isDataLoaded } = useData();
  const location = useLocation();

  if (!isDataLoaded) {
    return <div className="h-screen flex items-center justify-center p-8 text-slate-500">Chargement...</div>;
  }

  if (!isAuthenticated) {
    // Redirect to login, preserve intended location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user) {
    const userRole = user.role;
    const hasAccess = allowedRoles.includes(userRole);
    
    if (!hasAccess) {
      // Unauthorized, redirect to home or show message
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default PrivateRoute;