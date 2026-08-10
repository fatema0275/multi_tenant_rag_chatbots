'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'sitemind-fallback-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

/**
 * Generate JWT token for a given user ID
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Sanitize user object to never return password_hash
 */
const sanitizeUser = (user) => {
  const plainUser = user.get ? user.get({ plain: true }) : user;
  const { password_hash, ...userWithoutPassword } = plainUser;
  return userWithoutPassword;
};

/**
 * Register a new user
 */
const signup = async ({ email, password, name }) => {
  const normalizedEmail = email.trim().toLowerCase();
  
  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    const error = new Error('Email is already registered');
    error.statusCode = 400;
    throw error;
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const newUser = await User.create({
    email: normalizedEmail,
    password_hash: passwordHash,
    name: name ? name.trim() : null
  });

  const token = generateToken(newUser.id);
  return {
    user: sanitizeUser(newUser),
    token
  };
};

/**
 * Authenticate an existing user
 */
const login = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user.id);
  return {
    user: sanitizeUser(user),
    token
  };
};

const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Authenticate or register a user via Google OAuth ID Token
 */
const googleAuth = async ({ idToken }) => {
  if (!idToken) {
    const error = new Error('Google ID token is required');
    error.statusCode = 400;
    throw error;
  }

  let payload;
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId || undefined
    });
    payload = ticket.getPayload();
  } catch (err) {
    const error = new Error('Invalid or expired Google authentication token');
    error.statusCode = 401;
    throw error;
  }

  if (!payload || !payload.email) {
    const error = new Error('Google authentication failed: Email not provided by Google');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const userName = payload.name || payload.given_name || null;

  let user = await User.findOne({ where: { email: normalizedEmail } });

  if (!user) {
    // Generate a secure random password hash for Google OAuth users to satisfy schema constraint
    const randomSecret = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomSecret, 10);

    user = await User.create({
      email: normalizedEmail,
      password_hash: passwordHash,
      name: userName
    });
  } else if (!user.name && userName) {
    // Update user name if missing
    user.name = userName;
    await user.save();
  }

  const token = generateToken(user.id);
  return {
    user: sanitizeUser(user),
    token
  };
};

// In-memory store for pending signup OTPs
const otpStore = new Map();

/**
 * Request Signup OTP
 */
const requestSignupOtp = async ({ email, password, name }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    const error = new Error('Email is already registered');
    error.statusCode = 400;
    throw error;
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  otpStore.set(normalizedEmail, {
    otp,
    name: name ? name.trim() : null,
    passwordHash,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  });

  console.log(`\n==================================================`);
  console.log(`[AUTH] Verification OTP for ${normalizedEmail}: ${otp}`);
  console.log(`==================================================\n`);

  return {
    message: `Verification code sent to ${normalizedEmail}`,
    email: normalizedEmail,
    devOtp: otp
  };
};

/**
 * Verify Signup OTP & Create User
 */
const verifySignupOtp = async ({ email, otp }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const record = otpStore.get(normalizedEmail);

  if (!record) {
    const error = new Error('No pending verification found or code expired. Please request a new code.');
    error.statusCode = 400;
    throw error;
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedEmail);
    const error = new Error('Verification code has expired. Please request a new code.');
    error.statusCode = 400;
    throw error;
  }

  if (record.otp !== String(otp).trim()) {
    const error = new Error('Invalid verification code. Please check and try again.');
    error.statusCode = 400;
    throw error;
  }

  // OTP verified! Create user account
  const newUser = await User.create({
    email: normalizedEmail,
    password_hash: record.passwordHash,
    name: record.name
  });

  otpStore.delete(normalizedEmail);

  const token = generateToken(newUser.id);
  return {
    user: sanitizeUser(newUser),
    token
  };
};

/**
 * Resend Signup OTP
 */
const resendSignupOtp = async ({ email }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    const error = new Error('Email is already registered');
    error.statusCode = 400;
    throw error;
  }

  const existingRecord = otpStore.get(normalizedEmail);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore.set(normalizedEmail, {
    otp,
    name: existingRecord ? existingRecord.name : null,
    passwordHash: existingRecord ? existingRecord.passwordHash : null,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  console.log(`\n==================================================`);
  console.log(`[AUTH] Resent Verification OTP for ${normalizedEmail}: ${otp}`);
  console.log(`==================================================\n`);

  return {
    message: `New verification code sent to ${normalizedEmail}`,
    email: normalizedEmail,
    devOtp: otp
  };
};

module.exports = {
  signup,
  login,
  googleAuth,
  requestSignupOtp,
  verifySignupOtp,
  resendSignupOtp,
  generateToken,
  sanitizeUser
};


