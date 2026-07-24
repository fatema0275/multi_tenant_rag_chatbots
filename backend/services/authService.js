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

module.exports = {
  signup,
  login,
  generateToken,
  sanitizeUser
};
