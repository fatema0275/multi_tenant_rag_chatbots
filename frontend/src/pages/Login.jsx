import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { loginUser, clearAuthError } from '../store/authSlice';
import {
  Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Zap,
  ShieldCheck, Database, Brain, AlertCircle
} from 'lucide-react';

// ─── Left visual panel ────────────────────────────────────────────────────────
const LeftPanel = () => (
  <div className="hidden lg:flex flex-col justify-between relative overflow-hidden bg-[#09090B] border-r border-border-dark flex-1 p-12">
    {/* Grid bg */}
    <div className="absolute inset-0 pointer-events-none"
         style={{
           backgroundImage: 'linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)',
           backgroundSize: '48px 48px',
         }} />
    {/* Glow */}
    <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full pointer-events-none"
         style={{ background: 'radial-gradient(ellipse, rgba(34,197,94,0.12) 0%, transparent 70%)' }} />

    {/* Logo */}
    <div className="relative flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-sm">
        <Zap className="w-4.5 h-4.5 text-[#09090B]" strokeWidth={2.5} />
      </div>
      <span className="font-heading font-bold text-xl text-white">
        Site<span className="text-accent">Mind</span>
      </span>
    </div>

    {/* Mini pipeline diagram */}
    <div className="relative flex flex-col gap-3 py-10">
      {[
        { icon: ShieldCheck, label: 'Domain Ownership Verified',   sub: 'DNS TXT or file upload'              },
        { icon: Database,    label: 'Tenant-Isolated Vector Store', sub: 'pgvector + Row-Level Security'       },
        { icon: Brain,       label: 'Entailment Verification',      sub: 'Every claim checked before response' },
      ].map(({ icon: Icon, label, sub }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
          className="flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon className="w-4 h-4 text-accent" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white">{label}</div>
            <div className="text-[12px] text-zinc-500 mt-0.5">{sub}</div>
          </div>
        </motion.div>
      ))}
    </div>

    {/* Testimonial quote */}
    <div className="relative">
      <blockquote className="text-[14px] text-zinc-400 leading-relaxed mb-3">
        "The entailment filtering is the first chatbot feature that made our legal team comfortable — it simply won't make things up."
      </blockquote>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-[#09090B] text-[10px] font-bold">PN</div>
        <div>
          <div className="text-[12px] font-medium text-white">Priya Nambiar</div>
          <div className="text-[11px] text-zinc-500">Head of Product, Nexlyr</div>
        </div>
      </div>
    </div>
  </div>
);

// ─── Login page ───────────────────────────────────────────────────────────────
const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, loading, error } = useSelector((s) => s.auth);

  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: true });
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    dispatch(clearAuthError());
    if (token) navigate('/dashboard');
  }, [token, navigate, dispatch]);

  // Shake animation when error appears
  useEffect(() => {
    if (error) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(t);
    }
  }, [error]);

  const validate = () => {
    const errs = {};
    if (!formData.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Enter a valid email';
    if (!formData.password) errs.password = 'Password is required';
    setFormErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const result = await dispatch(loginUser(formData));
    if (loginUser.fulfilled.match(result)) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }));
  };

  return (
    <div className="min-h-screen flex bg-page-light dark:bg-page-dark transition-colors duration-200">
      <LeftPanel />

      {/* Right — form panel */}
      <div className="flex flex-col flex-1 max-w-full lg:max-w-[480px] min-h-screen justify-center px-8 sm:px-12 py-10 bg-page-light dark:bg-page-dark">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#09090B]" strokeWidth={2.5} />
          </div>
          <span className="font-heading font-bold text-lg text-white">
            Site<span className="text-accent">Mind</span>
          </span>
        </div>

        <div className="max-w-sm w-full mx-auto lg:mx-0">
          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-8"
          >
            <h1 className="font-heading text-3xl font-bold text-zinc-900 dark:text-white mb-2">Welcome back</h1>
            <p className="text-sm text-txt-secondary-light dark:text-txt-secondary-dark">
              Log in to manage your chatbots and knowledge bases.
            </p>
          </motion.div>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 overflow-hidden"
              >
                <div className="flex items-start gap-2.5 p-3.5 rounded-[14px] bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            noValidate
            animate={shake ? { x: [0, -8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.45 }}
            className="space-y-5"
          >
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2" htmlFor="login-email">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  autoComplete="email"
                  className={`input-field pl-10 ${formErrors.email ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]' : ''}`}
                />
              </div>
              {formErrors.email && (
                <p className="mt-1.5 text-xs text-red-400 font-medium">{formErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest" htmlFor="login-password">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-accent hover:text-accent-dark transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className={`input-field pl-10 pr-10 ${formErrors.password ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]' : ''}`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formErrors.password && (
                <p className="mt-1.5 text-xs text-red-400 font-medium">{formErrors.password}</p>
              )}
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer group" htmlFor="login-remember">
              <input
                id="login-remember"
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="w-4 h-4 rounded border-border-dark bg-[#0E0E12] accent-accent cursor-pointer"
              />
              <span className="text-sm text-txt-secondary-light dark:text-txt-secondary-dark group-hover:text-txt-primary-light dark:group-hover:text-txt-primary-dark transition-colors">
                Keep me logged in
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="w-full btn-accent py-3 text-[15px] mt-1 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging in…
                </>
              ) : (
                <>
                  Log In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border-dark" />
              <span className="text-xs text-zinc-600">or</span>
              <div className="flex-1 h-px bg-border-dark" />
            </div>

            {/* Google (disabled placeholder) */}
            <button
              type="button"
              id="login-google"
              disabled
              title="Google Sign-In coming soon"
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-[18px] border border-zinc-200 dark:border-border-dark bg-zinc-50 dark:bg-[#0E0E12] text-zinc-400 dark:text-zinc-500 text-sm font-medium cursor-not-allowed opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google — Coming Soon
            </button>
          </motion.form>

          {/* Register link */}
          <p className="mt-8 text-sm text-txt-secondary-light dark:text-txt-secondary-dark text-center">
            No account yet?{' '}
            <Link to="/signup" className="text-accent hover:text-accent-dark font-semibold transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
