const express = require('express');
const router = express.Router();
const slackNotifier = require('../utils/slackNotifier');

// Test Slack integration
router.get('/test', async (req, res) => {
  try {
    const result = await slackNotifier.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Slack test message sent successfully! Check your Slack channel.'
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        hint: 'Make sure SLACK_WEBHOOK_URL is set in your .env file'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Send sample notification
router.post('/sample', async (req, res) => {
  try {
    const { type = 'commit', repoSlug = 'sample-repo' } = req.body;
    
    const sampleParams = type === 'commit' 
      ? {
          repoSlug: repoSlug,
          type: 'commit',
          commitHash: 'abc123def456789',
          filesReviewed: 5,
          reviewFocus: 'Security, Performance, Code Quality'
        }
      : {
          repoSlug: repoSlug,
          type: 'pr',
          prId: '123',
          filesReviewed: 10,
          reviewFocus: 'Architecture, Testing, Documentation'
        };
    
    await slackNotifier.sendCodeReviewNotification(sampleParams);
    
    res.json({
      success: true,
      message: `Sample ${type} notification sent to Slack`,
      params: sampleParams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;