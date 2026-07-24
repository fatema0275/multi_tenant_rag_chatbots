import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { forgotPasswordThunk, clearAuthError, clearForgotPasswordSent } from '../store/authSlice';
import {
  Mail, Loader2, ArrowLeft, Zap, CheckCircle2, AlertCircle, ArrowRight
} from 'lucide-react';

// ─── Success state ────────────────────────────────────────────────────────────
const SuccessState = ({ email }) => (
  <motion.div
    key="success"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    className="text-center"
  >
    {/* Animated check circle */}
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
      className="w-16 h-16 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-6"
    >
      <CheckCircle2 className="w-8 h-8 text-accent" />
    </motion.div>

    <h2 className="font-heading text-2xl font-bold text-white mb-3">
      Check your inbox
    </h2>
    <p className="text-[14px] text-txt-secondary-dark leading-relaxed mb-2">
      We've sent a password reset link to
    </p>
    <p className="text-[14px] font-semibold text-txt-primary-dark mb-6 font-mono">
      {email}
    </p>
    <p className="text-[13px] text-txt-secondary-dark leading-relaxed max-w-xs mx-auto">
      The link expires in 30 minutes. If you don't see the email, check your spam folder.
    </p>

    <div className="mt-8 flex flex-col gap-3">
      <Link
        to="/login"
        className="btn-accent px-6 py-3 text-[14px]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Login
      </Link>
      <p className="text-[13px] text-txt-secondary-dark">
        Wrong email?{' '}
        <Link to="/forgot-password" className="text-accent hover:underline" onClick={() => window.location.reload()}>
          Try another address
        </Link>
      </p>
    </div>
  </motion.div>
);

// ─── ForgotPassword page ──────────────────────────────────────────────────────
const ForgotPassword = () => {
  const dispatch = useDispatch();
  const { loading, error, forgotPasswordSent } = useSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    dispatch(clearAuthError());
    dispatch(clearForgotPasswordSent());
  }, [dispatch]);

  const validate = () => {
    if (!email) { setEmailError('Email is required'); return false; }
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailError('Enter a valid email address'); return false; }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    dispatch(forgotPasswordThunk({ email }));
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-page-dark px-4 sm:px-0 py-12">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2 mb-10">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#09090B]" strokeWidth={2.5} />
          </div>
          <span className="font-heading font-bold text-lg text-white">
            Site<span className="text-accent">Mind</span>
          </span>
        </Link>
      </div>

      <div className="w-full max-w-[400px] mx-auto">
        <AnimatePresence mode="wait">
          {forgotPasswordSent ? (
            <SuccessState key="success" email={email} />
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
            >
              {/* Heading */}
              <div className="text-center mb-8">
                <h1 className="font-heading text-3xl font-bold text-white mb-2">
                  Reset password
                </h1>
                <p className="text-sm text-txt-secondary-dark leading-relaxed">
                  Enter the email associated with your account and we'll 
                  send a reset link.
                </p>
              </div>

              {/* Card */}
              <div className="rounded-[18px] bg-surface-dark border border-border-dark p-8 shadow-card-dark">
                {/* Error */}
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

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {/* Email field */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2" htmlFor="forgot-email">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                      <input
                        id="forgot-email"
                        type="email"
                        name="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError('');
                        }}
                        placeholder="name@company.com"
                        autoComplete="email"
                        autoFocus
                        className={`input-field pl-10 ${emailError ? 'border-red-500 focus:border-red-500' : ''}`}
                      />
                    </div>
                    {emailError && (
                      <p className="mt-1.5 text-xs text-red-400 font-medium">{emailError}</p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    id="forgot-submit"
                    disabled={loading}
                    className="w-full btn-accent py-3 text-[15px] disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending Reset Link…
                      </>
                    ) : (
                      <>
                        Send Reset Link
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Back to login */}
              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-txt-secondary-dark hover:text-txt-primary-dark transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Login
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
