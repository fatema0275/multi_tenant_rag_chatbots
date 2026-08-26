'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const authRoutes = require('./routes/auth');
const websiteRoutes = require('./routes/websites');
const adminRoutes = require('./routes/admin');
const chatbotRoutes = require('./routes/chatbot');
const widgetRoutes = require('./routes/widget');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;
const BRIDGE_URL = process.env.CRAWL_BRIDGE_URL || 'http://localhost:8001';

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Serve static widget JS proxied from Python bridge
app.get('/static/widget-v1.js', async (req, res) => {
  try {
    const response = await fetch(`${BRIDGE_URL}/static/widget-v1.js`);
    if (!response.ok) return res.status(response.status).end();
    const content = await response.text();
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(content);
  } catch (err) {
    return res.status(502).json({ error: `Python bridge unreachable: ${err.message}` });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/websites', websiteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/widget', widgetRoutes);
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'sitemind-backend', timestamp: new Date() });
});

// Global 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 SiteMind Backend Server running on port ${PORT}`);
  });
}

module.exports = app;
