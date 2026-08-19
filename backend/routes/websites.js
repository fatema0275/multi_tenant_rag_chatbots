'use strict';

const express = require('express');
const { z } = require('zod');
const authMiddleware = require('../middleware/auth');
const websiteService = require('../services/websiteService');
const crawlService = require('../services/crawlService');

const router = express.Router();

/**
 * POST /api/websites/:id/store-chunks
 * Internal endpoint called after Module 2 clean page extraction to process and store chunks.
 */
router.post('/:id/store-chunks', async (req, res, next) => {
  try {
    const websiteId = parseInt(req.params.id, 10);
    const { pageUrl, pageTitle, pageText, domSelector, siteId, site_id } = req.body;

    const { storePageChunks } = require('../services/knowledgeBase');

    try {
      await storePageChunks({
        siteId: siteId || site_id || null,
        websiteId,
        pageUrl,
        pageTitle,
        pageText,
        domSelector: domSelector || null,
      });
    } catch (chunkErr) {
      console.error(`[KnowledgeBase] Error storing chunks for ${pageUrl}:`, chunkErr);
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
});

// Apply auth middleware to all website routes below
router.use(authMiddleware);

const websiteSchema = z.object({
  domain: z.string().min(1, 'Domain is required')
});

/**
 * GET /api/websites
 * Returns websites owned by the logged-in user
 */
router.get('/', async (req, res, next) => {
  try {
    const websites = await websiteService.getUserWebsites(req.userId);
    return res.status(200).json(websites);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/websites
 * Register a new website
 */
router.post('/', async (req, res, next) => {
  try {
    const parseResult = websiteSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.errors[0].message
      });
    }

    const website = await websiteService.createWebsite(req.userId, parseResult.data.domain);
    return res.status(201).json(website);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * PUT /api/websites/:id
 * Update website domain
 */
router.put('/:id', async (req, res, next) => {
  try {
    const parseResult = websiteSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.errors[0].message
      });
    }

    const websiteId = parseInt(req.params.id, 10);
    if (isNaN(websiteId)) {
      return res.status(400).json({ error: 'Invalid website ID' });
    }

    const updatedWebsite = await websiteService.updateWebsite(req.userId, websiteId, parseResult.data.domain);
    return res.status(200).json(updatedWebsite);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * DELETE /api/websites/:id
 * Delete website
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const websiteId = parseInt(req.params.id, 10);
    if (isNaN(websiteId)) {
      return res.status(400).json({ error: 'Invalid website ID' });
    }

    const result = await websiteService.deleteWebsite(req.userId, websiteId);
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/websites/:id/crawl
 * Trigger a crawl job for a verified website.
 * Responds immediately with { jobId, status, message }.
 * The actual crawl runs asynchronously via the Python bridge.
 */
router.post('/:id/crawl', async (req, res, next) => {
  try {
    const websiteId = parseInt(req.params.id, 10);
    if (isNaN(websiteId)) {
      return res.status(400).json({ error: 'Invalid website ID' });
    }

    const result = await crawlService.triggerCrawl(req.userId, websiteId);
    return res.status(202).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/websites/:id/stop-crawl
 * Manually stop an active crawl job for a website.
 */
router.post('/:id/stop-crawl', async (req, res, next) => {
  try {
    const websiteId = parseInt(req.params.id, 10);
    if (isNaN(websiteId)) {
      return res.status(400).json({ error: 'Invalid website ID' });
    }

    const result = await crawlService.stopCrawl(req.userId, websiteId);
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/websites/:id/crawl-jobs
 * Returns the most recent crawl jobs for a verified website (max 10).
 * Used by the dashboard's Crawl Status panel to display logs.
 */
router.get('/:id/crawl-jobs', async (req, res, next) => {
  try {
    const websiteId = parseInt(req.params.id, 10);
    if (isNaN(websiteId)) {
      return res.status(400).json({ error: 'Invalid website ID' });
    }

    // Verify ownership via Sequelize
    const { Website } = require('../models');
    const website = await Website.findOne({
      where: { id: websiteId, user_id: req.userId }
    });
    if (!website) {
      return res.status(403).json({ error: 'Website not found or unauthorized' });
    }

    // Query crawl_jobs directly via raw SQL (the model isn't defined yet).
    // We try the full column list first (requires migrations 015 to have run).
    // If any column doesn't exist yet (pre-migration state), we fall back to
    // the original 5 columns from migration 003 so the panel still works.
    const { sequelize } = require('../models');

    let jobs;
    try {
      // Full query — post-migration columns present
      [jobs] = await sequelize.query(
        `SELECT id, status,
                COALESCE(crawl_type::text, null)     AS crawl_type,
                COALESCE(pages_found,     null)      AS pages_found,
                COALESCE(pages_crawled,   null)      AS pages_crawled,
                COALESCE(pages_failed,    null)      AS pages_failed,
                COALESCE(pages_skipped,   null)      AS pages_skipped,
                started_at, completed_at,
                COALESCE(error_message,   null)      AS error_message
         FROM   crawl_jobs
         WHERE  website_id = :websiteId
         ORDER  BY id DESC
         LIMIT  10`,
        { replacements: { websiteId }, type: sequelize.QueryTypes.SELECT }
      );
    } catch (sqlErr) {
      // Column does not exist → migrations haven't been applied yet.
      // Postgres leaves the connection in an error state after a failed query,
      // so we must issue a ROLLBACK before the fallback SELECT will work.
      if (sqlErr.message && sqlErr.message.includes('does not exist')) {
        try { await sequelize.query('ROLLBACK'); } catch (_) { /* ignore */ }
        [jobs] = await sequelize.query(
          `SELECT id, status, started_at, completed_at,
                  null AS crawl_type,
                  null AS pages_found,
                  null AS pages_crawled,
                  null AS pages_failed,
                  null AS pages_skipped,
                  null AS error_message
           FROM   crawl_jobs
           WHERE  website_id = :websiteId
           ORDER  BY id DESC
           LIMIT  10`,
          { replacements: { websiteId }, type: sequelize.QueryTypes.SELECT }
        );
      } else {
        throw sqlErr; // re-throw unrelated errors
      }
    }

    return res.status(200).json(Array.isArray(jobs) ? jobs : [jobs].filter(Boolean));
  } catch (err) {
    next(err);
  }
});

module.exports = router;


