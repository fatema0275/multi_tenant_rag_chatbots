'use strict';

const express = require('express');
const { z } = require('zod');
const authMiddleware = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const { User, Website, sequelize } = require('../models');
const crawlService = require('../services/crawlService');

const router = express.Router();

// Apply auth and admin check to all admin routes
router.use(authMiddleware);
router.use(requireAdmin);

/**
 * GET /api/admin/stats
 * Overview dashboard metrics: total users, total websites, total crawls today, total document chunks.
 */
router.get('/stats', async (req, res, next) => {
  try {
    const totalUsers = await User.count();
    const totalWebsites = await Website.count();

    // Crawls executed today
    let crawlsToday = 0;
    try {
      const [crawlRes] = await sequelize.query(`
        SELECT COUNT(*)::int as count FROM crawl_jobs 
        WHERE DATE(started_at) = CURRENT_DATE;
      `);
      crawlsToday = crawlRes[0]?.count || 0;
    } catch (_) {
      crawlsToday = 0;
    }

    // Total chunks
    let totalChunks = 0;
    try {
      const [chunkRes] = await sequelize.query(`
        SELECT COUNT(*)::int as count FROM document_chunks;
      `);
      totalChunks = chunkRes[0]?.count || 0;
    } catch (_) {
      totalChunks = 0;
    }

    return res.status(200).json({
      totalUsers,
      totalWebsites,
      crawlsToday,
      totalChunks
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/users
 * Returns list of all registered users grouped with their registered websites.
 */
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'name', 'role', 'created_at'],
      include: [
        {
          model: Website,
          as: 'websites',
          attributes: ['id', 'domain', 'verification_status', 'created_at']
        }
      ],
      order: [['id', 'DESC']]
    });

    // Enhance each website with latest crawl job details if available
    const plainUsers = await Promise.all(
      users.map(async (u) => {
        const userJson = u.toJSON();
        userJson.websites = await Promise.all(
          (userJson.websites || []).map(async (site) => {
            try {
              const [jobs] = await sequelize.query(`
                SELECT status, started_at, completed_at, pages_crawled, error_message
                FROM crawl_jobs
                WHERE website_id = :websiteId
                ORDER BY id DESC LIMIT 1;
              `, { replacements: { websiteId: site.id }, type: sequelize.QueryTypes.SELECT });

              const [chunkCount] = await sequelize.query(`
                SELECT COUNT(*)::int as count FROM document_chunks WHERE site_id = :siteId OR website_id = :websiteId;
              `, { replacements: { siteId: site.site_id || null, websiteId: site.id }, type: sequelize.QueryTypes.SELECT });

              return {
                ...site,
                latestCrawl: jobs || null,
                chunksCount: chunkCount?.count || 0
              };
            } catch (_) {
              return { ...site, latestCrawl: null, chunksCount: 0 };
            }
          })
        );
        return userJson;
      })
    );

    return res.status(200).json(plainUsers);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/websites
 * Returns flat list of all websites across all users for the Crawled Websites view.
 */
router.get('/websites', async (req, res, next) => {
  try {
    const websites = await Website.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'name']
        }
      ],
      order: [['id', 'DESC']]
    });

    const enriched = await Promise.all(
      websites.map(async (w) => {
        const site = w.toJSON();
        try {
          const [jobs] = await sequelize.query(`
            SELECT id, status, started_at, completed_at, pages_found, pages_crawled, pages_failed, error_message
            FROM crawl_jobs
            WHERE website_id = :websiteId
            ORDER BY id DESC LIMIT 1;
          `, { replacements: { websiteId: site.id }, type: sequelize.QueryTypes.SELECT });

          const [chunkCount] = await sequelize.query(`
            SELECT COUNT(*)::int as count FROM document_chunks WHERE site_id = :siteId OR website_id = :websiteId;
          `, { replacements: { siteId: site.site_id || null, websiteId: site.id }, type: sequelize.QueryTypes.SELECT });

          return {
            ...site,
            latestCrawl: jobs || null,
            chunksCount: chunkCount?.count || 0
          };
        } catch (_) {
          return { ...site, latestCrawl: null, chunksCount: 0 };
        }
      })
    );

    return res.status(200).json(enriched);
  } catch (err) {
    next(err);
  }
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Valid email address required').optional(),
  role: z.enum(['user', 'admin']).optional()
});

/**
 * PUT /api/admin/users/:id
 * Edit basic user fields (name, email, role).
 */
router.put('/users/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });

    const parseResult = updateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { name, email, role } = parseResult.data;
    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) user.email = email.trim().toLowerCase();
    if (role !== undefined) user.role = role;

    await user.save();

    const plainUser = user.get({ plain: true });
    delete plainUser.password_hash;
    return res.status(200).json(plainUser);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/users/:id
 * Cascade delete a user and all their websites, chunks, and logs.
 */
router.delete('/users/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });

    // Prevent admin from deleting their own current active account
    if (userId === req.userId) {
      return res.status(400).json({ error: 'You cannot delete your own active admin account' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 1. Delete document_chunks & crawl_jobs associated with user's websites
    const userWebsites = await Website.findAll({ where: { user_id: userId } });
    const websiteIds = userWebsites.map((w) => w.id);

    if (websiteIds.length > 0) {
      try {
        await sequelize.query(`DELETE FROM document_chunks WHERE website_id IN (:websiteIds)`, { replacements: { websiteIds } });
        await sequelize.query(`DELETE FROM crawl_logs WHERE website_id IN (:websiteIds)`, { replacements: { websiteIds } });
        await sequelize.query(`DELETE FROM crawl_jobs WHERE website_id IN (:websiteIds)`, { replacements: { websiteIds } });
      } catch (_) {
        /* ignore table missing errors */
      }
    }

    // 2. Delete user row (Sequelize cascade will delete websites)
    await user.destroy();

    return res.status(200).json({ message: `User #${userId} (${user.email}) deleted successfully` });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/websites/:id/crawl
 * Force re-crawl for any website (Admin privilege).
 */
router.post('/websites/:id/crawl', async (req, res, next) => {
  try {
    const websiteId = parseInt(req.params.id, 10);
    if (isNaN(websiteId)) return res.status(400).json({ error: 'Invalid website ID' });

    const website = await Website.findByPk(websiteId);
    if (!website) return res.status(404).json({ error: 'Website not found' });

    const result = await crawlService.triggerCrawl(website.user_id, websiteId);
    return res.status(202).json(result);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
});

module.exports = router;
