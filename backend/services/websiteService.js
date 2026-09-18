'use strict';

const crypto = require('crypto');
const { Op } = require('sequelize');
const { Website, VerificationLog, Site, sequelize } = require('../models');
const dns = require('dns').promises;

/**
 * Clean domain for website record
 */
const cleanDomain = (domain) => {
  if (!domain) return '';
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
      },
      {
        model: Site,
        as: 'site'
      }
    ]
  });
};

/**
 * Register a new website for a user.
 * Deduplication Rule: If domain was already verified by ANY user in the system (or exists in `sites`),
 * skip pre-flight URL check and directly set verification_status = 'verified' from the database.
 */
const createWebsite = async (userId, rawDomain) => {
  const cleanedDomain = cleanDomain(rawDomain);
  if (!cleanedDomain) {
    const error = new Error('Invalid domain format');
    error.statusCode = 400;
    throw error;
  }

  // 1. Enforce per-user duplicate registration check
  const existingUserWebsite = await Website.findOne({
    where: { user_id: userId, domain: cleanedDomain }
  });

  if (existingUserWebsite) {
    const error = new Error('This website is already registered under your account');
    error.statusCode = 400;
    throw error;
  }

  // 2. Check if domain is ALREADY verified for ANY user in the database (or exists in `sites`)
  const existingVerifiedWebsite = await Website.findOne({
    where: { domain: cleanedDomain, verification_status: 'verified' }
  });

  let siteRecord = await Site.findOne({
    where: { domain: cleanedDomain }
  });

  const isAlreadyVerified = Boolean(existingVerifiedWebsite || siteRecord);
  let domain = cleanedDomain;

  // 3. Skip pre-flight URL reachability check if domain is already in the DB; otherwise validate.
  if (!isAlreadyVerified) {
    domain = await validateUrlPreFlight(rawDomain);
  }

  // 4. Ensure siteRecord exists in `sites` table
  if (!siteRecord) {
    siteRecord = await Site.create({
      domain,
      crawl_status: 'pending'
    });
  }

  const verificationToken = crypto.randomBytes(16).toString('hex');

  // 5. Create website row linked to site_id and marked 'verified'
  const website = await Website.create({
    user_id: userId,
    site_id: siteRecord.id,
    domain,
    verification_token: verificationToken,
    verification_status: 'verified'
  });

  // 6. Log attestation audit trail
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

  const siteId = website.site_id;

  // Check if any OTHER user has this same site_id registered
  let otherWebsitesCount = 0;
  if (siteId) {
    otherWebsitesCount = await Website.count({
      where: {
        site_id: siteId,
        id: { [Op.ne]: websiteId }
      }
    });
  }

  if (otherWebsitesCount === 0 && siteId) {
    // No other user shares this site: clean up all site data from Supabase
    try {
      await sequelize.query('DELETE FROM document_chunks WHERE site_id = :siteId OR website_id = :websiteId', { replacements: { siteId, websiteId } });
      await sequelize.query('DELETE FROM pages WHERE site_id = :siteId OR website_id = :websiteId', { replacements: { siteId, websiteId } });
      await sequelize.query('DELETE FROM crawl_logs WHERE crawl_job_id IN (SELECT id FROM crawl_jobs WHERE website_id = :websiteId)', { replacements: { websiteId } });
      await sequelize.query('DELETE FROM crawl_jobs WHERE website_id = :websiteId', { replacements: { websiteId } });
      await sequelize.query('DELETE FROM sites WHERE id = :siteId', { replacements: { siteId } });
    } catch (cleanErr) {
      console.warn(`[WebsiteService] Warning cleaning up site data for siteId=${siteId}:`, cleanErr.message);
    }
  } else {
    // Other users share this domain: only remove this user's jobs and logs
    try {
      await sequelize.query('DELETE FROM crawl_logs WHERE crawl_job_id IN (SELECT id FROM crawl_jobs WHERE website_id = :websiteId)', { replacements: { websiteId } });
      await sequelize.query('DELETE FROM crawl_jobs WHERE website_id = :websiteId', { replacements: { websiteId } });
    } catch (_) {}
  }

  // Always remove chatbot_configs and verification_logs for this website
  try {
    await sequelize.query('DELETE FROM chatbot_configs WHERE website_id = :websiteId', { replacements: { websiteId } });
    await sequelize.query('DELETE FROM verification_logs WHERE website_id = :websiteId', { replacements: { websiteId } });
  } catch (_) {}

  await website.destroy();
  return { success: true, id: websiteId };
};

module.exports = {
  getUserWebsites,
  createWebsite,
  updateWebsite,
  deleteWebsite
};
