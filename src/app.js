const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const webhookRoutes = require('./routes/webhook');
const logsRoutes = require('./routes/logs');
const slackTestRoutes = require('./routes/slackTest');
const logger = require('./utils/logger');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.info(`Incoming ${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
    headers: {
      'x-event-key': req.headers['x-event-key'],
      'x-hook-uuid': req.headers['x-hook-uuid'],
      'user-agent': req.headers['user-agent']
    },
    ip: req.ip
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`Response ${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });
  
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'GME Code Review Bot',
    version: '1.0.0',
    description: 'Automated code review system using OpenAI GPT-4',
    endpoints: {
      webhook: '/webhook/bitbucket',
      health: '/health',
      logs: '/logs',
      logStats: '/logs/stats',
      slackTest: '/slack/test',
      slackSample: '/slack/sample'
    },
    workspace: 'gmeremittance'
  });
});

app.use('/webhook', webhookRoutes);
app.use('/logs', logsRoutes);
app.use('/slack', slackTestRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

module.exports = app;