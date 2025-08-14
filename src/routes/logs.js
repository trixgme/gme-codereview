const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// Get logs endpoint
router.get('/', (req, res) => {
  try {
    const { date, type = 'all', limit = 100 } = req.query;
    
    const logs = logger.getLogs(date, type);
    const limitedLogs = logs.slice(-limit);
    
    res.json({
      date: date || new Date().toISOString().split('T')[0],
      type,
      count: limitedLogs.length,
      totalCount: logs.length,
      logs: limitedLogs
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to retrieve logs',
      message: error.message 
    });
  }
});

// Get webhook-specific logs
router.get('/webhooks', (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const logs = logger.getLogs(null, 'webhooks');
    const limitedLogs = logs.slice(-limit);
    
    res.json({
      type: 'webhooks',
      count: limitedLogs.length,
      logs: limitedLogs
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to retrieve webhook logs',
      message: error.message 
    });
  }
});

// Get error logs
router.get('/errors', (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const logs = logger.getLogs(null, 'errors');
    const limitedLogs = logs.slice(-limit);
    
    res.json({
      type: 'errors',
      count: limitedLogs.length,
      logs: limitedLogs
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to retrieve error logs',
      message: error.message 
    });
  }
});

// Get log statistics
router.get('/stats', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = logger.getLogs(today);
    const webhookLogs = logger.getLogs(null, 'webhooks');
    const errorLogs = logger.getLogs(null, 'errors');
    
    // Count by level
    const levelCounts = {};
    todayLogs.forEach(log => {
      if (typeof log === 'object' && log.level) {
        levelCounts[log.level] = (levelCounts[log.level] || 0) + 1;
      }
    });
    
    // Recent webhook events
    const recentWebhooks = webhookLogs
      .slice(-10)
      .map(log => ({
        timestamp: log.timestamp,
        eventType: log.data?.eventType,
        repository: log.data?.repository
      }));
    
    res.json({
      date: today,
      totalLogsToday: todayLogs.length,
      totalWebhooks: webhookLogs.length,
      totalErrors: errorLogs.length,
      levelCounts,
      recentWebhooks
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to retrieve log statistics',
      message: error.message 
    });
  }
});

// Clear old logs
router.delete('/clear', (req, res) => {
  try {
    const { olderThanDays = 30 } = req.body;
    
    logger.clearLogs(olderThanDays);
    
    res.json({
      message: `Cleared logs older than ${olderThanDays} days`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to clear logs',
      message: error.message 
    });
  }
});

module.exports = router;