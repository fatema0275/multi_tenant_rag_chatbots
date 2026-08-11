'use strict';

const crypto = require('crypto');
const { Website, VerificationLog } = require('../models');

const dns = require('dns').promises;

/**
 * Clean domain for website record
 */
const cleanDomain = (domain) => {
  let cleaned = domain.trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//, '');
  cleaned = cleaned.split('/')[0];
  cleaned = cleaned.split(':')[0];
  return cleaned;
};

/**
 * Pre-flight validation for registering a new website
 */
const validateUrlPreFlight = async (rawInput) => {
  let urlString = rawInput.trim();
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(urlString);
  } catch (err) {
    const error = new Error('Invalid URL format');
    error.statusCode = 400;
    throw error;
  }

  const hostname = parsedUrl.hostname;
  if (!hostname || !hostname.includes('.')) {
    const error = new Error('Invalid URL format');
    error.statusCode = 400;
    throw error;
  }

  // 1. Resolve DNS for hostname
  try {
    await dns.lookup(hostname);
  } catch (dnsErr) {
    const error = new Error("This domain doesn't exist");
    error.statusCode = 400;
    throw error;
  }

  // 2. HEAD / GET check with 5s timeout
  let response = null;
  const targetUrl = parsedUrl.href;

  try {
    response = await fetch(targetUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'SiteMind-Validator/1.0' }
    });
    if (!response.ok && (response.status === 405 || response.status === 501)) {
      response = await fetch(targetUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'SiteMind-Validator/1.0' }
      });
    }
  } catch (fetchErr) {
    try {
      response = await fetch(targetUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'SiteMind-Validator/1.0' }
      });
    } catch (getErr) {
      const error = new Error("This site isn't responding");
      error.statusCode = 400;
      throw error;
    }
  }

  if (!response || response.status < 200 || response.status >= 400) {
    const error = new Error("This site isn't responding");
    error.statusCode = 400;
    throw error;
  }

  return cleanDomain(hostname);
};

/**
 * Get all websites belonging to a user
 */
const getUserWebsites = async (userId) => {
  return await Website.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    include: [
      {
        model: VerificationLog,
        as: 'verificationLogs',
        limit: 1,
        order: [['verified_at', 'DESC']]
      }
    ]
  });
};

/**
 * Register a new website for a user after pre-flight validation
 */
const createWebsite = async (userId, rawDomain) => {
  const domain = await validateUrlPreFlight(rawDomain);

  const existingWebsite = await Website.findOne({
    where: { user_id: userId, domain }
  });

  if (existingWebsite) {
    const error = new Error('This website is already registered under your account');
    error.statusCode = 400;
    throw error;
  }

  const verificationToken = crypto.randomBytes(16).toString('hex');

  // Create website with verification_status set to 'verified' after passing pre-flight checks
  const website = await Website.create({
    user_id: userId,
    domain,
    verification_token: verificationToken,
    verification_status: 'verified'
  });

  // Log self-attestation audit trail
  await VerificationLog.create({
    website_id: website.id,
    method: 'self_attested',
    verified_at: new Date(),
    verified_by_user_id: userId
  });

  return website;
};

/**
 * Update an existing website's domain (scoped to user)
 */
const updateWebsite = async (userId, websiteId, rawDomain) => {
  const website = await Website.findOne({
    where: { id: websiteId, user_id: userId }
  });

  if (!website) {
    const error = new Error('Website not found or unauthorized');
    error.statusCode = 403;
    throw error;
  }

  const domain = cleanDomain(rawDomain);
  if (!domain) {
    const error = new Error('Invalid domain format');
    error.statusCode = 400;
    throw error;
  }

  website.domain = domain;
  await website.save();

  return website;
};

/**
 * Delete a website (scoped to user)
 */
const deleteWebsite = async (userId, websiteId) => {
  const website = await Website.findOne({
    where: { id: websiteId, user_id: userId }
  });

  if (!website) {
    const error = new Error('Website not found or unauthorized');
    error.statusCode = 403;
    throw error;
  }

  await website.destroy();
  return { success: true, id: websiteId };
};

module.exports = {
  getUserWebsites,
  createWebsite,
  updateWebsite,
  deleteWebsite
};
