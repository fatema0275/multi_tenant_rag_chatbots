'use strict';

const { User } = require('../models');

/**
 * Middleware that verifies if the authenticated user has an 'admin' role.
 * Must run AFTER authMiddleware so req.userId is set.
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(401).json({ error: 'User account not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin privilege required' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[AdminMiddleware] Verification error:', err);
    return res.status(500).json({ error: 'Internal server authorization error' });
  }
};

module.exports = requireAdmin;
