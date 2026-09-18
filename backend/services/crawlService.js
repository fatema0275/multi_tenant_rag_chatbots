'use strict';

const { Website } = require('../models');

/**
 * crawlService — thin orchestration layer between the REST API and the
 * Python-based crawl/indexing bridge.
 */

const BRIDGE_URL = process.env.CRAWL_BRIDGE_URL || null;

/**
 * triggerCrawl
 *
 * @param {number} userId     - Authenticated user ID (from JWT middleware).
 * @param {number} websiteId  - ID of the website to crawl.
 * @param {boolean} [force]   - Whether to force a full clean re-crawl.
 * @returns {{ jobId: string|null, status: string, message: string }}
 */
const triggerCrawl = async (userId, websiteId, force = false) => {
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

  // 3. Forward to the Python bridge (if configured) with automatic retry
  if (BRIDGE_URL) {
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const res = await fetch(`${BRIDGE_URL}/crawl`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            website_id: websiteId,
            domain: website.domain,
            user_id: userId,
            force,
          }),
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
        if (bridgeErr.statusCode) throw bridgeErr;

        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }

        const err = new Error(
          bridgeErr.name === 'AbortError'
            ? 'Crawl bridge timed out. It may be starting up, try again shortly.'
            : `Python bridge unreachable: ${bridgeErr.message}`
        );
        err.statusCode = 503;
        throw err;
      }
    }
  }

  // 4. Development stub — no bridge configured
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
    `SELECT COUNT(*) AS total FROM pages WHERE (site_id = :siteId OR (site_id IS NULL AND website_id = :websiteId))`,
    { replacements: { siteId: website.site_id || null, websiteId }, type: sequelize.QueryTypes.SELECT }
  );
  const pageCount = (Array.isArray(countRows) ? countRows[0] : countRows)?.total || 0;

  await sequelize.query(
    `UPDATE crawl_jobs SET status = 'cancelled', completed_at = NOW() WHERE id = :jobId`,
    { replacements: { jobId } }
  );

  // Update sites.crawl_status so it is never stuck in 'running'
  if (website.site_id) {
    const nextStatus = pageCount > 0 ? 'completed' : 'cancelled';
    await sequelize.query(
      `UPDATE sites SET crawl_status = :status, last_crawled_at = NOW(), updated_at = NOW() WHERE id = :siteId`,
      { replacements: { status: nextStatus, siteId: website.site_id } }
    );
  }

  try {
    await sequelize.query(
      `INSERT INTO crawl_logs (crawl_job_id, url, status, reason) VALUES (:jobId, 'site_crawl', 'cancelled', :msg)`,
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
