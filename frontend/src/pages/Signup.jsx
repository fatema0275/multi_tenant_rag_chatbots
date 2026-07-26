import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { signupUser, clearAuthError } from '../store/authSlice';
import {
  User, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Zap,
  CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';

// ─── Password strength ────────────────────────────────────────────────────────
const STRENGTH_CHECKS = [
  { id: 'length',    label: '8+ characters',   test: (p) => p.length >= 8 },
  { id: 'upper',     label: 'Uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower',     label: 'Lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'number',    label: 'Number',           test: (p) => /[0-9]/.test(p) },
  { id: 'special',   label: 'Special character',test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = [
  '',
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-400',
  'bg-accent',
  'bg-accent',
];

const PasswordStrengthMeter = ({ password }) => {
  const checks = useMemo(
    () => STRENGTH_CHECKS.map((c) => ({ ...c, passed: c.test(password) })),
    [password]
  );
  const score = checks.filter((c) => c.passed).length;

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-3 space-y-2.5 overflow-hidden"
    >
      {/* Bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex-1 h-1 rounded-full bg-[#27272A] overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${i <= score ? STRENGTH_COLORS[score] : ''}`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: i <= score ? 1 : 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              style={{ transformOrigin: 'left' }}
            />
          </div>
        ))}
      </div>
      <div className="text-[11px] text-zinc-500 font-medium">
        {STRENGTH_LABELS[score] || ''}
      </div>

      {/* Criteria list */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {checks.map(({ id, label, passed }) => (
          <div key={id} className="flex items-center gap-1.5">
            {passed
              ? <CheckCircle2 className="w-3 h-3 text-accent flex-shrink-0" />
              : <XCircle className="w-3 h-3 text-zinc-600 flex-shrink-0" />
            }
            <span className={`text-[11px] ${passed ? 'text-accent' : 'text-zinc-500'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ─── Signup page ──────────────────────────────────────────────────────────────
const Signup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, loading, error } = useSelector((s) => s.auth);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false,
  });
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    dispatch(clearAuthError());
    if (token) navigate('/dashboard');
  }, [token, navigate, dispatch]);

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = 'Full name is required';
    if (!formData.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Enter a valid email';
    if (!formData.password) errs.password = 'Password is required';
    else if (formData.password.length < 8) errs.password = 'Must be at least 8 characters';
    if (!formData.confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (!formData.terms) errs.terms = 'You must accept the terms to continue';
    setFormErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const result = await dispatch(signupUser(formData));
    if (signupUser.fulfilled.match(result)) {
      toast.success('Account created! Welcome to SiteMind.');
      navigate('/dashboard');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }));
  };

  const fields = [
    {
      id: 'signup-fullname', name: 'fullName', type: 'text',
      label: 'Full Name', placeholder: 'Alex Mercer', icon: User,
      autoComplete: 'name',
    },
    {
      id: 'signup-email', name: 'email', type: 'email',
      label: 'Work Email', placeholder: 'name@company.com', icon: Mail,
      autoComplete: 'email',
    },
  ];

  return (
    <div className="min-h-screen flex bg-page-light dark:bg-page-dark transition-colors duration-200">
      {/* Mobile logo */}
      <div className="flex flex-col flex-1 max-w-full lg:max-w-[500px] min-h-screen justify-center px-8 sm:px-12 py-10 bg-page-light dark:bg-page-dark">
        <Link to="/" className="flex items-center gap-2 mb-10 self-start">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#09090B]" strokeWidth={2.5} />
          </div>
          <span className="font-heading font-bold text-lg text-zinc-900 dark:text-white">
            Site<span className="text-accent">Mind</span>
          </span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[440px]"
        >
          {/* Heading */}
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold text-zinc-900 dark:text-white mb-2">Create your account</h1>
            <p className="text-sm text-txt-secondary-light dark:text-txt-secondary-dark">
              Register and deploy your first chatbot in minutes.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-[18px] bg-white dark:bg-surface-dark border border-zinc-200 dark:border-border-dark p-8 shadow-sm dark:shadow-card-dark">
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

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Full name + Email */}
              {fields.map(({ id, name, type, label, placeholder, icon: Icon, autoComplete }) => (
                <div key={name}>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2" htmlFor={id}>
                    {label}
                  </label>
                  <div className="relative">
                    <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                    <input
                      id={id}
                      type={type}
                      name={name}
                      value={formData[name]}
                      onChange={handleChange}
                      placeholder={placeholder}
                      autoComplete={autoComplete}
                      className={`input-field pl-10 ${formErrors[name] ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                  </div>
                  {formErrors[name] && (
                    <p className="mt-1.5 text-xs text-red-400 font-medium">{formErrors[name]}</p>
                  )}
                </div>
              ))}

              {/* Password with strength meter */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2" htmlFor="signup-password">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className={`input-field pl-10 pr-10 ${formErrors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="mt-1.5 text-xs text-red-400 font-medium">{formErrors.password}</p>
                )}
                <AnimatePresence>
                  {formData.password && <PasswordStrengthMeter password={formData.password} />}
                </AnimatePresence>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2" htmlFor="signup-confirm">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                  <input
                    id="signup-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    className={`input-field pl-10 pr-10 ${formErrors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirm((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Match indicator */}
                {formData.confirmPassword && (
                  <div className={`flex items-center gap-1.5 mt-1.5 text-xs font-medium ${
                    formData.password === formData.confirmPassword ? 'text-accent' : 'text-red-400'
                  }`}>
                    {formData.password === formData.confirmPassword
                      ? <><CheckCircle2 className="w-3.5 h-3.5" /> Passwords match</>
                      : <>{formErrors.confirmPassword || 'Passwords do not match'}</>
                    }
                  </div>
                )}
              </div>

              {/* Terms */}
              <div>
                <label className="flex items-start gap-2.5 cursor-pointer group" htmlFor="signup-terms">
                  <input
                    id="signup-terms"
                    type="checkbox"
                    name="terms"
                    checked={formData.terms}
                    onChange={handleChange}
                    className="w-4 h-4 mt-0.5 rounded border-zinc-300 dark:border-border-dark bg-white dark:bg-[#0E0E12] accent-accent cursor-pointer flex-shrink-0"
                  />
                  <span className="text-[13px] text-txt-secondary-light dark:text-txt-secondary-dark group-hover:text-zinc-900 dark:group-hover:text-txt-primary-dark transition-colors leading-relaxed">
                    I agree to the{' '}
                    <a href="#" className="text-accent hover:underline">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-accent hover:underline">Privacy Policy</a>
                  </span>
                </label>
                {formErrors.terms && (
                  <p className="mt-1.5 text-xs text-red-400 font-medium pl-6.5">{formErrors.terms}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                id="signup-submit"
                disabled={loading}
                className="w-full btn-accent py-3 text-[15px] mt-1 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Account…
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-8 text-sm text-txt-secondary-light dark:text-txt-secondary-dark text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:text-accent-dark font-semibold transition-colors">
              Log in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
