'use strict';

const crypto = require('crypto');
const { Website, VerificationLog } = require('../models');

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
 * Register a new website for a user (Trust-but-Log self-attested model)
 */
const createWebsite = async (userId, rawDomain) => {
  const domain = cleanDomain(rawDomain);
  if (!domain) {
    const error = new Error('Invalid domain format');
    error.statusCode = 400;
    throw error;
  }

  const verificationToken = crypto.randomBytes(16).toString('hex');

  // Create website with verification_status set to 'verified' immediately
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
