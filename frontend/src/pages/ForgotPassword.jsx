import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  forgotPasswordThunk, resetPasswordThunk, clearAuthError, clearForgotPasswordSent
} from '../store/authSlice';
import {
  Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, Zap, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck
} from 'lucide-react';

// ─── Success state ────────────────────────────────────────────────────────────
const SuccessState = () => (
  <motion.div
    key="success"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    className="text-center"
  >
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
      className="w-16 h-16 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-6"
    >
      <CheckCircle2 className="w-8 h-8 text-accent" />
    </motion.div>

    <h2 className="font-heading text-2xl font-bold text-zinc-900 dark:text-white mb-3">
      Password updated!
    </h2>
    <p className="text-[14px] text-txt-secondary-light dark:text-txt-secondary-dark leading-relaxed mb-6">
      Your password has been successfully reset. You can now log in with your new password.
    </p>

    <div className="mt-8 flex flex-col gap-3">
      <Link
        to="/login"
        className="btn-accent px-6 py-3 text-[14px] justify-center"
      >
        Log In with New Password
        <ArrowRight className="w-4 h-4 ml-1" />
      </Link>
    </div>
  </motion.div>
);

// ─── ForgotPassword page ──────────────────────────────────────────────────────
const ForgotPassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, forgotOtpStep, forgotEmail, forgotDevOtp, forgotSuccess } = useSelector((s) => s.auth);

  // Form states
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // OTP & New password states
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetErrors, setResetErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    dispatch(clearAuthError());
    dispatch(clearForgotPasswordSent());
  }, [dispatch]);

  // Request Code Handler
  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!email) { setEmailError('Email is required'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailError('Enter a valid email address'); return; }
    setEmailError('');

    const result = await dispatch(forgotPasswordThunk({ email }));
    if (forgotPasswordThunk.fulfilled.match(result)) {
      toast.success(`Verification code sent to ${email}`);
    }
  };

  // Reset Password Handler
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!otp || otp.trim().length !== 6) errs.otp = 'Enter 6-digit code';
    if (!newPassword) errs.newPassword = 'Password is required';
    else if (newPassword.length < 8) errs.newPassword = 'Must be at least 8 characters';
    if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match';

    setResetErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const result = await dispatch(resetPasswordThunk({
      email: forgotEmail || email,
      otp: otp.trim(),
      newPassword
    }));

    if (resetPasswordThunk.fulfilled.match(result)) {
      toast.success('Password successfully reset!');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-page-light dark:bg-page-dark px-4 sm:px-0 py-12 transition-colors duration-200">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#09090B]" strokeWidth={2.5} />
          </div>
          <span className="font-heading font-bold text-lg text-zinc-900 dark:text-white">
            Site<span className="text-accent">Mind</span>
          </span>
        </Link>
      </div>

      <div className="w-full max-w-[410px] mx-auto">
        <AnimatePresence mode="wait">
          {forgotSuccess ? (
            <SuccessState key="success" />
          ) : forgotOtpStep ? (
            /* ── Step 2: OTP & New Password Form ── */
            <motion.div
              key="otp-step"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-6">
                <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-2 text-accent">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-white mb-1">
                  Enter verification code
                </h1>
                <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark">
                  We sent a 6-digit code to <span className="font-semibold text-zinc-900 dark:text-white">{forgotEmail}</span>
                </p>
              </div>

              <div className="rounded-[20px] bg-white dark:bg-surface-dark border border-zinc-200 dark:border-border-dark p-6 shadow-sm dark:shadow-card-dark">
                {error && (
                  <div className="mb-4 flex items-start gap-2.5 p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleResetPassword} noValidate className="space-y-4">
                  {/* Code */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
                      6-Digit Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      className="input-field text-center font-mono text-lg tracking-[0.4em] py-2 rounded-[12px]"
                    />
                    {resetErrors.otp && <p className="mt-1 text-[11px] text-red-400">{resetErrors.otp}</p>}
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="input-field pl-9 pr-9 py-2 text-[13px] rounded-[12px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {resetErrors.newPassword && <p className="mt-1 text-[11px] text-red-400">{resetErrors.newPassword}</p>}
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="input-field pl-9 pr-9 py-2 text-[13px] rounded-[12px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {resetErrors.confirmPassword && <p className="mt-1 text-[11px] text-red-400">{resetErrors.confirmPassword}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-accent py-2.5 text-[14px] mt-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Resetting Password…</>
                    ) : (
                      <>Reset Password <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              </div>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => dispatch(clearForgotPasswordSent())}
                  className="inline-flex items-center gap-1 text-xs text-txt-secondary-light dark:text-txt-secondary-dark hover:text-txt-primary-light dark:hover:text-txt-primary-dark transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Use a different email
                </button>
              </div>
            </motion.div>
          ) : (
            /* ── Step 1: Request Code Form ── */
            <motion.div
              key="request-step"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-6">
                <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                  Reset password
                </h1>
                <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark leading-relaxed">
                  Enter your registered account email and we'll send you a 6-digit verification code.
                </p>
              </div>

              <div className="rounded-[20px] bg-white dark:bg-surface-dark border border-zinc-200 dark:border-border-dark p-6 shadow-sm dark:shadow-card-dark">
                {/* Error Banner for Unregistered Emails or API errors */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 overflow-hidden"
                    >
                      <div className="flex items-start gap-2.5 p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleRequestCode} noValidate className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5" htmlFor="forgot-email">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      <input
                        id="forgot-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError('');
                          if (error) dispatch(clearAuthError());
                        }}
                        placeholder="name@company.com"
                        autoComplete="email"
                        autoFocus
                        className={`input-field pl-10 text-[13px] py-2.5 rounded-[12px] ${emailError ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {emailError && <p className="mt-1 text-[11px] text-red-400 font-medium">{emailError}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-accent py-2.5 text-[14px] disabled:opacity-50"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Verifying Account…</>
                    ) : (
                      <>Send Verification Code <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              </div>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-txt-secondary-light dark:text-txt-secondary-dark hover:text-txt-primary-light dark:hover:text-txt-primary-dark transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ForgotPassword;
