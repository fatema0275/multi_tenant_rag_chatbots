import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Login — redirects to the combined auth page (/signup?tab=login).
 * All login logic now lives in Signup.jsx (the unified auth card).
 */
const Login = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/signup?tab=login', { replace: true });
  }, [navigate]);
  return null;
};

export default Login;
