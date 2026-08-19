'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const BRIDGE_URL = process.env.CRAWL_BRIDGE_URL || 'http://localhost:8001';

// Protect all chatbot management routes with auth
router.use(authMiddleware);

async function safeParseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (_) {}
  }
  const text = await response.text();
  // Strip HTML tags if HTML error returned
  const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return { error: cleanText ? `Python bridge error (${response.status}): ${cleanText.slice(0, 200)}` : `Python bridge HTTP ${response.status}` };
}

/**
 * Forward POST /api/chatbot/generate to Python bridge
 */
router.post('/generate', async (req, res, next) => {
  try {
    const response = await fetch(`${BRIDGE_URL}/api/chatbot/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.authorization || '',
      },
      body: JSON.stringify(req.body),
    });

    const data = await safeParseResponse(response);
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('[chatbotRoute] Error forwarding /generate:', err.message);
    return res.status(502).json({ error: `Python bridge unreachable: ${err.message}` });
  }
});

/**
 * Forward GET /api/chatbot/config/:websiteId to Python bridge
 */
router.get('/config/:websiteId', async (req, res, next) => {
  try {
    const websiteId = req.params.websiteId;
    const response = await fetch(`${BRIDGE_URL}/api/chatbot/config/${websiteId}`, {
      method: 'GET',
      headers: {
        Authorization: req.headers.authorization || '',
      },
    });

    const data = await safeParseResponse(response);
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('[chatbotRoute] Error forwarding GET /config:', err.message);
    return res.status(502).json({ error: `Python bridge unreachable: ${err.message}` });
  }
});

/**
 * Forward PATCH /api/chatbot/config/:websiteId to Python bridge
 */
router.patch('/config/:websiteId', async (req, res, next) => {
  try {
    const websiteId = req.params.websiteId;
    const response = await fetch(`${BRIDGE_URL}/api/chatbot/config/${websiteId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.authorization || '',
      },
      body: JSON.stringify(req.body),
    });

    const data = await safeParseResponse(response);
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('[chatbotRoute] Error forwarding PATCH /config:', err.message);
    return res.status(502).json({ error: `Python bridge unreachable: ${err.message}` });
  }
});

module.exports = router;
