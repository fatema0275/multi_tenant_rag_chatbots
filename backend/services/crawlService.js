'use strict';

const { Website } = require('../models');

/**
 * crawlService — thin orchestration layer between the REST API and the
 * Python-based crawl/indexing bridge.
 *
 * Design decisions:
 * - Ownership and verification are checked here so the route stays thin.
 * - If CRAWL_BRIDGE_URL is not set (development), we simulate a queued job
 *   so the frontend flow can be exercised without the Python service.
 * - All errors thrown include a `statusCode` so the router can forward the
 *   correct HTTP status without a catch-all 500.
 */

// Default points at the Python crawl service (ml-service) running locally.
// Override with CRAWL_BRIDGE_URL env var in production.
const BRIDGE_URL = process.env.CRAWL_BRIDGE_URL || null;

/**
 * triggerCrawl
 *
 * @param {number} userId     - Authenticated user ID (from JWT middleware).
 * @param {number} websiteId  - ID of the website to crawl.
 * @returns {{ jobId: string|null, status: string, message: string }}
 */
const triggerCrawl = async (userId, websiteId) => {
  // 1. Fetch the website and enforce RLS (user_id must match)
  const website = await Website.findOne({
    where: { id: websiteId, user_id: userId },
  });

  if (!website) {
    const err = new Error('Website not found or unauthorized');
    err.statusCode = 403;
    throw err;
  }

  // 2. Gate crawl on verification_status
  if (website.verification_status !== 'verified' && website.verification_status !== 'pending') {
    const err = new Error(
      `Cannot crawl website with status: ${website.verification_status ?? 'unknown'}. ` +
      'Complete domain registration first.'
    );
    err.statusCode = 422;
    throw err;
  }

  // 3. Forward to the Python bridge (if configured)
  if (BRIDGE_URL) {
    try {
      // POST to the Flask crawl service endpoint
      const res = await fetch(`${BRIDGE_URL}/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website_id: websiteId,
          domain: website.domain,
          user_id: userId,
        }),
        // Hard timeout — don't wait forever for the bridge
        signal: AbortSignal.timeout(10_000),
      });

      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.error || data.detail || 'Crawl bridge returned an error');
        err.statusCode = res.status >= 500 ? 502 : res.status;
        throw err;
      }

      return {
        jobId: data.job_id ?? data.jobId ?? null,
        status: 'crawling',
        message: data.message || `Crawl job queued for ${website.domain}`,
      };
    } catch (bridgeErr) {
      // Re-throw structured errors from the block above unchanged
      if (bridgeErr.statusCode) throw bridgeErr;

      // AbortError = timeout; TypeError = bridge unreachable (ECONNREFUSED etc.)
      const err = new Error(
        bridgeErr.name === 'AbortError'
          ? 'Crawl bridge timed out. It may be starting up, try again shortly.'
          : `Python bridge unreachable: ${bridgeErr.message}`
      );
      err.statusCode = 503;
      throw err;
    }
  }

  // 4. Development stub — no bridge configured
  //    Simulate an enqueued job so the UI can be exercised end-to-end.
  return {
    jobId: null,
    status: 'crawling',
    message: `[dev] Crawl job simulated for ${website.domain}. Configure CRAWL_BRIDGE_URL to use the real pipeline.`,
  };
};

/**
 * stopCrawl
 * Manual stop / cancellation of a running crawl job for a website.
 */
const stopCrawl = async (userId, websiteId) => {
  const website = await Website.findOne({
    where: { id: websiteId, user_id: userId },
  });

  if (!website) {
    const err = new Error('Website not found or unauthorized');
    err.statusCode = 403;
    throw err;
  }

  const { sequelize } = require('../models');

  const [activeJobs] = await sequelize.query(
    `SELECT id FROM crawl_jobs WHERE website_id = :websiteId AND status = 'running' ORDER BY id DESC LIMIT 1`,
    { replacements: { websiteId }, type: sequelize.QueryTypes.SELECT }
  );

  const activeJob = Array.isArray(activeJobs) ? activeJobs[0] : activeJobs;
  if (!activeJob) {
    const err = new Error('No running crawl job found');
    err.statusCode = 400;
    throw err;
  }

  const jobId = activeJob.id;

  if (BRIDGE_URL) {
    try {
      await fetch(`${BRIDGE_URL}/crawl/${jobId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website_id: websiteId, user_id: userId }),
        signal: AbortSignal.timeout(5000)
      });
    } catch (e) {
      console.warn('[crawlService] Python bridge stop request failed or timed out:', e.message);
    }
  }

  const [countRows] = await sequelize.query(
    `SELECT COUNT(*) AS total FROM pages WHERE website_id = :websiteId`,
    { replacements: { websiteId }, type: sequelize.QueryTypes.SELECT }
  );
  const pageCount = (Array.isArray(countRows) ? countRows[0] : countRows)?.total || 0;

  await sequelize.query(
    `UPDATE crawl_jobs SET status = 'cancelled', completed_at = NOW() WHERE id = :jobId`,
    { replacements: { jobId } }
  );

  try {
    await sequelize.query(
      `INSERT INTO crawl_logs (crawl_job_id, url, status, message) VALUES (:jobId, 'site_crawl', 'cancelled', :msg)`,
      { replacements: { jobId, msg: `Crawl stopped. ${pageCount} pages completed.` } }
    );
  } catch (_) {}

  return {
    jobId,
    status: 'cancelled',
    message: `Crawl stopped. ${pageCount} pages indexed. Chatbot is answering from partial content.`
  };
};

module.exports = { triggerCrawl, stopCrawl };
