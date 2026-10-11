import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
export default function RequireCustomer({ children }) {
  const { user } = useUser(), location = useLocation();
  return user?.role === 'customer' ? children : <Navigate to="/login" replace state={{ from: location }} />;
}
