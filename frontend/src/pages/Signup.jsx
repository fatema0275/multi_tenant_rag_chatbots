import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import {
  signupUser, loginUser, googleLoginUser, clearAuthError,
  requestSignupOtp, verifySignupOtp, resendSignupOtp, cancelOtpStep
} from '../store/authSlice';
import {
  User, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Zap,
  CheckCircle2, XCircle, AlertCircle, ShieldCheck, ArrowLeft, RefreshCw,
} from 'lucide-react';



// ─── Password strength ────────────────────────────────────────────────────────
const STRENGTH_CHECKS = [
  { id: 'length',  label: '8+ characters',    test: (p) => p.length >= 8 },
  { id: 'upper',   label: 'Uppercase',         test: (p) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'Lowercase',         test: (p) => /[a-z]/.test(p) },
  { id: 'number',  label: 'Number',            test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'Special char',      test: (p) => /[^A-Za-z0-9]/.test(p) },
];
const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-accent', 'bg-accent'];

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
      transition={{ duration: 0.2 }}
      className="mt-2 space-y-1.5 overflow-hidden"
    >
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-zinc-200 dark:bg-[#27272A] overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${i <= score ? STRENGTH_COLORS[score] : ''}`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: i <= score ? 1 : 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              style={{ transformOrigin: 'left' }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 font-medium">{STRENGTH_LABELS[score] || ''}</span>
        <div className="flex gap-2">
          {checks.map(({ id, label, passed }) => (
            <div key={id} className="flex items-center gap-0.5">
              {passed
                ? <CheckCircle2 className="w-2.5 h-2.5 text-accent flex-shrink-0" />
                : <XCircle className="w-2.5 h-2.5 text-zinc-500 dark:text-zinc-600 flex-shrink-0" />
              }
              <span className={`text-[9px] ${passed ? 'text-accent' : 'text-zinc-500'}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Shared input wrapper ─────────────────────────────────────────────────────
const Field = ({ id, name, label, type, placeholder, icon: Icon, autoComplete,
                  value, onChange, error, right }) => (
  <div>
    <label
      className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5"
      htmlFor={id}
    >
      {label}
    </label>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
      <input
        id={id}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`input-field pl-9 pr-${right ? '9' : '4'} py-2.5 text-[13px] rounded-[14px] ${error ? 'border-red-500 focus:border-red-500' : ''}`}
      />
      {right}
    </div>
    {error && <p className="mt-1 text-[11px] text-red-400 font-medium">{error}</p>}
  </div>
);

// ─── Segmented tab toggle ─────────────────────────────────────────────────────
const ModeToggle = ({ mode, setMode }) => (
  <div className="flex p-0.5 rounded-[14px] bg-zinc-100 dark:bg-[#18181B] border border-zinc-200 dark:border-border-dark mb-5">
    {['signup', 'login'].map((m) => (
      <button
        key={m}
        type="button"
        onClick={() => setMode(m)}
        className={`flex-1 py-2 text-[13px] font-semibold rounded-[12px] transition-all duration-200 ${
          mode === m
            ? 'bg-white dark:bg-surface-dark text-txt-primary-light dark:text-txt-primary-dark shadow-sm'
            : 'text-txt-secondary-light dark:text-txt-secondary-dark hover:text-txt-primary-light dark:hover:text-txt-primary-dark'
        }`}
      >
        {m === 'signup' ? 'Sign up' : 'Log in'}
      </button>
    ))}
  </div>
);

// ─── Auth page ────────────────────────────────────────────────────────────────
const Signup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, loading, error, otpStep, pendingEmail, devOtp } = useSelector((s) => s.auth);

  const [mode, setMode] = useState(
    searchParams.get('tab') === 'login' ? 'login' : 'signup'
  );

  // Sign-up fields
  const [signupData, setSignupData] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [signupErrors, setSignupErrors] = useState({});
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);

  // OTP fields
  const [otpInput, setOtpInput] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Login fields
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginErrors, setLoginErrors] = useState({});
  const [showLoginPw, setShowLoginPw] = useState(false);

  useEffect(() => {
    dispatch(clearAuthError());
    if (token) {
      const { user } = useSelector ? { user: null } : {};
      // Navigate to admin if admin role
      const storedUserRaw = sessionStorage.getItem('sitemind_user');
      let isUserAdmin = false;
      if (storedUserRaw) {
        try {
          const parsed = JSON.parse(storedUserRaw);
          if (parsed?.role === 'admin') isUserAdmin = true;
        } catch (_) {}
      }
      if (isUserAdmin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [token, navigate, dispatch]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Switch mode → clear errors & cancel OTP
  const switchMode = (m) => {
    dispatch(clearAuthError());
    dispatch(cancelOtpStep());
    setSignupErrors({});
    setLoginErrors({});
    setMode(m);
  };

  // ── Sign-up logic (OTP Request) ──
  const validateSignup = () => {
    const errs = {};
    if (!signupData.fullName.trim()) errs.fullName = 'Full name is required';
    if (!signupData.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(signupData.email)) errs.email = 'Enter a valid email';
    if (!signupData.password) errs.password = 'Password is required';
    else if (signupData.password.length < 8) errs.password = 'Must be at least 8 characters';
    if (!signupData.confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (signupData.password !== signupData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setSignupErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!validateSignup()) return;
    const result = await dispatch(requestSignupOtp(signupData));
    if (requestSignupOtp.fulfilled.match(result)) {
      toast.success(`Verification code sent to ${signupData.email}!`);
      setResendCooldown(30);
      setOtpInput('');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpInput || otpInput.trim().length !== 6) {
      toast.error('Please enter the complete 6-digit verification code.');
      return;
    }
    const result = await dispatch(verifySignupOtp({ email: pendingEmail, otp: otpInput.trim() }));
    if (verifySignupOtp.fulfilled.match(result)) {
      toast.success('Email verified! Welcome to SiteMind.');
      const userRole = result.payload?.user?.role;
      navigate(userRole === 'admin' ? '/admin' : '/dashboard');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    const result = await dispatch(resendSignupOtp({ email: pendingEmail }));
    if (resendSignupOtp.fulfilled.match(result)) {
      toast.success('New verification code sent!');
      setResendCooldown(30);
    }
  };

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));
    if (signupErrors[name]) setSignupErrors((prev) => ({ ...prev, [name]: null }));
  };

  // ── Login logic ──
  const validateLogin = () => {
    const errs = {};
    if (!loginData.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(loginData.email)) errs.email = 'Enter a valid email';
    if (!loginData.password) errs.password = 'Password is required';
    setLoginErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateLogin()) return;
    const result = await dispatch(loginUser(loginData));
    if (loginUser.fulfilled.match(result)) {
      toast.success('Welcome back!');
      const userRole = result.payload?.user?.role;
      navigate(userRole === 'admin' ? '/admin' : '/dashboard');
    }
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
    if (loginErrors[name]) setLoginErrors((prev) => ({ ...prev, [name]: null }));
  };

  // ── Google Auth handlers ──
  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      toast.error('Google authentication failed: No ID token received.');
      return;
    }
    const result = await dispatch(googleLoginUser({ idToken: credentialResponse.credential }));
    if (googleLoginUser.fulfilled.match(result)) {
      toast.success(mode === 'signup' ? 'Account created! Welcome to SiteMind.' : 'Welcome back!');
      navigate('/dashboard');
    }
  };

  const handleGoogleError = () => {
    toast.error('Google Sign-In was cancelled or failed.');
  };


  // ── Eye-toggle button helper ──

  const EyeBtn = ({ show, onToggle, label }) => (
    <button
      type="button"
      tabIndex={-1}
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
      aria-label={label}
    >
      {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-page-light dark:bg-page-dark transition-colors duration-200 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-[420px]"
      >
        {/* Logo */}
        <Link
          to="/"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 mb-6 justify-center"
        >
          <div className="w-7 h-7 rounded-xl bg-accent flex items-center justify-center shadow-sm">
            <Zap className="w-3.5 h-3.5 text-[#09090B]" strokeWidth={2.5} />
          </div>
          <span className="font-heading font-bold text-[17px] text-zinc-900 dark:text-white">
            Site<span className="text-accent">Mind</span>
          </span>
        </Link>

        {/* Card */}
        <div className="rounded-[20px] bg-white dark:bg-surface-dark border border-zinc-200 dark:border-border-dark p-6 shadow-sm dark:shadow-card-dark">

          {otpStep ? (
            /* ── OTP Verification Step ── */
            <motion.div
              key="otp-view"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <button
                type="button"
                onClick={() => dispatch(cancelOtpStep())}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign up
              </button>

              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-2 text-accent">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="font-heading text-[20px] font-bold text-zinc-900 dark:text-white">
                  Verify your email
                </h2>
                <p className="text-[12px] text-txt-secondary-light dark:text-txt-secondary-dark">
                  We sent a 6-digit verification code to <span className="font-medium text-zinc-900 dark:text-white">{pendingEmail}</span>
                </p>
              </div>

              {/* Error banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    key="otp-error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-2 p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 text-center" htmlFor="otp-input">
                    Verification Code
                  </label>
                  <input
                    id="otp-input"
                    type="text"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center font-mono text-xl tracking-[0.4em] py-3 rounded-[14px] input-field border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 focus:border-accent"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  id="otp-submit"
                  disabled={loading || otpInput.length !== 6}
                  className="w-full btn-accent py-2.5 text-[14px] disabled:opacity-50"
                >
                  {loading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying…</>
                  ) : (
                    <>Verify & Create Account <ArrowRight className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </form>

              <div className="text-center pt-1">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleResendOtp}
                  className="text-[12px] font-semibold text-accent hover:text-accent-dark transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </motion.div>
          ) : (
            /* ── Regular Auth Card (Sign up / Log in) ── */
            <>
              {/* Tab toggle */}
              <ModeToggle mode={mode} setMode={switchMode} />

              {/* Heading */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode + '-heading'}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="mb-4"
                >
                  <h1 className="font-heading text-[22px] font-bold text-zinc-900 dark:text-white leading-tight">
                    {mode === 'signup' ? 'Create your account' : 'Welcome back'}
                  </h1>
                  <p className="text-[12px] text-txt-secondary-light dark:text-txt-secondary-dark mt-1">
                    {mode === 'signup'
                      ? 'Deploy your first chatbot in minutes.'
                      : 'Log in to manage your chatbots and knowledge bases.'}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Error banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 overflow-hidden"
                  >
                    <div className="flex items-start gap-2 p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Manual Forms ── */}
              <AnimatePresence mode="wait">

                {mode === 'signup' ? (
                  <motion.form
                    key="signup-form"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.22 }}
                    onSubmit={handleSignup}
                    noValidate
                    className="space-y-3"
                  >
                    <Field
                      id="signup-fullname" name="fullName" type="text"
                      label="Full Name" placeholder="Alex Mercer" icon={User}
                      autoComplete="name"
                      value={signupData.fullName} onChange={handleSignupChange}
                      error={signupErrors.fullName}
                    />
                    <Field
                      id="signup-email" name="email" type="email"
                      label="Work Email" placeholder="name@company.com" icon={Mail}
                      autoComplete="email"
                      value={signupData.email} onChange={handleSignupChange}
                      error={signupErrors.email}
                    />

                    {/* Password */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5" htmlFor="signup-password">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                        <input
                          id="signup-password" type={showSignupPw ? 'text' : 'password'}
                          name="password" value={signupData.password}
                          onChange={handleSignupChange} placeholder="At least 8 characters"
                          autoComplete="new-password"
                          className={`input-field pl-9 pr-9 py-2.5 text-[13px] rounded-[14px] ${signupErrors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                        />
                        <EyeBtn
                          show={showSignupPw}
                          onToggle={() => setShowSignupPw((p) => !p)}
                          label={showSignupPw ? 'Hide password' : 'Show password'}
                        />
                      </div>
                      {signupErrors.password && <p className="mt-1 text-[11px] text-red-400 font-medium">{signupErrors.password}</p>}
                      <AnimatePresence>
                        {signupData.password && <PasswordStrengthMeter password={signupData.password} />}
                      </AnimatePresence>
                    </div>

                    {/* Confirm password */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5" htmlFor="signup-confirm">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                        <input
                          id="signup-confirm" type={showSignupConfirm ? 'text' : 'password'}
                          name="confirmPassword" value={signupData.confirmPassword}
                          onChange={handleSignupChange} placeholder="Repeat password"
                          autoComplete="new-password"
                          className={`input-field pl-9 pr-9 py-2.5 text-[13px] rounded-[14px] ${signupErrors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                        />
                        <EyeBtn
                          show={showSignupConfirm}
                          onToggle={() => setShowSignupConfirm((p) => !p)}
                          label={showSignupConfirm ? 'Hide confirm password' : 'Show confirm password'}
                        />
                      </div>
                      {signupData.confirmPassword && (
                        <div className={`flex items-center gap-1 mt-1 text-[11px] font-medium ${
                          signupData.password === signupData.confirmPassword ? 'text-accent' : 'text-red-400'
                        }`}>
                          {signupData.password === signupData.confirmPassword
                            ? <><CheckCircle2 className="w-3 h-3" /> Passwords match</>
                            : <>{signupErrors.confirmPassword || 'Passwords do not match'}</>
                          }
                        </div>
                      )}
                    </div>

                    <button
                      type="submit" id="signup-submit" disabled={loading}
                      className="w-full btn-accent py-2.5 text-[14px] mt-1 disabled:opacity-50"
                    >
                      {loading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending Code…</>
                        : <> Continue <ArrowRight className="w-3.5 h-3.5" /></>
                      }
                    </button>
                  </motion.form>

                ) : (

                  <motion.form
                    key="login-form"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.22 }}
                    onSubmit={handleLogin}
                    noValidate
                    className="space-y-3"
                  >
                    <Field
                      id="login-email" name="email" type="email"
                      label="Email" placeholder="name@company.com" icon={Mail}
                      autoComplete="email"
                      value={loginData.email} onChange={handleLoginChange}
                      error={loginErrors.email}
                    />

                    {/* Password with forgot link */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest" htmlFor="login-password">
                          Password
                        </label>
                        <Link to="/forgot-password" className="text-[11px] text-accent hover:text-accent-dark transition-colors">
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                        <input
                          id="login-password" type={showLoginPw ? 'text' : 'password'}
                          name="password" value={loginData.password}
                          onChange={handleLoginChange} placeholder="••••••••"
                          autoComplete="current-password"
                          className={`input-field pl-9 pr-9 py-2.5 text-[13px] rounded-[14px] ${loginErrors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                        />
                        <EyeBtn
                          show={showLoginPw}
                          onToggle={() => setShowLoginPw((p) => !p)}
                          label={showLoginPw ? 'Hide password' : 'Show password'}
                        />
                      </div>
                      {loginErrors.password && <p className="mt-1 text-[11px] text-red-400 font-medium">{loginErrors.password}</p>}
                    </div>

                    <button
                      type="submit" id="login-submit" disabled={loading}
                      className="w-full btn-accent py-2.5 text-[14px] mt-1 disabled:opacity-50"
                    >
                      {loading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Logging in…</>
                        : <>Log In <ArrowRight className="w-3.5 h-3.5" /></>
                      }
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* ── Google Sign-In at the BOTTOM of the Card ── */}
              <div className="mt-5 space-y-4">
                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                  <span className="absolute bg-white dark:bg-surface-dark px-2 text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">
                    Or continue with
                  </span>
                </div>
                <div className="w-full flex justify-center [&>div]:w-full overflow-hidden rounded-[14px]">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    text={mode === 'signup' ? 'signup_with' : 'continue_with'}
                    size="large"
                    shape="rectangular"
                    width="350"
                  />
                </div>
              </div>
            </>
          )}
        </div>


        {/* Bottom toggle hint */}
        <p className="mt-4 text-[12px] text-txt-secondary-light dark:text-txt-secondary-dark text-center">
          {mode === 'signup'
            ? <>Already have an account?{' '}<button type="button" onClick={() => switchMode('login')} className="text-accent hover:text-accent-dark font-semibold transition-colors">Log in</button></>
            : <>No account yet?{' '}<button type="button" onClick={() => switchMode('signup')} className="text-accent hover:text-accent-dark font-semibold transition-colors">Sign up free</button></>
          }
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
