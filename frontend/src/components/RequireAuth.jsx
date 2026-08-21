import { Navigate, useLocation } from 'react-router-dom';
import { homeForRole, useAuth } from '../context/AuthContext';

function RequireAuth({ role, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && user.role !== role) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return children;
}

export default RequireAuth;
