'use strict';

const express = require('express');
const { z } = require('zod');
const authMiddleware = require('../middleware/auth');
const websiteService = require('../services/websiteService');

const router = express.Router();

// Apply auth middleware to all website routes
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

module.exports = router;
