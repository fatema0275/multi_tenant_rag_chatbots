/**
 * useAuth.js
 * Convenience hook — surfaces the auth state and dispatch actions in one call.
 * Avoids repeated useSelector / useDispatch boilerplate across auth-aware components.
 */
import { useSelector, useDispatch } from 'react-redux';
import { logout, clearAuthError } from '../store/authSlice';

/**
 * @returns {{
 *   user: object|null,
 *   token: string|null,
 *   loading: boolean,
 *   error: string|null,
 *   isAuthenticated: boolean,
 *   logout: () => void,
 *   clearError: () => void,
 * }}
 */
const useAuth = () => {
  const dispatch = useDispatch();
  const { user, token, loading, error } = useSelector((s) => s.auth);

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!token,
    logout: () => dispatch(logout()),
    clearError: () => dispatch(clearAuthError()),
  };
};

export default useAuth;
