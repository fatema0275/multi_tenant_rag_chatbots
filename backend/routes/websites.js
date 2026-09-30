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

    const force = Boolean(req.body && req.body.force);
    const result = await crawlService.triggerCrawl(req.userId, websiteId, force);
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

/**
 * GET /api/websites/:id/manual-content
 * Returns list of manual knowledge base entries for the website
 */
router.get('/:id/manual-content', async (req, res, next) => {
  try {
    const websiteId = parseInt(req.params.id, 10);
    if (isNaN(websiteId)) return res.status(400).json({ error: 'Invalid website ID' });

    const { Website, sequelize } = require('../models');
    const website = await Website.findOne({ where: { id: websiteId, user_id: req.userId } });
    if (!website) return res.status(403).json({ error: 'Website not found or unauthorized' });

    const [rows] = await sequelize.query(
      `SELECT id, website_id, title, content_text AS content, created_at AS "createdAt", created_at AS "updatedAt"
       FROM manual_content
       WHERE website_id = :websiteId
       ORDER BY id DESC`,
      { replacements: { websiteId } }
    );

    return res.status(200).json(rows || []);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/websites/:id/manual-content
 * Adds manual content entry and indexes it into document_chunks for RAG retrieval
 */
router.post('/:id/manual-content', async (req, res, next) => {
  try {
    const websiteId = parseInt(req.params.id, 10);
    if (isNaN(websiteId)) return res.status(400).json({ error: 'Invalid website ID' });

    const { title, content } = req.body || {};
    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const { Website, sequelize } = require('../models');
    const website = await Website.findOne({ where: { id: websiteId, user_id: req.userId } });
    if (!website) return res.status(403).json({ error: 'Website not found or unauthorized' });

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    // 1. Insert into manual_content table
    const [insertResult] = await sequelize.query(
      `INSERT INTO manual_content (website_id, added_by_user_id, title, content_text, created_at)
       VALUES (:websiteId, :userId, :title, :content, NOW())
       RETURNING id, website_id, title, content_text AS content, created_at AS "createdAt", created_at AS "updatedAt"`,
      {
        replacements: {
          websiteId,
          userId: req.userId,
          title: cleanTitle,
          content: cleanContent,
        }
      }
    );

    const newRow = insertResult[0];

    // 2. Index into document_chunks with embeddings for immediate RAG retrieval
    try {
      const { storePageChunks } = require('../services/knowledgeBase');
      await storePageChunks({
        siteId: website.site_id,
        websiteId: website.id,
        pageUrl: `https://${website.domain}/#manual-${newRow.id}`,
        pageTitle: cleanTitle,
        pageText: `${cleanTitle}:\n${cleanContent}`,
        domSelector: null,
      });
      console.log(`[ManualContent] Indexed manual knowledge #${newRow.id} into document_chunks for site ${website.domain}`);
    } catch (chunkErr) {
      console.error(`[ManualContent] Error indexing manual content to document_chunks:`, chunkErr.message);
    }

    return res.status(201).json(newRow);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/websites/:id/manual-content/:contentId
 * Removes manual content entry and associated document_chunks
 */
router.delete('/:id/manual-content/:contentId', async (req, res, next) => {
  try {
    const websiteId = parseInt(req.params.id, 10);
    const contentId = parseInt(req.params.contentId, 10);
    if (isNaN(websiteId) || isNaN(contentId)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const { Website, sequelize } = require('../models');
    const website = await Website.findOne({ where: { id: websiteId, user_id: req.userId } });
    if (!website) return res.status(403).json({ error: 'Website not found or unauthorized' });

    await sequelize.query(
      `DELETE FROM manual_content WHERE id = :contentId AND website_id = :websiteId`,
      { replacements: { contentId, websiteId } }
    );

    await sequelize.query(
      `DELETE FROM document_chunks WHERE (website_id = :websiteId OR site_id = :siteId) AND page_url LIKE '%#manual-' || :contentId`,
      { replacements: { websiteId, siteId: website.site_id, contentId: String(contentId) } }
    );

    return res.status(200).json({ status: 'ok', message: 'Manual knowledge entry removed' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/websites/:id/drive-sync
 * Ingests a Google Drive folder URL, traverses folders & subfolders, downloads PDFs,
 * runs OCR/extraction, and stores vector embeddings for the website.
 */
router.post('/:id/drive-sync', async (req, res, next) => {
  try {
    const websiteId = parseInt(req.params.id, 10);
    if (isNaN(websiteId)) return res.status(400).json({ error: 'Invalid website ID' });

    const { driveUrl, apiKey } = req.body || {};
    if (!driveUrl || typeof driveUrl !== 'string' || !driveUrl.trim()) {
      return res.status(400).json({ error: 'driveUrl is required' });
    }

    const { Website, sequelize } = require('../models');
    const website = await Website.findOne({ where: { id: websiteId, user_id: req.userId } });
    if (!website) return res.status(403).json({ error: 'Website not found or unauthorized' });

    let targetSiteId = website.site_id;
    if (!targetSiteId) {
      try {
        const [siteRows] = await sequelize.query(
          `SELECT id FROM sites WHERE domain = :domain LIMIT 1`,
          { replacements: { domain: website.domain } }
        );
        if (siteRows && siteRows.length > 0) {
          targetSiteId = siteRows[0].id;
          await website.update({ site_id: targetSiteId });
        }
      } catch (siteErr) {
        console.warn('[DriveSync] Warning: could not resolve site_id from sites table:', siteErr.message);
      }
    }

    const crawlBridgeUrl = process.env.CRAWL_BRIDGE_URL || 'http://localhost:8001';
    const driveKey = (apiKey && apiKey.trim()) || process.env.GOOGLE_DRIVE_API_KEY || '';

    // Delegate recursive folder crawl & OCR extraction to Python ML service
    let driveRes;
    try {
      const mlResp = await fetch(`${crawlBridgeUrl}/crawl/drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website_id: website.id,
          site_id: targetSiteId || website.site_id || null,
          drive_url: driveUrl.trim(),
          api_key: driveKey || null,
        }),
      });
      driveRes = await mlResp.json();
      if (!mlResp.ok) {
        return res.status(mlResp.status).json({
          error: driveRes.error || 'Failed to crawl Google Drive folder',
          details: driveRes,
        });
      }
    } catch (mlErr) {
      console.error('[DriveSync] Error communicating with ML service:', mlErr);
      return res.status(502).json({
        error: `ML Crawler service unreachable at ${crawlBridgeUrl}: ${mlErr.message}`,
      });
    }

    // Record an entry in manual_content so it appears in the knowledge base list
    let recordEntry = null;
    try {
      const fileNames = (driveRes.indexedFiles || []).map((f) => f.name).join(', ');
      const summaryText = `Google Drive Folder Sync: ${driveRes.folderId}\n` +
        `Indexed ${driveRes.indexedCount} file(s) across folder hierarchy:\n${fileNames}`;

      const [insertResult] = await sequelize.query(
        `INSERT INTO manual_content (website_id, added_by_user_id, title, content_text, created_at)
         VALUES (:websiteId, :userId, :title, :content, NOW())
         RETURNING id, website_id, title, content_text AS content, created_at AS "createdAt"`,
        {
          replacements: {
            websiteId,
            userId: req.userId,
            title: `Google Drive Folder (${driveRes.indexedCount} files)`,
            content: summaryText,
          },
        }
      );
      recordEntry = insertResult[0];
    } catch (logErr) {
      console.warn('[DriveSync] Could not save audit record to manual_content:', logErr.message);
    }

    return res.status(200).json({
      status: 'ok',
      message: `Successfully processed Google Drive folder hierarchy! Indexed ${driveRes.indexedCount} document(s).`,
      record: recordEntry,
      driveDetails: driveRes,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


