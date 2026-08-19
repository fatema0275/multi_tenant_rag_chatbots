'use strict';

const express = require('express');
const router = express.Router();
const BRIDGE_URL = process.env.CRAWL_BRIDGE_URL || 'http://localhost:8001';

async function safeParseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (_) {}
  }
  const text = await response.text();
  const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return { error: cleanText ? `Python bridge error (${response.status}): ${cleanText.slice(0, 200)}` : `Python bridge HTTP ${response.status}` };
}

/**
 * GET /api/widget/config?token=
 * Public rate-limited proxy to Python bridge
 */
router.get('/config', async (req, res) => {
  try {
    const token = req.query.token || '';
    const response = await fetch(`${BRIDGE_URL}/api/widget/config?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: {
        'X-Forwarded-For': req.ip || req.connection.remoteAddress,
      },
    });

    const data = await safeParseResponse(response);
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('[widgetRoute] Error forwarding GET /widget/config:', err.message);
    return res.status(502).json({ error: `Python bridge unreachable: ${err.message}` });
  }
});

/**
 * POST /api/widget/query
 * Public rate-limited proxy to Python bridge
 */
router.post('/query', async (req, res) => {
  try {
    const response = await fetch(`${BRIDGE_URL}/api/widget/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': req.ip || req.connection.remoteAddress,
      },
      body: JSON.stringify(req.body),
    });

    const data = await safeParseResponse(response);
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('[widgetRoute] Error forwarding POST /widget/query:', err.message);
    return res.status(502).json({ error: `Python bridge unreachable: ${err.message}` });
  }
});

module.exports = router;
